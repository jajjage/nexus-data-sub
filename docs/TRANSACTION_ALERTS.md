# Transaction Alert Push Notifications

## Overview

Transactional push notifications are real-time alerts sent to users for credit/debit transactions without creating database notification entries. These are temporary pop-up alerts that appear on the user's device.

## Key Differences from Regular Notifications

| Feature          | Regular Notifications        | Transaction Alerts           |
| ---------------- | ---------------------------- | ---------------------------- |
| Database Storage | ✅ Persisted                 | ❌ Not stored                |
| Preference-based | ✅ Respects user preferences | ❌ Always sent (urgent)      |
| User can delete  | ✅ Yes                       | ❌ Auto-dismiss              |
| Data Payload     | ❌ No                        | ✅ Yes (transaction details) |
| Use Case         | General announcements        | Real-time transactions       |

## Usage

### Basic Usage

```typescript
import { NotificationService } from '../services/notification.service';

// Send a transaction alert
await NotificationService.sendTransactionAlert(
  userId,
  'Money Received',
  'You received ₦5,000.00',
  {
    id: 'txn_12345',
    amount: 5000,
    type: 'credit',
    currency: 'NGN',
    reference: 'REF123456',
    timestamp: new Date().toISOString(),
    description: 'Bank transfer from John Doe',
  }
);
```

### Advanced Usage with Custom Fields

```typescript
await NotificationService.sendTransactionAlert(
  userId,
  'Money Sent',
  'You sent ₦2,500.00 to Jane Smith',
  {
    id: 'txn_67890',
    amount: 2500,
    type: 'debit',
    currency: 'NGN',
    reference: 'SEND123',
    timestamp: new Date().toISOString(),
    description: 'Transfer to contact',
    // Custom fields - will be prefixed with 'custom_'
    recipientName: 'Jane Smith',
    recipientPhone: '+2348012345678',
    transactionStatus: 'completed',
    charges: '25',
  }
);
```

## Implementation Example

### In Topup Webhook Service

```typescript
import { NotificationService } from './notification.service';

static async processTopupWebhook(webhookData: any) {
  const { transaction, userId } = webhookData;

  // Process the transaction
  // ... your transaction logic ...

  // Send transaction alert
  try {
    await NotificationService.sendTransactionAlert(
      userId,
      'Topup Successful',
      `Your account has been credited with ₦${transaction.amount}`,
      {
        id: transaction.id,
        amount: transaction.amount,
        type: 'credit',
        currency: transaction.currency || 'NGN',
        reference: transaction.reference,
        timestamp: new Date().toISOString(),
        description: `Topup - ${transaction.provider}`,
        provider: transaction.provider,
      }
    );
  } catch (error) {
    logger.error('Failed to send transaction alert', error);
    // Alert failure won't block the transaction
  }
}
```

### In Rewards Service

```typescript
import { NotificationService } from './notification.service';

static async creditRewards(userId: string, amount: number) {
  // Credit the rewards
  // ... your logic ...

  // Notify user
  await NotificationService.sendTransactionAlert(
    userId,
    'Reward Credited',
    `You earned ₦${amount} in rewards`,
    {
      id: `reward_${Date.now()}`,
      amount,
      type: 'credit',
      currency: 'NGN',
      reference: 'REWARD_CREDIT',
      timestamp: new Date().toISOString(),
      description: 'Referral reward',
      rewardType: 'referral',
    }
  );
}
```

## Data Payload Structure

The transaction alert includes the following data that frontend can access:

```json
{
  "title": "Money Received",
  "body": "You received ₦5,000.00",
  "type": "transaction",
  "transactionId": "txn_12345",
  "transactionType": "credit",
  "amount": "5000",
  "currency": "NGN",
  "reference": "REF123456",
  "timestamp": "2025-12-12T10:30:00.000Z",
  "description": "Bank transfer from John Doe",
  "custom_recipientName": "Jane Smith",
  "custom_recipientPhone": "+2348012345678"
}
```

## Firebase Message Structure

The Firebase message is sent as:

```json
{
  "notification": {
    "title": "Money Received",
    "body": "You received ₦5,000.00"
  },
  "data": {
    "title": "Money Received",
    "body": "You received ₦5,000.00",
    "type": "transaction",
    "transactionId": "txn_12345",
    "transactionType": "credit",
    "amount": "5000",
    "currency": "NGN",
    "reference": "REF123456",
    "timestamp": "2025-12-12T10:30:00.000Z",
    "description": "Bank transfer from John Doe"
  },
  "tokens": ["device_token_1", "device_token_2"]
}
```

## Important Notes

1. **No Database Storage**: Transaction alerts are not persisted in the database
2. **Error Handling**: Alert failures don't block the transaction (non-blocking)
3. **Token Cleanup**: Invalid tokens are automatically removed from the system
4. **User-Specific**: Alerts go directly to the user's registered devices
5. **No Preferences**: Unlike regular notifications, transaction alerts ignore user preferences (they are time-sensitive)
6. **Data Limits**: Firebase has a 4KB limit per message. Keep data payload concise.

## Error Scenarios

The service handles these gracefully:

- **No tokens registered**: Alert is skipped, no error thrown
- **Firebase delivery fails**: Failed tokens are removed, transaction proceeds
- **Invalid token**: Token is cleaned up automatically
- **Network error**: Logged but transaction continues

## Frontend Integration

Frontend should listen for transaction alerts and handle them specially:

```javascript
// Firebase Cloud Messaging listener
messaging.onMessage(message => {
  if (message.data?.type === 'transaction') {
    // Show as pop-up alert (not persistent notification)
    showTransactionAlert({
      title: message.data.title,
      body: message.data.body,
      transactionId: message.data.transactionId,
      amount: message.data.amount,
      type: message.data.transactionType,
      // ...
    });
  }
});
```
