import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('messages', table => {
    table.index(['channel_id', 'created_at'], 'idx_messages_channel_created');
  });

  await knex.schema.alterTable('channel_members', table => {
    table.index(['user_id', 'channel_id'], 'idx_channel_members_user');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('messages', table => {
    table.dropIndex(
      ['channel_id', 'created_at'],
      'idx_messages_channel_created'
    );
  });

  await knex.schema.alterTable('channel_members', table => {
    table.dropIndex(['user_id', 'channel_id'], 'idx_channel_members_user');
  });
}
