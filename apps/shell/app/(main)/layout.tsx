'use client';
import { useUser } from '@auth0/nextjs-auth0/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useUser();
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    router.push('/api/auth/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gray-900 text-white shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <h1 className="text-2xl font-bold">Legenda Platform</h1>
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
              <div className="flex items-center gap-3">
                {user.picture && (
                  <img
                    src={user.picture}
                    alt={user.name || 'User'}
                    className="w-10 h-10 rounded-full border-2 border-blue-500"
                  />
                )}
                <span className="text-sm md:text-base">
                  Welcome, <strong>{user.name || user.email}</strong>
                </span>
              </div>
              <Link
                href="/api/auth/logout"
                className="bg-red-600 px-4 py-2 rounded hover:bg-red-700 transition-colors text-sm md:text-base font-semibold text-center"
              >
                Logout
              </Link>
            </div>
          </div>
        </div>
        {/* Navigation Bar */}
        <nav className="bg-gray-800 border-t border-gray-700">
          <div className="container mx-auto px-4">
            <div className="flex gap-1">
              <Link
                href="/dashboard"
                className="px-4 py-3 hover:bg-gray-700 transition-colors text-sm md:text-base font-medium"
              >
                🏠 Dashboard
              </Link>
              <Link
                href="/audits"
                className="px-4 py-3 hover:bg-gray-700 transition-colors text-sm md:text-base font-medium"
              >
                📋 Audits
              </Link>
            </div>
          </div>
        </nav>
      </header>
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
