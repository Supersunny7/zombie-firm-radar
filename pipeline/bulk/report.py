"""Data shape report: sections 1 to 8 (Requirements 26.1 to 26.13).

Every section is a pure function from typed DataFrames to a ``Section`` (Markdown text plus
small CSV frames). Rows are sorted by their natural key and there is no timestamp outside the
source block, so the same tables always give the same bytes (26.13).
"""
from __future__ import annotations

import math
import os
import uuid
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path
from typing import Mapping, Sequence

import pandas as pd

from pipeline.bulk.download import BulkRecord, read_record, zip_path, COMPANYFACTS_URL, SUBMISSIONS_URL
from pipeline.bulk.panel import FIELDS, PANEL_YEARS
from pipeline.bulk.tables import read_table
from pipeline.config import BulkWriteError, MissingBulkFileError

ZOMBIE_YEARS = tuple(range(2017, 2026))
OUTCOME_YEARS = (2019, 2020)
OUTCOME_END = date(2024, 12, 31)
OUTCOME_CATEGORIES = (
    "bankruptcy", "delisted_or_deregistered", "stopped_filing", "recovered", "still_zombie", "other_alive",
)
HIST_LOW, HIST_HIGH, HIST_STEP = -10.0, 20.0, 0.5
THRESHOLDS_PP = (1, 2, 3, 4, 5)
LARGEST_N = 200
DISCLAIMER = "Data: SEC EDGAR. Not investment advice."


@dataclass
class Section:
    title: str
    md: str
    frames: dict[str, pd.DataFrame] = field(default_factory=dict)  # csv file name -> frame


@dataclass
class Tables:
    panel: pd.DataFrame
    firms: pd.DataFrame
    events: pd.DataFrame


# --- loading and typing -------------------------------------------------------------------
def _flag(col: pd.Series) -> pd.Series:
    return col.eq("true")


def load_tables(out_dir: Path) -> Tables:
    names = ("panel.csv.gz", "firms.csv.gz", "events.csv.gz")
    for n in names:
        if not (out_dir / n).is_file():
            raise MissingBulkFileError(f"{n} is not in {out_dir}; run `panel` first", "20.4")
    p = read_table(out_dir / names[0])
    panel = pd.DataFrame({"cik": p["cik"], "fy": p["fy"].astype(int), "fye": pd.to_datetime(p["fye"], errors="coerce")})
    panel["age_at_fy"] = pd.to_numeric(p["age_at_fy"], errors="coerce")
    for f in FIELDS:
        panel[f] = pd.to_numeric(p[f], errors="coerce")
    panel["icr"] = pd.to_numeric(p["icr"], errors="coerce")
    panel["zombie_flag"] = _flag(p["zombie_flag"])
    panel["gap_has_balance_sheet"] = _flag(p["gap_has_balance_sheet"])
    f = read_table(out_dir / names[1])
    firms = f[["cik", "name", "tickers", "sic_division"]].copy()
    for c in ("is_financial", "is_utility", "no_sic", "age_under_10", "parse_error"):
        firms[c] = _flag(f[c])
    e = read_table(out_dir / names[2])
    events = pd.DataFrame({
        "cik": e["cik"], "date": pd.to_datetime(e["date"], errors="coerce"),
        "event_type": e["event_type"], "form": e["form"], "accession": e["accession"],
    })
    return Tables(panel=panel, firms=firms.fillna({"name": "", "tickers": ""}), events=events)


def prepare(panel: pd.DataFrame, firms: pd.DataFrame) -> pd.DataFrame:
    """Panel rows joined with firm flags, plus ``present`` and ``core`` masks."""
    cols = ["cik", "name", "tickers", "sic_division", "is_financial", "is_utility", "age_under_10", "parse_error"]
    df = panel.merge(firms[cols], on="cik", how="left", validate="many_to_one")
    for c in ("is_financial", "is_utility"):
        df[c] = df[c].fillna(False).astype(bool)
    df["present"] = df[list(FIELDS)].notna().any(axis=1)
    df["core"] = ~df["is_financial"] & ~df["is_utility"] & (df["age_at_fy"] >= 10)
    return df.sort_values(["cik", "fy"], kind="mergesort").reset_index(drop=True)


