import type { FoodEntry } from '@/types';
import { groupEntries } from '@/utils/groupEntries';
import { parseEntryTimestamp, formatLocalTime } from '@/utils/entryTime';

interface EntryHistoryProps {
  entries: FoodEntry[];
}

export default function EntryHistory({ entries }: EntryHistoryProps) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-gray-400">No entries today. Log a meal to get started.</p>
    );
  }

  const groups = groupEntries(entries);

  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-gray-700">Today's Entries</h3>
      <div className="space-y-4">
        {groups.map((group) => (
          <div key={group.group_id} className="rounded-lg border border-gray-200 bg-white">
            <div className="flex items-baseline justify-between border-b border-gray-100 px-3 py-2">
              <span className="text-sm font-semibold text-gray-800">{group.meal_label}</span>
              <span className="text-xs text-gray-400">
                {(() => {
                  const ts = parseEntryTimestamp(group.items[0]);
                  return ts ? formatLocalTime(ts) : group.time;
                })()}
              </span>
            </div>
            <div className="divide-y divide-gray-50 px-3">
              {group.items.map((entry, i) => (
                <div key={i} className="py-2">
                  <div className="flex items-start justify-between">
                    <span className="text-sm text-gray-900">{entry.description}</span>
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
            <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-600">
              <span>Subtotal</span>
              <div className="flex gap-3">
                <span>{group.totals.calories} cal</span>
                <span>P: {group.totals.protein_g}g</span>
                <span>C: {group.totals.carbs_g}g</span>
                <span>F: {group.totals.fat_g}g</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
