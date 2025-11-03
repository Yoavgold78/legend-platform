import { getSession } from '@auth0/nextjs-auth0';
import { redirect } from 'next/navigation';

/**
 * Role-Based Router Dashboard
 * 
 * This page reads user roles from Auth0 session and redirects to appropriate app dashboard.
 * Roles are stored in Auth0 custom claim: https://legend-platform.com/roles
 * 
 * Role Priority (if user has multiple roles):
 * 1. admin (highest priority)
 * 2. manager (can access both AuditsApp manager dashboard AND ScheduleApp shifts)
 * 3. inspector
 * 4. employee
 * 5. store (lowest priority)
 * 
 * Role → Route Mapping:
 * AuditsApp:
 *   - admin → /auditapp/admin
 *   - manager → /auditapp/manager (default landing, can also access /scheduleapp/shifts)
 *   - inspector → /auditapp/inspection
 *   - store → /auditapp/share (store tablet view)
 * 
 * ScheduleApp:
 *   - admin → /scheduleapp/dashboard
 *   - manager → /scheduleapp/shifts (can navigate here from AuditsApp)
 *   - employee → /scheduleapp/employee-dashboard
 * 
 * Note: Managers have access to both apps and can switch between them using app switcher.
 *       Routes /auditapp/* and /scheduleapp/* will be implemented in Stories 1.4 and 1.6.
 */

export default async function Dashboard() {
  const session = await getSession();
  const user = session?.user;

  // Safety check: Should never happen due to middleware protection
  if (!user) {
    redirect('/api/auth/login');
  }

  // Extract roles from Auth0 custom claim
  // Format: user['https://legend-platform.com/roles'] = ['admin', 'inspector']
  const roles: string[] = user['https://legend-platform.com/roles'] || [];
  
  // Normalize roles to lowercase for case-insensitive matching
  const normalizedRoles = roles.map(role => role.toLowerCase());

  // Role-based routing with priority order
  if (normalizedRoles.includes('admin')) {
    // Admin users go to AuditsApp (Story 1.4 - iframe integration)
    redirect('/audits');
  } else if (normalizedRoles.includes('manager')) {
    // Managers go to AuditsApp by default (Story 1.4 - iframe integration)
    // They can navigate to ScheduleApp shifts using app switcher (Story 1.5)
    redirect('/audits');
  } else if (normalizedRoles.includes('inspector')) {
    // Inspectors go to AuditsApp (Story 1.4 - iframe integration)
    redirect('/audits');
  } else if (normalizedRoles.includes('employee')) {
    // Employees go to ScheduleApp employee dashboard (Story 1.6 - not yet implemented)
    redirect('/scheduleapp/employee-dashboard');
  } else if (normalizedRoles.includes('store')) {
    // Store employees go to AuditsApp (Story 1.4 - iframe integration)
    redirect('/audits');
  } else {
    // Fallback: No recognized roles - show error page
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-red-50 border-2 border-red-200 rounded-lg shadow-md p-6 md:p-8">
          <h2 className="text-3xl font-bold mb-4 text-red-900">Access Denied</h2>
          <p className="text-red-700 mb-6">
            Your account does not have any assigned roles. Please contact your administrator.
          </p>
          <div className="bg-white p-4 rounded border border-red-200">
            <p className="text-sm text-gray-600">
              <strong>User:</strong> {user.name || user.email}
            </p>
            <p className="text-sm text-gray-600 mt-2">
              <strong>Assigned Roles:</strong> {roles.length > 0 ? roles.join(', ') : 'None'}
            </p>
            <p className="text-sm text-gray-500 mt-2 italic">
              Note: Role names in Auth0 are case-sensitive. Expected: admin, manager, inspector, employee, store (all lowercase)
            </p>
          </div>
        </div>
      </div>
    );
  }
}
