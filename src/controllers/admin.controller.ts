import { Request, Response } from 'express';
import { AdminModel } from '../models/Admin';
import { RoleModel } from '../models/Role';
import { UserModel } from '../models/User';
import { AdminService } from '../services/admin.service';
import OfferAdminService from '../services/offerAdmin.service';
import { sendError, sendSuccess } from '../utils/response.utils';
import { validatePassword } from '../utils/validation.utils';

export class AdminController {
  static async getInactiveUsers(req: Request, res: Response) {
    try {
      const { inactiveSince } = req.query;
      if (!inactiveSince || typeof inactiveSince !== 'string') {
        return sendError(res, 'Invalid date parameter', 400);
      }
      const since = new Date(inactiveSince);
      const inactiveUsers = await AdminService.getInactiveUsers(since);
      return sendSuccess(res, 'Inactive users retrieved successfully', {
        inactiveUsers,
      });
    } catch (error) {
      console.error('Get inactive users error:', error);
      return sendError(res, 'Internal server error');
    }
  }

  static async createUser(req: Request, res: Response) {
    try {
      const { email, password, phoneNumber, fullName, role } = req.body;

      if (!email || !password || !phoneNumber || !fullName || !role) {
        return sendError(res, 'All fields are required', 400);
      }

      if (!['admin', 'staff', 'user'].includes(role)) {
        return sendError(res, 'Invalid role specified', 400);
      }

      const identifier = email || phoneNumber;
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.isValid) {
        return sendError(
          res,
          passwordValidation.message || 'Invalid password format',
          400
        );
      }
      const normalizedEmail = email.toLowerCase().trim();
      const normalizedPhone = String(phoneNumber || '').replace(/\D/g, '');
      const existingUser = await UserModel.findForAuth(identifier);

      if (existingUser) {
        return sendError(
          res,
          'User with this email or phone number already exists',
          409
        );
      }

      const user = await AdminModel.createUser({
        email: normalizedEmail,
        phoneNumber: normalizedPhone,
        fullName: fullName.trim(),
        password,
        role,
      });

      return sendSuccess(
        res,
        'User created successfully.',
        {
          id: user.userId,
          email: user.email,
        },
        201
      );
    } catch (error) {
      console.error('Create user error:', error);
      return sendError(res, 'Internal server error during user creation', 500);
    }
  }

  static async getAllUsers(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const { users, total } = await AdminModel.getAllUsers(page, limit);

      if (!users || users.length === 0) {
        return sendSuccess(res, 'No users found', {
          users: [],
          pagination: { page, limit, total, totalPages: 0 },
        });
      }

      const totalPages = Math.ceil(total / limit);

      return sendSuccess(res, 'Users retrieved successfully', {
        users: users,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      });
    } catch (error) {
      console.error('Get all users error:', error);
      return sendError(res, 'Internal server error');
    }
  }

  static async assignRole(req: Request, res: Response) {
    try {
      const { userId, roleId } = req.body;

      if (!userId || !roleId) {
        return sendError(res, 'User ID and Role ID are required', 400);
      }

      const user = await AdminModel.getUserById(userId);
      if (!user) {
        return sendError(res, 'User not found', 404);
      }

      const role = await AdminModel.assignRole(userId, roleId);

      return sendSuccess(res, 'Role assigned successfully', {
        userId,
        roleId,
        roleName: role.name,
      });
    } catch (error) {
      console.error('Assign role error:', error);
      return sendError(res, 'Internal server error');
    }
  }

  static async getRoles(req: Request, res: Response) {
    try {
      const roles = await RoleModel.getAll();

      return sendSuccess(res, 'Roles retrieved successfully', {
        roles,
      });
    } catch (error) {
      console.error('Get roles error:', error);
      return sendError(res, 'Internal server error');
    }
  }

  static async getUserById(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const user = await AdminModel.getUserById(userId);

      if (!user) {
        return sendError(res, 'User not found', 404);
      }

      return sendSuccess(res, 'User retrieved successfully', user);
    } catch (error) {
      console.error('Get user by ID error:', error);
      return sendError(res, 'Internal server error');
    }
  }

  static async updateUser(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { fullName, phoneNumber } = req.body;

      const updatedUser = await AdminModel.updateUser(userId, {
        fullName,
        phoneNumber,
      });

      return sendSuccess(res, 'User updated successfully', updatedUser);
    } catch (error) {
      console.error('Update user error:', error);
      return sendError(res, 'Internal server error');
    }
  }

  static async suspendUser(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      await AdminModel.updateUserStatus(userId, true);
      return sendSuccess(res, 'User suspended successfully');
    } catch (error) {
      console.error('Suspend user error:', error);
      return sendError(res, 'Internal server error');
    }
  }

  static async unsuspendUser(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      await AdminModel.updateUserStatus(userId, false);
      return sendSuccess(res, 'User unsuspended successfully');
    } catch (error) {
      console.error('Unsuspend user error:', error);
      return sendError(res, 'Internal server error');
    }
  }

  static async creditUserWallet(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { amount } = req.body;
      const adminId = req.user?.userId;

      if (!amount || amount <= 0) {
        return sendError(res, 'Invalid amount', 400);
      }

      const result = await AdminModel.creditWallet(
        userId,
        amount,
        adminId || ''
      );
      return sendSuccess(res, 'Wallet credited successfully', result);
    } catch (error) {
      console.error('Credit wallet error:', error);
      return sendError(res, 'Internal server error');
    }
  }

  static async debitUserWallet(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { amount } = req.body;
      const adminId = req.user?.userId;

      if (!amount || amount <= 0) {
        return sendError(res, 'Invalid amount', 400);
      }

      const result = await AdminModel.debitWallet(
        userId,
        amount,
        adminId || ''
      );
      return sendSuccess(res, 'Wallet debited successfully', result);
    } catch (error) {
      console.error('Debit wallet error:', error);
      return sendError(res, 'Internal server error');
    }
  }

  static async getDashboardStats(req: Request, res: Response) {
    try {
      const stats = await AdminModel.getDashboardStats();
      return sendSuccess(res, 'Dashboard stats retrieved successfully', stats);
    } catch (error) {
      console.error('Get dashboard stats error:', error);
      return sendError(res, 'Internal server error');
    }
  }

  static async revokeUserSessions(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const deletedCount = await AdminModel.revokeUserSessions(userId);
      return sendSuccess(res, `Revoked ${deletedCount} session(s) for user`, {
        sessionsRevoked: deletedCount,
      });
    } catch (error) {
      console.error('Revoke sessions error:', error);
      return sendError(res, 'Internal server error');
    }
  }

  static async getUserSessions(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const sessions = await AdminModel.getUserSessions(userId);
      return sendSuccess(res, 'User sessions retrieved successfully', {
        sessions,
      });
    } catch (error) {
      console.error('Get user sessions error:', error);
      return sendError(res, 'Internal server error');
    }
  }

  static async disable2FAByAdmin(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { userId } = req.params;

      if (!userId) {
        return sendError(res, 'User ID is required', 400);
      }

      const user = await AdminModel.getUserById(userId);
      if (!user) {
        return sendError(res, 'User not found', 404);
      }

      await AdminModel.disable2FA(userId);

      return sendSuccess(res, '2FA disabled successfully for user');
    } catch (error) {
      console.error('Disable 2FA by admin error:', error);
      return sendError(res, 'Internal server error');
    }
  }

  static async getFailedJobs(req: Request, res: Response) {
    try {
      const jobs = await AdminModel.getFailedJobs();
      return sendSuccess(res, 'Failed jobs retrieved successfully', { jobs });
    } catch (error) {
      console.error('Get failed jobs error:', error);
      return sendError(res, 'Internal server error');
    }
  }

  // ---------------------- Offer admin helpers ----------------------
  static async computeOfferSegment(req: Request, res: Response) {
    try {
      const { offerId } = req.params;
      if (!offerId) return sendError(res, 'offerId is required', 400);
      // run computation (may take time)
      await OfferAdminService.computeSegment(offerId);
      const { total } = await OfferAdminService.getSegmentMembers(
        offerId,
        1,
        1
      );
      return sendSuccess(res, 'Segment computed', { total });
    } catch (error) {
      console.error('Compute offer segment error:', error);
      return sendError(res, 'Internal server error');
    }
  }

  static async getOfferSegmentMembers(req: Request, res: Response) {
    try {
      const { offerId } = req.params;
      const page = parseInt((req.query.page as string) || '1');
      const limit = parseInt((req.query.limit as string) || '50');
      if (!offerId) return sendError(res, 'offerId is required', 400);
      const result = await OfferAdminService.getSegmentMembers(
        offerId,
        page,
        limit
      );
      return sendSuccess(res, 'Segment members retrieved', result);
    } catch (error) {
      console.error('Get offer segment members error:', error);
      return sendError(res, 'Internal server error');
    }
  }

  static async previewOfferEligibility(req: Request, res: Response) {
    try {
      const { offerId } = req.params;
      const limit = parseInt((req.query.limit as string) || '100');
      if (!offerId) return sendError(res, 'offerId is required', 400);
      const rows = await OfferAdminService.previewEligibility(offerId, limit);
      return sendSuccess(res, 'Preview eligibility retrieved', {
        preview: rows,
      });
    } catch (error) {
      console.error('Preview eligibility error:', error);
      return sendError(res, 'Internal server error');
    }
  }

  static async createOfferRedemptionsJob(req: Request, res: Response) {
    try {
      const { offerId } = req.params;
      const { userIds, fromSegment, price, discount } = req.body as {
        userIds?: string[];
        fromSegment?: boolean;
        price?: number;
        discount?: number;
      };

      if (!offerId) return sendError(res, 'offerId is required', 400);
      const unitPrice = price ?? 0;
      const unitDiscount = discount ?? 0;

      let targets: string[] = [];
      if (fromSegment) {
        const members = await OfferAdminService.getSegmentMembers(
          offerId,
          1,
          10000
        );
        targets = members.members.map((m: any) => m.id);
      } else if (Array.isArray(userIds) && userIds.length > 0) {
        targets = userIds;
      } else {
        return sendError(
          res,
          'Either userIds or fromSegment=true must be provided',
          400
        );
      }

      // Create a job record and return its id; worker will process it asynchronously
      const JobService = (await import('../services/job.service')).JobService;
      const job = await JobService.createJob('offer_redemption', {
        offerId,
        targets,
        price: unitPrice,
        discount: unitDiscount,
      });

      return sendSuccess(res, 'Bulk redemption job created', { jobId: job.id });
    } catch (error) {
      console.error('Create offer redemptions job error:', error);
      return sendError(res, 'Internal server error');
    }
  }

  // Transaction-related methods
  static async getAllTransactions(req: Request, res: Response) {
    try {
      const { userId, dateFrom, dateTo, direction, page, limit } = req.query;

      const filters = {
        userId: userId as string | undefined,
        dateFrom: dateFrom as string | undefined,
        dateTo: dateTo as string | undefined,
        direction: direction as 'debit' | 'credit' | undefined,
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 10,
      };

      const result = await AdminModel.getAllTransactions(filters);
      return sendSuccess(res, 'Transactions retrieved successfully', result);
    } catch (error) {
      console.error('Get all transactions error:', error);
      return sendError(res, 'Internal server error');
    }
  }

  static async getTransactionById(req: Request, res: Response) {
    try {
      const { transactionId } = req.params;
      const transaction = await AdminModel.getTransactionById(transactionId);

      if (!transaction) {
        return sendError(res, 'Transaction not found', 404);
      }

      return sendSuccess(
        res,
        'Transaction retrieved successfully',
        transaction
      );
    } catch (error) {
      console.error('Get transaction by ID error:', error);
      return sendError(res, 'Internal server error');
    }
  }

  // Topup request-related methods
  static async getAllTopupRequests(req: Request, res: Response) {
    try {
      const { status, userId, dateFrom, dateTo, page, limit } = req.query;

      // Validate status to ensure it's one of the allowed values
      const validStatuses = [
        'pending',
        'completed',
        'failed',
        'cancelled',
      ] as const;
      let validatedStatus:
        | 'pending'
        | 'completed'
        | 'failed'
        | 'cancelled'
        | undefined;

      if (
        status &&
        typeof status === 'string' &&
        validStatuses.includes(status as any)
      ) {
        validatedStatus = status as
          | 'pending'
          | 'completed'
          | 'failed'
          | 'cancelled';
      }

      const filters = {
        status: validatedStatus,
        userId: userId as string | undefined,
        dateFrom: dateFrom as string | undefined,
        dateTo: dateTo as string | undefined,
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 10,
      };

      const result = await AdminModel.getAllTopupRequests(filters);
      return sendSuccess(res, 'Topup requests retrieved successfully', result);
    } catch (error) {
      console.error('Get all topup requests error:', error);
      return sendError(res, 'Internal server error');
    }
  }

  static async getTopupRequestById(req: Request, res: Response) {
    try {
      const { requestId } = req.params;
      const request = await AdminModel.getTopupRequestById(requestId);

      if (!request) {
        return sendError(res, 'Topup request not found', 404);
      }

      return sendSuccess(res, 'Topup request retrieved successfully', request);
    } catch (error) {
      console.error('Get topup request by ID error:', error);
      return sendError(res, 'Internal server error');
    }
  }

  static async retryTopupRequest(req: Request, res: Response) {
    try {
      const { requestId } = req.params;
      const success = await AdminModel.retryTopupRequest(requestId);

      if (!success) {
        return sendError(
          res,
          'Topup request not found or could not be retried',
          404
        );
      }

      return sendSuccess(res, 'Topup request retry initiated successfully');
    } catch (error) {
      console.error('Retry topup request error:', error);
      return sendError(res, 'Internal server error');
    }
  }

  // Settlement-related methods
  static async getAllSettlements(req: Request, res: Response) {
    try {
      const { providerId, dateFrom, dateTo } = req.query;

      const filters = {
        providerId: providerId as string | undefined,
        dateFrom: dateFrom as string | undefined,
        dateTo: dateTo as string | undefined,
      };

      const settlements = await AdminModel.getAllSettlements(filters);
      return sendSuccess(res, 'Settlements retrieved successfully', {
        settlements,
      });
    } catch (error) {
      console.error('Get all settlements error:', error);
      return sendError(res, 'Internal server error');
    }
  }

  static async getSettlementById(req: Request, res: Response) {
    try {
      const { settlementId } = req.params;
      const settlement = await AdminModel.getSettlementById(settlementId);

      if (!settlement) {
        return sendError(res, 'Settlement not found', 404);
      }

      return sendSuccess(res, 'Settlement retrieved successfully', settlement);
    } catch (error) {
      console.error('Get settlement by ID error:', error);
      return sendError(res, 'Internal server error');
    }
  }

  static async createSettlement(req: Request, res: Response) {
    try {
      const { providerId, settlementDate, amount, fees, reference, rawReport } =
        req.body;

      if (!providerId || !settlementDate || !amount) {
        return sendError(
          res,
          'Provider ID, settlement date, and amount are required',
          400
        );
      }

      const settlementData = {
        providerId,
        settlementDate: new Date(settlementDate),
        amount: parseFloat(amount),
        fees: fees ? parseFloat(fees) : 0,
        reference,
        rawReport,
      };

      const settlement = await AdminModel.createSettlement(settlementData);
      return sendSuccess(res, 'Settlement created successfully', settlement);
    } catch (error) {
      console.error('Create settlement error:', error);
      return sendError(res, 'Internal server error');
    }
  }

  // Operator-related methods
  static async getAllOperators(req: Request, res: Response) {
    try {
      const operators = await AdminModel.getAllOperators();
      return sendSuccess(res, 'Operators retrieved successfully', {
        operators,
      });
    } catch (error) {
      console.error('Get all operators error:', error);
      return sendError(res, 'Internal server error');
    }
  }

  static async getOperatorById(req: Request, res: Response) {
    try {
      const { operatorId } = req.params;
      const operator = await AdminModel.getOperatorById(operatorId);

      if (!operator) {
        return sendError(res, 'Operator not found', 404);
      }

      return sendSuccess(res, 'Operator retrieved successfully', operator);
    } catch (error) {
      console.error('Get operator by ID error:', error);
      return sendError(res, 'Internal server error');
    }
  }

  static async createOperator(req: Request, res: Response) {
    try {
      const { code, name, isoCountry } = req.body;

      if (!code || !name) {
        return sendError(res, 'Code and name are required', 400);
      }

      const operatorData = {
        code,
        name,
        isoCountry: isoCountry || 'NG',
      };

      const operator = await AdminModel.createOperator(operatorData);
      return sendSuccess(res, 'Operator created successfully', operator);
    } catch (error) {
      console.error('Create operator error:', error);
      return sendError(res, 'Internal server error');
    }
  }

  static async updateOperator(req: Request, res: Response) {
    try {
      const { operatorId } = req.params;
      const { name, isoCountry } = req.body;

      const updateData = {
        name,
        isoCountry,
      };

      const operator = await AdminModel.updateOperator(operatorId, updateData);
      return sendSuccess(res, 'Operator updated successfully', operator);
    } catch (error) {
      console.error('Update operator error:', error);
      return sendError(res, 'Internal server error');
    }
  }

  // Supplier-related methods
  static async getAllSuppliers(req: Request, res: Response) {
    try {
      const suppliers = await AdminModel.getAllSuppliers();
      return sendSuccess(res, 'Suppliers retrieved successfully', {
        suppliers,
      });
    } catch (error) {
      console.error('Get all suppliers error:', error);
      return sendError(res, 'Internal server error');
    }
  }

  static async getSupplierById(req: Request, res: Response) {
    try {
      const { supplierId } = req.params;
      const supplier = await AdminModel.getSupplierById(supplierId);

      if (!supplier) {
        return sendError(res, 'Supplier not found', 404);
      }

      return sendSuccess(res, 'Supplier retrieved successfully', supplier);
    } catch (error) {
      console.error('Get supplier by ID error:', error);
      return sendError(res, 'Internal server error');
    }
  }

  static async createSupplier(req: Request, res: Response) {
    try {
      const { name, slug, apiBase, apiKey, priorityInt, isActive } = req.body;

      if (!name || !slug) {
        return sendError(res, 'Name and slug are required', 400);
      }

      const supplierData = {
        name,
        slug,
        apiBase,
        apiKey,
        priorityInt: priorityInt !== undefined ? parseInt(priorityInt) : 100,
        isActive: isActive !== undefined ? isActive : true,
      };

      const supplier = await AdminModel.createSupplier(supplierData);
      return sendSuccess(res, 'Supplier created successfully', supplier);
    } catch (error) {
      console.error('Create supplier error:', error);
      return sendError(res, 'Internal server error');
    }
  }

  static async updateSupplier(req: Request, res: Response) {
    try {
      const { supplierId } = req.params;
      const { name, apiBase, apiKey, priorityInt, isActive } = req.body;

      const updateData = {
        name,
        apiBase,
        apiKey,
        priorityInt:
          priorityInt !== undefined ? parseInt(priorityInt) : undefined,
        isActive,
      };

      const supplier = await AdminModel.updateSupplier(supplierId, updateData);
      return sendSuccess(res, 'Supplier updated successfully', supplier);
    } catch (error) {
      console.error('Update supplier error:', error);
      return sendError(res, 'Internal server error');
    }
  }

  // Product-related methods
  static async getAllProducts(req: Request, res: Response) {
    try {
      const products = await AdminModel.getAllProducts();
      return sendSuccess(res, 'Products retrieved successfully', {
        products,
      });
    } catch (error) {
      console.error('Get all products error:', error);
      return sendError(res, 'Internal server error');
    }
  }

  static async getProductById(req: Request, res: Response) {
    try {
      const { productId } = req.params;
      const product = await AdminModel.getProductById(productId);

      if (!product) {
        return sendError(res, 'Product not found', 404);
      }

      return sendSuccess(res, 'Product retrieved successfully', product);
    } catch (error) {
      console.error('Get product by ID error:', error);
      return sendError(res, 'Internal server error');
    }
  }

  static async createProduct(req: Request, res: Response) {
    try {
      const {
        operatorId,
        productCode,
        name,
        productType,
        denomAmount,
        dataMb,
        validityDays,
        isActive,
        metadata,
      } = req.body;

      if (!operatorId || !productCode || !name || !productType) {
        return sendError(
          res,
          'Operator ID, product code, name, and product type are required',
          400
        );
      }

      const productData = {
        operatorId,
        productCode,
        name,
        productType,
        denomAmount,
        dataMb,
        validityDays,
        isActive: isActive !== undefined ? isActive : true,
        metadata,
      };

      // Check if supplier mapping data is provided for atomic creation
      const {
        supplierId,
        supplierProductCode,
        supplierPrice,
        minOrderAmount,
        maxOrderAmount,
        leadTimeSeconds,
        mappingIsActive,
      } = req.body;

      if (supplierId && supplierPrice !== undefined) {
        // Create both product and mapping in a single transaction
        const mappingData = {
          supplierId,
          supplierProductCode,
          supplierPrice: parseFloat(supplierPrice),
          minOrderAmount: minOrderAmount
            ? parseFloat(minOrderAmount)
            : undefined,
          maxOrderAmount: maxOrderAmount
            ? parseFloat(maxOrderAmount)
            : undefined,
          leadTimeSeconds: leadTimeSeconds
            ? parseInt(leadTimeSeconds)
            : undefined,
          isActive: mappingIsActive !== undefined ? mappingIsActive : true,
        };

        const result = await AdminModel.createProductWithMapping(
          productData,
          mappingData
        );
        return sendSuccess(
          res,
          'Product and mapping created successfully',
          result,
          201
        );
      } else {
        // Create product only
        const product = await AdminModel.createProduct(productData);
        return sendSuccess(res, 'Product created successfully', product, 201);
      }
    } catch (error) {
      console.error('Create product error:', error);
      return sendError(res, 'Internal server error');
    }
  }

  static async updateProduct(req: Request, res: Response) {
    try {
      const { productId } = req.params;
      const {
        operatorId,
        productCode,
        name,
        productType,
        denomAmount,
        dataMb,
        validityDays,
        isActive,
        metadata,
      } = req.body;

      const updateData = {
        operatorId,
        productCode,
        name,
        productType,
        denomAmount,
        dataMb,
        validityDays,
        isActive,
        metadata,
      };

      const product = await AdminModel.updateProduct(productId, updateData);
      return sendSuccess(res, 'Product updated successfully', product);
    } catch (error) {
      console.error('Update product error:', error);
      return sendError(res, 'Internal server error');
    }
  }

  static async mapProductToSupplier(req: Request, res: Response) {
    try {
      const { productId } = req.params;
      const {
        supplierId,
        supplierProductCode,
        supplierPrice,
        minOrderAmount,
        maxOrderAmount,
        leadTimeSeconds,
        isActive,
      } = req.body;

      if (!supplierId || !supplierPrice) {
        return sendError(
          res,
          'Supplier ID and supplier price are required',
          400
        );
      }

      const mappingData = {
        supplierId,
        operatorProductId: productId,
        supplierProductCode,
        supplierPrice: parseFloat(supplierPrice),
        minOrderAmount: minOrderAmount ? parseFloat(minOrderAmount) : undefined,
        maxOrderAmount: maxOrderAmount ? parseFloat(maxOrderAmount) : undefined,
        leadTimeSeconds: leadTimeSeconds
          ? parseInt(leadTimeSeconds)
          : undefined,
        isActive: isActive !== undefined ? isActive : true,
      };

      const mapping = await AdminModel.mapProductToSupplier(mappingData);
      return sendSuccess(
        res,
        'Product mapped to supplier successfully',
        mapping,
        201
      );
    } catch (error) {
      console.error('Map product to supplier error:', error);
      return sendError(res, 'Internal server error');
    }
  }

  // ---------------------- Job admin helpers ----------------------

  static async getJob(req: Request, res: Response) {
    try {
      const { jobId } = req.params;
      const JobService = (await import('../services/job.service')).JobService;
      const job = await JobService.getJobById(jobId);
      if (!job) {
        return sendError(res, 'Job not found', 404);
      }
      return sendSuccess(res, 'Job retrieved successfully', { job });
    } catch (error) {
      console.error('Get job error:', error);
      return sendError(res, 'Internal server error');
    }
  }

  static async getAllJobs(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const JobService = (await import('../services/job.service')).JobService;
      const { jobs, total } = await JobService.getAllJobs(page, limit);
      const totalPages = Math.ceil(total / limit);
      return sendSuccess(res, 'Jobs retrieved successfully', {
        jobs,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      });
    } catch (error) {
      console.error('Get all jobs error:', error);
      return sendError(res, 'Internal server error');
    }
  }
}