# --- formatting helpers -------------------------------------------------------------------
def md_table(df: pd.DataFrame, fmt: Mapping[str, str] | None = None) -> str:
    fmt = fmt or {}
    if df.empty:
        return "_none_\n"
    head = "| " + " | ".join(df.columns) + " |\n| " + " | ".join("---" for _ in df.columns) + " |\n"
    lines = []
    for row in df.itertuples(index=False):
        cells = []
        for c, v in zip(df.columns, row):
            if v is None or (isinstance(v, float) and math.isnan(v)):
                cells.append("")
            elif c in fmt:
                cells.append(fmt[c].format(v))
            else:
                cells.append(str(v).replace("|", "\\|"))
        lines.append("| " + " | ".join(cells) + " |")
    return head + "\n".join(lines) + "\n"


def _share(num: int, den: int) -> float:
    return round(num / den, 6) if den else float("nan")


# --- sections 1, 2, 7 ---------------------------------------------------------------------
def s1_firm_counts(df: pd.DataFrame) -> Section:
    rows = []
    for fy in PANEL_YEARS:
        y = df[df["fy"] == fy]
        rows.append({"fy": fy, "firms_present": int(y["present"].sum()), "core_firms_present": int((y["present"] & y["core"]).sum())})
    t = pd.DataFrame(rows)
    md = (
        "A firm is *present* in a year when at least one money field is not null that year. "
        "*Core* means not financial, not utility, and age at that fiscal year of 10 or more.\n\n" + md_table(t)
    )
    return Section("1. Firms per fiscal year", md, {"s1_firm_counts.csv": t})


def s2_zombies(df: pd.DataFrame) -> Section:
    rows = []
    for fy in ZOMBIE_YEARS:
        y = df[(df["fy"] == fy) & df["core"] & df["present"]]
        z = int(y["zombie_flag"].sum())
        with_icr = int(y["icr"].notna().sum())
        rows.append({
            "fy": fy, "core_firms_present": len(y), "zombies": z, "share_of_present": _share(z, len(y)),
            "core_firms_with_icr": with_icr, "share_of_with_icr": _share(z, with_icr),
        })
    t = pd.DataFrame(rows)
    md = (
        "Zombie: age at the fiscal year of 10 or more and ICR below 1 in that year and the two before. "
        "FY2015 and FY2016 flags look back at FY2013 and FY2014, which are not in the panel. "
        "Shares are shown both over core firms present and over core firms with a computable ICR.\n\n"
        + md_table(t, {"share_of_present": "{:.2%}", "share_of_with_icr": "{:.2%}"})
    )
    return Section("2. Zombies per fiscal year, FY2017 to FY2025", md, {"s2_zombies.csv": t})


def s7_data_quality(df: pd.DataFrame) -> Section:
    rows = []
    nonfin = ~df["is_financial"] & ~df["is_utility"]
    for fy in PANEL_YEARS:
        y = df[df["fy"] == fy]
        for pop, mask, gap_mask in (("all", y["present"], pd.Series(True, index=y.index)), ("core", y["present"] & y["core"], nonfin[y.index])):
            r = y[mask]
            rows.append({
                "fy": fy, "population": pop, "rows_present": len(r),
                "missing_operating_income": int(r["operating_income"].isna().sum()),
                "missing_interest_expense": int(r["interest_expense"].isna().sum()),
                "missing_total_debt": int(r["total_debt"].isna().sum()),
                "fye_not_december": int((r["fye"].dt.month.ne(12) & r["fye"].notna()).sum()),
                "gap_rows_with_balance_sheet": int((y["gap_has_balance_sheet"] & gap_mask).sum()),
            })
    t = pd.DataFrame(rows)
    md = (
        "Counts are over present rows. `gap_rows_with_balance_sheet` counts years that have no usable income-statement "
        "value, so the panel row is empty, but the filing has a balance-sheet value for that year. For `core` it counts "
        "non-financial, non-utility firms (age at a gap year is unknown).\n\n" + md_table(t)
    )
    return Section("7. Data quality", md, {"s7_data_quality.csv": t})


