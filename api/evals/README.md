# Evals

The parse function turns a free-text food log into structured nutrition data through a forced
tool call. Unit tests check the code around the model; these evals check the model's answers.

Each case is a realistic input with what a good answer looks like. Every check is deterministic,
so a run is cheap, repeatable and needs no second model as judge.

## Run

The provider key comes from the environment and the run stops if it is missing. From `api/`, with
the key in 1Password (any secret manager that sets the variable works):

```sh
ANTHROPIC_API_KEY='op://Your Vault/Anthropic API key/credential' \
  op run -- npm run eval -- --provider claude
```

| Flag | |
|---|---|
| `--provider claude\|openai\|gemini` | Required. Uses that provider's key: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` or `GEMINI_API_KEY`. |
| `--repeats N` | Runs each case N times (3 by default) to measure consistency. |
| `--case ID` | Runs one case. |
| `--save-baseline` | Writes the run's summary to `baselines/<provider>.json`. |
| `--compare` | Exits 1 if the run falls below the baseline: overall pass rate down more than 5 points, or any check down more than 10. |

Every run writes `results/<timestamp>-<provider>.json` (git-ignored) with each model output and
each check, so a failure can be read afterwards rather than re-run.

## Cases

[`cases.ts`](./cases.ts): 22 inputs, each with a note on what it pins.

- **Exact portions** (eggs, rice, chicken, quinoa, milk…): totals against USDA FoodData Central
  references, the source the system prompt names.
- **Vague portions** ("almonds", "some pasta", "a handful of blueberries"): the prompt requires an
  assumed serving and a warning.
- **Several foods in one line**, **restaurant items**, **composite dishes** and **Spanish input**:
  plausible ranges where there is no single right answer.
- **Not food**, including an input that tries to override the system prompt: must come back as the
  rejection the prompt describes.

## Checks

[`score.ts`](./score.ts), unit-tested in [`score.test.ts`](./score.test.ts).

| Check | Passes when |
|---|---|
| `schema` | Every item has a description and finite, non-negative numbers. Later checks run only if this passes. |
| `rounding` | Whole-number calories, grams to at most one decimal, as the prompt asks. |
| `meal_label` | One to four words. |
| `energy` | Each item's calories agree with its macros (4 / 4 / 9 kcal per gram) within 20%. Catches answers that are internally inconsistent without needing a reference. |
| `item_count` | The number of items is in the expected range. |
| `calories` | The total is within 20% of the reference, or inside the range. |
| `macros` | Each reference macro is within 25%, or 3 g, whichever is larger. |
| `warning` | A warning is present when the portion was assumed, and absent when it was given. |
| `mentions` | Each food named in the input shows up in some item. |
| `not_food` | Exactly one "Not a food item" entry, all zeros, with a warning. |

## Baseline

`baselines/claude.json`, from the first run on 2026-11-08 (Claude Haiku 4.5, 3 repeats): 63 of 66
runs passed every check (95.5%). All failures were calorie totals:

- `salmon-3oz` passed one run in three. One answer gave 280 kcal and 22 g of fat for 3 oz, about
  60% above USDA; totals varied 20% across runs.
- `breakfast-combo` passed two in three. One answer put toast with 2 tbsp of peanut butter at
  375 kcal, where bread and peanut butter add up to about 270.

## Limits

- The energy check assumes no alcohol (7 kcal per gram), so there are no alcohol cases.
- References are USDA figures for a standard version of each food; brands and recipes differ, which
  is why the tolerances are wide.
