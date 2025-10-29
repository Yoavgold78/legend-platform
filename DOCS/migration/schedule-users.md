# Schedule User Migration Guide

## Overview

This guide documents the process for migrating existing Schedule application users to the unified Auth0-based authentication system.

## Migration Strategy

### One-Time Password Setup via Auth0

All existing Schedule users will receive an invitation email from Auth0 to set up their password in the unified system.

### Process

1. **Export Existing Users**
   - Extract user list from Schedule database (email, name, roles)
   - Generate CSV in Auth0 bulk import format

2. **Bulk Import to Auth0**
   - Use Auth0 Management API or Dashboard to bulk import users
   - Set "requires password reset" flag for all imported users
   - Assign appropriate roles based on existing Schedule permissions

3. **Send Invitation Emails**
   - Auth0 automatically sends password setup emails to all imported users
   - Email includes secure link to set password (valid for 7 days)
   - Users can request new link if expired

4. **First Sign-In Flow**
   - User receives invitation email
   - Clicks link to set password
   - Redirected to unified Shell login
   - Signs in with new password
   - Redirected to Schedule app with full access to existing data

5. **Profile Reconciliation**
   - On first sign-in, Gateway calls `profileSync` service
   - Service matches Auth0 ID to existing Schedule user by email
   - Creates link in database for future lookups
   - Returns unified user profile with permitted apps

## Timeline

- **Week 1**: Export users and prepare import CSV
- **Week 2**: Import to Auth0 and send test batch (10 users)
- **Week 3**: Monitor test batch; send remaining invitations
- **Week 4**: Legacy login disabled; full cutover complete

## Support Plan

- Dedicated support email for migration questions
- FAQ document covering common issues
- Fallback: Manual password reset via Auth0 Dashboard

## Rollback Plan

If critical issues arise:
- Re-enable legacy Schedule login temporarily
- Investigate and fix issues
- Resume migration with fixed process

## Success Metrics

- 90%+ of users complete password setup within 7 days
- <2% of users require support intervention
- Zero data loss or access issues
