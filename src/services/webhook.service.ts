import knex from '../database/connection';
import {
  PalmPayWebhookPayload,
  WebhookEvent,
  WebhookResult,
} from '../types/webhook.types';
import { ApiError } from '../utils/ApiError';

export class WebhookService {
  /**
   * Process incoming webhook payment notification
   */
  public async processPayment(
    provider: string,
    webhookEvent: WebhookEvent,
    payload: PalmPayWebhookPayload
  ): Promise<WebhookResult> {
    const trx = await knex.transaction();

    try {
      // Extract payment details from payload
      const providerReference =
        payload.transaction_id ||
        payload.txn_id ||
        payload.provider_reference ||
        payload.id;
      const providerVaId =
        payload.virtual_account_id || payload.account_number || payload.va_id;
      const amountRaw =
        payload.amount || payload.value || payload.credit_amount;
      const amount = amountRaw ? Number(amountRaw) : null;
      const currency = payload.currency || 'NGN';
      const receivedAt = payload.timestamp
        ? new Date(payload.timestamp)
        : new Date();

      // Validate required fields
      if (!providerReference || !providerVaId || !amount) {
        await trx.rollback();
        return {
          success: false,
          message: 'Missing required fields in webhook payload',
          statusCode: 400,
          data: { webhookEventId: webhookEvent.id },
        };
      }

      // Insert incoming payment with idempotency check
      const [incomingPayment] = await trx('incoming_payments')
        .insert({
          provider,
          provider_reference: providerReference,
          provider_va_id: providerVaId,
          amount,
          currency,
          raw_payload: payload,
          received_at: receivedAt,
          created_at: new Date(),
        })
        .onConflict(['provider', 'provider_reference'])
        .ignore()
        .returning('*');

      // If payment already exists, mark webhook as processed and return
      if (!incomingPayment) {
        await trx('webhook_events')
          .where({ id: webhookEvent.id })
          .update({ processed: true, processed_at: new Date() });

        await trx.commit();
        return {
          success: true,
          message: 'Payment already processed',
          statusCode: 200,
          data: { webhookEventId: webhookEvent.id },
        };
      }

      // Find virtual account mapping
      const virtualAccount = await trx('virtual_accounts')
        .where({
          provider,
          provider_va_id: providerVaId,
        })
        .orWhere({
          provider,
          account_number: providerVaId,
        })
        .first();

      let userId = null;
      let virtualAccountId = null;

      if (virtualAccount) {
        virtualAccountId = virtualAccount.id;
        userId = virtualAccount.user_id;

        // Update incoming payment with virtual account and user info
        await trx('incoming_payments')
          .where({ id: incomingPayment.id })
          .update({
            virtual_account_id: virtualAccountId,
            user_id: userId,
          });
      }

      // If user found, credit their wallet
      if (userId) {
        // Ensure wallet exists
        await trx('wallets')
          .insert({
            user_id: userId,
            balance: 0,
            currency,
            updated_at: new Date(),
          })
          .onConflict('user_id')
          .ignore();

        // Get current balance and update atomically
        const wallet = await trx('wallets')
          .where({ user_id: userId })
          .forUpdate()
          .first();

        const currentBalance = wallet ? Number(wallet.balance) : 0;
        const newBalance = Number((currentBalance + amount).toFixed(2));

        await trx('wallets').where({ user_id: userId }).update({
          balance: newBalance,
          updated_at: new Date(),
        });

        // Record wallet transaction
        await trx('wallet_transactions').insert({
          user_id: userId,
          kind: 'credit',
          amount,
          balance_after: newBalance,
          source: `${provider}_va`,
          reference: providerReference,
          metadata: { virtual_account_id: virtualAccountId },
          created_at: new Date(),
        });
      }

      // Mark webhook as processed
      await trx('webhook_events').where({ id: webhookEvent.id }).update({
        processed: true,
        processed_at: new Date(),
      });

      await trx.commit();

      return {
        success: true,
        message: 'Payment processed successfully',
        statusCode: 200,
        data: {
          webhookEventId: webhookEvent.id,
          incomingPaymentId: incomingPayment.id,
          userId,
          virtualAccountId,
        },
      };
    } catch (error) {
      await trx.rollback();
      throw new ApiError(
        500,
        'Error processing webhook payment: ' + (error as Error).message
      );
    }
  }
}
