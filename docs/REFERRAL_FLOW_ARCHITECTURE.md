# Referral System Architecture - Revised Flow

## Overview

The referral system has been restructured into two distinct layers:

1. **Referral Links** - Personal sharing links each user has (persistent, one per user)
2. **Referrals** - Relationships created when someone signs up using a referral link

This separation allows for:

- Users to have a permanent referral link they can share anywhere
- Referral codes to be used both via link AND separately (e.g., entered manually during signup)
- Clean tracking of who referred whom

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    User A (Referrer)                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│ Has ONE Personal Referral Link (persistent):                     │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ Referral Code: USER-ABC123                                │   │
│ │ Short Code:   ABC123                                      │   │
│ │ Full Link:    https://app.nexus.local/referral/ABC123    │   │
│ │ QR Code:      [Shareable as image]                        │   │
│ │ Status:       Active (can be regenerated or deactivated) │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Shares link/code
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              User B (Referred - New Signup)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│ 1. Clicks link OR enters code during signup                      │
│ 2. Validates code: POST /api/v1/referrals/validate-code          │
│ 3. Completes registration                                        │
│ 4. System creates Referral relationship                          │
│    (connects User A as referrer to User B as referred)           │
│ 5. Referral enters "pending" status                              │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Data Model

### referral_links table

Personal referral links for users (one per user):

```sql
CREATE TABLE referral_links (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL (references users),
  referral_code VARCHAR(50) UNIQUE,      -- USER-ABC123
  short_code VARCHAR(10),                 -- ABC123
  full_link VARCHAR(500),                 -- Complete URL
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

INDEXES:
- user_id
- referral_code (UNIQUE)
- short_code
- (user_id, is_active)
```

### referrals table

Referral relationships (already exists, now uses referral_links):

```sql
CREATE TABLE referrals (
  id UUID PRIMARY KEY,
  referrer_user_id UUID NOT NULL (references users),
  referred_user_id UUID NOT NULL UNIQUE (references users),
  reward_amount DECIMAL,
  referral_code VARCHAR(50) (references referral_links),
  status VARCHAR(20),  -- pending, active, completed, cancelled
  referral_completed_at TIMESTAMP,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

INDEXES:
- referrer_user_id
- referred_user_id (UNIQUE)
- referral_code
```

## API Flow

### 1. User Gets/Creates Referral Link

**Endpoint**: `GET /api/v1/dashboard/referrals/link` (Protected)

When a user first visits the referrals section, they get their personal link:

```bash
curl -X GET \
  https://app.nexus.local/api/v1/dashboard/referrals/link \
  -H "Authorization: Bearer ${TOKEN}"
```

**Response**:

```json
{
  "referralCode": "USER-ABC123",
  "shortCode": "ABC123",
  "referralLink": "https://app.nexus.local/referral/ABC123",
  "sharingMessage": "Join me on Nexus! Use my referral code: ABC123",
  "qrCodeUrl": "https://api.qrserver.com/..."
}
```

### 2. User Shares Link

User can share:

- Full link: `https://app.nexus.local/referral/ABC123`
- Short code: `ABC123` (to enter manually)
- QR code: Scan to access link
- Message with code

### 3. New User Signs Up

**Step 3a - Validate Referral Code** (during signup form):

```bash
curl -X POST \
  https://app.nexus.local/api/v1/referrals/validate-code \
  -H "Content-Type: application/json" \
  -d '{
    "code": "ABC123"
  }'
```

**Response**:

```json
{
  "valid": true,
  "referrerId": "user-123",
  "message": "Code is valid and can be used for signup"
}
```

**Step 3b - Complete Registration**:

New user completes signup with email, password, etc. Backend stores `referralCode` temporarily.

**Step 3c - Create Referral** (after email verification):

```bash
curl -X POST \
  https://app.nexus.local/api/v1/dashboard/referrals \
  -H "Authorization: Bearer ${NEW_USER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "referralCode": "ABC123"
  }'
```

This creates the referral relationship. Backend:

1. Finds referrer from referral_links table using code
2. Creates referral record
3. Sets status to "pending"
4. Awards welcome bonuses (via integration service)

### 4. Referral Completion

After referred user completes their first action (transaction, etc.):

