# Referral Controller & Routes Cleanup

## Overview

Cleaned up the referral system to remove unused/redundant endpoints and align with the new architecture where:

- Referrals are created automatically during signup via `createReferralFromSignup()`
- Users get personal referral links via `ReferralLinkController`
- Admin manages referral completion and rewards

---

## Removed Endpoints

### 1. `POST /api/v1/dashboard/referrals` - createReferral

**Status**: ❌ REMOVED

**Reason**:

- Manual referral creation is no longer needed
- Referrals are now created automatically during user signup when a valid referral code is provided
- The endpoint would create referrals where `referredUserId = req.user.userId`, making it impossible to create valid referrals

**Controller Method Removed**:

```typescript
static async createReferral(req: AuthenticatedRequest, res: Response)
```

---

### 2. `GET /api/v1/dashboard/referrals/share` - generateReferralLink

**Status**: ❌ REMOVED

**Reason**:

- Functionality replaced by the new `ReferralLinkService`
- Users now get their personal referral link via `GET /api/v1/dashboard/referrals/link`
- The old hardcoded link generation was simplified and replaced with persistent database storage

**Controller Method Removed**:

```typescript
static async generateReferralLink(req: AuthenticatedRequest, res: Response)
```

---

### 3. `POST /api/v1/dashboard/referrals/validate-code` - validateReferralCode (ReferralsController)

**Status**: ❌ REMOVED from ReferralsController

**Reason**:

- This endpoint was redundant with `ReferralLinkController.validateCode()`
- Validation logic now lives in `ReferralLinkService` and is used internally during signup
- The public validation endpoint is kept but routed through `ReferralLinkController`

**Controller Method Removed**:

```typescript
static async validateReferralCode(req: AuthenticatedRequest, res: Response)
```

---

## Remaining Endpoints

### User-Facing (No Special Permissions)

#### 1. `GET /api/v1/dashboard/referrals` - getReferralStats

**Purpose**: Get referral statistics for authenticated user
**Access**: Authenticated users
**Returns**: Total referrals, active, completed, earnings

#### 2. `GET /api/v1/dashboard/referrals/list` - getReferralList

**Purpose**: Get paginated list of referrals for authenticated user
**Access**: Authenticated users
**Query Params**: `page`, `limit`, `status`

#### 3. `GET /api/v1/dashboard/referrals/leaderboard` - getTopReferrers

**Purpose**: Get top referrers leaderboard
**Access**: Public (no authentication required)
**Query Params**: `limit` (default: 10, max: 100)

#### 4. `GET /api/v1/dashboard/referrals/link` - getOrCreateLink (ReferralLinkController)

**Purpose**: Get or create user's personal referral link
**Access**: Authenticated users
**Returns**: Referral code, full link, short code

#### 5. `GET /api/v1/dashboard/referrals/link/stats` - getLinkStats (ReferralLinkController)

**Purpose**: Get stats on how many users registered via referral link
**Access**: Authenticated users

#### 6. `POST /api/v1/dashboard/referrals/link/regenerate` - regenerateCode (ReferralLinkController)

**Purpose**: Generate a new referral code (old code becomes inactive)
**Access**: Authenticated users

#### 7. `POST /api/v1/dashboard/referrals/link/deactivate` - deactivateLink (ReferralLinkController)

**Purpose**: Deactivate referral link
**Access**: Authenticated users

#### 8. `POST /api/v1/referrals/validate-code` - validateCode (ReferralLinkController)

**Purpose**: Validate a referral code (public endpoint for signup)
**Access**: Public (no authentication required)
**Body**: `{ code: string }`

---

### Admin-Only (Requires `manage_referrals` Permission)

#### 1. `POST /api/v1/dashboard/referrals/:referralId/complete` - completeReferral

**Purpose**: Mark a referral as completed
**Access**: Admin with `manage_referrals` permission
**Params**: `referralId`

#### 2. `POST /api/v1/dashboard/referrals/:referralId/process-reward` - processReferralReward

**Purpose**: Process reward for a completed referral
**Access**: Admin with `manage_referrals` permission
**Params**: `referralId`

#### 3. `POST /api/v1/dashboard/referrals/batch-process` - batchProcessPendingReferrals

**Purpose**: Batch process pending referral rewards
**Access**: Admin with `manage_referrals` permission
**Body**: `{ limit?: number }`

---

## Service Layer Changes

### ReferralsService - Methods Kept

**Core Methods** (Still Used):

- `getReferralStats()` - Get user stats
- `getReferralList()` - Get user's referrals
- `getTopReferrers()` - Get leaderboard
- `activateReferral()` - Activate referral
- `completeReferral()` - Admin: Mark complete
- `processReferralReward()` - Admin: Process reward
- `cancelReferral()` - Cancel referral
- `getReferrer()` - Get referrer for a user
- `batchProcessPendingReferrals()` - Admin: Batch process
- `createReferralFromSignup()` - **NEW**: Fire-and-forget for signup

