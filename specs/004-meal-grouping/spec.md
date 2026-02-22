# Feature Specification: Meal Grouping

**Feature Branch**: `004-meal-grouping`
**Created**: 2026-02-22
**Status**: Draft
**Input**: User description: "Meal grouping for food entries. When a user submits a food description for parsing, all items returned from that single parse request belong to the same 'meal group.' The AI generates a short, descriptive meal label (e.g., 'Breakfast', 'Afternoon Snack', 'Post-Workout Meal') based on the food items, and the timestamp is included alongside the label. In the food log UI, entries are displayed grouped by meal rather than as a flat list. Each group shows its label, timestamp, individual items, and a subtotal row for the group's combined macros."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Meal-Grouped Food Log (Priority: P1)

As a user, when I submit a food description, the AI parses the items and generates a short meal label (e.g., "Breakfast", "Afternoon Snack"). All items from that submission are stored together as a meal group. In the food log, entries are displayed grouped by meal — each group shows its AI-generated label, the time it was logged, the individual food items, and a subtotal row with combined macros. Groups are ordered chronologically (earliest meal at top).

**Why this priority**: This is the entire feature — grouping, labeling, and display are inseparable. A group without a label is meaningless, and a label without grouped display is invisible.

**Independent Test**: Log two separate meals (e.g., "eggs and toast" then "chicken salad and a roll"). Verify the food log shows two distinct groups in chronological order, each with an AI-generated label, timestamp, individual items, and a macro subtotal row.

**Acceptance Scenarios**:

1. **Given** a user submits "2 eggs and toast with butter" at 8:15 AM, **When** they view the food log, **Then** they see a meal group with an AI-generated label (e.g., "Breakfast"), the time "8:15 AM", the individual items listed, and a subtotal row showing combined calories, protein, carbs, and fat.
2. **Given** a user has logged meals at 8:15 AM and 12:30 PM, **When** they view the food log, **Then** the 8:15 AM group appears above the 12:30 PM group (chronological order), each with distinct labels and subtotals.
3. **Given** a user submits a single food description that produces multiple items, **When** the items are saved, **Then** all items from that submission belong to the same meal group.
4. **Given** a user submits "coffee and a croissant", **When** the parse completes, **Then** the system assigns a contextually appropriate meal label such as "Breakfast" or "Morning Coffee".
5. **Given** a user submits a single item like "an apple", **When** the parse completes, **Then** the system still assigns a reasonable label (e.g., "Snack") and displays it as a group of one with a subtotal.
6. **Given** the AI fails to return a meal label, **When** the items are saved, **Then** the group uses a fallback label (e.g., "Meal") and the submission is not blocked.

---

### Edge Cases

- What happens when a submission contains only one item? It still forms a group of one, with its own label and subtotal (which equals the single item's macros).
- What happens when two submissions occur at the exact same minute? Each submission is its own group — they do not merge. Groups are identified by submission, not by time.
- What happens when the daily macro summary is calculated? The daily total must equal the sum of all individual items (same as before), regardless of grouping.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST assign all food items from a single parse submission to the same meal group.
- **FR-002**: The AI MUST generate a short, descriptive meal label for each group as part of the parse response (e.g., "Breakfast", "Afternoon Snack", "Post-Workout Meal").
- **FR-003**: Each meal group MUST store a group identifier, the meal label, and the submission timestamp alongside each food entry row.
- **FR-004**: The food log MUST display entries grouped by meal, with each group showing: the meal label, the submission time, the individual food items, and a subtotal row with combined macros (calories, protein, carbs, fat).
- **FR-005**: Meal groups in the food log MUST be ordered chronologically (earliest first).
- **FR-006**: The daily macro summary MUST remain the sum of all individual food items, unaffected by grouping.
- **FR-007**: The meal group data MUST persist in the same storage as food entries so it survives page reloads.
- **FR-008**: If the AI fails to generate a meal label, the system MUST fall back to a default label (e.g., "Meal") rather than failing the submission.

### Key Entities

- **Meal Group**: Represents a single parse submission. Has a group identifier, an AI-generated label, and a timestamp. Contains one or more Food Entries.
- **Food Entry**: An individual food item with macros. Belongs to exactly one Meal Group. Retains all existing attributes (date, time, description, calories, protein, carbs, fat, raw input).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of new food submissions result in a grouped display with a meal label and subtotal row visible in the food log.
- **SC-002**: Users can identify which items belong to which meal within 2 seconds of viewing the food log.
- **SC-003**: The daily macro totals remain numerically identical with or without grouping (no rounding or aggregation errors).
- **SC-004**: AI-generated meal labels are contextually appropriate for the food items at least 80% of the time (e.g., "Breakfast" for morning foods, "Snack" for single items).

## Assumptions

- The AI provider (Claude, OpenAI, or Gemini) can reliably generate a short meal label as part of the same parse request that returns food items — no separate API call is needed.
- The meal label is a short string (1–4 words) and does not need to be editable by the user in this iteration.
- Group ordering in the food log is chronological (earliest first), not by meal type.
- The group identifier is generated at submission time and stored alongside each food entry — entries sharing the same identifier belong to the same group.
- There is no limit to the number of meal groups per day.

## Out of Scope

- Editing or renaming meal labels after submission.
- Manually reassigning food items to a different meal group.
- Drag-and-drop reordering of meal groups.
- Collapsing or expanding meal groups in the UI (all groups are always expanded).
- Merging two meal groups into one.
