"""Static checks for Phase 1 (Requirements 8.1, 19.1, 29.1, 29.3, 29.5, 29.6)."""
from __future__ import annotations

import re
from pathlib import Path

from pipeline.config import REPO_ROOT

PIPELINE = REPO_ROOT / "pipeline"
BULK = PIPELINE / "bulk"


def _sources(root: Path) -> dict[Path, str]:
    return {p: p.read_text(encoding="utf-8") for p in sorted(root.rglob("*.py"))}


def _library_sources() -> dict[Path, str]:
    """pipeline/*.py and pipeline/bulk/*.py: not tests, not scripts."""
    out = {}
    for p, text in _sources(PIPELINE).items():
        rel = p.relative_to(PIPELINE).parts
        if rel[0] in ("tests", "scripts", "__pycache__"):
            continue
        out[p] = text
    return out


def test_gitignore_has_cache_and_out_but_not_reports() -> None:
    lines = {ln.strip() for ln in (REPO_ROOT / ".gitignore").read_text(encoding="utf-8").splitlines()}
    assert "pipeline/.cache/" in lines and "pipeline/out/" in lines
    assert "pipeline/reports/" not in lines and "pipeline/reports" not in lines


def test_ebit_over_interest_appears_only_in_metrics() -> None:
    pattern = re.compile(r"\bebit(_usd)?\s*/\s*interest")
    hits = [p.relative_to(PIPELINE).as_posix() for p, text in _library_sources().items() if pattern.search(text)]
    assert hits == ["metrics.py"]


def test_icr_and_extract_are_each_defined_once() -> None:
    for name, home in (("icr", "metrics.py"), ("extract", "facts.py")):
        defs = [p.relative_to(PIPELINE).as_posix() for p, text in _library_sources().items() if re.search(rf"^def {name}\(", text, re.M)]
        assert defs == [home]


def test_bulk_code_imports_no_frontend_and_requests_only_in_download() -> None:
    for p, text in _sources(BULK).items():
        assert not re.search(r"^\s*(import|from)\s+(react|three)\b", text, re.M), p
        if p.name != "download.py":
            assert not re.search(r"^\s*(import|from)\s+requests\b", text, re.M), p


def test_bulk_code_never_writes_under_data_or_web() -> None:
    """Only cli.py names those folders, and only as a refusal list."""
    for p, text in _sources(BULK).items():
        if p.name == "cli.py":
            assert text.count('REPO_ROOT / "data"') == 1 and text.count('REPO_ROOT / "web"') == 1
            continue
        assert 'REPO_ROOT / "data"' not in text and 'REPO_ROOT / "web"' not in text, p
        assert not re.search(r'["\'](data|web)/', text), p


def test_requirements_txt_is_unchanged_five_exact_pins() -> None:
    lines = [ln.strip() for ln in (PIPELINE / "requirements.txt").read_text(encoding="utf-8").splitlines() if ln.strip()]
    assert all(re.fullmatch(r"[A-Za-z0-9_.-]+==[0-9][^ ]*", ln) for ln in lines)
    assert sorted(ln.split("==")[0] for ln in lines) == ["hypothesis", "jsonschema", "pandas", "pytest", "requests"]
    assert not any(c in " ".join(lines) for c in (">=", "~=", "<", "*"))


def test_bulk_modules_stay_in_the_package_and_phase2_modules_are_untouched() -> None:
    assert sorted(p.name for p in BULK.glob("*.py")) == [
        "__init__.py", "__main__.py", "census.py", "cli.py", "download.py", "panel.py", "reader.py", "report.py", "submissions.py", "tables.py",
    ]
