import { useState } from 'react';
import { useTestStream, StreamTestResult, StreamSummary } from '../hooks/useTestStream';

interface TestStreamViewerProps {
  executionId: string;
  clientId: string;
}

/**
 * Example consumer of useTestStream: renders live test results as they arrive
 * and a summary once the execution completes.
 */
export function TestStreamViewer({ executionId, clientId }: TestStreamViewerProps) {
  const [tests, setTests] = useState<StreamTestResult[]>([]);
  const [summary, setSummary] = useState<StreamSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { isConnected, isComplete } = useTestStream({
    executionId,
    clientId,
    onTest: (test) => setTests((prev) => [...prev, test]),
    onComplete: (sum) => setSummary(sum),
    onError: (err) => setError(err),
  });

  return (
    <div className="p-4">
      <div className="mb-4">
        <p className="text-sm text-gray-600">
          Status: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
        </p>
      </div>

      {error && <div className="bg-red-100 p-2 text-red-800 mb-4">{error}</div>}

      <div className="space-y-2">
        {tests.map((test, idx) => (
          <div key={`${test.name}-${idx}`} className="flex items-center gap-2 p-2 border rounded">
            <span className={test.status === 'PASSED' ? 'text-green-600' : 'text-red-600'}>
              {test.status === 'PASSED' ? '✓' : '✗'}
            </span>
            <span>{test.name}</span>
            <span className="text-xs text-gray-500">({test.duration}ms)</span>
          </div>
        ))}
      </div>

      {isComplete && summary && (
        <div className="mt-4 p-3 bg-gray-100 rounded">
          <p>
            Results: {summary.passed} passed, {summary.failed} failed, {summary.skipped} skipped (
            {summary.duration}ms)
          </p>
        </div>
      )}
    </div>
  );
}
