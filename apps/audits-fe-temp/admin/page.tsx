export default function AdminDashboard() {
  return (
    <div className='max-w-4xl mx-auto p-6'>
      <div className='bg-green-50 border-2 border-green-500 rounded-lg p-8'>
        <h1 className='text-3xl font-bold text-green-900 mb-4'>
          ✅ Admin Dashboard (Placeholder)
        </h1>
        <p className='text-green-700 mb-4'>
          Congratulations! Auth0 role-based routing is working correctly.
        </p>
        <div className='bg-white p-4 rounded border border-green-200'>
          <p className='text-sm text-gray-600'>
            <strong>Current Route:</strong> /auditapp/admin
          </p>
          <p className='text-sm text-gray-600 mt-2'>
            <strong>Your Role:</strong> Admin
          </p>
          <p className='text-sm text-gray-500 mt-4 italic'>
            This is a temporary placeholder. The actual AuditsApp admin dashboard will be implemented in Story 1.4.
          </p>
        </div>
      </div>
    </div>
  );
}
