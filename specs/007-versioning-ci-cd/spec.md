# Feature Specification: Versioning & CI/CD Pipeline

**Feature Branch**: `007-versioning-ci-cd`
**Created**: 2026-02-22
**Status**: Draft
**Input**: User description: "Versioning system and CI/CD pipeline. Add a semantic versioning system where major and minor versions are manually bumped by the developer (via a script or commit convention), and the patch/revision number is auto-incremented by the CI pipeline on each deploy. Set up GitHub Actions CI/CD that: (1) runs tests and type-checking on PRs, (2) builds and deploys to a single environment on merge to main. The project is a monorepo with frontend/ (React+Vite SPA) and api/ (Azure Functions v4). Currently both package.json files are at v0.0.0 with no CI/CD. The app is configured for Azure Static Web Apps (staticwebapp.config.json exists). Need a recommendation on where to deploy with a free tier - Azure Static Web Apps free tier is the natural fit since the project already has SWA config, but open to alternatives like Cloudflare Pages, Vercel, or Netlify if they offer better free tiers for this stack (SPA + serverless functions). Single environment only, no staging."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Automated Quality Checks on Pull Requests (Priority: P1)

A developer opens a pull request against the main branch. The CI system automatically runs the full test suite and type checking for both the frontend and API workspaces. The developer sees pass/fail status directly on the pull request without running anything locally. If checks fail, the developer can see which step failed and fix it before merging.

**Why this priority**: Without quality gates, every other feature (versioning, deployment) is built on unverified code. This is the foundation of the pipeline.

**Independent Test**: Open a PR with a passing codebase — verify checks run and pass. Open a PR with a type error — verify checks fail and report the failure.

**Acceptance Scenarios**:

1. **Given** a developer opens a pull request against main, **When** the PR is created, **Then** the CI system automatically runs tests and type checking for both frontend and API workspaces and reports pass/fail status on the PR.
2. **Given** the codebase has a failing test, **When** a PR is opened, **Then** the CI system reports the specific failure so the developer can identify and fix it.
3. **Given** all checks pass, **When** the developer views the PR, **Then** a green checkmark confirms the code is safe to merge.
4. **Given** a developer opens a pull request against dev, **When** the PR is created, **Then** the same CI checks run as for PRs against main.

---

### User Story 2 - Automated Build and Deploy on Push to Dev or Main (Priority: P2)

Whenever code lands on dev, the CI system runs checks, auto-increments the patch version, and creates a `v{version}-dev` tag. A separate deploy workflow reacts to the tag push, builds from the tagged commit, and deploys to the dev Azure Static Web Apps instance. The developer does not need to run any manual deployment steps. Pushes to main create a production tag (`v1.2.3`) which will trigger deployment to a separate production SWA instance (to be added later). The architecture decouples verification/tagging from deployment: branch workflows create tags, and the deploy workflow reacts to tag pushes.

**Why this priority**: Automated deployment eliminates manual steps and ensures the latest code is always deployed. Depends on quality checks (US1) for PR-based workflows, but also works for direct pushes where the developer takes responsibility for code quality.

**Independent Test**: Push a commit to dev — verify auto-patch increment, dev tag creation, and that the tag triggers a build and deploy. Push to main — verify production tag creation (no version change). Verify deploy workflow builds from the tagged commit and routes to the correct environment.

**Acceptance Scenarios**:

1. **Given** a commit is pushed to dev (directly or via PR merge), **When** the push event occurs, **Then** the CI system runs all checks first, and only if they pass does it auto-increment the patch version and create a `v{version}-dev` tag, which triggers a separate deploy workflow that builds from the tagged commit and deploys to the dev environment.
2. **Given** a commit is pushed to main (directly or via PR merge), **When** the push event occurs, **Then** the CI system creates a `v{version}` production tag WITHOUT incrementing the version. The tag push triggers the deploy workflow, which will deploy to the production environment (when configured).
3. **Given** the deploy workflow is triggered by a tag push, **When** it builds from the tagged commit, **Then** the deployed application reflects the code at that exact tag.
4. **Given** checks or build fail on dev, **When** the CI system detects the failure, **Then** it reports the error, does not increment the version, does not deploy, and does not create a tag.

