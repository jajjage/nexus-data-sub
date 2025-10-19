import { Request } from 'express';
import db from '../database/connection';
import { UserModel } from '../models/User';
import { EmailService } from '../services/email.service';
import { TotpService } from '../services/topt.service';
import { getClientIP } from './security.utils';
import { twoFADisableTracker } from './twoFADisableTracker';

export interface TwoFAHandleResult {
  reconfigure2fa?: true;
  qrCode?: string;
  backupCodes?: string[];
  twoFactorDisabled?: true;
}

/**
 * Handle a backup-code login that requests either 2FA disable or reconfiguration.
 * Returns an object describing the action to include in the response payload.
 */
export async function handleBackupCodeReset(
  req: Request,
  user: { userId: string; email: string }
): Promise<TwoFAHandleResult | null> {
  const { reset } = req.body as { reset?: boolean };

  if (reset !== undefined && typeof reset !== 'boolean') {
    throw new Error('RESET_PARAM_INVALID');
  }

  const clientIP = getClientIP(req);

  // If caller wants to disable 2FA
  if (reset === false) {
    const canDisable = await twoFADisableTracker.canDisable2FA(
      user.userId,
      clientIP
    );
    if (!canDisable) {
      const remaining = await twoFADisableTracker.getRemainingAttempts(
        user.userId,
        clientIP
      );
      const err: any = new Error('TOO_MANY_ATTEMPTS');
      err.remaining = remaining;
      throw err;
    }

    // record attempt (best-effort)
    await twoFADisableTracker.recordAttempt(user.userId, clientIP);

    try {
      // disable 2FA via model (this will remove backup codes table rows)
      await UserModel.disable2FA(user.userId);

      // notify user (non-blocking)
      setImmediate(async () => {
        try {
          const emailService = new EmailService();
          await emailService.send2FADisableEmail(user.email);
        } catch (err) {
          console.error('Failed to send 2FA disable email:', err);
        }
      });

      return { twoFactorDisabled: true };
    } catch (err) {
      console.error('Error disabling 2FA for user', user.userId, err);
      throw new Error('DISABLE_2FA_FAILED');
    }
  }

  // Default: force reconfiguration (reset === true or undefined)
  try {
    const secret = TotpService.generateSecret();
    const { plain: plainBackupCodes, hashed: hashedBackupCodes } =
      TotpService.generateBackupCodes();

    const dbBackupCodes = JSON.stringify(
      hashedBackupCodes.map(code => ({ code, used: false }))
    );

    // Persist secret + backup codes atomically
    await db.transaction(async trx => {
      await trx('users')
        .where({ id: user.userId })
        .update({
          two_factor_secret: secret.base32,
          two_factor_enabled: true,
          updated_at: trx.fn.now ? trx.fn.now() : db.fn.now(),
        });

      await trx('backup_code').where({ user_id: user.userId }).delete();
      await trx('backup_code').insert({
        user_id: user.userId,
        two_factor_backup_codes: dbBackupCodes,
        created_at: new Date(),
        updated_at: new Date(),
      });
    });

    const qrCode = await TotpService.generateQrCode(secret.base32, user.email);

    return {
      reconfigure2fa: true,
      qrCode,
      backupCodes: plainBackupCodes,
    };
  } catch (err) {
    console.error(
      'Failed to prepare 2FA reconfiguration for',
      user.userId,
      err
    );
    throw new Error('RECONFIGURE_2FA_FAILED');
  }
}
