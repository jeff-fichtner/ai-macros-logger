export interface FoodItem {
  description: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  warning?: string;
}

export type ProviderHandler = (
  apiKey: string,
  systemPrompt: string,
  input: string,
) => Promise<FoodItem[]>;

export const TOOL_SCHEMA = {
  type: "object" as const,
  properties: {
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
  required: ["items"],
};
