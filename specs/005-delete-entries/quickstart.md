# Quickstart: Delete Entries

## Test Scenarios

### Scenario 1: Delete a single entry from a multi-item meal group

1. Log a meal with 3 items (e.g., "chicken, rice, salad")
2. Observe the meal group appears in Today's Entries with 3 items and correct subtotals
3. Tap the delete button (X) next to "salad"
4. Confirm the deletion in the prompt
5. Verify: "salad" disappears, meal group now shows 2 items, subtotals recalculate, daily summary updates

### Scenario 2: Delete an entire meal group

1. Log a meal with 2+ items
2. Tap the delete button on the meal group header
3. Confirm the deletion
4. Verify: the entire meal group card disappears, daily summary recalculates

### Scenario 3: Delete the last item in a meal group

1. Log a meal with 1 item (or delete items until 1 remains)
2. Delete that last item
3. Verify: the entire meal group card disappears (no empty shell remains)

### Scenario 4: Delete all entries for today

1. Delete all meal groups
2. Verify: entry history shows "No entries today. Log a meal to get started."
3. Verify: daily summary shows zeros
4. Verify: "Last ate at" either disappears or shows a previous day's timestamp

### Scenario 5: Cancel a deletion

1. Tap a delete button on any entry or group
2. Cancel the confirmation prompt
3. Verify: nothing changes — all entries and totals remain as they were

### Scenario 6: Deletion fails (simulated)

1. Disconnect network or use expired token
2. Attempt to delete an entry
3. Verify: error message appears, entries remain unchanged

## Integration Notes

- All delete operations go directly from browser to Google Sheets API (no backend relay)
- After each deletion, `loadTodaysEntries` re-reads the full sheet to ensure consistency
- Row indices are recalculated on every read — stale indices from before a delete are never reused
