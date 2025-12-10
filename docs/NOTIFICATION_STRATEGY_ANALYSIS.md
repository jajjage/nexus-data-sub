# Notification Storage Strategy: Comparison & Real-World Analysis

## The Question: Do we need 100k rows in user_notifications?

### Approach 1: Create Rows for Each User (Current Design)

```
1 notification in DB
↓
100,000 rows created in user_notifications table
├─ notification_id: "notif-123"
├─ user_id: "user-1"
├─ read: false
├─ read_at: null
├─ ...repeat 100,000 times
```

**Pros:**

- ✅ Easy to track read/unread per user
- ✅ Fast queries: `SELECT * FROM user_notifications WHERE user_id=? AND read=false`
- ✅ User can delete notifications individually
- ✅ Clear per-user state

**Cons:**

- ❌ Storage overhead: 100k rows × ~100 bytes = 10MB per notification
- ❌ Slow batch insert on high volume
- ❌ Database bloat over time

**Real-world scale (WhatsApp, Telegram, etc):**

- WhatsApp: Does NOT create rows - uses preference-based filtering
- Facebook: Uses mix - tracks engagement separately
- Gmail: Creates thread entries only if user interacted
- Slack: Similar to WhatsApp

---

### Approach 2: Preference-Based Filtering (What You're Suggesting)

```
Single notification in DB:
├─ id: "notif-123"
├─ title: "Special Offer"
├─ body: "30% off"
├─ category: "marketing"
├─ type: "success"
├─ target_criteria: {...}
└─ created_at: 2025-12-10T10:00:00Z

When user opens notifications page:
├─ Query: Get all notifications created after user's last login
├─ Filter by: user_notification_preferences
│  └─ WHERE category IN (user's subscribed categories)
├─ Combine with: user_notification_read_status (if user interacted)
└─ Show only matching notifications
```

**Pros:**

- ✅ Zero storage overhead
- ✅ Scales infinitely (1 row in DB = all users see it)
- ✅ Fast inserts (insert 1 row, not 100k)
- ✅ Real-world standard for large platforms

**Cons:**

- ❌ Need separate table for "read" tracking
- ❌ More complex query logic
- ❌ Need to track last_checked_at per user

---

## Real-World Analysis

### WhatsApp/Telegram Model (100M+ users)

```
Broadcast Message:
├─ Single row in messages table
├─ Firebase push sent to all subscribed users
├─ NO rows created in messages_users table
│
When user opens app:
├─ Check: notifications_preferences table
│  └─ Does user have this channel/group muted?
├─ Check: notification_read_status table (if important)
│  └─ Only for tracking deliveries, not displaying
└─ Show notification if preferences allow
```

**Why?** Creating 100M rows would:

- Require 100GB+ storage per message
- Slow down database to a crawl
- Make inserts take minutes

---

### Hybrid Approach (Best for Your Scale)

**Recommended for 100k-1M users:**

```
Table: notifications
├─ id: UUID
├─ title: string
├─ body: string
├─ type: enum (info|success|warning|error|alert)
├─ category: string (marketing|security|updates|etc)
├─ target_criteria: JSONB (for filtering)
├─ created_at: timestamp
└─ expires_at: timestamp (auto-delete old ones)

Table: user_notification_preferences
├─ user_id: UUID
├─ category: string
├─ subscribed: boolean
├─ muted: boolean
├─ created_at: timestamp
└─ UNIQUE(user_id, category)

Table: user_notification_read_status (ONLY for important tracking)
├─ user_id: UUID
├─ notification_id: UUID
├─ read: boolean
├─ read_at: timestamp
├─ deleted: boolean
├─ UNIQUE(user_id, notification_id)
└─ Only insert when:
   ├─ User marks as read manually
   ├─ User deletes notification
   └─ Important/critical notifications (not all)
```

---

## The Query Flow (Hybrid Approach)

### When User Opens Notifications Page

```sql
-- Step 1: Get user's subscribed categories
SELECT category FROM user_notification_preferences
WHERE user_id = ? AND subscribed = true;
-- Result: ['marketing', 'updates', 'security']

-- Step 2: Get recent notifications matching preferences
SELECT n.*,
       COALESCE(r.read, false) AS read,
       r.read_at,
       COALESCE(r.deleted, false) AS deleted
FROM notifications n
LEFT JOIN user_notification_read_status r
  ON n.id = r.notification_id AND r.user_id = ?
WHERE n.category IN ('marketing', 'updates', 'security')
  AND n.created_at > NOW() - INTERVAL '30 days'
  AND n.expires_at > NOW()
  AND (r.deleted IS NULL OR r.deleted = false)
ORDER BY n.created_at DESC
LIMIT 50;
```

**Result:**

```
Notification 1:
├─ title: "Special Offer"
├─ category: "marketing"
├─ type: "success"
├─ read: false (from LEFT JOIN)
└─ read_at: null

Notification 2:
├─ title: "Security Alert"
├─ category: "security"
├─ type: "warning"
├─ read: true (from LEFT JOIN)
└─ read_at: "2025-12-10T11:30:00Z"
```

---

## Storage Comparison

### Scenario: 100k users, 10 notifications per day

**Approach 1 (Per-User Rows):**

```
Day 1: 10 notifications × 100k users = 1,000,000 rows
Day 2: 1,000,000 + 1,000,000 = 2,000,000 rows
Month 1: 30 days × 1,000,000 = 30,000,000 rows
Year 1: 365 × 1,000,000 = 365,000,000 rows
Size: ~36GB just for tracking!
```

**Approach 2 (Hybrid):**

```
Day 1: 10 notifications
Day 2: 20 notifications
Month 1: 300 notifications
Year 1: 3,650 notifications
+ Tracking for ~5% read/deleted: 182,500 rows
Total Size: ~50MB (with tracking)
```

