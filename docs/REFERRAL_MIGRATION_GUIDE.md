# Migration Guide: Referral System Changes

## For Frontend Developers

### Removed Endpoints (Don't Use)

❌ **REMOVED**: `POST /api/v1/dashboard/referrals`

```javascript
// OLD (don't use anymore)
await fetch('/api/v1/dashboard/referrals', {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
  body: JSON.stringify({
    referredUserId: newUserId,
    rewardAmount: 50,
  }),
});
```

❌ **REMOVED**: `GET /api/v1/dashboard/referrals/share`

```javascript
// OLD (don't use anymore)
const link = await fetch('/api/v1/dashboard/referrals/share', {
  headers: { Authorization: `Bearer ${token}` },
});
```

---

## What Changed

### 1. User Signup with Referral Code

**OLD**: Sign up first, then call separate endpoint

```javascript
// 1. Sign up
const user = await signup(email, password);

// 2. Then manually create referral (NO LONGER WORKS)
await fetch('/api/v1/dashboard/referrals', {
  method: 'POST',
  body: JSON.stringify({ referredUserId: user.id }),
});
```

**NEW**: Pass referral code to signup

```javascript
// 1. Sign up with referral code (ALL IN ONE)
const user = await fetch('/api/v1/auth/register', {
  method: 'POST',
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'SecurePass123!',
    phoneNumber: '+1234567890',
    fullName: 'John Doe',
    referralCode: 'USER-ABC12345', // ← Pass here
  }),
});

// Backend automatically:
// - Validates code
// - Creates referral
// - No need to do anything else
```

---

### 2. Getting User's Referral Link

**OLD**: Manual generation endpoint

```javascript
const { referralCode, referralLink } = await fetch(
  '/api/v1/dashboard/referrals/share',
  { headers: { Authorization: `Bearer ${token}` } }
)
  .then(r => r.json())
  .then(r => r.data);
```

**NEW**: Get personal link from dashboard

```javascript
const { referralCode, fullLink } = await fetch(
  '/api/v1/dashboard/referrals/link',
  { headers: { Authorization: `Bearer ${token}` } }
)
  .then(r => r.json())
  .then(r => r.data);

// Use fullLink to share
// Example: https://app.nexus.local/signup?referralCode=USER-ABC12345
```

---

### 3. Share Referral Link

**OLD**: Had to format link manually

```javascript
const link = `${baseUrl}/referral/${referralCode}`;
```

**NEW**: Use fullLink from API

```javascript
// Just use the fullLink returned by the API
const { fullLink } = await getReferralLink();

// Share it directly
navigator.share({
  title: 'Join Nexus',
  text: 'Join me on Nexus and get rewards!',
  url: fullLink,
});
```

---

### 4. Referral Stats & List

✅ **UNCHANGED** - Still works the same

```javascript
// Get stats
const stats = await fetch('/api/v1/dashboard/referrals', {
  headers: { Authorization: `Bearer ${token}` },
})
  .then(r => r.json())
  .then(r => r.data);

// Get list
const { referrals, pagination } = await fetch(
  '/api/v1/dashboard/referrals/list?page=1&limit=20',
  { headers: { Authorization: `Bearer ${token}` } }
)
  .then(r => r.json())
  .then(r => r.data);
```

---

### 5. New Features Available

#### Get Referral Link Stats

```javascript
const stats = await fetch('/api/v1/dashboard/referrals/link/stats', {
  headers: { Authorization: `Bearer ${token}` },
})
  .then(r => r.json())
  .then(r => r.data);

// Returns: totalSignups, completedReferrals, pendingReferrals, totalEarnings
```

#### Regenerate Referral Code

```javascript
await fetch('/api/v1/dashboard/referrals/link/regenerate', {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
})
  .then(r => r.json())
  .then(r => r.data);

// Returns: New referralCode and fullLink
```

#### Deactivate Referral Link

```javascript
await fetch('/api/v1/dashboard/referrals/link/deactivate', {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
}).then(r => r.json());

// Link is now inactive, code won't work for new signups
```

---

## Frontend Implementation Examples

### React Example: Signup with Referral

```jsx
import { useSearchParams } from 'react-router-dom';

function SignupPage() {
  const [params] = useSearchParams();
  const referralCode = params.get('referralCode');

  const handleSignup = async formData => {
    const response = await fetch('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        ...formData,
        referralCode, // ← Include if present
      }),
    });

    if (response.ok) {
      // Signup successful - referral auto-created if code was valid
      navigateTo('/dashboard');
    }
  };

  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        handleSignup(new FormData(e.target));
      }}
    >
      {/* form fields */}
    </form>
  );
}
```

### React Example: Referral Dashboard

