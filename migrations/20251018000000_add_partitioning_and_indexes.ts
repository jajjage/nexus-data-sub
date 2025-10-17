import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. Create the partitioning function for topup_requests
  await knex.raw(`
    CREATE OR REPLACE FUNCTION create_monthly_partition_for_topup_requests(p_year INT, p_month INT)
    RETURNS VOID AS $$
    DECLARE
      start_ts TIMESTAMPTZ := make_timestamptz(p_year, p_month, 1, 0,0,0, 'UTC');
      end_ts TIMESTAMPTZ := (start_ts + INTERVAL '1 month');
      partition_name TEXT := format('topup_requests_%s_%s', p_year, lpad(p_month::text,2,'0'));
      sql TEXT;
    BEGIN
      sql := format('CREATE TABLE IF NOT EXISTS %I PARTITION OF topup_requests FOR VALUES FROM (%L) TO (%L);',
                    partition_name, start_ts, end_ts);
      EXECUTE sql;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // 2. Create indexes for various tables
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_topup_requests_status ON topup_requests (status);
    CREATE INDEX IF NOT EXISTS idx_topup_requests_user ON topup_requests (user_id);
    CREATE INDEX IF NOT EXISTS idx_topup_requests_external_id ON topup_requests (external_id);
    CREATE INDEX IF NOT EXISTS idx_topup_requests_idempotency_key ON topup_requests (idempotency_key);

    CREATE INDEX IF NOT EXISTS idx_transactions_wallet_created ON transactions (wallet_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions (created_at);

    CREATE INDEX IF NOT EXISTS idx_epins_status ON epins_inventory (status);
    CREATE INDEX IF NOT EXISTS idx_supplier_product_map_supplier ON supplier_product_mapping (supplier_id);
    CREATE INDEX IF NOT EXISTS idx_operator_products_operator ON operator_products (operator_id);
  `);

  // 3. Add the unique constraint to topup_requests
  await knex.raw(`
    ALTER TABLE topup_requests
      ADD CONSTRAINT uq_topup_idempotency_user UNIQUE (user_id, idempotency_key)
      DEFERRABLE INITIALLY IMMEDIATE;
  `);
}

export async function down(knex: Knex): Promise<void> {
  // Drop the unique constraint
  await knex.raw(`
    ALTER TABLE topup_requests
      DROP CONSTRAINT IF EXISTS uq_topup_idempotency_user;
  `);

  // Drop the indexes
  await knex.raw(`
    DROP INDEX IF EXISTS idx_topup_requests_status;
    DROP INDEX IF EXISTS idx_topup_requests_user;
    DROP INDEX IF EXISTS idx_topup_requests_external_id;
    DROP INDEX IF EXISTS idx_topup_requests_idempotency_key;

    DROP INDEX IF EXISTS idx_transactions_wallet_created;
    DROP INDEX IF EXISTS idx_transactions_created;

    DROP INDEX IF EXISTS idx_epins_status;
    DROP INDEX IF EXISTS idx_supplier_product_map_supplier;
    DROP INDEX IF EXISTS idx_operator_products_operator;
  `);

  // Drop the partitioning function
  await knex.raw(`
    DROP FUNCTION IF EXISTS create_monthly_partition_for_topup_requests(p_year INT, p_month INT);
  `);
}
