# CashbackModel Unit Tests

## Overview

Comprehensive unit test suite for the `CashbackModel` class covering all functionality for managing user cashback balances and transaction history.

## Test File Location

`/workspace/jest/__tests__/unit/models/Cashback.test.ts`

## Test Coverage

### 1. **getOrCreate** Tests (2 tests)

Tests for the `getOrCreate(userId, trx)` method which retrieves or creates a cashback record.

- ✓ **should create a new cashback record if none exists**
  - Verifies a new record is created with zero balances
  - Checks all initial fields are set correctly (id, userId, availableBalance, etc.)

- ✓ **should return existing cashback record if it exists**
  - Verifies existing records are returned without duplication
  - Ensures balances are correctly updated with new earnings

- ✓ **should work with both Knex and Transaction connections**
  - Tests compatibility with both `db` connection and Knex transactions
  - Verifies proper handling of different connection types

### 2. **findByUserId** Tests (3 tests)

Tests for the `findByUserId(userId)` method which retrieves existing cashback without creation.

- ✓ **should find an existing cashback record by user ID**
  - Retrieves cashback for a user
  - Verifies all fields match expected values

- ✓ **should return null if cashback does not exist**
  - Returns null for non-existent user ID
  - Verifies proper error handling

- ✓ **should not create a new record when called**
  - Confirms method is non-destructive
  - Validates via direct database query

### 3. **addCashback** Tests (6 tests)

Tests for the `addCashback(userId, amount, description, topupRequestId, trx)` method.

- ✓ **should add cashback to user account**
  - Adds amount to available and earned balances
  - Verifies calculations are correct

- ✓ **should create a cashback transaction record**
  - Creates transaction entry with type='earned'
  - Verifies transaction stores all metadata (description, amount)

- ✓ **should accumulate multiple cashback additions**
  - Multiple additions are summed correctly
  - Verifies totalEarned accumulates properly

- ✓ **should link cashback to topup request if provided**
  - Transaction records topup_request_id when provided
  - Creates actual topup request in database for foreign key

- ✓ **should handle decimal amounts correctly**
  - Supports decimal values (e.g., 47.5)
  - Uses `toBeCloseTo()` for floating-point precision

### 4. **redeemCashback** Tests (7 tests)

Tests for the `redeemCashback(userId, amount, description, topupRequestId, trx)` method.

- ✓ **should deduct cashback from user account**
  - Reduces available balance correctly
  - Tracks total redeemed separately from earned

- ✓ **should create a redemption transaction record**
  - Creates transaction with type='redeemed'
  - Links to topup request when provided
  - Shows correct count of transactions (earned + redeemed)

- ✓ **should throw error if insufficient cashback**
  - Validates balance before redemption
  - Raises appropriate error for overdraft attempts

- ✓ **should throw error if user has no cashback record**
  - Handles case where user never earned cashback
  - Proper error propagation

- ✓ **should handle multiple redemptions correctly**
  - Multiple redemptions sum correctly
  - Available balance decreases properly
  - Total redeemed and earned remain accurate

- ✓ **should allow redeeming exact amount**
  - Can redeem all available cashback
  - Results in zero balance

- ✓ **should handle decimal redemption amounts**
  - Supports decimal redemptions (e.g., 99.25)
  - Proper precision in calculations

### 5. **getTransactionHistory** Tests (5 tests)

Tests for the `getTransactionHistory(userId, limit)` method which retrieves user transactions.

- ✓ **should retrieve transaction history for user**
  - Returns all transactions for user
  - Transactions ordered by most recent first

- ✓ **should respect limit parameter**
  - Limits result set to specified number
  - Returns correct count when limit applied

- ✓ **should order transactions by created_at descending**
  - Most recent transactions appear first
  - Proper ordering with delays between operations

- ✓ **should return empty array for user with no transactions**
  - Handles case with no history gracefully
  - Returns empty array (not null)

- ✓ **should include topup_request_id in transaction history**
  - Links transactions to topup requests
  - Includes actual topup request references

- ✓ **should default to limit of 50**
  - Default pagination limit is 50
  - Proper truncation of large result sets

### 6. **Integration Scenarios** Tests (3 tests)

Complex scenarios testing realistic cashback workflows.

- ✓ **should handle a complete earn-redeem-earn cycle**
  - Tests realistic user journey:
    1. Earn initial 200
    2. Redeem 100
    3. Earn additional 150
    4. Redeem all 250
  - Verifies balances at each step

- ✓ **should maintain data integrity across multiple operations**
  - 6 mixed earn/redeem operations
  - Verifies calculations remain correct:
    - totalEarned = 425 (100+50+75+200)
    - totalRedeemed = 75 (30+45)
    - availableBalance = 350

- ✓ **should return correct types from all methods**
  - Validates return types from all methods
  - Ensures proper TypeScript compatibility
  - Confirms enum values for transaction types

## Test Statistics

- **Total Tests**: 29
- **Total Test Suites**: 1
- **All Passing**: ✓

## Key Testing Patterns

### Transaction Context

Tests use Knex transactions to isolate test data:

```typescript
let trx: Knex.Transaction;

beforeEach(async () => {
  trx = await db.transaction();
  testUser = await UserModel.create(userData, trx);
});

afterEach(async () => {
  await trx.rollback();
});
```

### Decimal Precision

Uses `toBeCloseTo()` for floating-point comparisons:

```typescript
expect(cashback.availableBalance).toBeCloseTo(amount, 2);
```

### Foreign Key Testing

Creates real entities to satisfy foreign key constraints:

```typescript
const topupRequest = await trx('topup_requests')
  .insert({ user_id: testUserId, ... })
  .returning('id');
```

### Test Data Setup

Each test gets a fresh user and transaction context:

- Unique emails using timestamps
- Unique phone numbers using timestamps
- Fresh transaction for each test
- Automatic rollback after each test

## Running the Tests

### Run all cashback tests

```bash
npm test -- jest/__tests__/unit/models/Cashback.test.ts
```

### Run specific test suite

```bash
npm test -- jest/__tests__/unit/models/Cashback.test.ts --testNamePattern="getOrCreate"
```

### Run with verbose output

```bash
npm test -- jest/__tests__/unit/models/Cashback.test.ts --verbose
```

### Run all model tests

```bash
npm test -- jest/__tests__/unit/models/
```

## Error Scenarios Covered

1. **Insufficient Balance**
   - Attempting to redeem more than available
   - Returns proper error message

2. **Non-existent User**
   - Finding cashback for non-existent user
   - Returns null gracefully

3. **No Cashback Record**
   - Attempting operations on user without cashback
   - Creates record on first operation

4. **Foreign Key Constraints**
   - Linking to non-existent topup requests
   - Tests create valid topup records for testing

## Data Integrity Validation

Tests verify:

- ✓ Available balance = Total earned - Total redeemed
- ✓ Transactions record correctly with proper types
- ✓ Multiple operations accumulate without errors
- ✓ Decimal amounts handled with proper precision
- ✓ Timestamps ordered correctly
- ✓ Foreign key relationships maintained

## Performance Considerations

- Tests complete in ~28 seconds
- Transaction rollback ensures cleanup
- Isolated test data prevents conflicts
- Efficient database queries verified

## Future Enhancements

Potential additional tests:

1. Concurrent cashback operations
2. Large batch operations (1000+ transactions)
3. Edge cases with extreme decimal values
4. Performance tests with large datasets
5. Audit trail completeness
6. Race condition scenarios
