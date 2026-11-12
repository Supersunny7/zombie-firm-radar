# Implementation Plan: rescue-engine

## Overview

Build the pure TypeScript rescue-engine in `web/src/engine` bottom-up, following `design.md`: errors and types, the shared `icr()`, the Treatment parser and tool registry, state-machine integration, input validation and diagnosis, treatment application and refinance, the PRNG and seed hash, path projection and `simulate`, the drawn outcome with the hint scan, score and liquidation, cross-cutting properties, the Web Worker client, and finally the public entry, purity scan, steering update, review and commit.

Every task and sub-task is required. Every Correctness Property in the design has its own fast-check property-test sub-task with `numRuns >= 100`, tagged in the file with `// Feature: rescue-engine, Property N: <title>` and `// **Validates: Requirements X.Y**`.

All commands run from `web` in PowerShell, chained with `;`.

**Counterexample rule (applies to every property-test sub-task):** if fast-check finds a counterexample, stop and report it to the user with the fast-check seed, path and shrunk inputs. Do not weaken the property, add a filter, widen a tolerance, or remove refinance from a generator. This applies in particular to Property 11 (RR-1) and Property 13 (RR-4) with refinance in the treatment.

## Tasks

- [x] 1. Engine foundations: errors, types and the shared icr()
  - [x] 1.1 Create `web/src/engine/errors.ts`, `web/src/engine/types.ts` and `web/src/engine/test/geq.ts`
    - `errors.ts`: `EngineErrorCode` (all 14 codes), `InputName`, `EngineError` with `code`, `message`, optional `detail` (`tool`, `param`, `index`, `inputs`, `value`), `EngineResult<T>`, and one constructor per code that builds a plain-sentence message (for example "Rate shock must be between 0 and 0.05.", "Not rescuable: missing revenue and equity for FY2024.")
    - `types.ts`: `V1ToolName`, `ToolChoice` (discriminated `{ name, params }` union), `Treatment`, `PainMeters`, `CoverageView`, `RefinanceInfo`, `PostState`, `Diagnosis`, `SimulateOptions`, `SimulationResult` (with the literal `constantDebtNote`), `OutcomeYear`, `Hint`, `Outcome`, as listed in the design's Data Models section
    - `test/geq.ts`: the relative-tolerance `geq(a, b, relTol)` helper from the design
    - No React, three.js, clock or `Math.random`; no top-level `let`/`var`
    - _Requirements: 2.1, 2.3, 3.1, 8.14, 8.15, 15.5_

  - [x] 1.2 Implement `web/src/engine/icr.ts`
    - `icr(ebit, interest)` exactly as in the design: null for non-number or NaN ebit, null for non-finite or non-positive interest, otherwise `ebit / interest`; never throws
    - This is the only coverage division in the engine
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 1.3 Write property test for the icr contract in `web/src/engine/icr.contract.property.test.ts`
    - **Property 1: icr contract**
    - Draw ebit and interest from finite numbers, null, undefined, NaN and ±Infinity; compare with `Object.is`; `numRuns >= 100`
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4**

  - [x] 1.4 Write property test for icr monotonicity in `web/src/engine/icr.monotone.property.test.ts`
    - **Property 2: icr is monotone in EBIT**
    - interest > 0, finite a <= b, exact comparison; `numRuns >= 100`
    - **Validates: Requirements 1.8**

  - [x] 1.5 Implement the golden-cases runner: `web/src/engine/test/goldenCases.ts`, `web/src/engine/icr.golden.test.ts`, `web/src/engine/test/goldenCases.unit.test.ts`
    - `goldenCases.ts`: parse helper that accepts only `{ "cases": [{ "ebit": number|null, "interest": number|null, "expected": number|null, "note"?: string }] }` (format proposed, to confirm with partner); any other shape, a missing field, a wrongly typed field or invalid JSON throws an error naming the file path and the case index
    - `icr.golden.test.ts`: resolve `data/fixtures/icr_cases.json` relative to the test file; `it.skipIf(!existsSync(path))` so a missing file is reported as skipped and does not fail; when present, run every case through `icr` with absolute tolerance 1e-9 and require an expected null to be returned as null
    - `goldenCases.unit.test.ts`: the parse helper rejects invalid JSON and an unrunnable case, and the error names the file and the case index
    - Read-only: do not create or edit anything under `/data`
    - _Requirements: 1.6, 1.7, 1.9_

- [x] 2. Tool registry and Treatment parser
  - [x] 2.1 Implement the frozen tool registry in `web/src/engine/tools.ts`
    - `ToolStatus`, `ToolSpec`, `TOOL_REGISTRY` with the four v1 tools (cut_costs c in [0, 0.08], sell_assets s in [0, 0.30], debt_for_equity w in [0, 0.60], refinance with no params) and the extension points issue_equity, chapter_11 and liquidate, each with its `order`
    - Freeze the registry (constant, not mutable state)
    - _Requirements: 2.5, 2.6_

  - [x] 2.2 Implement `web/src/engine/treatment.ts`
    - `parseTreatment(input: unknown): EngineResult<Treatment>` with the fixed check order of Req 3.11: non-array → `invalid_treatment`; > 3 entries → `too_many_tools`; per entry in input order, not a plain object or non-string name → `invalid_treatment` with `detail.index`, non-v1 name (including extension tools) → `unknown_tool` with `detail.tool`; first duplicate in input order → `duplicate_tool`; per entry, parameter violation (missing key, extra key, non-number, NaN, ±Infinity, out of inclusive range, any key on refinance) → `param_out_of_range` with `detail.tool` and `detail.param`
    - No clamping; never mutate the input; return fresh objects in Canonical_Order; normalise `-0` to `0`; accept refinance with `params` absent or `{}`; accept the empty Treatment
    - `serialiseTreatment` (canonical order, sorted keys, `String(n)`, `;` between tools, `,key=value` per param) and `deserialiseTreatment` (split, build `{ name, params }`, call `parseTreatment`)
    - _Requirements: 2.6, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11, 3.15, 10.3_

  - [x] 2.3 Create `web/src/engine/test/engineArbitraries.ts` with the treatment generators
    - `arbTreatment`: `fc.shuffledSubarray` of the four v1 tools, length 0 to 3, parameters over their full inclusive ranges with endpoints as constants, result shuffled (random click order)
    - `arbBadTreatment`: one or more corruptions on top of a valid Treatment (unknown or extension tool name, 4 to 6 tools, duplicate name, out-of-range, NaN, ±Infinity, non-number, missing or extra param key, any key on refinance, non-array, malformed entry)
    - _Requirements: 3.11, 13.10_

  - [x] 2.4 Write unit tests for the parser and registry in `web/src/engine/treatment.unit.test.ts`
    - One test per parser error code with its exact code, message and detail; empty Treatment accepted; refinance with absent params and with `{}` accepted; any key on refinance rejected; endpoints 0 and max accepted; canonical order returned for a reversed input; `-0` normalised; input deeply equal to a `structuredClone` taken before the call
    - Registry: extension tools are registered with status `extension` and rejected by the parser with `unknown_tool` naming the tool
    - Serialisation examples from the design: `""`, `"cut_costs,c=0.05;refinance"`, `"sell_assets,s=0.2;debt_for_equity,w=0.3"`
    - _Requirements: 2.5, 2.6, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.15, 10.3_

  - [x] 2.5 Write property test for treatment rejection in `web/src/engine/treatment.reject.property.test.ts`
    - **Property 3: The parser rejects invalid treatments with one deterministic error**
    - Use `arbBadTreatment`; compute the expected code with an independent reference classifier written inside the test; assert the offending tool or index in `detail`, deeply equal errors on two calls, and an unmodified input; `numRuns >= 100`
    - The `applyTreatment`, `simulate` and `drawOutcome` part of this property is added in task 10.6, once those functions exist
    - **Validates: Requirements 2.6, 3.3, 3.4, 3.5, 3.6, 3.8, 3.11, 3.15, 4.12, 6.10, 9.10**

  - [x] 2.6 Write property test for the serialisation round trip in `web/src/engine/treatment.roundtrip.property.test.ts`
    - **Property 5: Treatment serialisation round trip**
    - `deserialiseTreatment(serialiseTreatment(t))` deeply equals `parseTreatment(t).value` for any valid Treatment in any click order; `numRuns >= 100`
    - **Validates: Requirements 3.14, 10.3**

