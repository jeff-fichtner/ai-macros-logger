import { describe, it, expect } from 'vitest';
import { parseEntryTimestamp, formatLocalTime, formatLocalDate } from '@/utils/entryTime';
import type { FoodEntry } from '@/types';

function makeEntry(overrides: Partial<FoodEntry> = {}): FoodEntry {
  return {
    date: '2026-02-22',
    time: '1:30 PM',
    description: '',
    calories: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
    raw_input: '',
    group_id: '',
    meal_label: '',
    utc_offset: '-08:00',
    ...overrides,
  };
}

describe('parseEntryTimestamp', () => {
  it('parses 12-hour PM time with offset', () => {
    const d = parseEntryTimestamp(makeEntry({ date: '2026-02-22', time: '1:30 PM', utc_offset: '-08:00' }));
    expect(d).not.toBeNull();
    // 1:30 PM PST = 21:30 UTC
    expect(d!.toISOString()).toBe('2026-02-22T21:30:00.000Z');
  });

  it('parses 12-hour AM time', () => {
    const d = parseEntryTimestamp(makeEntry({ time: '12:00 AM', utc_offset: '+00:00' }));
    expect(d).not.toBeNull();
    expect(d!.toISOString()).toBe('2026-02-22T00:00:00.000Z');
  });

  it('parses 12:00 PM as noon', () => {
    const d = parseEntryTimestamp(makeEntry({ time: '12:00 PM', utc_offset: '+00:00' }));
    expect(d).not.toBeNull();
    expect(d!.toISOString()).toBe('2026-02-22T12:00:00.000Z');
  });

  it('parses 24-hour time with offset', () => {
    const d = parseEntryTimestamp(makeEntry({ time: '13:30', utc_offset: '-05:00' }));
    expect(d).not.toBeNull();
    expect(d!.toISOString()).toBe('2026-02-22T18:30:00.000Z');
  });

  it('handles positive offset', () => {
    const d = parseEntryTimestamp(makeEntry({ time: '9:00 AM', utc_offset: '+05:30' }));
    expect(d).not.toBeNull();
    // 9:00 AM +05:30 = 03:30 UTC
    expect(d!.toISOString()).toBe('2026-02-22T03:30:00.000Z');
  });

  it('falls back to local time when offset is empty', () => {
    const d = parseEntryTimestamp(makeEntry({ time: '1:30 PM', utc_offset: '' }));
    expect(d).not.toBeNull();
    expect(d!.getHours()).toBe(13);
    expect(d!.getMinutes()).toBe(30);
  });

  it('returns null for empty date', () => {
    expect(parseEntryTimestamp(makeEntry({ date: '' }))).toBeNull();
  });

  it('returns null for empty time', () => {
    expect(parseEntryTimestamp(makeEntry({ time: '' }))).toBeNull();
  });

  it('returns null for unparseable time', () => {
    expect(parseEntryTimestamp(makeEntry({ time: 'noon' }))).toBeNull();
  });
});

describe('formatLocalTime', () => {
  it('formats morning time', () => {
    const d = new Date(2026, 1, 22, 9, 5);
    expect(formatLocalTime(d)).toBe('9:05 AM');
  });

  it('formats afternoon time', () => {
    const d = new Date(2026, 1, 22, 14, 30);
    expect(formatLocalTime(d)).toBe('2:30 PM');
  });

  it('formats midnight as 12:00 AM', () => {
    const d = new Date(2026, 1, 22, 0, 0);
    expect(formatLocalTime(d)).toBe('12:00 AM');
  });

  it('formats noon as 12:00 PM', () => {
    const d = new Date(2026, 1, 22, 12, 0);
    expect(formatLocalTime(d)).toBe('12:00 PM');
  });
});

describe('formatLocalDate', () => {
  it('formats date with zero-padded month and day', () => {
    const d = new Date(2026, 0, 5);
    expect(formatLocalDate(d)).toBe('2026-01-05');
  });

  it('formats date with double-digit month and day', () => {
    const d = new Date(2026, 11, 25);
    expect(formatLocalDate(d)).toBe('2026-12-25');
  });
});