# --- sections 3, 4, 5 ---------------------------------------------------------------------
def classify_outcome(
    zombie_end: date,
    events: Sequence[tuple[str, date]],
    last_fy_with_data: int | None,
    icr_2024: float | None,
    zombie_2024: bool,
    window_end: date = OUTCOME_END,
) -> str:
    """Exactly one category, by the first rule that matches (Requirement 26.6)."""
    window = [(t, d) for t, d in events if zombie_end < d <= window_end]
    types = {t for t, _ in window}
    if "bankruptcy" in types:
        return "bankruptcy"
    if types & {"delisting", "deregistration"}:
        return "delisted_or_deregistered"
    if last_fy_with_data is None or last_fy_with_data < 2024:
        return "stopped_filing"
    if icr_2024 is not None and not math.isnan(icr_2024) and icr_2024 >= 1:
        return "recovered"
    if zombie_2024:
        return "still_zombie"
    return "other_alive"


def _events_by_cik(events: pd.DataFrame) -> dict[str, list[tuple[str, date]]]:
    out: dict[str, list[tuple[str, date]]] = {}
    for r in events.dropna(subset=["date"]).itertuples(index=False):
        out.setdefault(r.cik, []).append((r.event_type, r.date.date()))
    return out


def s3_outcomes(df: pd.DataFrame, events: pd.DataFrame) -> Section:
    ev = _events_by_cik(events)
    last_fy = df[df["fye"].notna()].groupby("cik")["fy"].max().to_dict()
    y24 = df[df["fy"] == 2024].set_index("cik")
    icr24 = y24["icr"].to_dict()
    z24 = y24["zombie_flag"].to_dict()
    counts, lists, parts = [], [], []
    for zy in OUTCOME_YEARS:
        z = df[(df["fy"] == zy) & df["core"] & df["zombie_flag"] & df["fye"].notna()]
        got: dict[str, list[tuple[str, str, str, bool]]] = {c: [] for c in OUTCOME_CATEGORIES}
        for r in z.itertuples(index=False):
            events_of = ev.get(r.cik, [])
            end = r.fye.date()
            cat = classify_outcome(end, events_of, last_fy.get(r.cik), icr24.get(r.cik), bool(z24.get(r.cik, False)))
            filed_201 = any(t == "acquisition_disposition" and end < d <= OUTCOME_END for t, d in events_of)
            got[cat].append((r.cik, r.name or "", r.tickers or "", filed_201))
        for cat in OUTCOME_CATEGORIES:
            rows = sorted(got[cat])
            counts.append({"zombie_year": zy, "category": cat, "firms": len(rows), "filed_item_2_01": sum(1 for x in rows if x[3])})
            lists += [{"zombie_year": zy, "category": cat, "cik": c, "name": n, "tickers": t, "filed_item_2_01": f} for c, n, t, f in rows]
        parts.append((zy, len(z)))
    t = pd.DataFrame(counts)
    ids = pd.DataFrame(lists, columns=["zombie_year", "category", "cik", "name", "tickers", "filed_item_2_01"])
    md = (
        "For the zombies of FY2019 and of FY2020 (core firms), what happened up to 2024-12-31. Each firm is in exactly one "
        "category, by the first rule that matches: bankruptcy event (8-K item 1.03) after the zombie year; delisting or "
        "deregistration event (Form 25, 25-NSE, 15-12B, 15-12G, 15-15D); stopped filing (no fiscal year with data from FY2024 on); "
        "recovered (FY2024 ICR of 1 or more); still zombie (FY2024 flag); other alive.\n\n"
        "`filed_item_2_01` counts firms that filed an 8-K item 2.01 (completion of an acquisition or disposition) in that window. "
        "The firm that files item 2.01 is mostly the **acquirer** or the seller of assets, not the company that was bought, so this "
        "column is not an \"acquired\" count.\n\n"
        + "".join(f"Zombies in FY{zy}: {n}.\n\n" for zy, n in parts)
        + md_table(t)
        + "\nCIK lists: `s3_outcomes_cik.csv`.\n"
    )
    return Section("3. What happened to the zombies of FY2019 and FY2020", md, {"s3_outcomes.csv": t, "s3_outcomes_cik.csv": ids})


