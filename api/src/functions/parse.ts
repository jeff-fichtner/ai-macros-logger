import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";

interface ParseRequestBody {
  apiKey: string;
  input: string;
}

interface FoodItem {
  description: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  warning?: string;
}

interface ClaudeToolUseBlock {
  type: "tool_use";
  id: string;
  name: string;
  input: { items: FoodItem[] };
}

interface ClaudeContentBlock {
  type: string;
  id?: string;
  name?: string;
  input?: unknown;
  text?: string;
}

interface ClaudeResponse {
  content: ClaudeContentBlock[];
}

const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";

const SYSTEM_PROMPT = `You are a nutrition data extraction assistant. Your job is to parse natural language food descriptions into structured macronutrient data.

Guidelines:
- Use USDA FoodData Central reference values for standard portions and common foods.
- When a quantity is specified (e.g., "2 eggs", "1 cup rice"), use that exact quantity.
- When quantity is ambiguous or omitted (e.g., "almonds", "some pasta"), estimate a typical single serving and include a warning field explaining the assumption.
- For composite or prepared foods (e.g., "Caesar salad"), estimate based on a typical restaurant or homemade serving.
- Round calories to the nearest whole number. Round grams to one decimal place.
- If the input does not describe food at all, return a single item with description "Not a food item", all macros set to 0, and a warning explaining why the input could not be parsed as food.`;

const PARSE_FOOD_ITEMS_TOOL = {
  name: "parse_food_items",
  description:
    "Parse food items from a natural language description into structured nutritional data",
  input_schema: {
    type: "object" as const,
    properties: {
      items: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            description: { type: "string" as const },
            calories: { type: "number" as const },
            protein_g: { type: "number" as const },
            carbs_g: { type: "number" as const },
            fat_g: { type: "number" as const },
            warning: { type: "string" as const },
          },
          required: [
            "description",
            "calories",
            "protein_g",
            "carbs_g",
            "fat_g",
          ],
        },
      },
    },
    required: ["items"],
  },
};

export async function parseHandler(
  request: HttpRequest,
  _context: InvocationContext,
): Promise<HttpResponseInit> {
  let body: ParseRequestBody;

  try {
    body = (await request.json()) as ParseRequestBody;
  } catch {
    return jsonResponse(400, { error: "Invalid JSON in request body" });
  }

  if (!body.apiKey || typeof body.apiKey !== "string") {
    return jsonResponse(400, { error: "Missing required field: apiKey" });
  }

  if (!body.input || typeof body.input !== "string") {
    return jsonResponse(400, { error: "Missing required field: input" });
  }

  let claudeResponse: Response;

  try {
    claudeResponse = await fetch(CLAUDE_API_URL, {
      method: "POST",
      headers: {
        "x-api-key": body.apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: body.input }],
        tools: [PARSE_FOOD_ITEMS_TOOL],
        tool_choice: { type: "tool", name: "parse_food_items" },
      }),
    });
  } catch {
    return jsonResponse(502, { error: "AI service unavailable" });
  }

  if (claudeResponse.status === 401) {
    return jsonResponse(401, { error: "Invalid API key" });
  }

  if (claudeResponse.status === 429) {
    return jsonResponse(429, { error: "Rate limited", retryAfter: 30 });
  }

  if (claudeResponse.status >= 500) {
    return jsonResponse(502, { error: "AI service unavailable" });
  }

  if (!claudeResponse.ok) {
    return jsonResponse(502, { error: "AI service unavailable" });
  }

  let claudeBody: ClaudeResponse;

  try {
    claudeBody = (await claudeResponse.json()) as ClaudeResponse;
  } catch {
    return jsonResponse(502, { error: "AI service unavailable" });
  }

  const toolUseBlock = claudeBody.content?.find(
    (block): block is ClaudeToolUseBlock => block.type === "tool_use",
  );

  if (!toolUseBlock?.input?.items || !Array.isArray(toolUseBlock.input.items)) {
    return jsonResponse(502, { error: "AI service unavailable" });
  }

  return jsonResponse(200, { items: toolUseBlock.input.items });
}

function jsonResponse(
  status: number,
  body: Record<string, unknown>,
): HttpResponseInit {
  return {
    status,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  };
}

app.http("parse", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: parseHandler,
});
