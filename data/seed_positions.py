"""Seed or update position taxonomy data into an already migrated database."""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
import os
import sys
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.exc import OperationalError

DATA_DIR = Path(__file__).parent
PROJECT_ROOT = DATA_DIR.parent

sys.path.insert(0, str(PROJECT_ROOT / "backend"))
sys.path.insert(0, str(DATA_DIR))
os.environ.setdefault("DEBUG", "false")
logging.getLogger("sqlalchemy.engine").disabled = True
logging.getLogger("sqlalchemy.engine.Engine").disabled = True

from app.database import async_session  # noqa: E402
from app.models.position import Category, Position  # noqa: E402
from validate_positions import validate_positions_data  # noqa: E402


JSON_FIELDS = {
    "capability_requirements",
    "career_path",
    "salary_range",
    "common_interview_topics",
    "related_positions",
}


def _json_or_none(value):
    if value in (None, ""):
        return None
    return json.dumps(value, ensure_ascii=False)


def _load_and_validate(data_path: Path) -> dict:
    with open(data_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    validation = validate_positions_data(data)
    if validation.errors:
        for error in validation.errors:
            print(f"ERROR {error}", file=sys.stderr)
        raise SystemExit("Position data validation failed; fix errors before seeding.")
    for warning in validation.warnings:
        print(f"WARNING {warning}")
    return data


async def seed(data_path: Path, *, dry_run: bool = False) -> None:
    data = _load_and_validate(data_path)

    async with async_session() as session:
        try:
            await session.execute(select(Category).limit(1))
        except OperationalError as exc:
            raise SystemExit(
                "Database schema is missing. Run `python scripts/migrate_db.py` before seeding positions."
            ) from exc

        category_inserted = 0
        category_updated = 0
        for sort_order, cat_data in enumerate(data["categories"]):
            category = await session.get(Category, cat_data["id"])
            if category is None:
                category = Category(id=cat_data["id"])
                session.add(category)
                category_inserted += 1
            else:
                category_updated += 1

            category.name = cat_data["name"]
            category.description = cat_data.get("description")
            category.icon = cat_data.get("icon")
            category.sort_order = sort_order

        await session.flush()

        position_inserted = 0
        position_updated = 0
        for cat_data in data["categories"]:
            for pos_data in cat_data.get("positions", []):
                position = await session.get(Position, pos_data["id"])
                if position is None:
                    position = Position(id=pos_data["id"])
                    session.add(position)
                    position_inserted += 1
                else:
                    position_updated += 1

                position.category_id = cat_data["id"]
                position.name = pos_data["name"]
                position.name_en = pos_data.get("name_en")
                position.level = pos_data.get("level")
                position.summary = pos_data.get("summary")
                position.positioning = pos_data.get("positioning")
                position.industry_trends = pos_data.get("industry_trends")
                for field_name in JSON_FIELDS:
                    setattr(position, field_name, _json_or_none(pos_data.get(field_name)))

        if dry_run:
            await session.rollback()
            prefix = "Seed dry run"
        else:
            await session.commit()
            prefix = "Seed completed"

        print(
            f"{prefix}: categories +{category_inserted}/~{category_updated}, "
            f"positions +{position_inserted}/~{position_updated}."
        )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed or update AI position taxonomy data")
    parser.add_argument("--path", default=str(DATA_DIR / "ai_positions.json"))
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    asyncio.run(seed(Path(args.path), dry_run=args.dry_run))
