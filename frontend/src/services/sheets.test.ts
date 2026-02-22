import { describe, it, expect, vi, afterEach } from "vitest";
import {
  readAllEntries,
  writeEntries,
  ensureLogSheet,
  columnLetter,
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

const ALL_HEADERS = ["Date", "Time", "Description", "Calories", "Protein (g)", "Carbs (g)", "Fat (g)", "Raw Input", "Group ID", "Meal Label", "UTC Offset"];

describe("columnLetter", () => {
  afterEach(() => vi.restoreAllMocks());

  it("converts 1-based index to column letter", () => {
    expect(columnLetter(1)).toBe("A");
    expect(columnLetter(10)).toBe("J");
    expect(columnLetter(26)).toBe("Z");
    expect(columnLetter(27)).toBe("AA");
    expect(columnLetter(28)).toBe("AB");
    expect(columnLetter(52)).toBe("AZ");
    expect(columnLetter(53)).toBe("BA");
  });
});

describe("readAllEntries", () => {
  afterEach(() => vi.restoreAllMocks());

  it("success with full 11-column schema", async () => {
    mockFetchResponse({
      values: [
        ALL_HEADERS,
        ["2026-02-21", "12:00 PM", "Chicken", 300, 30, 0, 10, "chicken breast", "g1", "Lunch", "-08:00"],
      ],
    });

    const entries = await readAllEntries(SPREADSHEET_ID, ACCESS_TOKEN);

    expect(entries).toHaveLength(1);
    expect(entries[0]).toEqual({
      date: "2026-02-21",
      time: "12:00 PM",
      description: "Chicken",
      calories: 300,
      protein_g: 30,
      carbs_g: 0,
      fat_g: 10,
      raw_input: "chicken breast",
      group_id: "g1",
      meal_label: "Lunch",
      utc_offset: "-08:00",
    });
  });

  it("backward compat: old 8-column schema defaults missing fields", async () => {
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
      group_id: "",
      meal_label: "",
      utc_offset: "",
    });
  });

  it("404 returns empty array", async () => {
    mockFetchResponse(null, { ok: false, status: 404, statusText: "Not Found" });

    const entries = await readAllEntries(SPREADSHEET_ID, ACCESS_TOKEN);

    expect(entries).toEqual([]);
  });

  it("non-404 error throws SheetsApiError", async () => {
    mockFetchResponse(null, { ok: false, status: 500, statusText: "Server Error" });

    await expect(readAllEntries(SPREADSHEET_ID, ACCESS_TOKEN)).rejects.toThrow(SheetsApiError);
    await expect(readAllEntries(SPREADSHEET_ID, ACCESS_TOKEN)).rejects.toMatchObject({ status: 500 });
  });

  it("short rows default missing fields", async () => {
    mockFetchResponse({
      values: [
        ALL_HEADERS,
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
      group_id: "",
      meal_label: "",
      utc_offset: "",
    });
  });

  it("non-numeric macro values default to 0", async () => {
    mockFetchResponse({
      values: [
        ALL_HEADERS,
        ["2026-02-21", "12:00", "Chicken", "abc", "xyz", "n/a", "??", "raw", "", "", ""],
      ],
    });

    const entries = await readAllEntries(SPREADSHEET_ID, ACCESS_TOKEN);

    expect(entries).toHaveLength(1);
    expect(entries[0].calories).toBe(0);
    expect(entries[0].protein_g).toBe(0);
    expect(entries[0].carbs_g).toBe(0);
    expect(entries[0].fat_g).toBe(0);
  });

  it("ignores unknown headers", async () => {
    mockFetchResponse({
      values: [
        [...ALL_HEADERS, "Unknown Column"],
        ["2026-02-21", "12:00", "Chicken", 300, 30, 0, 10, "raw", "g1", "Lunch", "-05:00", "extra"],
      ],
    });

    const entries = await readAllEntries(SPREADSHEET_ID, ACCESS_TOKEN);

    expect(entries).toHaveLength(1);
    expect(entries[0].date).toBe("2026-02-21");
    expect(entries[0].group_id).toBe("g1");
  });
});

describe("writeEntries", () => {
  afterEach(() => vi.restoreAllMocks());

  it("success with correct payload structure", async () => {
    const fetchSpy = mockFetchResponse({});

    const entry = {
      date: "2026-02-21",
      time: "12:00 PM",
      description: "Chicken",
      calories: 300,
      protein_g: 30,
      carbs_g: 0,
      fat_g: 10,
      raw_input: "chicken breast",
      group_id: "abc123",
      meal_label: "Lunch",
      utc_offset: "-08:00",
    };

    await writeEntries(SPREADSHEET_ID, ACCESS_TOKEN, [entry]);

    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain(":append");
    expect(options.method).toBe("POST");
    expect((options.headers as Record<string, string>).Authorization).toContain(ACCESS_TOKEN);

    const body = JSON.parse(options.body as string);
    expect(body.values[0]).toEqual([
      "2026-02-21", "12:00 PM", "Chicken", 300, 30, 0, 10, "chicken breast", "abc123", "Lunch", "-08:00",
    ]);
  });

  it("error throws SheetsApiError", async () => {
    mockFetchResponse(null, { ok: false, status: 403, statusText: "Forbidden" });

    const entry = {
      date: "2026-02-21",
      time: "12:00 PM",
      description: "Chicken",
      calories: 300,
      protein_g: 30,
      carbs_g: 0,
      fat_g: 10,
      raw_input: "chicken breast",
      group_id: "abc123",
      meal_label: "Lunch",
      utc_offset: "-08:00",
    };

    await expect(writeEntries(SPREADSHEET_ID, ACCESS_TOKEN, [entry])).rejects.toThrow(SheetsApiError);
  });
});

