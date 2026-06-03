from datetime import datetime, timezone

import fitz  # PyMuPDF

from sqlalchemy.orm import Session

from app.models.cv_text import CVText


def parse_pdf_bytes(pdf_bytes: bytes) -> str:
    """Mở PDF từ bytes, đọc text từng trang, trả về chuỗi nối."""
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    pages_text = [page.get_text() for page in doc]
    doc.close()
    return "\n".join(pages_text).strip()


def parse_and_save(cv_id: int, pdf_bytes: bytes, db: Session) -> None:
    """Parse PDF và cập nhật bản ghi CVText. Upload vẫn thành công nếu parse lỗi."""
    cv_text = db.query(CVText).filter(CVText.cv_id == cv_id).first()
    if not cv_text:
        cv_text = CVText(cv_id=cv_id, parse_status="pending")
        db.add(cv_text)

    try:
        extracted = parse_pdf_bytes(pdf_bytes)
        cv_text.extracted_text = extracted
        cv_text.parse_status = "success"
        cv_text.parse_error = None
    except Exception as exc:
        cv_text.parse_status = "failed"
        cv_text.parse_error = str(exc)

    cv_text.extracted_at = datetime.now(timezone.utc)
    db.commit()
