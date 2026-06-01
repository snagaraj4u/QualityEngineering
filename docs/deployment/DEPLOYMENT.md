# Deployment Guide

This is a monorepo with three deployable pieces. They do **not** all go to the
same place:

| Piece | Path | Where it runs |
|-------|------|---------------|
| Web app (Next.js) | `apps/web` | Vercel |
| Backend API (Express) | `backend/` | A long-running Node host (Railway / Render / Fly.io / a VM). **Not** Vercel — it's a stateful Express server with SSE, not Next.js route handlers. |
| CLI | `apps/cli` | npm registry (`@qe/cli`) |
| Database | `packages/database` | Managed PostgreSQL (Neon, Supabase, RDS, …) |

The web app talks to the backend over `NEXT_PUBLIC_API_URL`; both talk to the
same PostgreSQL via `DATABASE_URL`.

---

## 1. Database (PostgreSQL)

The project has **no migrations directory** — the schema is applied with
`prisma db push` rather than `prisma migrate deploy`.

```bash
# From the repo root, against your target DATABASE_URL:
npx prisma db push --schema=packages/database/schema.prisma
```

If/when you adopt migrations later, create the first one with
`npx prisma migrate dev --schema=packages/database/schema.prisma` and switch
deploys to `npx prisma migrate deploy`.

---

## 2. Web app → Vercel

See [VERCEL_SETUP.md](./VERCEL_SETUP.md) for the full walkthrough. Short version:

1. Import the GitHub repo at <https://vercel.com/new>.
2. Leave the Root Directory as the repo root (the committed `vercel.json`
   builds the `@qe/web` workspace and serves `apps/web/.next`).
3. Set the environment variables (see below) in the Vercel project.
4. Deploy. CI also runs `npx vercel deploy --prod` on pushes to `main`.

---

## 3. Backend → Node host

The Express API is a separate service. On your host:

```bash
npm ci
npx prisma generate --schema=packages/database/schema.prisma
# Build step depends on your host; the backend runs via ts-node/tsx or a tsc build.
# Start (production):
NODE_ENV=production node backend/dist/index.js   # if compiled
# or run with tsx during early-stage hosting.
```

Expose the port from `PORT` (default `3001`) and point the web app's
`NEXT_PUBLIC_API_URL` at this host's public URL.

---

## 4. CLI → npm

See [NPM_PUBLISH.md](./NPM_PUBLISH.md).

---

## Environment variables

| Variable | Used by | Notes |
|----------|---------|-------|
| `DATABASE_URL` | backend, prisma | PostgreSQL connection string |
| `CLAUDE_API_KEY` | backend (vision, generation) | Anthropic API key |
| `QMETRY_API_KEY` / `QMETRY_API_SECRET` / `QMETRY_BASE_URL` | backend (defects) | QMetry credentials |
| `JIRA_CLIENT_ID` / `JIRA_CLIENT_SECRET` / `JIRA_REDIRECT_URI` | backend (Jira) | Jira OAuth |
| `NEXT_PUBLIC_API_URL` | web, CLI | Base URL of the Express backend (no trailing `/api`) |
| `NEXTAUTH_SECRET` / `NEXTAUTH_URL` | web | NextAuth (auth not fully wired yet) |
| `PORT` | backend | Express listen port (default 3001) |

Copy `.env.example` to `.env` and fill these in for local development.

---

## CI/CD

`.github/workflows/ci-cd.yml` runs on push/PR to `main`/`master`/`develop`:

- **test** — spins up Postgres, `prisma generate` + `prisma db push`, then
  `jest`. Because `DATABASE_URL` is set in CI, the live-DB E2E suite
  (`tests/integration/e2e.test.ts`) runs here (it is skipped locally).
- **build-web** / **build-cli** — build each workspace.
- **deploy-web** — `vercel deploy --prod` on `main` pushes (needs Vercel secrets).
- **publish-cli** — `npm publish` on version tags (needs `NPM_TOKEN`).

> **Verification status:** the `test` job mirrors the locally-green suite
> (15 suites / 153 tests + the E2E suite once a DB is present). The
> `build-web` / `build-cli` steps and the deploy/publish jobs require the
> respective toolchains/secrets and have not been executed in this
> environment — treat them as the intended pipeline, and confirm the first
> real run. In particular, a repo-wide `tsc` currently trips over
> `tsconfig.json`'s `"ignoreDeprecations": "6.0"` under TypeScript 5.9; if the
> CLI/web build hits that, reconcile the `ignoreDeprecations` value (or the TS
> version) before relying on the build jobs.
