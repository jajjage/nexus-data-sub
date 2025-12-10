import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validatePushToken } from '../middleware/pushToken.validation.middleware';

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
 * /notifications/tokens/unlink:
 *   post:
 *     summary: Unlink a push token for the authenticated user
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 description: The FCM push token to unlink
 *     responses:
 *       200:
 *         description: Push token unlinked successfully
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
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 */
router.post('/tokens/unlink', authenticate, NotificationController.unlinkToken);

/**
 * @swagger
 * /notifications/{notificationId}/read:
 *   put:
 *     summary: Mark a notification as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Notification marked as read
 */
router.put(
  '/:notificationId/read',
  authenticate,
  NotificationController.markAsRead
);

/**
 * @swagger
 * /notifications/{notificationId}/unread:
 *   put:
 *     summary: Mark a notification as unread
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Notification marked as unread
 */
router.put(
  '/:notificationId/unread',
  authenticate,
  NotificationController.markAsUnread
);

/**
 * @swagger
 * /notifications/read-all:
 *   put:
 *     summary: Mark all notifications as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read
 */
router.put(
  '/read-all/mark',
  authenticate,
  NotificationController.markAllAsRead
);

/**
 * @swagger
 * /notifications/unread-count:
 *   get:
 *     summary: Get count of unread notifications
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Unread count retrieved
 */
router.get(
  '/unread-count/count',
  authenticate,
  NotificationController.getUnreadCount
);

/**
 * @swagger
 * /notifications/{notificationId}:
 *   delete:
 *     summary: Delete a notification for the authenticated user
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Notification deleted
 */
router.delete(
  '/:notificationId',
  authenticate,
  NotificationController.deleteNotification
);

export default router;
