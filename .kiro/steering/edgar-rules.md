---
inclusion: fileMatch
fileMatchPattern: pipeline/**
---
# EDGAR and FRED Rules

These rules apply to any code that calls SEC or FRED.

## Access

- Every SEC request sends the header `User-Agent: ZombieFirmRadar <contact email>`. Read the email from the environment variable `SEC_CONTACT_EMAIL`. Never hard-code it. Requests without it get HTTP 403.
- Stay under 10 requests per second to SEC. Use one shared rate limiter for all SEC calls. Default: 5 per second.
- Retry with exponential backoff on HTTP 429 and 5xx. A single firm failing is logged and skipped, never a crash.
- Phase 2 (contract-v2 outputs, per-firm fetching): a firm whose fetch fails after retries is left out of all outputs. It is not `insufficient_data`, which means the filings themselves lack data. Log each skipped CIK with the reason in `pipeline/.cache/run_report.json`.
- Phase 2 only: if more than 2% of firms in the universe fail, the run exits with an error and writes nothing to `/data`.
- Phase 1 bulk run: neither the "left out of all outputs" rule nor the 2% rule applies. A member file that cannot be parsed is logged in the run report, the firm is kept with `parse_error = true`, and the run continues.
- Cache raw responses under `pipeline/.cache` and never refetch within 24 hours. This also covers the two bulk files below: a cached zip younger than 24 hours is not downloaded again. `pipeline/.cache` is git-ignored.
- The FRED API key comes from the environment variable `FRED_API_KEY`. Never commit keys or a `.env` file.

## Sources

- Ticker to CIK map: `https://www.sec.gov/files/company_tickers.json`. CIKs are 10-digit zero-padded strings.
- SIC code and first filing year: the submissions endpoint `https://data.sec.gov/submissions/CIK##########.json`. The first filing year is the earliest filing date, including the older pages listed under `files`.
- Financial values: the companyfacts endpoint `https://data.sec.gov/api/xbrl/companyfacts/CIK##########.json` is the main source, one request per firm.
- Bulk files (phase 1): `https://www.sec.gov/Archives/edgar/daily-index/xbrl/companyfacts.zip` and `https://www.sec.gov/Archives/edgar/daily-index/bulkdata/submissions.zip`. Download each once (1 request each, same User-Agent, same rate limiter), stream to `pipeline/.cache` through a `.part` file, never load a whole archive into memory, never commit them. Read the archives one member at a time. Record download time, size, SHA-256 and `Last-Modified` in the run report. The members have the same structure as the per-firm endpoints, so the same fiscal-year rules apply.
- The frames endpoint is optional and only for sanity checks, because it is calendar-aligned and has no `fy` field.

## Fiscal year assignment

- Use only annual values: form 10-K or 10-K/A, `fp` = FY. Exclude 10-KT and 10-K405. `as_of_filing.form` records the actual form of the chosen filing.
- Flow items (revenue, EBIT, interest expense) must have a period duration between 350 and 380 days. This applies to every flow item, including both parts of the EBIT fallback (pre-tax income and `InterestExpense`), and both parts must come from the same period.
- Balance-sheet items (debt, assets, equity) are instants: use the value at the fiscal year end date.
- Do not trust the `fy` field on its own. A 10-K also reports prior-year comparatives with the same `fy`. Assign each value to a fiscal year by its period end date, using the Compustat convention: if the fiscal year ends in January to May, `fy` = end year - 1; if it ends in June to December, `fy` = end year. Example: a year ending 2025-01-31 is FY2024.
- If the same period appears in several filings, keep the most recently filed value.

## Scope

Phase 2 (contract-v2 outputs). In the phase 1 bulk panel these rules are flags (`financial`, `utility`, `no_sic`, `age_under_10`), not exclusions, and no firm is dropped.

- Exclude financial firms (SIC 6000-6799). This range already covers REITs (SIC 6798). They do not appear in any output file.
- Exclude utilities (SIC 4900-4999). They do not appear in any output file.
- Only firms with `age_years >= 10` appear in any output file.
