import React from 'react';
import Link from 'next/link';

export default function BuilderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-gray-900 text-white">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-8">QE Platform</h2>

          <nav className="space-y-2">
            <Link
              href="/"
              className="block px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
            >
              Home
            </Link>
            <Link
              href="/builder/video/upload"
              className="block px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
            >
              Video Upload
            </Link>
            <Link
              href="/builder/generate-test-cases"
              className="block px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
            >
              Generate Test Cases
            </Link>
            <Link
              href="/dashboard"
              className="block px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/settings"
              className="block px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
            >
              Settings
            </Link>
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
