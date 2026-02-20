import { useState } from 'react';
import { useSettings } from '@/hooks/useSettings';
import { useGoogleAuth } from '@/hooks/useGoogleAuth';
import OnboardingGuide from '@/components/OnboardingGuide';
import type { MacroTargets } from '@/types';

function extractSpreadsheetId(input: string): string {
  const match = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : input.trim();
}

export default function Settings() {
  const settings = useSettings();
  const { connect, disconnect, isConnected } = useGoogleAuth();

  const [claudeKey, setClaudeKey] = useState(settings.claudeApiKey);
  const [clientId, setClientId] = useState(settings.googleClientId);
  const [clientSecret, setClientSecret] = useState(settings.googleClientSecret);
  const [sheetInput, setSheetInput] = useState(settings.spreadsheetId);
  const [targets, setTargets] = useState<MacroTargets | null>(settings.macroTargets);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    settings.setClaudeApiKey(claudeKey.trim());
    settings.setGoogleCredentials(clientId.trim(), clientSecret.trim());
    settings.setSpreadsheetId(extractSpreadsheetId(sheetInput));
    settings.setMacroTargets(targets);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const claudeKeyValid = claudeKey.trim() === '' || claudeKey.trim().startsWith('sk-ant-');
  const sheetIdExtracted = extractSpreadsheetId(sheetInput);

  return (
    <div className="space-y-6">
      <OnboardingGuide />

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Credentials</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700">Claude API Key</label>
          <input
            type="password"
            value={claudeKey}
            onChange={(e) => setClaudeKey(e.target.value)}
            placeholder="sk-ant-api03-..."
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {!claudeKeyValid && (
            <p className="mt-1 text-xs text-red-600">API key should start with sk-ant-</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Google OAuth Client ID</label>
          <input
            type="text"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            placeholder="1234567890-abc.apps.googleusercontent.com"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Google OAuth Client Secret</label>
          <input
            type="password"
            value={clientSecret}
            onChange={(e) => setClientSecret(e.target.value)}
            placeholder="GOCSPX-..."
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Spreadsheet ID or URL</label>
          <input
            type="text"
            value={sheetInput}
            onChange={(e) => setSheetInput(e.target.value)}
            placeholder="Paste Google Sheets URL or spreadsheet ID"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {sheetInput && sheetInput !== sheetIdExtracted && (
            <p className="mt-1 text-xs text-gray-500">Extracted ID: {sheetIdExtracted}</p>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">Google Account</h2>
        <div className="flex items-center gap-3">
          {isConnected ? (
            <>
              <span className="inline-flex items-center gap-1 text-sm text-green-700">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                Connected
              </span>
              <button
                onClick={disconnect}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Disconnect
              </button>
            </>
          ) : (
            <>
              <span className="inline-flex items-center gap-1 text-sm text-gray-500">
                <span className="h-2 w-2 rounded-full bg-gray-400" />
                Not connected
              </span>
              <button
                onClick={connect}
                disabled={!clientId.trim() || !clientSecret.trim()}
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Connect Google
              </button>
            </>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Daily Macro Targets (optional)</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(['calories', 'protein_g', 'carbs_g', 'fat_g'] as const).map((field) => (
            <div key={field}>
              <label className="block text-xs font-medium text-gray-600">
                {field === 'calories' ? 'Calories' : field === 'protein_g' ? 'Protein (g)' : field === 'carbs_g' ? 'Carbs (g)' : 'Fat (g)'}
              </label>
              <input
                type="number"
                min="0"
                value={targets?.[field] ?? ''}
                onChange={(e) => {
                  const val = e.target.value === '' ? null : Number(e.target.value);
                  if (val === null) {
                    if (targets) {
                      const next = { ...targets, [field]: 0 };
                      const allZero = next.calories === 0 && next.protein_g === 0 && next.carbs_g === 0 && next.fat_g === 0;
                      setTargets(allZero ? null : next);
                    }
                  } else {
                    setTargets({
                      calories: targets?.calories ?? 0,
                      protein_g: targets?.protein_g ?? 0,
                      carbs_g: targets?.carbs_g ?? 0,
                      fat_g: targets?.fat_g ?? 0,
                      [field]: val,
                    });
                  }
                }}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          ))}
        </div>
      </section>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Save Settings
        </button>
        {saved && <span className="text-sm text-green-600">Saved</span>}
      </div>
    </div>
  );
}
