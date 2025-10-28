# API Documentation

This document provides a detailed overview of the API endpoints for the Nexus Data Authentication Service.

## Authentication

Most endpoints are secured and require a valid `accessToken`. The token can be provided in two ways:

1.  **Bearer Token:** In the `Authorization` header.
    ```
    Authorization: Bearer <YOUR_ACCESS_TOKEN>
    ```
2.  **Cookie:** As a cookie named `accessToken`.

---

## Administration

Administrative operations for managing the platform.

### `POST /api/v1/admin/assign-role`

**Summary:** Assign a role to a user

**Request Body:**

Content-Type: `application/json`

```json
{
  "type": "object",
  "properties": {
    "userId": {
      "type": "string",
      "format": "uuid"
    },
    "roleId": {
      "type": "string",
      "format": "uuid"
    }
  }
}
```

**Responses:**

- `__200__`: Role assigned successfully.

---

### `GET /api/v1/admin/dashboard/failed-jobs`

**Summary:** Get a list of failed background jobs

**Responses:**

- `__200__`: Successfully retrieved failed jobs.

---

### `GET /api/v1/admin/dashboard/stats`

**Summary:** Get dashboard statistics

**Responses:**

- `__200__`: Successfully retrieved dashboard stats.

---

### `GET /api/v1/admin/jobs/all`

**Summary:** Get all background jobs

**Parameters:**

| Name | In | Required | Type | Description |
|------|----|----------|------|-------------|
| `page` | query | No | `integer` | Page number for pagination |
| `limit` | query | No | `integer` | Number of jobs per page |

**Responses:**

- `__200__`: Successfully retrieved all jobs.

---

### `GET /api/v1/admin/jobs/{jobId}`

**Summary:** Get a single background job by ID

**Parameters:**

| Name | In | Required | Type | Description |
|------|----|----------|------|-------------|
| `jobId` | path | Yes | `string` |  |

**Responses:**

- `__200__`: Successfully retrieved job.
- `__404__`: Job not found.

---

### `POST /api/v1/admin/offers/{offerId}/compute-segment`

**Summary:** Compute and populate precomputed eligible users for an offer

**Parameters:**

| Name | In | Required | Type | Description |
|------|----|----------|------|-------------|
| `offerId` | path | Yes | `string` |  |

**Responses:**

- `__200__`: Segment computed successfully.
- `__400__`: Bad request.

---

### `GET /api/v1/admin/offers/{offerId}/eligible-users`

**Summary:** Get precomputed eligible users for an offer (paginated)

**Parameters:**

| Name | In | Required | Type | Description |
|------|----|----------|------|-------------|
| `offerId` | path | Yes | `string` |  |
| `page` | query | No | `integer` |  |
| `limit` | query | No | `integer` |  |

**Responses:**

- `__200__`: List of eligible users.

---

### `GET /api/v1/admin/offers/{offerId}/preview-eligibility`

**Summary:** Preview eligibility for a sample of users

**Parameters:**

| Name | In | Required | Type | Description |
|------|----|----------|------|-------------|
| `offerId` | path | Yes | `string` |  |
| `limit` | query | No | `integer` | Number of sample users to evaluate (default 100) |

**Responses:**

- `__200__`: Eligibility preview returned.

---

### `POST /api/v1/admin/offers/{offerId}/redemptions`

**Summary:** Create a bulk redemption job for an offer (sync worker stub)

**Parameters:**

| Name | In | Required | Type | Description |
|------|----|----------|------|-------------|
| `offerId` | path | Yes | `string` |  |

**Request Body:**

Content-Type: `application/json`

```json
{
  "type": "object",
  "properties": {
    "userIds": {
      "type": "array",
      "items": {
        "type": "string",
        "format": "uuid"
      }
    },
    "fromSegment": {
      "type": "boolean"
    },
    "price": {
      "type": "number"
    },
    "discount": {
      "type": "number"
    }
  }
}
```

**Responses:**

- `__200__`: Bulk redemption job enqueued/executed.
- `__400__`: Invalid request.

---

### `GET /api/v1/admin/operators`

**Summary:** Get all operators

**Responses:**

- `__200__`: Successfully retrieved operators.

---

### `POST /api/v1/admin/operators`

**Summary:** Create a new operator

**Request Body:**

Content-Type: `application/json`

```json
{
  "type": "object",
  "properties": {
    "code": {
      "type": "string"
    },
    "name": {
      "type": "string"
    },
    "isoCountry": {
      "type": "string"
    }
  }
}
```

**Responses:**

- `__201__`: Operator created successfully.

---

### `GET /api/v1/admin/operators/{operatorId}`

**Summary:** Get a single operator by ID

**Parameters:**

| Name | In | Required | Type | Description |
|------|----|----------|------|-------------|
| `operatorId` | path | Yes | `string` |  |

**Responses:**

- `__200__`: Successfully retrieved operator.
- `__404__`: Operator not found.

---

### `PUT /api/v1/admin/operators/{operatorId}`

**Summary:** Update an operator's details

**Parameters:**

| Name | In | Required | Type | Description |
|------|----|----------|------|-------------|
| `operatorId` | path | Yes | `string` |  |

**Request Body:**

Content-Type: `application/json`

```json
{
  "type": "object",
  "properties": {
    "name": {
      "type": "string"
    },
    "isoCountry": {
      "type": "string"
    }
  }
}
```

**Responses:**

- `__200__`: Operator updated successfully.

---

### `GET /api/v1/admin/products`

**Summary:** Get all operator products

**Responses:**

- `__200__`: Successfully retrieved products.

---

### `POST /api/v1/admin/products`

**Summary:** Create a new product (with optional supplier mapping)

**Request Body:**

Content-Type: `application/json`

```json
{
  "type": "object",
  "properties": {
    "operatorId": {
      "type": "string",
      "format": "uuid"
    },
    "productCode": {
      "type": "string"
    },
    "name": {
      "type": "string"
    },
    "productType": {
      "type": "string"
    },
    "denomAmount": {
      "type": "number"
    },
    "dataMb": {
      "type": "number"
    },
    "validityDays": {
      "type": "number"
    },
    "isActive": {
      "type": "boolean"
    },
    "metadata": {
      "type": "object"
    },
    "supplierId": {
      "type": "string",
      "format": "uuid",
      "description": "Optional supplier ID to create mapping with"
    },
    "supplierProductCode": {
      "type": "string",
      "description": "Optional supplier-specific product code"
    },
    "supplierPrice": {
      "type": "number",
      "description": "Optional supplier price for the mapping"
    },
    "minOrderAmount": {
      "type": "number",
      "description": "Optional minimum order amount"
    },
    "maxOrderAmount": {
      "type": "number",
      "description": "Optional maximum order amount"
    },
    "leadTimeSeconds": {
      "type": "number",
      "description": "Optional lead time in seconds"
    },
    "mappingIsActive": {
      "type": "boolean",
      "description": "Optional active status for the mapping"
    }
  }
}
```

**Responses:**

- `__201__`: Product (and optionally mapping) created successfully.

---

### `GET /api/v1/admin/products/{productId}`

**Summary:** Get a single product by ID

**Parameters:**

| Name | In | Required | Type | Description |
|------|----|----------|------|-------------|
| `productId` | path | Yes | `string` |  |

**Responses:**

- `__200__`: Successfully retrieved product.
- `__404__`: Product not found.

---

### `PUT /api/v1/admin/products/{productId}`

