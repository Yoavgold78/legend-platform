# API Gateway

Centralized API Gateway service that validates Auth0 JWT tokens and routes requests to backend services.

## Features

- **Auth0 JWT Validation**: Validates JWT tokens on all `/api/v1/*` requests (signature, issuer, audience, expiration)
- **Request Routing**: Routes requests to appropriate backend services (audits-be, schedule-be)
- **User Context**: Extracts `sub` from validated tokens and adds `x-user-id` header to backend requests
- **Request Tracing**: Generates or accepts `x-request-id` headers for end-to-end tracing
- **Health Check**: Public health endpoint at `/api/v1/health` for monitoring

## Setup

1. Copy `.env.template` to `.env` and configure:
   ```bash
   cp .env.template .env
   ```

2. Set required environment variables:
   - `AUTH0_AUDIENCE`: Auth0 API Identifier
   - `AUTH0_ISSUER_BASE_URL`: Auth0 tenant URL
   - `AUDITS_BE_URL`: Backend URL for audits service
   - `SCHEDULE_BE_URL`: Backend URL for schedule service
   - `ALLOWED_ORIGINS`: Comma-separated list of allowed CORS origins

3. Install dependencies:
   ```bash
   npm install
   ```

4. Run in development mode:
   ```bash
   npm run dev
   ```

5. Run in production mode:
   ```bash
   npm start
   ```

## API Routes

- `GET /api/v1/health` - Health check (no auth required)
- `/api/v1/audits/*` - Proxy to audits-be (auth required)
- `/api/v1/schedule/*` - Proxy to schedule-be (auth required)

## Authentication

All routes except `/api/v1/health` require a valid Auth0 JWT token in the `Authorization` header:

```
Authorization: Bearer <jwt_token>
```

Invalid or missing tokens return HTTP 401 with error message.

## Deployment

Deployed to Render as a Web Service. Environment variables are configured in the Render dashboard.

Health check endpoint: `/api/v1/health`
