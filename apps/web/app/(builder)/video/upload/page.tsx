'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { VideoUpload, VideoAnalysisResult } from '../../../../components/VideoUpload';

/**
 * Video Upload Page
 * Allows users to upload test execution videos and extract test steps
 */
export default function VideoUploadPage() {
  const [analysisResult, setAnalysisResult] = useState<VideoAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Use a default clientId - in production, this would come from user session
  const clientId = 'default-client';

  const handleSuccess = (analysis: VideoAnalysisResult) => {
    setAnalysisResult(analysis);
    setError(null);
  };

  const handleError = (errorMsg: string) => {
    setError(errorMsg);
    setAnalysisResult(null);
  };

  const handleReset = () => {
    setAnalysisResult(null);
    setError(null);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Upload and Analyze Video</h1>
          <p className="text-lg text-gray-600">
            Upload a test execution video to extract test steps and generate test cases
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Before Upload */}
        {!analysisResult && !error && (
          <div className="bg-white rounded-lg shadow-md p-8">
            <VideoUpload
              clientId={clientId}
              onSuccess={handleSuccess}
              onError={handleError}
            />
          </div>
        )}

        {/* Success State */}
        {analysisResult && (
          <div className="bg-white rounded-lg shadow-md p-8">
            <div className="mb-8 p-6 bg-green-50 border border-green-200 rounded-lg">
              <h2 className="text-2xl font-bold text-green-900 mb-2">Success!</h2>
              <p className="text-green-700 mb-4">
                Video has been uploaded and analyzed successfully.
              </p>

              {/* Analysis Summary */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-4 rounded-lg border border-green-200">
                  <p className="text-sm text-gray-600">Analysis ID</p>
                  <p className="font-mono text-sm text-gray-900 break-all">
                    {analysisResult.analysisId}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-green-200">
                  <p className="text-sm text-gray-600">Frames Analyzed</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {analysisResult.framesAnalyzed}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-green-200">
                  <p className="text-sm text-gray-600">Duration (seconds)</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {analysisResult.duration}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-green-200">
                  <p className="text-sm text-gray-600">Confidence</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {(analysisResult.confidence * 100).toFixed(0)}%
                  </p>
                </div>
              </div>

              {/* Extracted Steps */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Extracted Test Steps</h3>
                <div className="space-y-2">
                  {analysisResult.steps.slice(0, 5).map((step, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-3 bg-white border border-gray-200 rounded-lg"
                    >
                      <span className="flex-shrink-0 w-6 h-6 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-sm font-semibold">
                        {index + 1}
                      </span>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{step.action}</p>
                        {step.element && (
                          <p className="text-sm text-gray-600">Element: {step.element}</p>
                        )}
                        <p className="text-sm text-gray-600">Expected: {step.expectedResult}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {analysisResult.steps.length > 5 && (
                  <p className="text-sm text-gray-600 mt-3">
                    ... and {analysisResult.steps.length - 5} more steps
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 flex-wrap">
                <Link
                  href={`/builder/generate-test-cases?analysisId=${analysisResult.analysisId}`}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors"
                >
                  Generate Test Cases
                </Link>
                <button
                  onClick={handleReset}
                  className="px-6 py-3 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 font-semibold transition-colors"
                >
                  Upload Another Video
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-white rounded-lg shadow-md p-8">
            <div className="mb-8 p-6 bg-red-50 border border-red-200 rounded-lg">
              <h2 className="text-2xl font-bold text-red-900 mb-2">Upload Failed</h2>
              <p className="text-red-700 mb-6">{error}</p>

              {/* Retry Button */}
              <div className="flex gap-4">
                <button
                  onClick={handleReset}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors"
                >
                  Try Again
                </button>
                <Link
                  href="/"
                  className="px-6 py-3 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 font-semibold transition-colors"
                >
                  Go Home
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Info Section */}
      {!analysisResult && !error && (
        <div className="max-w-4xl mx-auto px-6 pb-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Supported Formats</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• MP4 (.mp4)</li>
                <li>• QuickTime (.mov)</li>
                <li>• WebM (.webm)</li>
              </ul>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Specifications</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Maximum size: 500MB</li>
                <li>• Min resolution: 640x480</li>
                <li>• Frame rate: 24-60 fps</li>
              </ul>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">What You'll Get</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Extracted test steps</li>
                <li>• AI-powered analysis</li>
                <li>• Test case generation</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
