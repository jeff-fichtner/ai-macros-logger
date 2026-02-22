import { TOOL_SCHEMA, type FoodItem, type ParseResult, type ProviderHandler } from "./types.js";

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

interface OpenAIResponse {
  choices: {
    message: {
      tool_calls?: {
        function: {
          arguments: string;
        };
      }[];
    };
  }[];
}

export const callProvider: ProviderHandler = async (
  apiKey,
  systemPrompt,
  input,
) => {
  let response: Response;

  try {
    response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: input },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "parse_food_items",
              description:
                "Parse food items from a natural language description into structured nutritional data",
              parameters: TOOL_SCHEMA,
            },
          },
        ],
        tool_choice: {
          type: "function",
          function: { name: "parse_food_items" },
        },
      }),
    });
  } catch (err) {
    throw new Error(
      `Failed to reach OpenAI API: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    const status = response.status;
    throw Object.assign(
      new Error(
        `OpenAI API ${status}: ${text || response.statusText}`,
      ),
      { status },
    );
  }

  let body: OpenAIResponse;

  try {
    body = (await response.json()) as OpenAIResponse;
  } catch (err) {
    throw new Error(
      `Failed to parse OpenAI response: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const args = body.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;

  if (!args) {
    throw new Error(
      `Unexpected OpenAI response structure: no tool_calls in response`,
    );
  }

  let parsed: { meal_label?: string; items: FoodItem[] };

  try {
    parsed = JSON.parse(args) as { meal_label?: string; items: FoodItem[] };
  } catch (err) {
    throw new Error(
      `Failed to parse OpenAI tool arguments: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  if (!parsed.items || !Array.isArray(parsed.items)) {
    throw new Error(
      `Unexpected OpenAI response structure: missing items array`,
    );
  }

  return {
    meal_label: parsed.meal_label || "Meal",
    items: parsed.items,
  };
};
