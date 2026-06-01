# Real-Time Test Progress Streaming (SSE)

Phase 6.3 adds Server-Sent Events (SSE) so clients receive live test progress
instead of polling `GET /api/test/:executionId`.

## Architecture

- **`TestExecutionService`** extends `EventEmitter` and emits `execution-started`,
  `test-complete`, `execution-complete`, and `execution-error` events as a run
  progresses.
- A **single shared instance** (`testExecutionService`, exported from
  `backend/src/services/TestExecutionService.ts`) is used by both the execute
  route (`POST /api/test/execute`) and the stream route. This is required:
  Node's `EventEmitter` only delivers events to listeners registered on the same
  object, so the runner and the SSE endpoint must share one emitter.
- **`backend/src/routes/stream.ts`** opens a `text/event-stream` response,
  subscribes to the shared emitter scoped by `executionId`, and forwards each
  event as an SSE frame. Listeners are removed on client disconnect.
- **`apps/web/hooks/useTestStream.ts`** wraps the browser `EventSource`,
  dispatches parsed events to callbacks, and reconnects with exponential backoff.

## API: `GET /api/test/:executionId/stream`

### Request

```
GET /api/test/{executionId}/stream?clientId={clientId}
Accept: text/event-stream
```

`clientId` (query, required) enforces multi-tenant isolation.

### Response

A `text/event-stream` body. The first frame is a connection notice, followed by
event frames:

```
data: {"status":"connected","executionId":"exec-123"}

data: {"type":"test-complete","test":{"name":"login spec","status":"PASSED","duration":100}}

data: {"type":"test-complete","test":{"name":"checkout spec","status":"FAILED","duration":150,"errorMessage":"expected 200"}}

data: {"type":"execution-complete","passed":1,"failed":1,"skipped":0,"duration":250}
```

`: keep-alive` comment frames are sent every 30s to keep idle proxies from
closing the connection. The connection also self-closes after 30 minutes of
inactivity.

If the execution has already reached a terminal state (`status` is anything
other than `IN_PROGRESS`) when the client connects, the endpoint immediately
replays a single `execution-complete` frame (including the stored `tests`
array) and closes.

### Status values

Test `status` and the execution `status` use the backend's `ExecutionStatus`
enum casing: `PASSED`, `FAILED`, `SKIPPED`, `BLOCKED`, `IN_PROGRESS`,
`CANCELLED`.

### Error responses

| Status | Condition |
| ------ | --------- |
| `400 Bad Request` | Missing `clientId` |
| `403 Forbidden` | `clientId` does not own the execution |
| `404 Not Found` | Execution does not exist |

## React hook: `useTestStream`

```tsx
import { useTestStream } from '@/hooks/useTestStream';

function TestRunView({ executionId, clientId }: { executionId: string; clientId: string }) {
  const { isConnected, isComplete } = useTestStream({
    executionId,
    clientId,
    onTest: (test) => { /* append to a list */ },
    onComplete: (summary) => { /* show passed/failed/skipped/duration */ },
    onError: (message) => { /* surface the error */ },
  });

  return <span>{isConnected ? 'live' : isComplete ? 'done' : 'connecting'}</span>;
}
```

### Options

- `executionId` (required) — execution to stream.
- `clientId` (required) — tenant isolation.
- `onTest(test)` — called per `test-complete` event.
- `onComplete(summary)` — called once on `execution-complete`.
- `onError(message)` — called on `execution-error` or after reconnection gives up.

### Implementation notes

- Callbacks are stored in refs; the `EventSource` is created once per
  `(executionId, clientId)` pair and is **not** recreated when inline callbacks
  change between renders.
- On an unexpected disconnect the hook reconnects with exponential backoff
  (1s, 2s, 4s, 8s, 16s; capped at 30s) for up to 5 attempts, then reports via
  `onError`. It does not reconnect after `execution-complete` or
  `execution-error`.
- `disconnect()` is returned for manual teardown and runs automatically on
  unmount.

## Migration from polling

```tsx
// Before — polling
useEffect(() => {
  const id = setInterval(async () => {
    const res = await fetch(`${apiUrl}/api/test/${executionId}?clientId=${clientId}`);
    setResult(await res.json());
  }, 1000);
  return () => clearInterval(id);
}, [executionId, clientId]);

// After — streaming
useTestStream({
  executionId,
  clientId,
  onTest: (test) => setTests((prev) => [...prev, test]),
  onComplete: setResult,
});
```

## Known limitations

- SSE is unidirectional (server → client); use normal HTTP for client → server.
- Event ordering follows the test framework's reporting order.
- The shared emitter is in-process; horizontal scaling would require a shared
  broker (e.g. Redis pub/sub) so any instance can serve a stream for a run
  started on another instance.
