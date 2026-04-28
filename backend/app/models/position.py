from sqlalchemy import String, Text, Integer, JSON, ForeignKey
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
    capability_requirements: Mapped[dict | None] = mapped_column(JSON)
    career_path: Mapped[dict | None] = mapped_column(JSON)
    salary_range: Mapped[dict | None] = mapped_column(JSON)
    common_interview_topics: Mapped[dict | None] = mapped_column(JSON)
    related_positions: Mapped[dict | None] = mapped_column(JSON)
    industry_trends: Mapped[str | None] = mapped_column(Text)
    embedding_id: Mapped[int | None] = mapped_column(Integer)

    category: Mapped["Category"] = relationship(back_populates="positions")
