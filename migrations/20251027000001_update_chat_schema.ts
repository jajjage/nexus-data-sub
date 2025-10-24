import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Add temp_status column and copy data
  await knex.schema.alterTable('messages', table => {
    table.string('temp_status', 20);
  });

  // Copy existing status data to temp column
  await knex.raw(`
    UPDATE messages
    SET temp_status = status::varchar(20)
  `);

  // Drop old status and rename temp
  await knex.schema.alterTable('messages', table => {
    table.dropColumn('status');
  });

  await knex.schema.alterTable('messages', table => {
    table.renameColumn('temp_status', 'status');
  });

  // Add constraints to new status column
  await knex.schema.alterTable('messages', table => {
    table.string('status', 20).notNullable().defaultTo('sent').alter();
  });

  // Add indices on message_receipts for better query performance
  await knex.schema.alterTable('message_receipts', table => {
    table.index(['delivered_at'], 'idx_message_receipts_delivered_at');
    table.index(['read_at'], 'idx_message_receipts_read_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  // Remove indices
  await knex.schema.alterTable('message_receipts', table => {
    table.dropIndex([], 'idx_message_receipts_delivered_at');
    table.dropIndex([], 'idx_message_receipts_read_at');
  });

  // Convert status back to text - similar process as up migration
  await knex.schema.alterTable('messages', table => {
    table.text('temp_status');
  });

  await knex.raw(`
    UPDATE messages
    SET temp_status = status::text
  `);

  await knex.schema.alterTable('messages', table => {
    table.dropColumn('status');
  });

  await knex.schema.alterTable('messages', table => {
    table.renameColumn('temp_status', 'status');
  });

  await knex.schema.alterTable('messages', table => {
    table.text('status').notNullable().defaultTo('sent').alter();
  });
}
