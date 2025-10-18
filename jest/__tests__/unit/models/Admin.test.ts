import db from '../../../../src/database/connection';
import { OperatorModel } from '../../../../src/models/Operator';
import { SettlementModel } from '../../../../src/models/Settlement';
import { SupplierModel } from '../../../../src/models/Supplier';
import { TopupRequestModel } from '../../../../src/models/TopupRequest';
import { TransactionModel } from '../../../../src/models/Transaction';
import { CreateUserInput, UserModel } from '../../../../src/models/User';

import { AdminModel } from '../../../../src/models/Admin';

// Import for types only - the actual modules will be reset before tests
import { SessionService } from '../../../../src/services/session.service';

describe('AdminModel', () => {
  let testUser: any;
  let adminUser: any;
  let testOperator: any;
  let testSupplier: any;
  let testProvider: any;

  beforeAll(async () => {
    // Create test operator
    const operatorData = {
      code: 'TEST',
      name: 'Test Operator',
    };
    testOperator = await OperatorModel.create(operatorData);

    // Create test provider for settlements
    const [providerResult] = await db('providers')
      .insert({
        name: 'Test Provider',
        api_base: 'https://test-provider.com',
        is_active: true,
      })
      .returning('*');
    testProvider = providerResult;
  });

  afterAll(async () => {
    // Clean up test data in correct order (respecting foreign key constraints)
    await db('settlements').where({ provider_id: testProvider?.id }).del();
    if (testProvider?.id)
      await db('providers').where({ id: testProvider.id }).del();
    if (testOperator?.id)
      await db('operators').where({ id: testOperator.id }).del();
  });

  beforeEach(async () => {
    // Create a user to be acted upon in tests
    const userData: CreateUserInput = {
      email: 'test.user@example.com',
      fullName: 'Test User',
      phoneNumber: '1234567890',
      password: 'Password123!',
      role: 'user',
    };
    const createdUser = await UserModel.create(userData);
    testUser = await UserModel.findForAuth(createdUser.email);

    // Create an admin user to perform actions
    const adminData: CreateUserInput = {
      email: 'admin.user@example.com',
      fullName: 'Admin User',
      phoneNumber: '0987654321',
      password: 'Password123!',
      role: 'admin',
    };
    const createdAdmin = await UserModel.create(adminData);
    adminUser = await UserModel.findForAuth(createdAdmin.email);

    // Create a wallet for the test user
    await db('wallets').insert({ user_id: testUser.userId, balance: 100.0 });

    // Create test supplier
    const supplierData = {
      name: 'Test Supplier',
      slug: 'test-supplier',
    };
    testSupplier = await SupplierModel.create(supplierData);
  });

  afterEach(async () => {
    // Clean up test data
    if (testUser?.userId)
      await db('users').where({ id: testUser.userId }).del();
    if (adminUser?.userId)
      await db('users').where({ id: adminUser.userId }).del();
    if (testSupplier?.id)
      await db('suppliers').where({ id: testSupplier.id }).del();
    jest.restoreAllMocks();
  });

  describe('getUserById', () => {
    it('should retrieve a user with their wallet balance', async () => {
      const user = await AdminModel.getUserById(testUser.userId);
      expect(user).toBeDefined();
      expect(user?.userId).toBe(testUser.userId);
      expect(user?.balance).toEqual('100.00');
    });
  });

  describe('updateUser', () => {
    it("should update a user's details", async () => {
      const newName = 'Updated Test User';
      await AdminModel.updateUser(testUser.userId, { fullName: newName });
      const updatedUser = await AdminModel.getUserById(testUser.userId);
      expect(updatedUser?.fullName).toBe(newName);
    });
  });

  describe('updateUserStatus', () => {
    it('should suspend a user', async () => {
      await AdminModel.updateUserStatus(testUser.userId, true);
      const user = await AdminModel.getUserById(testUser.userId);
      expect(user?.isSuspended).toBe(true);
    });

    it('should unsuspend a user', async () => {
      await AdminModel.updateUserStatus(testUser.userId, false);
      const user = await AdminModel.getUserById(testUser.userId);
      expect(user?.isSuspended).toBe(false);
    });
  });

  describe('creditWallet', () => {
    it("should credit a user's wallet and create a transaction", async () => {
      const creditAmount = 50;
      const initialBalance = 100.0;
      const { newBalance } = await AdminModel.creditWallet(
        testUser.userId,
        creditAmount,
        adminUser.userId
      );
      expect(newBalance).toBe(initialBalance + creditAmount);

      const transaction = await db('transactions')
        .where({ user_id: testUser.userId, method: 'admin_credit' })
        .first();
      expect(transaction).toBeDefined();
      expect(parseFloat(transaction.amount).toString()).toEqual(
        creditAmount.toString()
      );
    });
  });

  describe('debitWallet', () => {
    it("should debit a user's wallet and create a transaction", async () => {
      const debitAmount = 30;
      const initialBalance = 100.0; // Balance is reset to 100.0 in beforeEach
      const { newBalance } = await AdminModel.debitWallet(
        testUser.userId,
        debitAmount,
        adminUser.userId
      );
      expect(newBalance).toBe(initialBalance - debitAmount);

      const transaction = await db('transactions')
        .where({ user_id: testUser.userId, method: 'admin_debit' })
        .first();
      expect(transaction).toBeDefined();
      expect(parseFloat(transaction.amount).toString()).toEqual(
        debitAmount.toString()
      );
    });
  });

  describe('getDashboardStats', () => {
    it('should return dashboard statistics', async () => {
      // Create some transactions to ensure the count is not 0
      await AdminModel.creditWallet(testUser.userId, 10, adminUser.userId);
      await AdminModel.debitWallet(testUser.userId, 5, adminUser.userId);

      const stats = await AdminModel.getDashboardStats();
      expect(stats.totalUsers).toBeGreaterThanOrEqual(2);
      expect(stats.totalTransactions).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Session Management', () => {
    it('should call SessionService to get user sessions', async () => {
      const getUserSessionsSpy = jest
        .spyOn(SessionService, 'getUserSessions')
        .mockResolvedValue([]);
      await AdminModel.getUserSessions(testUser.userId);
      expect(getUserSessionsSpy).toHaveBeenCalledWith(testUser.userId);
    });

    it('should call SessionService to revoke user sessions', async () => {
      const deleteAllUserSessionsSpy = jest
        .spyOn(SessionService, 'deleteAllUserSessions')
        .mockResolvedValue(1);
      await AdminModel.revokeUserSessions(testUser.userId);
      expect(deleteAllUserSessionsSpy).toHaveBeenCalledWith(testUser.userId);
    });
  });

  describe('Transaction Methods', () => {
    let testTransaction: any;

    beforeEach(async () => {
      // Create a test transaction
      testTransaction = await TransactionModel.create({
        walletId: testUser.userId,
        userId: testUser.userId,
        direction: 'credit',
        amount: 100,
        balanceAfter: 200,
        method: 'test_method',
        reference: 'test_ref',
        relatedType: 'test',
        relatedId: testUser.userId,
        metadata: { test: 'data' },
        note: 'test note',
      });
    });

    afterAll(async () => {
      if (testTransaction?.id) {
        await db('transactions').where({ id: testTransaction.id }).del();
      }
    });

    it('should retrieve all transactions with filters', async () => {
      const result = await AdminModel.getAllTransactions({
        userId: testUser.userId,
      });
      expect(result.transactions).toBeDefined();
      expect(result.pagination).toBeDefined();
      expect(result.transactions.length).toBeGreaterThanOrEqual(1);
    });

    it('should retrieve a specific transaction by ID', async () => {
      const transaction = await AdminModel.getTransactionById(
        testTransaction.id
      );
      expect(transaction).toBeDefined();
      expect(transaction?.id).toBe(testTransaction.id);
    });
  });

  describe('Topup Request Methods', () => {
    let testTopupRequest: any;

    beforeEach(async () => {
      // Create a test topup request
      testTopupRequest = await TopupRequestModel.create({
        userId: testUser.userId,
        recipientPhone: '1234567890',
        operatorId: testOperator.id,
        amount: 1000,
        status: 'pending',
        attemptCount: 0,
        requestPayload: undefined,
      });
    });

    afterEach(async () => {
      if (testTopupRequest?.id) {
        await db('topup_responses')
          .where({ topup_request_id: testTopupRequest.id })
          .del();
        await db('topup_requests').where({ id: testTopupRequest.id }).del();
      }
    });

    it('should retrieve all topup requests with filters', async () => {
      const result = await AdminModel.getAllTopupRequests({
        userId: testUser.userId,
      });
      expect(result.requests).toBeDefined();
      expect(result.pagination).toBeDefined();
      expect(result.requests.length).toBeGreaterThanOrEqual(1);
    });

    it('should retrieve a specific topup request by ID', async () => {
      const request = await AdminModel.getTopupRequestById(testTopupRequest.id);
      expect(request).toBeDefined();
      expect(request?.id).toBe(testTopupRequest.id);
    });

    it('should retry a topup request', async () => {
      const result = await AdminModel.retryTopupRequest(testTopupRequest.id);
      expect(result).toBe(true);

      const updatedRequest = await db('topup_requests')
        .where({ id: testTopupRequest.id })
        .first();
      expect(updatedRequest.status).toBe('pending');
      expect(updatedRequest.attempt_count).toBe(1);
    });
  });

  describe('Settlement Methods', () => {
    let testSettlement: any;

    beforeEach(async () => {
      // Create a test settlement
      testSettlement = await SettlementModel.create({
        providerId: testProvider.id,
        settlementDate: new Date(),
        amount: 5000,
        fees: 50,
        reference: 'test_settlement_ref',
      });
    });

    afterAll(async () => {
      if (testSettlement?.id) {
        await db('settlements').where({ id: testSettlement.id }).del();
      }
    });

    it('should retrieve all settlements', async () => {
      const settlements = await AdminModel.getAllSettlements();
      expect(settlements).toBeDefined();
      expect(Array.isArray(settlements)).toBe(true);
      expect(settlements.length).toBeGreaterThanOrEqual(1);
    });

    it('should retrieve a specific settlement by ID', async () => {
      const settlement = await AdminModel.getSettlementById(testSettlement.id);
      expect(settlement).toBeDefined();
      expect(settlement?.id).toBe(testSettlement.id);
    });

    it('should create a new settlement', async () => {
      const newSettlementData = {
        providerId: testProvider.id,
        settlementDate: new Date(),
        amount: 1000,
        fees: 10,
      };

      const newSettlement =
        await AdminModel.createSettlement(newSettlementData);
      expect(newSettlement).toBeDefined();
      expect(newSettlement.id).toBeDefined();
      expect(newSettlement.providerId).toBe(testProvider.id);

      // Clean up
      await db('settlements').where({ id: newSettlement.id }).del();
    });
  });

  describe('Operator Methods', () => {
    let newOperator: any;

    afterAll(async () => {
      if (newOperator?.id) {
        await db('operators').where({ id: newOperator.id }).del();
      }
    });

    it('should retrieve all operators', async () => {
      const operators = await AdminModel.getAllOperators();
      expect(operators).toBeDefined();
      expect(Array.isArray(operators)).toBe(true);
      expect(operators.length).toBeGreaterThanOrEqual(1);
    });

    it('should retrieve a specific operator by ID', async () => {
      const operator = await AdminModel.getOperatorById(testOperator.id);
      expect(operator).toBeDefined();
      expect(operator?.id).toBe(testOperator.id);
    });

    it('should create a new operator', async () => {
      const operatorData = {
        code: 'NEW_TEST',
        name: 'New Test Operator',
      };

      newOperator = await AdminModel.createOperator(operatorData);
      expect(newOperator).toBeDefined();
      expect(newOperator.code).toBe('NEW_TEST');
      expect(newOperator.name).toBe('New Test Operator');
    });

    it('should update an operator', async () => {
      const updateData = { name: 'Updated Test Operator' };
      const updatedOperator = await AdminModel.updateOperator(
        newOperator.id,
        updateData
      );
      expect(updatedOperator).toBeDefined();
      expect(updatedOperator.name).toBe('Updated Test Operator');
    });
  });

  describe('Supplier Methods', () => {
    let newSupplier: any;

    afterAll(async () => {
      if (newSupplier?.id) {
        await db('suppliers').where({ id: newSupplier.id }).del();
      }
    });

    it('should retrieve all suppliers', async () => {
      const suppliers = await AdminModel.getAllSuppliers();
      expect(suppliers).toBeDefined();
      expect(Array.isArray(suppliers)).toBe(true);
      expect(suppliers.length).toBeGreaterThanOrEqual(1);
    });

    it('should retrieve a specific supplier by ID', async () => {
      const supplier = await AdminModel.getSupplierById(testSupplier.id);
      expect(supplier).toBeDefined();
      expect(supplier?.id).toBe(testSupplier.id);
    });

    it('should create a new supplier', async () => {
      const supplierData = {
        name: 'New Test Supplier',
        slug: 'new-test-supplier',
      };

      newSupplier = await AdminModel.createSupplier(supplierData);
      expect(newSupplier).toBeDefined();
      expect(newSupplier.name).toBe('New Test Supplier');
      expect(newSupplier.slug).toBe('new-test-supplier');
    });

    it('should update a supplier', async () => {
      const updateData = { name: 'Updated Test Supplier' };
      const updatedSupplier = await AdminModel.updateSupplier(
        testSupplier.id,
        updateData
      );
      expect(updatedSupplier).toBeDefined();
      expect(updatedSupplier.name).toBe('Updated Test Supplier');
    });
  });

  describe('Product Methods', () => {
    let newProduct: any;
    let testProductData: any;

    beforeAll(async () => {
      testProductData = {
        operatorId: testOperator.id,
        productCode: 'TEST-1GB',
        name: 'Test 1GB Bundle',
        productType: 'data',
        dataMb: 1024,
        validityDays: 30,
      };
    });

    afterAll(async () => {
      if (newProduct?.id) {
        await db('supplier_product_mapping')
          .where({ operator_product_id: newProduct.id })
          .del();
        await db('operator_products').where({ id: newProduct.id }).del();
      }
    });

    it('should retrieve all products', async () => {
      const products = await AdminModel.getAllProducts();
      expect(products).toBeDefined();
      expect(Array.isArray(products)).toBe(true);
    });

    it('should create a new product', async () => {
      newProduct = await AdminModel.createProduct(testProductData);
      expect(newProduct).toBeDefined();
      expect(newProduct.id).toBeDefined();
      expect(newProduct.name).toBe('Test 1GB Bundle');
      expect(newProduct.productType).toBe('data');
      expect(newProduct.dataMb).toBe(1024);
    });

    it('should retrieve a specific product by ID', async () => {
      const product = await AdminModel.getProductById(newProduct.id);
      expect(product).toBeDefined();
      expect(product?.id).toBe(newProduct.id);
      expect(product?.name).toBe('Test 1GB Bundle');
    });

    it('should update a product', async () => {
      const updateData = {
        name: 'Updated Test 1GB Bundle',
        denomAmount: 1000,
      };
      const updatedProduct = await AdminModel.updateProduct(
        newProduct.id,
        updateData
      );
      expect(updatedProduct).toBeDefined();
      expect(updatedProduct.name).toBe('Updated Test 1GB Bundle');
      expect(parseFloat(updatedProduct.denomAmount as any)).toBe(1000);
    });

    it('should create a product with mapping in a single transaction', async () => {
      const productDataWithMapping = {
        ...testProductData,
        productCode: 'TEST-2GB',
        name: 'Test 2GB Bundle',
        dataMb: 2048,
      };

      const result = await AdminModel.createProductWithMapping(
        productDataWithMapping,
        {
          supplierId: testSupplier.id,
          supplierProductCode: 'SUP-TEST-2GB',
          supplierPrice: 1400,
          minOrderAmount: 1000,
          maxOrderAmount: 2000,
          leadTimeSeconds: 60,
          isActive: true,
        }
      );

      expect(result).toBeDefined();
      expect(result.product).toBeDefined();
      expect(result.product.id).toBeDefined();
      expect(result.product.name).toBe('Test 2GB Bundle');
      expect(result.mapping).toBeDefined(); // mapping should exist since we provided mappingData
      if (result.mapping) {
        expect(result.mapping.id).toBeDefined();
        expect(result.mapping.supplierId).toBe(testSupplier.id);
        expect(parseFloat(result.mapping.supplierPrice as any)).toBe(1400);
      }

      // Clean up
      await db('supplier_product_mapping')
        .where({ operator_product_id: result.product.id })
        .del();
      await db('operator_products').where({ id: result.product.id }).del();
    });

    it('should map a product to a supplier', async () => {
      const mappingData = {
        supplierId: testSupplier.id,
        operatorProductId: newProduct.id,
        supplierProductCode: 'SUP-TEST-1GB',
        supplierPrice: 950,
        minOrderAmount: 500,
        maxOrderAmount: 1500,
        leadTimeSeconds: 45,
        isActive: true,
      };

      const mapping = await AdminModel.mapProductToSupplier(mappingData);
      expect(mapping).toBeDefined();
      expect(mapping.id).toBeDefined();
      expect(mapping.supplierId).toBe(testSupplier.id);
      expect(mapping.operatorProductId).toBe(newProduct.id);
      expect(parseFloat(mapping.supplierPrice as any)).toBe(950);
    });
  });
});
