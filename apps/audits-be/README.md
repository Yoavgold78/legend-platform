# AuditsApp Backend Service

Backend service for the AuditsApp (Audits & Checklists management), integrated into the legend-platform monorepo.

## Overview

This service handles all business logic for:
- Audits and inspection management
- Store management
- Checklist templates and instances
- Task assignment and tracking
- Template management
- File uploads (via Cloudinary)
- Push notifications

## Architecture

**Deployment:** Render Private Service (not publicly accessible)
**Database:** MongoDB (MongoDB Atlas)
**File Storage:** Cloudinary
**Authentication:** Trusts API Gateway's `x-user-id` header (does NOT validate Auth0 tokens directly)

### Gateway Trust Pattern

This backend **does NOT** validate Auth0 JWT tokens. Instead, it trusts the API Gateway:

1. User makes request to Gateway with `Authorization: Bearer <token>`
2. Gateway validates Auth0 token centrally
3. Gateway extracts `auth0_sub` from token and adds `x-user-id` header
4. Gateway proxies request to this backend (Private Service)
5. This backend uses `trustGateway` middleware to extract `x-user-id` header
6. Backend looks up user in MongoDB by `auth0Id` field

**Security:** Only the API Gateway can reach this service (Render Private Service network isolation).

## Tech Stack

- **Runtime:** Node.js (ES Modules)
- **Framework:** Express 4.19.2
- **Database:** MongoDB + Mongoose 8.16.1
- **File Upload:** Cloudinary 2.2.0
- **Authentication:** Gateway trust pattern (no Auth0 SDK)

## Directory Structure

```
apps/audits-be/
├── controllers/       # Business logic handlers
│   ├── auth.js        # User management, migration
│   ├── stores.js      # Store CRUD
│   ├── inspections.js # Inspection CRUD, PDF generation
│   ├── checklists.js  # Checklist templates/instances
│   ├── tasks.js       # Task management
│   ├── templates.js   # Template CRUD
│   ├── upload.js      # Cloudinary image upload
│   └── notifications.js # Push notifications
├── models/            # Mongoose schemas
│   ├── User.js        # User schema with auth0Id field
│   ├── Store.js
│   ├── Inspection.js
│   ├── ChecklistTemplate.js
│   ├── ChecklistInstance.js
│   ├── Task.js
│   ├── Template.js
│   ├── Notification.js
│   └── PushSubscription.js
├── routes/            # Express route definitions
│   ├── audits.js      # Base audit routes
│   ├── auth.js        # User management routes
│   ├── stores.js
│   ├── inspections.js
│   ├── checklists.js
│   ├── checklistInstances.js
│   ├── tasks.js
│   ├── templates.js
│   ├── upload.js
│   └── notifications.js
├── middleware/
│   ├── trustGateway.js # NEW: Trusts Gateway's x-user-id header
│   ├── auth.js         # DEPRECATED: Old Auth0 validation
│   └── authSimple.js   # DEPRECATED
├── index.js           # Server entry point
├── package.json
└── README.md          # This file
```

## Environment Variables

Configure in Render dashboard:

| Variable | Description | Required |
|----------|-------------|----------|
| `MONGO_URI` | MongoDB Atlas connection string | Yes |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary account name | Yes |
| `CLOUDINARY_API_KEY` | Cloudinary API key | Yes |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | Yes |
| `NODE_ENV` | Environment (`production`, `development`) | Yes |
| `HOST` | Server host (default: `0.0.0.0`) | No |
| `PORT` | Server port (default: `5000`) | No |

**Note:** No Auth0 environment variables needed (Gateway handles authentication).

## Setup

### Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Create `.env` file:**
   ```env
   MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/auditsapp?retryWrites=true&w=majority
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret
   NODE_ENV=development
   PORT=5000
   ```

3. **Run server:**
   ```bash
   npm start
   ```

