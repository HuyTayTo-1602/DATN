"""Unit tests for cv_parse_service — PDF bytes built in-memory with PyMuPDF."""

import io
import pytest
from unittest.mock import MagicMock, patch

import fitz  # PyMuPDF

from app.services.cv_parse_service import parse_pdf_bytes, parse_and_save
from app.models.cv_text import CVText


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _build_pdf_bytes(text: str) -> bytes:
    """Tạo PDF đơn trang với text cho sẵn."""
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((72, 72), text)
    buf = io.BytesIO()
    doc.save(buf)
    doc.close()
    return buf.getvalue()


def _invalid_pdf_bytes() -> bytes:
    return b"this is not a valid pdf"


# ---------------------------------------------------------------------------
# parse_pdf_bytes
# ---------------------------------------------------------------------------

def test_parse_pdf_bytes_extracts_text():
    pdf = _build_pdf_bytes("Xin chao the gioi")
    result = parse_pdf_bytes(pdf)
    assert "Xin chao" in result


def test_parse_pdf_bytes_multipage():
    doc = fitz.open()
    for i in range(3):
        page = doc.new_page()
        page.insert_text((72, 72), f"Trang {i + 1}")
    buf = io.BytesIO()
    doc.save(buf)
    doc.close()

    result = parse_pdf_bytes(buf.getvalue())
    for i in range(1, 4):
        assert f"Trang {i}" in result


def test_parse_pdf_bytes_raises_on_invalid():
    with pytest.raises(Exception):
        parse_pdf_bytes(_invalid_pdf_bytes())


# ---------------------------------------------------------------------------
# parse_and_save
# ---------------------------------------------------------------------------

def test_parse_and_save_success():
    pdf = _build_pdf_bytes("Nguyen Van A · Developer")
    db = MagicMock()

    cv_text_record = MagicMock(spec=CVText)
    db.query.return_value.filter.return_value.first.return_value = cv_text_record

    parse_and_save(cv_id=7, pdf_bytes=pdf, db=db)

    assert cv_text_record.parse_status == "success"
    assert "Nguyen Van A" in cv_text_record.extracted_text
    assert cv_text_record.parse_error is None
    assert cv_text_record.extracted_at is not None
    db.commit.assert_called_once()


def test_parse_and_save_failed_bad_pdf():
    db = MagicMock()
    cv_text_record = MagicMock(spec=CVText)
    db.query.return_value.filter.return_value.first.return_value = cv_text_record

    parse_and_save(cv_id=8, pdf_bytes=_invalid_pdf_bytes(), db=db)

    assert cv_text_record.parse_status == "failed"
    assert cv_text_record.parse_error is not None
    db.commit.assert_called_once()


def test_parse_and_save_creates_cv_text_if_missing():
    pdf = _build_pdf_bytes("Hello")
    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = None  # record not found

    added_objects = []
    db.add.side_effect = lambda obj: added_objects.append(obj)

    parse_and_save(cv_id=9, pdf_bytes=pdf, db=db)

    assert any(isinstance(o, CVText) for o in added_objects)
    db.commit.assert_called_once()
