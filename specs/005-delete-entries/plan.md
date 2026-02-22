# Implementation Plan: Delete Entries

**Branch**: `005-delete-entries` | **Date**: 2026-02-22 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/005-delete-entries/spec.md`

## Summary

Add the ability to delete individual food entries and entire meal groups. Deletion removes rows from the Google Sheet via the `batchUpdate` / `deleteDimension` API, then refreshes local state. Requires tracking sheet row indices on `FoodEntry`, a new `deleteEntries` service function, delete handlers in `useFoodLog`, and delete buttons with confirmation UI in `EntryHistory`.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20 LTS
**Primary Dependencies**: React 19, Vite, Zustand 5, Tailwind CSS v4
**Storage**: Google Sheets API (single "Log" sheet per user)
**Testing**: Vitest 3.x, @testing-library/react, happy-dom
**Target Platform**: Static SPA (Azure Static Web Apps)
**Project Type**: Web application (frontend SPA + Azure Functions backend)
**Performance Goals**: Deletion + UI refresh within 2 seconds (SC-003)
**Constraints**: All credentials user-owned (localStorage), stateless backend, HTTPS only
**Scale/Scope**: Single user per spreadsheet

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Zero Server State | PASS | Deletion is a direct client→Google Sheets API call. No server state involved. |
| II. User-Owned Credentials | PASS | Uses existing `googleAccessToken` from localStorage. No new credential flows. |
| III. Stateless Relay | PASS | No backend involvement. Delete calls go directly from browser to Sheets API. |
| IV. No Data Loss | PASS | Deletion is user-initiated with confirmation prompt. No accidental data loss. Failures leave data unchanged. |
| V. Simplicity First | PASS | Single new service function (`deleteEntries`), modification to existing hook and component. No new abstractions. |

No violations. No Complexity Tracking entries needed.

## Project Structure

### Documentation (this feature)

```text
specs/005-delete-entries/
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
│   ├── types/index.ts          # Add sheetRow to FoodEntry
│   ├── services/sheets.ts      # Add deleteEntries(), update readAllEntries() to track row index, add getLogSheetId()
│   ├── hooks/useFoodLog.ts     # Add deleteEntry() and deleteGroup() handlers with 401 refresh
│   ├── components/
│   │   └── EntryHistory.tsx     # Add delete buttons for items and groups, confirmation prompt
│   └── utils/groupEntries.ts   # No changes needed (sheetRow passes through)
├── src/services/sheets.test.ts # Add deleteEntries tests
└── src/hooks/useFoodLog.test.ts # Add delete handler tests
```

**Structure Decision**: Existing web application structure. All changes are additions to existing files — no new files needed.

## Complexity Tracking

No violations to justify.
