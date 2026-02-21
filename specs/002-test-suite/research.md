# Research: Comprehensive Test Suite

**Feature**: 002-test-suite
**Date**: 2026-02-21

## R1: Test Runner — Vitest

**Decision**: Vitest 3.x as the sole test runner for both `frontend/` and `api/`

**Rationale**:
- User explicitly requested Vitest
- Native ESM support matches the project's ESNext module target
- First-class Vite integration for frontend — reuses the same transform pipeline (React JSX, TypeScript, path aliases) with zero duplicate config
- Fast enough for the API project too (no Vite dependency required — runs in Node mode)
- Built-in `vi.fn()`, `vi.mock()`, `vi.useFakeTimers()` — no need for separate mocking libraries

**Alternatives considered**:
- Jest: Would require ts-jest or SWC transformer, ESM support is still experimental, path alias config duplication
- Node test runner: No mocking utilities, no watch mode, limited ecosystem

## R2: DOM Environment for Hook Tests

**Decision**: `happy-dom` for frontend tests requiring DOM/browser APIs

**Rationale**:
- Faster than jsdom (5-10x in benchmarks) — matters for keeping suite under 10 seconds
- Sufficient for hook testing — we're not testing real component rendering or complex DOM interactions
- Supports `window.location`, `sessionStorage`, `crypto.subtle`, `URL`, `URLSearchParams` — all needed by the hooks

**Alternatives considered**:
- jsdom: More complete but significantly slower. Overkill for unit/integration tests with no component rendering
- No DOM environment: Would work for services but not for hooks that access `window`, `sessionStorage`, `crypto`

## R3: React Hook Testing

**Decision**: `@testing-library/react` with `renderHook` for testing `useSettings`, `useFoodLog`, and `useGoogleAuth`

**Rationale**:
- `renderHook` is the standard way to test custom hooks outside of components
- Handles React state batching and effects correctly
- Pairs with `act()` for async state updates
- Lightweight — we only need `renderHook` and `act`, not the full DOM query API

**Alternatives considered**:
- Testing hooks via component wrappers: More boilerplate, harder to isolate hook logic
- Direct function calls: Hooks can't be called outside React render context

## R4: Mocking Strategy for HTTP Calls

**Decision**: `vi.mock()` at module level for service-to-service dependencies. `vi.spyOn(globalThis, 'fetch')` for modules that call `fetch` directly.

**Rationale**:
- Frontend services: `claude.ts` and `oauth.ts` both delegate to `apiPost` from `api.ts`. Mock `api.ts` module when testing `claude.ts` and `oauth.ts`. Mock `fetch` when testing `api.ts` and `sheets.ts` directly.
- Azure Functions: Each function calls `fetch` directly. Mock `globalThis.fetch` in function tests.
- Avoids bringing in MSW or nock — those are better for E2E/integration server tests, overkill here per Simplicity First principle.

**Alternatives considered**:
- MSW (Mock Service Worker): Intercepts at network level, good for integration tests but adds complexity and setup. Overkill for unit tests.
- nock: HTTP-level mocking for Node, doesn't work well with `globalThis.fetch` in ESM

## R5: Zustand Store Testing

**Decision**: Create fresh store instances per test using Zustand's `createStore` directly, bypassing the React hook wrapper.

**Rationale**:
- Zustand stores are plain JavaScript — `useSettings` is created via `create()(...)` which returns a hook, but the underlying store can be accessed via `useSettings.getState()` and `useSettings.setState()`
- For state logic tests (setters, computed properties), direct store access is faster and doesn't need React rendering
- For persistence tests, mock `localStorage` and verify the persist middleware writes/reads correctly
- For hook-level tests (e.g., `useGoogleAuth` which calls `useSettings` internally), use `renderHook` with the real store

**Alternatives considered**:
- Always using `renderHook`: Unnecessary overhead for testing pure state logic
- Resetting store between tests via `setState`: Works but fresh instances are cleaner

## R6: Time Mocking

**Decision**: `vi.useFakeTimers()` with `vi.setSystemTime()` for deterministic time control.

**Rationale**:
- Token expiry checks in `useSettings.isGoogleConnected()` compare against `Date.now()`
- Date filtering in `useFoodLog.loadTodaysEntries()` depends on the current date
- `vi.setSystemTime(new Date('2026-02-21T12:00:00'))` freezes both `Date.now()` and `new Date()` — covers all time-dependent code paths
- Built into Vitest, no additional library needed

**Alternatives considered**:
- Manually mocking `Date.now`: Fragile, doesn't cover `new Date()` constructor calls
- sinon fake timers: Vitest's built-in is equivalent, no need for external dependency

## R7: Test File Organization

**Decision**: Colocated `*.test.ts` files next to source files.

**Rationale**:
- FR-009 explicitly requires colocation
- Keeps tests discoverable — `sheets.ts` → `sheets.test.ts` in the same directory
- Vitest default glob `**/*.test.ts` picks them up automatically
- No separate `__tests__/` directories or `tests/` folders needed

**File mapping**:
```
frontend/src/services/api.test.ts
frontend/src/services/claude.test.ts
frontend/src/services/oauth.test.ts
frontend/src/services/sheets.test.ts
frontend/src/hooks/useSettings.test.ts
frontend/src/hooks/useFoodLog.test.ts
frontend/src/hooks/useGoogleAuth.test.ts
api/src/functions/parse.test.ts
api/src/functions/oauthToken.test.ts
api/src/functions/oauthRefresh.test.ts
```

## R8: Azure Functions Test Approach

**Decision**: Test exported handler functions directly by constructing mock `HttpRequest` objects and asserting on the returned `HttpResponseInit`.

**Rationale**:
- Azure Functions v4 handlers are plain async functions: `(request: HttpRequest, context: InvocationContext) => Promise<HttpResponseInit>`
- No need for a running Functions host or integration test framework
- Construct a minimal `HttpRequest` with `json()` method returning the test body
- Assert on the returned object's `status` and parsed `body`
- Mock `globalThis.fetch` for outbound Claude/Google API calls

**Alternatives considered**:
- Azure Functions test utilities: The `@azure/functions` package doesn't ship official test helpers. Community solutions add unnecessary dependency.
- Supertest / HTTP-level testing: Requires running the Functions host, turns unit tests into integration tests

## R9: Crypto Mocking for PKCE Tests

**Decision**: Use the real `crypto` API via happy-dom rather than mocking it.

**Rationale**:
- happy-dom provides `crypto.getRandomValues()` and `crypto.subtle.digest()` — the two APIs used by `generatePKCE()` and `generateState()`
- Testing with real crypto validates the actual base64url encoding and SHA-256 hashing logic
- Mocking crypto would only test that the mock was called, not that the output is valid

**Alternatives considered**:
- Mocking crypto.subtle: Would speed up tests marginally but lose verification of the encoding logic
- Using Node's crypto polyfill: happy-dom already provides Web Crypto API