```jsx
import { useEffect, useState } from 'react';

function ReferralDashboard() {
  const [stats, setStats] = useState(null);
  const [link, setLink] = useState(null);

  useEffect(() => {
    // Get stats
    fetch('/api/v1/dashboard/referrals', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(r => setStats(r.data));

    // Get link
    fetch('/api/v1/dashboard/referrals/link', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(r => setLink(r.data));
  }, []);

  const handleShare = () => {
    navigator.share?.({
      title: 'Join Nexus',
      text: 'Join me on Nexus!',
      url: link.fullLink,
    });
  };

  return (
    <div>
      <h2>My Referrals</h2>
      <p>Total: {stats?.totalReferrals}</p>
      <p>Active: {stats?.activeReferrals}</p>

      <div>
        <h3>Share Your Link</h3>
        <input value={link?.fullLink} readOnly />
        <button onClick={handleShare}>Share</button>
      </div>
    </div>
  );
}
```

---

## For Backend Developers

### Service Usage

#### Create Referral from Signup (Automatic)

```typescript
// Called automatically in auth controller during signup
const result = await ReferralsService.createReferralFromSignup(
  newUserId,
  referralCodeFromQuery
);

// Returns: { success: boolean, referralId?: string, message: string }
// Non-blocking - doesn't fail signup if referral creation fails
```

#### Get User's Personal Link

```typescript
import { ReferralLinkService } from '../services/referralLink.service';

const link = await ReferralLinkService.getOrCreateReferralLink(userId);
// Returns: { id, userId, referralCode, shortCode, fullLink, isActive }
```

#### Validate Referral Code

```typescript
const validation = await ReferralLinkService.validateReferralCode(code);
// Returns: { valid: boolean, referrerId?: string, message: string }
```

#### Admin: Process Reward

```typescript
const reward = await ReferralsService.processReferralReward(referralId);
// Creates reward, links to referral, returns reward object
```

---

## Testing Checklist

### Unit Tests to Update

- [ ] `referrals.service.test.ts` - Remove tests for removed endpoints
- [ ] `referrals.controller.test.ts` - Remove tests for removed methods
- [ ] `auth.controller.test.ts` - Add test for referral code in signup

### Integration Tests

- [ ] Signup with valid referral code ✅
- [ ] Signup with invalid referral code ✅
- [ ] Signup without referral code ✅
- [ ] Get referral link ✅
- [ ] Regenerate code ✅
- [ ] Admin process reward ✅

### Manual Testing

```bash
# Test 1: Signup with referral code
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!",
    "phoneNumber": "+1234567890",
    "fullName": "Test User",
    "referralCode": "USER-ABC12345"
  }'

# Test 2: Get referral link
curl -X GET http://localhost:3000/api/v1/dashboard/referrals/link \
  -H "Authorization: Bearer {token}"

# Test 3: Check that old endpoints return 404
curl -X POST http://localhost:3000/api/v1/dashboard/referrals \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"referredUserId": "test"}'
# Should return 404 Not Found
```

---

## Troubleshooting

### "Referral not created" Error

**Symptom**: User signs up with referral code but no referral created

**Check**:

1. Verify referral code exists and is active

   ```bash
   SELECT * FROM referral_links WHERE referral_code = 'USER-ABC123';
   ```

2. Check auth controller logs for errors
3. Verify code is passed correctly to signup endpoint
4. Check if user already has a referral (unique constraint)

### "Referral code invalid" Error

**Symptom**: Signup endpoint rejects referral code

**Check**:

1. Verify code format is correct (should be like `USER-ABC123`)
2. Verify referral_links table has the code
3. Verify is_active = true
4. Check ReferralLinkService.validateReferralCode() logic

### Old Endpoints Still Called

**Symptom**: Frontend still trying to use removed endpoints

**Fix**:

- Update to use new endpoints
- Check browser network tab to see which endpoints are called
- Search codebase for old endpoint paths

---

## Summary of Changes

| Feature              | Old                        | New                               | Status       |
| -------------------- | -------------------------- | --------------------------------- | ------------ |
| Signup with referral | Manual endpoint call       | Parameter in signup               | ✅ Automatic |
| Get referral link    | `/referrals/share`         | `/referrals/link`                 | ✅ Better    |
| Create referral      | Manual POST                | Auto on signup                    | ✅ Better UX |
| Validate code        | `/referrals/validate-code` | `/referrals/validate-code`        | ✅ Same      |
| Regenerate code      | ❌ Didn't exist            | `POST /referrals/link/regenerate` | ✅ New       |
| Deactivate link      | ❌ Didn't exist            | `POST /referrals/link/deactivate` | ✅ New       |

---

## Questions?

Refer to these docs for more details:

- `REFERRAL_API_REFERENCE.md` - Complete API endpoints
- `REFERRAL_CONTROLLER_CLEANUP.md` - Detailed technical changes
- `REFERRAL_CLEANUP_REPORT.md` - Full report of changes
