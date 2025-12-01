import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Enable pgcrypto extension for gen_random_uuid()
  await knex.raw('CREATE EXTENSION IF NOT EXISTS pgcrypto;');

  // Create operators table (MTN, AIRTEL, GLO, 9MOBILE)
  await knex.schema.createTable('operators', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('code', 32).notNullable().unique(); // e.g. 'MTN', 'AIRTEL'
    table.text('name').notNullable();
    table.string('iso_country', 2).defaultTo('NG');
    table.string('logo_url', 250);
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
  });

  // Create suppliers table (aggregators/gateways)
  await knex.schema.createTable('suppliers', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.text('name').notNullable();
    table.string('slug', 64).unique();
    table.text('api_base');
    table.text('api_key'); // store encrypted in vault in prod
    table.integer('priority_int').defaultTo(100);
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
  });

  // Create operator_products table (bundles, airtime denom, epin, etc.)
  await knex.schema.createTable('operator_products', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('operator_id')
      .notNullable()
      .references('id')
      .inTable('operators')
      .onDelete('RESTRICT');
    table.string('product_code', 128).notNullable(); // canonical product code e.g. 'MTN-DATA-1GB'
    table.text('name').notNullable();
    table.string('product_type', 32).notNullable(); // 'airtime','data','combo','epin'
    table.decimal('denom_amount', 12, 2).nullable(); // price/face value
    table.integer('data_mb').nullable();
    table.integer('validity_days').nullable();
    table.string('slug', 64).nullable();
    table.boolean('is_active').defaultTo(true);
    table.jsonb('metadata').defaultTo('{}');
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    table.unique(['operator_id', 'product_code']);
  });

  // Create supplier_product_mapping table: supplier-specific product code and price
  await knex.schema.createTable('supplier_product_mapping', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('supplier_id')
      .notNullable()
      .references('id')
      .inTable('suppliers')
      .onDelete('CASCADE');
    table
      .uuid('operator_product_id')
      .notNullable()
      .references('id')
      .inTable('operator_products')
      .onDelete('CASCADE');
    table.string('supplier_product_code', 256);
    table.decimal('supplier_price', 12, 2).notNullable();
    table.decimal('min_order_amount', 12, 2).defaultTo(0);
    table.decimal('max_order_amount', 12, 2).defaultTo(0);
    table.integer('lead_time_seconds').defaultTo(30);
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    table.unique(['supplier_id', 'operator_product_id']);
  });

  // Create transactions table (ledger) - partitioned by created_at(monthly)
  // Note: For now, creating without partitioning since Knex doesn't handle partitioning directly
  await knex.schema.createTable('transactions', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('wallet_id')
      .notNullable()
      .references('user_id')
      .inTable('wallets')
      .onDelete('CASCADE');
    table
      .uuid('user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    table.string('direction', 8).notNullable(); // 'debit' or 'credit'
    table.decimal('amount', 18, 4).notNullable();
    table.decimal('balance_after', 18, 2).notNullable();
    table.string('method', 64).notNullable();
    table.string('reference', 128);
    table.string('related_type', 64); // 'topup_request','settlement','commission'
    table.uuid('related_id');
    table.jsonb('metadata');
    table.text('note');
    table
      .timestamp('created_at', { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
  });

  // Add check constraint for direction column
  await knex.raw(
    "ALTER TABLE transactions ADD CONSTRAINT chk_direction CHECK (direction IN ('debit', 'credit'));"
  );

  // Create topup_requests table (business operations) - partitioned by created_at (monthly)
  // Note: For now, creating without partitioning since Knex doesn't handle partitioning directly
  await knex.schema.createTable('topup_requests', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('external_id').defaultTo(knex.raw('gen_random_uuid()')); // public/idempotency reference
    table
      .uuid('user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('RESTRICT');
    table.string('recipient_phone', 32).notNullable();
    table
      .uuid('operator_id')
      .notNullable()
      .references('id')
      .inTable('operators')
      .onDelete('RESTRICT');
    table
      .uuid('operator_product_id')
      .references('id')
      .inTable('operator_products');
    table.uuid('supplier_id').references('id').inTable('suppliers');
    table
      .uuid('supplier_mapping_id')
      .references('id')
      .inTable('supplier_product_mapping');
    table.decimal('amount', 12, 2).notNullable(); // charged to customer
    table.decimal('cost', 12, 2).nullable(); // supplier cost when known
    table.string('status', 32).notNullable().defaultTo('pending'); // pending|success|failed|reversed|retry
    table.string('type', 32).notNullable().defaultTo('data'); // data|airtime
    table.integer('attempt_count').defaultTo(0);
    table.string('idempotency_key', 128);
    table.jsonb('request_payload').defaultTo('{}');
    table
      .timestamp('created_at', { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
    table
      .timestamp('updated_at', { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
  });

  // Create topup_responses table: supplier callbacks / responses
  await knex.schema.createTable('topup_responses', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('topup_request_id')
      .notNullable()
      .references('id')
      .inTable('topup_requests')
      .onDelete('CASCADE');
    table.uuid('supplier_id');
    table.string('response_code', 64);
    table.text('response_message');
    table.jsonb('response_payload').defaultTo('{}');
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
  });

  // Create epins_inventory table (encrypt pin_code at rest)
  await knex.schema.createTable('epins_inventory', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('operator_id')
      .notNullable()
      .references('id')
      .inTable('operators')
      .onDelete('RESTRICT');
    table.uuid('supplier_id').references('id').inTable('suppliers');
    table.specificType('pin_code', 'BYTEA').notNullable(); // store encrypted bytes
    table.text('serial_number');
    table.decimal('denomination', 12, 2);
    table.string('status', 32).defaultTo('available'); // available|allocated|sold|expired
    table
      .uuid('allocated_to_topup_id')
      .references('id')
      .inTable('topup_requests');
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
  });

  // Create commissions table (per agent / product)
  await knex.schema.createTable('commissions', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('agent_id').references('id').inTable('users');
    table
      .uuid('operator_product_id')
      .references('id')
      .inTable('operator_products');
    table.decimal('rate_percent', 6, 4).defaultTo(0);
    table.decimal('fixed_amount', 12, 2).defaultTo(0);
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  // Drop in reverse dependency order to respect foreign key constraints
  await knex.schema.dropTableIfExists('commissions');
  await knex.schema.dropTableIfExists('epins_inventory');
  await knex.schema.dropTableIfExists('topup_responses');
  await knex.schema.dropTableIfExists('topup_requests');
  await knex.schema.dropTableIfExists('transactions');
  await knex.schema.dropTableIfExists('supplier_product_mapping');
  await knex.schema.dropTableIfExists('operator_products');
  await knex.schema.dropTableIfExists('suppliers');
  await knex.schema.dropTableIfExists('operators');
}
