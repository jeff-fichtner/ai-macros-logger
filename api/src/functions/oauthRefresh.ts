import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

const REQUIRED_FIELDS = ['clientId', 'clientSecret', 'refreshToken'] as const;

async function oauthRefreshHandler(
  request: HttpRequest,
  _context: InvocationContext,
): Promise<HttpResponseInit> {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return {
      status: 400,
      jsonBody: { error: 'Missing required field: clientId' },
    };
  }

  for (const field of REQUIRED_FIELDS) {
    if (!body[field] || typeof body[field] !== 'string') {
      return {
        status: 400,
        jsonBody: { error: `Missing required field: ${field}` },
      };
    }
  }

  const clientId = body.clientId as string;
  const clientSecret = body.clientSecret as string;
  const refreshToken = body.refreshToken as string;

  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  });

  let googleResponse: Response;
  try {
    googleResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
  } catch {
    return {
      status: 502,
      jsonBody: { error: 'OAuth service unavailable' },
    };
  }

  if (googleResponse.status >= 500) {
    return {
      status: 502,
      jsonBody: { error: 'OAuth service unavailable' },
    };
  }

  if (!googleResponse.ok) {
    let errorBody: Record<string, unknown> = {};
    try {
      errorBody = (await googleResponse.json()) as Record<string, unknown>;
    } catch {
      return { status: 401, jsonBody: { error: 'Invalid OAuth credentials' } };
    }

    if (errorBody.error === 'invalid_grant') {
      return {
        status: 401,
        jsonBody: { error: 'Refresh token expired or revoked' },
      };
    }

    return {
      status: 401,
      jsonBody: { error: 'Invalid OAuth credentials' },
    };
  }

  const data = (await googleResponse.json()) as Record<string, unknown>;

  return {
    status: 200,
    jsonBody: {
      accessToken: data.access_token,
      expiresIn: data.expires_in,
    },
  };
}

app.http('oauth-refresh', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'oauth/refresh',
  handler: oauthRefreshHandler,
});
