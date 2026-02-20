# Research: AI Macro Nutrition Logger

**Branch**: `001-macro-nutrition-logger` | **Date**: 2026-02-20

## 1. Azure Functions as Stateless Relay

### Decision: Azure Functions v4, Node.js programming model, TypeScript

- v4 programming model is GA and the only recommended path for new projects. v3 is maintenance-mode.
- v4 uses `app.http()` registration (no `function.json` files), TypeScript-first, Express-like patterns.
- One function per endpoint (3 total: parse, oauth-token, oauth-refresh) in a single Function App. Google Sheets read/write is called directly from the browser (CORS supported).

### Decision: Azure Static Web Apps with managed functions

- SWA bundles a lightweight Azure Functions backend in the `api/` directory. Single deployment unit.
- CORS is eliminated — SWA reverse proxy serves both the SPA and `/api/*` from the same origin.
- Free tier covers both frontend and backend.
- Constraint: managed functions support HTTP triggers only. Sufficient for this project.
- Migration path: can link a standalone Function App later if non-HTTP triggers are needed.

### Decision: Accept cold starts on Consumption plan

- Cold start latency: 1-3 seconds for Node.js on Consumption plan.
- With a 2-5 second Claude API call, total first-request latency is 3-8 seconds — within SC-001's 10-second budget.
- Mitigation: minimize dependencies (use native `fetch`, no SDKs), keep deployment package small, use Node.js 20 LTS.
- Premium plan (~$150/month) is unjustifiable for personal use.

### Decision: Direct `fetch` calls instead of SDKs

- Avoid `googleapis` npm package (~80MB unpacked). Use direct `fetch` to Google Sheets REST API.
- Avoid `@anthropic-ai/sdk`. Use direct `fetch` to Claude Messages API.
- Keeps function deployment under 1MB, cold starts fast, dependencies minimal.
- Aligned with Constitution Principle V (Simplicity First).

## 2. Google OAuth 2.0

### Decision: Authorization Code flow with PKCE

- Implicit flow is deprecated by Google and OAuth 2.1.
- PKCE adds defense-in-depth against code interception, even though the Azure Function holds the client secret.
- Flow: SPA generates code_verifier/code_challenge → user authorizes at Google → Google redirects back with auth code → SPA sends code + credentials + code_verifier to Azure Function → Function exchanges at Google token endpoint → returns tokens to SPA.

### Decision: Scope `https://www.googleapis.com/auth/spreadsheets`

- Grants full read/write/create access to user's spreadsheets.
- Single scope covers reading entries, writing entries, and creating the Log sheet.
- `drive.file` is more restrictive but won't cover pre-existing spreadsheets the user wants to use.

### Decision: Store access token, refresh token, and expiry in localStorage

- Both tokens stored alongside client ID/secret (already in localStorage).
- Refresh token does not meaningfully change the threat model since client credentials are already exposed to JS.
- Proactive refresh: check expiry before each API call, refresh when < 5 minutes remain.
- Handle `invalid_grant` (revoked/expired refresh token) by re-initiating full auth flow.

### Decision: Google Sheets API called directly from the browser

