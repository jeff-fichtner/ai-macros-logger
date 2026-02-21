import { describe, it, expect, vi, afterEach } from 'vitest';
import type { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { oauthRefreshHandler } from './oauthRefresh';

function mockRequest(body: unknown) {
  return { json: async () => body } as unknown as HttpRequest;
}
const mockContext = {} as unknown as InvocationContext;

const validBody = {
  clientId: 'cid',
  clientSecret: 'csecret',
  refreshToken: 'rt',
};

describe('oauthRefreshHandler', () => {
  afterEach(() => vi.restoreAllMocks());

  it('valid refresh returns 200 with token', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ access_token: 'new-at', expires_in: 3600 }), {
        status: 200,
      }),
    );

    const res: HttpResponseInit = await oauthRefreshHandler(mockRequest(validBody), mockContext);

    expect(res.status).toBe(200);
    expect(res.jsonBody).toEqual({ accessToken: 'new-at', expiresIn: 3600 });
  });

  it('missing required field returns 400', async () => {
    const { refreshToken: _, ...body } = validBody;

    const res: HttpResponseInit = await oauthRefreshHandler(mockRequest(body), mockContext);

    expect(res.status).toBe(400);
    expect((res.jsonBody as { error: string }).error).toContain('refreshToken');
  });

  it('non-string field returns 400', async () => {
    const res: HttpResponseInit = await oauthRefreshHandler(
      mockRequest({ ...validBody, clientSecret: 42 }),
      mockContext,
    );

    expect(res.status).toBe(400);
    expect((res.jsonBody as { error: string }).error).toContain('clientSecret');
  });

  it('Google invalid_grant returns 401 "Refresh token expired or revoked"', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'invalid_grant' }), { status: 400 }),
    );

    const res: HttpResponseInit = await oauthRefreshHandler(mockRequest(validBody), mockContext);

    expect(res.status).toBe(401);
    expect((res.jsonBody as { error: string }).error).toBe('Refresh token expired or revoked');
  });

  it('Google other error returns 401', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'invalid_client' }), { status: 400 }),
    );

    const res: HttpResponseInit = await oauthRefreshHandler(mockRequest(validBody), mockContext);

    expect(res.status).toBe(401);
    expect((res.jsonBody as { error: string }).error).toBe('Invalid OAuth credentials');
  });

  it('Google 500+ returns 502', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 500 }),
    );

    const res: HttpResponseInit = await oauthRefreshHandler(mockRequest(validBody), mockContext);

    expect(res.status).toBe(502);
    expect((res.jsonBody as { error: string }).error).toBe('OAuth service unavailable');
  });
});