**Summary:** Update a product's details

**Parameters:**

| Name | In | Required | Type | Description |
|------|----|----------|------|-------------|
| `productId` | path | Yes | `string` |  |

**Request Body:**

Content-Type: `application/json`

```json
{
  "type": "object",
  "properties": {
    "name": {
      "type": "string"
    },
    "productCode": {
      "type": "string"
    },
    "productType": {
      "type": "string"
    },
    "denomAmount": {
      "type": "number"
    },
    "dataMb": {
      "type": "number"
    },
    "validityDays": {
      "type": "number"
    },
    "isActive": {
      "type": "boolean"
    },
    "metadata": {
      "type": "object"
    }
  }
}
```

**Responses:**

- `__200__`: Product updated successfully.

---

### `POST /api/v1/admin/products/{productId}/map-to-supplier`

**Summary:** Link a product to a specific supplier

**Parameters:**

| Name | In | Required | Type | Description |
|------|----|----------|------|-------------|
| `productId` | path | Yes | `string` |  |

**Request Body:**

Content-Type: `application/json`

```json
{
  "type": "object",
  "properties": {
    "supplierId": {
      "type": "string",
      "format": "uuid"
    },
    "supplierProductCode": {
      "type": "string"
    },
    "supplierPrice": {
      "type": "number"
    },
    "minOrderAmount": {
      "type": "number"
    },
    "maxOrderAmount": {
      "type": "number"
    },
    "leadTimeSeconds": {
      "type": "number"
    },
    "isActive": {
      "type": "boolean"
    }
  }
}
```

**Responses:**

- `__201__`: Product mapped to supplier successfully.

---

### `GET /api/v1/admin/roles`

**Summary:** Get all roles

**Responses:**

- `__200__`: Successfully retrieved roles.

---

### `GET /api/v1/admin/settlements`

**Summary:** Get all settlements with optional filters

**Parameters:**

| Name | In | Required | Type | Description |
|------|----|----------|------|-------------|
| `providerId` | query | No | `string` | Filter by provider ID |
| `dateFrom` | query | No | `string` | Filter from this date |
| `dateTo` | query | No | `string` | Filter to this date |

**Responses:**

- `__200__`: Successfully retrieved settlements.

---

### `POST /api/v1/admin/settlements`

**Summary:** Create a new settlement

**Request Body:**

Content-Type: `application/json`

```json
{
  "type": "object",
  "properties": {
    "providerId": {
      "type": "string",
      "format": "uuid"
    },
    "settlementDate": {
      "type": "string",
      "format": "date"
    },
    "amount": {
      "type": "number"
    },
    "fees": {
      "type": "number"
    },
    "reference": {
      "type": "string"
    },
    "rawReport": {
      "type": "object"
    }
  }
}
```

**Responses:**

- `__201__`: Settlement created successfully.

---

### `GET /api/v1/admin/settlements/{settlementId}`

**Summary:** Get a single settlement by ID

**Parameters:**

| Name | In | Required | Type | Description |
|------|----|----------|------|-------------|
| `settlementId` | path | Yes | `string` |  |

**Responses:**

- `__200__`: Successfully retrieved settlement.
- `__404__`: Settlement not found.

---

### `GET /api/v1/admin/suppliers`

**Summary:** Get all suppliers

**Responses:**

- `__200__`: Successfully retrieved suppliers.

---

### `POST /api/v1/admin/suppliers`

**Summary:** Create a new supplier

**Request Body:**

Content-Type: `application/json`

```json
{
  "type": "object",
  "properties": {
    "name": {
      "type": "string"
    },
    "slug": {
      "type": "string"
    },
    "apiBase": {
      "type": "string"
    },
    "apiKey": {
      "type": "string"
    },
    "priorityInt": {
      "type": "number"
    },
    "isActive": {
      "type": "boolean"
    }
  }
}
```

**Responses:**

- `__201__`: Supplier created successfully.

---

### `GET /api/v1/admin/suppliers/{supplierId}`

**Summary:** Get a single supplier by ID

**Parameters:**

| Name | In | Required | Type | Description |
|------|----|----------|------|-------------|
| `supplierId` | path | Yes | `string` |  |

**Responses:**

- `__200__`: Successfully retrieved supplier.
- `__404__`: Supplier not found.

---

### `PUT /api/v1/admin/suppliers/{supplierId}`

**Summary:** Update a supplier's details

**Parameters:**

| Name | In | Required | Type | Description |
|------|----|----------|------|-------------|
| `supplierId` | path | Yes | `string` |  |

**Request Body:**

Content-Type: `application/json`

```json
{
  "type": "object",
  "properties": {
    "name": {
      "type": "string"
    },
    "apiBase": {
      "type": "string"
    },
    "apiKey": {
      "type": "string"
    },
    "priorityInt": {
      "type": "number"
    },
    "isActive": {
      "type": "boolean"
    }
  }
}
```

**Responses:**

- `__200__`: Supplier updated successfully.

---

### `GET /api/v1/admin/topup-requests`

**Summary:** Get all topup requests with optional filters

**Parameters:**

| Name | In | Required | Type | Description |
|------|----|----------|------|-------------|
| `status` | query | No | `string` | Filter by status (pending, success, failed, reversed, retry) |
| `userId` | query | No | `string` | Filter by user ID |
| `dateFrom` | query | No | `string` | Filter from this date |
| `dateTo` | query | No | `string` | Filter to this date |
| `page` | query | No | `integer` | Page number for pagination |
| `limit` | query | No | `integer` | Number of requests per page |

**Responses:**

- `__200__`: Successfully retrieved topup requests.

---

### `GET /api/v1/admin/topup-requests/{requestId}`

**Summary:** Get a single topup request by ID

**Parameters:**

| Name | In | Required | Type | Description |
|------|----|----------|------|-------------|
| `requestId` | path | Yes | `string` |  |

**Responses:**

- `__200__`: Successfully retrieved topup request.
- `__404__`: Topup request not found.

---

### `POST /api/v1/admin/topup-requests/{requestId}/retry`

**Summary:** Retry a failed topup request

**Parameters:**

| Name | In | Required | Type | Description |
|------|----|----------|------|-------------|
| `requestId` | path | Yes | `string` |  |

**Responses:**

- `__200__`: Topup request retry initiated successfully.
- `__404__`: Topup request not found.

---

### `GET /api/v1/admin/transactions`

**Summary:** Get all transactions with optional filters

**Parameters:**

| Name | In | Required | Type | Description |
|------|----|----------|------|-------------|
| `userId` | query | No | `string` | Filter by user ID |
| `dateFrom` | query | No | `string` | Filter from this date |
| `dateTo` | query | No | `string` | Filter to this date |
| `direction` | query | No | `string` | Filter by transaction direction |
| `page` | query | No | `integer` | Page number for pagination |
| `limit` | query | No | `integer` | Number of transactions per page |

**Responses:**

- `__200__`: Successfully retrieved transactions.

---

### `GET /api/v1/admin/transactions/{transactionId}`

**Summary:** Get a single transaction by ID

**Parameters:**

| Name | In | Required | Type | Description |
|------|----|----------|------|-------------|
| `transactionId` | path | Yes | `string` |  |

**Responses:**

- `__200__`: Successfully retrieved transaction.
- `__404__`: Transaction not found.

---

### `POST /api/v1/admin/users`

**Summary:** Create a new user

**Request Body:**

