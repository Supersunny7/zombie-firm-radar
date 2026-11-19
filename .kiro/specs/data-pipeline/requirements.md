# Requirements Document

## Introduction

The data pipeline turns SEC EDGAR XBRL filings and the FRED DGS10 series into the four static files of data contract v2: `firms_index.json`, `firms/{cik}.json`, `macro.json` and `keeper_log.json`. The web app (graveyard, lab, rescue-engine) reads these files. The pipeline is Python 3.11+ (requests, pandas, pytest, hypothesis), lives under `/pipeline`, and is owned by Frank. It runs on macOS with `.venv/bin/python -m pipeline.run` from the repository root.

The pipeline follows `data-contract.md`, `zombie-definition.md`, `edgar-rules.md` and `structure.md`. Frank's binding decisions of 2026-11-15 refine those files in the places listed below. Where a requirement refines a steering file, the requirement says so and names the steering file update that ships in the same change.

Delivery date: 2026-11-16.

Items marked **[Assumption]** are conservative defaults chosen where the brief is silent. Frank should confirm or change each one before design.

## Phases

Frank changed the goal of this spec on 2026-11-16. The game design is not decided and will be chosen after the real data has been seen. The work is split in two phases.

- **Phase 1 (now)**: get the full raw dataset from the two SEC bulk files and produce a data shape report (`pipeline/reports/data_shape.md` plus small CSVs). The firm-year panel and the events table are internal analysis artifacts written to `pipeline/out/` (git-ignored). They are not data contract files. Requirements 20 to 29 define phase 1.
- **Phase 2 (after the design is chosen)**: the four contract-v2 files, the Act 1 candidate report, `--sample` and `--sector`, fixtures and the full offline end-to-end test. Their requirements stay in this document unchanged and are marked "Phase 2".

Phase 1 reuses, without changing behaviour, the config, the Run_Report, the test harness, `icr()`, the HTTP Rate_Limiter and Cache, and the Fact_Extractor rules. Phase 1 adds code next to them and does not edit `extract()`, `universe.py` or `icr()`.

### Status of the existing requirements

| Requirement | Status | Note |
| --- | --- | --- |
| 1 CLI | Phase 2 | Phase 1 has its own entry point (Requirement 20). |
| 2 Universe and exclusions | Phase 2 | In phase 1, exclusions become flags (Requirement 23). |
| 3 Seeded sample | Phase 2 | No sampling in phase 1. |
| 4 SEC access rules | Kept, extended | 4.1 to 4.8 and 4.13 apply as written. 4.9 to 4.12 (failed firm, 2% rule) are Phase 2 only. The "one request per firm" wording also covers the two bulk files (Requirement 21). |
| 5 Cache | Kept, extended | The 24-hour rule also covers the two bulk files. They use a streaming download path (Requirement 21) because Requirement 5.1 and 5.2 keep whole bodies in memory. The existing `HttpClient.get()` is unchanged. |
| 6 Fiscal-year assignment | Kept, one part changed | 6.1 to 6.8 and 6.12 to 6.16 unchanged. 6.9, 6.10 and 6.13 (latest 5 years, no window means no file) are Phase 2 only. The panel uses a fixed FY range (Requirement 24). |
| 7 Tag priority and missing values | Kept, extended | Unchanged. 7.7 (interest tag in the Run_Report) is replaced in phase 1 by panel columns. Cash is added as one more instant tag (Requirement 24). |
| 8 icr() | Kept | Unchanged. |
| 9 Status and reasons | Phase 2 | Phase 1 uses only the yearly zombie flag (Requirement 24). |
| 10 Implied rate and flags | Phase 2 | |
| 11 rescue_inputs and sector medians | Phase 2 | |
| 12 Macro data | Phase 2 | |
| 13 Output, validation and atomic replace | Phase 2 | |
| 14 Keeper log | Phase 2 | |
| 15 Reports | Phase 2 | Phase 1 report is Requirement 26. |
| 16 Run report | Kept, extended | Requirement 27 adds the bulk fields. |
| 17 Tests | Kept, extended | Requirement 28 adds phase 1 tests. 17.3, 17.12 to 17.14 (recorded fixtures) are Phase 2. |
| 18 Performance | Phase 2 | |
| 19 Dependencies, secrets and documentation | Kept, extended | Requirement 29. |
| 20 to 29 | New, Phase 1 | |

## Glossary

- **Pipeline**: the Python package under `/pipeline` started with `python -m pipeline.run`.
- **CLI**: the command-line interface of the Pipeline (`pipeline/run.py`).
- **SEC_Client**: the Pipeline component that sends all HTTP requests to `sec.gov` and `data.sec.gov`.
- **Rate_Limiter**: the single shared limiter through which every SEC_Client request passes.
- **Cache**: raw HTTP responses stored under `pipeline/.cache`, keyed by URL, each with its fetch timestamp.
- **FRED_Client**: the Pipeline component that fetches the DGS10 series.
- **Universe_Builder**: the component that selects firms from `company_tickers.json`, a CIK file and/or a ticker file, merges the selections of all given selection options into one deduplicated firm set, and applies the exclusion rules.
- **Sampler**: the Universe_Builder part that serves `--sample N --seed S`. It draws a seeded simple random sample of Eligible_Firms from the shuffled CIK list, with a minimum for each Minimum_Division (Requirement 3).
- **Minimum_Divisions**: the two SIC_Divisions "Retail Trade" and "Transportation, Communications, Electric, Gas and Sanitary Services" (SIC 4000-4899 only, since utilities are excluded), from which the Sampler selects at least m = 5 firms each (Requirement 3.2). The game uses these sectors in Acts 2 and 3.
- **Scan_Limit**: the maximum number of CIKs the Sampler visits, max(10 * N, 200) (Requirement 3.3). A visited CIK is one whose submissions the Sampler tried to read, including Failed_Firms and excluded firms.
- **Fact_Extractor**: the component that turns a companyfacts response into per-fiscal-year values.
- **Scorer**: the component that computes ICR, status, reasons, implied_rate, shock_eligible, rescue_eligible and rescue_inputs.
- **icr()**: the single Python function that computes the interest coverage ratio. Returns EBIT / interest when interest > 0 and both values are finite numbers, otherwise null. It must agree with every case in `data/fixtures/icr_cases.json`.
- **Writer**: the component that builds the output files in a temporary folder, validates them and replaces the output files.
- **Keeper_Log_Builder**: the component that adds the run's entry to `keeper_log.json`.
- **Report_Builder**: the component that runs `pipeline/scripts/threshold_report.py` and writes `pipeline/reports/act1_candidates.md`.
- **Run_Report**: the file `pipeline/.cache/run_report.json` written on every run.
- **Output_Dir**: the folder given by `--out` (default `data`).
- **Protected_Dirs**: `data/mock`, `data/schema` and `data/fixtures`.
- **SIC_Division**: the standard SIC division name derived from a SIC code. The names are the ones already used in `data/mock`: "Agriculture, Forestry and Fishing" (0100-0999), "Mining" (1000-1499), "Construction" (1500-1799), "Manufacturing" (2000-3999), "Transportation, Communications, Electric, Gas and Sanitary Services" (4000-4999, of which 4900-4999 are excluded), "Wholesale Trade" (5000-5199), "Retail Trade" (5200-5999), "Finance, Insurance and Real Estate" (6000-6799, excluded), "Services" (7000-8999), "Public Administration" (9100-9729), "Nonclassifiable Establishments" (9900-9999).
- **Eligible_Firm**: a firm whose SIC code exists and is outside 6000-6799 and 4900-4999, whose Age_Years is >= 10, and that meets the Recency_Rule. For the output, a firm selected by `--ciks` skips the Recency_Rule even if another selection option also selected it (Requirement 2.9); the Sampler still applies the Recency_Rule to its own picks (Requirement 3.7).
- **Run_Year**: the calendar year of `meta.generated_at` (UTC).
- **First_Filing_Year**: the year of the earliest filing date in the firm's submissions, including the older pages listed under `files`.
- **Age_Years**: Run_Year minus First_Filing_Year.
- **Fiscal_Year (FY)**: the year a period belongs to under the Compustat convention: if the period end date falls in January to May, FY = end year - 1; if it falls in June to December, FY = end year.
- **Annual_Fact**: an XBRL fact from form 10-K or 10-K/A with `fp` = FY. Facts from 10-KT, 10-K405 and all other forms are not Annual_Facts.
- **Flow_Item**: revenue, EBIT and interest expense, including both parts of the EBIT fallback. A Flow_Item value is usable only if its period lasts 350 to 380 days inclusive.
- **Instant_Item**: total debt, total assets and equity, taken from a fact whose instant date lies within 7 calendar days of the Fiscal_Year_End (Requirement 6.5).
- **Fiscal_Year_End**: the end date of the firm's annual Flow_Item period for that FY.
- **Firm_Window**: the firm's own latest 5 available Fiscal_Years, sorted ascending.
- **Latest_FY**: the last Fiscal_Year in the Firm_Window.
- **Recency_Rule**: Latest_FY >= 2024.
- **Interest_Tag_Priority**: `InterestExpense`, then `InterestExpenseNonoperating`, then `InterestExpenseDebt`, then `InterestAndDebtExpense`. Net interest tags are never used.
- **Reported_Zero_Interest**: interest expense present for a year with value exactly 0.
- **Missing_Interest**: no usable interest expense value for a year under Interest_Tag_Priority.
- **Usable_Year**: for rescue_inputs, a year with revenue > 0 and EBIT not null (same rule as `make_mock.py`).
- **Attempted_Firm**: a firm for which the Pipeline sent, or read from Cache, at least one per-firm request (submissions or companyfacts) in this run.
- **Failed_Firm**: an Attempted_Firm whose per-firm fetch still fails after all retries, or whose response cannot be parsed as JSON.
- **Act1_Candidate**: a Manufacturing firm (SIC 2000-3999) in the output that matches one of the three Act 1 cases in Requirement 15.
- **Provisional_Check**: the one-tool projection of `make_mock.py` `provisional_projection`, labeled PROVISIONAL until rescue-engine v2 can be called from Python.

- **Phase 1 terms below** apply to Requirements 20 to 29 only.
- **Bulk_Companyfacts**: the file `https://www.sec.gov/Archives/edgar/daily-index/xbrl/companyfacts.zip`. Each member is one firm's companyfacts JSON, with the same structure as the per-firm endpoint.
- **Bulk_Submissions**: the file `https://www.sec.gov/Archives/edgar/daily-index/bulkdata/submissions.zip`. Per CIK it holds one main file `CIK##########.json` and zero or more older pages `CIK##########-submissions-NNN.json`.
- **Bulk_Downloader**: the component that downloads the two bulk files to `pipeline/.cache`.
- **Bulk_Reader**: the component that reads a bulk file one member at a time.
- **Panel_Extractor**: the component that builds the Firm_Table and the Panel from Bulk_Companyfacts and Bulk_Submissions, reusing the Fact_Extractor rules.
- **Events_Extractor**: the component that builds the Events_Table from Bulk_Submissions.
- **Shape_Reporter**: the component that writes the Data_Shape_Report and its CSVs.
- **Phase1_Out_Dir**: `pipeline/out` (git-ignored). **Reports_Dir**: `pipeline/reports` (committed).
- **Universe_P1**: every CIK in Bulk_Companyfacts that has at least one Annual_Fact (form 10-K or 10-K/A, `fp` = FY) in any tag. No firm is dropped.
- **Firm_Table**: one row per CIK of Universe_P1.
- **Panel**: one row per CIK and Fiscal_Year for FY2015 to FY2025 inclusive (Panel_Years).
- **Gap_Row**: a Panel row where every money field is null.
- **Flags**: the four booleans `is_financial` (SIC 6000-6799), `is_utility` (SIC 4900-4999), `no_sic` (Requirement 2.5 rule) and `age_under_10`. Plus `parse_error` (Requirement 22.4).
- **Age_Run**: Run_Year minus First_Filing_Year (the existing Age_Years). Only `age_under_10` uses it.
- **Age_At_FY**: whole years from the firm's first filing date to the Fiscal_Year_End of a Panel row, by date arithmetic (a year is complete on the anniversary date). Null when the first filing date or the Fiscal_Year_End is null.
- **Zombie_Flag**: for a Panel row of fiscal year Y, true when Age_At_FY >= 10 and icr() is non-null and below 1 in Y, Y-1 and Y-2. False otherwise, including when any of the three icr() values is null or Age_At_FY is null.
- **Core_Firm_Year**: a Panel row where the firm has `is_financial` false, `is_utility` false and Age_At_FY >= 10.
- **Present_Row**: a Panel row with at least one non-null money field.
- **Event_Type**: `bankruptcy` (8-K or 8-K/A with item 1.03), `acquisition_disposition` (8-K or 8-K/A with item 2.01), `delisting` (form 25 or 25-NSE), `deregistration` (form 15-12B, 15-12G or 15-15D).
- **Events_Table**: one row per (accession number, Event_Type).
- **Breaking_Rate**: (EBIT - interest expense) / total debt, in percentage points. The rate rise at which interest equals EBIT.
- **Data_Shape_Report**: `pipeline/reports/data_shape.md`.

