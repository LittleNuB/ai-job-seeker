"""主入口：爬取 → 清洗 → 结构化 → 合并到 ai_positions.json"""

import argparse
import json
import logging
import os
import sys
from datetime import datetime

# 将项目根目录加入 path
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)

from scraper.config import (
    RAW_DIR, CLEANED_DIR, STRUCTURED_DIR,
    TARGET_POSITIONS, POSITION_CATEGORY_MAP, CATEGORIES,
)
from scraper.company_scraper import CompanyScraper
from scraper.pipeline import DataPipeline
from scraper.structurer import PositionStructurer

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)

POSITIONS_JSON_PATH = os.path.join(PROJECT_ROOT, "data", "ai_positions.json")


def step_scrape(companies: list[str] = None):
    """第1步：爬取原始 JD 数据"""
    logger.info("=" * 50)
    logger.info("第1步：爬取原始JD数据")
    logger.info("=" * 50)

    scraper = CompanyScraper()
    results = scraper.scrape_all(companies)

    total = sum(len(v) for v in results.values())
    logger.info(f"爬取完成，共获取 {total} 条JD")
    for key, jds in results.items():
        logger.info(f"  {key}: {len(jds)} 条")

    return results


def step_clean():
    """第2步：清洗、去重、聚类"""
    logger.info("=" * 50)
    logger.info("第2步：清洗 + 聚类")
    logger.info("=" * 50)

    pipeline = DataPipeline()
    clusters = pipeline.run()
    pipeline.print_stats(clusters)

    return clusters


def step_structure(clusters: dict = None):
    """第3步：LLM 结构化"""
    logger.info("=" * 50)
    logger.info("第3步：LLM 结构化")
    logger.info("=" * 50)

    if clusters is None:
        # 从 cleaned 数据重新加载聚类
        pipeline = DataPipeline()
        clusters = pipeline.run()

    structurer = PositionStructurer()
    positions = structurer.structure_all(clusters)

    logger.info(f"结构化完成，共 {len(positions)} 个岗位")
    return positions


