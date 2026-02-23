# Research: Versioning & CI/CD Pipeline

**Feature**: 007-versioning-ci-cd
**Date**: 2026-02-22

## Research Questions

### R1: Which deployment platform for a free-tier SPA + Azure Functions monorepo?

**Decision**: Azure Static Web Apps (Free tier). Two separate SWA instances: one for dev, one for production (production deferred). Each free-tier SWA instance is an independent resource.

**Rationale**: Azure SWA is the only platform that requires zero code changes to the existing `api/` directory. The project uses `@azure/functions` v4 with `app.http()`, `HttpRequest`, and `HttpResponseInit` — these are Azure-specific APIs. Every alternative (Cloudflare, Vercel, Netlify) would require rewriting all three function files. Azure SWA also natively supports the `frontend/` + `api/` monorepo layout with `app_location` and `api_location` parameters, and the existing `staticwebapp.config.json` works as-is.

**Free tier limits (sufficient for project needs)**:
- 100 GB bandwidth/month
- 1,000,000 function invocations/month
- 500 MB storage
- Unlimited builds (uses GitHub Actions minutes — 2,000 free/month)
- HTTP triggers only (exactly what the project uses)
- 45-second function timeout

**Alternatives considered**:
- **Cloudflare Pages/Workers**: Pages was deprecated April 2025 in favor of Workers + Static Assets. Requires full API rewrite to Workers API. 10ms CPU time limit on free tier is too restrictive for AI API calls.
- **Vercel (Hobby)**: Requires full API rewrite to Vercel handler format. 150,000 function invocations/month (lowest ceiling). Hobby plan restricted to personal non-commercial use.
- **Netlify (Free)**: Requires full API rewrite. Credit-based pricing (300 credits/month) with hard limits — site pauses when exceeded. 300 build-minutes/month is the tightest build budget.

### R2: How to structure GitHub Actions workflows for this monorepo?

**Decision**: Four separate workflow files — `pr-check.yml`, `dev-branch.yml`, `main-branch.yml`, and `deploy.yml`. The architecture decouples verification/tagging (branch workflows) from deployment (tag-triggered deploy workflow).

**Rationale**: Each workflow has a distinct trigger and distinct behavior. PR checks validate code quality on pull requests. The dev workflow runs checks, auto-patches, and creates `-dev` tags. The main workflow creates production tags. The deploy workflow reacts to tag pushes, builds from the tagged commit, and deploys to the correct SWA instance. This separation means branch workflows know nothing about deployment, and the deploy workflow knows nothing about branches — only tags.

**PR check structure**: Two parallel jobs (`frontend-check`, `api-check`) on separate runners. Not a matrix strategy because frontend has lint and API does not. Both must pass for the PR check to succeed. Triggers on PRs to both `dev` and `main`.

**Dev check-and-tag structure**: Single job that runs checks (tsc, lint, test), increments patch, commits version back with `GITHUB_TOKEN` + `[skip ci]`, and creates an annotated `-dev` tag pushed with `TAG_PAT`. No build or deploy — that's the deploy workflow's job.

**Main tag structure**: Single job that reads version as-is (no increment), creates an annotated production tag (no `-dev` suffix) pushed with `TAG_PAT`, and guards against duplicate tags. No checks, no build, no deploy — main only receives verified code from dev.

**Deploy structure**: Tag-triggered workflow that watches for `v[0-9]+.[0-9]+.[0-9]+*` tag pushes. Checks out the tagged commit, determines the target environment from the tag pattern (`-dev` → dev SWA, no suffix → production SWA), builds the frontend with version injection, and deploys via `Azure/static-web-apps-deploy@v1`.

**Reference**: Pattern modeled after the Tonic project (`dev/clients/forte/tonic/`) which uses the same two-tier tag approach with separate dev and main workflows. Tonic uses Google Cloud Build triggers on tag patterns for deployment; this project uses a GitHub Actions deploy workflow triggered by tag pushes instead.

**Alternatives considered**:
- **Three files (no separate deploy)**: Build/deploy inline in branch workflows. Simpler but couples verification and deployment. Doesn't allow environment routing based on tag patterns.
- **Single workflow file with conditionals**: Viable but more complex to read and debug. No benefit for this project size.
- **Matrix strategy for PR checks**: Does not work cleanly because frontend and API have different commands (frontend has lint, API does not).
- **Platform-native tag watching (Azure SWA deployment center)**: SWA's deployment center is branch-based only; it cannot watch for tag patterns. GitHub Actions deploy workflow is the alternative.

