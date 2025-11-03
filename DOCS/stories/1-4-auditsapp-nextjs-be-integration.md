# Story 1.4: AuditsApp (Next.js + BE) Integration

Status: ready-for-dev

## Story

As a **DevOps Engineer**,
I want to migrate the existing AuditsApp (Frontend & Backend) into the Monorepo and route its traffic through the API Gateway,
so that it becomes the first application fully integrated into the unified platform.

## Acceptance Criteria

1. **AC4.1:** AuditsApp Backend code migrated to `apps/audits-be/` with complete directory structure (controllers, models, routes, middleware, config, package.json)

2. **AC4.2:** audits-be authentication middleware refactored:
   - Remove all Auth0 JWT validation logic (no more `express-oauth2-jwt-bearer` or `@auth0/nextjs-auth0` in backend)
   - Create new middleware `trustGateway.js` that extracts `x-user-id` header and attaches to `req.user = { auth0_sub: x-user-id }`
   - All routes use `trustGateway` middleware instead of Auth0 validation
   - If `x-user-id` header missing, return 401 with clear error message

3. **AC4.3:** audits-be MongoDB User queries use `auth0Id` field (verify existing model has this field per architecture)

4. **AC4.4:** audits-be configured as Private Service in render.yaml:
   - Type: `pserv` (Private Service)
   - Not publicly accessible
   - Environment variables: `MONGO_URI`, `NODE_ENV`, `CLOUDINARY_*` (no Auth0 vars needed)

5. **AC4.5:** API Gateway `AUDITS_BE_URL` environment variable set to audits-be internal Private Service URL

6. **AC4.6:** Gateway proxy route `/api/v1/audits/*` successfully routes to audits-be (verify proxy.js from Story 1-3 works with actual backend)

7. **AC4.7:** AuditsApp Frontend code migrated to `apps/shell/app/(main)/audits/`:
   - All page components (list, detail, create views)
   - All audit-specific components  
   - API client updated to call Gateway URLs (`/api/v1/audits/*` instead of old backend URL)

8. **AC4.8:** Shell navigation updated to include "Audits" link in shared nav (visible when user authenticated)

9. **AC4.9:** End-to-end flow works:
   - User logs into Shell (Auth0) from Story 1-2
   - User clicks "Audits" in navigation
   - Audits page loads, makes API call to `/api/v1/audits/my-audits` with Bearer token
   - Gateway validates token, adds `x-user-id` header, proxies to audits-be
   - audits-be trusts header, queries MongoDB by `auth0Id`, returns user's audits
   - Frontend displays audits list

## Tasks / Subtasks

- [x] **Task 1:** Migrate AuditsApp Backend to Monorepo (AC: 4.1)
  - [x] 1.1: Create `apps/audits-be/` directory structure
  - [x] 1.2: Copy existing audits backend code (controllers, models, routes, config)
  - [x] 1.3: Create `package.json` with workspace dependencies
  - [x] 1.4: Install dependencies: Express, Mongoose, Cloudinary SDK, CORS
  - [x] 1.5: Update imports/paths to use workspace packages where applicable (`@legend/types` for shared interfaces)
  - [x] 1.6: Verify MongoDB connection config uses environment variable

- [x] **Task 2:** Refactor audits-be Authentication (AC: 4.2, 4.3)
  - [x] 2.1: Remove Auth0 SDK dependencies from `package.json` (`express-oauth2-jwt-bearer`, `@auth0/nextjs-auth0`)
  - [x] 2.2: Delete existing Auth0 validation middleware files
  - [x] 2.3: Create `src/middleware/trustGateway.js`:
    - Extract `x-user-id` header from request
    - If missing, return 401 `{ error: 'Unauthorized', message: 'Gateway authentication required' }`
    - If present, attach to `req.user = { auth0_sub: x-user-id }`
    - Log user ID for debugging
  - [x] 2.4: Update all protected routes to use `trustGateway` middleware instead of Auth0 middleware
  - [x] 2.5: Verify User model schema has `auth0Id` field (unique index)
  - [x] 2.6: Update user lookup queries to use `auth0Id` field: `User.findOne({ auth0Id: req.user.auth0_sub })`
  - [x] 2.7: Remove any Auth0 environment variables from backend config (AUTH0_AUDIENCE, AUTH0_ISSUER, etc.)

