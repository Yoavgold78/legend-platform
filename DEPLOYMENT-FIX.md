# Render Deployment Fix - Tailwind CSS Missing Module

## Problem

The deployment was failing with this error:
```
Error: Cannot find module 'tailwindcss'
```

This occurred during the Next.js build process when it tried to process CSS files using PostCSS and Tailwind.

## Root Cause

The issue had two contributing factors:

1. **devDependencies not installed**: The original build command didn't explicitly install devDependencies with `--include=dev`
2. **Build tools in devDependencies**: `tailwindcss`, `postcss`, and `autoprefixer` were in `devDependencies`, but these are needed during the production build process

## Solution Applied

### 1. Moved Build Tools to Dependencies

**Files Updated:**
- `apps/shell/package.json`
- `apps/audits-fe/package.json`

**Changes:**
Moved these packages from `devDependencies` to `dependencies`:
- `tailwindcss`
- `postcss`
- `autoprefixer`

**Why this works:**
- These tools are needed at build time in production environments
- Some hosting platforms optimize by skipping devDependencies in production mode
- In a monorepo with npm workspaces, this ensures proper hoisting and availability

### 2. Updated Render Build Commands

**File Updated:** `render.yaml`

**Shell Service:**
```yaml
buildCommand: npm install --include=dev && npm run build --workspace=apps/shell
```

**Audits-FE Service:**
```yaml
buildCommand: npm install --include=dev && npm run build --workspace=apps/audits-fe
```

**Why this works:**
- `--include=dev` explicitly installs devDependencies (for TypeScript and other dev tools still needed)
- `--workspace=apps/[name]` ensures the correct workspace is built
- Runs from the monorepo root, allowing proper workspace resolution

## Files Modified

1. ✅ `apps/shell/package.json` - Moved Tailwind stack to dependencies
2. ✅ `apps/audits-fe/package.json` - Moved Tailwind stack to dependencies
3. ✅ `render.yaml` - Updated build commands for both shell and audits-fe

## Verification Steps

After committing and pushing these changes:

1. **Trigger a new deployment** on Render
2. **Check build logs** for:
   ```
   ✓ Compiled successfully
   ```
3. **Verify the build command** shows:
   ```
   npm install --include=dev && npm run build --workspace=apps/shell
   ```
4. **Check that no module errors** appear during CSS processing

## Related Notes

### Why Not Use rootDir in render.yaml?

We could use `rootDir: apps/shell` in the Render service config, but that would:
- Break monorepo workspace resolution
- Require installing dependencies in each app separately
- Lose the benefits of npm workspaces (shared dependencies, hoisting)

### Alternative Solutions (Not Used)

1. **Install in each workspace separately**: `cd apps/shell && npm install`
   - ❌ Doesn't leverage workspaces
   - ❌ Duplicates dependencies

2. **Keep in devDependencies and use NODE_ENV=development for build**:
   - ❌ Not a best practice
   - ❌ Could introduce dev-only bugs in production

3. **Use environment variable to force devDeps**: `npm install --production=false`
   - ❌ More complex
   - ❌ Less explicit

## Best Practice

For Next.js applications using Tailwind CSS in production:
- ✅ Put `tailwindcss`, `postcss`, and `autoprefixer` in `dependencies`
- ✅ Keep type definitions and linters in `devDependencies`
- ✅ Use explicit build commands with `--include=dev` for complete control

## Testing Locally

To test that the build works with the new configuration:

```bash
# From project root
npm install --include=dev
npm run build --workspace=apps/shell

# Should complete without "Cannot find module" errors
```

## Deployment Checklist

Before deploying:
- [x] Tailwind CSS moved to dependencies
- [x] PostCSS moved to dependencies
- [x] Autoprefixer moved to dependencies
- [x] render.yaml build commands updated
- [x] Committed and pushed changes
- [ ] Triggered new deployment on Render
- [ ] Verified build succeeds
- [ ] Tested app loads correctly