4. **Test with Gateway header:**
   Since this backend trusts `x-user-id` header, you need to send it in requests:
   ```bash
   curl -H "x-user-id: auth0|abc123" http://localhost:5000/api/stores
   ```

### Render Deployment

1. **Create Private Service:**
   - Service type: `pserv` (Private Service)
   - Build command: `npm install && npm install --arch=x64 --platform=linux sharp`
   - Start command: `node apps/audits-be/index.js`

2. **Configure Environment Variables:** (See table above)

3. **Get Private Service URL:**
   - Format: `https://audits-be-xyz.onrender.com`
   - Copy this URL and set as `AUDITS_BE_URL` in API Gateway service

4. **Restart Gateway:** To pick up new `AUDITS_BE_URL` environment variable

## API Routes

All routes require `x-user-id` header from Gateway (via `trustGateway` middleware).

### Base Routes
- `GET /api/audits` - Welcome message
- `GET /api/audits/admin` - Admin-only route

### Authentication & Users
- `GET /api/auth/me` - Get current user
- `GET /api/auth/users` - List all users (admin)
- `POST /api/auth/users` - Create user (admin)
- `PUT /api/auth/users/:id` - Update user (admin)
- `DELETE /api/auth/users/:id` - Delete user (admin)
- `POST /api/auth/migrate` - Public route for Auth0 migration

### Stores
- `GET /api/stores` - List stores
- `POST /api/stores` - Create store (admin)
- `GET /api/stores/:id` - Get store
- `PUT /api/stores/:id` - Update store (admin)
- `DELETE /api/stores/:id` - Delete store (admin)

### Inspections
- `GET /api/inspections` - List inspections
- `POST /api/inspections` - Create inspection
- `GET /api/inspections/:id` - Get inspection
- `GET /api/inspections/:id/pdf` - Generate PDF
- `POST /api/inspections/preview` - Preview inspection
- `POST /api/inspections/:id/share` - Generate shareable link
- `GET /api/inspections/share/:token` - Public shared inspection
- `GET /api/inspections/previous-answers` - Get previous answers

### Checklists
- `GET /api/checklists/templates` - List templates
- `POST /api/checklists` - Create template
- `GET /api/checklists/universal` - Universal tasks (admin)
- `GET /api/checklists/universal-templates` - Universal templates
- `GET /api/checklists/store/:storeId/active` - Active checklist
- `GET /api/checklists/:id` - Get template
- `PUT /api/checklists/:id` - Update template
- `DELETE /api/checklists/:id` - Delete template

### Checklist Instances
- `POST /api/checklist-instances` - Submit completed checklist

### Tasks
- `GET /api/tasks/mytasks` - Get manager tasks
- `POST /api/tasks` - Create task
- `PUT /api/tasks/:id/complete` - Mark complete
- `GET /api/tasks/by-inspection/:inspectionId` - Tasks by inspection
- `GET /api/tasks/previous-for` - Previous inspection tasks
- `GET /api/tasks/admin` - Admin tasks (admin)
- `POST /api/tasks/admin` - Create admin task (admin)
- `PUT /api/tasks/admin/:id` - Update admin task (admin)
- `DELETE /api/tasks/admin/:id` - Delete admin task (admin)

### Templates
- `GET /api/templates` - List templates
- `POST /api/templates` - Create template (admin)
- `GET /api/templates/:id` - Get template
- `PUT /api/templates/:id` - Update template (admin)
- `DELETE /api/templates/:id` - Delete template (admin)

### Upload
- `POST /api/upload/image` - Upload image to Cloudinary

### Notifications
- `GET /api/notifications` - Get unread notifications
- `PUT /api/notifications/:id/read` - Mark as read
- `PUT /api/notifications/read-all` - Mark all as read
- `POST /api/notifications/subscribe` - Subscribe to push

## Authentication Flow

### Old Flow (DEPRECATED)
```
Client → audits-be (validates Auth0 token) → MongoDB
```

### New Flow (Gateway Trust Pattern)
```
Client (Auth0 token) → Gateway (validates token, adds x-user-id) → audits-be (trusts header) → MongoDB
```

