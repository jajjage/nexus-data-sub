import { TestWebhookRequest } from '@/types/testWebhook.types';
import express from 'express';
import { TestWebhookController } from '../controllers/testWebhook.controller';
import { validateTestWebhook } from '../middleware/testWebhook.validation';

const router = express.Router();
const webhookController = new TestWebhookController();

/**
 * @swagger
 * tags:
 *   name: Test Webhook
 *   description: Test webhook endpoints for simulating payments
 */

/**
 * @swagger
 * /test-webhooks/simulate-payment:
 *   post:
 *     summary: Simulate a payment webhook for testing
 *     tags: [Test Webhook]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - txRef
 *               - amount
 *             properties:
 *               txRef:
 *                 type: string
 *                 description: User tx_ref to credit
 *                 example: "user_123e4567-e89b-12d3-a456-426614174000"
 *               amount:
 *                 type: number
 *                 description: Amount to credit
 *                 example: 1000
 *               provider:
 *                 type: string
 *                 description: Payment provider name
 *                 example: "test-provider"
 *               providerVaId:
 *                 type: string
 *                 description: Virtual account ID
 *                 example: "test-va-123"
 *     responses:
 *       200:
 *         description: Payment processed successfully
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
 *                     txRef:
 *                       type: string
 *                     newBalance:
 *                       type: number
 *                     amountCredited:
 *                       type: number
 */
router.post(
  '/simulate-payment',
  validateTestWebhook,
  (
    req: TestWebhookRequest,
    res: express.Response<any, Record<string, any>>,
    next: express.NextFunction
  ) => webhookController.simulatePayment(req, res, next)
);

export default router;
