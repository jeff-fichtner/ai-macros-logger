import { useState, useCallback } from 'react';
import type { AIParseResult, FoodEntry, DailySummary, WriteError } from '@/types';
import { parseFood, buildRefinementPrompt } from '@/services/parse';
import { readAllEntries, writeEntries, ensureLogSheet, deleteEntries, SheetsApiError } from '@/services/sheets';
import { refreshToken } from '@/services/oauth';
import { useSettings } from '@/hooks/useSettings';
import { parseEntryTimestamp, formatLocalDate } from '@/utils/entryTime';

type Status = 'idle' | 'parsing' | 'writing' | 'loading' | 'deleting' | 'refining';

export function useFoodLog() {
  const settings = useSettings();

  const [status, setStatus] = useState<Status>('idle');
  const [parseResult, setParseResult] = useState<AIParseResult | null>(null);
  const [rawInput, setRawInput] = useState('');
  const [entries, setEntries] = useState<FoodEntry[]>([]);
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [writeError, setWriteError] = useState<WriteError | null>(null);
  const [lastAteAt, setLastAteAt] = useState<Date | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [refinementHistory, setRefinementHistory] = useState<string[]>([]);
  const [refineError, setRefineError] = useState<string | null>(null);

  const todayStr = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  };

  const nowTimeStr = () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const period = hours >= 12 ? 'PM' : 'AM';
    const h12 = hours % 12 || 12;
    return `${h12}:${minutes} ${period}`;
  };

  const utcOffsetStr = () => {
    const offset = new Date().getTimezoneOffset();
    const sign = offset <= 0 ? '+' : '-';
    const abs = Math.abs(offset);
    const h = String(Math.floor(abs / 60)).padStart(2, '0');
    const m = String(abs % 60).padStart(2, '0');
    return `${sign}${h}:${m}`;
  };

  const computeSummary = useCallback((todayEntries: FoodEntry[]) => {
    setSummary({
      date: todayStr(),
      totalCalories: todayEntries.reduce((sum, e) => sum + e.calories, 0),
      totalProtein: todayEntries.reduce((sum, e) => sum + e.protein_g, 0),
      totalCarbs: todayEntries.reduce((sum, e) => sum + e.carbs_g, 0),
      totalFat: todayEntries.reduce((sum, e) => sum + e.fat_g, 0),
      entryCount: todayEntries.length,
    });
  }, []);

  const loadTodaysEntries = useCallback(async () => {
    if (!settings.spreadsheetId || !settings.googleAccessToken) return;
    setStatus('loading');
    setError(null);
    try {
      await ensureLogSheet(settings.spreadsheetId, settings.googleAccessToken);
      const allEntries = await readAllEntries(settings.spreadsheetId, settings.googleAccessToken);

      // Find most recent entry across all dates
      let latestTs: Date | null = null;
      for (const e of allEntries) {
        const ts = parseEntryTimestamp(e);
        if (ts && (!latestTs || ts.getTime() > latestTs.getTime())) {
          latestTs = ts;
        }
      }
      setLastAteAt(latestTs);

      const today = todayStr();
      const todayEntries = allEntries
        .filter((e) => {
          const ts = parseEntryTimestamp(e);
          return ts ? formatLocalDate(ts) === today : e.date === today;
        })
        .sort((a, b) => {
          const ta = parseEntryTimestamp(a)?.getTime() ?? 0;
          const tb = parseEntryTimestamp(b)?.getTime() ?? 0;
          return ta - tb;
        });
      setEntries(todayEntries);
      computeSummary(todayEntries);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load entries from Google Sheets');
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
      const activeConfig = settings.aiProviders.find((p) => p.provider === settings.activeProvider);
      if (!activeConfig) {
        throw new Error('No active AI provider configured');
      }
      const result = await parseFood(activeConfig.provider, activeConfig.apiKey, input);
      setParseResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse food description');
    } finally {
      setStatus('idle');
    }
  }, [settings.aiProviders, settings.activeProvider]);

  const attemptWrite = useCallback(async (accessToken: string) => {
    if (!parseResult) return;

    await ensureLogSheet(settings.spreadsheetId, accessToken);

    const date = todayStr();
    const time = nowTimeStr();
    const offset = utcOffsetStr();
    const groupId = crypto.randomUUID();
    const mealLabel = parseResult.meal_label || "Meal";
    const foodEntries: FoodEntry[] = parseResult.items.map((item) => ({
      date,
      time,
      description: item.description,
      calories: item.calories,
      protein_g: item.protein_g,
      carbs_g: item.carbs_g,
      fat_g: item.fat_g,
      raw_input: rawInput,
      group_id: groupId,
      meal_label: mealLabel,
      utc_offset: offset,
      sheetRow: 0,
    }));

    await writeEntries(settings.spreadsheetId, accessToken, foodEntries);
  }, [parseResult, rawInput, settings.spreadsheetId]);

  const confirm = useCallback(async () => {
    if (!parseResult) return;
    setStatus('writing');
    setWriteError(null);
    setRefineError(null);
    try {
      await attemptWrite(settings.googleAccessToken);
      setParseResult(null);
      setRawInput('');
      setWriteError(null);
      setRefinementHistory([]);
      await loadTodaysEntries();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save entries to Google Sheets';
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
          setRefinementHistory([]);
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
    setRefinementHistory([]);
    setRefineError(null);
  }, []);

  const cancel = useCallback(() => {
    setParseResult(null);
    setRawInput('');
    setError(null);
    setWriteError(null);
    setRefinementHistory([]);
    setRefineError(null);
  }, []);

  const refine = useCallback(async (instruction: string) => {
    if (!instruction.trim() || !parseResult) return;
    setStatus('refining');
    setRefineError(null);
    try {
      const activeConfig = settings.aiProviders.find((p) => p.provider === settings.activeProvider);
      if (!activeConfig) {
        throw new Error('No active AI provider configured');
      }
      const newHistory = [...refinementHistory, instruction];
      const combinedPrompt = buildRefinementPrompt(rawInput, parseResult, newHistory);
      const result = await parseFood(activeConfig.provider, activeConfig.apiKey, combinedPrompt);
      setParseResult(result);
      setRefinementHistory(newHistory);
    } catch (err) {
      setRefineError(err instanceof Error ? err.message : 'Failed to refine results');
    } finally {
      setStatus('idle');
    }
  }, [parseResult, rawInput, refinementHistory, settings.aiProviders, settings.activeProvider]);

  const attemptDelete = useCallback(async (sheetRows: number[], accessToken: string) => {
    await deleteEntries(settings.spreadsheetId, accessToken, sheetRows);
  }, [settings.spreadsheetId]);

  const deleteGroup = useCallback(async (groupId: string) => {
    const rows = entries.filter((e) => e.group_id === groupId).map((e) => e.sheetRow);
    if (rows.length === 0) return;

    setStatus('deleting');
    setDeleteError(null);
    try {
      await attemptDelete(rows, settings.googleAccessToken);
      await loadTodaysEntries();
    } catch (err) {
      const status = err instanceof SheetsApiError ? err.status : 0;

      if (status === 401 && settings.googleRefreshToken) {
        try {
          const result = await refreshToken({
            clientId: settings.googleClientId,
            clientSecret: settings.googleClientSecret,
            refreshToken: settings.googleRefreshToken,
          });
          settings.updateAccessToken(result.accessToken, result.expiresIn);

          await attemptDelete(rows, result.accessToken);
          await loadTodaysEntries();
          return;
        } catch {
          setDeleteError('Google authorization expired. Please re-authorize in Settings.');
          setStatus('idle');
          return;
        }
      }

      setDeleteError(err instanceof Error ? err.message : 'Failed to delete entries');
    } finally {
      setStatus('idle');
    }
  }, [entries, settings, attemptDelete, loadTodaysEntries]);

  const deleteEntry = useCallback(async (sheetRow: number) => {
    setStatus('deleting');
    setDeleteError(null);
    try {
      await attemptDelete([sheetRow], settings.googleAccessToken);
      await loadTodaysEntries();
    } catch (err) {
      const status = err instanceof SheetsApiError ? err.status : 0;

      if (status === 401 && settings.googleRefreshToken) {
        try {
          const result = await refreshToken({
            clientId: settings.googleClientId,
            clientSecret: settings.googleClientSecret,
            refreshToken: settings.googleRefreshToken,
          });
          settings.updateAccessToken(result.accessToken, result.expiresIn);

          await attemptDelete([sheetRow], result.accessToken);
          await loadTodaysEntries();
          return;
        } catch {
          setDeleteError('Google authorization expired. Please re-authorize in Settings.');
          setStatus('idle');
          return;
        }
      }

      setDeleteError(err instanceof Error ? err.message : 'Failed to delete entry');
    } finally {
      setStatus('idle');
    }
  }, [settings, attemptDelete, loadTodaysEntries]);

  return {
    status,
    parseResult,
    entries,
    summary,
    error,
    writeError,
    deleteError,
    refineError,
    refinementHistory,
    lastAteAt,
    parse,
    refine,
    confirm,
    retry,
    dismiss,
    cancel,
    deleteGroup,
    deleteEntry,
    loadTodaysEntries,
  };
}
