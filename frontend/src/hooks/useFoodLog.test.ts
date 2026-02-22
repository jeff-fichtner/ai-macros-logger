import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSettings } from '@/hooks/useSettings';
import { useFoodLog } from '@/hooks/useFoodLog';
import { parseFood } from '@/services/parse';
import { readAllEntries, writeEntries, checkLogSheetExists, createLogSheet, SheetsApiError } from '@/services/sheets';
import { refreshToken } from '@/services/oauth';

vi.mock('@/services/parse', () => ({
  parseFood: vi.fn(),
}));

vi.mock('@/services/sheets', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/sheets')>();
  return {
    ...actual,
    readAllEntries: vi.fn(),
    writeEntries: vi.fn(),
    checkLogSheetExists: vi.fn(),
    createLogSheet: vi.fn(),
  };
});

vi.mock('@/services/oauth', () => ({
  refreshToken: vi.fn(),
}));

const mockParseFood = vi.mocked(parseFood);
const mockReadAllEntries = vi.mocked(readAllEntries);
const mockWriteEntries = vi.mocked(writeEntries);
const mockCheckLogSheetExists = vi.mocked(checkLogSheetExists);
const mockCreateLogSheet = vi.mocked(createLogSheet);
const mockRefreshToken = vi.mocked(refreshToken);

