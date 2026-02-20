import { apiPost } from "@/services/api";

function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function generatePKCE(): Promise<{
  codeVerifier: string;
  codeChallenge: string;
}> {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const codeVerifier = base64UrlEncode(array.buffer);

  const encoded = new TextEncoder().encode(codeVerifier);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  const codeChallenge = base64UrlEncode(digest);

  return { codeVerifier, codeChallenge };
}

export function generateState(): string {
  const array = new Uint8Array(24);
  crypto.getRandomValues(array);
  return base64UrlEncode(array.buffer);
}

export function buildAuthUrl(params: {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  state: string;
}): string {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", params.clientId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set(
    "scope",
    "https://www.googleapis.com/auth/spreadsheets",
  );
  url.searchParams.set("code_challenge", params.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", params.state);
  return url.toString();
}

export async function exchangeToken(params: {
  clientId: string;
  clientSecret: string;
  code: string;
  codeVerifier: string;
  redirectUri: string;
}): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  return apiPost<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }>("/api/oauth/token", {
    clientId: params.clientId,
    clientSecret: params.clientSecret,
    code: params.code,
    codeVerifier: params.codeVerifier,
    redirectUri: params.redirectUri,
  });
}

export async function refreshToken(params: {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}): Promise<{ accessToken: string; expiresIn: number }> {
  return apiPost<{ accessToken: string; expiresIn: number }>(
    "/api/oauth/refresh",
    {
      clientId: params.clientId,
      clientSecret: params.clientSecret,
      refreshToken: params.refreshToken,
    },
  );
}
