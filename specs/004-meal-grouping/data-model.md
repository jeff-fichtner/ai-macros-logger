# Data Model: Meal Grouping

**Feature**: 004-meal-grouping
**Date**: 2026-02-22

## Entities

### Food Entry (updated)

Represents a single food item logged by the user. Extended with meal group metadata.

| Field       | Type   | Required | Description                                   |
|-------------|--------|----------|-----------------------------------------------|
| date        | string | yes      | Date of entry (YYYY-MM-DD)                    |
| time        | string | yes      | Time of entry (HH:MM)                         |
| description | string | yes      | Food item description                         |
| calories    | number | yes      | Calorie count                                 |
| protein_g   | number | yes      | Protein in grams                              |
| carbs_g     | number | yes      | Carbohydrates in grams                        |
| fat_g       | number | yes      | Fat in grams                                  |
| raw_input   | string | yes      | Original user input text                      |
| group_id    | string | yes      | Identifier linking entries from same submission|
| meal_label  | string | yes      | AI-generated meal label (e.g., "Breakfast")   |

### Meal Group (derived, not stored separately)

A meal group is not a separate entity — it is derived by grouping Food Entries that share the same `group_id`. The frontend constructs meal groups at display time.

| Property    | Source                                          |
|-------------|-------------------------------------------------|
| group_id    | Shared `group_id` value across entries          |
| meal_label  | `meal_label` field (same on all entries in group)|
| time        | `time` field (same on all entries in group)     |
| items       | All Food Entries with matching `group_id`       |
| subtotals   | Computed sum of calories, protein, carbs, fat   |

## Google Sheets Layout

### Current (8 columns: A–H)

```
A: Date | B: Time | C: Description | D: Calories | E: Protein (g) | F: Carbs (g) | G: Fat (g) | H: Raw Input
```

### Updated (10 columns: A–J)

```
A: Date | B: Time | C: Description | D: Calories | E: Protein (g) | F: Carbs (g) | G: Fat (g) | H: Raw Input | I: Group ID | J: Meal Label
```

### Relationships

- One Meal Group → one or more Food Entries (1:N via shared `group_id`)
- One Food Entry → exactly one Meal Group
- All entries in a group share the same `date`, `time`, `raw_input`, `group_id`, and `meal_label`

### Validation Rules

- `group_id` must be a non-empty string
- `meal_label` must be a non-empty string; if AI fails to generate one, use fallback "Meal"
- `meal_label` should be 1–4 words