```bash
curl -X POST \
  https://app.nexus.local/api/v1/dashboard/referrals/{referralId}/complete \
  -H "Authorization: Bearer ${ADMIN_TOKEN}"
```

System processes rewards and moves referral to "completed" status.

## Services

### ReferralLinkService

Manages personal referral links:

```typescript
// Get or create user's link
await ReferralLinkService.getOrCreateReferralLink(userId);

// Find referrer by code
const referrerId = await ReferralLinkService.findReferrerByCode('ABC123');

// Validate code
const result = await ReferralLinkService.validateReferralCode('ABC123');

// Regenerate code (user can get new code)
await ReferralLinkService.regenerateReferralCode(userId);

// Deactivate link
await ReferralLinkService.deactivateReferralLink(userId);

// Get statistics
const stats = await ReferralLinkService.getReferralLinkStats(userId);
```

### ReferralsService

Manages referral relationships (unchanged, integrates with ReferralLinkService):

```typescript
// Create referral after signup
await ReferralsService.createReferral(referrerId, newUserId, rewardAmount);

// Get referrer's referrals
await ReferralsService.getReferralList(referrerId);

// Complete referral
await ReferralsService.completeReferral(referralId);

// Process reward
await ReferralsService.processReferralReward(referralId);
```

## Controller Classes

### ReferralLinkController

Handles personal referral links (new):

```typescript
// Get or create link
GET / api / v1 / dashboard / referrals / link;

// Get link statistics
GET / api / v1 / dashboard / referrals / link / stats;

// Regenerate code
POST / api / v1 / dashboard / referrals / link / regenerate;

// Deactivate link
POST / api / v1 / dashboard / referrals / link / deactivate;

// Validate code (public, for signup)
POST / api / v1 / referrals / validate - code;
```

### ReferralsController

Handles referral relationships (updated):

```typescript
// Get referral stats
GET / api / v1 / dashboard / referrals;

// Get referral list
GET / api / v1 / dashboard / referrals / list;

// Create referral (after signup)
POST / api / v1 / dashboard / referrals;

// Get leaderboard
GET / api / v1 / dashboard / referrals / leaderboard;

// Admin endpoints
POST / api / v1 / dashboard / referrals / { id } / complete;
POST / api / v1 / dashboard / referrals / { id } / process - reward;
POST / api / v1 / dashboard / referrals / batch - process;
```

## Integration Points

### On User Registration

```typescript
// In auth.controller.ts after signup
const newUser = await createUser(userData);

// If user provided referral code
if (req.body.referralCode) {
  // Validate it
  const validation = await ReferralLinkService.validateReferralCode(
    req.body.referralCode
  );

  if (validation.valid) {
    // After email verification, create referral
    // (This happens via POST /api/v1/dashboard/referrals)
    // Or automatically:
    await ReferralsService.createReferral(
      validation.referrerId,
      newUser.id,
      50.0  // default reward
    );

    // Award integration service bonuses
    await RegistrationRewardsIntegration.processSignupRewards({
      userId: newUser.id,
      referralCode: req.body.referralCode,
      ...
    });
  }
}
```

## Benefits of This Architecture

1. **Persistence**: Users always have their referral link, doesn't change unless regenerated
2. **Flexibility**: Codes can be entered manually, not just via link
3. **Tracking**: Can track which code led to signup (for analytics)
4. **Deactivation**: Users can disable their link without affecting existing referrals
5. **Regeneration**: Can create new codes without affecting past referrals
6. **Statistics**: Easy to see how many people used a link
7. **Admin Control**: Can manage links and referrals separately

## Example User Journey

1. **Alice** signs up, gets personal link: `ABC123`
2. **Alice** shares code on social media
3. **Bob** clicks link (or enters code), signs up with code `ABC123`
4. **Bob** completes email verification
5. System creates referral: Alice (referrer) → Bob (referred)
6. **Bob** makes first transaction
7. Referral marked as completed
8. **Alice** gets 50 points (referral reward)
9. **Alice** appears on referrers leaderboard

## Future Enhancements

- Referral code analytics (track clicks, conversions)
- Tiered referral rewards (5 referrals = bonus, etc.)
- Custom referral messages per user
- Referral expiration (code valid for X days)
- Batch invite system (email multiple contacts)

## Migration

Run migration to create `referral_links` table:

```bash
npm run migrate:latest
```

No data migration needed - old system removed, new one from scratch.
