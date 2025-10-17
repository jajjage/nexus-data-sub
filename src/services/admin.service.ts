import { AdminModel } from '../models/Admin';

export class AdminService {
  static async getInactiveUsers(since: Date) {
    return AdminModel.getInactiveUsers(since);
  }

  static async createUser(userData: any) {
    return AdminModel.createUser(userData);
  }

  static async getUserById(userId: string) {
    return AdminModel.getUserById(userId);
  }

  static async getAllUsers(page: number, limit: number) {
    return AdminModel.getAllUsers(page, limit);
  }

  static async updateUser(userId: string, userData: any) {
    return AdminModel.updateUser(userId, userData);
  }

  static async updateUserStatus(userId: string, status: boolean) {
    return AdminModel.updateUserStatus(userId, status);
  }

  static async creditWallet(userId: string, amount: number, adminId: string) {
    return AdminModel.creditWallet(userId, amount, adminId);
  }

  static async debitWallet(userId: string, amount: number, adminId: string) {
    return AdminModel.debitWallet(userId, amount, adminId);
  }

  static async getDashboardStats() {
    return AdminModel.getDashboardStats();
  }

  static async getUserSessions(userId: string) {
    return AdminModel.getUserSessions(userId);
  }

  static async revokeUserSessions(userId: string) {
    return AdminModel.revokeUserSessions(userId);
  }

  static async getAllTransactions(filters: any) {
    return AdminModel.getAllTransactions(filters);
  }

  static async getTransactionById(transactionId: string) {
    return AdminModel.getTransactionById(transactionId);
  }

  static async getAllTopupRequests(filters: any) {
    return AdminModel.getAllTopupRequests(filters);
  }

  static async getTopupRequestById(requestId: string) {
    return AdminModel.getTopupRequestById(requestId);
  }

  static async retryTopupRequest(requestId: string) {
    return AdminModel.retryTopupRequest(requestId);
  }

  static async getAllSettlements(filters?: any) {
    return AdminModel.getAllSettlements(filters);
  }

  static async getSettlementById(settlementId: string) {
    return AdminModel.getSettlementById(settlementId);
  }

  static async createSettlement(data: any) {
    return AdminModel.createSettlement(data);
  }

  static async updateSettlement(settlementId: string, data: any) {
    return AdminModel.updateSettlement(settlementId, data);
  }

  static async deleteSettlement(settlementId: string) {
    return AdminModel.deleteSettlement(settlementId);
  }

  static async getAllSuppliers() {
    return AdminModel.getAllSuppliers();
  }

  static async getSupplierById(supplierId: string) {
    return AdminModel.getSupplierById(supplierId);
  }

  static async createSupplier(supplierData: any) {
    return AdminModel.createSupplier(supplierData);
  }

  static async updateSupplier(supplierId: string, supplierData: any) {
    return AdminModel.updateSupplier(supplierId, supplierData);
  }

  static async getAllOperators() {
    return AdminModel.getAllOperators();
  }

  static async getOperatorById(operatorId: string) {
    return AdminModel.getOperatorById(operatorId);
  }

  static async createOperator(operatorData: any) {
    return AdminModel.createOperator(operatorData);
  }

  static async updateOperator(operatorId: string, operatorData: any) {
    return AdminModel.updateOperator(operatorId, operatorData);
  }

  static async getAllProducts() {
    return AdminModel.getAllProducts();
  }

  static async getProductById(productId: string) {
    return AdminModel.getProductById(productId);
  }

  static async createProduct(productData: any) {
    return AdminModel.createProduct(productData);
  }

  static async updateProduct(productId: string, productData: any) {
    return AdminModel.updateProduct(productId, productData);
  }

  static async mapProductToSupplier(mappingData: any) {
    return AdminModel.mapProductToSupplier(mappingData);
  }

  static async createProductWithMapping(productData: any, mappingData?: any) {
    return AdminModel.createProductWithMapping(productData, mappingData);
  }
}
