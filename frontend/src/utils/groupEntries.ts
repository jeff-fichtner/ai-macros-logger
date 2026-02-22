import type { FoodEntry } from '@/types';

export interface MealGroup {
  group_id: string;
  meal_label: string;
  time: string;
  items: FoodEntry[];
  totals: { calories: number; protein_g: number; carbs_g: number; fat_g: number };
}

export function groupEntries(entries: FoodEntry[]): MealGroup[] {
  const groups = new Map<string, MealGroup>();

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const key = entry.group_id || `ungrouped-${i}`;
    const existing = groups.get(key);

    if (existing) {
      existing.items.push(entry);
      existing.totals.calories += entry.calories;
      existing.totals.protein_g += entry.protein_g;
      existing.totals.carbs_g += entry.carbs_g;
      existing.totals.fat_g += entry.fat_g;
    } else {
      groups.set(key, {
        group_id: key,
        meal_label: entry.meal_label || 'Meal',
        time: entry.time,
        items: [entry],
        totals: {
          calories: entry.calories,
          protein_g: entry.protein_g,
          carbs_g: entry.carbs_g,
          fat_g: entry.fat_g,
        },
      });
    }
  }

  return Array.from(groups.values());
}
