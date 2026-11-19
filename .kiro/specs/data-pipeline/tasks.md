# Implementation Plan: data-pipeline

## Overview

**Phase 1 (tasks 23 to 32) comes first:** download the two SEC bulk files, build the firm-year panel and the events table, and write the data shape report. **Phase 2 (tasks 7 to 22)** is the contract-v2 pipeline and runs after the game design is chosen. Tasks 1 to 6 are shared and done.

Phase 2 plan: Python 3.11+ package under `/pipeline`, built in the order that gets a working end-to-end run on a ticker list first (task 11), then `--ciks` (12), `--sample` (13), `--sector` (14) and the reports (15). Dependencies are already installed in `.venv` and pinned in `pipeline/requirements.txt`; no task installs or pins them. Tests run with `.venv/bin/python -m pytest pipeline/tests` from the repository root and never use the network. Until the recorded fixtures exist (task 17), tests use small hand-written in-memory or minimal JSON fixtures built in test code.

Rules for every task:

- Never edit `pipeline/scripts/make_mock.py`, `pipeline/scripts/threshold_report.py`, `data/mock`, `data/schema`, `data/fixtures` or `web/**` (Requirement 19.8).
- The pipeline defines no rate-shock function (10.6) and `icr()` exists only in `pipeline/metrics.py` (8.1).
- One commit per top-level task, conventional commits with scope `data-pipeline`, e.g. `feat(data-pipeline): add companyfacts extractor` (19.9).
- Tasks marked `*` are the hypothesis property tests. Example tests are required.
- Tasks 17, 22 and 32 are manual steps for Frank. The agent must not run anything against live SEC or FRED unless `SEC_CONTACT_EMAIL` is set and Frank asks.

## Tasks

- [x] 1. Package skeleton, config, run report and test harness
  - [x] 1.1 Create `pipeline/__init__.py`, `pipeline/config.py` and `pipeline/run_report.py`
    - `config.py`: constants (`DEFAULT_RATE`, `MAX_RATE`, `SAMPLE_SCAN_FACTOR`, `SAMPLE_SCAN_FLOOR`, `MIN_PER_DIVISION`, `MINIMUM_DIVISIONS`, `REDACTED`), `Config`, `resolve_out_dir`, `is_protected`, `read_env`, `secrets`, and the typed exceptions with exit codes (`PreflightError`, `CorruptPreviousError`, `TickerMapError`, `EmptySelectionError`, `FailureRateError`, `MacroError`, `NoSectorMedianError`, `OutputInvalidError`, `SwapError`, `ReportStepError`)
    - `run_report.py`: `RunReport` with `add_failed`, `add_skipped`, `add_excluded` (all six reasons listed with count 0), `to_json(secrets)` with sorted lists and redaction, `write_run_report` (temp file plus `os.replace`, stderr message on failure), `failure_pct`
    - _Requirements: 1.9, 1.10, 2.13, 4.2, 4.5, 13.5, 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7, 16.8, 16.10, 19.2, 19.3_
  - [x] 1.2 Create `pipeline/tests/conftest.py`
    - Autouse socket guard on `socket.socket.connect`, `connect_ex` and `create_connection`: allow localhost, raise `BlockedNetworkError("blocked network access to <host>")` otherwise
    - `FakeSession` (URL lookup in an in-memory dict or `fixtures/urls.json`, per-test overrides for status, headers and body, `AssertionError("unrecorded URL ...")` for unknown URLs), `tmp_config` fixture with `out_dir`, `cache_dir`, `reports_dir` under `tmp_path`, a `pipeline` hypothesis profile (`max_examples=200`, `deadline=None`), and a session-finish check that hashes `pipeline/.cache`, `data` and the Protected_Dirs before and after
    - Add small hand-written builders for companyfacts, submissions and `company_tickers.json` documents in `pipeline/tests/builders.py`
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.10_
  - [x] 1.3 Write example tests `pipeline/tests/test_config.py`
    - `is_protected` for each Protected_Dir, a child, a symlink into one, and a non-protected path; `resolve_out_dir` relative to the repository root; `failure_pct` with 0 attempted firms; Run_Report contains no secret values and redacts `api_key`; socket guard blocks `example.com:443` with the host named and allows `localhost`
    - _Requirements: 1.10, 13.5, 16.7, 16.8, 17.2_
  - Commit message: `feat(data-pipeline): add config, run report and test harness`

- [x] 2. Shared `icr()` function
  - [x] 2.1 Create `pipeline/metrics.py` with `icr(ebit, interest)`
    - Return None for None, bool, non-int/float, NaN or infinite inputs and for interest <= 0; otherwise `ebit / interest`. This is the only place that divides EBIT by interest.
    - _Requirements: 8.1, 8.2, 8.5, 8.6, 8.7_
  - [x] 2.2 Write `pipeline/tests/test_icr.py` fixture test
    - Parametrize one test per case in `data/fixtures/icr_cases.json`, asserting exact float equality and None where expected is null; fail (not skip) if the file is missing, unparseable or has zero cases
    - _Requirements: 8.3, 8.4, 17.5_
  - [x] 2.3 Write property test for icr() totality and exactness
    - **Property 1: icr() is total and exact**
    - **Validates: Requirements 8.2, 8.5, 8.6, 8.7**
  - [x] 2.4 Write property test for ICR monotonicity
    - **Property 2: Higher EBIT never lowers ICR (zombie-definition property 1)**
    - **Validates: Requirements 8.8**
  - Commit message: `feat(data-pipeline): add shared icr() with fixture tests`

- [x] 3. HTTP layer: rate limiter, cache, SEC and FRED clients
  - [x] 3.1 Create `pipeline/http.py` building blocks
    - `RateLimiter` (injected clock and sleep, sliding window of floor(rate) sends, lock), `Cache` (sha256 key of the redacted URL, `.body` and `.meta.json`, atomic writes, 24 h freshness, rejects unreadable entries, entries without timestamp and bad JSON bodies), `redact`, `redact_url`, `parse_retry_after`
    - _Requirements: 4.3, 4.4, 4.6, 5.1, 5.2, 5.3, 5.8, 16.7, 19.3, 19.4, 19.5_
  - [x] 3.2 Add `HttpClient`, `SecClient`, `FredClient`, `FetchResult`, `RequestStats` to `pipeline/http.py`
    - Cache hit uses no limiter slot; up to 5 attempts waiting 1, 2, 4, 8 s or `max(backoff, Retry-After)` on 429, 5xx and connection errors or timeouts; other statuses not retried; companyfacts 404 not retried; failures never cached and a stale entry never returned; User-Agent `ZombieFirmRadar <email>` on every attempt; FRED without key uses the CSV URL, with key the API URL, cached under the redacted URL; all error strings redacted
    - _Requirements: 4.1, 4.3, 4.7, 4.8, 4.9, 4.11, 5.4, 5.5, 5.7, 12.1, 12.2, 12.5, 19.4, 19.5_
  - [x] 3.3 Write example tests `pipeline/tests/test_http.py`
    - Retry waits `[1, 2, 4, 8]` on a fake sleep; `Retry-After` larger than backoff wins; 403 not retried; companyfacts 404 returns without retry; failed fetch writes no cache entry; stale entry refetched and, when the refetch fails, not returned and left on disk; corrupt cache entry refetched; cache hit sends no request and uses no limiter slot; User-Agent present on retries and absent from `RequestStats` and error strings; FRED key never in cache file names or contents
    - _Requirements: 4.1, 4.3, 4.7, 4.8, 4.9, 4.11, 5.2, 5.3, 5.4, 5.7, 5.8, 19.3, 19.4_
  - [x] 3.4 Write property test for the rate limiter
    - **Property 14: Rate limiter never exceeds its rate in any 1-second window**
    - **Validates: Requirements 4.3, 4.6**
  - [x] 3.5 Write property test for the cache
    - **Property 15: Cache round trip**
    - **Validates: Requirements 5.1, 5.2, 5.3, 19.4**
  - [x] 3.6 Write property test for redaction
    - **Property 16: Redaction removes every secret**
    - **Validates: Requirements 16.7, 19.3, 19.5**
  - Commit message: `feat(data-pipeline): add rate-limited cached SEC and FRED clients`

