# AI Macros Logger — Architecture Proposal

## Overview

A personal AI-powered macro nutrition logger. Users describe what they ate in natural language, an AI parses it into structured nutritional data (calories, protein, carbs, fat), and the results are logged to Google Sheets. Built for personal use and close friends — not public-facing — but architected to grow into a production application.

## How It Works

1. User types a natural language food description (e.g., "2 eggs, toast with peanut butter, black coffee")
2. Frontend sends the description + user-provided credentials to a serverless function
3. Serverless function relays the request to Claude API, which returns structured macro data plus an optional confidence warning
4. Serverless function inserts a row at the top of the user's Google Sheet via the Sheets API
5. Frontend displays the parsed result (with any warnings), confirmation, and daily running totals

## Architecture

### Design Principles

- **Zero server-side secrets** — all credentials provided by the user and stored in `localStorage`
- **Stateless backend** — the serverless function is a pure relay, persists nothing
- **User-owned infrastructure** — each user brings their own Claude API key, Google OAuth client ID/secret, and Google Sheet
- **Near-zero hosting cost** — free tiers for static hosting and serverless functions

### Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Frontend | Static SPA (React + Vite) | No SSR needed; deploy to any CDN |
| Backend | Azure Function | Single stateless function, generous free tier |
| AI | Claude API (user's key) | Single prompt → structured JSON; no agent framework needed |
| Data | Google Sheets API (user's OAuth token) | User-owned, familiar, zero DB cost |
| Auth | None server-side | Each user owns their own credentials |
| Hosting | Azure Static Web Apps | Free tier, auto-deploys from git |

### Why a Serverless Function (Not Direct Browser Calls)

- **CORS** — Claude's API does not allow browser-origin requests
- **Google OAuth token exchange** — the authorization code → token swap requires the client secret, which should go through a backend even when user-provided
- **Token refresh** — refresh token flow also requires client ID/secret

### Credential Flow

```
Browser (localStorage holds all keys)
  → POST to serverless function with credentials + food description
  → Function calls Claude API with user's API key
  → Function calls Google Sheets API with user's OAuth token
  → Returns structured result
  ← Browser displays result
```

### User-Provided Settings (Settings Page)

| Setting | Purpose |
|---------|---------|
| Claude API key | Authenticate with Claude for food → macro parsing |
| Google OAuth client ID | Identify the user's Google Cloud OAuth app |
| Google OAuth client secret | Required for token exchange and refresh |
| Google Sheet ID | Target spreadsheet for logging (user pastes the sheet URL) |
| Custom macro targets (optional) | Daily goals for calories, protein, carbs, fat |

### Google OAuth — User Setup Requirement

Each user performs a one-time setup:

1. Create a Google Cloud project (or use an existing one)
2. Enable the Google Sheets API
3. Configure an OAuth consent screen
4. Create OAuth credentials (Web application type)
5. Add the app's URL as an authorized redirect URI
6. Paste client ID and client secret into the app's settings page

This is documented in an in-app onboarding guide.

## AI Response Design

### Best-Guess with Warnings

Claude always returns its best estimate — it never asks for clarification. When input is ambiguous (e.g., "a handful of almonds", "big bowl of pasta"), the response includes a `warning` field explaining the assumption made. The app displays this warning alongside the logged entry so the user knows to edit in Google Sheets if the estimate is off.

**Example Claude response structure:**

```json
{
  "items": [
    {
      "description": "Handful of almonds",
      "calories": 164,
      "protein_g": 6,
      "carbs_g": 6,
      "fat_g": 14,
      "warning": "Estimated ~23 almonds (1 oz). Actual amount may vary."
    }
  ]
}
```

Warnings are displayed in the UI but not written to the Google Sheet — the sheet stays clean with just the numbers. Users correct estimates by editing the sheet directly.

### Timezone Handling

All timestamps use the user's local browser timezone. The date and time written to the sheet reflect the user's local clock, and "today" filtering matches against the local date.

## Error Resilience

If the Sheets API call fails after Claude has already parsed the macros, the app must not discard the parsed result. The flow:

1. Claude returns parsed macros successfully
2. App displays the parsed result to the user immediately
3. App attempts to write to Google Sheets
4. **If the write fails**: show an error message but keep the parsed data visible on screen, with a retry button
5. The user can manually copy the data into their sheet, or retry once the issue resolves

This prevents the most frustrating failure mode — losing AI-parsed data because of a transient Sheets API error.

### Google Sheets API Rate Limits

Google Sheets API allows 60 read/write requests per minute per user by default. At personal scale this is not a concern, but the app should handle HTTP 429 responses gracefully — display a "please wait" message and retry after a short delay rather than failing silently or crashing.

## Security Considerations

- Storing API keys in `localStorage` is acceptable for a personal/friends tool
- Google OAuth client ID/secret are provided by the user, keeping the serverless function truly stateless — no shared secrets to leak
- The serverless function never persists any credentials
- All communication over HTTPS
- **Migration path**: if this becomes public-facing, move to server-managed keys with proper auth (the serverless function already exists as the relay)

## Frontend Pages

### Food Log (Home)
- Text input for natural language food descriptions
- Submit button → shows parsed macros for confirmation → logs to sheet
- Daily totals summary (calories, protein, carbs, fat)
- History of today's logged entries

### Settings
- Fields for Claude API key, Google OAuth client ID/secret, Sheet ID
- Google OAuth connect/disconnect flow
- Optional daily macro targets
- Onboarding guide for Google Cloud setup

## Google Sheets Data Strategy

Google Sheets has hard limits: **10 million cells per spreadsheet** and **200 sheets per spreadsheet**. With the schema above (~8 columns per entry), that's roughly **1.25 million rows** before hitting the cell limit. At ~10 entries/day, a single sheet lasts **~340 years** — so the cell limit is not a practical concern for individual use.

The real question is how to organize data for readability and daily totals.

### Recommended Approach: Single Sheet, Rolling Log

- **One sheet named "Log"** with entries in reverse chronological order (newest first)
- Columns: `Date | Time | Description | Calories | Protein (g) | Carbs (g) | Fat (g) | Raw Input`
- New entries are inserted at row 2 (directly below the header row), so the most recent entry is always at the top
- Opening the spreadsheet always shows today's entries first
- The app filters by date client-side to show daily totals
- Auto-created by the app on first use with headers in row 1

**Why not one sheet per day/month?**
- A sheet-per-day approach hits the 200-sheet limit in ~6.5 months
- A sheet-per-month approach gives ~16 years, which is viable, but adds complexity for cross-month queries and the app needs to manage sheet creation
- A single rolling log is simpler, stays well within limits, and daily filtering is trivial

**If scaling becomes a concern later:**
- Archive older data to a separate spreadsheet (e.g., yearly)
- Or migrate to a real database — this is already in the growth path

### Sheet Auto-Creation

On first log attempt, the app checks if the target spreadsheet has a "Log" sheet with the expected headers. If not, it creates the sheet and writes the header row. This removes manual setup for new users.

## Decisions Made

| # | Question | Decision |
|---|----------|----------|
| 1 | Serverless platform | Azure Functions |
| 2 | Sheet setup | App auto-creates template sheet with headers |
| 3 | Meal categorization | Timestamped only (no meal tags for now) |
| 4 | Edit/delete from app | Not in scope — users edit directly in Google Sheets |

## Next Steps

1. Run `/specify` to generate the formal feature spec
2. Run `/plan` to generate the implementation plan
3. Build it
