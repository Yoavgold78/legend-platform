# Story 1.2: Shell Auth0 Integration

Status: drafted

## Story

As a **User**,
I want to log in and log out of the new Shell application using my Auth0 credentials,
so that I have a single point of entry to the unified platform with secure authentication.

## Acceptance Criteria

1. **AC2.1:** `apps/shell` Next.js app created with Auth0 SDK configured (`@auth0/nextjs-auth0`)
2. **AC2.2:** "Login" button/link present on landing page that redirects to Auth0 Universal Login
3. **AC2.3:** After successful Auth0 authentication, user is redirected back to Shell and session is established
4. **AC2.4:** User's name is displayed in Shell header/navigation after login
5. **AC2.5:** "Logout" button/link present that clears the session and redirects to login page
6. **AC2.6:** Unauthenticated users attempting to access protected routes are redirected to login

## Tasks / Subtasks

- [ ] **Task 1:** Set up Next.js Shell application (AC: 2.1)
  - [ ] 1.1: Initialize Next.js app in `apps/shell/` using `npx create-next-app@latest` with TypeScript, App Router, Tailwind CSS
  - [ ] 1.2: Update `apps/shell/package.json` to include workspace dependencies (`@legend/ui`, `@legend/types`, `@legend/auth-client`)
  - [ ] 1.3: Configure `next.config.js` for production settings (strict mode, etc.)
  - [ ] 1.4: Create basic app structure: `app/layout.tsx` (root layout), `app/page.tsx` (landing page)
  - [ ] 1.5: Install and configure Tailwind CSS + MUI theme provider

- [ ] **Task 2:** Install and configure Auth0 SDK (AC: 2.1)
  - [ ] 2.1: Install `@auth0/nextjs-auth0` package in `apps/shell`
  - [ ] 2.2: Create `.env.local` template with Auth0 environment variables:
    - `AUTH0_SECRET` (generated secret)
    - `AUTH0_BASE_URL` (Shell URL)
    - `AUTH0_ISSUER_BASE_URL` (Auth0 tenant URL)
    - `AUTH0_CLIENT_ID` (Auth0 application client ID)
    - `AUTH0_CLIENT_SECRET` (Auth0 application client secret)
  - [ ] 2.3: Configure Auth0Provider in root `app/layout.tsx` using `UserProvider` from Auth0 SDK
  - [ ] 2.4: Create API route handler: `app/api/auth/[auth0]/route.ts` using `handleAuth()` from SDK
  - [ ] 2.5: Verify Auth0 application configured in Auth0 dashboard (Allowed Callback URLs, Logout URLs, Web Origins)

- [ ] **Task 3:** Implement login functionality (AC: 2.2, 2.3)
  - [ ] 3.1: Create login button component in `app/page.tsx` that links to `/api/auth/login`
  - [ ] 3.2: Style login page with basic branding and Mobile-First design
  - [ ] 3.3: Test login flow: click Login → redirect to Auth0 Universal Login → enter credentials → redirect back to Shell
  - [ ] 3.4: Verify Auth0 session cookie is set after successful login
  - [ ] 3.5: Handle Auth0 callback errors (display error message if authentication fails)

- [ ] **Task 4:** Display authenticated user information (AC: 2.4)
  - [ ] 4.1: Create `app/(main)/layout.tsx` for authenticated app layout with shared navigation
  - [ ] 4.2: Use `useUser()` hook from Auth0 SDK to get user profile
  - [ ] 4.3: Display user's name in header/navigation bar (e.g., "Welcome, {user.name}")
  - [ ] 4.4: Add user avatar/profile picture if available from Auth0 profile
  - [ ] 4.5: Create protected dashboard page `app/(main)/dashboard/page.tsx` as landing after login

- [ ] **Task 5:** Implement logout functionality (AC: 2.5)
  - [ ] 5.1: Add "Logout" button/link to authenticated layout header
  - [ ] 5.2: Logout button links to `/api/auth/logout` (provided by Auth0 SDK)
  - [ ] 5.3: Test logout flow: click Logout → session cleared → redirect to login page
  - [ ] 5.4: Verify Auth0 session cookie is removed after logout
  - [ ] 5.5: Confirm user cannot access protected routes after logout

- [ ] **Task 6:** Implement route protection (AC: 2.6)
  - [ ] 6.1: Create middleware or use `withPageAuthRequired` for protected routes
  - [ ] 6.2: Wrap `app/(main)/*` routes to require authentication
  - [ ] 6.3: Test unauthenticated access: navigate to `/dashboard` without login → redirect to login
  - [ ] 6.4: Verify redirect includes return URL to navigate back after login

- [ ] **Task 7:** Testing and validation (ALL ACs)
  - [ ] 7.1: Manual E2E test: Full login flow (login → see name → logout → redirect)
  - [ ] 7.2: Test on mobile viewport (375px) → verify login/logout work on touch device
  - [ ] 7.3: Test error scenarios: invalid credentials, network error, Auth0 downtime
  - [ ] 7.4: Verify Auth0 security best practices: HTTPS only, secure cookies, PKCE flow
  - [ ] 7.5: Update Render Staging service for `apps/shell` with Auth0 environment variables
  - [ ] 7.6: Deploy to Staging and verify login works in deployed environment