- [x] 4. Fact extractor (`pipeline/facts.py`)
  - [x] 4.1 Create `pipeline/facts.py` and the data models (`Fact`, `YearValues`, `ExtractResult`)
    - `compustat_fy`, `annual_facts` (us-gaap, USD, 10-K and 10-K/A, `fp` FY, finite), `has_any_annual_fact`, `dedupe` (largest `(filed, accn)`), `flow_by_fy` (350 to 380 days inclusive), `fiscal_year_ends` (latest end per FY, other ends nulled), `pick_flow`, `pick_instant` (exact, else closest within 7 days, tie earlier), `build_year` (revenue, interest, EBIT with same-period fallback, debt sum or `LongTermDebt`, assets, equity, tags, `interest_tag`, `sources`), `extract` (Firm_Window of latest 5 FYs, gap rows, no window gives no result)
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 6.10, 6.12, 6.13, 6.14, 6.15, 6.16, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10, 7.11, 7.12_
  - [x] 4.2 Write required example tests `pipeline/tests/test_facts.py`
    - Duration rule: 349 and 381 days rejected, 350 and 380 accepted, missing start rejected
    - Instant window: exact date beats a fact 3 days off; 3 days off beats 6 days off; a fact 8 days off with no closer fact gives null; equal distance picks the earlier date; each debt part picks its own instant date
    - Latest-filed-wins, and larger accession number on equal filed dates
    - Tag priority: revenue order, interest order with zero and negative values used as reported and not falling through, net interest tags ignored, EBIT `OperatingIncomeLoss` wins over fallback, EBIT fallback with same-period parts, fallback null when periods differ
    - Debt sum with one part present counts the others as 0; `LongTermDebt` fallback; all missing gives null and `[]`
    - 10-Q, 10-KT and 10-K405 facts ignored; non-USD units ignored; comparative prior-year fact assigned by end date; gap year inside the window is a null row; January year end maps to FY = end year - 1
    - _Requirements: 6.1, 6.2, 6.4, 6.5, 6.6, 6.7, 6.8, 6.10, 6.12, 6.14, 6.15, 7.2, 7.3, 7.4, 7.5, 7.6, 7.8, 7.9, 7.11, 7.12, 17.11_
  - [x] 4.3 Write property test for the Compustat mapping
    - **Property 3: Compustat fiscal-year mapping**
    - **Validates: Requirements 6.3**
  - [x] 4.4 Write property test for annual fact selection
    - **Property 4: Annual fact selection is filtered, unique and order-independent**
    - **Validates: Requirements 6.1, 6.7, 6.8, 7.12**
  - [x] 4.5 Write property test for instant date choice
    - **Property 5: Instant date choice matches a brute-force oracle**
    - **Validates: Requirements 6.5, 6.6, 6.14, 6.16**
  - [x] 4.6 Write property test for the debt rule
    - **Property 6: Total debt rule never invents a zero**
    - **Validates: Requirements 7.8, 7.9, 7.11**
  - Commit message: `feat(data-pipeline): add companyfacts extractor`

- [x] 5. Universe: SIC divisions, ticker map, exclusions, firm fetcher
  - [x] 5.1 Create `pipeline/universe.py`
    - `SIC_DIVISIONS`, `sic_division`, `parse_sic`, `match_sector`, `load_ticker_map` (first ticker per CIK, unique sorted CIKs), `read_ticker_file`, `read_cik_file` (1 to 10 digits, zero-pad, `invalid_cik` skips), `first_filing_year`, `has_recent_10k`, `classify` (order `no_sic`, `financial`, `utility`, `age_under_10`, `no_annual_facts`, `not_recent`, with `skip_recency`), `Submissions`, `TickerMap`, `FirmFetcher` (memoised per CIK, older `files` pages, Attempted_Firm and Failed_Firm counting, companyfacts 404 as no facts)
    - _Requirements: 1.2, 1.3, 1.6, 1.7, 1.11, 1.12, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11, 4.9, 4.10, 4.11_
  - [x] 5.2 Write example tests `pipeline/tests/test_universe.py`
    - Ticker and CIK file parsing (blank lines, whitespace, case-insensitive tickers, two tickers on one CIK, `invalid_cik` and `ticker_not_found` recorded); SIC boundaries 4899/4900/4999/5000, 5999/6000/6799/6800, missing and empty SIC; Age_Years exactly 10 kept and 9 excluded; Latest_FY 2024 kept and 2023 excluded; `--ciks` skips recency; older pages change First_Filing_Year; failed older page makes a Failed_Firm; sector name matching ignores case and whitespace and rejects the finance division
    - _Requirements: 1.2, 1.3, 1.6, 1.7, 1.11, 1.12, 2.1, 2.2, 2.3, 2.4, 2.5, 2.7, 2.8, 2.9, 2.11_
  - [x] 5.3 Write property test for exclusion order
    - **Property 7: Exclusion reason is the first matching rule**
    - **Validates: Requirements 2.3, 2.4, 2.5, 2.7, 2.8, 2.9, 2.11**
  - Commit message: `feat(data-pipeline): add universe selection and exclusions`

- [x] 6. Scorer: status, reasons, flags, rescue inputs, sector medians
  - [x] 6.1 Extend `pipeline/metrics.py` and update steering files in the same change
    - Add `status_and_reasons` (rules 2 to 8 in order, exact reason texts, gap years break streaks), `implied_rate`, `shock_eligible`, `rescue_eligible`, `own_history_stats`, `sector_medians` (own-history firms only, fallback to the global median, unrounded then rounded to 6 decimals), `finalize_rescue_inputs`, `score`, `ScoredFirm`, `RawStats`, `OwnHistory`, `RescueInputs`; every ratio via `icr()`; no shock function
    - Update `.kiro/steering/zombie-definition.md` with the zero-interest note of Requirement 9.13 and `.kiro/steering/data-contract.md` with the Interest_Tag_Priority line and the rule that net interest tags are never used (documentation only, version stays v2, no schema or `web/src/types` change)
    - _Requirements: 8.1, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9, 9.10, 9.11, 9.13, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8, 11.10, 11.11, 11.12, 19.6, 19.7_
  - [x] 6.2 Create `pipeline/tests/strategies.py` and `pipeline/tests/fixtures/status_cases.json`, and write `pipeline/tests/test_metrics.py` status cases
    - `strategies.py`: `st_money`, `st_window`, `st_fact`, `st_scored_firm` (built through `metrics.score`)
    - `status_cases.json`: per-year EBIT and interest, Age_Years, expected status and reasons; at least a missing year breaking the streak, Age_Years exactly 10, Reported_Zero_Interest inside the window, Reported_Zero_Interest in Latest_FY (healthy), Missing_Interest in Latest_FY (insufficient_data), negative EBIT, plus one case per status rule
    - One parametrized test per case asserting status and reasons
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9, 9.10, 17.6, 17.7_
  - [x] 6.3 Write example tests for flags and rescue inputs in `test_metrics.py`
    - `implied_rate` with debt null, 0 and negative; `shock_eligible` false for zero and missing interest; `rescue_eligible` needs all six values and 3 window years; `total_debt_usd` null never 0; own history needs 4 usable years and 2 consecutive changes; sample standard deviation uses divisor n - 1; fallback copies sector medians; a sector with no own-history firm uses the global median; values rounded to 6 decimals while `icr` and `implied_rate` stay unrounded
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 11.1, 11.2, 11.3, 11.4, 11.5, 11.8, 11.11_
  - [x] 6.4 Write property test for zombie status
    - **Property 8: Every zombie meets the definition (zombie-definition property 5)**
    - **Validates: Requirements 9.5, 9.9, 9.10, 9.12**
  - [x] 6.5 Write property test for the other status invariants
    - **Property 9: Status invariants for the other statuses**
    - **Validates: Requirements 9.1, 9.11, 9.15**
  - [x] 6.6 Write property test for eligibility flags
    - **Property 10: Eligibility flags follow the contract**
    - **Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5**
  - [x] 6.7 Write property test for own-history rescue inputs
    - **Property 11: Own-history rescue inputs match a reference computation**
    - **Validates: Requirements 11.1, 11.2, 11.3, 11.4, 11.5**
  - [x] 6.8 Write property test for sector medians
    - **Property 12: Sector medians cover every output sector**
    - **Validates: Requirements 11.6, 11.7, 11.8, 11.10, 11.12**
  - Commit message: `feat(data-pipeline): add scorer with steering updates`

