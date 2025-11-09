# Final Deployment Checklist

## Current Status

The code has been fixed, but **changes have not been deployed to Render yet**.

## What's Been Fixed

1. ✅ `render.yaml` - AUTH0_BASE_URL now explicitly set to production URL
2. ✅ `render.yaml` - NODE_ENV set to production
3. ✅ `auth0.config.js` - Correct cookie settings (sameSite: 'lax', secure: true)
4. ✅ Removed conflicting `lib/auth0.ts` file
5. ✅ Auth0 application - Added audits-fe to allowed origins (via MCP)
6. ✅ Added debug endpoints for troubleshooting
7. ✅ Fixed Tailwind deployment issue

## Why It's Still Not Working

**The changes haven't been deployed yet!** You need to:

1. Commit the changes
2. Push to GitHub
3. Wait for Render to automatically redeploy

## Deployment Steps

### 1. Check Git Status

```bash
cd c:\Users\user\legend-platform
git status
```

Should show modified files:
- `render.yaml`
- `apps/shell/auth0.config.js`
- `apps/shell/app/api/auth/[auth0]/route.ts`
- `apps/shell/app/api/auth/token/route.ts`
- `apps/shell/app/(main)/audits/page.tsx`
- `apps/shell/package.json`
- `apps/audits-fe/package.json`
- Various new debug endpoints and documentation files

### 2. Commit Changes

```bash
git add .
git commit -m "Fix: Set AUTH0_BASE_URL and cookie configuration for production

- Set AUTH0_BASE_URL to https://legend-shell-staging.onrender.com in render.yaml
- Set NODE_ENV to production in render.yaml
- Updated auth0.config.js with correct cookie settings (sameSite: lax, secure: true)
- Removed conflicting lib/auth0.ts file  
- Added debug endpoints (/api/debug/cookies, /api/debug/env, /api/debug/test-cookie)
- Enhanced logging in callback and token routes
- Fixed Tailwind deployment by moving to dependencies
- Updated Auth0 app to include audits-fe in allowed origins

This fixes the cookie domain issue where cookies were being set for localhost
instead of the production domain, causing the browser to reject them."
```

### 3. Push to GitHub

```bash
git push origin main
```

### 4. Monitor Render Deployment

1. Go to Render dashboard
2. Watch the `shell` service deployment
3. Wait for "Your service is live 🎉"
4. Check the logs for successful deployment

### 5. Verify Environment Variables

After deployment, visit:
```
https://legend-shell-staging.onrender.com/api/debug/env
```

**Must show:**
```json
{
  "NODE_ENV": "production",
  "AUTH0_BASE_URL": "https://legend-shell-staging.onrender.com",
  "AUTH0_ISSUER_BASE_URL": "https://dev-u8dwhtl4xtkltzd8.eu.auth0.com",
  "AUTH0_CLIENT_ID": "5jkruJ9i...",
  "AUTH0_AUDIENCE": "https://api.legend-platform.com",
  "hasAUTH0_SECRET": true,
  "hasAUTH0_CLIENT_SECRET": true
}
```

**If AUTH0_BASE_URL still shows null or localhost:**
- Go to Render dashboard → shell service → Environment
- Manually check that AUTH0_BASE_URL is set to `https://legend-shell-staging.onrender.com`
- If not, add it manually and redeploy

### 6. Clear Browser Data

**IMPORTANT:** Before testing, clear ALL browser data for the domain:
1. Open browser DevTools (F12)
2. Go to Application tab
3. Click "Clear storage" in the left sidebar
4. Check ALL boxes
5. Click "Clear site data"

OR use Chrome's clear browsing data:
1. Press Ctrl+Shift+Delete
2. Select "All time"
3. Check "Cookies and other site data"
4. Click "Clear data"

### 7. Test Authentication Flow

1. Visit `https://legend-shell-staging.onrender.com`
2. Click login
3. Complete Auth0 authentication
4. After redirect, **immediately check browser DevTools** → Application → Cookies

