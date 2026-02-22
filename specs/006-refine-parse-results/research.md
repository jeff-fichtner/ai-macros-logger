# Research: Refine Parse Results

**Feature**: 006-refine-parse-results
**Date**: 2026-02-22

## Research Questions

### R1: How to pass refinement context to the AI without violating Stateless Relay (Constitution III)?

**Decision**: Append refinement instructions to the `input` string on the client side, so the API request body stays the same shape (`{ provider, apiKey, input }`). No multi-turn conversation, no message history array, no server-side session.

**Rationale**: The constitution mandates a stateless relay. The simplest approach is to construct a combined prompt on the frontend that includes the original food description and all refinement instructions in a single user message. All three providers (Claude, OpenAI, Gemini) already accept a single user message — we just change what's in it.

**Format**: When refining, the `input` field becomes:
```
Original: "3 eggs and toast"
Current results: [JSON of current AIParseResult]
Refinement: "make it 2 eggs"
```

This gives the AI full context without any API signature changes. The system prompt already instructs the AI to parse food items — seeing "Original" + "Current results" + "Refinement" gives it enough context to produce corrected results.

**Alternatives considered**:
- **Multi-turn message history**: Would require changing `ProviderHandler` signature, the API request body shape, and all three provider implementations. Adds complexity for no clear benefit — the AI doesn't need turn-by-turn history when the current results are included in the prompt.
- **Server-side session storage**: Violates Constitution III (Stateless Relay). Rejected immediately.
- **New `/api/parse/refine` endpoint**: Unnecessary — the existing `/api/parse` endpoint works as-is since we're modifying the client-side `input` string.

### R2: Should the frontend or backend construct the refinement prompt?

**Decision**: Frontend constructs the combined prompt. The backend receives an opaque `input` string and processes it identically to any other parse request.

**Rationale**: Constitution III (Stateless Relay) says the Azure Function "MUST NOT add business logic beyond request formatting." Prompt construction for refinement is business logic — it belongs in the frontend. The backend doesn't need to know whether a request is an initial parse or a refinement.

**Alternatives considered**:
- **Backend constructs prompt from structured fields**: Would add business logic to the relay function, violating Constitution III.
- **Separate refinement service**: Over-engineering for a string concatenation. Violates Constitution V (Simplicity First).

### R3: How to accumulate refinement history across multiple refinements?

**Decision**: Store an array of refinement instruction strings in the `useFoodLog` hook state. On each refinement, include the original input, all prior refinement instructions, the current AI results, and the new refinement instruction in a single prompt.

**Rationale**: The AI needs full context to produce accurate corrections. Including the current results (not just the history of instructions) ensures the AI can see exactly what it's correcting, even if prior instructions were ambiguous.

**Alternatives considered**:
- **Only send latest refinement + current results**: Loses context of the correction chain. If the user said "make it 2 eggs" then "add butter", the AI might not understand these were sequential corrections.
- **Send full message history as separate messages**: Requires multi-turn API changes. Rejected per R1.

### R4: New status value or reuse 'parsing' for refinement loading state?

**Decision**: Add a new `'refining'` status value to the `Status` type union.

**Rationale**: The UI needs to distinguish between initial parsing (triggered from the main food input) and refinement (triggered from the refinement input within the parse result card). The Refine button needs its own loading state while the main food input should remain unaffected. Using a separate status makes the conditional rendering clearer.

**Alternatives considered**:
- **Reuse 'parsing' status**: Would show loading on the main FoodInput component when refinement is in progress. Confusing UX.
- **Separate boolean `refining` state**: Works but is redundant when the Status enum already handles mutual exclusivity.

### R5: Where does the refinement UI live — in ParseResult component or a new component?

**Decision**: Add the refinement text input and Refine button directly to the existing `ParseResult` component.

**Rationale**: Constitution V (Simplicity First) — the refinement input is a small addition (a text field + button) that logically belongs in the parse result card. Extracting it to a separate component would require prop threading for no benefit.

**Alternatives considered**:
- **New RefineInput component**: Over-abstraction for a single text field and button. No reuse case exists.
- **Modify FoodInput to serve dual purpose**: Confusing UX — the main input is for new food descriptions, refinement is for corrections.
