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
      const name = user.name.split(' ').slice(0, 2).join(' ');
      const bankName = name + 'Test Bank';
      const virtualAccount: VirtualAccountResponse = {
        provider_va_id: uuidv4(),
        account_number: accountNumber,
        currency: 'NGN',
        status: 'active',
        customer_name: bankName,
        customer_reference: `user_${user.id}`,
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
    vaResponse: VirtualAccountResponse
  ): Promise<{ id: number }> {
    const trx = await knex.transaction();

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
          account_number: vaResponse.account_number,
          currency: vaResponse.currency || 'NGN',
          status: vaResponse.status || 'active',
          metadata: vaResponse,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning('id');

      await trx.commit();
      return virtualAccount;
    } catch (error) {
      await trx.rollback();
      throw new ApiError(
        500,
        'Failed to persist virtual account: ' + (error as Error).message
      );
    }
  }

  /**
   * Create and persist a virtual account for a user
   */
  public async createAndPersistVirtualAccount(user: User): Promise<{
    virtualAccountId: number;
    vaDetails: VirtualAccountResponse;
  }> {
    let provider;
    if (process.env.NODE_ENV === 'development') {
      provider = 'TestProvider';
      console.log(
        `Creating virtual account for user ${user.id} (${user.email})`
      );
    } else {
      provider = 'palmpay';
    }

    // Check if user already has a virtual account with this provider
    // First get the provider ID
    const providerRecord = await knex('providers')
      .where({ name: provider })
      .first();

    if (providerRecord) {
      const existing = await knex('virtual_accounts')
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

    // Persist VA details
    const saved = await this.persistVirtualAccount(
      user.id,
      provider,
      vaResponse
    );

    return {
      virtualAccountId: saved.id,
      vaDetails: vaResponse,
    };
  }
}
