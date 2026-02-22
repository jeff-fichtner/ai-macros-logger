# Implementation Plan: Meal Grouping

**Branch**: `004-meal-grouping` | **Date**: 2026-02-22 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/004-meal-grouping/spec.md`

## Summary

Add meal grouping to the food logging flow. The AI returns a `meal_label` alongside food items in the same tool call. The frontend generates a group ID per submission, stores both fields as two extra columns in Google Sheets, and displays entries grouped by meal with labels, timestamps, and macro subtotals.

## Technical Context

**Language/Version**: TypeScript 5.9, Node.js 20 LTS
**Primary Dependencies**: React 19, Vite 7, Zustand 5, Azure Functions v4, Tailwind CSS v4
**Storage**: Google Sheets (flat rows with 2 new columns: Group ID, Meal Label)
**Testing**: Vitest 3.x, @testing-library/react, happy-dom
**Target Platform**: Web (Azure Static Web Apps + Azure Functions)
**Project Type**: Web application (frontend SPA + serverless API)
**Constraints**: No server state (constitution I), credentials in request body (constitution II), stateless relay (constitution III)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Zero Server State | PASS | No server-side state. Group ID generated client-side, stored in user's sheet. |
| II. User-Owned Credentials | PASS | No new credentials. Existing API keys and OAuth tokens used as-is. |
| III. Stateless Relay | PASS | Parse endpoint remains a thin proxy — adds `meal_label` to response, no state. |
| IV. No Data Loss | PASS | If sheet write fails, parsed items + label remain visible with retry option. |
| V. Simplicity First | PASS | Two extra columns, one schema change, one UI grouping pass. No new abstractions. |

**Post-design re-check**: All gates still pass. The `meal_label` is extracted from the same tool call response — no additional API calls, no server state, no new dependencies.

## Project Structure

### Documentation (this feature)

```text
specs/004-meal-grouping/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── parse.md         # Updated parse endpoint contract
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (files to modify)

```text
api/
├── src/
│   ├── functions/
│   │   └── parse.ts            # Update system prompt, add meal_label to response
│   └── providers/
│       ├── types.ts            # Add meal_label to TOOL_SCHEMA and types
│       ├── claude.ts           # Extract meal_label from response
│       ├── openai.ts           # Extract meal_label from response
│       └── gemini.ts           # Extract meal_label from response

frontend/
├── src/
│   ├── types/
│   │   └── index.ts            # Add group_id, meal_label to FoodEntry; update AIParseResult
│   ├── services/
│   │   └── sheets.ts           # Extend HEADERS, read/write range A:J, map new columns
│   ├── hooks/
│   │   └── useFoodLog.ts       # Generate group_id, pass meal_label through confirm flow
│   └── components/
│       └── EntryHistory.tsx     # Group entries by group_id, render group headers + subtotals
```

**Structure Decision**: Existing web application structure (frontend/ + api/). No new directories or files needed — all changes modify existing files.

## Key Design Decisions

### 1. Shared TOOL_SCHEMA update
Add `meal_label` as a required top-level string property alongside `items`. All three providers (Claude, OpenAI, Gemini) support this identically — see [research.md](research.md) R1.

### 2. Provider handler return type change
`ProviderHandler` currently returns `Promise<FoodItem[]>`. Change to return `Promise<ParseResult>` where `ParseResult = { meal_label: string; items: FoodItem[] }`. Each provider extracts `meal_label` alongside `items` from the tool call response. Fallback to `"Meal"` if missing.

### 3. Parse endpoint response change
The `/api/parse` endpoint currently returns `{ items: [...] }`. Now returns `{ meal_label: "...", items: [...] }`. The frontend `AIParseResult` type is updated to include `meal_label`.

### 4. Client-side group ID generation
`useFoodLog.ts` generates a group ID via `Date.now().toString(36)` at confirm time. This ID is stored in each `FoodEntry` row in column I. No server involvement.

### 5. Sheet schema extension
- Range changes from `A:H` to `A:J`
- HEADERS array gets `"Group ID"` and `"Meal Label"` appended
- Header row creation updated to `A1:J1`
- `readAllEntries` maps `row[8]` → `group_id`, `row[9]` → `meal_label`
- `writeEntries` appends the two fields to each row array

### 6. EntryHistory grouping
`EntryHistory` receives `FoodEntry[]` and groups by `group_id` preserving insertion order (which is chronological). Each group renders:
- Header: meal label + time
- Items: individual entries (same as current per-entry display)
- Subtotal: summed macros for the group
