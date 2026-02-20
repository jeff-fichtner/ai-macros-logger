# Quickstart: AI Macro Nutrition Logger

**Branch**: `001-macro-nutrition-logger` | **Date**: 2026-02-20

## Prerequisites

- Node.js 20 LTS
- npm
- Azure Functions Core Tools v4 (`npm install -g azure-functions-core-tools@4`)
- A Claude API key (from console.anthropic.com)
- A Google Cloud project with:
  - Google Sheets API enabled
  - OAuth 2.0 credentials (Web application type)
  - `http://localhost:5173/settings` added as an authorized redirect URI
- A Google Spreadsheet (any existing one, or create a new blank one)

## Setup

### 1. Clone and install

```bash
git clone <repo-url>
cd ai-macros-logger
git checkout 001-macro-nutrition-logger

# Install frontend dependencies
cd frontend
npm install

# Install API dependencies
cd ../api
npm install
```

### 2. Run locally

```bash
# Terminal 1: Start the API (Azure Functions)
cd api
npm start

# Terminal 2: Start the frontend (Vite dev server)
cd frontend
npm run dev
```

The frontend runs at `http://localhost:5173`. The API runs at `http://localhost:7071`.

For local development, configure the Vite dev server to proxy `/api/*` requests to the Azure Functions host.

### 3. Configure the app

1. Open `http://localhost:5173` in your browser
2. You'll be directed to the Settings page
3. Enter your Claude API key
4. Enter your Google OAuth client ID and client secret
5. Enter your Google Spreadsheet ID (from the spreadsheet URL: `https://docs.google.com/spreadsheets/d/{THIS_PART}/edit`)
6. Click "Connect Google Account" to authorize via OAuth
7. (Optional) Set daily macro targets

### 4. Log your first meal

1. Navigate to the Food Log page
2. Type a food description (e.g., "chicken breast with rice and broccoli")
3. Click submit
4. Review the parsed macro results (and any warnings)
5. Confirm to save to your Google Sheet
6. Check your Google Sheet — the entry should appear at row 2

## Verification Checklist

- [ ] Settings page saves credentials to localStorage
- [ ] Google OAuth flow completes and returns tokens
- [ ] Food description parses into structured macro data
- [ ] Warnings appear for ambiguous inputs (try "a handful of nuts")
- [ ] Entry is written to Google Sheet at row 2 (below header)
- [ ] Log sheet is auto-created with headers if it doesn't exist
- [ ] Daily totals reflect all entries for today's date
- [ ] Non-food input returns a clear error (try "asdfghjkl")
- [ ] Simulated write failure preserves parsed data with retry button

## Deploy to Azure

### Azure Static Web Apps (recommended)

1. Create an Azure Static Web App resource in the Azure portal
2. Connect to the GitHub repository
3. Set build configuration:
   - App location: `frontend`
   - API location: `api`
   - Output location: `dist`
4. The GitHub Action deploys both frontend and API automatically

The app will be available at `https://<your-app-name>.azurestaticapps.net`.

Users must update their Google OAuth redirect URI to include the production URL.

## Common Issues

**"Invalid API key" error**: Verify your Claude API key starts with `sk-ant-` and has not expired.

**OAuth redirect fails**: Ensure the redirect URI in your Google Cloud Console matches exactly (including protocol, domain, and path).

**Refresh token expires after 7 days**: Your Google Cloud project OAuth consent screen may be in "Testing" mode. Set it to "In production" for long-lived refresh tokens.

**Cold start delay**: The first request after inactivity may take 3-5 seconds (Azure Functions Consumption plan cold start). Subsequent requests are fast.
