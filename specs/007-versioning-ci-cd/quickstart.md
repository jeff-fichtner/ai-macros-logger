# Quickstart: Versioning & CI/CD Pipeline

**Feature**: 007-versioning-ci-cd
**Date**: 2026-02-22

## Scenario 1: PR Check — All Passing

1. Developer creates a feature branch and pushes changes
2. Developer opens a PR against `dev` (or `main`)
3. GitHub Actions triggers the PR check workflow
4. Two parallel jobs run: `frontend-check` (tsc + lint + test) and `api-check` (tsc + test)
5. Both jobs pass — green checkmarks appear on the PR
6. Developer merges the PR

## Scenario 2: PR Check — Test Failure

1. Developer opens a PR with a failing test in `frontend/`
2. GitHub Actions triggers the PR check workflow
3. `frontend-check` job fails at the test step — red X on the PR
4. `api-check` job passes independently — green checkmark
5. Developer sees the specific test failure in the job logs
6. Developer fixes the test, pushes again
7. Both jobs pass on the new push — PR is ready to merge

## Scenario 3: Deploy on Push to Dev (Auto-Patch)

1. Developer pushes to `dev` (directly or via PR merge)
2. GitHub Actions triggers the dev workflow (`dev-branch.yml`)
3. Workflow runs checks: `tsc --noEmit` (both) + `npm run lint` (frontend) + `npm test` (both) — must pass
4. Workflow reads `version.json` (e.g., `1.0.3`), increments patch to `1.0.4`
5. Workflow commits updated `version.json` (`1.0.4`) back to `dev` with `GITHUB_TOKEN` + `[skip ci]`
6. Workflow creates annotated tag `v1.0.4-dev` and pushes it with `TAG_PAT`
7. Tag push triggers the deploy workflow (`deploy.yml`)
8. Deploy workflow checks out tag `v1.0.4-dev`, detects `-dev` → selects dev SWA token
9. Deploy workflow builds frontend with `VITE_APP_VERSION=1.0.4`
10. Deploy workflow deploys frontend (pre-built) + API (SWA-built) to dev Azure Static Web Apps

## Scenario 4: Tag on Push to Main (No Patch)

1. Developer merges `dev` into `main` (via PR or direct push)
2. GitHub Actions triggers the main workflow (`main-branch.yml`)
3. Workflow reads `version.json` (e.g., `1.0.4`) — NO increment
4. Workflow creates annotated tag `v1.0.4` (no `-dev` suffix) and pushes it with `TAG_PAT`
5. Tag push triggers the deploy workflow (`deploy.yml`)
6. Deploy workflow checks out tag `v1.0.4`, no `-dev` → selects production SWA token
7. Deploy workflow builds and deploys to production Azure SWA (when configured)

## Scenario 5: Manual Version Bump (Minor)

1. Developer has been deploying patches on dev: version is at `1.0.7`
2. Developer runs: `./scripts/bump-version.sh minor`
3. Script updates `version.json` to `1.1.0` and commits
4. Developer pushes to dev — version auto-increments to `1.1.1`, tag `v1.1.1-dev` created
5. Developer later merges dev to main — tag `v1.1.1` created (no increment)

## Scenario 6: Manual Version Bump (Major)

1. Current version is `1.3.12`
2. Developer runs: `./scripts/bump-version.sh major`
3. Script updates `version.json` to `2.0.0` and commits
4. After push to dev, version becomes `2.0.1`, tag `v2.0.1-dev` created

## Scenario 7: Check Failure on Dev (No Tag, No Deploy)

1. Developer pushes to `dev`
2. Dev workflow starts — checks fail (e.g., TypeScript error or failing test)
3. Version is NOT incremented (checks must pass first)
4. Tag is NOT created (no tag = no deploy triggered)
5. Developer sees the failure in GitHub Actions, fixes and re-pushes

## Scenario 8: Version Visible in App

1. User visits the deployed application
2. User navigates to the Settings page
3. The current version (e.g., `1.0.4`) is displayed at the bottom of the page

## Scenario 9: First-Time Setup (Dev Environment)

1. Developer creates an Azure Static Web App resource in Azure Portal (Free tier) for the dev environment
2. Developer copies the deployment token from Azure Portal
3. Developer adds the token as `AZURE_STATIC_WEB_APPS_API_TOKEN` in GitHub repo secrets
4. Developer creates a Personal Access Token with `contents:write` scope and adds it as `TAG_PAT` in GitHub repo secrets
5. Developer pushes the workflow files and `version.json` to `dev`
6. First dev workflow runs checks, patches version, creates `v0.1.1-dev` tag
7. Tag push triggers deploy workflow — dev app is live
8. (Future: repeat steps 1-3 for a production SWA instance with `AZURE_STATIC_WEB_APPS_API_TOKEN_PRODUCTION`)
