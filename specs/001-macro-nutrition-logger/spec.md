# Feature Specification: AI Macro Nutrition Logger

**Feature Branch**: `001-macro-nutrition-logger`
**Created**: 2026-02-20
**Status**: Draft
**Input**: User description: "AI-powered macro nutrition logger with natural language food input, AI-driven macro parsing with confidence warnings, Google Sheets as user-owned data store, and a stateless serverless relay."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Log a Meal via Natural Language (Priority: P1)

A user opens the app, types a free-text description of what they ate (e.g., "2 scrambled eggs, slice of sourdough with butter, black coffee"), and submits it. The system parses the input into individual food items with calorie, protein, carb, and fat values. The user reviews the parsed results — including any warnings about ambiguous quantities — and confirms. The entry is saved to their personal spreadsheet, and the daily totals update to reflect the new entry.

**Why this priority**: This is the core value proposition. Without the ability to log food and get macro data back, nothing else matters.

**Independent Test**: Can be fully tested by entering a food description and verifying that parsed macro data appears on screen, a row is written to the spreadsheet at the top of the log, and daily totals update accordingly.

**Acceptance Scenarios**:

1. **Given** a configured user with valid credentials, **When** they type "chicken breast and rice" and submit, **Then** the system returns structured macro data (calories, protein, carbs, fat) for each item and displays it for review.
2. **Given** the user reviews parsed results, **When** they confirm, **Then** a new row is inserted at the top of their spreadsheet log (below the header) with date, time, description, and macro values.
3. **Given** a successful log entry, **When** the entry is saved, **Then** the daily totals on screen update to include the new entry.
4. **Given** an ambiguous input like "handful of almonds", **When** the system parses it, **Then** the result includes a warning explaining the estimation assumption (e.g., "Estimated ~23 almonds / 1 oz").
5. **Given** the user submits multiple food items in one input (e.g., "2 eggs, toast, coffee"), **When** the system parses it, **Then** each item is returned as a separate line item with individual macro values.

---

### User Story 2 - Initial Setup and Credential Configuration (Priority: P2)

A new user opens the app for the first time and is guided through a setup flow. They provide their own credentials: an AI service API key, their spreadsheet service OAuth client ID and secret, and the ID of the spreadsheet they want to use for logging. The app walks them through the external account setup steps (creating a cloud project, enabling the spreadsheet API, configuring OAuth). Once configured, credentials are stored locally in the browser and the user can begin logging.

**Why this priority**: Users cannot log anything without valid credentials. This is a prerequisite to Story 1 but is a one-time setup flow rather than the daily interaction.

**Independent Test**: Can be fully tested by walking through the settings page, entering credentials, completing the OAuth authorization flow, and verifying the app can read from the configured spreadsheet.

**Acceptance Scenarios**:

1. **Given** a first-time user with no stored credentials, **When** they open the app, **Then** they are directed to a settings/onboarding page with clear instructions for each credential.
2. **Given** the settings page, **When** the user enters their AI API key, OAuth client ID, OAuth client secret, and spreadsheet ID, **Then** the credentials are stored locally in the browser and persist across sessions.
3. **Given** stored OAuth client credentials, **When** the user initiates the OAuth connection flow, **Then** they are redirected to the authorization provider, grant access, and are redirected back with a valid token.
4. **Given** completed setup, **When** the user navigates to the main logging page, **Then** all features are functional and no setup prompts appear.
5. **Given** the user's target spreadsheet has no existing log sheet, **When** they first attempt to log a meal, **Then** the system auto-creates a log sheet with the correct column headers.

---

### User Story 3 - View Daily Totals and Entry History (Priority: P3)

A user opens the app during the day and sees a summary of their macro intake so far: total calories, protein, carbs, and fat for the current date. Below the totals, they see a list of today's individual entries with timestamps and per-item breakdowns. All times are displayed in the user's current local timezone.

**Why this priority**: Viewing totals and history completes the feedback loop — users need to see where they stand to make decisions about what to eat next. It depends on data from Story 1.

**Independent Test**: Can be fully tested by reading entries from the spreadsheet for today's date and verifying the totals match the sum of individual entries.

**Acceptance Scenarios**:

1. **Given** a user with 3 logged entries today, **When** they view the home page, **Then** they see a daily totals summary showing the sum of calories, protein, carbs, and fat across all 3 entries.
2. **Given** a user with entries logged today, **When** they view the entry history, **Then** each entry shows the timestamp (in browser local time), food description, and individual macro values.
3. **Given** a user with entries from both today and yesterday, **When** they view the home page, **Then** only today's entries are included in the daily totals and history list.
4. **Given** a user with no entries today, **When** they view the home page, **Then** the daily totals show zero for all macro categories and the entry list is empty.

---

### User Story 4 - Recover from Failed Writes (Priority: P4)

A user submits a food description and the AI successfully parses it into macro data. However, the write to the spreadsheet fails (network error, rate limit, expired token). The parsed results remain visible on screen with the macro data intact. The user sees an error message explaining the failure and a retry button. They can retry the write or manually copy the data.

**Why this priority**: Data loss after a successful parse is the most frustrating failure mode. This story ensures the app degrades gracefully without losing user work.

**Independent Test**: Can be fully tested by simulating a spreadsheet write failure after a successful AI parse and verifying the parsed data stays visible with retry capability.

**Acceptance Scenarios**:

