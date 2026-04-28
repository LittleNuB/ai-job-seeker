from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, or_, func
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models.position import Position, Category

router = APIRouter()


@router.get("/categories")
async def get_categories(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Category).order_by(Category.sort_order))
    categories = result.scalars().all()
    return [{"id": c.id, "name": c.name, "description": c.description, "icon": c.icon} for c in categories]


@router.get("/positions")
async def get_positions(
    category_id: str | None = None,
    query: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Position)
    if category_id:
        stmt = stmt.where(Position.category_id == category_id)
    if query:
        q = f"%{query}%"
        stmt = stmt.where(
            or_(
                Position.name.ilike(q),
                Position.name_en.ilike(q),
                Position.summary.ilike(q),
            )
        )
    stmt = stmt.order_by(Position.name)
    result = await db.execute(stmt)
    positions = result.scalars().all()
    return [_position_to_dict(p) for p in positions]


@router.get("/positions/{position_id}")
async def get_position(position_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Position).where(Position.id == position_id))
    pos = result.scalar_one_or_none()
    if not pos:
        return {"error": "岗位未找到"}
    # Also get category info
    cat_result = await db.execute(select(Category).where(Category.id == pos.category_id))
    cat = cat_result.scalar_one_or_none()
    data = _position_to_dict(pos)
    data["category_name"] = cat.name if cat else None
    data["category_id"] = pos.category_id
    return data


def _position_to_dict(p: Position) -> dict:
    return {
        "id": p.id,
        "name": p.name,
        "name_en": p.name_en,
        "level": p.level,
        "summary": p.summary,
        "positioning": p.positioning,
        "capability_requirements": p.capability_requirements,
        "career_path": p.career_path,
        "salary_range": p.salary_range,
        "common_interview_topics": p.common_interview_topics,
        "related_positions": p.related_positions,
        "industry_trends": p.industry_trends,
    }
