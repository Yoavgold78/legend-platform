Brownfield Application Unification Architecture
Project: Legenda Unified Platform

Version: 1.0

Date: October 24, 2025

Author: Winston (Architect)
1. Introduction
[Introduction]

This document outlines the architectural approach for unifying existing applications (AuditsApp, ScheduleApp) into a single platform for the "Legenda" chain, with a clear path for future application integration (e.g., Courses, Info). The primary goals are:

Centralized User Management: Utilizing Auth0 as the single source of truth for authentication (AuthN) and authorization (AuthZ), enabling Single Sign-On (SSO).

Unified User Experience (UI/UX): Creating a shared navigation shell ("Google-style") for seamless switching between applications, while maintaining a consistent, Mobile-First design.

Modern Technology Foundation: Adopting a Monorepo structure and Next.js as the standard frontend framework.

This document is based on the Brownfield Analysis of the existing systems.

Key Challenges Addressed:

Divergent Authentication: Full migration to Auth0, including migrating ScheduleApp from its internal JWT/bcrypt system.

Disparate Databases: Maintaining separate databases (MongoDB, PostgreSQL) at this stage, with user identity linked via Auth0.

Fragmented Frontends: Adopting Next.js and planning a phased migration for the ScheduleApp (from CRA).

Existing Project Analysis:

AuditsApp: Modern stack (Next.js, Node/Express, MongoDB) using Auth0.

ScheduleApp: Classic stack (React CRA, Node/Express, PostgreSQL) using internal JWT/bcrypt auth.

Known Constraints: Both applications are in Production and must remain stable. Both lack significant automated test coverage.

[Change Log]
Date,       Version,    Description,                                Author
24/10/2025,     1.0,    Initial unification architecture document,  Winston

2. Enhancement Scope and Integration Strategy
[Enhancement Scope and Integration Strategy]

This section defines the unification boundaries and integration approach, prioritizing the stability of the active Production environment.

Enhancement Scope: This is a Brownfield modernization and integration project. The scope includes unifying the authentication systems, unifying the frontend UX/shell, and establishing a Monorepo. This scope does not include merging the business logic or databases of the applications.

Integration Strategy (Phased & Production-Stable):

Authentication (Auth):

ScheduleApp Migration: Carefully migrate existing ScheduleApp users to Auth0 (requiring a one-time password reset). The ScheduleApp Backend and Frontend will be refactored to remove internal auth and integrate the Auth0 SDK. This will be tested thoroughly in a separate Staging environment first.

AuditsApp: Requires minor adjustments to ensure role/permission synchronization.

Databases (DB): Remain separate. Each application continues to use its own database (MongoDB for AuditsApp, PostgreSQL for ScheduleApp). User identity from Auth0 will be the common link.

Frontend (UI/UX):

A new Monorepo will be established in a separate development environment.

A central Shell Application (Next.js) will be built to house the main layout and shared navigation.

AuditsApp (Next.js): Code will be migrated into the Monorepo and integrated into the Shell.

ScheduleApp (React CRA): Code will be migrated into the Monorepo. To minimize disruption, it may be initially integrated via an iframe or as a micro-frontend, with a long-term plan to refactor it natively into Next.js.

Backend (API):

Separate Backends: The existing Node.js/Express backends will remain as separate services.

API Gateway (Recommended): A new, simple API Gateway (e.g., another Node.js service in the Monorepo) will be established. It will act as the single entry point for the Shell, validate Auth0 tokens centrally, and route requests to the correct backend (audits-be or schedule-be).

Compatibility & Rollback:

Phased Rollout: The new unified platform will be built and tested in Staging. The switchover in Production will be managed via DNS update, allowing for a quick rollback by repointing the DNS to the old, separate applications if necessary.

Feature Flags: We will consider using feature flags for gradual rollout of the unified shell.

3. Tech Stack Alignment
[Tech Stack Alignment]

This defines the unified tech stack for the new platform, leveraging the modern components of the existing apps.

Backend: Node.js + Express.js. (Databases remain separate: Mongoose/MongoDB and pg/PostgreSQL).

Frontend: Next.js (App Router), React, TypeScript.

Authentication: Auth0 (single, central provider).

UI: MUI (as the primary component library) combined with Tailwind CSS (for utility-first flexibility).

State Management (FE): Zustand (for global state in the Shell).

API Comms: Axios.

Testing: Vitest/Jest (Unit/Integration) + Playwright (E2E).

Monorepo Tool: pnpm workspaces.

