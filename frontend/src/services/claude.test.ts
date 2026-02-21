import { describe, it, expect, vi, afterEach } from "vitest";
import { parseFood } from "@/services/claude";
import { apiPost, ApiRequestError } from "@/services/api";
import type { AIParseResult } from "@/types";

vi.mock("@/services/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/api")>();
  return {
    ...actual,
    apiPost: vi.fn(),
  };
});

const mockedApiPost = vi.mocked(apiPost);

describe("parseFood", () => {
  afterEach(() => vi.restoreAllMocks());

  it("delegates to apiPost with correct path and payload", async () => {
    const sample: AIParseResult = {
      items: [
        {
          description: "chicken breast",
          calories: 165,
          protein_g: 31,
          carbs_g: 0,
          fat_g: 3.6,
        },
      ],
    };

    mockedApiPost.mockResolvedValue(sample);

    const result = await parseFood("test-key", "chicken breast");

    expect(mockedApiPost).toHaveBeenCalledWith("/api/parse", {
      apiKey: "test-key",
      input: "chicken breast",
    });
    expect(result).toEqual(sample);
  });

  it("propagates ApiRequestError from apiPost", async () => {
    const error = new ApiRequestError(401, { error: "Unauthorized" });
    mockedApiPost.mockRejectedValue(error);

    await expect(parseFood("test-key", "chicken breast")).rejects.toThrow(
      error,
    );
    await expect(parseFood("test-key", "chicken breast")).rejects.toBeInstanceOf(
      ApiRequestError,
    );
  });
});
