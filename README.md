# Legenda Platform - Unified Monorepo

Unified platform for Legenda chain management applications (AuditsApp, ScheduleApp, and future apps).

## Architecture

**Monorepo Structure:** npm workspaces
**Deployment:** Render (Web Services + Private Services)
**Authentication:** Auth0 (centralized SSO)
**API Gateway Pattern:** Central token validation, routes to backend services

## Services

### Frontend

**Shell (`apps/shell/`)** - Web Service
- Next.js 14 application
- Shared navigation ("Google-style" app switcher)
- Auth0 integration for SSO
- Mobile-first responsive design
- **URL:** https://legend-shell-staging.onrender.com
- **Tech:** Next.js, React, Auth0 SDK, Material UI, Tailwind CSS

### Backend

**API Gateway (`apps/api-gateway/`)** - Web Service
- Central Auth0 JWT validation
- Routes requests to backend Private Services
- Adds `x-user-id` header (from Auth0 `sub`) to backend requests
- Request tracing with `x-request-id`
- **Tech:** Node.js, Express, express-oauth2-jwt-bearer

**AuditsApp Backend (`apps/audits-be/`)** - Private Service *(Story 1.4)*
- Business logic for Audits & Checklists
- Trusts Gateway's `x-user-id` header (no direct Auth0 validation)
- MongoDB + Mongoose
- Cloudinary integration for image uploads
- **Tech:** Node.js, Express, MongoDB, Mongoose, Cloudinary
- **README:** [apps/audits-be/README.md](apps/audits-be/README.md)

**ScheduleApp Backend (`apps/schedule-be/`)** - Private Service *(Story 1.5 - Planned)*
- Business logic for Employee Scheduling
- PostgreSQL database
- *(Not yet implemented)*

### Frontend Apps

**AuditsApp Frontend (`apps/audits-fe/`)** - Web Service *(Story 1.4)*
- Next.js application for Audits management
- Embedded in Shell via iframe
- Calls API Gateway for backend requests
- **Tech:** Next.js, React, Material UI, Auth0
- *(Deployment pending)*

## Quick Start

### Prerequisites

- Node.js 20+
- npm 10+
- Auth0 account (for authentication)
- MongoDB Atlas (for audits-be)
- PostgreSQL (for schedule-be, future)
- Cloudinary account (for image uploads)

### Local Development

```bash
# Install dependencies
npm install

# Run Shell locally
cd apps/shell
npm run dev

# Run API Gateway locally
cd apps/api-gateway
npm run dev

# Run audits-be locally
cd apps/audits-be
npm start
```

### Environment Variables

Each service requires environment variables. See:
- Shell: `apps/shell/.env.local` (Auth0 config)
- API Gateway: `apps/api-gateway/.env` (Auth0 audience, backend URLs)
- audits-be: `apps/audits-be/.env` (MongoDB, Cloudinary)

## Deployment

Deployment managed via `render.yaml`. Services deploy automatically on push to `main` branch.

### Render Services

| Service | Type | URL | Purpose |
|---------|------|-----|---------|
| shell | Web Service | https://legend-shell-staging.onrender.com | Frontend application shell |
| api-gateway | Web Service | https://legend-gateway-staging.onrender.com | Central API gateway |
| audits-be | Private Service | Internal only | Audits backend (not publicly accessible) |
| audits-fe | Web Service | (Pending deployment) | Audits frontend application |

### Manual Steps After Deployment

1. **Deploy services** via Render dashboard (reads `render.yaml`)
2. **Set environment variables** in Render dashboard for each service
3. **Copy Private Service URLs** and set in Gateway:
   - `AUDITS_BE_URL` → audits-be internal URL
   - `SCHEDULE_BE_URL` → schedule-be internal URL (future)
4. **Restart Gateway** to pick up backend URLs

## Architecture Patterns

### Gateway Trust Pattern

Backends (Private Services) trust the API Gateway:

1. **Client** → Makes request to Gateway with Auth0 Bearer token
2. **Gateway** → Validates token, extracts `user.sub`
3. **Gateway** → Adds `x-user-id` header with `sub` value
4. **Gateway** → Proxies request to backend Private Service
5. **Backend** → Trusts `x-user-id` header (no token validation)
6. **Backend** → Looks up user in database by `auth0Id` field

**Why:** 
- Centralized token validation (DRY principle)
- Backends are not publicly accessible (Private Service)
- Reduced complexity in backend services

### User Identity Linking

- **Auth0 `sub` claim** → Unique user identifier (e.g., `auth0|123abc`)
- **MongoDB (audits-be)** → `User.auth0Id` field (unique index)
- **PostgreSQL (schedule-be)** → `users.auth0_sub` column (unique, future)

## Project Structure

```
legend-platform/
├── apps/
│   ├── shell/              # Next.js Shell (Web Service)
│   ├── api-gateway/        # API Gateway (Web Service)
│   ├── audits-be/          # Audits Backend (Private Service)
│   ├── audits-fe/          # Audits Frontend (Web Service)
│   └── schedule-be/        # Schedule Backend (Private Service, future)
├── packages/
│   ├── ui/                 # Shared UI components
│   ├── types/              # Shared TypeScript types
│   ├── auth-client/        # Shared Auth0 client utilities
│   └── config/             # Shared ESLint/Prettier config
├── DOCS/
│   ├── brownfield-architecture.md
│   ├── tech-spec-epic-1.md
│   ├── PRD.md
│   └── stories/            # Story files with context
├── render.yaml             # Render deployment configuration
└── package.json            # Workspace root
```

## Stories & Development

Development follows story-driven approach:

- **Story 1.1** ✅ Monorepo & Core Services Scaffolding
- **Story 1.2** ✅ Shell Auth0 Integration
- **Story 1.3** ✅ API Gateway - Central Token Validation
- **Story 1.4** 🚧 AuditsApp (Next.js + BE) Integration (In Progress)
- **Story 1.5** ⏳ ScheduleApp Backend Auth Migration (Planned)
- **Story 1.6** ⏳ ScheduleApp Frontend (CRA) Integration (Planned)

See [DOCS/stories/](DOCS/stories/) for detailed story specifications.

## Testing

- **Unit Tests:** Vitest (backend middleware, utilities)
- **Integration Tests:** Vitest (API routes with mocked dependencies)
- **E2E Tests:** Playwright (full user flows)

```bash
# Run all tests
npm test

# Run tests for specific workspace
npm test --workspace=apps/api-gateway
```

## Documentation

- **Architecture:** [DOCS/brownfield-architecture.md](DOCS/brownfield-architecture.md)
- **Technical Specification:** [DOCS/tech-spec-epic-1.md](DOCS/tech-spec-epic-1.md)
- **Product Requirements:** [DOCS/PRD.md](DOCS/PRD.md)
- **Render Configuration:** [RENDER-CONFIG.md](RENDER-CONFIG.md)
- **Service READMEs:**
  - [API Gateway](apps/api-gateway/README.md)
  - [AuditsApp Backend](apps/audits-be/README.md)

## Support & Contact

For issues or questions:
- Check story documentation in `DOCS/stories/`
- Review service-specific READMEs
- Consult architecture docs

## License

Proprietary - Legenda Chain Management System
