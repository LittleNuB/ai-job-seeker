"""将 data/ai_positions.json 导入数据库"""

import json
import asyncio
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from sqlalchemy import select
from app.database import engine, async_session, Base
from app.models.position import Position, Category


async def seed():
    data_path = Path(__file__).parent / "ai_positions.json"
    with open(data_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as session:
        # Check if data already exists
        result = await session.execute(select(Category).limit(1))
        if result.scalar_one_or_none():
            print("岗位数据已存在，跳过导入")
            return

        # Import categories
        category_map = {}
        for cat_data in data["categories"]:
            cat = Category(
                id=cat_data["id"],
                name=cat_data["name"],
                description=cat_data.get("description"),
                icon=cat_data.get("icon"),
                sort_order=data["categories"].index(cat_data),
            )
            session.add(cat)
            category_map[cat.id] = cat
        await session.flush()

        # Import positions
        position_count = 0
        for cat_data in data["categories"]:
            for pos_data in cat_data.get("positions", []):
                pos = Position(
                    id=pos_data["id"],
                    category_id=cat_data["id"],
                    name=pos_data["name"],
                    name_en=pos_data.get("name_en"),
                    level=pos_data.get("level"),
                    summary=pos_data.get("summary"),
                    positioning=pos_data.get("positioning"),
                    capability_requirements=json.dumps(pos_data.get("capability_requirements"), ensure_ascii=False) if pos_data.get("capability_requirements") else None,
                    career_path=json.dumps(pos_data.get("career_path"), ensure_ascii=False) if pos_data.get("career_path") else None,
                    salary_range=json.dumps(pos_data.get("salary_range"), ensure_ascii=False) if pos_data.get("salary_range") else None,
                    common_interview_topics=json.dumps(pos_data.get("common_interview_topics"), ensure_ascii=False) if pos_data.get("common_interview_topics") else None,
                    related_positions=json.dumps(pos_data.get("related_positions"), ensure_ascii=False) if pos_data.get("related_positions") else None,
                    industry_trends=pos_data.get("industry_trends"),
                )
                session.add(pos)
                position_count += 1

        await session.commit()
        print(f"导入完成：{len(category_map)} 个分类，{position_count} 个岗位")


if __name__ == "__main__":
    asyncio.run(seed())
