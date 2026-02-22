# Tasks: Delete Entries

**Input**: Design documents from `/specs/005-delete-entries/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, quickstart.md

**Tests**: Not explicitly requested — no test tasks included.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Type and service-level changes that both user stories depend on

- [ ] T001 Add `sheetRow: number` field to `FoodEntry` interface in `frontend/src/types/index.ts`
- [ ] T002 Update `readAllEntries` in `frontend/src/services/sheets.ts` to assign `sheetRow` to each entry (sheetRow = arrayIndex + 1, 0-based, where arrayIndex is 0-based within `rows.slice(1)` — row 0 is header, row 1 is first data row). This value is passed directly to `deleteDimension` as `startIndex`.
- [ ] T003 Update `DEFAULTS` record in `frontend/src/services/sheets.ts` to include `sheetRow: 0`
- [ ] T004 Add `getLogSheetId` helper in `frontend/src/services/sheets.ts` that fetches spreadsheet metadata with `fields=sheets.properties(title,sheetId)` and returns the numeric `sheetId` for the "Log" sheet (throw `SheetsApiError` if not found)
- [ ] T005 Add `deleteEntries` function in `frontend/src/services/sheets.ts` that accepts `spreadsheetId`, `accessToken`, and `sheetRows: number[]`; calls `getLogSheetId` to get the numeric sheet ID; builds `deleteDimension` requests sorted in descending row order (to avoid index shift); sends a single `batchUpdate` POST to `spreadsheets/{id}:batchUpdate`

**Checkpoint**: Type and service layer ready — both user stories can now be implemented

---

## Phase 2: User Story 1 - Delete Entire Meal Group (Priority: P1) 🎯 MVP

**Goal**: Users can delete all entries in a meal group with one action. The meal group disappears from the entry history, daily summary recalculates, and rows are removed from the Google Sheet.

**Independent Test**: Log a meal, tap delete on the group header, confirm, verify the group disappears and summary updates.

### Implementation for User Story 1

- [ ] T006 [US1] Add `deleteGroup` callback in `frontend/src/hooks/useFoodLog.ts` that accepts a `groupId: string`, collects `sheetRow` values from all entries with that `group_id`, calls `deleteEntries` from sheets service, then calls `loadTodaysEntries` to refresh state. Include 401 retry with token refresh (same pattern as `confirm`).
- [ ] T007 [US1] Add `deleteError` state (`string | null`) to `useFoodLog` hook in `frontend/src/hooks/useFoodLog.ts` and expose it in the return object. Set it on deletion failure, clear it on successful deletion or new deletion attempt.
- [ ] T008 [US1] Add a `deleting` status value to the `Status` type union in `frontend/src/hooks/useFoodLog.ts` (becomes `'idle' | 'parsing' | 'writing' | 'loading' | 'deleting'`)
- [ ] T009 [US1] Add delete button to the meal group header row in `frontend/src/components/EntryHistory.tsx` — a small X/trash button next to the meal label. On click, call `window.confirm('Delete this entire meal?')` and if confirmed, invoke `onDeleteGroup(group.group_id)`.
- [ ] T010 [US1] Update `EntryHistoryProps` in `frontend/src/components/EntryHistory.tsx` to accept `onDeleteGroup: (groupId: string) => void`, `deleting: boolean`, and `deleteError: string | null`. Show inline error message when `deleteError` is set. Disable delete buttons while `deleting` is true.
- [ ] T011 [US1] Wire `deleteGroup`, `deleteError`, and `deleting` status from `useFoodLog` hook into `EntryHistory` component in `frontend/src/pages/FoodLog.tsx`

**Checkpoint**: Meal group deletion is fully functional and testable independently

---

## Phase 3: User Story 2 - Delete Individual Entry (Priority: P2)

**Goal**: Users can delete a single entry from within a meal group. Only that item is removed; the rest of the group and its subtotals update. If the last item is deleted, the entire group disappears.

**Independent Test**: Log a meal with 3 items, delete one item, verify only that item disappears and subtotals recalculate.

### Implementation for User Story 2

- [ ] T012 [US2] Add `deleteEntry` callback in `frontend/src/hooks/useFoodLog.ts` that accepts a single `sheetRow: number`, calls `deleteEntries` with `[sheetRow]`, then calls `loadTodaysEntries` to refresh. Include 401 retry with token refresh.
- [ ] T013 [US2] Add per-item delete button in `frontend/src/components/EntryHistory.tsx` — a small X button on each entry row. On click, call `window.confirm('Delete this entry?')` and if confirmed, invoke `onDeleteEntry(entry.sheetRow)`.
- [ ] T014 [US2] Update `EntryHistoryProps` in `frontend/src/components/EntryHistory.tsx` to accept `onDeleteEntry: (sheetRow: number) => void`
- [ ] T015 [US2] Wire `deleteEntry` from `useFoodLog` hook into `EntryHistory` component in `frontend/src/pages/FoodLog.tsx`

**Checkpoint**: Both meal group and individual entry deletion work independently. FR-010 (last item removes group) is handled automatically by `loadTodaysEntries` refresh.

---

## Phase 4: Polish & Cross-Cutting Concerns

**Purpose**: Validation, cleanup, and test fixes

- [ ] T016 Run TypeScript type check (`cd frontend && npx tsc --noEmit`) and fix any type errors
- [ ] T017 Run existing test suite (`cd frontend && npx vitest run`) and fix any broken tests caused by the new `sheetRow` field on `FoodEntry` (update test helpers like `makeEntry` in `frontend/src/utils/entryTime.test.ts` and mock data in `frontend/src/hooks/useFoodLog.test.ts` and `frontend/src/services/sheets.test.ts`)
- [ ] T018 Run linter (`cd frontend && npm run lint`) and fix any lint errors

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **User Story 1 (Phase 2)**: Depends on Setup (Phase 1) completion
- **User Story 2 (Phase 3)**: Depends on Setup (Phase 1) completion. Can run in parallel with US1 but shares `EntryHistory.tsx`, so sequential execution is safer.
- **Polish (Phase 4)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Depends only on Phase 1. Delivers meal group deletion as standalone MVP.
- **User Story 2 (P2)**: Depends only on Phase 1 for service layer. Shares UI component (`EntryHistory.tsx`) with US1, so execute after US1 to avoid merge conflicts.

### Within Each User Story

- Hook changes before component changes
- Component prop updates before wiring in page
- Service layer (Phase 1) before hook layer (Phases 2-3)

### Parallel Opportunities

- T001, T004 can run in parallel (different sections of different files)
- T002, T003 must be sequential (same function area in sheets.ts)
- T006, T007, T008 are in the same file — sequential
- T009, T010 are in the same file — sequential

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T005)
2. Complete Phase 2: User Story 1 (T006–T011)
3. **STOP and VALIDATE**: Test meal group deletion independently
4. Run type check and tests (T016–T018 subset)

### Incremental Delivery

1. Setup → Type + service layer ready
2. Add User Story 1 → Meal group deletion works → Validate
3. Add User Story 2 → Individual entry deletion works → Validate
4. Polish → All tests pass, types clean, lint clean

---

## Notes

- `sheetRow` is transient — populated by `readAllEntries`, never written to the sheet
- `deleteEntries` sorts rows descending before building `deleteDimension` requests (sequential execution causes index shift)
- After every deletion, `loadTodaysEntries` re-reads the entire sheet — ensures fresh row indices and consistent state
- `window.confirm()` is used for deletion prompts per research decision R4 (Simplicity First)
- FR-010 (last item removes entire group) requires no special code — `loadTodaysEntries` refresh + `groupEntries` naturally handles it
