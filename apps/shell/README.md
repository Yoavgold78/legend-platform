# Legenda Shell Application

Next.js-based shell application with Auth0 authentication.

## Auth0 Setup Instructions

### 1. Create Auth0 Application

1. Go to [Auth0 Dashboard](https://manage.auth0.com/)
2. Navigate to **Applications** → **Applications**
3. Click **Create Application**
4. Name: "Legenda Shell"
5. Application Type: **Regular Web Application**
6. Click **Create**

### 2. Configure Application Settings

In your Auth0 Application settings, configure:

**Allowed Callback URLs:**
```
http://localhost:3000/api/auth/callback
https://legend-shell-staging.onrender.com/api/auth/callback
```

**Allowed Logout URLs:**
```
http://localhost:3000
https://legend-shell-staging.onrender.com
```

**Allowed Web Origins:**
```
http://localhost:3000
https://legend-shell-staging.onrender.com
```

### 3. Create .env.local File

Copy `.env.local.template` to `.env.local`:

```bash
cp .env.local.template .env.local
```

Then update with your Auth0 credentials:

```bash
# Generate secret with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
AUTH0_SECRET='your-generated-32-char-secret'

AUTH0_BASE_URL='http://localhost:3000'
AUTH0_ISSUER_BASE_URL='https://your-tenant.auth0.com'
AUTH0_CLIENT_ID='your-client-id-from-auth0-dashboard'
AUTH0_CLIENT_SECRET='your-client-secret-from-auth0-dashboard'
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Features

- ✅ Auth0 Universal Login
- ✅ Protected routes with middleware
- ✅ User profile display
- ✅ Secure logout
- ✅ Mobile-First responsive design
- ✅ TypeScript strict mode
- ✅ Tailwind CSS + MUI ready

## Routes

- `/` - Landing page with login button
- `/dashboard` - Protected dashboard (requires authentication)
- `/api/auth/login` - Redirects to Auth0 Universal Login
- `/api/auth/logout` - Clears session and redirects to home
- `/api/auth/callback` - Auth0 callback handler
- `/api/auth/me` - Returns current user profile

## Security

- PKCE flow enabled by default
- Secure session cookies (httpOnly, sameSite, secure in production)
- Environment variables for sensitive data
- Route protection via middleware

## Deployment (Render)

1. Push code to GitHub
2. Create Web Service in Render
3. Add environment variables (all AUTH0_* vars)
4. Update `AUTH0_BASE_URL` to your Render service URL
5. Add Render URL to Auth0 Allowed Callback/Logout URLs
6. Deploy

## Next Stories

- Story 1.3: API Gateway & Central Token Validation
- Story 1.4: AuditsApp Integration
- Story 1.6: ScheduleApp Integration
