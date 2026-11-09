import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { SYSTEM_PROMPT } from "../src/functions/parse.js";
import { callProvider as callClaude } from "../src/providers/claude.js";
import { callProvider as callGemini } from "../src/providers/gemini.js";
import { callProvider as callOpenAI } from "../src/providers/openai.js";
import type { ProviderHandler } from "../src/providers/types.js";
import { CASES } from "./cases.js";
import { findRegressions, scoreCase, summarize, type RunRecord, type Summary } from "./score.js";

const HERE = dirname(fileURLToPath(import.meta.url));

const PROVIDERS: Record<string, { handler: ProviderHandler; keyVar: string }> = {
  claude: { handler: callClaude, keyVar: "ANTHROPIC_API_KEY" },
  openai: { handler: callOpenAI, keyVar: "OPENAI_API_KEY" },
  gemini: { handler: callGemini, keyVar: "GEMINI_API_KEY" },
};

/** A drop larger than these fails --compare. */
const OVERALL_DROP = 0.05;
const CHECK_DROP = 0.1;

const USAGE = `usage: npm run eval -- --provider <claude|openai|gemini> [--repeats N] [--case ID] [--save-baseline] [--compare]

  --repeats N       run each case N times (default 3) to measure consistency
  --case ID         run one case
  --save-baseline   write this run's summary to evals/baselines/<provider>.json
  --compare         fail if this run falls below the saved baseline`;

function fail(message: string): never {
  console.error(`eval: ${message}\n\n${USAGE}`);
  process.exit(2);
}

function parseOptions() {
  const { values } = parseArgs({
    options: {
      provider: { type: "string" },
      repeats: { type: "string" },
      case: { type: "string" },
      "save-baseline": { type: "boolean" },
      compare: { type: "boolean" },
    },
  });
  const provider = values.provider;
  if (!provider) {
    fail("--provider is required");
  }
  if (!PROVIDERS[provider]) {
    fail(`unknown provider "${provider}"`);
  }
  // Three runs per case is enough to see a model flip between answers; the number only changes
  // how much the run costs, never what a pass means.
  const repeats = values.repeats === undefined ? 3 : Number(values.repeats);
  if (!Number.isInteger(repeats) || repeats < 1) {
    fail(`--repeats must be a positive integer, got "${values.repeats}"`);
  }
  const cases = values.case ? CASES.filter((c) => c.id === values.case) : CASES;
  if (cases.length === 0) {
    fail(`no case with id "${values.case}"`);
  }
  const keyVar = PROVIDERS[provider].keyVar;
  const apiKey = process.env[keyVar];
  if (!apiKey || apiKey.trim() === "") {
    fail(`${keyVar} is not set. Run under op run with it pointing at the provider key.`);
  }
  return {
    provider,
    handler: PROVIDERS[provider].handler,
    apiKey,
    repeats,
    cases,
    saveBaseline: values["save-baseline"] === true,
    compare: values.compare === true,
  };
}

function pct(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

async function main() {
  const options = parseOptions();
  const records: RunRecord[] = [];

  for (const evalCase of options.cases) {
    for (let repeat = 0; repeat < options.repeats; repeat += 1) {
      let record: RunRecord;
      try {
        const output = await options.handler(options.apiKey, SYSTEM_PROMPT, evalCase.input);
        const checks = scoreCase(evalCase, output);
        record = { caseId: evalCase.id, repeat, output, error: null, checks, pass: checks.every((c) => c.pass) };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        record = {
          caseId: evalCase.id,
          repeat,
          output: null,
          error: message,
          checks: [{ name: "call", pass: false, detail: message }],
          pass: false,
        };
      }
      records.push(record);
      const failed = record.checks.filter((c) => !c.pass);
      const mark = record.pass ? "pass" : "FAIL";
      const why = failed.length === 0 ? "" : `  ${failed.map((c) => `${c.name}: ${c.detail}`).join(" | ")}`;
      console.log(`${mark}  ${evalCase.id} #${repeat + 1}${why}`);
    }
  }

  const summary = summarize(records);
  console.log(`\n${options.provider}: ${pct(summary.passRate)} of ${summary.runs} runs passed every check`);
  for (const [name, rate] of Object.entries(summary.checkPassRates)) {
    console.log(`  ${name.padEnd(11)} ${pct(rate)}`);
  }
  const unstable = Object.entries(summary.caseConsistency).filter(([, c]) => c.passRate > 0 && c.passRate < 1);
  if (unstable.length > 0) {
    console.log(`  flaky: ${unstable.map(([id]) => id).join(", ")}`);
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const resultsDir = join(HERE, "results");
  mkdirSync(resultsDir, { recursive: true });
  const resultPath = join(resultsDir, `${stamp}-${options.provider}.json`);
  writeFileSync(resultPath, JSON.stringify({ provider: options.provider, repeats: options.repeats, summary, records }, null, 2));
  console.log(`\nfull results, with every model output: ${resultPath}`);

  const baselinePath = join(HERE, "baselines", `${options.provider}.json`);
  if (options.saveBaseline) {
    mkdirSync(dirname(baselinePath), { recursive: true });
    writeFileSync(baselinePath, `${JSON.stringify(summary, null, 2)}\n`);
    console.log(`baseline saved: ${baselinePath}`);
  }
  if (options.compare) {
    if (!existsSync(baselinePath)) {
      fail(`no baseline at ${baselinePath}; run once with --save-baseline`);
    }
    const baseline = JSON.parse(readFileSync(baselinePath, "utf8")) as Summary;
    const regressions = findRegressions(baseline, summary, OVERALL_DROP, CHECK_DROP);
    if (regressions.length > 0) {
      for (const r of regressions) {
        console.error(`regression: ${r.what} ${pct(r.baseline)} -> ${pct(r.current)}`);
      }
      process.exit(1);
    }
    console.log("no regression against the baseline");
  }
}

await main();