describe('useFoodLog', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-21T12:00:00'));
    useSettings.setState({
      aiProviders: [{ provider: 'claude', apiKey: 'test-key' }],
      activeProvider: 'claude',
      googleClientId: 'cid',
      googleClientSecret: 'csecret',
      googleAccessToken: 'valid-token',
      googleRefreshToken: 'refresh-token',
      googleTokenExpiry: Date.now() + 3600000,
      spreadsheetId: 'sheet-123',
      macroTargets: null,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('parse success', async () => {
    mockParseFood.mockResolvedValueOnce({
      items: [{ description: 'Chicken', calories: 300, protein_g: 30, carbs_g: 0, fat_g: 10 }],
    });

    const { result } = renderHook(() => useFoodLog());

    await act(async () => {
      await result.current.parse('chicken');
    });

    expect(result.current.parseResult).toEqual({
      items: [{ description: 'Chicken', calories: 300, protein_g: 30, carbs_g: 0, fat_g: 10 }],
    });
    expect(result.current.status).toBe('idle');
  });

  it('parse error', async () => {
    mockParseFood.mockRejectedValueOnce(new Error('API failed'));

    const { result } = renderHook(() => useFoodLog());

    await act(async () => {
      await result.current.parse('chicken');
    });

    expect(result.current.error).toBe('API failed');
    expect(result.current.status).toBe('idle');
  });

  it('confirm success', async () => {
    mockParseFood.mockResolvedValueOnce({
      items: [{ description: 'Chicken', calories: 300, protein_g: 30, carbs_g: 0, fat_g: 10 }],
    });
    mockCheckLogSheetExists.mockResolvedValue(true);
    mockWriteEntries.mockResolvedValue(undefined);
    mockReadAllEntries.mockResolvedValue([]);

    const { result } = renderHook(() => useFoodLog());

    await act(async () => {
      await result.current.parse('chicken');
    });

    await act(async () => {
      await result.current.confirm();
    });

    expect(result.current.parseResult).toBeNull();
    expect(result.current.writeError).toBeNull();
  });

  it('confirm creates sheet first when it does not exist', async () => {
    mockParseFood.mockResolvedValueOnce({
      items: [{ description: 'Chicken', calories: 300, protein_g: 30, carbs_g: 0, fat_g: 10 }],
    });
    mockCheckLogSheetExists.mockResolvedValue(false);
    mockCreateLogSheet.mockResolvedValue(undefined);
    mockWriteEntries.mockResolvedValue(undefined);
    mockReadAllEntries.mockResolvedValue([]);

    const { result } = renderHook(() => useFoodLog());

    await act(async () => {
      await result.current.parse('chicken');
    });

    await act(async () => {
      await result.current.confirm();
    });

    expect(mockCreateLogSheet).toHaveBeenCalled();
    expect(mockWriteEntries).toHaveBeenCalled();
  });

  it('confirm 401 with refresh token triggers token refresh then retry write', async () => {
    mockParseFood.mockResolvedValueOnce({
      items: [{ description: 'Chicken', calories: 300, protein_g: 30, carbs_g: 0, fat_g: 10 }],
    });
    mockCheckLogSheetExists.mockResolvedValue(true);
    mockWriteEntries
      .mockRejectedValueOnce(new SheetsApiError(401, 'Unauthorized'))
      .mockResolvedValueOnce(undefined);
    mockRefreshToken.mockResolvedValueOnce({ accessToken: 'new-token', expiresIn: 3600 });
    mockReadAllEntries.mockResolvedValue([]);

    const { result } = renderHook(() => useFoodLog());

    await act(async () => {
      await result.current.parse('chicken');
    });

    await act(async () => {
      await result.current.confirm();
    });

    expect(mockRefreshToken).toHaveBeenCalled();
    expect(mockWriteEntries).toHaveBeenCalledTimes(2);
    expect(result.current.parseResult).toBeNull();
  });

  it('confirm 401 with failed refresh sets writeError.isAuthError=true and preserves parseResult', async () => {
    mockParseFood.mockResolvedValueOnce({
      items: [{ description: 'Chicken', calories: 300, protein_g: 30, carbs_g: 0, fat_g: 10 }],
    });
    mockCheckLogSheetExists.mockResolvedValue(true);
    mockWriteEntries.mockRejectedValue(new SheetsApiError(401, 'Unauthorized'));
    mockRefreshToken.mockRejectedValueOnce(new Error('Refresh failed'));

    const { result } = renderHook(() => useFoodLog());

    await act(async () => {
      await result.current.parse('chicken');
    });

    await act(async () => {
      await result.current.confirm();
    });

    expect(result.current.writeError).not.toBeNull();
    expect(result.current.writeError!.isAuthError).toBe(true);
    expect(result.current.parseResult).not.toBeNull();
  });

  it('confirm 429 sets writeError with rate limit message and preserves parseResult', async () => {
    mockParseFood.mockResolvedValueOnce({
      items: [{ description: 'Chicken', calories: 300, protein_g: 30, carbs_g: 0, fat_g: 10 }],
    });
    mockCheckLogSheetExists.mockResolvedValue(true);
    mockWriteEntries.mockRejectedValue(new SheetsApiError(429, 'Too Many Requests'));

    const { result } = renderHook(() => useFoodLog());

    await act(async () => {
      await result.current.parse('chicken');
    });

    await act(async () => {
      await result.current.confirm();
    });

    expect(result.current.writeError!.message).toContain('Rate limited');
    expect(result.current.parseResult).not.toBeNull();
  });

  it('retry after write error succeeds and clears writeError', async () => {
    mockParseFood.mockResolvedValueOnce({
      items: [{ description: 'Chicken', calories: 300, protein_g: 30, carbs_g: 0, fat_g: 10 }],
    });
    mockCheckLogSheetExists.mockResolvedValue(true);
    mockWriteEntries
      .mockRejectedValueOnce(new SheetsApiError(429, 'Too Many Requests'))
      .mockResolvedValueOnce(undefined);
    mockReadAllEntries.mockResolvedValue([]);

    const { result } = renderHook(() => useFoodLog());

    await act(async () => {
      await result.current.parse('chicken');
    });

    await act(async () => {
      await result.current.confirm();
    });

    expect(result.current.writeError).not.toBeNull();

    await act(async () => {
      await result.current.retry();
    });

    expect(result.current.writeError).toBeNull();
  });

  it('dismiss clears parseResult and writeError', async () => {
    mockParseFood.mockResolvedValueOnce({
      items: [{ description: 'Chicken', calories: 300, protein_g: 30, carbs_g: 0, fat_g: 10 }],
    });
    mockCheckLogSheetExists.mockResolvedValue(true);
    mockWriteEntries.mockRejectedValue(new SheetsApiError(429, 'Too Many Requests'));

    const { result } = renderHook(() => useFoodLog());

    await act(async () => {
      await result.current.parse('chicken');
    });

    await act(async () => {
      await result.current.confirm();
    });

    expect(result.current.parseResult).not.toBeNull();
    expect(result.current.writeError).not.toBeNull();

    act(() => {
      result.current.dismiss();
    });

    expect(result.current.parseResult).toBeNull();
    expect(result.current.writeError).toBeNull();
  });

  it('loadTodaysEntries filters by today date and computes summary', async () => {
    mockReadAllEntries.mockResolvedValueOnce([
      { date: '2026-02-21', time: '12:00', description: 'Chicken', calories: 300, protein_g: 30, carbs_g: 0, fat_g: 10, raw_input: 'chicken' },
      { date: '2026-02-20', time: '10:00', description: 'Rice', calories: 200, protein_g: 5, carbs_g: 40, fat_g: 2, raw_input: 'rice' },
    ]);

    const { result } = renderHook(() => useFoodLog());

    await act(async () => {
      await result.current.loadTodaysEntries();
    });

    expect(result.current.entries).toHaveLength(1);
    expect(result.current.entries[0].date).toBe('2026-02-21');
    expect(result.current.summary!.totalCalories).toBe(300);
  });

  it('loadTodaysEntries with no credentials returns early without fetch', async () => {
    useSettings.setState({ spreadsheetId: '' });

    const { result } = renderHook(() => useFoodLog());

    await act(async () => {
      await result.current.loadTodaysEntries();
    });

    expect(mockReadAllEntries).not.toHaveBeenCalled();
  });
});
