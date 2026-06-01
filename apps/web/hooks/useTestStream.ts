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

// Reconnection tuning: exponential backoff capped at MAX_DELAY, giving up
// after MAX_ATTEMPTS consecutive failures (1s, 2s, 4s, 8s, 16s).
const MAX_ATTEMPTS = 5;
const BASE_DELAY = 1000;
const MAX_DELAY = 30000;

/**
 * Subscribe to live test-progress updates for a single execution via SSE.
 *
 * Callbacks are held in refs so the underlying EventSource is created once per
 * (executionId, clientId) pair rather than being torn down and recreated on
 * every render when callers pass inline callbacks. On an unexpected
 * disconnect the hook reconnects with exponential backoff; it does not
 * reconnect after the execution completes or errors.
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
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptRef = useRef(0);
  const completedRef = useRef(false);

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
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
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

    completedRef.current = false;
    attemptRef.current = 0;
    setIsComplete(false);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const streamUrl = `${apiUrl}/api/test/${encodeURIComponent(
      executionId
    )}/stream?clientId=${encodeURIComponent(clientId)}`;

    const finish = (notify: () => void) => {
      completedRef.current = true;
      notify();
      setIsComplete(true);
      disconnect();
    };

    const scheduleReconnect = () => {
      if (completedRef.current) {
        return;
      }
      if (attemptRef.current >= MAX_ATTEMPTS) {
        onErrorRef.current?.('Stream connection lost; max reconnection attempts reached');
        return;
      }
      const delay = Math.min(BASE_DELAY * 2 ** attemptRef.current, MAX_DELAY);
      attemptRef.current += 1;
      reconnectTimerRef.current = setTimeout(connect, delay);
    };

    function connect() {
      let eventSource: EventSource;
      try {
        eventSource = new EventSource(streamUrl);
      } catch (err) {
        onErrorRef.current?.(
          `Failed to connect to stream: ${err instanceof Error ? err.message : 'Unknown error'}`
        );
        scheduleReconnect();
        return;
      }

      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        attemptRef.current = 0; // reset backoff after a successful connection
        setIsConnected(true);
      };

      eventSource.onmessage = (event: MessageEvent) => {
        let data: StreamEvent;
        try {
          data = JSON.parse(event.data);
        } catch {
          // Ignore non-JSON frames (the initial connection notice, keep-alives).
          return;
        }

        if (data.type === 'test-complete' && data.test) {
          const test = data.test;
          onTestRef.current?.(test);
        } else if (data.type === 'execution-complete') {
          finish(() =>
            onCompleteRef.current?.({
              passed: data.passed ?? 0,
              failed: data.failed ?? 0,
              skipped: data.skipped ?? 0,
              duration: data.duration ?? 0,
            })
          );
        } else if (data.type === 'execution-error') {
          finish(() => onErrorRef.current?.(data.error ?? 'Unknown error'));
        }
      };

      eventSource.onerror = () => {
        // EventSource fires onerror on normal close too; ignore once completed.
        if (completedRef.current) {
          return;
        }
        // Drop the failed source before attempting to reconnect.
        eventSource.close();
        if (eventSourceRef.current === eventSource) {
          eventSourceRef.current = null;
        }
        setIsConnected(false);
        scheduleReconnect();
      };
    }

    connect();

    return () => {
      disconnect();
    };
  }, [executionId, clientId, disconnect]);

  return { isConnected, isComplete, disconnect };
}
