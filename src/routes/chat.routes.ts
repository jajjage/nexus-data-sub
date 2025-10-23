import { Router } from 'express';
import { ChatController } from '../controllers/chat.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Chat
 *   description: Chat channels and messages
 */

router.use(authenticate);

/**
 * @swagger
 * /chat/support:
 *   post:
 *     summary: Create or get a support channel for the authenticated user
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Support channel created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Channel'
 */
router.post('/support', ChatController.createSupportChannel);

/**
 * @swagger
 * /chat/channels:
 *   get:
 *     summary: Get channels for the authenticated user
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of channels
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ChannelListResponse'
 */
router.get('/channels', ChatController.getUserChannels);

/**
 * @swagger
 * /chat/channels/{channelId}/messages:
 *   get:
 *     summary: Get messages for a channel
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: channelId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Messages in the channel
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessagesListResponse'
 */
router.get('/channels/:channelId/messages', ChatController.getMessages);

export default router;
