import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller';
import { NotificationAnalyticsController } from '../controllers/notificationAnalytics.controller';
import { authenticate } from '../middleware/auth.middleware';
import { hasPermission, requireRole } from '../middleware/rbac.middleware';

const router = Router();

// All admin notification routes require authentication and proper permissions
router.use(authenticate, requireRole('admin'));

/**
 * @swagger
 * tags:
 *   name: Admin - Notifications
 *   description: Admin notification management endpoints
 */

/**
 * @swagger
 * /admin/notifications:
 *   post:
 *     summary: Create a new notification
 *     tags: [Admin - Notifications]
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
 */
router.post(
  '/',
  hasPermission('create.notification'),
  NotificationController.createNotification
);

/**
 * @swagger
 * /admin/notifications/schedule:
 *   post:
 *     summary: Create a notification with optional scheduling for future delivery
 *     tags: [Admin - Notifications]
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
 *         description: Notification created (and sent immediately if publish_at is null or in the past)
 */
router.post(
  '/schedule',
  hasPermission('create.notification'),
  NotificationController.createScheduledNotification
);

/**
 * @swagger
 * /admin/notifications/from-template:
 *   post:
 *     summary: Create a notification from a template with variable substitution
 *     tags: [Admin - Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - template_id
 *             properties:
 *               template_id:
 *                 type: string
 *                 description: ID of the template to use
 *               variables:
 *                 type: object
 *                 description: Variables to substitute in the template (e.g., {userName, amount})
 *               category:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [info, success, warning, error, alert]
 *               targetCriteria:
 *                 type: object
 *               publish_at:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Notification created from template
 *       404:
 *         description: Template not found
 */
router.post(
  '/from-template',
  hasPermission('create.notification'),
  NotificationController.createFromTemplate
);

/**
 * @swagger
 * /admin/notifications:
 *   get:
 *     summary: List all notifications
 *     tags: [Admin - Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page (default 50)
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *         description: Pagination offset (default 0)
 *       - in: query
 *         name: archived
 *         schema:
 *           type: boolean
 *         description: Include archived notifications
 *     responses:
 *       200:
 *         description: List of notifications
 */
router.get(
  '/',
  hasPermission('view.notification'),
  NotificationController.listAllNotifications
);

/**
 * @swagger
 * /admin/notifications/{notificationId}:
 *   patch:
 *     summary: Edit a notification
 *     tags: [Admin - Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
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
 *               title:
 *                 type: string
 *               body:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [info, success, warning, error, alert]
 *               category:
 *                 type: string
 *               publish_at:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Notification updated
 */
router.patch(
  '/:notificationId',
  hasPermission('update.notification'),
  NotificationController.editNotification
);

/**
 * @swagger
 * /admin/notifications/{notificationId}:
 *   delete:
 *     summary: Archive a notification
 *     tags: [Admin - Notifications]
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
 *         description: Notification archived
 */
router.delete(
  '/:notificationId',
  hasPermission('delete.notification'),
  NotificationController.archiveNotification
);

/**
 * @swagger
 * /admin/notifications/{notificationId}/analytics:
 *   get:
 *     summary: View notification analytics/stats
 *     tags: [Admin - Notifications]
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
 *         description: Analytics data for notification
 */
router.get(
  '/:notificationId/analytics',
  hasPermission('view.notification_analytics'),
  NotificationAnalyticsController.getAnalyticsByNotificationId
);

export default router;
