import knex from '../database/connection';
import { ApiError } from '../utils/ApiError';

interface TestPaymentResult {
  success: boolean;
  message: string;
  userId?: string;
  newBalance?: number;
  amountCredited?: number;
  statusCode?: number;
}

export class TestWebhookService {
  /**
   * Process a test payment for simulating webhook functionality
   */
  public async processTestPayment(
    userId: string,
    amount: number,
    provider: string = 'test-provider',
    providerVaId: string = 'test-va'
  ): Promise<TestPaymentResult> {
    const trx = await knex.transaction();

    try {
      // Validate amount
      if (typeof amount !== 'number' || amount <= 0 || !isFinite(amount)) {
        await trx.rollback();
        return {
          success: false,
          message: 'Invalid amount provided',
          statusCode: 400,
        };
      }

      // Check if user exists
      const user = await trx('users').where({ id: userId }).first();

      if (!user) {
        await trx.rollback();
        return {
          success: false,
          message: 'User not found',
          statusCode: 404,
        };
      }

      // Get provider ID first - test webhook should fail if provider doesn't exist
      const providerRecord = await trx('providers')
        .where({ name: provider })
        .first();

      if (!providerRecord) {
        await trx.rollback();
        return {
          success: false,
          message: `Provider '${provider}' not found in system`,
          statusCode: 400,
        };
      }

      // Ensure wallet exists
      await trx('wallets')
        .insert({
          user_id: userId,
          balance: 0,
          currency: 'NGN',
          updated_at: new Date(),
        })
        .onConflict('user_id')
        .ignore();

      // Get current wallet and update balance atomically
      const currentWallet = await trx('wallets')
        .where({ user_id: userId })
        .forUpdate() // This ensures we lock the row during transaction
        .first();

      if (!currentWallet) {
        await trx.rollback();
        throw new ApiError(500, 'Wallet not found after creation');
      }

      // Ensure balance is a proper number to prevent JSON parsing issues
      const currentBalance =
        typeof currentWallet.balance === 'string'
          ? parseFloat(currentWallet.balance)
          : Number(currentWallet.balance);

      const newBalance = parseFloat((currentBalance + amount).toFixed(2));

      await trx('wallets').where({ user_id: userId }).update({
        balance: newBalance,
        updated_at: new Date(),
      });

      // Record wallet transaction
      await trx('wallet_transactions').insert({
        user_id: userId,
        kind: 'credit',
        amount: Number(amount),
        balance_after: Number(newBalance),
        source: `${provider}_test`,
        reference: `test_${Date.now()}`,
        metadata: {
          provider_va_id: providerVaId,
          test_webhook: true,
          provider,
        },
        created_at: new Date(),
      });

      // Create a simulated webhook event for logging purposes
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const [webhookEvent] = await trx('webhook_events')
        .insert({
          provider_id: providerRecord.id,
          event_type: 'payment.success',
          event_id: `test_${Date.now()}`,
          payload: {
            user_id: userId,
            amount: amount,
            provider_va_id: providerVaId,
            simulated: true,
          },
          headers: { source: 'test-webhook' },
          signature_ok: true,
          processed: true,
          processed_at: new Date(),
          created_at: new Date(),
        })
        .returning('*');

      await trx.commit();

      return {
        success: true,
        message: 'Test payment processed successfully',
        userId,
        newBalance,
        amountCredited: amount,
      };
    } catch (error) {
      await trx.rollback();
      console.error('Error processing test payment:', error);
      throw new ApiError(
        500,
        'Error processing test payment: ' + (error as Error).message
      );
    }
  }
}
