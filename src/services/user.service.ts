import db from '../database/connection';
import { TopupRequestModel } from '../models/TopupRequest';
import { TransactionModel } from '../models/Transaction';
import { UserModel, UserProfileView } from '../models/User';
import {
  TopupRequestFilters,
  TopupRequestQueryResult,
} from '../types/topup.types';
import {
  TransactionFilters,
  TransactionQueryResult,
} from '../types/transaction.types';
import { ApiError } from '../utils/ApiError';
import { comparePassword, hashPassword } from '../utils/security.utils';

export class UserService {
  /**
   * Retrieves the full public profile of a user.
   * @param userId - The ID of the user.
   * @returns The user's profile object.
   */
  static async getUserProfile(userId: string): Promise<UserProfileView> {
    const user = await UserModel.findProfileById(userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }
    return user;
  }

  /**
   * Updates a user's profile information.
   * @param userId - The ID of the user.
   * @param profileData - The data to update.
   * @returns The updated user profile object.
   */
  static async updateUserProfile(
    userId: string,
    profileData: { fullName?: string }
  ): Promise<UserProfileView> {
    if (!profileData.fullName) {
      throw new ApiError(400, 'Full name is required for update.');
    }

    await db('users').where({ id: userId }).update({
      full_name: profileData.fullName,
      updated_at: db.fn.now(),
    });

    const updatedProfile = await this.getUserProfile(userId);
    return updatedProfile;
  }

  /**
   * Sets or updates a user's transaction PIN.
   * @param userId - The ID of the user.
   * @param pin - The new 5-digit PIN.
   * @param currentPassword - The user's current password for verification.
   */
  static async setTransactionPin(
    userId: string,
    pin: string,
    currentPassword?: string
  ): Promise<void> {
    if (!/^\d{4}$/.test(pin)) {
      throw new ApiError(400, 'PIN must be a 4-digit number.');
    }

    const userAuth = await UserModel.findById(userId);
    if (!userAuth) {
      throw new ApiError(404, 'User not found');
    }

    const userProfile = await UserModel.findProfileById(userId);

    // If a PIN already exists, require the password to change it.
    if (userProfile?.pin && !currentPassword) {
      throw new ApiError(400, 'Current password is required to change PIN.');
    }

    if (userProfile?.pin && currentPassword) {
      const isPasswordValid = await comparePassword(
        currentPassword,
        userAuth.password || ''
      );
      if (!isPasswordValid) {
        throw new ApiError(401, 'Invalid password.');
      }
    }

    const hashedPin = await hashPassword(pin);
    await db('users').where({ id: userId }).update({ pin: hashedPin });
  }

  /**
   * Retrieves a user's transaction history.
   * @param userId - The ID of the user.
   * @param filters - Filtering and pagination options.
   */
  static async getTransactionHistory(
    userId: string,
    filters: Omit<TransactionFilters, 'userId'>
  ): Promise<TransactionQueryResult> {
    const userFilters: TransactionFilters = { ...filters, userId };
    return TransactionModel.findAll(userFilters);
  }

  /**
   * Retrieves a user's purchase history (topup requests).
   * @param userId - The ID of the user.
   * @param filters - Filtering and pagination options.
   */
  static async getPurchaseHistory(
    userId: string,
    filters: Omit<TopupRequestFilters, 'userId'>
  ): Promise<TopupRequestQueryResult> {
    const userFilters: TopupRequestFilters = { ...filters, userId };
    return TopupRequestModel.findAll(userFilters);
  }
}