---

### User Story 3 - Semantic Versioning with Manual Major/Minor and Auto Patch (Priority: P3)

A developer wants to track which version of the application is deployed. The version follows semantic versioning (MAJOR.MINOR.PATCH). The developer manually bumps major or minor versions via a script when introducing breaking changes or new features. The patch number auto-increments on each successful push to dev, so every dev deploy has a unique, traceable version. Pushes to main deploy the current version as-is (the version was already incremented when it went through dev). Two tag types provide traceability: `v1.2.3-dev` tags mark dev builds, `v1.2.3` tags mark production releases. The current version is visible in the deployed application.

**Why this priority**: Versioning provides traceability but is not essential for the CI/CD pipeline to function. It layers on top of the deployment flow.

**Independent Test**: Run `./scripts/bump-version.sh major` to produce version 1.0.0. Push to dev — verify the deployed version shows 1.0.1 and tag `v1.0.1-dev` is created. Push to dev again — verify 1.0.2 and `v1.0.2-dev`. Merge dev to main — verify `v1.0.2` tag (no `-dev` suffix, no increment). Run `./scripts/bump-version.sh minor` — verify 1.1.0. Next push to dev shows 1.1.1.

**Acceptance Scenarios**:

1. **Given** the current version is 1.0.3, **When** code is pushed to dev and deploys successfully, **Then** the version auto-increments to 1.0.4 and a `v1.0.4-dev` tag is created.
2. **Given** the current version is 1.0.4, **When** dev is merged to main, **Then** the version stays at 1.0.4 and a `v1.0.4` production tag is created.
3. **Given** the developer runs the version bump script with "minor", **When** the script completes, **Then** the version updates to 1.1.0 (resetting patch to 0).
4. **Given** the developer runs the version bump script with "major", **When** the script completes, **Then** the version updates to 2.0.0 (resetting minor and patch to 0).
5. **Given** a version has been set, **When** a user visits the deployed application, **Then** the current version is visible somewhere in the interface (e.g., footer or settings page).

---

### User Story 4 - Deployment Platform Recommendation (Priority: P4)

The developer needs to choose a hosting platform that supports the project's architecture (static SPA + serverless functions) on a free tier. The recommendation should account for the existing configuration, deployment simplicity, and long-term flexibility.

**Why this priority**: This is a one-time decision that informs the deployment configuration. The decision must be made before implementing US2 but is not a recurring user flow.

**Independent Test**: Evaluate platform options against the project's requirements and document the recommendation with rationale.

**Acceptance Scenarios**:

1. **Given** the project requires hosting for a static SPA and serverless functions, **When** the developer evaluates platform options, **Then** a documented recommendation identifies the best free-tier platform with rationale covering: free tier limits, monorepo support, serverless function compatibility, and deployment simplicity.

---

### Edge Cases

