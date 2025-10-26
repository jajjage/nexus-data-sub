Excellent — that file you shared (`offer.docx`) contains a **complete backend design for an Offers & Eligibility System**, including schema definitions, redemption logic, and eligibility rules.

Below is a **step-by-step TODO list** (an engineer-ready implementation guide) that combines all the parts into a practical build plan — with **code examples for each key stage**.

---

## 🧩 Step-by-Step TODO List (Engineer’s Implementation Plan)

### **1. Database Setup**

**Goal:** Create core offers tables (offers, offer_products, redemptions, eligibility rules, etc.)

#### ✅ Tasks:

- [ ] Create migrations for:
  - `offers`
  - `offer_products`
  - `offer_allowed_users`
  - `offer_allowed_roles`
  - `offer_redemptions`
  - `offer_eligibility_rules`
  - `offer_segment_members`

#### 🧠 Example (Knex migration)

```js
// migrations/2025_create_offers_tables.js
exports.up = async function (knex) {
  await knex.schema.createTable('offers', t => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.text('code').unique();
    t.text('title').notNullable();
    t.text('description');
    t.text('status').notNullable();
    t.text('discount_type').notNullable();
    t.decimal('discount_value', 12, 2).defaultTo(0);
    t.integer('per_user_limit');
    t.integer('total_usage_limit');
    t.integer('usage_count').notNullable().defaultTo(0);
    t.text('apply_to').notNullable();
    t.boolean('allow_all').defaultTo(true);
    t.timestamp('starts_at');
    t.timestamp('ends_at');
    t.uuid('created_by');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('offer_products', t => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('offer_id').references('id').inTable('offers').onDelete('CASCADE');
    t.uuid('operator_product_id');
    t.uuid('supplier_product_mapping_id');
    t.decimal('price_override', 12, 2);
    t.integer('max_quantity_per_purchase');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('offer_redemptions', t => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('offer_id').references('id').inTable('offers');
    t.uuid('user_id').notNullable();
    t.uuid('operator_product_id');
    t.uuid('supplier_product_mapping_id');
    t.decimal('price_paid', 12, 2).notNullable();
    t.decimal('discount_amount', 12, 2).notNullable();
    t.timestamps(true, true);
  });
};
```

---

### **2. Eligibility Rules Schema**

**Goal:** Allow admin to define flexible “who is eligible” rules.

#### ✅ Tasks:

- [ ] Add `eligibility_logic` column to `offers` (`'all'` or `'any'`).
- [ ] Create `offer_eligibility_rules` table to define rule conditions.

#### 🧠 Example

```sql
ALTER TABLE offers
ADD COLUMN eligibility_logic TEXT NOT NULL DEFAULT 'all'
CHECK (eligibility_logic IN ('all', 'any'));

CREATE TABLE offer_eligibility_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  rule_key text NOT NULL,
  rule_type text NOT NULL,
  params jsonb NOT NULL DEFAULT '{}',
  description text,
  created_at timestamptz DEFAULT now()
);
```

---

### **3. Offer Redemption Logic**

**Goal:** Implement a transaction-safe redemption flow (no double use or race conditions).

#### ✅ Tasks:

- [ ] Add a transaction that:
  1. Checks if offer is active and valid (time window).
  2. Checks eligibility (`is_user_eligible_for_offer` function).
  3. Ensures per-user and total limits aren’t exceeded.
  4. Increments `usage_count` atomically.
  5. Inserts redemption record.

#### 🧠 Example (Express + Knex)

```js
await knex.transaction(async trx => {
  const offer = await trx('offers')
    .where('id', offerId)
    .andWhere('status', 'active')
    .forUpdate()
    .first();

  if (!offer) throw new Error('Offer inactive');

  const eligible = await trx.raw(
    'SELECT is_user_eligible_for_offer(?, ?) AS ok',
    [offerId, userId]
  );
  if (!eligible.rows[0].ok) throw new Error('User not eligible');

  const count = await trx('offer_redemptions')
    .count('* as cnt')
    .where({ offer_id: offerId, user_id: userId })
    .first();

  if (offer.per_user_limit && count.cnt >= offer.per_user_limit)
    throw new Error('Per-user limit reached');

  const inc = await trx('offers')
    .where('id', offerId)
    .andWhere(function () {
      this.whereNull('total_usage_limit').orWhere(
        'usage_count',
        '<',
        offer.total_usage_limit
      );
    })
    .increment('usage_count', 1)
    .returning('usage_count');

  if (!inc.length) throw new Error('Offer exhausted');

  await trx('offer_redemptions').insert({
    offer_id: offerId,
    user_id: userId,
    price_paid: price,
    discount_amount: discount,
  });
});
```

