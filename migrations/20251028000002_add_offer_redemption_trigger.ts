// migrations/20251028000002_add_offer_redemption_trigger.ts
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    CREATE OR REPLACE FUNCTION check_offer_eligibility_before_redemption()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    AS $$
    DECLARE
      eligible BOOLEAN;
      offer_record RECORD;
      user_redemptions INTEGER;
    BEGIN
      -- Ensure offer exists and is active
      SELECT * INTO offer_record
      FROM offers
      WHERE id = NEW.offer_id
        AND status = 'active'
        AND (starts_at IS NULL OR now() >= starts_at)
        AND (ends_at IS NULL OR now() <= ends_at);

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Offer % is not active or not in valid time window', NEW.offer_id;
      END IF;

      -- Check user eligibility (using function we created earlier)
      SELECT is_user_eligible_for_offer(NEW.offer_id, NEW.user_id)
      INTO eligible;

      IF NOT eligible THEN
        RAISE EXCEPTION 'User % is not eligible for offer %', NEW.user_id, NEW.offer_id;
      END IF;

      -- Enforce per-user limit
      IF offer_record.per_user_limit IS NOT NULL THEN
        SELECT COUNT(*) INTO user_redemptions
        FROM offer_redemptions
        WHERE offer_id = NEW.offer_id AND user_id = NEW.user_id;

        IF user_redemptions >= offer_record.per_user_limit THEN
          RAISE EXCEPTION 'Per-user redemption limit exceeded for offer %', NEW.offer_id;
        END IF;
      END IF;

      -- Enforce global usage limit atomically
      IF offer_record.total_usage_limit IS NOT NULL THEN
        IF offer_record.usage_count >= offer_record.total_usage_limit THEN
          RAISE EXCEPTION 'Offer % total usage limit reached', NEW.offer_id;
        END IF;

        UPDATE offers
        SET usage_count = usage_count + 1
        WHERE id = NEW.offer_id
          AND usage_count < offer_record.total_usage_limit;

        IF NOT FOUND THEN
          RAISE EXCEPTION 'Concurrent redemption limit reached for offer %', NEW.offer_id;
        END IF;
      ELSE
        -- If no total limit, still increment usage_count
        UPDATE offers SET usage_count = usage_count + 1 WHERE id = NEW.offer_id;
      END IF;

      RETURN NEW;
    END;
    $$;
  `);

  await knex.raw(`
    CREATE TRIGGER enforce_offer_eligibility_before_insert
    BEFORE INSERT ON offer_redemptions
    FOR EACH ROW
    EXECUTE FUNCTION check_offer_eligibility_before_redemption();
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(
    'DROP TRIGGER IF EXISTS enforce_offer_eligibility_before_insert ON offer_redemptions;'
  );
  await knex.raw(
    'DROP FUNCTION IF EXISTS check_offer_eligibility_before_redemption();'
  );
}