**Expected:**
- Cookie name: `appSession` (or `appSession.0`)
- Domain: `.legend-shell-staging.onrender.com` or `legend-shell-staging.onrender.com`
- Path: `/`
- Secure: ✅ (checked)
- HttpOnly: ✅ (checked)
- SameSite: `Lax`
- Expires: (should be a future date)

### 8. Check Server Logs

In Render dashboard → shell service → Logs, should show:

**Good logs:**
```
[Shell Callback] ✅ Callback successful
[Shell Callback] Request URL: https://legend-shell-staging.onrender.com/api/auth/callback...
[Shell /api/auth/token] Cookies present: YES
[Shell /api/auth/token] Auth0 cookies count: 1
[Shell /api/auth/token] ✅ Session found for user: test@test.com
[Shell] Sending access token to iframe
```

**Bad logs (if still broken):**
```
[Shell Callback] Request URL: https://localhost:10000/...  ← Still shows localhost!
[Shell /api/auth/token] Cookies present: NO
```

### 9. Test Cookie Endpoint

Visit (after logging in):
```
https://legend-shell-staging.onrender.com/api/debug/cookies
```

**Expected response:**
```json
{
  "totalCookies": 1,
  "cookies": [{
    "name": "appSession",
    "hasValue": true,
    "valueLength": 500+
  }],
  "auth0Cookies": [{
    "name": "appSession",
    "hasValue": true,
    "valueLength": 500+
  }]
}
```

### 10. Test Iframe Authentication

1. Navigate to `/audits` page
2. Check browser console for:
   ```
   [Shell] Sending access token to iframe
   📌 Running in iframe mode
   ✅ Received token from parent
   ```
3. Iframe should load the audits dashboard

## If Still Not Working After Deployment

### Issue: AUTH0_BASE_URL still shows localhost in logs

**Solution:**
1. Go to Render dashboard
2. shell service → Environment tab
3. Find AUTH0_BASE_URL variable
4. If it doesn't exist or has wrong value:
   - Delete it if exists
   - Click "Add Environment Variable"
   - Key: `AUTH0_BASE_URL`
   - Value: `https://legend-shell-staging.onrender.com`
   - Click "Save Changes"
5. Click "Manual Deploy" → "Clear build cache & deploy"

### Issue: Cookies still not being sent

Check in browser DevTools → Application → Cookies:
- If NO cookies appear after login → Server isn't setting them
- If cookies appear but with wrong domain → AUTH0_BASE_URL issue
- If cookies appear but aren't sent to API routes → Browser blocking them

### Issue: "getSession() failed: secret is required" (audits-fe)

This is expected for audits-fe running in iframe mode. The iframe should receive tokens from the parent via postMessage, not from its own Auth0 session.

## Success Criteria

✅ `/api/debug/env` shows correct AUTH0_BASE_URL
✅ Login succeeds and redirects back
✅ Browser DevTools shows `appSession` cookie
✅ Cookie has correct domain (not localhost)
✅ Server logs show "Cookies present: YES"
✅ Server logs show "Session found for user"
✅ Token is sent to iframe
✅ Audits page loads in iframe

## Commands Summary

```bash
# In project root
cd c:\Users\user\legend-platform

# Check what's changed
git status

# Add all changes
git add .

# Commit
git commit -m "Fix: Set AUTH0_BASE_URL and cookie configuration for production"

# Push
git push origin main

# Monitor deployment (in browser)
# Go to: https://dashboard.render.com
```

## Timeline

1. **Now**: Commit and push (1 minute)
2. **5-10 minutes**: Wait for Render to deploy
3. **30 seconds**: Clear browser data
4. **1 minute**: Test login flow
5. **Done**: Should be working!

## Notes

- The `.env.local` file is for local development only and is NOT deployed
- Render reads environment variables from render.yaml or the dashboard
- Changes to environment variables require a redeploy
- Cookies are domain-specific - localhost cookies won't work in production
