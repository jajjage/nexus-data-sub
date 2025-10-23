import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('channels', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.text('name');
    table.boolean('is_support').notNullable().defaultTo(false);
    table
      .timestamp('created_at', { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('channel_members', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('channel_id')
      .notNullable()
      .references('id')
      .inTable('channels')
      .onDelete('CASCADE');
    table
      .uuid('user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    table.text('role').notNullable().defaultTo('user');
    table
      .timestamp('joined_at', { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
    table.unique(['channel_id', 'user_id']);
  });

  await knex.schema.createTable('messages', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.text('client_msg_id').notNullable();
    table
      .uuid('channel_id')
      .notNullable()
      .references('id')
      .inTable('channels')
      .onDelete('CASCADE');
    table
      .uuid('sender_id')
      .references('id')
      .inTable('users')
      .onDelete('SET NULL');
    table.text('body');
    table.jsonb('attachments').notNullable().defaultTo(knex.raw("'[]'::jsonb"));
    table.jsonb('metadata').notNullable().defaultTo(knex.raw("'{}'::jsonb"));
    table.bigInteger('seq').notNullable().defaultTo(0);
    table.text('status').notNullable().defaultTo('sent');
    table
      .timestamp('created_at', { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
    table.unique(['channel_id', 'client_msg_id']);
    table.index(['channel_id', 'seq'], 'idx_messages_channel_seq');
  });

  await knex.schema.createTable('message_receipts', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('message_id')
      .notNullable()
      .references('id')
      .inTable('messages')
      .onDelete('CASCADE');
    table
      .uuid('user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    table.timestamp('delivered_at', { useTz: true });
    table.timestamp('read_at', { useTz: true });
    table.unique(['message_id', 'user_id']);
  });

  await knex.schema.createTable('notifications', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.text('title').notNullable();
    table.text('body');
    table.jsonb('target').notNullable().defaultTo(knex.raw("'{}'::jsonb"));
    table
      .timestamp('publish_at', { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
    table
      .uuid('created_by')
      .references('id')
      .inTable('users')
      .onDelete('SET NULL');
    table
      .timestamp('created_at', { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
    table.boolean('sent').notNullable().defaultTo(false);
    table.boolean('archived').notNullable().defaultTo(false);
    table.index(['publish_at'], 'idx_notifications_publish_at');
  });

  await knex.schema.createTable('push_tokens', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    table.text('platform');
    table.text('token').notNullable();
    table
      .timestamp('last_seen', { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
    table.unique(['user_id', 'platform', 'token']);
  });

  // platform check constraint
  await knex.raw(
    "ALTER TABLE push_tokens ADD CONSTRAINT chk_push_tokens_platform CHECK (platform IN ('ios','android','web'));"
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(
    'ALTER TABLE IF EXISTS push_tokens DROP CONSTRAINT IF EXISTS chk_push_tokens_platform;'
  );
  await knex.schema.dropTableIfExists('push_tokens');
  await knex.schema.dropTableIfExists('notifications');
  await knex.schema.dropTableIfExists('message_receipts');
  await knex.schema.dropTableIfExists('messages');
  await knex.schema.dropTableIfExists('channel_members');
  await knex.schema.dropTableIfExists('channels');
}