API Gateway: Node.js + Express.js.

4. Data Models and Schema Changes
[Data Models and Schema Changes]

This defines the strategy for handling user data across separate databases, linked by a central authentication provider.

Auth0 as Single Source of Truth (Identity): Auth0 will manage the user's core identity (sub, email, name).

Unified User Identifier: The Auth0 sub (Subject Identifier) will be the unique key linking the user's identity to their data in all local databases.

Required Schema Changes:

AuditsApp (MongoDB):

No major change needed. The User model already contains an auth0Id field, which stores the sub. We will enforce this field as unique: true, index: true, and sparse: true.

App-specific data (role, stores, phoneNumber) will remain in this local document.

ScheduleApp (PostgreSQL):

Add Column: Add auth0_sub VARCHAR UNIQUE to the Users table [based on uploaded:schema.sql structure].

Remove Column: After migration, the password_hash column will be removed.

Local Permissions: App-specific permissions (UserStorePermissions, Roles, UserRoles) will remain in PostgreSQL, linked via the local user_id.

Data Sync (On Login/Signup):

A user logging in via Auth0 will trigger a check in the respective Backend (via the Gateway).

If a local user with that auth0_sub does not exist, a new local record is created (with basic details).

If a local user does exist, basic details (name, email) are synced from Auth0.

User Management (Creation/Update):

A Central User Management Interface will be built (as part of the Admin section of the Shell).

Hierarchical Creation:

Admin (Network level) creates Stores, Managers, and Regional Managers.

Manager (Store level) creates Employee users for their assigned store(s).

Creation Process (Secure):

Admin/Manager uses the central interface.

A request is sent (via API Gateway) to create the user in Auth0 (without a password).

Auth0 sends an "invitation" email to the new user to set their own password.

The API Gateway then creates/updates the local records in the relevant databases (audits-be and/or schedule-be) with the new auth0_sub and the correct role/store assignments.

Password Reset: Will be handled exclusively by Auth0. Admins can trigger a password reset email via the Auth0 API, but will never set a password for an existing user.

Non-User Data Models: All other business-specific models (Inspections, ShiftTemplates, etc.) remain unchanged in their respective separate databases.

5. Component Architecture
[Component Architecture]

This defines the logical components of the unified platform within the Monorepo structure.

Monorepo Structure (pnpm workspaces):
/legend-platform/ (Monorepo Root)
├── apps/                 # Deployable Applications
│   ├── shell/            # (NEW) The main Frontend Shell (Next.js)
│   ├── api-gateway/      # (NEW/Recommended) API Gateway (Node/Express)
│   ├── audits-be/        # (Migrated) AuditsApp Backend (Node/Express)
│   └── schedule-be/      # (Migrated) ScheduleApp Backend (Node/Express)
├── packages/             # Shared Code Libraries
│   ├── ui/               # (NEW) Shared UI components (React, MUI)
│   ├── types/            # (NEW) Shared TypeScript definitions (User, Store, etc.)
│   ├── auth-client/      # (NEW) Shared frontend logic for Auth0
│   └── config/           # (NEW) Shared configs (ESLint, Prettier, tsconfig)
├── pnpm-workspace.yaml
└── package.json

Key Components:

apps/shell (Frontend Shell):

Responsibility: The main layout, "Google-style" navigation, Auth0 login/logout processing, global notifications, and dynamic loading of the specific application UIs.

Tech: Next.js, React, Zustand, MUI, Tailwind CSS.

apps/api-gateway (API Gateway - Recommended):

Responsibility: Single entry point for all API calls. Centralized Auth0 token validation. Routing requests to the correct backend (audits-be or schedule-be). Centralized user creation logic (handling hierarchical permissions).

Tech: Node.js, Express.js.

apps/audits-be (Audits Backend):

Responsibility: All business logic for Audits & Checklists. Communicates with MongoDB and Cloudinary. Assumes authentication is handled by the Gateway.

Tech: Node.js, Express.js, Mongoose.

apps/schedule-be (Schedule Backend):

Responsibility: All business logic for Scheduling. Communicates with PostgreSQL. Auth logic will be refactored to rely on the Gateway/Auth0.

Tech: Node.js, Express.js, pg.

packages/ui, packages/types: Shared libraries to ensure consistency and reduce code duplication across the platform.

