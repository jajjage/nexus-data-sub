# Admin Analytics & User Activity Monitoring - Requirements Document

**Status:** Planning & Analysis
**Date:** December 12, 2025
**Priority Level:** MEDIUM (Nice-to-Have features included, Critical features prioritized)

---

## Executive Summary

The admin dashboard currently has **minimal analytics capabilities**. While admin controllers exist for user management (CRUD operations), there is **NO comprehensive analytics engine** to track platform activities, user behaviors, transactions, and system health.

This document outlines:

1. ✅ **What EXISTS** - Current analytics endpoints
2. ❌ **What's MISSING** - Critical gaps
3. 📋 **What's OPTIONAL** - Nice-to-have features
4. 🎯 **CRITICAL Implementation Plan** - Phase 1 (MVP)

---

## Part 1: WHAT EXISTS TODAY

### Current Dashboard Endpoints

#### 1. Basic Dashboard Stats

**Endpoint:** `GET /api/v1/admin/dashboard/stats`
**Controller:** `AdminController.getDashboardStats()`
**Data Returned:**

```json
{
  "totalUsers": 150,
  "totalTransactions": 480,
  "totalTopupRequests": 95
}
```

**Issue:** ⚠️ **BARE MINIMUM** - No timestamps, no trends, no breakdowns

---

#### 2. Failed Background Jobs

**Endpoint:** `GET /api/v1/admin/dashboard/failed-jobs`
**Controller:** `AdminController.getFailedJobs()`
**Paginated:** Yes (page, limit)
**Data Tracked:** Job failures
**Status:** ✅ GOOD - Useful for debugging

---

#### 3. Notification Analytics

**Endpoint:** `GET /api/v1/admin/notifications/{notificationId}/analytics`
**Controller:** `NotificationAnalyticsController.getAnalyticsByNotificationId()`
**Data:** sent, delivered, opened, failed counts
**Status:** ✅ GOOD - Notification-specific tracking

---

#### 4. User Management (Activity-Related)

| Endpoint                         | Method | Purpose        | Analytics?                |
| -------------------------------- | ------ | -------------- | ------------------------- |
| `/admin/users`                   | GET    | List all users | ❌ No analytics           |
| `/admin/users/{userId}`          | GET    | User details   | ❌ No analytics           |
| `/admin/users/inactive`          | GET    | Inactive users | ✅ Some activity tracking |
| `/admin/users/{userId}/sessions` | GET    | User sessions  | ✅ Activity tracking      |

---

### What IS Being Tracked (In Database)

**Existing tables with activity data:**

- `users` - User status, verification, suspension
- `transactions` - All financial movements
- `topup_requests` - Topup history
- `notifications` - Sent notifications
- `notification_analytics` - Notification delivery metrics
- `push_tokens` - Device registration
- `user_notifications` - Read/delete status
- `sessions` - User login sessions
- `jobs` - Background job status
- `wallet_transactions` - Wallet movements
- `referrals` - Referral program activity
- `offers` - Offer interactions
- `rewards` - User rewards (points, badges)
- `chats` - User communication

---

## Part 2: WHAT'S MISSING (Critical Gaps)

### ❌ CRITICAL MISSING ANALYTICS

#### 1. User Activity Analytics

**Missing Endpoints:**

- `GET /api/v1/admin/analytics/users/active-users` - Daily/weekly active users
- `GET /api/v1/admin/analytics/users/new-users` - New user registrations (by date)
- `GET /api/v1/admin/analytics/users/retention` - User retention rates
- `GET /api/v1/admin/analytics/users/engagement` - Engagement metrics

**Why Critical:**
Admin needs to understand user growth, retention, and engagement trends

---

#### 2. Transaction Analytics

**Missing Endpoints:**

- `GET /api/v1/admin/analytics/transactions/overview` - Total volume, value, trends
- `GET /api/v1/admin/analytics/transactions/by-status` - Success vs failed breakdown
- `GET /api/v1/admin/analytics/transactions/by-type` - Topup vs Transfers vs Settlements
- `GET /api/v1/admin/analytics/transactions/daily-volume` - Daily transaction counts

