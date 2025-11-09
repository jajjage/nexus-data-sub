import { Router } from 'express';
import { TopupWebhookController } from '../controllers/topup.webhook.controller';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Topup Webhook
 *   description: Topup webhook simulation
 */

/**
 * @swagger
 * /webhooks/topup-vendor:
 *   post:
 *     summary: Simulate a topup vendor webhook
 *     tags: [Topup Webhook]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               transaction:
 *                 type: object
 *                 properties:
 *                   status:
 *                     type: string
 *                   reference:
 *                     type: string
 *                   customer_reference:
 *                     type: string
 *                   type:
 *                     type: string
 *                   beneficiary:
 *                     type: string
 *                   memo:
 *                     type: string
 *                   response:
 *                     type: string
 *                   price:
 *                     type: string
 *     responses:
 *       200:
 *         description: Webhook processed successfully.
 */
router.post('/topup-vendor', new TopupWebhookController().simulateTopup);

export default router;
