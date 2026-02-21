# Feature Specification: Comprehensive Test Suite

**Feature Branch**: `002-test-suite`
**Created**: 2026-02-21
**Status**: Draft
**Input**: User description: "Comprehensive test suite for the AI Macro Nutrition Logger (feature 001)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Unit Tests for Services and Azure Functions (Priority: P1)

A developer runs the test suite and gets fast feedback on whether all service modules (api.ts, claude.ts, oauth.ts, sheets.ts) and all Azure Functions (parse, oauthToken, oauthRefresh) behave correctly for every input combination — valid requests, invalid inputs, error responses, and edge cases. All external HTTP calls are mocked.

**Why this priority**: Services and Azure Functions contain the core business logic and all external integrations. Bugs here cascade into every feature. These are pure functions with clear inputs/outputs, making them the highest-value, easiest-to-write tests.

**Independent Test**: Run `npm test` in both `frontend/` and `api/` — all service and function tests pass with no real network calls.

**Acceptance Scenarios**:

1. **Given** a valid food description and API key, **When** `parseFood()` is called, **Then** it delegates to the API client with the correct path and payload
2. **Given** a non-OK HTTP response, **When** the API client makes a request, **Then** it throws a typed error with the correct status and body
3. **Given** valid OAuth parameters, **When** token exchange is called, **Then** it returns access token, refresh token, and expiry
4. **Given** an expired or revoked refresh token, **When** token refresh is called, **Then** the error propagates with the correct status
5. **Given** a missing sheet (404 response), **When** entries are read, **Then** an empty array is returned instead of an error
6. **Given** a non-OK Sheets response (non-404), **When** any sheets operation is called, **Then** it throws a typed error with the numeric status
7. **Given** a valid request body, **When** the parse function is called, **Then** it forwards to the AI service and returns parsed items
8. **Given** an invalid API key (401 from AI service), **When** the parse function handles the response, **Then** it returns 401
9. **Given** rate limiting (429 from AI service), **When** the parse function handles the response, **Then** it returns 429 with a retry hint
10. **Given** a malformed AI response (missing structured output), **When** the parse function processes it, **Then** it returns 502
11. **Given** an `invalid_grant` error from the OAuth provider, **When** token refresh handles the response, **Then** it returns 401 indicating the token is expired or revoked
12. **Given** an `invalid_client` error from the OAuth provider, **When** token exchange handles the response, **Then** it returns 401 indicating invalid credentials
13. **Given** PKCE generation is called, **When** the function executes, **Then** it returns a code verifier and a valid base64url-encoded SHA-256 challenge
14. **Given** OAuth URL parameters, **When** the auth URL is built, **Then** the returned URL contains all required query parameters (scope, access type, PKCE challenge, state)

---

### User Story 2 - Unit Tests for State Management and Auth Hooks (Priority: P2)

A developer runs the test suite and verifies that the settings store persists correctly, computed properties (isConfigured, isGoogleConnected) return accurate results based on state, and the Google auth hook correctly manages the PKCE flow, CSRF validation, and token storage.

**Why this priority**: State management bugs cause subtle, hard-to-diagnose issues in the UI. Testing the store and hooks in isolation catches state transition bugs, persistence issues, and time-based logic errors before they reach components.

**Independent Test**: Run `npm test` in `frontend/` — all hook tests pass using isolated stores and mocked browser APIs.

**Acceptance Scenarios**:

1. **Given** a fresh store, **When** all credential setters are called with valid values, **Then** the configuration check returns true
2. **Given** any credential is empty, **When** the configuration check is called, **Then** it returns false
3. **Given** a valid access token and future expiry, **When** the connection check is called, **Then** it returns true
4. **Given** an expired token (expiry in the past), **When** the connection check is called, **Then** it returns false
5. **Given** token storage is called with an expiry duration, **When** the expiry is checked, **Then** it equals the current time plus the duration (in milliseconds)
6. **Given** token clearing is called, **When** the store is read, **Then** all token fields are empty and expiry is zero
7. **Given** the OAuth connect flow starts, **When** connect is called, **Then** PKCE and state are stored in session storage and the browser redirects
8. **Given** a valid callback with matching state, **When** the callback handler runs, **Then** tokens are exchanged, stored in settings, and session storage is cleaned up
9. **Given** a callback with mismatched state (CSRF attack), **When** the callback handler runs, **Then** token exchange does not occur

