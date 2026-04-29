import json

from sqlalchemy import String, Text, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    icon: Mapped[str | None] = mapped_column(String(10))
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    positions: Mapped[list["Position"]] = relationship(back_populates="category", order_by="Position.name")


class Position(Base):
    __tablename__ = "positions"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    category_id: Mapped[str] = mapped_column(String(50), ForeignKey("categories.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    name_en: Mapped[str | None] = mapped_column(String(100))
    level: Mapped[str | None] = mapped_column(String(20))
    summary: Mapped[str | None] = mapped_column(Text)
    positioning: Mapped[str | None] = mapped_column(Text)
    capability_requirements: Mapped[str | None] = mapped_column(Text)  # JSON string
    career_path: Mapped[str | None] = mapped_column(Text)
    salary_range: Mapped[str | None] = mapped_column(Text)
    common_interview_topics: Mapped[str | None] = mapped_column(Text)
    related_positions: Mapped[str | None] = mapped_column(Text)
    industry_trends: Mapped[str | None] = mapped_column(Text)
    embedding_id: Mapped[int | None] = mapped_column(Integer)

    category: Mapped["Category"] = relationship(back_populates="positions")

    def get_json_field(self, field_name: str):
        """Helper to deserialize JSON fields"""
        raw = getattr(self, field_name)
        if raw is None:
            return None
        if isinstance(raw, dict | list):
            return raw
        try:
            return json.loads(raw)
        except (json.JSONDecodeError, TypeError):
            return raw