## Requirements

### Requirement 1: Command-line interface

**Phase:** Phase 2 (phase 1 has its own entry point, Requirement 20).

**User Story:** As Frank, I want one command with clear firm-selection options, so that I can build real data for a ticker list, specific CIKs, a sample or one sector.

#### Acceptance Criteria

1. THE CLI SHALL be started with `python -m pipeline.run` from the repository root.
2. WHEN `--tickers FILE` is given, THE Universe_Builder SHALL read one ticker per line from FILE, ignoring blank lines and surrounding whitespace, map each ticker to a CIK through `company_tickers.json` using a case-insensitive match, and process each resulting CIK once, even if several tickers map to it. **[Assumption: duplicate CIKs are de-duplicated.]**
3. WHEN `--ciks FILE` is given, THE Universe_Builder SHALL read one CIK per line from FILE, ignoring blank lines and surrounding whitespace, zero-pad each CIK to 10 digits, and process each resulting 10-digit CIK once. **[Assumption: blank-line handling and de-duplication match `--tickers`.]**
4. WHEN `--sample N` is given with N an integer >= 1, THE Sampler SHALL select N Eligible_Firms as a seeded simple random sample with the Minimum_Divisions rule of Requirement 3, using the seed from `--seed S`, so that the same N, S and `company_tickers.json` content always give the same set of CIKs. IF fewer than N Eligible_Firms are found, THEN THE Sampler SHALL handle the shortfall as defined in Requirement 3.9. **[Assumption: shortfall handling.]**
5. WHEN `--sample N` is given without `--seed`, THE Sampler SHALL use seed 0. **[Assumption]**
6. WHEN `--sector NAME` is given, THE Universe_Builder SHALL select every Eligible_Firm in `company_tickers.json` whose SIC_Division equals NAME, compared case-insensitively, ignoring leading and trailing whitespace in NAME.
7. IF `--sector NAME` matches no SIC_Division in the Glossary, or matches "Finance, Insurance and Real Estate", THEN THE CLI SHALL exit with a non-zero code, before any network request, and print the list of valid division names (every Glossary SIC_Division except "Finance, Insurance and Real Estate").
8. IF none of `--tickers`, `--ciks`, `--sample` and `--sector` is given, THEN THE CLI SHALL exit with a non-zero code and a usage message, before any network request.
9. THE CLI SHALL accept `--out DIR` and default DIR to `data`.
10. IF `--out` resolves, after relative paths and symbolic links are resolved against the repository root, to a Protected_Dir or to a folder inside a Protected_Dir, THEN THE CLI SHALL exit with a non-zero code before any network request and leave every file in Protected_Dirs unchanged.
11. IF a ticker from `--tickers` is not in `company_tickers.json`, THEN THE Universe_Builder SHALL record the ticker in the Run_Report with reason `ticker_not_found` and continue without counting the ticker as an Attempted_Firm.
12. IF a line in `--ciks FILE` is not 1 to 10 digits after whitespace is trimmed, THEN THE Universe_Builder SHALL record the line in the Run_Report with reason `invalid_cik` and continue.
13. IF the FILE given to `--tickers` or `--ciks` does not exist or cannot be read, THEN THE CLI SHALL exit with a non-zero code and an error message naming the file, before any network request.
14. IF `--sample` is given with a value that is not an integer >= 1, or `--seed` is given with a value that is not an integer, THEN THE CLI SHALL reject the arguments as defined in Requirement 3.11.
15. IF the union of the CIKs selected by all given selection options (criterion 16) is empty (for example, every ticker gives `ticker_not_found` or every line gives `invalid_cik`), THEN THE CLI SHALL exit with a non-zero code before any per-firm request and leave the existing files in Output_Dir unchanged. **[Assumption: an empty selection never overwrites outputs.]**
16. WHEN more than one of `--tickers`, `--ciks`, `--sample` and `--sector` is given, THE Universe_Builder SHALL accept any combination and SHALL set the run's firm set to the union of the CIKs selected by each given option, deduplicated by 10-digit CIK. Example: `--sample 50 --seed 1 --ciks pipeline/act1_ciks.txt`.
17. WHEN both `--sample` and at least one other selection option are given, THE Sampler SHALL select its N firms independently of the other options, without subtracting firms already selected by `--tickers`, `--ciks` or `--sector`, and without counting those firms toward the Minimum_Divisions, so that the union can hold fewer firms than the sum of the parts. **[Assumption]**
18. THE Run_Report SHALL record, for each output firm, every selection option (`--tickers`, `--ciks`, `--sample`, `--sector`) that selected the firm.

### Requirement 2: Firm universe and exclusions

**Phase:** Phase 2 (phase 1 uses flags, Requirement 23).

**User Story:** As Frank, I want the universe to follow the data contract exactly, so that banks, REITs, utilities and young firms never appear in the output.

#### Acceptance Criteria

1. THE Universe_Builder SHALL read SIC code, First_Filing_Year and filing history from `https://data.sec.gov/submissions/CIK##########.json`, including every older page listed under `files`.
2. IF the Universe_Builder cannot fetch or parse the main submissions response or any older page listed under `files` after all retries, THEN THE Universe_Builder SHALL treat the firm as a Failed_Firm, leave it out of every output file and not assign it an exclusion reason. **[Assumption: a partial filing history could give a wrong First_Filing_Year, so the firm is not scored.]**
3. IF a firm's SIC code, read as an integer, is between 6000 and 6799 inclusive, THEN THE Universe_Builder SHALL exclude the firm from every output file with exclusion reason `financial`.
4. IF a firm's SIC code, read as an integer, is between 4900 and 4999 inclusive, THEN THE Universe_Builder SHALL exclude the firm from every output file with exclusion reason `utility`.
5. IF a firm's SIC code is missing, empty, or cannot be read as an integer between 0100 and 9999, THEN THE Universe_Builder SHALL exclude the firm from every output file with exclusion reason `no_sic`. **[Assumption]**
6. THE Scorer SHALL compute Age_Years as Run_Year minus First_Filing_Year. For example, a firm whose first filing was in 2016 has Age_Years 10 in a 2026 run.
7. IF a firm's Age_Years is below 10, THEN THE Universe_Builder SHALL exclude the firm from every output file with exclusion reason `age_under_10`. A firm with Age_Years exactly 10 is not excluded by this rule.
8. WHERE a firm was selected only through `--tickers`, `--sample` or `--sector` and not through `--ciks`, IF the firm's Latest_FY is before 2024, THEN THE Universe_Builder SHALL exclude the firm with exclusion reason `not_recent`. A firm with Latest_FY exactly 2024 is not excluded by this rule.
9. WHERE a firm was selected through `--ciks`, THE Universe_Builder SHALL skip the Recency_Rule for that firm, also when `--tickers`, `--sample` or `--sector` selected the same firm, so that bankrupt or delisted firms whose filings stop before FY2024 can be included, and SHALL still apply the `financial`, `utility`, `no_sic`, `age_under_10` and `no_annual_facts` rules to that firm.
10. IF a firm has no Annual_Fact for any Fiscal_Year, THEN THE Universe_Builder SHALL exclude the firm with exclusion reason `no_annual_facts`. **[Assumption: such a firm has no Latest_FY, so it cannot be placed in the output.]**
11. IF a firm matches more than one exclusion rule, THEN THE Universe_Builder SHALL record only the first matching reason in this order: `no_sic`, `financial`, `utility`, `age_under_10`, `no_annual_facts`, `not_recent`. **[Assumption]**
12. WHEN the Universe_Builder excludes a firm, THE Writer SHALL leave the firm out of the `firms` list in `firms_index.json`, out of `meta.counts`, out of every `keeper_log.json` entry, and SHALL write no `firms/{cik}.json` file for it.
13. THE Run_Report SHALL list every exclusion reason (`financial`, `utility`, `no_sic`, `age_under_10`, `not_recent`, `no_annual_facts`) with the number of excluded firms and their 10-digit zero-padded CIKs. A reason with no excluded firms is listed with count 0 and an empty CIK list, and each count equals the length of its CIK list. **[Assumption: reasons with count 0 are listed rather than left out.]**

### Requirement 3: Seeded random sample

**Phase:** Phase 2.

**User Story:** As Frank, I want `--sample N --seed S` to draw the same seeded random sample of firms each time, with a guaranteed minimum from Retail Trade and from Transportation, so that runs are reproducible, sectors appear in their natural proportions, and the game has firms for Acts 2 and 3.

#### Acceptance Criteria

