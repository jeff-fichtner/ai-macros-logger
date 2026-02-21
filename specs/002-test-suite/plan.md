# Implementation Plan: Comprehensive Test Suite

**Branch**: `002-test-suite` | **Date**: 2026-02-21 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/002-test-suite/spec.md`

## Summary

Add Vitest-based unit and integration tests for all 10 modules in the AI Macro Nutrition Logger: 4 frontend services, 3 frontend hooks, and 3 Azure Functions. All external HTTP calls are mocked. Test files are colocated with source. The suite targets 64+ tests completing in under 10 seconds.

## Technical Context

**Language/Version**: TypeScript 5.9, Node.js 20 LTS
**Primary Dependencies**: Vitest 3.x, @testing-library/react, happy-dom
**Storage**: N/A (test-only feature)
**Testing**: Vitest 3.x (frontend + API)
**Target Platform**: Local development (macOS, Linux)
**Project Type**: Web application (frontend + API, two separate npm projects)
**Performance Goals**: Full suite < 10 seconds
**Constraints**: No real HTTP requests, deterministic time control, no test ordering dependencies
**Scale/Scope**: 10 test files, 64+ test cases

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Zero Server State | PASS | No server state added. Tests mock all external calls. |
| II. User-Owned Credentials | PASS | Tests use fake credentials. No real secrets. |
| III. Stateless Relay | PASS | Azure Function tests verify relay behavior without adding logic. |
| IV. No Data Loss | PASS | useFoodLog integration tests verify parsed data preservation on write failure. |
| V. Simplicity First | PASS | Minimal dependencies: Vitest + happy-dom + @testing-library/react. No MSW, no nock, no test frameworks beyond what's needed. |

**Post-Phase 1 Re-check**: All gates still pass. No new dependencies or patterns introduced beyond what's listed above.

## Project Structure

### Documentation (this feature)

```text
specs/002-test-suite/
├── plan.md              # This file
├── research.md          # Phase 0: technology decisions
├── data-model.md        # Phase 1: test fixtures and state transitions
├── quickstart.md        # Phase 1: validation steps
├── contracts/
│   └── test-coverage.md # Phase 1: minimum test cases per module
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
frontend/
├── vitest.config.ts              # Vitest config: happy-dom, path aliases, React plugin
├── src/
│   ├── services/
│   │   ├── api.test.ts           # 2 tests: success, error
│   │   ├── claude.test.ts        # 2 tests: delegation, error propagation
│   │   ├── oauth.test.ts         # 6 tests: PKCE, state, URL, exchange, refresh
│   │   └── sheets.test.ts        # 10 tests: read, write, check, create, edge cases
│   └── hooks/
│       ├── useSettings.test.ts   # 8 tests: config check, token lifecycle, persistence
│       ├── useFoodLog.test.ts    # 11 tests: full flow + error recovery
│       └── useGoogleAuth.test.ts # 5 tests: connect, callback, CSRF, disconnect, edge

api/
├── vitest.config.ts              # Vitest config: Node environment
└── src/functions/
    ├── parse.test.ts             # 8 tests: valid, validation, Claude errors, malformed
    ├── oauthToken.test.ts        # 6 tests: valid, validation, Google errors
    └── oauthRefresh.test.ts      # 6 tests: valid, validation, Google errors
```

**Structure Decision**: Test files colocated with source per FR-009. Two Vitest configs — one per project. No shared test utilities directory (fixtures are simple enough to inline or define per-file).

## Complexity Tracking

No constitution violations. Table not needed.
