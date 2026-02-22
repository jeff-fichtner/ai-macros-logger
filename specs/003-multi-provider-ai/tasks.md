# Tasks: Multi-Provider AI Support

**Input**: Design documents from `/specs/003-multi-provider-ai/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/parse.md

**Tests**: Not requested in spec. No test tasks included.

**Organization**: Tasks grouped by user story for independent implementation.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story (US1, US3)
- Exact file paths included

## Phase 1: Setup

**Purpose**: Shared types and directory structure

- [x] T001 Add provider types (`AIProviderType`, `AIProviderConfig`) and update `UserConfiguration` in `frontend/src/types/index.ts`
- [x] T002 Create `api/src/providers/` directory and add shared provider handler type definition in `api/src/providers/types.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Backend provider handlers and parse endpoint refactor — all user stories depend on these

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Refactor `api/src/functions/parse.ts` into a dispatcher: add `provider` to `ParseRequestBody`, validate provider field, move `SYSTEM_PROMPT` and tool schema to shared constants; extract existing Claude logic into `api/src/providers/claude.ts` exporting `callProvider(apiKey, systemPrompt, input): Promise<FoodItem[]>`; dispatch to Claude handler by default
- [x] T004 [P] Implement OpenAI provider handler in `api/src/providers/openai.ts` with same `callProvider` signature — use `gpt-4o-mini`, function calling with `tool_choice`, `JSON.parse` on `arguments` field per research.md
- [x] T005 [P] Implement Gemini provider handler in `api/src/providers/gemini.ts` with same `callProvider` signature — use `gemini-2.0-flash`, function calling with `mode: "ANY"`, extract from `functionCall.args` per research.md
- [x] T006 Wire OpenAI and Gemini handlers into `api/src/functions/parse.ts` dispatcher switch alongside Claude

**Checkpoint**: Backend now accepts `{ provider, apiKey, input }` and routes to the correct provider. Testable via curl/Postman.

---

## Phase 3: User Story 1 — Add and Manage AI Providers (Priority: P1) MVP

**Goal**: Users can add multiple AI providers with keys in Settings, see them in a list, select one as active, and remove them. State persists across reloads. Parsing uses the active provider.

**Independent Test**: Open Settings, add Claude + OpenAI + Gemini with keys, switch active, reload page, verify list and active selection persist. Remove a provider, verify it's gone. Submit a food description, verify it parses with the active provider.

### Implementation for User Story 1

- [x] T007 [US1] Update `useSettings` store in `frontend/src/hooks/useSettings.ts`: replace `claudeApiKey` with `aiProviders: AIProviderConfig[]` and `activeProvider: string`; add actions `addProvider`, `removeProvider`, `setActiveProvider`; add migration in Zustand `migrate` (if `claudeApiKey` exists and `aiProviders` is undefined, migrate); update `isConfigured()` to check `aiProviders.length > 0 && activeProvider`
- [x] T008 [US1] Rename `frontend/src/services/claude.ts` to `frontend/src/services/parse.ts`; update `parseFood` to accept `provider` and `apiKey` params and pass `{ provider, apiKey, input }` to `/api/parse`; update all imports in `frontend/src/hooks/useFoodLog.ts` and any test files
- [x] T009 [US1] Update `frontend/src/hooks/useFoodLog.ts`: change `parse` callback to read active provider and its key from settings, pass both to `parseFood(provider, apiKey, input)`
- [x] T010 [US1] Create `ProviderList` component in `frontend/src/components/ProviderList.tsx`: display configured providers as a list with radio/highlight for active; "Remove" button per entry; dropdown (Claude/OpenAI/Gemini filtered to exclude already-added providers) + API key input + "Add" button
- [x] T011 [US1] Update Settings page in `frontend/src/pages/Settings.tsx`: replace "Claude API Key" input section with the `ProviderList` component; remove `claudeKey` local state and `claudeKeyValid` validation

**Checkpoint**: User Story 1 fully functional. Users can manage providers in Settings. Parse flow uses active provider end-to-end.

---

## Phase 4: User Story 3 — Provider-Specific Key Validation (Priority: P2)

**Goal**: When adding a provider, the API key input shows format hints specific to the selected provider.

**Independent Test**: Select Claude in dropdown — enter key without "sk-ant-" prefix, see validation hint. Select OpenAI — enter key without "sk-" prefix, see hint. Select Gemini — any key accepted.

### Implementation for User Story 3

- [x] T012 [US3] Add provider-specific key validation and placeholder text to `ProviderList` component in `frontend/src/components/ProviderList.tsx`: Claude keys must start with "sk-ant-" (hint if not), OpenAI keys must start with "sk-" (hint if not), Gemini has no prefix validation; show provider-appropriate placeholder in the API key input

**Checkpoint**: Validation hints shown per provider when adding keys.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Migration, onboarding, and cleanup

- [x] T013 Update `OnboardingGuide` component in `frontend/src/components/OnboardingGuide.tsx`: change step 1 from "Get a Claude API Key" to a general "Add an AI Provider" section listing all three providers with their key sources

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 (types) — BLOCKS all user stories
- **Phase 3 (US1)**: Depends on Phase 2 — frontend provider management + parse wiring
- **Phase 4 (US3)**: Depends on Phase 3 — modifies ProviderList component from US1
- **Phase 5 (Polish)**: Depends on Phase 3

### Parallel Opportunities

Within Phase 2:
- T004 (OpenAI handler) and T005 (Gemini handler) can run in parallel — different files, no shared dependencies
- T003 must complete first since it establishes the shared pattern and dispatcher
- T006 must come after T004 + T005 to wire them in

---

## Parallel Example: Phase 2

```bash
# After T003 (dispatcher + Claude extraction) completes:
Task: T004 "Implement OpenAI handler in api/src/providers/openai.ts"
Task: T005 "Implement Gemini handler in api/src/providers/gemini.ts"
# After T004 + T005 complete:
Task: T006 "Wire OpenAI and Gemini into parse.ts dispatcher"
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Complete Phase 1: Types (T001-T002)
2. Complete Phase 2: Backend providers + parse refactor (T003-T006)
3. Complete Phase 3: Frontend provider management (T007-T011)
4. **STOP and VALIDATE**: Add a provider, switch active, parse food — verify it works end-to-end
5. This gives a working multi-provider system

### Incremental Delivery

1. Setup + Foundational → Backend ready for all providers
2. US1 → Provider management + parse routing works → MVP
3. US3 → Key format hints → UX polish
4. Polish → Onboarding updates → Production ready

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story
- Commit after each task or logical group
- The `SYSTEM_PROMPT` and tool schema stay in `parse.ts` as shared constants used by all provider handlers
- No `strict: true` for OpenAI — `tool_choice` forcing is sufficient
- Gemini uses `x-goog-api-key` header (not query param) for API key auth