1. WHEN `--sample N --seed S` is given, alone or together with other selection options (Requirement 1.16), THE Sampler SHALL take the CIK list from `company_tickers.json`, remove duplicate CIKs, sort it ascending by 10-digit CIK, and then shuffle it with a PRNG seeded by S.
2. THE Sampler SHALL apply a minimum of m firms to each division in Minimum_Divisions, with m = 5. "Transportation, Communications, Electric, Gas and Sanitary Services" holds only firms with SIC 4000-4899, because utilities (4900-4999) are excluded. WHERE N < 10, THE Sampler SHALL use m = min(5, floor(N / 2)) for each Minimum_Division, so that the minimums never exceed N. **[Assumption: reduced minimum for N < 10.]**
3. THE Sampler SHALL visit at most Scan_Limit = max(SCAN_FACTOR * N, SCAN_FLOOR) CIKs of the shuffled list, with SCAN_FACTOR = 10 and SCAN_FLOOR = 200 (for N = 50 the limit is 500). A visited CIK is one whose submissions the Sampler tried to read, including Failed_Firms and excluded firms. THE Sampler SHALL stop visiting as soon as N firms are accepted, or the shuffled list is exhausted, or Scan_Limit CIKs have been visited, whichever happens first. The Scan_Limit is a safety backstop that keeps a sample run inside the 5-minute target of Requirement 18.1. **[Assumption: SCAN_FACTOR and SCAN_FLOOR are named constants so that they can be tuned.]**
4. WHILE the Sampler scans the shuffled list in order, WHEN a visited CIK is an Eligible_Firm (confirmed under criterion 7), THE Sampler SHALL accept the firm if (a) its SIC_Division is in Minimum_Divisions and count_d < m, or (b) N - accepted - deficit >= 1, where accepted is the number of firms accepted so far, count_d is the number of accepted firms in the firm's SIC_Division, and deficit is the sum over the Minimum_Divisions of max(0, m - count_d). Condition (b) means that a free place exists that is not reserved for a missing minimum. Apart from the reservation of places for the minimums, the accepted firms are the first Eligible_Firms of the shuffled order, so the sample is a simple random sample.
5. WHEN an Eligible_Firm meets neither condition of criterion 4, THE Sampler SHALL append the firm to an ordered overflow list, in the order found, and SHALL NOT count it as accepted.
6. IF the scan stops under criterion 3 with fewer than N firms accepted, THEN THE Sampler SHALL accept firms from the front of the overflow list, in the order found, until N firms are accepted or the overflow list is empty. This backstop fill applies only when the scan ended without reaching N accepted firms.
7. THE Sampler SHALL count a firm as eligible only after its companyfacts response confirms the Recency_Rule (Latest_FY >= 2024) and Age_Years >= 10, whether or not `--ciks` also selects the firm (the `--ciks` exemption of Requirement 2.9 applies to the firm's output, not to the Sampler's acceptance). A firm whose SIC code is missing, falls in 6000-6799 or 4900-4999, or maps to no SIC_Division (for example 1800-1999, 9000-9099 or 9730-9899) SHALL NOT be counted as eligible. **[Assumption: recency needs companyfacts, so sampling fetches companyfacts for each candidate that passes the submissions checks and would be accepted under criterion 4.]** **[Assumption: SIC codes outside every SIC_Division are treated as not eligible.]** **[Assumption: lazy confirmation. A candidate that passes the submissions checks but meets neither condition of criterion 4 is appended to the overflow list without a companyfacts request, and its companyfacts are fetched only when the backstop fill of criterion 6 reaches it. A candidate that fails confirmation then is skipped. The resulting selection SHALL equal the selection obtained by confirming every visited candidate up front, because the decision of criterion 4 depends only on the accepted firms, not on the candidate's own eligibility.]**
8. FOR ALL seeds S and sample sizes N, running the Sampler twice on the same Cache, with every needed response already cached, SHALL select the same CIKs in the same order (determinism property). The order is acceptance order: firms accepted under criterion 4 first, then firms accepted from the overflow list under criterion 6.
9. THE Run_Report SHALL record, for every run with `--sample`, the requested N, the number of firms selected, the shortfall (N minus the number selected), the seed used, the number of visited CIKs, the Scan_Limit and the selected count per SIC_Division. IF fewer than N firms are selected after the scan and the overflow list are exhausted, THEN THE Sampler SHALL return all accepted firms.
10. IF a Minimum_Division ends with fewer than m selected firms (because Scan_Limit was reached or too few such Eligible_Firms exist), THEN THE Sampler SHALL still return the sample, THE Run_Report SHALL record the division, the required minimum and the selected count in `sample_minimums_unmet`, and THE CLI SHALL print a warning naming each such division. The exit code SHALL stay 0. **[Assumption: an unmet minimum is a warning, not an error.]**
11. IF N is not an integer >= 1, or S is not an integer, THEN THE CLI SHALL exit with a non-zero exit code and an error message naming the invalid argument, before sending any request and without writing or changing any file in Output_Dir.
12. IF a candidate becomes a Failed_Firm during sampling, THEN THE Sampler SHALL skip that candidate without counting it as accepted or adding it to the overflow list, SHALL record its CIK in the Run_Report, SHALL count it as visited, and SHALL continue with the next CIK in shuffled order.
13. FOR ALL seeds S, sample sizes N and in-memory universes, THE selected set SHALL be a subset of the Eligible_Firms among the visited CIKs and SHALL contain exactly min(N, number of Eligible_Firms among the visited CIKs) firms (property).
14. FOR ALL seeds S, in-memory universes and N >= 10, IF each Minimum_Division has at least m Eligible_Firms among the first Scan_Limit CIKs of the shuffled order, THEN THE selection SHALL contain at least m firms from each Minimum_Division (property).
15. FOR ALL seeds S and sample sizes N, THE same seed and the same inputs SHALL give the same ordered selection (property; same statement as criterion 8, checked on in-memory universes).
16. FOR ALL seeds S and sample sizes N, IF the universe holds no firm of any Minimum_Division and Scan_Limit is at least the length of the shuffled list, THEN THE selection SHALL equal the first N Eligible_Firms of the shuffled order (simple-random-sample property).

### Requirement 4: SEC access rules

**Phase:** Kept. 4.9 to 4.12 are Phase 2 only; the bulk downloads follow Requirement 21.

**User Story:** As Frank, I want every SEC request to follow SEC fair-access rules, so that the pipeline is not blocked and stays a good citizen.

#### Acceptance Criteria

1. THE SEC_Client SHALL send the header `User-Agent: ZombieFirmRadar <email>` on every request to `sec.gov` and `data.sec.gov`, including retries, with `<email>` set to the value of the environment variable `SEC_CONTACT_EMAIL` after leading and trailing whitespace is removed.
2. IF `SEC_CONTACT_EMAIL` is unset, empty or whitespace-only, THEN THE CLI SHALL exit with a non-zero code and an error message naming the missing variable, before it sends any SEC request and without changing any file in Output_Dir.
3. THE SEC_Client SHALL send every SEC request, including each retry attempt, through the single Rate_Limiter, and SHALL answer requests served from the Cache without sending a request or using a Rate_Limiter slot.
4. THE Rate_Limiter SHALL default to 5 requests per second when no rate is configured.
5. IF the configured Rate_Limiter rate is above 10 requests per second or is not a positive number, THEN THE CLI SHALL exit with a non-zero code and an error message naming the invalid rate, before it sends any SEC request and without changing any file in Output_Dir.
6. FOR ALL request sequences, including retry attempts, THE Rate_Limiter SHALL let through no more than its configured number of requests in any 1-second window (property).
7. WHEN SEC returns HTTP 429 or a 5xx status, THE SEC_Client SHALL retry the same request up to 5 attempts in total, waiting 1, 2, 4 and 8 seconds before attempts 2 to 5. When a `Retry-After` header is present, the SEC_Client SHALL wait the larger of that backoff delay and the `Retry-After` value. **[Assumption: attempt count and base delay.]**
8. IF SEC returns an HTTP status other than 2xx, 429 or 5xx, THEN THE SEC_Client SHALL not retry the request and SHALL return the failure to its caller at once (for companyfacts 404, see criterion 11). **[Assumption]**
9. IF a per-firm fetch (submissions or companyfacts) still fails after the last allowed attempt, or its response cannot be parsed as JSON, THEN THE Pipeline SHALL log the firm's CIK, mark the firm as a Failed_Firm, leave the firm out of every output file, write no Cache entry for the failed response, and continue with the next firm. **[Assumption: failed responses are not cached.]**
10. THE Pipeline SHALL record every Failed_Firm in the Run_Report with its CIK, the failing URL and a failure reason (the last HTTP status, or the parse error), and SHALL never give a Failed_Firm the status `insufficient_data`.
11. WHEN companyfacts returns HTTP 404 for a firm that passed the universe checks, THE Pipeline SHALL treat the firm as having no annual facts (Requirement 2.10), SHALL not count it as a Failed_Firm, and SHALL not retry the request. **[Assumption]**
12. IF the number of Failed_Firms is more than 2% of the number of Attempted_Firms (exactly 2% passes), THEN THE Pipeline SHALL exit with a non-zero code, write the Run_Report with the Failed_Firm count, the Attempted_Firm count and the failure list, and leave every file in Output_Dir unchanged.
13. IF `company_tickers.json` cannot be fetched after the retries in criterion 7 and is not in the Cache, THEN THE Pipeline SHALL exit with a non-zero code, send no per-firm request, and leave Output_Dir unchanged.

### Requirement 5: Cache

**Phase:** Kept; extended to the bulk files by Requirement 21.

**User Story:** As Frank, I want raw responses cached, so that reruns are fast, deterministic and gentle on SEC.

#### Acceptance Criteria

1. WHEN the SEC_Client receives a successful response for a URL, THE SEC_Client SHALL store the unmodified response body under `pipeline/.cache`, keyed by the request URL with secret values removed (Requirement 19.4), together with that URL and the fetch timestamp in UTC. A successful response is one with a success status whose body is complete. For JSON endpoints the body must also parse as JSON.
2. WHEN the SEC_Client is asked for a URL whose Cache entry is less than 24 hours old, THE SEC_Client SHALL return the cached body byte-for-byte without sending a network request and without consuming a Rate_Limiter slot. Entry age is the current UTC time minus the stored fetch timestamp.
3. WHEN the SEC_Client is asked for a URL whose Cache entry is 24 hours old or older, THE SEC_Client SHALL refetch the URL through the Rate_Limiter. It SHALL replace the cached body and fetch timestamp only after the refetch succeeds under the definition in criterion 1.
4. IF a refetch of a stale cached URL still fails after all retries, THEN THE SEC_Client SHALL treat the request as failed in the same way as a failed fetch with no Cache entry, SHALL NOT return the stale body to any caller, and SHALL leave the existing Cache entry unchanged on disk. **[Assumption: stale cache is not used as a fallback, so that output never silently mixes data ages.]**
5. THE FRED_Client SHALL use the same Cache, the same keying, the same 24-hour rule and the same failure behavior defined in criteria 1 to 4 and 7 to 8. **[Assumption]**
6. THE repository `.gitignore` SHALL keep `pipeline/.cache/` ignored (already present; the change must not remove it).
7. IF a request fails after all retries, or returns a response that is not successful under criterion 1, THEN THE SEC_Client SHALL NOT create or overwrite a Cache entry for that URL.
8. IF a Cache entry for a requested URL cannot be read, has no fetch timestamp, or, for a JSON endpoint, has a body that does not parse as JSON, THEN THE SEC_Client SHALL treat the URL as having no Cache entry and fetch it through the Rate_Limiter. It SHALL replace the unreadable entry only after that fetch succeeds.

### Requirement 6: Fiscal-year assignment

**Phase:** Kept. 6.9, 6.10 and 6.13 are Phase 2 only; the Panel uses Requirement 24.

**User Story:** As Frank, I want every value assigned to the right fiscal year, so that ICR streaks reflect real consecutive years.

#### Acceptance Criteria

1. THE Fact_Extractor SHALL use only Annual_Facts, and SHALL discard every fact whose form is not `10-K` or `10-K/A` or whose `fp` is not `FY` (including all 10-Q, 10-KT and 10-K405 facts) before any further step of this requirement.
2. THE Fact_Extractor SHALL assign each Annual_Fact to a Fiscal_Year by its period end date under the Compustat convention, and SHALL ignore the `fy` field for this purpose, so that a comparative prior-year fact reported in a later 10-K is assigned to the Fiscal_Year of its own period end date.
3. FOR ALL valid calendar dates, THE Fiscal_Year mapping SHALL return end year - 1 for months January to May and end year for months June to December (property; examples: 2025-01-31 maps to FY2024, 2024-05-31 maps to FY2023, 2024-06-01 maps to FY2024, 2024-06-30 maps to FY2024, 2024-12-31 maps to FY2024, 2024-02-29 maps to FY2023).
4. THE Fact_Extractor SHALL use a Flow_Item value only if its period duration, measured as period end date minus period start date in calendar days, is 350 to 380 days inclusive, and SHALL treat a Flow_Item value with a shorter or longer duration, or with no start date, as absent. **[Assumption: duration is end date minus start date, so a 52-week year (364 days) and a 53-week year (371 days) both qualify.]**
5. THE Fact_Extractor SHALL take each Instant_Item from a fact whose instant date is within 7 calendar days of the Fiscal_Year_End of that FY, inclusive, before or after (this covers 52/53-week years). It SHALL prefer a fact dated exactly on the Fiscal_Year_End, and otherwise SHALL use the fact whose instant date is closest to the Fiscal_Year_End.
6. IF no fact for an Instant_Item has an instant date within 7 calendar days of the Fiscal_Year_End, THEN THE Fact_Extractor SHALL set that Instant_Item to null for that year.
7. WHEN the same tag and the same period (same start date and end date for a Flow_Item; same instant date for an Instant_Item) appear in more than one Annual_Fact filing, THE Fact_Extractor SHALL keep the value from the filing with the latest filed date.
8. IF two filings with the same filed date report different values for the same tag and period, THEN THE Fact_Extractor SHALL keep the value from the filing with the larger accession number. **[Assumption: deterministic tiebreak.]**
9. THE Fact_Extractor SHALL build the Firm_Window from the firm's latest 5 Fiscal_Years that each have at least one Flow_Item value that passes criteria 1 and 4, and SHALL set Latest_FY to the highest of those Fiscal_Years. **[Assumption: what makes a year "available".]**
10. THE Fact_Extractor SHALL include every Fiscal_Year between the earliest Firm_Window year and Latest_FY inclusive as a `years` entry, sorted ascending. A Fiscal_Year in that range with no data gets every money field, `icr`, `ebit_tag` and `revenue_tag` set to null and `debt_tags` set to an empty array, so that the gap stays visible and breaks the streak. **[Assumption]**
11. WHEN the Writer writes a firm file, THE Writer SHALL set `as_of_filing.fiscal_year` to Latest_FY, `as_of_filing.filed` to the latest filed date among the Annual_Fact filings whose values appear in the Latest_FY `years` entry, and `as_of_filing.form` to that filing's actual form (`10-K` or `10-K/A`).
12. IF usable Flow_Item periods (criteria 1 and 4) for one Fiscal_Year have more than one distinct end date, THEN THE Fact_Extractor SHALL use the latest of those end dates as the Fiscal_Year_End for that FY, and SHALL set to null every Flow_Item value for that FY whose period ends on a different date. **[Assumption: one Fiscal_Year_End per FY, for example after a fiscal year-end change.]**
13. IF a firm has no Fiscal_Year with a Flow_Item value that passes criteria 1 and 4, THEN THE Fact_Extractor SHALL report the firm as having no Firm_Window and no Latest_FY, and THE Writer SHALL write no `firms/{cik}.json` file and no `firms_index.json` row for that firm, including when the firm was passed with `--ciks`. **[Assumption: a firm without any annual year cannot fill `as_of_filing`.]**
14. IF two candidate instant dates for an Instant_Item are equally close to the Fiscal_Year_End (one before, one after), THEN THE Fact_Extractor SHALL use the earlier date. **[Assumption]**
15. THE Fact_Extractor SHALL match each debt part tag (`LongTermDebtNoncurrent`, `LongTermDebtCurrent`, `ShortTermBorrowings`, `LongTermDebt`) to an instant date independently under criteria 5, 6 and 14, so that different parts of one FY may use different instant dates. **[Assumption]**
16. WHEN an Instant_Item instant date has been chosen under criteria 5 and 14, THE Fact_Extractor SHALL apply the latest-filed-wins and accession-number rules of criteria 7 and 8 among the facts with that chosen date. **[Assumption]**

### Requirement 7: Tag priority and missing values

**Phase:** Kept; 7.7 is replaced in phase 1 by panel columns.

**User Story:** As Frank, I want a fixed tag order and recorded tags, so that every number is traceable to the filing.

#### Acceptance Criteria

1. THE Fact_Extractor SHALL treat a tag as having a usable value for a FY only if, after the selection rules of Requirement 6 (Fiscal_Year assignment, duplicate and tiebreak rules) are applied, the tag has exactly one Annual_Fact for that FY that is a finite number in the `USD` unit and that also meets one of these conditions: for a Flow_Item, its period lasts 350 to 380 days inclusive; for an Instant_Item, its instant date is the date chosen within 7 calendar days of the Fiscal_Year_End under Requirement 6.5, 6.14 and 6.15.
2. THE Fact_Extractor SHALL take revenue from `Revenues`, then `RevenueFromContractWithCustomerExcludingAssessedTax`, then `SalesRevenueNet`. It SHALL use the first tag in that order with a usable value for that FY, record that tag name in `revenue_tag`, and never sum or average values from several revenue tags.
3. WHEN `OperatingIncomeLoss` has a usable value for the FY, THE Fact_Extractor SHALL set EBIT to that value and record `ebit_tag` = `OperatingIncomeLoss`, even if the EBIT fallback parts also have usable values.
4. WHEN `OperatingIncomeLoss` has no usable value for the FY, and both `IncomeLossFromContinuingOperationsBeforeIncomeTaxesExtraordinaryItemsNoncontrollingInterest` and an interest expense value chosen by Interest_Tag_Priority have usable values with the same start date and the same end date, THE Fact_Extractor SHALL set EBIT = pre-tax income + interest expense and record `ebit_tag` = `IncomeLossFromContinuingOperationsBeforeIncomeTaxesExtraordinaryItemsNoncontrollingInterest`.
5. IF `OperatingIncomeLoss` has no usable value for the FY and either EBIT fallback part has no usable value, or the two parts do not share the same start date and end date, THEN THE Fact_Extractor SHALL write null for EBIT and null for `ebit_tag` for that FY.
6. THE Fact_Extractor SHALL take interest expense, both for ICR and for the EBIT fallback, from the first tag in Interest_Tag_Priority that has a usable value for the FY. It SHALL never use a net interest tag. It SHALL treat Reported_Zero_Interest and negative reported values as usable values, writing them as reported rather than as null and not falling through to the next tag. (Per `zombie-definition.md`, the ICR for such a year is null.)
7. THE Run_Report SHALL record, for each firm and FY, the name of the interest tag used, or null when that year has Missing_Interest.
8. THE Fact_Extractor SHALL compute total debt as `LongTermDebtNoncurrent` + `LongTermDebtCurrent` + `ShortTermBorrowings`, using only parts that have a usable value for the FY under criterion 1 (instant date within 7 calendar days of the Fiscal_Year_End, Requirement 6.5). A missing part counts as 0 only when at least one of the three parts has a usable value. THE Fact_Extractor SHALL record in `debt_tags` exactly the part tags that contributed a value, in the order listed above.
9. IF none of `LongTermDebtNoncurrent`, `LongTermDebtCurrent` and `ShortTermBorrowings` has a usable value for the FY, THEN THE Fact_Extractor SHALL set total debt to the usable value of `LongTermDebt` and set `debt_tags` = [`LongTermDebt`]. If `LongTermDebt` also has no usable value, it SHALL write total debt as null and `debt_tags` as an empty array.
10. THE Fact_Extractor SHALL take total assets only from `Assets` and equity only from `StockholdersEquity`. It SHALL write null for either value when its tag has no usable value for the FY, and SHALL use no other tag as a substitute.
11. IF no tag in a priority list has a usable value for a FY, THEN THE Fact_Extractor SHALL write null for that value and null for its tag field where one exists (`revenue_tag`, `ebit_tag`), or an empty array for `debt_tags`. It SHALL never write 0 as a placeholder. A value is written as 0 only when the selected fact reports exactly 0.
12. THE Fact_Extractor SHALL write money values in USD exactly as reported in the `USD` unit, without scaling or rounding, and SHALL ignore facts in other units. A tag whose only facts for the FY are in other units has no usable value. **[Assumption]**

### Requirement 8: icr() function

**Phase:** Kept, unchanged.

**User Story:** As Frank, I want one ICR function that matches the shared fixtures, so that the pipeline, graveyard and rescue-engine agree.

#### Acceptance Criteria

1. THE Pipeline SHALL define icr() exactly once. Every Pipeline module that computes an interest coverage ratio (the Scorer's per-year `icr`, `latest_icr`, status, reasons and the Provisional_Check) SHALL call that function. No other Pipeline module SHALL divide EBIT by interest expense.
2. THE icr() function SHALL take two arguments, EBIT and interest expense, in USD. Each argument SHALL be a number or null. THE function SHALL return either a floating-point number or null.
3. WHEN icr() is called with the `ebit` and `interest` values of a case in `data/fixtures/icr_cases.json`, THE icr() function SHALL return that case's `expected` value. A number SHALL equal the expected value exactly as a double-precision float, with no tolerance. A JSON `null` SHALL mean the function returns null.
4. IF `data/fixtures/icr_cases.json` is missing, cannot be parsed, or contains zero cases, THEN the fixture test SHALL fail instead of being skipped.
5. IF interest is null, zero, negative or not a finite number (NaN or infinity), THEN THE icr() function SHALL return null, whatever the EBIT value. It SHALL not raise an error.
6. IF EBIT is null or not a finite number (NaN or infinity), THEN THE icr() function SHALL return null. It SHALL not raise an error.
7. WHEN EBIT is finite and interest is finite and greater than 0, THE icr() function SHALL return EBIT divided by interest. A negative EBIT SHALL give a negative ICR, and an EBIT of 0 SHALL give 0.
8. FOR ALL finite interest values > 0 and finite EBIT values e1 <= e2, icr(e1, interest) SHALL be <= icr(e2, interest) (zombie-definition property 1). A hypothesis property-based test SHALL check this.

### Requirement 9: Status and reasons

**Phase:** Phase 2.

**User Story:** As Frank, I want exactly one status per firm with readable reasons, so that the graveyard shows the right tombstone and explains it.

#### Acceptance Criteria

1. THE Scorer SHALL assign exactly one status per firm from `zombie`, `endangered`, `healthy` and `insufficient_data`. It SHALL check the rules in criteria 2 to 8 in numeric order and stop at the first rule that matches, so a firm that matches more than one rule gets the status of the lowest-numbered one. **[Assumption: evaluation order.]**
2. IF the Latest_FY has Missing_Interest, THEN THE Scorer SHALL assign `insufficient_data` with the reason "Interest expense missing in FY{Latest_FY}". This applies whatever the Latest_FY EBIT value is.
3. IF the Latest_FY has EBIT null, or interest expense reported below 0, THEN THE Scorer SHALL assign `insufficient_data` with one reason per affected field naming the field and FY, for example "EBIT missing in FY2024" or "Interest expense negative in FY2024". **[Assumption: the brief covers only missing and zero interest.]**
4. IF the Firm_Window has fewer than 3 consecutive Fiscal_Years (adjacent FY numbers, anywhere in the Firm_Window, not necessarily ending at Latest_FY) in which EBIT is not null and interest expense is present with a value >= 0, THEN THE Scorer SHALL assign `insufficient_data` with the reason "Fewer than 3 consecutive fiscal years with both EBIT and interest expense available". Under this criterion a Reported_Zero_Interest year counts as available and a negative-interest year does not. **[Assumption: what counts as "available", and that the 3 years need not end at Latest_FY.]**
5. WHEN Age_Years >= 10 and the icr() values of Latest_FY, Latest_FY - 1 and Latest_FY - 2 are all non-null and below 1, THE Scorer SHALL assign `zombie` with the single reason "ICR below 1 in FY{Latest_FY - 2}, FY{Latest_FY - 1}, FY{Latest_FY}", years in ascending order, for example "ICR below 1 in FY2022, FY2023, FY2024".
6. WHEN the Latest_FY has Reported_Zero_Interest, THE Scorer SHALL assign `healthy` with the reason "No interest expense in FY{Latest_FY}".
7. WHEN the Latest_FY icr() value is non-null and below 1, or at least 2 of the icr() values of Latest_FY, Latest_FY - 1 and Latest_FY - 2 are non-null and below 1, THE Scorer SHALL assign `endangered` with the reason "ICR below 1 in FY{a}, FY{b}", listing in ascending order exactly those years among Latest_FY - 2 to Latest_FY whose icr() value is non-null and below 1. A Fiscal_Year missing from the Firm_Window, or one with a null icr() value, SHALL count as not below 1. **[Assumption: endangered reason wording follows the zombie reason format.]**
8. WHEN no earlier rule matches, THE Scorer SHALL assign `healthy` with the reason "ICR {value} in FY{Latest_FY}, at least 1", where {value} is the Latest_FY icr() value rounded to 2 decimal places, for example "ICR 1.42 in FY2024, at least 1".
9. THE Scorer SHALL treat a year with a null icr() value, including a Reported_Zero_Interest year and a negative-interest year, as breaking the consecutive streak for the zombie test.
10. THE Scorer SHALL treat a missing Fiscal_Year inside the Firm_Window as breaking the consecutive streak. For example, a window of FY2020, FY2021, FY2023, FY2024 has no 3-year streak ending at FY2024.
11. THE Scorer SHALL write every status with at least one non-empty human-readable reason in `reasons`, and SHALL compute every ICR used in criteria 5 to 9 by calling icr() (Requirement 8.1).
12. FOR ALL firms with status `zombie`, the firm SHALL have Age_Years >= 10 and three consecutive non-null ICR values below 1 ending at Latest_FY (zombie-definition property 5).
13. THE Pipeline change SHALL add a note to `.kiro/steering/zombie-definition.md` stating the refinement in criteria 2 and 6: Reported_Zero_Interest in the latest year gives `healthy` with reason "No interest expense in FY{year}", only Missing_Interest in the latest year gives `insufficient_data`, and icr() still returns null for zero interest, so that year still breaks the streak.
14. FOR ALL firms in the output, the `status` in `firms_index.json` SHALL equal the `status` in that firm's `firms/{cik}.json` (property).
15. FOR ALL firms with status `healthy` whose Latest_FY does not have Reported_Zero_Interest, the Latest_FY icr() value SHALL be non-null and >= 1, and fewer than 2 of the icr() values of Latest_FY - 2 to Latest_FY SHALL be non-null and below 1 (property).

### Requirement 10: Implied rate and eligibility flags

**Phase:** Phase 2.

**User Story:** As Frank, I want the pipeline to output only the fields the frontend rate shock needs (`latest_icr`, `total_debt_usd`, `implied_rate`, `shock_eligible`) plus `rescue_eligible`, computed by the contract rules, so that the graveyard slider and the lab only use firms they can model and `threshold_report.py` can compute critical points from those fields.

#### Acceptance Criteria

1. THE Scorer SHALL compute `implied_rate` = Latest_FY interest expense / Latest_FY total debt when both values are non-null and finite and total debt > 0, and SHALL write `implied_rate` = null in every other case, including total debt null, total debt = 0 and total debt < 0.
2. THE Scorer SHALL set `shock_eligible` = true only when `implied_rate` is non-null and > 0, and SHALL set `shock_eligible` = false in every other case, including Reported_Zero_Interest and Missing_Interest in Latest_FY.
3. THE Scorer SHALL set `rescue_eligible` = true only when revenue, EBIT, interest expense, total debt, total assets and equity are all non-null for Latest_FY and the Firm_Window contains at least 3 Fiscal_Years, and SHALL set `rescue_eligible` = false otherwise. **[Assumption: "at least 3 years of history" in data-contract.md is read as at least 3 Fiscal_Years present in the Firm_Window. The years do not need to be consecutive or complete. Frank to confirm.]**
4. THE Scorer SHALL write `latest_icr` = icr() of Latest_FY EBIT and Latest_FY interest expense, and SHALL write null when icr() returns null.
5. THE Scorer SHALL write `total_debt_usd` = Latest_FY total debt, and SHALL write null, never 0, when Latest_FY total debt is missing.
6. THE Pipeline SHALL NOT define or implement a rate-shock function. Rate-shock semantics belong to `web/src/engine/shock.ts`; the Pipeline only writes the input fields of criteria 1, 2, 4 and 5.

### Requirement 11: rescue_inputs and sector medians

**Phase:** Phase 2.

**User Story:** As Frank, I want rescue inputs from each firm's own history with a sector fallback, so that the rescue-engine has a projection basis for every firm.

#### Acceptance Criteria

1. THE Scorer SHALL count a firm's Usable_Years only among the Fiscal_Years of its Firm_Window, so that `history_years` is between 0 and 5 inclusive.
2. THE Scorer SHALL treat two Usable_Years as consecutive only if their Fiscal_Years differ by exactly 1, and SHALL compute a year-to-year margin change as margin(FY) − margin(FY − 1) and a year-to-year revenue growth as revenue(FY) / revenue(FY − 1) − 1, where margin = EBIT / revenue.
3. WHEN a firm has 4 or more Usable_Years and 2 or more consecutive-year margin changes, THE Scorer SHALL set `margin_mean` to the arithmetic mean of margin over all its Usable_Years, `margin_change_mean` to the arithmetic mean of its consecutive-year margin changes, `margin_change_sd` to the sample standard deviation (divisor n − 1) of those changes, `revenue_growth_median` to the median of its consecutive-year revenue growths, `history_years` to its number of Usable_Years, and `used_sector_fallback` to false.
4. IF a firm with 4 or more Usable_Years has fewer than 2 consecutive-year margin changes, THEN THE Scorer SHALL copy its sector's four medians into `rescue_inputs`, set `history_years` to its number of Usable_Years and set `used_sector_fallback` = true. **[Assumption: `make_mock.py` raises an error here; real data cannot.]**
5. WHEN a firm has fewer than 4 Usable_Years, THE Scorer SHALL copy its sector's four medians into `rescue_inputs`, set `history_years` to its number of Usable_Years and set `used_sector_fallback` = true.
6. THE Scorer SHALL compute each sector median in `macro.json` separately for each of the four statistics (`margin_mean`, `margin_change_mean`, `margin_change_sd`, `revenue_growth_median`), as the median over the firms in this run's output that have the same `sector` (SIC_Division) and own-history inputs per criterion 3. Firms that used the fallback under criterion 4 or 5 are not counted.
7. THE Scorer SHALL compute every median in this requirement as the middle value of the sorted values for an odd count, and as the arithmetic mean of the two middle values for an even count.
8. IF a sector present in the output has no firm with own-history inputs, THEN THE Scorer SHALL set that sector's four medians to the median of each statistic across all firms with own-history inputs in this run's output, from every sector.
9. IF no firm in this run's output has own-history inputs, THEN THE Pipeline SHALL exit with a non-zero code, print an error message saying no sector median could be computed, and leave every file in Output_Dir unchanged. **[Assumption: no basis for any median exists.]**
10. THE Writer SHALL include exactly one entry in `macro.json` `sector_medians` for each distinct `sector` value among the firms in the output, keyed by that SIC_Division name, with all four statistics present and non-null.
11. THE Scorer SHALL round every `rescue_inputs` value and every sector median to 6 decimals, as `make_mock.py` does, and SHALL leave `icr` and `implied_rate` unrounded. **[Assumption]**
12. THE Scorer SHALL compute sector medians from the unrounded per-firm statistics and round only the resulting medians. **[Assumption]**

### Requirement 12: Macro data

**Phase:** Phase 2.

**User Story:** As Frank, I want the 10-year Treasury yield in the contract format, so that refinance in the rescue-engine uses a real base rate.

#### Acceptance Criteria

1. WHEN `FRED_API_KEY` is unset or empty, THE FRED_Client SHALL fetch DGS10 from `https://fred.stlouisfed.org/graph/fredgraph.csv?id=DGS10`.
2. WHERE `FRED_API_KEY` is set, THE FRED_Client SHALL fetch DGS10 from the FRED observations API with that key. THE FRED_Client SHALL read the key only from the environment, and SHALL leave the key value out of Cache keys, cached files, log output and the Run_Report.
3. WHEN the FRED_Client receives a DGS10 response, THE FRED_Client SHALL take the observation with the latest date whose value parses as a finite number, and SHALL skip every observation whose value is a missing marker such as "." or is empty.
4. WHEN the FRED_Client has selected the latest numeric observation, THE Writer SHALL write `dgs10.value` as that percent value divided by 100 and rounded to 4 decimals (4.21 percent becomes 0.0421; FRED reports DGS10 to 2 decimals of a percent), `dgs10.date` as that observation's date in YYYY-MM-DD form, and `dgs10.source` = "FRED DGS10".
5. WHEN the FRED server returns HTTP 429 or a 5xx status, THE FRED_Client SHALL retry with the same policy as the SEC_Client in Requirement 4.7: at most 5 attempts in total, backoff starting at 1 second and doubling, and a wait of at least the `Retry-After` value when that header is present. **[Assumption: FRED reuses the SEC retry policy.]**
6. IF DGS10 cannot be fetched after the last retry and the Cache holds no DGS10 entry younger than 24 hours (Requirement 5.2 to 5.5; a stale entry is not a fallback), THEN THE Pipeline SHALL exit with a non-zero code and leave every file in Output_Dir unchanged. **[Assumption]**
7. IF a fetched or cached DGS10 response cannot be parsed, or contains no observation with a finite numeric value, THEN THE Pipeline SHALL exit with a non-zero code, record the failure reason in the Run_Report, and leave every file in Output_Dir unchanged. **[Assumption]**

### Requirement 13: Output, validation and atomic replace

**Phase:** Phase 2.

**User Story:** As Frank, I want output written only after it validates, so that the deployed app never reads a half-written or invalid file.

#### Acceptance Criteria

1. WHEN the Scorer and the Keeper_Log_Builder have finished for a run, THE Writer SHALL write `firms_index.json`, one `firms/{cik}.json` for every firm listed in the new `firms_index.json`, `macro.json` and `keeper_log.json` into a temporary folder that is outside Output_Dir's four output paths and outside every Protected_Dir.
2. WHEN all files are written to the temporary folder, THE Writer SHALL parse every file in the temporary folder as JSON and validate it against the matching schema in `data/schema` (`firms_index.schema.json`, `firm.schema.json`, `macro.schema.json`, `keeper_log.schema.json`).
3. WHEN every file in the temporary folder parses and is valid, THE Writer SHALL replace the four outputs in Output_Dir with the temporary files, replacing the whole `firms/` folder so that firm files from earlier runs that are not in the new index are removed, and SHALL then exit with code 0. **[Assumption: stale firm files are removed.]**
4. IF any file in the temporary folder fails to parse or fails schema validation, or writing to the temporary folder fails, THEN THE Writer SHALL leave every file in Output_Dir unchanged, report each error with the file name and the failing location in that file, and exit with a non-zero code.
5. IF `--out` resolves to a Protected_Dir or to a path inside a Protected_Dir, THEN THE CLI SHALL stop before sending any request, report that the output folder is protected, write no files and exit with a non-zero code; THE Writer SHALL never create, change or delete a file inside a Protected_Dir.
6. THE Writer SHALL list firms in `firms_index.json` sorted ascending by the 10-digit CIK string, sort each firm's `years` ascending by `fy`, write object keys in the order shown in `data-contract.md`, and use the same indentation in every output file. **[Assumption: sort key.]**
7. THE Writer SHALL set `meta.source` = "SEC EDGAR XBRL", `meta.definition_version` = "2.0", `meta.generated_at` = run start time in ISO 8601 UTC, and `meta.fiscal_years` = the ascending, duplicate-free union of every `fy` value that appears in the `years` arrays of the output firm files.
8. FOR ALL generated indexes, each value in `meta.counts` SHALL equal the number of firms with that status in `firms`, and the four counts SHALL sum to the length of `firms` (property).
9. FOR ALL generated outputs, every file SHALL be valid against its schema in `data/schema` (property).
10. FOR ALL runs with the same Cache, arguments, seed and Run_Year, the output files SHALL be byte-identical except `meta.generated_at` and the new `keeper_log.json` entry date (determinism).
11. THE Writer SHALL write `sector` as the SIC_Division name and `sic` as the SIC code string from submissions.
12. IF replacing the outputs in Output_Dir fails partway, THEN THE Writer SHALL restore every output in Output_Dir to its state before the run, report the failure and exit with a non-zero code.
13. FOR ALL generated outputs, the set of `{cik}` file names in `firms/` SHALL equal the set of `cik` values in `firms_index.json`, and each firm file's `cik`, `name`, `ticker`, `sector` and `status` SHALL equal the matching entry in `firms_index.json` (property).

### Requirement 14: Keeper log

**Phase:** Phase 2.

**User Story:** As Frank, I want a short log line per run, so that the graveyard keeper can report what changed.

#### Acceptance Criteria

1. WHEN a run passes validation, THE Keeper_Log_Builder SHALL write `keeper_log.json` with this run's entry at position 0, followed by the earlier entries in their existing order, with entries beyond the 60th removed starting from the oldest, so the file holds at most 60 entries, newest first.
2. THE Keeper_Log_Builder SHALL set `date` to the UTC calendar date of `meta.generated_at` of this run, in YYYY-MM-DD form.
3. WHEN `firms_index.json` exists in Output_Dir before the Writer replaces the output files, THE Keeper_Log_Builder SHALL set `new_zombies` to the CIKs that are `zombie` in this run's index and were in that previous index with a status other than `zombie`, sorted ascending as 10-digit strings and with no duplicates. **[Assumption: firms absent from the previous index are not counted as new zombies, so that a larger sample does not look like a wave of new zombies.]**
4. WHEN `firms_index.json` exists in Output_Dir before the Writer replaces the output files, THE Keeper_Log_Builder SHALL set `revived` to the CIKs that were `zombie` in that previous index and are `endangered` or `healthy` in this run's index, sorted ascending as 10-digit strings and with no duplicates. Firms that move from `zombie` to `insufficient_data`, or that are missing from this run's index, SHALL NOT be listed in `revived`.
5. WHEN no `firms_index.json` exists in Output_Dir before the run, THE Keeper_Log_Builder SHALL set `new_zombies` and `revived` to empty arrays.
6. THE Keeper_Log_Builder SHALL set `filings_read` to the number of distinct 10-K and 10-K/A filings (distinct accession numbers) that supplied at least one value written to the output in this run, as an integer >= 0. **[Assumption: precise definition of "filings read".]**
7. THE Keeper_Log_Builder SHALL set `summary` to one sentence of at most 120 characters built from a fixed template, for example "Read 212 filings. 3 rose, 1 returned to rest.". The numbers in the sentence SHALL equal `filings_read`, the length of `new_zombies` and the length of `revived` of the same entry. **[Assumption: template and length.]**
8. IF no `keeper_log.json` exists in Output_Dir before the run, THEN THE Keeper_Log_Builder SHALL start a new log that contains only this run's entry.
9. IF a run fails validation, THEN THE Keeper_Log_Builder SHALL add no entry and SHALL leave any existing `keeper_log.json` in Output_Dir byte-for-byte unchanged.
10. IF `keeper_log.json` or the previous `firms_index.json` exists in Output_Dir but cannot be parsed as JSON or fails its JSON Schema in `data/schema`, THEN THE Pipeline SHALL stop with an error message that names the file, exit with a non-zero code, and leave every file in Output_Dir unchanged. **[Assumption: a corrupt previous file stops the run rather than being overwritten or treated as missing.]**

### Requirement 15: Reports

**Phase:** Phase 2.

**User Story:** As Frank, I want a threshold report and a list of Act 1 candidates, so that I can choose real firms for the three Act 1 diagnoses.

#### Acceptance Criteria

1. WHEN the Writer has replaced the outputs, THE Report_Builder SHALL run `pipeline/scripts/threshold_report.py` on `{Output_Dir}/firms_index.json` before it writes `pipeline/reports/act1_candidates.md`.
2. WHEN the threshold report step has completed without error, THE Report_Builder SHALL write `pipeline/reports/act1_candidates.md`, replacing any earlier version of that file. The file SHALL contain one section for each of the three cases ("temporary profit drop", "too much debt", "broken business"), and each section SHALL be present even when it has no candidates, in which case it SHALL say that no candidate matched.
3. IF a report step fails, THEN THE Pipeline SHALL print an error naming the failed step (threshold report or Act 1 candidates) and exit with a non-zero code without rolling back Output_Dir. **[Assumption]**
4. THE Report_Builder SHALL consider only output firms with SIC 2000-3999 and 5 Fiscal_Years in the Firm_Window with non-null revenue, EBIT, interest expense and ICR, and with revenue > 0 in each of those 5 years. Firms that fail any of these conditions SHALL be skipped and SHALL NOT appear in any case section. **[Assumption: incomplete windows are skipped.]** **[Assumption: the revenue > 0 condition keeps EBIT / revenue and the Provisional_Check start margin defined.]**
5. WHEN a firm's Latest_FY ICR is below 1 and each of the 4 earlier ICRs in the Firm_Window is >= 1.5, THE Report_Builder SHALL list the firm as a "temporary profit drop" candidate.
6. WHEN all of the following hold for a firm, THE Report_Builder SHALL list the firm as a "too much debt" candidate: EBIT / revenue is >= 0.03 in each of the 5 years; ICR is below 1 in each of the last 3 Fiscal_Years of the Firm_Window; for each of the 5 years, |EBIT - mean EBIT| <= 0.20 * |mean EBIT|, where mean EBIT is the arithmetic mean of the 5 EBIT values; and interest expense is strictly greater than the previous year's value in at least 3 of the 4 year-to-year steps.
7. WHEN a firm's EBIT is below 0 in at least 3 of the 5 years and its Latest_FY revenue is strictly lower than its revenue in the first Fiscal_Year of the Firm_Window, THE Report_Builder SHALL list the firm as a "broken business" candidate.
8. THE Report_Builder SHALL show for each candidate the firm's name, ticker (or a marker for a null ticker), CIK and SIC, and one row per Fiscal_Year of the Firm_Window, in ascending order, with revenue, EBIT, interest expense, total debt, total assets, equity and ICR. Money values SHALL be shown in USD as stored in the firm file, and null values SHALL be shown as missing, never as 0.
9. WHEN a candidate's submissions history, including the older pages listed under `files`, contains an 8-K whose items include 1.03, or a Form 25 or 25-NSE, THE Report_Builder SHALL flag the candidate and list the form, filing date and accession number of each matching filing.
10. IF the submissions history of a candidate cannot be fetched or parsed after the SEC_Client's retries, THEN THE Report_Builder SHALL mark that candidate's bankruptcy and delisting flag as "not checked" and continue with the remaining candidates instead of failing the report step. **[Assumption]**
11. THE Report_Builder SHALL run the Provisional_Check for every candidate, using the same calculation as `make_mock.py` `provisional_projection`. The calculation covers three tools. Do nothing uses year-0 EBIT = Latest_FY EBIT. CUT COSTS adds 0.08 * (Latest_FY revenue - Latest_FY EBIT) to year-0 EBIT. CUT DEBT halves debt and interest. The projection runs 3 years with revenue flat at the Latest_FY revenue, debt constant, and interest equal to the Latest_FY interest expense (halved for CUT DEBT). The start margin is m0 = year-0 EBIT / Latest_FY revenue. For each year t = 1..3, m_t = m_{t-1} + 0.3 * (`margin_mean` - m_{t-1}), and ICR_t = icr(m_t * revenue, interest), using the shared icr() function. A tool holds when all 3 ICR_t values are non-null and >= 1.
12. THE Report_Builder SHALL show, for each candidate and each of the three Provisional_Check tools, the 3 projected ICR values and whether the tool holds.
13. THE Report_Builder SHALL rank first, within each case, the candidates whose set of holding tools equals the expected set from `make_mock.py` ACT1_EXPECTED_HOLDS: temporary profit drop = only CUT COSTS holds; too much debt = only CUT DEBT holds; broken business = no tool holds. Remaining candidates follow. Within each of these two groups, candidates are ordered by CIK ascending. **[Assumption: tiebreak.]**
14. THE Report_Builder SHALL label every Provisional_Check result PROVISIONAL and state that it will be replaced by rescue-engine v2.
15. WHEN a firm matches more than one case, THE Report_Builder SHALL list the firm under each matching case and rank it within each case independently.

### Requirement 16: Run report

**Phase:** Kept; extended by Requirement 27.

**User Story:** As Frank, I want a run report every time, so that I can see what was skipped and why.

#### Acceptance Criteria

1. WHEN a run gets past argument checking, THE Pipeline SHALL write the Run_Report before the process exits. This applies to runs that end with exit code 0 and to runs that exit with a non-zero code (including Requirements 4.12, 4.13, 11.9, 12.6, 12.7, 13.4 and 15.3). Each run SHALL overwrite the Run_Report of the previous run, so that the Run_Report always describes only the most recent run.
2. THE Run_Report SHALL contain all of the following:
   - the run start and end time as ISO 8601 UTC timestamps;
   - the CLI arguments as given;
   - the process exit code;
   - for non-zero exits, the failure reason, naming the requirement that triggered the exit;
   - the counts of Attempted_Firms, Failed_Firms and output firms;
   - the failure percentage;
   - whether the outputs in Output_Dir were replaced (true only after Requirement 13.3 has completed).
3. THE Run_Report SHALL list each Failed_Firm with its CIK, URL and failure reason (Requirement 4.10). It SHALL also list each skipped input with its reason, `ticker_not_found` for tickers and `invalid_cik` for CIK file lines, together with the rejected ticker or line text (Requirements 1.11 and 1.12).
4. THE Run_Report SHALL list each exclusion reason with its count and CIKs (Requirement 2.13).
5. THE Run_Report SHALL record the interest tag used per firm and FY, and null for a year with Missing_Interest (Requirement 7.7).
6. THE Run_Report SHALL record the number of network requests sent and the number of Cache hits, counted separately for the SEC_Client and the FRED_Client. **[Assumption]**
7. THE Run_Report SHALL contain no secret values, including `SEC_CONTACT_EMAIL` and `FRED_API_KEY`. In every URL and argument recorded in the Run_Report, THE Pipeline SHALL replace the value of any `api_key` query parameter with a fixed redaction marker, and SHALL omit the email address from any recorded User-Agent header.
8. THE Run_Report SHALL compute the failure percentage as Failed_Firms / Attempted_Firms × 100, using the same value that is compared with the 2% limit in Requirement 4.12, and SHALL record 0 when there are no Attempted_Firms.
9. WHEN a run includes `--sample`, THE Run_Report SHALL record the requested N, the selected count, the shortfall, the seed used, the visited count, the Scan_Limit, the selected count per SIC_Division and every entry of `sample_minimums_unmet` (division, required minimum, selected count), as defined in Requirement 3.9 and 3.10.
10. IF the Run_Report cannot be written, THEN THE Pipeline SHALL print an error naming the Run_Report path to standard error. It SHALL exit with a non-zero code, keeping the original non-zero code if one was already set, and SHALL leave Output_Dir in whatever state the run had already reached.

### Requirement 17: Tests

**Phase:** Kept; extended by Requirement 28. 17.3 and 17.12 to 17.14 are Phase 2.

**User Story:** As Frank, I want offline tests with examples and properties, so that the rules are checked without hitting SEC.

#### Acceptance Criteria

1. WHEN Frank runs `.venv/bin/python -m pytest pipeline/tests` from the repository root, THE Pipeline test suite SHALL run every test in `pipeline/tests` without opening any network connection to a host other than localhost, and SHALL exit with code 0 only if every test passes.
2. IF a test attempts a network connection to a host other than localhost, THEN THE Pipeline test suite SHALL fail that test with an error message naming the blocked host, and SHALL not send the request.
3. THE Pipeline test suite SHALL use recorded fixtures for every SEC and FRED response it reads. Fixtures SHALL be small trimmed JSON files committed under `pipeline/tests/fixtures/sec` (SEC) and `pipeline/tests/fixtures/fred` (FRED), and each fixture SHALL contain only the firms, facts and series observations that at least one test references.
4. THE Pipeline test suite SHALL pass on a fresh clone in which `pipeline/.cache` does not exist, and SHALL leave `pipeline/.cache`, the default Output_Dir `data` and the Protected_Dirs byte-identical after the run. Every output a test writes SHALL go to a temporary folder that the test removes when it finishes.
5. THE Pipeline test suite SHALL call icr() once for every case in `data/fixtures/icr_cases.json` and assert that the result equals the case's expected value, with null expected exactly where the case expects null. Each case SHALL be reported as its own test, so a failure names the case.
6. THE Pipeline test suite SHALL contain `pipeline/tests/fixtures/status_cases.json`. Each case in that file SHALL record its per-year EBIT and interest expense inputs, its Age_Years, its expected status and its expected reasons. The file SHALL include at least one case for each of the following: a missing year that breaks the 3-year streak; Age_Years exactly 10; a Reported_Zero_Interest year inside the window; Reported_Zero_Interest in Latest_FY (expected healthy); Missing_Interest in Latest_FY (expected insufficient_data); negative EBIT.
7. WHEN the Pipeline test suite runs the status cases, THE Pipeline test suite SHALL pass each case to the Scorer and assert that the returned status and reasons equal the case's expected status and reasons.
8. THE Pipeline test suite SHALL contain one hypothesis property test for each of zombie-definition properties 1 and 5: (1) with positive interest expense, higher EBIT never lowers ICR (Requirement 8.8); (5) every firm classified zombie has Age_Years >= 10 and three consecutive ICR values < 1 (Requirement 9.12). Zombie-definition properties 2, 3 and 4 concern the rate shock and are covered by the frontend shock tests for `web/src/engine/shock.ts`, not by this spec (Requirement 10.6).
9. THE Pipeline test suite SHALL contain hypothesis property tests for the Compustat Fiscal_Year mapping (Requirement 6.3), meta counts (Requirement 13.8), schema validity of every output file against the JSON Schemas in `data/schema` (Requirement 13.9), Rate_Limiter spacing (Requirement 4.6) and the Sampler properties (Requirement 3.8 and 3.13 to 3.16).
10. IF a hypothesis property test finds a counterexample, THEN THE Pipeline test suite SHALL fail that test and report the falsifying input.
11. THE Pipeline test suite SHALL contain at least one example test for each of the following, each asserting a specific expected output: the EBIT fallback with same-period parts, the Interest_Tag_Priority, the 350-380 day duration rule (inclusive at 350 and 380), the 7-day Instant_Item window of Requirement 6.5 and 6.6 (an exact-date fact beats a fact 3 days off; a fact 3 days off beats a fact 6 days off; a fact 8 days off, with no closer fact, gives null), latest-filed-wins, the debt sum rule, the 2% failure threshold, and the no-replace-on-invalid-output rule.
12. THE Pipeline SHALL provide the script `pipeline/scripts/record_fixtures.py`, which Frank runs manually with network access and with `SEC_CONTACT_EMAIL` set in the environment (and `FRED_API_KEY` where used), to record the fixtures of criterion 3 once. THE script SHALL use the Pipeline's SEC_Client, SHALL trim each response to the firms, facts and observations that a test references, and SHALL write only the trimmed JSON body, with response headers removed entirely. The script is not part of the test run: pytest SHALL NOT collect it, no test SHALL import it, and `pytest pipeline/tests` SHALL NOT run it. Fixture recording is not part of CI.
13. THE recorded fixture files SHALL contain neither the text `user-agent` (compared case-insensitively) nor any string that matches an email pattern. THE script SHALL scan every file it writes for both and, IF either is found, THEN THE script SHALL abort with an error naming the file and SHALL NOT keep that file. THE Pipeline test suite SHALL contain a test that scans every file under `pipeline/tests/fixtures` for both and fails with a message naming each offending file.
14. WHEN Frank runs `pipeline/scripts/record_fixtures.py` with network access, THE script SHALL regenerate every recorded fixture of criterion 3, so that the fixtures can be rebuilt on demand. IF `SEC_CONTACT_EMAIL` is unset, empty or whitespace-only, THEN THE script SHALL exit with a non-zero code before any request, with the same error as Requirement 4.2.

### Requirement 18: Performance

**Phase:** Phase 2.

**User Story:** As Frank, I want a sample run to finish quickly, so that I can iterate on the day before delivery.

#### Acceptance Criteria

1. WHEN `.venv/bin/python -m pipeline.run --sample 50` runs with `--sample` as the only selection option, an empty Cache, the Rate_Limiter at its default rate of 5 requests per second, and no SEC or FRED response returning HTTP 429 or a 5xx status, THE Pipeline SHALL exit with code 0 in under 5 minutes of wall-clock time, measured from process start to process exit.
2. WHEN a run as described in criterion 1 exits with code 0, THE Writer SHALL have replaced all four output files in Output_Dir within the 5-minute limit of criterion 1. A run that has not written the output files has not finished. The Scan_Limit (Requirement 3.3) and the lazy confirmation of overflow candidates (Requirement 3.7) bound the number of requests of a `--sample 50` run.
3. IF a run with `--sample 50` as the only selection option and an empty Cache receives one or more HTTP 429 or 5xx responses, THEN THE Pipeline SHALL be exempt from the 5-minute limit of criterion 1 for that run, and THE Run_Report SHALL record the number of retried requests. **[Assumption: time spent in backoff under Requirement 4 criterion 7 is outside Frank's control and is not counted against the limit.]**
4. WHEN a run that includes `--sector NAME` starts with an empty Cache, THE CLI SHALL print a notice that a full submissions scan is needed before it sends the first submissions request. **[Assumption]**
5. WHILE a run that includes `--sector NAME` is scanning submissions for the sector selection, THE CLI SHALL print a progress line after every 100 firms whose submissions request has completed or failed, and after the last firm. Each line SHALL show the number of firms processed so far and the total number of firms to scan. **[Assumption]**

### Requirement 19: Dependencies, secrets and documentation

**Phase:** Kept; extended by Requirement 29.

**User Story:** As Frank, I want the project rules kept in the same change, so that Sunny and the steering files stay in sync.

#### Acceptance Criteria

1. THE `pipeline/requirements.txt` SHALL contain exactly these five pinned lines: `requests==2.34.2`, `pandas==3.1.1`, `pytest==9.2.0`, `hypothesis==6.170.15` and `jsonschema==4.26.0`, and SHALL contain no version ranges, unpinned entries or `>=`, `~=`, `<` or `*` specifiers. These versions are installed and verified in `.venv` (`pip check` clean). The `.venv` runs Python 3.13.2; the Python 3.11+ requirement of the Introduction stays.
2. THE Pipeline SHALL read `SEC_CONTACT_EMAIL` and `FRED_API_KEY` only from environment variables and SHALL NOT read them from command-line arguments, files in the repository or files under `pipeline/.cache`.
3. THE Pipeline SHALL NOT write the value of `SEC_CONTACT_EMAIL` or `FRED_API_KEY` to any file in the repository, any Cache file name or Cache file content, any console or log output, the Run_Report or any file in Output_Dir. The only place the `SEC_CONTACT_EMAIL` value may appear is the outgoing `User-Agent` header (Requirement 4.1).
4. WHERE `FRED_API_KEY` is set, THE Pipeline SHALL derive the Cache key and Cache file name for FRED requests from the request URL with the `FRED_API_KEY` value removed, so that two runs with different keys map to the same Cache entry.
5. IF an HTTP request, retry or parse step fails and the Pipeline prints or records an error that contains a request URL or request header, THEN THE Pipeline SHALL replace every occurrence of the `SEC_CONTACT_EMAIL` and `FRED_API_KEY` values with a fixed redaction marker before the error is printed or recorded, and the run SHALL continue or exit exactly as it would without the redaction.
6. THE Pipeline change SHALL update `.kiro/steering/data-contract.md` with the Interest_Tag_Priority (`InterestExpense`, then `InterestExpenseNonoperating`, then `InterestExpenseDebt`, then `InterestAndDebtExpense`) and the rule that net interest tags are never used. This is a documentation-only change: the JSON Schemas in `data/schema` and `web/src/types/data.ts` stay byte-for-byte unchanged, because no output field holds the interest tag, and the contract version stays "v2".
7. THE Pipeline change SHALL update `.kiro/steering/zombie-definition.md` as stated in Requirement 9.13, in the same commit as the Scorer code that implements Requirement 9 criteria 2 and 6.
8. THE Pipeline change SHALL leave `pipeline/scripts/make_mock.py`, `pipeline/scripts/threshold_report.py` and every file under `data/mock`, `data/schema` and `data/fixtures` byte-for-byte unchanged. A tester verifies this with an empty `git diff` for those paths against the commit before the change.
9. THE Pipeline change SHALL use a conventional commit message for every commit: one of the types `feat`, `fix`, `test`, `chore` or `docs`, followed by the scope `(data-pipeline)`, a colon and a summary, for example `feat(data-pipeline): add companyfacts extractor`.
10. THE Pipeline change SHALL add `pipeline/scripts/record_fixtures.py` (Requirement 17.12) as a new file, without changing `make_mock.py` or `threshold_report.py`.

## Phase 1 requirements

Items marked **[Assumption]** were proposed to Frank on 2026-11-16 and accepted as defaults.

### Requirement 20: Phase 1 entry point

**Phase:** Phase 1.

**User Story:** As Frank, I want one command that downloads the bulk files, builds the panel and writes the report, so that I see the real data shape quickly.

#### Acceptance Criteria

1. THE Pipeline SHALL provide `python -m pipeline.bulk` with the sub-commands `download`, `panel`, `report` and `all`. `all` runs the other three in that order. The command SHALL not use the selection options of Requirement 1.
2. THE CLI SHALL read `SEC_CONTACT_EMAIL` as in Requirement 4.1 and 4.2, and the rate as in Requirement 4.4 and 4.5. IF the variable is missing, THEN `download` and `all` SHALL exit non-zero before any request.
3. THE `panel` and `report` sub-commands SHALL send no network request.
4. THE CLI SHALL accept `--use-cached`. WHEN it is given, THE Bulk_Downloader SHALL not check cache age and SHALL use the cached zips whatever their age. IF a needed zip is not cached, THEN THE CLI SHALL exit non-zero and name the missing file. **[Assumption]**
5. THE Panel_Extractor and Events_Extractor SHALL write only to Phase1_Out_Dir, and THE Shape_Reporter SHALL write only to Reports_Dir. THE CLI SHALL not write to `data`, Protected_Dirs or any path outside `pipeline/`.

### Requirement 21: Bulk download

**Phase:** Phase 1.

**User Story:** As Frank, I want the two bulk files downloaded once, checked and recorded, so that the whole analysis is reproducible from a known file.

#### Acceptance Criteria

1. THE Bulk_Downloader SHALL download Bulk_Companyfacts and Bulk_Submissions from the two URLs in the Glossary, one request each, with the User-Agent of Requirement 4.1, through the Rate_Limiter.
2. THE Bulk_Downloader SHALL stream each response to `pipeline/.cache/<file name>.part` in chunks, and SHALL never hold a whole archive in memory.
3. WHEN the stream ends, THE Bulk_Downloader SHALL check that the number of bytes written equals the `Content-Length` header (when present) and that the file opens as a zip archive with a readable central directory. IF a check fails, THEN THE Bulk_Downloader SHALL delete the `.part` file, leave any earlier cached zip unchanged, exit non-zero and print a message naming the file, the expected size and the actual size. It SHALL not resume a partial download. **[Assumption]**
4. WHEN both checks pass, THE Bulk_Downloader SHALL rename the `.part` file to its final name and compute its SHA-256.
5. IF a cached zip exists and its recorded download time is less than 24 hours old, THEN THE Bulk_Downloader SHALL not send a request for it. WHEN the cached zip is 24 hours old or older, THE Bulk_Downloader SHALL refetch it. IF the refetch fails, THEN it SHALL fail and SHALL NOT use the stale zip (Requirement 5.4), unless `--use-cached` is given.
6. THE Bulk_Downloader SHALL write, next to each zip, a small JSON record with the download time (UTC), size in bytes, SHA-256, source URL and the HTTP `Last-Modified` header (null if absent). The record is the source of the age in criterion 5.
7. THE bulk zips, their `.part` files and their records SHALL stay under `pipeline/.cache`, which is git-ignored (Requirement 5.6). THE Pipeline SHALL never commit them.
8. THE Bulk_Downloader SHALL redact the contact email from every message, as in Requirement 19.5.

### Requirement 22: Streaming read

**Phase:** Phase 1.

**User Story:** As Frank, I want the multi-gigabyte archives read member by member, so that the run does not exhaust memory.

#### Acceptance Criteria

1. THE Bulk_Reader SHALL open each zip with `zipfile`, iterate the members, and read and parse one member at a time. It SHALL never extract the archive to disk and never hold more than one parsed member (plus the small aggregates of Requirements 23 to 25) in memory.
2. THE Bulk_Reader SHALL release a parsed member before it reads the next one.
3. THE Bulk_Reader SHALL accept members in any order. Every result that combines several members of one CIK SHALL be order-independent (Requirement 25.5).
4. IF a member cannot be read or parsed as JSON, THEN THE Pipeline SHALL log the member name and the error in the Run_Report, set `parse_error` = true for that CIK in the Firm_Table when the CIK is known, and continue. The 2% rule of Requirement 4.12 SHALL NOT apply. **[Assumption]**
5. THE Bulk_Reader SHALL ignore members whose names match neither `CIK##########.json` nor `CIK##########-submissions-NNN.json`, and SHALL count them in the Run_Report.
6. A test SHALL process a tiny in-memory zip and verify that members are read one at a time (for example with an instrumented reader that fails if two parsed members are alive at once).

### Requirement 23: Universe and Firm_Table

**Phase:** Phase 1.

**User Story:** As Frank, I want every filer kept and flagged, so that bankrupt, delisted and acquired firms stay visible.

#### Acceptance Criteria

1. THE Panel_Extractor SHALL include in Universe_P1 every CIK of Bulk_Companyfacts with at least one Annual_Fact in any tag (`has_any_annual_fact`). It SHALL NOT drop any such firm for sector, age, recency, missing SIC or missing submissions. The Recency_Rule SHALL NOT apply.
2. A CIK that appears only in Bulk_Submissions SHALL NOT be in Universe_P1, and THE Run_Report SHALL record their number. A CIK in Universe_P1 without a submissions file SHALL be kept, with null SIC, division, first filing date, last filing date and tickers, `no_sic` true, and every Age_At_FY null. **[Assumption]**
3. THE Firm_Table SHALL have one row per CIK with the columns `cik` (10 digits), `name`, `tickers` (the submissions `tickers` list, `;`-joined, empty if none), `sic` (string or null), `sic_division` (null when the SIC maps to no SIC_Division), `first_filing_date`, `last_10k_date`, `last_filing_date`, `is_financial`, `is_utility`, `no_sic`, `age_under_10` and `parse_error`. THE SIC parsing, ranges and division mapping SHALL reuse `universe.py`.
4. `first_filing_date` SHALL be the earliest filing date of any form, including the older pages. `last_filing_date` SHALL be the latest filing date of any form. `last_10k_date` SHALL be the latest filing date of form `10-K` or `10-K/A`, null if none.
5. `age_under_10` SHALL be true when Age_Run < 10, and also when the first filing date is null. `is_financial` and `is_utility` SHALL be false when the SIC is null.
6. No Firm_Table row SHALL be removed because of a flag.

### Requirement 24: Firm-year Panel

**Phase:** Phase 1.

**User Story:** As Frank, I want one row per firm and year with every value traceable to its filing, so that I can see gaps and check each number.

#### Acceptance Criteria

1. THE Panel_Extractor SHALL write, for every CIK in Universe_P1, exactly one row for each fiscal year FY2015 to FY2025 inclusive, sorted by CIK then fiscal year. A year with no usable data SHALL be a Gap_Row, so that gaps stay visible. A firm with a bankruptcy event, or whose last filing is before FY2025, SHALL keep all 11 rows.
2. THE Panel_Extractor SHALL reuse the Fact_Extractor rules of Requirements 6 and 7 unchanged: Annual_Facts only, Compustat fiscal year by period end date (never the `fy` field alone), the 350 to 380 day Flow_Item rule, the 7-day Instant_Item window, latest-filed-wins, Interest_Tag_Priority, the revenue tag order, the debt rule, the EBIT fallback, USD only, and missing is null and never 0. It SHALL do this through a new function that reuses `build_year()` and the pick functions. It SHALL NOT change the behaviour of `extract()`.
3. A fiscal year with balance-sheet facts but no usable Flow_Item has no Fiscal_Year_End and is a Gap_Row (Requirement 6.10 behaviour). THE Data_Shape_Report SHALL count such rows in the data-quality section so that the effect is visible. **[Assumption]**
4. THE Panel SHALL have, for each of the money fields `operating_income` (EBIT), `interest_expense`, `revenue`, `total_debt`, `cash`, `total_assets` and `equity`, the columns `<field>` (value), `<field>_tag`, `<field>_end` (the period end date for a flow, the instant date used for a balance-sheet item), `<field>_accn` and `<field>_url`. WHERE a value is built from several facts (total debt parts, the EBIT fallback), the tag, accession and URL columns SHALL list every contributing fact in the order of Requirement 7, joined by `;`. **[Assumption]**
5. `cash` SHALL be taken only from `CashAndCashEquivalentsAtCarryingValue`, as an Instant_Item under Requirements 6.5, 6.6 and 6.14, with no substitute tag.
6. THE Panel SHALL also have `cik`, `fy`, `fye` (the Fiscal_Year_End, null for a Gap_Row), `age_at_fy`, `icr` and `zombie_flag`. `icr` SHALL be computed only by the shared `icr()` function of Requirement 8, from `operating_income` and `interest_expense`.
7. `<field>_url` SHALL be `https://www.sec.gov/Archives/edgar/data/{cik without leading zeros}/{accession without dashes}/{accession}-index.htm`. **[Assumption]**
8. `zombie_flag` SHALL follow the Zombie_Flag definition in the Glossary. For FY2015 and FY2016, THE Panel_Extractor SHALL compute `icr` for FY2013 and FY2014 internally for the flag only, and SHALL NOT write those years to the Panel. **[Assumption]**
9. A null or missing value SHALL be written as an empty CSV cell, never as 0. A value is 0 only when the selected fact reports exactly 0.
10. THE Panel and the Firm_Table SHALL be written as gzipped CSV (UTF-8, header row) in Phase1_Out_Dir, with no new dependency.

### Requirement 25: Events table

**Phase:** Phase 1.

**User Story:** As Frank, I want bankruptcy, acquisition, delisting and deregistration events per firm, so that I can tell what happened to each zombie.

#### Acceptance Criteria

1. THE Events_Extractor SHALL read, for every CIK, the main submissions file and every older page of that CIK in Bulk_Submissions (members named `CIK##########-submissions-NNN.json`), in addition to `filings.recent`.
2. THE Events_Extractor SHALL create one event for each filing that matches an Event_Type: `bankruptcy` for form `8-K` or `8-K/A` whose comma-separated `items` contain `1.03`; `acquisition_disposition` for the same forms with item `2.01`; `delisting` for form `25` or `25-NSE`; `deregistration` for form `15-12B`, `15-12G` or `15-15D`. Forms are matched exactly. **[Assumption]**
3. THE Events_Table SHALL have the columns `cik`, `date` (filing date), `form`, `item` (the matching item, null for forms 25 and 15), `event_type`, `accession`, `url` (as in Requirement 24.7) and `source_member`. It SHALL hold events of every date.
4. THE Events_Extractor SHALL de-duplicate on (accession number, Event_Type), so that one 8-K with items "1.03,2.01" gives two rows, and one accession never gives two rows of the same type. **[Assumption]**
5. THE result for a CIK SHALL not depend on the order of its members: first filing date is the minimum, last filing date the maximum, `last_10k_date` the maximum, and events the union, over the main file and all older pages.
6. IF an older page has no main file in the archive, THEN THE Events_Extractor SHALL skip it and list the member name in the Run_Report. **[Assumption]**
7. THE Events_Extractor SHALL keep events only for CIKs in Universe_P1.
8. THE Events_Extractor SHALL write `events.csv.gz` to Phase1_Out_Dir.

### Requirement 26: Data shape report

**Phase:** Phase 1.

**User Story:** As Frank, I want a report on what the data looks like, so that I can choose the game design from facts.

#### Acceptance Criteria

1. THE Shape_Reporter SHALL write `pipeline/reports/data_shape.md` and one small CSV per section named `s<N>_<topic>.csv` in Reports_Dir, and SHALL read only the Panel, the Firm_Table and the Events_Table. THE panel itself SHALL NOT be written to Reports_Dir.
2. THE report SHALL start with the source of the data: the download time, size, SHA-256 and `Last-Modified` of both zips, the run date and the definitions used (Glossary terms). Every figure in the report SHALL be reproducible from the committed CSVs and the panel.
3. Unless a section says otherwise, sections 2 to 8 SHALL use Core_Firm_Year rows. **[Assumption]**
4. **Section 1, firm counts.** For each FY2015 to FY2025: the number of firms with a Present_Row, and the number of those that are Core_Firm_Year rows.
5. **Section 2, zombies.** For each FY2017 to FY2025: the number of rows with `zombie_flag` true among Core_Firm_Year rows, the share over Core_Firm_Year Present_Rows, and a second share over Core_Firm_Year rows with a non-null `icr`. **[Assumption]**
6. **Section 3, outcomes.** For the zombies of FY2019 and, separately, of FY2020: the firms placed in exactly one category by the first match in this order: `bankruptcy` (a bankruptcy event dated after the end of the zombie year and up to 2024-12-31); `delisted_or_deregistered` (a delisting or deregistration event in the same window); `stopped_filing` (no such event and the latest Fiscal_Year_End with data is before FY2024); `recovered` (FY2024 `icr` >= 1); `still_zombie` (FY2024 `zombie_flag` true); `other_alive` (everything else). The report SHALL give the count of each category, and the CIK list of each in a CSV. It SHALL also give, as an extra column, how many firms in each category filed an `acquisition_disposition` event in the window, labelled "filed item 2.01", and SHALL state that this event is filed mostly by the acquirer. **[Assumption]**
7. **Section 4.** The firms with `icr` >= 1.5 in FY2019 and `icr` < 1 in FY2020: count and CIK list.
8. **Section 5.** The firms with `zombie_flag` true in at least one of FY2019, FY2020 and FY2021 and a bankruptcy event dated 2022-01-01 to 2023-12-31: count and CIK list. **[Assumption]**
9. **Section 6, breaking rate.** For each firm's latest fiscal year with non-null `operating_income`, `interest_expense` > 0 and `total_debt` > 0: the Breaking_Rate in percentage points, a histogram in 0.5 pp buckets from -10 to +20 pp with one underflow and one overflow bucket, and the number of firms with a Breaking_Rate below 1, 2, 3, 4 and 5 pp (this includes firms already below 0). The same figures SHALL be given for fixed FY2024. The number of firms left out for null or non-positive interest or debt SHALL be stated. **[Assumption]**
10. **Section 7, data quality.** For each FY2015 to FY2025, for all firms and for Core_Firm_Year rows: the number of Present_Rows missing `operating_income`, missing `interest_expense`, missing `total_debt`, with a `fye` whose month is not December, and Gap_Rows that have a balance-sheet fact (Requirement 24.3).
11. **Section 8, largest firms.** The 200 firms with the highest maximum annual `revenue` over FY2015 to FY2025, with name, tickers, that revenue and its year, the sector, the flags, and the `zombie_flag` of FY2017 to FY2025 as a nine-character string (`1` true, `0` false). **[Assumption]**
12. THE report SHALL show the text "Data: SEC EDGAR. Not investment advice." (product.md) and SHALL state that the age proxy is the first EDGAR filing, an approximation.
13. THE report and CSVs SHALL be deterministic: the same Panel, Firm_Table and Events_Table SHALL give byte-identical files, with rows sorted by CIK and no timestamps other than those in criterion 2.

### Requirement 27: Phase 1 run report

**Phase:** Phase 1.

**User Story:** As Frank, I want the run report to show what the bulk run read and skipped.

#### Acceptance Criteria

1. THE Pipeline SHALL write the bulk section into the Run_Report (`pipeline/.cache/run_report.json`) under Requirement 16.1, 16.7 and 16.10. **[Assumption: same file, new `bulk` section.]**
2. THE `bulk` section SHALL contain, for each zip: URL, download time, size in bytes, SHA-256, `Last-Modified`, and whether the zip came from the cache.
3. THE `bulk` section SHALL contain the number of members read, members ignored (Requirement 22.5), members that failed to parse with their names and errors, Universe_P1 size, the number of submissions-only CIKs, the number of orphan older pages with their names, Panel rows, Gap_Rows and Events_Table rows per Event_Type.
4. THE Run_Report SHALL record the number of SEC requests (expected 2 for a cold run) and Cache hits.

### Requirement 28: Phase 1 tests

**Phase:** Phase 1.

**User Story:** As Frank, I want offline tests for the bulk code, so that I trust the report before the live run.

#### Acceptance Criteria

1. THE existing hypothesis tests SHALL stay. THE phase 1 tests SHALL use no network (Requirement 17.1 and 17.2) and in-memory fixtures built in the test code, including tiny in-memory zips.
2. A property test SHALL verify that a missing value is never written as 0 in the Panel (a null input gives an empty cell; 0 only when the fact is exactly 0).
3. A property test SHALL verify that a firm with a bankruptcy event keeps all its 11 Panel rows, and that no firm is dropped from the Firm_Table whatever its flags.
4. A property test SHALL verify that `zombie_flag` equals the definition in `zombie-definition.md` (Age_At_FY >= 10 and three non-null `icr` values below 1 ending at the row's year) on randomly generated panels, and is false when any of the three `icr` values is null.
5. A property test SHALL verify that events are de-duplicated by (accession number, Event_Type), and an example test SHALL verify that one 8-K with items "1.03,2.01" gives two rows.
6. An example test SHALL use a firm whose bankruptcy 8-K (item 1.03) exists only on an older submissions page and verify that the event is found.
7. An example test SHALL process a tiny in-memory zip member by member (Requirement 22.6).
8. Example tests SHALL cover the download rules with a fake HTTP source: size mismatch removes the `.part` file and fails; a cached zip younger than 24 hours is not downloaded again; a stale zip with a failed refetch is not used; SHA-256 and size are recorded.
9. Example tests SHALL cover the Panel for FY2015 to FY2025 with a gap year, a firm that stops filing in 2019, a January fiscal year end (FY mapping), the EBIT fallback, a cash value, and Age_At_FY.
10. Example tests SHALL cover each report section on a small hand-built panel, including the outcome precedence of Requirement 26.6 and the Breaking_Rate buckets.
11. THE tests SHALL leave `pipeline/.cache`, `pipeline/out`, `pipeline/reports` and `data` unchanged and SHALL write to temporary folders only (Requirement 17.4).

### Requirement 29: Phase 1 documentation, dependencies and commits

**Phase:** Phase 1.

**User Story:** As Frank, I want the project rules updated in the same change.

#### Acceptance Criteria

1. THE Pipeline change SHALL add no dependency. `pipeline/requirements.txt` stays as in Requirement 19.1. The bulk code uses `zipfile`, `hashlib`, `csv`, `gzip` and `json` from the standard library.
2. THE Pipeline change SHALL update `edgar-rules.md` (bulk files allowed, Scope and failure rules marked phase 2), `data-contract.md` (the sentence that the phase 1 panel is an internal artifact), `zombie-definition.md` (the yearly flag), `structure.md` and `.gitignore` (`pipeline/out/`), in the same change as this spec. No contract field, JSON Schema or TypeScript type changes.
3. THE committed outputs of phase 1 SHALL be `pipeline/reports/data_shape.md` and its CSVs only. `pipeline/out/` and the zips SHALL never be committed.
4. THE Pipeline change SHALL use one commit per top-level task, with a conventional commit message and the scope `(data-pipeline)` (Requirement 19.9).
5. THE Pipeline change SHALL leave `extract()`, `icr()`, `universe.py`, `http.py` `get()`, `make_mock.py`, `threshold_report.py` and every file under `data/mock`, `data/schema` and `data/fixtures` unchanged in behaviour. Additions to `facts.py` and `http.py` are new functions only.
6. THE phase 1 code SHALL not import React or three.js, and SHALL not write to `/web`.
