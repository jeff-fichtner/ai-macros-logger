# Tasks: Meal Grouping

**Input**: Design documents from `/specs/004-meal-grouping/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/parse.md

**Tests**: Not explicitly requested in spec. No test tasks included.

**Organization**: Single user story (P1) — all tasks serve US1. Phases reflect the data flow: types first, then API layer, then frontend layer.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1)
- Include exact file paths in descriptions

---

## Phase 1: Foundational — Shared Types & Schema

**Purpose**: Update shared type definitions and tool schema that both API and frontend depend on

- [x] T001 [US1] Add `meal_label` to `TOOL_SCHEMA`, add `ParseResult` type, and update `ProviderHandler` return type in `api/src/providers/types.ts`
- [x] T002 [US1] Add `group_id` and `meal_label` fields to `FoodEntry` type; update `AIParseResult` from `{ items: AIParseItem[] }` to `{ meal_label: string; items: AIParseItem[] }` in `frontend/src/types/index.ts`

**Checkpoint**: Shared types updated — API and frontend layers can now be implemented

---

## Phase 2: API Layer — Provider Handlers & Parse Endpoint

**Purpose**: Update all three provider handlers to extract `meal_label` and return `ParseResult`, then update the parse endpoint to include `meal_label` in its response

- [x] T003 [US1] Update system prompt in `api/src/functions/parse.ts` to instruct AI to return a `meal_label` field (1–4 word meal description)
- [x] T004 [P] [US1] Update Claude provider to extract `meal_label` from tool response, return `ParseResult` with fallback `"Meal"` in `api/src/providers/claude.ts`
- [x] T005 [P] [US1] Update OpenAI provider to extract `meal_label` from parsed tool arguments, return `ParseResult` with fallback `"Meal"` in `api/src/providers/openai.ts`
- [x] T006 [P] [US1] Update Gemini provider to extract `meal_label` from function call args, return `ParseResult` with fallback `"Meal"` in `api/src/providers/gemini.ts`
- [x] T007 [US1] Update parse endpoint to include `meal_label` in response body (`{ meal_label, items }`) in `api/src/functions/parse.ts`

**Checkpoint**: API returns `meal_label` alongside items for all three providers

---

## Phase 3: Frontend Layer — Storage, State & Display

**Purpose**: Extend Google Sheets read/write to handle new columns, update the food log hook to generate group IDs and pass meal labels, and update EntryHistory to render grouped display

- [x] T008 [US1] Extend Google Sheets schema in `frontend/src/services/sheets.ts`: append `"Group ID"` and `"Meal Label"` to `HEADERS`; update `readAllEntries` range from `A:H` to `A:J` and map `row[8]`→`group_id`, `row[9]`→`meal_label`; update `writeEntries` range from `A:H` to `A:J` and append both fields to each row; update `createLogSheet` header range from `A1:H1` to `A1:J1`
- [x] T009 [US1] Update `useFoodLog` hook: store `meal_label` from parse response, generate `group_id` via `Date.now().toString(36)` at confirm time, pass both fields when creating `FoodEntry` objects in `frontend/src/hooks/useFoodLog.ts`
- [x] T010 [US1] Update `ParseResult` component to display the AI-generated `meal_label` above the items list before the user clicks Confirm in `frontend/src/components/ParseResult.tsx`
- [x] T011 [US1] Update `EntryHistory` component: group entries by `group_id` using a `Map` to preserve insertion order (chronological), render group header (meal label + time), individual items per group, and a subtotal row (summed calories, protein, carbs, fat) per group in `frontend/src/components/EntryHistory.tsx`

**Checkpoint**: Full feature functional — meals are grouped with labels, timestamps, and subtotals in the food log

---

## Phase 4: Polish & Validation

**Purpose**: Ensure existing tests pass, verify no regressions

- [x] T012 Run existing test suite (`npm test`) and fix any failures caused by type changes
- [x] T013 Run linter (`npm run lint`) and fix any issues

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Types)**: No dependencies — start immediately
- **Phase 2 (API)**: T001 must complete first (providers depend on new types). T003 before T007 (prompt before endpoint). T004/T005/T006 are parallel after T001.
- **Phase 3 (Frontend)**: T002 must complete first (frontend types). T008 → T009 → T010 → T011 (sheets → hook → parse result → entry history).
- **Phase 4 (Polish)**: After all implementation tasks complete

### Cross-Layer Independence

- Phase 2 (API) and Phase 3 (Frontend) can proceed in parallel after their respective type tasks (T001, T002) complete
- T001 and T002 can run in parallel (different codebases)

### Parallel Opportunities

```text
# After start — types in parallel:
T001 (api types) || T002 (frontend types)

# After T001 — providers in parallel:
T003 (system prompt) → T004 || T005 || T006 (three providers) → T007 (parse endpoint)

# After T002 — frontend sequential:
T008 (sheets) → T009 (hook) → T010 (parse result) → T011 (entry history)

# After all implementation:
T012 || T013 (tests + lint)
```

---

## Implementation Strategy

### Single Story MVP

1. Complete Phase 1 (T001, T002) — shared types
2. Complete Phase 2 (T003–T007) — API returns meal_label
3. Complete Phase 3 (T008–T011) — frontend storage, state, and display
4. Complete Phase 4 (T012–T013) — validate
5. **Manual test**: Follow quickstart.md scenarios

### Execution Flow

```text
T001 ─┬─→ T003 → T004 ┐
      │         T005 ├→ T007 ─────────┐
      │         T006 ┘                │
T002 ─┴─→ T008 → T009 → T010 → T011 ┴→ T012, T013
```

---

## Notes

- All changes modify existing files — no new files created
- The `meal_label` fallback ("Meal") is implemented in each provider handler, not in the frontend
- Group ID is generated client-side only — no server involvement
- Daily macro summary (`computeSummary`) requires no changes — it already sums all individual entries
