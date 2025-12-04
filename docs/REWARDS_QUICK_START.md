# Rewards & Referrals System - Quick Start Guide

## Overview

The complete rewards and referrals system has been successfully implemented. This guide will help you understand the key components and how to use them.

## Quick Links

- 📊 **Complete Documentation**: See `REWARDS_AND_REFERRALS_IMPLEMENTATION.md`
- 🗄️ **Database Migrations**: `/workspace/migrations/20251203*`
- 📦 **Models**: `/workspace/src/models/{Reward,Badge,Referral}.ts`
- ⚙️ **Services**: `/workspace/src/services/{rewards,referrals}.service.ts`
- 🎮 **Controllers**: `/workspace/src/controllers/{rewards,referrals}.controller.ts`
- 🛣️ **Routes**: `/workspace/src/routes/rewards.routes.ts`

## Core Components

### 1. Database Tables

#### Rewards Table

Tracks individual point awards with flexible metadata.

```sql
SELECT * FROM rewards
WHERE user_id = 'user-123'
AND status = 'pending';
```

#### Referrals Table

Manages referrer-referred user relationships with status tracking.

```sql
SELECT * FROM referrals
WHERE referrer_user_id = 'user-123'
AND status IN ('active', 'completed');
```

#### Badges Table

Defines available achievements/badges in the system.

#### User Badges Table

Junction table linking users to earned badges.

### 2. Running Migrations

```bash
# Apply migrations
npm run migrate:latest

# Rollback last migration
npm run migrate:rollback
```

## API Endpoints

### Rewards Endpoints

#### Get Rewards Summary

```http
GET /api/v1/dashboard/rewards
Authorization: Bearer {token}
```

Response:

```json
{
  "totalPoints": 2500,
  "pendingPoints": 500,
  "creditedPoints": 2000,
  "expiredPoints": 0,
  "revokedPoints": 0
}
```

#### Get User Badges

```http
GET /api/v1/dashboard/rewards/badges
Authorization: Bearer {token}
```

#### Get Points Leaderboard

```http
GET /api/v1/dashboard/rewards/leaderboard?limit=10
```

#### Admin: Auto-Award Badges

```http
POST /api/v1/dashboard/rewards/check-badges
Authorization: Bearer {admin-token}
Content-Type: application/json

{
  "userId": "user-123"
}
```

#### Admin: Credit Pending Points

```http
POST /api/v1/dashboard/rewards/credit-points
Authorization: Bearer {admin-token}
Content-Type: application/json

{
  "userId": "user-123"
}
```

### Referrals Endpoints

#### Get Referral Statistics

```http
GET /api/v1/dashboard/referrals
Authorization: Bearer {token}
```

Response:

```json
{
  "totalReferrals": 5,
  "activeReferrals": 2,
  "completedReferrals": 3,
  "totalRewardEarned": 150.0,
  "pendingRewardAmount": 100.0
}
```

#### Get Referral List (Paginated)

```http
GET /api/v1/dashboard/referrals/list?page=1&limit=20&status=completed
Authorization: Bearer {token}
```

#### Create Referral

```http
POST /api/v1/dashboard/referrals
Authorization: Bearer {token}
Content-Type: application/json

{
  "referredUserId": "user-456",
  "rewardAmount": 50.00
}
```

#### Get Referral Link

```http
GET /api/v1/dashboard/referrals/share
Authorization: Bearer {token}
```

Response:

```json
{
  "referralCode": "USER-ABC12345",
  "referralLink": "https://app.nexus.local/referral/USER-ABC12345",
  "sharingMessage": "Join me on Nexus and get rewards!...",
  "sharableUrl": "https://app.nexus.local/referral/USER-ABC12345?utm_source=referral&utm_medium=link"
}
```

#### Get Top Referrers

```http
GET /api/v1/dashboard/referrals/leaderboard?limit=10
```

#### Admin: Complete Referral

```http
POST /api/v1/dashboard/referrals/{referralId}/complete
Authorization: Bearer {admin-token}
```

#### Admin: Process Referral Reward

```http
POST /api/v1/dashboard/referrals/{referralId}/process-reward
Authorization: Bearer {admin-token}
```

#### Validate Referral Code

```http
POST /api/v1/dashboard/referrals/validate-code
Content-Type: application/json

{
  "code": "USER-ABC12345"
}
```

#### Admin: Batch Process Pending Rewards

```http
POST /api/v1/dashboard/referrals/batch-process
Authorization: Bearer {admin-token}
Content-Type: application/json

{
  "limit": 100
}
```

## Service Usage Examples

### In Your Controllers/Services

```typescript
import { RewardsService } from '@/services/rewards.service';
import { ReferralsService } from '@/services/referrals.service';

// Award points to user
await RewardsService.awardPoints(
  userId,
  100, // points
  'purchase', // reason
  expireDate, // optional expiration
  { orderId: '123' } // optional metadata
);

// Credit pending points
const credited = await RewardsService.creditPendingPoints(userId);
console.log(`Credited ${credited} points to user`);

// Get rewards summary
const summary = await RewardsService.getRewardsSummary(userId);
console.log(`Total points: ${summary.totalPoints}`);

// Award badge
await RewardsService.awardBadge(userId, badgeId, { context: 'value' });

// Create referral
const referral = await ReferralsService.createReferral(
  referrerUserId,
  referredUserId,
  50.0 // reward amount
);

// Complete and process reward
await ReferralsService.completeReferral(referral.id);
const reward = await ReferralsService.processReferralReward(referral.id);
```

