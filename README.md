# Fintech Auth & Wallet Service

A robust, production-ready backend service designed for fintech applications, providing secure user authentication, virtual account generation, and wallet management.

## 🌟 Overview

This service provides the core infrastructure for a fintech application, particularly one focused on data vending or similar services in the Nigerian context. It handles user registration, creates dedicated virtual accounts for payments, processes incoming payment webhooks, and manages user wallets.

### Core Features

-   **🔐 Secure Authentication**: JWT-based authentication with access/refresh token rotation.
-   **🛡️ Two-Factor Authentication (2FA)**: Time-based One-Time Password (TOTP) for enhanced security.
-   **🏦 Virtual Account Generation**: Automatically creates a unique virtual account for each user upon registration (e.g., via PalmPay).
-   **💰 Wallet Management**: Automatically credits a user's wallet when a payment is received.
-   **🪝 Webhook Processing**: Securely handles incoming webhooks from payment providers to update wallet balances.
-   **👥 Role-Based Access Control (RBAC)**: A flexible system for defining user roles and permissions.
-   **⚡ Session Management**: Redis-backed session storage for scalability and performance.
-   **📄 API Documentation**: Interactive Swagger/OpenAPI documentation included.
-   **🏥 Health Monitoring**: Endpoint for checking service health and database connectivity.

## ⚙️ How It Works: The User Journey

This service is designed around a simple and effective user flow:

1.  **User Registration**: A new user signs up with their details.
2.  **Automatic VA Creation**: Upon successful registration, the service automatically generates a unique virtual account (VA) for the user and links it to their profile.
3.  **User Funds Account**: The user can now send money to this virtual account number through their bank or payment app.
4.  **Webhook Notification**: The payment provider (e.g., PalmPay) sends a webhook notification to our service's webhook endpoint to signal the incoming payment.
5.  **Wallet is Credited**: The service validates the webhook, confirms the transaction, and automatically credits the corresponding user's wallet with the received amount.
6.  **Purchase Services**: The user can now use their wallet balance to purchase services (e.g., mobile data, airtime).

## 🛠️ Technology Stack

-   **Backend**: Node.js, Express, TypeScript
-   **Database**: PostgreSQL (managed with Knex.js for queries and migrations)
-   **Caching/Sessions**: Redis
-   **Authentication**: JWT, TOTP for 2FA
-   **Testing**: Jest, Supertest

## 🚀 Getting Started

### Prerequisites

-   Docker and Docker Compose
-   Node.js v18+
-   An NPM client (npm, pnpm, or yarn)

### Setup and Installation

1.  **Clone the repository**:
    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```

2.  **Set up environment variables**:
    Copy the `.env.example` file to a new `.env` file and fill in the required values (database credentials, JWT secrets, etc.).
    ```bash
    cp .env.example .env
    ```

3.  **Start services with Docker**:
    This will start the PostgreSQL and Redis containers.
    ```bash
    docker-compose up -d
    ```

4.  **Install dependencies**:
    ```bash
    npm install
    ```

5.  **Run database migrations**:
    This will set up the necessary tables in your database.
    ```bash
    npm run db:migrate
    ```

6.  **Start the development server**:
    ```bash
    npm run dev
    ```

The API will now be running and available at `http://localhost:3000`.

## 🧪 Running Tests

To run the complete test suite (unit and integration tests):

```bash
npm test
```

## 📚 API Documentation

Interactive API documentation is available via Swagger UI once the server is running:

-   **Swagger UI**: `http://localhost:3000/api/v1/docs`

## 🗃️ Database Migrations

Database schema changes are managed with `knex`.

-   **Create a new migration**:
    ```bash
    npm run db:migrate:make -- <migration_name>
    ```
    *(Note: The `--` is important to pass the name argument to the script.)*

-   **Run the latest migrations**:
    ```bash
    npm run db:migrate
    ```

-   **Roll back the last migration**:
    ```bash
    npm run db:rollback
    ```