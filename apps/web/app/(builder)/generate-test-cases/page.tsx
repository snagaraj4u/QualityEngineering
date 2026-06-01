'use client';

import React from 'react';
import Link from 'next/link';

/**
 * Generate Test Cases Page (Placeholder)
 * This page will be implemented in a future phase
 */
export default function GenerateTestCasesPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Generate Test Cases</h1>
          <p className="text-lg text-gray-600 mb-6">
            This feature is coming soon. You can use the analyzed video data to generate test cases.
          </p>

          <Link
            href="/builder/video/upload"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors"
          >
            Back to Video Upload
          </Link>
        </div>
      </div>
    </main>
  );
}
