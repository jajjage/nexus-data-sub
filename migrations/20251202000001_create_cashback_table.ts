import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('cashback', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    table.decimal('available_balance', 15, 2).defaultTo(0); // Available cashback balance
    table.decimal('total_earned', 15, 2).defaultTo(0); // Total cashback earned
    table.decimal('total_redeemed', 15, 2).defaultTo(0); // Total cashback redeemed
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Unique constraint: one cashback record per user
    table.unique(['user_id']);
    table.index(['user_id']);
  });

  // Create cashback transactions table to track all cashback movements
  await knex.schema.createTable('cashback_transactions', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    table.enum('type', ['earned', 'redeemed', 'adjustment']).notNullable();
    table.decimal('amount', 15, 2).notNullable();
    table.string('description', 255); // e.g., "5% cashback on MTN 1GB Data purchase"
    table
      .uuid('topup_request_id')
      .nullable()
      .references('id')
      .inTable('topup_requests')
      .onDelete('SET NULL');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Indexes for fast queries
    table.index(['user_id']);
    table.index(['topup_request_id']);
    table.index(['created_at']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('cashback_transactions');
  await knex.schema.dropTableIfExists('cashback');
}