---

### User Story 3 - Integration Tests for Food Log Flow (Priority: P3)

A developer runs the test suite and verifies the full orchestration flow: parse → review → confirm → write → refresh. This includes the token refresh retry path on auth errors, rate limit handling, sheet auto-creation on first write, and state preservation when writes fail.

**Why this priority**: The food log orchestration is the most complex piece of logic in the app, coordinating multiple services with branching error recovery. Integration-level tests catch interaction bugs that unit tests of individual services miss.

**Independent Test**: Run `npm test` in `frontend/` — all food log integration tests pass with mocked services.

**Acceptance Scenarios**:

1. **Given** a food description, **When** parsing is called and succeeds, **Then** status transitions idle → parsing → idle with parsed results populated
2. **Given** parsed results exist, **When** confirmation is called and the sheet write succeeds, **Then** entries are refreshed and parsed results are cleared
3. **Given** the log sheet does not exist, **When** the first write occurs, **Then** the sheet is created before writing entries
4. **Given** a sheet write returns 401 and a refresh token exists, **When** the error is handled, **Then** the access token is refreshed and the write is retried
5. **Given** a sheet write returns 401 and token refresh also fails, **When** the error is handled, **Then** the write error indicates an auth problem and parsed results are preserved
6. **Given** a sheet write returns 429, **When** the error is handled, **Then** the write error message indicates rate limiting and parsed results are preserved
7. **Given** a write error exists, **When** retry is called and succeeds, **Then** the write completes and the error is cleared
8. **Given** a write error exists, **When** dismiss is called, **Then** parsed results and the error are both cleared
9. **Given** entries exist in the sheet for today, **When** today's entries are loaded, **Then** only today's entries are returned and the daily summary is computed
10. **Given** no credentials are configured, **When** today's entries are loaded, **Then** it returns early without error

---

### Edge Cases

- What happens when the AI returns items where all have "Not a food item" descriptions and zero macros?
- How does the system handle a sheet response with missing or malformed row data (fewer than 8 columns)?
- What happens when the current time is at the exact boundary of token expiry?
- How does entry reading handle rows with non-numeric macro values?
- What happens when the AI response contains no structured output blocks?
- How does token exchange handle a provider response that returns 200 but is not valid JSON?
- What happens when sheet creation succeeds (step 1: add sheet) but header writing fails (step 2)?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Test suite MUST use Vitest as the test runner for both frontend and API projects
- **FR-002**: All external HTTP calls (AI service, Sheets API, OAuth endpoints) MUST be mocked — no real network requests during tests
- **FR-003**: Every exported function in the 4 frontend service modules MUST have at least one happy-path and one error-path test
- **FR-004**: Every Azure Function MUST have tests covering: valid request, missing/invalid fields, and each distinct error response code
- **FR-005**: Store tests MUST verify state persistence behavior and all computed properties
- **FR-006**: Hook tests MUST verify state transitions for all status values (idle, parsing, writing, loading)
- **FR-007**: Integration tests for the food log flow MUST cover the full parse → confirm → write cycle including token refresh retry
- **FR-008**: Tests MUST be runnable via a single command in both project directories
- **FR-009**: Test files MUST be colocated with source files using a consistent naming convention
- **FR-010**: Time-dependent tests (token expiry, date filtering) MUST use deterministic time mocking, not real clocks
- **FR-011**: Tests MUST NOT depend on execution order — each test must set up its own state

### Key Entities

- **Test File**: A test module colocated with its source, containing grouped test cases organized by function or behavior
- **Mock**: A test double replacing an external dependency (HTTP client, cryptography, session storage, persistence layer) to isolate the unit under test
- **Test Fixture**: Predefined data objects (sample food entries, AI parse results, API responses) reused across tests for consistency

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All tests pass when run in both project directories with zero failures
- **SC-002**: Every exported function across all 7 frontend modules and 3 Azure Functions has at least one test
- **SC-003**: Error paths (401, 429, 502, network failure, malformed response) are covered for every module that handles errors
- **SC-004**: Test suite completes in under 10 seconds total (both projects combined)
- **SC-005**: No test makes a real HTTP request — all external calls are mocked
- **SC-006**: Token refresh retry flow has dedicated test coverage for both success and failure paths
