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
import { generateSecureString } from '../utils/crypto';
import { comparePassword, hashPassword } from '../utils/security.utils';

export class UserService {
  /**
   * Retrieves the full public profile of a user.
   * @param userId - The ID of the user.
   * @returns The user's profile object.
   */
  static async getUserProfile(userId: string): Promise<UserProfileView> {
    const userData = await UserModel.findProfileById(userId);
    if (!userData) {
      throw new ApiError(404, 'User not found');
    }

    return {
      userId: userData.userId,
      fullName: userData.fullName,
      email: userData.email,
      phoneNumber: userData.phoneNumber,
      role: userData.role,
      isSuspended: userData.isSuspended,
      isVerified: userData.isVerified,
      twoFactorEnabled: userData.twoFactorEnabled,
      accountNumber: userData.accountNumber,
      providerName: userData.providerName,
      balance: userData.balance,
      profilePictureUrl: userData.profilePictureUrl,
      permissions: userData.permissions || [],
      createdAt: userData.createdAt,
      updatedAt: userData.updatedAt,
    };
  }

  /**
   * Updates a user's profile information.
   * @param userId - The ID of the user.
   * @param profileData - The data to update.
   * @returns The updated user profile object.
   */
  static async updateUserProfile(
    userId: string,
    profileData: { fullName?: string; profilePictureUrl?: string }
  ): Promise<UserProfileView> {
    if (!profileData.fullName && !profileData.profilePictureUrl) {
      throw new ApiError(
        400,
        'At least one of fullName or profilePictureUrl is required for update.'
      );
    }

    const updateData: any = { updated_at: db.fn.now() };
    if (profileData.fullName) {
      updateData.full_name = profileData.fullName;
    }
    if (profileData.profilePictureUrl !== undefined) {
      updateData.profile_picture_url = profileData.profilePictureUrl;
    }

    await db('users').where({ id: userId }).update(updateData);

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
    const transaction =
      await TransactionModel.findByIdWithRelated(transactionId);
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
    productCode: string,
    recipientPhone: string,
    supplierSlug?: string,
    supplierMappingId?: string
  ): Promise<TopupRequest> {
    let topup_type = productCode.includes('DATA') ? 'data' : 'airtime';
    let idempotencyKey = generateSecureString(15, userId);
    return db.transaction(async trx => {
      // 1. Get user's wallet
      const wallet = await trx('wallets').where({ user_id: userId }).first();
      if (!wallet) {
        throw new ApiError(404, 'Wallet not found');
      }

      // 2. Check for sufficient balance
      if (wallet.balance < amount) {
        throw new ApiError(402, 'Insufficient balance');
      }

      // Try to find the operator product by canonical product_code and amount
      const operatorProduct = await trx('operator_products')
        .where({ product_code: productCode, denom_amount: amount })
        .first();
      if (!operatorProduct) {
        throw new ApiError(404, 'Operator product not found');
      }

      // Resolve supplier/mapping in order of preference:
      // 1) supplierMappingId (explicit mapping)
      // 2) supplierSlug (frontend provided)
      // 3) operatorProduct.slug (product default)
      // 4) fallback to any active supplier

      let supplier: any | undefined;
      let supplierProductMapping: any | undefined;

      if (supplierMappingId) {
        supplierProductMapping = await trx('supplier_product_mapping')
          .where({
            id: supplierMappingId,
            operator_product_id: operatorProduct.id,
          })
          .first();
        if (!supplierProductMapping) {
          throw new ApiError(
            404,
            'Supplier product mapping not found for provided mapping id'
          );
        }
        supplier = await trx('suppliers')
          .where({ id: supplierProductMapping.supplier_id, is_active: true })
          .first();
        if (!supplier) {
          throw new ApiError(
            404,
            'Supplier for provided mapping is not available'
          );
        }
      } else if (supplierSlug) {
        supplier = await trx('suppliers')
          .where({ slug: supplierSlug, is_active: true })
          .first();
        if (!supplier) {
          throw new ApiError(404, 'Supplier not found for provided slug');
        }
        supplierProductMapping = await trx('supplier_product_mapping')
          .where({
            operator_product_id: operatorProduct.id,
            supplier_id: supplier.id,
            is_active: true,
          })
          .first();
        if (!supplierProductMapping) {
          throw new ApiError(
            404,
            'Supplier product mapping not found for provided supplier slug'
          );
        }
      } else if (operatorProduct.slug) {
        supplier = await trx('suppliers')
          .where({ slug: operatorProduct.slug, is_active: true })
          .first();
        if (supplier) {
          supplierProductMapping = await trx('supplier_product_mapping')
            .where({
              operator_product_id: operatorProduct.id,
              supplier_id: supplier.id,
              is_active: true,
            })
            .first();
        }
      }

      if (!supplier || !supplierProductMapping) {
        // Fallback: pick any active supplier and mapping
        supplier = await trx('suppliers').where({ is_active: true }).first();
        if (supplier) {
          supplierProductMapping = await trx('supplier_product_mapping')
            .where({
              operator_product_id: operatorProduct.id,
              supplier_id: supplier.id,
              is_active: true,
            })
            .first();
        }
      }

      if (!supplier || !supplierProductMapping) {
        throw new ApiError(
          404,
          'Supplier or supplier product mapping not found'
        );
      }

      // 5. Create a new top-up request
      const topupRequestData: Omit<
        TopupRequest,
        'id' | 'createdAt' | 'updatedAt' | 'externalId'
      > = {
        userId,
        amount,
        operatorId: operatorProduct.operator_id,
        recipientPhone,
        status: 'pending',
        operatorProductId: operatorProduct.id,
        supplierId: supplier.id,
        supplierMappingId: supplierProductMapping.id,
        cost: 0,
        type: topup_type,
        attemptCount: 0,
        idempotencyKey: idempotencyKey,
        requestPayload: {},
      };
      const newTopupRequest = await TopupRequestModel.create(
        topupRequestData,
        trx
      );

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
          walletId: wallet.user_id,
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
