import type { FoodEntry } from '@/types';

interface EntryHistoryProps {
  entries: FoodEntry[];
}

export default function EntryHistory({ entries }: EntryHistoryProps) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-gray-400">No entries today. Log a meal to get started.</p>
    );
  }

  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-gray-700">Today's Entries</h3>
      <div className="space-y-2">
        {entries.map((entry, i) => (
          <div key={i} className="rounded-md border border-gray-100 bg-white p-3">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs text-gray-400">{entry.time}</span>
                <span className="ml-2 text-sm text-gray-900">{entry.description}</span>
              </div>
              <span className="ml-2 whitespace-nowrap text-sm text-gray-500">{entry.calories} cal</span>
            </div>
            <div className="mt-1 flex gap-3 text-xs text-gray-500">
              <span>P: {entry.protein_g}g</span>
              <span>C: {entry.carbs_g}g</span>
              <span>F: {entry.fat_g}g</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
