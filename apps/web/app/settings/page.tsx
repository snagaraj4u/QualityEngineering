import Link from 'next/link';

export default function Settings() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Settings</h1>
        <p className="text-xl text-gray-600 mb-8">Settings coming soon</p>
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
