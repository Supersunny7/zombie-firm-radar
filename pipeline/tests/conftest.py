"""Shared test setup: offline guard, FakeSession, tmp Config, hypothesis profile, tree-hash check."""

from __future__ import annotations

import hashlib
import json
import socket
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import pytest
from hypothesis import settings

from pipeline.config import PROTECTED_DIRS, REPO_ROOT, Config

FIXTURE_DIR = Path(__file__).resolve().parent / "fixtures"
URLS_JSON = FIXTURE_DIR / "urls.json"

settings.register_profile("pipeline", max_examples=200, deadline=None)
settings.load_profile("pipeline")


# --- offline guard -----------------------------------------------------------


class BlockedNetworkError(RuntimeError):
    """Raised when a test tries to reach a non-local host."""


_LOCAL_HOSTS = frozenset({"127.0.0.1", "::1", "localhost"})

_real_connect = socket.socket.connect
_real_connect_ex = socket.socket.connect_ex
_real_create_connection = socket.create_connection


def _host_of(address: Any) -> str | None:
    """Host of an address argument; None for non-network addresses (e.g. AF_UNIX paths)."""
    if isinstance(address, (str, bytes)):
        return None
    if isinstance(address, tuple) and address:
        host = address[0]
        if isinstance(host, bytes):
            host = host.decode("ascii", "replace")
        return str(host)
    return None


def check_host(address: Any) -> None:
    host = _host_of(address)
    if host is None or host.lower() in _LOCAL_HOSTS:
        return
    raise BlockedNetworkError(f"blocked network access to {host}")


def _guarded_connect(self: socket.socket, address: Any) -> Any:
    check_host(address)
    return _real_connect(self, address)


def _guarded_connect_ex(self: socket.socket, address: Any) -> Any:
    check_host(address)
    return _real_connect_ex(self, address)


def _guarded_create_connection(address: Any, *args: Any, **kwargs: Any) -> Any:
    check_host(address)
    return _real_create_connection(address, *args, **kwargs)


@pytest.fixture(autouse=True, scope="session")
def _network_guard():
    mp = pytest.MonkeyPatch()
    mp.setattr(socket.socket, "connect", _guarded_connect)
    mp.setattr(socket.socket, "connect_ex", _guarded_connect_ex)
    mp.setattr(socket, "create_connection", _guarded_create_connection)
    try:
        yield
    finally:
        mp.undo()


# --- FakeSession -------------------------------------------------------------


class FakeResponse:
    def __init__(self, status_code: int, headers: dict[str, str], content: bytes, url: str) -> None:
        self.status_code = status_code
        self.headers = headers
        self.content = content
        self.url = url

    @property
    def text(self) -> str:
        return self.content.decode("utf-8", "replace")

    @property
    def ok(self) -> bool:
        return self.status_code < 400

    def json(self) -> Any:
        return json.loads(self.content)


class FakeSession:
    """Offline stand-in for requests.Session.

    Lookup order: per-test override, then `bodies` (in-memory dict url -> body), then
    fixtures/urls.json (url -> file path relative to the fixtures folder).
    Any other URL raises AssertionError("unrecorded URL ...").
    """

    def __init__(
        self,
        bodies: dict[str, bytes | str | dict | list] | None = None,
        urls_json: Path | None = URLS_JSON,
    ) -> None:
        self.bodies: dict[str, bytes | str | dict | list] = dict(bodies or {})
        self.overrides: dict[str, dict[str, Any]] = {}
        self.requests: list[dict[str, Any]] = []
        self._recorded: dict[str, str] = {}
        if urls_json is not None and Path(urls_json).is_file():
            self._recorded = json.loads(Path(urls_json).read_text(encoding="utf-8"))

    def set_body(self, url: str, body: bytes | str | dict | list) -> None:
        self.bodies[url] = body

    def override(
        self,
        url: str,
        *,
        status: int | None = None,
        headers: dict[str, str] | None = None,
        body: bytes | str | dict | list | None = None,
    ) -> None:
        """Per-test override; unspecified parts fall back to the recorded or in-memory value."""
        self.overrides.setdefault(url, {}).update(
            {
                k: v
                for k, v in (("status", status), ("headers", headers), ("body", body))
                if v is not None
            }
        )

    @staticmethod
    def _to_bytes(body: bytes | str | dict | list) -> bytes:
        if isinstance(body, bytes):
            return body
        if isinstance(body, str):
            return body.encode("utf-8")
        return json.dumps(body).encode("utf-8")

    def _base_body(self, url: str) -> bytes | None:
        if url in self.bodies:
            return self._to_bytes(self.bodies[url])
        if url in self._recorded:
            return (FIXTURE_DIR / self._recorded[url]).read_bytes()
        return None

    def get(self, url: str, headers: dict[str, str] | None = None, timeout: Any = None, **_: Any):
        self.requests.append({"url": url, "headers": dict(headers or {}), "timeout": timeout})
        ov = self.overrides.get(url)
        body = self._to_bytes(ov["body"]) if ov and "body" in ov else self._base_body(url)
        if body is None and not ov:
            raise AssertionError(f"unrecorded URL {url}")
        if body is None:
            body = b""
        status = ov.get("status", 200) if ov else 200
        resp_headers = dict(ov.get("headers", {})) if ov else {}
        return FakeResponse(status, resp_headers, body, url)


@pytest.fixture
def fake_session() -> FakeSession:
    return FakeSession()


# --- tmp Config --------------------------------------------------------------


@pytest.fixture
def tmp_config(tmp_path: Path) -> Config:
    out_dir = tmp_path / "out"
    cache_dir = tmp_path / "cache"
    reports_dir = tmp_path / "reports"
    for d in (out_dir, cache_dir, reports_dir):
        d.mkdir()
    return Config(
        out_dir=out_dir,
        cache_dir=cache_dir,
        reports_dir=reports_dir,
        schema_dir=REPO_ROOT / "data" / "schema",
        rate=5.0,
        contact_email="test@example.invalid",
        fred_api_key=None,
        run_start=datetime(2025, 6, 15, 12, 0, 0, tzinfo=UTC),
    )


# --- tree-hash check (17.4) --------------------------------------------------

_WATCHED: tuple[Path, ...] = (
    REPO_ROOT / "pipeline" / ".cache",
    REPO_ROOT / "data",
    *PROTECTED_DIRS,
)
_before: dict[str, str] = {}


def _hash_tree(root: Path) -> str:
    h = hashlib.sha256()
    if not root.exists():
        return "absent"
    for p in sorted(root.rglob("*")):
        rel = p.relative_to(root).as_posix()
        if p.is_file():
            h.update(b"F" + rel.encode() + b"\0")
            h.update(hashlib.sha256(p.read_bytes()).digest())
        else:
            h.update(b"D" + rel.encode() + b"\0")
    return h.hexdigest()


def _snapshot() -> dict[str, str]:
    return {str(p): _hash_tree(p) for p in _WATCHED}


def pytest_sessionstart(session: pytest.Session) -> None:
    _before.clear()
    _before.update(_snapshot())


def pytest_sessionfinish(session: pytest.Session, exitstatus: int) -> None:
    if not _before:
        return
    after = _snapshot()
    changed = [p for p, h in after.items() if _before.get(p) != h]
    if changed:
        print(
            "\nERROR: tests changed protected or default output folders: " + ", ".join(changed)
        )
        session.exitstatus = int(pytest.ExitCode.TESTS_FAILED)
