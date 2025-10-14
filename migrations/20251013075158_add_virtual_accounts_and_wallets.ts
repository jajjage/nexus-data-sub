import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create virtual_accounts table
  await knex.schema.createTable('virtual_accounts', table => {
    table.bigIncrements('id').primary();
    table
      .uuid('user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    table.text('provider').notNullable();
    table.text('provider_va_id').notNullable();
    table.text('account_number').notNullable();
    table.text('currency').notNullable().defaultTo('NGN');
    table.text('status').notNullable().defaultTo('active');
    table.jsonb('metadata');
    table
      .timestamp('created_at', { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
    table
      .timestamp('updated_at', { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
    table.unique(['provider', 'provider_va_id']);
    table.unique(['provider', 'account_number']);
    table.index('user_id', 'idx_virtual_accounts_user_id');
    table.index('provider_va_id', 'idx_virtual_accounts_provider_va_id');
  });

  // Create incoming_payments table
  await knex.schema.createTable('incoming_payments', table => {
    table.bigIncrements('id').primary();
    table.text('provider').notNullable();
    table.text('provider_reference').notNullable();
    table.text('provider_va_id').notNullable();
    table
      .bigInteger('virtual_account_id')
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
    table.unique(['provider', 'provider_reference'], 'uniq_provider_reference');
    table.index('provider_va_id', 'idx_incoming_payments_provider_va_id');
    table.index('user_id', 'idx_incoming_payments_user_id');
  });

  // Create wallets table
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

  // Create wallet_transactions table
  await knex.schema.createTable('wallet_transactions', table => {
    table.bigIncrements('id').primary();
    table
      .uuid('user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    table.text('kind').notNullable();
    table.decimal('amount', 14, 2).notNullable();
    table.decimal('balance_after', 18, 2).notNullable();
    table.text('source');
    table.text('reference');
    table.jsonb('metadata');
    table
      .timestamp('created_at', { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
    table.index('user_id', 'idx_wallet_tx_user_id');
  });

  // Create providers table
  await knex.schema.createTable('providers', table => {
    table.bigIncrements('id').primary();
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

  // Create webhook_events table
  await knex.schema.createTable('webhook_events', table => {
    table.bigIncrements('id').primary();
    table.text('provider').notNullable();
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
    table.index('processed', 'idx_webhook_events_processed');
  });

  // Create settlements table
  await knex.schema.createTable('settlements', table => {
    table.bigIncrements('id').primary();
    table.text('provider').notNullable();
    table.date('settlement_date').notNullable();
    table.decimal('amount', 14, 2).notNullable();
    table.decimal('fees', 14, 2).defaultTo(0);
    table.text('reference');
    table.jsonb('raw_report');
    table
      .timestamp('created_at', { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
    table.index(
      ['provider', 'settlement_date'],
      'idx_settlements_provider_date'
    );
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('settlements');
  await knex.schema.dropTableIfExists('webhook_events');
  await knex.schema.dropTableIfExists('providers');
  await knex.schema.dropTableIfExists('wallet_transactions');
  await knex.schema.dropTableIfExists('wallets');
  await knex.schema.dropTableIfExists('incoming_payments');
  await knex.schema.dropTableIfExists('virtual_accounts');
}
