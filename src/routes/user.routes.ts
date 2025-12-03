import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validatePin } from '../middleware/pin.validation.middleware';
import { hasPermission } from '../middleware/rbac.middleware';

const router = Router();

// All routes in this file are protected and require authentication
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: User
 *   description: User-facing operations for profile, wallet, and purchases
 */

// =================================================================
// Profile Management
// =================================================================

/**
 * @swagger
 * /user/profile/me:
 *   get:
 *     summary: Get the current user's profile
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved user profile.
 */
router.get(
  '/profile/me',
  hasPermission('profile.read'),
  UserController.getMyProfile
);

/**
 * @swagger
 * /user/profile/me:
 *   put:
 *     summary: Update the current user's profile
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully.
 */
router.put(
  '/profile/me',
  hasPermission('profile.update'),
  UserController.updateMyProfile
);

/**
 * @swagger
 * /user/profile/pin:
 *   put:
 *     summary: Set or update the user's transaction PIN
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               pin:
 *                 type: string
 *                 description: The 4-digit transaction PIN.
 *               currentPassword:
 *                 type: string
 *                 description: Required if a PIN is already set.
 *     responses:
 *       200:
 *         description: PIN set/updated successfully.
 */
router.put(
  '/profile/pin',
  hasPermission('profile.update'),
  validatePin,
  UserController.setTransactionPin
);

// =================================================================
// Wallet & Transactions
// =================================================================

/**
 * @swagger
 * /user/wallet/transactions:
 *   get:
 *     summary: Get the user's transaction history
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: direction
 *         schema:
 *           type: string
 *           enum: [credit, debit]
 *     responses:
 *       200:
 *         description: Successfully retrieved transaction history.
 */
router.get(
  '/wallet/transactions',
  hasPermission('transactions.read.own'),
  UserController.getMyTransactions
);

/**
 * @swagger
 * /user/wallet/transactions/{id}:
 *   get:
 *     summary: Get a specific transaction by ID
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully retrieved transaction.
 */
router.get(
  '/wallet/transactions/:id',
  hasPermission('transactions.read.own'),
  UserController.getTransactionById
);

// =================================================================
// Purchase History
// =================================================================

/**
 * @swagger
 * /user/purchases:
 *   get:
 *     summary: Get the user's purchase history
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, success, failed, reversed, retry]
 *     responses:
 *       200:
 *         description: Successfully retrieved purchase history.
 */
router.get(
  '/purchases',
  hasPermission('transactions.read.own'),
  UserController.getMyPurchases
);

/**
 * @swagger
 * /user/topup:
 *   post:
 *     summary: Start a purchase (creates debit & pending request)
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *               productCode:
 *                 type: string
 *               recipientPhone:
 *                 type: string
 *               supplierSlug:
 *                 type: string
 *               supplierMappingId:
 *                 type: string
 *               useCashback:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Topup request created successfully.
 */
router.post('/topup', hasPermission('topup.create'), UserController.topup);

export default router;
