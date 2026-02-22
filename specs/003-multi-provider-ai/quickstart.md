# Quickstart: Multi-Provider AI Support

**Feature**: 003-multi-provider-ai
**Date**: 2026-02-22

## Prerequisites

- Node.js 20 LTS
- Azure Functions Core Tools v4
- API keys for at least one provider (Claude, OpenAI, or Gemini)

## Development Setup

### 1. Install dependencies

```bash
cd frontend && npm install
cd ../api && npm install
```

### 2. Start development servers

Terminal 1 (API):
```bash
cd api && npm run dev
```

Terminal 2 (Frontend):
```bash
cd frontend && npm run dev
```

### 3. Run tests

```bash
cd frontend && npm test
cd ../api && npm test
```

## Testing Providers

### Claude
- Get key from https://console.anthropic.com/
- Key format: `sk-ant-api03-...`
- Model used: `claude-haiku-4-5-20251001`

### OpenAI
- Get key from https://platform.openai.com/api-keys
- Key format: `sk-...`
- Model used: `gpt-4o-mini`

### Gemini
- Get key from https://aistudio.google.com/apikey
- Key format: varies (no consistent prefix)
- Model used: `gemini-2.0-flash`

## Key Files

| File | Role |
|------|------|
| `api/src/functions/parse.ts` | Parse endpoint dispatcher |
| `api/src/providers/claude.ts` | Claude API handler |
| `api/src/providers/openai.ts` | OpenAI API handler |
| `api/src/providers/gemini.ts` | Gemini API handler |
| `frontend/src/types/index.ts` | Provider types |
| `frontend/src/hooks/useSettings.ts` | Provider list state |
| `frontend/src/pages/Settings.tsx` | Provider management UI |
| `frontend/src/services/parse.ts` | Frontend parse caller (renamed from claude.ts) |