Component Interaction Diagram:
graph TD
    User[User via Browser/Mobile] --> Shell{apps/shell (Next.js)}
    Shell --> APIGW[apps/api-gateway (Node.js)]
    
    APIGW -- validates token --> Auth0[(Auth0)]
    
    subgraph "Monorepo (Hosted on Render)"
        APIGW -- /api/audits/* --> AuditsBE[apps/audits-be (Node.js)]
        APIGW -- /api/schedule/* --> ScheduleBE[apps/schedule-be (Node.js)]
        
        APIGW -- /api/users/create (Admin) --> Auth0
        APIGW -- /api/users/create (Manager) --> Auth0
        APIGW -- (sync) --> AuditsBE
        APIGW -- (sync) --> ScheduleBE
        
        Shell --> UI(packages/ui)
        Shell --> Types(packages/types)
        Shell --> AuthClient(packages/auth-client)
    end
    
    AuditsBE --> MongoDB[(MongoDB Atlas)]
    AuditsBE --> Cloudinary[(Cloudinary)]
    ScheduleBE --> PostgreSQL[(Render PostgreSQL)]

    6. External API Integration
[External API Integration]

This describes integrations with third-party services (excluding Auth0 and Databases).

Cloudinary (from AuditsApp):

Purpose: Image storage and processing.

Integration: Remains the responsibility of the audits-be service. The Frontend will call an endpoint (e.g., /api/audits/upload) exposed via the API Gateway.

Web Push Notifications (from both apps):

Purpose: Sending push notifications to users.

Integration: Each backend (audits-be, schedule-be) remains responsible for sending its own notifications. Push subscription tables remain separate in each DB. The unified Frontend will manage subscription logic. We will use a single set of VAPID keys stored as environment variables for both backends.

Video Hosting (for future Courses App):

Purpose: Storing and streaming training videos.

Integration: The Courses App backend (when built) will store links to a service like YouTube or Vimeo. The Frontend will embed the player.

7. Source Tree Integration
[Source Tree Integration]

This defines the target Monorepo folder structure, migrating from the existing Polyrepo structures.

Target Monorepo Structure (legend-platform/):
├── apps/
│   ├── shell/            # (New) Next.js Frontend Shell
│   │   ├── app/            # Next.js App Router
│   │   │   ├── (main)/       # Main authenticated layout
│   │   │   │   ├── layout.tsx  # Contains shared nav
│   │   │   │   ├── audits/     # AuditsApp routes/pages
│   │   │   │   ├── schedule/   # ScheduleApp routes/pages (phased integration)
│   │   │   │   ├── courses/    # Future CoursesApp routes/pages
│   │   │   │   └── admin/      # Central User/Store Management
│   │   │   │       └── users/
│   │   │   ├── api/          # Next.js API routes (e.g., /api/auth/token)
│   │   │   ├── layout.tsx    # Root layout (Auth0 provider)
│   │   │   └── page.tsx      # Root page (handles login redirect)
│   │   ├── components/       # Shell-specific components
│   │   ├── store/            # Zustand stores (global state)
│   │   ├── public/
│   │   └── package.json
│   ├── api-gateway/      # (New) Node.js/Express Gateway
│   │   ├── src/
│   │   │   ├── index.js      # Server entrypoint
│   │   │   ├── middleware/   # Auth0 validation middleware
│   │   │   └── routes/       # Routing logic to backends
│   │   └── package.json
│   ├── audits-be/        # (Migrated) AuditsApp Backend
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── index.js
│   │   └── package.json
│   └── schedule-be/      # (Migrated) ScheduleApp Backend
│       ├── db/
│       ├── middleware/     # Auth0 middleware (new)
│       ├── routes/
│       ├── app.js
│       └── package.json
├── packages/             # Shared Libraries
│   ├── ui/               # Shared React/MUI components
│   ├── types/            # Shared TypeScript interfaces
│   ├── auth-client/      # Shared Auth0 hooks/utils for FE
│   ├── eslint-config/    # Shared ESLint config
│   └── tsconfig/         # Shared tsconfig.json base
├── .gitignore
├── pnpm-workspace.yaml
└── package.json

8. Infrastructure and Deployment Integration
[Infrastructure and Deployment Integration]

This strategy focuses on leveraging the existing Render platform for a phased, low-risk rollout.

Platform: Continue using Render.

Monorepo Deployment: Render will be configured to support the Monorepo:

apps/shell: Deployed as a Web Service (the main user-facing app).

apps/api-gateway: Deployed as a Web Service (the single public API endpoint).

apps/audits-be: Deployed as a Private Service (accepts connections only from the Gateway).

apps/schedule-be: Deployed as a Private Service (accepts connections only from the Gateway).

Databases: Remain unchanged (MongoDB Atlas and Render PostgreSQL).

CI/CD: Render's "Build and deploy from a monorepo" feature will be used. Each service in Render will be pointed to its specific subdirectory (e.g., apps/shell). Render will automatically detect changes only in the relevant subdirectory to trigger a new build, preventing unnecessary deployments of services that haven't changed.

Phased Rollout Strategy (Prioritizing Production):

Prep: Set up the new Monorepo and deploy all services to a new, separate Staging environment on Render (connected to test databases).

Auth Migration: Run scripts to migrate ScheduleApp users to Auth0 (in Staging).

Validation: Thoroughly test the entire flow (Login, SSO, Shell navigation, API calls via Gateway to both Backends) in Staging.

Production Switchover: Once Staging is fully approved, schedule a maintenance window.

Migrate Production users from ScheduleApp to Auth0 (triggering password reset emails).

Deploy the new services to Production on Render (they will have new internal .onrender.com URLs).

Update the main DNS record to point to the new apps/shell Web Service instead of the old frontend apps.

Rollback: Render's built-in deployment history allows for instant rollback to a previous successful deployment (commit) with one click, ensuring we can quickly revert if any issues arise post-deployment.

9. Coding Standards
[Coding Standards]

These are critical standards for all new code in the Monorepo to ensure consistency, quality, and AI-agent compatibility.

Language: TypeScript is the standard for all new code (Frontend, Backend, Packages).

Modules: ES Modules (import/export) are the standard. The CommonJS code in schedule-be will be refactored during its migration.

Linting/Formatting: ESLint and Prettier will be enforced via a shared configuration in packages/config/.

Critical Rules (for AI and Humans):

Data Access: Logic (controllers/components) must call a Service Layer or Repository; never query the database directly.

Error Handling: All API routes must use a standardized error handling middleware.

Environment Variables: Access process.env only in a central config file (e.g., config.js or env.mjs) [pattern: uploaded:config.js].

Security: No secrets in code. All user input must be validated.

Types: Avoid any. Use shared types from packages/types.

Accessibility: All new shared UI components (packages/ui) and Shell components (apps/shell) must comply with WCAG 2.1 Level AA standards (e.g., keyboard navigation, ARIA attributes).

10. Test Strategy and Standards
[Test Strategy and Standards]

Given the lack of tests in the existing apps and the risk of modifying Production systems, a hybrid testing strategy is mandatory.

Automated Tests (AI/Dev):

Unit (Vitest): For all new logic in packages/ and critical business logic in backends.

Integration (Vitest + React Testing Library): For component interactions within the Shell.

E2E (Playwright): To cover critical paths:

Auth0 Login/Logout flow.

Hierarchical User Creation (Admin > Manager; Manager > Employee).

SSO Navigation between Audits and Schedule tabs.

A core function from each app (e.g., Submit Audit, Publish Schedule).

Manual Tests (User-led):

You will be provided with specific test scenarios (Test Cases) in the Staging environment before each major step of the rollout.

Example (Auth Migration): "Log in as a user from ScheduleApp. Verify you are prompted to reset your password via Auth0. Verify you can log in and see your old schedule data."

Example (Shell UI): "Log in as a Manager. Verify you see both 'Audits' and 'Schedule' tabs. Click both and confirm the correct app loads. Log in as an Employee. Verify you only see the apps/tabs relevant to you."

CI/CD: All automated tests (Unit/Integration) will run automatically in Render's CI pipeline before any deployment is allowed.

11. Security Integration
[Security Integration]

This plan centralizes security, leveraging Auth0 and the API Gateway.

Authentication: 100% Auth0. The schedule-be internal auth system will be removed.

Gateway Responsibility: The apps/api-gateway will be the only component that validates Auth0 JWTs from the user. It ensures all traffic to the backends is authenticated.

Authorization:

The Gateway passes the authenticated user's auth0_sub (e.g., in an x-user-id header) to the relevant backend.

Each backend (audits-be, schedule-be) trusts this header (as it comes from a private service) and uses the auth0_sub to query its own local database (MongoDB or PostgreSQL) to retrieve the user's specific roles and store permissions for that application.

Hierarchical permissions (Manager creating Employee) will be enforced in the API Gateway or a dedicated user management service, checking the caller's role before allowing the creation action (via Auth0 API + local DB sync).

Secrets: All secrets (DB URLs, API keys, Auth0 Client Secret) will be managed exclusively via Render Environment Variables.