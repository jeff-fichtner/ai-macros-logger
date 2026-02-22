import { apiPost } from "@/services/api";
import type { AIParseResult } from "@/types";

export function buildRefinementPrompt(
  originalInput: string,
  currentResult: AIParseResult,
  refinements: string[],
): string {
  const formatted = currentResult.items
    .map((item) => `- ${item.description}: ${item.calories} cal, P ${item.protein_g}g, C ${item.carbs_g}g, F ${item.fat_g}g`)
    .join("\n");
  const latest = refinements[refinements.length - 1];
  const history = refinements.length > 1
    ? `\nPrior refinements:\n${refinements.slice(0, -1).map((r) => `- "${r}"`).join("\n")}\n`
    : "";
  return `Original: "${originalInput}"\nCurrent results:\n${formatted}${history}\nRefinement: "${latest}"`;
}

export async function parseFood(
  provider: string,
  apiKey: string,
  input: string,
): Promise<AIParseResult> {
  return apiPost<AIParseResult>("/api/parse", { provider, apiKey, input });
}
