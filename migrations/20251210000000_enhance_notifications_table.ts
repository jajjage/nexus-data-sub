import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Add new columns to notifications table
  await knex.schema.table('notifications', table => {
    table.string('type').notNullable().defaultTo('info'); // 'info' | 'success' | 'warning' | 'error' | 'alert'
    table.string('category'); // e.g., 'marketing', 'security_alerts', 'promotional', 'transactional'
    table.index(['type'], 'idx_notifications_type');
    table.index(['category'], 'idx_notifications_category');
  });

  // Create user_notifications table to track per-user read status
  // This allows a single notification to be marked as read/unread by different users
  await knex.schema.createTable('user_notifications', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('notification_id')
      .notNullable()
      .references('id')
      .inTable('notifications')
      .onDelete('CASCADE');
    table
      .uuid('user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    table.boolean('read').notNullable().defaultTo(false);
    table.timestamp('read_at', { useTz: true }).nullable();
    table
      .timestamp('created_at', { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
    table
      .timestamp('updated_at', { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());

    // Composite unique to prevent duplicates
    table.unique(['notification_id', 'user_id'], {
      indexName: 'idx_unique_user_notification',
    });

    // Indexes for common queries
    table.index(['user_id'], 'idx_user_notifications_user_id');
    table.index(['notification_id'], 'idx_user_notifications_notification_id');
    table.index(['user_id', 'read'], 'idx_user_notifications_user_read');
    table.index(['created_at'], 'idx_user_notifications_created_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('user_notifications');
  await knex.schema.table('notifications', table => {
    table.dropIndex('idx_notifications_category');
    table.dropIndex('idx_notifications_type');
    table.dropColumn('category');
    table.dropColumn('type');
  });
}
