import { Router } from 'express';
import { param, query } from 'express-validator';
import { AdminController } from '../controllers/admin.controller';
import { authenticate } from '../middleware/auth.middleware';
import { hasPermission, requireRole } from '../middleware/rbac.middleware';
import {
  handleValidationErrors,
  validateUserCreation,
} from '../middleware/validation.middleware';

const router = Router();

// Apply authentication and admin role middleware to all admin routes
router.use(authenticate, requireRole('admin'));

/**
 * @swagger
 * tags:
 *   name: Administration
 *   description: Administrative operations for managing the platform.
 */

// =================================================================
// Dashboard
// =================================================================

/**
 * @swagger
 * /admin/dashboard/stats:
 *   get:
 *     summary: Get dashboard statistics
 *     tags: [Administration]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved dashboard stats.
 */
router.get(
  '/dashboard/stats',
  hasPermission('system.settings'),
  AdminController.getDashboardStats
);

/**
 * @swagger
 * /admin/dashboard/failed-jobs:
 *   get:
 *     summary: Get a list of failed background jobs
 *     tags: [Administration]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved failed jobs.
 */
router.get(
  '/dashboard/failed-jobs',
  hasPermission('system.settings'),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  handleValidationErrors,
  AdminController.getFailedJobs
);

// =================================================================
// User Management
// =================================================================

/**
 * @swagger
 * /admin/users/inactive:
 *   get:
 *     summary: Get inactive users
 *     tags: [Administration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: inactiveSince
 *         schema:
 *           type: string
 *           format: date
 *         description: The date to check for inactivity from.
 *     responses:
 *       200:
 *         description: Successfully retrieved inactive users.
 */
router.get(
  '/users/inactive',
  hasPermission('users.read.all'),
  AdminController.getInactiveUsers
);

/**
 * @swagger
 * /admin/users:
 *   post:
 *     summary: Create a new user
 *     tags: [Administration]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: User created successfully.
 */
router.post(
  '/users',
  hasPermission('users.create'),
  validateUserCreation,
  AdminController.createUser
);

