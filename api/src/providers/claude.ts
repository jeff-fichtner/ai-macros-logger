import { TOOL_SCHEMA, type FoodItem, type ProviderHandler } from "./types.js";

const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";

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

export const callProvider: ProviderHandler = async (
  apiKey,
  systemPrompt,
  input,
) => {
  let response: Response;

  try {
    response = await fetch(CLAUDE_API_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: "user", content: input }],
        tools: [
          {
            name: "parse_food_items",
            description:
              "Parse food items from a natural language description into structured nutritional data",
            input_schema: TOOL_SCHEMA,
          },
        ],
        tool_choice: { type: "tool", name: "parse_food_items" },
      }),
    });
  } catch (err) {
    throw new Error(
      `Failed to reach Claude API: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    const status = response.status;
    throw Object.assign(
      new Error(
        `Claude API ${status}: ${text || response.statusText}`,
      ),
      { status },
    );
  }

  let body: ClaudeResponse;

  try {
    body = (await response.json()) as ClaudeResponse;
  } catch (err) {
    throw new Error(
      `Failed to parse Claude response: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const toolUseBlock = body.content?.find(
    (block): block is ClaudeToolUseBlock => block.type === "tool_use",
  );

  if (
    !toolUseBlock?.input?.items ||
    !Array.isArray(toolUseBlock.input.items)
  ) {
    throw new Error(
      `Unexpected Claude response structure: ${JSON.stringify(body.content?.map((b) => b.type))}`,
    );
  }

  return toolUseBlock.input.items;
};