Content-Type: `application/json`

Schema: `RegisterRequest`

```json
{
  "type": "object",
  "required": [
    "email",
    "password"
  ],
  "properties": {
    "email": {
      "type": "string",
      "format": "email",
      "example": "user@example.com"
    },
    "password": {
      "type": "string",
      "minLength": 8,
      "example": "Password123!"
    },
    "phoneNumber": {
      "type": "string",
      "minLength": 11,
      "example": "0000000000"
    },
    "fullName": {
      "type": "string",
      "minLength": 36,
      "example": "John Doe"
    }
  }
}
```

**Responses:**

- `__201__`: User created successfully.

---

### `GET /api/v1/admin/users`

**Summary:** Get all users

**Parameters:**

| Name | In | Required | Type | Description |
|------|----|----------|------|-------------|
| `page` | query | No | `integer` | Page number for pagination. |
| `limit` | query | No | `integer` | Number of users per page. |

**Responses:**

- `__200__`: Successfully retrieved users.

---

### `GET /api/v1/admin/users/inactive`

**Summary:** Get inactive users

**Parameters:**

| Name | In | Required | Type | Description |
|------|----|----------|------|-------------|
| `inactiveSince` | query | No | `string` | The date to check for inactivity from. |

**Responses:**

- `__200__`: Successfully retrieved inactive users.

---

### `GET /api/v1/admin/users/{userId}`

**Summary:** Get a single user by ID

**Parameters:**

| Name | In | Required | Type | Description |
|------|----|----------|------|-------------|
| `userId` | path | Yes | `string` |  |

**Responses:**

- `__200__`: Successfully retrieved user details.
- `__404__`: User not found.

---

### `PUT /api/v1/admin/users/{userId}`

**Summary:** Update a user's details

**Parameters:**

| Name | In | Required | Type | Description |
|------|----|----------|------|-------------|
| `userId` | path | Yes | `string` |  |

**Request Body:**

Content-Type: `application/json`

```json
{
  "type": "object",
  "properties": {
    "fullName": {
      "type": "string"
    },
    "phoneNumber": {
      "type": "string"
    }
  }
}
```

**Responses:**

- `__200__`: User updated successfully.

---

### `POST /api/v1/admin/users/{userId}/credit`

**Summary:** Manually credit a user's wallet

**Parameters:**

| Name | In | Required | Type | Description |
|------|----|----------|------|-------------|
| `userId` | path | Yes | `string` |  |

**Request Body:**

Content-Type: `application/json`

```json
{
  "type": "object",
  "properties": {
    "amount": {
      "type": "number",
      "format": "double"
    }
  }
}
```

**Responses:**

- `__200__`: Wallet credited successfully.

---

### `POST /api/v1/admin/users/{userId}/debit`

**Summary:** Manually debit a user's wallet

**Parameters:**

| Name | In | Required | Type | Description |
|------|----|----------|------|-------------|
| `userId` | path | Yes | `string` |  |

**Request Body:**

Content-Type: `application/json`

```json
{
  "type": "object",
  "properties": {
    "amount": {
      "type": "number",
      "format": "double"
    }
  }
}
```

**Responses:**

- `__200__`: Wallet debited successfully.

---

### `POST /api/v1/admin/users/{userId}/disable-2fa`

**Summary:** Disable a user's 2FA by an admin

**Parameters:**

| Name | In | Required | Type | Description |
|------|----|----------|------|-------------|
| `userId` | path | Yes | `string` |  |

**Responses:**

- `__200__`: 2FA disabled successfully for the user.

---

### `GET /api/v1/admin/users/{userId}/sessions`

**Summary:** Get all active sessions for a user

**Parameters:**

| Name | In | Required | Type | Description |
|------|----|----------|------|-------------|
| `userId` | path | Yes | `string` |  |

**Responses:**

- `__200__`: Successfully retrieved user sessions.

---

### `DELETE /api/v1/admin/users/{userId}/sessions`

**Summary:** Revoke all sessions for a user

**Parameters:**

| Name | In | Required | Type | Description |
|------|----|----------|------|-------------|
| `userId` | path | Yes | `string` |  |

**Responses:**

- `__200__`: Sessions revoked successfully.

---

### `POST /api/v1/admin/users/{userId}/suspend`

**Summary:** Suspend a user's account

**Parameters:**

| Name | In | Required | Type | Description |
|------|----|----------|------|-------------|
| `userId` | path | Yes | `string` |  |

**Responses:**

- `__200__`: User suspended successfully.

---

### `POST /api/v1/admin/users/{userId}/unsuspend`

**Summary:** Unsuspend a user's account

**Parameters:**

| Name | In | Required | Type | Description |
|------|----|----------|------|-------------|
| `userId` | path | Yes | `string` |  |

**Responses:**

- `__200__`: User unsuspended successfully.

---

## Authentication

User authentication and registration

### `POST /api/v1/auth/login`

**Summary:** Log in a user

**Request Body:**

Content-Type: `application/json`

Schema: `LoginRequest`

```json
{
  "type": "object",
  "required": [
    "credentials",
    "password"
  ],
  "properties": {
    "credentialse": {
      "type": "string",
      "enum": [
        "email",
        "phone"
      ],
      "example": "email or phone"
    },
    "password": {
      "type": "string",
      "example": "Password123!"
    }
  }
}
```

**Responses:**

- `__200__`: User logged in successfully
  - Content-Type: `application/json`
    ```json
{
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean",
      "example": true
    },
    "message": {
      "type": "string",
      "example": "Login successful"
    },
    "data": {
      "type": "object",
      "properties": {
        "accessToken": {
          "type": "string",
          "example": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
        },
        "refreshToken": {
          "type": "string",
          "example": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
        }
      }
    }
  }
}
    ```

- `__400__`: Validation error
  - Content-Type: `application/json`
    Schema: `ErrorResponse`

    ```json
{
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean",
      "example": false
    },
    "message": {
      "type": "string",
      "example": "Error description"
    },
    "errors": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "field": {
            "type": "string"
          },
          "message": {
            "type": "string"
          }
        }
      }
    }
  }
}
    ```

- `__401__`: Invalid credentials
  - Content-Type: `application/json`
    Schema: `ErrorResponse`

    ```json
{
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean",
      "example": false
    },
    "message": {
      "type": "string",
      "example": "Error description"
    },
    "errors": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "field": {
            "type": "string"
          },
          "message": {
            "type": "string"
          }
        }
      }
    }
  }
}
    ```

- `__500__`: Internal server error
  - Content-Type: `application/json`
    Schema: `ErrorResponse`

    ```json
{
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean",
      "example": false
    },
    "message": {
      "type": "string",
      "example": "Error description"
    },
    "errors": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "field": {
            "type": "string"
          },
          "message": {
            "type": "string"
          }
        }
      }
    }
  }
}
    ```


---

### `POST /api/v1/auth/logout`

**Summary:** Log out a user

**Responses:**

- `__200__`: User logged out successfully
  - Content-Type: `application/json`
    ```json
{
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean",
      "example": true
    },
    "message": {
      "type": "string",
      "example": "Logout successful"
    }
  }
}
    ```

- `__401__`: Authentication required
  - Content-Type: `application/json`
    Schema: `ErrorResponse`

    ```json
{
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean",
      "example": false
    },
    "message": {
      "type": "string",
      "example": "Error description"
    },
    "errors": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "field": {
            "type": "string"
          },
          "message": {
            "type": "string"
          }
        }
      }
    }
  }
}
    ```

