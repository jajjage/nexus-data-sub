import { Router } from 'express';
import { NotificationTemplateController } from '../controllers/notificationTemplate.controller';
import { authenticate } from '../middleware/auth.middleware';
import { hasPermission } from '../middleware/rbac.middleware';

const router = Router();

router.use(authenticate, hasPermission('manage_notification_templates'));

/**
 * @swagger
 * tags:
 *   name: Notification Templates
 *   description: Manage notification templates
 */

/**
 * @swagger
 * /notification-templates:
 *   post:
 *     summary: Create a new notification template
 *     tags: [Notification Templates]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NotificationTemplate'
 *     responses:
 *       201:
 *         description: Template created
 */
router.post('/', NotificationTemplateController.createTemplate);

/**
 * @swagger
 * /notification-templates:
 *   get:
 *     summary: Get all notification templates
 *     tags: [Notification Templates]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of templates
 */
router.get('/', NotificationTemplateController.listTemplates);

/**
 * @swagger
 * /notification-templates/{templateId}:
 *   get:
 *     summary: Get a notification template by ID
 *     tags: [Notification Templates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: templateId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Template details
 */
router.get('/:templateId', NotificationTemplateController.getTemplate);

/**
 * @swagger
 * /notification-templates/{templateId}:
 *   put:
 *     summary: Update a notification template
 *     tags: [Notification Templates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: templateId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NotificationTemplate'
 *     responses:
 *       200:
 *         description: Template updated
 */
router.put('/:templateId', NotificationTemplateController.updateTemplate);

/**
 * @swagger
 * /notification-templates/{templateId}:
 *   delete:
 *     summary: Delete a notification template
 *     tags: [Notification Templates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: templateId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Template deleted
 */
router.delete('/:templateId', NotificationTemplateController.deleteTemplate);

export default router;