- What happens when a deploy fails partway through (frontend deploys but API fails)? The deploy workflow treats the deployment as atomic — if any part fails, the entire deployment is marked as failed and the developer is notified. The tag still exists (the code was verified), but the deployment failed.
- What happens when two pushes to dev happen in quick succession? Each push triggers its own branch workflow run, creating separate tags. Each tag triggers a separate deploy workflow run. The platform handles sequential deployments gracefully (queue or latest-wins).
- What happens when the version bump script is run but no deploy follows? The bumped version is committed to the repository. The next push to dev will auto-increment the patch from the bumped version.
- What happens when the CI pipeline runs but there are no code changes (e.g., documentation-only push)? The branch workflows still trigger on any push to dev or main. PR checks only trigger on PRs.
- What happens when the developer pushes directly to dev or main without a PR? The branch workflows run normally. For dev, the version is auto-incremented and a tag is created (triggering deploy). For main, a tag is created (triggering deploy when production is configured). PR checks are skipped (they only run on PRs).
- What happens when the free tier limits are exceeded? The developer is notified via platform alerts. The spec documents the free tier limits so the developer can monitor usage.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: CI system MUST automatically run tests for both frontend and API workspaces on every pull request to main or dev.
- **FR-002**: CI system MUST automatically run type checking for both frontend and API workspaces on every pull request to main or dev.
- **FR-003**: CI system MUST report pass/fail status on the pull request so developers can see results without leaving the PR.
- **FR-004**: CI system MUST run type checking, lint (frontend), and tests for both workspaces on any push to dev before building or deploying.
- **FR-005**: CI system MUST automatically build and deploy the artifacts to the appropriate environment when a version tag is pushed, using a deploy workflow that is decoupled from the branch workflows.
- **FR-006**: CI system MUST NOT increment the version, deploy, or create a tag if checks or build fail.
- **FR-007**: The project MUST use semantic versioning in the format MAJOR.MINOR.PATCH.
- **FR-008**: Developers MUST be able to manually bump the major or minor version via a script, which resets lower version segments to 0.
- **FR-009**: The CI pipeline MUST auto-increment the patch version on each successful push to dev only (not on push to main).
- **FR-010**: The current application version MUST be visible to users in the deployed application.
- **FR-011**: CI system MUST run lint checks for the frontend workspace on every pull request to main or dev.
- **FR-012**: The version MUST be stored in a way that is committed to the repository, so version history is tracked in source control.
- **FR-013**: The CI pipeline MUST create an annotated git tag `v{version}-dev` on each successful push to dev.
- **FR-014**: The CI pipeline MUST create an annotated git tag `v{version}` (no suffix) on each successful push to main.

### Key Entities

- **Version**: A semantic version identifier (MAJOR.MINOR.PATCH) representing the state of the application at a given deployment. Major and minor are developer-controlled; patch is pipeline-controlled (auto-incremented on dev pushes only).
- **Dev Tag**: An annotated git tag in the format `v{MAJOR}.{MINOR}.{PATCH}-dev` created on each successful push to dev. Marks a dev build.
- **Production Tag**: An annotated git tag in the format `v{MAJOR}.{MINOR}.{PATCH}` (no suffix) created on each successful push to main. Marks a production release.
- **Pipeline Run**: A single execution of a CI/CD workflow triggered by a PR event, a branch push, or a tag push. Contains status (pass/fail), trigger event, and associated version (for tag-triggered deploy runs).
- **Deployment**: The act of publishing built artifacts to an environment. Triggered by tag pushes: `-dev` tags deploy to the dev SWA instance, production tags deploy to the production SWA instance (to be added later).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every pull request to main or dev receives automated test and type-check results within 5 minutes of creation.
- **SC-002**: Every push to dev (direct or via PR merge) results in a successful deployment to the dev environment within 10 minutes, with zero manual steps.
- **SC-003**: Every push to dev produces a unique, auto-incremented version number with a `-dev` tag, and every push to main produces a production tag — both visible in git history.
- **SC-004**: Bumping major or minor version requires running a single command and produces a commit — no manual file editing.
- **SC-005**: The deployment platform's free tier supports the project's current usage (under 100 builds/month, under 100GB bandwidth/month).

## Assumptions

- The project repository is hosted on GitHub (GitHub Actions is the CI/CD platform).
- Two SWA environments are planned (dev and production), but only dev is set up in this feature. Production deploy will be added later.
- The developer is the sole contributor — no complex merge conflict or approval workflows are needed beyond basic quality gates.
- The free tier of the chosen platform is sufficient for the current scale (personal project, low traffic).
- Secrets (API keys, deployment tokens) will be stored in GitHub repository secrets.
- The existing `staticwebapp.config.json` is compatible with the chosen deployment platform or can be adapted during planning.
- Linting is included in PR checks alongside tests and type checking, as the project already has a lint script.

## Out of Scope

- Production deployment (will be a separate SWA instance added to the main workflow later). Dev environment is set up in this feature; production is deferred.
- Release notes or changelog generation.
- Rollback mechanisms (manual revert via git is sufficient).
- Branch protection rules or required reviewers (single developer).
- Performance monitoring, uptime alerts, or observability.
- Custom domain configuration (can be added later independently).
- Docker containerization or alternative build systems.