**Why Critical:**
Core business metric - admin must monitor transaction health

---

#### 3. Revenue/Wallet Analytics

**Missing Endpoints:**

- `GET /api/v1/admin/analytics/wallet/total-balance` - Total platform balance
- `GET /api/v1/admin/analytics/wallet/daily-activity` - Deposits vs Withdrawals
- `GET /api/v1/admin/analytics/wallet/top-users` - Largest wallet holders
- `GET /api/v1/admin/analytics/wallet/movements` - Cash flow patterns

**Why Critical:**
Financial oversight - mandatory for compliance and auditing

---

#### 4. Topup Analytics

**Missing Endpoints:**

- `GET /api/v1/admin/analytics/topup/volume` - Total topup count/value
- `GET /api/v1/admin/analytics/topup/by-operator` - Breakdown by provider
- `GET /api/v1/admin/analytics/topup/success-rate` - Success vs failure rates
- `GET /api/v1/admin/analytics/topup/refunds` - Refund tracking

**Why Critical:**
Operational metric - tracks core service usage

---

#### 5. System Health Dashboard

**Missing Endpoints:**

- `GET /api/v1/admin/analytics/system/errors` - Error rates/types
- `GET /api/v1/admin/analytics/system/api-performance` - Response times
- `GET /api/v1/admin/analytics/system/webhook-status` - Webhook success rates
- `GET /api/v1/admin/analytics/system/job-health` - Job queue status

**Why Critical:**
Ops/DevOps needs to monitor system stability

---

#### 6. Notification Delivery Analytics

**Missing Endpoints:**

- `GET /api/v1/admin/analytics/notifications/delivery-rate` - Overall delivery %
- `GET /api/v1/admin/analytics/notifications/engagement` - Click-through, open rates
- `GET /api/v1/admin/analytics/notifications/send-volume` - Daily send counts
- `GET /api/v1/admin/analytics/notifications/by-category` - Performance by type

**Why Critical:**
Product team needs to understand notification effectiveness

---

#### 7. Rewards/Cashback Analytics

**Missing Endpoints:**

- `GET /api/v1/admin/analytics/rewards/total-distributed` - Total points/cashback given
- `GET /api/v1/admin/analytics/rewards/by-type` - Breakdown (referral, transaction, etc.)
- `GET /api/v1/admin/analytics/rewards/redemption-rate` - How many points redeemed

**Why Optional:**
Nice for tracking loyalty program health

---

#### 8. Offer Performance Analytics

**Missing Endpoints:**

- `GET /api/v1/admin/analytics/offers/performance` - Offer success rates
- `GET /api/v1/admin/analytics/offers/redemptions` - Redemption tracking
- `GET /api/v1/admin/analytics/offers/roi` - Return on investment

**Why Optional:**
Marketing team metric - not critical for operations

---

### ⚠️ PARTIALLY IMPLEMENTED

#### Referral Analytics

**Status:** User-facing endpoints exist (good for users)

- `GET /api/v1/dashboard/referrals` - Personal referral stats
- `GET /api/v1/dashboard/referrals/link/stats` - Link usage

**Missing:** Admin-level referral analytics

- `GET /api/v1/admin/analytics/referrals/overview` - Total referral program performance
- `GET /api/v1/admin/analytics/referrals/top-referrers` - Best performing users

---

## Part 3: CRITICAL PHASE 1 (MVP) IMPLEMENTATION PLAN

### Focus: Core business metrics that MUST be visible to admin

---

### **PHASE 1A: Database Preparation**

#### New Table: `analytics_snapshots` (Daily aggregated data)

