import { describe, it, expect, vi, afterEach } from "vitest";
import {
  generatePKCE,
  generateState,
  buildAuthUrl,
  exchangeToken,
  refreshToken,
} from "@/services/oauth";
import { apiPost } from "@/services/api";

vi.mock("@/services/api", () => ({
  apiPost: vi.fn(),
}));

const mockedApiPost = vi.mocked(apiPost);

describe("oauth", () => {
  afterEach(() => vi.restoreAllMocks());

  it("generatePKCE returns valid verifier (43+ chars) and base64url challenge", async () => {
    const { codeVerifier, codeChallenge } = await generatePKCE();

    expect(codeVerifier.length).toBeGreaterThanOrEqual(43);
    expect(codeChallenge).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("generateState returns 32+ char string", () => {
    const state = generateState();

    expect(state.length).toBeGreaterThanOrEqual(32);
    expect(state).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("buildAuthUrl includes all required query params", () => {
    const result = buildAuthUrl({
      clientId: "test-client-id",
      redirectUri: "http://localhost:3000/callback",
      codeChallenge: "test-challenge",
      state: "test-state",
    });

    const url = new URL(result);
    const params = url.searchParams;

    expect(params.get("client_id")).toBe("test-client-id");
    expect(params.get("redirect_uri")).toBe(
      "http://localhost:3000/callback",
    );
    expect(params.get("response_type")).toBe("code");
    expect(params.get("scope")).toContain("spreadsheets");
    expect(params.get("code_challenge")).toBe("test-challenge");
    expect(params.get("code_challenge_method")).toBe("S256");
    expect(params.get("access_type")).toBe("offline");
    expect(params.get("prompt")).toBe("consent");
    expect(params.get("state")).toBe("test-state");
  });

  it("exchangeToken success", async () => {
    const expected = {
      accessToken: "at",
      refreshToken: "rt",
      expiresIn: 3600,
    };
    mockedApiPost.mockResolvedValue(expected);

    const result = await exchangeToken({
      clientId: "cid",
      clientSecret: "csec",
      code: "auth-code",
      codeVerifier: "verifier",
      redirectUri: "http://localhost:3000/callback",
    });

    expect(mockedApiPost).toHaveBeenCalledWith("/api/oauth/token", {
      clientId: "cid",
      clientSecret: "csec",
      code: "auth-code",
      codeVerifier: "verifier",
      redirectUri: "http://localhost:3000/callback",
    });
    expect(result).toEqual(expected);
  });

  it("exchangeToken error propagation", async () => {
    const error = new Error("token exchange failed");
    mockedApiPost.mockRejectedValue(error);

    await expect(
      exchangeToken({
        clientId: "cid",
        clientSecret: "csec",
        code: "auth-code",
        codeVerifier: "verifier",
        redirectUri: "http://localhost:3000/callback",
      }),
    ).rejects.toThrow(error);
  });

  it("refreshToken error propagation", async () => {
    const error = new Error("refresh failed");
    mockedApiPost.mockRejectedValue(error);

    await expect(
      refreshToken({
        clientId: "cid",
        clientSecret: "csec",
        refreshToken: "rt",
      }),
    ).rejects.toThrow(error);
  });
});
