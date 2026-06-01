# Publishing the CLI to npm

The CLI is the `@qe/cli` workspace in `apps/cli`. It is a **scoped** package, so
the first publish (and CI publishes) must pass `--access public`.

## Pre-publish checklist

`apps/cli/package.json` currently declares `name`, `version`, `bin` (`qe`),
and a `tsc` build. Before the first real publish, confirm it also has:

- **`files`** — whitelist what ships, e.g. `["dist", "bin"]`, so source/tests
  aren't published.
- **`publishConfig`** — `{ "access": "public" }` (so you don't have to remember
  the flag), and optionally `"registry": "https://registry.npmjs.org"`.
- **`bin` target exists** — `./bin/qe-cli.js` must be present and executable
  (shebang `#!/usr/bin/env node`) and should require the built `dist/`.
- **`prepublishOnly`** — `"npm run build"` so `dist/` is fresh on publish.
- **`engines`** — e.g. `{ "node": ">=18" }`.

> These were intentionally **not** edited as part of Phase 10 because
> `apps/cli/package.json` had uncommitted work-in-progress at the time. Apply
> the above before publishing.

## Manual publish

```bash
# From the repo root:
npm run build --workspace=@qe/cli
npm publish --workspace=@qe/cli --access public
```

You must be logged in (`npm login`) with rights to the `@qe` scope.

## Automated publish (CI)

The `publish-cli` job in `.github/workflows/ci-cd.yml` runs on pushed tags:

```bash
# Bump apps/cli/package.json "version" first, then:
git tag v1.0.0
git push origin v1.0.0
```

The job builds the CLI and runs `npm publish --workspace=@qe/cli --access public`
using the `NPM_TOKEN` repository secret (an npm Automation token with publish
rights to `@qe`).

## Install & usage (consumers)

```bash
npm install -g @qe/cli
qe run --framework cucumber --project ./features
```