- [x] **Task 3:** Configure audits-be as Private Service (AC: 4.4)
  - [x] 3.1: Update `render.yaml` to add audits-be service configuration
  - [x] 3.2: Set service type to `pserv` (Private Service)
  - [x] 3.3: Configure build command: `npm install`
  - [x] 3.4: Configure start command: `node apps/audits-be/index.js` (or appropriate entry point)
  - [x] 3.5: Add environment variables: `MONGO_URI`, `NODE_ENV=production`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
  - [x] 3.6: Note: Private Service will not have public URL, only internal `.onrender.com` URL accessible from other Render services

- [ ] **Task 4:** Connect Gateway to audits-be (AC: 4.5, 4.6)
  - [ ] 4.1: Deploy audits-be to Render Staging as Private Service *(Manual: Render dashboard)*
  - [ ] 4.2: Copy internal Private Service URL from Render (format: `https://audits-be-xyz.onrender.com`)
  - [ ] 4.3: Set `AUDITS_BE_URL` environment variable in Gateway service (Render dashboard) to Private Service URL *(Manual)*
  - [ ] 4.4: Restart Gateway service to pick up new environment variable
  - [ ] 4.5: Verify Gateway proxy route: `apps/api-gateway/src/routes/proxy.js` should now route to real backend (no more 503 placeholder)
  - [ ] 4.6: Test Gateway → audits-be connection: Call Gateway health endpoint, check logs for proxy success

- [ ] **Task 5:** Migrate AuditsApp Frontend to Shell (AC: 4.7)
  - [ ] 5.1: Create `apps/shell/app/(main)/audits/` directory
  - [ ] 5.2: Copy existing audits frontend pages (list view, detail view, create/edit views)
  - [ ] 5.3: Copy audit-specific components to `apps/shell/app/(main)/audits/components/`
  - [ ] 5.4: Update imports to use Shell's shared components from `packages/ui` where applicable
  - [ ] 5.5: Create or update API client utility:
    - Base URL should be relative (`/api/v1/audits/*` - let browser resolve to Gateway)
    - Use Auth0 hook from Shell to get access token: `const { getAccessTokenSilently } = useAuth0();`
    - Add `Authorization: Bearer ${token}` header to all API requests
  - [ ] 5.6: Update all API calls to use new Gateway endpoints (e.g., `/api/v1/audits/list` instead of old backend URL)
  - [ ] 5.7: Test page rendering in isolation (mock API responses if needed)

- [ ] **Task 6:** Update Shell Navigation (AC: 4.8)
  - [ ] 6.1: Open `apps/shell/app/(main)/layout.tsx` (shared navigation layout)
  - [ ] 6.2: Add "Audits" navigation link with route `/audits`
  - [ ] 6.3: Ensure link only visible when user is authenticated (check `useAuth0()` hook)
  - [ ] 6.4: Add icon for Audits link (MUI icon, e.g., `AssignmentIcon`)
  - [ ] 6.5: Test navigation UI: verify link appears after login, clicks navigate to `/audits` route

- [ ] **Task 7:** End-to-End Integration Testing (AC: 4.9)
  - [ ] 7.1: Unit test `trustGateway` middleware:
    - Test with `x-user-id` header present → `req.user` populated
    - Test without `x-user-id` header → 401 error returned
  - [ ] 7.2: Integration test audits-be routes:
    - Mock request with `x-user-id` header → verify route handler receives `req.user.auth0_sub`
    - Test user lookup by `auth0Id` → verify MongoDB query works
  - [ ] 7.3: Manual E2E test in Staging:
    - Log into Shell with test Auth0 user
    - Click "Audits" in navigation
    - Verify audits list page loads
    - Verify API call to Gateway: check Network tab for `/api/v1/audits/*` request with Bearer token
    - Verify Gateway logs show successful proxy to audits-be
    - Verify audits-be logs show request with `x-user-id` header
    - Verify audits data displayed correctly (create test audit if needed)
  - [ ] 7.4: Test error scenarios:
    - Gateway down → verify frontend shows error state
    - audits-be down → verify Gateway returns 502, frontend shows error
    - Invalid token → verify Gateway returns 401, Shell redirects to login