### R3: Where to store the version and how to auto-increment?

**Decision**: A `version.json` file at the repo root containing `{ "version": "0.1.0" }`. The CI pipeline reads it, increments the patch, writes it back, and commits.

**Rationale**: A standalone JSON file is the simplest approach for a monorepo without a root `package.json`. It avoids conflating the version with any particular workspace. It's easy to read/write with `jq` in shell scripts and in Node.js.

**Version bump script**: A bash script (`scripts/bump-version.sh`) that accepts `major` or `minor` as an argument, resets lower segments to 0, and commits the change. The developer runs this manually when they want to bump major or minor.

**Auto-increment in CI**: The dev workflow reads `version.json`, increments patch with shell arithmetic, writes back with `jq`, and commits with `[skip ci]` in the message. The default `GITHUB_TOKEN` is used for the push — this prevents triggering another workflow run (double protection with `[skip ci]`). The main workflow reads `version.json` without incrementing — the version was already set by the dev workflow.

**Two-tier tagging**: Dev pushes create `v{version}-dev` annotated tags. Main pushes create `v{version}` annotated tags (no suffix). This provides clear traceability — you can always tell which tags are dev builds vs production releases. Not every dev tag will have a corresponding production tag (some dev builds may not make it to main).

**Alternatives considered**:
- **Root `package.json` version field**: Risks confusion about npm workspaces. The project intentionally has no root `package.json`.
- **Git tags only (no file)**: Harder to inject into the build, requires tag parsing in CI, version not visible in source control diffs.
- **npm version command**: Designed for single-package repos, awkward in a monorepo without a root `package.json`.

### R4: How to inject the version into the frontend build?

**Decision**: Use a `VITE_APP_VERSION` environment variable set during the CI build step. Vite automatically exposes `VITE_`-prefixed env vars via `import.meta.env`.

**Rationale**: This is the simplest approach — no changes to `vite.config.ts`, just set the env var in the CI step. For local development, the version defaults to `'dev'` when the env var is not set.

**Alternatives considered**:
- **Vite `define` option reading `version.json` at build time**: Works but requires importing `fs` and `path` in `vite.config.ts`. More complex than necessary.
- **Build-time code generation**: Over-engineering for a single string value.

### R5: How to avoid infinite CI loops from version bump commits, and how to trigger deploy from tags?

**Decision**: Version bump commits use `GITHUB_TOKEN` + `[skip ci]` (no retrigger). Tag pushes use a Personal Access Token (`TAG_PAT`) so they intentionally trigger the deploy workflow.

**Rationale**: Pushes made using the default `GITHUB_TOKEN` do NOT trigger further workflow runs (built-in GitHub safeguard). This is desirable for version bump commits (prevents infinite loops) but problematic for tag pushes (the deploy workflow would never trigger). The solution uses two different tokens for two different purposes:
- **Version bump commits** → pushed with `GITHUB_TOKEN` + `[skip ci]` → no retrigger (desired)
- **Tag pushes** → pushed with `TAG_PAT` (a PAT with `contents:write` scope) → triggers deploy.yml (desired)

The `TAG_PAT` has minimal scope (`contents:write` on this repo only) and is stored as a GitHub repo secret.

**Discovery**: GitHub's loop prevention applies to ALL events from `GITHUB_TOKEN`, including tag pushes. This was confirmed via GitHub community discussions (#25617, #27194). Without a PAT, the decoupled tag→deploy model cannot work.

**Alternatives considered**:
- **Commit message prefix filter (`if: !startsWith(...)`)**: Less robust, easy to bypass accidentally. Does not solve the tag trigger problem.
- **Reusable workflow called from branch workflows**: Would work but re-couples branch and deploy logic, defeating the purpose of decoupled architecture.
- **Inline deploy in branch workflows**: Simplest but eliminates the clean separation between verification and deployment.

### R6: How does Azure SWA handle API deployment?

**Decision**: Let the SWA action build the API itself (`api_location: api`, no `skip_api_build`).

**Rationale**: The SWA build pipeline for managed functions handles `function.json` generation and other Azure-specific concerns. Manually building the API and skipping the SWA build has a history of causing 500 errors on deployed functions (Azure/static-web-apps#1673). The API is small (3 functions) so the build is fast.

**Alternatives considered**:
- **Pre-build API and use `skip_api_build: true`**: Known to cause issues. Not worth the risk for minimal time savings.
