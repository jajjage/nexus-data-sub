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

      // Additional validation
      if (isNaN(amount) || !isFinite(amount) || amount <= 0) {
        await trx.rollback();
        throw new ApiError(400, 'Invalid amount in webhook payload');
      }

      // Set maximum amount to prevent excessive credits (adjust as per business requirements)
      if (amount > 1000000) {
        // 1,000,000 units max (adjust as needed)
        await trx.rollback();
        throw new ApiError(400, 'Amount exceeds maximum allowed value');
      }

      // Validate provider reference format (alphanumeric, underscore, hyphen)
      if (
        typeof providerReference !== 'string' ||
        !/^[a-zA-Z0-9_-]+$/.test(providerReference)
      ) {
        await trx.rollback();
        throw new ApiError(400, 'Invalid provider reference format');
      }

      // Validate provider VA ID format
      if (
        typeof providerVaId !== 'string' ||
        !/^[a-zA-Z0-9_-]+$/.test(providerVaId)
      ) {
        await trx.rollback();
        throw new ApiError(400, 'Invalid provider VA ID format');
      }

      // Get provider ID
      const providerRecord = await trx('providers')
        .where({ name: provider })
        .first();

      if (!providerRecord) {
        await trx.rollback();
        return {
          success: false,
          message: 'Provider not found in system',
          statusCode: 400,
          data: { webhookEventId: webhookEvent.id },
        };
      }

      // Insert incoming payment with idempotency check
      const [incomingPayment] = await trx('incoming_payments')
        .insert({
          provider_id: providerRecord.id,
          provider_reference: providerReference,
          provider_va_id: providerVaId,
          amount,
          currency,
          raw_payload: payload,
          received_at: receivedAt,
          created_at: new Date(),
        })
        .onConflict(['provider_id', 'provider_reference'])
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

      // Find virtual account mapping using the provider_id we already have
      let virtualAccount = null;
      if (providerRecord) {
        // Find virtual account mapping using provider_id
        virtualAccount = await trx('virtual_accounts')
          .where({
            provider_id: providerRecord.id,
            provider_va_id: providerVaId,
          })
          .orWhere({
            provider_id: providerRecord.id,
            account_number: providerVaId,
          })
          .first();
      }

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
        // Ensure wallet exists using a separate query to handle potential race condition
        const existingWallet = await trx('wallets')
          .where({ user_id: userId })
          .first();

        if (!existingWallet) {
          await trx('wallets').insert({
            user_id: userId,
            balance: 0,
            currency,
            updated_at: new Date(),
          });
        }

        // Get current wallet and update balance atomically
        const currentWallet = await trx('wallets')
          .where({ user_id: userId })
          .forUpdate() // This ensures we lock the row during transaction
          .first();

        if (!currentWallet) {
          await trx.rollback();
          throw new ApiError(500, 'Wallet not found after creation');
        }

        const newBalance = Number(
          (Number(currentWallet.balance) + amount).toFixed(2)
        );

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
