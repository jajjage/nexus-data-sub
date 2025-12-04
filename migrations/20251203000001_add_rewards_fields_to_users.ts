import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', table => {
    table.integer('total_points').defaultTo(0);
    table.integer('referral_count').defaultTo(0);
    table.index(['total_points']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', table => {
    table.dropIndex(['total_points']);
    table.dropColumn('total_points');
    table.dropColumn('referral_count');
  });
}