### trustGateway Middleware

Located at `middleware/trustGateway.js`:

```javascript
// Extract x-user-id header from Gateway
const auth0Sub = req.headers['x-user-id'];

// Return 401 if missing
if (!auth0Sub) {
  res.status(401);
  throw new Error('Not authorized - missing user context');
}

// Find user in MongoDB by auth0Id field
const user = await User.findOne({ auth0Id: auth0Sub });

// Attach to request
req.user = user;
```

All protected routes use this middleware instead of Auth0 validation.

## User Model

MongoDB `User` schema has `auth0Id` field:

```javascript
{
  auth0Id: {
    type: String,
    required: false,
    unique: true,
    sparse: true
  },
  email: String,
  fullName: String,
  role: { type: String, enum: ['admin', 'inspector', 'manager', 'employee'] },
  stores: [ObjectId],
  phoneNumber: String
}
```

**Key:** `auth0Id` field links Auth0 user to MongoDB user (unique index for fast lookups).

## Testing

### Unit Tests (TODO)
```bash
npm test
```

Test coverage:
- `trustGateway` middleware (with/without `x-user-id` header)
- User lookup by `auth0Id`
- Route handlers with mocked `req.user`

### Integration Tests (TODO)
- API routes with mocked headers
- MongoDB queries
- Cloudinary uploads

### Manual E2E Test

1. Log into Shell (`apps/shell`)
2. Navigate to `/audits`
3. Open Browser DevTools → Network tab
4. Make API call (e.g., list stores)
5. Verify request goes to `/api/v1/audits/stores` (Gateway)
6. Verify response contains data from MongoDB

Check logs:
- Gateway logs: `Proxying to audits-be: GET /stores`
- audits-be logs: `trustGateway: Authenticated user 507f1f77bcf86cd799439011`

## Troubleshooting

### Error: "Not authorized - missing user context"
**Cause:** `x-user-id` header not present in request
**Solution:** Ensure request goes through API Gateway (not directly to backend)

### Error: "Not authorized - user not found"
**Cause:** User's `auth0Id` not in MongoDB
**Solution:** Check Auth0 user's `sub` claim matches MongoDB `User.auth0Id` field

### Error: "MongoNetworkError"
**Cause:** Cannot connect to MongoDB Atlas
**Solution:** Verify `MONGO_URI` environment variable, check MongoDB Atlas IP whitelist

### Error: "Cloudinary upload failed"
**Cause:** Invalid Cloudinary credentials
**Solution:** Verify `CLOUDINARY_*` environment variables

## Migration Notes

### From Standalone Auth0 Backend

**Removed:**
- `express-oauth2-jwt-bearer` dependency
- `auth0` SDK dependency
- `middleware/auth.js` (Auth0 JWT validation logic)
- Auth0 environment variables (`AUTH0_AUDIENCE`, `AUTH0_ISSUER_BASE_URL`, etc.)

**Added:**
- `middleware/trustGateway.js` (trusts Gateway's `x-user-id` header)
- Workspace dependency `@legend/types` for shared TypeScript interfaces

**Modified:**
- All routes now use `trustGateway` middleware
- No direct Auth0 token validation
- Relies on Gateway for authentication

### User Auto-Creation

Auth0 migration route (`POST /api/auth/migrate`) remains for legacy user migration, but new users are auto-created by Gateway when they first log in.

## Related Documentation

- [Story 1-4: AuditsApp Integration](../../DOCS/stories/1-4-auditsapp-nextjs-be-integration.md)
- [Brownfield Architecture](../../DOCS/brownfield-architecture.md)
- [Tech Spec Epic 1](../../DOCS/tech-spec-epic-1.md)
- [API Gateway README](../api-gateway/README.md)

## Support

For issues or questions, check:
1. Render logs for audits-be service
2. Render logs for api-gateway service
3. MongoDB Atlas logs
4. Story 1-4 implementation notes
