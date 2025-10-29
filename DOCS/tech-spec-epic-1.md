# Epic Technical Specification: Legenda Platform Unification V1

Date: 2025-10-29
Author: Yoav
Epic ID: 1
Status: Draft

---

## Overview

This epic delivers the foundational unified platform for Legenda, consolidating AuditsApp and ScheduleApp under a single Shell with centralized Auth0 authentication. The primary objective is to eliminate the fragmented user experience caused by separate authentication systems and disparate frontends while maintaining full Production stability of existing services. This represents a strategic Brownfield modernization that establishes a Monorepo architecture, implements an API Gateway pattern, and migrates ScheduleApp from its internal JWT/bcrypt authentication to Auth0, enabling true Single Sign-On (SSO) across all applications.

The scope encompasses infrastructure setup (Monorepo with npm workspaces), frontend unification (Next.js Shell with shared navigation), backend integration (API Gateway routing to private services), complete authentication migration for ScheduleApp, hierarchical user management interfaces, and basic observability. This epic is the prerequisite for all future application integrations and establishes the architectural patterns for the platform's evolution.

## Objectives and Scope

**In Scope:**
- Monorepo infrastructure setup with npm workspaces, organized into `apps/` (shell, api-gateway, audits-be, schedule-be) and `packages/` (ui, types, auth-client, config)
- Shell application (Next.js) with Auth0 integration, shared "Google-style" navigation, and Mobile-First design
- API Gateway service for centralized Auth0 token validation and routing to backend services
- Migration of AuditsApp (Next.js + Node.js Backend) into Monorepo with native Shell integration
- Complete ScheduleApp authentication migration: removal of internal JWT/bcrypt system, Auth0 user migration with password reset, backend refactoring, and Frontend integration (via iframe or micro-frontend approach)
- Database schema updates: adding `auth0_sub` column to PostgreSQL Users table, ensuring `auth0Id` uniqueness in MongoDB
- Hierarchical user management UI and API: Admin creates Managers/Regional Managers, Managers create Employees (with Auth0 invitation flow and local DB synchronization)
- User synchronization logic on login/signup (create local user records with `auth0_sub` if not exists)
- Basic monitoring and alerting for API Gateway and user sync processes
- Render deployment configuration for Monorepo with apps/shell and apps/api-gateway as Web Services, backends as Private Services
- Staging environment setup and comprehensive testing before Production cutover
- DNS-based Production switchover strategy with rollback capability

**Out of Scope:**
- Database consolidation (MongoDB and PostgreSQL remain separate)
- Business logic changes to AuditsApp or ScheduleApp functionality
- Full refactor of ScheduleApp from CRA to Next.js (deferred to future epic)
- Advanced monitoring dashboards or analytics
- Performance optimization beyond baseline requirements
- New feature development for Audits or Schedule domains
- Integration of future applications (Courses, Info) beyond establishing the pattern

## System Architecture Alignment

This epic directly implements the architecture defined in `brownfield-architecture.md` by establishing the core platform components:

**Component Mapping:**
- Section 5 (Component Architecture): Implements the entire Monorepo structure with all four `apps/` services and all five `packages/` libraries
- Section 2 (Integration Strategy): Executes the phased rollout strategy with Staging validation and DNS-based Production cutover
- Section 3 (Tech Stack): Adopts the unified stack (Next.js, TypeScript, MUI, Tailwind, Node/Express, Auth0)
- Section 4 (Data Models): Implements `auth0_sub` as the universal identifier with schema changes to both databases
- Section 8 (Infrastructure): Configures Render for Monorepo deployment with Private Services for backends
- Section 11 (Security): Establishes the API Gateway as the single authentication point with Auth0 token validation

**Architectural Constraints Addressed:**
- Maintains separate databases (MongoDB for AuditsApp, PostgreSQL for ScheduleApp) with Auth0 `sub` as the linking identifier
- Backends configured as Private Services, accessible only via API Gateway
- Auth0 as the single source of truth for authentication (no secondary auth systems)
- Mobile-First design requirement for all new UI components
- ESLint/Prettier enforcement via shared `packages/config`
- WCAG 2.1 Level AA compliance for all shared UI components

**Integration Points:**
- API Gateway routes traffic from Shell to correct backend (`/api/v1/audits/*` → audits-be, `/api/v1/schedule/*` → schedule-be)
- Gateway passes authenticated user's `auth0_sub` via `x-user-id` header to backends
- Backends trust Gateway authentication and retrieve user roles/permissions from local databases using `auth0_sub`
- Shell uses `packages/auth-client` for consistent Auth0 SDK usage across the platform

## Detailed Design

