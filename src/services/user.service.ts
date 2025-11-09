import db from '../database/connection';
import { TopupRequestModel } from '../models/TopupRequest';
import { TransactionModel } from '../models/Transaction';
import { UserModel, UserProfileView } from '../models/User';
import {
  TopupRequest,
  TopupRequestFilters,
  TopupRequestQueryResult,
} from '../types/topup.types';
import {
  Transaction,
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

  static async getTransactionById(
    transactionId: string,
    userId: string
  ): Promise<Transaction> {
    const transaction = await TransactionModel.findById(transactionId);
    if (!transaction || transaction.userId !== userId) {
      throw new ApiError(404, 'Transaction not found');
    }
    return transaction;
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

  static async createTopupRequest(
    userId: string,
    amount: number,
    operatorCode: string,
    recipientPhone: string
  ): Promise<TopupRequest> {
    return db.transaction(async trx => {
      // 1. Get user's wallet
      const wallet = await trx('wallets').where({ user_id: userId }).first();
      if (!wallet) {
        throw new Error('Wallet not found');
      }

      // 2. Check for sufficient balance
      if (wallet.balance < amount) {
        throw new Error('Insufficient balance');
      }

      // 3. Get operator by code
      const operator = await trx('operators')
        .where({ code: operatorCode })
        .first();
      if (!operator) {
        throw new Error('Operator not found');
      }

      // 4. Get operator product and supplier mapping
      const operatorProduct = await trx('operator_products')
        .where({ operator_id: operator.id, denom_amount: amount })
        .first();
      if (!operatorProduct) {
        throw new Error('Operator product not found');
      }

      const supplier = await trx('suppliers').first();
      if (!supplier) {
        throw new Error('Supplier not found');
      }

      const supplierProductMapping = await trx('supplier_product_mapping')
        .where({
          operator_product_id: operatorProduct.id,
          supplier_id: supplier.id,
        })
        .first();
      if (!supplierProductMapping) {
        throw new Error('Supplier product mapping not found');
      }

      // 5. Create a new top-up request
      const topupRequestData: Omit<
        TopupRequest,
        'id' | 'createdAt' | 'updatedAt' | 'externalId'
      > = {
        userId,
        amount,
        operatorId: operator.id,
        recipientPhone,
        status: 'pending',
        operatorProductId: operatorProduct.id,
        supplierId: supplier.id,
        supplierMappingId: supplierProductMapping.id,
        cost: 0,
        attemptCount: 0,
        idempotencyKey: '',
        requestPayload: {},
      };
      const newTopupRequest = await TopupRequestModel.create(
        topupRequestData,
        trx
      );
      console.log('topupRequestData:', topupRequestData);
      console.log('newTopupRequest:', newTopupRequest);

      // 6. Debit the user's wallet
      const newBalance = wallet.balance - amount;
      await trx('wallets')
        .where({ user_id: userId })
        .update({ balance: newBalance });

      // 7. Create a debit transaction
      if (!wallet) {
        throw new Error('Wallet not found');
      }
      await TransactionModel.create(
        {
          walletId: wallet.id,
          userId,
          direction: 'debit',
          amount,
          balanceAfter: newBalance,
          method: 'wallet',
          relatedType: 'topup_request',
          relatedId: newTopupRequest.id,
        },
        trx
      );

      return newTopupRequest;
    });
  }
}
