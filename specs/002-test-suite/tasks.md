# Tasks: Comprehensive Test Suite

**Input**: Design documents from `/specs/002-test-suite/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: This feature IS the test suite. All tasks produce test files.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Frontend**: `frontend/src/`
- **API**: `api/src/`

---

## Phase 1: Setup (Test Infrastructure)

**Purpose**: Install test dependencies, configure Vitest, add npm scripts

- [x] T001 Install frontend test dependencies (`vitest`, `happy-dom`, `@testing-library/react`) as devDependencies in `frontend/package.json` and add `"test": "vitest --run"` script
- [x] T002 [P] Install API test dependencies (`vitest`) as devDependency in `api/package.json` and add `"test": "vitest --run"` script
- [x] T003 Create Vitest config for frontend in `frontend/vitest.config.ts` — use happy-dom environment, configure path alias `@/` → `./src/`, include React plugin
- [x] T004 [P] Create Vitest config for API in `api/vitest.config.ts` — use Node environment, include `src/**/*.test.ts` pattern

---

## Phase 2: User Story 1 — Unit Tests for Services and Azure Functions (Priority: P1) 🎯 MVP

**Goal**: Every exported function in the 4 frontend services and 3 Azure Functions has happy-path and error-path tests with all external HTTP calls mocked.

**Independent Test**: Run `npm test` in both `frontend/` and `api/` — all service and function tests pass with no real network calls.

### Frontend Service Tests

- [x] T005 [P] [US1] Create unit tests for API client in `frontend/src/services/api.test.ts` — test `apiPost` success (returns parsed JSON), test non-OK response (throws `ApiRequestError` with status and body). Mock `globalThis.fetch`.
- [x] T006 [P] [US1] Create unit tests for Claude service in `frontend/src/services/claude.test.ts` — test `parseFood` delegates to `apiPost` with correct path `/api/parse` and payload `{apiKey, input}`, test error propagation from `apiPost`. Mock the `api.ts` module via `vi.mock`.
- [x] T007 [P] [US1] Create unit tests for OAuth service in `frontend/src/services/oauth.test.ts` — test `generatePKCE` returns valid verifier (43+ chars) and base64url challenge, test `generateState` returns 32+ char string, test `buildAuthUrl` includes all required query params (scope, code_challenge, state, access_type, prompt), test `exchangeToken` success, test `exchangeToken` error propagation, test `refreshToken` error propagation. Mock `api.ts` module via `vi.mock` for exchange/refresh tests.
- [x] T008 [P] [US1] Create unit tests for Sheets service in `frontend/src/services/sheets.test.ts` — test `readAllEntries` success (parses rows to FoodEntry[]), test `readAllEntries` 404 returns empty array, test `readAllEntries` non-404 error throws `SheetsApiError`, test `readAllEntries` with short rows (< 8 columns), test `readAllEntries` with non-numeric macro values (should default to 0 via `Number(x) || 0`), test `writeEntries` success (correct URL and auth header), test `writeEntries` error throws `SheetsApiError`, test `checkLogSheetExists` true and false cases, test `createLogSheet` success (batchUpdate + header write), test `createLogSheet` step 2 failure (step 1 addSheet succeeds, step 2 header PUT fails — SheetsApiError propagates). Mock `globalThis.fetch`.

### Azure Function Tests

- [x] T009 [P] [US1] Create unit tests for parse function in `api/src/functions/parse.test.ts` — test valid request returns 200 with items, test missing apiKey returns 400, test missing input returns 400, test invalid JSON body returns 400, test Claude 401 returns 401 "Invalid API key", test Claude 429 returns 429 with retryAfter, test Claude 500+ returns 502, test malformed Claude response (no tool_use block) returns 502. Mock `globalThis.fetch`. Create mock `HttpRequest` with `json()` method and mock `InvocationContext`.
- [x] T010 [P] [US1] Create unit tests for oauthToken function in `api/src/functions/oauthToken.test.ts` — test valid exchange returns 200 with tokens, test missing required field returns 400, test non-string field returns 400, test Google `invalid_client` error returns 401, test Google `invalid_grant` error returns 400, test Google 500+ returns 502. Mock `globalThis.fetch`. Create mock `HttpRequest` and `InvocationContext`.
- [x] T011 [P] [US1] Create unit tests for oauthRefresh function in `api/src/functions/oauthRefresh.test.ts` — test valid refresh returns 200 with token, test missing required field returns 400, test non-string field returns 400, test Google `invalid_grant` returns 401 "Refresh token expired or revoked", test Google other error returns 401, test Google 500+ returns 502. Mock `globalThis.fetch`. Create mock `HttpRequest` and `InvocationContext`.

**Checkpoint**: All 7 service/function test files pass. `npm test` succeeds in both `frontend/` and `api/`. 40 tests minimum.

---

## Phase 3: User Story 2 — Unit Tests for State Management and Auth Hooks (Priority: P2)

**Goal**: Settings store state transitions, computed properties, and Google auth hook PKCE/CSRF flow are all verified with deterministic time mocking.

**Independent Test**: Run `npm test` in `frontend/` — all hook tests pass using isolated stores and mocked browser APIs.

- [x] T012 [P] [US2] Create unit tests for settings store in `frontend/src/hooks/useSettings.test.ts` — test `isConfigured` returns true when all credentials set, test `isConfigured` returns false for each missing credential (4 assertions in 1 test), test `isGoogleConnected` returns true with valid token and future expiry, test `isGoogleConnected` returns false with expired token, test `isGoogleConnected` returns false at exact boundary (`Date.now() === googleTokenExpiry`), test `setTokens` computes expiry as `Date.now() + expiresIn * 1000`, test `clearTokens` resets all token fields and expiry to 0, test persist middleware writes state to localStorage after changes. Use `vi.useFakeTimers()` and `vi.setSystemTime()` for time-dependent tests. Test store directly via `useSettings.getState()` / `useSettings.setState()`.
- [x] T013 [P] [US2] Create unit tests for Google auth hook in `frontend/src/hooks/useGoogleAuth.test.ts` — test `connect` stores PKCE verifier and state in sessionStorage and sets `window.location.href`, test `handleCallback` with valid code and matching state exchanges tokens and clears sessionStorage, test `handleCallback` with mismatched state does not call `exchangeToken`, test `handleCallback` with no code param returns early, test `disconnect` calls `clearTokens` and `isConnected` becomes false. Mock `oauth.ts` module (`generatePKCE`, `generateState`, `buildAuthUrl`, `exchangeToken`), mock `sessionStorage`, mock `window.location` and `window.history.replaceState`. Use `renderHook` from `@testing-library/react`.

**Checkpoint**: All store and auth hook tests pass. 13 tests minimum.

---

## Phase 4: User Story 3 — Integration Tests for Food Log Flow (Priority: P3)

**Goal**: Full parse → confirm → write orchestration in `useFoodLog` is verified including token refresh retry, rate limiting, sheet auto-creation, and state preservation on failure.

**Independent Test**: Run `npm test` in `frontend/` — all useFoodLog integration tests pass with mocked services.

- [x] T014 [US3] Create integration tests for food log hook in `frontend/src/hooks/useFoodLog.test.ts` — test `parse` success (status: idle→parsing→idle, parseResult populated), test `parse` error (error message set, status idle), test `confirm` success (writes entries, refreshes, clears parseResult), test `confirm` creates Log sheet first when it doesn't exist (checkLogSheetExists→createLogSheet→writeEntries), test `confirm` 401 with refresh token triggers token refresh then retry write, test `confirm` 401 with failed refresh sets writeError.isAuthError=true and preserves parseResult, test `confirm` 429 sets writeError with rate limit message and preserves parseResult, test `retry` after write error succeeds and clears writeError, test `dismiss` clears parseResult and writeError, test `loadTodaysEntries` filters by today's date and computes summary, test `loadTodaysEntries` with no credentials returns early without fetch. Mock `claude.ts` (`parseFood`), `sheets.ts` (`readAllEntries`, `writeEntries`, `checkLogSheetExists`, `createLogSheet`), `oauth.ts` (`refreshToken`). Mock `useSettings` store state. Use `vi.useFakeTimers()` for date-dependent tests. Use `renderHook` and `act` from `@testing-library/react`.

**Checkpoint**: All 11 integration tests pass. Full error recovery flow verified.

---

## Phase 5: Polish & Validation

**Purpose**: Verify full suite runs correctly end-to-end

- [x] T015 Run `npm test` in `frontend/` and verify all tests pass with zero failures
- [x] T016 [P] Run `npm test` in `api/` and verify all tests pass with zero failures
- [x] T017 Verify combined test suite completes in under 10 seconds — run `time (cd frontend && npx vitest --run && cd ../api && npx vitest --run)` and confirm real time < 10s
- [x] T018 Run quickstart.md validation — follow all steps in `specs/002-test-suite/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **US1 (Phase 2)**: Depends on Phase 1 — Vitest must be installed and configured first
- **US2 (Phase 3)**: Depends on Phase 1 — can run in parallel with US1 (different files)
- **US3 (Phase 4)**: Depends on Phase 1 — can run in parallel with US1 and US2 (different file)
- **Polish (Phase 5)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Phase 1 — no dependencies on other stories
- **User Story 2 (P2)**: Can start after Phase 1 — no dependencies on other stories
- **User Story 3 (P3)**: Can start after Phase 1 — no dependencies on other stories (mocks all services)