## Dev Notes

### Architecture Context

**From brownfield-architecture.md:**
- **Section 3 (Tech Stack):** Shell uses Next.js 14+ with App Router, TypeScript, MUI, Tailwind CSS
- **Section 11 (Security):** Auth0 is the exclusive authentication mechanism; no secondary auth systems allowed
- **NFR4 (Mobile-First):** All new UI must be designed Mobile-First (375px viewport minimum)
- **Section 9 (Coding Standards):** TypeScript strict mode, ES Modules, accessibility (WCAG 2.1 Level AA)

**From tech-spec-epic-1.md:**
- **AC2 Details:** Specifies exact Auth0 SDK package (`@auth0/nextjs-auth0`), login/logout button requirements
- **Workflows → User Login Flow:** Complete 11-step sequence from initial navigation to Auth0 and back
- **Security → Authentication:** Auth0 as single provider, session-based authentication with secure cookies
- **Performance → Shell Load Time:** Target < 2 seconds for First Contentful Paint
- **Dependencies:** Next.js ^14.2.0, React ^18.3.0, @auth0/nextjs-auth0 ^3.5.0

**Key Constraints:**
- Auth0 Universal Login must be used (not embedded login forms)
- Session cookies must be secure (httpOnly, sameSite, secure flags)
- Must support Mobile-First responsive design
- Logout must clear all session data and redirect to public page

### Project Structure Notes

**Shell App Structure (from Section 7 of brownfield-architecture.md):**

```
apps/shell/
├── app/
│   ├── (main)/                  # Authenticated layout group
│   │   ├── layout.tsx           # Shared navigation for authenticated users
│   │   ├── dashboard/
│   │   │   └── page.tsx         # Main dashboard (future: route to Audits/Schedule)
│   │   ├── audits/              # AuditsApp routes (Story 1.4)
│   │   ├── schedule/            # ScheduleApp routes (Story 1.6)
│   │   └── admin/               # Admin routes (Story 1.7, 1.8)
│   ├── api/
│   │   └── auth/
│   │       └── [auth0]/
│   │           └── route.ts     # Auth0 SDK handler (login, logout, callback, profile)
│   ├── layout.tsx               # Root layout (Auth0Provider)
│   ├── page.tsx                 # Landing/login page
│   └── globals.css              # Global styles (Tailwind)
├── components/
│   └── Navigation.tsx           # Shared navigation component (will show user name)
├── public/
│   └── (static assets)
├── next.config.js
├── tsconfig.json
├── tailwind.config.ts
└── package.json
```

**Auth0 Configuration Notes:**
- **Callback URL:** `{AUTH0_BASE_URL}/api/auth/callback` (e.g., `https://shell.onrender.com/api/auth/callback`)
- **Logout URL:** `{AUTH0_BASE_URL}` (redirect after logout)
- **Web Origins:** `{AUTH0_BASE_URL}` (for CORS)
- **Application Type:** Regular Web Application
- **Token Endpoint Auth Method:** Post (client secret in body)

### Testing Strategy

**From tech-spec-epic-1.md Test Strategy:**
- **E2E Test Scenario #1 (Playwright):** User navigates to Shell → redirected to Auth0 → logs in → sees Shell with name displayed → logs out → returned to login
- **Manual Test (Mobile):** Test on 375px viewport → verify login/logout work with touch interactions
- **AC Validation:** All 6 ACs must pass before story marked done

**Testing Checklist:**
1. **AC2.1:** Verify `@auth0/nextjs-auth0` in package.json, Auth0Provider in layout
2. **AC2.2:** Click Login button → redirected to Auth0 Universal Login (check URL)
3. **AC2.3:** Enter valid credentials → redirected to Shell → session cookie present
4. **AC2.4:** Check header → user name displayed (e.g., "Welcome, John Doe")
5. **AC2.5:** Click Logout → session cleared → redirected to login page
6. **AC2.6:** Try accessing `/dashboard` without login → redirected to login with return URL

**Error Scenarios to Test:**
- Invalid Auth0 credentials → error message from Auth0
- Auth0 service unavailable → handle gracefully with error page
- Network interruption during callback → retry or show error
- Expired session → redirect to login on next request

### References

- [Auth0 Next.js SDK Quickstart] https://auth0.com/docs/quickstart/webapp/nextjs
- [Auth0 Next.js SDK API] https://github.com/auth0/nextjs-auth0
- [Architecture: Tech Stack] brownfield-architecture.md # Section 3
- [Architecture: Security] brownfield-architecture.md # Section 11
- [Tech Spec: AC2] tech-spec-epic-1.md # Acceptance Criteria → AC2
- [Tech Spec: User Login Flow] tech-spec-epic-1.md # Workflows and Sequencing
- [Tech Spec: Security Requirements] tech-spec-epic-1.md # Non-Functional Requirements → Security

### Implementation Notes

**Auth0 Environment Variables (.env.local template):**

