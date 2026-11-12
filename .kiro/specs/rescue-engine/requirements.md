# Requirements Document

## Introduction

The rescue-engine is a pure TypeScript module in `web/src/engine` that answers the reverse stress test question "what would it take to bring this company back?". It applies up to three restructuring tools (v1: cut_costs, sell_assets, debt_for_equity, refinance) to a firm under a rate shock, projects interest coverage for 3 years with a seeded Monte Carlo simulation, and draws one reproducible real outcome. It follows `rescue-rules.md`, `zombie-definition.md` and `data-contract.md`, with the amendments recorded in this document (refinance fee rule, fixed tool order, per-path random block, typed errors instead of clamping). The module has no React or three.js imports. A Web Worker wrapper runs the simulation off the main thread. Results are hypotheticals and never recommendations.

## Glossary

- **Engine**: The pure TypeScript module in `web/src/engine`.
- **Firm**: A firm record of type `Firm` from `web/src/types/data.ts`, using the latest fiscal year for inputs.
- **Macro**: The `Macro` record from `macro.json`, supplying the 10-year Treasury rate `b` (dgs10.value).
- **Inputs**: R (revenue), E (EBIT), I (interest expense), D (total debt), A (total assets), Q (equity), r = I / D (implied rate), b (10-year Treasury), delta (rate shock).
- **Delta**: Rate shock as a decimal in [0, 0.05].
- **Tool**: One of cut_costs, sell_assets, debt_for_equity, refinance (v1); issue_equity, chapter_11 and liquidate are extension points.
- **ToolChoice**: A tool name with its parameters: cut_costs `{c}`, sell_assets `{s}`, debt_for_equity `{w}`, refinance with no parameters (present means on).
- **Treatment**: A list of 0 to 3 ToolChoice values with no duplicate tool names.
- **Canonical_Order**: cut_costs, sell_assets, debt_for_equity, refinance.
- **Treatment_Parser**: The Engine function `parseTreatment` that validates unknown input into a Treatment.
- **EngineError**: A typed error or result value with a code and a human-readable message. Codes: `unknown_tool`, `too_many_tools`, `duplicate_tool`, `param_out_of_range`, `invalid_treatment`, `delta_out_of_range`, `not_rescuable`, `invalid_paths`, `invalid_seed`, `invalid_date`, `invalid_cik`, `worker_disposed`, `superseded`, `aborted`.
- **Validation_Order**: The fixed order in which every public Engine function checks its arguments and returns the first error: (1) delta, (2) Treatment (parser order of Requirement 3.11), (3) firm (including the sub-dollar check of Requirement 4.15, after the sign checks), (4) Treasury rate b, (5) function-specific options in the order paths, seed, cik, isoDate.
- **icr_function**: The single shared function `icr(ebit, interest)`.
- **Post_Surgery_State**: The state after `applyTreatment`: R', E', D', rate r', equity ownership, pain meters and refinance note.
- **D'_preFee**: The total debt after cut_costs, sell_assets and debt_for_equity, before any 2% refinance fee.
- **Covered_Year**: A projected year t with ICR_t >= 1 or with D' = 0 (Debt_Free).
- **Pain_Meters**: Workers, shareholders and creditors values, each capped to [0, 100].
- **Refinance_Note**: A text explaining whether refinance applied and why or why not.
- **Path**: One Monte Carlo trajectory of 3 projected years.
- **Random_Block**: The fixed set of random draws per Path: recovery, haircut, eps1, eps2, eps3, always drawn in the same order regardless of the Treatment.
- **PRNG**: mulberry32 seeded generator; normal draws use Box-Muller.
- **Seed**: An unsigned 32-bit integer.
- **Survival_Odds**: Share of Paths where ICR_t >= 1 for t = 1, 2, 3.
- **Outcome**: Result of `drawOutcome`: one Path, rescued flag, failure year, failure reason and hint.
- **Debt_Free**: Condition D' = 0 after treatment; ICR is +Infinity internally.
- **Worker_Wrapper**: The Web Worker wrapper that runs `simulate` off the main thread.
- **Channel**: A string label on a Worker_Wrapper request (default `"default"`) that groups requests for latest-wins cancellation.
- **In_Flight_Request**: A Worker_Wrapper request that has been posted to the worker and whose Promise has not yet settled.
- **Queued_Request**: A Worker_Wrapper request that waits on its Channel for the In_Flight_Request of that Channel to finish.
- **Golden_Cases**: Shared ICR cases in `data/fixtures/icr_cases.json`, if the file exists.
- **Ashgrove_Works**: Dev fixture firm (cik 9000000001, `ashgroveWorks`) with `fixtureMacro`.
- **Ashgrove_Variant**: A test-only copy of Ashgrove_Works with interest expense I = 120e6 and every other value unchanged.
- **Steering_File**: `.kiro/steering/rescue-rules.md`.

## Requirements


### Requirement 1: Shared interest coverage function

**User Story:** As a developer, I want one icr function shared by the pipeline logic, graveyard and Engine, so that coverage is computed identically everywhere.

#### Acceptance Criteria

1. THE Engine SHALL export `icr(ebit, interest)` that returns ebit / interest as a finite number when ebit is a finite number and interest is a finite number greater than 0.
2. IF interest is null, undefined, NaN, zero or negative, THEN THE icr_function SHALL return null and SHALL NOT throw an exception.
3. IF ebit is null, undefined or NaN, THEN THE icr_function SHALL return null and SHALL NOT throw an exception.
4. WHEN ebit is negative and interest is greater than 0, THE icr_function SHALL return ebit / interest, which is a negative number, or -0 when the IEEE 754 division underflows (for example ebit = -5e-324, interest = 2).
5. THE Engine SHALL compute every coverage value, including each projected year ICR_t, by calling the icr_function, and THE Engine SHALL contain no other implementation of the ebit / interest division for coverage.
6. WHERE `data/fixtures/icr_cases.json` exists, THE test suite SHALL read it in the format `{ "cases": [{ "ebit": number|null, "interest": number|null, "expected": number|null, "note"?: string }] }` (proposed format, to confirm with partner), SHALL run every Golden_Case against the icr_function, and SHALL fail if any returned value differs from the expected value by more than 1e-9 (or if an expected null is not returned as null).
7. IF `data/fixtures/icr_cases.json` does not exist, THEN THE test suite SHALL skip the Golden_Cases test, report it as skipped, and SHALL NOT fail.
8. FOR ALL interest values greater than 0 and all ebit values a <= b, icr(a, interest) SHALL be less than or equal to icr(b, interest).
9. IF `data/fixtures/icr_cases.json` exists but is not valid JSON or contains a case that cannot be run, THEN THE test suite SHALL fail with an error identifying the file and the offending case. A file or case in any shape other than the format of criterion 6 SHALL count as a case that cannot be run.

