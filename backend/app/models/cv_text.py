from sqlalchemy import Column, Integer, String, Text, ForeignKey, TIMESTAMP
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import TSVECTOR

from app.db.database import Base


class CVText(Base):
    __tablename__ = "cv_text"

    id = Column(Integer, primary_key=True, index=True)
    cv_id = Column(Integer, ForeignKey("candidate_cvs.id"), nullable=False, unique=True)
    extracted_text = Column(Text, nullable=True)
    parse_status = Column(String(20), nullable=False, default="pending")  # pending | success | failed
    parse_error = Column(Text, nullable=True)
    extracted_at = Column(TIMESTAMP, nullable=True)
    # Full-text search vector: built from extracted_text
    search_vector = Column(TSVECTOR, nullable=True)

    cv = relationship("CandidateCV", back_populates="cv_text")