- Google Sheets API supports CORS — browser can call it directly with the access token.
- Only the token exchange and refresh need the Azure Function (Google's token endpoint does not support CORS).
- This means the Azure Function is needed for: Claude API relay, OAuth token exchange, OAuth token refresh. NOT for Sheets read/write.

**Important note on publishing status:** If the user's Google Cloud project is in "Testing" mode, refresh tokens expire after 7 days. Users should set their OAuth consent screen to "In production" or accept periodic re-authentication. Document this in onboarding.

## 3. Claude API for Nutrition Parsing

### Decision: Claude Haiku 4.5 as default model

- Cost per request: ~$0.0016 (sub-penny). Daily cost for active user: ~$0.02.
- Nutrition parsing is a structured extraction task — Haiku handles it well.
- Sonnet available as an alternative for better ambiguity handling at ~$0.006/request.
- Model ID: `claude-haiku-4-5-20251001`

### Decision: Tool use (function calling) for guaranteed structured output

- Define a `parse_food_items` tool with JSON Schema for the response structure.
- Set `tool_choice: {"type": "tool", "name": "parse_food_items"}` to force structured output.
- Eliminates risk of preamble text, markdown fences, or malformed JSON.
- Response contains a `tool_use` content block with `input` matching the schema.

### Decision: Concise system prompt with estimation guidelines

- Role definition + USDA reference values + standard serving size assumptions.
- Warning field: optional in schema, instructed to include only for genuinely ambiguous inputs.
- Non-food input: explicit instruction to return empty result with explanatory warning.
- One few-shot example for calibrating estimation behavior.

### API details

- Endpoint: `POST https://api.anthropic.com/v1/messages`
- Headers: `x-api-key: {key}`, `anthropic-version: 2023-06-01`, `content-type: application/json`
- Typical token usage: ~500 input + ~300 output per request.

## 4. React + Vite SPA

### Decision: React Router v7 (library mode)

- Two pages (Food Log, Settings) — simplest mature router.
- `createBrowserRouter` with `<RouterProvider>`, ~15 lines of setup.
- TanStack Router's type-safe routing provides no meaningful value for two static routes.

### Decision: Zustand with persist middleware for state management

- ~1KB gzipped, zero boilerplate (no Provider wrapping).
- Built-in `persist` middleware handles localStorage serialization automatically.
- Cleaner than Context + useReducer for localStorage-backed settings.
- Alternative: React Context + custom useLocalStorage hook if zero-dependency preferred.

### Decision: Tailwind CSS v4

- v4 uses CSS-based config (no `tailwind.config.js`), automatic content detection.
- Single Vite plugin: `@tailwindcss/vite`.
- Responsive utilities (`sm:`, `md:`, `lg:`) handle mobile/desktop with no custom media queries.
- Consistent design tokens for spacing, colors, typography out of the box.

### Decision: Flat project structure

```
src/
  pages/          # FoodLog.tsx, Settings.tsx
  components/     # Layout, FoodEntry, MacroSummary, etc.
  hooks/          # useSettings, useFoodLog
  services/       # API client, food log calls
  types/          # Shared TypeScript interfaces
  App.tsx         # Router setup
  main.tsx        # Entry point
```

### Decision: Vitest for testing (service + hook tests only)

- Near-zero setup cost with Vite. Reuses Vite config.
- Focus on service layer (API call construction, response parsing) and custom hooks.
- Skip component rendering tests initially.

### Azure Static Web Apps deployment

- `staticwebapp.config.json` in `public/` for SPA routing fallback.
- Default `vite build` output (`dist/`) works with SWA out of the box.
- GitHub Action `Azure/static-web-apps-deploy@v1` auto-detects Vite projects.

## Alternatives Considered

| Decision | Alternative | Why Rejected |
|----------|------------|--------------|
| SWA managed functions | Standalone Function App | Extra deployment, extra Azure resource, CORS config needed — no benefit for HTTP-only use case |
| Direct fetch | googleapis SDK | 80MB package, slow cold starts, violates Simplicity First |
| Direct fetch | @anthropic-ai/sdk | Unnecessary dependency for a single POST endpoint |
| Auth Code + PKCE | Implicit flow | Deprecated by Google and OAuth 2.1 |
| Haiku 3.5 | Sonnet/Opus | 4-19x cost for marginal quality improvement on structured extraction |
| Tool use | Prompt-based JSON | Non-zero risk of malformed output |
| React Router | TanStack Router | Over-engineering for two routes |
| Zustand | Redux/Jotai | Redux is massive overhead; Jotai has no built-in persist |
| Tailwind | CSS Modules | More files to manage, no built-in responsive utilities |
