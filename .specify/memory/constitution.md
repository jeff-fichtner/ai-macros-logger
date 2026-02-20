<!--
  Sync Impact Report
  ===================
  Version change: N/A → 1.0.0 (initial ratification)
  Added principles:
    - I. Zero Server State
    - II. User-Owned Credentials
    - III. Stateless Relay
    - IV. No Data Loss
    - V. Simplicity First
  Added sections:
    - Technology Constraints
    - Development Workflow
  Templates requiring updates:
    - .specify/templates/plan-template.md — ✅ no changes needed (Constitution Check is dynamic)
    - .specify/templates/spec-template.md — ✅ no changes needed (template is generic)
    - .specify/templates/tasks-template.md — ✅ no changes needed (template is generic)
  Follow-up TODOs: none
-->

# AI Macros Logger Constitution

## Core Principles

### I. Zero Server State

The serverless backend MUST NOT persist any data: no databases, no
file storage, no environment variables containing user secrets, no
caching layers. Every request is self-contained — credentials and
context arrive in the request body and leave in the response. If a
component requires server-side state, it is out of scope until the
architecture is explicitly revised.

### II. User-Owned Credentials

All secrets (Claude API key, Google OAuth client ID/secret, OAuth
tokens, Google Sheet ID) MUST be provided by the user and stored
exclusively in the user's browser (`localStorage`). The application
MUST NOT store, log, or transmit credentials to any destination other
than the intended third-party API (Claude, Google). Credentials MUST
be sent over HTTPS only.

### III. Stateless Relay

The Azure Function acts as a thin proxy. It MUST:
- Accept user credentials and payload in the request
- Forward to the appropriate third-party API (Claude or Google Sheets)
- Return the response to the client
- Perform OAuth token exchange/refresh using user-provided client credentials

It MUST NOT: add business logic beyond request formatting, cache
responses, queue work, or maintain session state.

### IV. No Data Loss

Parsed AI results MUST be preserved and displayed to the user even
when downstream writes fail. If the Google Sheets API call fails after
Claude returns a successful parse, the app MUST keep the parsed data
visible with a retry option. The user MUST never need to re-enter
input due to a transient API failure.

### V. Simplicity First

Prefer the simplest solution that works for the current use case.
Do not build for hypothetical future requirements. Specific
constraints:
- No abstractions without at least two concrete use cases
- No agent frameworks, orchestrators, or middleware unless a single
  API call is demonstrably insufficient
- No server-side auth, databases, or user management until explicitly
  required
- Features removed from scope stay removed until revisited with a
  new spec

## Technology Constraints

- **Frontend**: Static SPA built with React and Vite. No SSR.
  Deployed as static files to Azure Static Web Apps.
- **Backend**: Azure Functions (single function). No additional Azure
  services unless explicitly approved.
- **AI**: Claude API via direct HTTP calls. User provides their own
  API key.
- **Data**: Google Sheets API. One spreadsheet per user, single "Log"
  sheet, reverse chronological insertion at row 2.
- **All communication**: HTTPS only. No WebSockets, no polling, no
  server-sent events.
- **Package management**: Use standard tooling for the ecosystem
  (npm/pnpm for frontend, NuGet/pip for functions as applicable).
  Do not introduce additional build systems.

## Development Workflow

- Features follow the speckit pipeline: `/specify` → `/plan` →
  `/tasks` → `/implement`.
- Each user story MUST be independently testable and deliverable.
- Commits SHOULD be granular — one logical change per commit.
- The `main` branch MUST always be deployable. Feature work happens
  on feature branches merged via PR.
- No secrets, API keys, or credentials committed to the repository.
  Use `.gitignore` and `.env.example` patterns.

## Governance

This constitution defines the non-negotiable architectural and
process constraints for the AI Macros Logger project. All feature
specs, implementation plans, and code reviews MUST verify compliance
with these principles.

Amendments require:
1. A documented rationale for the change
2. An updated constitution version following semver
3. Review of all dependent specs and plans for impact

Complexity beyond what these principles allow MUST be justified in
the plan's Complexity Tracking table with a specific reason why the
simpler approach is insufficient.

**Version**: 1.0.0 | **Ratified**: 2026-02-20 | **Last Amended**: 2026-02-20
