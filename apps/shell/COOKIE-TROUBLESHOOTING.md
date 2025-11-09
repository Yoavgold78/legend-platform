# Cookie Authentication Troubleshooting Guide

## Current Issue

The shell app successfully authenticates with Auth0, but the `/api/auth/token` endpoint reports "Cookies present: NO", meaning session cookies are not being sent from the browser to the API endpoint.

## Diagnostic Steps

### 1. Check if Cookies Are Being Set

After logging in, open Browser DevTools:

**Chrome/Edge:**
1. Press F12
2. Go to "Application" tab
3. Expand "Cookies" in the left sidebar
4. Click on `https://legend-shell-staging.onrender.com`
5. Look for cookies named `appSession`, `appSession.0`, or similar

**Check these cookie attributes:**
- ✅ **Name**: Should start with `appSession`
- ✅ **Domain**: Should be `.legend-shell-staging.onrender.com` or `legend-shell-staging.onrender.com`
- ✅ **Path**: Should be `/`
- ✅ **Secure**: Should be ✅ (checked) in production
- ✅ **HttpOnly**: Should be ✅ (checked)
- ✅ **SameSite**: Should be `None` (for cross-origin iframe support) or `Lax`

### 2. Test Cookie Endpoint

Visit this URL after logging in:
```
https://legend-shell-staging.onrender.com/api/debug/cookies
```

This will show you what cookies the server can read. You should see:
```json
{
  "totalCookies": 1+,
  "auth0Cookies": [
    {
      "name": "appSession",
      "hasValue": true
    }
  ]
}
```

### 3. Check Environment Variables in Render

Go to your Render dashboard → shell service → Environment and verify:

**Critical Variables:**
```
NODE_ENV=production
AUTH0_SECRET=[32+ character secret]
AUTH0_BASE_URL=https://legend-shell-staging.onrender.com
AUTH0_ISSUER_BASE_URL=https://dev-u8dwhtl4xtkltzd8.eu.auth0.com
AUTH0_CLIENT_ID=5jkruJ9iKustOVSQOUAupN6qEQXM37oW
AUTH0_CLIENT_SECRET=[from Auth0 dashboard]
AUTH0_AUDIENCE=https://api.legend-platform.com
```

**Most Critical:**
- `AUTH0_SECRET`: Must be at least 32 characters. If this changes between deployments, existing sessions become invalid.
- `NODE_ENV`: Must be `production` for `sameSite: 'none'` to work

### 4. Common Issues and Solutions

#### Issue: "Cookies present: NO"

**Cause 1: AUTH0_SECRET mismatch**
- The secret used to encrypt cookies changed
- **Solution**: Use Render's "generateValue: true" for AUTH0_SECRET (already configured)

**Cause 2: Wrong cookie sameSite setting**
- Browser blocks cookies with wrong sameSite policy
- **Solution**: Already fixed in `auth0.config.js` (sameSite: 'none' in production)

**Cause 3: Missing NODE_ENV=production**
- Without this, sameSite stays as 'lax', which doesn't work cross-origin
- **Solution**: Added to render.yaml

**Cause 4: Browser blocking third-party cookies**
- Safari, Firefox with Enhanced Tracking Protection block third-party cookies by default
- **Solution**: Test in Chrome first, or use Storage Access API

#### Issue: Cookies are set but not sent to API routes

**Cause: Fetch not including credentials**
- **Solution**: Already fixed - added `credentials: 'include'` to fetch calls

#### Issue: Session found but no access token

**Cause: Missing audience in authorizationParams**
- **Solution**: Already configured in token route

### 5. Testing Procedure

After deploying the fixes:

1. **Clear all browser data** for the domain:
   - Cookies
   - Local storage
   - Session storage
   - Cache

2. **Login fresh**:
   - Go to https://legend-shell-staging.onrender.com
   - Click login
   - Complete Auth0 authentication

3. **Check browser DevTools Console** for:
   ```
   [Shell Callback] ✅ Callback successful
   [Shell Callback] Session created: true
   ```

