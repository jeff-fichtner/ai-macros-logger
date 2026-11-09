import type { ParseResult } from "../src/providers/types.js";

/** A calorie expectation: a reference value with a relative tolerance, or a plausible range. */
export type CalorieExpectation =
  | { ref: number; tol?: number }
  | { min: number; max: number };

/** Reference macro totals in grams for the whole input. */
export interface MacroExpectation {
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  /** Relative tolerance; each macro also gets an absolute floor of MACRO_ABS_FLOOR_G. */
  tol?: number;
}

export interface Expectation {
  items?: { min: number; max: number };
  calories?: CalorieExpectation;
  macros?: MacroExpectation;
  /** "required": at least one item carries a warning. "forbidden": none does. */
  warning?: "required" | "forbidden";
  /** The input is not food and must be rejected the way the system prompt describes. */
  notFood?: boolean;
  /** Each group lists alternatives; at least one must appear in some item's description. */
  mentions?: string[][];
}

export interface EvalCase {
  id: string;
  input: string;
  /** Why the case exists: what behaviour it pins. */
  note: string;
  expect: Expectation;
}

export interface CheckResult {
  name: string;
  pass: boolean;
  detail: string;
}

export const DEFAULT_CALORIE_TOL = 0.2;
export const DEFAULT_MACRO_TOL = 0.25;
export const MACRO_ABS_FLOOR_G = 3;
/** Items under this many calories skip the energy check: rounding dominates the arithmetic. */
export const ENERGY_CHECK_MIN_KCAL = 30;
export const ENERGY_TOL = 0.2;

const MACROS = ["protein_g", "carbs_g", "fat_g"] as const;

export function totals(result: ParseResult) {
  const sum = { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
  for (const item of result.items) {
    sum.calories += item.calories;
    sum.protein_g += item.protein_g;
    sum.carbs_g += item.carbs_g;
    sum.fat_g += item.fat_g;
  }
  return sum;
}

function decimals(n: number): number {
  const text = String(n);
  const dot = text.indexOf(".");
  return dot === -1 ? 0 : text.length - dot - 1;
}

function checkSchema(result: ParseResult): CheckResult {
  const problems: string[] = [];
  if (!Array.isArray(result.items) || result.items.length === 0) {
    problems.push("no items");
  }
  for (const [i, item] of (result.items ?? []).entries()) {
    if (typeof item.description !== "string" || item.description.trim() === "") {
      problems.push(`item ${i}: empty description`);
    }
    for (const field of ["calories", ...MACROS] as const) {
      const value = item[field];
      if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
        problems.push(`item ${i}: ${field}=${String(value)}`);
      }
    }
  }
  return { name: "schema", pass: problems.length === 0, detail: problems.join("; ") || "ok" };
}

function checkRounding(result: ParseResult): CheckResult {
  const problems: string[] = [];
  for (const [i, item] of result.items.entries()) {
    if (!Number.isInteger(item.calories)) {
      problems.push(`item ${i}: calories ${item.calories}`);
    }
    for (const field of MACROS) {
      if (decimals(item[field]) > 1) {
        problems.push(`item ${i}: ${field} ${item[field]}`);
      }
    }
  }
  return { name: "rounding", pass: problems.length === 0, detail: problems.join("; ") || "ok" };
}

function checkMealLabel(result: ParseResult): CheckResult {
  const words = result.meal_label.trim().split(/\s+/).filter(Boolean);
  const pass = words.length >= 1 && words.length <= 4;
  return { name: "meal_label", pass, detail: `"${result.meal_label}" (${words.length} words)` };
}

/** Atwater factors: 4 kcal per gram of protein and carbohydrate, 9 per gram of fat. */
function checkEnergy(result: ParseResult): CheckResult {
  const problems: string[] = [];
  for (const [i, item] of result.items.entries()) {
    if (item.calories < ENERGY_CHECK_MIN_KCAL) {
      continue;
    }
    const fromMacros = 4 * item.protein_g + 4 * item.carbs_g + 9 * item.fat_g;
    const gap = Math.abs(fromMacros - item.calories) / item.calories;
    if (gap > ENERGY_TOL) {
      problems.push(`item ${i} "${item.description}": ${item.calories} kcal vs ${Math.round(fromMacros)} from macros`);
    }
  }
  return { name: "energy", pass: problems.length === 0, detail: problems.join("; ") || "ok" };
}

function checkItemCount(result: ParseResult, range: { min: number; max: number }): CheckResult {
  const n = result.items.length;
  const pass = n >= range.min && n <= range.max;
  return { name: "item_count", pass, detail: `${n} items, expected ${range.min}–${range.max}` };
}

function checkCalories(total: number, expected: CalorieExpectation): CheckResult {
  if ("ref" in expected) {
    const tol = expected.tol ?? DEFAULT_CALORIE_TOL;
    const low = expected.ref * (1 - tol);
    const high = expected.ref * (1 + tol);
    const pass = total >= low && total <= high;
    return { name: "calories", pass, detail: `${total} kcal, expected ${expected.ref} ±${Math.round(tol * 100)}%` };
  }
  const pass = total >= expected.min && total <= expected.max;
  return { name: "calories", pass, detail: `${total} kcal, expected ${expected.min}–${expected.max}` };
}

function checkMacros(sum: ReturnType<typeof totals>, expected: MacroExpectation): CheckResult {
  const tol = expected.tol ?? DEFAULT_MACRO_TOL;
  const problems: string[] = [];
  for (const field of MACROS) {
    const ref = expected[field];
    if (ref === undefined) {
      continue;
    }
    const allowed = Math.max(ref * tol, MACRO_ABS_FLOOR_G);
    const got = Math.round(sum[field] * 10) / 10;
    if (Math.abs(got - ref) > allowed) {
      problems.push(`${field} ${got}g, expected ${ref}g ±${Math.round(allowed * 10) / 10}g`);
    }
  }
  return { name: "macros", pass: problems.length === 0, detail: problems.join("; ") || "ok" };
}

