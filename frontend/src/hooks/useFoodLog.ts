import { useState, useCallback } from 'react';
import type { AIParseResult, FoodEntry, DailySummary } from '@/types';
import { parseFood } from '@/services/claude';
import { readAllEntries, writeEntries, checkLogSheetExists, createLogSheet, SheetsApiError } from '@/services/sheets';
import { refreshToken } from '@/services/oauth';
import { useSettings } from '@/hooks/useSettings';

type Status = 'idle' | 'parsing' | 'writing' | 'loading';
type WriteError = { message: string; isAuthError: boolean } | null;

export function useFoodLog() {
  const settings = useSettings();

  const [status, setStatus] = useState<Status>('idle');
  const [parseResult, setParseResult] = useState<AIParseResult | null>(null);
  const [rawInput, setRawInput] = useState('');
  const [entries, setEntries] = useState<FoodEntry[]>([]);
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [writeError, setWriteError] = useState<WriteError>(null);

  const todayStr = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  };

  const nowTimeStr = () => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  };

  const computeSummary = useCallback((todayEntries: FoodEntry[]) => {
    const date = todayStr();
    const filtered = todayEntries.filter((e) => e.date === date);
    setSummary({
      date,
      totalCalories: filtered.reduce((sum, e) => sum + e.calories, 0),
      totalProtein: filtered.reduce((sum, e) => sum + e.protein_g, 0),
      totalCarbs: filtered.reduce((sum, e) => sum + e.carbs_g, 0),
      totalFat: filtered.reduce((sum, e) => sum + e.fat_g, 0),
      entryCount: filtered.length,
    });
  }, []);

  const loadTodaysEntries = useCallback(async () => {
    if (!settings.spreadsheetId || !settings.googleAccessToken) return;
    setStatus('loading');
    setError(null);
    try {
      const sheetExists = await checkLogSheetExists(settings.spreadsheetId, settings.googleAccessToken);
      if (!sheetExists) {
        await createLogSheet(settings.spreadsheetId, settings.googleAccessToken);
      }
      const allEntries = await readAllEntries(settings.spreadsheetId, settings.googleAccessToken);
      const today = todayStr();
      const todayEntries = allEntries.filter((e) => e.date === today);
      setEntries(todayEntries);
      computeSummary(todayEntries);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load entries');
    } finally {
      setStatus('idle');
    }
  }, [settings.spreadsheetId, settings.googleAccessToken, computeSummary]);

  const parse = useCallback(async (input: string) => {
    setError(null);
    setWriteError(null);
    setParseResult(null);
    setRawInput(input);
    setStatus('parsing');
    try {
      const result = await parseFood(settings.claudeApiKey, input);
      setParseResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse food');
    } finally {
      setStatus('idle');
    }
  }, [settings.claudeApiKey]);

  const attemptWrite = useCallback(async (accessToken: string) => {
    if (!parseResult) return;

    const sheetExists = await checkLogSheetExists(settings.spreadsheetId, accessToken);
    if (!sheetExists) {
      await createLogSheet(settings.spreadsheetId, accessToken);
    }

    const date = todayStr();
    const time = nowTimeStr();
    const foodEntries: FoodEntry[] = parseResult.items.map((item) => ({
      date,
      time,
      description: item.description,
      calories: item.calories,
      protein_g: item.protein_g,
      carbs_g: item.carbs_g,
      fat_g: item.fat_g,
      raw_input: rawInput,
    }));

    await writeEntries(settings.spreadsheetId, accessToken, foodEntries);
  }, [parseResult, rawInput, settings.spreadsheetId]);

  const confirm = useCallback(async () => {
    if (!parseResult) return;
    setStatus('writing');
    setWriteError(null);
    try {
      await attemptWrite(settings.googleAccessToken);
      setParseResult(null);
      setRawInput('');
      setWriteError(null);
      await loadTodaysEntries();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to write to sheet';
      const status = err instanceof SheetsApiError ? err.status : 0;

      if (status === 401 && settings.googleRefreshToken) {
        try {
          const result = await refreshToken({
            clientId: settings.googleClientId,
            clientSecret: settings.googleClientSecret,
            refreshToken: settings.googleRefreshToken,
          });
          settings.updateAccessToken(result.accessToken, result.expiresIn);

          await attemptWrite(result.accessToken);
          setParseResult(null);
          setRawInput('');
          setWriteError(null);
          await loadTodaysEntries();
          return;
        } catch {
          setWriteError({
            message: 'Google authorization expired. Please re-authorize in Settings.',
            isAuthError: true,
          });
          setStatus('idle');
          return;
        }
      }

      setWriteError({
        message: status === 429 ? 'Rate limited by Google Sheets. Please wait and try again.' : message,
        isAuthError: status === 401,
      });
    } finally {
      setStatus('idle');
    }
  }, [parseResult, settings, attemptWrite, loadTodaysEntries]);

  const retry = useCallback(() => {
    confirm();
  }, [confirm]);

  const dismiss = useCallback(() => {
    setParseResult(null);
    setRawInput('');
    setWriteError(null);
    setError(null);
  }, []);

  const cancel = useCallback(() => {
    setParseResult(null);
    setRawInput('');
    setError(null);
    setWriteError(null);
  }, []);

  return {
    status,
    parseResult,
    entries,
    summary,
    error,
    writeError,
    parse,
    confirm,
    retry,
    dismiss,
    cancel,
    loadTodaysEntries,
  };
}
