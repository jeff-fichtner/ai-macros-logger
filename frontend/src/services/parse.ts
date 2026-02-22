import { apiPost } from "@/services/api";
import type { AIParseResult } from "@/types";

export async function parseFood(
  apiKey: string,
  input: string,
): Promise<AIParseResult> {
  return apiPost<AIParseResult>("/api/parse", { apiKey, input });
}
