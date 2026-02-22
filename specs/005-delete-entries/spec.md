# Feature Specification: Delete Entries

**Feature Branch**: `005-delete-entries`
**Created**: 2026-02-22
**Status**: Draft
**Input**: User description: "Delete individual food entries and entire meal groups. Users can remove a single item from a meal group or delete an entire meal group at once. Deletions are reflected both in the UI and in the Google Sheet (rows are removed from the sheet). After deletion, the daily summary and entry history update immediately."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Delete Entire Meal Group (Priority: P1)

A user reviews today's entry history and realizes they logged the wrong meal entirely. They tap a delete button on the meal group header and confirm the deletion. All items in that meal group are removed from the Google Sheet and the entry history updates immediately, along with the daily macro summary.

**Why this priority**: Deleting an entire meal is the most common correction scenario (e.g., duplicate log, wrong meal logged). It provides the highest value per interaction since it removes multiple rows at once.

**Independent Test**: Can be fully tested by logging a meal, then deleting the meal group and verifying the entries disappear from the UI and the Google Sheet rows are removed.

**Acceptance Scenarios**:

1. **Given** a meal group with 3 items is displayed in the entry history, **When** the user taps the delete button on the meal group and confirms, **Then** all 3 items are removed from the Google Sheet and the entry history no longer shows that meal group.
2. **Given** a meal group is deleted, **When** the deletion completes, **Then** the daily macro summary recalculates to exclude the deleted items.
3. **Given** a meal group is deleted, **When** the deletion completes, **Then** the "last ate at" timestamp updates to reflect the most recent remaining entry (or disappears if no entries remain).
4. **Given** the user taps the delete button on a meal group, **When** a confirmation prompt appears, **Then** the user can cancel without any data being deleted.

---

### User Story 2 - Delete Individual Entry (Priority: P2)

A user reviews today's entry history and notices one item in a meal group is incorrect (e.g., they didn't actually eat the side salad). They tap a delete button next to that specific item and confirm. Only that single item is removed from the Google Sheet while the rest of the meal group remains intact. The daily summary and meal group subtotals update immediately.

**Why this priority**: Individual item deletion is a finer-grained correction. It depends on the same delete infrastructure as meal group deletion but targets a single row. Slightly less common than deleting an entire meal but still essential for accurate tracking.

**Independent Test**: Can be fully tested by logging a meal with multiple items, deleting one item, and verifying only that item disappears while the rest of the meal group and its subtotals remain correct.

**Acceptance Scenarios**:

1. **Given** a meal group with 3 items, **When** the user deletes one item and confirms, **Then** only that item's row is removed from the Google Sheet and the remaining 2 items still display in the meal group.
2. **Given** an item is deleted from a meal group, **When** the deletion completes, **Then** the meal group subtotals recalculate to exclude the deleted item.
3. **Given** an item is deleted from a meal group, **When** the deletion completes, **Then** the daily macro summary recalculates to exclude the deleted item.
4. **Given** a meal group has only 1 item, **When** the user deletes that item and confirms, **Then** the entire meal group disappears from the entry history (no empty group shell remains).

---

### Edge Cases

- What happens when a Google Sheets API call to delete fails (network error, 401, 429)? The UI should show an error message and leave the entries unchanged — no partial deletion.
- What happens if the user deletes entries while offline or the access token has expired? The system should attempt a token refresh (existing pattern) and retry once before showing an auth error.
- What happens if another device has already modified the sheet (e.g., the row the user is trying to delete no longer exists)? The system should handle 404/range-not-found gracefully and still refresh the entry list.
- What happens when all entries for today are deleted? The summary should reset to zero and the entry history should show the empty state message.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow users to delete all entries in a meal group with a single action.
- **FR-002**: System MUST allow users to delete a single entry from within a meal group.
- **FR-003**: System MUST show a confirmation prompt before executing any deletion.
- **FR-004**: System MUST remove the corresponding row(s) from the Google Sheet when an entry is deleted.
- **FR-005**: System MUST recalculate and update the daily macro summary immediately after deletion.
- **FR-006**: System MUST update the entry history immediately after deletion (removed entries disappear, subtotals recalculate).
- **FR-007**: System MUST update the "last ate at" timestamp after deletion to reflect the most recent remaining entry.
- **FR-008**: System MUST handle deletion failures gracefully — show an error message and leave entries unchanged on failure.
- **FR-009**: System MUST attempt a token refresh and retry when deletion fails with a 401 (existing auth refresh pattern).
- **FR-010**: When the last item in a meal group is deleted, the system MUST remove the entire meal group from the display (no empty group shell).

### Key Entities

- **Food Entry**: A single food item row in the Google Sheet. Identified by its row position in the sheet. Belongs to a meal group via the Group ID field.
- **Meal Group**: A collection of food entries sharing the same Group ID. Displayed as a single card in the entry history with a header showing meal label and time.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can delete an entire meal group in under 3 taps (delete button, confirm, done).
- **SC-002**: Users can delete a single entry in under 3 taps (delete button, confirm, done).
- **SC-003**: Daily macro summary and entry history update within 2 seconds of deletion confirmation.
- **SC-004**: Deletion failures display a user-friendly error message without corrupting local state or sheet data.
- **SC-005**: 100% of deleted entries are removed from the Google Sheet (no orphaned rows).
