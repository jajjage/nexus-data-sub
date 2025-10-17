import express from 'express';
import { WebhookController } from '../controllers/webhook.controller';
import {
  webhookAuthMiddleware,
} from '../middleware/webhook.middleware';

const router = express.Router();

// Route for handling provider-specific webhooks
// The :provider parameter will be used to identify which provider sent the webhook
router.post(
  '/:provider',
  webhookAuthMiddleware,
  (req, res, next) => {
    const webhookController = new WebhookController();
    webhookController.handleWebhook(req, res, next);
  }
);

export default router;
