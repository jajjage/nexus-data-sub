# Webhook Service Unit Test Mocking Strategy

This document explains the mocking strategy used in `webhook.service.test.ts` to isolate the `WebhookService` from the database for unit testing.

## The Challenge

The `WebhookService` relies heavily on the `knex` library to interact with the database. A single method, `processPayment`, uses a `knex` transaction object (`trx`) to perform a series of chained database queries.

Mocking this behavior is complex because the `trx` object is used in two ways:

1.  **As a function:** `trx('table_name')`
2.  **As an object with chainable methods:** `trx('...').where(...).insert(...).commit()`

A standard Jest mock object (`jest.fn()`) is not sufficient to handle both cases simultaneously, and this led to a series of errors during testing, including `ReferenceError` due to Jest hoisting and `TypeError: is not a function` errors.

## The Solution

The final, successful approach involves a clean, multi-step strategy implemented entirely within the test file:

### 1. Mock the Module

First, we mock the entire `knex` database connection module at the top of the test file:

```typescript
jest.mock('../../../../src/database/connection');
```

This ensures that any import of the `knex` module within the service will receive our mock instead of the real one.

### 2. Create a Reusable Mock Factory

A factory function, `createMockTrx()`, is used to generate a fresh, correctly structured mock transaction object for each test.

```typescript
const createMockTrx = () => {
  const mockTrx: any = jest.fn(() => mockTrx); // Returns itself when called as a function

  // Attach all chainable methods
  mockTrx.insert = jest.fn(() => mockTrx);
  mockTrx.onConflict = jest.fn(() => mockTrx);
  // ... and so on for all methods used in the service

  // Methods that terminate a chain resolve with a value
  mockTrx.returning = jest.fn().mockResolvedValue([{ id: 1 }]);
  mockTrx.commit = jest.fn().mockResolvedValue(undefined);

  return mockTrx;
};
```

**Key Points:**

-   The base `mockTrx` is a `jest.fn()` that returns *itself*. This is the key to allowing the initial `trx('table_name')` call to work and be chainable.
-   All chainable methods (like `.insert`, `.where`, etc.) also return `mockTrx` to allow for infinitely deep chaining.
-   Methods that end a chain (like `.returning` or `.commit`) are configured to return a `Promise` that resolves with the expected data, just as `knex` would.

### 3. Configure the Mock in `beforeEach`

Inside the `beforeEach` block, we create a fresh `mockTrx` and configure the main `knex.transaction` mock to resolve with it.

```typescript
beforeEach(() => {
  jest.clearAllMocks(); // Ensures no mock state leaks between tests
  webhookService = new WebhookService();
  mockTrx = createMockTrx();

  // Configure the mocked knex transaction to return our mock trx object
  (mockedKnex.transaction as jest.Mock).mockResolvedValue(mockTrx);
});
```

### 4. Overriding for Specific Tests

For specific test cases (like testing duplicate payments or database errors), we can override the behavior of a single method on the `mockTrx` object *within that test*.

**Example: Simulating a duplicate payment**

```typescript
it('should handle duplicate payments idempotently', async () => {
  // ...
  mockTrx.returning.mockResolvedValue([]); // Simulate no rows inserted
  // ...
});
```

**Example: Simulating a database error**

```typescript
it('should handle database errors gracefully', async () => {
  // ...
  const dbError = new Error('Database connection failed');
  mockTrx.returning.mockRejectedValue(dbError); // Reject the promise at the end of the chain
  // ...
});
```

This strategy provides a robust, stable, and easy-to-understand way to unit test the `WebhookService` without making any changes to the service's implementation code.
