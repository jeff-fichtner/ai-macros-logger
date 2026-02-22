# Research: Delete Entries

## R1: Google Sheets Row Deletion API

**Decision**: Use `spreadsheets.batchUpdate` with `deleteDimension` requests to delete rows by index.

**Rationale**: This is the only Sheets API mechanism for removing rows. It operates on 0-based row indices, uses the numeric `sheetId` (not sheet name), and supports batching multiple deletions in a single call.

**Key details**:
- Endpoint: `POST https://sheets.googleapis.com/v4/spreadsheets/{id}:batchUpdate`
- Request body per row: `{ deleteDimension: { range: { sheetId, dimension: "ROWS", startIndex, endIndex } } }`
- `startIndex` is inclusive, `endIndex` is exclusive (so deleting row 5 uses startIndex=5, endIndex=6)
- Multiple `deleteDimension` requests in a single batch execute **sequentially** — indices shift after each deletion
- Therefore: **must submit deletions in descending row order** to avoid index drift
- Requires the numeric `sheetId` (integer), not the sheet title. Retrieved via spreadsheet metadata: `GET /spreadsheets/{id}?fields=sheets.properties(title,sheetId)`

**Alternatives considered**:
- Clear cell contents then compact: More API calls, risk of leaving empty rows, unnecessarily complex
- Delete by matching cell values: Not supported by Sheets API — no "delete where" operation

## R2: Obtaining the Numeric Sheet ID

**Decision**: Add a `getLogSheetId` helper that fetches spreadsheet metadata and returns the numeric `sheetId` for the "Log" sheet. The metadata query in `ensureLogSheet` already fetches `sheets.properties.title`; expand to also include `sheetId` and cache it for the delete call.

**Rationale**: The `deleteDimension` API requires the numeric sheet ID. Currently `ensureLogSheet` already fetches metadata but only reads the title. Expanding the fields param to `sheets.properties(title,sheetId)` adds no extra API calls.

**Alternatives considered**:
- Separate metadata fetch in `deleteEntries`: Extra API call per delete operation
- Assume sheetId=0: Unreliable — the first sheet created gets ID 0, but if "Log" is added later it gets a different ID

## R3: Tracking Row Indices

**Decision**: Add a `sheetRow` field to `FoodEntry`. Populate it in `readAllEntries` based on position: the first data row (index 0 in `rows.slice(1)`) corresponds to 0-based sheet row 1 (row 0 is the header). So `sheetRow = arrayIndex + 1` where arrayIndex is 0-based within `rows.slice(1)`. This value is passed directly to `deleteDimension` as `startIndex` (0-based).

**Rationale**: The UI needs to know which sheet row to delete. The row index is implicit in the order returned by `readAllEntries`. Adding it as a field keeps the data flow simple — entries carry their own identity for deletion.

**Alternatives considered**:
- Re-read the sheet before each delete to find matching rows: Extra API call, race condition risk
- Use a separate ID column in the sheet: Adds schema complexity for no benefit when row index suffices

## R4: Confirmation UX

**Decision**: Use `window.confirm()` for the deletion confirmation prompt.

**Rationale**: Constitution principle V (Simplicity First) — `window.confirm()` is zero-dependency, zero-UI-code, and meets the functional requirement (FR-003). A custom modal would add component code, state management, and animation for a binary yes/no question.

**Alternatives considered**:
- Custom confirmation modal component: Over-engineered for a simple confirm/cancel interaction
- Swipe-to-delete gesture: Platform-specific, complex to implement, not needed for MVP
