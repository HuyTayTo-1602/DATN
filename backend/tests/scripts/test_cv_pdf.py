"""
Sprint 4 — Unit tests cho render_cv_pdf().

- PDF trả bytes bắt đầu bằng %PDF, size > 0.
- Đọc lại bằng PyMuPDF (fitz) → text chứa tên ứng viên (CV ↔ hồ sơ khớp).

Run: cd backend && pytest tests/scripts/test_cv_pdf.py -v
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from scripts.seed.seed_utils import render_cv_pdf, generate_cv_text, pick_skills, load_json


def _make_cv(name="Nguyễn Văn Khôi", domain="backend", level="Senior"):
    catalog = load_json("skills_catalog.json")
    skills = pick_skills(domain, catalog, 6)
    text = generate_cv_text(name, "khoi@example.com", "0901234567", domain, skills, level)
    return name, skills, text


def test_render_returns_pdf_bytes():
    _, _, text = _make_cv()
    pdf = render_cv_pdf(text)
    assert isinstance(pdf, (bytes, bytearray))
    assert bytes(pdf[:5]) == b"%PDF-"
    assert len(pdf) > 1000


def test_pdf_text_contains_candidate_name():
    import fitz  # PyMuPDF
    name, skills, text = _make_cv(name="Trần Thị Bích Ngọc")
    pdf = render_cv_pdf(text)
    doc = fitz.open(stream=bytes(pdf), filetype="pdf")
    try:
        extracted = "".join(page.get_text() for page in doc)
    finally:
        doc.close()
    assert name in extracted, "Tên ứng viên không xuất hiện trong PDF"
    # ít nhất 1 kỹ năng cũng phải có trong PDF
    assert any(s in extracted for s in skills), "Không kỹ năng nào xuất hiện trong PDF"


def test_pdf_renders_all_domains():
    for domain in ["backend", "frontend", "data", "healthcare", "finance", "marketing"]:
        _, _, text = _make_cv(name="Lê Văn Test", domain=domain, level="Mid")
        pdf = render_cv_pdf(text)
        assert bytes(pdf[:5]) == b"%PDF-", f"Render lỗi cho domain {domain}"
