# Data Model: Versioning & CI/CD Pipeline

**Feature**: 007-versioning-ci-cd
**Date**: 2026-02-22

## Overview

This feature introduces one new persistent file (`version.json`) and one build-time constant. No database entities, no API changes, no runtime state.

## Persistent Data

### Version File (`version.json` at repo root)

| Field | Type | Description |
|-------|------|-------------|
| version | `string` | Semantic version in `MAJOR.MINOR.PATCH` format |

**Lifecycle**:
- Created: Once during initial setup (set to `0.1.0`)
- Updated (manual): Developer runs `scripts/bump-version.sh major|minor` — resets lower segments to 0, commits
- Updated (automated): Dev workflow increments patch after checks pass, commits with `[skip ci]`, then creates tag
- Read-only on main: Main workflow reads version as-is (no increment)

**Example**:
```json
{ "version": "1.2.15" }
```

### Git Tags

| Tag Format | Created By | Example | Meaning |
|------------|-----------|---------|---------|
| `v{MAJOR}.{MINOR}.{PATCH}-dev` | Dev workflow (on push to dev) | `v1.2.3-dev` | Dev build |
| `v{MAJOR}.{MINOR}.{PATCH}` | Main workflow (on push to main) | `v1.2.3` | Production release |

**Lifecycle**:
- Dev tags: Created automatically on every successful push to dev (after checks pass and version increment). Pushed with `TAG_PAT` to trigger the deploy workflow.
- Production tags: Created automatically on every successful push to main (version already set by dev). Pushed with `TAG_PAT` to trigger the deploy workflow.
- Tag pushes trigger the deploy workflow, which builds from the tagged commit and deploys to the appropriate SWA instance.
- Not every dev tag will have a corresponding production tag (some dev builds may not make it to main)

## Build-Time Data

### Application Version Constant

| Source | Injection | Access |
|--------|-----------|--------|
| `version.json` | `VITE_APP_VERSION` env var set during CI build | `import.meta.env.VITE_APP_VERSION` in frontend code |

**Local development**: Falls back to `'dev'` when env var is not set.

## Configuration Data (GitHub Secrets)

| Secret | Purpose | Set By |
|--------|---------|--------|
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | Deployment token for dev SWA instance | Developer (one-time, from Azure Portal) |
| `AZURE_STATIC_WEB_APPS_API_TOKEN_PRODUCTION` | Deployment token for production SWA instance (future) | Developer (when production environment is created) |
| `TAG_PAT` | Personal Access Token (`contents:write` scope) for pushing tags that trigger the deploy workflow | Developer (one-time, from GitHub Settings) |

## No Changes to Existing Entities

- **FoodEntry**: Unchanged
- **AIParseResult**: Unchanged
- **API endpoints**: Unchanged (no new endpoints, no modified contracts)
- **Google Sheets schema**: Unchanged
