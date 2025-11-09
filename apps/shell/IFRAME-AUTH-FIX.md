# Iframe Authentication Fix Documentation

## Problem Summary

The shell app authenticates successfully, but the iframe (audits-fe) cannot receive auth tokens because:

1. **Session Cookie Issue**: The `/api/auth/token` endpoint returns 401 because `getSession()` can't read Auth0 session cookies
2. **SameSite Cookie Policy**: Default `sameSite: 'lax'` prevents cookies from being sent in cross-origin iframe contexts
3. **CORS on Logout**: Client-side logout calls to Auth0 were blocked by CORS

## Root Cause

When the audits-fe app is embedded in an iframe and tries to fetch tokens from the shell's `/api/auth/token` endpoint, the browser blocks the session cookies due to the `sameSite: 'lax'` policy. This policy prevents cookies from being sent in cross-site requests, which includes iframes loading content from different origins.

## Solution Implemented

### 1. Cookie SameSite Policy (CRITICAL FIX)

**Updated Files:**
- `apps/shell/auth0.config.js`
- `apps/shell/lib/auth0.ts`

**Changes:**
```javascript
// Production (HTTPS): Use 'none' for cross-origin iframe support
// Development (HTTP): Use 'lax' for localhost (sameSite='none' requires HTTPS)
const isProduction = process.env.NODE_ENV === 'production';

cookie: {
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'lax',
}
```

**Why this works:**
- `sameSite: 'none'` allows cookies to be sent in cross-origin requests (required for iframes)
- `sameSite: 'none'` REQUIRES `secure: true` (HTTPS only)
- In local development (HTTP), we use `sameSite: 'lax'` as a fallback

### 2. Enhanced Token Route Logging

**Updated File:** `apps/shell/app/api/auth/token/route.ts`

**Changes:**
- Added detailed cookie logging to diagnose session issues
- Added runtime directive to ensure Node.js runtime
- Better error messages explaining the issue

### 3. Logout CORS Fix

**Updated File:** `apps/shell/app/api/auth/[auth0]/route.ts`

**Changes:**
- Added `export const POST = GET;` to support POST requests for logout
- This prevents CORS issues with client-side logout redirects

## Required Configuration in Render

### For Shell App (legend-shell-staging)

Ensure these environment variables are set:

```bash
NODE_ENV=production
AUTH0_BASE_URL=https://legend-shell-staging.onrender.com
AUTH0_ISSUER_BASE_URL=https://dev-u8dwhtl4xtkltzd8.eu.auth0.com
AUTH0_CLIENT_ID=5jkruJ9iKustOVSQOUAupN6qEQXM37oW
AUTH0_CLIENT_SECRET=[your-secret]
AUTH0_SECRET=[your-32-char-secret]
AUTH0_AUDIENCE=https://api.legend-platform.com
NEXT_PUBLIC_AUDITS_FE_URL=https://audits-fe.onrender.com
```

### For Audits-FE App

Ensure these environment variables are set:

```bash
NODE_ENV=production
NEXT_PUBLIC_AUTH_MODE=iframe
NEXT_PUBLIC_PARENT_ORIGIN=https://legend-shell-staging.onrender.com
```

## Auth0 Configuration Required

### 1. Application Settings (Shell App)

In your Auth0 Dashboard → Applications → [Your Shell App]:

**Allowed Callback URLs:**
```
https://legend-shell-staging.onrender.com/api/auth/callback,
http://localhost:3000/api/auth/callback
```

**Allowed Logout URLs:**
```
https://legend-shell-staging.onrender.com,
http://localhost:3000
```

**Allowed Web Origins (CRITICAL for iframe):**
```
https://legend-shell-staging.onrender.com,
https://audits-fe.onrender.com
```

**Allowed Origins (CORS):**
```
https://legend-shell-staging.onrender.com,
https://audits-fe.onrender.com
```

### 2. Advanced Settings

**Grant Types:** Ensure these are enabled:
- ✅ Authorization Code
- ✅ Refresh Token
- ✅ Implicit (for iframe if needed)

