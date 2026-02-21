import { describe, it, expect, vi, afterEach } from "vitest";
import {
  readAllEntries,
  writeEntries,
  checkLogSheetExists,
  createLogSheet,
  SheetsApiError,
} from "@/services/sheets";

const SPREADSHEET_ID = "test-spreadsheet-id";
const ACCESS_TOKEN = "test-access-token";

function mockFetchResponse(body: unknown, init: { ok?: boolean; status?: number; statusText?: string } = {}) {
  const { ok = true, status = 200, statusText = "OK" } = init;
  return vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok,
    status,
    statusText,
    json: async () => body,
  } as Response);
}

describe("sheets service", () => {
  afterEach(() => vi.restoreAllMocks());

  it("readAllEntries success", async () => {
    mockFetchResponse({
      values: [
        ["Date", "Time", "Description", "Calories", "Protein (g)", "Carbs (g)", "Fat (g)", "Raw Input"],
        ["2026-02-21", "12:00", "Chicken", 300, 30, 0, 10, "chicken breast"],
      ],
    });

    const entries = await readAllEntries(SPREADSHEET_ID, ACCESS_TOKEN);

    expect(entries).toHaveLength(1);
    expect(entries[0]).toEqual({
      date: "2026-02-21",
      time: "12:00",
      description: "Chicken",
      calories: 300,
      protein_g: 30,
      carbs_g: 0,
      fat_g: 10,
      raw_input: "chicken breast",
    });
  });

  it("readAllEntries 404 returns empty array", async () => {
    mockFetchResponse(null, { ok: false, status: 404, statusText: "Not Found" });

    const entries = await readAllEntries(SPREADSHEET_ID, ACCESS_TOKEN);

    expect(entries).toEqual([]);
  });

  it("readAllEntries non-404 error throws SheetsApiError", async () => {
    mockFetchResponse(null, { ok: false, status: 500, statusText: "Server Error" });

    await expect(readAllEntries(SPREADSHEET_ID, ACCESS_TOKEN)).rejects.toThrow(SheetsApiError);
    await expect(readAllEntries(SPREADSHEET_ID, ACCESS_TOKEN)).rejects.toMatchObject({ status: 500 });
  });

  it("readAllEntries with short rows (< 8 columns)", async () => {
    mockFetchResponse({
      values: [
        ["Date", "Time", "Description", "Calories", "Protein (g)", "Carbs (g)", "Fat (g)", "Raw Input"],
        ["2026-02-21", "12:00", "Chicken"],
      ],
    });

    const entries = await readAllEntries(SPREADSHEET_ID, ACCESS_TOKEN);

    expect(entries).toHaveLength(1);
    expect(entries[0]).toEqual({
      date: "2026-02-21",
      time: "12:00",
      description: "Chicken",
      calories: 0,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0,
      raw_input: "",
    });
  });

  it("readAllEntries with non-numeric macro values", async () => {
    mockFetchResponse({
      values: [
        ["Date", "Time", "Description", "Calories", "Protein (g)", "Carbs (g)", "Fat (g)", "Raw Input"],
        ["2026-02-21", "12:00", "Chicken", "abc", "xyz", "n/a", "??", "raw"],
      ],
    });

    const entries = await readAllEntries(SPREADSHEET_ID, ACCESS_TOKEN);

    expect(entries).toHaveLength(1);
    expect(entries[0].calories).toBe(0);
    expect(entries[0].protein_g).toBe(0);
    expect(entries[0].carbs_g).toBe(0);
    expect(entries[0].fat_g).toBe(0);
  });

  it("writeEntries success", async () => {
    const fetchSpy = mockFetchResponse({});

    const entry = {
      date: "2026-02-21",
      time: "12:00",
      description: "Chicken",
      calories: 300,
      protein_g: 30,
      carbs_g: 0,
      fat_g: 10,
      raw_input: "chicken breast",
    };

    await writeEntries(SPREADSHEET_ID, ACCESS_TOKEN, [entry]);

    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain(":append");
    expect(options.method).toBe("POST");
    expect((options.headers as Record<string, string>).Authorization).toContain(ACCESS_TOKEN);
  });

  it("writeEntries error throws SheetsApiError", async () => {
    mockFetchResponse(null, { ok: false, status: 403, statusText: "Forbidden" });

    const entry = {
      date: "2026-02-21",
      time: "12:00",
      description: "Chicken",
      calories: 300,
      protein_g: 30,
      carbs_g: 0,
      fat_g: 10,
      raw_input: "chicken breast",
    };

    await expect(writeEntries(SPREADSHEET_ID, ACCESS_TOKEN, [entry])).rejects.toThrow(SheetsApiError);
  });

  it("checkLogSheetExists true and false", async () => {
    // Case 1: "Log" sheet exists
    const spy1 = mockFetchResponse({
      sheets: [{ properties: { title: "Log" } }, { properties: { title: "Other" } }],
    });
    const resultTrue = await checkLogSheetExists(SPREADSHEET_ID, ACCESS_TOKEN);
    expect(resultTrue).toBe(true);
    spy1.mockRestore();

    // Case 2: "Log" sheet does not exist
    mockFetchResponse({
      sheets: [{ properties: { title: "Sheet1" } }, { properties: { title: "Other" } }],
    });
    const resultFalse = await checkLogSheetExists(SPREADSHEET_ID, ACCESS_TOKEN);
    expect(resultFalse).toBe(false);
  });

  it("createLogSheet success", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => ({}),
    } as Response);

    await createLogSheet(SPREADSHEET_ID, ACCESS_TOKEN);

    expect(fetchSpy).toHaveBeenCalledTimes(2);

    const [batchUrl, batchOptions] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(batchUrl).toContain(":batchUpdate");
    expect(batchOptions.method).toBe("POST");

    const [headerUrl, headerOptions] = fetchSpy.mock.calls[1] as [string, RequestInit];
    expect(headerUrl).toContain("Log!A1:H1");
    expect(headerOptions.method).toBe("PUT");
  });

  it("createLogSheet step 2 failure", async () => {
    let callCount = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        return { ok: true, status: 200, statusText: "OK", json: async () => ({}) } as Response;
      }
      return { ok: false, status: 500, statusText: "Server Error", json: async () => ({}) } as Response;
    });

    await expect(createLogSheet(SPREADSHEET_ID, ACCESS_TOKEN)).rejects.toThrow(SheetsApiError);
  });
});