- [ ] **Task 8:** Update Documentation and Deploy (AC: 4.1-4.9)
  - [ ] 8.1: Update `apps/audits-be/README.md` with setup instructions, environment variables, Gateway trust pattern
  - [ ] 8.2: Update root `README.md` to document audits-be service
  - [ ] 8.3: Commit all changes to Monorepo
  - [ ] 8.4: Deploy to Render Staging: audits-be (Private), Gateway (with AUDITS_BE_URL), Shell (with audits routes)
  - [ ] 8.5: Run full E2E test suite in Staging
  - [ ] 8.6: Document rollback plan (revert DNS, redeploy old audits app if needed)

## Dev Notes

### Architecture Context

**From brownfield-architecture.md:**
- **Section 3 (Tech Stack):** AuditsApp uses Node.js + Express + Mongoose + MongoDB, already uses Auth0 (but validates directly - needs refactoring)
- **Section 5 (Component Architecture):** audits-be communicates with MongoDB and Cloudinary, assumes authentication handled by Gateway
- **Section 7 (Source Tree):** Frontend integrates natively into Shell at `app/(main)/audits/`, Backend at `apps/audits-be/` with controllers/models/routes structure
- **Section 11 (Security):** Backends trust `x-user-id` header from Gateway (only Gateway validates Auth0 tokens), backends are Private Services

**From tech-spec-epic-1.md:**
- **Detailed Design → Services:** audits-be responsibility: all business logic for Audits & Checklists, communicates with MongoDB/Cloudinary, assumes Gateway authentication
- **Data Models → User Model:** MongoDB User schema has `auth0Id` field (should be unique: true, index: true, sparse: true)
- **APIs → Backend Contracts:** Backends expect `x-user-id` header from Gateway containing `auth0_sub`
- **Security → Backend Trust:** Backends do NOT validate tokens directly; they trust Gateway's `x-user-id` header (only accepting requests from Gateway's private network)
- **Workflows → User Login Flow:** Shell → Gateway (validates token) → audits-be (trusts x-user-id header) → MongoDB query by auth0Id

**Key Constraints:**
- audits-be MUST NOT validate Auth0 tokens (Gateway does this)
- audits-be MUST be Private Service (not publicly accessible)
- Frontend MUST call Gateway URLs (`/api/v1/audits/*`), NOT direct backend URLs
- User identity linked via `auth0Id` field in MongoDB (must match `x-user-id` from Gateway)
- Cloudinary integration remains in audits-be (no changes needed)

### Learnings from Previous Story

**From Story 1-3 (API Gateway - Central Token Validation) - Status: done**

- **Gateway Services Created**: API Gateway fully functional at `apps/api-gateway/` with Auth0 JWT validation, proxy routing, request tracing
- **Middleware Pattern Established**: requestId → auth (JWT validation) → addUserContext (extract sub) → proxy routes
- **Proxy Route Already Configured**: `apps/api-gateway/src/routes/proxy.js` has `/api/v1/audits/*` route with conditional setup (returns 503 when `AUDITS_BE_URL` not set, will proxy when set)
- **Headers Passed to Backends**: Gateway adds `x-user-id` (from token `sub` claim) and `x-request-id` (correlation ID) to all proxied requests
- **Testing Pattern**: Comprehensive test suite with unit tests (middleware) and integration tests (auth flows), all passing
- **Environment Variable Pattern**: Use `.env.template` for documentation, actual values in Render dashboard
- **Private Service URLs**: Backends deployed as Private Services have internal URLs like `https://service-name.onrender.com` (not public)

