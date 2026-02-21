import { describe, it, expect, vi, afterEach } from "vitest";
import type {
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { parseHandler } from "./parse";

function mockRequest(body: unknown) {
  return { json: async () => body } as unknown as HttpRequest;
}
const mockContext = {} as unknown as InvocationContext;

function mockFetchResponse(status: number, body: unknown): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
  } as unknown as Response;
}

describe("parseHandler", () => {
  afterEach(() => vi.restoreAllMocks());

  it("valid request returns 200 with items", async () => {
    const claudeBody = {
      content: [
        {
          type: "tool_use",
          id: "1",
          name: "parse_food_items",
          input: {
            items: [
              {
                description: "Chicken",
                calories: 300,
                protein_g: 30,
                carbs_g: 0,
                fat_g: 10,
              },
            ],
          },
        },
      ],
    };
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockFetchResponse(200, claudeBody),
    );

    const result = await parseHandler(
      mockRequest({ apiKey: "key", input: "chicken" }),
      mockContext,
    );

    expect(result.status).toBe(200);
    const body = JSON.parse(result.body as string);
    expect(body.items).toEqual([
      {
        description: "Chicken",
        calories: 300,
        protein_g: 30,
        carbs_g: 0,
        fat_g: 10,
      },
    ]);
  });

  it("missing apiKey returns 400", async () => {
    const result = await parseHandler(
      mockRequest({ input: "chicken" }),
      mockContext,
    );

    expect(result.status).toBe(400);
    const body = JSON.parse(result.body as string);
    expect(body.error).toContain("apiKey");
  });

  it("missing input returns 400", async () => {
    const result = await parseHandler(
      mockRequest({ apiKey: "key" }),
      mockContext,
    );

    expect(result.status).toBe(400);
    const body = JSON.parse(result.body as string);
    expect(body.error).toContain("input");
  });

  it("invalid JSON body returns 400", async () => {
    const request = {
      json: async () => {
        throw new Error("Unexpected token");
      },
    } as unknown as HttpRequest;

    const result = await parseHandler(request, mockContext);

    expect(result.status).toBe(400);
    const body = JSON.parse(result.body as string);
    expect(body.error).toContain("Invalid JSON");
  });

  it("Claude 401 returns 401", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockFetchResponse(401, { error: "Unauthorized" }),
    );

    const result = await parseHandler(
      mockRequest({ apiKey: "bad-key", input: "chicken" }),
      mockContext,
    );

    expect(result.status).toBe(401);
    const body = JSON.parse(result.body as string);
    expect(body.error).toBe("Invalid API key");
  });

  it("Claude 429 returns 429 with retryAfter", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockFetchResponse(429, { error: "Rate limited" }),
    );

    const result = await parseHandler(
      mockRequest({ apiKey: "key", input: "chicken" }),
      mockContext,
    );

    expect(result.status).toBe(429);
    const body = JSON.parse(result.body as string);
    expect(body.error).toBe("Rate limited");
    expect(body.retryAfter).toBe(30);
  });

  it("Claude 500+ returns 502", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockFetchResponse(500, { error: "Internal server error" }),
    );

    const result = await parseHandler(
      mockRequest({ apiKey: "key", input: "chicken" }),
      mockContext,
    );

    expect(result.status).toBe(502);
    const body = JSON.parse(result.body as string);
    expect(body.error).toBe("AI service unavailable");
  });

  it("malformed Claude response (no tool_use block) returns 502", async () => {
    const claudeBody = {
      content: [{ type: "text", text: "hello" }],
    };
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockFetchResponse(200, claudeBody),
    );

    const result = await parseHandler(
      mockRequest({ apiKey: "key", input: "chicken" }),
      mockContext,
    );

    expect(result.status).toBe(502);
    const body = JSON.parse(result.body as string);
    expect(body.error).toBe("AI service unavailable");
  });
});
