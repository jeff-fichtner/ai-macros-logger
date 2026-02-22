# Research: Meal Grouping

**Feature**: 004-meal-grouping
**Date**: 2026-02-22

## R1: Adding `meal_label` to Tool Calling Schema

**Decision**: Add `meal_label` as a top-level string property alongside `items` in the shared `TOOL_SCHEMA`.

**Rationale**: All three AI providers (Claude, OpenAI, Gemini) return tool call arguments as objects — either pre-parsed (Claude, Gemini) or via a single `JSON.parse` (OpenAI). Adding a sibling property to `items` works identically across all three with no provider-specific gotchas.

**Alternatives considered**:
- Separate API call for label generation — rejected (doubles latency and cost, violates Simplicity First principle)
- Include label inside each item — rejected (redundant data, label describes the group not individual items)
- Client-side label generation — rejected (can't leverage AI context about the food items)

## R2: Group Identifier Strategy

**Decision**: Generate a short random ID client-side at submission time (e.g., `crypto.randomUUID()` or `Date.now().toString(36)`). Store it in a new sheet column alongside each entry row.

**Rationale**: The group ID only needs to be unique within a single user's spreadsheet for a given day. A timestamp-based or random string is sufficient. Server-side generation would violate Stateless Relay (constitution principle III).

**Alternatives considered**:
- UUID v4 — works but is 36 chars, unnecessarily long for a sheet column
- `Date.now().toString(36)` — 8 chars, unique enough within a single user's submissions (ms resolution)
- Derive from raw_input + time — rejected (two identical submissions at the same time would collide)

## R3: Sheet Column Layout Change

**Decision**: Extend the sheet from 8 columns (A:H) to 10 columns (A:J). New columns:
- Column I: `Group ID` — short identifier linking rows to the same meal group
- Column J: `Meal Label` — AI-generated label (e.g., "Breakfast", "Snack")

**Rationale**: Keeping the sheet flat with two extra columns is the simplest approach. No structural changes to how Google Sheets API reads/writes. The frontend groups rows by Group ID when rendering.

**Alternatives considered**:
- Separate "Groups" sheet — rejected (adds complexity, requires cross-sheet lookups, violates Simplicity First)
- Encode group info in the raw_input column — rejected (breaks existing raw_input semantics)

## R4: System Prompt Update

**Decision**: Add a line to the system prompt instructing the AI to also return a `meal_label` field — a 1–4 word descriptive name for the group of food items (e.g., "Breakfast", "Post-Workout Snack"). The prompt should note this is a short label, not a sentence.

**Rationale**: The AI already processes the food description and understands the context. Adding the label to the same prompt/response cycle costs no additional latency.

## R5: EntryHistory Grouping Logic

**Decision**: Frontend groups `FoodEntry[]` by `group_id` field, preserving chronological order. Each group renders a header (label + time), individual items, and a subtotal row.

**Rationale**: Grouping is purely a display concern — the data model remains flat entries with group metadata. The `computeSummary` function continues to sum all individual entries regardless of groups.
