import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create referral_links table
  return knex.schema.createTable('referral_links', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    table.string('referral_code', 50).notNullable().unique();
    table.string('short_code', 10).notNullable();
    table.string('full_link', 500);
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes for fast lookups
    table.index('user_id');
    table.index('referral_code');
    table.index('short_code');
    table.index(['user_id', 'is_active']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('referral_links');
}
