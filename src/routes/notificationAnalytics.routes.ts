import { Router } from 'express';
import { NotificationAnalyticsController } from '../controllers/notificationAnalytics.controller';
import { authenticate } from '../middleware/auth.middleware';
import { hasPermission } from '../middleware/rbac.middleware';

const router = Router();

router.use(authenticate, hasPermission('view.notification_analytics'));

/**
 * @swagger
 * tags:
 *   name: Notification Analytics
 *   description: View notification analytics
 * components:
 *   schemas:
 *     NotificationAnalytics:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         notification_id:
 *           type: string
 *           format: uuid
 *         user_id:
 *           type: string
 *           format: uuid
 *         status:
 *           type: string
 *           enum: [sent, delivered, opened, failed]
 *         created_at:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /notification-analytics/notification/{notificationId}:
 *   get:
 *     summary: Get analytics by notification ID
 *     tags: [Notification Analytics]
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
 *         description: Analytics data
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/NotificationAnalytics'
 */
router.get(
  '/notification/:notificationId',
  NotificationAnalyticsController.getAnalyticsByNotificationId
);

/**
 * @swagger
 * /notification-analytics/user/{userId}:
 *   get:
 *     summary: Get analytics by user ID
 *     tags: [Notification Analytics]
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
 *         description: Analytics data
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/NotificationAnalytics'
 */
router.get(
  '/user/:userId',
  NotificationAnalyticsController.getAnalyticsByUserId
);

export default router;