**Actions for Story 1-4:**
- **REUSE** existing Gateway proxy route - just need to set `AUDITS_BE_URL` environment variable
- **FOLLOW** Gateway's trust pattern: audits-be should trust `x-user-id` header, not validate tokens
- **FOLLOW** testing pattern: unit tests for new middleware, integration tests for routes, E2E for full flow
- **DEPLOY** audits-be as Private Service (like Gateway expects in architecture)

**Key Files to Reference:**
- `apps/api-gateway/src/middleware/addUserContext.js` - Pattern for extracting user ID from JWT and adding to request
- `apps/api-gateway/src/routes/proxy.js` - Proxy configuration (audits route already exists)
- `apps/api-gateway/.env.template` - Environment variable pattern

**Gotchas from Story 1-3 to Avoid:**
- Gateway's proxy route needs exact Private Service URL in `AUDITS_BE_URL` (get from Render after deployment)
- Path rewriting in proxy: Gateway routes `/api/v1/audits/*` but backend expects root paths (`/audits/*` or just `/*`) - verify proxy pathRewrite config
- CORS: audits-be must allow requests from Gateway (though Private Service network should handle this)
- Error handling: audits-be should return proper HTTP status codes (Gateway will proxy them to Shell)

[Source: `DOCS/stories/1-3-api-gateway-central-token-validation.md#Dev-Agent-Record`, `#Learnings-from-Previous-Story`]

### Project Structure Notes

**AuditsApp Backend Migration (`apps/audits-be/`):**

```
apps/audits-be/
├── controllers/          # Business logic (audits, checklists, stores)
│   ├── auditController.js
│   ├── checklistController.js
│   └── storeController.js
├── models/               # Mongoose schemas
│   ├── User.js          # CRITICAL: Verify auth0Id field (unique, indexed)
│   ├── Audit.js
│   ├── Checklist.js
│   └── Store.js
├── routes/               # Express routes
│   ├── audits.js        # /audits/* endpoints
│   ├── checklists.js    # /checklists/* endpoints
│   └── stores.js        # /stores/* endpoints
├── middleware/
│   ├── trustGateway.js  # NEW: Extract x-user-id, attach to req.user
│   └── errorHandler.js  # Centralized error handling
├── config/
│   ├── db.js            # MongoDB connection (uses MONGO_URI env var)
│   └── cloudinary.js    # Cloudinary config (uses CLOUDINARY_* env vars)
├── utils/
│   └── logger.js        # Logging utility
├── index.js             # Server entrypoint
├── package.json         # Dependencies (workspace references)
└── README.md            # Setup and deployment docs
```

**AuditsApp Frontend Migration (`apps/shell/app/(main)/audits/`):**

```
apps/shell/app/(main)/audits/
├── page.tsx             # Audits list view (main page)
├── [id]/
│   └── page.tsx         # Audit detail view
├── create/
│   └── page.tsx         # Create new audit
├── components/          # Audit-specific components
│   ├── AuditCard.tsx
│   ├── AuditFilters.tsx
│   ├── ChecklistForm.tsx
│   └── StoreSelector.tsx
└── utils/
    └── auditApi.ts      # API client for /api/v1/audits/* endpoints
```

**Shell Navigation Update:**

```typescript
// apps/shell/app/(main)/layout.tsx
import { AssignmentIcon } from '@mui/icons-material';

const navItems = [
  { label: 'Audits', href: '/audits', icon: AssignmentIcon }, // NEW
  { label: 'Schedule', href: '/schedule', icon: CalendarIcon }, // Future Story 1-6
  // ... other nav items
];
```

**Alignment with Unified Structure:**
- ✅ Backend follows Monorepo pattern: `apps/audits-be/` as standalone service
- ✅ Frontend follows App Router pattern: `app/(main)/audits/` with nested routes
- ✅ Uses workspace packages: `@legend/types` for shared TypeScript interfaces
- ✅ Follows coding standards: TypeScript for frontend, ESLint/Prettier from `packages/config`

