import { NextFunction, Response } from 'express';
import { TestWebhookService } from '../services/testWebhook.service';
import { TestWebhookRequest } from '../types/testWebhook.types';
import { sendError, sendSuccess } from '../utils/response.utils';

export class TestWebhookController {
  private testWebhookService: TestWebhookService;

  constructor() {
    this.testWebhookService = new TestWebhookService();
  }

  /**
   * Simulate a payment webhook for testing purposes
   */
  public async simulatePayment(
    req: TestWebhookRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const {
        userId,
        amount,
        provider = 'test-provider',
        providerVaId = 'test-va',
      } = req.body;

      // Validate required fields
      if (!userId || !amount) {
        sendError(res, 'userId and amount are required', 400);
        return;
      }

      // Validate amount
      if (typeof amount !== 'number' || amount <= 0) {
        sendError(res, 'amount must be a positive number', 400);
        return;
      }

      // Validate user ID format (UUID)
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(userId)) {
        sendError(res, 'Invalid user ID format', 400);
        return;
      }

      // Process the test payment
      const result = await this.testWebhookService.processTestPayment(
        userId,
        amount,
        provider,
        providerVaId
      );

      if (result.success) {
        sendSuccess(
          res,
          result.message,
          {
            userId: result.userId,
            newBalance: result.newBalance,
            amountCredited: result.amountCredited,
          },
          200
        );
      } else {
        sendError(res, result.message, result.statusCode || 500);
      }
    } catch (error) {
      console.error('Error in simulatePayment:', error);
      next(error);
    }
  }
}
