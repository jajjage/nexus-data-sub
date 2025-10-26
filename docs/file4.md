Excellent ✅ — here’s the **PostgreSQL trigger** that automatically enforces eligibility at the database level.

Once you add this trigger, even if a buggy app or direct SQL tries to insert into `offer_redemptions`, the DB will block the redemption **unless the user is eligible** according to your `offer_eligibility_rules`.

---

## 📄 `offer_redemption_trigger.sql`

```sql
-- =========================================================
-- Trigger: enforce_offer_eligibility_before_insert
-- Purpose : Prevents ineligible users from redeeming offers
-- Author  : Mustapha Ibrahim (Offers System)
-- =========================================================

-- 🧩 Function: check_offer_eligibility_before_redemption
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

-- 🧩 Trigger: attach to offer_redemptions table
DROP TRIGGER IF EXISTS enforce_offer_eligibility_before_insert ON offer_redemptions;

CREATE TRIGGER enforce_offer_eligibility_before_insert
BEFORE INSERT ON offer_redemptions
FOR EACH ROW
EXECUTE FUNCTION check_offer_eligibility_before_redemption();
```

---

## 🧠 What This Trigger Does

| Step | Check                             | Behavior                                                 |
| ---- | --------------------------------- | -------------------------------------------------------- |
| 1    | Offer active & within time window | Rejects if offer is inactive or expired                  |
| 2    | Eligibility rules                 | Calls `is_user_eligible_for_offer()`                     |
| 3    | Per-user limit                    | Rejects if user already reached their limit              |
| 4    | Total usage limit                 | Atomically increments `usage_count` and prevents overuse |
| 5    | Pass-through                      | Allows insert only when all checks succeed               |

---

## ✅ How to Apply

Run it in your DB:

```bash
psql -d your_database -f offer_redemption_trigger.sql
```

Or via Knex:

```js
await knex.raw(fs.readFileSync('./offer_redemption_trigger.sql', 'utf8'));
```

---

## 🧪 Test the Enforcement

Try inserting manually:

```sql
INSERT INTO offer_redemptions (offer_id, user_id, price_paid, discount_amount)
VALUES ('<offer_uuid>', '<user_uuid>', 100, 10);
```

If the user is not eligible (or offer expired, or limits reached), Postgres will throw a descriptive error such as:

```
ERROR: User 7d91a2... is not eligible for offer 2f4a1b...
```

---
