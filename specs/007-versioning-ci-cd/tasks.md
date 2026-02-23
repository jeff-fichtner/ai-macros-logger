# Tasks: Versioning & CI/CD Pipeline

**Input**: Design documents from `/specs/007-versioning-ci-cd/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, quickstart.md

**Tests**: Not requested in the feature specification. No test tasks included.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Create the foundational files that all workflows and user stories depend on

- [ ] T001 Create `version.json` at repo root with initial version `{ "version": "0.1.0" }`
- [ ] T002 Create directory structure: `.github/workflows/` and `scripts/`

**Checkpoint**: Directory structure and version file exist. All subsequent phases can reference these paths.

---

## Phase 2: User Story 4 — Deployment Platform Recommendation (Priority: P4)

**Goal**: Document the platform decision (Azure Static Web Apps) so deployment workflows can be implemented with confidence.

**Independent Test**: The recommendation exists in `research.md` (R1). No implementation needed — this was resolved during planning.

- [X] T003 [US4] Platform recommendation documented in `specs/007-versioning-ci-cd/research.md` (R1: Azure Static Web Apps Free tier). Already complete from planning phase — no implementation task.

**Checkpoint**: Platform decision is documented. US2 (deploy workflow) can proceed using Azure SWA.

---

## Phase 3: User Story 1 — Automated Quality Checks on Pull Requests (Priority: P1)

**Goal**: PRs to dev or main automatically run tsc, lint (frontend), and tests for both workspaces. Pass/fail status reported on the PR.

**Independent Test**: Open a PR with passing code — verify green checks. Push a commit with a type error — verify the job fails and reports the error.

### Implementation

- [ ] T004 [US1] Create PR check workflow in `.github/workflows/pr-check.yml` with two parallel jobs (`frontend-check` and `api-check`). Trigger on `pull_request` to `main` and `dev` (opened, synchronize, reopened). `frontend-check`: checkout → setup-node 20 (cache npm, lockfile `frontend/package-lock.json`) → `npm ci` in `frontend/` → `npx tsc --noEmit` → `npm run lint` → `npm test`. `api-check`: checkout → setup-node 20 (cache npm, lockfile `api/package-lock.json`) → `npm ci` in `api/` → `npx tsc --noEmit` → `npm test`. Both jobs must pass.

**Checkpoint**: PR check workflow is complete. Opening a PR against dev or main triggers parallel checks.

---

## Phase 4: User Story 2 — Automated Build and Deploy on Push to Dev or Main (Priority: P2)

**Goal**: Pushes to dev run checks, increment patch, create `-dev` tag. Pushes to main create production tag. A separate deploy workflow reacts to tag pushes, builds from the tagged commit, and deploys to the correct Azure SWA instance.

**Independent Test**: Push to dev — verify checks run, version increments, `-dev` tag created, deploy workflow triggers and deploys. Push to main — verify production tag created, deploy workflow triggers (production deploy when configured).

### Implementation

- [ ] T005 [P] [US2] Create dev branch workflow in `.github/workflows/dev-branch.yml`. Trigger on `push` to `dev`. Single job `check-and-tag`: (1) checkout with `fetch-depth: 0`, (2) skip if commit message contains `[skip ci]`, (3) setup-node 20 with npm cache for both lockfiles, (4) `npm ci` in `frontend/` and `api/`, (5) run checks: `npx tsc --noEmit` in both workspaces + `npm run lint` in `frontend/` + `npm test` in both workspaces, (6) read `version.json`, increment patch with shell arithmetic, write back with `jq`, (7) git commit `version.json` and push to dev using `GITHUB_TOKEN` with `[skip ci]` in commit message, (8) create annotated git tag `v{version}-dev` and push tag using `TAG_PAT` secret.
- [ ] T006 [P] [US2] Create main branch workflow in `.github/workflows/main-branch.yml`. Trigger on `push` to `main`. Single job `tag-production`: (1) checkout with `fetch-depth: 0`, (2) read `version.json` — no increment, (3) check if tag `v{version}` already exists — skip if so, (4) create annotated git tag `v{version}` (no `-dev` suffix) and push tag using `TAG_PAT` secret.
- [ ] T007 [US2] Create deploy workflow in `.github/workflows/deploy.yml`. Trigger on tag push matching `v[0-9]+.[0-9]+.[0-9]+*`. Single job `deploy`: (1) checkout the tagged commit (`ref: ${{ github.ref }}`), (2) determine environment from tag — if contains `-dev` then dev else production, (3) setup-node 20 with npm cache for both lockfiles, (4) `npm ci` in `frontend/` and `api/`, (5) extract version from tag name (strip `v` prefix and `-dev` suffix), (6) build frontend with `VITE_APP_VERSION` env var set to extracted version (`npm run build` in `frontend/`), (7) deploy via `Azure/static-web-apps-deploy@v1` with `app_location: frontend/dist`, `api_location: api`, `skip_app_build: true`, and `azure_static_web_apps_api_token` selected by environment (`AZURE_STATIC_WEB_APPS_API_TOKEN` for dev, `AZURE_STATIC_WEB_APPS_API_TOKEN_PRODUCTION` for production).

**Checkpoint**: All four workflows exist. The full chain works: push to dev → checks → patch → tag → deploy. Push to main → tag → deploy (when production configured).

---

## Phase 5: User Story 3 — Semantic Versioning with Manual Major/Minor and Auto Patch (Priority: P3)

**Goal**: Developer can manually bump major/minor via script. Version is visible in the deployed app. Auto-patch is already handled by the dev workflow (T005).

**Independent Test**: Run `./scripts/bump-version.sh minor` — verify `version.json` updates and commits. Check Settings page — verify version displays (or `'dev'` locally).

### Implementation

- [ ] T008 [P] [US3] Create version bump script at `scripts/bump-version.sh`. Accept `major` or `minor` as argument. Read current version from `version.json`, increment the specified segment, reset lower segments to 0, write back with `jq`, and git commit with message `chore: bump version to X.Y.Z`. Do NOT push. Make executable (`chmod +x`).
- [ ] T009 [P] [US3] Add `VITE_APP_VERSION` type declaration in `frontend/src/vite-env.d.ts`. Declare `interface ImportMetaEnv { readonly VITE_APP_VERSION: string }` and `interface ImportMeta { readonly env: ImportMetaEnv }`.
- [ ] T010 [US3] Add version display to the Settings page in `frontend/src/pages/Settings.tsx`. Read `import.meta.env.VITE_APP_VERSION` (default to `'dev'`). Display at the bottom of the page as small muted text (e.g., `v{version}`).

**Checkpoint**: Bump script works, version shows in Settings page, type declaration exists.

---

## Phase 6: Polish & Validation

**Purpose**: Verify the full pipeline works end-to-end and ensure all artifacts are consistent.

- [ ] T011 Verify all workflow YAML files are valid by running `cd frontend && npx tsc --noEmit && npm run lint && npm test` and `cd api && npx tsc --noEmit && npm test` locally to confirm the same checks the CI will run still pass.
- [ ] T012 Run quickstart scenario validation: review each scenario in `specs/007-versioning-ci-cd/quickstart.md` against the implemented workflow files and confirm the steps match the actual YAML logic.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (US4 Platform)**: Already complete from planning — no implementation needed
- **Phase 3 (US1 PR Check)**: Depends on Phase 1 (directory structure exists)
- **Phase 4 (US2 Deploy)**: Depends on Phase 1 (`version.json` exists). Independent of US1 (PR check is a separate workflow)
- **Phase 5 (US3 Versioning)**: T008 (bump script) is independent. T009/T010 (version display) are independent. Auto-patch logic is embedded in T005 (dev workflow)
- **Phase 6 (Polish)**: Depends on all user stories being complete

### User Story Dependencies

- **US4 (Platform)**: Already resolved — no dependencies
- **US1 (PR Check)**: Independent — only creates `pr-check.yml`
- **US2 (Deploy)**: Independent — creates `dev-branch.yml`, `main-branch.yml`, `deploy.yml`. Uses `version.json` from Phase 1
- **US3 (Versioning)**: T008 (bump script) is independent. T010 (Settings display) is independent. Auto-patch is part of US2's dev workflow (T005)

### Within Each User Story

- US1: Single task (T004)
- US2: T005 and T006 can run in parallel [P]. T007 (deploy.yml) depends on understanding the tag patterns from T005/T006 but touches a different file — can be written in parallel
- US3: T008, T009, and T010 — T008 and T009 can run in parallel [P]. T010 depends on T009 (needs the type declaration)

### Parallel Opportunities

```text
After Phase 1 (T001, T002):

  Parallel batch 1:
    T004 [US1] — pr-check.yml
    T005 [US2] — dev-branch.yml
    T006 [US2] — main-branch.yml
    T008 [US3] — bump-version.sh
    T009 [US3] — vite-env.d.ts

  Then:
    T007 [US2] — deploy.yml
    T010 [US3] — Settings.tsx version display

  Then:
    T011, T012 — validation
```

---

## Implementation Strategy

### MVP First (US1 Only)

1. Complete Phase 1: Setup (T001, T002)
2. Complete Phase 3: US1 — PR Check (T004)
3. **STOP and VALIDATE**: Push workflow to GitHub, open a test PR, confirm checks run

### Incremental Delivery

1. Setup (T001, T002) → Foundation ready
2. Add US1 (T004) → PR checks work → First CI capability
3. Add US2 (T005, T006, T007) → Full deploy pipeline → Automated deployment
4. Add US3 (T008, T009, T010) → Versioning complete → Version visible in app
5. Polish (T011, T012) → Validated and confirmed

---

## Notes

- All workflow files are independent YAML files — no shared code means maximum parallelism
- US4 (Platform Recommendation) was resolved during the planning phase and requires no implementation
- The deploy workflow (T007) is the keystone — it ties the tag-triggered architecture together
- GitHub secrets (`AZURE_STATIC_WEB_APPS_API_TOKEN`, `TAG_PAT`) must be configured manually before first deploy
- The `[skip ci]` + `GITHUB_TOKEN` pattern for version commits is critical for loop prevention