## Phase 1 tasks (now): bulk data and data shape report

Shortest path to `pipeline/reports/data_shape.md`. Tasks 1 to 6 above are shared and done. Tasks 23 to 32 are Phase 1 and touch only new files, plus additive lines in `config.py` and `run_report.py`. Do not edit `extract()`, `icr()`, `universe.py` or `HttpClient.get()` (Requirement 29.5). Task 32 is a manual step for Frank.

- [x] 23. Phase 1 config additions, run report field and test helpers
  - [x] 23.1 Add the Phase 1 constants and exceptions to `pipeline/config.py` and the `bulk` field to `pipeline/run_report.py`
    - `config.py`: `BULK_CACHE_DIR` (`pipeline/.cache/bulk`), `PHASE1_OUT_DIR` (`pipeline/out`), `PHASE1_REPORTS_DIR` (`pipeline/reports`); `BulkDownloadError` and `MissingBulkFileError` (subclasses of `PipelineError`). Additive lines only; `Config` and existing exceptions unchanged.
    - `run_report.py`: one new field `bulk: dict | None = None`, serialised and redacted by the existing code
    - _Requirements: 20.5, 21.7, 27.1, 29.5_
  - [x] 23.2 Add Phase 1 helpers to `pipeline/tests/builders.py` and a streaming fake to `pipeline/tests/conftest.py`
    - `make_zip(members: dict[str, bytes]) -> bytes` (in-memory `zipfile`), `make_companyfacts(...)` (tags, years, units, forms, filed dates, accession numbers), `make_submissions_main(...)`, `make_submissions_page(...)`
    - `StreamSession`: `get(url, headers, timeout, stream)` returns an object with `status_code`, `headers`, `iter_content(chunk_size)` and `close()`; it can cut the stream short and counts requests
    - _Requirements: 17.1, 28.1_
  - [x] 23.3 Write example tests `pipeline/tests/test_bulk_config.py`
    - New constants point inside `pipeline/`; `pipeline/out` and `pipeline/.cache` are git-ignored (read `.gitignore`); `RunReport.to_json` with a `bulk` section contains no secret and redacts `api_key`; a run report without `bulk` is unchanged from before
    - _Requirements: 20.5, 21.7, 27.1, 29.3_
  - Commit message: `feat(data-pipeline): add phase 1 config, run report field and test helpers`
- [x] 24. Bulk download (`pipeline/bulk/download.py`)
  - [x] 24.1 Create `pipeline/bulk/__init__.py` and `pipeline/bulk/download.py`
    - `BulkRecord`, `BulkFile`, `read_record` (None when missing, unreadable, or size differs from the file), `is_fresh` (age under 24 h), `stream_to_part` (writes in 1 MiB chunks, hashes while writing), `check_download` (bytes equal `Content-Length` when present and no `Content-Encoding`; the file opens as a zip with at least one member), `fetch_bulk`
    - `fetch_bulk`: fresh record or `--use-cached` returns the cached file with no request; `--use-cached` without a zip raises `MissingBulkFileError`; otherwise one limiter slot per attempt, User-Agent from `SEC_CONTACT_EMAIL`, retry only the connection phase on 429 and 5xx with the existing backoff, delete `.part` and keep the older zip on any failed check, `os.replace` then write the record (temp file plus `os.replace`); a failed refetch of a stale zip raises and never uses it; errors go through `redact()`
    - _Requirements: 4.1, 4.3, 4.7, 21.1, 21.2, 21.3, 21.4, 21.5, 21.6, 21.7, 21.8, 20.4_
  - [x] 24.2 Write example tests `pipeline/tests/test_bulk_download.py`
    - Size mismatch removes `.part`, keeps the older zip and raises; a stream cut short fails the same way; a body that is not a zip fails; a record younger than 24 h means zero requests; a stale record refetches; a stale zip with a failed refetch raises and is not used; `--use-cached` ignores age and, with no zip, raises `MissingBulkFileError` naming the file; the record holds size and SHA-256 equal to `hashlib` over the bytes and `Last-Modified` (or null); exactly one request per zip on a cold run; the contact email is absent from every message; 429 on connect retries with waits `[1, 2]` on a fake sleep
    - _Requirements: 21.1, 21.2, 21.3, 21.4, 21.5, 21.6, 21.8, 20.4_
  - [x]* 24.3 Write property test for the streaming digest
    - **Property 36: Streaming digest does not depend on chunking**
    - **Validates: Requirements 21.2, 21.4**
  - Commit message: `feat(data-pipeline): add streaming bulk file download`
- [x] 25. Streaming reader (`pipeline/bulk/reader.py`)
  - [x] 25.1 Create `pipeline/bulk/reader.py`
    - `CIK_MEMBER`, `PAGE_MEMBER`, `member_names` (sorted, central directory only), `classify_member`, `iter_members` (opens the zip once, yields one `(name, bytes)` at a time in sorted order, yields `(name, exception)` for a member that cannot be read, never extracts to disk)
    - _Requirements: 22.1, 22.2, 22.3, 22.4, 22.5_
  - [x] 25.2 Write example tests `pipeline/tests/test_bulk_reader.py`
    - Sorted order whatever the zip order; names matching neither pattern are ignored and counted; a corrupt member is yielded as an error and the next member is still read; an instrumented reader proves no more than one member is alive at once on a tiny in-memory zip (22.6)
    - _Requirements: 22.1, 22.2, 22.4, 22.5, 22.6, 28.7_
  - Commit message: `feat(data-pipeline): add streaming zip member reader`
