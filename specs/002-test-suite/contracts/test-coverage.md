# Test Coverage Contract

**Feature**: 002-test-suite
**Date**: 2026-02-21

This feature has no API contracts (no new endpoints). This document defines the test coverage contract — the minimum set of test cases required per module.

## Frontend Services

### api.ts (2 tests minimum)

| Test Case                     | Type  | Asserts                                          |
|-------------------------------|-------|--------------------------------------------------|
| apiPost success               | Happy | Returns parsed JSON body                         |
| apiPost non-OK response       | Error | Throws ApiRequestError with status and body      |

### claude.ts (2 tests minimum)

| Test Case                     | Type  | Asserts                                          |
|-------------------------------|-------|--------------------------------------------------|
| parseFood delegates correctly | Happy | Calls apiPost with "/api/parse" and {apiKey, input} |
| parseFood propagates error    | Error | ApiRequestError from apiPost surfaces unchanged  |

### oauth.ts (6 tests minimum)

| Test Case                        | Type  | Asserts                                          |
|----------------------------------|-------|--------------------------------------------------|
| generatePKCE returns valid pair  | Happy | Verifier is 43+ chars, challenge is base64url    |
| generateState returns string     | Happy | 32+ char base64url string                        |
| buildAuthUrl includes all params | Happy | URL contains scope, code_challenge, state, etc.  |
| exchangeToken success            | Happy | Returns accessToken, refreshToken, expiresIn     |
| exchangeToken error              | Error | ApiRequestError propagates                       |
| refreshToken error               | Error | ApiRequestError propagates                       |

### sheets.ts (10 tests minimum)

| Test Case                             | Type  | Asserts                                     |
|---------------------------------------|-------|---------------------------------------------|
| readAllEntries success                | Happy | Returns FoodEntry[] from sheet data         |
| readAllEntries 404 returns empty      | Edge  | Returns [] instead of throwing              |
| readAllEntries non-404 error          | Error | Throws SheetsApiError with status           |
| readAllEntries short rows             | Edge  | Handles rows with < 8 columns gracefully    |
| readAllEntries non-numeric macros     | Edge  | Rows with non-numeric macro values default to 0 |
| writeEntries success                  | Happy | POSTs to correct URL with Authorization     |
| writeEntries error                    | Error | Throws SheetsApiError                       |
| checkLogSheetExists true/false        | Happy | Returns boolean based on sheet metadata     |
| createLogSheet success                | Happy | Calls batchUpdate then writes headers       |
| createLogSheet step 2 failure         | Edge  | Throws SheetsApiError from header write (step 1 succeeds, step 2 fails) |

## Frontend Hooks

### useSettings.ts (8 tests minimum)

| Test Case                        | Type  | Asserts                                       |
|----------------------------------|-------|-----------------------------------------------|
| isConfigured all set             | Happy | Returns true                                  |
| isConfigured missing field       | Edge  | Returns false for each missing credential (4 assertions in 1 test) |
| isGoogleConnected valid token    | Happy | Returns true when token exists + not expired  |
| isGoogleConnected expired        | Edge  | Returns false when expiry < Date.now()        |
| isGoogleConnected at boundary    | Edge  | Returns false when expiry === Date.now()      |
| setTokens computes expiry        | Happy | Expiry = Date.now() + expiresIn * 1000        |
| clearTokens resets all           | Happy | All token fields empty, expiry = 0            |
| persist writes to localStorage   | Happy | After state change, localStorage contains serialized store |

### useGoogleAuth.ts (5 tests minimum)

| Test Case                       | Type  | Asserts                                       |
|---------------------------------|-------|-----------------------------------------------|
| connect stores PKCE + redirects | Happy | sessionStorage set, window.location changed   |
| handleCallback success          | Happy | Tokens stored, sessionStorage cleared, URL cleaned |
| handleCallback state mismatch   | Error | No token exchange, no state changes           |
| handleCallback no code param    | Edge  | Returns early, no side effects                |
| disconnect clears tokens        | Happy | Calls clearTokens, isConnected becomes false  |

### useFoodLog.ts (11 tests minimum)

| Test Case                            | Type   | Asserts                                    |
|--------------------------------------|--------|--------------------------------------------|
| parse success                        | Happy  | Status: idle→parsing→idle, parseResult set |
| parse error                          | Error  | error message set, status idle             |
| confirm success                      | Happy  | Writes entries, refreshes, clears parse    |
| confirm creates sheet first          | Happy  | checkLogSheetExists → createLogSheet → write |
| confirm 401 + refresh succeeds       | Error  | Refreshes token, retries write             |
| confirm 401 + refresh fails          | Error  | writeError.isAuthError = true              |
| confirm 429                          | Error  | writeError with rate limit message         |
| retry after error                    | Happy  | Successful write, writeError cleared       |
| dismiss clears state                 | Happy  | parseResult null, writeError null          |
| loadTodaysEntries filters by date    | Happy  | Only today's entries, summary computed     |
| loadTodaysEntries no credentials     | Edge   | Returns early, no fetch calls              |

## Azure Functions

### parse.ts (8 tests minimum)

| Test Case                      | Type  | Asserts                                       |
|--------------------------------|-------|-----------------------------------------------|
| Valid request                  | Happy | 200 with {items: [...]}                       |
| Missing apiKey                 | Error | 400 "Missing required field: apiKey"          |
| Missing input                  | Error | 400 "Missing required field: input"           |
| Claude 401                     | Error | 401 "Invalid API key"                         |
| Claude 429                     | Error | 429 with retryAfter: 30                       |
| Claude 500+                    | Error | 502 "AI service unavailable"                  |
| Malformed Claude response      | Error | 502 "AI service unavailable"                  |
| Invalid JSON body              | Error | 400 "Invalid JSON in request body"            |

### oauthToken.ts (6 tests minimum)

| Test Case                      | Type  | Asserts                                       |
|--------------------------------|-------|-----------------------------------------------|
| Valid exchange                 | Happy | 200 with accessToken, refreshToken, expiresIn |
| Missing required field         | Error | 400 with field name                           |
| Non-string field               | Error | 400 with field name                           |
| Google invalid_client          | Error | 401 "Invalid OAuth credentials"               |
| Google invalid_grant           | Error | 400 "Authorization code expired..."           |
| Google 500+                    | Error | 502 "OAuth service unavailable"               |

### oauthRefresh.ts (6 tests minimum)

| Test Case                      | Type  | Asserts                                       |
|--------------------------------|-------|-----------------------------------------------|
| Valid refresh                  | Happy | 200 with accessToken, expiresIn               |
| Missing required field         | Error | 400 with field name                           |
| Non-string field               | Error | 400 with field name                           |
| Google invalid_grant           | Error | 401 "Refresh token expired or revoked"        |
| Google other error             | Error | 401 "Invalid OAuth credentials"               |
| Google 500+                    | Error | 502 "OAuth service unavailable"               |

## Totals

| Category         | Modules | Minimum Tests |
|------------------|---------|---------------|
| Frontend Services | 4      | 20            |
| Frontend Hooks    | 3      | 24            |
| Azure Functions   | 3      | 20            |
| **Total**         | **10** | **64**        |