def step_merge(positions: list[dict] = None, dry_run: bool = False):
    """第4步：合并到 ai_positions.json"""
    logger.info("=" * 50)
    logger.info("第4步：合并到 ai_positions.json")
    logger.info("=" * 50)

    if positions is None:
        # 从 structured 数据加载
        filepath = os.path.join(STRUCTURED_DIR, "structured_positions.json")
        if not os.path.exists(filepath):
            logger.error(f"结构化数据不存在: {filepath}，请先运行 step_structure")
            return
        with open(filepath, "r", encoding="utf-8") as f:
            positions = json.load(f)

    # 加载现有数据
    existing_data = _load_existing()

    # 合并
    merged = _merge_positions(existing_data, positions)

    if dry_run:
        logger.info("[DRY RUN] 不写入文件，仅展示合并结果:")
        _print_merge_summary(merged)
        return

    # 备份原文件
    _backup_existing()

    # 写入
    with open(POSITIONS_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(merged, f, ensure_ascii=False, indent=2)

    logger.info(f"已合并写入: {POSITIONS_JSON_PATH}")
    _print_merge_summary(merged)


def _load_existing() -> dict:
    """加载现有 ai_positions.json"""
    if not os.path.exists(POSITIONS_JSON_PATH):
        return {"version": "2.0", "last_updated": "", "categories": []}

    with open(POSITIONS_JSON_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def _backup_existing():
    """备份现有 ai_positions.json"""
    if not os.path.exists(POSITIONS_JSON_PATH):
        return

    backup_path = POSITIONS_JSON_PATH.replace(".json", f"_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json")
    with open(POSITIONS_JSON_PATH, "r", encoding="utf-8") as f:
        data = f.read()
    with open(backup_path, "w", encoding="utf-8") as f:
        f.write(data)
    logger.info(f"已备份原文件: {backup_path}")


def _merge_positions(existing: dict, new_positions: list[dict]) -> dict:
    """合并新旧岗位数据"""
    # 收集现有岗位 ID
    existing_ids = set()
    for cat in existing.get("categories", []):
        for pos in cat.get("positions", []):
            existing_ids.add(pos.get("id", ""))

    # 按分类组织新岗位
    new_by_category = {}
    for pos in new_positions:
        cat_id = POSITION_CATEGORY_MAP.get(pos.get("id", ""), "applied")
        if cat_id not in new_by_category:
            new_by_category[cat_id] = []
        new_by_category[cat_id].append(pos)

    # 构建分类映射
    cat_map = {cat["id"]: cat for cat in CATEGORIES}

    # 合并到现有分类
    merged_categories = []
    existing_cat_ids = set()

    for cat in existing.get("categories", []):
        cat_id = cat["id"]
        existing_cat_ids.add(cat_id)

        # 添加该分类下的新岗位
        new_in_cat = new_by_category.pop(cat_id, [])
        for new_pos in new_in_cat:
            if new_pos["id"] not in existing_ids:
                # 确保必要字段存在
                _ensure_fields(new_pos)
                cat["positions"].append(new_pos)
                existing_ids.add(new_pos["id"])

        merged_categories.append(cat)

    # 添加新分类
    for cat_id, positions in new_by_category.items():
        if cat_id in existing_cat_ids:
            continue
        cat_info = cat_map.get(cat_id, {
            "id": cat_id, "name": cat_id, "icon": "📋",
            "description": "其他AI相关岗位",
        })
        cat_entry = {
            "id": cat_info["id"],
            "name": cat_info["name"],
            "icon": cat_info["icon"],
            "description": cat_info["description"],
            "positions": [],
        }
        for pos in positions:
            if pos["id"] not in existing_ids:
                _ensure_fields(pos)
                cat_entry["positions"].append(pos)
                existing_ids.add(pos["id"])
        if cat_entry["positions"]:
            merged_categories.append(cat_entry)

    return {
        "version": "2.0",
        "last_updated": datetime.now().strftime("%Y-%m-%d"),
        "categories": merged_categories,
    }


def _ensure_fields(pos: dict):
    """确保岗位数据有必要字段"""
    pos.setdefault("id", "")
    pos.setdefault("name", "")
    pos.setdefault("name_en", "")
    pos.setdefault("level", "中级")
    pos.setdefault("summary", "")
    pos.setdefault("positioning", "")
    pos.setdefault("capability_requirements", {
        "must_have": [], "nice_to_have": [], "tools": []
    })
    pos.setdefault("career_path", {
        "junior": "", "mid": "", "senior": "", "leadership": ""
    })
    pos.setdefault("salary_range", {
        "junior": {"min": 0, "max": 0, "unit": "万/年", "city_tier": "一线城市"},
        "mid": {"min": 0, "max": 0, "unit": "万/年", "city_tier": "一线城市"},
        "senior": {"min": 0, "max": 0, "unit": "万/年", "city_tier": "一线城市"},
    })
    pos.setdefault("industry_trends", "")
    pos.setdefault("related_positions", [])
    pos.setdefault("common_interview_topics", [])


def _print_merge_summary(data: dict):
    """打印合并结果摘要"""
    total = 0
    for cat in data.get("categories", []):
        count = len(cat.get("positions", []))
        total += count
        icon = cat.get("icon", "")
        name = cat.get("name", "")
        print(f"  {name}: {count} 个岗位")
    print(f"  合计: {total} 个岗位")


def main():
    parser = argparse.ArgumentParser(description="AI岗位数据爬取与结构化工具")
    parser.add_argument(
        "step",
        choices=["scrape", "clean", "structure", "merge", "all"],
        help="执行步骤: scrape=爬取, clean=清洗聚类, structure=LLM结构化, merge=合并, all=全部执行",
    )
    parser.add_argument(
        "--companies", nargs="+",
        help="指定爬取的公司 (bytedance alibaba tencent baidu meituan huawei)",
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="合并时只展示结果不写入文件",
    )

    args = parser.parse_args()

    if args.step == "scrape":
        step_scrape(args.companies)

    elif args.step == "clean":
        step_clean()

    elif args.step == "structure":
        step_structure()

    elif args.step == "merge":
        step_merge(dry_run=args.dry_run)

    elif args.step == "all":
        step_scrape(args.companies)
        clusters = step_clean()
        positions = step_structure(clusters)
        step_merge(positions, dry_run=args.dry_run)


if __name__ == "__main__":
    main()
