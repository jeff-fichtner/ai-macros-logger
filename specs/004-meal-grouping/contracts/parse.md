# API Contract: Parse Endpoint (Updated)

**Endpoint**: `POST /api/parse`
**Change**: Response now includes `meal_label` alongside `items`

## Request (unchanged)

```json
{
  "provider": "claude" | "openai" | "gemini",
  "apiKey": "string",
  "input": "string"
}
```

## Response (updated)

### Success (200)

```json
{
  "meal_label": "Breakfast",
  "items": [
    {
      "description": "Scrambled eggs (2 large)",
      "calories": 182,
      "protein_g": 13.0,
      "carbs_g": 1.2,
      "fat_g": 14.0
    },
    {
      "description": "Wheat toast (1 slice)",
      "calories": 128,
      "protein_g": 4.0,
      "carbs_g": 24.0,
      "fat_g": 2.0
    }
  ]
}
```

### Error responses (unchanged)

- `400` — Missing/invalid fields
- `401` — Invalid API key
- `429` — Rate limited
- `502` — Provider API error

## Tool Schema (updated)

```json
{
  "type": "object",
  "properties": {
    "meal_label": {
      "type": "string",
      "description": "A short 1-4 word label describing this meal (e.g., 'Breakfast', 'Afternoon Snack')"
    },
    "items": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "description": { "type": "string" },
          "calories": { "type": "number" },
          "protein_g": { "type": "number" },
          "carbs_g": { "type": "number" },
          "fat_g": { "type": "number" },
          "warning": { "type": "string" }
        },
        "required": ["description", "calories", "protein_g", "carbs_g", "fat_g"]
      }
    }
  },
  "required": ["meal_label", "items"]
}
```

## Fallback Behavior

If the AI response does not include `meal_label` or it is empty/missing, the parse endpoint returns `"meal_label": "Meal"` as a fallback. The endpoint never fails due to a missing label.
