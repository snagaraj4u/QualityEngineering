import { useEffect, useRef, useState, useCallback } from 'react';

export interface StreamTestResult {
  name: string;
  status: 'PASSED' | 'FAILED' | 'SKIPPED' | string;
  duration: number;
  errorMessage?: string;
}

export interface StreamSummary {
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
}

export interface StreamEvent {
  type: 'test-complete' | 'execution-complete' | 'execution-error';
  test?: StreamTestResult;
  passed?: number;
  failed?: number;
  skipped?: number;
  duration?: number;
  error?: string;
}

export interface UseTestStreamOptions {
  executionId: string;
  clientId: string;
  onTest?: (test: StreamTestResult) => void;
  onComplete?: (summary: StreamSummary) => void;
  onError?: (error: string) => void;
}

export interface UseTestStreamResult {
  isConnected: boolean;
  isComplete: boolean;
  disconnect: () => void;
}

/**
 * Subscribe to live test-progress updates for a single execution via SSE.
 *
 * Callbacks are held in refs so the underlying EventSource is created once per
 * (executionId, clientId) pair rather than being torn down and recreated on
 * every render when callers pass inline callbacks.
 */
export function useTestStream({
  executionId,
  clientId,
  onTest,
  onComplete,
  onError,
}: UseTestStreamOptions): UseTestStreamResult {
  const [isConnected, setIsConnected] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const eventSourceRef = useRef<EventSource | null>(null);

  // Keep the latest callbacks without making them effect dependencies.
  const onTestRef = useRef(onTest);
  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onTestRef.current = onTest;
    onCompleteRef.current = onComplete;
    onErrorRef.current = onError;
  }, [onTest, onComplete, onError]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsConnected(false);
  }, []);

  useEffect(() => {
    if (!executionId || !clientId) {
      return;
    }

    setIsComplete(false);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const streamUrl = `${apiUrl}/api/test/${encodeURIComponent(
      executionId
    )}/stream?clientId=${encodeURIComponent(clientId)}`;

    let completed = false;
    let eventSource: EventSource;

    try {
      eventSource = new EventSource(streamUrl);
    } catch (err) {
      onErrorRef.current?.(
        `Failed to connect to stream: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
      return;
    }

    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
    };

    eventSource.onmessage = (event: MessageEvent) => {
      let data: StreamEvent;
      try {
        data = JSON.parse(event.data);
      } catch {
        // Ignore non-JSON frames (e.g. the initial connection notice or keep-alives).
        return;
      }

      if (data.type === 'test-complete' && data.test) {
        onTestRef.current?.(data.test);
      } else if (data.type === 'execution-complete') {
        completed = true;
        onCompleteRef.current?.({
          passed: data.passed ?? 0,
          failed: data.failed ?? 0,
          skipped: data.skipped ?? 0,
          duration: data.duration ?? 0,
        });
        setIsComplete(true);
        disconnect();
      } else if (data.type === 'execution-error') {
        completed = true;
        onErrorRef.current?.(data.error ?? 'Unknown error');
        setIsComplete(true);
        disconnect();
      }
    };

    eventSource.onerror = () => {
      // EventSource fires onerror on normal close too; only surface real failures.
      if (!completed) {
        onErrorRef.current?.('Stream connection lost');
      }
      disconnect();
    };

    return () => {
      disconnect();
    };
  }, [executionId, clientId, disconnect]);

  return { isConnected, isComplete, disconnect };
}