## Permission Requirements

### Required Permissions

Create these permissions in your RBAC system:

```sql
INSERT INTO permissions (name, description) VALUES
('manage_rewards', 'Manage rewards and badges'),
('manage_referrals', 'Manage referral program');
```

Assign to admin/staff roles as needed.

## Common Workflows

### Workflow 1: Award Points for Purchase

```typescript
// 1. User makes purchase
const purchase = await createPurchase(userId, amount);

// 2. Award points
await RewardsService.awardPoints(
  userId,
  Math.round(amount * 10), // e.g., $10 = 100 points
  'purchase_reward',
  null, // no expiration
  { purchaseId: purchase.id }
);

// 3. Later, credit the points
await RewardsService.creditPendingPoints(userId);
```

### Workflow 2: Referral Program

```typescript
// 1. Create referral (when user clicks link or enters code)
const referral = await ReferralsService.createReferral(
  referrerUserId,
  newUserId,
  50.0 // $50 reward
);

// 2. Referred user completes signup/verification
await ReferralsService.activateReferral(referral.id);

// 3. After required action (e.g., first purchase)
await ReferralsService.completeReferral(referral.id);

// 4. Process reward (creates reward record)
const reward = await ReferralsService.processReferralReward(referral.id);

// 5. Credit the reward
await RewardsService.creditPendingPoints(referrerId);

// 6. Auto-award badges
await RewardsService.checkAndAwardBadges(referrerId);
```

### Workflow 3: Badge Management

```typescript
// 1. Define badges (admin)
await BadgeModel.create({
  name: 'First Referrer',
  description: 'Referred your first user',
  icon: 'https://...',
  requiredAction: 'first_referral',
  category: 'achievement',
});

// 2. System auto-awards when conditions met
await RewardsService.checkAndAwardBadges(userId);

// Or manually award
await RewardsService.awardBadge(userId, badgeId);

// 3. Get user's badges
const badges = await RewardsService.getUserBadges(userId);
```

## Testing

### Test Points Flow

```bash
# 1. Get initial summary
curl http://localhost:3000/api/v1/dashboard/rewards \
  -H "Authorization: Bearer {token}"

# 2. Create test badge
curl http://localhost:3000/api/v1/admin/badges \
  -X POST \
  -H "Authorization: Bearer {admin-token}" \
  -d '{"name":"Test","icon":"..."}'

# 3. Award points
curl http://localhost:3000/api/v1/admin/rewards/award \
  -X POST \
  -H "Authorization: Bearer {admin-token}" \
  -d '{"userId":"...","points":100,"reason":"test"}'

# 4. Get updated summary
curl http://localhost:3000/api/v1/dashboard/rewards \
  -H "Authorization: Bearer {token}"
```

### Test Referral Flow

```bash
# 1. Create referral
curl http://localhost:3000/api/v1/dashboard/referrals \
  -X POST \
  -H "Authorization: Bearer {referrer-token}" \
  -d '{"referredUserId":"...","rewardAmount":50.00}'

# 2. Get referral code
curl http://localhost:3000/api/v1/dashboard/referrals/share \
  -H "Authorization: Bearer {referrer-token}"

# 3. Complete referral (admin)
curl http://localhost:3000/api/v1/dashboard/referrals/{referralId}/complete \
  -X POST \
  -H "Authorization: Bearer {admin-token}"

# 4. Process reward (admin)
curl http://localhost:3000/api/v1/dashboard/referrals/{referralId}/process-reward \
  -X POST \
  -H "Authorization: Bearer {admin-token}"
```

## Performance Considerations

### Indexing

All frequently queried columns are indexed. Key indexes:

- `rewards(user_id, status)`
- `referrals(referrer_user_id, status)`
- `referrals(referred_user_id)` UNIQUE
- `user_badges(user_id)`

### Query Optimization

- Use pagination for leaderboards (max 100 results)
- Batch operations for processing multiple rewards
- Consider Redis caching for leaderboards

### Batch Processing

```typescript
// Run this periodically (e.g., via cron job)
const processed = await ReferralsService.batchProcessPendingReferrals(100);
console.log(`Processed ${processed} referral rewards`);
```

## Troubleshooting

### User Already Has Referral

**Error**: "User X is already referred by another user"
**Solution**: Each user can only be referred once. Check referrals table.

### Referral Not Completed

**Error**: "Referral X is not completed"
**Solution**: Call `completeReferral()` before `processReferralReward()`

### Badge Not Awarded

**Error**: Badge not showing up
**Solution**:

1. Verify badge `is_active = true`
2. Call `checkAndAwardBadges()` to auto-award
3. Check user_badges table for existing record

### Points Not Updated

**Error**: `total_points` not reflecting
**Solution**: Make sure to call `creditPendingPoints()` to move points from pending to credited

## Next Steps

1. ✅ Run migrations: `npm run migrate:latest`
2. ✅ Create initial badges in admin panel
3. ✅ Add permission checks in RBAC
4. ✅ Integrate with purchase flow for points
5. ✅ Integrate with signup flow for referrals
6. ✅ Setup cron job for batch processing
7. ✅ Configure reward amounts and thresholds
8. ✅ Test all workflows end-to-end
9. ✅ Add monitoring and alerting
10. ✅ Deploy to production

## Support

For detailed API documentation, see the Swagger UI at `/api/v1/docs`

For implementation details, see `REWARDS_AND_REFERRALS_IMPLEMENTATION.md`
