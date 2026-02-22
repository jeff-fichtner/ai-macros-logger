import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useSettings } from '@/hooks/useSettings';

beforeEach(() => {
  useSettings.setState({
    aiProviders: [],
    activeProvider: '',
    googleClientId: '',
    googleClientSecret: '',
    googleAccessToken: '',
    googleRefreshToken: '',
    googleTokenExpiry: 0,
    spreadsheetId: '',
    macroTargets: null,
  });
});

it('isConfigured returns true when provider and all credentials set', () => {
  useSettings.setState({
    aiProviders: [{ provider: 'claude', apiKey: 'sk-test' }],
    activeProvider: 'claude',
    googleClientId: 'client-id',
    googleClientSecret: 'client-secret',
    spreadsheetId: 'sheet-123',
  });

  expect(useSettings.getState().isConfigured()).toBe(true);
});

it('isConfigured returns false when no providers configured', () => {
  useSettings.setState({
    aiProviders: [],
    activeProvider: '',
    googleClientId: 'client-id',
    googleClientSecret: 'client-secret',
    spreadsheetId: 'sheet-123',
  });

  expect(useSettings.getState().isConfigured()).toBe(false);
});

it('isConfigured returns false for each missing credential', () => {
  const base = {
    aiProviders: [{ provider: 'claude' as const, apiKey: 'sk-test' }],
    activeProvider: 'claude',
    googleClientId: 'client-id',
    googleClientSecret: 'client-secret',
    spreadsheetId: 'sheet-123',
  };

  useSettings.setState({ ...base, activeProvider: '' });
  expect(useSettings.getState().isConfigured()).toBe(false);

  useSettings.setState({ ...base, googleClientId: '' });
  expect(useSettings.getState().isConfigured()).toBe(false);

  useSettings.setState({ ...base, googleClientSecret: '' });
  expect(useSettings.getState().isConfigured()).toBe(false);

  useSettings.setState({ ...base, spreadsheetId: '' });
  expect(useSettings.getState().isConfigured()).toBe(false);
});

it('addProvider adds a new provider and auto-sets active if none', () => {
  useSettings.getState().addProvider('claude', 'sk-ant-test');

  const state = useSettings.getState();
  expect(state.aiProviders).toEqual([{ provider: 'claude', apiKey: 'sk-ant-test' }]);
  expect(state.activeProvider).toBe('claude');
});

it('addProvider does not duplicate existing provider', () => {
  useSettings.getState().addProvider('claude', 'sk-ant-test');
  useSettings.getState().addProvider('claude', 'sk-ant-test-2');

  expect(useSettings.getState().aiProviders).toHaveLength(1);
  expect(useSettings.getState().aiProviders[0].apiKey).toBe('sk-ant-test');
});

it('addProvider keeps existing activeProvider when adding second provider', () => {
  useSettings.getState().addProvider('claude', 'sk-ant-test');
  useSettings.getState().addProvider('openai', 'sk-openai-test');

  expect(useSettings.getState().activeProvider).toBe('claude');
  expect(useSettings.getState().aiProviders).toHaveLength(2);
});

it('removeProvider removes provider and reassigns active if needed', () => {
  useSettings.getState().addProvider('claude', 'sk-ant-test');
  useSettings.getState().addProvider('openai', 'sk-openai-test');
  useSettings.getState().setActiveProvider('claude');

  useSettings.getState().removeProvider('claude');

  const state = useSettings.getState();
  expect(state.aiProviders).toHaveLength(1);
  expect(state.aiProviders[0].provider).toBe('openai');
  expect(state.activeProvider).toBe('openai');
});

it('removeProvider clears activeProvider when last provider removed', () => {
  useSettings.getState().addProvider('claude', 'sk-ant-test');
  useSettings.getState().removeProvider('claude');

  const state = useSettings.getState();
  expect(state.aiProviders).toHaveLength(0);
  expect(state.activeProvider).toBe('');
});

it('setActiveProvider switches the active provider', () => {
  useSettings.getState().addProvider('claude', 'sk-ant-test');
  useSettings.getState().addProvider('openai', 'sk-openai-test');

  useSettings.getState().setActiveProvider('openai');
  expect(useSettings.getState().activeProvider).toBe('openai');
});

describe('time-dependent tests', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('isGoogleConnected returns true with valid token and future expiry', () => {
    vi.setSystemTime(1000000);

    useSettings.setState({
      googleAccessToken: 'access-token',
      googleTokenExpiry: Date.now() + 60000,
    });

    expect(useSettings.getState().isGoogleConnected()).toBe(true);
  });

  it('isGoogleConnected returns false with expired token', () => {
    vi.setSystemTime(1000000);

    useSettings.setState({
      googleAccessToken: 'access-token',
      googleTokenExpiry: Date.now() - 1000,
    });

    expect(useSettings.getState().isGoogleConnected()).toBe(false);
  });

  it('isGoogleConnected returns false at exact boundary (Date.now() === googleTokenExpiry)', () => {
    vi.setSystemTime(1000000);

    useSettings.setState({
      googleAccessToken: 'access-token',
      googleTokenExpiry: Date.now(),
    });

    expect(useSettings.getState().isGoogleConnected()).toBe(false);
  });

  it('setTokens computes expiry as Date.now() + expiresIn * 1000', () => {
    vi.setSystemTime(1000000);

    useSettings.getState().setTokens('at', 'rt', 3600);

    const state = useSettings.getState();
    expect(state.googleAccessToken).toBe('at');
    expect(state.googleRefreshToken).toBe('rt');
    expect(state.googleTokenExpiry).toBe(1000000 + 3600 * 1000);
  });
});

it('clearTokens resets all token fields and expiry to 0', () => {
  useSettings.getState().setTokens('access', 'refresh', 3600);

  const before = useSettings.getState();
  expect(before.googleAccessToken).toBe('access');
  expect(before.googleRefreshToken).toBe('refresh');

  useSettings.getState().clearTokens();

  const after = useSettings.getState();
  expect(after.googleAccessToken).toBe('');
  expect(after.googleRefreshToken).toBe('');
  expect(after.googleTokenExpiry).toBe(0);
});

it('persist middleware writes state to localStorage after changes', async () => {
  useSettings.getState().addProvider('claude', 'sk-persist-test');

  await new Promise((resolve) => setTimeout(resolve, 0));

  const stored = localStorage.getItem('macro-logger-settings');
  expect(stored).not.toBeNull();
  expect(stored).toContain('sk-persist-test');
});