### Services and Modules

| Service/Module | Responsibility | Tech Stack | Inputs | Outputs | Owner |
|---|---|---|---|---|---|
| **apps/shell** | Main frontend: layout, navigation, Auth0 login/logout, route loading | Next.js 14+ (App Router), React, TypeScript, Zustand, MUI, Tailwind | Auth0 tokens, user session | UI rendering, API requests to Gateway | Frontend Team |
| **apps/api-gateway** | Single API entry point: Auth0 JWT validation, request routing, user management APIs | Node.js, Express, Auth0 SDK | HTTP requests with Bearer tokens | Validated requests to backends, 401 for invalid tokens | Backend Team |
| **apps/audits-be** | Audits business logic: inspections, checklists, stores | Node.js, Express, Mongoose, MongoDB | Requests from Gateway with `x-user-id` header | JSON responses for audits operations | Backend Team |
| **apps/schedule-be** | Schedule business logic: shifts, templates, availability | Node.js, Express, pg, PostgreSQL | Requests from Gateway with `x-user-id` header | JSON responses for schedule operations | Backend Team |
| **packages/ui** | Reusable React/MUI components (buttons, forms, modals, navigation elements) | React, MUI, TypeScript | Props per component | Rendered React components | Frontend Team |
| **packages/types** | Shared TypeScript interfaces (User, Store, Role, API contracts) | TypeScript | N/A | Type definitions | Full Stack |
| **packages/auth-client** | Auth0 hooks, utilities, session management for Frontend | React, Auth0 SDK | Auth0 config | Auth hooks, token management | Frontend Team |
| **packages/config** | Shared ESLint, Prettier, tsconfig configurations | JSON/JS config | N/A | Config files | DevOps |

### Data Models and Contracts

**User Model (Unified via Auth0 `sub`):**

```typescript
// packages/types/src/user.ts
interface User {
  auth0_sub: string;        // Primary identifier from Auth0 (e.g., "auth0|abc123")
  email: string;
  name: string;
  role: 'admin' | 'regional_manager' | 'manager' | 'employee' | 'store';
  stores?: string[];        // Store IDs the user has access to
  phoneNumber?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

**MongoDB Schema Changes (AuditsApp):**

```javascript
// apps/audits-be/models/User.js
const userSchema = new mongoose.Schema({
  auth0Id: { 
    type: String, 
    required: true, 
    unique: true,      // ENFORCE unique index
    index: true,
    sparse: true
  },
  email: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, enum: ['admin', 'regional_manager', 'manager', 'employee', 'store'] },
  stores: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Store' }],
  phoneNumber: String,
  // ... other app-specific fields
}, { timestamps: true });
```

**PostgreSQL Schema Changes (ScheduleApp):**

```sql
-- Migration script for apps/schedule-be
ALTER TABLE "Users" 
ADD COLUMN auth0_sub VARCHAR(255) UNIQUE;

CREATE UNIQUE INDEX idx_users_auth0_sub ON "Users"(auth0_sub);

-- After migration complete and validated:
ALTER TABLE "Users" 
DROP COLUMN password_hash;
```

**Store Model (Shared identifier across databases):**

```typescript
// packages/types/src/store.ts
interface Store {
  id: string;               // Unique store identifier (shared across DBs)
  name: string;
  address: string;
  managerId?: string;       // auth0_sub of assigned manager
  regionalManagerId?: string; // auth0_sub of regional manager
}
```

### APIs and Interfaces

**API Gateway Routes:**

```typescript
// apps/api-gateway/src/routes/index.js

