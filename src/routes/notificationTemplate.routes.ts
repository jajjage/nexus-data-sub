import { Router } from 'express';
import { NotificationTemplateController } from '../controllers/notificationTemplate.controller';
import { authenticate } from '../middleware/auth.middleware';
import { hasPermission } from '../middleware/rbac.middleware';

const router = Router();

router.use(authenticate, hasPermission('manage.notification_templates'));

/**
 * @swagger
 * tags:
 *   name: Notification Templates
 *   description: Manage notification templates
 * components:
 *   schemas:
 *     NotificationTemplate:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         template_id:
 *           type: string
 *         title:
 *           type: string
 *         body:
 *           type: string
 *         locales:
 *           type: array
 *           items:
 *             type: string
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
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
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationTemplate'
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
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/NotificationTemplate'
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
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationTemplate'
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
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationTemplate'
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
