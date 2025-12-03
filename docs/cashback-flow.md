# Cashback Flow Documentation

## Overview

The cashback system is fully integrated into the topup request flow. Cashback is now awarded immediately upon topup creation (not waiting for webhook).

## Updated Cost Calculation

### Cost Structure

- **User Pays (amount)**: The product denomination (e.g., 100 for MTN 100 Airtime)
- **Actual Cost Deducted**: `supplier_price + 5 naira commission`
- **Cashback Earned**: Based on the product denomination amount (not the cost)

### Example Scenario

```
Product: MTN 100 Airtime (has_cashback=true, cashback_percentage=2%)
Supplier Price: 95 naira
Commission: 5 naira
Total Cost: 100 naira

User Wallet Debit: 100 naira
Cashback Earned: 100 × (2 ÷ 100) = 2 naira
```

## Payment Flow (createTopupRequest)

### Step 1: Validate Wallet Balance

- Check if user has sufficient wallet balance for the actual cost
- If insufficient, check for cashback balance (if `useCashback=true`)

### Step 2: Create Topup Request

- Store the supplier price + 5 naira as the `cost` field
- Set status as `pending`

### Step 3: Deduct Costs (Mixed Payment)

- **Wallet Debit**: Min(wallet.balance, actual_cost)
- **Cashback Debit**: If cost > wallet.balance, use available cashback
- Formula: `wallet_debit + cashback_debit = actual_cost`

### Step 4: Award Cashback Immediately

- Calculate: `amount × (product.cashback_percentage ÷ 100)`
- If product has `has_cashback=true` and `cashback_percentage > 0`
- Award to user's cashback balance

## Code Flow

### createTopupRequest() Step-by-Step

```typescript
// 1. Get wallet
const wallet = await trx('wallets').where({ user_id: userId }).first();

// 2. Validate balance for product amount
if (wallet.balance < amount) {
  if (useCashback) {
    // Check if wallet + cashback covers amount
    const cashbackBalance = await CashbackModel.findByUserId(userId);
    if (wallet.balance + cashbackBalance.availableBalance < amount) {
      throw error("Insufficient balance");
    }
  } else {
    throw error("Insufficient balance");
  }
}

// 3. Get operator product and supplier mapping
const operatorProduct = await trx('operator_products').where({
  product_code: productCode,
  denom_amount: amount
}).first();

const supplierMapping = await resolveSupplier(...); // 4-level precedence

// 4. Calculate actual cost
const actualCost = supplierMapping.supplier_price + 5;

// 5. Check if user can afford the actual cost
let walletDebit = Math.min(wallet.balance, actualCost);
let cashbackDebit = 0;

if (actualCost > wallet.balance && useCashback) {
  cashbackRecord = await CashbackModel.findByUserId(userId);
  cashbackDebit = Math.min(
    cashbackRecord.availableBalance,
    actualCost - wallet.balance
  );
}

// 6. Debit wallet
await trx('wallets').update({ balance: wallet.balance - walletDebit });

// 7. Create wallet transaction
await TransactionModel.create({
  direction: 'debit',
  amount: walletDebit,
  method: 'wallet',
  ...
});

// 8. Debit cashback (if used)
if (cashbackDebit > 0) {
  await CashbackModel.redeemCashback(userId, cashbackDebit, ...);
}

// 9. Award cashback immediately
if (operatorProduct.has_cashback && operatorProduct.cashback_percentage) {
  const cashbackEarned = (amount * operatorProduct.cashback_percentage) / 100;
  await CashbackModel.addCashback(userId, cashbackEarned, ...);
}

return newTopupRequest;
```

## Example: Complete Transaction

**Scenario:**

- User wants to buy MTN 1000 Airtime
- Product: MTN-AIRTIME-1000 (denom: 1000, cashback: 2%)
- Supplier Price: 950 naira
- Commission: 5 naira
- Total Cost: 955 naira
- User Wallet: 900 naira
- User Cashback: 200 naira

**Transaction Steps:**

1. ✓ Validate: 900 (wallet) + 200 (cashback) = 1100 >= 1000 (amount) ✓
2. ✓ Create topup request with cost=955
3. ✓ Debit wallet: 900 naira (full wallet)
4. ✓ Debit cashback: 55 naira (remaining of 955)
5. ✓ Award cashback: 1000 × (2 ÷ 100) = 20 naira earned
6. ✓ Result:
   - Wallet Balance: 0 naira
   - Cashback Balance: 200 - 55 + 20 = 165 naira

