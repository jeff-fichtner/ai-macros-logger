import type { FoodEntry } from '@/types';
import { groupEntries } from '@/utils/groupEntries';
import { parseEntryTimestamp, formatLocalTime } from '@/utils/entryTime';

interface EntryHistoryProps {
  entries: FoodEntry[];
  onDeleteGroup?: (groupId: string) => void;
  onDeleteEntry?: (sheetRow: number) => void;
  deleting?: boolean;
  deleteError?: string | null;
}

export default function EntryHistory({ entries, onDeleteGroup, onDeleteEntry, deleting, deleteError }: EntryHistoryProps) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-gray-400">No entries today. Log a meal to get started.</p>
    );
  }

  const groups = groupEntries(entries);

  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-gray-700">Today's Entries</h3>
      {deleteError && (
        <div className="mb-2 rounded-lg border border-red-200 bg-red-50 p-2">
          <p className="text-sm text-red-700">{deleteError}</p>
        </div>
      )}
      <div className="space-y-4">
        {groups.map((group) => (
          <div key={group.group_id} className="rounded-lg border border-gray-200 bg-white">
            <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-semibold text-gray-800">{group.meal_label}</span>
                <span className="text-xs text-gray-400">
                  {(() => {
                    const ts = parseEntryTimestamp(group.items[0]);
                    return ts ? formatLocalTime(ts) : group.time;
                  })()}
                </span>
              </div>
              {onDeleteGroup && (
                <button
                  onClick={() => {
                    if (window.confirm('Delete this entire meal?')) {
                      onDeleteGroup(group.group_id);
                    }
                  }}
                  disabled={deleting}
                  className="ml-2 text-xs text-gray-400 hover:text-red-500 disabled:opacity-50"
                  aria-label={`Delete ${group.meal_label}`}
                >
                  ✕
                </button>
              )}
            </div>
            <div className="divide-y divide-gray-50 px-3">
              {group.items.map((entry, i) => (
                <div key={i} className="py-2">
                  <div className="flex items-start justify-between">
                    <span className="text-sm text-gray-900">{entry.description}</span>
                    <div className="ml-2 flex items-center gap-2">
                      <span className="whitespace-nowrap text-sm text-gray-500">{entry.calories} cal</span>
                      {onDeleteEntry && (
                        <button
                          onClick={() => {
                            if (window.confirm('Delete this entry?')) {
                              onDeleteEntry(entry.sheetRow);
                            }
                          }}
                          disabled={deleting}
                          className="text-xs text-gray-400 hover:text-red-500 disabled:opacity-50"
                          aria-label={`Delete ${entry.description}`}
                        >
                          ✕
                        </button>
                      )}
                    </div>
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