1. **Given** the AI has successfully parsed a food description, **When** the spreadsheet write fails, **Then** the parsed macro data remains visible on screen.
2. **Given** a failed write with parsed data visible, **When** the user clicks retry, **Then** the system attempts to write the same data to the spreadsheet again.
3. **Given** a failed write due to rate limiting, **When** the error is displayed, **Then** the message indicates the user should wait and includes a retry option.
4. **Given** a failed write, **When** the retry succeeds, **Then** the entry appears in the daily totals and history as normal.

---

### Edge Cases

- What happens when the user enters nonsensical input (e.g., "asdfghjkl" or "the color blue")? The system MUST return a clear message that the input could not be interpreted as food.
- What happens when the user enters an extremely long input (e.g., a full day's meals in one submission)? The system MUST handle multi-item inputs and return individual line items for each identifiable food.
- What happens when the user's AI API key is invalid or expired? The system MUST display a clear error directing them to the settings page to update their key.
- What happens when the OAuth token expires mid-session? The system MUST attempt a token refresh using the stored client credentials. If refresh fails, direct the user to re-authorize.
- What happens when the target spreadsheet is deleted or access is revoked? The system MUST display a clear error indicating the spreadsheet is inaccessible and direct the user to settings.
- What happens when two entries are submitted in rapid succession? The system MUST handle concurrent writes without data loss or row conflicts.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST accept free-text natural language food descriptions as input.
- **FR-002**: System MUST parse food descriptions into structured data containing: food item description, calories, protein (grams), carbs (grams), and fat (grams) for each identified food item.
- **FR-003**: System MUST return a confidence warning when input is ambiguous (e.g., unspecified quantities, vague portion sizes), explaining the assumption made.
- **FR-004**: System MUST insert new entries at the top of the log (directly below the header row) so the most recent entry appears first.
- **FR-005**: System MUST record the date and time of each entry using the user's local browser timezone.
- **FR-006**: System MUST display a daily totals summary (calories, protein, carbs, fat) for the current date based on all entries matching today's local date.
- **FR-007**: System MUST display a history of today's individual entries with timestamps and per-item macro breakdowns.
- **FR-008**: System MUST provide a settings page where users can enter, update, and remove their credentials (AI API key, OAuth client ID, OAuth client secret, spreadsheet ID).
- **FR-009**: System MUST store all user credentials exclusively in the browser's local storage; no credentials are transmitted to or stored on the server.
- **FR-010**: System MUST perform OAuth authorization code exchange and token refresh via a server-side relay using the user's provided client credentials.
- **FR-011**: System MUST auto-create a log sheet with the correct column headers on the user's spreadsheet if one does not already exist.
- **FR-012**: System MUST preserve parsed AI results on screen when a spreadsheet write fails, with a visible retry option.
- **FR-013**: System MUST handle rate-limit responses from the spreadsheet service gracefully — displaying a user-friendly wait message and offering retry.
- **FR-014**: System MUST display a clear, actionable error when credentials are invalid, expired, or missing, directing the user to the settings page.
- **FR-015**: System MUST provide an onboarding guide explaining the external cloud project setup steps (creating a project, enabling the spreadsheet API, configuring OAuth consent screen and redirect URI).
- **FR-016**: System MUST support optional daily macro targets (calories, protein, carbs, fat) configurable in settings.
- **FR-017**: Warnings from the AI MUST be displayed in the app interface alongside the logged entry but MUST NOT be written to the spreadsheet.

### Key Entities

- **Food Entry**: A single logged item representing one food. Attributes: date, time, description, calories, protein (g), carbs (g), fat (g), raw user input. Exists as a row in the user's spreadsheet.
- **Daily Summary**: An aggregation of all Food Entries for a given calendar date. Attributes: date, total calories, total protein, total carbs, total fat. Computed client-side, not persisted.
- **User Configuration**: The set of credentials and preferences for a user. Attributes: AI API key, OAuth client ID, OAuth client secret, OAuth access/refresh tokens, spreadsheet ID, optional daily macro targets. Stored in browser local storage.
- **AI Parse Result**: The structured output from parsing a natural language food description. Attributes: list of items (each with description, calories, protein, carbs, fat, optional warning). Transient — displayed in the UI, then written to the spreadsheet on confirmation.

### Assumptions

- Users are technically capable of creating a cloud project and configuring OAuth credentials with the help of step-by-step documentation.
- The number of daily entries per user is small (under 50), making client-side filtering and summation performant without pagination.
- A single spreadsheet with a single log sheet is sufficient for the foreseeable usage horizon.
- The AI service will return structured data reliably when given a well-formed system prompt; no fallback AI provider is needed.
- Users access the app via modern browsers (Chrome, Firefox, Safari, Edge) that support local storage and standard OAuth redirect flows.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can go from typing a food description to seeing parsed macro results in under 10 seconds.
- **SC-002**: Users can complete the full first-time setup (credential entry + OAuth authorization + first successful log) in under 15 minutes with the onboarding guide.
- **SC-003**: 95% of common food descriptions (single items, simple meals) are parsed into reasonable macro estimates without user correction.
- **SC-004**: Zero data loss from transient write failures — parsed results are always preserved on screen until successfully written or manually dismissed.
- **SC-005**: Daily totals are accurate to the sum of individual entries for the current local date, with no entries from other dates included.
- **SC-006**: The app is usable on both desktop and mobile browsers without horizontal scrolling or unusable tap targets.
