import { describe, it, expect, vi, afterEach } from "vitest";
import { apiPost, ApiRequestError } from "@/services/api";

describe("apiPost", () => {
  afterEach(() => vi.restoreAllMocks());

  it("apiPost success", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ result: "ok" }),
    } as Response);

    const data = await apiPost<{ result: string }>("/test", { key: "value" });

    expect(data).toEqual({ result: "ok" });
  });

  it("apiPost non-OK response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: "Unauthorized" }),
    } as Response);

    try {
      await apiPost("/test", { key: "value" });
      expect.fail("Expected ApiRequestError to be thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiRequestError);
      const apiErr = err as ApiRequestError;
      expect(apiErr.status).toBe(401);
      expect(apiErr.body).toEqual({ error: "Unauthorized" });
    }
  });
});
