# Election Monitoring Authentication Service

A production-ready authentication and authorization system built for election monitoring systems with enterprise-grade security features.

## 🌟 Overview

This service provides secure authentication and authorization for election monitoring applications. It's designed to handle the unique security requirements of electoral systems where data integrity and user verification are critical.

### Key Features

- **🔐 Multi-Factor Authentication** - Mandatory 2FA for privileged users.
- **🛡️ Role-Based Access Control (RBAC)** - Fine-grained permissions system.
- **⚡ Session Management** - Redis-backed session storage.
- **🗳️ Polling Unit Management** - Allows reporters to be assigned to and claim specific polling units.
- ** cron Jobs** - Automated cleanup of expired tokens.
- **📄 API Documentation** - Interactive Swagger/OpenAPI docs.
- **🏥 Health Monitoring** - Comprehensive service health checks.
- **🔒 JWT Security** - Short-lived access tokens with refresh token rotation.

## 🚀 Getting Started

### Prerequisites

- Docker and Docker Compose
- Node.js v18+
- pnpm (or npm/yarn)

### Development Environment

This project includes a Dev Container setup for a consistent development environment.

1.  Open the project in VS Code.
2.  When prompted, click **"Reopen in Container"**.
3.  The development server will start automatically.

### Manual Setup

1.  **Start Services**:

    ```bash
    docker-compose up -d
    ```

2.  **Install Dependencies**:

    ```bash
    npm install
    ```

3.  **Run Migrations**:

    ```bash
    npm run db:migrate
    ```

4.  **Start Development Server**:
    ```bash
    npm run dev
    ```

The API will be available at `http://localhost:3000`.

## 🧪 Running Tests

To run the test suite:

```bash
npm test
```

To run tests in watch mode:

```bash
npm run test:watch
```

## 📚 API Documentation

Interactive API documentation is available via Swagger UI:

- **Swagger UI**: `http://localhost:3000/api/v1/docs`

## 🛠️ API Endpoints

### Authentication

| Method | Endpoint                | Description              |
| :----- | :---------------------- | :----------------------- |
| `POST` | `/api/v1/auth/register` | Register a new user.     |
| `POST` | `/api/v1/auth/login`    | Log in a user.           |
| `POST` | `/api/v1/auth/logout`   | Log out a user.          |
| `POST` | `/api/v1/auth/refresh`  | Refresh an access token. |
| `GET`  | `/api/v1/auth/verify`   | Verify a user's email.   |

#### User Registration

The registration process is role-dependent.

**`POST /api/v1/auth/register`**

**For Reporters:**

Reporters must be assigned to at least one polling unit upon registration.

```json
{
  "email": "reporter@example.com",
  "password": "SecurePassword123!",
  "role": "reporter",
  "pollingUnitIds": ["uuid-of-polling-unit-1"]
}
```

**For Other Roles (Admin, staff, Observer):**

```json
{
  "email": "staff@example.com",
  "password": "SecurePassword123!",
  "role": "staff"
}
```

### Polling Units

| Method | Endpoint                          | Description                  | Authentication |
| :----- | :-------------------------------- | :--------------------------- | :------------- |
| `GET`  | `/api/v1/polling-units/available` | Get available polling units. | `reporter`     |
| `POST` | `/api/v1/polling-units/claim`     | Claim a polling unit.        | `reporter`     |

#### Claiming a Polling Unit

Reporters can claim a polling unit that is not at capacity (max 2 reporters per unit).

**`POST /api/v1/polling-units/claim`**

```json
{
  "pollingUnitId": "uuid-of-polling-unit-to-claim"
}
```

## 👥 Role-Based Access Control (RBAC)

### User Roles

| Role         | Description                              | 2FA Required | Key Permissions                                 |
| :----------- | :--------------------------------------- | :----------- | :---------------------------------------------- |
| **Reporter** | Submits incident reports from the field. | Optional     | Create/update own reports, claim polling units. |
| **staff**    | Verifies election data.                  | ✅ Mandatory | Verify reports, manage incidents.               |
| **Observer** | Has read-only access to public data.     | Optional     | View public data.                               |
| **Admin**    | System administrator.                    | ✅ Mandatory | Full system access.                             |

## ⚙️ Background Jobs

This service runs automated jobs using `node-cron`.

- **Token Cleanup**: A cron job runs hourly to clean up expired verification and password reset tokens from the database.

## 🗃️ Database Migrations

Database schema changes are managed with `knex`.

- **Create a Migration**:

  ```bash
  npm run db:migrate:make -- <migration-name>
  ```

  _(Note: The `--` is important to pass the name argument to the script.)_

- **Run Migrations**:

  ```bash
  npm run db:migrate
  ```

- **Rollback Migrations**:
  ```bash
  npm run db:rollback
  ```

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1.  Fork the repository.
2.  Create a new feature branch.
3.  Make your changes.
4.  Ensure all tests pass (`npm test`).
5.  Submit a pull request.

---

_Built for transparency and integrity in electoral processes._
