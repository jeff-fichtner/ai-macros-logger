# Tasks: Refine Parse Results

**Input**: Design documents from `/specs/006-refine-parse-results/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, quickstart.md

**Tests**: Not explicitly requested — no test tasks included.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Service-layer helper and hook state changes that both user stories depend on

- [ ] T001 Add `buildRefinementPrompt` pure function in `frontend/src/services/parse.ts` that accepts `originalInput: string`, `currentResult: AIParseResult`, and `refinements: string[]`, and returns a single prompt string in the format: `Original: "{originalInput}"\nCurrent results:\n{formatted items}\nRefinement: "{latest refinement}"`. Include all prior refinements in the prompt body for full context (per research R3).
- [ ] T002 Add `'refining'` to the `Status` type union in `frontend/src/hooks/useFoodLog.ts` (becomes `'idle' | 'parsing' | 'writing' | 'loading' | 'deleting' | 'refining'`)
- [ ] T003 Add `refinementHistory` state (`string[]`, initial `[]`) to `useFoodLog` hook in `frontend/src/hooks/useFoodLog.ts` and expose it in the return object
- [ ] T004 Clear `refinementHistory` to `[]` inside the existing `confirm`, `cancel`, and `dismiss` callbacks in `frontend/src/hooks/useFoodLog.ts`

**Checkpoint**: Service helper and hook state are ready — both user stories can now be implemented

---

## Phase 2: User Story 1 - Refine Parsed Results (Priority: P1) 🎯 MVP

**Goal**: Users can type a correction in a text field within the parse result card and submit it. The system sends the original input + current results + refinement to the AI, which returns updated results. Users can refine multiple times before confirming.

**Independent Test**: Parse "3 eggs and toast", see results, type "make it 2 eggs" in refinement input, submit, verify the eggs quantity updates to 2 in the displayed results.

### Implementation for User Story 1

- [ ] T005 [US1] Add `refine` callback in `frontend/src/hooks/useFoodLog.ts` that accepts an `instruction: string`; guards against empty string (FR-010); sets status to `'refining'`; calls `buildRefinementPrompt(rawInput, parseResult, [...refinementHistory, instruction])` then `parseFood(provider, apiKey, combinedPrompt)`; on success: sets `parseResult` to new result and appends `instruction` to `refinementHistory`; on failure: sets `error` message but preserves existing `parseResult` (FR-007); always resets status to `'idle'`
- [ ] T006 [US1] Update `ParseResultProps` in `frontend/src/components/ParseResult.tsx` to accept `onRefine: (instruction: string) => void` and `refining: boolean`
- [ ] T007 [US1] Add refinement UI to `frontend/src/components/ParseResult.tsx` — between the items list and the action buttons, add a text input and a "Refine" submit button. The input clears after successful submission. Show "Refining..." on the button when `refining` is true. Disable Refine, Confirm, and Cancel buttons while `refining` is true (FR-006). Ignore empty submissions (FR-010).
- [ ] T008 [US1] Wire `refine` callback and `refining` status from `useFoodLog` hook into `ParseResult` component in `frontend/src/pages/FoodLog.tsx` — pass `onRefine={refine}` and `refining={status === 'refining'}`

**Checkpoint**: Core refinement flow is fully functional and testable independently

---

## Phase 3: User Story 2 - Refinement Error Handling (Priority: P2)

**Goal**: When a refinement request fails, the user sees an error message but the previous results remain visible and confirmable. The user can retry the refinement or confirm the previous results.

**Independent Test**: Parse a meal, trigger a refinement that fails, verify the error message appears and the previous results remain intact and confirmable.

### Implementation for User Story 2

- [ ] T009 [US2] Add `refineError` state (`string | null`) to `useFoodLog` hook in `frontend/src/hooks/useFoodLog.ts`; set it on refinement failure in the `refine` callback; clear it on new refinement attempt, confirm, cancel, or dismiss; expose it in the return object
- [ ] T010 [US2] Update `ParseResultProps` in `frontend/src/components/ParseResult.tsx` to accept `refineError: string | null`; display an inline error message below the refinement input when `refineError` is set
- [ ] T011 [US2] Wire `refineError` from `useFoodLog` hook into `ParseResult` component in `frontend/src/pages/FoodLog.tsx`

**Checkpoint**: Both refinement flow and error handling work independently. Users can confirm previous results after a failed refinement.

---

## Phase 4: Polish & Cross-Cutting Concerns

**Purpose**: Validation, cleanup, and test fixes

- [ ] T012 Run TypeScript type check (`cd frontend && npx tsc --noEmit`) and fix any type errors
- [ ] T013 Run existing test suite (`cd frontend && npx vitest run`) and fix any broken tests caused by the new `refine` callback, `refinementHistory` state, or `'refining'` status (update mock return objects in `frontend/src/hooks/useFoodLog.test.ts` if needed)
- [ ] T014 Run linter (`cd frontend && npm run lint`) and fix any lint errors

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **User Story 1 (Phase 2)**: Depends on Setup (Phase 1) completion
- **User Story 2 (Phase 3)**: Depends on User Story 1 (Phase 2) completion — shares `ParseResult.tsx` and `useFoodLog.ts` error handling
- **Polish (Phase 4)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Depends only on Phase 1. Delivers core refinement as standalone MVP.
- **User Story 2 (P2)**: Depends on US1 for the `refine` callback structure. Adds error state and error display.

### Within Each User Story

- Hook changes before component changes
- Component prop updates before wiring in page
- Service layer (Phase 1) before hook layer (Phase 2)

### Parallel Opportunities

- T001 can run in parallel with T002/T003/T004 (different files)
- T002, T003, T004 are in the same file — sequential
- T006, T007 are in the same file — sequential
- T009, T010 share modifications with T005/T007 respectively — sequential after their phase

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T004)
2. Complete Phase 2: User Story 1 (T005–T008)
3. **STOP and VALIDATE**: Test refinement flow independently
4. Run type check and tests (T012–T014 subset)

### Incremental Delivery

1. Setup → Service helper + hook state ready
2. Add User Story 1 → Core refinement works → Validate
3. Add User Story 2 → Error handling works → Validate
4. Polish → All tests pass, types clean, lint clean

---

## Notes

- `buildRefinementPrompt` is a pure function — no side effects, easy to test if needed later
- The combined prompt includes current AI results (not just refinement instructions) so the AI can see exactly what it's correcting
- `refinementHistory` is ephemeral — cleared on confirm, cancel, or dismiss
- No backend changes — the existing `/api/parse` endpoint processes refinement requests identically to initial parses
- The `refine` callback follows the same pattern as `parse` but preserves `parseResult` on failure instead of clearing it
- FR-010 (empty refinement ignored) is handled in the `refine` callback with an early return
