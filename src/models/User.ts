import { Knex } from 'knex';
import db from '../database/connection';
import { generateSecureToken, generateUUID } from '../utils/crypto';
import { hashPassword } from '../utils/security.utils';

export interface User {
  userId: string;
  backupId?: string;
  email: string;
  password?: string;
  role: 'reporter' | 'staff' | 'admin' | 'observer';
  roleId?: string;
  isVerified: boolean;
  verificationToken?: string | null;
  verificationTokenExpiresAt?: Date | null;
  twoFactorEnabled?: boolean;
  twoFactorSecret?: string | null;
  twoFactorBackupCodes?: string | null;
  passwordResetToken?: string | null;
  passwordResetTokenExpiresAt?: Date | null;
  permissions?: {
    id: string;
    name: string;
    description: string;
  }[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface RegisterUser {
  userId: string;
  email: string;
  password?: string;
  role: 'reporter' | 'staff' | 'admin';
  roleId?: string;
  isVerified: boolean;
  verificationToken?: string | null;
}

export interface BackupCode {
  id: string;
  userId: string;
  twoFactorBackupCodes: string | null;
  isUsed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserInput {
  email: string;
  password: string;
  role: 'reporter' | 'staff' | 'admin' | 'observer';
}

const userColumns = [
  'u.id as userId',
  'u.email',
  'u.password',
  'u.role',
  'u.is_verified as isVerified',
  'u.two_factor_enabled as twoFactorEnabled',
  'u.two_factor_secret as twoFactorSecret',
  'b.id as backupId',
  'b.two_factor_backup_codes as twoFactorBackupCodes',
];

const permissionColumns = [
  'p.id as permission_id',
  'p.name as permission_name',
  'p.description as permission_description',
];

const shapeUserFromRows = (rows: any[]): User | null => {
  if (rows.length === 0) {
    return null;
  }
  const firstRow = rows[0];
  return {
    userId: firstRow.userId,
    backupId: firstRow.backupId,
    email: firstRow.email,
    password: firstRow.password,
    role: firstRow.role,
    isVerified: firstRow.isVerified,
    twoFactorSecret: firstRow.twoFactorSecret,
    twoFactorEnabled: firstRow.twoFactorEnabled,
    twoFactorBackupCodes: firstRow.twoFactorBackupCodes,
    permissions: rows[0].permission_id
      ? rows.map(row => ({
          id: row.permission_id,
          name: row.permission_name,
          description: row.permission_description,
        }))
      : [],
  };
};

export class UserModel {
  static async create(
    userData: CreateUserInput,
    client?: Knex.Transaction
  ): Promise<RegisterUser> {
    const dbConnection = client || db;
    const hashedPassword = await hashPassword(userData.password);
    const userId = generateUUID();
    const verificationToken = generateSecureToken();
    const verificationTokenExpiresAt = new Date(
      Date.now() + 24 * 60 * 60 * 1000
    ); // 24 hours

    const role = await dbConnection('roles')
      .where('name', userData.role)
      .first();
    if (!role) {
      throw new Error(`Role ${userData.role} not found`);
    }

    const [newUser] = await dbConnection('users')
      .insert({
        id: userId,
        email: userData.email,
        password: hashedPassword,
        role: userData.role,
        role_id: role.id,
        verification_token: verificationToken,
        verification_token_expires_at: verificationTokenExpiresAt,
      })
      .returning('*');

    return {
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role,
      isVerified: newUser.is_verified,
      verificationToken: newUser.verification_token,
    };
  }

  static async findById(id: string): Promise<User | null> {
    const rows = await db('users as u')
      .leftJoin('backup_code as b', 'u.id', 'b.user_id')
      .leftJoin('roles as r', 'u.role_id', 'r.id')
      .leftJoin('role_permissions as rp', 'r.id', 'rp.role_id')
      .leftJoin('permissions as p', 'rp.permission_id', 'p.id')
      .select([...userColumns, ...permissionColumns])
      .where('u.id', id)
      .orderBy('p.name');

    return shapeUserFromRows(rows);
  }

  static async findByEmail(email: string): Promise<User | null> {
    const trimmedEmail = email.trim().toLowerCase();

    // Get basic user info
    const userRow = await db('users as u')
      .leftJoin('roles as r', 'u.role_id', 'r.id')
      .select([
        'u.id as userId',
        'u.email',
        'u.password',
        'u.role',
        'u.role_id',
        'u.is_verified as isVerified',
        'u.two_factor_enabled as twoFactorEnabled',
        'u.two_factor_secret as twoFactorSecret',
        'r.name as roleName',
      ])
      .whereRaw('LOWER(u.email) = ?', [trimmedEmail])
      .first();

    if (!userRow) return null;

    // Get permissions separately
    const permissions = await db('role_permissions as rp')
      .join('permissions as p', 'rp.permission_id', 'p.id')
      .select('p.name')
      .where('rp.role_id', userRow.role_id);

    // Get backup codes if needed
    const backupCodes = await db('backup_code')
      .select(
        'id as backupId',
        'two_factor_backup_codes as twoFactorBackupCodes'
      )
      .where('user_id', userRow.userId);

    return {
      ...userRow,
      permissions,
      backupCodes,
    };
  }

  static async getAllUsers(
    page: number = 1,
    limit: number = 10
  ): Promise<{ users: User[]; total: number }> {
    const offset = (page - 1) * limit;

    const countResult = await db('users').count('id as total').first();
    const total = parseInt(countResult?.total?.toString() || '0', 10);

    const users = await db('users')
      .select(
        'id as userId',
        'email',
        'role',
        'is_verified as isVerified',
        'two_factor_enabled as twoFactorEnabled',
        'created_at as createdAt',
        'updated_at as updatedAt'
      )
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);

    return { users, total };
  }

  static async verifyEmail(token: string): Promise<boolean> {
    const result = await db('users')
      .where({ verification_token: token, is_verified: false })
      .andWhere('verification_token_expires_at', '>', db.fn.now())
      .update({
        is_verified: true,
        verification_token: null,
        updated_at: db.fn.now(),
      });

    return result > 0;
  }

  static async updatePassword(
    userId: string,
    newPassword: string
  ): Promise<void> {
    const hashedPassword = await hashPassword(newPassword);
    await db('users').where({ id: userId }).update({
      password: hashedPassword,
      password_reset_token: null,
      password_reset_token_expires_at: null,
      updated_at: db.fn.now(),
    });
  }

  static async generatePasswordResetToken(userId: string): Promise<string> {
    const token = generateSecureToken();
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await db('users').where({ id: userId }).update({
      password_reset_token: token,
      password_reset_token_expires_at: expires,
    });
    return token;
  }

  static async findByPasswordResetToken(token: string): Promise<User | null> {
    const row = await db('users')
      .where({ password_reset_token: token })
      .andWhere('password_reset_token_expires_at', '>', db.fn.now())
      .first();

    if (!row) return null;

    return {
      userId: row.id,
      email: row.email,
      role: row.role,
      isVerified: row.is_verified,
    };
  }

  static async generateVerificationToken(userId: string): Promise<string> {
    const token = generateSecureToken();
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    await db('users').where({ id: userId }).update({
      verification_token: token,
      verification_token_expires_at: expires,
    });
    return token;
  }

  static async updateRole(userId: string, roleName: string): Promise<void> {
    const role = await db('roles').where({ name: roleName }).first();
    if (!role) {
      throw new Error(`Role ${roleName} not found`);
    }

    await db('users').where({ id: userId }).update({
      role: roleName,
      role_id: role.id,
      updated_at: db.fn.now(),
    });
  }

  static async enable2FA(
    userId: string,
    secret: string,
    backupCodes: string
  ): Promise<void> {
    await db.transaction(async trx => {
      await trx('users').where({ id: userId }).update({
        two_factor_enabled: true,
        two_factor_secret: secret,
        updated_at: db.fn.now(),
      });
      await trx('backup_code').insert({
        user_id: userId,
        two_factor_backup_codes: backupCodes,
      });
    });
  }

  static async disable2FA(userId: string): Promise<void> {
    await db.transaction(async trx => {
      await trx('users').where({ id: userId }).update({
        two_factor_enabled: false,
        two_factor_secret: null,
        updated_at: db.fn.now(),
      });
      await trx('backup_code').where({ user_id: userId }).delete();
    });
  }

  static async updateBackupCodes(
    userId: string,
    backupCodes: string
  ): Promise<void> {
    await db('backup_code').where({ user_id: userId }).update({
      two_factor_backup_codes: backupCodes,
      updated_at: db.fn.now(),
    });
  }

  static async cleanupExpiredTokens(): Promise<void> {
    await db('users')
      .where(function () {
        this.whereNotNull('verification_token_expires_at').andWhere(
          'verification_token_expires_at',
          '<',
          db.fn.now()
        );
      })
      .orWhere(function () {
        this.whereNotNull('password_reset_token_expires_at').andWhere(
          'password_reset_token_expires_at',
          '<',
          db.fn.now()
        );
      })
      .update({
        verification_token: null,
        verification_token_expires_at: null,
        password_reset_token: null,
        password_reset_token_expires_at: null,
      });
  }
}