### Requirement 2: Module boundaries and public API

**User Story:** As a developer, I want a pure, well-bounded Engine API, so that presentation code can use it without coupling.

#### Acceptance Criteria

1. THE Engine SHALL export exactly these named symbols from `web/src/engine`: `icr`, `diagnose`, `applyTreatment`, `simulate`, `drawOutcome`, `score`, `seedFrom`, `parseTreatment`, the liquidation recovery function and the Worker_Wrapper, and importing any of them from that entry point SHALL resolve without error in a Vitest test.
2. THE Engine SHALL contain zero import statements, static or dynamic, that resolve to `react`, `three`, any `@react-three/*` package, or any module under `web/src/scenes`, `web/src/fx` or `web/src/ui`, as verified by an automated check over every file under `web/src/engine`.
3. THE Engine SHALL contain zero references to the system clock (`Date.now`, `new Date()` with no arguments, `performance.now`), `Math.random`, or module-level mutable variables read by exported functions, as verified by an automated check over every file under `web/src/engine`.
4. WHEN `simulate` or `drawOutcome` is called twice with deeply equal arguments, including the same seed, THE Engine SHALL return deeply equal results, and THE Engine SHALL leave the caller's argument objects unmodified.
5. THE Engine SHALL define a tool registry in which issue_equity, chapter_11 and liquidate are each registered as a named extension point (not accepted in a v1 Treatment), so that a tool can be added without changing the signature of any function exported under criterion 1.
6. IF a caller supplies a Treatment containing issue_equity, chapter_11, liquidate or any tool name that is not registered as a v1 tool, THEN THE Treatment_Parser SHALL reject the whole Treatment with an EngineError of code `unknown_tool`, SHALL identify the offending tool name in the error, and SHALL return no partially parsed Treatment.

### Requirement 3: Treatment type and parsing

**User Story:** As a developer, I want a real Treatment type with strict parsing, so that invalid input never reaches the maths.

#### Acceptance Criteria

1. THE Engine SHALL define the `ToolChoice` and `Treatment` types, and `web/src/state/types.ts` SHALL import and re-export them in place of the placeholder types.
2. WHEN the state machine validates a treatment, THE `parseTreatment` function in `web/src/state/machine.ts` SHALL delegate to the Treatment_Parser and SHALL map an EngineError to the machine's existing rejection shape, using the EngineError message as the reason.
3. IF a tool name is not one of the v1 tools (`cut_costs`, `sell_assets`, `debt_for_equity`, `refinance`), THEN THE Treatment_Parser SHALL reject the Treatment with an EngineError of code `unknown_tool`, and the caller's input SHALL remain unmodified.
4. IF a Treatment contains more than 3 tools, THEN THE Treatment_Parser SHALL reject it with an EngineError of code `too_many_tools`.
5. IF a Treatment contains the same tool name twice, THEN THE Treatment_Parser SHALL reject it with an EngineError of code `duplicate_tool`.
6. IF a parameter is outside its inclusive range (`cut_costs` c in [0, 0.08], `sell_assets` s in [0, 0.30], `debt_for_equity` w in [0, 0.60]), is not a finite number (NaN, Infinity, -Infinity, or a non-number type), is missing from a tool that requires it, or has an unexpected key, THEN THE Treatment_Parser SHALL reject the Treatment with an EngineError of code `param_out_of_range` and SHALL NOT clamp the value.
7. WHEN a Treatment contains `refinance` with no parameters, THE Treatment_Parser SHALL accept it and treat its presence as "on".
8. IF `refinance` is given any parameter or key, THEN THE Treatment_Parser SHALL reject the Treatment with an EngineError of code `param_out_of_range`.
9. WHEN the Treatment_Parser accepts a Treatment, THE Treatment_Parser SHALL return the tools in the Canonical_Order regardless of the order given, so that the Engine evaluates them in that order.
10. WHEN the Treatment_Parser receives an empty Treatment (0 tools), THE Treatment_Parser SHALL accept it and return an empty Treatment.
11. IF a Treatment contains several violations, THEN THE Treatment_Parser SHALL reject it with exactly one EngineError, chosen by this fixed order so that the same input always yields the same error code: (1) input is not an array → `invalid_treatment`; (2) more than 3 entries → `too_many_tools`; (3) for each entry in input order, an entry that is not a plain object or whose `name` is not a string → `invalid_treatment`, and a `name` that is not a v1 tool → `unknown_tool`; (4) the first name that appears twice, in input order → `duplicate_tool`; (5) for each entry in input order, a parameter violation → `param_out_of_range`.
12. WHEN the state machine tests run after the change, ALL existing state-machine tests SHALL pass without changes to their assertions.
13. THE test arbitraries in `web/src/test/arbitraries.ts` MAY be changed so that generated treatments conform to the real Treatment type.
14. FOR ALL valid Treatments, parsing the canonical serialisation of the Treatment SHALL produce a Treatment equal to the canonically ordered original (round-trip property), verified by a fast-check property test with at least 100 runs.
15. IF the Treatment input is not an array, or contains an entry that is not a plain object or whose `name` is not a string, THEN THE Treatment_Parser SHALL reject the Treatment with an EngineError of code `invalid_treatment`, SHALL identify the index of the malformed entry when there is one, and SHALL leave the caller's input unmodified.

### Requirement 4: Input validation and rescuability

**User Story:** As a player, I want unusable firms reported clearly, so that the lab never shows broken numbers.

#### Acceptance Criteria