### Within Each User Story

- All test files within a story are independent (different source files)
- Tasks marked [P] can run in parallel

### Parallel Opportunities

- Phase 1: T002 and T004 can run in parallel with T001 and T003
- Phase 2: All 7 test files (T005–T011) can run in parallel
- Phase 3: T012 and T013 can run in parallel
- Phase 2 + Phase 3 + Phase 4: US1, US2, and US3 can all run in parallel after Phase 1

---

## Parallel Example: Phase 2 (US1)

```bash
# Launch all frontend service tests in parallel:
Task: "Create unit tests for API client in frontend/src/services/api.test.ts"
Task: "Create unit tests for Claude service in frontend/src/services/claude.test.ts"
Task: "Create unit tests for OAuth service in frontend/src/services/oauth.test.ts"
Task: "Create unit tests for Sheets service in frontend/src/services/sheets.test.ts"

# Launch all Azure Function tests in parallel:
Task: "Create unit tests for parse function in api/src/functions/parse.test.ts"
Task: "Create unit tests for oauthToken function in api/src/functions/oauthToken.test.ts"
Task: "Create unit tests for oauthRefresh function in api/src/functions/oauthRefresh.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (install deps, configure Vitest)
2. Complete Phase 2: US1 — service and function tests
3. **STOP and VALIDATE**: Run `npm test` in both directories
4. All core business logic has test coverage

### Incremental Delivery

1. Setup → Test infrastructure ready
2. User Story 1 → Service + function tests passing (MVP!)
3. User Story 2 → Store + auth hook tests passing
4. User Story 3 → Integration flow tests passing
5. Polish → Full validation, speed check

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- All test files use colocated `*.test.ts` naming (per FR-009)
- All tests mock external HTTP calls — no real network requests (per FR-002)
- Time-dependent tests use `vi.useFakeTimers()` + `vi.setSystemTime()` (per FR-010, R6)
- Azure Function handlers tested directly with mock HttpRequest objects (per R8)
- Zustand store tested via `getState()`/`setState()` for pure logic, `renderHook` for hook-level tests (per R5)
