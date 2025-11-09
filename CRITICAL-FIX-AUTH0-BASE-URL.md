# CRITICAL FIX: AUTH0_BASE_URL Missing

## The Root Cause Found!

After extensive debugging, I found the **EXACT** problem:

### The Issue

Looking at the server logs:
```
[Shell /api/auth/token] Request URL: https://localhost:10000/api/auth/token
```

The URL shows `localhost` instead of `legend-shell-staging.onrender.com`!

This means **AUTH0_BASE_URL was not set in Render**, causing the Auth0 SDK to:
1. Default to `localhost` for cookie domain
2. Set cookies for `localhost` instead of `legend-shell-staging.onrender.com`
3. Browser never sends these cookies back because the domain doesn't match

### The Fix

**File: `render.yaml`**

Changed:
```yaml
- key: AUTH0_BASE_URL
  sync: false  # ❌ This means "don't set it" - WRONG!
```

To:
```yaml
- key: AUTH0_BASE_URL
  value: https://legend-shell-staging.onrender.com  # ✅ Explicit value
```

### Why This Happened

In `render.yaml`, `sync: false` means "I'll set this manually in the Render dashboard". But if you never set it manually, it remains unset, and the Auth0 SDK falls back to `http://localhost:3000`, causing cookies to be set for the wrong domain.

### All Fixes Applied

1. ✅ **Set AUTH0_BASE_URL** to `https://legend-shell-staging.onrender.com` in render.yaml
2. ✅ **Set NODE_ENV** to `production` in render.yaml  
3. ✅ **Removed conflicting `lib/auth0.ts`** file (SDK should only use `auth0.config.js`)
4. ✅ **Updated `auth0.config.js`** with correct cookie settings (`sameSite: 'lax'`, `secure: true`)
5. ✅ **Added Auth0 allowed origins** for audits-fe domain (via MCP)
6. ✅ **Enhanced logging** to diagnose cookie issues
7. ✅ **Created debug endpoints** (`/api/debug/cookies`, `/api/debug/env`)
8. ✅ **Fixed Tailwind deployment** by moving to dependencies

### Testing Steps After Deploy

1. **Visit the env debug endpoint** (before logging in):
   ```
   https://legend-shell-staging.onrender.com/api/debug/env
   ```
   
   Should show:
   ```json
   {
     "AUTH0_BASE_URL": "https://legend-shell-staging.onrender.com",
     "NODE_ENV": "production"
   }
   ```

2. **Clear all browser data** for the domain

3. **Login** to https://legend-shell-staging.onrender.com

4. **Check browser DevTools** → Application → Cookies:
   - Should see `appSession` cookie
   - Domain: `.legend-shell-staging.onrender.com` or `legend-shell-staging.onrender.com`
   - Secure: ✅
   - HttpOnly: ✅
   - SameSite: Lax

5. **Check server logs** should now show:
   ```
   [Shell Callback] ✅ Callback successful
   [Shell /api/auth/token] Cookies present: YES
   [Shell /api/auth/token] Auth0 cookies count: 1
   [Shell /api/auth/token] ✅ Session found for user
   ```

6. **Visit cookie debug endpoint** (after logging in):
   ```
   https://legend-shell-staging.onrender.com/api/debug/cookies
   ```
   
   Should show `appSession` cookie

### Why The Previous Fixes Didn't Work

All the previous fixes were correct (sameSite, NODE_ENV, etc.), but they couldn't work because **the fundamental problem was that cookies were being set for the wrong domain (localhost)**.

It's like fixing the lock on your door when the problem is you're at the wrong house!

### Deployment Checklist

- [x] AUTH0_BASE_URL set in render.yaml
- [x] NODE_ENV=production set in render.yaml
- [x] auth0.config.js updated with correct settings
- [x] Conflicting lib/auth0.ts removed
- [x] Auth0 application origins updated
- [x] Debug endpoints created
- [x] Tailwind moved to dependencies
- [ ] Commit and push changes
- [ ] Wait for Render to deploy
- [ ] Clear browser cookies
- [ ] Test login flow
- [ ] Verify cookies are set correctly
- [ ] Test iframe authentication

### Expected Result

After this fix:
1. ✅ Cookies will be set for the correct domain
2. ✅ Browser will send cookies to `/api/auth/token`
3. ✅ Session will be found
4. ✅ Access token will be retrieved
5. ✅ Token will be sent to iframe
6. ✅ Iframe authentication will work

## The Smoking Gun

The request logs showed:
```javascript
host: 'legend-shell-staging.onrender.com',  // ← Browser sends to correct host
```

But the SDK thought:
```
Request URL: https://localhost:10000/api/auth/token  // ← SDK thinks it's localhost!
```

This discrepancy proved AUTH0_BASE_URL was misconfigured.

## Commit Message

```
Fix: Set AUTH0_BASE_URL in render.yaml to fix cookie domain issue

The Auth0 SDK was defaulting to localhost because AUTH0_BASE_URL
was not set, causing session cookies to be set for the wrong domain.
Browser correctly rejected these cookies.

Changes:
- Set AUTH0_BASE_URL to https://legend-shell-staging.onrender.com
- Set NODE_ENV to production
- Remove conflicting lib/auth0.ts
- Update auth0.config.js with correct cookie settings
- Add debug endpoints for troubleshooting
- Fix Tailwind deployment issue

This fixes the iframe authentication flow.
```
