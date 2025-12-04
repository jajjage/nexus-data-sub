# Rewards & Referrals System - Implementation Complete

## Overview

A comprehensive rewards and referrals system has been implemented for the Nexus Data Sub platform, enabling users to earn points through referrals and achievements, collect badges, and compete on leaderboards.

---

## Database Schema & Migrations

### Migration Files Created

#### 1. `20251203000000_create_rewards_and_referrals_system.ts`

Creates the core tables for the rewards and referrals system:

**Tables:**

- `rewards` - Tracks individual reward transactions
  - Fields: id, user_id, points, reason, earned_at, status, expires_at, metadata
  - Statuses: pending, credited, expired, revoked

- `referrals` - Manages referral relationships and tracking
  - Fields: id, referrer_user_id, referred_user_id, reward_amount, status, referral_code, reward_id
  - Statuses: pending, active, completed, cancelled
  - Unique constraint: one referral per referred user

- `badges` - Defines available badges/achievements
  - Fields: id, name, description, icon, required_action, required_value, category
  - Categories: achievement, milestone, special

- `user_badges` - Junction table for user-badge relationships
  - Composite primary key: (user_id, badge_id)
  - One badge per user

#### 2. `20251203000001_add_rewards_fields_to_users.ts`

Extends the users table with reward-related fields:

- `total_points` (integer) - Aggregated points for the user
- `referral_count` (integer) - Count of successful referrals

---

## Models

### 1. `RewardModel` (`/src/models/Reward.ts`)

Handles reward operations with support for points tracking and status management.

**Key Methods:**

- `create()` - Create new reward
- `findById()` / `findByUserId()` - Query rewards
- `updateStatus()` - Change reward status
- `credit()` / `revoke()` / `expire()` - Convenience methods for status changes
- `getTotalPointsByStatus()` - Aggregate points by status
- `getSummaryByUserId()` - Get complete reward breakdown for user
- `markExpiredRewards()` - Batch process expired rewards

**Statuses:**

- `pending` - Awaiting crediting
- `credited` - Applied to user account
- `expired` - Past expiration date
- `revoked` - Cancelled/invalidated

### 2. `BadgeModel & UserBadgeModel` (`/src/models/Badge.ts`)

Manages badges and user achievement tracking.

**BadgeModel Methods:**

- `create()` - Define new badge
- `findById()` / `findByName()` - Query badges
- `findByCategory()` / `findByRequiredAction()` - Filter badges
- `update()` - Modify badge details
- `deactivate()` - Disable badge

**UserBadgeModel Methods:**

- `award()` - Give badge to user (idempotent)
- `findByUserId()` - Get user's badges with details
- `hasBadge()` - Check if user earned badge
- `countByUserId()` - Total badges earned
- `revoke()` - Remove badge
- `getUsersWithBadge()` - Leaderboard query

### 3. `ReferralModel` (`/src/models/Referral.ts`)

Manages referral relationships, tracking, and statistics.

**Key Methods:**

- `create()` - Create new referral
- `findById()` / `findByCode()` / `findByReferredId()` - Query referrals
- `findByReferrerId()` - Get referrals created by user
- `updateStatus()` - Change referral status
- `activate()` / `complete()` / `cancel()` - Status shortcuts
- `linkReward()` - Associate reward with referral
- `getStatsByReferrerId()` - Comprehensive stats for referrer
- `findPendingCompletion()` - Get referrals needing reward processing
- `getTopReferrers()` - Leaderboard query

**Statuses:**

- `pending` - Initial state
- `active` - User validated/confirmed
- `completed` - Required action done
- `cancelled` - Cancelled referral

---

## Services

### 1. `RewardsService` (`/src/services/rewards.service.ts`)

Business logic for reward operations with transactional support.

**Core Methods:**

- `getRewardsSummary(userId)` - Get points breakdown (total, pending, credited, expired, revoked)
- `getUserBadges(userId)` - List earned badges with metadata
- `getReferralStats(userId)` - Delegation to ReferralsService
- `getReferralList(userId)` - Delegation to ReferralsService

**Point Management:**

- `awardPoints(userId, amount, reason, expiresAt?, metadata?)` - Create reward
- `creditPendingPoints(userId)` - Batch credit pending rewards + update user total_points
- `revokePendingPoints(userId)` - Batch revoke pending rewards

**Badge Management:**

- `awardBadge(userId, badgeId, metadata?)` - Give badge to user
- `revokeBadge(userId, badgeId)` - Remove badge
- `userHasBadge(userId, badgeId)` - Check ownership
- `checkAndAwardBadges(userId)` - Auto-award eligible badges based on actions

**Utility Methods:**

- `expireOldRewards()` - Mark expired rewards (batch)
- `getTopPointHolders(limit)` - Leaderboard data
- `getUsersWithBadge(badgeId, limit)` - Achievement leaderboard

**Auto-Award Conditions:**

- `first_referral` - User has ≥1 completed referral
- `top_referee` - User has ≥required_value completed referrals
- `high_points` - User's total_points ≥required_value

### 2. `ReferralsService` (`/src/services/referrals.service.ts`)