## API Request Format

```json
POST /api/v1/user/topup
{
  "amount": 1000,
  "productCode": "MTN-AIRTIME-1000",
  "recipientPhone": "08012345678",
  "useCashback": true,
  "supplierSlug": "supplier-a"
}
```

## Fields Explained

- **amount**: Product denomination (what user is purchasing)
- **productCode**: Canonical product code
- **recipientPhone**: Beneficiary phone number
- **useCashback**: Whether to allow cashback usage if wallet insufficient
- **supplierSlug**: (Optional) Force specific supplier
- **supplierMappingId**: (Optional) Force specific supplier mapping

## Cashback Data Structure

### CashbackModel Methods

#### getOrCreate(userId, trx)

- Gets or creates a cashback record for user
- Returns: `{ id, userId, availableBalance, totalEarned, totalRedeemed, createdAt, updatedAt }`

#### findByUserId(userId)

- Gets cashback record without creating
- Returns: Cashback object or null

#### addCashback(userId, amount, description, topupRequestId, trx)

- Awards cashback to user
- Creates cashback_transactions entry with type='earned'
- Returns: Updated cashback record

#### redeemCashback(userId, amount, description, topupRequestId, trx)

- Deducts cashback from user
- Creates cashback_transactions entry with type='redeemed'
- Validates sufficient balance
- Returns: Updated cashback record

#### getTransactionHistory(userId, limit)

- Gets transaction history for user
- Returns: Array of CashbackTransaction objects

## Database Schema

### cashback Table

```sql
CREATE TABLE cashback (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  available_balance DECIMAL(12,2) DEFAULT 0,
  total_earned DECIMAL(12,2) DEFAULT 0,
  total_redeemed DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### cashback_transactions Table

```sql
CREATE TABLE cashback_transactions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  type VARCHAR (20) DEFAULT 'earned' CHECK (type IN ('earned', 'redeemed', 'adjustment')),
  amount DECIMAL(12,2) NOT NULL,
  description TEXT,
  topup_request_id UUID REFERENCES topup_requests(id),
  created_at TIMESTAMP
);
```

### operator_products Updates

```sql
ALTER TABLE operator_products ADD COLUMN has_cashback BOOLEAN DEFAULT FALSE;
ALTER TABLE operator_products ADD COLUMN cashback_percentage DECIMAL(5,2) DEFAULT 0;
```

## Seed Data Configuration

All products have cashback enabled:

- **Data Products**: 5% cashback
- **Airtime Products**: 2% cashback

Example:

```typescript
{
  product_code: 'MTN-DATA-1GB',
  denom_amount: 1000,
  has_cashback: true,
  cashback_percentage: 5.0,
  ...
}
```

## User Profile Integration

The `getUserProfile()` endpoint now returns cashback data:

```json
{
  "userId": "...",
  "email": "...",
  "balance": "5000",
  "cashback": {
    "availableBalance": 150.50,
    "totalEarned": 500.00,
    "totalRedeemed": 349.50
  },
  "recentlyUsedNumbers": [...]
}
```

## Error Handling

### InsufficientBalance (402)

```
{
  "statusCode": 402,
  "message": "Insufficient balance. Cost: 955, Available: 1000"
}
```

### InsufficientCashback (when redeemCashback called)

```
{
  "message": "Insufficient cashback balance. Available: 50, Required: 100"
}
```

### ProductNotFound (404)

```
{
  "statusCode": 404,
  "message": "Operator product not found"
}
```

## Transaction Atomicity

All operations within `createTopupRequest` are wrapped in a Knex transaction:

- Wallet debit
- Cashback debit
- Cashback earning
- Transaction records
- Topup request creation

If any operation fails, the entire transaction is rolled back.

## Notes

1. **Cashback Earned**: Based on the original product amount, NOT the cost to the platform
2. **Cashback Used**: Can only be used if `useCashback=true` is passed
3. **Cost Calculation**: `supplier_price + 5 naira` (fixed 5 naira commission)
4. **Immediate Crediting**: Cashback is awarded immediately upon topup creation, not on webhook success
5. **No Double Crediting**: Webhook handler no longer awards cashback to avoid double-crediting
