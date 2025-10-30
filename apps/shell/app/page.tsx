import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-blue-50 to-white">
      <div className="text-center px-4 w-full max-w-md">
        <h1 className="text-5xl md:text-6xl font-bold mb-4 text-gray-900">
          Legenda
        </h1>
        <p className="text-lg md:text-xl text-gray-600 mb-8">
          Unified Audits & Schedule Management
        </p>
        <Link
          href="/api/auth/login"
          className="inline-block bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl active:scale-95 transform min-w-[200px]"
        >
          Log In
        </Link>
        <p className="mt-6 text-sm text-gray-500">
          Secure authentication powered by Auth0
        </p>
      </div>
    </div>
  );
}