- [x] 3. State-machine integration
  - [x] 3.1 Replace the placeholder types and delegate parsing in `web/src/state/types.ts` and `web/src/state/machine.ts`
    - `types.ts`: remove the placeholder `ToolChoice` and `Treatment`; `export type { ToolChoice, Treatment } from '../engine/types';` (switch to `'../engine'` once task 14.1 creates the entry, if that keeps the build green)
    - `machine.ts`: `parseTreatment` delegates to the engine parser and maps an EngineError to `{ ok: false, reason: error.message }`; keep `MAX_TOOLS` exported; remove the unused `ToolChoice` import; store the canonical Treatment
    - Do not change any assertion in the existing state-machine tests
    - _Requirements: 3.1, 3.2, 3.12_

  - [x] 3.2 Update `web/src/test/arbitraries.ts` to generate real Treatments
    - `arbTreatment` reuses the engine generator from `web/src/engine/test/engineArbitraries.ts`; the junk generator keeps arbitrary `{ name, params }` tools under the name `arbRawTool` for 4 to 6 tool arrays
    - Keep every exported name used by the existing state tests
    - _Requirements: 3.12, 3.13_

  - [x] 3.3 Write property test for machine delegation in `web/src/state/machine.delegation.property.test.ts`
    - **Property 4: The state machine delegates treatment parsing**
    - Inputs: valid treatments, corrupted treatments and arbitrary junk; the machine returns `ok: true` with the engine value exactly when the engine accepts, else `ok: false` with `reason` equal to the engine error message; `numRuns >= 100`
    - **Validates: Requirements 3.2**

- [x] 4. Checkpoint: parser and state integration
  - From `web`, run `pnpm typecheck; pnpm lint; pnpm format; pnpm test`. All existing state-machine tests must pass with unchanged assertions. Ensure all tests pass, ask the user if questions arise.

- [x] 5. Input validation and diagnosis
  - [x] 5.1 Implement `prepare` in `web/src/engine/inputs.ts`
    - Steps in the design order: delta finite in [0, 0.05] else `delta_out_of_range` (no clamping); empty `years` → `not_rescuable`; latest year = highest `fy` (not assumed sorted); every null or non-finite R, E, I, D, A, Q named in `detail.inputs` in that order; then D <= 0, R <= 0, I <= 0 each named; then b = `macro.dgs10.value` not finite or < 0 → `not_rescuable` naming `b`
    - `r = I / D`; kappa = 0.3; sigma = clamp(margin_change_sd, 0.01, 0.08); g = clamp(revenue_growth_median, -0.15, 0.15); never read `margin_change_mean`
    - Never throw; never mutate firm or macro
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 4.11, 4.12, 4.13, 4.14, 14.8_

  - [x] 5.2 Add firm, macro and delta generators to `web/src/engine/test/engineArbitraries.ts`
    - `arbValidFirm` (1 to 5 years with shuffled `fy`, the domains in the design table, E may be <= 0, Q may be <= 0, A large enough to clear debt), `arbMacroValid` (b in [0, 0.08]), `arbDelta` ([0, 0.05] plus the constants 0 and 0.05)
    - `arbBadFirm`, `arbBadDelta`, `arbBadMacro`, each labelled with the expected error code and named inputs
    - _Requirements: 13.10, 14.5_

  - [x] 5.3 Implement `diagnose` and `belowCoverageFor` in `web/src/engine/diagnose.ts`
    - `shockedIcr = icr(E, D * (r + delta))`; `neededEbitIncrease = D * (r + delta) / E - 1` and `neededDebtCut = 1 - shockedIcr` when E > 0, both null when E <= 0; `neededRate = E / D`; `belowCoverage = belowCoverageFor(neededEbitIncrease)` with `x === null || x > 0`; `summary` text for both cases
    - Validation through `prepare`; returns its EngineError unchanged
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.8, 5.9, 14.2_

  - [x] 5.4 Write property test for the diagnosis formulas in `web/src/engine/diagnose.formulas.property.test.ts`
    - **Property 9: Diagnosis formulas**
    - Compare against the reference formulas with relative tolerance 1e-12 via `geq` in both directions; E <= 0 gives nulls; `belowCoverage` matches the rule; `numRuns >= 100`
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.8, 14.2**

  - [x] 5.5 Write unit tests for inputs and diagnosis in `web/src/engine/inputs.unit.test.ts` and `web/src/engine/diagnose.unit.test.ts`
    - `prepare`: each `not_rescuable` cause with the exact `detail.inputs` (several nulls named together; D = 0; D < 0; R <= 0; I <= 0; empty years; b NaN, Infinity, negative); firm defect reported before a b defect; `delta_out_of_range` for -0.01, 0.0500001, NaN without clamping; unsorted years pick the highest `fy`; sigma and g clamps at both ends; D = 0 before treatment is `not_rescuable` and never debt-free
    - `diagnose`: E <= 0 gives null needed EBIT increase and null needed debt cut but still returns `shockedIcr` and `neededRate`; `belowCoverageFor` with 0, -0, 1e-16 and null
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.11, 4.13, 4.14, 5.4, 5.8, 14.2, 14.8, 15.5_

