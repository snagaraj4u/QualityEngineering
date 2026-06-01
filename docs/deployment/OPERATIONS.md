# Operations Runbook

Day-2 operations for the Quality Engineering platform.

## Services at a glance

- **Web** (Vercel) — Next.js UI. Stateless. Redeploy = push to `main`.
- **Backend** (Node host) — Express API + SSE. Stateful connections; needs a
  long-running process. Reads `DATABASE_URL`, `CLAUDE_API_KEY`, `QMETRY_*`,
  `JIRA_*`.
- **Database** (PostgreSQL) — system of record.

## Health checks

- Backend: `GET /health` → `{ "status": "ok", "timestamp": ... }`.
- Web: the Vercel deployment URL should return the app shell.
- DB: `npx prisma db execute --schema=packages/database/schema.prisma --stdin <<< "SELECT 1;"`.

## Schema changes

No migrations directory yet — schema changes are applied with `db push`:

```bash
npx prisma db push --schema=packages/database/schema.prisma
```

After editing `schema.prisma`, always regenerate the client so TypeScript types
match (and restart the backend):

```bash
npx prisma generate --schema=packages/database/schema.prisma
```

> Known gotcha: `prisma generate` can fail with EPERM on Windows if a stale
> `jest`/`node` process is holding the query-engine DLL. Stop those processes
> and retry.

## Tests / CI

- Run the full suite locally from the **repo root** (not `backend/`):
  `npx jest`. The live-DB E2E suite stays skipped unless `DATABASE_URL` is set.
- CI runs the same suite with a Postgres service, which activates the E2E suite.

## Common incidents

| Symptom | Likely cause | Action |
|---------|--------------|--------|
| Web shows "Failed to load dashboard" | Backend down or `NEXT_PUBLIC_API_URL` wrong | Check backend `/health`; verify the env var points at the backend host (no trailing `/api`). |
| 500s from `/api/defects` create | QMetry creds missing/invalid | Check `QMETRY_API_KEY` / `QMETRY_API_SECRET` / `QMETRY_BASE_URL`. |
| `@prisma/client did not initialize` | Client not generated for current schema | Re-run `prisma generate` and restart. |
| SSE stream never connects | Backend behind a proxy that buffers responses | Ensure the host/proxy supports streaming (disable response buffering). |
| Multi-tenant data leak suspected | Missing `clientId` scoping | Routes enforce `ISOLATION_VIOLATION` → 403; confirm callers pass `clientId`. |

## Secrets & rotation

Secrets live in the host/Vercel/GitHub Actions secret stores — never in the
repo. Rotate `CLAUDE_API_KEY`, `QMETRY_*`, `NPM_TOKEN`, and `VERCEL_TOKEN`
through their respective providers and update the corresponding secret store.

## Backups

PostgreSQL is the system of record — rely on the managed provider's automated
backups/PITR. The web and backend are redeployable from source and hold no
durable state of their own.
