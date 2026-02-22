# Data Model: Refine Parse Results

**Feature**: 006-refine-parse-results
**Date**: 2026-02-22

## Overview

This feature introduces no new persistent entities. All refinement state is ephemeral — it exists only in React component state during the active parse session and is discarded on confirm or cancel.

## Ephemeral State (Frontend Only)

### Refinement History

| Field | Type | Description |
|-------|------|-------------|
| refinementHistory | `string[]` | Ordered list of refinement instructions submitted during the current parse session |

**Lifecycle**:
- Created: Empty array `[]` when `parse()` is called
- Appended: New instruction added after each successful `refine()` call
- Cleared: Reset to `[]` on `confirm()`, `cancel()`, or `dismiss()`

### Status Extension

The existing `Status` type union in `useFoodLog` gains one new value:

| Value | Trigger | Effect |
|-------|---------|--------|
| `'refining'` | User submits a refinement | Refine button shows loading, Confirm/Cancel/Refine buttons disabled |

Full union: `'idle' | 'parsing' | 'writing' | 'loading' | 'deleting' | 'refining'`

## Existing Entities (Unchanged)

### AIParseResult

No changes. The refinement response from the AI uses the same `AIParseResult` shape as the initial parse.

```typescript
interface AIParseResult {
  meal_label: string;
  items: AIParseItem[];
}
```

### FoodEntry

No changes. Confirmed entries (whether refined or not) are written to Google Sheets in the same format.

## Data Flow

```
parse("3 eggs and toast")
  → parseResult: AIParseResult
  → refinementHistory: []

refine("make it 2 eggs")
  → parseResult: AIParseResult (updated)
  → refinementHistory: ["make it 2 eggs"]

refine("add butter")
  → parseResult: AIParseResult (updated again)
  → refinementHistory: ["make it 2 eggs", "add butter"]

confirm()
  → parseResult: null
  → refinementHistory: []
  → entries written to Google Sheets
```
