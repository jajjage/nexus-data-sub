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

/**
 * @swagger
 * /notification-preferences/mute-all:
 *   post:
 *     summary: Mute all notification categories
 *     tags: [User Notification Preferences]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications muted
 */
router.post('/mute-all', UserNotificationPreferenceController.muteAll);

/**
 * @swagger
 * /notification-preferences/unmute-all:
 *   post:
 *     summary: Unmute all notification categories
 *     tags: [User Notification Preferences]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications unmuted
 */
router.post('/unmute-all', UserNotificationPreferenceController.unmuteAll);

/**
 * @swagger
 * /notification-preferences/{category}:
 *   put:
 *     summary: Toggle subscription for a specific category
 *     tags: [User Notification Preferences]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *         description: Notification category (e.g., promotional, updates, security)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - subscribed
 *             properties:
 *               subscribed:
 *                 type: boolean
 *                 description: Whether to subscribe to this category
 *     responses:
 *       200:
 *         description: Category subscription toggled
 */
router.put(
  '/:category',
  UserNotificationPreferenceController.toggleCategorySubscription
);

export default router;
