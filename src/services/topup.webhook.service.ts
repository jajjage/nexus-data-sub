import db from '../database/connection';
import { TopupRequestModel } from '../models/TopupRequest';
import { TransactionModel } from '../models/Transaction';

export class TopupWebhookService {
  /**
   * Process the simulated top-up webhook from the vendor.
   * @param webhookData The data received from the webhook.
   * @returns A result object indicating success or failure.
   */
  static async processTopupWebhook(webhookData: any): Promise<{
    success: boolean;
    message: string;
    data?: any;
    statusCode?: number;
  }> {
    const { transaction } = webhookData;
    const { customer_reference, status } = transaction;

    if (!customer_reference || !status) {
      return {
        success: false,
        message: 'Missing customer_reference or status',
        statusCode: 400,
      };
    }

    return db.transaction(async trx => {
      const topupRequest = await TopupRequestModel.findById(
        customer_reference,
        trx
      );

      if (!topupRequest) {
        return {
          success: false,
          message: 'Top-up request not found',
          statusCode: 404,
        };
      }

      if (topupRequest.status !== 'pending') {
        return { success: true, message: 'Top-up request already processed' };
      }

      // Log the response
      await trx('topup_responses').insert({
        topup_request_id: customer_reference,
        response_payload: webhookData,
        response_message: transaction.memo,
      });

      if (status === 'success') {
        await trx('topup_requests')
          .where({ id: customer_reference })
          .update({ status: 'success' });

        return { success: true, message: 'Top-up successful' };
      } else if (status === 'failed') {
        await trx('topup_requests')
          .where({ id: customer_reference })
          .update({ status: 'failed' });

        // Refund the user
        const wallet = await trx('wallets')
          .where({ user_id: topupRequest.userId })
          .first();
        if (!wallet) {
          throw new Error('Wallet not found for user');
        }

        const newBalance = wallet.balance + topupRequest.amount;
        await trx('wallets')
          .where({ user_id: topupRequest.userId })
          .update({ balance: newBalance });

        await TransactionModel.create(
          {
            walletId: wallet.id,
            userId: topupRequest.userId,
            direction: 'credit',
            amount: topupRequest.amount,
            balanceAfter: newBalance,
            method: 'reversal',
            relatedType: 'topup_request',
            relatedId: customer_reference,
          },
          trx
        );

        return { success: true, message: 'Top-up failed, user refunded' };
      }

      return {
        success: false,
        message: 'Invalid status received',
        statusCode: 400,
      };
    });
  }
}
