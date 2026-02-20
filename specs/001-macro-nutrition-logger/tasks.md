# Tasks: AI Macro Nutrition Logger

**Input**: Design documents from `/specs/001-macro-nutrition-logger/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Not explicitly requested in the spec. Test tasks omitted.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Frontend**: `frontend/src/`
- **API**: `api/src/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, dependencies, and build tooling

- [x] T001 Initialize React + TypeScript project with Vite in `frontend/` using `npm create vite@latest` with `react-ts` template
- [x] T002 Install frontend dependencies: `react-router-dom`, `zustand`, `@tailwindcss/vite` in `frontend/`
- [x] T003 Configure Tailwind CSS v4 in `frontend/tailwind.css` and add `@tailwindcss/vite` plugin to `frontend/vite.config.ts`
- [x] T004 Configure path aliases (`@/*` → `./src/*`) in `frontend/tsconfig.app.json` and `frontend/vite.config.ts`
- [x] T005 [P] Initialize Azure Functions v4 TypeScript project in `api/` with `@azure/functions` v4 dependency
- [x] T006 [P] Create `frontend/public/staticwebapp.config.json` with SPA navigation fallback and asset exclusions
- [x] T007 Define shared TypeScript types (FoodEntry, AIParseItem, AIParseResult, UserConfiguration, MacroTargets, DailySummary) in `frontend/src/types/index.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T008 Create Zustand settings store with `persist` middleware in `frontend/src/hooks/useSettings.ts` — store UserConfiguration fields (claudeApiKey, googleClientId, googleClientSecret, spreadsheetId, tokens, macroTargets) in localStorage
- [x] T009 [P] Create base API client with fetch wrapper in `frontend/src/services/api.ts` — handles POST to `/api/*` endpoints, returns typed responses, surfaces errors
- [x] T010 [P] Create Google Sheets service in `frontend/src/services/sheets.ts` — direct browser fetch to Google Sheets API for read (GET values), write (insert at row 2 via batchUpdate), check sheet existence, and create Log sheet with headers
- [x] T011 [P] Create OAuth service in `frontend/src/services/oauth.ts` — build Google authorization URL with PKCE (code_verifier, code_challenge, state), extract auth code from redirect, call `/api/oauth/token` and `/api/oauth/refresh` via api.ts, proactive token refresh when < 5 min until expiry
- [x] T012 [P] Create Claude parse service in `frontend/src/services/claude.ts` — call `/api/parse` with apiKey and input, return typed AIParseResult
- [x] T013 Create app shell Layout component in `frontend/src/components/Layout.tsx` — nav bar with links to Food Log and Settings, responsive mobile/desktop layout with Tailwind
- [x] T014 Configure React Router v7 in `frontend/src/App.tsx` — `createBrowserRouter` with routes for `/` (FoodLog) and `/settings` (Settings), wrapped in Layout
- [x] T015 [P] Implement Azure Function `POST /api/parse` in `api/src/functions/parse.ts` — validate request body (apiKey, input), forward to Claude Messages API at `https://api.anthropic.com/v1/messages` with tool_use for `parse_food_items`, system prompt with nutrition estimation guidelines, return parsed items; handle 400/401/429/502 errors per contract
- [x] T016 [P] Implement Azure Function `POST /api/oauth/token` in `api/src/functions/oauthToken.ts` — validate request body (clientId, clientSecret, code, codeVerifier, redirectUri), POST to `https://oauth2.googleapis.com/token` with `grant_type=authorization_code`, return accessToken/refreshToken/expiresIn; handle 400/401/502 errors per contract
- [x] T017 [P] Implement Azure Function `POST /api/oauth/refresh` in `api/src/functions/oauthRefresh.ts` — validate request body (clientId, clientSecret, refreshToken), POST to `https://oauth2.googleapis.com/token` with `grant_type=refresh_token`, return accessToken/expiresIn; handle 400/401 (invalid_grant)/502 errors per contract
- [x] T018 Register all Azure Functions in `api/src/index.ts` — import parse, oauthToken, oauthRefresh function files
- [x] T019 Configure Vite dev server proxy in `frontend/vite.config.ts` — proxy `/api/*` requests to `http://localhost:7071` for local development

**Checkpoint**: Foundation ready — settings store, API services, Azure Functions, routing, and layout all in place. User story implementation can now begin.

---

## Phase 3: User Story 1 - Log a Meal via Natural Language (Priority: P1) 🎯 MVP

**Goal**: User types a food description, sees parsed macro results with warnings, confirms, and the entry is saved to their Google Sheet with daily totals updated.

**Independent Test**: Enter a food description → verify parsed macros appear → confirm → verify row written to Google Sheet at row 2 → verify daily totals update.

### Implementation for User Story 1

- [x] T020 [US1] Create FoodInput component in `frontend/src/components/FoodInput.tsx` — text input field with submit button, loading state while parsing, disabled when no credentials configured
- [x] T021 [US1] Create ParseResult component in `frontend/src/components/ParseResult.tsx` — display list of AIParseItems with description, calories, protein, carbs, fat; show warning text inline for items with warnings (styled distinctly); confirm and cancel buttons
- [x] T022 [US1] Create useFoodLog hook in `frontend/src/hooks/useFoodLog.ts` — orchestrates the full flow: call claude.ts to parse input → hold AIParseResult in state → on confirm call sheets.ts to write each item as a row at row 2 (with local date, time, description, macros, raw input) → on success refresh entries from sheet → compute DailySummary by filtering today's entries
- [x] T023 [US1] Create MacroSummary component in `frontend/src/components/MacroSummary.tsx` — display daily totals (calories, protein, carbs, fat) in a card/grid layout, responsive for mobile; show macro targets alongside totals if configured in settings
- [x] T024 [US1] Build FoodLog page in `frontend/src/pages/FoodLog.tsx` — compose FoodInput, ParseResult, MacroSummary; wire to useFoodLog hook; redirect to `/settings` if credentials not configured (check useSettings store)
- [x] T025 [US1] Handle non-food input in FoodLog page — when all returned items have description "Not a food item" and zero macros, display the warning message as an error instead of showing ParseResult with confirm button

**Checkpoint**: User Story 1 is fully functional. Users can type food, see parsed macros with warnings, confirm, and entries are written to Google Sheets. Daily totals compute from sheet data.

---

## Phase 4: User Story 2 - Initial Setup and Credential Configuration (Priority: P2)

**Goal**: New user is guided through entering credentials, connecting Google OAuth, and verifying their spreadsheet is accessible. Sheet auto-created on first log.

**Independent Test**: Walk through settings page → enter all credentials → complete OAuth flow → verify token stored → verify sheet read works.

### Implementation for User Story 2

- [x] T026 [US2] Create OnboardingGuide component in `frontend/src/components/OnboardingGuide.tsx` — step-by-step instructions for Google Cloud project setup: create project, enable Sheets API, configure OAuth consent screen (set to "In production" to avoid 7-day token expiry), create Web Application credentials, add redirect URI, copy client ID/secret; collapsible/expandable sections
- [x] T027 [US2] Create useGoogleAuth hook in `frontend/src/hooks/useGoogleAuth.ts` — initiate OAuth flow (build auth URL with PKCE, scope `https://www.googleapis.com/auth/spreadsheets`, access_type=offline, prompt=consent, state for CSRF), handle redirect callback (extract code from URL, validate state, call oauth.ts token exchange, store tokens in settings), expose connect/disconnect actions and connection status
- [x] T028 [US2] Build Settings page in `frontend/src/pages/Settings.tsx` — form fields for Claude API key (with `sk-ant-` format hint), Google OAuth client ID, client secret, spreadsheet ID (with URL extraction helper); Google OAuth connect/disconnect button wired to useGoogleAuth; macro targets inputs (calories, protein, carbs, fat); save to useSettings store; show connection status indicators; embed OnboardingGuide
- [x] T029 [US2] Implement spreadsheet ID extraction from URL — in Settings page or useSettings, parse `https://docs.google.com/spreadsheets/d/{ID}/edit` format and store just the ID
- [x] T030 [US2] Implement Log sheet auto-creation in `frontend/src/services/sheets.ts` — before first write, check if "Log" sheet exists in spreadsheet; if not, create it via batchUpdate addSheet request, then write header row ("Date", "Time", "Description", "Calories", "Protein (g)", "Carbs (g)", "Fat (g)", "Raw Input") to A1:H1
- [x] T031 [US2] Add credential validation feedback in Settings page — on save, validate Claude API key format (starts with `sk-ant-`), validate spreadsheet ID is non-empty, show green/red status indicators; optionally test spreadsheet access by reading sheet metadata

**Checkpoint**: User Story 2 is fully functional. Users can configure all credentials, complete OAuth, and the app auto-creates the Log sheet on first use.

---

## Phase 5: User Story 3 - View Daily Totals and Entry History (Priority: P3)

**Goal**: User sees today's macro totals and a chronological list of today's entries with timestamps and per-item breakdowns.

**Independent Test**: With entries in the sheet, load the home page → verify daily totals match sum of today's entries → verify entry list shows timestamps in local time → verify yesterday's entries are excluded.

### Implementation for User Story 3

- [x] T032 [US3] Create EntryHistory component in `frontend/src/components/EntryHistory.tsx` — list of today's FoodEntry items showing time (formatted to browser local time), description, and individual macro values (calories, protein, carbs, fat); empty state message when no entries today
- [x] T033 [US3] Extend useFoodLog hook in `frontend/src/hooks/useFoodLog.ts` — add `loadTodaysEntries` function that reads all rows from sheet, filters by date column matching today's local date (YYYY-MM-DD), parses into FoodEntry array, computes DailySummary; call on page mount and after successful writes
- [x] T034 [US3] Integrate EntryHistory into FoodLog page in `frontend/src/pages/FoodLog.tsx` — render below MacroSummary, show today's entries from useFoodLog state; display empty state when no entries

**Checkpoint**: User Story 3 is fully functional. Users see accurate daily totals and a history of today's entries on the home page.

---

## Phase 6: User Story 4 - Recover from Failed Writes (Priority: P4)

**Goal**: When a sheet write fails after successful AI parse, parsed data stays visible with retry capability. No data loss.

**Independent Test**: Simulate a write failure → verify parsed data stays on screen → click retry → verify write succeeds and entry appears in totals.

### Implementation for User Story 4

- [x] T035 [US4] Extend useFoodLog hook in `frontend/src/hooks/useFoodLog.ts` — add write error state (preserve AIParseResult when sheets.ts write fails), add retry function that re-attempts the write with the preserved data, add dismiss function to clear the failed state; handle 429 rate limit errors with "please wait" messaging
- [x] T036 [US4] Extend ParseResult component in `frontend/src/components/ParseResult.tsx` — add error state display: show error message (network error, rate limit, or auth error), keep macro data visible, render retry button and dismiss button; for 401 errors show "re-authorize in settings" link
- [x] T037 [US4] Handle token refresh during write in `frontend/src/hooks/useFoodLog.ts` — if sheet write returns 401, attempt proactive token refresh via oauth.ts before showing error; if refresh succeeds, auto-retry the write; if refresh fails (invalid_grant), show re-authorize error

**Checkpoint**: User Story 4 is fully functional. Failed writes preserve parsed data, offer retry, and handle token expiry gracefully.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Error handling, edge cases, and mobile responsiveness across all stories

- [x] T038 Add global error boundary in `frontend/src/App.tsx` — catch unhandled React errors, display friendly fallback UI
- [x] T039 Add credential missing/invalid error handling across FoodLog page — if Claude API key missing or sheets not connected, show clear message directing to Settings page (FR-014)
- [x] T040 [P] Add mobile-responsive styling pass across all components — verify no horizontal scrolling, tap targets are usable, MacroSummary and EntryHistory render well on small screens (SC-006)
- [x] T041 [P] Add loading states and disabled submit during in-flight requests in FoodInput and Settings page — prevent double submissions
- [ ] T042 Run quickstart.md validation — follow all steps in `specs/001-macro-nutrition-logger/quickstart.md` and verify end-to-end flow works

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Phase 2 — core logging flow
- **User Story 2 (Phase 4)**: Depends on Phase 2 — can run in parallel with US1 (different pages/files)
- **User Story 3 (Phase 5)**: Depends on Phase 2 — benefits from US1 for test data but independently testable with manual sheet entries
- **User Story 4 (Phase 6)**: Depends on US1 (extends its components and hooks)
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Phase 2 — no dependencies on other stories
- **User Story 2 (P2)**: Can start after Phase 2 — no dependencies on other stories (settings store is in Phase 2)
- **User Story 3 (P3)**: Can start after Phase 2 — extends useFoodLog hook from US1 but can be built independently if hook interface is known
- **User Story 4 (P4)**: Depends on US1 — extends useFoodLog hook and ParseResult component

### Within Each User Story

- Services/hooks before components
- Components before page integration
- Core flow before edge cases

### Parallel Opportunities

- Phase 1: T005 and T006 can run in parallel with T001-T004
- Phase 2: T009, T010, T011, T012 can all run in parallel (different service files). T015, T016, T017 can all run in parallel (different function files).
- Phase 3-4: US1 and US2 can run in parallel (different pages, components, and hooks)
- Phase 5: US3 can start once useFoodLog hook interface is defined (even before US1 is complete)

---

## Parallel Example: Phase 2 Foundational

```bash
# Launch all frontend services in parallel:
Task: "Create base API client in frontend/src/services/api.ts"
Task: "Create Google Sheets service in frontend/src/services/sheets.ts"
Task: "Create OAuth service in frontend/src/services/oauth.ts"
Task: "Create Claude parse service in frontend/src/services/claude.ts"

# Launch all Azure Functions in parallel:
Task: "Implement POST /api/parse in api/src/functions/parse.ts"
Task: "Implement POST /api/oauth/token in api/src/functions/oauthToken.ts"
Task: "Implement POST /api/oauth/refresh in api/src/functions/oauthRefresh.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1 (Log a Meal)
4. **STOP and VALIDATE**: Test with real Claude API key and Google Sheet
5. Deploy to Azure Static Web Apps if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. User Story 1 → Test independently → Deploy (MVP!)
3. User Story 2 → Test independently → Deploy (onboarding for new users)
4. User Story 3 → Test independently → Deploy (daily totals and history)
5. User Story 4 → Test independently → Deploy (error resilience)
6. Polish → Final deploy

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- All API calls use direct `fetch` — no SDKs (per research.md decisions)
- Azure Functions register via `app.http()` in v4 model (no function.json files)
- Google Sheets API is called directly from the browser (CORS supported) — only Claude relay and OAuth go through Azure Functions
