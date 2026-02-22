import { TOOL_SCHEMA, type FoodItem, type ProviderHandler } from "./types.js";

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

interface GeminiResponse {
  candidates?: {
    content?: {
      parts?: {
        functionCall?: {
          args?: { items: FoodItem[] };
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
    response = await fetch(GEMINI_API_URL, {
      method: "POST",
      headers: {
        "x-goog-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemPrompt }],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: input }],
          },
        ],
        tools: [
          {
            functionDeclarations: [
              {
                name: "parse_food_items",
                description:
                  "Parse food items from a natural language description into structured nutritional data",
                parameters: TOOL_SCHEMA,
              },
            ],
          },
        ],
        tool_config: {
          function_calling_config: {
            mode: "ANY",
            allowed_function_names: ["parse_food_items"],
          },
        },
      }),
    });
  } catch (err) {
    throw new Error(
      `Failed to reach Gemini API: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    const status = response.status;
    throw Object.assign(
      new Error(
        `Gemini API ${status}: ${text || response.statusText}`,
      ),
      { status },
    );
  }

  let body: GeminiResponse;

  try {
    body = (await response.json()) as GeminiResponse;
  } catch (err) {
    throw new Error(
      `Failed to parse Gemini response: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const args =
    body.candidates?.[0]?.content?.parts?.[0]?.functionCall?.args;

  if (!args?.items || !Array.isArray(args.items)) {
    throw new Error(
      `Unexpected Gemini response structure: ${JSON.stringify(body.candidates?.[0]?.content?.parts?.map((p) => Object.keys(p)))}`,
    );
  }

  return args.items;
};