def s4_reversals(df: pd.DataFrame) -> Section:
    a = df[(df["fy"] == 2019) & df["core"] & (df["icr"] >= 1.5)][["cik", "name", "tickers", "icr"]].rename(columns={"icr": "icr_fy2019"})
    b = df[(df["fy"] == 2020) & (df["icr"] < 1)][["cik", "icr"]].rename(columns={"icr": "icr_fy2020"})
    t = a.merge(b, on="cik").sort_values("cik", kind="mergesort").reset_index(drop=True)
    md = (
        f"Core firms with ICR of 1.5 or more in FY2019 and below 1 in FY2020: **{len(t)}**. CIK list: `s4_reversals.csv`.\n"
    )
    return Section("4. Healthy in FY2019, below 1 in FY2020", md, {"s4_reversals.csv": t})


def s5_zombie_then_bankrupt(df: pd.DataFrame, events: pd.DataFrame) -> Section:
    z = df[df["core"] & df["zombie_flag"] & df["fy"].between(2019, 2021)]
    first = z.groupby("cik")["fy"].min().rename("first_zombie_year")
    b = events[(events["event_type"] == "bankruptcy") & (events["date"] >= "2022-01-01") & (events["date"] <= "2023-12-31")]
    bk = b.groupby("cik")["date"].min().dt.strftime("%Y-%m-%d").rename("first_bankruptcy_date")
    t = pd.concat([first, bk], axis=1, join="inner").reset_index().rename(columns={"index": "cik"})
    names = df.drop_duplicates("cik").set_index("cik")[["name", "tickers"]]
    t = t.merge(names, left_on="cik", right_index=True, how="left").sort_values("cik", kind="mergesort").reset_index(drop=True)
    t = t[["cik", "name", "tickers", "first_zombie_year", "first_bankruptcy_date"]] if len(t) else pd.DataFrame(
        columns=["cik", "name", "tickers", "first_zombie_year", "first_bankruptcy_date"])
    md = (
        f"Core firms flagged zombie in at least one of FY2019, FY2020, FY2021 with a bankruptcy event filed 2022-01-01 to "
        f"2023-12-31: **{len(t)}**. CIK list: `s5_zombie_then_bankrupt.csv`.\n"
    )
    return Section("5. Zombies of FY2019 to FY2021 with a bankruptcy in 2022 to 2023", md, {"s5_zombie_then_bankrupt.csv": t})


# --- section 6 ----------------------------------------------------------------------------
def breaking_rate_pp(ebit: float | None, interest: float | None, debt: float | None) -> float | None:
    """(EBIT - interest) / debt in percentage points: the rate rise at which interest equals EBIT.
    None unless EBIT is known, interest > 0 and debt > 0. This is not icr() (it divides by debt)."""
    for v in (ebit, interest, debt):
        if v is None or (isinstance(v, float) and not math.isfinite(v)):
            return None
    if interest <= 0 or debt <= 0:  # type: ignore[operator]
        return None
    return (ebit - interest) / debt * 100.0  # type: ignore[operator]


N_BUCKETS = int(round((HIST_HIGH - HIST_LOW) / HIST_STEP))


def bucket_index(x: float) -> int:
    """-1 for below the range, N_BUCKETS for at or above it, else the 0.5 pp bucket [lo, lo + 0.5)."""
    if x < HIST_LOW:
        return -1
    idx = math.floor(round((x - HIST_LOW) / HIST_STEP, 9))
    return N_BUCKETS if idx >= N_BUCKETS else idx


def histogram(values: Sequence[float]) -> list[tuple[str, float | None, float | None, int]]:
    """(label, low, high, count) for the underflow bucket, 60 regular buckets and the overflow bucket."""
    counts = [0] * (N_BUCKETS + 2)
    for x in values:
        counts[bucket_index(x) + 1] += 1
    out: list[tuple[str, float | None, float | None, int]] = [(f"< {HIST_LOW:g}", None, HIST_LOW, counts[0])]
    for i in range(N_BUCKETS):
        lo = HIST_LOW + i * HIST_STEP
        out.append((f"{lo:g} to {lo + HIST_STEP:g}", lo, lo + HIST_STEP, counts[i + 1]))
    out.append((f">= {HIST_HIGH:g}", HIST_HIGH, None, counts[-1]))
    return out


