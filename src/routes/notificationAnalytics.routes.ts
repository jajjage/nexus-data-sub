import { Router } from 'express';
import { NotificationAnalyticsController } from '../controllers/notificationAnalytics.controller';
import { authenticate } from '../middleware/auth.middleware';
import { hasPermission } from '../middleware/rbac.middleware';

const router = Router();

router.use(authenticate, hasPermission('view_notification_analytics'));

/**
 * @swagger
 * tags:
 *   name: Notification Analytics
 *   description: View notification analytics
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
 *           type: integer
 *     responses:
 *       200:
 *         description: Analytics data
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
 *           type: integer
 *     responses:
 *       200:
 *         description: Analytics data
 */
router.get(
  '/user/:userId',
  NotificationAnalyticsController.getAnalyticsByUserId
);

export default router;
