import hashlib
import io
from typing import Optional

import httpx
from pypdf import PdfReader

# In-memory cache: url_hash -> extracted text
# Survives for the lifetime of the process; replaced by Redis/disk in prod if needed.
_cache: dict[str, str] = {}


def _url_hash(url: str) -> str:
    return hashlib.md5(url.encode()).hexdigest()


async def extract_text_from_url(cv_url: str) -> str:
    """
    Download a PDF from cv_url and return its full text content.

    Caches results by URL hash so repeated calls for the same CV skip the download.
    Returns an empty string when the URL is unreachable or the file is not a valid PDF
    rather than raising — callers should treat empty string as "CV unavailable".
    """
    key = _url_hash(cv_url)
    if key in _cache:
        return _cache[key]

    try:
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            response = await client.get(cv_url)
            response.raise_for_status()
        pdf_bytes = io.BytesIO(response.content)
        reader = PdfReader(pdf_bytes)
        pages_text = [page.extract_text() or "" for page in reader.pages]
        text = "\n".join(pages_text).strip()
    except Exception:
        text = ""

    _cache[key] = text
    return text


def clear_cache() -> None:
    """Flush the in-memory PDF text cache. Useful in tests and admin tooling."""
    _cache.clear()


def cache_size() -> int:
    return len(_cache)