Business logic for referral operations with full lifecycle management.

**Referral Management:**

- `createReferral(referrerId, referredId, rewardAmount?, referralCode?)` - Create relationship
- `getReferralList(referrerId, status?)` - Get user's referrals (pageable)
- `getReferralStats(referrerId)` - Get summary statistics
- `getReferrer(referredUserId)` - Find who referred a user

**Referral Lifecycle:**

- `activateReferral(referralId)` - Mark as active (after validation)
- `completeReferral(referralId)` - Mark as completed + increment referral_count
- `cancelReferral(referralId)` - Revert with cleanup

**Reward Processing:**

- `processReferralReward(referralId)` - Create reward for referrer (converts amount to points: $10 = 1000 points)
- `batchProcessPendingReferrals(limit)` - Batch process up to N referrals

**Utility:**

- `getTopReferrers(limit)` - Top referrers leaderboard
- `findByCode(code)` - Lookup by referral code
- `validateReferralCode(code)` - Validate code (must be pending/active)

**Code Generation:**

- Format: `USER-{UUID_PREFIX}` (e.g., `USER-A1B2C3`)

---

## Controllers

### 1. `RewardsController` (`/src/controllers/rewards.controller.ts`)

HTTP handlers for rewards endpoints.

**Endpoints:**

- `GET /api/v1/dashboard/rewards` - Get rewards summary
- `GET /api/v1/dashboard/rewards/badges` - Get user badges
- `GET /api/v1/dashboard/rewards/leaderboard?limit=10` - Top point holders
- `GET /api/v1/dashboard/badges/:badgeId/holders?limit=50` - Badge holders
- `POST /api/v1/dashboard/rewards/check-badges` - Admin: Auto-award badges (requires manage_rewards)
- `POST /api/v1/dashboard/rewards/credit-points` - Admin: Credit pending points (requires manage_rewards)

### 2. `ReferralsController` (`/src/controllers/referrals.controller.ts`)

HTTP handlers for referrals endpoints.

**Endpoints:**

- `GET /api/v1/dashboard/referrals` - Get referral statistics
- `GET /api/v1/dashboard/referrals/list?page=1&limit=20&status=pending` - Paginated list
- `POST /api/v1/dashboard/referrals` - Create new referral
- `GET /api/v1/dashboard/referrals/share` - Generate referral link
- `GET /api/v1/dashboard/referrals/leaderboard?limit=10` - Top referrers
- `POST /api/v1/dashboard/referrals/:referralId/complete` - Admin: Complete referral (requires manage_referrals)
- `POST /api/v1/dashboard/referrals/:referralId/process-reward` - Admin: Process reward (requires manage_referrals)
- `POST /api/v1/dashboard/referrals/validate-code` - Validate referral code (public)
- `POST /api/v1/dashboard/referrals/batch-process` - Admin: Batch process rewards (requires manage_referrals)

---

## API Routes

### Route File: `/src/routes/rewards.routes.ts`

All routes prefixed with `/api/v1/dashboard`

**Authentication:**

- Public routes: leaderboards, code validation
- Protected routes (authenticate middleware): user-specific endpoints
- Admin routes (hasPermission middleware): management endpoints

**Pagination Support:**

- `page` query parameter (default: 1)
- `limit` query parameter (default: 20, max: 100)
- Responses include: total, totalPages

**Rate Limiting:**

- Inherits from main API limiter (apiLimiter)
- Consider adding dedicated limiters for referral creation endpoints

---

## Database Indexing

Optimized queries with strategic indexing:

**Rewards Table:**

- `user_id` (single)
- `status` (single)
- `earned_at` (single)
- `(user_id, status)` (composite)

**Referrals Table:**

- `referrer_user_id` (single)
- `referred_user_id` (single + unique)
- `status` (single)
- `referral_code` (single)
- `(referrer_user_id, status)` (composite)

**Badges Table:**

- `required_action` (single)
- `is_active` (single)

**User Badges Table:**

- `user_id` (single)
- `badge_id` (single)
- `earned_at` (single)

---

## Best Practices Implemented

### 1. **Data Integrity**

- Transactions for complex operations
- Referential integrity with foreign keys
- Cascading deletes for cleanup
- Unique constraints to prevent duplicates

### 2. **Performance Optimization**

- Efficient indexing on frequently queried columns
- Pagination for large result sets
- Aggregation queries for statistics
- Batch operations for bulk processing

### 3. **Security**

- Authentication required for user-specific operations
- Permission checks for admin operations
- Input validation on all endpoints
- SQL injection prevention via parameterized queries

### 4. **Code Organization**

- Clear separation of concerns (Models → Services → Controllers)
- Reusable service methods
- Consistent error handling
- Comprehensive logging

### 5. **Audit Trail**

- `created_at` and `updated_at` timestamps on all major tables
- Metadata fields for contextual information
- Reason field for reward tracking

---

## Usage Examples

### Award Points to User

```typescript
import { RewardsService } from '@/services/rewards.service';

// Award 100 points for "purchase_completion"
await RewardsService.awardPoints(
  userId,
  100,
  'purchase_completion',
  new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days expiry
  { orderId: '12345' }
);

// Credit all pending points
const credited = await RewardsService.creditPendingPoints(userId);
```

