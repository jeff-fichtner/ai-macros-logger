# Implementation Plan: AI Macro Nutrition Logger

**Branch**: `001-macro-nutrition-logger` | **Date**: 2026-02-20 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-macro-nutrition-logger/spec.md`

## Summary

Build an AI-powered macro nutrition logger as a static SPA (React + Vite) with a stateless Azure Functions relay. Users provide their own Claude API key and Google OAuth credentials. Natural language food descriptions are parsed into structured macro data via Claude's tool_use API and logged to the user's Google Sheet. All credentials stored client-side in localStorage. Deployed via Azure Static Web Apps with managed functions.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20 LTS
**Primary Dependencies**: React 19, Vite, React Router v7, Zustand, Tailwind CSS v4, Azure Functions v4 (Node.js model)
**Storage**: Google Sheets API (user-owned spreadsheet), localStorage (client-side credentials and settings)
**Testing**: Vitest + @testing-library/react (service and hook tests)
**Target Platform**: Modern browsers (Chrome, Firefox, Safari, Edge) on desktop and mobile
**Project Type**: Web application (frontend SPA + serverless API)
**Performance Goals**: Food description to parsed results in under 10 seconds (SC-001)
**Constraints**: Zero server-side state, all credentials user-provided, HTTPS only
**Scale/Scope**: 1-10 users, 2 pages, 3 API endpoints, ~50 entries/day/user max

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. Zero Server State | PASS | Azure Function is stateless relay. No databases, file storage, env vars with secrets, or caching. Every request is self-contained. |
| II. User-Owned Credentials | PASS | All secrets (Claude API key, Google OAuth client ID/secret, tokens, Sheet ID) stored in localStorage. Transmitted only to intended APIs (Claude, Google) via HTTPS. |
| III. Stateless Relay | PASS | Azure Function accepts credentials in request body, forwards to Claude/Google, returns response. No business logic, caching, queuing, or session state. Google Sheets read/write called directly from browser (CORS supported). |
| IV. No Data Loss | PASS | Parsed AI results displayed immediately. Sheets write failure preserves parsed data on screen with retry button (US4). |
| V. Simplicity First | PASS | No SDKs (direct fetch to APIs), no agent frameworks, no server-side auth/DB. Two pages, four endpoints. |

**Technology Constraints compliance:**
- Frontend: React + Vite static SPA, no SSR. Azure Static Web Apps. ✅
- Backend: Azure Functions (managed, single function app). No additional Azure services. ✅
- AI: Claude API via direct HTTP. User's key. ✅
- Data: Google Sheets API. Single "Log" sheet, reverse chronological at row 2. ✅
- Communication: HTTPS only. No WebSockets/polling/SSE. ✅
- Package management: npm. No additional build systems. ✅

## Project Structure

### Documentation (this feature)

```text
specs/001-macro-nutrition-logger/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── api.md
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── pages/
│   │   ├── FoodLog.tsx
│   │   └── Settings.tsx
│   ├── components/
│   │   ├── Layout.tsx
│   │   ├── FoodInput.tsx
│   │   ├── ParseResult.tsx
│   │   ├── MacroSummary.tsx
│   │   ├── EntryHistory.tsx
│   │   └── OnboardingGuide.tsx
│   ├── hooks/
│   │   ├── useSettings.ts
│   │   ├── useFoodLog.ts
│   │   └── useGoogleAuth.ts
│   ├── services/
│   │   ├── api.ts
│   │   ├── claude.ts
│   │   ├── sheets.ts
│   │   └── oauth.ts
│   ├── types/
│   │   └── index.ts
│   ├── App.tsx
│   └── main.tsx
├── public/
│   └── staticwebapp.config.json
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tsconfig.app.json
└── tailwind.css

api/
├── src/
│   ├── functions/
│   │   ├── parse.ts
│   │   ├── oauthToken.ts
│   │   └── oauthRefresh.ts
│   └── index.ts
├── host.json
├── package.json
└── tsconfig.json
```

**Structure Decision**: Web application layout with `frontend/` and `api/` directories. The `api/` directory is recognized by Azure Static Web Apps as the managed functions backend. Google Sheets read/write is called directly from the browser (CORS supported), so no `sheetsWrite` function is needed in the API — only Claude relay and OAuth token operations.

## Complexity Tracking

No constitution violations. No complexity justifications needed.
