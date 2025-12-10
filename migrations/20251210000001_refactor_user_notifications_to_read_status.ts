import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Add deleted column to user_notifications table
  await knex.schema.table('user_notifications', table => {
    table.boolean('deleted').notNullable().defaultTo(false);
    table.index(['deleted'], 'idx_user_notifications_deleted');
  });

  // Optional: Rename the table conceptually in comments
  // In practice, we keep the table name as-is for compatibility,
  // but logically it now tracks read_status AND deletion status
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.table('user_notifications', table => {
    table.dropIndex('idx_user_notifications_deleted');
    table.dropColumn('deleted');
  });
}
