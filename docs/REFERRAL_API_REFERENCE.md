# Referral System - Final API Reference

## Quick Summary

The referral system has been cleaned up and simplified:

- **Automatic Referrals**: Created during signup via `createReferralFromSignup()`
- **User Links**: Personal referral links managed via ReferralLinkController
- **Admin Control**: Clear admin-only endpoints for management

---

## User-Facing Endpoints

### Get My Referral Dashboard

```
GET /api/v1/dashboard/referrals
Authorization: Bearer {token}

Response:
{
  "data": {
    "totalReferrals": 5,
    "activeReferrals": 3,
    "completedReferrals": 2,
    "totalEarnings": 250.50
  }
}
```

### Get My Referrals List

```
GET /api/v1/dashboard/referrals/list?page=1&limit=20&status=completed
Authorization: Bearer {token}

Query Params:
- page: number (default: 1)
- limit: number (default: 20, max: 100)
- status: pending|active|completed|cancelled

Response:
{
  "data": {
    "referrals": [
      {
        "referralId": "...",
        "referredUserId": "...",
        "rewardAmount": 50,
        "status": "completed",
        "createdAt": "2025-12-04T..."
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5,
      "totalPages": 1
    }
  }
}
```

### Get My Referral Link

```
GET /api/v1/dashboard/referrals/link
Authorization: Bearer {token}

Response:
{
  "data": {
    "userId": "...",
    "referralCode": "USER-ABC12345",
    "shortCode": "ABC123",
    "fullLink": "https://app.nexus.local/signup?referralCode=USER-ABC12345",
    "isActive": true,
    "createdAt": "2025-12-04T..."
  }
}
```

### Get My Referral Link Stats

```
GET /api/v1/dashboard/referrals/link/stats
Authorization: Bearer {token}

Response:
{
  "data": {
    "userId": "...",
    "totalSignups": 3,
    "completedReferrals": 2,
    "pendingReferrals": 1,
    "totalEarnings": 100
  }
}
```

### Regenerate My Referral Code

```
POST /api/v1/dashboard/referrals/link/regenerate
Authorization: Bearer {token}

Response:
{
  "data": {
    "referralCode": "USER-XYZ98765",
    "shortCode": "XYZ987",
    "message": "New referral code generated successfully"
  }
}
```

### Deactivate My Referral Link

```
POST /api/v1/dashboard/referrals/link/deactivate
Authorization: Bearer {token}

Response:
{
  "data": {
    "message": "Referral link deactivated successfully"
  }
}
```

### View Top Referrers (Public)

```
GET /api/v1/dashboard/referrals/leaderboard?limit=10

Query Params:
- limit: number (default: 10, max: 100)

Response:
{
  "data": {
    "leaderboard": [
      {
        "userId": "...",
        "userName": "John Doe",
        "referralCount": 15,
        "totalEarnings": 750
      }
    ],
    "count": 10
  }
}
```

---

## Admin-Only Endpoints

### Mark Referral as Completed

```
POST /api/v1/dashboard/referrals/:referralId/complete
Authorization: Bearer {admin_token}
Permission: manage_referrals

Response:
{
  "data": {
    "referralId": "...",
    "status": "completed",
    "referralCompletedAt": "2025-12-04T..."
  }
}
```

### Process Reward for Referral

```
POST /api/v1/dashboard/referrals/:referralId/process-reward
Authorization: Bearer {admin_token}
Permission: manage_referrals

Response:
{
  "data": {
    "rewardId": "...",
    "userId": "...",
    "points": 5000,
    "reason": "Referral reward for referring user ..."
  }
}
```

### Batch Process Pending Referral Rewards

```
POST /api/v1/dashboard/referrals/batch-process
Authorization: Bearer {admin_token}
Permission: manage_referrals

Request Body:
{
  "limit": 100
}

Response:
{
  "data": {
    "processed": 42,
    "message": "Batch processing completed: 42 referral rewards processed"
  }
}
```

---

## Public/Signup Endpoint

### Validate Referral Code (During Signup)

```
POST /api/v1/referrals/validate-code

Request Body:
{
  "code": "USER-ABC12345"
}

Response (Valid):
{
  "data": {
    "valid": true,
    "referrerId": "...",
    "message": "Referral code is valid"
  }
}

Response (Invalid):
{
  "error": "Invalid or expired referral code"
}
```

---

## Signup With Referral Code

### Register User with Referral Code

```
POST /api/v1/auth/register

Request Body:
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "phoneNumber": "+1234567890",
  "fullName": "John Doe",
  "referralCode": "USER-ABC12345"
}

OR query param:
GET /api/v1/auth/register?referralCode=USER-ABC12345

Response:
{
  "data": {
    "id": "...",
    "email": "user@example.com"
  }
}

Backend:
- Creates user in transaction
- Fire-and-forget: Validates referral code
- Fire-and-forget: Creates referral relationship if code is valid
- Doesn't block signup if referral fails
```

---

## Permission Requirements

### Roles with `manage_referrals`

- Admin
- Manager

### Endpoints Requiring Permission

- `POST /api/v1/dashboard/referrals/:referralId/complete`
- `POST /api/v1/dashboard/referrals/:referralId/process-reward`
- `POST /api/v1/dashboard/referrals/batch-process`

---

## Error Responses

### 400 Bad Request

```json
{
  "error": "Referral code is required",
  "statusCode": 400
}
```

### 401 Unauthorized

```json
{
  "error": "Authentication required",
  "statusCode": 401
}
```

### 403 Forbidden

```json
{
  "error": "Permission denied",
  "statusCode": 403
}
```

### 404 Not Found

```json
{
  "error": "Referral not found",
  "statusCode": 404
}
```

### 409 Conflict

```json
{
  "error": "User is already referred by another user",
  "statusCode": 409
}
```

### 500 Internal Server Error

```json
{
  "error": "Failed to retrieve referral statistics",
  "statusCode": 500
}
```

---

## Testing Examples

### 1. User Signs Up with Referral Code

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "SecurePass123!",
    "phoneNumber": "+1234567890",
    "fullName": "Jane Doe",
    "referralCode": "USER-ABC12345"
  }'
```

### 2. Get My Referral Link

```bash
curl -X GET http://localhost:3000/api/v1/dashboard/referrals/link \
  -H "Authorization: Bearer {token}"
```

### 3. Get Referral Stats

```bash
curl -X GET http://localhost:3000/api/v1/dashboard/referrals \
  -H "Authorization: Bearer {token}"
```

### 4. Admin Processes Reward

```bash
curl -X POST http://localhost:3000/api/v1/dashboard/referrals/{referralId}/process-reward \
  -H "Authorization: Bearer {admin_token}"
```

---

## Architecture Changes

### Before Cleanup

- `POST /api/v1/dashboard/referrals` - Manual creation ❌ REMOVED
- `GET /api/v1/dashboard/referrals/share` - Manual link generation ❌ REMOVED
- `POST /api/v1/dashboard/referrals/validate-code` - Duplicate endpoint ❌ REMOVED

### After Cleanup

- `POST /api/v1/auth/register?referralCode=...` - Automatic creation ✅
- `GET /api/v1/dashboard/referrals/link` - Get personal link ✅
- `POST /api/v1/referrals/validate-code` - Public validation ✅

---

## Key Improvements

1. **Automatic Referral Creation** - No manual API calls needed
2. **Personal Referral Links** - Each user gets one persistent link
3. **Cleaner API** - Removed redundant endpoints
4. **Better UX** - Users don't need to understand referral mechanics
5. **Admin Control** - Clear endpoints for referral management
