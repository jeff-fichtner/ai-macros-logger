import { describe, it, expect } from 'vitest';
import { groupEntries } from '@/utils/groupEntries';
import type { FoodEntry } from '@/types';

function entry(overrides: Partial<FoodEntry> = {}): FoodEntry {
  return {
    date: '2026-02-22',
    time: '12:00',
    description: 'Chicken',
    calories: 300,
    protein_g: 30,
    carbs_g: 0,
    fat_g: 10,
    raw_input: 'chicken',
    group_id: '',
    meal_label: '',
    utc_offset: '',
    sheetRow: 0,
    ...overrides,
  };
}

describe('groupEntries', () => {
  it('groups entries by group_id', () => {
    const entries = [
      entry({ group_id: 'g1', description: 'Chicken', calories: 300, protein_g: 30 }),
      entry({ group_id: 'g1', description: 'Rice', calories: 200, protein_g: 5, carbs_g: 40 }),
      entry({ group_id: 'g2', description: 'Apple', calories: 95, protein_g: 0 }),
    ];

    const groups = groupEntries(entries);

    expect(groups).toHaveLength(2);
    expect(groups[0].items).toHaveLength(2);
    expect(groups[1].items).toHaveLength(1);
  });

  it('computes subtotals correctly', () => {
    const entries = [
      entry({ group_id: 'g1', calories: 300, protein_g: 30, carbs_g: 0, fat_g: 10 }),
      entry({ group_id: 'g1', calories: 200, protein_g: 5, carbs_g: 40, fat_g: 2 }),
    ];

    const groups = groupEntries(entries);

    expect(groups[0].totals).toEqual({
      calories: 500,
      protein_g: 35,
      carbs_g: 40,
      fat_g: 12,
    });
  });

  it('single-item group has correct subtotals', () => {
    const entries = [
      entry({ group_id: 'g1', calories: 300, protein_g: 30, carbs_g: 5, fat_g: 10 }),
    ];

    const groups = groupEntries(entries);

    expect(groups).toHaveLength(1);
    expect(groups[0].totals).toEqual({
      calories: 300,
      protein_g: 30,
      carbs_g: 5,
      fat_g: 10,
    });
  });

  it('preserves insertion order (chronological)', () => {
    const entries = [
      entry({ group_id: 'g1', time: '08:00', meal_label: 'Breakfast' }),
      entry({ group_id: 'g2', time: '12:00', meal_label: 'Lunch' }),
      entry({ group_id: 'g3', time: '18:00', meal_label: 'Dinner' }),
    ];

    const groups = groupEntries(entries);

    expect(groups.map((g) => g.meal_label)).toEqual(['Breakfast', 'Lunch', 'Dinner']);
  });

  it('uses meal_label from first entry in group', () => {
    const entries = [
      entry({ group_id: 'g1', meal_label: 'Lunch' }),
      entry({ group_id: 'g1', meal_label: 'Dinner' }),
    ];

    const groups = groupEntries(entries);

    expect(groups[0].meal_label).toBe('Lunch');
  });

  it('falls back to "Meal" when meal_label is empty', () => {
    const entries = [
      entry({ group_id: 'g1', meal_label: '' }),
    ];

    const groups = groupEntries(entries);

    expect(groups[0].meal_label).toBe('Meal');
  });

  it('ungrouped entries each form their own group', () => {
    const entries = [
      entry({ group_id: '', time: '12:00', description: 'Chicken' }),
      entry({ group_id: '', time: '12:00', description: 'Chicken' }),
    ];

    const groups = groupEntries(entries);

    expect(groups).toHaveLength(2);
    expect(groups[0].items).toHaveLength(1);
    expect(groups[1].items).toHaveLength(1);
  });

  it('mixed grouped and ungrouped entries', () => {
    const entries = [
      entry({ group_id: 'g1', description: 'Chicken' }),
      entry({ group_id: '', description: 'Apple' }),
      entry({ group_id: 'g1', description: 'Rice' }),
      entry({ group_id: '', description: 'Banana' }),
    ];

    const groups = groupEntries(entries);

    // g1 group, ungrouped Apple, ungrouped Banana
    expect(groups).toHaveLength(3);
    expect(groups[0].items).toHaveLength(2); // Chicken + Rice
    expect(groups[1].items[0].description).toBe('Apple');
    expect(groups[2].items[0].description).toBe('Banana');
  });

  it('returns empty array for empty input', () => {
    expect(groupEntries([])).toEqual([]);
  });

  it('uses time from first entry in group', () => {
    const entries = [
      entry({ group_id: 'g1', time: '12:00' }),
      entry({ group_id: 'g1', time: '12:05' }),
    ];

    const groups = groupEntries(entries);

    expect(groups[0].time).toBe('12:00');
  });
});
