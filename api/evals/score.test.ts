import { describe, expect, it } from "vitest";
import type { ParseResult } from "../src/providers/types.js";
import { findRegressions, scoreCase, summarize, type EvalCase, type RunRecord } from "./score.js";

function result(items: ParseResult["items"], meal_label = "Breakfast"): ParseResult {
  return { meal_label, items };
}

const eggs = { description: "2 large eggs", calories: 144, protein_g: 12.6, carbs_g: 0.7, fat_g: 9.5 };

function check(evalCase: EvalCase, output: ParseResult, name: string) {
  const found = scoreCase(evalCase, output).find((c) => c.name === name);
  if (!found) {
    throw new Error(`check ${name} did not run`);
  }
  return found;
}

const eggCase: EvalCase = {
  id: "eggs",
  input: "2 large eggs",
  note: "",
  expect: {
    items: { min: 1, max: 1 },
    calories: { ref: 143 },
    macros: { protein_g: 12.6, carbs_g: 0.7, fat_g: 9.5 },
    warning: "forbidden",
    mentions: [["egg"]],
  },
};

describe("scoreCase", () => {
  it("passes every check for a correct answer", () => {
    const checks = scoreCase(eggCase, result([eggs]));
    expect(checks.every((c) => c.pass)).toBe(true);
    expect(checks.map((c) => c.name)).toEqual([
      "schema", "rounding", "meal_label", "energy", "item_count", "calories", "macros", "warning", "mentions",
    ]);
  });

  it("stops at the schema check when the output is malformed", () => {
    const checks = scoreCase(eggCase, result([{ ...eggs, calories: Number.NaN }]));
    expect(checks).toHaveLength(1);
    expect(checks[0]).toMatchObject({ name: "schema", pass: false });
  });

  it("fails rounding for fractional calories or grams past one decimal", () => {
    expect(check(eggCase, result([{ ...eggs, calories: 143.5 }]), "rounding").pass).toBe(false);
    expect(check(eggCase, result([{ ...eggs, fat_g: 9.55 }]), "rounding").pass).toBe(false);
  });

  it("fails a meal label longer than four words", () => {
    expect(check(eggCase, result([eggs], "A very big early breakfast"), "meal_label").pass).toBe(false);
  });

  it("fails energy when calories disagree with the macros by more than the tolerance", () => {
    expect(check(eggCase, result([{ ...eggs, calories: 300 }]), "energy").pass).toBe(false);
  });

  it("skips the energy check for items under the minimum", () => {
    const coffee = { description: "black coffee", calories: 2, protein_g: 0.3, carbs_g: 0, fat_g: 0 };
    expect(check(eggCase, result([coffee]), "energy").pass).toBe(true);
  });

  it("fails calories outside a reference tolerance and outside a range", () => {
    expect(check(eggCase, result([{ ...eggs, calories: 200, fat_g: 15.6 }]), "calories").pass).toBe(false);
    const rangeCase: EvalCase = { ...eggCase, expect: { calories: { min: 100, max: 130 } } };
    expect(check(rangeCase, result([eggs]), "calories").pass).toBe(false);
  });

  it("allows small macro gaps through the absolute floor", () => {
    expect(check(eggCase, result([{ ...eggs, carbs_g: 3.5 }]), "macros").pass).toBe(true);
    expect(check(eggCase, result([{ ...eggs, protein_g: 20 }]), "macros").pass).toBe(false);
  });

  it("enforces required and forbidden warnings", () => {
    expect(check(eggCase, result([{ ...eggs, warning: "assumed large" }]), "warning").pass).toBe(false);
    const vague: EvalCase = { ...eggCase, expect: { warning: "required" } };
    expect(check(vague, result([eggs]), "warning").pass).toBe(false);
    expect(check(vague, result([{ ...eggs, warning: "assumed 2" }]), "warning").pass).toBe(true);
  });

  it("requires every mention group to appear in some description", () => {
    const meal: EvalCase = { ...eggCase, expect: { mentions: [["egg"], ["toast", "bread"]] } };
    expect(check(meal, result([eggs]), "mentions").pass).toBe(false);
    const toast = { description: "1 slice whole wheat bread", calories: 80, protein_g: 4, carbs_g: 14, fat_g: 1 };
    expect(check(meal, result([eggs, toast]), "mentions").pass).toBe(true);
  });

  it("checks the not-food rejection the system prompt describes", () => {
    const keys: EvalCase = { id: "keys", input: "my car keys", note: "", expect: { notFood: true } };
    const rejected = { description: "Not a food item", calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, warning: "keys are not food" };
    expect(check(keys, result([rejected], "Not Food"), "not_food").pass).toBe(true);
    expect(check(keys, result([{ ...rejected, warning: undefined }], "Not Food"), "not_food").pass).toBe(false);
    expect(check(keys, result([eggs]), "not_food").pass).toBe(false);
  });
});

function record(caseId: string, pass: boolean, calories: number): RunRecord {
  return {
    caseId,
    repeat: 0,
    output: result([{ ...eggs, calories }]),
    error: null,
    checks: [{ name: "calories", pass, detail: "" }],
    pass,
  };
}

describe("summarize", () => {
  it("reports overall and per-check pass rates and calorie spread per case", () => {
    const summary = summarize([record("a", true, 100), record("a", false, 120), record("b", true, 50)]);
    expect(summary.runs).toBe(3);
    expect(summary.passRate).toBe(0.667);
    expect(summary.checkPassRates.calories).toBe(0.667);
    expect(summary.caseConsistency.a).toEqual({ passRate: 0.5, calorieCv: 0.091 });
    expect(summary.caseConsistency.b.calorieCv).toBeNull();
  });
});

describe("findRegressions", () => {
  const baseline = summarize([record("a", true, 100), record("b", true, 100)]);

  it("flags an overall drop past the threshold", () => {
    const current = summarize([record("a", true, 100), record("b", false, 100)]);
    expect(findRegressions(baseline, current, 0.05, 0.1).map((r) => r.what)).toEqual(["overall", "calories"]);
  });

  it("accepts a run that holds the baseline", () => {
    expect(findRegressions(baseline, baseline, 0.05, 0.1)).toEqual([]);
  });
});
