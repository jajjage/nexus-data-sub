import { NextFunction, Response } from 'express';
import { WebhookService } from '../services/webhook.service';
import { PalmPayWebhookPayload, WebhookRequest } from '../types/webhook.types';
import { ApiError } from '../utils/ApiError';

export class WebhookController {
  private webhookService: WebhookService;

  constructor() {
    this.webhookService = new WebhookService();
  }

  /**
   * Handle incoming webhook notifications
   */
  public handleWebhook = async (
    req: WebhookRequest,
    res: Response,
    next: NextFunction
  ): Promise<void | Response> => {
    try {
      const provider = req.params.provider?.toLowerCase();
      if (!provider) {
        throw new ApiError(400, 'Provider not specified');
      }

      // Validate provider name to prevent injection
      if (!/^[a-z0-9_-]+$/.test(provider)) {
        throw new ApiError(400, 'Invalid provider name format');
      }

      if (!req.webhookEvent) {
        throw new ApiError(500, 'Webhook event not found in request');
      }

      const result = await this.webhookService.processPayment(
        provider,
        req.webhookEvent,
        req.body as PalmPayWebhookPayload
      );

      return res.status(result.statusCode).json({
        status: result.success ? 'success' : 'error',
        message: result.message,
        data: result.data,
      });
    } catch (error) {
      next(error);
    }
  };
}