```sql
CREATE TABLE analytics_snapshots (
  id UUID PRIMARY KEY,
  snapshot_date DATE NOT NULL,

  -- User metrics
  total_users INTEGER,
  new_users_count INTEGER,
  active_users_count INTEGER,
  suspended_users_count INTEGER,

  -- Transaction metrics
  total_transactions INTEGER,
  total_transaction_value DECIMAL(15,2),
  successful_transactions INTEGER,
  failed_transactions INTEGER,
  average_transaction_amount DECIMAL(15,2),

  -- Topup metrics
  total_topups INTEGER,
  total_topup_value DECIMAL(15,2),
  successful_topups INTEGER,
  failed_topups INTEGER,

  -- Wallet metrics
  total_wallet_balance DECIMAL(15,2),

  -- Error tracking
  error_count INTEGER,
  warning_count INTEGER,

  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(snapshot_date)
);

CREATE INDEX idx_analytics_snapshots_date ON analytics_snapshots(snapshot_date);
```

**Purpose:** Pre-aggregated daily data for fast queries

---

#### New Table: `admin_audit_log` (Track admin actions)

```sql
CREATE TABLE admin_audit_log (
  id UUID PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES users(id),
  action_type VARCHAR(50), -- 'credit_wallet', 'suspend_user', etc.
  target_user_id UUID REFERENCES users(id),
  old_value TEXT,
  new_value TEXT,
  reason TEXT,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_admin ON admin_audit_log(admin_id);
CREATE INDEX idx_audit_action ON admin_audit_log(action_type);
CREATE INDEX idx_audit_created ON admin_audit_log(created_at);
```

**Purpose:** Compliance, audit trail, admin accountability

---

#### New Table: `system_health_metrics`

```sql
CREATE TABLE system_health_metrics (
  id UUID PRIMARY KEY,
  metric_type VARCHAR(50), -- 'api_response_time', 'error_rate', 'webhook_failure'
  metric_value DECIMAL(10,2),
  threshold_alert DECIMAL(10,2),
  is_alert BOOLEAN DEFAULT FALSE,
  recorded_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_health_type ON system_health_metrics(metric_type);
CREATE INDEX idx_health_recorded ON system_health_metrics(recorded_at);
```

**Purpose:** Real-time system monitoring

---

### **PHASE 1B: Core Analytics Endpoints (Critical)**

#### 1. User Activity Dashboard

```
Endpoint: GET /api/v1/admin/analytics/users/overview
Query Params: from_date, to_date (optional)
Response: {
  totalUsers: 150,
  newUsersThisMonth: 23,
  newUsersThisWeek: 8,
  activeUsersThisWeek: 89,
  suspendedUsers: 5,
  trends: {
    userGrowthRate: "5.2%",
    weekOverWeek: "+12 users"
  }
}
```

---

#### 2. Transaction Analytics

```
Endpoint: GET /api/v1/admin/analytics/transactions/overview
Query Params: from_date, to_date, groupBy (daily/weekly)
Response: {
  totalTransactions: 480,
  totalValue: 125000.50,
  successRate: "94.8%",
  averageAmount: 260.42,
  breakdownByStatus: {
    successful: 455,
    failed: 15,
    pending: 10
  },
  dailyTrend: [
    { date: "2025-12-01", count: 45, value: 12000 },
    ...
  ]
}
```

---

#### 3. Topup Analytics

```
Endpoint: GET /api/v1/admin/analytics/topup/overview
Response: {
  totalTopups: 95,
  totalValue: 45000.00,
  successRate: "92.6%",
  averageAmount: 473.68,
  byOperator: {
    "MTN": 45,
    "Airtel": 30,
    "Glo": 20
  },
  topOperator: "MTN (47.4%)"
}
```

---

#### 4. Wallet Balance Overview

```
Endpoint: GET /api/v1/admin/analytics/wallet/overview
Response: {
  totalBalance: 125000.50,
  totalDeposits: 500000.00,
  totalWithdrawals: 375000.00,
  netMovement: 125000.00,
  topHolders: [
    { userId: "...", email: "...", balance: 5000 },
    ...
  ]
}
```

---

#### 5. System Health Status

