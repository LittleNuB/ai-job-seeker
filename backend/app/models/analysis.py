import uuid
from datetime import datetime

from sqlalchemy import String, Text, Integer, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base


class AnalysisRecord(Base):
    __tablename__ = "analysis_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"))
    type: Mapped[str] = mapped_column(String(20), nullable=False)
    input_text: Mapped[str | None] = mapped_column(Text)
    input_file_url: Mapped[str | None] = mapped_column(String(500))
    result: Mapped[str] = mapped_column(Text, nullable=False)  # JSON string for SQLite
    match_score: Mapped[int | None] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
