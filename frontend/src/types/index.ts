export interface FoodEntry {
  date: string;
  time: string;
  description: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  raw_input: string;
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

export interface UserConfiguration {
  claudeApiKey: string;
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
  items: AIParseItem[];
}

export interface ApiError {
  error: string;
  retryAfter?: number;
}
