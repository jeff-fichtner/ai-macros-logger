# Implementation Plan: Versioning & CI/CD Pipeline

**Branch**: `007-versioning-ci-cd` | **Date**: 2026-02-22 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/007-versioning-ci-cd/spec.md`

## Summary

Add a GitHub Actions CI/CD pipeline and semantic versioning system to the monorepo. The architecture decouples verification/tagging from deployment: branch workflows (dev, main) run checks and create tags, while a separate deploy workflow triggers on tag pushes and builds from the tagged commit. PR checks run tests, type checking, and linting in parallel for frontend and API. Pushes to dev auto-increment the patch version and create a `v{version}-dev` tag. Pushes to main create a `v{version}` production tag. The deploy workflow watches for both tag patterns and deploys to the appropriate Azure SWA instance — dev SWA for `-dev` tags, production SWA (future) for release tags. Major/minor bumps are manual via a script.

## Technical Context

**Language/Version**: TypeScript 5.9, Node.js 20 LTS
**Primary Dependencies**: GitHub Actions, Azure Static Web Apps, `Azure/static-web-apps-deploy@v1` action, `jq` (CI only)
**Storage**: `version.json` at repo root (committed to git)
**Testing**: Vitest 3.2.4 (both workspaces), `npx tsc --noEmit` (type checking), `npm run lint` (frontend only)
**Target Platform**: Azure Static Web Apps (Free tier) — SPA + managed Azure Functions. Two instances planned: dev and production. Only dev is set up in this feature.
**Project Type**: Web application (frontend/ + api/ monorepo, no root package.json)
**Performance Goals**: PR checks complete within 5 minutes, deploys complete within 10 minutes
**Constraints**: Free tier only, two environments planned (dev now, production later)
**Scale/Scope**: Single developer, personal project, <100 builds/month

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Pre-Design | Post-Design | Notes |
|-----------|-----------|-------------|-------|
| I. Zero Server State | PASS | PASS | No server state added. Version is a build-time constant. |
| II. User-Owned Credentials | PASS | PASS | Deployment token is a repo secret, not a user credential. |
| III. Stateless Relay | PASS | PASS | No changes to Azure Function relay behavior. |
| IV. No Data Loss | PASS | PASS | No changes to data handling or parse result preservation. |
| V. Simplicity First | PASS | PASS | Four YAML files, one JSON file, one bash script. No frameworks. Separation of concerns justifies the extra file. |

## Project Structure

### Documentation (this feature)

```text
specs/007-versioning-ci-cd/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
.github/
└── workflows/
    ├── pr-check.yml          # PR validation: tests, types, lint (PRs to dev or main)
    ├── dev-branch.yml        # Dev: check, auto-patch, commit, tag v*.*.*-dev (no deploy)
    ├── main-branch.yml       # Main: tag v*.*.* (no patch, no deploy)
    └── deploy.yml            # Tag-triggered: build from tag, deploy to SWA (dev or production)

scripts/
└── bump-version.sh           # Manual major/minor version bump

version.json                   # Semantic version { "version": "0.1.0" }

frontend/
├── src/
│   ├── vite-env.d.ts         # Add VITE_APP_VERSION type declaration
│   └── pages/
│       └── Settings.tsx       # Display version (existing file, add version display)
└── (existing structure unchanged)

