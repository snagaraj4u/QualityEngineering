import Link from 'next/link';

export default function Dashboard() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Dashboard</h1>
        <p className="text-xl text-gray-600 mb-8">Dashboard coming soon</p>
        <Link
          href="/"
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Go Home
        </Link>
      </div>
    </main>
  );
}
