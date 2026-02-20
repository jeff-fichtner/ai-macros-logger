import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

const REQUIRED_FIELDS = ['clientId', 'clientSecret', 'code', 'codeVerifier', 'redirectUri'] as const;

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

export async function oauthTokenHandler(
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
  const code = body.code as string;
  const codeVerifier = body.codeVerifier as string;
  const redirectUri = body.redirectUri as string;

  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: clientId,
    client_secret: clientSecret,
    code,
    code_verifier: codeVerifier,
    redirect_uri: redirectUri,
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
    const errorBody = await googleResponse.json().catch(() => ({})) as Record<string, unknown>;
    const googleError = typeof errorBody.error === 'string' ? errorBody.error : '';

    if (googleError === 'invalid_client') {
      return { status: 401, jsonBody: { error: 'Invalid OAuth credentials' } };
    }

    return {
      status: 400,
      jsonBody: { error: googleError === 'invalid_grant' ? 'Authorization code expired or already used' : 'Invalid OAuth credentials' },
    };
  }

  const tokenData = (await googleResponse.json()) as GoogleTokenResponse;

  return {
    status: 200,
    jsonBody: {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresIn: tokenData.expires_in,
    },
  };
}

app.http('oauth-token', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'oauth/token',
  handler: oauthTokenHandler,
});
