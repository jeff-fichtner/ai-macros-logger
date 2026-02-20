import type { DailySummary, MacroTargets } from '@/types';

interface MacroSummaryProps {
  summary: DailySummary | null;
  targets: MacroTargets | null;
}

function MacroCard({ label, value, target }: { label: string; value: number; target?: number }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 text-center">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-semibold text-gray-900">
        {Math.round(value)}
        {target != null && (
          <span className="text-sm font-normal text-gray-400"> / {target}</span>
        )}
      </p>
    </div>
  );
}

export default function MacroSummary({ summary, targets }: MacroSummaryProps) {
  if (!summary) return null;

  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-gray-700">
        Today — {summary.entryCount} {summary.entryCount === 1 ? 'entry' : 'entries'}
      </h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <MacroCard label="Calories" value={summary.totalCalories} target={targets?.calories} />
        <MacroCard label="Protein (g)" value={summary.totalProtein} target={targets?.protein_g} />
        <MacroCard label="Carbs (g)" value={summary.totalCarbs} target={targets?.carbs_g} />
        <MacroCard label="Fat (g)" value={summary.totalFat} target={targets?.fat_g} />
      </div>
    </div>
  );
}