1. IF delta is not a finite number in the closed range [0, 0.05], THEN THE Engine SHALL return an EngineError of code `delta_out_of_range`, SHALL NOT clamp or substitute the delta value, and SHALL NOT return any diagnosis, treatment, simulation or outcome result for that call.
2. IF D is null or zero for the latest fiscal year, THEN THE Engine SHALL return an EngineError of code `not_rescuable` for each of `diagnose`, `applyTreatment`, `simulate` and `drawOutcome`, naming D as the missing or unusable input.
3. IF any of R, E, I, A or Q is null for the latest fiscal year, THEN THE Engine SHALL return an EngineError of code `not_rescuable` that names every one of those inputs that is null.
4. IF R is zero or negative for the latest fiscal year, THEN THE Engine SHALL return an EngineError of code `not_rescuable` naming R as the unusable input.
5. IF I is zero or negative for the latest fiscal year, so that the implied rate r is not positive, THEN THE Engine SHALL return an EngineError of code `not_rescuable` naming I as the unusable input.
6. IF D is negative for the latest fiscal year, THEN THE Engine SHALL return an EngineError of code `not_rescuable` naming D as the unusable input.
7. IF `Firm.years` is empty, THEN THE Engine SHALL return an EngineError of code `not_rescuable`.
8. THE Engine SHALL take the latest fiscal year as the entry of `Firm.years` with the highest `fy`.
9. THE Engine SHALL compute the implied rate as r = I / D.
10. THE Engine SHALL read the 10-year Treasury rate b from `Macro.dgs10.value`.
11. THE Engine SHALL set kappa to 0.3, sigma to margin_change_sd clamped to the range [0.01, 0.08], and g to revenue_growth_median clamped to the range [-0.15, 0.15], and SHALL NOT use margin_change_mean in any calculation.
12. IF an EngineError is returned, THEN THE Engine SHALL leave the input Firm and Macro objects unmodified and SHALL NOT throw an exception.
13. IF the firm passes criteria 2 to 7 AND `Macro.dgs10.value` (b) is not a finite number or is less than 0, THEN THE Engine SHALL return an EngineError of code `not_rescuable` naming b as the unusable input.
14. WHEN a public Engine function receives arguments with more than one defect, THE Engine SHALL return only the first EngineError in the Validation_Order (delta, Treatment, firm, b, then function-specific options), so that the firm checks of criteria 2 to 7 and 15 run before the b check of criterion 13.
15. IF any of R, E, I, D, A or Q for the latest fiscal year is non-zero and has an absolute value below 1 (USD), THEN THE Engine SHALL return an EngineError of code `not_rescuable` naming every such input in the order R, E, I, D, A, Q, checked after the D, R and I sign checks and before the b check; filings report whole USD, and this rule keeps every division finite (interest >= 1 and D * (r + delta) >= 1).

### Requirement 5: Diagnosis

**User Story:** As a player, I want to see what it would take before I treat the patient, so that I understand the size of the problem.

#### Acceptance Criteria

1. WHEN `diagnose(firm, delta, macro)` is called with E > 0, D > 0, r > 0 and 0 <= delta <= 0.05, THE Engine SHALL return needed EBIT increase = D * (r + delta) / E - 1, where E, D and r are the EBIT, total debt and implied rate (I / D) of the latest fiscal year, as a decimal (0.88 = 88%).
2. WHEN `diagnose` is called with E > 0, D > 0, r > 0 and 0 <= delta <= 0.05, THE Engine SHALL return needed debt cut = 1 - E / ((r + delta) * D), as a decimal share of D.
3. WHEN `diagnose` is called with a valid firm, THE Engine SHALL return needed rate = E / D, as a decimal, for any sign of E.
4. IF E <= 0, THEN THE Engine SHALL return null for needed EBIT increase and null for needed debt cut, and SHALL still return the shocked current ICR and needed rate.
5. WHEN `diagnose` is called with a valid firm, THE Engine SHALL return the shocked current ICR = icr(E, D * (r + delta)) using the shared `icr()` function, without reimplementing it.
6. WHEN delta is 0 and no treatment is applied, THE Engine SHALL return a year-0 ICR equal to icr(E, I) of the latest fiscal year.
7. WHEN the diagnosis is calculated for Ashgrove_Works with delta 0.01, THE Engine SHALL return a shocked current ICR within 0.005 of 0.53, a needed EBIT increase within 0.005 of 0.88, a needed debt cut within 0.005 of 0.47 and a needed rate within 0.0005 of 0.036.
8. WHEN the needed EBIT increase is greater than 0, THE Engine SHALL report that the firm is below coverage 1 under the shock; WHEN the value is less than or equal to 0, THE Engine SHALL report that the firm already covers its interest (a value of exactly 0 means coverage exactly 1, which counts as covered). WHEN the value is null because E <= 0, THE Engine SHALL report that the firm is below coverage 1 under the shock.
9. IF the firm or delta fails the validation of Requirement 4, THEN `diagnose` SHALL return the EngineError of Requirement 4 and SHALL NOT throw an exception.

### Requirement 6: Applying a treatment

**User Story:** As a player, I want each tool to change the patient exactly as the rules say, so that the effect on the body and vital signs is traceable.

#### Acceptance Criteria

1. WHEN `applyTreatment(firm, treatment, delta, macro)` is called with a valid firm, a Treatment of 0 to 3 tools, and delta in the range 0 to 0.05, THE Engine SHALL apply the tools in the Canonical_Order regardless of the order in which they appear in the Treatment, and SHALL return the Post_Surgery_State, the three Pain_Meters and the Refinance_Note.
2. WHEN cut_costs with parameter c in the range 0 to 0.08 is applied, THE Engine SHALL set E' = E + c * (R - E), SHALL reduce the revenue growth of each projected year by 0.5 * c, and SHALL add (c / 0.08) * 50 to workers pain.
3. WHEN sell_assets with parameter s in the range 0 to 0.30 is applied together with cut_costs, THE Engine SHALL compute E' from cut_costs first and then multiply both R and E' by (1 - s).
4. WHEN sell_assets with parameter s in the range 0 to 0.30 is applied, THE Engine SHALL compute sale price = s * A * recovery, SHALL set D' = max(0, D - sale price), and SHALL add (s / 0.30) * 35 to workers pain.
5. WHEN `applyTreatment` computes a sale price, THE Engine SHALL use recovery = 0.7 (the midpoint of the 0.6 to 0.8 range used per path in the Monte Carlo projection).
6. WHEN debt_for_equity with parameter w in the range 0 to 0.60 is applied, THE Engine SHALL compute converted = w * D' using the debt after asset sales, SHALL reduce D' by converted, SHALL set keep = max(Q, 0) / (max(Q, 0) + converted), SHALL add (1 - keep) * 100 to shareholders pain, and SHALL add w * 60 to creditors pain.
7. IF max(Q, 0) + converted = 0, THEN THE Engine SHALL set keep = 1, SHALL add 0 to shareholders pain, and SHALL NOT return NaN or Infinity in any output field.
8. THE Engine SHALL keep each of the workers, shareholders and creditors Pain_Meters within the range 0 to 100 inclusive, capping any computed value above 100 at 100 and any computed value below 0 at 0.
9. THE Engine SHALL use r + delta as the projected interest rate before refinance is evaluated, where r = I / D from the firm's latest fiscal year.
10. IF a tool parameter lies outside its allowed range, or the Treatment contains more than 3 tools or the same tool more than once, THEN THE Engine SHALL reject the call with the matching EngineError of Requirement 3 and SHALL leave the input firm unchanged.
11. WHEN Ashgrove_Works is treated with an empty Treatment, THE Engine SHALL return R, E and D equal to the firm's original latest-year values and Pain_Meters of 0, 0 and 0.

