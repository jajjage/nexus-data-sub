import { Router } from 'express';
import { UserNotificationPreferenceController } from '../controllers/userNotificationPreference.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: User Notification Preferences
 *   description: Manage user notification preferences
 */

/**
 * @swagger
 * /notification-preferences:
 *   get:
 *     summary: Get user notification preferences
 *     tags: [User Notification Preferences]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of preferences
 */
router.get('/', UserNotificationPreferenceController.getPreferences);

/**
 * @swagger
 * /notification-preferences:
 *   put:
 *     summary: Update user notification preferences
 *     tags: [User Notification Preferences]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserNotificationPreference'
 *     responses:
 *       200:
 *         description: Preferences updated
 */
router.put('/', UserNotificationPreferenceController.upsertPreference);

export default router;
