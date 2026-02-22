# Quickstart: Refine Parse Results

**Feature**: 006-refine-parse-results
**Date**: 2026-02-22

## Scenario 1: Single Refinement (Happy Path)

1. User types "3 eggs and toast" in the food input and submits
2. AI returns: Scrambled Eggs (3 large) 234 cal + Toast (1 slice) 79 cal
3. User sees results in the parse result card with a refinement text input below the items
4. User types "make it 2 eggs" in the refinement input and clicks "Refine"
5. Refine button shows "Refining..." and all buttons are disabled
6. AI returns updated results: Scrambled Eggs (2 large) 156 cal + Toast (1 slice) 79 cal
7. Results update in place. Refinement input clears.
8. User clicks "Confirm" — entries saved to Google Sheets

## Scenario 2: Multiple Sequential Refinements

1. User parses "chicken rice and broccoli"
2. AI returns 3 items
3. User refines: "remove the rice" → AI returns 2 items (chicken + broccoli)
4. User refines again: "make it 200g chicken" → AI returns 2 items with updated chicken macros
5. User confirms — final 2 items saved

## Scenario 3: Refinement Error → Confirm Previous Results

1. User parses "2 tacos"
2. AI returns results
3. User types refinement and submits
4. Request fails (network error / rate limit)
5. Error message appears below items: "Failed to refine: [error message]"
6. Previous results (2 tacos) remain visible and confirmable
7. User clicks "Confirm" — original 2-taco results saved

## Scenario 4: Refinement Error → Retry Refinement

1. Same as Scenario 3 up to step 6
2. User types a new refinement instruction and submits
3. Error clears, new refinement attempt starts
4. This time it succeeds — updated results displayed
5. User confirms

## Scenario 5: Empty Refinement Ignored

1. User parses a meal, sees results
2. User clicks "Refine" with empty text input
3. Nothing happens — no request sent, no state change

## Scenario 6: Cancel After Refinement

1. User parses "pizza and soda"
2. AI returns results
3. User refines: "remove the soda"
4. Updated results show pizza only
5. User clicks "Cancel"
6. All state cleared — parse result, refinement history, input text
7. User is back to the empty food input state
