"""Example tests for config, run report and the offline socket guard."""
from __future__ import annotations

import json
import socket

import pytest

from pipeline.config import PROTECTED_DIRS, REDACTED, REPO_ROOT, is_protected, resolve_out_dir
from pipeline.run_report import RunReport
from pipeline.tests.conftest import BlockedNetworkError


@pytest.mark.parametrize("d", PROTECTED_DIRS)
def test_is_protected_dir_itself(d):
    assert is_protected(d)


@pytest.mark.parametrize("d", PROTECTED_DIRS)
def test_is_protected_child(d):
    assert is_protected(d / "child" / "x.json")


@pytest.mark.parametrize("d", PROTECTED_DIRS)
def test_is_protected_symlink_into_protected(d, tmp_path):
    link = tmp_path / "link"
    try:
        link.symlink_to(d, target_is_directory=True)
    except OSError:
        pytest.skip("symlinks not supported")
    assert is_protected(link)
    assert is_protected(link / "child.json")


def test_is_protected_false_for_other_paths(tmp_path):
    assert not is_protected(tmp_path / "out")
    assert not is_protected(REPO_ROOT / "data")
    assert not is_protected(REPO_ROOT / "data" / "mock_other")


def test_resolve_out_dir_relative_to_repo_root():
    assert resolve_out_dir("data") == (REPO_ROOT / "data").resolve()
    assert resolve_out_dir("a/../b") == (REPO_ROOT / "b").resolve()


def test_resolve_out_dir_absolute_unchanged(tmp_path):
    assert resolve_out_dir(str(tmp_path)) == tmp_path.resolve()


def test_failure_pct_zero_attempted():
    r = RunReport()
    assert r.failure_pct == 0.0
    r.add_failed("0000000001", "u", "x")
    assert r.failure_pct == 0.0


def test_failure_pct_counts_distinct_firms():
    r = RunReport(attempted_firms=4)
    r.add_failed("0000000001", "u1", "x")
    r.add_failed("0000000001", "u2", "y")
    assert r.failure_pct == 25.0


def test_run_report_has_no_secrets_and_redacts_api_key():
    secret_key = "abcd1234secretkey"
    email = "me@private.example"
    r = RunReport(attempted_firms=1)
    r.argv = ["run", "--email", email]
    r.add_failed(
        "0000000001",
        f"https://api.stlouisfed.org/fred/series?series_id=DGS10&api_key={secret_key}&x=1",
        f"error for {email}",
    )
    r.failure = {"requirement": "7.1", "message": f"key {secret_key} rejected"}
    text = r.to_json([secret_key, email])
    assert secret_key not in text
    assert email not in text
    assert f"api_key={REDACTED}" in text
    json.loads(text)


def test_run_report_redacts_api_key_param_without_known_secret():
    r = RunReport()
    r.add_failed("0000000001", "https://x/y?api_key=unknownvalue&z=2", "bad")
    text = r.to_json([])
    assert "unknownvalue" not in text
    assert f"api_key={REDACTED}&z=2" in text


def test_socket_guard_blocks_external_host_and_names_it():
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        with pytest.raises(BlockedNetworkError, match=r"example\.com"):
            s.connect(("example.com", 443))
    finally:
        s.close()
    with pytest.raises(BlockedNetworkError, match=r"example\.com"):
        socket.create_connection(("example.com", 443), timeout=1)


def test_socket_guard_allows_localhost():
    srv = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    srv.bind(("127.0.0.1", 0))
    srv.listen(1)
    port = srv.getsockname()[1]
    try:
        c = socket.create_connection(("localhost", port), timeout=2)
        c.close()
    finally:
        srv.close()