- [x] 6. Treatment application and refinance
  - [x] 6.1 Implement `web/src/engine/refinance.ts`
    - `spreadFor(icrPre)` tiers (negative counts as < 1); `refinanceApplies(oldRate, newRate)` as the strict test `1.02 * newRate < oldRate`
    - `evaluateRefinance(inputs, E', D'pre)`: D'pre = 0 → not applied, note "No debt remains to refinance.", no fee; otherwise `icrPre = icr(E', D'pre * oldRate)`, spread, `newRate = b + delta + spread`; applied → `effRate = 1.02 * newRate`, `debtShown = D'pre * 1.02`, `rateShown = newRate`; not applied → `effRate = oldRate`, `debtShown = D'pre`, `rateShown = oldRate`; always `interest = D'pre * effRate`; notes with old and new rates to 2 decimals and the 2% fee, as in the design
    - _Requirements: 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8_

  - [x] 6.2 Implement `applyCore` and `applyTreatment` in `web/src/engine/apply.ts`
    - `applyCore(inputs, treatment, recovery)` in Canonical_Order: cut_costs (`E' = E + c * (R - E)`, `growthCut = 0.5 * c`, workers), sell_assets (`sale = s * A * recovery`, `D' = Math.max(0, D' - sale)`, R' and E' times `(1 - s)`, workers), debt_for_equity (`converted = w * D'`, `D' = D' - converted`, keep with the `q + converted === 0 ? 1` guard, shareholders, creditors), refinance last via `evaluateRefinance`; pains clamped with `Math.min(100, Math.max(0, x))`
    - `debtFree = debtPreFee === 0`; `year0` as a `CoverageView` from `icr(E', interest)` or debt-free; `coverageText` "debt-free" or `fix2`
    - `applyTreatment(firm, treatment, delta, macro)` = validate in Validation_Order (delta, treatment, firm, b) + `applyCore(inputs, canonical, 0.7)`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 6.10, 7.1, 7.9, 14.1, 14.3, 14.4, 14.6, 14.7, 14.9_

  - [x] 6.3 Write property test for refinance cost in `web/src/engine/refinance.cost.property.test.ts`
    - **Property 16: Refinance never raises annual interest cost (RR-7, amended)**
    - Treatments always contain refinance; assert `applied === (1.02 * newRate < oldRate)` when D'pre > 0, the rate, effRate and debt rules for both branches, `interest <= debtPreFee * oldRate` exactly, and no change and no fee when D'pre = 0; `numRuns >= 100`; apply the counterexample rule
    - **Validates: Requirements 7.5, 7.6, 7.7, 7.8, 13.8**

  - [x] 6.4 Write property test for RR-3 in `web/src/engine/apply.rr3.property.test.ts`
    - **Property 10: No treatment and no shock leave coverage unchanged (RR-3)**
    - Empty Treatment, delta = 0: `applyTreatment(...).year0.icr` and `diagnose(...).shockedIcr` equal `icr(E, I)` within relative 1e-12; `numRuns >= 100`
    - **Validates: Requirements 5.6, 13.4**

  - [x] 6.5 Write the Ashgrove worked example unit tests in `web/src/engine/ashgrove.unit.test.ts`
    - Use `ashgroveWorks` and `fixtureMacro` from `web/src/dev/fixtures` (read-only) and delta = 0.01; write expected values as arithmetic expressions and compare with relative tolerance 1e-9 (stricter than the required 1e-6) with messages that show expected and actual
    - Diagnosis: shocked ICR within 0.005 of 0.5315 (0.53), needed EBIT increase within 0.005 of 0.882, needed debt cut within 0.005 of 0.469, needed rate within 0.0005 of 0.0362
    - Empty Treatment: R, E, D equal the original latest-year values; pains 0, 0, 0
    - cut_costs c = 0.05: E' = `38e6 + 0.05 * (1.2e9 - 38e6)`, R' = 1.2e9, D' = 1.05e9, workers = 31.25
    - sell_assets s = 0.2: D' = `1.05e9 - 0.2 * 1.6e9 * 0.7`, R' = `1.2e9 * 0.8`, E' = `38e6 * 0.8`, workers = `(0.2 / 0.3) * 35`
    - debt_for_equity w = 0.3: D' = `1.05e9 - 0.3 * 1.05e9`, keep = `140 / 455`, shareholders = `(1 - 140 / 455) * 100`, creditors = 18
    - Refinance not applying on real Ashgrove (refinance alone): icr_pre ≈ 0.5315, spread 0.09, newRate 0.142, `1.02 * 0.142 >= 0.0680952381`, rate unchanged, displayed debt equals D'_preFee; a comment records that refinance can never apply to Ashgrove because `1.02 * b + 1.02 * spread + 0.02 * delta >= 0.06324 > r = 0.05810`
    - Refinance applying on the Ashgrove_Variant (I = 120e6, everything else unchanged), treatment cut_costs 0.08 + debt_for_equity 0.6 + refinance: icr_pre = `130.96e6 / (420e6 * (120 / 1050 + 0.01))`, spread 0.035, newRate 0.087, `1.02 * 0.087 < 120 / 1050 + 0.01`, displayed debt `420e6 * 1.02`, displayed rate 0.087, interest `420e6 * (1.02 * 0.087)`, year-0 ICR `130.96e6 / (420e6 * 0.08874)`, keep `140 / 770`, pains 50, `(1 - 140 / 770) * 100`, 36; the same variant with refinance alone does not apply
    - Exact boundary: `refinanceApplies(1.02 * x, x)` returns false for several x, including 0.087 and 0.142
    - _Requirements: 5.7, 6.11, 7.5, 7.6, 15.1, 15.2, 15.3, 15.4, 15.9_

  - [x] 6.6 Write edge-case unit tests for apply and refinance in `web/src/engine/apply.unit.test.ts`
    - Spread tiers at icr_pre = -1, 0.999, 1, 1.499, 1.5, 2.999, 3
    - D' = 0 when refinance runs: note "No debt remains to refinance.", no fee, state unchanged
    - Sale proceeds above D: D' = 0, `debtFree` true, `coverageText` "debt-free", no Infinity or NaN in display fields
    - Q <= 0: keep = 0 with converted > 0, keep = 1 and 0 shareholders pain with converted = 0
    - s = 0.30: R' = `0.7 * R_prev`, E' = `0.7 * E_prev` after cut_costs
    - Click order: a reversed Treatment gives a deeply equal PostState and Refinance_Note
    - _Requirements: 6.7, 7.3, 7.7, 7.9, 14.1, 14.3, 14.4, 14.7, 14.9, 15.5_

- [x] 7. Randomness and seed derivation
  - [x] 7.1 Implement `web/src/engine/rng.ts`
    - `mulberry32(seed)` as the TypeScript port in the design (state in a closure, `| 0` reduction); `drawBlock(next)` drawing exactly 6 uniforms in the fixed order (recovery, haircut, then Box-Muller from u2..u5 using `1 - u`); `blocksFor(seed, n)` with a test-only seam (for example an optional generator factory parameter) so a property can count uniforms without changing the public `simulate` signature
    - _Requirements: 8.3, 8.4_

  - [x] 7.2 Implement `web/src/engine/hash.ts`
    - `fnv1a32(s)` over UTF-8 bytes; `isValidIsoDate` with arithmetic Gregorian leap-year rules (no `new Date`); `seedFrom(cik, treatment, isoDate)` checking treatment, then cik (`^\d{10}$` string, else `invalid_cik`), then date (`invalid_date`), and returning `fnv1a32(`${cik}|${serialiseTreatment(canonical)}|${isoDate}`)`
    - _Requirements: 9.9, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.9_

  - [x] 7.3 Add randomness and option generators to `web/src/engine/test/engineArbitraries.ts`
    - `arbBlock` (recovery [0.6, 0.8], haircut [0.3, 0.6], eps each in [-6.7, 6.7]), `arbSeed` ([0, 4294967295]), `arbIsoDate` (valid dates 1900-01-01 to 2199-12-31), `arbCik` (10 digits)
    - `arbBadPaths`, `arbBadSeed` (non-integer, negative, > 4294967295, non-number), `arbBadCik`, `arbBadDate` (wrong format, month 00 or 13, day 00, day 31 in a 30-day month, 29 February in a non-leap year), each labelled with its expected code
    - _Requirements: 8.13, 8.16, 9.12, 10.5, 10.9, 13.10_

  - [x] 7.4 Write unit tests for the PRNG in `web/src/engine/rng.unit.test.ts`
    - Mulberry32 vectors for seed 42: compute the first 5 outputs once by running the implementation (for example a temporary `console.log` in a test run, removed afterwards) and pin the printed values in the test; do not invent or hand-type numbers that were not produced this way
    - In the same test, cross-check the 5 pinned values against an independent second implementation written inside the test with `BigInt` uint32 arithmetic; assert a repeated call returns identical values
    - `drawBlock` calls `next` exactly 6 times; recovery and haircut lie in their ranges; a generator returning `1 - 2 ** -32` gives finite eps
    - _Requirements: 8.3, 8.4, 15.6_

  - [x] 7.5 Write unit tests for the hash and seed in `web/src/engine/hash.unit.test.ts`
    - Published FNV-1a vectors: `fnv1a32("") = 0x811c9dc5`, `fnv1a32("a") = 0xe40c292c`, `fnv1a32("foobar") = 0xbf9cf968`, each asserted twice
    - `seedFrom('9000000001', [{ name: 'cut_costs', params: { c: 0.05 } }], '2025-02-20')`: compute once by running the code, pin the value, and cross-check it inside the test against an FNV-1a implementation written in the test over the expected input string `9000000001|cut_costs,c=0.05|2025-02-20`; assert twice
    - Distinct seeds when only the cik, only a tool parameter, only the tool set, or only the date differs
    - `2025-02-30` and `2023-02-29` give `invalid_date`; `2024-02-29` is accepted; a 9-digit cik gives `invalid_cik`; an invalid treatment wins over a bad cik, and a bad cik wins over a bad date
    - _Requirements: 10.1, 10.2, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9, 15.6_

  - [x] 7.6 Write property test for seedFrom in `web/src/engine/hash.seedFrom.property.test.ts`
    - **Property 23: seedFrom output and date validation**
    - Valid inputs equal `fnv1a32(cik + "|" + serialiseTreatment(t) + "|" + date)` and lie in [0, 4294967295]; bad dates give `invalid_date`, bad ciks give `invalid_cik`, and several defects follow treatment, cik, isoDate; `numRuns >= 100`
    - **Validates: Requirements 10.1, 10.2, 10.4, 10.5, 10.9**

- [x] 8. Path projection and Monte Carlo simulation
  - [x] 8.1 Implement `projectPath` in `web/src/engine/project.ts`
    - `m_0 = E' / R'`; for t = 1..3 the margin recursion with kappa and sigma; `R_t = R_{t-1} * (1 + g - growthCut)`; `EBIT_t = m_t * R_t`; `ICR_t = post.debtFree ? Infinity : icr(EBIT_t, post.interest)`; debt constant
    - _Requirements: 8.5, 8.6, 8.7, 8.8_

  - [x] 8.2 Implement `simulate` and `median` in `web/src/engine/simulate.ts`
    - Validation_Order: delta, treatment, firm, b, then `paths` (default 1000, integer in [1, 100000], else `invalid_paths`) and `seed` (integer in [0, 4294967295] without coercion, else `invalid_seed`); no path runs on error
    - `blocksFor(seed, paths)`; compute `post` once with recovery 0.7 when sell_assets is absent, else per block; survival odds; medians from a sorted `Float64Array` (even count averages the middle two); `debtFree`, `debtFreeShare`, `post` for display, `constantDebtNote`; map Infinity to `CoverageView { icr: null, debtFree: true }`
    - _Requirements: 8.1, 8.2, 8.5, 8.7, 8.8, 8.9, 8.10, 8.11, 8.12, 8.13, 8.14, 8.15, 8.16, 12.16_

  - [x] 8.3 Add `arbRr2Case` to `web/src/engine/test/engineArbitraries.ts`
    - The RR-2 domain of Req 13.3: firm, macro, delta, block with eps in [-4, 4], and a base treatment drawn from sell_assets, debt_for_equity and refinance (its cut_costs is set by the property)
    - _Requirements: 13.3_

  - [x] 8.4 Write property test for RR-1 in `web/src/engine/rr1.property.test.ts`
    - **Property 11: Debt-for-equity never worsens coverage on the same path (RR-1, amended)**
    - Base T without debt_for_equity (cut_costs, sell_assets and refinance allowed; refinance never filtered out), `with = T + debt_for_equity(w)`, same `arbBlock` object for both; part 1 exact `>=` for years with EBIT_t >= 0; part 2 a Covered_Year stays covered for any sign; `numRuns >= 100`
    - If fast-check finds a counterexample, stop and report it to the user with seed and shrunk inputs; do not weaken the property or exclude refinance
    - **Validates: Requirements 13.1, 13.2, 13.11**

  - [x] 8.5 Write property test for RR-2 in `web/src/engine/rr2.property.test.ts`
    - **Property 12: A larger cost cut never lowers year-1 coverage (RR-2, on the RR-2 domain)**
    - Use `arbRr2Case` and 0 <= c1 <= c2 <= 0.08 on the same block; assert the precondition `0.7 * (1 - m_b) * (1 + g - 0.04) >= 0.5 * m_1(c = 0.08)` with `expect(...).toBe(true)` for every case (never a filter); `geq(EBIT_1(c2), EBIT_1(c1), 1e-12)`; when `EBIT_1(c1) >= 0`, `geq(ICR_1(c2), ICR_1(c1), 1e-12)`; `numRuns >= 100`; apply the counterexample rule
    - **Validates: Requirements 13.3**

  - [x] 8.6 Write property test for RR-4 in `web/src/engine/rr4.property.test.ts`
    - **Property 13: A higher rate shock never gives higher survival odds (RR-4)**
    - Any valid firm, Treatment (refinance included, never filtered), seed, `paths` in [1, 200], 0 <= d1 <= d2 <= 0.05; exact `<=`; `numRuns >= 100`
    - If fast-check finds a counterexample, stop and report it to the user with seed and shrunk inputs; do not weaken the property or exclude refinance
    - **Validates: Requirements 13.5**

  - [x] 8.7 Write property test for the fixed random block in `web/src/engine/rng.block.property.test.ts`
    - **Property 19: Fixed random block per path**
    - `blocksFor(seed, n)` deeply equals the first n entries of `blocksFor(seed, n + m)` for n, m in [1, 50]; `drawBlock` calls `next` 6 times; `simulate` with any Treatment and `paths = n` consumes exactly 6n uniforms, counted through the test-only seam; `numRuns >= 100`
    - **Validates: Requirements 8.2, 8.4**

  - [x] 8.8 Write unit tests for simulate and the named counterexamples in `web/src/engine/simulate.unit.test.ts` and `web/src/engine/rr.counterexamples.unit.test.ts`
    - `simulate.unit.test.ts`: omitted `paths` runs exactly 1000 paths; `constantDebtNote` present; the reuse-post optimisation equals a naive per-block recompute for treatments with and without sell_assets; median of [1, 3, 2, 10] = 2.5 and of [1, Infinity] = Infinity; `invalid_paths` for 0, 1.5, 100001; `invalid_seed` for -1, 1.5, 4294967296 and a string with no coercion; a debt-free treatment gives `debtFree` true and survival odds 1
    - `rr.counterexamples.unit.test.ts`: a test named exactly "RR-1 negative-EBIT counterexample" (EBIT_t = -10, interest 100 → 50, ICR_t -0.1 → -0.2 via `icr`), and a test named exactly "RR-2 high-margin trade-off" (E/R = 0.9, margin_mean = 0.9, eps1 = 0, g = 0.01, no other tools; year-1 EBIT `0.909 * R` at c = 0 and `0.878432 * R` at c = 0.08, relative tolerance 1e-9)
    - _Requirements: 8.1, 8.8, 8.10, 8.13, 8.15, 8.16, 13.12, 13.13, 14.9, 15.5_

- [x] 9. Checkpoint: core maths and simulation
  - From `web`, run `pnpm typecheck; pnpm lint; pnpm format; pnpm test`. Ensure all tests pass, ask the user if questions arise.

- [x] 10. Drawn outcome, failure message and hint
  - [x] 10.1 Implement `web/src/engine/outcome.ts`
    - `drawOutcome(firm, treatment, delta, macro, seed)`: Validation_Order (delta, treatment, firm, b, seed with the `invalid_seed` rule); `block = blocksFor(seed, 1)[0]`; `applyCore` with the block recovery; `projectPath`; `failingYear` = smallest t with ICR_t < 1; `rescued`
    - `failureMessage` "Year {t}: operating margin {m}%, coverage {icr}. {name} stays undead." with `pct1`, `fix2` and the `-0` clean-up
    - `hintScan`: `K = Math.floor((0.08 - c0) / 0.001 + 1e-9)`, upward scan k = 1..K of `c = Math.min(0.08, c0 + k / 1000)` on the full pipeline (`withCut` in an internal shape with no 3-tool cap) and the same block; stop at the first ICR_t* >= 1; text "What it would take: an extra cost cut of X percentage points …" with cut_costs present and "… a cost cut of X percentage points …" without, X = `(k / 10).toFixed(1)`; null when none works; never "should", "recommend" or "advise"
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.10, 9.11, 9.12, 12.16_

  - [x] 10.2 Write unit tests for the outcome in `web/src/engine/outcome.unit.test.ts`
    - A constructed failing case where the scan finds k, asserting `extraCut`, `totalCut` and text; a case with no hint; c0 = 0.08 (K = 0, no hint); a 3-tool Treatment without cut_costs that still gets a hint worded as a cost cut
    - Failure message format for a constructed path; margin -0.04% printed as "0.0"
    - `drawOutcome` path equals path 0 of `simulate` with the same seed and treatment; `invalid_seed` without coercion; `seedFrom` + `drawOutcome` gives deeply equal Outcomes on repeated calls
    - _Requirements: 9.4, 9.5, 9.6, 9.7, 9.9, 9.11, 9.12, 15.5_

  - [x] 10.3 Write property test for outcome consistency in `web/src/engine/outcome.wording.property.test.ts`
    - **Property 21: Outcome consistency and wording**
    - `rescued` iff every year covered; null fields when rescued; otherwise smallest failing year and the message regex from the design with that year's values and the firm name; no "should", "recommend" or "advise" (case-insensitive); `numRuns >= 100`
    - **Validates: Requirements 9.2, 9.3, 9.4, 9.8**

  - [x] 10.4 Write property test for the hint scan in `web/src/engine/outcome.hint.property.test.ts`
    - **Property 22: The hint is the smallest working extra cut on the grid**
    - With f evaluated on the drawn block: hint present → `extraCut = k / 1000` with integer k >= 1, `totalCut <= 0.08`, `f(totalCut) >= 1`, `f(c0 + j / 1000) < 1` for j < k; hint null → no grid point up to K works; text states `(k / 10).toFixed(1)` with the right wording; the generator includes 3-tool treatments without cut_costs; `numRuns >= 100`
    - **Validates: Requirements 9.5, 9.6, 9.7, 9.11**

  - [x] 10.5 Write property test for core composition in `web/src/engine/core.composition.property.test.ts`
    - **Property 20: Simulation and outcome are built from the core functions**
    - `paths` in [1, 200]; survival odds equal the covered share computed from `blocksFor`, `applyCore` and `projectPath`; `drawOutcome` years, margins and coverage match block 0; `numRuns >= 100`
    - **Validates: Requirements 8.5, 8.9, 9.1**

  - [x] 10.6 Extend the Property 3 test in `web/src/engine/treatment.reject.property.test.ts`
    - **Property 3: The parser rejects invalid treatments with one deterministic error** (completion)
    - Inside the same property, assert that `applyTreatment`, `simulate` and `drawOutcome` return the same error as `parseTreatment` for the same invalid treatment with otherwise valid arguments, and leave firm and macro deeply equal to clones; `numRuns >= 100`
    - **Validates: Requirements 2.6, 3.3, 3.4, 3.5, 3.6, 3.8, 3.11, 3.15, 4.12, 6.10, 9.10**

- [x] 11. Score and liquidation
  - [x] 11.1 Implement `web/src/engine/score.ts` and `web/src/engine/liquidation.ts`
    - `score({ rescued, survivalOdds, pain })` with `clamp(x, lo, hi) = x >= lo ? (x <= hi ? x : hi) : lo` on odds and each pain (NaN maps to `lo`)
    - `liquidationRecovery(A, D)`: `!(D > 0)` → 1; else `Math.min(1, 0.5 * Math.max(0, A) / D)` with NaN A as 0; `centsOnDollar = Math.round(recovery * 100)`
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8_

  - [x] 11.2 Write property test for liquidation in `web/src/engine/liquidation.property.test.ts`
    - **Property 14: Liquidation recovery is bounded (RR-5)**
    - A >= 0 (including 0 and very large values), D > 0; recovery equals `Math.min(1, 0.5 * A / D)` and lies in [0, 1]; `centsOnDollar` is an integer in [0, 100] equal to `Math.round(recovery * 100)`; `numRuns >= 100`
    - **Validates: Requirements 11.5, 11.6, 11.8, 13.6**

  - [x] 11.3 Write property test for the score in `web/src/engine/score.property.test.ts`
    - **Property 24: Score formula and bounds**
    - Odds and pains from finite numbers in and out of range and NaN; result equals the clamped formula, lies in [0, 100], and is 0 when not rescued; `numRuns >= 100`
    - **Validates: Requirements 11.1, 11.2, 11.3, 11.4**

  - [x] 11.4 Write unit tests for score and liquidation in `web/src/engine/score.unit.test.ts`
    - Score for a hand-computed case; `rescued = false` gives 0; out-of-range inputs are clamped
    - Liquidation: D = 0 gives recovery 1 and 100 cents; Ashgrove `0.5 * 1.6e9 / 1.05e9`; a value stored just below .5 (for example 0.285) rounds to 28
    - _Requirements: 11.1, 11.3, 11.4, 11.5, 11.7, 11.8_

- [x] 12. Cross-cutting engine properties
  - [x] 12.1 Write property test for click order in `web/src/engine/clickOrder.property.test.ts`
    - **Property 6: Click order never matters**
    - Any valid Treatment and any permutation: `parseTreatment`, `applyTreatment` (including the Refinance_Note), `simulate` (`paths` in [1, 200]), `drawOutcome` and `seedFrom` return deeply equal results; `numRuns >= 100`
    - **Validates: Requirements 3.9, 6.1, 7.1, 7.9, 10.6**

  - [x] 12.2 Write property test for validation order in `web/src/engine/validation.property.test.ts`
    - **Property 7: Invalid inputs give one typed error in Validation_Order**
    - Inject one or more defects from `arbBadDelta`, `arbBadTreatment`, `arbBadFirm`, `arbBadMacro`, `arbBadPaths`, `arbBadSeed`; each of `diagnose`, `applyTreatment`, `simulate`, `drawOutcome` returns the first defect's error in the order delta, treatment, firm, b, paths, seed with exactly the named inputs; never throws; runs no path; firm and macro deeply equal to clones; no clamping or coercion; `numRuns >= 100`
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.12, 4.13, 4.14, 8.13, 8.16, 9.12, 14.8**

  - [x] 12.3 Write property test for latest-year selection in `web/src/engine/latestYear.property.test.ts`
    - **Property 8: Latest year selection and unused inputs**
    - Shuffling `years` and changing `rescue_inputs.margin_change_mean` to any finite value leave `diagnose`, `applyTreatment`, `simulate` and `drawOutcome` deeply equal; `numRuns >= 100`
    - **Validates: Requirements 4.8, 4.11**

  - [x] 12.4 Write property test for determinism in `web/src/engine/determinism.property.test.ts`
    - **Property 15: The same seed always gives the same outcome (RR-6)**
    - Two calls of `applyTreatment`, `simulate`, `drawOutcome` and `seedFrom` are deeply equal; arguments stay deeply equal to clones; `drawOutcome` with `seedFrom(cik, t, date)` is deeply equal on repeated calls; `numRuns >= 100`
    - **Validates: Requirements 2.4, 8.12, 9.9, 10.7, 13.7**

  - [x] 12.5 Write property test for ranges in `web/src/engine/ranges.property.test.ts`
    - **Property 17: Odds, pain and post-state ranges (RR-8)**
    - Include treatments that drive D' to 0 and firms with Q <= 0 or E <= 0; `survivalOdds` and `debtFreeShare` in [0, 1], pains in [0, 100], `debtPreFee >= 0`, `debt >= 0`, `revenue > 0`, `keep` in [0, 1]; `numRuns >= 100`
    - **Validates: Requirements 6.8, 8.11, 13.9, 14.6**

  - [x] 12.6 Write property test for display safety in `web/src/engine/displaySafety.property.test.ts`
    - **Property 18: No NaN or Infinity in display fields**
    - Walk every number in `Diagnosis`, `PostState`, `SimulationResult` and `Outcome` and require it to be finite; `CoverageView.icr === null` exactly when `debtFree`; D' = 0 gives every year covered, `debtFree` true and `coverageText` "debt-free"; `numRuns >= 100`
    - **Validates: Requirements 8.8, 8.14, 14.1, 14.5, 14.9**

- [x] 13. Web Worker wrapper
  - [x] 13.1 Implement `web/src/engine/worker/protocol.ts` and `web/src/engine/worker/simulate.worker.ts`
    - `SimulateArgs`, `WorkerRequest`, `WorkerResponse` as in the design
    - The worker entry imports only `../simulate` and `./protocol`, runs `simulate` and posts `{ id, ok, result }` or `{ id, ok: false, error }`
    - _Requirements: 12.1, 12.9, 12.16_

  - [x] 13.2 Implement `createSimulationClient` in `web/src/engine/worker/client.ts`
    - `WorkerLike`, `SimulationClient`; injected `createWorker` factory, default `new Worker(new URL('./simulate.worker.ts', import.meta.url), { type: 'module' })` created lazily on the first request only
    - Unique increasing ids; responses settle only the matching request; unknown ids ignored; error responses reject with the plain EngineError
    - Latest-wins per Channel (default `"default"`) with a closure-held `Map`: at most one In_Flight_Request and one Queued_Request; `superseded` for a replaced Queued_Request and for a stale In_Flight_Request when a Queued_Request exists; `aborted` on signal (queued removed, in-flight response ignored but frees the Channel, already-aborted signal never posted, abort after settlement does nothing)
    - `dispose()` terminates once and rejects all pending requests with `worker_disposed`; later requests reject with `worker_disposed` without calling the factory; a worker `error` event behaves like `dispose()`; each promise settles exactly once
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8, 12.11, 12.12, 12.13, 12.14, 12.15_

  - [x] 13.3 Create the fake worker, reference model and `arbWorkerOps`: `web/src/engine/test/fakeWorker.ts`, `web/src/engine/test/workerModel.ts` and `web/src/engine/test/engineArbitraries.ts`
    - `fakeWorker.ts`: an in-process `WorkerLike` that records posted messages and `terminate` calls, lets the test answer by id (ok, error, unknown id), and optionally runs `simulate` through `structuredClone`
    - `workerModel.ts`: a small reference model of the latest-wins rules for Properties 27 and 28
    - `arbWorkerOps` in `engineArbitraries.ts`: 1 to 30 operations (`request` with optional signal, `respond` ok or error for the oldest posted unanswered request, `abort(i)`, `dispose`, `requestAfterDispose`)
    - _Requirements: 12.2, 15.7_

  - [x] 13.4 Write unit tests for the worker client in `web/src/engine/worker/client.unit.test.ts`
    - With the fake worker and no real Worker: a request is posted; a response resolves the matching promise; an error response rejects only its promise with the carried EngineError; an unknown id is ignored and leaves pending requests unchanged
    - Superseded: the latest-wins sequence from the design diagram (B rejected `superseded`, A rejected `superseded`, C2 posted next and resolved)
    - Aborted: a queued request is never posted; an in-flight request rejects at once, its later response is ignored and the queued request is then posted; an already-aborted signal rejects without posting
    - Channels: requests on "a" and "b" never supersede each other
    - Dispose: rejects in-flight and queued requests on every Channel with `worker_disposed` and calls `terminate` once; a later request rejects with `worker_disposed` and does not call the factory; creating a client without a request constructs no worker
    - _Requirements: 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8, 12.12, 12.13, 12.14, 12.15, 15.7_

  - [x] 13.5 Write property test for id matching in `web/src/engine/worker/client.ids.property.test.ts`
    - **Property 25: Worker responses are matched by id**
    - Requests on distinct channels, any permutation of ok or error responses, unknown ids inserted anywhere; each promise settles exactly once with its own response; `numRuns >= 100`
    - **Validates: Requirements 12.4, 12.5, 12.6**

  - [x] 13.6 Write property test for worker equivalence in `web/src/engine/worker/client.equivalence.property.test.ts`
    - **Property 26: The worker gives the same result as a direct call**
    - `paths` in [1, 200]; fake worker passing messages through `structuredClone`; deep equality with a direct `simulate` call; `numRuns >= 100`
    - **Validates: Requirements 12.10**

  - [x] 13.7 Write property test for latest-wins in `web/src/engine/worker/client.latestWins.property.test.ts`
    - **Property 27: Latest-wins per Channel matches a reference model**
    - Run `arbWorkerOps` against the client and `workerModel`; after every step check the six statements of the design (at most one in flight and one queued, supersede rules, abort rules, dispose rules, settle-once and equal settlement); `numRuns >= 100`
    - **Validates: Requirements 12.1, 12.7, 12.8, 12.11, 12.12, 12.13, 12.14**

  - [x] 13.8 Write property test for Channel independence in `web/src/engine/worker/client.channels.property.test.ts`
    - **Property 28: Channels are independent**
    - Two `arbWorkerOps` sequences on "a" and "b", any interleaving without `dispose()`; each Channel's settlements and posted flags equal those of the sequence run alone on a fresh client; `numRuns >= 100`
    - **Validates: Requirements 12.15**

- [x] 14. Public entry, purity, error codes and benchmark
  - [x] 14.1 Create `web/src/engine/index.ts` with the exact export list
    - Runtime exports exactly: `icr`, `diagnose`, `applyTreatment`, `simulate`, `drawOutcome`, `score`, `seedFrom`, `parseTreatment`, `liquidationRecovery`, `createSimulationClient`; `export type * from './types'`; `export type { EngineError, EngineErrorCode, EngineResult } from './errors'`
    - Delete `web/src/engine/.gitkeep`; point `web/src/state/types.ts` and `machine.ts` at `'../engine'` if task 3.1 used a deeper path
    - _Requirements: 2.1, 2.5, 3.1_

  - [x] 14.2 Write the export unit test in `web/src/engine/index.exports.unit.test.ts`
    - `Object.keys(await import('./index')).sort()` equals the sorted expected list, and each symbol resolves without error
    - _Requirements: 2.1_

  - [x] 14.3 Write the purity scan in `web/src/engine/purity.test.ts`
    - Read every `.ts` file under `web/src/engine` (skipping itself) and fail, naming file and line, on: `from`, `import()` or `require()` of `react`, `react-dom`, `three`, `react/*`, `three/*`, `@react-three/*`, or a relative path resolving into `src/scenes`, `src/fx` or `src/ui`; `Math.random`, `Date.now`, `performance.now`, `new Date()` with no arguments; a top-level `let` or `var`
    - Also assert `worker/simulate.worker.ts` imports only `../simulate` and `./protocol`
    - _Requirements: 2.2, 2.3, 12.9, 12.16_

  - [x] 14.4 Write the error-code unit test in `web/src/engine/errors.unit.test.ts`
    - One test per EngineError code (all 14), each triggered through a public function or the worker client and asserting the exact code, message and detail
    - _Requirements: 15.5_

  - [x] 14.5 Write a non-gating benchmark in `web/src/engine/simulate.bench.ts` and record the timing
    - Vitest `bench` of `simulate` on Ashgrove with 1000 paths for each treatment combination; the file is not picked up by `pnpm test`, so it never gates a run
    - Run it once with `pnpm exec vitest bench --run src/engine/simulate.bench.ts` and record the median time per combination, the machine and the Node version under "Benchmark results" in the Notes section of this file; if any median exceeds 16 ms, note that the terminate-on-cancel fallback needs reconsidering and tell the user
    - _Requirements: 12.16_

- [-] 15. Checkpoint: full engine
  - From `web`, run `pnpm typecheck; pnpm lint; pnpm format; pnpm test`. Ensure all tests pass, ask the user if questions arise.

- [ ] 16. Steering amendments
  - [~] 16.1 Update `.kiro/steering/rescue-rules.md` with a normal file edit
    - Record the remaining amendments from the design: fixed Canonical_Order (cut_costs, sell_assets, debt_for_equity, refinance) regardless of click order; the per-path Random_Block (recovery, haircut, eps1, eps2, eps3 drawn in this order, 6 uniforms per path, whatever the treatment); typed errors instead of clamping for delta, tool parameters, paths and seeds (only sigma, g and outputs are clamped); `seedFrom` uses the UTC date in YYYY-MM-DD form; same-day determinism holds within one JavaScript engine, with one-ulp differences in `Math.log`, `Math.cos`, `Math.sin` across browsers accepted for v1
    - Check that the Req 16.1 amendments (refinance fee rule and interest form, hint scan, amended properties 1, 2 and 7) are still present; add any that are missing
    - _Requirements: 16.1, 16.3_

- [~] 17. Final checkpoint
  - From `web`, run `pnpm typecheck; pnpm lint; pnpm format; pnpm test; pnpm build`. Ensure all tests pass, ask the user if questions arise.

- [ ] 18. Finance review and commit
  - [~] 18.1 Run the finance-reviewer agent and resolve its findings
    - Invoke `finance-reviewer` on `web/src/engine` against `rescue-rules.md`, `zombie-definition.md`, this spec and the Ashgrove worked example
    - Fix every finding in engine code or tests; if a finding conflicts with the approved requirements or design, or would weaken a property, stop and ask the user
    - After the fixes, rerun from `web`: `pnpm typecheck; pnpm lint; pnpm format; pnpm test; pnpm build`
    - _Requirements: 15.8, 15.9_

  - [~] 18.2 Commit the engine by explicit path
    - Run `git pull` first; confirm `git diff --stat -- pipeline data` is empty
    - Stage by explicit path only, never `git add -A`, `git add .` or `git commit -a`: `git add web/src/engine web/src/state web/src/test/arbitraries.ts .kiro/specs/rescue-engine .kiro/steering/rescue-rules.md` (the steering file goes in this commit unless it was committed earlier)
    - Check `git status` shows nothing staged outside these paths
    - Commit with a conventional message scoped `rescue-engine`, subject at most 72 characters, for example `feat(rescue-engine): add pure rescue engine and worker client`
    - _Requirements: 16.3, 16.4, 16.5, 16.6_

## Notes

- Every task and sub-task is required, including all property-based and unit tests.
- Run `git pull` before starting task 1 (shared repository).
- Before using any `three`, `@react-three/*` or Theatre.js API, look it up with context7. The engine must not import them.
- Never edit `/pipeline` or `/data`. The golden-cases test only reads `data/fixtures/icr_cases.json` if it exists; its format is proposed and still to be confirmed with the partner.
- `web/src/dev/fixtures` is read-only for this spec; the Ashgrove_Variant is built inside the test as a copy with I = 120e6.
- Counterexample rule: a property-test failure is reported to the user with the fast-check seed and shrunk inputs. Do not weaken the property, filter the case, widen a tolerance or remove refinance.
- Mulberry32 and `seedFrom` pinned values are produced by running the code once and cross-checked inside the test against an independent implementation; no numbers are invented in this file.
- Benchmark results (task 14.5, `simulate` on Ashgrove Works, 1000 paths, delta 0.01, fixed seed, c 0.04, s 0.15, w 0.3). Machine: AMD Ryzen 9 8945HS w/ Radeon 780M Graphics; OS: Microsoft Windows NT 10.0.26200.0; Node v26.13.0; Vitest 5.1.0. Run with `pnpm exec vitest bench --run src/engine/simulate.bench.ts`; values below are from a second run that exported JSON (the first run printed no table). Every median is far below the 16 ms threshold, so the terminate-on-cancel fallback stands.

  | Combination | Median ms | p99 ms |
  | --- | --- | --- |
  | empty | 0.71 | 1.51 |
  | cut_costs | 0.69 | 1.69 |
  | sell_assets | 1.04 | 2.07 |
  | cut_costs + sell_assets | 1.05 | 2.20 |
  | debt_for_equity | 0.69 | 1.49 |
  | cut_costs + debt_for_equity | 0.70 | 1.53 |
  | sell_assets + debt_for_equity | 1.05 | 2.10 |
  | cut_costs + sell_assets + debt_for_equity | 1.03 | 2.23 |
  | refinance | 0.68 | 1.56 |
  | cut_costs + refinance | 0.68 | 1.63 |
  | sell_assets + refinance | 1.42 | 2.81 |
  | cut_costs + sell_assets + refinance | 1.43 | 2.71 |
  | debt_for_equity + refinance | 0.68 | 1.66 |
  | cut_costs + debt_for_equity + refinance | 0.92 | 1.65 |
  | sell_assets + debt_for_equity + refinance | 1.73 | 2.99 |

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3", "1.4", "1.5", "2.1", "11.1"] },
    { "id": 2, "tasks": ["2.2", "5.1", "11.2", "11.3", "11.4"] },
    { "id": 3, "tasks": ["2.3", "2.4", "3.1", "5.3", "6.1", "7.1", "7.2"] },
    { "id": 4, "tasks": ["2.5", "2.6", "3.2", "5.2", "6.2", "7.4", "7.5"] },
    { "id": 5, "tasks": ["3.3", "5.4", "5.5", "6.3", "6.4", "6.5", "6.6", "7.3", "8.1"] },
    { "id": 6, "tasks": ["7.6", "8.2", "8.3"] },
    { "id": 7, "tasks": ["8.4", "8.5", "8.6", "8.7", "8.8", "10.1"] },
    { "id": 8, "tasks": ["10.2", "10.3", "10.4", "10.5", "10.6", "13.1"] },
    { "id": 9, "tasks": ["12.1", "12.2", "12.3", "12.4", "12.5", "12.6", "13.2"] },
    { "id": 10, "tasks": ["13.3", "14.1"] },
    { "id": 11, "tasks": ["13.4", "13.5", "13.6", "13.7", "13.8", "14.2", "14.3", "14.4", "14.5"] },
    { "id": 12, "tasks": ["16.1"] },
    { "id": 13, "tasks": ["18.1"] },
    { "id": 14, "tasks": ["18.2"] }
  ]
}
```