api/
└── (existing structure unchanged — no modifications)
```

**Structure Decision**: Existing monorepo layout with `frontend/` and `api/` is unchanged. New files are added at the repo root (`.github/`, `scripts/`, `version.json`).

## Architecture

### PR Check Workflow (`.github/workflows/pr-check.yml`)

**Trigger**: `pull_request` against `main` or `dev` (opened, synchronized, reopened)

**Jobs** (run in parallel on separate runners):

1. **`frontend-check`**: checkout → setup-node (cache npm, lockfile: `frontend/package-lock.json`) → `npm ci` → `npx tsc --noEmit` → `npm run lint` → `npm test`
2. **`api-check`**: checkout → setup-node (cache npm, lockfile: `api/package-lock.json`) → `npm ci` → `npx tsc --noEmit` → `npm test`

Both jobs must pass for the PR check to succeed. GitHub reports each job separately on the PR.

### Dev Workflow (`.github/workflows/dev-branch.yml`)

**Trigger**: `push` to `dev` (covers both direct pushes and PR merges)

**Purpose**: Verify code, increment version, create `-dev` tag. Does NOT build or deploy — that's the deploy workflow's job.

**Single job** (`check-and-tag`):

1. Checkout with full history (`fetch-depth: 0`)
2. Skip if commit message contains `[skip ci]` (version bump commits)
3. Setup Node.js 20 with npm cache for both lockfiles
4. Install dependencies (`npm ci` in frontend/ and api/)
5. Run checks: `npx tsc --noEmit` (both workspaces) + `npm run lint` (frontend) + `npm test` (both workspaces)
6. Read `version.json`, increment patch, write back → output new version
7. Commit `version.json` update and push to dev with `GITHUB_TOKEN` + `[skip ci]` (does not trigger another workflow)
8. Create annotated git tag `v{version}-dev` and push tag with `TAG_PAT` (triggers deploy.yml)

**Quality gate**: Checks (step 5) must pass before version increment or tagging. Every `-dev` tag represents verified code.

**Loop prevention for version commits**: Default `GITHUB_TOKEN` + `[skip ci]` in commit message (double protection). The version.json commit is pushed with `GITHUB_TOKEN` so it does not trigger another dev-branch.yml run.

**Tag push uses PAT**: Tags are pushed using a Personal Access Token (`TAG_PAT` secret) so that the tag push event triggers the deploy workflow. GitHub's loop prevention blocks `GITHUB_TOKEN`-based tag pushes from triggering other workflows, so the PAT is required for the decoupled tag→deploy model. The PAT has minimal scope (`contents:write` on this repo only).

### Main Workflow (`.github/workflows/main-branch.yml`)

**Trigger**: `push` to `main` (covers both direct pushes and PR merges)

**Purpose**: Create production tag. Does NOT build, deploy, or increment version.

**Single job** (`tag-production`):

1. Checkout with full history (`fetch-depth: 0`)
2. Read `version.json` → output current version (NO increment)
3. Check if tag `v{version}` already exists — skip tagging if so
4. Create annotated git tag `v{version}` (no `-dev` suffix) and push tag with `TAG_PAT` (triggers deploy.yml)

**No checks, no build, no deploy**: Main only receives code that was already verified on dev. The production tag push triggers the deploy workflow, which handles build and deployment to the production SWA instance (when configured).

### Deploy Workflow (`.github/workflows/deploy.yml`)

**Trigger**: `push` of tags matching `v[0-9]+.[0-9]+.[0-9]+*` (catches both `v1.2.3-dev` and `v1.2.3`)

**Purpose**: Build from tagged commit and deploy to the correct SWA instance. Knows nothing about branches — only reacts to tags.

**Single job** (`deploy`):

1. Checkout the tagged commit (`ref: ${{ github.ref }}`)
2. Determine environment from tag: if tag contains `-dev` → dev environment, else → production
3. Setup Node.js 20 with npm cache for both lockfiles
4. Install dependencies (`npm ci` in frontend/ and api/)
5. Extract version from tag name (strip `v` prefix and `-dev` suffix)
6. Build frontend with `VITE_APP_VERSION` env var set to extracted version
7. Deploy via `Azure/static-web-apps-deploy@v1`:
   - `app_location: frontend/dist` (pre-built)
   - `api_location: api` (SWA builds the API)
   - `skip_app_build: true`
   - `azure_static_web_apps_api_token`: select secret based on environment (`AZURE_STATIC_WEB_APPS_API_TOKEN` for dev, `AZURE_STATIC_WEB_APPS_API_TOKEN_PRODUCTION` for production)

**Environment routing**: The deploy workflow uses the tag pattern to determine which SWA instance to deploy to. For this feature, only the dev secret is configured. Production deploys will automatically work once the production SWA instance is created and the `_PRODUCTION` secret is added — no workflow changes needed.

**Decoupled architecture**: Branch workflows create tags. The deploy workflow reacts to tags. Neither knows about the other's internals. This means:
- Builds are always from a specific tagged commit (reproducible)
- The deploy workflow doesn't care which branch the code came from
- Adding a new environment is just: create SWA → add secret → the tag pattern already routes correctly

### Version Bump Script (`scripts/bump-version.sh`)

**Usage**: `./scripts/bump-version.sh major` or `./scripts/bump-version.sh minor`

**Behavior**:
- Reads current version from `version.json`
- For `major`: increments major, resets minor and patch to 0
- For `minor`: increments minor, resets patch to 0
- Writes updated `version.json`
- Commits with message `chore: bump version to X.Y.Z`
- Does NOT push (developer pushes manually or via PR)

### Version Display

The frontend Settings page displays the current version at the bottom. The version comes from `import.meta.env.VITE_APP_VERSION` at build time, defaulting to `'dev'` in local development.

## Data Flow

```
Developer runs bump-version.sh major/minor
  → version.json updated (e.g., 2.0.0)
  → committed to branch

