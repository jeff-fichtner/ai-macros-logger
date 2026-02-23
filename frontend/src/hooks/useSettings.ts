import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AIProviderConfig, AIProviderType, MacroTargets, UserConfiguration } from '@/types';

interface SettingsActions {
  addProvider: (provider: AIProviderType, apiKey: string) => void;
  removeProvider: (provider: AIProviderType) => void;
  setActiveProvider: (provider: string) => void;
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
      aiProviders: [],
      activeProvider: '',
      googleClientId: '',
      googleClientSecret: '',
      googleAccessToken: '',
      googleRefreshToken: '',
      googleTokenExpiry: 0,
      spreadsheetId: '',
      macroTargets: null,

      // Actions
      addProvider: (provider, apiKey) => {
        const state = get();
        const existing = state.aiProviders.find((p) => p.provider === provider);
        if (existing) return;
        const updated = [...state.aiProviders, { provider, apiKey }];
        const active = state.activeProvider || provider;
        set({ aiProviders: updated, activeProvider: active });
      },

      removeProvider: (provider) => {
        const state = get();
        const updated = state.aiProviders.filter((p) => p.provider !== provider);
        let active = state.activeProvider;
        if (active === provider) {
          active = updated.length > 0 ? updated[0].provider : '';
        }
        set({ aiProviders: updated, activeProvider: active });
      },

      setActiveProvider: (provider) => set({ activeProvider: provider }),

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
          state.aiProviders.length > 0 &&
          state.activeProvider !== '' &&
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
      version: 2,
      migrate: (persisted, version) => {
        const state = persisted as Record<string, unknown>;
        if (version < 2) {
          const oldKey = state.claudeApiKey as string | undefined;
          if (oldKey && !state.aiProviders) {
            state.aiProviders = [{ provider: 'claude', apiKey: oldKey }] satisfies AIProviderConfig[];
            state.activeProvider = 'claude';
          } else {
            state.aiProviders = state.aiProviders ?? [];
            state.activeProvider = state.activeProvider ?? '';
          }
          delete state.claudeApiKey;
        }
        return state as unknown as UserConfiguration;
      },
    }
  )
);
