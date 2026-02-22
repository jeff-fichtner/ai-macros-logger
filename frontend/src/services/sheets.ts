import type { FoodEntry } from "@/types";

const SHEETS_BASE = "https://sheets.googleapis.com/v4/spreadsheets";

const HEADERS = [
  "Date",
  "Time",
  "Description",
  "Calories",
  "Protein (g)",
  "Carbs (g)",
  "Fat (g)",
  "Raw Input",
  "Group ID",
  "Meal Label",
  "UTC Offset",
];

/** Convert 1-based column number to spreadsheet column letter(s). 1→A, 26→Z, 27→AA */
export function columnLetter(n: number): string {
  let result = "";
  while (n > 0) {
    n--;
    result = String.fromCharCode(65 + (n % 26)) + result;
    n = Math.floor(n / 26);
  }
  return result;
}

const LAST_COL = columnLetter(HEADERS.length);
const LOG_RANGE = `Log!A:${LAST_COL}`;
const LOG_HEADER_RANGE = `Log!A1:${LAST_COL}1`;

const HEADER_TO_KEY: Record<string, keyof FoodEntry> = {
  "Date": "date",
  "Time": "time",
  "Description": "description",
  "Calories": "calories",
  "Protein (g)": "protein_g",
  "Carbs (g)": "carbs_g",
  "Fat (g)": "fat_g",
  "Raw Input": "raw_input",
  "Group ID": "group_id",
  "Meal Label": "meal_label",
  "UTC Offset": "utc_offset",
};

const NUMERIC_KEYS: Set<keyof FoodEntry> = new Set([
  "calories", "protein_g", "carbs_g", "fat_g",
]);

const DEFAULTS: Record<keyof FoodEntry, string | number> = {
  date: "", time: "", description: "",
  calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0,
  raw_input: "", group_id: "", meal_label: "", utc_offset: "",
  sheetRow: 0,
};

function authHeaders(accessToken: string): HeadersInit {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
}

export class SheetsApiError extends Error {
  status: number;

  constructor(status: number, statusText: string) {
    super(`Google Sheets API error: ${status} ${statusText}`);
    this.name = "SheetsApiError";
    this.status = status;
  }
}

async function ensureOk(response: Response): Promise<void> {
  if (!response.ok) {
    throw new SheetsApiError(response.status, response.statusText);
  }
}

export async function readAllEntries(
  spreadsheetId: string,
  accessToken: string,
): Promise<FoodEntry[]> {
  const url = `${SHEETS_BASE}/${spreadsheetId}/values/${LOG_RANGE}`;
  const response = await fetch(url, {
    headers: authHeaders(accessToken),
  });

  if (response.status === 404) {
    return [];
  }

  await ensureOk(response);

  const data = await response.json();
  const rows: string[][] | undefined = data.values;

  if (!rows || rows.length <= 1) {
    return [];
  }

  // Build column index from actual header row
  const headerRow = rows[0];
  const colIndex = new Map<keyof FoodEntry, number>();
  headerRow.forEach((header, i) => {
    const key = HEADER_TO_KEY[header];
    if (key) colIndex.set(key, i);
  });

  return rows.slice(1).map((row, arrayIndex) => {
    const entry = { ...DEFAULTS } as Record<keyof FoodEntry, string | number>;
    for (const [key, idx] of colIndex) {
      const raw = row[idx] ?? "";
      entry[key] = NUMERIC_KEYS.has(key) ? (Number(raw) || 0) : raw;
    }
    entry.sheetRow = arrayIndex + 1; // 0-based: row 0 = header, row 1 = first data row
    return entry as unknown as FoodEntry;
  });
}

export async function writeEntries(
  spreadsheetId: string,
  accessToken: string,
  entries: FoodEntry[],
): Promise<void> {
  const url = `${SHEETS_BASE}/${spreadsheetId}/values/${LOG_RANGE}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`;

  const response = await fetch(url, {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify({
      values: entries.map((e) =>
        HEADERS.map((header) => {
          const key = HEADER_TO_KEY[header];
          return key ? e[key] : "";
        })
      ),
    }),
  });

  await ensureOk(response);
}