Developer pushes to dev (directly or merges feature branch)
  → dev-branch.yml triggers (branch push)
  → runs checks (tsc, lint, test) — must pass
  → increments patch → 2.0.1
  → commits version.json (2.0.1) back to dev [skip ci]
  → creates + pushes annotated tag v2.0.1-dev
  → deploy.yml triggers (tag push)
    → checks out tag v2.0.1-dev
    → detects "-dev" → selects dev SWA token
    → builds frontend with VITE_APP_VERSION=2.0.1
    → deploys to dev Azure SWA

Next push to dev
  → dev-branch.yml: checks pass → patch 2.0.2 → tag v2.0.2-dev
  → deploy.yml: build from tag → deploy to dev SWA

Developer merges dev to main (via PR or direct push)
  → main-branch.yml triggers (branch push)
  → reads version.json (2.0.2) — NO increment
  → creates + pushes annotated tag v2.0.2
  → deploy.yml triggers (tag push)
    → checks out tag v2.0.2
    → no "-dev" → selects production SWA token
    → builds frontend with VITE_APP_VERSION=2.0.2
    → deploys to production Azure SWA (when configured)

```

## Key Decisions (from research.md)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Deployment platform | Azure Static Web Apps (Free) | Zero code changes to existing API; native monorepo support; existing SWA config works as-is |
| Workflow structure | Four separate files | PR checks, dev (check+tag), main (tag), deploy (build+deploy from tag). Decouples verification from deployment. |
| Deploy trigger | Tag-based, not branch-based | Deploy workflow reacts to tag pushes, builds from the tagged commit. Branch workflows only create tags. Clean separation of concerns. |
| PR check jobs | Parallel jobs (not matrix) | Frontend has lint, API does not; explicit jobs are clearer |
| Version storage | `version.json` at repo root | No root `package.json`; clean separation from workspace packages |
| Version injection | `VITE_APP_VERSION` env var | Simplest approach; no vite.config.ts changes needed |
| API build strategy | Let SWA build it | Avoids 500 errors from `skip_api_build`; SWA handles function.json generation |
| Tag strategy | `v{semver}-dev` on dev, `v{semver}` on main | Two-tier tags provide clear traceability; modeled after Tonic project patterns |
| Auto-patch scope | Dev only (not main) | Main receives version already incremented by dev; avoids double-incrementing |
| Loop prevention | `GITHUB_TOKEN` for commits, `TAG_PAT` for tags | Version commits use GITHUB_TOKEN (no retrigger). Tags use PAT (intentionally triggers deploy workflow). |

## Complexity Tracking

No constitution violations. No complexity justifications needed.
