# API Contracts: AI Macro Nutrition Logger

**Branch**: `001-macro-nutrition-logger` | **Date**: 2026-02-20

All endpoints are served via Azure Static Web Apps managed functions at `/api/*`. The SPA and API share the same origin — no CORS configuration needed.

## Endpoints

### POST /api/parse

Relay food description to Claude API for macro parsing.

**Request:**

```json
{
  "apiKey": "sk-ant-api03-...",
  "input": "2 scrambled eggs, slice of sourdough with butter, black coffee"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| apiKey | string | yes | User's Claude API key |
| input | string | yes | Natural language food description |

**Response (200):**

```json
{
  "items": [
    {
      "description": "Scrambled eggs (2 large)",
      "calories": 182,
      "protein_g": 12.6,
      "carbs_g": 1.6,
      "fat_g": 13.4
    },
    {
      "description": "Sourdough toast with butter (1 slice, 1 tbsp butter)",
      "calories": 230,
      "protein_g": 4.2,
      "carbs_g": 24.8,
      "fat_g": 12.5
    },
    {
      "description": "Black coffee (8 oz)",
      "calories": 2,
      "protein_g": 0.3,
      "carbs_g": 0.0,
      "fat_g": 0.0
    }
  ]
}
```

**Response with warning (200):**

```json
{
  "items": [
    {
      "description": "Almonds",
      "calories": 164,
      "protein_g": 6.0,
      "carbs_g": 6.0,
      "fat_g": 14.0,
      "warning": "Estimated ~23 almonds (1 oz). Actual amount may vary."
    }
  ]
}
```

**Response for non-food input (200):**

```json
{
  "items": [
    {
      "description": "Not a food item",
      "calories": 0,
      "protein_g": 0,
      "carbs_g": 0,
      "fat_g": 0,
      "warning": "Could not identify any food items in the input."
    }
  ]
}
```

**Error responses:**

| Status | Body | Cause |
|--------|------|-------|
| 400 | `{"error": "Missing required field: input"}` | Missing or empty input/apiKey |
| 401 | `{"error": "Invalid API key"}` | Claude API rejected the key |
| 429 | `{"error": "Rate limited", "retryAfter": 30}` | Claude API rate limit |
| 502 | `{"error": "AI service unavailable"}` | Claude API unreachable or returned 5xx |

---

### POST /api/oauth/token

Exchange OAuth authorization code for access and refresh tokens.

**Request:**

```json
{
  "clientId": "1234567890-abc.apps.googleusercontent.com",
  "clientSecret": "GOCSPX-...",
  "code": "4/0AY0e-g...",
  "codeVerifier": "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk",
  "redirectUri": "https://yourapp.azurestaticapps.net/settings"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| clientId | string | yes | User's Google OAuth client ID |
| clientSecret | string | yes | User's Google OAuth client secret |
| code | string | yes | Authorization code from Google redirect |
| codeVerifier | string | yes | PKCE code verifier |
| redirectUri | string | yes | Must match the URI used in the auth request |

**Response (200):**

```json
{
  "accessToken": "ya29.a0AfH...",
  "refreshToken": "1//0e...",
  "expiresIn": 3600
}
```

| Field | Type | Description |
|-------|------|-------------|
| accessToken | string | Google OAuth access token |
| refreshToken | string | Google OAuth refresh token (only on initial auth) |
| expiresIn | number | Token lifetime in seconds |

**Error responses:**

| Status | Body | Cause |
|--------|------|-------|
| 400 | `{"error": "Missing required field: code"}` | Missing required fields |
| 401 | `{"error": "Invalid OAuth credentials"}` | Google rejected the client ID/secret or code |
| 502 | `{"error": "OAuth service unavailable"}` | Google token endpoint unreachable |

---

### POST /api/oauth/refresh

Refresh an expired OAuth access token.

**Request:**

```json
{
  "clientId": "1234567890-abc.apps.googleusercontent.com",
  "clientSecret": "GOCSPX-...",
  "refreshToken": "1//0e..."
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| clientId | string | yes | User's Google OAuth client ID |
| clientSecret | string | yes | User's Google OAuth client secret |
| refreshToken | string | yes | Stored refresh token |

**Response (200):**

```json
{
  "accessToken": "ya29.a0AfH...",
  "expiresIn": 3600
}
```

**Error responses:**

| Status | Body | Cause |
|--------|------|-------|
| 400 | `{"error": "Missing required field: refreshToken"}` | Missing required fields |
| 401 | `{"error": "Refresh token expired or revoked"}` | `invalid_grant` from Google — user must re-authorize |
| 502 | `{"error": "OAuth service unavailable"}` | Google token endpoint unreachable |

---

## Client-Side API Calls (Direct to Google — No Azure Function)

These calls are made directly from the browser using the user's access token. Documented here for completeness.

### Read today's entries

```
GET https://sheets.googleapis.com/v4/spreadsheets/{spreadsheetId}/values/Log!A:H
Authorization: Bearer {accessToken}
```

Returns all rows. Client filters by date column (A) matching today's local date.

### Write entry (insert at row 2)

```
POST https://sheets.googleapis.com/v4/spreadsheets/{spreadsheetId}/values/Log!A2:H2:append
?valueInputOption=USER_ENTERED
&insertDataOption=INSERT_ROWS
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "values": [
    ["2026-02-20", "12:30", "Scrambled eggs (2 large)", 182, 12.6, 1.6, 13.4, "2 scrambled eggs"]
  ]
}
```

Note: The `:append` endpoint with `INSERT_ROWS` inserts new rows. To insert at row 2 specifically (below header), use the `batchUpdate` method with `insertRange` + `pasteData`, or use `values:update` targeting `Log!A2` after inserting a blank row. The exact Sheets API method to achieve "insert at row 2" will be determined during implementation.

### Check if Log sheet exists

```
GET https://sheets.googleapis.com/v4/spreadsheets/{spreadsheetId}
?fields=sheets.properties.title
Authorization: Bearer {accessToken}
```

### Create Log sheet with headers

```
POST https://sheets.googleapis.com/v4/spreadsheets/{spreadsheetId}:batchUpdate
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "requests": [
    {
      "addSheet": {
        "properties": { "title": "Log" }
      }
    }
  ]
}
```

Then write headers:

```
PUT https://sheets.googleapis.com/v4/spreadsheets/{spreadsheetId}/values/Log!A1:H1
?valueInputOption=RAW
Authorization: Bearer {accessToken}

{
  "values": [
    ["Date", "Time", "Description", "Calories", "Protein (g)", "Carbs (g)", "Fat (g)", "Raw Input"]
  ]
}
```