```bash
# Generate a 32-character secret: openssl rand -hex 32
AUTH0_SECRET='your-generated-secret-here'

# Shell application URL (Staging or Production)
AUTH0_BASE_URL='http://localhost:3000'  # Development
# AUTH0_BASE_URL='https://legend-shell-staging.onrender.com'  # Staging

# Auth0 tenant domain
AUTH0_ISSUER_BASE_URL='https://your-tenant.auth0.com'

# Auth0 Application credentials (from Auth0 Dashboard)
AUTH0_CLIENT_ID='your-client-id'
AUTH0_CLIENT_SECRET='your-client-secret'

# Optional: Audience for API access (will be needed in Story 1.3)
# AUTH0_AUDIENCE='https://api.legend-platform.com'
```

**Root Layout with Auth0Provider (app/layout.tsx):**

```tsx
import { UserProvider } from '@auth0/nextjs-auth0/client';
import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <UserProvider>
          {children}
        </UserProvider>
      </body>
    </html>
  );
}
```

**Auth0 API Route Handler (app/api/auth/[auth0]/route.ts):**

```tsx
import { handleAuth } from '@auth0/nextjs-auth0';

export const GET = handleAuth();
```

**Login Page (app/page.tsx):**

```tsx
import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Legenda Platform</h1>
        <p className="text-gray-600 mb-8">Unified Audits & Schedule Management</p>
        <Link 
          href="/api/auth/login"
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
        >
          Log In
        </Link>
      </div>
    </div>
  );
}
```

**Authenticated Layout with User Info (app/(main)/layout.tsx):**

```tsx
'use client';
import { useUser } from '@auth0/nextjs-auth0/client';
import Link from 'next/link';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useUser();

  if (isLoading) return <div>Loading...</div>;
  if (!user) return null; // Should redirect via middleware

  return (
    <div className="min-h-screen">
      <header className="bg-gray-800 text-white p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">Legenda</h1>
          <div className="flex items-center gap-4">
            <span>Welcome, {user.name}</span>
            <Link 
              href="/api/auth/logout"
              className="bg-red-600 px-4 py-2 rounded hover:bg-red-700"
            >
              Logout
            </Link>
          </div>
        </div>
      </header>
      <main className="container mx-auto p-4">
        {children}
      </main>
    </div>
  );
}
```

**Protected Page with Auth Check (app/(main)/dashboard/page.tsx):**

```tsx
import { withPageAuthRequired } from '@auth0/nextjs-auth0';

export default withPageAuthRequired(async function Dashboard() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Dashboard</h2>
      <p>You are logged in!</p>
    </div>
  );
}, {
  returnTo: '/dashboard'
});
```

**Middleware for Route Protection (middleware.ts - optional):**

```tsx
import { withMiddlewareAuthRequired } from '@auth0/nextjs-auth0/edge';

export default withMiddlewareAuthRequired();

export const config = {
  matcher: [
    '/(main)/:path*',  // Protect all routes under (main)
  ],
};
```

**Render Deployment Notes:**
- Add all Auth0 environment variables to Render service settings (Environment tab)
- Update `AUTH0_BASE_URL` to Staging service URL (e.g., `https://legend-shell-staging.onrender.com`)
- Ensure Auth0 Application has Staging callback URL added to Allowed Callback URLs
- Test login immediately after deployment to verify environment variables work

**Dependencies to Add:**

```json
{
  "dependencies": {
    "@auth0/nextjs-auth0": "^3.5.0",
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "typescript": "^5"
  }
}
```

**Potential Gotchas:**
- Auth0 callback fails if `AUTH0_BASE_URL` doesn't match configured callback URL exactly (including http vs https)
- `AUTH0_SECRET` must be at least 32 characters; use `openssl rand -hex 32` to generate
- Session cookies require HTTPS in production; use `sameSite: 'lax'` for cross-origin scenarios
- Auth0 Universal Login page styling can be customized in Auth0 dashboard (Universal Login → Login tab)
- Token refresh happens automatically; default session duration is 7 days (configurable in Auth0)

**Security Checklist:**
- ✅ Use Auth0 Universal Login (not embedded forms)
- ✅ Session cookies are httpOnly, secure (in production), sameSite
- ✅ PKCE flow enabled (default in Auth0 SDK)
- ✅ Client secret stored in environment variables only (never in code)
- ✅ Logout clears all session data
- ✅ Protected routes check authentication before rendering

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

_To be filled by Dev agent_

### Debug Log References

_To be filled by Dev agent during implementation_

### Completion Notes List

_To be filled by Dev agent:_
- [ ] Note Auth0 tenant URL and application IDs used
- [ ] Document any Auth0 configuration changes made
- [ ] List any deviations from standard Auth0 setup
- [ ] Note session duration and token settings
- [ ] Capture any Auth0-specific gotchas encountered
- [ ] Document testing results in Staging environment

### File List

_To be filled by Dev agent:_

**NEW:**
- (List all new files created)

**MODIFIED:**
- (List all files modified from Story 1.1)

**DELETED:**
- (List any files deleted)

---

## Change Log

| Date       | Author | Change Description                |
|:-----------|:-------|:----------------------------------|
| 2025-10-29 | Bob (SM) | Initial story draft created      |