- [x] 26. Submissions aggregate and events extractor (`pipeline/bulk/submissions.py`)
  - [x] 26.1 Create `pipeline/bulk/submissions.py`
    - `Filing`, `EventRow`, `SubAgg`, `EVENT_RULES` (one table: 8-K and 8-K/A with item 1.03 or 2.01; forms 25, 25-NSE; forms 15-12B, 15-12G, 15-15D; exact form match), `filing_rows` (main file reads `filings.recent`, older page reads the top-level arrays), `event_rows` (pure; splits `items` on commas), `filing_url`, `merge_member` (min, max, union; order-independent), `aggregate` (skips orphan older pages and lists them; logs a member that fails to parse and sets `parse_error`)
    - Events keyed by (accession, event type); dates and tickers from every page; `last_10k` from forms `10-K` and `10-K/A`
    - _Requirements: 23.3, 23.4, 25.1, 25.2, 25.3, 25.4, 25.5, 25.6, 24.7_
  - [x] 26.2 Write example tests `pipeline/tests/test_bulk_submissions.py`
    - A firm whose bankruptcy 8-K (item 1.03) exists only on an older page is found (28.6); items "1.03,2.01" give two rows; each of the five form types gives the right event type and `25-NSE/A`, `15F-12B` and `10-K` give none; an 8-K/A is included with its form recorded; the same accession on a page and the main file gives one row; first, last and last 10-K dates take the min and max over all pages; an orphan older page is skipped and listed; a member that fails to parse sets `parse_error` and the run continues; URL format
    - _Requirements: 25.1, 25.2, 25.3, 25.4, 25.6, 22.4, 24.7, 28.5, 28.6_
  - [x]* 26.3 Write property test for event de-duplication
    - **Property 32: Events are de-duplicated by accession and type**
    - **Validates: Requirements 25.2, 25.4, 28.5**
  - [x]* 26.4 Write property test for member order
    - **Property 33: Member order does not change the result**
    - **Validates: Requirements 22.3, 25.1, 25.5, 28.6**
  - Commit message: `feat(data-pipeline): add submissions aggregate and events extractor`
- [x] 27. Panel extractor and tables (`pipeline/bulk/panel.py`, `pipeline/bulk/tables.py`)
  - [x] 27.1 Create `pipeline/bulk/panel.py`
    - `age_at_fy`, `zombie_flags`, `field_facts` (maps `YearValues.sources` to fields by tag; EBIT fallback lists the pretax tag then the interest tag; debt lists its parts), `panel_row`, `extract_panel` (calls `annual_facts`, `dedupe`, `flow_by_fy`, `fiscal_year_ends`, `build_year`, `pick_instant` for cash and `metrics.icr` for FY2013 to FY2025; writes only FY2015 to FY2025, exactly 11 rows; a year without a Fiscal_Year_End is a Gap_Row), `gap_panel`
    - `gap_has_balance_sheet`: true on a Gap_Row when an instant fact of `Assets`, `StockholdersEquity`, a debt tag or cash has `compustat_fy(end)` equal to that year (false on every other row)
    - Must not call or change `extract()`; `facts.py` stays unchanged
    - _Requirements: 24.1, 24.2, 24.3, 24.4, 24.5, 24.6, 24.7, 24.8, 24.9_
  - [x] 27.2 Create `pipeline/bulk/tables.py`
    - `FIRM_COLUMNS`, `PANEL_COLUMNS`, `EVENT_COLUMNS`, `cell` (None is empty, 0 is "0", booleans `true`/`false`), `GzipCsvWriter` (`mtime=0`, UTF-8, header, temp file then `os.replace`), `read_table`, `build_firm_row` (flags from `universe.py` ranges and `parse_sic`; `age_under_10` true for null first filing; a firm without a submissions record is kept with `no_sic` true and `entityName`)
    - _Requirements: 23.2, 23.3, 23.4, 23.5, 23.6, 24.9, 24.10_
  - [x] 27.3 Write example tests `pipeline/tests/test_bulk_panel.py`
    - Gap year in the middle; a firm that stops filing in 2019 keeps 11 rows; a January year end maps to the prior FY; the EBIT fallback and its tag column; cash within 7 days and absent cash is empty; FY2013 and FY2014 `icr` feed the FY2015 and FY2016 flags and have no rows; accession and URL columns for a multi-fact debt value; a 0 value is "0" and a missing value is empty; `age_at_fy` on anniversary boundaries and 29 February; flag is false when any of three icr values is null; firm table flags for a financial, a utility, a missing-SIC and a young firm; no row removed for any flag; byte-identical gzip output on two writes
    - _Requirements: 23.1 to 23.6, 24.1 to 24.10, 28.9_
  - [x]* 27.4 Write property test for missing values
    - **Property 28: Missing is never written as 0**
    - **Validates: Requirements 7.11, 24.2, 24.9**
  - [x]* 27.5 Write property test for panel completeness
    - **Property 29: Every firm keeps all 11 rows and stays in the Firm_Table**
    - **Validates: Requirements 23.1, 23.6, 24.1**
  - [x]* 27.6 Write property test for the zombie flag
    - **Property 30: The yearly zombie flag matches the definition**
    - **Validates: Requirements 24.8, 28.4**
  - [x]* 27.7 Write property test for age at a fiscal year
    - **Property 31: Age at a fiscal year**
    - **Validates: Requirements 24.6**
  - Commit message: `feat(data-pipeline): add firm-year panel extractor and tables`
- [x] 28. CLI: `download` and `panel` commands (`pipeline/bulk/cli.py`, `pipeline/bulk/__main__.py`)
  - [x] 28.1 Create `pipeline/bulk/cli.py` and `pipeline/bulk/__main__.py` with `download` and `panel`
    - Sub-commands `download`, `panel`, `report`, `all`; `--use-cached`; `--rate`; preflight (email for `download` and `all`, rate, output paths outside Protected_Dirs) before any request; exit codes 0, 1, 2, 3, 4, 5 of the Phase 1 table
    - `panel`: submissions pass first (`aggregate`), then companyfacts pass in sorted order writing `panel.csv.gz` row by row; a companyfacts member with no Annual_Fact is not in Universe_P1; a parse failure gives 11 Gap_Rows with `parse_error`; then `firms.csv.gz` and `events.csv.gz` (events only for Universe_P1 CIKs, sorted by CIK, date, accession, type); progress line to stderr every 1,000 members
    - Run_Report `bulk` section (zips, members read, ignored, failed, Universe_P1 size, submissions-only CIKs, orphan pages, panel rows, Gap_Rows, events per type, request and cache counts), written in `finally`
    - `report` and `all` accept the sub-command but run only what exists; `report` is completed in task 30
    - _Requirements: 20.1 to 20.5, 21.x, 22.4, 23.1, 23.2, 25.7, 25.8, 27.1 to 27.4_
  - [x] 28.2 Write example tests `pipeline/tests/test_bulk_cli.py`
    - Missing `SEC_CONTACT_EMAIL` exits 2 with zero requests; `panel` and `report` send zero requests; `panel` without a zip exits 4; a tiny two-zip fixture (a December firm, a January firm, a bankrupt firm with its 8-K on an older page, a financial firm, a firm with no submissions) produces the three tables in a temp folder with the expected row counts, flags and one bankruptcy event; the Run_Report `bulk` section has the expected counts; nothing is written outside the temp folders
    - _Requirements: 20.2, 20.3, 20.4, 20.5, 27.x, 28.1, 28.11_
  - Commit message: `feat(data-pipeline): add bulk download and panel commands`