### Requirement 7: Refinance

**User Story:** As a player, I want refinance to help only when it truly lowers my annual interest bill, so that the tool is honest.

#### Acceptance Criteria

1. WHEN a Treatment contains refinance together with any of cut_costs, sell_assets or debt_for_equity, THE Engine SHALL evaluate refinance after all of those tools have been applied, regardless of the order in which the tools appear in the Treatment.
2. WHEN refinance is evaluated and D' > 0, THE Engine SHALL compute icr_pre = E' / (D' * (r + delta)) using the E' and D' that result from all other tools in the Treatment, where delta is a decimal in the range 0 to 0.05.
3. WHEN refinance is evaluated and D' > 0, THE Engine SHALL select the credit spread from icr_pre as follows: icr_pre < 1 gives 0.09, 1 <= icr_pre < 1.5 gives 0.06, 1.5 <= icr_pre < 3 gives 0.035, and icr_pre >= 3 gives 0.02. A negative icr_pre SHALL be treated as below 1.
4. WHEN refinance is evaluated and D' > 0, THE Engine SHALL compute newRate = b + delta + spread, where b is the 10-year Treasury value from macro data, as a decimal.
5. IF D' > 0 AND 1.02 * newRate < r + delta, THEN THE Engine SHALL compute the projected annual interest as D'_preFee × (1.02 × newRate), SHALL report the displayed debt as D'_preFee × 1.02 and the displayed rate as newRate, and SHALL set the Refinance_Note to a text stating the old rate, the new rate and the 2% fee.
6. IF D' > 0 AND 1.02 * newRate >= r + delta, THEN THE Engine SHALL leave the rate and D' unchanged and set the Refinance_Note to a text stating that the new rate after the 2% fee would not lower annual interest cost, including the old rate and the new rate.
7. IF D' = 0 when refinance is evaluated, THEN THE Engine SHALL leave the rate, D' and all other state values unchanged, apply no 2% fee, and set the Refinance_Note to a text stating that no debt remains to refinance.
8. FOR ALL valid firms, Treatments containing refinance, and delta values from 0 to 0.05, THE Engine SHALL change the rate only when 1.02 * newRate < r + delta, so that the projected annual interest after refinance (D'_preFee × (1.02 × newRate) when refinance applies, as in criterion 5) is never greater than before (D'_preFee × (r + delta)) (property 7, amended).
9. FOR ALL sets of tools that include refinance, THE Engine SHALL return a Post_Surgery_State and Refinance_Note identical in every field for every click order of the same set of tools, given the same inputs.

### Requirement 8: Monte Carlo simulation

**User Story:** As a player, I want survival odds from a seeded simulation, so that results are reproducible and comparable.

#### Acceptance Criteria

1. WHEN `simulate(firm, treatment, delta, macro, {paths, seed})` is called with `paths` omitted, THE Engine SHALL run exactly 1000 Paths using the PRNG seeded with `seed`.
2. WHEN `simulate(firm, treatment, delta, macro, {paths, seed})` is called with a positive integer `paths`, THE Engine SHALL run exactly `paths` Paths using the PRNG seeded with `seed`.
3. THE PRNG SHALL be mulberry32 and normal draws SHALL use Box-Muller.
4. WHEN a Path is generated, THE Engine SHALL draw the Random_Block of recovery (uniform [0.6, 0.8]), haircut (uniform [0.30, 0.60]), eps1, eps2 and eps3 (standard normal) in this fixed order, and SHALL consume the same number of PRNG draws per Path regardless of which tools the Treatment contains.
5. WHEN a Path is projected, THE Engine SHALL use the Path recovery value for sell_assets in place of 0.7.
6. WHEN a Path is projected, THE Engine SHALL compute the start margin m0 = E' / R' and, for t = 1..3, m_t = m_{t-1} + kappa * (margin_mean - m_{t-1}) + sigma * eps_t, with kappa = 0.3 and sigma = margin_change_sd clamped to [0.01, 0.08].
7. WHEN a Path is projected, THE Engine SHALL compute R_t = R_{t-1} * (1 + g - 0.5 * c) with g = revenue_growth_median clamped to [-0.15, 0.15], EBIT_t = m_t * R_t and ICR_t = icr(EBIT_t, interest), where interest = D'_preFee × (1.02 × newRate) when refinance applied (Requirement 7.5) and D'_preFee × (r + delta) otherwise, and D' stays constant over the 3 years. The displayed debt SHALL be D'_preFee × 1.02 and the displayed rate newRate when refinance applied.
8. IF D' = 0, THEN THE Engine SHALL treat ICR_t as +Infinity for t = 1, 2 and 3 so that each year counts as covered, and SHALL set the `debtFree` flag to true.
9. THE Engine SHALL return Survival_Odds as the number of Paths with ICR_t >= 1 for all of t = 1, 2 and 3, divided by the total number of Paths.
10. THE Engine SHALL return the median ICR for each of t = 1, 2 and 3, using the average of the two middle values when the Path count is even.
11. THE Engine SHALL return Survival_Odds within [0, 1] and each Pain_Meter within [0, 100] for all valid inputs (property 8).
12. WHEN the same seed and the same arguments are given in two calls, THE Engine SHALL return deeply equal results (property 6).
13. IF `paths` is not an integer in the range 1 to 100000, THEN THE Engine SHALL return an EngineError of code `invalid_paths` and SHALL NOT run any Path.
14. THE Engine SHALL expose the `debtFree` flag in each simulation result and SHALL NOT place Infinity or NaN in any field intended for display.
15. THE Engine SHALL include in each simulation result the statement that debt stays constant over the 3 projected years, so that the UI can show it.
16. IF the `seed` passed to `simulate` is not an integer in the range 0 to 4,294,967,295 inclusive, THEN THE Engine SHALL return an EngineError of code `invalid_seed`, SHALL NOT coerce the value (for example with `>>> 0`), and SHALL NOT run any Path.

### Requirement 9: Drawn outcome, failure reason and hint

**User Story:** As a player, I want pulling the switch to give one reproducible real outcome with a clear reason when it fails.

#### Acceptance Criteria

1. WHEN `drawOutcome(firm, treatment, delta, macro, seed)` is called, THE Engine SHALL draw exactly one Path from the PRNG seeded with `seed` using the Random_Block of Requirement 8, and SHALL return an Outcome containing rescued, the per-year ICR values for t = 1, 2 and 3, and the per-year operating margin values for t = 1, 2 and 3.
2. WHEN the drawn Path has ICR_t >= 1 for each of t = 1, 2 and 3, THE Engine SHALL return rescued = true and no failing year, no failure message and no hint.
3. WHEN the drawn Path has ICR_t < 1 in at least one year, THE Engine SHALL return rescued = false and the first failing year t, being the smallest t in {1, 2, 3} with ICR_t < 1.
4. WHEN rescued = false, THE Engine SHALL return the message "Year {t}: operating margin {m}%, coverage {icr}. {name} stays undead." where t is the first failing year, m is the operating margin of year t as a percentage rounded to 1 decimal place, icr is ICR_t rounded to 2 decimal places, and name is the firm name.
5. WHEN rescued = false, THE Engine SHALL search for a hint by a linear scan of the cuts c_k = c0 + k × 0.001 for k = 1, 2, … while c_k <= 0.08, where c0 is the chosen cut (0 when cut_costs is absent) and t* is the first failing year. The scan SHALL go upward from k = 1 and SHALL stop at the first k for which ICR_t* >= 1. Each step SHALL rerun the full treatment pipeline (cut_costs with c_k, sell_assets with the Path recovery, debt_for_equity, and refinance re-evaluated) on the same Random_Block. The hint SHALL be k × 0.1 percentage points, the smallest such cut at 0.1 percentage point resolution, with no separate rounding step. Documented limit: a gap below 0.08 that is less than 0.1 percentage point wide and does not lie on the grid c0 + k × 0.001 is not tested.
6. WHEN a hint exists, THE Engine SHALL state the extra cut as k × 0.1 percentage points (greater than 0), worded as an extra cut on top of the chosen cut c0 when cut_costs is in the Treatment and as a cost cut when cut_costs is absent.
7. IF the scan of criterion 5 finds no k with c_k <= 0.08 that makes ICR_t* >= 1 on the same Path, THEN THE Engine SHALL return the failure message of criterion 4 with no hint.
8. THE Engine SHALL phrase the hint text as a hypothetical describing what it would take (for example "an extra cut of X percentage points would have kept year {t} at coverage 1 or above") and SHALL not contain the words "should", "recommend" or "advise".
9. WHEN the real outcome is drawn for a firm, Treatment and date, THE Engine SHALL use the seed returned by `seedFrom(cik, treatment, ISO date)` where the ISO date is the UTC date in YYYY-MM-DD form, so that the same firm, Treatment and UTC date return an identical Outcome (rescued, failing year, message and hint) and a different UTC date may return a different Outcome. This guarantee SHALL hold within one JavaScript engine; across browsers, `Math.log`, `Math.cos` and `Math.sin` may differ by one ulp, which is accepted for v1.
10. IF `drawOutcome` is called with a Treatment, delta or firm that fails Engine input validation, THEN THE Engine SHALL return an EngineError for the invalid input and SHALL not draw a Path.
11. WHERE the Treatment already contains 3 tools and no cut_costs, THE Engine SHALL still run the scan of criterion 5 and SHALL describe the hint as a hypothetical extra cost cut, phrased as "what it would take" under criterion 8.
12. IF the `seed` passed to `drawOutcome` is not an integer in the range 0 to 4,294,967,295 inclusive, THEN THE Engine SHALL return an EngineError of code `invalid_seed`, SHALL NOT coerce the value, and SHALL NOT draw a Path.

### Requirement 10: Seed derivation

**User Story:** As a player, I want the same firm, treatment and day to give the same outcome, so that the result cannot be rerolled.

#### Acceptance Criteria

1. THE Engine SHALL export `seedFrom(cik, treatment, isoDate)` that returns an unsigned 32-bit integer in the range 0 to 4,294,967,295 inclusive.
2. THE Engine SHALL compute the seed as the FNV-1a 32-bit hash of one string built, in this order, from the cik, the canonical Treatment serialisation and the ISO date, with a fixed separator character between the three parts. The separator SHALL NOT appear in any of the three parts.
3. THE canonical Treatment serialisation SHALL list the selected tools in the Canonical_Order, SHALL list each tool's parameter keys in ascending sorted order, and SHALL produce the identical string for two Treatments that contain the same tools with the same parameter values.
4. THE `isoDate` argument SHALL be the UTC calendar date formatted as YYYY-MM-DD, where the year has 4 digits, the month is 01 to 12, and the day is a valid day for that month and year.
5. IF `isoDate` does not match the format YYYY-MM-DD or is not a valid calendar date (for example `2025-02-30`), THEN THE Engine SHALL return an EngineError of code `invalid_date` and SHALL NOT return a seed.
6. FOR ALL Treatments, THE seedFrom function SHALL return the same value for every click order of the same set of tools with the same parameter values.
7. WHEN `seedFrom` is called twice with the same cik, an equal Treatment and the same `isoDate`, THE seedFrom function SHALL return the same value on both calls, including across separate runs of the Engine. The resulting "same firm, Treatment and UTC date give the same outcome" guarantee SHALL hold within one JavaScript engine; across browsers, `Math.log`, `Math.cos` and `Math.sin` used by the PRNG normal draws may differ by one ulp, which is accepted for v1.
8. WHEN the cik, the Treatment or the `isoDate` differs from a reference input, THE seedFrom function SHALL return a different value for each of the tested example cases, which SHALL include at least one case where only the cik differs, one where only a tool parameter differs, one where only the tool set differs, and one where only the date differs.
9. IF `cik` is not a string of exactly 10 decimal digits, THEN THE seedFrom function SHALL return an EngineError of code `invalid_cik` and SHALL NOT return a seed; THE seedFrom function SHALL check the Treatment before the cik and the cik before `isoDate`.

### Requirement 11: Score and liquidation

**User Story:** As a player, I want a score that rewards a likely rescue with little pain, and a liquidation payout shown in cents on the dollar.

#### Acceptance Criteria

1. WHEN `score(result)` is called with `survival_odds` in [0, 1] and each of the workers, shareholders and creditors pain meters in [0, 100], THE Engine SHALL return (rescued ? 1 : 0) * survival_odds * (1 - (workers + shareholders + creditors) / 300) * 100.
2. THE Engine SHALL return a score within [0, 100] for every `result` whose `survival_odds` is in [0, 1] and whose pain meters are each in [0, 100].
3. IF `rescued` is false, THEN THE Engine SHALL return a score of 0.
4. IF `score(result)` receives a `survival_odds` outside [0, 1] or a pain meter outside [0, 100], THEN THE Engine SHALL clamp `survival_odds` to [0, 1] and each pain meter to [0, 100] before computing the score.
5. WHEN the liquidation recovery function is called with total assets A and total debt D, THE Engine SHALL return min(1, 0.5 * A / D).
6. FOR ALL A >= 0 and D > 0, THE liquidation recovery SHALL be within [0, 1] (property 5).
7. IF D is zero, THEN THE liquidation recovery function SHALL return 1.
8. WHEN liquidation recovery is displayed, THE Engine SHALL provide the value in cents on the dollar as an integer from 0 to 100, equal to the recovery multiplied by 100 and rounded half up to the nearest integer.

### Requirement 12: Web Worker wrapper

**User Story:** As a player, I want the simulation to run off the main thread, so that the interface stays responsive.

#### Acceptance Criteria

1. WHEN a caller invokes the Worker_Wrapper with simulation arguments, an optional Channel (default `"default"`) and an optional AbortSignal, THE Worker_Wrapper SHALL run `simulate` in a Web Worker and return a Promise that resolves with the simulation result, subject to the cancellation rules of criteria 11 to 15.
2. THE Worker_Wrapper SHALL accept an injected worker factory so that tests can supply a fake worker.
3. WHERE no worker factory is injected, THE Worker_Wrapper SHALL create a real Web Worker from the worker entry module.
4. IF the worker posts an error message, THEN THE Worker_Wrapper SHALL reject only the Promise of the matching request with the EngineError carried in the message, and SHALL leave all other pending requests unaffected.
5. WHEN a new request is made while one or more previous requests are pending, THE Worker_Wrapper SHALL assign each request a unique identifier and SHALL resolve or reject each Promise using only the response whose identifier matches that request, regardless of the order in which responses arrive, except where criteria 12 to 14 reject the Promise with `superseded` or `aborted` instead.
6. IF the worker posts a response whose identifier matches no pending request, THEN THE Worker_Wrapper SHALL ignore that response and SHALL leave all pending requests unchanged.
7. WHEN the Worker_Wrapper is disposed, THE Worker_Wrapper SHALL terminate the worker and SHALL reject every In_Flight_Request and every Queued_Request on every Channel with an EngineError of code `worker_disposed`.
8. IF a request is made after the Worker_Wrapper has been disposed, THEN THE Worker_Wrapper SHALL reject the returned Promise with an EngineError of code `worker_disposed` without starting a worker.
9. THE worker entry module SHALL import only from the Engine and SHALL contain no React or three.js imports.
10. FOR ALL valid simulation arguments, the result returned through the Worker_Wrapper with an in-process fake worker SHALL be deeply equal to the result of calling `simulate` directly with the same arguments.
11. THE Worker_Wrapper SHALL hold at most one In_Flight_Request and at most one Queued_Request (the latest) per Channel.
12. WHEN a new request is made on a Channel that already has a Queued_Request, THE Worker_Wrapper SHALL reject the Queued_Request with an EngineError of code `superseded` and SHALL replace the Queued_Request with the new request.
13. WHEN a new request is made on a Channel that has an In_Flight_Request, THE Worker_Wrapper SHALL queue the new request; WHEN the response of that In_Flight_Request arrives while a Queued_Request exists on the Channel, THE Worker_Wrapper SHALL reject the In_Flight_Request's Promise with an EngineError of code `superseded` and SHALL then post the Queued_Request to the worker.
14. WHEN the AbortSignal of a request fires, THE Worker_Wrapper SHALL reject that request's Promise with an EngineError of code `aborted`, SHALL remove the request if the request is a Queued_Request, and SHALL ignore the later response if the request is an In_Flight_Request.
15. WHEN requests are made on different Channels, THE Worker_Wrapper SHALL apply criteria 11 to 14 to each Channel separately, so that a request on one Channel never supersedes a request on another Channel.
16. THE Engine SHALL run only `simulate` in the worker; `diagnose`, `applyTreatment` and `drawOutcome` SHALL run on the main thread.

### Requirement 13: Property-based tests for rescue-rules properties

**User Story:** As a maintainer, I want every rule property verified by fast-check, so that regressions in the maths are caught.

#### Acceptance Criteria

1. FOR ALL valid firms, deltas, Random_Blocks, base Treatments without debt_for_equity and w in [0, 0.60], THE Engine SHALL give, for every year t in {1, 2, 3} with EBIT_t >= 0, a projected ICR_t with debt_for_equity(w) added that is greater than or equal to ICR_t without debt_for_equity on the same Random_Block, compared exactly with no tolerance (property 1, amended, covering debt_for_equity; sell_assets is excluded because it also scales R and E).
2. WHERE refinance is included in the property 1 tests of criteria 1 and 11, THE test suite SHALL keep refinance in the generated treatments, and IF fast-check finds a counterexample, THEN THE test run SHALL fail and report the failing example including its seed and shrunk inputs rather than excluding the case from generation.
3. FOR ALL firms, Random_Blocks and treatments in the RR-2 domain, and cut values c1 and c2 with 0 <= c1 <= c2 <= 0.08, THE Engine SHALL give a year-1 EBIT for c2 that is greater than or equal to the year-1 EBIT for c1 on the same Random_Block, and, when EBIT_1(c1) >= 0, a year-1 ICR for c2 that is greater than or equal to the year-1 ICR for c1, each compared as a >= b − 1e-12 × max(|a|, |b|) (relative tolerance 1e-12) (property 2). The RR-2 domain SHALL be: operating margin E/R in [-0.3, 0.3]; margin_mean in [-0.2, 0.3]; eps1, eps2 and eps3 in [-4, 4]; recovery in [0.6, 0.8]; haircut in [0.3, 0.6]; R in [1e6, 1e11]; D in [1e5, 1e11]; r = I / D in [0.005, 0.25]; A in [0, 1e11]; Q in [-1e10, 1e10]; margin_change_sd in [0, 0.2]; revenue_growth_median in [-0.3, 0.3]; b in [0, 0.08]; delta in [0, 0.05]; and treatments that may include sell_assets, debt_for_equity and refinance. Inside the property, THE test SHALL assert the precondition 0.7 × (1 − E/R) × (1 + g − 0.04) >= 0.5 × m_1(c = 0.08) for every generated case, so that no case is silently discarded.
4. WHEN no treatment is applied and delta = 0, THE Engine SHALL return a year-0 ICR equal to the firm's current ICR computed by the shared icr() function, for every valid firm (property 3).
5. FOR ALL valid firms, treatments, seeds and deltas d1 and d2 with 0 <= d1 <= d2 <= 0.05, THE Engine SHALL give Survival_Odds for d2 that are less than or equal to those for d1 (property 4); WHERE refinance is included, the same keep-refinance-and-report rule of criterion 2 SHALL apply.
6. FOR ALL A >= 0 and D > 0, THE Engine SHALL return a liquidation creditor recovery within [0, 1] (property 5).
7. FOR ALL valid arguments, THE Engine SHALL return deeply equal results for two or more repeated calls with the same seed (property 6).
8. FOR ALL valid firms, deltas and Treatments containing refinance, THE Engine SHALL change the rate only when 1.02 * new rate < r + delta, and otherwise SHALL leave the rate equal to r + delta (property 7, amended).
9. FOR ALL valid arguments, THE Engine SHALL return Survival_Odds within [0, 1] and each of the workers, shareholders and creditors Pain_Meters within [0, 100] (property 8).
10. THE property tests SHALL be written with Vitest and fast-check, SHALL run at least 100 generated cases per property, and SHALL run with `pnpm test` from `web`.
11. FOR ALL valid firms, deltas, Random_Blocks, base Treatments without debt_for_equity and w in [0, 0.60], THE Engine SHALL keep every year t in {1, 2, 3} that is a Covered_Year without debt_for_equity a Covered_Year with debt_for_equity(w) added, for any sign of EBIT_t (property 1, amended).
12. THE unit tests SHALL include a test named "RR-1 negative-EBIT counterexample" that records, as documented behaviour, that with EBIT_t = -10 a debt-only reduction of the interest from 100 to 50 lowers ICR_t from -10 / 100 = -0.1 to -10 / 50 = -0.2.
13. THE unit tests SHALL include a test named "RR-2 high-margin trade-off" with E/R = 0.9, margin_mean = 0.9, eps1 = 0 and g = 0.01 and no other tools, asserting a year-1 EBIT of 0.909 × R at c = 0 and 0.878432 × R at c = 0.08 (relative tolerance 1e-9), documenting that the 0.5 × c growth penalty can outweigh the cost cut outside the RR-2 domain.

### Requirement 14: Edge-case behaviour

**User Story:** As a player, I want odd firms to behave predictably, so that no screen shows NaN or Infinity.

#### Acceptance Criteria

1. IF D' = 0 after treatment, THEN THE Engine SHALL treat each projected year 1 to 3 as covered (ICR_t >= 1), set `debtFree` to true, report the coverage text as "debt-free", and return no ICR value that is NaN or Infinity in any display field.
2. IF E <= 0, THEN THE Engine SHALL still run `applyTreatment` and `simulate` and SHALL return null for both needed EBIT increase and needed debt cut in `diagnose`.
3. IF Q <= 0, THEN THE Engine SHALL use max(Q, 0) = 0 in the keep-share calculation, so that keep = 0 when converted > 0, and SHALL set keep = 1 when converted = 0, with no division by zero.
4. IF sell_assets proceeds exceed D, THEN THE Engine SHALL set D' = 0 and SHALL not return negative debt.
5. THE Engine SHALL return no NaN and no Infinity in any numeric output intended for display for valid inputs, where valid inputs are R > 0, A >= 0, D > 0, I > 0, finite E, finite Q, delta in [0, 0.05], and tool parameters within the ranges defined in rescue-rules.
6. FOR ALL valid inputs, THE Engine SHALL return D' >= 0, R' > 0 and each Pain_Meter within [0, 100].
7. IF sell_assets uses s = 0.30, THEN THE Engine SHALL set R' = 0.7 * R_prev and E' = 0.7 * E_prev, where R_prev and E_prev are the revenue and EBIT after all earlier steps in the treatment order.
8. IF D = 0 for the latest fiscal year before any treatment, THEN THE Engine SHALL return the EngineError `not_rescuable` of Requirement 4.2 (the firm pays no interest and cannot be a zombie), and SHALL NOT report it as debt-free.
9. WHEN D > 0 before treatment and D' = 0 after treatment, THE Engine SHALL count the firm as rescued for every year (Requirement 14.1), with coverage shown as "debt-free"; this case SHALL be kept separate from criterion 8.

### Requirement 15: Worked example and unit tests

**User Story:** As a maintainer, I want the Ashgrove Works example fixed in tests, so that the hand-computed figures stay true.

#### Acceptance Criteria

1. WHEN the Ashgrove_Works inputs R = 1.20e9, E = 38e6, I = 61e6, D = 1.05e9, A = 1.60e9, Q = 140e6, margin_mean = 0.035, margin_change_sd = 0.018, revenue_growth_median = 0.01, b = 0.042 and delta = 0.01 are used, THE Engine SHALL return a shocked current ICR of 0.5315, with an absolute tolerance of 0.005 (accepted range 0.5265 to 0.5365).
2. WHEN the Ashgrove_Works diagnosis is calculated with delta = 0.01, THE Engine SHALL return a needed EBIT increase of 88.2% (tolerance ±0.5 percentage points), a needed debt cut of 46.9% (tolerance ±0.5 percentage points) and a needed rate of 3.62% (tolerance ±0.05 percentage points).
3. THE unit tests SHALL include, for each of the four v1 tools (cut_costs, sell_assets, debt_for_equity, refinance), at least one test on Ashgrove_Works whose expected values are written in the test as hand-computed numbers and compared with a tolerance of 1e-6 relative error. Each test SHALL assert the resulting E', R', D' and the affected pain meter values.
4. THE unit tests SHALL include at least three refinance cases:
   - Applies: the Ashgrove_Variant (I = 120e6, other Ashgrove_Works values unchanged) with the Treatment cut_costs c = 0.08 + debt_for_equity w = 0.6 + refinance and delta = 0.01. The test SHALL assert, with a relative tolerance of 1e-6 (criterion 3), icr_pre ≈ 2.50881 (130.96e6 / (420e6 × 0.1242857)), spread = 0.035, newRate = 0.087, 1.02 × newRate = 0.08874 < r + delta = 0.124286, displayed debt = 428.4e6 and projected annual interest = 37.2708e6 (420e6 × 0.08874).
   - Does not apply: real Ashgrove_Works with refinance alone and delta = 0.01 (icr_pre ≈ 0.5315, spread 0.09, newRate 0.142, 1.02 × 0.142 = 0.14484 >= r + delta = 0.068095). The test SHALL note that refinance can never apply to Ashgrove_Works at any delta, because 1.02 × b + 1.02 × spread + 0.02 × delta >= 0.06324 > r = 0.05810.
   - Boundary: the pure decision function `refinanceApplies(oldRate, newRate)` called with oldRate = 1.02 * newRate computed in floating point, which SHALL NOT apply.
   The firm-level cases SHALL also assert the 1.02 debt fee rule: the displayed debt is D'_preFee × 1.02 only when refinance applies, and equals D'_preFee otherwise.
5. THE unit tests SHALL include at least one test for each of the following cases, each asserting the exact expected output or error: every EngineError code defined by the Engine; the debt-free case (D' = 0 after treatment); the diagnose case with E <= 0; the keep share case with Q <= 0; the median of an even-length list; and the failure message format "Year {t}: operating margin {m}%, coverage {icr}. {name} stays undead."
6. THE unit tests SHALL include tests that assert exact expected values for: the first 5 outputs of the mulberry32 sequence for one fixed seed; the FNV-1a hash of one fixed string; and the `seedFrom` result for one fixed cik, Treatment and ISO date. Each test SHALL also assert that a repeated call returns identical values.
7. THE unit tests SHALL cover the Worker_Wrapper using an injected fake worker, without starting a real Web Worker. They SHALL assert that a request is posted to the fake worker, that a posted response resolves the matching promise, that an error response from the fake worker rejects the promise, and that the `superseded`, `aborted` and separate-Channel cases of Requirement 12.12 to 12.15 behave as stated.
8. THE Test_Suite SHALL run with Vitest. WHEN `pnpm test`, `pnpm typecheck`, `pnpm lint` and `pnpm format` are each run from `web`, each command SHALL exit with code 0, with 0 failing tests, 0 type errors, 0 lint errors and 0 formatting differences.
9. IF any hand-computed Ashgrove_Works figure in criteria 1 to 4 differs from the Engine output beyond its stated tolerance, THEN THE Test_Suite SHALL fail with an assertion message that shows the expected value and the actual value.

### Requirement 16: Steering file update and commit scope

**User Story:** As a maintainer, I want the written rules to match the code, so that steering and engine do not disagree.

#### Acceptance Criteria

1. THE Steering_File SHALL state:
   - for tool 4 (refinance), that refinance applies only if 1.02 * new rate < r + delta, i.e. only when it lowers annual interest cost after the 2% fee, and that when it applies the projected annual interest is D'_preFee × (1.02 × new rate), the displayed debt is D'_preFee × 1.02 and the displayed rate is the new rate (Requirement 7.5, 8.7);
   - for the failure hint, that the smallest extra cost cut is found by an upward linear scan in steps of 0.1 percentage point up to 0.08, rerunning the full treatment pipeline on the same random path (Requirement 9.5);
   - property 1 as amended in Requirement 13.1 and 13.11: a debt-only treatment never lowers the projected ICR of any year with non-negative EBIT, and never turns a covered year into an uncovered one, on the same random path;
   - property 2 with the domain of Requirement 13.3: a larger cost cut never gives a lower year-1 EBIT, nor a lower year-1 ICR when year-1 EBIT is non-negative, on firms whose operating margin is within [-0.3, 0.3];
   - property 7 reading "Refinance changes the rate only when 1.02 * new rate is lower than the old rate (r + delta), so it never raises annual interest cost."
2. THE Steering_File update of criterion 1 SHALL be committed together with this requirements document, before any Engine code.
3. WHERE the design records further rule amendments (fixed Canonical_Order, per-path Random_Block, typed errors instead of clamping, UTC date in `seedFrom`, same-day determinism within one JavaScript engine), THE Steering_File SHALL be updated to record them before or in the commit that delivers the Engine.
4. THE commits for this spec SHALL include only files under `web/src/engine`, `web/src/state`, `web/src/test/arbitraries.ts`, `.kiro/specs/rescue-engine` and the Steering_File, AND every file SHALL be staged by explicit path, never with `git add -A`, `git add .` or `git commit -a`.
5. THE Engine commit messages SHALL use the form `type(rescue-engine): description`, where type is one of `feat`, `fix`, `test`, `chore` or `docs`, with a subject line of at most 72 characters.
6. WHEN the spec is implemented, THE Engine SHALL leave all files under `/pipeline` and all `/data` generation code unchanged, verified by an empty `git diff` for those paths.
