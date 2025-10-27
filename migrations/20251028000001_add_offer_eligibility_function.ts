// migrations/20251028000001_add_offer_eligibility_function.ts
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    CREATE OR REPLACE FUNCTION is_user_eligible_for_offer(p_offer uuid, p_user uuid)
    RETURNS boolean
    LANGUAGE plpgsql
    AS $$
    DECLARE
      r RECORD;
      logic TEXT;
      pass BOOLEAN;
      result BOOLEAN;
    BEGIN
      -- If no rules exist for this offer, user is eligible
      IF NOT EXISTS (SELECT 1 FROM offer_eligibility_rules WHERE offer_id = p_offer) THEN
        RETURN TRUE;
      END IF;

      SELECT eligibility_logic INTO logic FROM offers WHERE id = p_offer;
      IF logic IS NULL THEN logic := 'all'; END IF;

      IF logic = 'all' THEN
        result := TRUE;
      ELSE
        result := FALSE;
      END IF;

      FOR r IN SELECT * FROM offer_eligibility_rules WHERE offer_id = p_offer ORDER BY created_at
      LOOP
        pass := FALSE;

        -- 🧩 NEW USER RULE
        IF r.rule_type = 'new_user' THEN
          IF (r.params ->> 'account_age_days') IS NULL THEN
            RAISE EXCEPTION 'new_user rule requires account_age_days param';
          END IF;

          SELECT (now() - u.created_at) <= ((r.params ->> 'account_age_days')::int * interval '1 day')
          INTO pass
          FROM users u WHERE u.id = p_user;

        -- 🧩 MIN TOPUPS RULE
        ELSIF r.rule_type = 'min_topups' THEN
          IF (r.params ->> 'count') IS NULL THEN
            RAISE EXCEPTION 'min_topups rule requires count param';
          END IF;

          IF (r.params ->> 'window_days') IS NULL THEN
            SELECT COUNT(*) >= (r.params ->> 'count')::int
            INTO pass
            FROM topup_requests t
            WHERE t.user_id = p_user;
          ELSE
            SELECT COUNT(*) >= (r.params ->> 'count')::int
            INTO pass
            FROM topup_requests t
            WHERE t.user_id = p_user
              AND t.created_at >= now() - ((r.params ->> 'window_days')::int * interval '1 day');
          END IF;

        -- 🧩 MIN TRANSACTIONS RULE
        ELSIF r.rule_type = 'min_transactions' THEN
          IF (r.params ->> 'count') IS NULL THEN
            RAISE EXCEPTION 'min_transactions rule requires count param';
          END IF;

          SELECT COUNT(*) >= (r.params ->> 'count')::int
          INTO pass
          FROM transactions tx
          WHERE tx.user_id = p_user;

        -- 🧩 MIN SPENT RULE
        ELSIF r.rule_type = 'min_spent' THEN
          IF (r.params ->> 'amount') IS NULL THEN
            RAISE EXCEPTION 'min_spent rule requires amount param';
          END IF;

          IF (r.params ->> 'window_days') IS NULL THEN
            SELECT COALESCE(SUM(tx.amount), 0) >= (r.params ->> 'amount')::numeric
            INTO pass
            FROM transactions tx
            WHERE tx.user_id = p_user;
          ELSE
            SELECT COALESCE(SUM(tx.amount), 0) >= (r.params ->> 'amount')::numeric
            INTO pass
            FROM transactions tx
            WHERE tx.user_id = p_user
              AND tx.created_at >= now() - ((r.params ->> 'window_days')::int * interval '1 day');
          END IF;

        -- 🧩 OPERATOR TOPUP COUNT RULE
        ELSIF r.rule_type = 'operator_topup_count' THEN
          IF (r.params ->> 'operator_id') IS NULL OR (r.params ->> 'count') IS NULL THEN
            RAISE EXCEPTION 'operator_topup_count rule requires operator_id and count params';
          END IF;

          SELECT COUNT(*) >= (r.params ->> 'count')::int
          INTO pass
          FROM topup_requests t
          JOIN operator_products op ON t.operator_product_id = op.id
          WHERE t.user_id = p_user
            AND op.operator_id = (r.params ->> 'operator_id')::uuid
            AND (
              (r.params ->> 'window_days') IS NULL OR
              t.created_at >= now() - ((r.params ->> 'window_days')::int * interval '1 day')
            );

        -- 🧩 OPERATOR SPENT RULE
        ELSIF r.rule_type = 'operator_spent' THEN
          IF (r.params ->> 'operator_id') IS NULL OR (r.params ->> 'amount') IS NULL THEN
            RAISE EXCEPTION 'operator_spent rule requires operator_id and amount params';
          END IF;

          SELECT COALESCE(SUM(tx.amount), 0) >= (r.params ->> 'amount')::numeric
          INTO pass
          FROM transactions tx
          JOIN operator_products op ON tx.operator_product_id = op.id
          WHERE tx.user_id = p_user
            AND op.operator_id = (r.params ->> 'operator_id')::uuid
            AND (
              (r.params ->> 'window_days') IS NULL OR
              tx.created_at >= now() - ((r.params ->> 'window_days')::int * interval '1 day')
            );

        -- 🧩 LAST ACTIVE WITHIN RULE
        ELSIF r.rule_type = 'last_active_within' THEN
          IF (r.params ->> 'days') IS NULL THEN
            RAISE EXCEPTION 'last_active_within rule requires days param';
          END IF;

          SELECT (u.updated_at >= now() - ((r.params ->> 'days')::int * interval '1 day'))
          INTO pass
          FROM users u WHERE u.id = p_user;

        -- 🧩 ACTIVE DAYS RULE
        ELSIF r.rule_type = 'active_days' THEN
          IF (r.params ->> 'days') IS NULL OR (r.params ->> 'min_active_days') IS NULL THEN
            RAISE EXCEPTION 'active_days rule requires days and min_active_days params';
          END IF;

          SELECT COUNT(DISTINCT DATE_TRUNC('day', a.created_at)) >= (r.params ->> 'min_active_days')::int
          INTO pass
          FROM transactions a
          WHERE a.user_id = p_user
            AND a.created_at >= now() - ((r.params ->> 'days')::int * interval '1 day');

        ELSE
          RAISE EXCEPTION 'Unknown rule_type: %', r.rule_type;
        END IF;

        -- Combine rule results according to logic
        IF logic = 'all' AND NOT pass THEN
          RETURN FALSE;
        ELSIF logic = 'any' AND pass THEN
          RETURN TRUE;
        END IF;
      END LOOP;

      -- Final outcome based on logic type
      IF logic = 'all' THEN
        RETURN TRUE;
      ELSE
        RETURN FALSE;
      END IF;
    END;
    $$;
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(
    'DROP FUNCTION IF EXISTS is_user_eligible_for_offer(uuid, uuid)'
  );
}
