import { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';
import knex from '../database/connection';
import { ApiError } from '../utils/ApiError';

interface User {
  id: string;
  name: string;
  email: string;
}

interface VirtualAccountResponse {
  id?: string;
  provider_va_id?: string;
  tx_ref: string;
  account_number: string;
  currency?: string;
  status?: string;
  [key: string]: any;
}

export class VirtualAccountService {
  /**
   * Create a virtual account locally without calling PalmPay
   */
  public async createVirtualAccount(
    user: User
  ): Promise<VirtualAccountResponse> {
    try {
      // Generate a random 10-digit account number
      const accountNumber = Math.floor(
        1000000000 + Math.random() * 9000000000
      ).toString();
      const customer_reference = `user_${user.id}`;
      const name = user.name.split(' ')[0];
      const bankName = `${name}-TestBank`;
      const virtualAccount: VirtualAccountResponse = {
        provider_va_id: uuidv4(),
        account_number: accountNumber,
        tx_ref: customer_reference,
        currency: 'NGN',
        status: 'active',
        customer_name: bankName,
      };

      return Promise.resolve(virtualAccount);
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new ApiError(
          500,
          'Virtual account creation failed: ' + error.message
        );
      }
      throw new ApiError(500, 'Virtual account creation failed');
    }
  }

  /**
   * Persist virtual account details to database
   */
  public async persistVirtualAccount(
    userId: string,
    providerName: string,
    vaResponse: VirtualAccountResponse,
    trxProvided?: Knex.Transaction
  ): Promise<{ id: number }> {
    const localTrx = trxProvided;
    const shouldCommit = !localTrx;
    const trx = localTrx ?? (await knex.transaction());

    try {
      // Get or create provider record
      let provider = await trx('providers')
        .where({ name: providerName })
        .first();

      if (!provider) {
        [provider] = await trx('providers')
          .insert({
            name: providerName,
            is_active: true,
            created_at: new Date(),
          })
          .returning('*');
      }

      const [virtualAccount] = await trx('virtual_accounts')
        .insert({
          user_id: userId,
          provider_id: provider.id,
          provider_va_id: vaResponse.id || vaResponse.provider_va_id,
          tx_ref: vaResponse.tx_ref || '',
          account_number: vaResponse.account_number,
          currency: vaResponse.currency || 'NGN',
          status: vaResponse.status || 'active',
          metadata: vaResponse,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning('id');

      if (shouldCommit) await trx.commit();
      return virtualAccount;
    } catch (error) {
      if (shouldCommit) await trx.rollback();
      throw new ApiError(
        500,
        'Failed to persist virtual account: ' + (error as Error).message
      );
    }
  }

  /**
   * Create and persist a virtual account for a user
   */
  public async createAndPersistVirtualAccount(
    user: User,
    trx: Knex.Transaction
  ): Promise<{
    virtualAccountId: number;
    vaDetails: VirtualAccountResponse;
  }> {
    let provider;
    if (process.env.NODE_ENV === 'development') {
      provider = 'TestProvider';
      // eslint-disable-next-line no-console
      console.log(
        `Creating virtual account for user ${user.id} (${user.email})`
      );
    } else {
      provider = 'palmpay';
    }

    // Check if user already has a virtual account with this provider
    // First get the provider ID
    const providerRecord = await trx('providers')
      .where({ name: provider })
      .first();

    if (providerRecord) {
      const existing = await trx('virtual_accounts')
        .where({ user_id: user.id, provider_id: providerRecord.id })
        .first();

      if (existing) {
        throw new ApiError(
          400,
          'User already has a virtual account with this provider'
        );
      }
    }

    // Create VA with provider
    const vaResponse = await this.createVirtualAccount(user);

    // Persist VA details using optional transaction if provided
    const saved = await this.persistVirtualAccount(
      user.id,
      provider,
      vaResponse,
      trx
    );

    // Create a wallet for the user if one does not already exist
    const walletExists = await trx('wallets')
      .where({ user_id: user.id })
      .first();

    if (!walletExists) {
      await trx('wallets').insert({
        user_id: user.id,
        balance: 0,
        currency: 'NGN',
      });
    }

    return {
      virtualAccountId: saved.id,
      vaDetails: vaResponse,
    };
  }
}
