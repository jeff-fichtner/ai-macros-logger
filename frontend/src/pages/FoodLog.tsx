import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '@/hooks/useSettings';
import { useFoodLog } from '@/hooks/useFoodLog';
import { formatRelativeDate, formatLocalTime } from '@/utils/entryTime';
import FoodInput from '@/components/FoodInput';
import ParseResult from '@/components/ParseResult';
import MacroSummary from '@/components/MacroSummary';
import EntryHistory from '@/components/EntryHistory';

export default function FoodLog() {
  const settings = useSettings();
  const navigate = useNavigate();
  const { status, parseResult, entries, summary, error, writeError, deleteError, refineError, lastAteAt, parse, refine, confirm, retry, dismiss, cancel, deleteGroup, deleteEntry, loadTodaysEntries } = useFoodLog();

  const configured = settings.isConfigured();
  const connected = settings.isGoogleConnected();

  useEffect(() => {
    if (!configured) return;
    if (connected) {
      loadTodaysEntries();
    }
  }, [configured, connected, loadTodaysEntries]);

  if (!configured) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-center">
        <p className="text-sm text-amber-800">
          Please configure your credentials in{' '}
          <button onClick={() => navigate('/settings')} className="font-medium underline">
            Settings
          </button>{' '}
          before logging meals.
        </p>
      </div>
    );
  }

  const isNonFoodResult =
    parseResult &&
    parseResult.items.length > 0 &&
    parseResult.items.every(
      (item) =>
        item.description === 'Not a food item' &&
        item.calories === 0 &&
        item.protein_g === 0 &&
        item.carbs_g === 0 &&
        item.fat_g === 0
    );

  return (
    <div className="space-y-4">
      <FoodInput
        onSubmit={parse}
        loading={status === 'parsing'}
        disabled={!connected}
      />

      {!connected && configured && (
        <p className="text-sm text-amber-600">
          Google account not connected.{' '}
          <button onClick={() => navigate('/settings')} className="font-medium underline">
            Connect in Settings
          </button>
        </p>
      )}

      {error && !parseResult && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {isNonFoodResult && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm text-amber-700">
            {parseResult.items[0].warning || 'Could not identify any food items in the input.'}
          </p>
          <button
            onClick={cancel}
            className="mt-2 text-sm font-medium text-amber-700 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {parseResult && !isNonFoodResult && (
        <ParseResult
          result={parseResult}
          onConfirm={confirm}
          onCancel={cancel}
          onRefine={refine}
          onRetry={retry}
          onDismiss={dismiss}
          writing={status === 'writing'}
          refining={status === 'refining'}
          error={error}
          writeError={writeError}
          refineError={refineError}
        />
      )}

      <MacroSummary summary={summary} targets={settings.macroTargets} />

      {lastAteAt && (
        <p className="text-xs text-gray-400">
          Last ate {formatRelativeDate(lastAteAt)} at {formatLocalTime(lastAteAt)}
        </p>
      )}

      <EntryHistory
        entries={entries}
        onDeleteGroup={deleteGroup}
        onDeleteEntry={deleteEntry}
        deleting={status === 'deleting'}
        deleteError={deleteError}
      />
    </div>
  );
}