- `__500__`: Internal server error
  - Content-Type: `application/json`
    Schema: `ErrorResponse`

    ```json
{
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean",
      "example": false
    },
    "message": {
      "type": "string",
      "example": "Error description"
    },
    "errors": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "field": {
            "type": "string"
          },
          "message": {
            "type": "string"
          }
        }
      }
    }
  }
}
    ```


---

### `POST /api/v1/auth/refresh`

**Summary:** Refresh an access token

**Responses:**

- `__200__`: Token refreshed successfully
  - Content-Type: `application/json`
    ```json
{
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean",
      "example": true
    },
    "message": {
      "type": "string",
      "example": "Token refreshed successfully"
    },
    "data": {
      "type": "object",
      "properties": {
        "accessToken": {
          "type": "string",
          "example": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
        }
      }
    }
  }
}
    ```

- `__401__`: Invalid refresh token
  - Content-Type: `application/json`
    Schema: `ErrorResponse`

    ```json
{
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean",
      "example": false
    },
    "message": {
      "type": "string",
      "example": "Error description"
    },
    "errors": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "field": {
            "type": "string"
          },
          "message": {
            "type": "string"
          }
        }
      }
    }
  }
}
    ```

- `__500__`: Internal server error
  - Content-Type: `application/json`
    Schema: `ErrorResponse`

    ```json
{
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean",
      "example": false
    },
    "message": {
      "type": "string",
      "example": "Error description"
    },
    "errors": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "field": {
            "type": "string"
          },
          "message": {
            "type": "string"
          }
        }
      }
    }
  }
}
    ```


---

### `POST /api/v1/auth/register`

**Summary:** Register a new user

**Request Body:**

Content-Type: `application/json`

Schema: `RegisterRequest`

```json
{
  "type": "object",
  "required": [
    "email",
    "password"
  ],
  "properties": {
    "email": {
      "type": "string",
      "format": "email",
      "example": "user@example.com"
    },
    "password": {
      "type": "string",
      "minLength": 8,
      "example": "Password123!"
    },
    "phoneNumber": {
      "type": "string",
      "minLength": 11,
      "example": "0000000000"
    },
    "fullName": {
      "type": "string",
      "minLength": 36,
      "example": "John Doe"
    }
  }
}
```

**Responses:**

- `__201__`: User registered successfully
  - Content-Type: `application/json`
    ```json
{
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean",
      "example": true
    },
    "message": {
      "type": "string",
      "example": "User registered successfully. Please check your email to verify your account."
    },
    "data": {
      "type": "object",
      "properties": {
        "user": {
          "$ref": "#/components/schemas/User"
        }
      }
    }
  }
}
    ```

- `__400__`: Validation error
  - Content-Type: `application/json`
    Schema: `ErrorResponse`

    ```json
{
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean",
      "example": false
    },
    "message": {
      "type": "string",
      "example": "Error description"
    },
    "errors": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "field": {
            "type": "string"
          },
          "message": {
            "type": "string"
          }
        }
      }
    }
  }
}
    ```

- `__500__`: Internal server error
  - Content-Type: `application/json`
    Schema: `ErrorResponse`

    ```json
{
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean",
      "example": false
    },
    "message": {
      "type": "string",
      "example": "Error description"
    },
    "errors": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "field": {
            "type": "string"
          },
          "message": {
            "type": "string"
          }
        }
      }
    }
  }
}
    ```


---

## Chat

Chat channels and messages

### `GET /api/v1/chat/channels`

**Summary:** Get channels for the authenticated user

**Responses:**

- `__200__`: List of channels
  - Content-Type: `application/json`
    Schema: `ChannelListResponse`

    ```json
{
  "type": "array",
  "properties": {
    "success": {
      "type": "boolean"
    },
    "message": {
      "type": "string"
    },
    "data": {
      "type": "array",
      "items": {
        "$ref": "#/components/schemas/Channel"
      }
    }
  },
  "items": {
    "$ref": "#/components/schemas/Channel"
  }
}
    ```


---

### `GET /api/v1/chat/channels/{channelId}/messages`

**Summary:** Get messages for a channel

**Parameters:**

| Name | In | Required | Type | Description |
|------|----|----------|------|-------------|
| `channelId` | path | Yes | `string` |  |

**Responses:**

- `__200__`: Messages in the channel
  - Content-Type: `application/json`
    Schema: `MessagesListResponse`

    ```json
{
  "type": "array",
  "properties": {
    "success": {
      "type": "boolean"
    },
    "message": {
      "type": "string"
    },
    "data": {
      "type": "array",
      "items": {
        "$ref": "#/components/schemas/Message"
      }
    }
  },
  "items": {
    "$ref": "#/components/schemas/Message"
  }
}
    ```


---

### `POST /api/v1/chat/support`

**Summary:** Create or get a support channel for the authenticated user

**Responses:**

- `__201__`: Support channel created
  - Content-Type: `application/json`
    Schema: `Channel`

    ```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "format": "uuid"
    },
    "name": {
      "type": "string"
    },
    "isSupport": {
      "type": "boolean"
    },
    "createdAt": {
      "type": "string",
      "format": "date-time"
    },
    "is_support": {
      "type": "boolean"
    },
    "created_at": {
      "type": "string",
      "format": "date-time"
    }
  }
}
    ```


---

## Health

Service health and monitoring

### `GET /api/v1/alive`

**Summary:** Get service liveness status

Returns whether the service process is alive

**Responses:**

- `__200__`: Service is alive
  - Content-Type: `application/json`
    ```json
{
  "type": "object",
  "properties": {
    "status": {
      "type": "string",
      "example": "alive"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time"
    },
    "pid": {
      "type": "integer",
      "example": 12345
    }
  }
}
    ```


---

### `GET /api/v1/health`

**Summary:** Get service health status

Returns the overall health status of the service including database and Redis connections

**Responses:**

- `__200__`: Service is healthy
  - Content-Type: `application/json`
    ```json
{
  "type": "object",
  "properties": {
    "status": {
      "type": "string",
      "example": "ok"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time"
    },
    "uptime": {
      "type": "integer",
      "example": 12345
    },
    "version": {
      "type": "string",
      "example": "1.0.0"
    },
    "services": {
      "type": "object",
      "properties": {
        "database": {
          "type": "string",
          "example": "healthy"
        },
        "redis": {
          "type": "string",
          "example": "healthy"
        },
        "application": {
          "type": "string",
          "example": "healthy"
        }
      }
    },
    "system": {
      "type": "object",
      "properties": {
        "memory": {
          "type": "object",
          "properties": {
            "used": {
              "type": "number",
              "example": 45.5
            },
            "total": {
              "type": "number",
              "example": 128
            },
            "unit": {
              "type": "string",
              "example": "MB"
            }
          }
        },
        "cpu": {
          "type": "object",
          "properties": {
            "load": {
              "type": "integer",
              "example": 1234
            }
          }
        }
      }
    }
  }
}
    ```

- `__503__`: Service is unhealthy
  - Content-Type: `application/json`
    ```json
{
  "type": "object",
  "properties": {
    "status": {
      "type": "string",
      "example": "error"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time"
    },
    "error": {
      "type": "string",
      "example": "Health check failed"
    }
  }
}
    ```


---

### `GET /api/v1/ready`

