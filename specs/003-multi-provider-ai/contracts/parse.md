# API Contract: Parse Endpoint

**Feature**: 003-multi-provider-ai
**Date**: 2026-02-22

## POST /api/parse

Parses a natural language food description into structured nutrition data using the specified AI provider.

### Request

```json
{
  "provider": "claude" | "openai" | "gemini",
  "apiKey": "string",
  "input": "string"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| provider | string enum | Yes | AI provider to use: `"claude"`, `"openai"`, or `"gemini"` |
| apiKey | string | Yes | API key for the specified provider |
| input | string | Yes | Natural language food description |

### Response (200)

```json
{
  "items": [
    {
      "description": "2 large eggs",
      "calories": 143,
      "protein_g": 12.6,
      "carbs_g": 0.7,
      "fat_g": 9.5
    },
    {
      "description": "1 slice whole wheat toast",
      "calories": 82,
      "protein_g": 4.0,
      "carbs_g": 13.8,
      "fat_g": 1.1,
      "warning": "Assumed plain toast without butter"
    }
  ]
}
```

This response format is identical regardless of provider. Each item has the same fields as before.

### Error Responses

| Status | Condition | Body |
|--------|-----------|------|
| 400 | Invalid JSON body | `{ "error": "Invalid JSON in request body" }` |
| 400 | Missing provider | `{ "error": "Missing required field: provider" }` |
| 400 | Invalid provider | `{ "error": "Unsupported provider: <value>" }` |
| 400 | Missing apiKey | `{ "error": "Missing required field: apiKey" }` |
| 400 | Missing input | `{ "error": "Missing required field: input" }` |
| 401 | Provider rejected key | `{ "error": "Claude API 401: ..." }` (actual error from provider) |
| 429 | Provider rate limited | `{ "error": "OpenAI API 429: ..." }` (actual error from provider) |
| 502 | Provider unreachable | `{ "error": "Failed to reach Gemini API: ..." }` (actual error) |
| 502 | Unexpected response | `{ "error": "Unexpected Gemini response structure: ..." }` |

All provider errors include the actual error detail from the upstream API. No generic messages.

### Changes from Current Contract

| Aspect | Before | After |
|--------|--------|-------|
| Request body | `{ apiKey, input }` | `{ provider, apiKey, input }` |
| Validation | Only checks apiKey + input | Also validates provider field |
| Backend routing | Always Claude | Routes to provider specified in request |
| Response format | Same | Same (no change) |
| Error messages | Some generic "AI service unavailable" | All show actual provider error detail |
