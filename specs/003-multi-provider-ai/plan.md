# Implementation Plan: Multi-Provider AI Support

**Branch**: `003-multi-provider-ai` | **Date**: 2026-02-22 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/003-multi-provider-ai/spec.md`

## Summary

Add support for multiple AI providers (Claude, OpenAI, Gemini) for food parsing. Users configure one or more providers with API keys in Settings, select an active provider, and all parse requests route through that provider. The backend parse function dispatches to provider-specific handlers that normalize responses into the existing `AIParseResult` format. The frontend settings store changes from a single `claudeApiKey` to a provider list with per-provider keys. Existing Claude-only users auto-migrate.

## Technical Context

**Language/Version**: TypeScript 5.9, Node.js 20 LTS
**Primary Dependencies**: React 19, Vite 7, Zustand 5, Azure Functions v4, Tailwind CSS v4
**Storage**: Browser localStorage (Zustand persist), Google Sheets (data)
**Testing**: Vitest 3.x, @testing-library/react, happy-dom
**Target Platform**: Azure Static Web Apps (frontend), Azure Functions (backend)
**Project Type**: Web application (frontend SPA + serverless API)
**Performance Goals**: Parse response within provider's API latency + 500ms overhead
**Constraints**: Stateless backend (constitution), user-owned credentials (constitution), HTTPS only
**Scale/Scope**: Single user, 3 AI providers, ~10 files changed

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Zero Server State | PASS | Backend remains stateless; provider/key arrive in request body |
| II. User-Owned Credentials | PASS | All API keys stored in browser localStorage; sent only to the intended provider API |
| III. Stateless Relay | PASS | Parse handler dispatches to provider API and returns normalized response; no caching or session state |
| IV. No Data Loss | PASS | No change to parse result preservation or retry behavior |
| V. Simplicity First | PASS | Provider abstraction has 3 concrete use cases (Claude, OpenAI, Gemini); no framework or plugin system |

**Technology Constraint Note**: Constitution says "AI: Claude API via direct HTTP calls." This feature extends AI to include OpenAI and Gemini, also via direct HTTP calls. The user explicitly requested this expansion. The pattern (direct HTTP, user-provided key) remains the same.

## Project Structure

### Documentation (this feature)

```text
specs/003-multi-provider-ai/
├── plan.md              # This file
├── research.md          # Phase 0: Provider API research
├── data-model.md        # Phase 1: Data model changes
├── quickstart.md        # Phase 1: Dev setup guide
├── contracts/           # Phase 1: API contract changes
│   └── parse.md         # Updated parse endpoint contract
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
api/
├── src/
│   ├── functions/
│   │   └── parse.ts              # Refactor: dispatch to provider handlers
│   └── providers/                # NEW: provider-specific API handlers
│       ├── claude.ts             # Claude API handler (extract from parse.ts)
│       ├── openai.ts             # OpenAI API handler
│       └── gemini.ts             # Gemini API handler

frontend/
├── src/
│   ├── components/
│   │   ├── ProviderList.tsx      # NEW: provider list UI component
│   │   └── OnboardingGuide.tsx   # MODIFY: generalize step 1 from Claude-specific to multi-provider
│   ├── hooks/
│   │   ├── useSettings.ts        # MODIFY: provider list state
│   │   └── useFoodLog.ts         # MODIFY: update parse call to pass provider
│   ├── pages/
│   │   └── Settings.tsx          # MODIFY: provider management UI
│   ├── services/
│   │   └── claude.ts             # RENAME → parse.ts; update all imports (useFoodLog.ts, tests)
│   └── types/
│       └── index.ts              # MODIFY: add provider types
```

**Structure Decision**: Existing web application structure (frontend + api). New `providers/` directory at `api/src/providers/` (outside `functions/` to avoid Azure Functions auto-discovery treating them as HTTP endpoints). Each provider handler exports a single function with the same signature, keeping the dispatch in `parse.ts` simple.

## Complexity Tracking

No constitution violations. No complexity justifications needed.
