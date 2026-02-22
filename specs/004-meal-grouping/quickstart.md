# Quickstart: Meal Grouping

**Feature**: 004-meal-grouping

## Test Scenario 1: Basic Meal Grouping

1. Open the app, ensure an AI provider is configured and Google Sheets is connected
2. Type "2 eggs, toast with butter, and coffee" and click Log
3. Verify the parse result shows items **and** the API response includes a `meal_label`
4. Click Confirm
5. Verify the food log shows a meal group with:
   - A label (e.g., "Breakfast")
   - The submission time
   - Three individual items (eggs, toast, coffee)
   - A subtotal row with combined macros

## Test Scenario 2: Multiple Meals, Chronological Order

1. Log "oatmeal and orange juice" (morning)
2. Log "chicken caesar salad" (later)
3. Verify the food log shows two groups:
   - First group at top (earlier time) with label like "Breakfast"
   - Second group below (later time) with label like "Lunch"
4. Verify each group has its own subtotal
5. Verify the daily macro summary equals the sum of all individual items

## Test Scenario 3: Single Item Group

1. Log "an apple"
2. Verify it appears as a group of one with a label (e.g., "Snack")
3. Verify the subtotal equals the single item's macros

## Test Scenario 4: Spreadsheet Verification

1. After logging meals, open the Google Sheet
2. Verify columns I and J contain Group ID and Meal Label
3. Verify all rows from the same submission share the same Group ID and Meal Label
4. Verify rows from different submissions have different Group IDs

## Test Scenario 5: AI Label Fallback

1. If feasible, simulate a response without `meal_label` (e.g., mock the API)
2. Verify the group displays with fallback label "Meal"
3. Verify the submission is not blocked