**Summary:** Get service readiness status

Returns whether the service is ready to serve requests

**Responses:**

- `__200__`: Service is ready
  - Content-Type: `application/json`
    ```json
{
  "type": "object",
  "properties": {
    "status": {
      "type": "string",
      "example": "ready"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time"
    },
    "services": {
      "type": "object",
      "properties": {
        "database": {
          "type": "string",
          "example": "ready"
        },
        "redis": {
          "type": "string",
          "example": "ready"
        }
      }
    }
  }
}
    ```

- `__503__`: Service is not ready
  - Content-Type: `application/json`
    ```json
{
  "type": "object",
  "properties": {
    "status": {
      "type": "string",
      "example": "not ready"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time"
    },
    "services": {
      "type": "object",
      "properties": {
        "database": {
          "type": "string",
          "example": "not ready"
        },
        "redis": {
          "type": "string",
          "example": "not ready"
        }
      }
    }
  }
}
    ```


---

## Mobile Auth

Authentication for mobile devices

### `POST /api/v1/mobile/auth/login`

**Summary:** Login for mobile users

**Request Body:**

Content-Type: `application/json`

```json
{
  "type": "object",
  "required": [
    "email",
    "password"
  ],
  "properties": {
    "email": {
      "type": "string",
      "format": "email"
    },
    "password": {
      "type": "string"
    },
    "deviceId": {
      "type": "string"
    },
    "totpCode": {
      "type": "string"
    },
    "backupCode": {
      "type": "string"
    }
  }
}
```

**Responses:**

- `__200__`: Successful login
  - Content-Type: `application/json`
    ```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string"
    },
    "email": {
      "type": "string"
    },
    "role": {
      "type": "string"
    },
    "accessToken": {
      "type": "string"
    },
    "refreshToken": {
      "type": "string"
    }
  }
}
    ```

- `__400__`: Bad request
- `__401__`: Unauthorized

---

### `POST /api/v1/mobile/auth/refresh`

**Summary:** Refresh access token for mobile users

**Request Body:**

Content-Type: `application/json`

```json
{
  "type": "object",
  "required": [
    "refreshToken"
  ],
  "properties": {
    "refreshToken": {
      "type": "string"
    }
  }
}
```

**Responses:**

- `__200__`: Tokens refreshed successfully
  - Content-Type: `application/json`
    ```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string"
    },
    "email": {
      "type": "string"
    },
    "role": {
      "type": "string"
    },
    "accessToken": {
      "type": "string"
    },
    "refreshToken": {
      "type": "string"
    }
  }
}
    ```

- `__401__`: Invalid refresh token

---

## Notification Analytics

View notification analytics

### `GET /api/v1/notification-analytics/notification/{notificationId}`

**Summary:** Get analytics by notification ID

**Parameters:**

| Name | In | Required | Type | Description |
|------|----|----------|------|-------------|
| `notificationId` | path | Yes | `string` |  |

**Responses:**

- `__200__`: Analytics data
  - Content-Type: `application/json`
    ```json
{
  "type": "array",
  "items": {
    "$ref": "#/components/schemas/NotificationAnalytics"
  }
}
    ```


---

### `GET /api/v1/notification-analytics/user/{userId}`

**Summary:** Get analytics by user ID

**Parameters:**

| Name | In | Required | Type | Description |
|------|----|----------|------|-------------|
| `userId` | path | Yes | `string` |  |

**Responses:**

- `__200__`: Analytics data
  - Content-Type: `application/json`
    ```json
{
  "type": "array",
  "items": {
    "$ref": "#/components/schemas/NotificationAnalytics"
  }
}
    ```


---

## Notification Templates

Manage notification templates

### `POST /api/v1/notification-templates`

**Summary:** Create a new notification template

**Request Body:**

Content-Type: `application/json`

Schema: `NotificationTemplate`

```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "format": "uuid"
    },
    "template_id": {
      "type": "string"
    },
    "title": {
      "type": "string"
    },
    "body": {
      "type": "string"
    },
    "locales": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "created_at": {
      "type": "string",
      "format": "date-time"
    },
    "updated_at": {
      "type": "string",
      "format": "date-time"
    }
  }
}
```

**Responses:**

- `__201__`: Template created
  - Content-Type: `application/json`
    Schema: `NotificationTemplate`

    ```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "format": "uuid"
    },
    "template_id": {
      "type": "string"
    },
    "title": {
      "type": "string"
    },
    "body": {
      "type": "string"
    },
    "locales": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "created_at": {
      "type": "string",
      "format": "date-time"
    },
    "updated_at": {
      "type": "string",
      "format": "date-time"
    }
  }
}
    ```


---

### `GET /api/v1/notification-templates`

**Summary:** Get all notification templates

**Responses:**

- `__200__`: List of templates
  - Content-Type: `application/json`
    ```json
{
  "type": "array",
  "items": {
    "$ref": "#/components/schemas/NotificationTemplate"
  }
}
    ```


---

### `GET /api/v1/notification-templates/{templateId}`

**Summary:** Get a notification template by ID

**Parameters:**

| Name | In | Required | Type | Description |
|------|----|----------|------|-------------|
| `templateId` | path | Yes | `string` |  |

**Responses:**

- `__200__`: Template details
  - Content-Type: `application/json`
    Schema: `NotificationTemplate`

    ```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "format": "uuid"
    },
    "template_id": {
      "type": "string"
    },
    "title": {
      "type": "string"
    },
    "body": {
      "type": "string"
    },
    "locales": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "created_at": {
      "type": "string",
      "format": "date-time"
    },
    "updated_at": {
      "type": "string",
      "format": "date-time"
    }
  }
}
    ```


---

### `PUT /api/v1/notification-templates/{templateId}`

**Summary:** Update a notification template

**Parameters:**

| Name | In | Required | Type | Description |
|------|----|----------|------|-------------|
| `templateId` | path | Yes | `string` |  |

**Request Body:**

Content-Type: `application/json`

Schema: `NotificationTemplate`

```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "format": "uuid"
    },
    "template_id": {
      "type": "string"
    },
    "title": {
      "type": "string"
    },
    "body": {
      "type": "string"
    },
    "locales": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "created_at": {
      "type": "string",
      "format": "date-time"
    },
    "updated_at": {
      "type": "string",
      "format": "date-time"
    }
  }
}
```

**Responses:**

- `__200__`: Template updated
  - Content-Type: `application/json`
    Schema: `NotificationTemplate`

    ```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "format": "uuid"
    },
    "template_id": {
      "type": "string"
    },
    "title": {
      "type": "string"
    },
    "body": {
      "type": "string"
    },
    "locales": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "created_at": {
      "type": "string",
      "format": "date-time"
    },
    "updated_at": {
      "type": "string",
      "format": "date-time"
    }
  }
}
    ```


---

### `DELETE /api/v1/notification-templates/{templateId}`

**Summary:** Delete a notification template

**Parameters:**

| Name | In | Required | Type | Description |
|------|----|----------|------|-------------|
| `templateId` | path | Yes | `string` |  |

**Responses:**

- `__200__`: Template deleted

---

## Notifications

Push notifications and notification management

### `GET /api/v1/notifications`

**Summary:** Get notifications for the authenticated user

**Responses:**

- `__200__`: List of user notifications
  - Content-Type: `application/json`
    ```json
{
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean"
    },
    "message": {
      "type": "string"
    },
    "data": {
      "type": "array",
      "items": {
        "$ref": "#/components/schemas/Notification"
      }
    }
  }
}
    ```


