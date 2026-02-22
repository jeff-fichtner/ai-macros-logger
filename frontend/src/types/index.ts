export interface FoodEntry {
  date: string;
  time: string;
  description: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  raw_input: string;
  group_id: string;
  meal_label: string;
  utc_offset: string;
}

export interface DailySummary {
  date: string;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  entryCount: number;
}

export interface MacroTargets {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export type AIProviderType = 'claude' | 'openai' | 'gemini';

export interface AIProviderConfig {
  provider: AIProviderType;
  apiKey: string;
}

export interface UserConfiguration {
  aiProviders: AIProviderConfig[];
  activeProvider: string;
  googleClientId: string;
  googleClientSecret: string;
  googleAccessToken: string;
  googleRefreshToken: string;
  googleTokenExpiry: number;
  spreadsheetId: string;
  macroTargets: MacroTargets | null;
}

export interface AIParseItem {
  description: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  warning?: string;
}

export interface AIParseResult {
  meal_label: string;
  items: AIParseItem[];
}

export interface WriteError {
  message: string;
  isAuthError: boolean;
}

export interface ApiError {
  error: string;
  retryAfter?: number;
}
