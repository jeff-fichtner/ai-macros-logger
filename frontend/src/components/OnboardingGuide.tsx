import { useState } from 'react';

function Section({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-2 text-left text-sm font-medium text-gray-700"
      >
        {title}
        <span className="text-gray-400">{open ? '−' : '+'}</span>
      </button>
      {open && <div className="pb-3 text-sm text-gray-600 space-y-2">{children}</div>}
    </div>
  );
}

export default function OnboardingGuide() {
  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
      <h3 className="mb-2 text-sm font-semibold text-blue-800">Setup Guide</h3>
      <div className="divide-y divide-blue-100">
        <Section title="1. Get a Claude API Key">
          <p>Go to <strong>console.anthropic.com</strong>, create an account, and generate an API key.</p>
          <p>The key starts with <code className="rounded bg-blue-100 px-1">sk-ant-</code>.</p>
        </Section>
        <Section title="2. Create a Google Cloud Project">
          <p>Go to <strong>console.cloud.google.com</strong> and create a new project.</p>
          <p>Enable the <strong>Google Sheets API</strong> under APIs & Services.</p>
        </Section>
        <Section title="3. Configure OAuth Consent Screen">
          <p>Under APIs & Services → OAuth consent screen, set up your app.</p>
          <p>Set the publishing status to <strong>"In production"</strong> to avoid refresh tokens expiring every 7 days.</p>
          <p>If you keep it in "Testing" mode, you'll need to re-authorize weekly.</p>
        </Section>
        <Section title="4. Create OAuth Credentials">
          <p>Go to APIs & Services → Credentials → Create Credentials → OAuth client ID.</p>
          <p>Choose <strong>Web application</strong>.</p>
          <p>Add an authorized redirect URI: your app URL followed by <code className="rounded bg-blue-100 px-1">/settings</code>.</p>
          <p>For local development: <code className="rounded bg-blue-100 px-1">http://localhost:5173/settings</code></p>
          <p>Copy the <strong>Client ID</strong> and <strong>Client Secret</strong>.</p>
        </Section>
        <Section title="5. Create or Choose a Google Sheet">
          <p>Create a new Google Sheet or use an existing one.</p>
          <p>Copy the spreadsheet URL or ID. The ID is the long string in the URL between <code className="rounded bg-blue-100 px-1">/d/</code> and <code className="rounded bg-blue-100 px-1">/edit</code>.</p>
          <p>The app will automatically create a "Log" sheet with headers on first use.</p>
        </Section>
      </div>
    </div>
  );
}
