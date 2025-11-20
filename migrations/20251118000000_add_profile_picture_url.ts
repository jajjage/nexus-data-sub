import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.table('users', table => {
    table
      .string('profile_picture_url', 500)
      .nullable()
      .comment('URL to user profile picture');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.table('users', table => {
    table.dropColumn('profile_picture_url');
  });
}