---

### `POST /api/v1/notifications`

**Summary:** Create a new notification (admin)

**Request Body:**

Content-Type: `application/json`

Schema: `CreateNotificationRequest`

```json
{
  "type": "object",
  "required": [
    "title",
    "body"
  ],
  "properties": {
    "title": {
      "type": "string"
    },
    "body": {
      "type": "string"
    },
    "target": {
      "type": "object"
    },
    "publishAt": {
      "type": "string",
      "format": "date-time"
    },
    "targetCriteria": {
      "$ref": "#/components/schemas/NotificationTargetCriteria"
    },
    "publish_at": {
      "type": "string",
      "format": "date-time"
    }
  }
}
```

**Responses:**

- `__201__`: Notification created
  - Content-Type: `application/json`
    Schema: `Notification`

    ```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "format": "uuid"
    },
    "title": {
      "type": "string"
    },
    "body": {
      "type": "string"
    },
    "target": {
      "type": "object"
    },
    "publishAt": {
      "type": "string",
      "format": "date-time"
    },
    "createdBy": {
      "type": "string",
      "format": "uuid"
    },
    "createdAt": {
      "type": "string",
      "format": "date-time"
    },
    "sent": {
      "type": "boolean"
    },
    "archived": {
      "type": "boolean"
    },
    "targetCriteria": {
      "$ref": "#/components/schemas/NotificationTargetCriteria"
    },
    "publish_at": {
      "type": "string",
      "format": "date-time"
    },
    "created_by": {
      "type": "string",
      "format": "uuid"
    },
    "created_at": {
      "type": "string",
      "format": "date-time"
    }
  }
}
    ```


---

### `POST /api/v1/notifications/tokens`

**Summary:** Register a push token for the authenticated user

**Request Body:**

Content-Type: `application/json`

Schema: `PushTokenRegisterRequest`

```json
{
  "type": "object",
  "required": [
    "token",
    "platform"
  ],
  "properties": {
    "platform": {
      "type": "string",
      "enum": [
        "ios",
        "android",
        "web"
      ]
    },
    "token": {
      "type": "string"
    }
  }
}
```

**Responses:**

- `__204__`: Push token registered
- `__400__`: Validation error

---

## Offers

Offer management and redemption.

### `POST /api/v1/offers`

**Summary:** Create a new offer

**Request Body:**

Content-Type: `application/json`

Schema: `CreateOfferRequest`

**Responses:**

- `__201__`: Offer created successfully.
- `__400__`: Invalid input.

---

### `GET /api/v1/offers/{offerId}`

**Summary:** Get an offer by ID

**Parameters:**

| Name | In | Required | Type | Description |
|------|----|----------|------|-------------|
| `offerId` | path | Yes | `string` |  |

**Responses:**

- `__200__`: Successfully retrieved the offer.
- `__404__`: Offer not found.

---

### `PUT /api/v1/offers/{offerId}`

**Summary:** Update an offer

**Parameters:**

| Name | In | Required | Type | Description |
|------|----|----------|------|-------------|
| `offerId` | path | Yes | `string` |  |

**Request Body:**

Content-Type: `application/json`

Schema: `UpdateOfferRequest`

**Responses:**

- `__200__`: Offer updated successfully.
- `__404__`: Offer not found.

---

### `DELETE /api/v1/offers/{offerId}`

**Summary:** Delete an offer

**Parameters:**

| Name | In | Required | Type | Description |
|------|----|----------|------|-------------|
| `offerId` | path | Yes | `string` |  |

**Responses:**

- `__200__`: Offer deleted successfully.
- `__404__`: Offer not found.

---

### `POST /api/v1/offers/{offerId}/redeem`

**Summary:** Redeem an offer

**Parameters:**

| Name | In | Required | Type | Description |
|------|----|----------|------|-------------|
| `offerId` | path | Yes | `string` |  |

**Request Body:**

Content-Type: `application/json`

Schema: `RedeemOfferRequest`

**Responses:**

- `__200__`: Offer redeemed successfully.
- `__400__`: Invalid input or offer not active.
- `__403__`: User not eligible or limit reached.
- `__404__`: Offer not found.

---

## Password

Password management

### `POST /api/v1/password/forgot-password`

**Summary:** Request a password reset

**Request Body:**

Content-Type: `application/json`

```json
{
  "type": "object",
  "required": [
    "email"
  ],
  "properties": {
    "email": {
      "type": "string",
      "format": "email",
      "example": "user@example.com"
    }
  }
}
```

**Responses:**

- `__200__`: Password reset email sent successfully
  - Content-Type: `application/json`
    ```json
{
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean",
      "example": true
    },
    "message": {
      "type": "string",
      "example": "Password reset email sent successfully"
    }
  }
}
    ```

- `__400__`: Validation error
  - Content-Type: `application/json`
    Schema: `ErrorResponse`

    ```json
{
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean",
      "example": false
    },
    "message": {
      "type": "string",
      "example": "Error description"
    },
    "errors": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "field": {
            "type": "string"
          },
          "message": {
            "type": "string"
          }
        }
      }
    }
  }
}
    ```

- `__404__`: User not found
  - Content-Type: `application/json`
    Schema: `ErrorResponse`

    ```json
{
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean",
      "example": false
    },
    "message": {
      "type": "string",
      "example": "Error description"
    },
    "errors": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "field": {
            "type": "string"
          },
          "message": {
            "type": "string"
          }
        }
      }
    }
  }
}
    ```

- `__500__`: Internal server error
  - Content-Type: `application/json`
    Schema: `ErrorResponse`

    ```json
{
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean",
      "example": false
    },
    "message": {
      "type": "string",
      "example": "Error description"
    },
    "errors": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "field": {
            "type": "string"
          },
          "message": {
            "type": "string"
          }
        }
      }
    }
  }
}
    ```


---

### `POST /api/v1/password/reset-password`

**Summary:** Reset a user's password

**Request Body:**

Content-Type: `application/json`

```json
{
  "type": "object",
  "required": [
    "token",
    "password"
  ],
  "properties": {
    "token": {
      "type": "string",
      "example": "someRandomToken"
    },
    "password": {
      "type": "string",
      "minLength": 8,
      "example": "NewPassword123!"
    }
  }
}
```

**Responses:**

- `__200__`: Password reset successfully
  - Content-Type: `application/json`
    ```json
{
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean",
      "example": true
    },
    "message": {
      "type": "string",
      "example": "Password reset successfully"
    }
  }
}
    ```

- `__400__`: Invalid or expired token
  - Content-Type: `application/json`
    Schema: `ErrorResponse`

    ```json
{
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean",
      "example": false
    },
    "message": {
      "type": "string",
      "example": "Error description"
    },
    "errors": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "field": {
            "type": "string"
          },
          "message": {
            "type": "string"
          }
        }
      }
    }
  }
}
    ```

- `__500__`: Internal server error
  - Content-Type: `application/json`
    Schema: `ErrorResponse`

    ```json
{
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean",
      "example": false
    },
    "message": {
      "type": "string",
      "example": "Error description"
    },
    "errors": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "field": {
            "type": "string"
          },
          "message": {
            "type": "string"
          }
        }
      }
    }
  }
}
    ```


---

### `POST /api/v1/password/update-password`

**Summary:** Update a user's password

