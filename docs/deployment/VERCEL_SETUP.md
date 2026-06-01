# Vercel Setup (Web App)

The Next.js web app lives in `apps/web` inside an npm-workspaces monorepo. The
committed `vercel.json` at the repo root builds the `@qe/web` workspace.

## One-time setup

1. **Import the project**
   - Go to <https://vercel.com/new> and import the GitHub repository.
   - **Root Directory:** leave as the repository root. `vercel.json` handles the
     monorepo build:
     ```json
     {
       "framework": "nextjs",
       "installCommand": "npm install",
       "buildCommand": "npm run build --workspace=@qe/web",
       "outputDirectory": "apps/web/.next"
     }
     ```
     (Alternatively, set Root Directory to `apps/web` and remove the custom
     build/output settings — but then Vercel won't install workspace-hoisted
     deps, so the root-level approach above is preferred here.)

2. **Environment variables** (Project → Settings → Environment Variables):
   | Key | Example | Notes |
   |-----|---------|-------|
   | `NEXT_PUBLIC_API_URL` | `https://api.your-domain.com` | Public URL of the Express backend (no trailing `/api`) |
   | `NEXTAUTH_SECRET` | `openssl rand -base64 32` | Session encryption |
   | `NEXTAUTH_URL` | `https://your-domain.vercel.app` | Deployment URL |

   > The web app reaches the backend over HTTP; it does not use `DATABASE_URL`
   > or `CLAUDE_API_KEY` directly. Those belong to the backend service.

3. **Deploy** — push to `main`, or click Deploy. The CI `deploy-web` job also
   runs `vercel deploy --prod` using `VERCEL_TOKEN`, `VERCEL_ORG_ID`,
   `VERCEL_PROJECT_ID` secrets.

## CI deploy secrets

Add these GitHub Actions repository secrets for the `deploy-web` job:

- `VERCEL_TOKEN` — Vercel account token (Account Settings → Tokens).
- `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` — from `.vercel/project.json` after a
  first `vercel link`, or from the project settings.

## Notes

- The **backend is not deployed to Vercel**. Host the Express server separately
  (see [DEPLOYMENT.md](./DEPLOYMENT.md)) and point `NEXT_PUBLIC_API_URL` at it.
- SSE streaming (`/api/test/:id/stream`) needs a long-running server, which is
  another reason the backend lives off-Vercel.