### Create Referral

```typescript
import { ReferralsService } from '@/services/referrals.service';

// Create referral with reward
const referral = await ReferralsService.createReferral(
  referrerUserId,
  referredUserId,
  50.0 // $50 reward
);

// Later, after referred user completes action
await ReferralsService.completeReferral(referral.id);
await ReferralsService.processReferralReward(referral.id); // Creates reward
```

### Auto-Award Badges

```typescript
// Check and award eligible badges
const awardedBadges = await RewardsService.checkAndAwardBadges(userId);
// Checks: first_referral, top_referee, high_points conditions
```

### Get Statistics

```typescript
// User's complete picture
const summary = await RewardsService.getRewardsSummary(userId);
const badges = await RewardsService.getUserBadges(userId);
const referralStats = await ReferralsService.getReferralStats(userId);
```

---

## Future Enhancements

1. **Caching Layer**
   - Redis caching for leaderboards
   - Cache invalidation on updates
   - Session-based leaderboard snapshots

2. **Advanced Features**
   - Tiered referral rewards
   - Seasonal badge challenges
   - Points decay/expiration policies
   - Referral bonus multipliers

3. **Analytics & Reporting**
   - Referral performance metrics
   - Badge distribution analysis
   - Points earning trends
   - User engagement dashboards

4. **Gamification**
   - Achievement streaks
   - Point boosters/multipliers
   - Limited-time badges
   - Special promotions integration

5. **Integration**
   - Email notifications for milestones
   - Push notifications for achievements
   - Social sharing integrations
   - Export functionality

---

## Database Schema Diagram

```
Users (Extended)
├── total_points (INT)
├── referral_count (INT)
└── Foreign Keys to:
    ├── Rewards (1:M)
    ├── Referrals as referrer (1:M)
    ├── Referrals as referred (1:1)
    └── UserBadges (1:M)

Rewards
├── user_id (FK → Users)
├── points
├── reason
├── status
├── expires_at
└── metadata

Referrals
├── referrer_user_id (FK → Users)
├── referred_user_id (FK → Users, UNIQUE)
├── reward_id (FK → Rewards, NULLABLE)
├── reward_amount
├── status
└── referral_code (UNIQUE, NULLABLE)

Badges
├── name (UNIQUE)
├── description
├── icon
├── required_action
├── required_value
└── category

UserBadges (Junction)
├── user_id (FK → Users)
├── badge_id (FK → Badges)
├── earned_at
└── PRIMARY KEY (user_id, badge_id)
```

---

## API Response Examples

### Get Rewards Summary

```json
{
  "success": true,
  "message": "Rewards summary retrieved successfully",
  "data": {
    "userId": "user-123",
    "totalPoints": 2500,
    "pendingPoints": 500,
    "creditedPoints": 2000,
    "expiredPoints": 0,
    "revokedPoints": 0
  }
}
```

### Get Referral Stats

```json
{
  "success": true,
  "message": "Referral statistics retrieved successfully",
  "data": {
    "totalReferrals": 5,
    "activeReferrals": 2,
    "completedReferrals": 3,
    "totalRewardEarned": 150.0,
    "pendingRewardAmount": 100.0
  }
}
```

### Create Referral

```json
{
  "success": true,
  "message": "Referral created successfully",
  "data": {
    "id": "ref-456",
    "referrerUserId": "user-123",
    "referredUserId": "user-789",
    "rewardAmount": 50.0,
    "status": "pending",
    "referralCode": "USER-ABC12345",
    "createdAt": "2025-12-03T10:00:00Z"
  }
}
```

---

## Files Created/Modified

### New Files

- `/workspace/migrations/20251203000000_create_rewards_and_referrals_system.ts`
- `/workspace/migrations/20251203000001_add_rewards_fields_to_users.ts`
- `/workspace/src/models/Reward.ts`
- `/workspace/src/models/Badge.ts`
- `/workspace/src/models/Referral.ts`
- `/workspace/src/services/rewards.service.ts`
- `/workspace/src/services/referrals.service.ts`
- `/workspace/src/controllers/rewards.controller.ts`
- `/workspace/src/controllers/referrals.controller.ts`
- `/workspace/src/routes/rewards.routes.ts`

### Modified Files

- `/workspace/src/app.ts` - Added rewards routes import and registration

---

## Implementation Status

✅ Database Models & Schema
✅ Migration Files
✅ Model Classes (Reward, Badge, Referral, UserBadge)
✅ Service Classes (Rewards, Referrals)
✅ Controllers (Rewards, Referrals)
✅ API Routes
✅ Swagger Documentation
✅ Error Handling
✅ Validation
✅ Logging

### Recommended Next Steps

- [ ] Add caching layer (Redis)
- [ ] Implement rate limiting for referral endpoints
- [ ] Create admin dashboard for rewards management
- [ ] Add email/push notifications
- [ ] Write comprehensive test suite
- [ ] Performance testing and optimization
- [ ] Documentation and onboarding guide
