# Render Deployment Fix - Standalone Server Issue

## Problem

The deployment failed with:
```
Error: Cannot find module '/opt/render/project/src/apps/shell/.next/standalone/server.js'
```

## Root Cause

The `startCommand` was trying to run the Next.js standalone server directly:
```yaml
startCommand: node apps/shell/.next/standalone/server.js
```

But the standalone server file wasn't being generated or was in a different location.

## Solution

Changed to use the standard Next.js start command:

### Before (Broken):
```yaml
startCommand: node apps/shell/.next/standalone/server.js
```

### After (Fixed):
```yaml
startCommand: cd apps/shell && npm start
```

## Changes Made

### 1. render.yaml - Shell Service
```yaml
- type: web
  name: legend-shell-staging
  env: node
  buildCommand: npm install --include=dev && npm run build --workspace=apps/shell
  startCommand: cd apps/shell && npm start  # ✅ Changed
```

### 2. render.yaml - Audits-FE Service
```yaml
- type: web
  name: audits-fe
  env: node
  buildCommand: npm install --include=dev && npm run build --workspace=apps/audits-fe
  startCommand: cd apps/audits-fe && npm start  # ✅ Changed
```

### 3. apps/shell/next.config.js
Removed `output: 'standalone'` configuration:
```javascript
const nextConfig = {
  // output: 'standalone', // ❌ Removed
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
}
```

### 4. apps/audits-fe/next.config.mjs
Removed `output: 'standalone'` configuration:
```javascript
const nextConfig = {
  // output: 'standalone', // ❌ Removed
  experimental: {
    appDir: true,
  },
  async headers() {
    // ... headers config
  },
}
```

## Why This Works

1. **Standard Next.js Server**: `npm start` runs `next start`, which uses the built-in Next.js production server
2. **Simpler Path**: No need to navigate to `.next/standalone/server.js`
3. **Automatic Setup**: Next.js handles all the server setup automatically
4. **Better Compatibility**: Works with Render's monorepo structure

## Standalone vs Standard Server

### Standalone Mode (`output: 'standalone'`)
- ✅ Smaller deployment size
- ✅ Self-contained with dependencies
- ❌ Requires specific file structure
- ❌ More complex to configure with monorepos
- ❌ Needs manual server.js path

### Standard Mode (default)
- ✅ Simpler deployment
- ✅ Works with `npm start`
- ✅ Better monorepo support
- ✅ Automatic configuration
- ❌ Slightly larger size (includes all node_modules)

For Render with monorepos, **standard mode is the better choice**.

## Deployment Steps

### 1. Commit Changes
```bash
git add .
git commit -m "Fix: Use standard Next.js server instead of standalone

- Changed startCommand from 'node .next/standalone/server.js' to 'npm start'
- Removed 'output: standalone' from next.config files
- Fixes MODULE_NOT_FOUND error on Render deployment
- Simplifies deployment process for monorepo structure"
git push origin main
```

### 2. Verify Deployment

After pushing, Render will automatically redeploy. Check the logs for:

**Success:**
```
==> Running 'cd apps/shell && npm start'
> shell@1.0.0 start
> next start
▲ Next.js 14.2.x
- Local:        http://localhost:3000
- Network:      http://0.0.0.0:3000

✓ Ready in XXXms
```

**The service should now start successfully!**

### 3. Test Authentication

Once deployed:

1. Visit `https://legend-shell-staging.onrender.com/api/debug/env`
   - Verify AUTH0_BASE_URL shows the correct production URL
   
2. Clear browser cookies

3. Login and check logs:
   ```
   [Shell Callback] ✅ Callback successful
   [Shell /api/auth/token] Cookies present: YES
   [Shell /api/auth/token] ✅ Session found
   ```

## Expected Results

After these changes:

1. ✅ Shell service will start successfully
2. ✅ Audits-FE service will start successfully
3. ✅ Authentication will work (cookies will be sent)
4. ✅ Iframe authentication will function

## Troubleshooting

### If Deployment Still Fails

Check that:
- `package.json` in both apps has `"start": "next start"` script
- Build completed successfully before start command runs
- No typos in the startCommand path

### If Authentication Still Fails

After deployment succeeds, if auth still doesn't work:
1. Check `/api/debug/env` endpoint
2. Verify AUTH0_BASE_URL is NOT localhost
3. Clear browser cookies completely
4. Check browser DevTools → Application → Cookies

## Files Modified

- ✅ `render.yaml` - Fixed startCommand for shell and audits-fe
- ✅ `apps/shell/next.config.js` - Removed standalone output
- ✅ `apps/audits-fe/next.config.mjs` - Removed standalone output

All changes maintain existing functionality while fixing the deployment issue.