**Refresh Token Behavior:**
- Rotation: Enabled
- Reuse Interval: 0 (most secure)

## Testing the Fix

### 1. Clear Browser Data
Before testing, clear:
- Cookies for both domains
- Local storage
- Session storage

### 2. Test Flow

1. Navigate to `https://legend-shell-staging.onrender.com`
2. Log in via Auth0
3. After redirect, check browser console for:
   ```
   [Shell Callback] ✅ Callback successful
   [Shell Callback] Session created: true
   ```
4. Navigate to the Audits page
5. Check console for:
   ```
   [Shell] Fetching access token for iframe...
   [Shell /api/auth/token] Cookies present: YES
   [Shell /api/auth/token] Auth0 cookies count: 1
   [Shell /api/auth/token] ✅ Session found for user: [email]
   [Shell] Sending access token to iframe
   ```
6. In the iframe (audits-fe), check for:
   ```
   📌 Running in iframe mode, listening for auth messages
   📤 Requesting initial token from parent
   ✅ Received token from parent
   ```

### 3. What to Check if It Still Doesn't Work

**In Shell Console:**
```
[Shell /api/auth/token] Cookies present: NO
```
→ Session cookies are not being sent. Check:
- `NODE_ENV=production` is set in Render
- Auth0 callback completed successfully
- Browser is not blocking third-party cookies

**In Audits-FE Console:**
```
No Auth0 session and no Authorization header
```
→ The iframe didn't receive the token. Check:
- `NEXT_PUBLIC_PARENT_ORIGIN` matches shell URL exactly
- Message listener is set up correctly
- CORS is configured in Auth0

## Browser Compatibility Notes

### Third-Party Cookie Restrictions

Some browsers (Safari, Firefox with Enhanced Tracking Protection) block third-party cookies by default. This affects iframes:

**Workaround Options:**

1. **Storage Access API** (Recommended for production):
   - Use `document.requestStorageAccess()` in the iframe
   - Requires user interaction (button click)

2. **Same-Domain Deployment** (Alternative):
   - Deploy shell at `app.yourdomain.com`
   - Deploy audits-fe at `audits.yourdomain.com`
   - Use `sameSite: 'lax'` with shared parent domain

3. **Partitioned Cookies** (Future-proof):
   - Add `Partitioned` attribute to cookies
   - Requires Auth0 SDK update

## Troubleshooting Commands

### Check if cookies are being set:

In browser DevTools → Application → Cookies, look for:
- Name: `appSession` (or `appSession.0`, `appSession.1`, etc.)
- Domain: `legend-shell-staging.onrender.com`
- Secure: ✅ (in production)
- SameSite: `None` (in production)

### Test token endpoint directly:

```bash
# This should return 401 (not logged in)
curl https://legend-shell-staging.onrender.com/api/auth/token

# After logging in via browser, copy cookies and test:
curl -H "Cookie: appSession=..." https://legend-shell-staging.onrender.com/api/auth/token
```

## Additional Resources

- [Auth0 Next.js SDK Documentation](https://auth0.github.io/nextjs-auth0/)
- [MDN: SameSite Cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite)
- [Chrome SameSite Updates](https://www.chromium.org/updates/same-site)
- [Storage Access API](https://developer.mozilla.org/en-US/docs/Web/API/Storage_Access_API)

## Deployment Checklist

Before deploying to production:

- [ ] `NODE_ENV=production` set in Render environment variables
- [ ] All Auth0 URLs configured correctly (callback, logout, origins)
- [ ] `AUTH0_SECRET` is a secure 32+ character string
- [ ] `NEXT_PUBLIC_AUDITS_FE_URL` points to production audits-fe URL
- [ ] SSL/HTTPS enabled on both shell and audits-fe
- [ ] Test login flow end-to-end
- [ ] Test iframe token passing
- [ ] Test logout flow
- [ ] Check browser console for errors
- [ ] Verify cookies are set with correct attributes