```
Endpoint: GET /api/v1/admin/analytics/system/health
Response: {
  status: "healthy",
  checks: {
    apiResponseTime: { value: 145, unit: "ms", status: "ok" },
    errorRate: { value: 0.02, unit: "%", status: "ok" },
    jobQueueHealth: { value: 12, unit: "pending", status: "warning" },
    webhookFailureRate: { value: 1.5, unit: "%", status: "ok" }
  },
  recentAlerts: [...]
}
```

---

### **PHASE 1C: Admin Audit Logging**

#### Track All Admin Actions

When admin performs:

- Credit/Debit wallet
- Suspend/Unsuspend user
- Assign role
- Disable 2FA
- Etc.

**Log Entry Created:**

```
{
  admin_id: "...",
  action_type: "credit_wallet",
  target_user_id: "...",
  amount: 100,
  reason: "Compensation for failed topup",
  created_at: "..."
}
```

---

### **PHASE 1D: New Services & Models**

#### `AnalyticsService`

```typescript
class AnalyticsService {
  // User metrics
  static async getUserOverview(from, to);
  static async getNewUsersCount(from, to);
  static async getActiveUsersCount(from, to);

  // Transaction metrics
  static async getTransactionOverview(from, to);
  static async getTransactionTrends(groupBy);
  static async getSuccessRate();

  // Topup metrics
  static async getTopupOverview(from, to);
  static async getTopupByOperator();

  // Wallet metrics
  static async getTotalBalance();
  static async getWalletMovements(from, to);

  // System health
  static async getSystemHealth();
  static async getRecentErrors();
}
```

#### `AuditLogService`

```typescript
class AuditLogService {
  static async logAdminAction(adminId, action, details);
  static async getAuditLog(filters);
  static async getAdminActivityHistory(adminId);
}
```

#### `AnalyticsModel`

```typescript
class AnalyticsModel {
  static async getSnapshot(date);
  static async getSnapshotRange(from, to);
  static async createSnapshot(data);
}
```

---

### **PHASE 1E: New Routes**

#### `admin-analytics.routes.ts`

```typescript
router.get('/analytics/users/overview', ...)
router.get('/analytics/transactions/overview', ...)
router.get('/analytics/topup/overview', ...)
router.get('/analytics/wallet/overview', ...)
router.get('/analytics/system/health', ...)
router.get('/analytics/audit-log', ...)
```

---

### **PHASE 1F: Controllers**

#### `AdminAnalyticsController`

```typescript
class AdminAnalyticsController {
  static async getUserAnalytics(req, res);
  static async getTransactionAnalytics(req, res);
  static async getTopupAnalytics(req, res);
  static async getWalletAnalytics(req, res);
  static async getSystemHealth(req, res);
  static async getAuditLog(req, res);
}
```

---

### **PHASE 1G: Unit & Integration Tests**

#### Test Files Needed:

1. `jest/__tests__/unit/services/analytics.service.test.ts` (10+ tests)
2. `jest/__tests__/unit/models/analytics.model.test.ts` (8+ tests)
3. `jest/__tests__/integration/admin-analytics.test.ts` (15+ tests)
4. `jest/__tests__/integration/admin-audit-log.test.ts` (10+ tests)

---

## Part 4: OPTIONAL ENHANCEMENTS (Phase 2+)

### 🟡 NICE-TO-HAVE (Not Critical)

1. **Notification Engagement Analytics**
   - Open rates, click-through rates
   - Time-to-open metrics

2. **Reward Program Analytics**
   - Total points distributed
   - Redemption rates
   - Most popular rewards

3. **Offer Performance Metrics**
   - Offer views, conversions
   - ROI calculations

4. **Chat Analytics**
   - Message volume
   - Response times
   - User satisfaction

5. **Advanced Reporting**
   - Export to CSV/PDF
   - Scheduled email reports
   - Custom date ranges

6. **Real-time Alerts**
   - Transaction spike alerts
   - Error rate warnings
   - Suspicious activity detection

