from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, TIMESTAMP, BigInteger
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.database import Base


class CandidateCV(Base):
    __tablename__ = "candidate_cvs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    file_name = Column(String(255), nullable=False)
    object_key = Column(String(500), nullable=False)
    bucket_name = Column(String(255), nullable=False)
    mime_type = Column(String(100), nullable=False, default="application/pdf")
    file_size = Column(BigInteger, nullable=False)
    is_active = Column(Boolean, nullable=False, default=False)
    uploaded_at = Column(TIMESTAMP, server_default=func.now())

    user = relationship("User", back_populates="cvs")
    cv_text = relationship("CVText", back_populates="cv", uselist=False)
