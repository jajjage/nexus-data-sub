import { NextFunction, Request, Response } from 'express';
import { TopupWebhookService } from '../services/topup.webhook.service';
import { sendError, sendSuccess } from '../utils/response.utils';

export class TopupWebhookController {
  /**
   * Simulate a topup vendor webhook for testing purposes
   */
  public async simulateTopup(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await TopupWebhookService.processTopupWebhook(req.body);

      if (result.success) {
        sendSuccess(res, result.message, result.data, 200);
      } else {
        sendError(res, result.message, result.statusCode || 500);
      }
    } catch (error) {
      console.error('Error in simulateTopup:', error);
      next(error);
    }
  }
}