7. **Historical Data Retention**
   - Archive old analytics
   - Long-term trend analysis

---

## Part 5: DEVELOPMENT CHECKLIST (Critical Phase 1)

### Database & Migrations

- [ ] Create `analytics_snapshots` table
- [ ] Create `admin_audit_log` table
- [ ] Create `system_health_metrics` table
- [ ] Add indexes for performance
- [ ] Migration file with rollback

### Models

- [ ] `AnalyticsModel` class with methods
- [ ] `AuditLogModel` class with methods
- [ ] Unit tests for both models

### Services

- [ ] `AnalyticsService` with all query methods
- [ ] `AuditLogService` for logging admin actions
- [ ] Modify existing services to log actions
- [ ] Unit tests for services

### Controllers

- [ ] `AdminAnalyticsController` (6 methods)
- [ ] Integration with existing `AdminController`

### Routes

- [ ] New `admin-analytics.routes.ts` file
- [ ] Proper RBAC permissions
- [ ] Swagger documentation

### Tests

- [ ] Unit tests: Models (8+)
- [ ] Unit tests: Services (12+)
- [ ] Integration tests: Endpoints (15+)
- [ ] Audit log integration tests (10+)
- [ ] **Total: 45+ tests**

### Documentation

- [ ] Update API_DOCUMENTATION.md
- [ ] Create ADMIN_ANALYTICS_GUIDE.md
- [ ] Document all endpoints
- [ ] Add example queries

---

## Part 6: ESTIMATED EFFORT

### Timeline (if done sequentially)

| Task                        | Hours        | Days        |
| --------------------------- | ------------ | ----------- |
| Database design & migration | 4            | 0.5         |
| Models implementation       | 6            | 0.75        |
| Services implementation     | 8            | 1           |
| Controllers & Routes        | 6            | 0.75        |
| Unit tests                  | 10           | 1.25        |
| Integration tests           | 8            | 1           |
| Documentation               | 4            | 0.5         |
| **TOTAL**                   | **46 hours** | **~6 days** |

### Parallelizable Tasks

- Database migration can start immediately
- Tests can be written in parallel with services
- Documentation can be drafted early

---

## Part 7: CRITICAL PERMISSIONS NEEDED

Add to RBAC `rbac.ts`:

```typescript
// Analytics permissions
'analytics.read' - View analytics
'analytics.view_users' - User analytics
'analytics.view_transactions' - Transaction analytics
'analytics.view_system' - System health

// Audit permissions
'audit.view_log' - View audit trail
'audit.export' - Export audit logs
```

---

## Part 8: PRIORITY RANKING

### 🔴 MUST HAVE (Blocking)

1. Transaction analytics
2. User activity overview
3. Admin audit log
4. System health dashboard
5. Wallet balance tracking

### 🟡 SHOULD HAVE (Important)

1. Topup analytics
2. Notification delivery rates
3. Audit log export

### 🟢 NICE-TO-HAVE (Enhancement)

1. Reward analytics
2. Real-time alerts
3. Email reports
4. Advanced filtering

---

## Part 9: IMPLEMENTATION STRATEGY

### Recommended Approach

1. **Start with Phase 1A (Database)** - Foundation
2. **Build Models** - Data access layer
3. **Build Services** - Business logic
4. **Build Controllers** - API handlers
5. **Write Tests** - Ensure quality
6. **Document** - API reference

### Quick Wins First

- Implement `analytics_snapshots` table with daily job
- Add audit logging to existing admin actions (30 mins)
- Create basic analytics endpoints (3-4 hours)

### Can Be Done Later

- Real-time system health monitoring
- Advanced filtering and grouping
- Email reports and exports
- Predictive analytics

---

## Conclusion

**Current State:** Admin has CRUD operations for users but NO analytics visibility

**Phase 1 Goal:** Provide essential business metrics for informed decision-making

**Critical** for: Financial oversight, operational health, user growth tracking

**Timeline:** ~6 days of development (46 hours)

**ROI:** High - enables data-driven admin decisions
