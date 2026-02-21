# Data Model: Comprehensive Test Suite

**Feature**: 002-test-suite
**Date**: 2026-02-21

This feature adds test infrastructure and test files — it does not introduce new persistent data entities. The entities below describe the test-specific data structures used as fixtures and mocks.

## Test Fixtures

### MockFetchResponse

Simulates a `fetch` Response object for mocking HTTP calls.

| Field      | Type                  | Description                          |
|------------|-----------------------|--------------------------------------|
| ok         | boolean               | Whether the response status is 2xx   |
| status     | number                | HTTP status code                     |
| statusText | string                | HTTP status text                     |
| json()     | () => Promise\<any\>  | Returns parsed JSON body             |

### MockHttpRequest (Azure Functions)

Simulates an Azure Functions `HttpRequest` for handler testing.

| Field  | Type                           | Description                    |
|--------|--------------------------------|--------------------------------|
| method | string                         | HTTP method (always "POST")    |
| json() | () => Promise\<Record\<string, unknown\>\> | Returns parsed request body |

### Sample Data Constants

Reusable test data used across multiple test files:

| Constant             | Type           | Purpose                                         |
|----------------------|----------------|--------------------------------------------------|
| SAMPLE_FOOD_ENTRY    | FoodEntry      | A valid food entry with all fields populated     |
| SAMPLE_PARSE_RESULT  | AIParseResult  | A valid parse result with 2 items                |
| SAMPLE_SETTINGS      | Partial\<UserConfiguration\> | Valid credentials for all fields  |
| TODAY_ISO            | string         | Deterministic date string for time-mocked tests  |

## State Transitions Under Test

### useFoodLog status transitions

```
idle → parsing → idle (success or error)
idle → writing → idle (confirm success)
idle → writing → idle (confirm error, writeError set)
idle → loading → idle (loadTodaysEntries)
```

### useSettings token lifecycle

```
empty → setTokens() → populated (expiry = now + expiresIn*1000)
populated → clearTokens() → empty (all token fields reset)
populated → updateAccessToken() → updated (new token, new expiry)
```

### isGoogleConnected boundary behavior

```
expiry > Date.now()  → connected (true)
expiry === Date.now() → expired (false) — boundary case
expiry < Date.now()  → expired (false)
```
