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
];

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
  const url = `${SHEETS_BASE}/${spreadsheetId}/values/Log!A:H`;
  const response = await fetch(url, {
    headers: authHeaders(accessToken),
  });

  await ensureOk(response);

  const data = await response.json();
  const rows: string[][] | undefined = data.values;

  if (!rows || rows.length <= 1) {
    return [];
  }

  // Skip header row (index 0)
  return rows.slice(1).map((row) => ({
    date: row[0] ?? "",
    time: row[1] ?? "",
    description: row[2] ?? "",
    calories: Number(row[3]) || 0,
    protein_g: Number(row[4]) || 0,
    carbs_g: Number(row[5]) || 0,
    fat_g: Number(row[6]) || 0,
    raw_input: row[7] ?? "",
  }));
}

export async function writeEntries(
  spreadsheetId: string,
  accessToken: string,
  entries: FoodEntry[],
): Promise<void> {
  const url = `${SHEETS_BASE}/${spreadsheetId}/values/Log!A:H:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

  const response = await fetch(url, {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify({
      values: entries.map((e) => [
        e.date,
        e.time,
        e.description,
        e.calories,
        e.protein_g,
        e.carbs_g,
        e.fat_g,
        e.raw_input,
      ]),
    }),
  });

  await ensureOk(response);
}

export async function checkLogSheetExists(
  spreadsheetId: string,
  accessToken: string,
): Promise<boolean> {
  const url = `${SHEETS_BASE}/${spreadsheetId}?fields=sheets.properties.title`;

  const response = await fetch(url, {
    headers: authHeaders(accessToken),
  });

  await ensureOk(response);

  const data = await response.json();
  const sheets: { properties: { title: string } }[] = data.sheets ?? [];

  return sheets.some((sheet) => sheet.properties.title === "Log");
}

export async function createLogSheet(
  spreadsheetId: string,
  accessToken: string,
): Promise<void> {
  // Step 1: Add the "Log" sheet via batchUpdate
  const batchUrl = `${SHEETS_BASE}/${spreadsheetId}:batchUpdate`;

  const batchResponse = await fetch(batchUrl, {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify({
      requests: [
        {
          addSheet: {
            properties: { title: "Log" },
          },
        },
      ],
    }),
  });

  await ensureOk(batchResponse);

  // Step 2: Write header row
  const headersUrl = `${SHEETS_BASE}/${spreadsheetId}/values/Log!A1:H1?valueInputOption=RAW`;

  const headersResponse = await fetch(headersUrl, {
    method: "PUT",
    headers: authHeaders(accessToken),
    body: JSON.stringify({
      values: [HEADERS],
    }),
  });

  await ensureOk(headersResponse);
}
