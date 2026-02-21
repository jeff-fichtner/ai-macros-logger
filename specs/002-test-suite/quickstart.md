# Quickstart: Test Suite Validation

**Feature**: 002-test-suite
**Purpose**: Verify the test suite is correctly set up and all tests pass

## Prerequisites

- Node.js 20 LTS installed
- Repository cloned and on branch `002-test-suite`

## Steps

### 1. Install dependencies

```bash
cd frontend && npm install
cd ../api && npm install
```

### 2. Run frontend tests

```bash
cd frontend
npm test
```

**Expected**: All tests pass. Output shows test counts for:
- `src/services/api.test.ts`
- `src/services/claude.test.ts`
- `src/services/oauth.test.ts`
- `src/services/sheets.test.ts`
- `src/hooks/useSettings.test.ts`
- `src/hooks/useFoodLog.test.ts`
- `src/hooks/useGoogleAuth.test.ts`

### 3. Run API tests

```bash
cd api
npm test
```

**Expected**: All tests pass. Output shows test counts for:
- `src/functions/parse.test.ts`
- `src/functions/oauthToken.test.ts`
- `src/functions/oauthRefresh.test.ts`

### 4. Verify no real HTTP calls

Run tests with `--reporter=verbose` and confirm no network timeout errors or DNS resolution failures. All fetch calls should be mocked.

```bash
cd frontend && npx vitest --run --reporter=verbose
cd ../api && npx vitest --run --reporter=verbose
```

### 5. Verify speed

Both test suites combined should complete in under 10 seconds.

```bash
time (cd frontend && npx vitest --run && cd ../api && npx vitest --run)
```

**Expected**: Total real time < 10 seconds.

## Troubleshooting

- **"Cannot find module" errors**: Run `npm install` in the affected directory
- **"vi is not defined"**: Ensure `vitest` is in devDependencies and test files import from `vitest`
- **Timeout errors**: A test may be making a real HTTP call — check that all `fetch` calls are mocked
- **"Invalid hook call"**: Ensure `@testing-library/react` is installed and hooks are tested via `renderHook`
