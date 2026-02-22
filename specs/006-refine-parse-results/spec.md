# Feature Specification: Refine Parse Results

**Feature Branch**: `006-refine-parse-results`
**Created**: 2026-02-22
**Status**: Draft
**Input**: User description: "Refine parsed results before confirming. After AI returns parsed food items, show a text input above the Confirm button that lets the user type refinement instructions (e.g. 'actually that was 2 eggs not 3', 'remove the rice', 'add a side of broccoli'). Submitting the refinement re-sends the original input plus the refinement prompt to the AI, which returns updated results. The user can refine multiple times before confirming. The refinement input should be a simple text field with a 'Refine' submit button. While refining, show a loading state similar to the initial parse."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Refine Parsed Results (Priority: P1)

After the AI parses a food description and displays the results, the user notices something is wrong — an incorrect quantity, a missing item, or an extra item they didn't mean. Instead of cancelling and re-typing the entire input, the user types a correction in a refinement text field (e.g., "actually that was 2 eggs not 3") and submits it. The system sends the original food description together with the refinement instruction to the AI, which returns corrected results. The updated results replace the previous ones in the same parse result card. The user can repeat this process as many times as needed before confirming.

**Why this priority**: This is the entire feature. Without refinement capability there is nothing to deliver.

**Independent Test**: Parse a meal ("3 eggs and toast"), see results, type "make it 2 eggs" in refinement input, submit, verify the eggs quantity updates to 2 in the displayed results.

**Acceptance Scenarios**:

1. **Given** parsed results are displayed, **When** the user types a refinement instruction and submits, **Then** the system sends the original input and refinement to the AI and displays updated results.
2. **Given** refined results are displayed, **When** the user types another refinement and submits, **Then** the system sends the original input plus all prior refinements and the new refinement to the AI and displays updated results.
3. **Given** refinement is in progress, **When** the AI is processing, **Then** a loading indicator is shown and the Refine button is disabled.
4. **Given** refined results are displayed, **When** the user clicks Confirm, **Then** the refined results are saved (same behavior as confirming initial results).
5. **Given** refined results are displayed, **When** the user clicks Cancel, **Then** all results and refinement state are cleared (same behavior as cancelling initial results).

---

### User Story 2 - Refinement Error Handling (Priority: P2)

The AI refinement request fails (network error, rate limit, or other API error). The user sees an error message but the previously displayed results remain visible. The user can try the refinement again or proceed to confirm the last successful results.

**Why this priority**: Error resilience is important but secondary to the core refinement flow.

**Independent Test**: Parse a meal, trigger a refinement that fails (e.g., network disconnected), verify the error message appears and the previous results remain intact and confirmable.

**Acceptance Scenarios**:

1. **Given** parsed results are displayed and a refinement request fails, **When** the error occurs, **Then** an error message is shown, the previous results remain displayed, and the user can still Confirm the previous results or retry the refinement.
2. **Given** a refinement error is displayed, **When** the user submits a new refinement, **Then** the error is cleared and the new refinement is attempted.

---

### Edge Cases

- What happens when the user submits an empty refinement? The system ignores it (does not send a request).
- What happens when the user submits a refinement that the AI cannot interpret? The AI returns its best interpretation; the user can refine again or cancel.
- What happens when the user submits a refinement while another is already in progress? The submit button is disabled during processing, preventing concurrent requests.
- What happens if the refinement returns a completely different meal structure (different number of items)? The full result set is replaced — the display always reflects the latest AI response.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display a text input field and a "Refine" submit button within the parse result card when results are shown.
- **FR-002**: System MUST send the original food description and the refinement instruction to the AI when the user submits a refinement.
- **FR-003**: System MUST include all prior refinement instructions (conversation history) when sending subsequent refinements, so the AI has full context of the correction chain.
- **FR-004**: System MUST replace the displayed results with the AI's updated response after a successful refinement.
- **FR-005**: System MUST show a loading state on the Refine button while the AI is processing a refinement request.
- **FR-006**: System MUST disable the Refine button, Confirm button, and Cancel button while a refinement is in progress.
- **FR-007**: System MUST preserve the previous results when a refinement request fails, allowing the user to confirm those results or retry.
- **FR-008**: System MUST display an error message when a refinement request fails.
- **FR-009**: System MUST clear all refinement state (input text, refinement history, error) when the user confirms or cancels.
- **FR-010**: System MUST ignore empty refinement submissions (no AI request sent).
- **FR-011**: System MUST allow unlimited sequential refinements before confirming.

### Key Entities

- **Refinement Instruction**: A natural-language correction the user provides to modify parsed results. Contains the text of the instruction and its position in the refinement chain.
- **Refinement History**: The ordered list of all refinement instructions submitted during a single parse session. Cleared on confirm or cancel.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can submit a refinement and see updated results within the same time it takes for an initial parse (no additional perceived delay beyond AI processing).
- **SC-002**: Users can perform 5 or more sequential refinements without any loss of context or degraded accuracy.
- **SC-003**: 100% of refinement errors preserve the previous valid results for the user to confirm or retry.
- **SC-004**: Refinement workflow adds no more than 1 additional user action (type + submit) compared to cancelling and re-entering the full food description.

## Assumptions

- The AI service (parse endpoint) can accept additional context (original input + refinement instructions) and return corrected results in the same response format as the initial parse.
- Refinement history is ephemeral — it exists only during the active parse session and is discarded on confirm or cancel.
- The refinement text field uses the same input pattern as the main food input (plain text, single-line or multi-line).
- No character limit is enforced on refinement instructions beyond reasonable browser input limits.

## Out of Scope

- Inline editing of individual macro values or item descriptions directly in the result card.
- Undo/redo of individual refinements (user can only refine forward or cancel entirely).
- Persisting refinement history across sessions or after confirmation.
