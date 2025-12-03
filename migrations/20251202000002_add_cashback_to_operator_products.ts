import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.table('operator_products', table => {
    table
      .boolean('has_cashback')
      .defaultTo(false)
      .after('slug')
      .comment('Indicates if this product offers cashback rewards');
    table
      .decimal('cashback_percentage', 5, 2)
      .defaultTo(0)
      .after('has_cashback')
      .comment('Cashback percentage for this product (e.g., 5 for 5%)');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.table('operator_products', table => {
    table.dropColumn('cashback_percentage');
    table.dropColumn('has_cashback');
  });
}
