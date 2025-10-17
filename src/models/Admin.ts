import { Knex } from 'knex';
import db from '../database/connection';
import { SessionService } from '../services/session.service';
import {
  AdminUserView,
  DashboardStats,
  UserUpdateData,
  WalletAdjustmentResult,
} from '../types/admin.types';
import {
  CreateOperatorData,
  Operator,
  UpdateOperatorData,
} from '../types/operator.types';
import {
  CreateOperatorProductData,
  CreateSupplierProductMappingData,
  OperatorProduct,
  SupplierProductMapping,
  UpdateOperatorProductData,
} from '../types/product.types';
import {
  CreateSettlementData,
  Settlement,
  SettlementFilters,
} from '../types/settlement.types';
import {
  CreateSupplierData,
  Supplier,
  UpdateSupplierData,
} from '../types/supplier.types';
import {
  TopupRequestFilters,
  TopupRequestQueryResult,
  TopupRequestWithResponses,
} from '../types/topup.types';
import {
  Transaction,
  TransactionFilters,
  TransactionQueryResult,
} from '../types/transaction.types';
import { OperatorModel } from './Operator';
import { OperatorProductModel } from './OperatorProduct';
import { SettlementModel } from './Settlement';
import { SupplierModel } from './Supplier';
import { SupplierProductMappingModel } from './SupplierProductMapping';
import { TopupRequestModel } from './TopupRequest';
import { TransactionModel } from './Transaction';
import { CreateUserInput, UserModel } from './User';

export class AdminModel {
  static async getInactiveUsers(since: Date) {
    const inactiveUsers = await db('users')
      .select('id', 'full_name', 'email', 'phone_number')
      .whereNotIn('id', function () {
        this.select('user_id')
          .from('transactions')
          .where('created_at', '>=', since);
      });
    return inactiveUsers;
  }

  /**
   * Creates a new user.
   * @param userData - The data for the new user.
   * @returns The newly created user object.
   */
  static async createUser(userData: CreateUserInput) {
    // This logic is transactional within the UserModel.create method
    return UserModel.create(userData);
  }

  /**
   * Retrieves a user by their ID, including their wallet balance.
   * @param userId - The ID of the user to retrieve.
   * @returns The user object or null if not found.
   */
  static async getUserById(userId: string): Promise<AdminUserView | null> {
    const user = await db('users as u')
      .leftJoin('wallets as w', 'u.id', 'w.user_id')
      .select(
        'u.id',
        'u.full_name',
        'u.email',
        'u.phone_number',
        'u.role',
        'u.is_verified',
        'u.is_suspended',
        'w.balance'
      )
      .where('u.id', userId)
      .first();

    if (!user) {
      return null;
    }

    // Manually map to the camelCase view model
    return {
      userId: user.id,
      fullName: user.full_name,
      email: user.email,
      phoneNumber: user.phone_number,
      role: user.role,
      isVerified: user.is_verified,
      isSuspended: user.is_suspended,
      balance: user.balance,
    };
  }

  /**
   * Updates a user's details.
   * @param userId - The ID of the user to update.
   * @param userData - The user data to update.
   * @returns The updated user object.
   */
  static async updateUser(
    userId: string,
    userData: UserUpdateData,
    trx?: Knex.Transaction
  ): Promise<AdminUserView> {
    const connection = trx || db;
    const [updatedUser] = await connection('users')
      .where({ id: userId })
      .update({
        full_name: userData.fullName,
        phone_number: userData.phoneNumber,
        updated_at: db.fn.now(),
      })
      .returning([
        'id',
        'full_name',
        'email',
        'phone_number',
        'role',
        'is_verified',
        'is_suspended',
      ]);

    return {
      userId: updatedUser.id,
      fullName: updatedUser.full_name,
      email: updatedUser.email,
      phoneNumber: updatedUser.phone_number,
      role: updatedUser.role,
      isVerified: updatedUser.is_verified,
      isSuspended: updatedUser.is_suspended,
      balance: '0', // Balance is not returned from this query, default or fetch separately if needed
    };
  }

  /**
   * Updates a user's suspension status.
   * @param userId - The ID of the user to update.
   * @param isSuspended - The new suspension status.
   */
  static async updateUserStatus(
    userId: string,
    isSuspended: boolean,
    trx?: Knex.Transaction
  ): Promise<void> {
    const connection = trx || db;
    await connection('users')
      .where({ id: userId })
      .update({ is_suspended: isSuspended });
  }

