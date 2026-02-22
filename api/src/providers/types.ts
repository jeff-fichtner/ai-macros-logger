export interface FoodItem {
  description: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  warning?: string;
}

export interface ParseResult {
  meal_label: string;
  items: FoodItem[];
}

export type ProviderHandler = (
  apiKey: string,
  systemPrompt: string,
  input: string,
) => Promise<ParseResult>;

export const TOOL_SCHEMA = {
  type: "object" as const,
  properties: {
    meal_label: {
      type: "string" as const,
      description:
        "A short 1-4 word label describing this meal (e.g., 'Breakfast', 'Afternoon Snack')" as const,
    },
    items: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          description: { type: "string" as const },
          calories: { type: "number" as const },
          protein_g: { type: "number" as const },
          carbs_g: { type: "number" as const },
          fat_g: { type: "number" as const },
          warning: { type: "string" as const },
        },
        required: [
          "description",
          "calories",
          "protein_g",
          "carbs_g",
          "fat_g",
        ],
      },
    },
  },
  required: ["meal_label", "items"],
};