**Storage saved: 99.8%** ✓

---

## Which Should You Use?

### Use Approach 1 (Full Per-User Rows) IF:

- ✅ You have < 10k users
- ✅ You want simplest code (no complex queries)
- ✅ User tracking is critical (every click matters)
- ✅ App is internal/enterprise only

### Use Approach 2 (Hybrid) IF:

- ✅ You have 10k+ users
- ✅ You want to scale to millions
- ✅ You're building a real-world app
- ✅ Storage efficiency matters
- ✅ Most users don't interact with every notification

**For your app:** You should use **Approach 2 (Hybrid)** because:

1. You're building a real-world system
2. You want to scale
3. Preference-based filtering is standard
4. You still track read/delete for power users

---

## Implementation Plan for Hybrid Approach

### Step 1: Keep Current Tables

```
✓ notifications - already exists
✓ user_notification_preferences - already exists
```

### Step 2: Modify user_notifications Usage

Instead of creating rows for ALL users, create rows ONLY when:

- User marks notification as read (interaction)
- User deletes notification (explicit action)
- Notification is flagged as "critical" (security alerts, payment failures)
- User needs to retain history (premium feature)

### Step 3: Update Queries

**Getting user's notifications:**

```typescript
async getUserNotifications(userId: string, limit: number = 50) {
  // Get user's preferences
  const prefs = await db('user_notification_preferences')
    .where({ user_id: userId, subscribed: true })
    .select('category');

  const categories = prefs.map(p => p.category);

  // Get matching notifications
  const notifications = await db('notifications as n')
    .leftJoin('user_notification_read_status as r', (join) => {
      join.on('n.id', '=', 'r.notification_id')
        .andOn('r.user_id', '=', userId);
    })
    .whereIn('n.category', categories)
    .where('n.expires_at', '>', db.fn.now())
    .where(function() {
      this.where('r.deleted', '!=', true)
        .orWhereNull('r.deleted');
    })
    .orderBy('n.created_at', 'desc')
    .limit(limit)
    .select(
      'n.*',
      db.raw('COALESCE(r.read, false) as read'),
      'r.read_at',
      'r.deleted'
    );

  return notifications;
}
```

### Step 4: Mark as Read (Create Row Only When User Acts)

```typescript
async markAsRead(notificationId: string, userId: string) {
  // Insert/update only when user explicitly marks as read
  await db('user_notification_read_status')
    .insert({
      id: uuidv4(),
      notification_id: notificationId,
      user_id: userId,
      read: true,
      read_at: new Date(),
    })
    .onConflict(['notification_id', 'user_id'])
    .merge({ read: true, read_at: new Date() });
}
```

### Step 5: Delete Notification (Soft Delete)

```typescript
async deleteNotification(notificationId: string, userId: string) {
  // Soft delete - user won't see it, but keep record
  await db('user_notification_read_status')
    .insert({
      id: uuidv4(),
      notification_id: notificationId,
      user_id: userId,
      deleted: true,
    })
    .onConflict(['notification_id', 'user_id'])
    .merge({ deleted: true });
}
```

### Step 6: Get Unread Count

```typescript
async getUnreadCount(userId: string): Promise<number> {
  const prefs = await db('user_notification_preferences')
    .where({ user_id: userId, subscribed: true })
    .select('category');

  const categories = prefs.map(p => p.category);

  const result = await db('notifications as n')
    .leftJoin('user_notification_read_status as r', (join) => {
      join.on('n.id', '=', 'r.notification_id')
        .andOn('r.user_id', '=', userId);
    })
    .whereIn('n.category', categories)
    .where('n.expires_at', '>', db.fn.now())
    .where(function() {
      this.where('r.read', '!=', true)
        .andWhere(function() {
          this.where('r.deleted', '!=', true)
            .orWhereNull('r.deleted');
        })
        .orWhereNull('r.id'); // No row = unread
    })
    .count('DISTINCT n.id as count')
    .first();

  return parseInt(result?.count as string) || 0;
}
```

---

## Firebase Integration with Hybrid Approach

```
Admin sends notification:
├─ 1. Insert into notifications table
├─ 2. Send Firebase push to ALL tokens (no filtering)
│  └─ Firebase handles who's subscribed to topic
├─ 3. No bulk user_notifications insert needed!
│
User opens app:
├─ Receives push (because subscribed to that topic)
├─ Clicks notification
├─ App queries getUserNotifications()
│  └─ Filters by preferences + shows read status
├─ Firebase shows unread count (optional)
│
User marks as read:
├─ CREATE row in user_notification_read_status
├─ Update badge count
└─ Remember state for next session
```

---

## Summary Comparison Table

| Feature             | Approach 1 (Per-User)     | Approach 2 (Hybrid)          |
| ------------------- | ------------------------- | ---------------------------- |
| Storage             | 36GB/year                 | 50MB/year                    |
| Scalability         | Up to 100k users          | Millions of users            |
| Query Speed         | Very Fast                 | Fast                         |
| Implementation      | Simple                    | Medium                       |
| Real-world Standard | No                        | Yes                          |
| Used by             | Gmail, Slack (internally) | WhatsApp, Telegram, Facebook |
| Best for            | Small apps                | Production apps              |

---

## My Recommendation

**Use Hybrid Approach (Approach 2)** because:

1. ✅ You're building for real-world scale
2. ✅ Preference-based filtering is the industry standard
3. ✅ Storage efficient (99.8% savings)
4. ✅ Still supports read/unread tracking
5. ✅ Users choose what they want (preferences)
6. ✅ Firebase does the heavy lifting

This is how the big platforms do it, and it's what you should implement!