4. **Check cookies in DevTools**:
   - Application → Cookies → Your domain
   - Should see `appSession` cookie with Secure=✅, SameSite=None

5. **Navigate to Audits page**

6. **Check console for token fetch**:
   ```
   [Shell] Fetching access token for iframe...
   [Shell /api/auth/token] Cookies present: YES
   [Shell /api/auth/token] Auth0 cookies count: 1
   [Shell /api/auth/token] ✅ Session found for user: [email]
   ```

7. **Check iframe receives token**:
   ```
   📌 Running in iframe mode
   📤 Requesting initial token from parent
   ✅ Received token from parent
   ```

### 6. If Still Not Working

#### Test 1: Check if cookies are visible to server

Visit (while logged in):
```
https://legend-shell-staging.onrender.com/api/debug/cookies
```

Expected: Shows `appSession` cookie
If not showing: Cookies are not being set or are being cleared

#### Test 2: Check browser console for cookie warnings

Look for:
```
Cookie "appSession" has been rejected because it is in a cross-site context and its "SameSite" is "Lax" or "Strict"
```

#### Test 3: Test in different browsers

- ✅ Chrome (most lenient with cookies)
- ⚠️ Firefox (Enhanced Tracking Protection may block)
- ⚠️ Safari (Intelligent Tracking Prevention may block)
- ✅ Edge (similar to Chrome)

### 7. Auth0 Configuration Checklist

In Auth0 Dashboard → Applications → Legend Platform - Production:

**Settings:**
- Application Type: Regular Web Application ✅
- Token Endpoint Authentication Method: Post
- OIDC Conformant: YES ✅

**Application URIs:**
- Allowed Callback URLs: `https://legend-shell-staging.onrender.com/api/auth/callback`
- Allowed Logout URLs: `https://legend-shell-staging.onrender.com`
- Allowed Web Origins: 
  - `https://legend-shell-staging.onrender.com`
  - `https://audits-fe.onrender.com`
- Allowed Origins (CORS):
  - `https://legend-shell-staging.onrender.com`
  - `https://audits-fe.onrender.com`

**Grant Types** (Advanced Settings):
- Authorization Code ✅
- Refresh Token ✅
- Implicit (optional for iframe)

### 8. Nuclear Option: Recreate AUTH0_SECRET

If nothing works, regenerate the AUTH0_SECRET in Render:

1. Go to Render dashboard → shell service → Environment
2. Delete the current AUTH0_SECRET variable
3. Add it back with "Generate Value" option
4. Redeploy the service
5. **ALL USERS MUST RE-LOGIN** (old sessions become invalid)

### 9. Check Render Logs

Look for specific error patterns:

**Good:**
```
[Shell Callback] ✅ Callback successful
[Shell /api/auth/token] Cookies present: YES
[Shell /api/auth/token] ✅ Session found for user
```

**Bad:**
```
[Shell /api/auth/token] Cookies present: NO
ERR_MISSING_SESSION
```

### 10. Verify File Changes Were Deployed

Check that these files have the latest changes:

1. `apps/shell/auth0.config.js` - should have `sameSite: isProduction ? 'none' : 'lax'`
2. `apps/shell/lib/auth0.ts` - should have matching sameSite configuration
3. `apps/shell/package.json` - should have tailwindcss in dependencies (not devDependencies)
4. `render.yaml` - should have `NODE_ENV=production` for shell service

## Summary of Applied Fixes

1. ✅ Added `NODE_ENV=production` to render.yaml
2. ✅ Added `AUTH0_AUDIENCE` to render.yaml
3. ✅ Updated Auth0 application to include audits-fe in allowed origins
4. ✅ Added `credentials: 'include'` to token fetch
5. ✅ Enhanced logging in token route
6. ✅ Created debug cookie endpoint
7. ✅ Moved tailwindcss to dependencies for deployment fix

## Next Steps

1. Commit and push all changes
2. Wait for Render to redeploy
3. Clear browser cookies completely
4. Test login flow
5. Check console logs for detailed diagnostics
6. Visit `/api/debug/cookies` to verify cookies are set
7. Report back with specific error messages if still failing
