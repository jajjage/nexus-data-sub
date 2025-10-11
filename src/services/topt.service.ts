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
    const user = await UserModel.findById(userId);
    if (!user || !user.twoFactorBackupCodes) {
      return false;
    }

    const hashedCode = hashBackupCode(backupCode);
    const backupCodes: { code: string; used: boolean }[] = JSON.parse(
      user.twoFactorBackupCodes
    );
    const codeIndex = backupCodes.findIndex(
      c => safeCompare(c.code, hashedCode) && !c.used
    );

    if (codeIndex === -1) {
      return false;
    }

    backupCodes[codeIndex].used = true;
    await UserModel.updateBackupCodes(userId, JSON.stringify(backupCodes));

    return true;
  }
}
