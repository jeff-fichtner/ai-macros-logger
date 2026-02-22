import { useState } from 'react';
import { useSettings } from '@/hooks/useSettings';
import type { AIProviderType } from '@/types';

const ALL_PROVIDERS: { value: AIProviderType; label: string; placeholder: string; prefix?: string }[] = [
  { value: 'claude', label: 'Claude', placeholder: 'sk-ant-api03-...', prefix: 'sk-ant-' },
  { value: 'openai', label: 'OpenAI', placeholder: 'sk-...', prefix: 'sk-' },
  { value: 'gemini', label: 'Gemini', placeholder: 'Enter Gemini API key' },
];

export default function ProviderList() {
  const settings = useSettings();
  const [newApiKey, setNewApiKey] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<AIProviderType | ''>('');

  const configuredProviders = new Set(settings.aiProviders.map((p) => p.provider));
  const availableProviders = ALL_PROVIDERS.filter((p) => !configuredProviders.has(p.value));

  const selectedProviderInfo = ALL_PROVIDERS.find((p) => p.value === selectedProvider);
  const keyHint =
    selectedProviderInfo?.prefix && newApiKey.trim() && !newApiKey.trim().startsWith(selectedProviderInfo.prefix)
      ? `Key should start with ${selectedProviderInfo.prefix}`
      : null;

  const handleAdd = () => {
    if (!selectedProvider || !newApiKey.trim()) return;
    settings.addProvider(selectedProvider, newApiKey.trim());
    setNewApiKey('');
    setSelectedProvider(availableProviders.length > 1 ? '' : '');
  };

  return (
    <div className="space-y-3">
      {settings.aiProviders.length > 0 && (
        <ul className="space-y-2">
          {settings.aiProviders.map((config) => (
            <li
              key={config.provider}
              className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
                config.provider === settings.activeProvider
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200'
              }`}
            >
              <button
                onClick={() => settings.setActiveProvider(config.provider)}
                className="flex items-center gap-2 text-sm font-medium text-gray-900"
              >
                <span
                  className={`h-3 w-3 rounded-full border-2 ${
                    config.provider === settings.activeProvider
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-gray-400'
                  }`}
                />
                {ALL_PROVIDERS.find((p) => p.value === config.provider)?.label ?? config.provider}
              </button>
              <button
                onClick={() => settings.removeProvider(config.provider)}
                className="text-xs text-red-600 hover:text-red-800"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      {availableProviders.length > 0 && (
        <div className="flex items-end gap-2">
          <div className="flex-shrink-0">
            <label className="block text-xs font-medium text-gray-600">Provider</label>
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value as AIProviderType | '')}
              className="mt-1 rounded-lg border border-gray-300 px-2 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select...</option>
              {availableProviders.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-0 flex-1">
            <label className="block text-xs font-medium text-gray-600">API Key</label>
            <input
              type="password"
              value={newApiKey}
              onChange={(e) => setNewApiKey(e.target.value)}
              placeholder={selectedProviderInfo?.placeholder ?? 'Enter API key'}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {keyHint && (
              <p className="mt-1 text-xs text-amber-600">{keyHint}</p>
            )}
          </div>
          <button
            onClick={handleAdd}
            disabled={!selectedProvider || !newApiKey.trim()}
            className="flex-shrink-0 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            Add
          </button>
        </div>
      )}

      {settings.aiProviders.length === 0 && availableProviders.length > 0 && (
        <p className="text-xs text-gray-500">Add an AI provider to get started with food parsing.</p>
      )}
    </div>
  );
}