**Detected Variances:**
- AuditsApp backend may have been using CommonJS (`require`) - should migrate to ES Modules (`import/export`) per coding standards [Section 9]
- Existing Auth0 validation middleware in audits-be conflicts with new trust pattern - must be removed completely
- Frontend may have hardcoded backend URL - must be updated to relative Gateway URLs

### Testing Strategy

**From tech-spec-epic-1.md Test Strategy:**
- **Unit Tests (Vitest):** `trustGateway` middleware, user lookup logic
- **Integration Tests:** Audit routes with mocked Gateway headers, MongoDB queries
- **E2E Tests (Playwright):** Full login → navigate to Audits → view audits flow

**Test Scenarios:**

1. **Unit: trustGateway Middleware**
   - ✅ Request with `x-user-id` header → `req.user.auth0_sub` populated
   - ✅ Request without `x-user-id` header → 401 error

2. **Integration: Audit Routes**
   - ✅ GET `/audits/my-audits` with `x-user-id` header → returns user's audits from MongoDB
   - ✅ User not found in MongoDB → returns 404 or empty list (depending on business logic)
   - ✅ GET `/audits/:id` → returns specific audit if user has access

3. **E2E: Full Flow (Playwright)**
   - ✅ User logs into Shell (Auth0)
   - ✅ User clicks "Audits" in navigation
   - ✅ Audits list page loads
   - ✅ API call to `/api/v1/audits/my-audits` visible in Network tab
   - ✅ Audits data displayed correctly
   - ✅ User can navigate to audit detail view

4. **Manual: Error Scenarios**
   - ✅ Gateway down → frontend shows error message
   - ✅ audits-be down → Gateway returns 502, frontend handles gracefully
   - ✅ Invalid Auth0 token → Gateway returns 401, Shell redirects to login

**Test Data:**
- Create test MongoDB database for Staging with sample audits, users, stores
- Test user with `auth0Id` matching Auth0 test account used in Shell login

### References

- [Architecture: Component Architecture] `DOCS/brownfield-architecture.md#Section-5`
- [Architecture: Security - Backend Trust] `DOCS/brownfield-architecture.md#Section-11`
- [Architecture: Source Tree Integration] `DOCS/brownfield-architecture.md#Section-7`
- [Tech Spec: Services - audits-be] `DOCS/tech-spec-epic-1.md#Detailed-Design-Services`
- [Tech Spec: Data Models - User] `DOCS/tech-spec-epic-1.md#Data-Models-User-Model`
- [Tech Spec: APIs - Backend Contracts] `DOCS/tech-spec-epic-1.md#APIs-Backend-Contracts`
- [Tech Spec: Workflows - User Login Flow] `DOCS/tech-spec-epic-1.md#Workflows-User-Login-Flow`
- [Tech Spec: Test Strategy] `DOCS/tech-spec-epic-1.md#Test-Strategy-Summary`
- [Story 1-2: Shell Auth0 Integration] `DOCS/stories/1-2-shell-auth0-integration.md`
- [Story 1-3: API Gateway] `DOCS/stories/1-3-api-gateway-central-token-validation.md`
- [PRD: Story 1.4] `DOCS/PRD.md#Story-1-4`

## Dev Agent Record

### Context Reference

- `DOCS/stories/1-4-auditsapp-nextjs-be-integration.context.xml` - Complete story context with documentation artifacts, code references, interfaces, constraints, and testing guidance

### Agent Model Used

GitHub Copilot (GPT-4 based)

### Debug Log References

### Completion Notes List

### File List

---

## Change Log

| Date       | Author | Change Description                |
|:-----------|:-------|:----------------------------------|
| 2025-11-02 | Bob (SM) | Initial story draft created from PRD Story 1.4, Tech Spec AC4, and Architecture requirements - AuditsApp migration to Monorepo with Gateway integration and Private Service deployment |
