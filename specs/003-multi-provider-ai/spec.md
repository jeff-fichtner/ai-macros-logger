# Feature Specification: Multi-Provider AI Support

**Feature Branch**: `003-multi-provider-ai`
**Created**: 2026-02-22
**Status**: Draft
**Input**: User description: "Multi-provider AI support for food parsing. Allow users to choose between multiple AI providers (Claude, OpenAI, Gemini) for the food parsing feature. User selects their provider in Settings, enters the corresponding API key, and the parse function routes to the correct provider's API. Same structured output (food items with macros) regardless of provider."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Add and Manage AI Providers (Priority: P1)

A user opens Settings and sees an "AI Providers" section. They select a provider from a dropdown (Claude, OpenAI, or Gemini) and enter the API key for that provider, then add it. The provider appears in a list of configured providers. The user can add keys for multiple providers. One provider in the list is marked as the active/selected one. The user can switch which provider is active by selecting it from the list. All configured providers and their keys persist across page reloads.

**Why this priority**: Without the ability to add, store, and select providers, no other multi-provider functionality works. This is the foundation.

**Independent Test**: Can be fully tested by opening Settings, adding keys for multiple providers, selecting different ones as active, saving, reloading, and verifying the full list and active selection persist.

**Acceptance Scenarios**:

1. **Given** a user on the Settings page, **When** they look at the AI Providers section, **Then** they see a dropdown to pick a provider (Claude, OpenAI, Gemini), an API key input, and an "Add" action.
2. **Given** a user has added Claude and OpenAI with keys, **When** the settings page renders, **Then** both providers appear in a list with one marked as active.
3. **Given** a user has three providers configured, **When** they select a different provider from the list, **Then** that provider becomes the active one used for parsing.
4. **Given** a user has added Gemini with a key, **When** they reload the page, **Then** Gemini still appears in the list with its key preserved.
5. **Given** a user has added Claude and later wants to remove it, **When** they remove Claude from the list, **Then** Claude is no longer in the configured providers and its key is deleted.

---

### User Story 2 - Parse Food with Active Provider (Priority: P1)

A user types a food description and submits it. The system routes the request to the active provider's API using that provider's stored key. The response is normalized into the same structured format (items with description, calories, protein_g, carbs_g, fat_g) regardless of which provider processed it. The user sees the same parse result UI they always have.

**Why this priority**: This is the core functional change — the parse operation must work with all three providers. Without this, multi-provider is cosmetic.

**Independent Test**: Can be tested by configuring each provider, selecting it as active, submitting the same food description, and verifying structured results are returned in the expected format each time.

**Acceptance Scenarios**:

1. **Given** a user has OpenAI as their active provider with a valid key, **When** they submit "2 eggs and toast", **Then** they receive parsed food items with macros in the standard format.
2. **Given** a user has Gemini as their active provider with a valid key, **When** they submit "2 eggs and toast", **Then** they receive parsed food items with macros in the standard format.
3. **Given** a user has Claude as their active provider with a valid key, **When** they submit "2 eggs and toast", **Then** they receive parsed food items with macros in the standard format (existing behavior preserved).
4. **Given** any provider returns an error, **When** the parse request fails, **Then** the actual error message from that provider's API is displayed to the user.

---

### User Story 3 - Provider-Specific Key Validation (Priority: P2)

When adding a provider, the API key input validates the key format based on the selected provider's known pattern. The validation helps users catch typos before saving.

**Why this priority**: Improves UX but is not required for core functionality. Users can still parse food without client-side key validation.

**Independent Test**: Can be tested by selecting each provider and entering keys with incorrect prefixes, verifying the validation hint appears.

**Acceptance Scenarios**:

1. **Given** Claude is selected in the add dropdown, **When** the user enters a key not starting with "sk-ant-", **Then** a validation hint is shown.
2. **Given** OpenAI is selected in the add dropdown, **When** the user enters a key not starting with "sk-", **Then** a validation hint is shown.
3. **Given** Gemini is selected in the add dropdown, **When** the user enters any non-empty key, **Then** no format validation is applied (Gemini keys have no consistent prefix).

---

### Edge Cases

- What happens when no providers are configured? The user cannot parse food. The parse input area indicates they need to configure a provider in Settings.
- What happens when the active provider is removed from the list? The first remaining provider in the list becomes active. If no providers remain, the user is back to the unconfigured state.
- What happens when a user has settings saved from before this feature existed? The migration reads the existing Claude API key, adds Claude to the provider list as the sole configured provider, and marks it active.
- What happens when a provider's API is down? The actual error from the provider is shown to the user.
- What happens when a user tries to add the same provider twice? The system prevents duplicates — each provider can only appear once in the list.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow users to add AI providers from a list of supported providers (Claude, OpenAI, Gemini) with their corresponding API keys.
- **FR-002**: System MUST store multiple configured providers, each with its own API key, in user settings.
- **FR-003**: System MUST display all configured providers in a list, with one marked as the active provider.
- **FR-004**: System MUST allow users to switch the active provider by selecting from the configured list.
- **FR-005**: System MUST allow users to remove a configured provider and its key.
- **FR-006**: System MUST prevent adding the same provider more than once.
- **FR-007**: System MUST route parse requests to the active provider's API using that provider's stored key.
- **FR-008**: System MUST normalize responses from all providers into the same structured output format (items with description, calories, protein_g, carbs_g, fat_g, optional warning).
- **FR-009**: System MUST use the same system prompt and parsing instructions across all providers to ensure consistent results.
- **FR-010**: System MUST display actual error messages from provider APIs, not generic error messages.
- **FR-011**: System MUST migrate existing Claude API key settings into the new provider list format when users first load the updated application.
- **FR-012**: System MUST provide provider-appropriate placeholder text in the API key input when adding a provider.

### Key Entities

- **AI Provider**: An external service that can parse food descriptions into structured nutrition data. Identified by a name (Claude, OpenAI, Gemini) and requires a provider-specific API key.
- **Provider List**: The user's collection of configured providers with their keys. One provider in the list is marked as active. The active provider is used for all parse requests.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can configure multiple providers and switch between them within 30 seconds.
- **SC-002**: Parse results from all three providers contain the same data fields (description, calories, protein, carbs, fat) for any given food input.
- **SC-003**: Existing users who upgrade see their Claude API key preserved in the provider list and can continue parsing without reconfiguration.
- **SC-004**: When a provider API returns an error, the user sees the specific error detail within 5 seconds.

## Assumptions

- Users obtain their own API keys from each provider. The application does not manage API key creation or billing.
- All three providers support structured/JSON output extraction (Claude via tool_use, OpenAI via function calling or JSON mode, Gemini via structured output).
- The same system prompt works effectively across all three providers for nutrition parsing. Minor prompt adjustments per provider are acceptable if needed for quality.
- There is no "recommended" provider — the user picks based on their preference or available keys.
