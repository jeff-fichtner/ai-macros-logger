import { useCallback, useEffect } from 'react';
import { useSettings } from '@/hooks/useSettings';
import { generatePKCE, generateState, buildAuthUrl, exchangeToken } from '@/services/oauth';

const PKCE_KEY = 'macro-logger-pkce';
const STATE_KEY = 'macro-logger-oauth-state';

export function useGoogleAuth() {
  const settings = useSettings();

  const connect = useCallback(async () => {
    const { codeVerifier, codeChallenge } = await generatePKCE();
    const state = generateState();

    sessionStorage.setItem(PKCE_KEY, codeVerifier);
    sessionStorage.setItem(STATE_KEY, state);

    const redirectUri = `${window.location.origin}/settings`;
    const url = buildAuthUrl({
      clientId: settings.googleClientId,
      redirectUri,
      codeChallenge,
      state,
    });

    window.location.href = url;
  }, [settings.googleClientId]);

  const disconnect = useCallback(() => {
    settings.clearTokens();
  }, [settings]);

  const handleCallback = useCallback(async () => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');

    if (!code || !state) return false;

    const savedState = sessionStorage.getItem(STATE_KEY);
    const savedVerifier = sessionStorage.getItem(PKCE_KEY);

    if (state !== savedState || !savedVerifier) {
      sessionStorage.removeItem(PKCE_KEY);
      sessionStorage.removeItem(STATE_KEY);
      throw new Error('OAuth state mismatch — possible CSRF attack');
    }

    const redirectUri = `${window.location.origin}/settings`;
    const result = await exchangeToken({
      clientId: settings.googleClientId,
      clientSecret: settings.googleClientSecret,
      code,
      codeVerifier: savedVerifier,
      redirectUri,
    });

    settings.setTokens(result.accessToken, result.refreshToken, result.expiresIn);

    sessionStorage.removeItem(PKCE_KEY);
    sessionStorage.removeItem(STATE_KEY);

    // Clean URL
    window.history.replaceState({}, '', '/settings');
    return true;
  }, [settings]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('code')) {
      handleCallback().catch(console.error);
    }
  }, [handleCallback]);

  return {
    connect,
    disconnect,
    isConnected: settings.isGoogleConnected(),
  };
}
