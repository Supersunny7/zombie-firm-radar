---
inclusion: always
---

# Data Contract

**Version 2: v2 draft, pending partner review.**

Any change to this contract must update this file, the JSON Schemas in `/data/schema/` and the TypeScript types in `/web/src/types/data.ts` in the same commit.

## Global rules

- Money is in USD (not thousands).
- Missing data is `null`, never `0` as a placeholder.
- Years are sorted ascending.
- Ratios are decimals (0.06 = 6%).
- CIKs are 10-digit zero-padded strings.

## File 1: `/data/firms_index.json`

Loaded once by the graveyard. Schema: `/data/schema/firms_index.schema.json`.

```json
{
  "meta": {
    "generated_at": "ISO 8601",
    "source": "SEC EDGAR XBRL",
    "definition_version": "2.0",
    "fiscal_years": [2020, 2021, 2022, 2023, 2024],
    "counts": { "zombie": 0, "endangered": 0, "healthy": 0, "insufficient_data": 0 }
  },
  "firms": [
    {
      "cik": "0000000000",
      "ticker": "string|null",
      "name": "string",
      "sector": "SIC division name",
      "sic": "string",
      "first_filing_year": 2001,
      "age_years": 24,
      "status": "zombie|endangered|healthy|insufficient_data",
      "latest_icr": 0.5,
      "total_debt_usd": 0,
      "implied_rate": 0.06,
      "shock_eligible": true,
      "rescue_eligible": true
    }
  ]
}
```

`rescue_eligible` is true only if the firm has revenue, EBIT, interest expense, total debt, total assets and equity for its latest fiscal year and at least 3 years of history.

Nullable fields when data is missing: `ticker`, `latest_icr`, `total_debt_usd`, `implied_rate`.

## File 2: `/data/firms/{cik}.json`

Loaded when a firm enters the lab. Schema: `/data/schema/firm.schema.json`.

```json
{
  "cik": "0000000000",
  "name": "string",
  "ticker": "string|null",
  "sector": "string",
  "status": "...",
  "reasons": ["string"],
  "as_of_filing": { "fiscal_year": 2024, "filed": "YYYY-MM-DD", "form": "10-K" },
  "years": [
    {
      "fy": 2024,
      "revenue_usd": 0,
      "ebit_usd": 0,
      "interest_expense_usd": 0,
      "total_debt_usd": 0,
      "total_assets_usd": 0,
      "equity_usd": 0,
      "icr": 0.5,
      "ebit_tag": "OperatingIncomeLoss",
      "revenue_tag": "Revenues",
      "debt_tags": ["LongTermDebtNoncurrent"]
    }
  ],
  "rescue_inputs": {
    "margin_mean": 0.03,
    "margin_change_mean": -0.003,
    "margin_change_sd": 0.018,
    "revenue_growth_median": 0.01,
    "history_years": 5,
    "used_sector_fallback": false
  }
}
```

In each `years` entry, every money field, `icr`, `ebit_tag` and `revenue_tag` is nullable. `debt_tags` is an empty array when no debt tag was used.

### XBRL tag priority

- Revenue: `Revenues`, then `RevenueFromContractWithCustomerExcludingAssessedTax`, then `SalesRevenueNet`.
- Total debt: `LongTermDebtNoncurrent` + `LongTermDebtCurrent` + `ShortTermBorrowings` (missing parts count as 0 only if at least one part exists); if none exist, `LongTermDebt`.
- Assets: `Assets`.
- Equity: `StockholdersEquity`.
- Record which tags were used (`ebit_tag`, `revenue_tag`, `debt_tags`).
- EBIT source and ICR rules: see `zombie-definition.md`.

### `rescue_inputs`

Computed by the pipeline from the firm's own history: margin = EBIT / revenue. If fewer than 4 years are usable, use the sector medians from `macro.json` and set `used_sector_fallback = true`.

## File 3: `/data/macro.json`

Schema: `/data/schema/macro.schema.json`.

```json
{
  "dgs10": { "value": 0.042, "date": "YYYY-MM-DD", "source": "FRED DGS10" },
  "sector_medians": {
    "<sector>": {
      "margin_mean": 0,
      "margin_change_mean": 0,
      "margin_change_sd": 0,
      "revenue_growth_median": 0
    }
  }
}
```

## File 4: `/data/keeper_log.json`

Schema: `/data/schema/keeper_log.schema.json`.

```json
{
  "entries": [
    {
      "date": "YYYY-MM-DD",
      "new_zombies": ["cik"],
      "revived": ["cik"],
      "filings_read": 0,
      "summary": "one short dry sentence"
    }
  ]
}
```

Newest first, max 60 entries.
