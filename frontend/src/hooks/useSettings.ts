import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MacroTargets, UserConfiguration } from '@/types';

interface SettingsActions {
  setClaudeApiKey: (key: string) => void;
  setGoogleCredentials: (clientId: string, clientSecret: string) => void;
  setSpreadsheetId: (id: string) => void;
  setTokens: (accessToken: string, refreshToken: string, expiresIn: number) => void;
  updateAccessToken: (accessToken: string, expiresIn: number) => void;
  setMacroTargets: (targets: MacroTargets | null) => void;
  clearTokens: () => void;
  isConfigured: () => boolean;
  isGoogleConnected: () => boolean;
}

type SettingsStore = UserConfiguration & SettingsActions;

export const useSettings = create<SettingsStore>()(
  persist(
    (set, get) => ({
      // State
      claudeApiKey: '',
      googleClientId: '',
      googleClientSecret: '',
      googleAccessToken: '',
      googleRefreshToken: '',
      googleTokenExpiry: 0,
      spreadsheetId: '',
      macroTargets: null,

      // Actions
      setClaudeApiKey: (key) => set({ claudeApiKey: key }),

      setGoogleCredentials: (clientId, clientSecret) =>
        set({ googleClientId: clientId, googleClientSecret: clientSecret }),

      setSpreadsheetId: (id) => set({ spreadsheetId: id }),

      setTokens: (accessToken, refreshToken, expiresIn) =>
        set({
          googleAccessToken: accessToken,
          googleRefreshToken: refreshToken,
          googleTokenExpiry: Date.now() + expiresIn * 1000,
        }),

      updateAccessToken: (accessToken, expiresIn) =>
        set({
          googleAccessToken: accessToken,
          googleTokenExpiry: Date.now() + expiresIn * 1000,
        }),

      setMacroTargets: (targets) => set({ macroTargets: targets }),

      clearTokens: () =>
        set({
          googleAccessToken: '',
          googleRefreshToken: '',
          googleTokenExpiry: 0,
        }),

      isConfigured: () => {
        const state = get();
        return (
          state.claudeApiKey !== '' &&
          state.googleClientId !== '' &&
          state.googleClientSecret !== '' &&
          state.spreadsheetId !== ''
        );
      },

      isGoogleConnected: () => {
        const state = get();
        return state.googleAccessToken !== '' && state.googleTokenExpiry > Date.now();
      },
    }),
    {
      name: 'macro-logger-settings',
    }
  )
);
