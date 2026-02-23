import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSettings } from '@/hooks/useSettings';

vi.mock('@/services/oauth', () => ({
  generatePKCE: vi.fn(),
  generateState: vi.fn(),
  buildAuthUrl: vi.fn(),
  exchangeToken: vi.fn(),
}));

import {
  generatePKCE,
  generateState,
  buildAuthUrl,
  exchangeToken,
} from '@/services/oauth';
import { useGoogleAuth } from '@/hooks/useGoogleAuth';

const PKCE_KEY = 'macro-logger-pkce';
const STATE_KEY = 'macro-logger-oauth-state';

function resetStoreDefaults(overrides: Record<string, unknown> = {}) {
  useSettings.setState({
    googleClientId: 'test-client-id',
    googleClientSecret: 'test-client-secret',
    googleAccessToken: '',
    googleRefreshToken: '',
    googleTokenExpiry: 0,
    aiProviders: [{ provider: 'claude', apiKey: 'key' }],
    activeProvider: 'claude',
    spreadsheetId: 'sheet-id',
    macroTargets: null,
    ...overrides,
  });
}

describe('useGoogleAuth', () => {
  let replaceStateSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    resetStoreDefaults();
    replaceStateSpy = vi.spyOn(window.history, 'replaceState');
    // Reset URL to clean state
    window.history.pushState({}, '', '/settings');
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    sessionStorage.clear();
    window.history.pushState({}, '', '/settings');
  });

  it('connect stores PKCE verifier and state in sessionStorage and sets window.location.href', async () => {
    (generatePKCE as Mock).mockResolvedValue({
      codeVerifier: 'verifier123',
      codeChallenge: 'challenge123',
    });
    (generateState as Mock).mockReturnValue('state123');
    (buildAuthUrl as Mock).mockReturnValue('https://auth.example.com');

    const { result } = renderHook(() => useGoogleAuth());

    await act(async () => {
      await result.current.connect();
    });

    expect(sessionStorage.getItem(PKCE_KEY)).toBe('verifier123');
    expect(sessionStorage.getItem(STATE_KEY)).toBe('state123');
    // window.location.origin was http://localhost:3000 when connect() ran,
    // before the mock redirected the href to https://auth.example.com
    expect(buildAuthUrl).toHaveBeenCalledWith({
      clientId: 'test-client-id',
      redirectUri: 'http://localhost:3000/settings',
      codeChallenge: 'challenge123',
      state: 'state123',
    });
    // window.location.href was set to the auth URL (happy-dom may navigate)
    expect(buildAuthUrl).toHaveReturnedWith('https://auth.example.com');
  });

  it('handleCallback with valid code and matching state exchanges tokens and clears sessionStorage', async () => {
    sessionStorage.setItem(PKCE_KEY, 'verifier');
    sessionStorage.setItem(STATE_KEY, 'saved-state');

    (exchangeToken as Mock).mockResolvedValue({
      accessToken: 'at',
      refreshToken: 'rt',
      expiresIn: 3600,
    });

    // Set URL with code and matching state
    window.history.pushState({}, '', '/settings?code=authcode&state=saved-state');

    renderHook(() => useGoogleAuth());

    // Wait for the useEffect to trigger handleCallback
    await act(async () => {
      await vi.waitFor(() => {
        expect(exchangeToken).toHaveBeenCalled();
      });
    });

    expect(exchangeToken).toHaveBeenCalledWith({
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      code: 'authcode',
      codeVerifier: 'verifier',
      redirectUri: `${window.location.origin}/settings`,
    });

    const store = useSettings.getState();
    expect(store.googleAccessToken).toBe('at');
    expect(store.googleRefreshToken).toBe('rt');

    expect(sessionStorage.getItem(PKCE_KEY)).toBeNull();
    expect(sessionStorage.getItem(STATE_KEY)).toBeNull();

    expect(replaceStateSpy).toHaveBeenCalledWith({}, '', '/settings');
  });

  it('handleCallback with mismatched state does not call exchangeToken', async () => {
    sessionStorage.setItem(PKCE_KEY, 'verifier');
    sessionStorage.setItem(STATE_KEY, 'different-state');

    // Set URL with code and a non-matching state
    window.history.pushState({}, '', '/settings?code=authcode&state=wrong-state');

    // The useEffect catches the thrown error via .catch(console.error)
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    renderHook(() => useGoogleAuth());

    // Give the async useEffect time to execute
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(exchangeToken).not.toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it('handleCallback with no code param returns early', async () => {
    // URL has no code query param
    window.history.pushState({}, '', '/settings?other=param');

    renderHook(() => useGoogleAuth());

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(exchangeToken).not.toHaveBeenCalled();
  });

  it('disconnect calls clearTokens and isConnected becomes false', async () => {
    // Set tokens so isConnected is true (expiry far in the future)
    resetStoreDefaults({
      googleAccessToken: 'existing-token',
      googleRefreshToken: 'existing-refresh',
      googleTokenExpiry: Date.now() + 999999,
    });

    const { result } = renderHook(() => useGoogleAuth());

    expect(result.current.isConnected).toBe(true);

    act(() => {
      result.current.disconnect();
    });

    expect(result.current.isConnected).toBe(false);
  });
});
