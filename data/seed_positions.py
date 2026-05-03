"""Seed position taxonomy data into an already migrated database."""

import asyncio
import json
import logging
import os
import sys
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.exc import OperationalError

sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))
os.environ.setdefault("DEBUG", "false")
logging.getLogger("sqlalchemy.engine").disabled = True
logging.getLogger("sqlalchemy.engine.Engine").disabled = True

from app.database import async_session  # noqa: E402
from app.models.position import Category, Position  # noqa: E402


async def seed() -> None:
    data_path = Path(__file__).parent / "ai_positions.json"
    with open(data_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    async with async_session() as session:
        try:
            result = await session.execute(select(Category).limit(1))
        except OperationalError as exc:
            raise SystemExit(
                "Database schema is missing. Run `python scripts/migrate_db.py` before seeding positions."
            ) from exc

        if result.scalar_one_or_none():
            print("Position data already exists; skipping seed.")
            return

        category_map = {}
        for sort_order, cat_data in enumerate(data["categories"]):
            category = Category(
                id=cat_data["id"],
                name=cat_data["name"],
                description=cat_data.get("description"),
                icon=cat_data.get("icon"),
                sort_order=sort_order,
            )
            session.add(category)
            category_map[category.id] = category

        await session.flush()

        position_count = 0
        for cat_data in data["categories"]:
            for pos_data in cat_data.get("positions", []):
                position = Position(
                    id=pos_data["id"],
                    category_id=cat_data["id"],
                    name=pos_data["name"],
                    name_en=pos_data.get("name_en"),
                    level=pos_data.get("level"),
                    summary=pos_data.get("summary"),
                    positioning=pos_data.get("positioning"),
                    capability_requirements=json.dumps(pos_data.get("capability_requirements"), ensure_ascii=False)
                    if pos_data.get("capability_requirements")
                    else None,
                    career_path=json.dumps(pos_data.get("career_path"), ensure_ascii=False)
                    if pos_data.get("career_path")
                    else None,
                    salary_range=json.dumps(pos_data.get("salary_range"), ensure_ascii=False)
                    if pos_data.get("salary_range")
                    else None,
                    common_interview_topics=json.dumps(pos_data.get("common_interview_topics"), ensure_ascii=False)
                    if pos_data.get("common_interview_topics")
                    else None,
                    related_positions=json.dumps(pos_data.get("related_positions"), ensure_ascii=False)
                    if pos_data.get("related_positions")
                    else None,
                    industry_trends=pos_data.get("industry_trends"),
                )
                session.add(position)
                position_count += 1

        await session.commit()
        print(f"Seed completed: {len(category_map)} categories, {position_count} positions.")


if __name__ == "__main__":
    asyncio.run(seed())