**Request Body:**

Content-Type: `application/json`

```json
{
  "type": "object",
  "required": [
    "oldPassword",
    "newPassword"
  ],
  "properties": {
    "oldPassword": {
      "type": "string",
      "example": "OldPassword123!"
    },
    "newPassword": {
      "type": "string",
      "minLength": 8,
      "example": "NewPassword123!"
    }
  }
}
```

**Responses:**

- `__200__`: Password updated successfully
  - Content-Type: `application/json`
    ```json
{
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean",
      "example": true
    },
    "message": {
      "type": "string",
      "example": "Password updated successfully"
    }
  }
}
    ```

- `__400__`: Validation error
  - Content-Type: `application/json`
    Schema: `ErrorResponse`

    ```json
{
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean",
      "example": false
    },
    "message": {
      "type": "string",
      "example": "Error description"
    },
    "errors": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "field": {
            "type": "string"
          },
          "message": {
            "type": "string"
          }
        }
      }
    }
  }
}
    ```

- `__401__`: Authentication required or invalid old password
  - Content-Type: `application/json`
    Schema: `ErrorResponse`

    ```json
{
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean",
      "example": false
    },
    "message": {
      "type": "string",
      "example": "Error description"
    },
    "errors": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "field": {
            "type": "string"
          },
          "message": {
            "type": "string"
          }
        }
      }
    }
  }
}
    ```

- `__500__`: Internal server error
  - Content-Type: `application/json`
    Schema: `ErrorResponse`

    ```json
{
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean",
      "example": false
    },
    "message": {
      "type": "string",
      "example": "Error description"
    },
    "errors": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "field": {
            "type": "string"
          },
          "message": {
            "type": "string"
          }
        }
      }
    }
  }
}
    ```


---

## Session

User session management

### `POST /api/v1/session/logout-all`

**Summary:** Log out from all devices

**Responses:**

- `__200__`: Logged out from all devices successfully
  - Content-Type: `application/json`
    ```json
{
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean",
      "example": true
    },
    "message": {
      "type": "string",
      "example": "Logged out from all devices successfully"
    }
  }
}
    ```

- `__401__`: Authentication required
  - Content-Type: `application/json`
    Schema: `ErrorResponse`

    ```json
{
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean",
      "example": false
    },
    "message": {
      "type": "string",
      "example": "Error description"
    },
    "errors": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "field": {
            "type": "string"
          },
          "message": {
            "type": "string"
          }
        }
      }
    }
  }
}
    ```

- `__500__`: Internal server error
  - Content-Type: `application/json`
    Schema: `ErrorResponse`

    ```json
{
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean",
      "example": false
    },
    "message": {
      "type": "string",
      "example": "Error description"
    },
    "errors": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "field": {
            "type": "string"
          },
          "message": {
            "type": "string"
          }
        }
      }
    }
  }
}
    ```


---

### `GET /api/v1/session/sessions`

**Summary:** Get all active sessions for the current user

**Responses:**

- `__200__`: Active sessions retrieved successfully
  - Content-Type: `application/json`
    ```json
{
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean",
      "example": true
    },
    "message": {
      "type": "string",
      "example": "Active sessions retrieved successfully"
    },
    "data": {
      "type": "object",
      "properties": {
        "sessions": {
          "type": "array",
          "items": {
            "$ref": "#/components/schemas/Session"
          }
        }
      }
    }
  }
}
    ```

- `__401__`: Authentication required
  - Content-Type: `application/json`
    Schema: `ErrorResponse`

    ```json
{
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean",
      "example": false
    },
    "message": {
      "type": "string",
      "example": "Error description"
    },
    "errors": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "field": {
            "type": "string"
          },
          "message": {
            "type": "string"
          }
        }
      }
    }
  }
}
    ```

- `__500__`: Internal server error
  - Content-Type: `application/json`
    Schema: `ErrorResponse`

    ```json
{
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean",
      "example": false
    },
    "message": {
      "type": "string",
      "example": "Error description"
    },
    "errors": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "field": {
            "type": "string"
          },
          "message": {
            "type": "string"
          }
        }
      }
    }
  }
}
    ```


---

## Test Webhook

Test webhook endpoints for simulating payments

### `POST /api/v1/test-webhooks/simulate-payment`

**Summary:** Simulate a payment webhook for testing

**Request Body:**

Content-Type: `application/json`

```json
{
  "type": "object",
  "required": [
    "txRef",
    "amount"
  ],
  "properties": {
    "txRef": {
      "type": "string",
      "description": "User tx_ref to credit",
      "example": "user_123e4567-e89b-12d3-a456-426614174000"
    },
    "amount": {
      "type": "number",
      "description": "Amount to credit",
      "example": 1000
    },
    "provider": {
      "type": "string",
      "description": "Payment provider name",
      "example": "test-provider"
    },
    "providerVaId": {
      "type": "string",
      "description": "Virtual account ID",
      "example": "test-va-123"
    }
  }
}
```

**Responses:**

- `__200__`: Payment processed successfully
  - Content-Type: `application/json`
    ```json
{
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean"
    },
    "message": {
      "type": "string"
    },
    "data": {
      "type": "object",
      "properties": {
        "txRef": {
          "type": "string"
        },
        "newBalance": {
          "type": "number"
        },
        "amountCredited": {
          "type": "number"
        }
      }
    }
  }
}
    ```


---

## Two-Factor Authentication

Manage two-factor authentication (2FA) for user accounts

### `POST /api/v1/2fa/disable`

**Summary:** Disable 2FA for the current user

**Responses:**

- `__200__`: 2FA disabled successfully
  - Content-Type: `application/json`
    ```json
{
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean",
      "example": true
    },
    "message": {
      "type": "string",
      "example": "2FA disabled successfully"
    }
  }
}
    ```

- `__401__`: Authentication required
  - Content-Type: `application/json`
    Schema: `ErrorResponse`

    ```json
{
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean",
      "example": false
    },
    "message": {
      "type": "string",
      "example": "Error description"
    },
    "errors": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "field": {
            "type": "string"
          },
          "message": {
            "type": "string"
          }
        }
      }
    }
  }
}
    ```

- `__500__`: Internal server error
  - Content-Type: `application/json`
    Schema: `ErrorResponse`

    ```json
{
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean",
      "example": false
    },
    "message": {
      "type": "string",
      "example": "Error description"
    },
    "errors": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "field": {
            "type": "string"
          },
          "message": {
            "type": "string"
          }
        }
      }
    }
  }
}
    ```


---

### `POST /api/v1/2fa/enable`

**Summary:** Enable 2FA for the current user

**Request Body:**

Content-Type: `application/json`

```json
{
  "type": "object",
  "required": [
    "totpCode"
  ],
  "properties": {
    "totpCode": {
      "type": "string",
      "minLength": 6,
      "maxLength": 6,
      "example": "123456"
    }
  }
}
```

**Responses:**

- `__200__`: 2FA enabled successfully
  - Content-Type: `application/json`
    ```json
{
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean",
      "example": true
    },
    "message": {
      "type": "string",
      "example": "2FA enabled successfully"
    }
  }
}
    ```

- `__400__`: Invalid TOTP code
  - Content-Type: `application/json`
    Schema: `ErrorResponse`

    ```json
{
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean",
      "example": false
    },
    "message": {
      "type": "string",
      "example": "Error description"
    },
    "errors": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "field": {
            "type": "string"
          },
          "message": {
            "type": "string"
          }
        }
      }
    }
  }
}
    ```

