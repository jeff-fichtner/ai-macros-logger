import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import type { ProviderHandler } from "../providers/types.js";
import { callProvider as callClaude } from "../providers/claude.js";
import { callProvider as callOpenAI } from "../providers/openai.js";
import { callProvider as callGemini } from "../providers/gemini.js";

interface ParseRequestBody {
  provider: string;
  apiKey: string;
  input: string;
}

const VALID_PROVIDERS = ["claude", "openai", "gemini"] as const;

export const SYSTEM_PROMPT = `You are a nutrition data extraction assistant. Your job is to parse natural language food descriptions into structured macronutrient data.

Guidelines:
- Use USDA FoodData Central reference values for standard portions and common foods.
- When a quantity is specified (e.g., "2 eggs", "1 cup rice"), use that exact quantity.
- When quantity is ambiguous or omitted (e.g., "almonds", "some pasta"), estimate a typical single serving and include a warning field explaining the assumption.
- For composite or prepared foods (e.g., "Caesar salad"), estimate based on a typical restaurant or homemade serving.
- Round calories to the nearest whole number. Round grams to one decimal place.
- If the input does not describe food at all, return a single item with description "Not a food item", all macros set to 0, and a warning explaining why the input could not be parsed as food.`;

const providers: Record<string, ProviderHandler> = {
  claude: callClaude,
  openai: callOpenAI,
  gemini: callGemini,
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

  if (!body.provider || typeof body.provider !== "string") {
    return jsonResponse(400, { error: "Missing required field: provider" });
  }

  if (
    !VALID_PROVIDERS.includes(
      body.provider as (typeof VALID_PROVIDERS)[number],
    )
  ) {
    return jsonResponse(400, {
      error: `Unsupported provider: ${body.provider}`,
    });
  }

  if (!body.apiKey || typeof body.apiKey !== "string") {
    return jsonResponse(400, { error: "Missing required field: apiKey" });
  }

  if (!body.input || typeof body.input !== "string") {
    return jsonResponse(400, { error: "Missing required field: input" });
  }

  const handler = providers[body.provider];

  try {
    const items = await handler(body.apiKey, SYSTEM_PROMPT, body.input);
    return jsonResponse(200, { items });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status =
      (err as { status?: number }).status === 401
        ? 401
        : (err as { status?: number }).status === 429
          ? 429
          : 502;
    return jsonResponse(status, { error: message });
  }
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
