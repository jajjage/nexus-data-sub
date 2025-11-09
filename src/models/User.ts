import { Knex } from 'knex';
import db from '../database/connection';
import { generateSecureToken, generateUUID } from '../utils/crypto';
import { hashPassword } from '../utils/security.utils';

// =================================================================
// User-facing Interfaces (DTOs)
// =================================================================

/**
 * Represents the data for a newly registered user.
 */
export interface RegisteredUser {
  userId: string;
  email: string;
  fullName: string | null;
  phoneNumber: string | null;
  role: 'user' | 'staff' | 'admin';
  isVerified: boolean;
  permissions?: string[];
}

/**
 * Represents the publicly safe view of a user's profile.
 */
export interface UserProfileView {
  userId: string;
  fullName: string | null;
  email: string;
  phoneNumber: string | null;
  role: 'user' | 'staff' | 'admin';
  isSuspended: boolean;
  isVerified: boolean;
  twoFactorEnabled: boolean;
  accountNumber: string | null;
  providerName: string | null;
  balance: string;
  pin: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Represents the data required for authentication checks.
 */
export interface UserAuthPayload {
  userId: string;
  email: string;
  password?: string;
  role: 'user' | 'staff' | 'admin';
  roleId: string;
  isVerified: boolean;
  isSuspended: boolean;
  twoFactorEnabled: boolean;
  twoFactorSecret: string | null;
  permissions: string[];
}

/**
 * Represents the input for creating a new user.
 */
export interface CreateUserInput {
  email: string;
  fullName?: string;
  phoneNumber?: string;
  password: string;
  role: 'user' | 'staff' | 'admin';
}

// =================================================================
// User Model Class
// =================================================================

export class UserModel {
  /**
   * Creates a new user in the database.
   * This is a transactional operation.
   * @param userData - The data for the new user.
   * @param client - An optional Knex transaction client.
   * @returns The newly created user object.
   */
  static async create(
    userData: CreateUserInput,
    client?: Knex.Transaction
  ): Promise<RegisteredUser> {
    const dbConnection = client || db;
    const hashedPassword = await hashPassword(userData.password);
    const userId = generateUUID();

    const role = await dbConnection('roles')
      .where('name', userData.role)
      .first();
    if (!role) {
      // Fallback to 'user' role if the provided role is invalid
      const userRole = await dbConnection('roles')
        .where('name', 'user')
        .first();
      if (!userRole) throw new Error('Default user role not found.'); // Should not happen
      Object.assign(role, userRole);
    }

    const [newUser] = await dbConnection('users')
      .insert({
        id: userId,
        email: userData.email.toLowerCase().trim(),
        full_name: userData.fullName?.trim() ?? null,
        phone_number: userData.phoneNumber?.replace(/\D/g, '') ?? null,
        password: hashedPassword,
        role: role.name,
        role_id: role.id,
        is_verified: true, // Users are verified by default now
      })
      .returning([
        'id',
        'email',
        'full_name',
        'phone_number',
        'role',
        'is_verified',
      ]);

    return {
      userId: newUser.id,
      email: newUser.email,
      fullName: newUser.full_name,
      phoneNumber: newUser.phone_number,
      role: newUser.role,
      isVerified: newUser.is_verified,
    };
  }

  /**
   * Finds a user by their ID and returns their public profile.
   * @param userId - The ID of the user to find.
   * @returns A user profile object or null if not found.
   */
  static async findProfileById(
    userId: string
  ): Promise<UserProfileView | null> {
    const user = await this._baseQuery().where('u.id', userId).first();
    if (!user) {
      return null;
    }
    // Manual mapping to ensure correct property names
    return {
      userId: user.id,
      fullName: user.full_name,
      email: user.email,
      phoneNumber: user.phone_number,
      role: user.role,
      isSuspended: user.is_suspended,
      isVerified: user.is_verified,
      twoFactorEnabled: user.two_factor_enabled,
      accountNumber: user.account_number,
      providerName: user.providerName,
      balance: user.balance,
      pin: user.pin,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };
  }

  /**
   * Finds a user by their ID for authentication and authorization.
   * @param userId - The ID of the user to find.
   * @returns A user auth payload object or null if not found.
   */
  static async findById(userId: string): Promise<UserAuthPayload | null> {
    const userRow = await db('users as u')
      .select(
        'u.id',
        'u.email',
        'u.password',
        'u.role',
        'u.role_id',
        'u.is_verified',
        'u.is_suspended',
        'u.two_factor_enabled',
        'u.two_factor_secret'
      )
      .where('u.id', userId)
      .first();

    if (!userRow) {
      return null;
    }

    const permissions = await this.getPermissions(userRow.role_id);

    return {
      userId: userRow.id,
      email: userRow.email,
      password: userRow.password,
      role: userRow.role,
      roleId: userRow.role_id,
      isVerified: userRow.is_verified,
      isSuspended: userRow.is_suspended,
      twoFactorEnabled: userRow.two_factor_enabled,
      twoFactorSecret: userRow.two_factor_secret,
      permissions,
    };
  }

