import type { AIParseResult } from '@/types';

interface WriteError {
  message: string;
  isAuthError: boolean;
}

interface ParseResultProps {
  result: AIParseResult;
  onConfirm: () => void;
  onCancel: () => void;
  onRetry?: () => void;
  onDismiss?: () => void;
  writing: boolean;
  error?: string | null;
  writeError?: WriteError | null;
}

export default function ParseResult({ result, onConfirm, onCancel, onRetry, onDismiss, writing, error, writeError }: ParseResultProps) {
  const hasWriteError = writeError != null;

  return (
    <div className={`rounded-lg border p-4 ${hasWriteError ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'}`}>
      <h3 className="mb-3 text-sm font-semibold text-gray-700">Parsed Items</h3>
      <div className="space-y-2">
        {result.items.map((item, i) => (
          <div key={i} className="rounded-md border border-gray-100 bg-white p-3">
            <div className="flex items-start justify-between">
              <span className="text-sm font-medium text-gray-900">{item.description}</span>
              <span className="ml-2 whitespace-nowrap text-sm text-gray-500">{item.calories} cal</span>
            </div>
            <div className="mt-1 flex gap-3 text-xs text-gray-500">
              <span>P: {item.protein_g}g</span>
              <span>C: {item.carbs_g}g</span>
              <span>F: {item.fat_g}g</span>
            </div>
            {item.warning && (
              <p className="mt-1 text-xs text-amber-600">{item.warning}</p>
            )}
          </div>
        ))}
      </div>

      {writeError && (
        <div className="mt-3 rounded-md border border-red-200 bg-white p-3">
          <p className="text-sm text-red-700">{writeError.message}</p>
          {writeError.isAuthError && (
            <a href="/settings" className="mt-1 block text-sm font-medium text-red-700 underline">
              Re-authorize in Settings
            </a>
          )}
        </div>
      )}

      {error && !writeError && (
        <p className="mt-3 text-sm text-red-600">{error}</p>
      )}

      <div className="mt-4 flex gap-2">
        {hasWriteError ? (
          <>
            {onRetry && (
              <button
                onClick={onRetry}
                disabled={writing}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-gray-300"
              >
                {writing ? 'Retrying...' : 'Retry'}
              </button>
            )}
            {onDismiss && (
              <button
                onClick={onDismiss}
                disabled={writing}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:bg-gray-100"
              >
                Dismiss
              </button>
            )}
          </>
        ) : (
          <>
            <button
              onClick={onConfirm}
              disabled={writing}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:bg-gray-300"
            >
              {writing ? 'Saving...' : 'Confirm'}
            </button>
            <button
              onClick={onCancel}
              disabled={writing}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:bg-gray-100"
            >
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  );
}
