// migrations/20251028000000_create_offers_system.ts
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1️⃣ OFFERS
  await knex.schema.createTable('offers', t => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.text('code').unique();
    t.text('title').notNullable();
    t.text('description');
    t.text('status')
      .notNullable()
      .checkIn([
        'draft',
        'scheduled',
        'active',
        'paused',
        'expired',
        'cancelled',
      ]);
    t.text('discount_type')
      .notNullable()
      .checkIn(['percentage', 'fixed_amount', 'fixed_price', 'buy_x_get_y']);
    t.decimal('discount_value', 12, 2).notNullable().defaultTo(0);
    t.integer('per_user_limit');
    t.integer('total_usage_limit');
    t.integer('usage_count').notNullable().defaultTo(0);
    t.text('apply_to')
      .notNullable()
      .checkIn(['operator_product', 'supplier_product', 'all']);
    t.boolean('allow_all').notNullable().defaultTo(true);
    t.text('eligibility_logic').notNullable().defaultTo('all'); // 'all' = AND, 'any' = OR
    t.timestamp('starts_at', { useTz: true });
    t.timestamp('ends_at', { useTz: true });
    t.uuid('created_by');
    t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    t.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    t.timestamp('deleted_at', { useTz: true });
  });

  await knex.raw(`
    CREATE INDEX idx_offers_status_window ON offers(status, starts_at, ends_at);
  `);

  // 2️⃣ OFFER_PRODUCTS
  await knex.schema.createTable('offer_products', t => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('offer_id')
      .notNullable()
      .references('id')
      .inTable('offers')
      .onDelete('CASCADE');
    t.uuid('operator_product_id').nullable();
    t.uuid('supplier_product_mapping_id').nullable();
    t.decimal('price_override', 12, 2);
    t.integer('max_quantity_per_purchase');
    t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());

    t.check(
      `(CASE WHEN operator_product_id IS NOT NULL THEN 1 ELSE 0 END) +
       (CASE WHEN supplier_product_mapping_id IS NOT NULL THEN 1 ELSE 0 END) = 1`
    );
  });

  await knex.raw(`
    CREATE INDEX idx_offer_products_offer ON offer_products(offer_id);
    CREATE INDEX idx_offer_products_operator_product ON offer_products(operator_product_id);
    CREATE INDEX idx_offer_products_supplier_mapping ON offer_products(supplier_product_mapping_id);
  `);

  // 3️⃣ OFFER_ALLOWED_USERS
  await knex.schema.createTable('offer_allowed_users', t => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('offer_id')
      .notNullable()
      .references('id')
      .inTable('offers')
      .onDelete('CASCADE');
    t.uuid('user_id').notNullable();
    t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    t.unique(['offer_id', 'user_id']);
  });

  await knex.raw(
    `CREATE INDEX idx_offer_allowed_users_user ON offer_allowed_users(user_id);`
  );

  // 4️⃣ OFFER_ALLOWED_ROLES
  await knex.schema.createTable('offer_allowed_roles', t => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('offer_id')
      .notNullable()
      .references('id')
      .inTable('offers')
      .onDelete('CASCADE');
    t.text('role_name').notNullable();
    t.unique(['offer_id', 'role_name']);
  });

  await knex.raw(
    `CREATE INDEX idx_offer_allowed_roles_role ON offer_allowed_roles(role_name);`
  );

  // 5️⃣ OFFER_REDEMPTIONS
  await knex.schema.createTable('offer_redemptions', t => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('offer_id')
      .notNullable()
      .references('id')
      .inTable('offers')
      .onDelete('RESTRICT');
    t.uuid('user_id').notNullable();
    t.uuid('operator_product_id');
    t.uuid('supplier_product_mapping_id');
    t.uuid('supplier_id');
    t.uuid('order_id');
    t.decimal('price_paid', 12, 2).notNullable();
    t.decimal('discount_amount', 12, 2).notNullable();
    t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());

    t.check(
      `(CASE WHEN operator_product_id IS NOT NULL THEN 1 ELSE 0 END) +
       (CASE WHEN supplier_product_mapping_id IS NOT NULL THEN 1 ELSE 0 END) = 1`
    );
  });

  await knex.raw(`
    CREATE INDEX idx_offer_redemptions_offer ON offer_redemptions(offer_id);
    CREATE INDEX idx_offer_redemptions_user ON offer_redemptions(user_id);
    CREATE INDEX idx_offer_redemptions_offer_user ON offer_redemptions(offer_id, user_id);
  `);

  // 6️⃣ OFFER_ELIGIBILITY_RULES
  await knex.schema.createTable('offer_eligibility_rules', t => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('offer_id')
      .notNullable()
      .references('id')
      .inTable('offers')
      .onDelete('CASCADE');
    t.text('rule_key').notNullable();
    t.text('rule_type').notNullable(); // e.g. 'new_user', 'min_topups', etc.
    t.jsonb('params').notNullable().defaultTo('{}');
    t.text('description');
    t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
  });

  await knex.raw(
    `CREATE INDEX idx_offer_eligibility_offer ON offer_eligibility_rules(offer_id);`
  );

  // 7️⃣ OFFER_SEGMENT_MEMBERS (for precomputed eligible users)
  await knex.schema.createTable('offer_segment_members', t => {
    t.uuid('offer_id')
      .notNullable()
      .references('id')
      .inTable('offers')
      .onDelete('CASCADE');
    t.uuid('user_id').notNullable();
    t.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    t.primary(['offer_id', 'user_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema
    .dropTableIfExists('offer_segment_members')
    .dropTableIfExists('offer_eligibility_rules')
    .dropTableIfExists('offer_redemptions')
    .dropTableIfExists('offer_allowed_roles')
    .dropTableIfExists('offer_allowed_users')
    .dropTableIfExists('offer_products')
    .dropTableIfExists('offers');
}