def count_below(values: Sequence[float], k: float) -> int:
    return sum(1 for x in values if x < k)


def _rates(rows: pd.DataFrame) -> list[float]:
    out = []
    for r in rows.itertuples(index=False):
        v = breaking_rate_pp(_n(r.operating_income), _n(r.interest_expense), _n(r.total_debt))
        if v is not None:
            out.append(v)
    return out


def _n(x: object) -> float | None:
    return None if x is None or (isinstance(x, float) and math.isnan(x)) else float(x)  # type: ignore[arg-type]


def s6_breaking_rate(df: pd.DataFrame) -> Section:
    core = df[df["core"] & df["present"]].copy()
    core["rate"] = [breaking_rate_pp(_n(a), _n(b), _n(c)) for a, b, c in zip(core["operating_income"], core["interest_expense"], core["total_debt"])]
    usable = core[core["rate"].notna()]
    latest = usable.sort_values(["cik", "fy"], kind="mergesort").groupby("cik").tail(1)
    fy24 = core[core["fy"] == 2024]
    views = {"latest_year": (latest["rate"].tolist(), core["cik"].nunique() - len(latest)),
             "fy2024": (fy24["rate"].dropna().tolist(), int(fy24["rate"].isna().sum()))}
    hist_rows, below_rows = [], []
    for view, (vals, left_out) in views.items():
        for label, lo, hi, n in histogram(vals):
            hist_rows.append({"view": view, "bucket": label, "low_pp": lo, "high_pp": hi, "firms": n})
        for k in THRESHOLDS_PP:
            below_rows.append({"view": view, "plus_pp": k, "firms_below": count_below(vals, k), "firms_total": len(vals), "firms_left_out": left_out})
    hist, below = pd.DataFrame(hist_rows), pd.DataFrame(below_rows)
    md = (
        "Breaking rate = (operating income - interest expense) / total debt, in percentage points: how far the rate on "
        "all debt can rise before interest equals operating income. Only years with interest above 0, debt above 0 and a known "
        "operating income have one. `latest_year` takes each core firm's latest such year; `fy2024` uses FY2024 only. "
        "\"Below +k pp\" counts firms whose breaking rate is under k, including firms already below 0.\n\n"
        + md_table(below)
        + "\nHistogram in 0.5 pp buckets (-10 to +20): `s6_histogram.csv`.\n"
    )
    return Section("6. Breaking rate", md, {"s6_histogram.csv": hist, "s6_thresholds.csv": below})


# --- section 8 ----------------------------------------------------------------------------
def s8_largest(df: pd.DataFrame) -> Section:
    r = df[df["revenue"].notna()].sort_values(["cik", "fy"], kind="mergesort")
    top = r.loc[r.groupby("cik")["revenue"].idxmax()][["cik", "name", "tickers", "sic_division", "revenue", "fy", "is_financial", "is_utility", "age_under_10"]]
    top = top.rename(columns={"revenue": "max_revenue_usd", "fy": "max_revenue_fy"})
    top = top.sort_values(["max_revenue_usd", "cik"], ascending=[False, True], kind="mergesort").head(LARGEST_N).reset_index(drop=True)
    hist = {
        cik: "".join("1" if bool(z) else "0" for z in g.sort_values("fy")["zombie_flag"])
        for cik, g in df[df["fy"].isin(ZOMBIE_YEARS)].groupby("cik")
    }
    top["zombie_fy2017_2025"] = top["cik"].map(hist)
    top.insert(0, "rank", range(1, len(top) + 1))
    md = (
        "The 200 firms with the highest annual revenue in any year FY2015 to FY2025, over all firms (banks and utilities are "
        "included and flagged). `zombie_fy2017_2025` has one character per year, FY2017 first: 1 is a zombie flag, 0 is not.\n\n"
        + md_table(top.drop(columns=["sic_division"]), {"max_revenue_usd": "{:,.0f}"})
    )
    return Section("8. The 200 largest firms by revenue", md, {"s8_largest_firms.csv": top})