describe("ensureLogSheet", () => {
  afterEach(() => vi.restoreAllMocks());

  it("creates sheet when not found", async () => {
    let callCount = 0;
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        // metadata: no "Log" sheet
        return { ok: true, status: 200, statusText: "OK", json: async () => ({ sheets: [{ properties: { title: "Sheet1" } }] }) } as Response;
      }
      // batchUpdate + header write
      return { ok: true, status: 200, statusText: "OK", json: async () => ({}) } as Response;
    });

    await ensureLogSheet(SPREADSHEET_ID, ACCESS_TOKEN);

    expect(fetchSpy).toHaveBeenCalledTimes(3);

    const [batchUrl, batchOptions] = fetchSpy.mock.calls[1] as [string, RequestInit];
    expect(batchUrl).toContain(":batchUpdate");
    expect(batchOptions.method).toBe("POST");

    const [headerUrl, headerOptions] = fetchSpy.mock.calls[2] as [string, RequestInit];
    expect(headerUrl).toContain("Log!A1:K1");
    expect(headerOptions.method).toBe("PUT");
    const headerBody = JSON.parse(headerOptions.body as string);
    expect(headerBody.values[0]).toEqual(ALL_HEADERS);
  });

  it("no-op when schema is current", async () => {
    let callCount = 0;
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        return { ok: true, status: 200, statusText: "OK", json: async () => ({ sheets: [{ properties: { title: "Log" } }] }) } as Response;
      }
      // header row read returns all 10 headers
      return { ok: true, status: 200, statusText: "OK", json: async () => ({ values: [ALL_HEADERS] }) } as Response;
    });

    await ensureLogSheet(SPREADSHEET_ID, ACCESS_TOKEN);

    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("migrates when headers are a prefix of expected", async () => {
    const oldHeaders = ALL_HEADERS.slice(0, 8);
    let callCount = 0;
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        return { ok: true, status: 200, statusText: "OK", json: async () => ({ sheets: [{ properties: { title: "Log" } }] }) } as Response;
      }
      if (callCount === 2) {
        return { ok: true, status: 200, statusText: "OK", json: async () => ({ values: [oldHeaders] }) } as Response;
      }
      return { ok: true, status: 200, statusText: "OK", json: async () => ({}) } as Response;
    });

    await ensureLogSheet(SPREADSHEET_ID, ACCESS_TOKEN);

    expect(fetchSpy).toHaveBeenCalledTimes(3);

    const [migrateUrl, migrateOptions] = fetchSpy.mock.calls[2] as [string, RequestInit];
    expect(migrateUrl).toContain("Log!I1:K1");
    expect(migrateOptions.method).toBe("PUT");
    const migrateBody = JSON.parse(migrateOptions.body as string);
    expect(migrateBody.values[0]).toEqual(["Group ID", "Meal Label", "UTC Offset"]);
  });

  it("writes full headers when header row is empty", async () => {
    let callCount = 0;
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        return { ok: true, status: 200, statusText: "OK", json: async () => ({ sheets: [{ properties: { title: "Log" } }] }) } as Response;
      }
      if (callCount === 2) {
        // empty header row (no values key)
        return { ok: true, status: 200, statusText: "OK", json: async () => ({}) } as Response;
      }
      return { ok: true, status: 200, statusText: "OK", json: async () => ({}) } as Response;
    });

    await ensureLogSheet(SPREADSHEET_ID, ACCESS_TOKEN);

    expect(fetchSpy).toHaveBeenCalledTimes(3);

    const [writeUrl, writeOptions] = fetchSpy.mock.calls[2] as [string, RequestInit];
    expect(writeUrl).toContain("Log!A1:K1");
    expect(writeOptions.method).toBe("PUT");
    const writeBody = JSON.parse(writeOptions.body as string);
    expect(writeBody.values[0]).toEqual(ALL_HEADERS);
  });

  it("throws on header mismatch", async () => {
    const mockResponses = () => {
      let callCount = 0;
      vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          return { ok: true, status: 200, statusText: "OK", json: async () => ({ sheets: [{ properties: { title: "Log" } }] }) } as Response;
        }
        return { ok: true, status: 200, statusText: "OK", json: async () => ({ values: [["Wrong", "Time", "Description"]] }) } as Response;
      });
    };

    mockResponses();
    await expect(ensureLogSheet(SPREADSHEET_ID, ACCESS_TOKEN)).rejects.toThrow(SheetsApiError);

    vi.restoreAllMocks();
    mockResponses();
    await expect(ensureLogSheet(SPREADSHEET_ID, ACCESS_TOKEN)).rejects.toThrow(/Schema mismatch/);
  });

  it("create sheet step 2 failure propagates error", async () => {
    let callCount = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        // metadata: no "Log" sheet
        return { ok: true, status: 200, statusText: "OK", json: async () => ({ sheets: [] }) } as Response;
      }
      if (callCount === 2) {
        // batchUpdate succeeds
        return { ok: true, status: 200, statusText: "OK", json: async () => ({}) } as Response;
      }
      // header write fails
      return { ok: false, status: 500, statusText: "Server Error", json: async () => ({}) } as Response;
    });

    await expect(ensureLogSheet(SPREADSHEET_ID, ACCESS_TOKEN)).rejects.toThrow(SheetsApiError);
  });
});
