import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validatePushToken } from '../middleware/pushToken.validation.middleware';
import { hasPermission } from '../middleware/rbac.middleware';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: Push notifications and notification management
 * components:
 *   schemas:
 *     Notification:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         title:
 *           type: string
 *         body:
 *           type: string
 *         targetCriteria:
 *           $ref: '#/components/schemas/NotificationTargetCriteria'
 *         publish_at:
 *           type: string
 *           format: date-time
 *         created_by:
 *           type: string
 *           format: uuid
 *         created_at:
 *           type: string
 *           format: date-time
 *         sent:
 *           type: boolean
 *         archived:
 *           type: boolean
 *     NotificationTargetCriteria:
 *       type: object
 *       properties:
 *         registrationDateRange:
 *           type: object
 *           properties:
 *             start:
 *               type: string
 *               format: date-time
 *             end:
 *               type: string
 *               format: date-time
 *         minTransactionCount:
 *           type: integer
 *         maxTransactionCount:
 *           type: integer
 *         minTopupCount:
 *           type: integer
 *         maxTopupCount:
 *           type: integer
 *         lastActiveWithinDays:
 *           type: integer
 *     PushTokenRegisterRequest:
 *       type: object
 *       required:
 *         - token
 *         - platform
 *       properties:
 *         token:
 *           type: string
 *         platform:
 *           type: string
 *           enum: [ios, android, web]
 *     CreateNotificationRequest:
 *       type: object
 *       required:
 *         - title
 *         - body
 *       properties:
 *         title:
 *           type: string
 *         body:
 *           type: string
 *         targetCriteria:
 *           $ref: '#/components/schemas/NotificationTargetCriteria'
 *         publish_at:
 *           type: string
 *           format: date-time
 */

// User-facing routes
router.use(authenticate);

/**
 * @swagger
 * /notifications:
 *   get:
 *     summary: Get notifications for the authenticated user
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user notifications
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Notification'
 */
router.get('/', NotificationController.getUserNotifications);

/**
 * @swagger
 * /notifications/tokens:
 *   post:
 *     summary: Register a push token for the authenticated user
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PushTokenRegisterRequest'
 *     responses:
 *       204:
 *         description: Push token registered
 *       400:
 *         description: Validation error
 */
router.post(
  '/tokens',
  validatePushToken,
  NotificationController.registerPushToken
);

/**
 * @swagger
 * /notifications:
 *   post:
 *     summary: Create a new notification (admin)
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateNotificationRequest'
 *     responses:
 *       201:
 *         description: Notification created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Notification'
 */
router.post(
  '/',
  authenticate,
  hasPermission('create_notification'),
  NotificationController.createNotification
);

export default router;