# --- rendering and writing ----------------------------------------------------------------
@dataclass(frozen=True)
class SourceInfo:
    run_date: str
    companyfacts: BulkRecord | None
    submissions: BulkRecord | None


def _source_block(info: SourceInfo) -> str:
    def line(name: str, r: BulkRecord | None) -> str:
        if r is None:
            return f"- `{name}`: unknown, no download record\n"
        return (
            f"- `{name}`: downloaded {r.downloaded_at}, {r.size_bytes:,} bytes, SHA-256 `{r.sha256}`, "
            f"Last-Modified {r.last_modified or 'not given'}\n"
        )
    return (
        f"Run date: {info.run_date}\n\n" + line("companyfacts.zip", info.companyfacts) + line("submissions.zip", info.submissions)
    )


def render_markdown(sections: Sequence[Section], info: SourceInfo) -> str:
    head = (
        "# Data shape report\n\n"
        f"{DISCLAIMER}\n\n"
        "## Source\n\n" + _source_block(info) + "\n"
        "## Definitions\n\n"
        "- **Present row**: a firm-year with at least one non-null money field.\n"
        "- **Core**: not financial (SIC 6000-6799), not utility (SIC 4900-4999), and age at that fiscal year of 10 or more. "
        "Age is whole years from the firm's first EDGAR filing to the fiscal year end. This is an approximation of firm age.\n"
        "- **Zombie flag**: age at the year of 10 or more and ICR below 1 in that year and the two years before; any missing ICR gives no flag.\n"
        "- **ICR**: operating income / interest expense, from the shared `icr()` function. Missing values stay missing, never 0.\n"
        "- FY2025 is incomplete for many firms. Fiscal years follow the period end date (end month January to May belongs to the prior year).\n\n"
    )
    return head + "".join(f"## {s.title}\n\n{s.md}\n" for s in sections)


def build_sections(t: Tables) -> list[Section]:
    df = prepare(t.panel, t.firms)
    return [
        s1_firm_counts(df), s2_zombies(df), s3_outcomes(df, t.events), s4_reversals(df),
        s5_zombie_then_bankrupt(df, t.events), s6_breaking_rate(df), s7_data_quality(df), s8_largest(df),
    ]


def _atomic_write(path: Path, data: bytes) -> None:
    tmp = path.with_name(f".{path.name}.{uuid.uuid4().hex}.tmp")
    try:
        tmp.write_bytes(data)
        os.replace(tmp, path)
    except OSError as exc:
        tmp.unlink(missing_ok=True)
        raise BulkWriteError(f"cannot write {path.name}: {exc}", "20.5") from exc


def csv_bytes(frame: pd.DataFrame) -> bytes:
    return frame.to_csv(index=False, lineterminator="\n").encode("utf-8")


def write_report(sections: Sequence[Section], info: SourceInfo, reports_dir: Path) -> list[str]:
    reports_dir.mkdir(parents=True, exist_ok=True)
    written = []
    for s in sections:
        for name, frame in sorted(s.frames.items()):
            _atomic_write(reports_dir / name, csv_bytes(frame))
            written.append(name)
    _atomic_write(reports_dir / "data_shape.md", render_markdown(sections, info).encode("utf-8"))
    return sorted(written) + ["data_shape.md"]


def source_info(zip_dir: Path, run_date: str) -> SourceInfo:
    def rec(url: str) -> BulkRecord | None:
        p = zip_path(zip_dir, url)
        return read_record(p) if p.is_file() else None
    return SourceInfo(run_date, rec(COMPANYFACTS_URL), rec(SUBMISSIONS_URL))


def run(out_dir: Path, zip_dir: Path, reports_dir: Path, run_date: str) -> list[str]:
    """Load the three tables from ``out_dir`` and write the report into ``reports_dir``.
    Raises MissingBulkFileError when a table is missing. Returns the file names written."""
    tables = load_tables(out_dir)
    return write_report(build_sections(tables), source_info(zip_dir, run_date), reports_dir)
