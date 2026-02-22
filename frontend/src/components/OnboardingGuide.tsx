import { useState } from 'react';
import { useSettings } from '@/hooks/useSettings';

function Section({ title, done, children, defaultOpen = false }: { title: string; done?: boolean; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-2 text-left text-sm font-medium text-gray-700"
      >
        <span className="flex items-center gap-2">
          {done && <span className="text-green-600">✓</span>}
          {title}
        </span>
        <span className="text-gray-400">{open ? '−' : '+'}</span>
      </button>
      {open && <div className="pb-3 text-sm text-gray-600 space-y-2">{children}</div>}
    </div>
  );
}

export default function OnboardingGuide() {
  const settings = useSettings();
  const hasProvider = settings.aiProviders.length > 0;
  const hasOAuth = settings.googleClientId !== '' && settings.googleClientSecret !== '';
  const hasSheet = settings.spreadsheetId !== '';
  const isGoogleConnected = settings.isGoogleConnected();

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
      <h3 className="mb-2 text-sm font-semibold text-blue-800">Setup Guide</h3>
      <div className="divide-y divide-blue-100">
        <Section title="1. Add an AI Provider" done={hasProvider}>
          <p>You need an API key from at least one of these providers:</p>
          <ul className="ml-4 list-disc space-y-1">
            <li><strong>Claude</strong> — <code className="rounded bg-blue-100 px-1">console.anthropic.com</code> (key starts with <code className="rounded bg-blue-100 px-1">sk-ant-</code>)</li>
            <li><strong>OpenAI</strong> — <code className="rounded bg-blue-100 px-1">platform.openai.com/api-keys</code> (key starts with <code className="rounded bg-blue-100 px-1">sk-</code>)</li>
            <li><strong>Gemini</strong> — <code className="rounded bg-blue-100 px-1">aistudio.google.com/apikey</code></li>
          </ul>
          <p>Add the provider and key in the AI Providers section below.</p>
        </Section>
        <Section title="2. Set Up Google Cloud OAuth" done={hasOAuth}>
          <ol className="ml-4 list-decimal space-y-2">
            <li>
              <strong>Create a project</strong> — Go to <strong>console.cloud.google.com</strong>, create a new project, and enable the <strong>Google Sheets API</strong> under APIs & Services.
            </li>
            <li>
              <strong>Configure OAuth consent screen</strong> — Under APIs & Services → OAuth consent screen, set up your app. Set publishing status to <strong>"In production"</strong> to avoid refresh tokens expiring every 7 days.
            </li>
            <li>
              <strong>Create OAuth credentials</strong> — Go to Credentials → Create Credentials → OAuth client ID. Choose <strong>Web application</strong>. Add redirect URI: <code className="rounded bg-blue-100 px-1">http://localhost:5173/settings</code> (or your app URL + <code className="rounded bg-blue-100 px-1">/settings</code>). Copy the <strong>Client ID</strong> and <strong>Client Secret</strong>.
            </li>
          </ol>
        </Section>
        <Section title="3. Create or Choose a Google Sheet" done={hasSheet}>
          <p>Create a new Google Sheet or use an existing one.</p>
          <p>Copy the spreadsheet URL or ID. The ID is the long string in the URL between <code className="rounded bg-blue-100 px-1">/d/</code> and <code className="rounded bg-blue-100 px-1">/edit</code>.</p>
          <p>The app will automatically create a "Log" sheet with headers on first use.</p>
        </Section>
        <Section title="4. Connect Google Account" done={isGoogleConnected}>
          <p>Click the <strong>"Connect Google Account"</strong> button below to authorize the app to read and write to your spreadsheet.</p>
          <p>Google will show a warning that the app isn't verified — click <strong>"Advanced"</strong> then <strong>"Go to [app name] (unsafe)"</strong> to proceed. This is expected for self-hosted OAuth apps.</p>
        </Section>
      </div>
    </div>
  );
}
