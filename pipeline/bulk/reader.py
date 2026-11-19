"""Read a bulk zip one member at a time (Requirements 22.1 to 22.5).

Members are read in sorted name order, so rows written from them come out sorted by CIK
without being held in memory. A member that cannot be read is yielded as an error and the
iteration goes on. Nothing is extracted to disk.
"""
from __future__ import annotations

import re
import zipfile
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterator

CIK_MEMBER = re.compile(r"^CIK(\d{10})\.json$")
PAGE_MEMBER = re.compile(r"^CIK(\d{10})-submissions-(\d{3})\.json$")


@dataclass(frozen=True)
class Member:
    name: str
    kind: str  # "main" | "page"
    cik: str  # 10 digits
    data: bytes | None
    error: Exception | None = None


@dataclass
class MemberStats:
    """Counts for the Run_Report (22.4, 22.5, 27.3)."""

    total: int = 0  # file entries in the archive
    read: int = 0  # members handed to the caller with data
    ignored: int = 0  # names that match neither pattern
    failed: list[dict[str, str]] = field(default_factory=list)  # {"member", "error"}


def member_names(zf: zipfile.ZipFile) -> list[str]:
    """Sorted file names from the central directory. No member data is read."""
    return sorted({n for n in zf.namelist() if not n.endswith("/")})


def classify_member(name: str) -> tuple[str, str] | None:
    """("main", cik) or ("page", cik) for a recognised name, else None (22.5)."""
    m = CIK_MEMBER.match(name)
    if m:
        return "main", m.group(1)
    m = PAGE_MEMBER.match(name)
    if m:
        return "page", m.group(1)
    return None


def _read_member(zf: zipfile.ZipFile, name: str) -> bytes:
    with zf.open(name) as fh:
        return fh.read()


def iter_members(zip_path: Path, stats: MemberStats | None = None) -> Iterator[Member]:
    """Yield one Member at a time in sorted name order.

    The previous member is released before the next one is read (22.2). zipfile checks each
    member's CRC while reading, so a damaged member comes back with ``error`` set.
    """
    stats = stats if stats is not None else MemberStats()
    with zipfile.ZipFile(zip_path) as zf:
        for name in member_names(zf):
            stats.total += 1
            kind = classify_member(name)
            if kind is None:
                stats.ignored += 1
                continue
            try:
                # No local variable holds the bytes: only the Member does (22.2).
                member = Member(name=name, kind=kind[0], cik=kind[1], data=_read_member(zf, name))
                stats.read += 1
            except Exception as exc:  # noqa: BLE001 - any read failure is per-member (22.4)
                member = Member(name=name, kind=kind[0], cik=kind[1], data=None, error=exc)
                stats.failed.append({"member": name, "error": f"{type(exc).__name__}: {exc}"})
            yield member
            del member  # nothing of this member stays referenced while the next one is read
