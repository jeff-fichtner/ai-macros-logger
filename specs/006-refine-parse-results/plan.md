# Implementation Plan: Refine Parse Results

**Branch**: `006-refine-parse-results` | **Date**: 2026-02-22 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/006-refine-parse-results/spec.md`

## Summary

Add a refinement workflow to the food parse flow. After AI returns parsed items, users can type a correction (e.g., "make it 2 eggs") in a text field within the parse result card. The frontend constructs a combined prompt containing the original input, current results, and refinement instruction, then sends it to the existing `/api/parse` endpoint. No backend changes needed — the API treats refinement requests identically to initial parses.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20 LTS
**Primary Dependencies**: React 19, Vite, Zustand 5, Tailwind CSS v4
**Storage**: Browser localStorage (Zustand persist), Google Sheets (data)
**Testing**: Vitest 3.x, @testing-library/react, happy-dom
**Target Platform**: Browser SPA (Azure Static Web Apps)
**Project Type**: Web application (frontend SPA + serverless API)
**Constraints**: Stateless backend relay (Constitution III), no server-side state (Constitution I)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Zero Server State | PASS | No server-side changes. Refinement history is client-side only. |
| II. User-Owned Credentials | PASS | No credential changes. Same API key flow as initial parse. |
| III. Stateless Relay | PASS | Backend is untouched. Frontend constructs the refinement prompt and sends it as a plain `input` string to the existing `/api/parse` endpoint. |
| IV. No Data Loss | PASS | Failed refinements preserve the previous valid results. User can still confirm previous results or retry. |
| V. Simplicity First | PASS | No new endpoints, no new components, no abstractions. One new state variable (refinement history array), one new callback, one text field added to existing component. |

## Project Structure

### Documentation (this feature)

```text
specs/006-refine-parse-results/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── components/
│   │   └── ParseResult.tsx     # Add refinement text input + Refine button
│   ├── hooks/
│   │   └── useFoodLog.ts       # Add refine callback, refinementHistory state, 'refining' status
│   ├── pages/
│   │   └── FoodLog.tsx          # Wire refine callback + refining status to ParseResult
│   ├── services/
│   │   └── parse.ts             # Add buildRefinementPrompt helper (pure function)
│   └── types/
│       └── index.ts             # No changes needed (AIParseResult unchanged)
api/                              # NO CHANGES — backend is untouched
```

**Structure Decision**: Existing web application structure. Only frontend files are modified. No new files created — all changes are additions to existing files.

## Architecture

### Refinement Prompt Construction

The frontend builds a combined prompt string from the original input, current results, and refinement instruction:

```
Original: "3 eggs and toast"
Current results:
- Scrambled Eggs (3 large): 234 cal, P: 18g, C: 2g, F: 17g
- Toast (1 slice, white): 79 cal, P: 3g, C: 13g, F: 1g
Refinement: "make it 2 eggs"
```

This string is passed to `parseFood()` as the `input` parameter. The backend processes it identically to any other parse request. The AI's system prompt already instructs it to extract food items from natural language — the structured format above gives it enough context to produce corrected results.

### State Management

New state in `useFoodLog`:
- `refinementHistory: string[]` — accumulates refinement instructions within a single parse session
- `'refining'` added to `Status` union

New callback in `useFoodLog`:
- `refine(instruction: string)` — builds the combined prompt, calls `parseFood`, updates `parseResult` on success

Cleared on confirm/cancel:
- `refinementHistory` reset to `[]`

### Data Flow

```
User types refinement → refine(instruction) called
  → buildRefinementPrompt(rawInput, parseResult, [...history, instruction])
  → parseFood(provider, apiKey, combinedPrompt)
  → success: setParseResult(newResult), push instruction to history
  → failure: setError(message), preserve previous parseResult
```

### UI Changes

In `ParseResult.tsx`, add between the items list and the action buttons:
1. A text input for the refinement instruction
2. A "Refine" submit button
3. Loading state on the button when `refining` is true
4. All buttons (Refine, Confirm, Cancel) disabled when refining

## Complexity Tracking

No constitution violations — this table is intentionally empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| *(none)* | | |