- [x] 29. Data shape report (`pipeline/bulk/report.py`)
  - [x] 29.1 Create the report helpers and sections 1, 2 and 7
    - `core_mask`, `present_mask`, `s1_firm_counts`, `s2_zombies` (both shares), `s7_data_quality` (all firms and Core_Firm_Year; December test on `fye` month; Gap_Rows that have a balance-sheet fact)
    - Uses the panel column `gap_has_balance_sheet` written in task 27
    - _Requirements: 26.1, 26.3, 26.4, 26.5, 26.10, 24.3_
  - [x] 29.2 Add sections 3, 4 and 5
    - `classify_outcome` (pure; precedence bankruptcy, delisted_or_deregistered, stopped_filing, recovered, still_zombie, other_alive; event window after the zombie year's `fye` up to 2024-12-31), `s3_outcomes` (counts, CIK-list CSV, "filed item 2.01" column), `s4_recoveries_reversed`, `s5_zombie_then_bankrupt`
    - _Requirements: 26.6, 26.7, 26.8_
  - [x] 29.3 Add sections 6 and 8
    - `breaking_rate_pp`, `s6_breaking_rate` (latest year per firm and fixed FY2024; 0.5 pp buckets from -10 to +20 with underflow and overflow; below 1 to 5 pp; count of firms left out), `s8_largest_firms` (200 by maximum annual revenue, ties by CIK, zombie string FY2017 to FY2025)
    - _Requirements: 26.9, 26.11_
  - [x] 29.4 Add `render_markdown` and the writer for `pipeline/reports`
    - Source block from the download records (or "unknown, no download record"), definitions, "Data: SEC EDGAR. Not investment advice." and the age-proxy note, one section per requirement 26.4 to 26.11, links to the section CSVs, deterministic formats (counts as integers, shares to 6 decimals in CSV), rows sorted by natural key, no timestamps other than the source block
    - _Requirements: 26.1, 26.2, 26.12, 26.13_
  - [x] 29.5 Write example tests `pipeline/tests/test_bulk_report.py`
    - Each section on a small hand-built panel: counts per year; both shares; the outcome precedence (a firm with a bankruptcy event and a recovered FY2024 icr is `bankruptcy`); stopped filing; item 2.01 column; histogram edges (exactly 0.5, -10, 20); a firm with debt 0 or interest 0 is left out and counted; the 200-firm ranking with a tie; deterministic rendering twice
    - _Requirements: 26.x, 28.10_
  - [x]* 29.6 Write property test for outcome categories
    - **Property 34: Outcome categories partition the zombies**
    - **Validates: Requirements 26.6**
  - [x]* 29.7 Write property test for the breaking-rate histogram
    - **Property 35: Breaking-rate histogram and thresholds match a brute force**
    - **Validates: Requirements 26.9**
  - [x]* 29.8 Write property test for report determinism
    - **Property 37: Report output is deterministic**
    - **Validates: Requirements 26.13**
  - Commit message: `feat(data-pipeline): add data shape report`
- [ ] 30. `report` and `all` commands, static checks and offline end-to-end test
  - [ ] 30.1 Wire `report` and `all` into `pipeline/bulk/cli.py`
    - `report` reads the three tables and writes `pipeline/reports/data_shape.md` and the section CSVs; it exits 4 when a table is missing; `all` runs download, panel, report in order and stops at the first failure with that step's exit code
    - _Requirements: 20.1, 20.3, 26.1, 29.3_
  - [ ] 30.2 Write `pipeline/tests/test_bulk_static.py`
    - `.gitignore` contains `pipeline/out/` and `pipeline/.cache/`; `ebit / interest` appears only in `pipeline/metrics.py`; no file under `pipeline/bulk` imports `react` or `three`, and `requests` is imported only in `download.py`; `pipeline/requirements.txt` is unchanged (five pinned lines); `extract` in `facts.py` and `icr` in `metrics.py` are still defined once; no Phase 1 code writes under `data/` or `web/`
    - _Requirements: 8.1, 19.1, 29.1, 29.3, 29.5, 29.6_
  - [ ] 30.3 Write an offline end-to-end test in `pipeline/tests/test_bulk_cli.py`
    - `all` on the tiny two-zip fixture with a `StreamSession`: exit 0; two requests; zips, records, three tables and the report in temp folders; a second run with fresh records sends zero requests and gives byte-identical tables and report; `report` alone after a `panel` gives the same report; the repository's `pipeline/.cache`, `pipeline/out`, `pipeline/reports` and `data` are unchanged after the test
    - _Requirements: 20.1, 21.5, 26.13, 28.1, 28.11_
  - Commit message: `test(data-pipeline): add bulk report command, static checks and end-to-end test`
- [ ] 31. Phase 1 checkpoint
  - Run `.venv/bin/python -m pytest pipeline/tests`. Ensure all tests pass, ask the user if questions arise.
- [ ] 32. MANUAL (Frank): live bulk run and first look at the report
  - [ ] 32.1 Frank downloads and builds everything: `SEC_CONTACT_EMAIL=<email> .venv/bin/python -m pipeline.bulk all`. The agent must not run this. Needs several GB of free disk (two zips plus `pipeline/out`).
    - Read `pipeline/.cache/run_report.json` section `bulk`: zip sizes and SHA-256, members read, parse failures, Universe_P1 size, orphan pages, Gap_Rows, events per type. Note the wall-clock time of the companyfacts pass. If it is too slow (design: 10 to 30 minutes expected), ask for the worker-pool follow-up.
    - _Requirements: 20.1, 21.x, 27.x_
  - [ ] 32.2 Frank reads `pipeline/reports/data_shape.md`, checks a few known names in section 8 and the zombie counts in section 2 against what he expects, and decides the game design from it
    - _Requirements: 26.x_
  - [ ] 32.3 Frank commits only the report and its CSVs: `git status` must show nothing under `pipeline/out` or `pipeline/.cache`; commit `docs(data-pipeline): add data shape report from the real bulk run`
    - _Requirements: 29.3, 29.4_

## Phase 2 tasks (after the design is chosen)

Tasks 7 to 22 are unchanged and keep their numbers. Their requirements are 1 to 19 and the Phase 2 design.

- [x] 7. Checkpoint - extractor and scorer (Phase 2)
  - Run `.venv/bin/python -m pytest pipeline/tests`. Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Macro data (`pipeline/macro.py`) (Phase 2)
  - [ ] 8.1 Create `pipeline/macro.py`
    - `parse_fred_csv`, `parse_fred_json`, `latest_numeric` (skips `.` and empty values), `dgs10_doc` (`round(percent / 100, 4)`, date, source "FRED DGS10"), `fetch_dgs10` raising `MacroError` for fetch failure and unparseable or empty data
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.6, 12.7_
  - [ ] 8.2 Write example tests `pipeline/tests/test_macro.py`
    - CSV and API bodies built in the test; `.` as the last row skipped; 4.21 gives 0.0421; no numeric row raises `MacroError`; fetch failure with no fresh cache raises `MacroError`; API key absent from cache and error text
    - _Requirements: 12.3, 12.4, 12.6, 12.7_
  - [ ]* 8.3 Write property test for the latest observation
    - **Property 13: Latest numeric DGS10 observation**
    - **Validates: Requirements 12.3**
  - Commit message: `feat(data-pipeline): add DGS10 macro fetch`

- [ ] 9. Writer: documents, validation, atomic swap, keeper log (Phase 2)
  - [ ] 9.1 Create `pipeline/writer.py` document builders
    - `dumps` (indent 2, `ensure_ascii=False`, `allow_nan=False`, trailing newline), `iso_utc`, `index_row`, `firm_doc`, `index_doc` (sorted by CIK, counts, `fiscal_years` union, `definition_version` "2.0"), `macro_doc` (one entry per output sector), `build_keeper_entry`, `build_keeper_log` (newest first, max 60), `summary_sentence` (at most 120 characters); keys in `data-contract.md` order
    - _Requirements: 6.11, 11.10, 13.6, 13.7, 13.11, 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7, 14.8_
  - [ ] 9.2 Add `load_previous`, `validate_dir`, `write_outputs` to `pipeline/writer.py`
    - `load_previous` raises `CorruptPreviousError` naming the file when the previous index or keeper log does not parse or fails its schema; `validate_dir` uses `Draft202012Validator` with `FormatChecker` and reports `file: json-path: message`; `write_outputs` writes to `.pipeline-tmp-*` inside Output_Dir, validates, swaps `firms_index.json`, `firms/`, `macro.json` and `keeper_log.json` with `.pipeline-bak-*` restore on failure, re-asserts `not is_protected(out_dir)`, removes stale tmp folders and warns about stale backup folders
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.12, 14.9, 14.10_
  - [ ] 9.3 Write required example tests `pipeline/tests/test_writer.py`
    - No-replace-on-invalid-output: an invalid generated document leaves every file in Output_Dir byte-identical and reports file and location; swap failure injected by patching `os.replace` on its third call restores the earlier outputs; stale firm files removed after a successful swap; protected `out_dir` refused; corrupt previous index or keeper log raises `CorruptPreviousError`; keeper log with 60 existing entries keeps 60; first run has empty `new_zombies` and `revived`; zombie to `insufficient_data` is not listed in `revived`
    - _Requirements: 13.3, 13.4, 13.5, 13.12, 14.1, 14.4, 14.5, 14.8, 14.9, 14.10, 17.11_
  - [ ]* 9.4 Write property test for meta counts
    - **Property 22: Meta counts match the firm list**
    - **Validates: Requirements 13.8**
  - [ ]* 9.5 Write property test for schema validity
    - **Property 23: Every generated output file is schema-valid**
    - **Validates: Requirements 13.2, 13.9**
  - [ ]* 9.6 Write property test for index and firm file agreement
    - **Property 24: Index and firm files agree**
    - **Validates: Requirements 9.14, 13.6, 13.7, 13.13**
  - [ ]* 9.7 Write property test for output determinism
    - **Property 25: Output bytes do not depend on processing order**
    - **Validates: Requirements 13.10**
  - [ ]* 9.8 Write property test for the keeper log
    - **Property 26: Keeper log update**
    - **Validates: Requirements 14.1, 14.3, 14.4, 14.5, 14.7, 14.8**
  - Commit message: `feat(data-pipeline): add validated atomic writer and keeper log`

- [ ] 10. Checkpoint - writer (Phase 2)
  - Run `.venv/bin/python -m pytest pipeline/tests`. Ensure all tests pass, ask the user if questions arise.

- [ ] 11. First end-to-end run: `--tickers` (Phase 2)
  - [ ] 11.1 Create `pipeline/run.py` with the `--tickers` path
    - `build_parser` (`--tickers`, `--ciks`, `--sample`, `--seed`, `--sector`, `--out`, `--rate`, validators naming the bad flag), `preflight` (exit 2 before any request: no selection, protected `--out`, unreadable files, missing `SEC_CONTACT_EMAIL`, bad rate), previous-output loading, `company_tickers.json` fetch (exit 4), selection union with `selected_by`, empty selection (exit 5), per-firm fetch, `classify`, `extract`, `score`, the 2% Failed_Firm gate (exact 2% passes, exit 6), DGS10 (exit 7), sector medians and fallback inputs (exit 8), keeper entry, `write_outputs` (exits 9 and 10), Run_Report written in `finally` with exit code and requirement number; `main` accepts injected `session`, `env`, `clock`, `cache_dir`, `reports_dir`
    - Reports are not wired yet (task 15)
    - _Requirements: 1.1, 1.4, 1.5, 1.7, 1.8, 1.9, 1.10, 1.13, 1.14, 1.15, 1.16, 1.18, 4.2, 4.5, 4.12, 4.13, 11.9, 12.6, 12.7, 13.1, 13.3, 13.4, 14.10, 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.8, 18.3_
  - [ ] 11.2 Write example tests `pipeline/tests/test_run.py` using hand-written fixtures
    - Offline `--tickers` run with a `FakeSession` and 4 to 6 small firms (one financial, one utility, one young, one zombie, one healthy, one insufficient_data): exit 0, four outputs valid against `data/schema`, excluded firms absent, Run_Report complete and free of secrets
    - Preflight failures send zero requests and leave Output_Dir untouched (no selection, bad sector, bad `--sample`, protected `--out`, missing email, rate 11)
    - Failure runs: empty selection, corrupt previous index, ticker map unavailable, DGS10 failure, no own-history firm
    - 2% threshold: exactly 2% failed passes, just above exits 6, and Output_Dir is unchanged
    - Second run from the cache sends no requests and is byte-identical except `generated_at` and the new keeper entry
    - _Requirements: 1.8, 1.10, 1.15, 4.2, 4.12, 4.13, 11.9, 12.6, 13.9, 13.10, 14.10, 16.1, 16.7, 17.11_
  - Commit message: `feat(data-pipeline): add CLI and end-to-end run for ticker lists`

- [ ] 12. `--ciks` selection (Phase 2)
  - [ ] 12.1 Extend `pipeline/run.py` and `pipeline/universe.py` for `--ciks`
    - Read and zero-pad CIKs, skip the Recency_Rule for CIK-selected firms (also when another option selected them), keep `financial`, `utility`, `no_sic`, `age_under_10`, `no_annual_facts`, record `selected_by` for every option, write `no_firm_window` firms to the Run_Report and leave them out of the output
    - _Requirements: 1.3, 1.12, 1.16, 1.18, 2.9, 2.10, 6.13_
  - [ ] 12.2 Write example tests in `pipeline/tests/test_run.py`
    - Firm whose Latest_FY is 2022 is included through `--ciks` and excluded through `--tickers`; `--tickers` plus `--ciks` selecting the same CIK is processed once with both options recorded; `invalid_cik` line recorded; a firm with annual facts but no Firm_Window is omitted and listed under `no_firm_window`
    - _Requirements: 1.12, 1.16, 1.18, 2.9, 6.13_
  - Commit message: `feat(data-pipeline): add --ciks selection`

- [ ] 13. `--sample` with seeded sampling and minimums (Phase 2)
  - [ ] 13.1 Create `pipeline/sampler.py`
    - `scan_limit`, `division_minimum`, `shuffled_ciks` (unique, ascending, `random.Random(seed).shuffle`), `decide`, `Decision`, `SampleResult`, `sample` with the six-step per-CIK flow (SIC check, 10-K pre-filter since 2024-06-01, `decide`, older pages for age, companyfacts for recency), lazy overflow list, backstop fill, `minimums_unmet`, `scan_limit_hit`, failed firms skipped and counted as visited
    - _Requirements: 1.4, 1.5, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.12_
  - [ ] 13.2 Wire `--sample` into `pipeline/run.py`
    - Sampler independent of other options, sample record in the Run_Report (`requested`, `selected`, `shortfall`, `seed`, `visited`, `scan_limit`, `scan_limit_hit`, `per_division`, `sample_minimums_unmet`), stderr warning per unmet division with exit code 0
    - _Requirements: 1.4, 1.5, 1.14, 1.17, 3.9, 3.10, 3.11, 16.9_
  - [ ] 13.3 Write example tests `pipeline/tests/test_sampler.py`
    - `scan_limit(50) == 500` and `scan_limit(5) == 200`; `division_minimum` for N = 1, 9, 10, 50 gives 0, 4, 5, 5; the N = 50 worked example through `decide()` (first 40 accepted, one more at free = 1, then Manufacturing pending while Retail and Transportation are accepted); scan ending on the limit with an unmet Transportation minimum gives a warning, exit code 0 and `sample_minimums_unmet`; `--sample 50` without `--seed` uses seed 0; failed candidate skipped and recorded; sampler run through `main()` with a fake session
    - _Requirements: 1.5, 3.2, 3.3, 3.4, 3.9, 3.10, 3.12, 16.9_
  - [ ]* 13.4 Write property test for sampler determinism
    - **Property 17: Sampler determinism**
    - **Validates: Requirements 1.4, 3.1, 3.8, 3.15**
  - [ ]* 13.5 Write property test for lazy versus eager sampling
    - **Property 18: Lazy sampler equals an eager reference sampler**
    - **Validates: Requirements 3.4, 3.5, 3.6, 3.7, 3.12**
  - [ ]* 13.6 Write property test for the selected subset
    - **Property 19: Selection is a bounded subset of the eligible firms**
    - **Validates: Requirements 3.9, 3.12, 3.13**
  - [ ]* 13.7 Write property test for minimums
    - **Property 20: Minimums are met when feasible and reported when not**
    - **Validates: Requirements 3.2, 3.4, 3.10, 3.14**
  - [ ]* 13.8 Write property test for the simple random sample case
    - **Property 21: Without Minimum_Division firms the sample is the first N eligible firms**
    - **Validates: Requirements 3.6, 3.16**
  - Commit message: `feat(data-pipeline): add seeded sampler with division minimums`

- [ ] 14. `--sector` selection (Phase 2)
  - [ ] 14.1 Add `select_sector` to `pipeline/universe.py` and wire it into `pipeline/run.py`
    - Full submissions scan of the ticker map, notice before the first request on an empty Cache, progress line every 100 firms and after the last, exact division match, finance division rejected in preflight
    - _Requirements: 1.6, 1.7, 18.4, 18.5_
  - [ ] 14.2 Write example tests in `pipeline/tests/test_universe.py` and `test_run.py`
    - Sector run on a 3-division fake universe selects only that division's Eligible_Firms; notice printed once; progress lines at 100 and at the end; union with `--tickers` deduplicated
    - _Requirements: 1.6, 1.16, 18.4, 18.5_
  - Commit message: `feat(data-pipeline): add --sector selection`

- [ ] 15. Reports: threshold report and Act 1 candidates (Phase 2)
  - [ ] 15.1 Create `pipeline/reports.py` classifiers and rendering
    - `complete_window` (SIC 2000-3999, 5 years complete, revenue > 0), `is_temporary_drop`, `is_too_much_debt`, `is_broken_business`, `provisional_projection` (using `metrics.icr`), `holds`, `distress_filings` (8-K item 1.03, Form 25, 25-NSE), `rank`, `render_act1` (three sections always present, PROVISIONAL labels, null shown as missing, null ticker marker, "not checked" flag)
    - _Requirements: 8.1, 15.2, 15.4, 15.5, 15.6, 15.7, 15.8, 15.9, 15.10, 15.11, 15.12, 15.13, 15.14, 15.15_
  - [ ] 15.2 Add `run_threshold_report` and `write_act1_report` to `pipeline/reports.py` and wire them into `pipeline/run.py`
    - Load `threshold_report.py` with `importlib` without editing it, set `REPORT_DIR` to `reports_dir`, run on `{out}/firms_index.json`, then write `pipeline/reports/act1_candidates.md` from the firm files just written; failure exits 11 naming the step and does not roll back Output_Dir
    - _Requirements: 15.1, 15.2, 15.3, 15.10, 16.1_
  - [ ] 15.3 Write example tests `pipeline/tests/test_reports.py`
    - Classifiers on the three `make_mock.py` Act 1 firms (each matches only its own case, built from files read-only); ranking by expected holds then CIK; a firm in two cases ranked independently; empty case prints "no candidate matched"; 8-K item 1.03 and Form 25 flags with form, date and accession; unreachable submissions gives "not checked"; failing report step exits 11 with outputs kept
    - _Requirements: 15.2, 15.3, 15.5, 15.6, 15.7, 15.9, 15.10, 15.13, 15.15_
  - [ ]* 15.4 Write property test for the provisional check
    - **Property 27: Provisional check matches make_mock.py**
    - **Validates: Requirements 15.11**
  - Commit message: `feat(data-pipeline): add threshold report and Act 1 candidates`

- [ ] 16. Fixture recording script and fixture hygiene test (Phase 2)
  - [ ] 16.1 Create `pipeline/scripts/record_fixtures.py` (new file; not collected by pytest)
    - `SEC_SUBJECTS` list for the cases in the design (December and January year end, 52/53-week year, comparative restatement, EBIT fallback, older submissions page, 8-K item 1.03, financial SIC 6021, utility SIC 4911), `trim_submissions`, `trim_companyfacts`, `trim_fred_csv`, `scan_for_secrets`, `main`; exits 2 before any request when `SEC_CONTACT_EMAIL` is unset, empty or whitespace-only; uses the pipeline `SecClient` and `FredClient` with an empty temporary Cache; writes only trimmed bodies (no headers) plus `urls.json` (FRED URLs through `redact_url`) to a temporary folder; scans every file for `user-agent` and email patterns and aborts without keeping the file; replaces `pipeline/tests/fixtures/sec`, `fred` and `urls.json` only when everything is clean; never overwrites `status_cases.json`
    - _Requirements: 17.3, 17.12, 17.13, 17.14, 19.10_
  - [ ] 16.2 Write example tests `pipeline/tests/test_record_fixtures.py` for the pure helpers only
    - Import the script's pure functions with `importlib` inside the test (the static test of task 19 allows only this file); `trim_*` keeps only referenced tags and rows; `scan_for_secrets` flags `User-Agent` in any case and an email address; missing `SEC_CONTACT_EMAIL` exits 2 before any request
    - _Requirements: 17.12, 17.13, 17.14_
  - [ ] 16.3 Write `pipeline/tests/test_fixtures_clean.py`
    - Walk every file under `pipeline/tests/fixtures` (including `urls.json` and `status_cases.json`), fail naming each file that contains `user-agent` (case-insensitive) or matches the email pattern; second example checks the scanner on strings containing each pattern
    - _Requirements: 17.13_
  - Commit message: `feat(data-pipeline): add fixture recorder and fixtures-clean test`

- [ ] 17. MANUAL (Frank): record the fixtures with network access (Phase 2)
  - [ ] 17.1 Frank runs `SEC_CONTACT_EMAIL=<email> .venv/bin/python pipeline/scripts/record_fixtures.py` (add `FRED_API_KEY` only if the API fixture is wanted), checks the new files under `pipeline/tests/fixtures`, runs `.venv/bin/python -m pytest pipeline/tests/test_fixtures_clean.py`, and commits `test(data-pipeline): add recorded SEC and FRED fixtures`
    - The agent must not run this against live SEC or FRED unless `SEC_CONTACT_EMAIL` is set and Frank asks
    - _Requirements: 17.3, 17.12, 17.13, 17.14_

- [ ] 18. Switch tests to recorded fixtures (Phase 2)
  - [ ] 18.1 Point `FakeSession` in `pipeline/tests/conftest.py` at `fixtures/urls.json` and add recorded-fixture tests
    - Keep the hand-written builders for edge cases; add tests that run extractor, scorer and `main()` on the recorded firms (December and January year ends, 52/53-week year, restated comparative, EBIT fallback, older submissions page, financial and utility exclusions, DGS10 CSV and API parsing); fix any extractor or scorer bug these reveal
    - _Requirements: 6.2, 6.4, 6.5, 7.4, 12.3, 17.3, 17.4_
  - Commit message: `test(data-pipeline): run extractor and CLI tests on recorded fixtures`

- [ ] 19. Static checks (Phase 2)
  - [ ] 19.1 Write `pipeline/tests/test_static.py`
    - `ebit / interest` appears only in `pipeline/metrics.py` among `pipeline/*.py` (scripts excluded); no function with `shock` in its name defined in `pipeline/*.py` (10.6); `pipeline/requirements.txt` contains exactly the five pins `requests==2.34.2`, `pandas==3.1.1`, `pytest==9.2.0`, `hypothesis==6.170.15`, `jsonschema==4.26.0` and nothing else (19.1); `.gitignore` contains `pipeline/.cache/`; no file in `pipeline/tests` imports `record_fixtures` except `test_record_fixtures.py`, and the script exists; no `pipeline/*.py` reads `SEC_CONTACT_EMAIL` or `FRED_API_KEY` from anywhere except `os.environ`
    - _Requirements: 5.6, 8.1, 10.6, 17.12, 19.1, 19.2, 19.10_
  - Commit message: `test(data-pipeline): add static checks for icr, shock, pins and secrets`

- [ ] 20. Full offline end-to-end test (Phase 2)
  - [ ] 20.1 Extend `pipeline/tests/test_run.py` with the full offline run
    - `main()` with `--tickers`, `--ciks`, `--sample` and `--sector` together on recorded fixtures and a fake session: exit 0; `firms_index.json`, `firms/{cik}.json`, `macro.json` and `keeper_log.json` all present and valid against `data/schema`; `act1_candidates.md` has three sections; second run byte-identical apart from `generated_at` and the keeper entry date; failure runs for exit codes 3 to 11 each leave Output_Dir unchanged (or restored for 10, kept for 11) with the expected exit code and requirement number in the Run_Report; `data`, `data/mock` and `pipeline/.cache` unchanged after the test session
    - _Requirements: 13.3, 13.4, 13.9, 13.10, 13.12, 15.2, 15.3, 16.1, 16.2, 17.4_
  - Commit message: `test(data-pipeline): add full offline end-to-end test`

- [ ] 21. Final checkpoint (Phase 2)
  - Run `.venv/bin/python -m pytest pipeline/tests`. Ensure all tests pass, ask the user if questions arise.

- [ ] 22. MANUAL (Frank): live verification and real data run (Phase 2)
  - [ ] 22.1 Frank times a sample run with an empty cache: `SEC_CONTACT_EMAIL=<email> .venv/bin/python -m pipeline.run --sample 50 --seed 1 --out /tmp/zfr-out` (the first run happens before `pipeline/act1_ciks.txt` exists; use `--tickers` or only `--sample`), then reads `pipeline/.cache/run_report.json`: wall-clock time under 5 minutes, request counts, `sample_minimums_unmet`, `scan_limit_hit` and failure percentage
    - _Requirements: 3.9, 3.10, 16.9, 18.1, 18.2, 18.3_
  - [ ] 22.2 Frank chooses the Act 1 CIKs from `pipeline/reports/act1_candidates.md` and writes them to `pipeline/act1_ciks.txt` (one CIK per line). `pipeline/act1_ciks.txt` does not exist until this step, because the candidates only appear after the first run.
    - _Requirements: 1.3, 15.2, 15.13_
  - [ ] 22.3 Frank runs the combined command and the real data run
    - Timed check: `SEC_CONTACT_EMAIL=<email> .venv/bin/python -m pipeline.run --sample 50 --seed 1 --ciks pipeline/act1_ciks.txt --out /tmp/zfr-out` with an empty cache (`pipeline/.cache` removed), under 5 minutes with `--sample` as the only network-heavy option; check `sample_minimums_unmet` in the Run_Report
    - Real run: the same command with `--out data` (default), then `git diff --stat -- data/mock data/schema data/fixtures pipeline/scripts/make_mock.py pipeline/scripts/threshold_report.py` must be empty; commit `chore(data-pipeline): add real data run`
    - _Requirements: 1.16, 3.9, 3.10, 13.3, 16.9, 18.1, 18.2, 19.8_

## Notes
- `waves` in the dependency graph is Phase 1 (what runs next). `phase2_waves` is the earlier graph for tasks 1 to 22, unchanged. Tasks 1 to 6 in it are done.
- Phase 1 order: download (24), reader (25), submissions and events (26), panel (27), CLI for `download` and `panel` (28), report (29), `report` and `all` plus the end-to-end test (30).

- Tasks marked `*` are optional property tests and can be skipped for a faster first delivery. Example tests are required.
- The first end-to-end run is task 11 (`--tickers`, offline with hand-written fixtures). Tasks 12, 13, 14 and 15 add `--ciks`, `--sample`, `--sector` and the reports in that order.
- Property tests for the same file are placed in separate waves only to avoid write conflicts.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["23.1", "23.2"] },
    { "id": 1, "tasks": ["23.3", "24.1", "25.1", "26.1"] },
    { "id": 2, "tasks": ["24.2", "25.2", "26.2", "27.1", "27.2"] },
    { "id": 3, "tasks": ["24.3", "26.3", "26.4", "27.3", "28.1"] },
    { "id": 4, "tasks": ["27.4", "27.5", "27.6", "27.7", "28.2", "29.1"] },
    { "id": 5, "tasks": ["29.2"] },
    { "id": 6, "tasks": ["29.3"] },
    { "id": 7, "tasks": ["29.4"] },
    { "id": 8, "tasks": ["29.5", "30.1"] },
    { "id": 9, "tasks": ["29.6", "29.7", "29.8", "30.2", "30.3"] },
    { "id": 10, "tasks": ["32.1"] },
    { "id": 11, "tasks": ["32.2"] },
    { "id": 12, "tasks": ["32.3"] }
  ],
  "phase2_waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "2.1", "3.1", "4.1"] },
    { "id": 2, "tasks": ["1.3", "2.2", "3.2", "4.2", "5.1", "6.1"] },
    { "id": 3, "tasks": ["2.3", "3.3", "4.3", "5.2", "6.2", "8.1", "16.1", "16.3"] },
    { "id": 4, "tasks": ["2.4", "3.4", "4.4", "5.3", "6.3", "8.2", "9.1", "16.2"] },
    { "id": 5, "tasks": ["3.5", "4.5", "6.4", "8.3", "9.2", "17.1"] },
    { "id": 6, "tasks": ["3.6", "4.6", "6.5", "9.3", "11.1"] },
    { "id": 7, "tasks": ["6.6", "9.4", "11.2", "12.1", "13.1", "15.1"] },
    { "id": 8, "tasks": ["6.7", "9.5", "12.2", "13.2", "13.3"] },
    { "id": 9, "tasks": ["6.8", "9.6", "13.4", "14.1"] },
    { "id": 10, "tasks": ["9.7", "13.5", "14.2", "15.2"] },
    { "id": 11, "tasks": ["9.8", "13.6", "15.3"] },
    { "id": 12, "tasks": ["13.7", "15.4"] },
    { "id": 13, "tasks": ["13.8", "18.1", "19.1"] },
    { "id": 14, "tasks": ["20.1"] },
    { "id": 15, "tasks": ["22.1"] },
    { "id": 16, "tasks": ["22.2"] },
    { "id": 17, "tasks": ["22.3"] }
  ]
}
```
