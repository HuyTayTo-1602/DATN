"""
Unit tests for app.chatbot.services.pdf_service.

All HTTP calls are mocked — no real network access required.
"""

import io
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.chatbot.services.pdf_service import (
    extract_text_from_url,
    clear_cache,
    cache_size,
    _url_hash,
    _cache,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_minimal_pdf_bytes() -> bytes:
    """Create a minimal blank PDF in memory using pypdf."""
    from pypdf import PdfWriter

    writer = PdfWriter()
    writer.add_blank_page(width=612, height=792)
    buf = io.BytesIO()
    writer.write(buf)
    return buf.getvalue()


def _make_mock_http_client(content: bytes):
    """Return a mock httpx.AsyncClient context-manager that yields `content`."""
    mock_response = MagicMock()
    mock_response.content = content
    mock_response.raise_for_status = MagicMock()

    mock_client = AsyncMock()
    mock_client.get = AsyncMock(return_value=mock_response)
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)
    return mock_client


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture(autouse=True)
def isolate_cache():
    """Clear the PDF cache before and after every test."""
    clear_cache()
    yield
    clear_cache()


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_extract_returns_string_for_valid_pdf():
    """A valid PDF URL should return a (possibly empty) string."""
    pdf_bytes = _make_minimal_pdf_bytes()

    with patch(
        "app.chatbot.services.pdf_service.httpx.AsyncClient",
        return_value=_make_mock_http_client(pdf_bytes),
    ):
        result = await extract_text_from_url("http://example.com/cv.pdf")

    assert isinstance(result, str)


@pytest.mark.asyncio
async def test_result_is_cached_after_first_call():
    """Second call with the same URL must not trigger another HTTP request."""
    pdf_bytes = _make_minimal_pdf_bytes()
    url = "http://example.com/cv.pdf"

    with patch(
        "app.chatbot.services.pdf_service.httpx.AsyncClient",
        return_value=_make_mock_http_client(pdf_bytes),
    ) as mock_cls:
        await extract_text_from_url(url)
        await extract_text_from_url(url)  # second call
        assert mock_cls.call_count == 1, "HTTP client should be created only once"

    assert cache_size() == 1


@pytest.mark.asyncio
async def test_cache_hit_returns_stored_text():
    """Pre-seeding the cache should bypass download entirely."""
    url = "http://example.com/cv.pdf"
    _cache[_url_hash(url)] = "pre-cached CV text"

    with patch("app.chatbot.services.pdf_service.httpx.AsyncClient") as mock_cls:
        result = await extract_text_from_url(url)
        mock_cls.assert_not_called()

    assert result == "pre-cached CV text"


@pytest.mark.asyncio
async def test_returns_empty_string_on_http_error():
    """Network failure must not raise — returns empty string and caches it."""
    url = "http://unreachable.invalid/cv.pdf"
    failing_client = AsyncMock()
    failing_client.get = AsyncMock(side_effect=Exception("connection refused"))
    failing_client.__aenter__ = AsyncMock(return_value=failing_client)
    failing_client.__aexit__ = AsyncMock(return_value=None)

    with patch(
        "app.chatbot.services.pdf_service.httpx.AsyncClient",
        return_value=failing_client,
    ):
        result = await extract_text_from_url(url)

    assert result == ""
    # Error result is also cached to avoid hammering a bad URL
    assert _url_hash(url) in _cache


@pytest.mark.asyncio
async def test_returns_empty_string_on_non_pdf_content():
    """Non-PDF bytes (e.g. HTML error page) must not raise."""
    with patch(
        "app.chatbot.services.pdf_service.httpx.AsyncClient",
        return_value=_make_mock_http_client(b"<html>404 Not Found</html>"),
    ):
        result = await extract_text_from_url("http://example.com/not-a-pdf")

    assert result == ""


@pytest.mark.asyncio
async def test_different_urls_are_cached_separately():
    """Two different URLs must produce independent cache entries."""
    pdf_bytes = _make_minimal_pdf_bytes()
    url1 = "http://example.com/cv1.pdf"
    url2 = "http://example.com/cv2.pdf"
    _cache[_url_hash(url1)] = "text one"
    _cache[_url_hash(url2)] = "text two"

    r1 = await extract_text_from_url(url1)
    r2 = await extract_text_from_url(url2)

    assert r1 == "text one"
    assert r2 == "text two"
    assert r1 != r2


def test_clear_cache_empties_store():
    _cache["key"] = "value"
    assert cache_size() == 1
    clear_cache()
    assert cache_size() == 0
