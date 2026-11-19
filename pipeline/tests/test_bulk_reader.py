"""Streaming zip reader (Requirements 22.1 to 22.6, 28.7)."""
from __future__ import annotations

import gc
import zipfile
from pathlib import Path

from pipeline.bulk import reader
from pipeline.bulk.reader import MemberStats, classify_member, iter_members, member_names
from pipeline.tests.builders import make_zip


def _zip_file(tmp_path: Path, members: dict) -> Path:
    path = tmp_path / "x.zip"
    path.write_bytes(make_zip(members))
    return path


def test_members_come_back_in_sorted_order_whatever_the_zip_order(tmp_path: Path) -> None:
    path = _zip_file(tmp_path, {
        "CIK0000000003.json": {"n": 3},
        "CIK0000000001-submissions-001.json": {"n": 11},
        "CIK0000000001.json": {"n": 1},
        "CIK0000000002.json": {"n": 2},
    })
    got = [(m.name, m.kind, m.cik) for m in iter_members(path)]
    assert [g[0] for g in got] == sorted(g[0] for g in got)
    assert ("CIK0000000001-submissions-001.json", "page", "0000000001") in got
    assert ("CIK0000000001.json", "main", "0000000001") in got
    assert len(got) == 4


def test_names_matching_neither_pattern_are_ignored_and_counted(tmp_path: Path) -> None:
    path = _zip_file(tmp_path, {
        "CIK0000000001.json": {"n": 1},
        "readme.txt": "x",
        "CIK123.json": {"n": 2},
        "CIK0000000002-submissions-1.json": {"n": 3},
        "sub/CIK0000000004.json": {"n": 4},
    })
    stats = MemberStats()
    names = [m.name for m in iter_members(path, stats)]
    assert names == ["CIK0000000001.json"]
    assert stats.total == 5 and stats.read == 1 and stats.ignored == 4 and stats.failed == []


def test_classify_member() -> None:
    assert classify_member("CIK0000320193.json") == ("main", "0000320193")
    assert classify_member("CIK0000320193-submissions-002.json") == ("page", "0000320193")
    for bad in ("CIK0000320193.JSON", "CIK0000320193-submissions-0001.json", "x/CIK0000320193.json", ""):
        assert classify_member(bad) is None


def test_member_names_reads_only_the_directory(tmp_path: Path) -> None:
    path = _zip_file(tmp_path, {"b.json": {}, "a.json": {}})
    with zipfile.ZipFile(path) as zf:
        assert member_names(zf) == ["a.json", "b.json"]


def test_a_corrupt_member_is_yielded_as_an_error_and_the_next_is_still_read(tmp_path: Path) -> None:
    path = _zip_file(tmp_path, {"CIK0000000001.json": {"ok": True}, "CIK0000000002.json": {"ok": True}, "CIK0000000003.json": {"ok": True}})
    raw = bytearray(path.read_bytes())
    # Damage the stored bytes of the second member (its deflated data), not the central directory.
    with zipfile.ZipFile(path) as zf:
        info = zf.getinfo("CIK0000000002.json")
    start = info.header_offset + 30 + len(info.filename.encode()) + len(info.extra)
    for i in range(start, start + info.compress_size):
        raw[i] ^= 0xFF
    path.write_bytes(bytes(raw))
    stats = MemberStats()
    got = list(iter_members(path, stats))
    assert [m.name for m in got] == ["CIK0000000001.json", "CIK0000000002.json", "CIK0000000003.json"]
    assert got[1].data is None and got[1].error is not None
    assert got[0].data is not None and got[2].data is not None
    assert stats.read == 2 and [f["member"] for f in stats.failed] == ["CIK0000000002.json"]


class _Tracked(bytes):
    """bytes that count how many instances are alive at once."""
    alive = 0
    peak = 0

    def __new__(cls, value: bytes):
        obj = super().__new__(cls, value)
        cls.alive += 1
        cls.peak = max(cls.peak, cls.alive)
        return obj

    def __del__(self) -> None:  # bytes cannot be weakly referenced, so count on deletion
        type(self).alive -= 1


def test_only_one_member_is_alive_at_once(tmp_path: Path, monkeypatch) -> None:
    """22.6: an instrumented reader on a tiny in-memory-built zip."""
    members = {f"CIK{i:010d}.json": {"n": i} for i in range(1, 8)}
    path = _zip_file(tmp_path, members)
    real = reader._read_member
    _Tracked.alive = 0
    _Tracked.peak = 0
    monkeypatch.setattr(reader, "_read_member", lambda zf, name: _Tracked(real(zf, name)))
    seen = 0
    for member in iter_members(path):
        seen += 1
        assert member.data is not None
        del member  # the consumer keeps nothing either
        gc.collect()
    assert seen == 7
    assert _Tracked.peak == 1
    assert _Tracked.alive == 0


def test_the_archive_is_never_extracted_to_disk(tmp_path: Path) -> None:
    path = _zip_file(tmp_path, {"CIK0000000001.json": {"n": 1}})
    before = sorted(p.name for p in tmp_path.iterdir())
    list(iter_members(path))
    assert sorted(p.name for p in tmp_path.iterdir()) == before
