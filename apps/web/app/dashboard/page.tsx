'use client';

import Link from 'next/link';
import { DashboardView } from '../../components/Dashboard/DashboardView';

export default function Dashboard() {
  // In production, extract from user session/auth (NextAuth not wired yet).
  const clientId = 'default-client'; // TODO: Extract from user session

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600">Test execution metrics, trends and defects</p>
          </div>
          <Link
            href="/"
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
          >
            Go Home
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <DashboardView clientId={clientId} />
      </div>
    </main>
  );
}
