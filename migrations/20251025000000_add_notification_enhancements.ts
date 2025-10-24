import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('notification_templates', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('template_id').notNullable().unique();
    table.string('title').notNullable();
    table.text('body').notNullable();
    table.jsonb('locales').notNullable().defaultTo('[]');
    table.timestamps(true, true);
  });

  await knex.schema.createTable('user_notification_preferences', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    table.string('category').notNullable();
    table.boolean('subscribed').notNullable().defaultTo(true);
    table.timestamps(true, true);
    table.unique(['user_id', 'category']);
  });

  await knex.schema.createTable('notification_analytics', table => {
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
    table.string('status').notNullable(); // e.g., 'sent', 'delivered', 'opened', 'failed'
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('notification_analytics');
  await knex.schema.dropTableIfExists('user_notification_preferences');
  await knex.schema.dropTableIfExists('notification_templates');
}