  /**
   * Credits a user's wallet.
   * @param userId - The ID of the user to credit.
   * @param amount - The amount to credit.
   * @param adminId - The ID of the admin performing the action.
   */
  static async creditWallet(
    userId: string,
    amount: number,
    adminId: string
  ): Promise<WalletAdjustmentResult> {
    return db.transaction(async trx => {
      const wallet = await trx('wallets')
        .where({ user_id: userId })
        .forUpdate()
        .first();

      if (!wallet) {
        throw new Error('Wallet not found');
      }

      const newBalance = parseFloat(wallet.balance) + amount;

      await trx('wallets')
        .where({ user_id: userId })
        .update({ balance: newBalance });

      await trx('transactions').insert({
        user_id: userId,
        wallet_id: wallet.user_id,
        direction: 'credit',
        amount,
        balance_after: newBalance,
        method: 'admin_credit',
        related_type: 'admin',
        related_id: adminId,
        note: `Admin credit by ${adminId}`,
      });

      return { newBalance };
    });
  }

  /**
   * Debits a user's wallet.
   * @param userId - The ID of the user to debit.
   * @param amount - The amount to debit.
   * @param adminId - The ID of the admin performing the action.
   */
  static async debitWallet(
    userId: string,
    amount: number,
    adminId: string
  ): Promise<WalletAdjustmentResult> {
    return db.transaction(async trx => {
      const wallet = await trx('wallets')
        .where({ user_id: userId })
        .forUpdate()
        .first();

      if (!wallet) {
        throw new Error('Wallet not found');
      }

      if (parseFloat(wallet.balance) < amount) {
        throw new Error('Insufficient funds');
      }

      const newBalance = parseFloat(wallet.balance) - amount;

      await trx('wallets')
        .where({ user_id: userId })
        .update({ balance: newBalance });

      await trx('transactions').insert({
        user_id: userId,
        wallet_id: wallet.user_id,
        direction: 'debit',
        amount,
        balance_after: newBalance,
        method: 'admin_debit',
        related_type: 'admin',
        related_id: adminId,
        note: `Admin debit by ${adminId}`,
      });

      return { newBalance };
    });
  }

  /**
   * Retrieves dashboard statistics.
   * @returns An object containing dashboard stats.
   */
  static async getDashboardStats(): Promise<DashboardStats> {
    const totalUsers = await db('users').count('id as count').first();
    const totalTransactions = await db('transactions')
      .count('id as count')
      .first();
    const totalTopupRequests = await db('topup_requests')
      .count('id as count')
      .first();

    return {
      totalUsers: Number(totalUsers?.count || 0),
      totalTransactions: Number(totalTransactions?.count || 0),
      totalTopupRequests: Number(totalTopupRequests?.count || 0),
    };
  }

  /**
   * Retrieves all active sessions for a user.
   * @param userId The ID of the user.
   * @returns A promise that resolves to an array of session objects.
   */
  static async getUserSessions(userId: string): Promise<any[]> {
    return SessionService.getUserSessions(userId);
  }

  /**
   * Deletes all active sessions for a specific user.
   * @param userId The ID of the user whose sessions are to be deleted.
   * @returns A promise that resolves to the number of sessions deleted.
   */
  static async revokeUserSessions(userId: string): Promise<number> {
    return SessionService.deleteAllUserSessions(userId);
  }

  static async getAllUsers(page: number, limit: number) {
    const offset = (page - 1) * limit;
    const users = await db('users')
      .select(
        'id',
        'full_name',
        'email',
        'phone_number',
        'role',
        'is_suspended'
      )
      .limit(limit)
      .offset(offset);
    const total = await db('users').count('id as count').first();
    return { users, total: total ? Number(total.count) : 0 };
  }

  static async assignRole(
    userId: string,
    roleId: string,
    trx?: Knex.Transaction
  ) {
    const connection = trx || db;
    const role = await connection('roles').where('id', roleId).first();
    if (!role) {
      throw new Error('Role not found');
    }
    await connection('users').where('id', userId).update({
      role: role.name,
      role_id: role.id,
    });
    return role;
  }

  static async disable2FA(userId: string, trx?: Knex.Transaction) {
    const connection = trx || db;
    await connection.transaction(async trx => {
      await trx('users').where({ id: userId }).update({
        two_factor_enabled: false,
        two_factor_secret: null,
        updated_at: db.fn.now(),
      });
      await trx('backup_code').where({ user_id: userId }).delete();
    });
  }

  static async getFailedJobs() {
    // NOTE: No failed jobs table exists yet. Returning a placeholder.
    return [];
  }

  static async cleanupExpiredTokens() {
    // Only clean up expired password reset tokens now that verification tokens are unused
    await db('users')
      .whereNotNull('password_reset_token_expires_at')
      .andWhere('password_reset_token_expires_at', '<', db.fn.now())
      .update({
        password_reset_token: null,
        password_reset_token_expires_at: null,
      });
  }

