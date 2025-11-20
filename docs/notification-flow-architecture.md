# Notification Flow Architecture - Complete Guide

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Layers](#architecture-layers)
3. [Push Token Registration Flow](#push-token-registration-flow)
4. [Topic-Based Subscription System](#topic-based-subscription-system)
5. [Notification Sending Flow](#notification-sending-flow)
6. [Token Lifecycle Management](#token-lifecycle-management)
7. [Database Schema](#database-schema)
8. [Configuration](#configuration)
9. [Error Handling](#error-handling)
10. [Testing](#testing)

---

## System Overview

The notification system is a **multi-layered architecture** built on Firebase Cloud Messaging (FCM) that enables:

- ✅ Server-side push notification delivery to multiple platforms (iOS, Android, Web)
- ✅ Automatic topic-based subscriptions for broadcast messaging
- ✅ Role-based notification targeting
- ✅ Token lifecycle management with automatic invalidation on failures
- ✅ Scalable multi-tenancy with configuration-driven topic selection

### Key Technologies

| Component     | Technology                     | Purpose                          |
| ------------- | ------------------------------ | -------------------------------- |
| Message Queue | Firebase Cloud Messaging (FCM) | Push notification delivery       |
| Database      | PostgreSQL                     | Token & notification tracking    |
| Cache         | Redis                          | Session & temporary data storage |
| Backend       | Node.js/Express                | API & business logic             |
| Admin SDK     | Firebase Admin SDK             | Server-side token management     |

---

## Architecture Layers

### 1. **Controller Layer** (`src/controllers/notification.controller.ts`)

HTTP request handlers for public endpoints:

- Receives HTTP requests from clients
- Validates input data
- Calls service layer for business logic
- Returns structured JSON responses

**Key Endpoints:**

- `POST /notifications/register-token` - Register new FCM token
- `GET /notifications` - Fetch user's notifications
- `POST /notifications/:id/read` - Mark notification as read

### 2. **Service Layer** (`src/services/notification.service.ts`)

Business logic and orchestration:

- Coordinates between models and external services
- Implements business rules
- Manages transaction contexts
- Handles fire-and-forget operations

**Key Methods:**

- `registerPushToken()` - Register token + auto-subscribe to topics
- `createAndSend()` - Create notification and queue for sending
- `sendPushNotifications()` - Send to multiple tokens via Firebase
- `markAsRead()` - Update notification read status

### 3. **Model Layer** (`src/models/Notification.ts`)

Data access and database operations:

- Encapsulates database queries
- Manages token lifecycle in DB
- Tracks notification delivery status
- Handles data transformation

**Key Methods:**

- `registerPushToken()` - Persist token to `push_tokens` table
- `updateTokenStatus()` - Update token status + unsubscribe from topics
- `findUserPushTokens()` - Fetch active tokens for user
- `findAllPushTokens()` - Complex targeting queries
- `createNotification()` - Insert notification record

### 4. **Firebase Service** (`src/services/firebase.service.ts`)

Firebase Admin SDK wrapper:

- Encapsulates FCM API calls
- Manages topic subscriptions/unsubscriptions
- Handles batch sending operations
- Centralizes error handling

**Key Methods:**

- `sendPushNotification()` - Send to single device
- `sendMulticastPushNotification()` - Send to multiple devices
- `subscribeTokenToTopic()` - Subscribe token to broadcast topic
- `unsubscribeTokenFromTopic()` - Remove from topic

---

## Push Token Registration Flow

### Sequence Diagram

```
Client (Mobile/Web)
    |
    | 1. Request: POST /api/auth/register-token
    |    { userId, token, platform }
    |
    v
NotificationController.registerToken()
    |
    | 2. Validates input
    | 3. Extracts userId from auth header
    |
    v
NotificationService.registerPushToken()
    |
    | 4. Calls NotificationModel.registerPushToken()
    |    - Inserts/updates push_tokens table
    |    - Returns { id, user_id, token }
    |
    | 5. Reads config.notifications.autoSubscribeTopics
    |    - Gets list: ['all', 'news', 'promotions']
    |
    | 6. Queries user to get role
    |    - SELECT role FROM users WHERE id = userId
    |
    | 7. Builds topic list:
    |    - Global topics: ['all', 'news', 'promotions']
    |    - Role topic (if enabled): ['role_user']
    |    - Final: ['all', 'news', 'promotions', 'role_user']
    |
    | 8. For each topic, calls FirebaseService.subscribeTokenToTopic()
    |    - Topic 'all': async fire-and-forget
    |    - Topic 'news': async fire-and-forget
    |    - Topic 'promotions': async fire-and-forget
    |    - Topic 'role_user': async fire-and-forget
    |
    v
FirebaseService.subscribeTokenToTopic()
    |
    | 9. Calls admin.messaging().subscribeToTopic([token], topicName)
    |
    | 10. Logs success or error (no blocking)
    |
    v
Client
    |
    | 11. Response: { success: true, message: 'Token registered' }
    |
    v
```

### Step-by-Step Implementation

#### Step 1: Client Registration

```typescript
// Frontend (React, Vue, etc.)
const fcmToken = await messaging.getToken({
  vapidKey: 'YOUR_PUBLIC_KEY',
});

// Send to backend
const response = await fetch('/api/notifications/register-token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${authToken}`,
  },
  body: JSON.stringify({
    token: fcmToken,
    platform: 'web', // or 'ios', 'android'
  }),
});
```

#### Step 2: Controller Validation

```typescript
// src/controllers/notification.controller.ts
async registerToken(req: Request, res: Response) {
  const { token, platform } = req.body;
  const userId = req.user.id; // From auth middleware

  // Validate
  if (!token || !platform) {
    return res.status(400).json({ error: 'Missing token or platform' });
  }

  // Call service
  const result = await NotificationService.registerPushToken({
    userId,
    token,
    platform
  });

  return res.json({ success: true, data: result });
}
```

#### Step 3: Service Auto-Subscribe Logic

```typescript
// src/services/notification.service.ts
static async registerPushToken(input: RegisterPushTokenInput) {
  // 1. Register token in database
  const token = await NotificationModel.registerPushToken(input);

  // 2. Get user with role
  const user = await db('users')
    .where({ id: input.userId })
    .select('id', 'role', 'role_id')
    .first();

  if (!user) throw new Error('User not found');

  // 3. Build topic list from config
  const topics = [...config.notifications.autoSubscribeTopics];

  // 4. Add role-based topic if enabled
  if (config.notifications.subscribeRoleTopic && user.role) {
    topics.push(`role_${user.role}`);
  }

  // 5. Subscribe to each topic (fire-and-forget)
  for (const topic of topics) {
    FirebaseService.subscribeTokenToTopic(token.token, topic)
      .catch(err => logger.error(`Failed to subscribe to ${topic}`, err));
  }

  return { success: true, tokenId: token.id };
}
```

#### Step 4: Firebase Service Subscription

```typescript
// src/services/firebase.service.ts
static async subscribeTokenToTopic(token: string, topic: string) {
  try {
    const response = await admin.messaging().subscribeToTopic([token], topic);
    logger.info(`Token subscribed to topic ${topic}`, {
      token: token.slice(-10),
      topic,
      errors: response.errors
    });
  } catch (error) {
    logger.error(`Failed to subscribe token to topic ${topic}`, {
      error: error.message,
      token: token.slice(-10),
      topic
    });
  }
}
```

---

## Topic-Based Subscription System

### Why Topics?

Instead of maintaining per-user token lists, we use **FCM Topics** for:

- ✅ **Scalability**: Single API call to send to thousands of subscribers
- ✅ **Simplicity**: No need to maintain token lists per notification
- ✅ **Role-Based Targeting**: Role topics enable easy role-based broadcast
- ✅ **Global Broadcast**: 'all' topic reaches every user instantly

### Topic Naming Convention

```
Topic Name Format: <prefix>_<target>

Examples:
- all              → All users receive this
- news             → Users subscribed to news category
- promotions       → Promotional messages
- role_admin       → Messages for admin role only
- role_staff       → Messages for staff role only
- role_user        → Messages for regular users
```

### Topic Architecture

```
Database (push_tokens)
    ↓
NotificationService.registerPushToken()
    ↓
Config: autoSubscribeTopics = ['all', 'news']
Config: subscribeRoleTopic = true
User Role: 'user'
    ↓
Topics: ['all', 'news', 'role_user']
    ↓
FirebaseService.subscribeTokenToTopic()
    ↓
Firebase Topics Table
├── Topic: all
│   ├── Token-1 (User-A)
│   ├── Token-2 (User-B)
│   └── Token-N (User-N)
├── Topic: news
│   ├── Token-1 (User-A)
│   ├── Token-3 (User-C)
│   └── Token-N
└── Topic: role_user
    ├── Token-1 (User-A)
    ├── Token-2 (User-B)
    └── Token-N
```

### Automatic Topic Lifecycle

```
User Registration
    ↓
registerPushToken()
    ├── Subscribe to: ['all', 'news', 'role_user']
    └── Topics updated in Firebase
    ↓
User Activity
    └── User remains subscribed
    ↓
Token Marked Invalid (too many failures)
    ├── updateTokenStatus(status='invalid')
    ├── Unsubscribe from: ['all', 'news', 'role_user']
    └── Topics updated in Firebase
    ↓
User Deletes Account
    ├── Delete push_token record
    ├── (Optional) Explicit unsubscribe from all topics
    └── Token no longer receives messages
```

---

## Notification Sending Flow

### Broadcasting to All Users

```typescript
// Option 1: Send to topic directly via Firebase API
const message = {
  notification: {
    title: 'System Update',
    body: 'New features available',
  },
  topic: 'all', // Send to all subscribed tokens
};

await admin.messaging().send(message);
```

### Broadcasting to Role-Based Audience

```typescript
// Send to admin role only
const message = {
  notification: {
    title: 'Admin Alert',
    body: 'New reports pending review',
  },
  topic: 'role_admin',
};

await admin.messaging().send(message);
```

### Sending to Specific Users (Query-Based)

```typescript
// NotificationService.createAndSend()
const targetTokens = await NotificationModel.findAllPushTokens({
  registeredAfter: '2024-01-01',
  minTransactionCount: 5,
  minTopupCount: 1,
  lastActiveDays: 7,
});

// Send to specific tokens
await FirebaseService.sendMulticastPushNotification(
  targetTokens.map(t => t.token),
  notificationPayload
);
```

### Complete Send Flow Diagram

```
NotificationService.createAndSend()
    |
    | 1. Create notification record
    |    - INSERT INTO notifications (...)
    |
    | 2. Determine target tokens
    |    - Query based on criteria
    |    - OR use specific topic
    |
    v
FirebaseService.sendMulticastPushNotification()
    |
    | 3. Call admin.messaging().sendEachForMulticast()
    |
    | 4. Process responses
    |    - Success: [token-1, token-3, token-5]
    |    - Failed: [token-2, token-4]
    |
    v
NotificationService.sendPushNotifications()
    |
    | 5. For each failed token:
    |    - Increment failure_count
    |    - If count > MAX_FAILURES:
    |        - Mark token status='invalid'
    |        - Call NotificationModel.updateTokenStatus()
    |
    v
NotificationModel.updateTokenStatus()
    |
    | 6. If status='invalid':
    |    - Query user role
    |    - Get configured topics
    |    - For each topic:
    |        - FirebaseService.unsubscribeTokenFromTopic()
    |
    v
All Users
    |
    | 7. Tokens receive push notification
    |
    v
```

---

## Token Lifecycle Management

### Token States

```
┌─────────────────────────────────────────────┐
│ Token State Machine                         │
├─────────────────────────────────────────────┤
│                                             │
│  NEW ──────────────────> ACTIVE             │
│  (registered)            (subscribed)       │
│       ✓ Subscribe to                        │
│         all topics       │                  │
│                          ├──────────────┐   │
│                          │              │   │
│                          v              v   │
│                      INVALID         INVALID│
│                      (too many    (manually │
│                      failures)    marked)   │
│                          │              │   │
│                          └──────────────┘   │
│                              ✓ Unsubscribe │
│                                from topics │
│                          │                  │
│                          v                  │
│                      UNREGISTERED           │
│                      (deleted)              │
│                                             │
└─────────────────────────────────────────────┘
```

### Token Attributes

```typescript
interface PushToken {
  id: UUID;
  user_id: UUID;
  platform: 'web' | 'ios' | 'android';
  token: string; // FCM token
  last_seen: timestamp; // Last successful send
  status: 'active' | 'invalid' | 'unregistered';
  failure_reason?: string;
  failure_count: number;
  created_at: timestamp;
  updated_at: timestamp;
}
```

### Failure Handling

```
Send attempt to token
    |
    ├─ SUCCESS
    |  └─ Update last_seen, failure_count=0
    |
    └─ FAILURE (invalid token, device offline, etc.)
       ├─ failure_count++
       |
       └─ if failure_count > MAX_FAILURES (e.g., 5)
          ├─ status='invalid'
          ├─ NotificationModel.updateTokenStatus()
          ├─ Get user role
          ├─ Unsubscribe from all topics
          └─ Stop sending to this token
```

---

## Database Schema

### push_tokens Table

```sql
CREATE TABLE push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('web', 'ios', 'android')),
  token VARCHAR(500) NOT NULL,
  last_seen TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(50) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'invalid', 'unregistered')),
  failure_reason TEXT,
  failure_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, token) -- Prevent duplicate tokens per user
);

CREATE INDEX idx_push_tokens_user_id ON push_tokens(user_id);
CREATE INDEX idx_push_tokens_status ON push_tokens(status);
CREATE INDEX idx_push_tokens_created_at ON push_tokens(created_at);
```

### notifications Table

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  notification_type VARCHAR(50), -- 'alert', 'promo', 'system'
  target_tokens TEXT[], -- JSON array of token IDs
  sent_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
```

### Relationships

```
users (1) ←──── (M) push_tokens
  |
  └──── (M) notifications
```

---

## Configuration

### Environment Variables

```bash
# Firebase Admin SDK Configuration
FIREBASE_SERVICE_ACCOUNT='{"type":"service_account","project_id":"...","key_id":"...","private_key":"...","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}'

# Notification Topic Configuration
NOTIFICATIONS_AUTO_SUBSCRIBE_TOPICS='all,news,promotions'
NOTIFICATIONS_SUBSCRIBE_ROLE_TOPIC='true'

# Failure Threshold
NOTIFICATIONS_MAX_FAILURES='5'
NOTIFICATIONS_FAILURE_CLEANUP_DAYS='30'
```

### Config Structure (src/config/env.ts)

```typescript
export const config = {
  notifications: {
    // Topics to auto-subscribe new tokens to
    autoSubscribeTopics: process.env.NOTIFICATIONS_AUTO_SUBSCRIBE_TOPICS?.split(
      ','
    ).map(t => t.trim()) || ['all'],

    // Whether to subscribe tokens to role-based topics (e.g., role_user)
    subscribeRoleTopic:
      process.env.NOTIFICATIONS_SUBSCRIBE_ROLE_TOPIC === 'true' ? true : false,

    // Max failures before marking token invalid
    maxFailures: parseInt(process.env.NOTIFICATIONS_MAX_FAILURES || '5'),

    // Days before cleaning up old invalid tokens
    failureCleanupDays: parseInt(
      process.env.NOTIFICATIONS_FAILURE_CLEANUP_DAYS || '30'
    ),
  },
};
```

### Configuration Examples

**Scenario 1: Only broadcast to all users**

```bash
NOTIFICATIONS_AUTO_SUBSCRIBE_TOPICS='all'
NOTIFICATIONS_SUBSCRIBE_ROLE_TOPIC='false'
```

**Scenario 2: Different topics by category + role-based**

```bash
NOTIFICATIONS_AUTO_SUBSCRIBE_TOPICS='all,news,promotions,critical'
NOTIFICATIONS_SUBSCRIBE_ROLE_TOPIC='true'
```

**Scenario 3: Role-based only (no global broadcasts)**

```bash
NOTIFICATIONS_AUTO_SUBSCRIBE_TOPICS=''
NOTIFICATIONS_SUBSCRIBE_ROLE_TOPIC='true'
```

---

## Error Handling

### Firebase API Errors

```typescript
// FirebaseService.subscribeTokenToTopic()
try {
  await admin.messaging().subscribeToTopic([token], topic);
} catch (error) {
  // Common errors:
  // - Invalid token format
  // - Token expired
  // - Firebase quota exceeded
  // - Network error

  logger.error('Topic subscription failed', {
    code: error.code,
    message: error.message,
    token: token.slice(-10),
    topic,
  });
  // Non-blocking: error logged but doesn't fail token registration
}
```

### Token Invalidation Error Handling

```typescript
// When sending fails repeatedly
await NotificationModel.updateTokenStatus({
  token_id,
  status: 'invalid',
  failure_reason: 'Too many send failures',
});

// This triggers unsubscribe from all topics
// If unsubscribe fails, it's logged but not thrown
```

### Graceful Degradation

```
Try to subscribe token to topic
    |
    ├─ Success
    |  └─ Continue
    |
    └─ Failure
       ├─ Log error with context
       ├─ Don't block user registration
       ├─ Token still in system (can retry)
       └─ Manual retry via admin tools
```

---

## Testing

### Unit Test: Token Registration with Topic Subscription

```typescript
describe('NotificationService.registerPushToken', () => {
  it('should subscribe to configured topics and role topic', async () => {
    // Arrange
    const tokenData = {
      userId: 'user-1',
      token: 'fcm-token-abc123',
      platform: 'web',
    };

    // Mock config
    jest.mocked(config).notifications = {
      autoSubscribeTopics: ['all', 'news'],
      subscribeRoleTopic: true,
    };

    // Mock user lookup
    jest.mocked(db).mockResolvedValue({
      where: () => ({
        first: async () => ({ id: 'user-1', role: 'user' }),
      }),
    });

    // Act
    await NotificationService.registerPushToken(tokenData);

    // Assert
    const subscribeMock = jest.mocked(FirebaseService.subscribeTokenToTopic);

    // Verify subscribed to: all, news, role_user
    expect(subscribeMock).toHaveBeenCalledWith('fcm-token-abc123', 'all');
    expect(subscribeMock).toHaveBeenCalledWith('fcm-token-abc123', 'news');
    expect(subscribeMock).toHaveBeenCalledWith('fcm-token-abc123', 'role_user');
  });
});
```

### Integration Test: Complete Flow

```typescript
describe('Notification Flow Integration', () => {
  it('should register token, subscribe to topics, and allow sending', async () => {
    // 1. Register user
    const user = await User.create({ email: 'test@example.com' });

    // 2. Register token
    const tokenData = {
      userId: user.id,
      token: 'real-fcm-token',
      platform: 'web',
    };
    await NotificationService.registerPushToken(tokenData);

    // 3. Verify subscribed in Firebase
    const topicMembers = await admin.messaging().getTopicManagement('all');
    expect(topicMembers.tokens).toContain('real-fcm-token');

    // 4. Send notification
    const result = await NotificationService.createAndSend({
      title: 'Test',
      body: 'Message',
      topic: 'all',
    });

    expect(result.successCount).toBeGreaterThan(0);
  });
});
```

---

## Summary: Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ Complete Notification System Flow                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 1. CLIENT REGISTRATION                                    │
│    Mobile/Web App gets FCM token from Firebase            │
│    POST /api/notifications/register-token                 │
│    { token, platform }                                    │
│         │                                                 │
│         v                                                 │
│ 2. CONTROLLER VALIDATION                                  │
│    NotificationController.registerToken()                 │
│    Validates input, extracts userId from auth            │
│         │                                                 │
│         v                                                 │
│ 3. SERVICE LOGIC                                          │
│    NotificationService.registerPushToken()               │
│    - Calls NotificationModel.registerPushToken()         │
│    - Queries user role from DB                           │
│    - Reads config for topics                             │
│    - Builds topic list (global + role-based)             │
│         │                                                 │
│         v                                                 │
│ 4. DATABASE STORAGE                                       │
│    NotificationModel inserts into push_tokens table      │
│    Records: id, user_id, token, platform, status        │
│         │                                                 │
│         v                                                 │
│ 5. TOPIC SUBSCRIPTION (ASYNC)                             │
│    FirebaseService.subscribeTokenToTopic()               │
│    For each topic: admin.messaging().subscribeToTopic()  │
│    Fire-and-forget: errors logged but don't block        │
│         │                                                 │
│         v                                                 │
│ 6. FIREBASE TOPICS TABLE UPDATED                          │
│    FCM maintains topic membership internally              │
│    Token linked to: ['all', 'news', 'role_user']         │
│         │                                                 │
│         v                                                 │
│ 7. READY FOR SENDING                                      │
│    Client receives: { success: true }                    │
│    Token is subscribed and ready                         │
│         │                                                 │
│         └─────────────────────────────────────────┐       │
│                                                  │       │
│ 8. NOTIFICATION SENDING (Later)                  │       │
│    NotificationService.createAndSend()           │       │
│    - Create notification record                  │       │
│    - Determine targets (topic or specific users) │       │
│         │                                         │       │
│         v                                         │       │
│    FirebaseService.sendMulticastPushNotification()        │
│    admin.messaging().sendEachForMulticast()              │
│    Sends to: all, news, role_user topics                │
│         │                                         │       │
│         v                                         │       │
│    SUCCESS / FAILURE TRACKING                    │       │
│    - Log sent_count, failure_count               │       │
│    - If failures > threshold:                    │       │
│        Mark token as invalid                     │       │
│        Unsubscribe from all topics               │       │
│         │                                         │       │
│         v                                         │       │
│    Update Database                               │       │
│    - push_tokens: status, failure_count          │       │
│    - notifications: sent_count, failure_count    │       │
│         │                                         │       │
│         v                                         │       │
│ 9. CLIENT RECEIVES MESSAGE                       │       │
│    Service Worker intercepts FCM message         │       │
│    Displays notification to user                 │       │
│                                                  │       │
└──────────────────────────────────────────────────────────┘
```

---

## Key Takeaways

1. **Async Architecture**: Topic subscriptions are fire-and-forget, improving registration speed
2. **Configuration-Driven**: Topics are configured via env vars, not hardcoded
3. **Auto-Cleanup**: Invalid tokens are automatically unsubscribed from topics
4. **Scalable Broadcasting**: Topics enable millions of users to receive messages in a single API call
5. **Error Resilience**: Failures in subscription don't block token registration
6. **Role-Based Targeting**: Role topics enable message filtering without custom code changes

---

## Additional Resources

- [Firebase Cloud Messaging Documentation](https://firebase.google.com/docs/cloud-messaging)
- [FCM Topic Management](https://firebase.google.com/docs/cloud-messaging/manage-topics)
- [Push Notifications Best Practices](./notification-system-enhancements.md)
- [Testing Guide](./testing-plan.md)
