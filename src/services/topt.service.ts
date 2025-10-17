import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { UserModel } from '../models/User';
import { hashBackupCode, safeCompare } from '../utils/crypto';
import db from '../database/connection';

export interface TotpSetup {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

export class TotpService {
  static generateSecret(): speakeasy.GeneratedSecret {
    return speakeasy.generateSecret({
      name: 'Election Monitoring',
      issuer: 'Election Auth Service',
      length: 20,
    });
  }

  static async generateQrCode(secret: string, email: string): Promise<string> {
    const otpauthUrl = speakeasy.otpauthURL({
      secret: secret,
      label: email,
      issuer: 'Election Monitoring',
      encoding: 'base32',
    });

    return await QRCode.toDataURL(otpauthUrl);
  }

  static verifyToken(secret: string, token: string): boolean {
    return speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token,
      window: 1, // Allow 1 time step window for clock drift
    });
  }

  static generateBackupCodes(count: number = 8): {
    plain: string[];
    hashed: string[];
  } {
    const codes: string[] = [];
    const hashedCodes: string[] = [];
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

    for (let i = 0; i < count; i++) {
      let code = '';
      for (let j = 0; j < 8; j++) {
        code += characters.charAt(
          Math.floor(Math.random() * characters.length)
        );
      }
      codes.push(code);
      hashedCodes.push(hashBackupCode(code));
    }
    return { plain: codes, hashed: hashedCodes };
  }

  static async setup2FA(userId: string): Promise<TotpSetup> {
    // Generate secret
    const secret = this.generateSecret();

    // Get user email
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    await db('users').where({ id: userId }).update({
      two_factor_secret: secret.base32,
      updated_at: db.fn.now(),
    });

    // Generate QR code
    const qrCode = await this.generateQrCode(secret.base32, user.email);

    // Generate backup codes
    const { plain: backupCodes } = this.generateBackupCodes();

    return {
      secret: secret.base32,
      qrCode,
      backupCodes,
    };
  }

  static async verifyBackupCode(
    userId: string,
    backupCode: string
  ): Promise<boolean> {
    // Fetch backup codes directly from backup_code table to avoid race conditions
    const backupCodeRecord = await db('backup_code')
      .where({ user_id: userId })
      .first();

    if (!backupCodeRecord || !backupCodeRecord.two_factor_backup_codes) {
      return false;
    }

    const hashedCode = hashBackupCode(backupCode);
    const backupCodes: { code: string; used: boolean }[] = JSON.parse(
      backupCodeRecord.two_factor_backup_codes
    );
    const codeIndex = backupCodes.findIndex(
      c => safeCompare(c.code, hashedCode) && !c.used
    );

    if (codeIndex === -1) {
      return false;
    }

    // Mark the code as used atomically using database transaction
    const trx = await db.transaction();
    try {
      const currentRecord = await trx('backup_code')
        .where({ user_id: userId })
        .select('two_factor_backup_codes as two_factor_backup_codes')
        .first();
      
      if (!currentRecord) {
        await trx.rollback();
        return false;
      }

      const currentBackupCodes: { code: string; used: boolean }[] = JSON.parse(
        currentRecord.two_factor_backup_codes
      );
      
      const currentIndex = currentBackupCodes.findIndex(
        c => safeCompare(c.code, hashedCode) && !c.used
      );
      
      if (currentIndex === -1) {
        await trx.rollback();
        return false;
      }

      currentBackupCodes[currentIndex].used = true;
      
      await trx('backup_code')
        .where({ user_id: userId })
        .update({ 
          two_factor_backup_codes: JSON.stringify(currentBackupCodes),
          updated_at: db.fn.now()
        });

      await trx.commit();
      return true;
    } catch (error) {
      await trx.rollback();
      return false;
    }
  }
}
