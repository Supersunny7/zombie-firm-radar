"""Property tests for secret redaction.

Feature: data-pipeline, Property 16: Redaction removes every secret
**Validates: Requirements 16.7, 19.3, 19.5**
"""
from __future__ import annotations

from urllib.parse import parse_qsl, urlsplit

from hypothesis import given
from hypothesis import strategies as st

from pipeline.config import REDACTED
from pipeline.http import redact, redact_url

# Lowercase/digits only, so a secret can never be a substring of "[REDACTED]" or "api_key=".
_secret = st.text(alphabet="abcdefghijklmnopqrstuvwxyz0123456789@.", min_size=8, max_size=40)
_secrets = st.lists(_secret, min_size=1, max_size=4)
_filler = st.text(alphabet=" /:?&#=-_,.\"'()", max_size=12)
# "k9" prefix keeps the key from being a substring of the fixed URL text.
_key_value = st.text(alphabet="abcdefghijklmnopqrstuvwxyz0123456789", min_size=8, max_size=40).map(lambda s: "k9" + s)


@given(secrets=_secrets, parts=st.lists(_filler, min_size=1, max_size=5), data=st.data())
def test_redact_removes_every_secret(secrets: list[str], parts: list[str], data: st.DataObject) -> None:
    pieces: list[str] = []
    for part in parts:
        pieces.append(part)
        pieces.append(data.draw(st.sampled_from(secrets)))
    # Also embed every secret at least once, including inside an api_key URL.
    text = "".join(pieces) + " " + " ".join(secrets) + f" https://x.test/q?api_key={secrets[0]}&a=1"
    out = redact(text, secrets)
    for s in secrets:
        assert s not in out
    assert REDACTED in out


@given(key=_key_value, tail=st.sampled_from(["", "&series_id=DGS10", "#frag"]))
def test_redact_url_and_redact_remove_api_key_value(key: str, tail: str) -> None:
    url = f"https://api.stlouisfed.org/fred/series/observations?file_type=json&api_key={key}{tail}"
    cleaned = redact_url(url)
    assert key not in cleaned
    assert "api_key=" + REDACTED in cleaned
    assert key not in redact(url, [])
    assert key not in redact(f"GET {url} failed", [key])
    query = dict(parse_qsl(urlsplit(cleaned).query))
    assert query["api_key"] == REDACTED
