import { describe, it, expect, vi, afterEach } from 'vitest';
import type { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { oauthTokenHandler } from './oauthToken';

function mockRequest(body: unknown) {
  return { json: async () => body } as unknown as HttpRequest;
}
const mockContext = {} as unknown as InvocationContext;

const validBody = {
  clientId: 'cid',
  clientSecret: 'csecret',
  code: 'authcode',
  codeVerifier: 'verifier',
  redirectUri: 'http://localhost/callback',
};

describe('oauthTokenHandler', () => {
  afterEach(() => vi.restoreAllMocks());

  it('valid exchange returns 200 with tokens', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ access_token: 'at', refresh_token: 'rt', expires_in: 3600 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result: HttpResponseInit = await oauthTokenHandler(mockRequest(validBody), mockContext);

    expect(result.status).toBe(200);
    expect((result.jsonBody as Record<string, unknown>).accessToken).toBe('at');
    expect((result.jsonBody as Record<string, unknown>).refreshToken).toBe('rt');
    expect((result.jsonBody as Record<string, unknown>).expiresIn).toBe(3600);
  });

  it('missing required field returns 400', async () => {
    const { code: _, ...bodyWithoutCode } = validBody;
    const result: HttpResponseInit = await oauthTokenHandler(mockRequest(bodyWithoutCode), mockContext);

    expect(result.status).toBe(400);
    expect((result.jsonBody as Record<string, unknown>).error).toContain('code');
  });

  it('non-string field returns 400', async () => {
    const result: HttpResponseInit = await oauthTokenHandler(
      mockRequest({ ...validBody, code: 123 }),
      mockContext,
    );

    expect(result.status).toBe(400);
    expect((result.jsonBody as Record<string, unknown>).error).toContain('code');
  });

  it('Google invalid_client error returns 401', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'invalid_client' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result: HttpResponseInit = await oauthTokenHandler(mockRequest(validBody), mockContext);

    expect(result.status).toBe(401);
    expect((result.jsonBody as Record<string, unknown>).error).toBe('Invalid OAuth credentials');
  });

  it('Google invalid_grant error returns 400', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'invalid_grant' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result: HttpResponseInit = await oauthTokenHandler(mockRequest(validBody), mockContext);

    expect(result.status).toBe(400);
    expect((result.jsonBody as Record<string, unknown>).error).toContain('Authorization code expired');
  });

  it('Google 500+ returns 502', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 500 }),
    );

    const result: HttpResponseInit = await oauthTokenHandler(mockRequest(validBody), mockContext);

    expect(result.status).toBe(502);
    expect((result.jsonBody as Record<string, unknown>).error).toBe('OAuth service unavailable');
  });
});
