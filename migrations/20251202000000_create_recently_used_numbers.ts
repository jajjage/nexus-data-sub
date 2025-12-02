import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('recently_used_numbers', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    table.string('phone_number', 20).notNullable();
    table.string('operator_code', 50); // Optional: store which operator this number belongs to
    table.integer('usage_count').defaultTo(1); // Track how many times this number was used
    table.timestamp('last_used_at').defaultTo(knex.fn.now()); // Track last usage
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Composite unique constraint: user can only have one entry per phone number
    table.unique(['user_id', 'phone_number']);

    // Index for faster queries
    table.index(['user_id']);
    table.index(['user_id', 'last_used_at']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('recently_used_numbers');
}
