# Research: Multi-Provider AI Support

**Feature**: 003-multi-provider-ai
**Date**: 2026-02-22

## Provider API Patterns

### Decision: Use function calling / tool_use across all providers

**Rationale**: All three providers support forcing structured output via function/tool calling. This gives the most consistent behavior — the model must return data matching the schema rather than free-form text.

**Alternatives considered**:
- JSON mode (OpenAI) / responseSchema (Gemini): Simpler but less reliable schema enforcement. Also inconsistent across providers.
- Free-form text + regex parsing: Fragile, error-prone.

### Claude (existing)

- **Endpoint**: `POST https://api.anthropic.com/v1/messages`
- **Auth**: `x-api-key` header + `anthropic-version: 2023-06-01`
- **Model**: `claude-haiku-4-5-20251001`
- **Tool forcing**: `tool_choice: { type: "tool", name: "parse_food_items" }`
- **Response extraction**: `response.content.find(b => b.type === "tool_use").input`
- **Result type**: Already-parsed object (no JSON.parse needed)

### OpenAI

- **Endpoint**: `POST https://api.openai.com/v1/chat/completions`
- **Auth**: `Authorization: Bearer <key>`
- **Model**: `gpt-4o-mini` (fast, cheap, analogous to Haiku)
- **Tool forcing**: `tool_choice: { type: "function", function: { name: "parse_food_items" } }`
- **Schema differences from Claude**:
  - Schema key is `parameters` (not `input_schema`)
  - Tools wrapped in `{ type: "function", function: { ... } }` structure
  - Supports optional `strict: true` + `additionalProperties: false` for schema enforcement, but we skip strict mode — `tool_choice` forcing is sufficient, and strict mode requires all fields in `required` with union types for optionals (e.g., `warning` would need `["string", "null"]`), adding complexity for little benefit
- **Response extraction**: `JSON.parse(response.choices[0].message.tool_calls[0].function.arguments)`
- **Result type**: JSON string that must be parsed

### Gemini

- **Endpoint**: `POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`
- **Auth**: `x-goog-api-key` header
- **Model**: `gemini-2.0-flash` (fast, cheap)
- **Tool forcing**: `tool_config: { function_calling_config: { mode: "ANY", allowed_function_names: ["parse_food_items"] } }`
- **Schema differences**:
  - Tools in `tools[].functionDeclarations[]` (not `tools[]`)
  - System prompt in `system_instruction.parts[].text` (not `system` string)
  - Messages in `contents[].parts[].text` (not `messages[].content`)
- **Response extraction**: `response.candidates[0].content.parts[0].functionCall.args`
- **Result type**: Already-parsed object (no JSON.parse needed)

## Provider Handler Interface

### Decision: Each provider exports `callProvider(apiKey: string, systemPrompt: string, input: string): Promise<FoodItem[]>`

**Rationale**: Same signature for all providers. The parse handler doesn't need to know provider internals. Each handler builds its own request format, calls the API, and extracts/normalizes the result.

**Alternatives considered**:
- Abstract class / interface with inheritance: Overengineered for 3 implementations with no shared state.
- Single function with switch statement: Keeps all provider logic in parse.ts, which would be too long.

## Settings Data Model

### Decision: Store providers as an array of `{ provider, apiKey }` with an `activeProvider` field

**Rationale**: Supports the user's requirement to configure multiple providers and switch between them. Each provider stores its own key independently.

**Alternatives considered**:
- Separate fields per provider (`claudeApiKey`, `openaiApiKey`, `geminiApiKey`): Works for exactly 3 providers but doesn't generalize. Also makes the settings UI harder — you'd show all 3 fields even if user only uses one.
- Single provider + key (clear on switch): User explicitly rejected this.

### Migration

Existing users have `claudeApiKey` in localStorage. On first load with the new code:
- If `claudeApiKey` exists and `aiProviders` does not exist: create `aiProviders: [{ provider: "claude", apiKey: claudeApiKey }]` and `activeProvider: "claude"`.
- The old `claudeApiKey` field can remain in storage (Zustand ignores unknown fields) but is no longer read.

## System Prompt

### Decision: Use the same system prompt for all providers

**Rationale**: The prompt describes the task (parse food into structured nutrition data) in plain language. All three providers understand it. The structured output schema (defined in the tool/function declaration) handles the format enforcement.

The existing `SYSTEM_PROMPT` in parse.ts works for all providers. No per-provider prompt needed.