/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: Get all users
 *     tags: [Administration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number for pagination.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of users per page.
 *     responses:
 *       200:
 *         description: Successfully retrieved users.
 */
router.get(
  '/users',
  hasPermission('users.read.all'),
  AdminController.getAllUsers
);

/**
 * @swagger
 * /admin/users/{userId}:
 *   get:
 *     summary: Get a single user by ID
 *     tags: [Administration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Successfully retrieved user details.
 *       404:
 *         description: User not found.
 */
router.get(
  '/users/:userId',
  hasPermission('users.read.all'),
  AdminController.getUserById
);

/**
 * @swagger
 * /admin/users/{userId}:
 *   put:
 *     summary: Update a user's details
 *     tags: [Administration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *     responses:
 *       200:
 *         description: User updated successfully.
 */
router.put(
  '/users/:userId',
  hasPermission('users.update.all'),
  AdminController.updateUser
);

/**
 * @swagger
 * /admin/users/{userId}/suspend:
 *   post:
 *     summary: Suspend a user's account
 *     tags: [Administration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: User suspended successfully.
 */
router.post(
  '/users/:userId/suspend',
  hasPermission('users.update.all'),
  AdminController.suspendUser
);

/**
 * @swagger
 * /admin/users/{userId}/unsuspend:
 *   post:
 *     summary: Unsuspend a user's account
 *     tags: [Administration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: User unsuspended successfully.
 */
router.post(
  '/users/:userId/unsuspend',
  hasPermission('users.update.all'),
  AdminController.unsuspendUser
);

/**
 * @swagger
 * /admin/users/{userId}/credit:
 *   post:
 *     summary: Manually credit a user's wallet
 *     tags: [Administration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *                 format: double
 *     responses:
 *       200:
 *         description: Wallet credited successfully.
 */
router.post(
  '/users/:userId/credit',
  hasPermission('users.update.all'),
  AdminController.creditUserWallet
);

/**
 * @swagger
 * /admin/users/{userId}/debit:
 *   post:
 *     summary: Manually debit a user's wallet
 *     tags: [Administration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *                 format: double
 *     responses:
 *       200:
 *         description: Wallet debited successfully.
 */
router.post(
  '/users/:userId/debit',
  hasPermission('users.update.all'),
  AdminController.debitUserWallet
);

/**
 * @swagger
 * /admin/users/{userId}/disable-2fa:
 *   post:
 *     summary: Disable a user's 2FA by an admin
 *     tags: [Administration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: 2FA disabled successfully for the user.
 */
router.post(
  '/users/:userId/disable-2fa',
  hasPermission('users.update.all'),
  AdminController.disable2FAByAdmin
);

// =================================================================
// Session Management
// =================================================================

/**
 * @swagger
 * /admin/users/{userId}/sessions:
 *   get:
 *     summary: Get all active sessions for a user
 *     tags: [Administration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Successfully retrieved user sessions.
 */
router.get(
  '/users/:userId/sessions',
  hasPermission('users.read.all'),
  AdminController.getUserSessions
);

/**
 * @swagger
 * /admin/users/{userId}/sessions:
 *   delete:
 *     summary: Revoke all sessions for a user
 *     tags: [Administration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Sessions revoked successfully.
 */
router.delete(
  '/users/:userId/sessions',
  hasPermission('users.update.all'),
  AdminController.revokeUserSessions
);

// =================================================================
// Role Management
// =================================================================

/**
 * @swagger
 * /admin/roles:
 *   get:
 *     summary: Get all roles
 *     tags: [Administration]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved roles.
 */
router.get('/roles', hasPermission('roles.assign'), AdminController.getRoles);

/** @swagger
 * /admin/assign-role:
 *   post:
 *     summary: Assign a role to a user
 *     tags: [Administration]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *                 format: uuid
 *               roleId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Role assigned successfully.
 */
router.post(
  '/assign-role',
  hasPermission('roles.assign'),
  AdminController.assignRole
);

// =================================================================
// Transaction Management
// =================================================================

/** @swagger
 * /admin/transactions:
 *   get:
 *     summary: Get all transactions with optional filters
 *     tags: [Administration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by user ID
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter from this date
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter to this date
 *       - in: query
 *         name: direction
 *         schema:
 *           type: string
 *           enum: [debit, credit]
 *         description: Filter by transaction direction
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of transactions per page
 *     responses:
 *       200:
 *         description: Successfully retrieved transactions.
 */
router.get(
  '/transactions',
  hasPermission('transactions.read.all'),
  AdminController.getAllTransactions
);

/** @swagger
 * /admin/transactions/{transactionId}:
 *   get:
 *     summary: Get a single transaction by ID
 *     tags: [Administration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transactionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Successfully retrieved transaction.
 *       404:
 *         description: Transaction not found.
 */
router.get(
  '/transactions/:transactionId',
  hasPermission('transactions.read.all'),
  AdminController.getTransactionById
);

// =================================================================
// Topup Request Management
// =================================================================

/** @swagger
 * /admin/topup-requests:
 *   get:
 *     summary: Get all topup requests with optional filters
 *     tags: [Administration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by status (pending, success, failed, reversed, retry)
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by user ID
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter from this date
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter to this date
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of requests per page
 *     responses:
 *       200:
 *         description: Successfully retrieved topup requests.
 */
router.get(
  '/topup-requests',
  hasPermission('topup-requests.read.all'),
  AdminController.getAllTopupRequests
);

/** @swagger
 * /admin/topup-requests/{requestId}:
 *   get:
 *     summary: Get a single topup request by ID
 *     tags: [Administration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Successfully retrieved topup request.
 *       404:
 *         description: Topup request not found.
 */
router.get(
  '/topup-requests/:requestId',
  hasPermission('topup-requests.read.all'),
  AdminController.getTopupRequestById
);

/** @swagger
 * /admin/topup-requests/{requestId}/retry:
 *   post:
 *     summary: Retry a failed topup request
 *     tags: [Administration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Topup request retry initiated successfully.
 *       404:
 *         description: Topup request not found.
 */
router.post(
  '/topup-requests/:requestId/retry',
  hasPermission('topup-requests.update'),
  AdminController.retryTopupRequest
);

// =================================================================
// Job Management
// =================================================================

/** @swagger
 * /admin/jobs/all:
 *   get:
 *     summary: Get all background jobs
 *     tags: [Administration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of jobs per page
 *     responses:
 *       200:
 *         description: Successfully retrieved all jobs.
 */
router.get(
  '/jobs/all',
  hasPermission('system.settings'),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  handleValidationErrors,
  AdminController.getAllJobs
);

/** @swagger
 * /admin/jobs/{jobId}:
 *   get:
 *     summary: Get a single background job by ID
 *     tags: [Administration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Successfully retrieved job.
 *       404:
 *         description: Job not found.
 */
router.get(
  '/jobs/:jobId',
  hasPermission('system.settings'),
  param('jobId').isUUID(),
  handleValidationErrors,
  AdminController.getJob
);

// =================================================================
// Settlement Management
// =================================================================

/** @swagger
 * /admin/settlements:
 *   get:
 *     summary: Get all settlements with optional filters
 *     tags: [Administration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: providerId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by provider ID
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter from this date
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter to this date
 *     responses:
 *       200:
 *         description: Successfully retrieved settlements.
 */
router.get(
  '/settlements',
  hasPermission('settlements.read.all'),
  AdminController.getAllSettlements
);

/** @swagger
 * /admin/settlements/{settlementId}:
 *   get:
 *     summary: Get a single settlement by ID
 *     tags: [Administration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: settlementId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Successfully retrieved settlement.
 *       404:
 *         description: Settlement not found.
 */
router.get(
  '/settlements/:settlementId',
  hasPermission('settlements.read.all'),
  AdminController.getSettlementById
);

/** @swagger
 * /admin/settlements:
 *   post:
 *     summary: Create a new settlement
 *     tags: [Administration]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               providerId:
 *                 type: string
 *                 format: uuid
 *               settlementDate:
 *                 type: string
 *                 format: date
 *               amount:
 *                 type: number
 *               fees:
 *                 type: number
 *               reference:
 *                 type: string
 *               rawReport:
 *                 type: object
 *     responses:
 *       201:
 *         description: Settlement created successfully.
 */
router.post(
  '/settlements',
  hasPermission('settlements.create'),
  AdminController.createSettlement
);

// =================================================================
// Operator Management
// =================================================================

/** @swagger
 * /admin/operators:
 *   get:
 *     summary: Get all operators
 *     tags: [Administration]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved operators.
 */
router.get(
  '/operators',
  hasPermission('operators.read.all'),
  AdminController.getAllOperators
);

/** @swagger
 * /admin/operators:
 *   post:
 *     summary: Create a new operator
 *     tags: [Administration]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code:
 *                 type: string
 *               name:
 *                 type: string
 *               isoCountry:
 *                 type: string
 *     responses:
 *       201:
 *         description: Operator created successfully.
 */
router.post(
  '/operators',
  hasPermission('operators.create'),
  AdminController.createOperator
);

/** @swagger
 * /admin/operators/{operatorId}:
 *   get:
 *     summary: Get a single operator by ID
 *     tags: [Administration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: operatorId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Successfully retrieved operator.
 *       404:
 *         description: Operator not found.
 */
router.get(
  '/operators/:operatorId',
  hasPermission('operators.read.all'),
  AdminController.getOperatorById
);

/** @swagger
 * /admin/operators/{operatorId}:
 *   put:
 *     summary: Update an operator's details
 *     tags: [Administration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: operatorId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               isoCountry:
 *                 type: string
 *     responses:
 *       200:
 *         description: Operator updated successfully.
 */
router.put(
  '/operators/:operatorId',
  hasPermission('operators.update'),
  AdminController.updateOperator
);

// =================================================================
// Supplier Management
// =================================================================

/** @swagger
 * /admin/suppliers:
 *   get:
 *     summary: Get all suppliers
 *     tags: [Administration]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved suppliers.
 */
router.get(
  '/suppliers',
  hasPermission('suppliers.read.all'),
  AdminController.getAllSuppliers
);

/** @swagger
 * /admin/suppliers:
 *   post:
 *     summary: Create a new supplier
 *     tags: [Administration]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               slug:
 *                 type: string
 *               apiBase:
 *                 type: string
 *               apiKey:
 *                 type: string
 *               priorityInt:
 *                 type: number
 *               isActive:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Supplier created successfully.
 */
router.post(
  '/suppliers',
  hasPermission('suppliers.create'),
  AdminController.createSupplier
);

/** @swagger
 * /admin/suppliers/{supplierId}:
 *   get:
 *     summary: Get a single supplier by ID
 *     tags: [Administration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: supplierId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Successfully retrieved supplier.
 *       404:
 *         description: Supplier not found.
 */
router.get(
  '/suppliers/:supplierId',
  hasPermission('suppliers.read.all'),
  AdminController.getSupplierById
);

/** @swagger
 * /admin/suppliers/{supplierId}:
 *   put:
 *     summary: Update a supplier's details
 *     tags: [Administration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: supplierId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               apiBase:
 *                 type: string
 *               apiKey:
 *                 type: string
 *               priorityInt:
 *                 type: number
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Supplier updated successfully.
 */
router.put(
  '/suppliers/:supplierId',
  hasPermission('suppliers.update'),
  AdminController.updateSupplier
);

// =================================================================
// Product and Bundle Management
// =================================================================

/** @swagger
 * /admin/products:
 *   get:
 *     summary: Get all operator products
 *     tags: [Administration]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved products.
 */
router.get(
  '/products',
  hasPermission('products.read.all'),
  AdminController.getAllProducts
);

/** @swagger
 * /admin/products:
 *   post:
 *     summary: Create a new product (with optional supplier mapping)
 *     tags: [Administration]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               operatorId:
 *                 type: string
 *                 format: uuid
 *               productCode:
 *                 type: string
 *               name:
 *                 type: string
 *               productType:
 *                 type: string
 *               denomAmount:
 *                 type: number
 *               dataMb:
 *                 type: number
 *               validityDays:
 *                 type: number
 *               isActive:
 *                 type: boolean
 *               metadata:
 *                 type: object
 *               supplierId:
 *                 type: string
 *                 format: uuid
 *                 description: Optional supplier ID to create mapping with
 *               supplierProductCode:
 *                 type: string
 *                 description: Optional supplier-specific product code
 *               supplierPrice:
 *                 type: number
 *                 description: Optional supplier price for the mapping
 *               minOrderAmount:
 *                 type: number
 *                 description: Optional minimum order amount
 *               maxOrderAmount:
 *                 type: number
 *                 description: Optional maximum order amount
 *               leadTimeSeconds:
 *                 type: number
 *                 description: Optional lead time in seconds
 *               mappingIsActive:
 *                 type: boolean
 *                 description: Optional active status for the mapping
 *     responses:
 *       201:
 *         description: Product (and optionally mapping) created successfully.
 */
router.post(
  '/products',
  hasPermission('products.create'),
  AdminController.createProduct
);

/** @swagger
 * /admin/products/{productId}:
 *   get:
 *     summary: Get a single product by ID
 *     tags: [Administration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Successfully retrieved product.
 *       404:
 *         description: Product not found.
 */
router.get(
  '/products/:productId',
  hasPermission('products.read.all'),
  AdminController.getProductById
);

/** @swagger
 * /admin/products/{productId}:
 *   put:
 *     summary: Update a product's details
 *     tags: [Administration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               productCode:
 *                 type: string
 *               productType:
 *                 type: string
 *               denomAmount:
 *                 type: number
 *               dataMb:
 *                 type: number
 *               validityDays:
 *                 type: number
 *               isActive:
 *                 type: boolean
 *               metadata:
 *                 type: object
 *     responses:
 *       200:
 *         description: Product updated successfully.
 */
router.put(
  '/products/:productId',
  hasPermission('products.update'),
  AdminController.updateProduct
);

/** @swagger
 * /admin/products/{productId}/map-to-supplier:
 *   post:
 *     summary: Link a product to a specific supplier
 *     tags: [Administration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               supplierId:
 *                 type: string
 *                 format: uuid
 *               supplierProductCode:
 *                 type: string
 *               supplierPrice:
 *                 type: number
 *               minOrderAmount:
 *                 type: number
 *               maxOrderAmount:
 *                 type: number
 *               leadTimeSeconds:
 *                 type: number
 *               isActive:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Product mapped to supplier successfully.
 */
router.post(
  '/products/:productId/map-to-supplier',
  hasPermission('products.update'),
  AdminController.mapProductToSupplier
);

// ---------------- Offer admin endpoints ----------------
/**
 * @swagger
 * /admin/offers/{offerId}/compute-segment:
 *   post:
 *     summary: Compute and populate precomputed eligible users for an offer
 *     tags: [Administration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: offerId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Segment computed successfully.
 *       400:
 *         description: Bad request.
 */
router.post(
  '/offers/:offerId/compute-segment',
  hasPermission('offer:admin'),
  AdminController.computeOfferSegment
);

/**
 * @swagger
 * /admin/offers/{offerId}/eligible-users:
 *   get:
 *     summary: Get precomputed eligible users for an offer (paginated)
 *     tags: [Administration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: offerId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of eligible users.
 */
router.get(
  '/offers/:offerId/eligible-users',
  hasPermission('offer:read'),
  AdminController.getOfferSegmentMembers
);

/**
 * @swagger
 * /admin/offers/{offerId}/preview-eligibility:
 *   get:
 *     summary: Preview eligibility for a sample of users
 *     tags: [Administration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: offerId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of sample users to evaluate (default 100)
 *     responses:
 *       200:
 *         description: Eligibility preview returned.
 */
router.get(
  '/offers/:offerId/preview-eligibility',
  hasPermission('offer:read'),
  AdminController.previewOfferEligibility
);

/**
 * @swagger
 * /admin/offers/{offerId}/redemptions:
 *   post:
 *     summary: Create a bulk redemption job for an offer (sync worker stub)
 *     tags: [Administration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: offerId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *               fromSegment:
 *                 type: boolean
 *               price:
 *                 type: number
 *               discount:
 *                 type: number
 *     responses:
 *       200:
 *         description: Bulk redemption job enqueued/executed.
 *       400:
 *         description: Invalid request.
 */
router.post(
  '/offers/:offerId/redemptions',
  hasPermission('offer:redeem'),
  AdminController.createOfferRedemptionsJob
);

export default router;
