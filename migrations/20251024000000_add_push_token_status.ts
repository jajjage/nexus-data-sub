import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Add status column to push_tokens table
  await knex.schema.alterTable('push_tokens', table => {
    table
      .enum('status', ['active', 'invalid', 'unregistered'])
      .notNullable()
      .defaultTo('active');
    table.timestamp('last_failure', { useTz: true });
    table.text('failure_reason');
  });

  // Create index on status for faster queries
  await knex.raw('CREATE INDEX idx_push_tokens_status ON push_tokens (status)');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('push_tokens', table => {
    table.dropColumn('status');
    table.dropColumn('last_failure');
    table.dropColumn('failure_reason');
  });

  await knex.raw('DROP INDEX IF EXISTS idx_push_tokens_status');
}