**Internal/Test Methods** (Kept for backward compatibility):

- `createReferral()` - Used in tests, can be called directly by admin endpoints if needed
- `validateReferralCode()` - Delegates to ReferralLinkService, can be removed in future
- `findByCode()` - Internal helper
- `generateReferralCode()` - Internal helper

---

## New Architecture Flow

```
User Signup Request
  ├─ POST /api/v1/auth/register?referralCode=ABC123
  │
  ├─ Backend creates user in transaction
  │
  ├─ Fire-and-forget: ReferralsService.createReferralFromSignup()
  │   ├─ Validates code via ReferralLinkService.validateReferralCode()
  │   ├─ Gets referrer ID from code
  │   ├─ Creates referral: referrer → new user
  │   └─ Non-blocking (doesn't interrupt signup)
  │
  └─ User registration completes

User Views Referral Dashboard
  ├─ GET /api/v1/dashboard/referrals → Stats
  ├─ GET /api/v1/dashboard/referrals/list → Referral list
  └─ GET /api/v1/dashboard/referrals/link → Personal link (for sharing)

User Shares Referral Link
  ├─ GET /api/v1/dashboard/referrals/link → Personal link
  ├─ User shares: https://app.nexus.local/signup?referralCode=USER-ABC123
  └─ Admin shares leaderboard: GET /api/v1/dashboard/referrals/leaderboard

Admin Manages Referrals
  ├─ POST /api/v1/dashboard/referrals/:id/complete → Mark complete
  ├─ POST /api/v1/dashboard/referrals/:id/process-reward → Give reward
  └─ POST /api/v1/dashboard/referrals/batch-process → Batch rewards
```

---

## Database Schema

### `referrals` table

```sql
- id (UUID, PK)
- referrer_user_id (UUID, FK to users)
- referred_user_id (UUID, FK to users, UNIQUE)
- reward_amount (DECIMAL)
- status (ENUM: pending, active, completed, cancelled)
- referral_code (VARCHAR)
- reward_id (UUID, FK to rewards, nullable)
- referral_completed_at (TIMESTAMP, nullable)
- created_at, updated_at (TIMESTAMPS)
```

### `referral_links` table (NEW)

```sql
- id (UUID, PK)
- user_id (UUID, FK to users, CASCADE delete)
- referral_code (VARCHAR, UNIQUE)
- short_code (VARCHAR)
- full_link (VARCHAR)
- is_active (BOOLEAN)
- created_at, updated_at (TIMESTAMPS)
```

---

## Files Modified

1. **`/workspace/src/controllers/referrals.controller.ts`**
   - ❌ Removed `createReferral()` method
   - ❌ Removed `generateReferralLink()` method
   - ❌ Removed `validateReferralCode()` method
   - ✅ Kept `getReferralStats()`
   - ✅ Kept `getReferralList()`
   - ✅ Kept `getTopReferrers()`
   - ✅ Kept `completeReferral()`
   - ✅ Kept `processReferralReward()`
   - ✅ Kept `batchProcessPendingReferrals()`

2. **`/workspace/src/routes/rewards.routes.ts`**
   - ❌ Removed `POST /api/v1/dashboard/referrals` route
   - ❌ Removed `GET /api/v1/dashboard/referrals/share` route (was generateReferralLink)
   - ❌ Removed `POST /api/v1/referrals/validate-code` from ReferralsController
   - ✅ Kept all user-facing referral endpoints
   - ✅ Kept all admin-only endpoints

---

## API Endpoint Summary

### Before Cleanup

- Total Referral Endpoints: **11**
- Redundant: **3**

### After Cleanup

- Total Referral Endpoints: **8**
- User-Facing: **8**
- Admin-Only: **3**
- Public: **2**

### Removed Complexity

- ❌ Manual referral creation endpoint
- ❌ Manual link generation endpoint
- ❌ Duplicate validation endpoint

---

## Testing Notes

### Unit Tests to Update

- `referrals.service.test.ts` - Tests for removed methods should be removed or adapted
- `referralsController.test.ts` - Tests for removed controller methods should be removed

### Integration Tests

- Signup flow with referral code ✅ Already working
- ReferralLink endpoints ✅ Already working
- Admin referral management ✅ Already working

---

## Migration Checklist

- [x] Remove unused controller methods
- [x] Remove unused routes
- [x] Update route file (Swagger docs)
- [x] Verify no linting errors
- [x] Verify no compilation errors
- [ ] Update unit tests (if any reference removed methods)
- [ ] Update API documentation
- [ ] Deploy and monitor

---

## Benefits of Cleanup

1. **Simplified API Surface** - Fewer redundant endpoints
2. **Clear Separation** - User referral links managed by ReferralLinkController
3. **Automatic Creation** - No manual endpoint needed, happens on signup
4. **Better UX** - Users get their link via dashboard, not manual endpoint
5. **Admin Control** - Clear admin-only endpoints for referral management
6. **Code Maintainability** - Less code to maintain, clearer purpose