---

### **4. Eligibility Function in PostgreSQL**

**Goal:** Evaluate rules such as “new user,” “≥3 topups,” “spent ₦5000 on MTN,” etc.

#### ✅ Tasks:

- [ ] Create the function `is_user_eligible_for_offer(offer_id, user_id)` in Postgres.

#### 🧠 Example (simplified)

```sql
CREATE OR REPLACE FUNCTION is_user_eligible_for_offer(p_offer uuid, p_user uuid)
RETURNS boolean LANGUAGE plpgsql AS $$
DECLARE
  rule RECORD;
  logic text;
  pass boolean;
  result boolean;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM offer_eligibility_rules WHERE offer_id = p_offer) THEN
    RETURN true;
  END IF;

  SELECT eligibility_logic INTO logic FROM offers WHERE id = p_offer;
  IF logic IS NULL THEN logic := 'all'; END IF;

  result := (logic = 'all');

  FOR rule IN SELECT * FROM offer_eligibility_rules WHERE offer_id = p_offer LOOP
    pass := false;

    IF rule.rule_type = 'new_user' THEN
      SELECT (now() - u.created_at) <= ((rule.params->>'account_age_days')::int * interval '1 day')
      INTO pass FROM users u WHERE u.id = p_user;
    ELSIF rule.rule_type = 'min_topups' THEN
      SELECT count(*) >= (rule.params->>'count')::int INTO pass
      FROM topup_requests WHERE user_id = p_user;
    END IF;

    IF logic = 'all' AND NOT pass THEN RETURN false; END IF;
    IF logic = 'any' AND pass THEN RETURN true; END IF;
  END LOOP;

  RETURN (logic = 'all');
END;
$$;
```

---

### **5. Precomputation for Scale**

**Goal:** Improve performance under high load.

#### ✅ Tasks:

- [ ] Create `offer_segment_members` (precomputed eligible users per offer).
- [ ] Add a background worker or cron job to recompute eligibility membership.
- [ ] At redemption time, simply check:

  ```sql
  SELECT 1 FROM offer_segment_members WHERE offer_id = :offer_id AND user_id = :user_id;
  ```

---

### **6. Admin Rule Editor UI**

**Goal:** Give admins a friendly UI to build eligibility conditions.

#### ✅ Tasks:

- [ ] Create JSON schema for the rule editor.
- [ ] Allow admins to:
  - Select `rule_type`
  - Input params (days, amount, count, operator_id)
  - Combine rules with AND/OR

#### 🧠 Example JSON schema (for frontend)

```json
{
  "title": "Offer Eligibility Rule",
  "type": "object",
  "properties": {
    "rule_type": {
      "type": "string",
      "enum": [
        "new_user",
        "min_topups",
        "min_transactions",
        "min_spent",
        "operator_topup_count",
        "operator_spent",
        "active_days",
        "last_active_within"
      ]
    },
    "params": {
      "type": "object",
      "properties": {
        "account_age_days": { "type": "integer" },
        "count": { "type": "integer" },
        "window_days": { "type": "integer" },
        "amount": { "type": "number" },
        "operator_id": { "type": "string", "format": "uuid" }
      }
    },
    "description": { "type": "string" }
  },
  "required": ["rule_type"]
}
```

---

### **7. Testing Checklist**

- [ ] ✅ Create a “new user” rule → test eligibility within 7 days.
- [ ] ✅ Create a “min_topups=3” rule → test after 3 successful topups.
- [ ] ✅ Simulate concurrent redemptions → confirm usage_count doesn’t exceed total limit.
- [ ] ✅ Test combinations (`eligibility_logic = 'any'`).

---

### **8. Optional Enhancements**

- [ ] Add caching (Redis or materialized view for active offers).
- [ ] Add audit trail for offer updates and rule evaluations.
- [ ] Add `revoked_at` for cancelled redemptions.

---

## ⚙️ Final Outcome

After implementing these steps:

- Your **offers** system will handle flexible campaigns and eligibility checks.
- Redemptions are **race-safe** and auditable.
- Admins can easily **create and test rules** from a UI.

---
