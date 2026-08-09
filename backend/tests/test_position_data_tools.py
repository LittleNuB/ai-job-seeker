from __future__ import annotations

import copy
import json
import sys
from pathlib import Path

from sqlalchemy import select

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.database import async_session  # noqa: E402
from app.models.position import Category, Position  # noqa: E402
from scripts.data.seed_positions import seed  # noqa: E402
from scripts.data.validate_positions import validate_positions_data  # noqa: E402


def valid_positions_data() -> dict:
    return {
        "version": "2.0",
        "last_updated": "2026-05-07",
        "categories": [
            {
                "id": "test_data",
                "name": "测试数据方向",
                "icon": "T",
                "description": "Used by automated tests",
                "positions": [
                    {
                        "id": "seed_test_engineer",
                        "name": "Seed测试工程师",
                        "name_en": "Seed Test Engineer",
                        "level": "中级",
                        "summary": "维护岗位数据同步链路",
                        "positioning": "负责岗位数据入库和质量校验",
                        "capability_requirements": {
                            "must_have": ["Python", "SQLAlchemy", "数据校验"],
                            "nice_to_have": ["Docker", "Alembic"],
                            "tools": ["pytest", "SQLite", "PostgreSQL"],
                        },
                        "career_path": {
                            "junior": "执行基础数据维护。",
                            "mid": "负责数据同步和校验。",
                            "senior": "设计数据质量体系。",
                            "leadership": "负责岗位数据治理。",
                        },
                        "salary_range": {
                            "junior": {"min": 10, "max": 20, "unit": "万/年", "city_tier": "一线城市"},
                            "mid": {"min": 20, "max": 40, "unit": "万/年", "city_tier": "一线城市"},
                            "senior": {"min": 40, "max": 70, "unit": "万/年", "city_tier": "一线城市"},
                        },
                        "industry_trends": "岗位数据会持续扩充，需要稳定校验和幂等入库。",
                        "related_positions": [],
                        "common_interview_topics": ["如何设计幂等导入", "如何做数据校验", "如何处理迁移失败"],
                    }
                ],
            }
        ],
    }


def write_positions_json(tmp_path: Path, data: dict) -> Path:
    path = tmp_path / "positions.json"
    path.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    return path


def test_validate_positions_accepts_valid_data():
    result = validate_positions_data(valid_positions_data())

    assert result.ok
    assert result.category_count == 1
    assert result.position_count == 1
    assert result.errors == []


def test_validate_positions_rejects_duplicate_position_ids():
    data = valid_positions_data()
    duplicate = copy.deepcopy(data["categories"][0]["positions"][0])
    data["categories"][0]["positions"].append(duplicate)

    result = validate_positions_data(data)

    assert not result.ok
    assert any("duplicate position id" in error for error in result.errors)


def test_validate_positions_rejects_invalid_salary_range():
    data = valid_positions_data()
    data["categories"][0]["positions"][0]["salary_range"]["mid"]["min"] = 50
    data["categories"][0]["positions"][0]["salary_range"]["mid"]["max"] = 40

    result = validate_positions_data(data)

    assert not result.ok
    assert any("salary_range.mid.min must be <= max" in error for error in result.errors)


def test_validate_positions_warns_for_quality_issues_only():
    data = valid_positions_data()
    position = data["categories"][0]["positions"][0]
    del position["career_path"]["leadership"]
    position["related_positions"] = ["missing_position_id"]

    result = validate_positions_data(data)

    assert result.ok
    assert any("career_path missing: leadership" in warning for warning in result.warnings)
    assert any("related position ids not found: missing_position_id" in warning for warning in result.warnings)


async def test_seed_positions_dry_run_does_not_write_rows(tmp_path):
    data = valid_positions_data()
    data["categories"][0]["id"] = "seed_dry_run_category"
    data["categories"][0]["positions"][0]["id"] = "seed_dry_run_position"
    path = write_positions_json(tmp_path, data)

    await seed(path, dry_run=True)

    async with async_session() as session:
        category = await session.get(Category, "seed_dry_run_category")
        position = await session.get(Position, "seed_dry_run_position")

    assert category is None
    assert position is None


async def test_seed_positions_upserts_existing_rows(tmp_path):
    data = valid_positions_data()
    data["categories"][0]["id"] = "seed_upsert_category"
    data["categories"][0]["name"] = "Seed Upsert Category"
    data["categories"][0]["positions"][0]["id"] = "seed_upsert_position"
    data["categories"][0]["positions"][0]["summary"] = "Initial summary"
    path = write_positions_json(tmp_path, data)

    await seed(path)

    updated = copy.deepcopy(data)
    updated["categories"][0]["name"] = "Updated Seed Upsert Category"
    updated["categories"][0]["positions"][0]["summary"] = "Updated summary"
    path = write_positions_json(tmp_path, updated)

    await seed(path)

    async with async_session() as session:
        category = await session.get(Category, "seed_upsert_category")
        position = await session.get(Position, "seed_upsert_position")
        count_result = await session.execute(
            select(Position).where(Position.id == "seed_upsert_position")
        )

    assert category is not None
    assert category.name == "Updated Seed Upsert Category"
    assert position is not None
    assert position.summary == "Updated summary"
    assert len(count_result.scalars().all()) == 1
