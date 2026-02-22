# Data Model: Multi-Provider AI Support

**Feature**: 003-multi-provider-ai
**Date**: 2026-02-22

## Entities

### AIProviderConfig

Represents a single configured AI provider with its API key.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| provider | `"claude" \| "openai" \| "gemini"` | Yes | Provider identifier |
| apiKey | string | Yes | User's API key for this provider |

### UserConfiguration (updated)

The existing `UserConfiguration` type gains two new fields and loses `claudeApiKey`.

| Field | Type | Required | Change | Description |
|-------|------|----------|--------|-------------|
| aiProviders | AIProviderConfig[] | Yes | NEW | List of configured providers with keys |
| activeProvider | string | Yes | NEW | Provider identifier of the active provider |
| ~~claudeApiKey~~ | ~~string~~ | — | REMOVED | Replaced by aiProviders |
| googleClientId | string | Yes | unchanged | |
| googleClientSecret | string | Yes | unchanged | |
| googleAccessToken | string | Yes | unchanged | |
| googleRefreshToken | string | Yes | unchanged | |
| googleTokenExpiry | number | Yes | unchanged | |
| spreadsheetId | string | Yes | unchanged | |
| macroTargets | MacroTargets \| null | No | unchanged | |

### ParseRequestBody (updated)

The backend parse endpoint request body gains a `provider` field.

| Field | Type | Required | Change | Description |
|-------|------|----------|--------|-------------|
| provider | `"claude" \| "openai" \| "gemini"` | Yes | NEW | Which provider to route to |
| apiKey | string | Yes | unchanged | API key for the specified provider |
| input | string | Yes | unchanged | Food description to parse |

### AIParseResult / AIParseItem (unchanged)

No changes. All providers normalize into this existing format.

## State Transitions

### Provider List

```
Empty → Add provider → [provider1]
[provider1] → Add provider → [provider1, provider2]
[provider1, provider2] → Remove provider1 → [provider2]
[provider1] → Remove provider1 → Empty
```

### Active Provider

```
(no providers) → First provider added → auto-set as active
Active provider removed → first remaining provider becomes active
Active provider removed, none remaining → no active provider
User selects different provider → that provider becomes active
```

## Migration

### From v1 (claudeApiKey) to v2 (aiProviders)

**Trigger**: Zustand store loads and `aiProviders` is undefined while `claudeApiKey` is non-empty.

**Action**:
1. Set `aiProviders` to `[{ provider: "claude", apiKey: claudeApiKey }]`
2. Set `activeProvider` to `"claude"`
3. The old `claudeApiKey` field is no longer used

**No trigger**: If `claudeApiKey` is empty and `aiProviders` is undefined, start with empty provider list.