- `__401__`: Authentication required
  - Content-Type: `application/json`
    Schema: `ErrorResponse`

    ```json
{
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean",
      "example": false
    },
    "message": {
      "type": "string",
      "example": "Error description"
    },
    "errors": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "field": {
            "type": "string"
          },
          "message": {
            "type": "string"
          }
        }
      }
    }
  }
}
    ```

- `__500__`: Internal server error
  - Content-Type: `application/json`
    Schema: `ErrorResponse`

    ```json
{
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean",
      "example": false
    },
    "message": {
      "type": "string",
      "example": "Error description"
    },
    "errors": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "field": {
            "type": "string"
          },
          "message": {
            "type": "string"
          }
        }
      }
    }
  }
}
    ```


---

### `POST /api/v1/2fa/setup`

**Summary:** Set up 2FA for the current user

**Responses:**

- `__200__`: 2FA setup initiated successfully
  - Content-Type: `application/json`
    Schema: `TwoFactorSetupResponse`

    ```json
{
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean",
      "example": true
    },
    "message": {
      "type": "string",
      "example": "2FA setup initiated successfully"
    },
    "data": {
      "type": "object",
      "properties": {
        "qrCode": {
          "type": "string",
          "description": "Base64 encoded QR code for Google Authenticator"
        },
        "backupCodes": {
          "type": "array",
          "items": {
            "type": "string"
          },
          "description": "Backup codes for 2FA recovery"
        }
      }
    }
  }
}
    ```

- `__401__`: Authentication required
  - Content-Type: `application/json`
    Schema: `ErrorResponse`

    ```json
{
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean",
      "example": false
    },
    "message": {
      "type": "string",
      "example": "Error description"
    },
    "errors": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "field": {
            "type": "string"
          },
          "message": {
            "type": "string"
          }
        }
      }
    }
  }
}
    ```

- `__500__`: Internal server error
  - Content-Type: `application/json`
    Schema: `ErrorResponse`

    ```json
{
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean",
      "example": false
    },
    "message": {
      "type": "string",
      "example": "Error description"
    },
    "errors": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "field": {
            "type": "string"
          },
          "message": {
            "type": "string"
          }
        }
      }
    }
  }
}
    ```


---

### `GET /api/v1/2fa/status`

**Summary:** Get the 2FA status for the current user

**Responses:**

- `__200__`: 2FA status retrieved successfully
  - Content-Type: `application/json`
    ```json
{
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean",
      "example": true
    },
    "data": {
      "type": "object",
      "properties": {
        "twoFactorEnabled": {
          "type": "boolean",
          "example": true
        }
      }
    }
  }
}
    ```

- `__401__`: Authentication required
  - Content-Type: `application/json`
    Schema: `ErrorResponse`

    ```json
{
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean",
      "example": false
    },
    "message": {
      "type": "string",
      "example": "Error description"
    },
    "errors": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "field": {
            "type": "string"
          },
          "message": {
            "type": "string"
          }
        }
      }
    }
  }
}
    ```

- `__500__`: Internal server error
  - Content-Type: `application/json`
    Schema: `ErrorResponse`

    ```json
{
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean",
      "example": false
    },
    "message": {
      "type": "string",
      "example": "Error description"
    },
    "errors": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "field": {
            "type": "string"
          },
          "message": {
            "type": "string"
          }
        }
      }
    }
  }
}
    ```


---

### `POST /api/v1/2fa/verify`

**Summary:** Verify a 2FA code during login

**Request Body:**

Content-Type: `application/json`

```json
{
  "type": "object",
  "required": [
    "totpCode"
  ],
  "properties": {
    "totpCode": {
      "type": "string",
      "minLength": 6,
      "maxLength": 6,
      "example": "123456"
    }
  }
}
```

**Responses:**

- `__200__`: 2FA verification successful
  - Content-Type: `application/json`
    ```json
{
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean",
      "example": true
    },
    "message": {
      "type": "string",
      "example": "2FA verification successful"
    }
  }
}
    ```

- `__400__`: Invalid TOTP code
  - Content-Type: `application/json`
    Schema: `ErrorResponse`

    ```json
{
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean",
      "example": false
    },
    "message": {
      "type": "string",
      "example": "Error description"
    },
    "errors": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "field": {
            "type": "string"
          },
          "message": {
            "type": "string"
          }
        }
      }
    }
  }
}
    ```

- `__401__`: Authentication required
  - Content-Type: `application/json`
    Schema: `ErrorResponse`

    ```json
{
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean",
      "example": false
    },
    "message": {
      "type": "string",
      "example": "Error description"
    },
    "errors": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "field": {
            "type": "string"
          },
          "message": {
            "type": "string"
          }
        }
      }
    }
  }
}
    ```

- `__500__`: Internal server error
  - Content-Type: `application/json`
    Schema: `ErrorResponse`

    ```json
{
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean",
      "example": false
    },
    "message": {
      "type": "string",
      "example": "Error description"
    },
    "errors": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "field": {
            "type": "string"
          },
          "message": {
            "type": "string"
          }
        }
      }
    }
  }
}
    ```


---

## User

User-facing operations for profile, wallet, and purchases

### `GET /api/v1/user/profile/me`

**Summary:** Get the current user's profile

**Responses:**

- `__200__`: Successfully retrieved user profile.

---

### `PUT /api/v1/user/profile/me`

**Summary:** Update the current user's profile

**Request Body:**

Content-Type: `application/json`

```json
{
  "type": "object",
  "properties": {
    "fullName": {
      "type": "string"
    }
  }
}
```

**Responses:**

- `__200__`: Profile updated successfully.

---

### `PUT /api/v1/user/profile/pin`

**Summary:** Set or update the user's transaction PIN

**Request Body:**

Content-Type: `application/json`

```json
{
  "type": "object",
  "properties": {
    "pin": {
      "type": "string",
      "description": "The 4-digit transaction PIN."
    },
    "currentPassword": {
      "type": "string",
      "description": "Required if a PIN is already set."
    }
  }
}
```

**Responses:**

- `__200__`: PIN set/updated successfully.

---

### `GET /api/v1/user/purchases`

**Summary:** Get the user's purchase history

**Parameters:**

| Name | In | Required | Type | Description |
|------|----|----------|------|-------------|
| `page` | query | No | `integer` |  |
| `limit` | query | No | `integer` |  |
| `status` | query | No | `string` |  |

**Responses:**

- `__200__`: Successfully retrieved purchase history.

---

### `GET /api/v1/user/wallet/transactions`

**Summary:** Get the user's transaction history

**Parameters:**

| Name | In | Required | Type | Description |
|------|----|----------|------|-------------|
| `page` | query | No | `integer` |  |
| `limit` | query | No | `integer` |  |
| `direction` | query | No | `string` |  |

**Responses:**

- `__200__`: Successfully retrieved transaction history.

---

## User Notification Preferences

Manage user notification preferences

### `GET /api/v1/notification-preferences`

**Summary:** Get user notification preferences

**Responses:**

- `__200__`: List of preferences

---

### `PUT /api/v1/notification-preferences`

**Summary:** Update user notification preferences

**Request Body:**

Content-Type: `application/json`

Schema: `UserNotificationPreference`

**Responses:**

- `__200__`: Preferences updated

---

