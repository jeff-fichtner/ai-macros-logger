# Data Model: Delete Entries

## Entity Changes

### FoodEntry (modified)

Add one field to the existing `FoodEntry` interface:

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| `sheetRow` | `number` | Computed by `readAllEntries` | 0-based sheet row index for use with `deleteDimension` API. Row 0 = header, row 1 = first data row. Equals `arrayIndex + 1` where arrayIndex is 0-based within `rows.slice(1)`. Not stored in the sheet itself. |

All existing fields remain unchanged. `sheetRow` is a transient field populated at read time — it is never written to the Google Sheet.

### MealGroup (unchanged)

The `MealGroup` interface (from `groupEntries.ts`) passes through `FoodEntry` items. Since each item now carries `sheetRow`, no changes needed to `MealGroup` itself. When deleting a group, collect `sheetRow` from all items in the group.

## Deletion Data Flow

1. `readAllEntries` reads all rows from the sheet and assigns `sheetRow` to each `FoodEntry` (sheetRow = arrayIndex + 1, 0-based, where arrayIndex is 0-based within `rows.slice(1)`)
2. Entries flow through `useFoodLog` → `EntryHistory` component, each carrying their `sheetRow`
3. On delete (single item or group), the UI collects the `sheetRow` value(s) and passes them to `deleteEntries`
4. `deleteEntries` sends a `batchUpdate` with `deleteDimension` requests in descending row order
5. After successful deletion, `loadTodaysEntries` re-reads the sheet (new row indices are assigned fresh)

## Sheet ID Resolution

The `deleteDimension` API requires a numeric `sheetId`. This is obtained from spreadsheet metadata:

```
GET /spreadsheets/{id}?fields=sheets.properties(title,sheetId)
```

The response contains `{ sheets: [{ properties: { title: "Log", sheetId: 12345 } }] }`. The `sheetId` for the "Log" sheet is extracted and passed to the `deleteDimension` request.
