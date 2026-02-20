# Data Model: AI Macro Nutrition Logger

**Branch**: `001-macro-nutrition-logger` | **Date**: 2026-02-20

## Entities

### FoodEntry (Google Sheets Row)

A single logged food item. Each entry is one row in the "Log" sheet.

| Field | Type | Description | Column |
|-------|------|-------------|--------|
| date | string (YYYY-MM-DD) | Local date when the entry was logged | A |
| time | string (HH:MM) | Local time when the entry was logged | B |
| description | string | AI-generated food item description | C |
| calories | number | Estimated calories (whole number) | D |
| protein_g | number | Estimated protein in grams (1 decimal) | E |
| carbs_g | number | Estimated carbs in grams (1 decimal) | F |
| fat_g | number | Estimated fat in grams (1 decimal) | G |
| raw_input | string | Original user-typed text | H |

**Header row (row 1)**: `Date | Time | Description | Calories | Protein (g) | Carbs (g) | Fat (g) | Raw Input`

**Insert position**: Row 2 (below header). Newest entries at top.

**Multi-item inputs**: A single user submission like "2 eggs, toast, coffee" produces 3 rows, all with the same date, time, and raw_input but different descriptions and macro values.

### DailySummary (Computed, not persisted)

Aggregation of all FoodEntry rows matching a given local date.

| Field | Type | Description |
|-------|------|-------------|
| date | string (YYYY-MM-DD) | The date being summarized |
| totalCalories | number | Sum of calories for all entries on this date |
| totalProtein | number | Sum of protein_g for all entries on this date |
| totalCarbs | number | Sum of carbs_g for all entries on this date |
| totalFat | number | Sum of fat_g for all entries on this date |
| entryCount | number | Number of entries on this date |

Computed client-side by filtering sheet data by date column. Never written to the sheet.

### UserConfiguration (localStorage)

All user-provided credentials and preferences. Stored as a single JSON object in localStorage.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| claudeApiKey | string | yes | User's Anthropic API key |
| googleClientId | string | yes | Google OAuth 2.0 client ID |
| googleClientSecret | string | yes | Google OAuth 2.0 client secret |
| googleAccessToken | string | no | Current OAuth access token |
| googleRefreshToken | string | no | OAuth refresh token for renewal |
| googleTokenExpiry | number | no | Token expiry as Unix timestamp (ms) |
| spreadsheetId | string | yes | Google Sheets spreadsheet ID |
| macroTargets | MacroTargets | no | Optional daily macro goals |

### MacroTargets (localStorage, nested in UserConfiguration)

| Field | Type | Description |
|-------|------|-------------|
| calories | number | Daily calorie goal |
| protein_g | number | Daily protein goal in grams |
| carbs_g | number | Daily carbs goal in grams |
| fat_g | number | Daily fat goal in grams |

### AIParseResult (Transient)

Response from Claude API after parsing a food description. Lives in component state only.

| Field | Type | Description |
|-------|------|-------------|
| items | AIParseItem[] | Parsed food items |

### AIParseItem (Transient)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| description | string | yes | AI-generated food description |
| calories | number | yes | Estimated calories |
| protein_g | number | yes | Estimated protein in grams |
| carbs_g | number | yes | Estimated carbs in grams |
| fat_g | number | yes | Estimated fat in grams |
| warning | string | no | Confidence/ambiguity warning |

## State Transitions

### FoodEntry Lifecycle

```
User types input
  → Submits to Claude API relay
  → AIParseResult returned (items + optional warnings)
  → User reviews on screen
  → User confirms
  → Each item written to Google Sheet as a FoodEntry row (inserted at row 2)
  → DailySummary recomputed from updated sheet data
```

### Failed Write Recovery

```
AIParseResult displayed on screen
  → Sheet write fails (network, 429, auth error)
  → Error message shown, parsed data preserved
  → User clicks retry
  → Write re-attempted
  → On success: normal flow continues
  → On repeated failure: user can manually copy data
```

### OAuth Token Lifecycle

```
No tokens stored
  → User initiates OAuth flow (Settings page)
  → Authorization code received via redirect
  → Code exchanged for access + refresh tokens (via Azure Function)
  → Tokens stored in localStorage
  → Access token used for Sheets API calls
  → Token nearing expiry (< 5 min remaining)
  → Refresh token sent to Azure Function
  → New access token returned and stored
  → If refresh fails (invalid_grant): re-initiate full OAuth flow
```

## Validation Rules

- `date`: must be valid ISO date format (YYYY-MM-DD)
- `time`: must be valid 24h time format (HH:MM)
- `calories`: non-negative integer
- `protein_g`, `carbs_g`, `fat_g`: non-negative, max 1 decimal place
- `raw_input`: non-empty string
- `claudeApiKey`: must start with `sk-ant-` (basic format check)
- `spreadsheetId`: non-empty string, extracted from Google Sheets URL if user pastes full URL
- `macroTargets`: all values must be positive numbers if provided
