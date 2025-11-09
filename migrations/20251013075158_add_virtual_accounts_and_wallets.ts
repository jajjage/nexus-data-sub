import { Knex } from 'knex';

/**
 * Migration: create providers, virtual_accounts, incoming_payments,
 * wallets, wallet_transactions, webhook_events, settlements
 *
 * Notes:
 * - provider_id is a FK -> providers.id (bigint)
 * - virtual_accounts.provider_id and incoming_payments.provider_id are NOT NULL
 * - unique constraints that previously included text provider now use provider_id
 * - If you're migrating an existing DB you must first backfill provider rows
 *   and provider_id values in a separate migration that maps provider text -> providers.id.
 */

export async function up(knex: Knex): Promise<void> {
  // Create providers first
  await knex.schema.createTable('providers', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.text('name').notNullable().unique();
    table.text('api_base');
    table.text('webhook_secret');
    table.boolean('is_active').notNullable().defaultTo(true);
    table.jsonb('config');
    table
      .timestamp('created_at', { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
  });

  // Wallets (depends only on users)
  await knex.schema.createTable('wallets', table => {
    table
      .uuid('user_id')
      .primary()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    table.decimal('balance', 18, 2).notNullable().defaultTo(0);
    table.text('currency').notNullable().defaultTo('NGN');
    table
      .timestamp('updated_at', { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
  });

  // Virtual accounts
  await knex.schema.createTable('virtual_accounts', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    table
      .uuid('user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');

    table
      .uuid('provider_id')
      .notNullable()
      .references('id')
      .inTable('providers')
      .onDelete('RESTRICT');

    table.text('provider_va_id').notNullable();
    table.text('account_number').notNullable();
    table.text('currency').notNullable().defaultTo('NGN');
    table.text('status').notNullable().defaultTo('active');

    // NEW: Store the tx_ref returned by provider for static VAs
    table.text('tx_ref').nullable(); // null for dynamic VAs, populated for static VAs
    table.boolean('is_static').defaultTo(false); // Track if this is static or dynamic

    table.jsonb('metadata');
    table
      .timestamp('created_at', { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
    table
      .timestamp('updated_at', { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());

    table.unique(
      ['provider_id', 'provider_va_id'],
      'uniq_providerid_providervaid'
    );
    table.unique(
      ['provider_id', 'account_number'],
      'uniq_providerid_accountnumber'
    );
    table.index('tx_ref', 'idx_virtual_accounts_tx_ref'); // Index for quick lookup

    table.index('user_id', 'idx_virtual_accounts_user_id');
    table.index('provider_va_id', 'idx_virtual_accounts_provider_va_id');
    table.index('provider_id', 'idx_virtual_accounts_provider_id');
  });

  // Incoming payments
  await knex.schema.createTable('incoming_payments', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // provider FK
    table
      .uuid('provider_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('providers')
      .onDelete('RESTRICT');

    table.text('provider_reference').notNullable();
    table.text('provider_va_id').notNullable();

    table
      .uuid('virtual_account_id')
      .unsigned()
      .references('id')
      .inTable('virtual_accounts')
      .onDelete('SET NULL');

    table
      .uuid('user_id')
      .references('id')
      .inTable('users')
      .onDelete('SET NULL');

    table.decimal('amount', 14, 2).notNullable();
    table.text('currency').notNullable().defaultTo('NGN');
    table.text('status').notNullable().defaultTo('received');
    table.jsonb('raw_payload');
    table.timestamp('received_at', { useTz: true });
    table
      .timestamp('created_at', { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    table.unique(
      ['provider_id', 'provider_reference'],
      'uniq_incoming_provider_reference'
    );
    table.index('provider_va_id', 'idx_incoming_payments_provider_va_id');
    table.index('user_id', 'idx_incoming_payments_user_id');
    table.index('provider_id', 'idx_incoming_payments_provider_id');
  });

  // Webhook events (preserve event storage; provider_id FK)
  await knex.schema.createTable('webhook_events', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    table
      .uuid('provider_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('providers')
      .onDelete('RESTRICT');

    table.text('event_type');
    table.text('event_id');
    table.jsonb('payload').notNullable();
    table.jsonb('headers');
    table.boolean('signature_ok');
    table.boolean('processed').defaultTo(false);
    table.timestamp('processed_at', { useTz: true });
    table
      .timestamp('created_at', { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    table.index('processed', 'idx_webhook_events_processed');
    table.index('provider_id', 'idx_webhook_events_provider_id');
  });

  // Settlements
  await knex.schema.createTable('settlements', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    table
      .uuid('provider_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('providers')
      .onDelete('RESTRICT');

    table.date('settlement_date').notNullable();
    table.decimal('amount', 14, 2).notNullable();
    table.decimal('fees', 14, 2).defaultTo(0);
    table.text('reference');
    table.jsonb('raw_report');
    table
      .timestamp('created_at', { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    table.index(
      ['provider_id', 'settlement_date'],
      'idx_settlements_providerid_date'
    );
  });
}

export async function down(knex: Knex): Promise<void> {
  // Drop in reverse dependency order
  await knex.schema.dropTableIfExists('settlements');
  await knex.schema.dropTableIfExists('webhook_events');
  await knex.schema.dropTableIfExists('incoming_payments');
  await knex.schema.dropTableIfExists('virtual_accounts');

  await knex.schema.dropTableIfExists('wallets');
  await knex.schema.dropTableIfExists('providers');
}
