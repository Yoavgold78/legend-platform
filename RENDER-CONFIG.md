# Render Deployment Configuration

## Manual Steps Required

The following Render services need to be created manually in the Render dashboard:

### 1. legend-shell-staging (Web Service)
- **Name:** legend-shell-staging
- **Environment:** Node
- **Build Command:** `npm install && npm run build --workspace=apps/shell`
- **Start Command:** `npm start --workspace=apps/shell`
- **Root Directory:** `apps/shell`
- **Environment Variables:** (To be configured in Story 1.2 - Auth0 integration)

### 2. legend-gateway-staging (Web Service)
- **Name:** legend-gateway-staging
- **Environment:** Node
- **Build Command:** `npm install && npm run build --workspace=apps/api-gateway`
- **Start Command:** `npm start --workspace=apps/api-gateway`
- **Root Directory:** `apps/api-gateway`
- **Environment Variables:** (To be configured in future stories)

## Notes
- These services are currently placeholder scaffolding
- Actual implementation will be added in subsequent stories
- Services should deploy successfully but will show empty/default pages until populated

## Render Project
Create a new project named "legend-platform" in Render dashboard first, then add these services to it.