export async function ensureLogSheet(
  spreadsheetId: string,
  accessToken: string,
): Promise<void> {
  // Step 1: Check if "Log" sheet exists
  const metaUrl = `${SHEETS_BASE}/${spreadsheetId}?fields=sheets.properties.title`;
  const metaResponse = await fetch(metaUrl, {
    headers: authHeaders(accessToken),
  });
  await ensureOk(metaResponse);

  const metaData = await metaResponse.json();
  const sheets: { properties: { title: string } }[] = metaData.sheets ?? [];
  const sheetExists = sheets.some((s) => s.properties.title === "Log");

  if (!sheetExists) {
    // Create sheet + write full headers
    const batchUrl = `${SHEETS_BASE}/${spreadsheetId}:batchUpdate`;
    const batchResponse = await fetch(batchUrl, {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify({
        requests: [{ addSheet: { properties: { title: "Log" } } }],
      }),
    });
    await ensureOk(batchResponse);

    const headersUrl = `${SHEETS_BASE}/${spreadsheetId}/values/${LOG_HEADER_RANGE}?valueInputOption=RAW`;
    const headersResponse = await fetch(headersUrl, {
      method: "PUT",
      headers: authHeaders(accessToken),
      body: JSON.stringify({ values: [HEADERS] }),
    });
    await ensureOk(headersResponse);
    return;
  }

  // Step 2: Sheet exists — read header row to check schema
  const headerUrl = `${SHEETS_BASE}/${spreadsheetId}/values/Log!1:1`;
  const headerResponse = await fetch(headerUrl, {
    headers: authHeaders(accessToken),
  });
  await ensureOk(headerResponse);

  const headerData = await headerResponse.json();
  const existingHeaders: string[] = headerData.values?.[0] ?? [];

  // Empty header row — write full headers
  if (existingHeaders.length === 0) {
    const writeUrl = `${SHEETS_BASE}/${spreadsheetId}/values/${LOG_HEADER_RANGE}?valueInputOption=RAW`;
    const writeResponse = await fetch(writeUrl, {
      method: "PUT",
      headers: authHeaders(accessToken),
      body: JSON.stringify({ values: [HEADERS] }),
    });
    await ensureOk(writeResponse);
    return;
  }

  // Verify existing headers match expected prefix
  const prefixLen = Math.min(existingHeaders.length, HEADERS.length);
  for (let i = 0; i < prefixLen; i++) {
    if (existingHeaders[i] !== HEADERS[i]) {
      throw new SheetsApiError(
        0,
        `Schema mismatch: expected column ${i + 1} to be "${HEADERS[i]}" but found "${existingHeaders[i]}"`,
      );
    }
  }

  // Headers match current schema — no migration needed
  if (existingHeaders.length >= HEADERS.length) {
    return;
  }

  // Fewer headers than expected — append missing columns
  const missingHeaders = HEADERS.slice(existingHeaders.length);
  const startCol = columnLetter(existingHeaders.length + 1);
  const endCol = LAST_COL;
  const migrateRange = `Log!${startCol}1:${endCol}1`;

  const migrateUrl = `${SHEETS_BASE}/${spreadsheetId}/values/${migrateRange}?valueInputOption=RAW`;
  const migrateResponse = await fetch(migrateUrl, {
    method: "PUT",
    headers: authHeaders(accessToken),
    body: JSON.stringify({ values: [missingHeaders] }),
  });
  await ensureOk(migrateResponse);
}

export async function getLogSheetId(
  spreadsheetId: string,
  accessToken: string,
): Promise<number> {
  const url = `${SHEETS_BASE}/${spreadsheetId}?fields=sheets.properties(title,sheetId)`;
  const response = await fetch(url, {
    headers: authHeaders(accessToken),
  });
  await ensureOk(response);

  const data = await response.json();
  const sheets: { properties: { title: string; sheetId: number } }[] = data.sheets ?? [];
  const logSheet = sheets.find((s) => s.properties.title === "Log");
  if (!logSheet) {
    throw new SheetsApiError(0, 'Sheet "Log" not found in spreadsheet');
  }
  return logSheet.properties.sheetId;
}

export async function deleteEntries(
  spreadsheetId: string,
  accessToken: string,
  sheetRows: number[],
): Promise<void> {
  if (sheetRows.length === 0) return;

  const sheetId = await getLogSheetId(spreadsheetId, accessToken);

  // Sort descending to avoid index shift during sequential execution
  const sorted = [...sheetRows].sort((a, b) => b - a);

  const requests = sorted.map((row) => ({
    deleteDimension: {
      range: {
        sheetId,
        dimension: "ROWS",
        startIndex: row,
        endIndex: row + 1,
      },
    },
  }));

  const url = `${SHEETS_BASE}/${spreadsheetId}:batchUpdate`;
  const response = await fetch(url, {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify({ requests }),
  });
  await ensureOk(response);
}