function checkWarning(result: ParseResult, rule: "required" | "forbidden"): CheckResult {
  const warned = result.items.filter((item) => typeof item.warning === "string" && item.warning.trim() !== "");
  const pass = rule === "required" ? warned.length > 0 : warned.length === 0;
  return { name: "warning", pass, detail: `${warned.length} item(s) warned, ${rule}` };
}

function checkNotFood(result: ParseResult): CheckResult {
  const problems: string[] = [];
  if (result.items.length !== 1) {
    problems.push(`${result.items.length} items`);
  }
  const item = result.items[0];
  if (item) {
    if (!/not a food/i.test(item.description)) {
      problems.push(`description "${item.description}"`);
    }
    if (item.calories !== 0 || MACROS.some((field) => item[field] !== 0)) {
      problems.push("non-zero macros");
    }
    if (!item.warning) {
      problems.push("no warning");
    }
  }
  return { name: "not_food", pass: problems.length === 0, detail: problems.join("; ") || "ok" };
}

function checkMentions(result: ParseResult, groups: string[][]): CheckResult {
  const text = result.items.map((item) => item.description.toLowerCase());
  const missing = groups.filter(
    (group) => !group.some((word) => text.some((description) => description.includes(word.toLowerCase()))),
  );
  const detail = missing.length === 0 ? "ok" : `missing ${missing.map((g) => g.join("/")).join(", ")}`;
  return { name: "mentions", pass: missing.length === 0, detail };
}

/** Scores one model output against one case. Every check is deterministic. */
export function scoreCase(evalCase: EvalCase, result: ParseResult): CheckResult[] {
  const schema = checkSchema(result);
  if (!schema.pass) {
    return [schema];
  }
  const expect = evalCase.expect;
  const checks: CheckResult[] = [schema, checkRounding(result), checkMealLabel(result)];
  if (expect.notFood) {
    checks.push(checkNotFood(result));
    return checks;
  }
  const sum = totals(result);
  checks.push(checkEnergy(result));
  if (expect.items) {
    checks.push(checkItemCount(result, expect.items));
  }
  if (expect.calories) {
    checks.push(checkCalories(sum.calories, expect.calories));
  }
  if (expect.macros) {
    checks.push(checkMacros(sum, expect.macros));
  }
  if (expect.warning) {
    checks.push(checkWarning(result, expect.warning));
  }
  if (expect.mentions) {
    checks.push(checkMentions(result, expect.mentions));
  }
  return checks;
}

export interface RunRecord {
  caseId: string;
  repeat: number;
  /** The model's raw output, kept so failures can be read afterwards. */
  output: ParseResult | null;
  error: string | null;
  checks: CheckResult[];
  pass: boolean;
}

export interface Summary {
  runs: number;
  passRate: number;
  checkPassRates: Record<string, number>;
  caseConsistency: Record<string, { passRate: number; calorieCv: number | null }>;
}

function coefficientOfVariation(values: number[]): number | null {
  if (values.length < 2) {
    return null;
  }
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  if (mean === 0) {
    return 0;
  }
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  return Math.round((Math.sqrt(variance) / mean) * 1000) / 1000;
}

export function summarize(records: RunRecord[]): Summary {
  const checkTotals: Record<string, { pass: number; total: number }> = {};
  const byCase: Record<string, RunRecord[]> = {};
  for (const record of records) {
    for (const check of record.checks) {
      const entry = checkTotals[check.name] ?? { pass: 0, total: 0 };
      entry.total += 1;
      entry.pass += check.pass ? 1 : 0;
      checkTotals[check.name] = entry;
    }
    (byCase[record.caseId] ??= []).push(record);
  }
  const checkPassRates: Record<string, number> = {};
  for (const [name, entry] of Object.entries(checkTotals)) {
    checkPassRates[name] = Math.round((entry.pass / entry.total) * 1000) / 1000;
  }
  const caseConsistency: Summary["caseConsistency"] = {};
  for (const [caseId, runs] of Object.entries(byCase)) {
    const calories = runs.filter((r) => r.output).map((r) => totals(r.output as ParseResult).calories);
    caseConsistency[caseId] = {
      passRate: Math.round((runs.filter((r) => r.pass).length / runs.length) * 1000) / 1000,
      calorieCv: coefficientOfVariation(calories),
    };
  }
  const passed = records.filter((r) => r.pass).length;
  return {
    runs: records.length,
    passRate: records.length === 0 ? 0 : Math.round((passed / records.length) * 1000) / 1000,
    checkPassRates,
    caseConsistency,
  };
}

export interface Regression {
  what: string;
  baseline: number;
  current: number;
}

/**
 * Compares a run with a saved baseline. The overall pass rate may fall by at most `overallDrop`,
 * and any single check's pass rate by at most `checkDrop`.
 */
export function findRegressions(
  baseline: Summary,
  current: Summary,
  overallDrop: number,
  checkDrop: number,
): Regression[] {
  const regressions: Regression[] = [];
  if (baseline.passRate - current.passRate > overallDrop) {
    regressions.push({ what: "overall", baseline: baseline.passRate, current: current.passRate });
  }
  for (const [name, rate] of Object.entries(baseline.checkPassRates)) {
    const now = current.checkPassRates[name];
    if (now !== undefined && rate - now > checkDrop) {
      regressions.push({ what: name, baseline: rate, current: now });
    }
  }
  return regressions;
}