  /**
   * Finds a user by email or phone number for authentication purposes.
   * Fetches all necessary details for login, including password and permissions.
   * @param identifier - The user's email or phone number.
   * @returns A user auth payload object or null if not found.
   */
  static async findForAuth(
    identifier: string
  ): Promise<UserAuthPayload | null> {
    const isEmail = identifier.includes('@');
    const column = isEmail ? 'u.email' : 'u.phone_number';
    const value = isEmail
      ? identifier.toLowerCase().trim()
      : identifier.replace(/\D/g, '');

    const userRow = await db('users as u')
      .select(
        'u.id',
        'u.email',
        'u.password',
        'u.role',
        'u.role_id',
        'u.is_verified',
        'u.is_suspended',
        'u.two_factor_enabled',
        'u.two_factor_secret'
      )
      .where(column, value)
      .first();

    if (!userRow) {
      return null;
    }

    const permissions = await this.getPermissions(userRow.role_id);

    return {
      userId: userRow.id,
      email: userRow.email,
      password: userRow.password,
      role: userRow.role,
      roleId: userRow.role_id,
      isVerified: userRow.is_verified,
      isSuspended: userRow.is_suspended,
      twoFactorEnabled: userRow.two_factor_enabled,
      twoFactorSecret: userRow.two_factor_secret,
      permissions,
    };
  }

  /**
   * Finds all users with a given role.
   * @param role - The role to search for.
   * @returns A list of users with that role.
   */
  static async findByRole(
    role: 'user' | 'staff' | 'admin'
  ): Promise<UserAuthPayload[]> {
    const users = await db('users as u')
      .select(
        'u.id',
        'u.email',
        'u.password',
        'u.role',
        'u.role_id',
        'u.is_verified',
        'u.is_suspended',
        'u.two_factor_enabled',
        'u.two_factor_secret'
      )
      .where('u.role', role);

    return Promise.all(
      users.map(async user => {
        const permissions = await this.getPermissions(user.role_id);
        return {
          userId: user.id,
          email: user.email,
          password: user.password,
          role: user.role,
          roleId: user.role_id,
          isVerified: user.is_verified,
          isSuspended: user.is_suspended,
          twoFactorEnabled: user.two_factor_enabled,
          twoFactorSecret: user.two_factor_secret,
          permissions,
        };
      })
    );
  }

  /**
   * Retrieves a list of permission names for a given role ID.
   * @param roleId - The ID of the role.
   * @returns An array of permission strings.
   */
  static async getPermissions(roleId: string): Promise<string[]> {
    const permissions = await db('role_permissions as rp')
      .join('permissions as p', 'rp.permission_id', 'p.id')
      .where('rp.role_id', roleId)
      .select('p.name');
    return permissions.map(p => p.name);
  }

  /**
   * Updates a user's password.
   * @param userId - The ID of the user.
   * @param newPassword - The new password.
   */
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

  /**
   * Generates and stores a password reset token for a user.
   * @param userId - The ID of the user.
   * @returns The generated token.
   */
  static async generatePasswordResetToken(userId: string): Promise<string> {
    const token = generateSecureToken();
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await db('users').where({ id: userId }).update({
      password_reset_token: token,
      password_reset_token_expires_at: expires,
    });
    return token;
  }

  /**
   * Finds a user by a valid password reset token.
   * @param token - The password reset token.
   * @returns The user's profile or null if not found or token is expired.
   */
  static async findByPasswordResetToken(
    token: string
  ): Promise<UserProfileView | null> {
    const user = await this._baseQuery()
      .where({ password_reset_token: token })
      .andWhere('password_reset_token_expires_at', '>', db.fn.now())
      .first();

    if (!user) {
      return null;
    }

    return {
      userId: user.id,
      fullName: user.full_name,
      email: user.email,
      phoneNumber: user.phone_number,
      role: user.role,
      isSuspended: user.is_suspended,
      isVerified: user.is_verified,
      twoFactorEnabled: user.two_factor_enabled,
      accountNumber: user.account_number,
      providerName: user.providerName,
      balance: user.balance,
      pin: user.pin,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };
  }

  /**
   * Enables 2FA for a user and stores the secret and backup codes.
   * @param userId - The ID of the user.
   * @param secret - The 2FA secret.
   * @param backupCodes - The hashed backup codes.
   */
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
      // Clear old codes and insert new ones
      await trx('backup_code').where({ user_id: userId }).delete();
      await trx('backup_code').insert({
        user_id: userId,
        two_factor_backup_codes: backupCodes,
      });
    });
  }

  /**
   * Disables 2FA for a user.
   * @param userId - The ID of the user.
   */
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

  /**
   * Updates the backup codes for a user.
   * @param userId - The ID of the user.
   * @param backupCodes - The new hashed backup codes.
   */
  static async updateBackupCodes(
    userId: string,
    backupCodes: string
  ): Promise<void> {
    await db('backup_code').where({ user_id: userId }).update({
      two_factor_backup_codes: backupCodes,
      updated_at: db.fn.now(),
    });
  }

  // =================================================================
  // Private Helper Methods
  // =================================================================

  /**
   * Creates a base Knex query for fetching user profile data.
   * This helps avoid code duplication.
   */
  private static _baseQuery() {
    return db('users as u')
      .leftJoin('wallets as w', 'u.id', 'w.user_id')
      .leftJoin('virtual_accounts as va', 'u.id', 'va.user_id')
      .leftJoin('providers as p', 'va.provider_id', 'p.id')
      .select(
        'u.id',
        'u.full_name',
        'u.email',
        'u.phone_number',
        'u.role',
        'u.is_suspended',
        'u.is_verified',
        'u.two_factor_enabled',
        'u.pin',
        'u.created_at',
        'u.updated_at',
        'w.balance',
        'va.account_number',
        'p.name as providerName'
      );
  }
}