  // Transaction-related methods
  static async getAllTransactions(
    filters: TransactionFilters
  ): Promise<TransactionQueryResult> {
    return TransactionModel.findAll(filters);
  }

  static async getTransactionById(
    transactionId: string
  ): Promise<Transaction | null> {
    return TransactionModel.findById(transactionId);
  }

  // Topup request-related methods
  static async getAllTopupRequests(
    filters: TopupRequestFilters
  ): Promise<TopupRequestQueryResult> {
    return TopupRequestModel.findAll(filters);
  }

  static async getTopupRequestById(
    requestId: string
  ): Promise<TopupRequestWithResponses | null> {
    return TopupRequestModel.findById(requestId);
  }

  static async retryTopupRequest(requestId: string): Promise<boolean> {
    // Update the request status and increment attempt count
    const [request] = await db('topup_requests')
      .where({ id: requestId })
      .update({
        status: 'pending',
        attempt_count: db.raw('attempt_count + 1'),
        updated_at: db.fn.now(),
      })
      .returning('*');

    return !!request;
  }

  // Settlement-related methods
  static async getAllSettlements(
    filters?: SettlementFilters
  ): Promise<Settlement[]> {
    return SettlementModel.findAll(filters || {});
  }

  static async getSettlementById(
    settlementId: string
  ): Promise<Settlement | null> {
    return SettlementModel.findById(settlementId);
  }

  static async createSettlement(
    data: CreateSettlementData
  ): Promise<Settlement> {
    return SettlementModel.create(data);
  }

  static async updateSettlement(
    settlementId: string,
    data: Partial<CreateSettlementData>
  ): Promise<Settlement> {
    return SettlementModel.update(settlementId, data);
  }

  static async deleteSettlement(settlementId: string): Promise<boolean> {
    return SettlementModel.delete(settlementId);
  }

  // Operator-related methods
  static async getAllOperators(): Promise<Operator[]> {
    return OperatorModel.findAll();
  }

  static async getOperatorById(operatorId: string): Promise<Operator | null> {
    return OperatorModel.findById(operatorId);
  }

  static async createOperator(
    operatorData: CreateOperatorData
  ): Promise<Operator> {
    return OperatorModel.create(operatorData);
  }

  static async updateOperator(
    operatorId: string,
    operatorData: UpdateOperatorData
  ): Promise<Operator> {
    return OperatorModel.update(operatorId, operatorData);
  }

  // Supplier-related methods
  static async getAllSuppliers(): Promise<Supplier[]> {
    return SupplierModel.findAll();
  }

  static async getSupplierById(supplierId: string): Promise<Supplier | null> {
    return SupplierModel.findById(supplierId);
  }

  static async createSupplier(
    supplierData: CreateSupplierData
  ): Promise<Supplier> {
    return SupplierModel.create(supplierData);
  }

  static async updateSupplier(
    supplierId: string,
    supplierData: UpdateSupplierData
  ): Promise<Supplier> {
    return SupplierModel.update(supplierId, supplierData);
  }

  // Product-related methods
  static async getAllProducts(): Promise<OperatorProduct[]> {
    return OperatorProductModel.findAll();
  }

  static async getProductById(
    productId: string
  ): Promise<OperatorProduct | null> {
    return OperatorProductModel.findById(productId);
  }

  static async createProduct(
    productData: CreateOperatorProductData
  ): Promise<OperatorProduct> {
    return OperatorProductModel.create(productData);
  }

  static async updateProduct(
    productId: string,
    productData: UpdateOperatorProductData
  ): Promise<OperatorProduct> {
    return OperatorProductModel.update(productId, productData);
  }

  // Supplier product mapping methods
  static async mapProductToSupplier(
    mappingData: CreateSupplierProductMappingData
  ): Promise<SupplierProductMapping> {
    return SupplierProductMappingModel.create(mappingData);
  }

  // Atomic product and mapping creation
  static async createProductWithMapping(
    productData: CreateOperatorProductData,
    mappingData?: Omit<CreateSupplierProductMappingData, 'operatorProductId'>
  ): Promise<{ product: OperatorProduct; mapping?: SupplierProductMapping }> {
    return db.transaction(async trx => {
      // Create the operator product
      const product = await OperatorProductModel.create(productData, trx);

      let mapping;
      if (mappingData) {
        // Create the supplier product mapping
        const fullMappingData: CreateSupplierProductMappingData = {
          ...mappingData,
          operatorProductId: product.id,
        };
        mapping = await SupplierProductMappingModel.create(
          fullMappingData,
          trx
        );
      }

      return { product, mapping };
    });
  }
}
