import { Router } from 'express';
import { ChatController } from '../controllers/chat.controller';
import { authenticate } from '../middleware/auth.middleware';
import {
  channelCreationLimiter,
  messageRateLimiter,
} from '../middleware/rateLimiter.middleware';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Chat
 *   description: Chat channels and messages
 * components:
 *   schemas:
 *     Channel:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         is_support:
 *           type: boolean
 *         created_at:
 *           type: string
 *           format: date-time
 *     Message:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         client_msg_id:
 *           type: string
 *         channel_id:
 *           type: string
 *           format: uuid
 *         sender_id:
 *           type: string
 *         body:
 *           type: string
 *         attachments:
 *           type: array
 *           items:
 *             type: object
 *         metadata:
 *           type: object
 *         seq:
 *           type: integer
 *         status:
 *           type: string
 *         created_at:
 *           type: string
 *           format: date-time
 *     ChannelListResponse:
 *       type: array
 *       items:
 *         $ref: '#/components/schemas/Channel'
 *     MessagesListResponse:
 *       type: array
 *       items:
 *         $ref: '#/components/schemas/Message'
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
router.post(
  '/support',
  channelCreationLimiter,
  ChatController.createSupportChannel
);

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
router.get(
  '/channels/:channelId/messages',
  messageRateLimiter,
  ChatController.getMessages
);

export default router;