// Authentication Middleware (applies to all routes)
POST /api/v1/*
GET /api/v1/*
→ Validates Auth0 JWT from Authorization: Bearer <token>
→ Extracts sub claim, adds x-user-id header
→ Returns 401 if invalid/missing token

// Routing Rules
GET/POST /api/v1/audits/*
→ Proxy to apps/audits-be (Private Service URL)

GET/POST /api/v1/schedule/*
→ Proxy to apps/schedule-be (Private Service URL)

// User Management (Admin/Manager Only)
POST /api/v1/admin/users
Body: { email, name, role, stores[] }
Auth: Admin or Manager (with store restrictions)
→ Creates user in Auth0 (no password)
→ Sends Auth0 invitation email
→ Syncs to audits-be and schedule-be local DBs
→ Returns: { user_id, auth0_sub, invitation_sent: true }

// Health Check
GET /api/v1/health
→ Returns: { status: 'ok', services: { audits: 'up', schedule: 'up' } }
```

**Backend API Contracts:**

```typescript
// Expected by backends from Gateway
Request Headers:
  x-user-id: string  // auth0_sub of authenticated user

// Response format from backends
interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}
```

**Auth0 Integration API:**

```typescript
// packages/auth-client (Frontend)
export const useAuth = () => {
  const { user, isAuthenticated, loginWithRedirect, logout } = useAuth0();
  // Returns: user profile, auth state, login/logout methods
};

// apps/api-gateway (Backend)
import { auth } from 'express-oauth2-jwt-bearer';

const jwtCheck = auth({
  audience: process.env.AUTH0_AUDIENCE,
  issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL,
  tokenSigningAlg: 'RS256'
});
```

### Workflows and Sequencing

**User Login Flow:**

```
1. User navigates to apps/shell URL
2. Shell detects no session → redirects to Auth0 Universal Login
3. User enters credentials at Auth0
4. Auth0 validates → redirects back to Shell with authorization code
5. Shell exchanges code for access token + ID token
6. Shell stores tokens in session, extracts user profile
7. Shell renders navigation with apps/routes based on user role
8. User clicks "Audits" → Shell routes to /audits, makes API call with Bearer token
9. Gateway validates token → extracts sub → forwards to audits-be with x-user-id header
10. audits-be queries MongoDB using auth0Id === x-user-id → returns user's audits
11. Shell displays audits data
```

**User Creation Flow (Admin creating Manager):**

```
1. Admin logs into Shell → navigates to /admin/users
2. Admin fills form: email, name, role=manager, stores=[store1, store2]
3. Shell POSTs to Gateway: /api/v1/admin/users with Bearer token
4. Gateway validates Admin token → authorizes (role=admin)
5. Gateway calls Auth0 Management API: Create User (email, no password)
6. Auth0 returns new user with sub
7. Gateway calls Auth0 Management API: Send invitation email
8. Gateway POSTs to audits-be: /internal/users with { auth0_sub, email, name, role, stores }
9. audits-be creates MongoDB User document
10. Gateway POSTs to schedule-be: /internal/users with same payload
11. schedule-be inserts PostgreSQL Users row with auth0_sub
12. Gateway returns success to Shell
13. Shell displays "User created, invitation sent to email"
```

**User First Login (Sync Flow):**

```
1. New user (created by Admin) clicks invitation email → sets password at Auth0
2. User logs in → Shell receives tokens with sub
3. Shell makes first API call (e.g., GET /api/v1/audits/my-stores)
4. Gateway validates token → forwards to audits-be with x-user-id=sub
5. audits-be checks: SELECT * FROM users WHERE auth0Id = sub
6. If NOT EXISTS → audits-be creates user record with basic info from token claims
7. audits-be returns data for user's stores
8. Same sync happens on first schedule-be API call
```

**ScheduleApp Auth Migration Flow:**

```
Pre-Production (Staging):
1. Export existing ScheduleApp users from PostgreSQL (email, name, roles)
2. Run migration script:
   - For each user: Call Auth0 Management API to create user (no password)
   - Store returned sub in temp mapping table
   - Update PostgreSQL: SET auth0_sub = mapped_sub WHERE email = user_email
3. Validate: All users have auth0_sub populated
4. Test: Sample users receive password reset emails from Auth0

Production Cutover:
1. Schedule maintenance window (2-hour buffer)
2. Run same migration script on Production PostgreSQL
3. Deploy new schedule-be (without JWT/bcrypt code)
4. Deploy unified Shell + Gateway
5. Update DNS to point to new Shell
6. Monitor: Users receive password reset emails, can log in via Auth0
7. Rollback plan: Revert DNS to old ScheduleApp URL if issues detected
```

## Non-Functional Requirements

### Performance

**Target Metrics:**
- **Shell Load Time:** < 2 seconds for initial page load (First Contentful Paint)
- **API Gateway Latency:** < 100ms added latency for auth validation + routing (p95)
- **Backend Response Time:** Maintain existing SLAs (audits-be: < 500ms, schedule-be: < 300ms for typical queries)
- **Auth0 Login:** < 3 seconds for full login flow (Universal Login → redirect → token exchange)
- **Navigation Switch:** < 500ms to switch between Audits/Schedule tabs in Shell

**Performance Constraints (from Architecture):**
- Mobile-First requirement means Shell must be optimized for 3G/4G networks
- API Gateway must handle concurrent requests from all active users (estimated 50-100 concurrent during peak)
- User sync on first login must not block API response (async or < 200ms)

**Monitoring:**
- Render metrics for response times, error rates per service
- Gateway logs for auth validation failures and routing times

### Security

**Authentication & Authorization:**
- **Single Auth Provider:** Auth0 is the exclusive authentication mechanism (FR3)
- **Token Validation:** API Gateway validates Auth0 JWT signature, issuer, audience, expiration on every request
- **Token Transmission:** Frontend sends tokens via `Authorization: Bearer <token>` header (never in query params or cookies)
- **Backend Trust:** Backends do NOT validate tokens directly; they trust Gateway's `x-user-id` header (only accepting requests from Gateway's private network)
- **Hierarchical Permissions:** 
  - Admins can create any user type for any store
  - Managers can only create Employees for stores they manage (enforced in Gateway before Auth0 API call)
  - Permission checks use user's role + assigned stores from local database

**Data Protection:**
- **Secrets Management:** All secrets (Auth0 Client Secret, DB connection strings, API keys) stored exclusively in Render Environment Variables
- **Password Security:** No passwords stored locally; Auth0 handles all password hashing and storage
- **User Migration:** Old password hashes are NOT migrated; all ScheduleApp users must reset passwords via Auth0
- **HTTPS Only:** All services communicate over TLS (enforced by Render)
- **Private Services:** Backends (audits-be, schedule-be) are not publicly accessible; only Gateway can reach them

**Compliance:**
- WCAG 2.1 Level AA for Shell and packages/ui components (keyboard navigation, screen reader support, color contrast)
- No PII in client-side logs or error messages

### Reliability/Availability

**Availability Targets:**
- **Overall Platform:** 99.5% uptime (allowing ~3.5 hours downtime/month for maintenance)
- **Staging Environment:** Separate from Production, can have lower uptime during testing phases

**Failure Handling:**
- **API Gateway as SPOF:** Gateway failure means entire platform unavailable; mitigation via Render auto-restart, health checks, and alerting
- **Backend Failure:** If audits-be fails, only Audits features unavailable; Schedule remains functional (and vice versa)
- **Auth0 Outage:** If Auth0 is down, no new logins possible, but existing sessions remain valid (token TTL: 24 hours)
- **Database Failure:** 
  - MongoDB failure: Audits features unavailable
  - PostgreSQL failure: Schedule features unavailable
  - No cross-database dependencies minimize blast radius

**Graceful Degradation:**
- Shell displays error state per feature area (e.g., "Audits currently unavailable") rather than failing entirely
- User sync failures logged but do not block API responses (user gets generic error, sync retried on next request)

**Rollback Strategy:**
- **DNS Rollback:** Primary rollback mechanism; revert DNS to old app URLs if critical issues detected post-cutover
- **Render Rollback:** Each service can be rolled back to previous deployment via Render console (instant)
- **Database Rollback:** PostgreSQL schema changes are additive (add auth0_sub column); removal of password_hash only after validation, can be restored from backup if needed within 24 hours

### Observability

**Logging Requirements:**
- **API Gateway Logs:**
  - All incoming requests: timestamp, method, path, user (sub), response code, latency
  - Auth failures: reason (expired, invalid signature, missing token)
  - User creation events: actor (who created), target user, success/failure
- **Backend Logs:**
  - All API calls: timestamp, endpoint, x-user-id, response code, query execution time
  - User sync events: new user created, sync success/failure
- **Shell Logs (Client-side):**
  - Auth state changes: login, logout, token refresh failures
  - API errors: endpoint, status code, error message (no PII)

**Metrics (Render + Sentry/LogRocket):**
- Request rate per service (req/sec)
- Error rate per service (5xx errors/minute)
- Gateway auth validation: success rate, failure reasons
- User creation API: success rate, Auth0 API call duration
- Database query times: p50, p95, p99

**Alerting (Step 1.9):**
- **Critical Alerts** (immediate action):
  - API Gateway error rate > 5% for 5 minutes
  - Any service down/unreachable for > 2 minutes
  - Auth0 token validation failure rate > 10% for 5 minutes
- **Warning Alerts** (review within 1 hour):
  - API Gateway latency p95 > 200ms for 10 minutes
  - User sync failures > 10 in 1 hour
  - Repeated user creation failures from same actor

**Tracing:**
- Request correlation IDs passed from Shell → Gateway → Backend for end-to-end tracing
- Gateway adds `x-request-id` header to all backend requests

## Dependencies and Integrations

**External Service Dependencies:**

| Service | Purpose | Version/Tier | Integration Point | Failure Impact |
|---|---|---|---|---|
| **Auth0** | Authentication, user management | Production tenant | Shell (SDK), Gateway (JWT validation), API calls | Critical: No new logins |
| **MongoDB Atlas** | AuditsApp data storage | Current tier | audits-be (Mongoose) | High: Audits features unavailable |
| **Render PostgreSQL** | ScheduleApp data storage | Current tier | schedule-be (pg) | High: Schedule features unavailable |
| **Render Platform** | Hosting, deployment | Current plan | All services | Critical: Platform unavailable |
| **Cloudinary** | Image storage (Audits) | Current plan | audits-be API calls | Medium: Image upload fails, view OK |

**Internal Package Dependencies:**

```json
// apps/shell/package.json
{
  "dependencies": {
    "@auth0/nextjs-auth0": "^3.5.0",
    "@legend/ui": "workspace:*",
    "@legend/types": "workspace:*",
    "@legend/auth-client": "workspace:*",
    "next": "^14.2.0",
    "react": "^18.3.0",
    "zustand": "^4.5.0",
    "@mui/material": "^5.15.0",
    "tailwindcss": "^3.4.0"
  }
}

// apps/api-gateway/package.json
{
  "dependencies": {
    "@legend/types": "workspace:*",
    "express": "^4.19.0",
    "express-oauth2-jwt-bearer": "^1.6.0",
    "axios": "^1.7.0",
    "auth0": "^4.5.0"  // Management API SDK
  }
}

// packages/ui/package.json
{
  "dependencies": {
    "@legend/types": "workspace:*",
    "react": "^18.3.0",
    "@mui/material": "^5.15.0",
    "@mui/icons-material": "^5.15.0"
  },
  "peerDependencies": {
    "react": "^18.0.0"
  }
}
```

**Repository/Workspace Dependencies:**
- **Monorepo Tool:** npm workspaces (built into npm 7+, no additional tool needed)
- **Build Tool (Shell):** Next.js built-in compiler (no webpack config needed)
- **Testing:** Vitest ^1.5.0, Playwright ^1.44.0
- **Linting:** ESLint ^8.57.0, Prettier ^3.2.0 (shared configs in packages/config)

**Third-Party API Integrations:**
- **Auth0 Management API v2:** For user creation, invitation emails, role assignment
  - Endpoint: `https://{tenant}.auth0.com/api/v2/users`
  - Authentication: Machine-to-Machine token (Client Credentials flow)
  - Rate Limits: 50 requests/sec (well above expected usage)
- **Web Push API:** Existing integration in both backends, no changes required

## Acceptance Criteria (Authoritative)

These criteria are derived from the PRD functional requirements (FR1-FR18) and the 9 stories in Epic 1:

**AC1 (Monorepo Setup - Story 1.1):**
- [ ] Monorepo created at `legend-platform/` with npm workspaces configured in root `package.json`
- [ ] Directory structure established: `apps/shell`, `apps/api-gateway`, `apps/audits-be`, `apps/schedule-be`, `packages/ui`, `packages/types`, `packages/auth-client`, `packages/config`
- [ ] Shared ESLint, Prettier, and tsconfig configurations present in `packages/config` and working
- [ ] Render services created for Shell and Gateway in Staging environment

**AC2 (Shell Auth0 Login - Story 1.2):**
- [ ] `apps/shell` Next.js app with Auth0 SDK configured (`@auth0/nextjs-auth0`)
- [ ] "Login" button redirects to Auth0 Universal Login
- [ ] After successful Auth0 authentication, user redirected to Shell and session established
- [ ] User's name displayed in Shell header after login
- [ ] "Logout" button clears session and redirects to login page

**AC3 (Gateway Token Validation - Story 1.3):**
- [ ] `apps/api-gateway` Node/Express service deployed
- [ ] `/api/v1/health-check` endpoint responding successfully
- [ ] Middleware validates Auth0 JWT on all `/api/v1/*` requests (signature, issuer, audience, expiration)
- [ ] Invalid/missing tokens return HTTP 401 with error message
- [ ] Valid tokens result in `x-user-id` header (containing `auth0_sub`) added to proxied request

**AC4 (AuditsApp Integration - Story 1.4):**
- [ ] AuditsApp Frontend code migrated to `apps/shell/app/(main)/audits/...`
- [ ] AuditsApp Backend code migrated to `apps/audits-be`
- [ ] `audits-be` configured as Private Service in Render
- [ ] Gateway routes `/api/v1/audits/*` requests to `audits-be`
- [ ] `audits-be` refactored to trust `x-user-id` header (no longer validates Auth0 token directly)
- [ ] Logged-in user in Shell can navigate to Audits section and perform operations (view audits, create checklist)

**AC5 (ScheduleApp Auth Migration - Story 1.5):**
- [ ] All JWT generation/validation and bcrypt password comparison code removed from `apps/schedule-be`
- [ ] `auth0_sub` column (VARCHAR, UNIQUE) added to PostgreSQL `Users` table
- [ ] Migration script created and tested in Staging: exports users, creates Auth0 users, populates `auth0_sub`, sends password reset emails
- [ ] Migration script successfully executed in Staging with test data (validated: all users have `auth0_sub`, Auth0 accounts created, emails sent)
- [ ] `schedule-be` refactored to identify users by `x-user-id` header (mapped to `auth0_sub` in DB)
- [ ] Gateway routes `/api/v1/schedule/*` requests to `schedule-be`

**AC6 (ScheduleApp Frontend Integration - Story 1.6):**
- [ ] ScheduleApp Frontend code migrated to Monorepo (either in `apps/shell` or separate `apps/schedule-fe`)
- [ ] Shell loads ScheduleApp (CRA) via iframe or micro-frontend when user navigates to `/schedule`
- [ ] ScheduleApp Frontend receives Auth0 token from Shell (e.g., via `postMessage` for iframe)
- [ ] ScheduleApp Frontend sends all API requests to Gateway (`/api/v1/schedule/*`) with Auth0 token
- [ ] Logged-in user in Shell can navigate to Schedule section and perform operations (view schedule, update availability)

**AC7 (Admin User Management - Story 1.7):**
- [ ] "Admin" section created in Shell at `/admin/users`, protected (only visible to users with `role=admin`)
- [ ] User creation form present with fields: email, name, role (Manager/Regional Manager), stores (multi-select)
- [ ] Gateway endpoint `POST /api/v1/admin/users` implemented, secured for admins only
- [ ] Endpoint calls Auth0 Management API to create user (no password)
- [ ] Endpoint sends Auth0 invitation email to new user
- [ ] Endpoint synchronizes new user (with `auth0_sub`) to both `audits-be` MongoDB and `schedule-be` PostgreSQL
- [ ] Admin can successfully create a new Manager user; user receives invitation email and can set password

**AC8 (Manager User Management - Story 1.8):**
- [ ] User management interface visible to users with `role=manager`
- [ ] Manager can only see "Employee" as role option in creation form
- [ ] Manager can only select stores they manage in stores field
- [ ] Gateway enforces: Manager can only create Employees for stores in their permission list (returns 403 if violated)
- [ ] User creation flow (Auth0 creation, invitation, DB sync) identical to AC7
- [ ] Manager can successfully create an Employee for their store; employee receives invitation email

**AC9 (Basic Monitoring - Story 1.9):**
- [ ] API Gateway connected to monitoring service (Render Metrics or Sentry/Datadog)
- [ ] Alerts configured for Gateway: error rate > 5%, response time p95 > 1 second
- [ ] User sync process (FR10) logs all events: success, failure, new user creation
- [ ] Alert configured (if possible) for repeated user sync failures (> 10 in 1 hour)

**AC10 (SSO - FR4):**
- [ ] User logs in once via Shell
- [ ] User can access both Audits and Schedule sections without additional login prompts
- [ ] Single logout from Shell terminates access to all sections

**AC11 (User Sync - FR10):**
- [ ] On first API call after login, if user does not exist in local DB (audits-be or schedule-be), user record is created automatically with `auth0_sub`, email, name from token
- [ ] Sync process completes within 200ms or runs asynchronously without blocking API response

**AC12 (Mobile-First - NFR4):**
- [ ] Shell and all new UI components render correctly on mobile viewport (375px width)
- [ ] Navigation is touch-friendly, no hover-dependent interactions
- [ ] Tested on actual mobile device or emulator

**AC13 (Production Deployment - NFR1, NFR2):**
- [ ] All services deployed to Staging and fully tested (all ACs validated)
- [ ] DNS updated to point to new Shell URL
- [ ] Old AuditsApp and ScheduleApp URLs remain accessible as fallback
- [ ] Rollback plan documented and tested (revert DNS update)

## Traceability Mapping

| AC ID | Spec Section(s) | Component(s)/API(s) | Test Idea |
|---|---|---|---|
| AC1 | Detailed Design → Services, Dependencies | Monorepo structure, package.json files | Verify `npm install` succeeds, workspaces linked, ESLint runs |
| AC2 | APIs → Auth0 Integration, Workflows → Login | apps/shell, Auth0 SDK | E2E: Click Login → redirected → enter creds → see name in Shell |
| AC3 | APIs → Gateway Routes, Security → Token Validation | apps/api-gateway, JWT middleware | Unit: Test middleware with valid/invalid tokens; E2E: Call API without token → 401 |
| AC4 | Detailed Design → Services, Workflows → Login | apps/shell/audits, apps/audits-be, Gateway | E2E: Login → navigate to Audits → verify audits list loads |
| AC5 | Data Models → PostgreSQL Schema, Workflows → Migration | apps/schedule-be, Migration script | Unit: Test migration script on sample data; E2E: Migrated user resets password → logs in |
| AC6 | Detailed Design → Services, APIs → Gateway Routes | apps/shell/schedule, apps/schedule-be, iframe | E2E: Login → navigate to Schedule → verify schedule loads |
| AC7 | APIs → User Management, Workflows → User Creation | apps/shell/admin, Gateway `/admin/users`, Auth0 API | E2E: Admin creates Manager → check Auth0 → check DBs → verify email sent |
| AC8 | APIs → User Management, Security → Hierarchical Permissions | apps/shell/admin, Gateway authorization | E2E: Manager creates Employee for their store → success; tries different store → 403 |
| AC9 | Observability → Alerting | Gateway, Monitoring service | Manual: Trigger error condition → verify alert fires |
| AC10 | Workflows → Login, Security → Authentication | apps/shell, Gateway, Auth0 | E2E: Login → access Audits → access Schedule → no re-login |
| AC11 | Workflows → First Login, Data Models → User Sync | Gateway, audits-be, schedule-be | E2E: New user (created by Admin) logs in → verify user record in both DBs |
| AC12 | NFR → Mobile-First | apps/shell, packages/ui | Manual: Test on mobile device (375px) → verify navigation, forms work |
| AC13 | Reliability → Rollback, Infrastructure | All services, DNS, Render | Staging: Deploy → validate all features → document rollback steps |

## Risks, Assumptions, Open Questions

**Risks:**

1. **[RISK - HIGH]** ScheduleApp Auth Migration Complexity
   - **Detail:** Migrating production users from local JWT/bcrypt to Auth0 requires one-time password reset for all users; potential for user confusion or login failures
   - **Mitigation:** Comprehensive Staging testing with sample data; clear communication plan (email to users explaining password reset requirement); rollback plan via DNS revert; support team prepared for login issues

2. **[RISK - MEDIUM]** API Gateway Single Point of Failure
   - **Detail:** If Gateway goes down, entire platform becomes unavailable (unlike current separate apps)
   - **Mitigation:** Render auto-restart and health checks; monitoring with immediate alerts for Gateway downtime; documented rollback to old app URLs via DNS

3. **[RISK - MEDIUM]** CRA Integration via iframe/Micro-Frontend
   - **Detail:** Integrating CRA app into Next.js Shell via iframe may cause issues with token passing, navigation, or user experience inconsistencies
   - **Mitigation:** POC/spike to validate iframe approach in early stages; fallback option to run ScheduleApp as separate route in Shell (less integrated but more stable)

4. **[RISK - LOW]** User Sync Performance
   - **Detail:** Creating local user records on first login could add latency to first API call
   - **Mitigation:** Design sync to be async or < 200ms; add caching to avoid repeated sync checks; monitor sync performance metrics

5. **[RISK - LOW]** Lack of Existing Test Coverage
   - **Detail:** Original apps have minimal automated tests, increasing risk of regressions during migration
   - **Mitigation:** Write comprehensive E2E tests (Playwright) for critical paths before Production cutover; manual testing checklist for Staging validation

**Assumptions:**

1. **[ASSUMPTION]** Auth0 tenant is already provisioned with correct domain and API configuration
   - **Validation:** Confirm Auth0 tenant URL, audience, and Machine-to-Machine app credentials before starting Story 1.2

2. **[ASSUMPTION]** Render platform supports Monorepo deployments with selective builds per subdirectory
   - **Validation:** Test Render Monorepo setup in Staging early (Story 1.1)

3. **[ASSUMPTION]** Existing ScheduleApp users have valid email addresses for receiving Auth0 invitation emails
   - **Validation:** Data quality check on PostgreSQL Users table; identify and fix invalid emails before migration

4. **[ASSUMPTION]** Current Production traffic volume does not require advanced API Gateway features (rate limiting, caching)
   - **Validation:** Review current traffic metrics; simple Gateway sufficient for MVP, can enhance later if needed

5. **[ASSUMPTION]** Mobile-First design does not require native mobile apps; responsive web app in Shell is sufficient
   - **Validation:** Confirm with stakeholders; acceptance criteria focus on responsive web design

**Open Questions:**

1. **[QUESTION]** iframe vs. Micro-Frontend for ScheduleApp integration?
   - **Owner:** Frontend Lead
   - **Decision Needed By:** Start of Story 1.6
   - **Impact:** Technical approach for ScheduleApp Frontend integration

2. **[QUESTION]** Should user sync (FR10) be synchronous or asynchronous?
   - **Owner:** Backend Lead
   - **Decision Needed By:** Story 1.3 (Gateway implementation)
   - **Impact:** Performance and error handling strategy

3. **[QUESTION]** What is the maintenance window duration for Production cutover?
   - **Owner:** Product Manager + DevOps
   - **Decision Needed By:** Before Staging sign-off
   - **Impact:** Scheduling and communication plan

4. **[QUESTION]** Do we need to migrate ScheduleApp users before cutover or gradually post-cutover?
   - **Owner:** Product Manager + Backend Lead
   - **Decision Needed By:** Story 1.5 planning
   - **Impact:** Migration strategy and user communication (current assumption: all-at-once migration)

5. **[QUESTION]** Which monitoring service (Render Metrics, Sentry, Datadog, LogRocket)?
   - **Owner:** DevOps + Product Manager
   - **Decision Needed By:** Story 1.9
   - **Impact:** Cost, features, integration complexity

## Test Strategy Summary

**Testing Pyramid:**
- **Unit Tests (Vitest):** Focus on new shared code in `packages/` (auth-client utilities, type validators) and critical business logic in Gateway (user creation, routing logic)
  - Target: 70% coverage for packages, 50% for Gateway core logic
- **Integration Tests (Vitest + React Testing Library):** Component integration in Shell (navigation + auth state, user creation form + API calls)
  - Target: Key user journeys covered (login flow, navigation between apps, user creation form)
- **E2E Tests (Playwright):** Critical paths for full platform
  - Priority scenarios: Login/Logout, SSO (navigate Audits → Schedule without re-login), Admin user creation, Manager user creation (with store restriction), ScheduleApp auth migration user flow

**Test Levels:**

| Level | Focus | Tool | Coverage Goal |
|---|---|---|---|
| Unit | Pure functions, utilities, middlewares | Vitest | 70% packages, 50% services |
| Integration | Component + API, Service + DB | Vitest, React Testing Library | Key interactions |
| E2E | Full user journeys across services | Playwright | All AC scenarios |
| Manual | UX validation, mobile responsiveness | Humans + devices | All new UI screens |

**Test Scenarios (E2E - Playwright):**

1. **Auth Flow:**
   - User navigates to Shell → redirected to Auth0 → logs in → sees Shell with name displayed → logs out → returned to login
2. **SSO Navigation:**
   - User logs in → navigates to Audits → views audit list → navigates to Schedule → views schedule (no re-login)
3. **Admin User Creation:**
   - Admin logs in → goes to Admin/Users → creates new Manager (email, name, 2 stores) → submits → verify success message → check Auth0 (user exists) → check MongoDB (user record) → check PostgreSQL (user record) → verify invitation email sent (manual check or test email provider)
4. **Manager User Creation (Authorized):**
   - Manager logs in → goes to Users → creates new Employee for their store → success
5. **Manager User Creation (Unauthorized):**
   - Manager logs in → tries to create Employee for different store → receives 403 error
6. **ScheduleApp Migrated User Login:**
   - User (migrated from old ScheduleApp) receives password reset email → clicks link → sets new password at Auth0 → logs into Shell → navigates to Schedule → views their old schedule data (confirms data preserved)
7. **Mobile Responsiveness:**
   - Open Shell on mobile viewport (375px) → login → navigate between apps → create user (if Manager/Admin) → verify all interactions work on touch device

**Regression Testing:**
- Before Production cutover, manually test existing AuditsApp and ScheduleApp features in Staging (checklist of top 10 features per app)
- Validate data integrity: Sample audits and schedules match Production data

**Performance Testing:**
- Load test Gateway in Staging: Simulate 100 concurrent users making API calls → verify latency < 100ms, no errors
- Test user sync: Create 50 new users in quick succession → verify all sync successfully within acceptable time

**Testing Phases:**
1. **Story Development:** Unit + Integration tests written per story (TDD encouraged)
2. **Story Completion:** E2E test for story AC written and passing before story marked done
3. **Epic Completion:** Full E2E suite run in Staging; manual testing checklist completed
4. **Pre-Production:** Load testing, security review, full regression test on Staging
5. **Post-Production:** Smoke tests on Production immediately after cutover; monitor alerts for 48 hours

**Test Data:**
- **Staging:** Synthetic data mirroring Production structure (stores, users, audits, schedules) but with fake names/emails
- **ScheduleApp Migration Test:** Export subset of Production users to Staging, run migration script, validate

**Success Criteria for Epic:**
- All 13 ACs validated via automated or manual tests
- Zero critical bugs in Staging
- Rollback plan successfully tested (deploy → rollback → verify old apps work)
- Performance metrics meet NFR targets in Staging load test
