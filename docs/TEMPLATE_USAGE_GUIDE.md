# Notification Template Usage Flow

## Overview

Admins can now create reusable notification templates with variable placeholders, share them with other admins, and use them to send notifications with dynamically substituted content.

## Complete Workflow

### Step 1: Admin Creates a Template

**Endpoint:** `POST /api/v1/notification-templates`

Example:

```bash
curl -X POST http://localhost:3000/api/v1/notification-templates \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "template_id": "welcome_bonus",
    "title": "Welcome {{userName}}! 🎉",
    "body": "You have received {{amount}} bonus credits. Use code: {{promoCode}}",
    "locales": ["en", "es", "fr"]
  }'
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "uuid-here",
    "template_id": "welcome_bonus",
    "title": "Welcome {{userName}}! 🎉",
    "body": "You have received {{amount}} bonus credits. Use code: {{promoCode}}",
    "locales": ["en", "es", "fr"],
    "created_at": "2025-12-12T...",
    "updated_at": "2025-12-12T..."
  }
}
```

### Step 2: Admin Lists Available Templates

**Endpoint:** `GET /api/v1/notification-templates`

All admins can see existing templates to understand what variables they need to provide.

### Step 3: Admin Sends Notification Using Template

**Endpoint:** `POST /api/v1/admin/notifications/from-template`

Admin provides template ID and variable values:

```bash
curl -X POST http://localhost:3000/api/v1/admin/notifications/from-template \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "template_id": "welcome_bonus",
    "variables": {
      "userName": "John Doe",
      "amount": 50,
      "promoCode": "WELCOME50"
    },
    "category": "promotions",
    "type": "success"
  }'
```

**Response:**

```json
{
  "success": true,
  "message": "Notification created and sent successfully from template",
  "data": {
    "id": "notification-uuid",
    "title": "Welcome John Doe! 🎉",
    "body": "You have received 50 bonus credits. Use code: WELCOME50",
    "type": "success",
    "category": "promotions",
    "sent": true,
    "created_at": "2025-12-12T..."
  }
}
```

### Step 4 (Optional): Schedule Template-Based Notifications

Use `publish_at` to schedule for later:

```bash
curl -X POST http://localhost:3000/api/v1/admin/notifications/from-template \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "template_id": "welcome_bonus",
    "variables": {
      "userName": "Alice Smith",
      "amount": 100,
      "promoCode": "ALICE100"
    },
    "publish_at": "2025-12-20T10:00:00Z"
  }'
```

## Key Features

### 1. Variable Substitution

Templates use `{{variableName}}` placeholders that are replaced with actual values:

- `{{userName}}` → "John Doe"
- `{{amount}}` → 50
- `{{promoCode}}` → "WELCOME50"

### 2. Partial Variable Substitution

You don't need to provide all variables. Unsubstituted ones remain as-is:

```
Original: "You have {{discount}}% off. Code: {{code}}"
Provided: { discount: 25 }
Result:   "You have 25% off. Code: {{code}}"
```

### 3. Flexible Content

- Support for special characters
- Numeric variables (auto-converted to strings)
- Locales metadata for each template
- Category and type overrides per notification

### 4. Scheduling Support

- Send immediately: No `publish_at` or past date
- Schedule for later: Future `publish_at` date
- Both work with templates seamlessly

### 5. Access Control

- Requires `manage.notification_templates` permission to create/update templates
- Requires `create.notification` permission to send from templates
- Admin-only accessible

## Use Cases

### 1. Multi-language Promotions

```
Template: "{{discount}}% Off {{category}}"
Send to different locales by providing variables
```

### 2. Personalized Onboarding

```
Template: "Welcome {{userName}}! Your bonus: {{bonusAmount}} points"
Each user gets personalized message
```

### 3. Transaction Confirmations

```
Template: "{{amount}} transferred to {{recipient}}. Ref: {{refId}}"
Reuse for every transaction with different values
```

### 4. Bulk Campaigns with Dynamic Content

```
Template: "Hi {{name}}, your exclusive {{percent}}% code: {{code}}"
Send to all users with unique codes/offers
```

## Database Schema

### notification_templates

- `id` (UUID): Primary key
- `template_id` (String, unique): User-friendly template identifier
- `title` (String): Template title with {{variables}}
- `body` (String): Template body with {{variables}}
- `locales` (JSONB): Array of supported locales
- `created_at`, `updated_at` (Timestamps)

### notifications

- `id` (UUID): Primary key
- `title`, `body` (String): Final resolved content (no placeholders)
- `type`, `category`: Notification metadata
- `publish_at` (Timestamp): When to send (null = now)
- `sent` (Boolean): Whether notification was sent
- `archived` (Boolean): Soft delete flag

## API Endpoints

| Method | Endpoint                                    | Purpose                       |
| ------ | ------------------------------------------- | ----------------------------- |
| POST   | `/api/v1/notification-templates`            | Create template               |
| GET    | `/api/v1/notification-templates`            | List all templates            |
| GET    | `/api/v1/notification-templates/:id`        | Get specific template         |
| PUT    | `/api/v1/notification-templates/:id`        | Update template               |
| DELETE | `/api/v1/notification-templates/:id`        | Delete template               |
| POST   | `/api/v1/admin/notifications/from-template` | **Send from template** ✨ NEW |

## Error Handling

| Status | Error                       | Cause                    |
| ------ | --------------------------- | ------------------------ |
| 400    | `template_id is required`   | Missing template ID      |
| 404    | `Template {id} not found`   | Template doesn't exist   |
| 400    | `Invalid notification type` | Invalid type value       |
| 401    | Unauthenticated             | No auth token            |
| 403    | Forbidden                   | Insufficient permissions |

## Testing

Comprehensive test suite in `/workspace/jest/__tests__/integration/notificationTemplateUsage.test.ts`

- 20 test cases covering:
  - Variable substitution (single, multiple, partial)
  - Template sharing workflow
  - Scheduling
  - Auth/permissions
  - Edge cases (special characters, numeric values, etc.)
  - Persistence validation

All tests passing ✅
