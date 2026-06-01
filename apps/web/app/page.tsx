import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Quality Engineering Platform</h1>
        <p className="text-xl text-gray-600 mb-8">Welcome to the QE Platform</p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link
            href="/builder/video/upload"
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Upload Video
          </Link>
          <Link
            href="/dashboard"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Dashboard
          </Link>
          <Link
            href="/settings"
            className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Settings
          </Link>
        </div>
      </div>
    </main>
  );
}
