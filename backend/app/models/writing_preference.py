import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base


class WritingPreferenceProfileRecord(Base):
    __tablename__ = "writing_preference_profiles"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    profile_version: Mapped[str] = mapped_column(String(80), nullable=False)
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    source: Mapped[str] = mapped_column(String(24), nullable=False, default="default")
    sentence_length: Mapped[str] = mapped_column(
        String(24), nullable=False, default="balanced"
    )
    information_density: Mapped[str] = mapped_column(
        String(24), nullable=False, default="balanced"
    )
    technical_detail: Mapped[str] = mapped_column(
        String(24), nullable=False, default="balanced"
    )
    result_placement: Mapped[str] = mapped_column(
        String(24), nullable=False, default="balanced"
    )
    learned_from_saved_edits: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class WritingPreferenceEditEvent(Base):
    __tablename__ = "writing_preference_edit_events"
    __table_args__ = (
        UniqueConstraint(
            "fingerprint", name="uq_writing_preference_event_fingerprint"
        ),
    )

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    application_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("target_applications.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    claim_id: Mapped[str] = mapped_column(String(36), nullable=False)
    learned_dimensions_json: Mapped[str] = mapped_column(Text, nullable=False)
    fingerprint: Mapped[str] = mapped_column(String(64), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
