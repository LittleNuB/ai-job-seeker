"""Validate AI position taxonomy data before seeding it into the database."""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


POSITION_ID_RE = re.compile(r"^[a-z][a-z0-9_]*$")
REQUIRED_POSITION_FIELDS = {
    "id",
    "name",
    "summary",
    "capability_requirements",
    "career_path",
    "salary_range",
}
REQUIRED_CAPABILITY_FIELDS = {"must_have", "nice_to_have", "tools"}
REQUIRED_CAREER_FIELDS = {"junior", "mid", "senior", "leadership"}
REQUIRED_SALARY_FIELDS = {"junior", "mid", "senior"}


@dataclass
class ValidationResult:
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    category_count: int = 0
    position_count: int = 0

    @property
    def ok(self) -> bool:
        return not self.errors


def _load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def validate_positions_data(data: Any) -> ValidationResult:
    result = ValidationResult()

    if not isinstance(data, dict):
        result.errors.append("root must be a JSON object")
        return result

    categories = data.get("categories")
    if not isinstance(categories, list) or not categories:
        result.errors.append("categories must be a non-empty list")
        return result

    result.category_count = len(categories)
    category_ids: set[str] = set()
    position_ids: set[str] = set()
    positions_by_id: dict[str, tuple[str, dict[str, Any]]] = {}

    for cat_index, category in enumerate(categories, 1):
        if not isinstance(category, dict):
            result.errors.append(f"category #{cat_index} must be an object")
            continue

        category_id = category.get("id")
        label = category_id or f"category #{cat_index}"
        if not isinstance(category_id, str) or not category_id.strip():
            result.errors.append(f"{label}: category id is required")
            continue
        if category_id in category_ids:
            result.errors.append(f"{label}: duplicate category id")
        category_ids.add(category_id)

        if not isinstance(category.get("name"), str) or not category["name"].strip():
            result.errors.append(f"{label}: category name is required")

        positions = category.get("positions")
        if not isinstance(positions, list):
            result.errors.append(f"{label}: positions must be a list")
            continue
        if not positions:
            result.warnings.append(f"{label}: category has no positions")

        for pos_index, position in enumerate(positions, 1):
            result.position_count += 1
            if not isinstance(position, dict):
                result.errors.append(f"{label}/position #{pos_index}: must be an object")
                continue

            position_id = position.get("id")
            pos_label = f"{label}/{position_id or f'position #{pos_index}'}"
            if not isinstance(position_id, str) or not position_id.strip():
                result.errors.append(f"{pos_label}: position id is required")
                continue
            if not POSITION_ID_RE.match(position_id):
                result.errors.append(f"{pos_label}: position id must be lowercase snake_case")
            if position_id in position_ids:
                result.errors.append(f"{pos_label}: duplicate position id")
            position_ids.add(position_id)
            positions_by_id[position_id] = (label, position)

            missing = sorted(
                field_name
                for field_name in REQUIRED_POSITION_FIELDS
                if field_name not in position or position[field_name] in ("", None)
            )
            if missing:
                result.errors.append(f"{pos_label}: missing required fields: {', '.join(missing)}")

            _validate_capabilities(result, pos_label, position.get("capability_requirements"))
            _validate_career_path(result, pos_label, position.get("career_path"))
            _validate_salary(result, pos_label, position.get("salary_range"))
            _validate_list_field(result, pos_label, "common_interview_topics", position.get("common_interview_topics"), 3)

    for position_id, (category_label, position) in positions_by_id.items():
        related = position.get("related_positions")
        if related is None:
            continue
        if not isinstance(related, list):
            result.errors.append(f"{category_label}/{position_id}: related_positions must be a list")
            continue
        unknown_ids = [
            item for item in related
            if isinstance(item, str) and POSITION_ID_RE.match(item) and item not in position_ids
        ]
        if unknown_ids:
            result.warnings.append(
                f"{category_label}/{position_id}: related position ids not found: {', '.join(unknown_ids)}"
            )

    return result


def _validate_capabilities(result: ValidationResult, label: str, value: Any) -> None:
    if not isinstance(value, dict):
        result.errors.append(f"{label}: capability_requirements must be an object")
        return

    missing = sorted(REQUIRED_CAPABILITY_FIELDS - set(value))
    if missing:
        result.errors.append(f"{label}: capability_requirements missing: {', '.join(missing)}")

    for field_name in REQUIRED_CAPABILITY_FIELDS:
        _validate_list_field(result, label, f"capability_requirements.{field_name}", value.get(field_name), 2)


def _validate_career_path(result: ValidationResult, label: str, value: Any) -> None:
    if not isinstance(value, dict):
        result.errors.append(f"{label}: career_path must be an object")
        return

    missing = sorted(REQUIRED_CAREER_FIELDS - set(value))
    if missing:
        result.warnings.append(f"{label}: career_path missing: {', '.join(missing)}")


def _validate_salary(result: ValidationResult, label: str, value: Any) -> None:
    if not isinstance(value, dict):
        result.errors.append(f"{label}: salary_range must be an object")
        return

    missing = sorted(REQUIRED_SALARY_FIELDS - set(value))
    if missing:
        result.errors.append(f"{label}: salary_range missing: {', '.join(missing)}")

    for level in REQUIRED_SALARY_FIELDS:
        level_value = value.get(level)
        if level_value is None:
            continue
        if not isinstance(level_value, dict):
            result.errors.append(f"{label}: salary_range.{level} must be an object")
            continue
        min_value = level_value.get("min")
        max_value = level_value.get("max")
        if not isinstance(min_value, (int, float)) or not isinstance(max_value, (int, float)):
            result.errors.append(f"{label}: salary_range.{level}.min/max must be numbers")
        elif min_value > max_value:
            result.errors.append(f"{label}: salary_range.{level}.min must be <= max")


def _validate_list_field(
    result: ValidationResult,
    label: str,
    field_name: str,
    value: Any,
    min_items: int,
) -> None:
    if not isinstance(value, list):
        result.errors.append(f"{label}: {field_name} must be a list")
        return

    if len(value) < min_items:
        result.warnings.append(f"{label}: {field_name} has fewer than {min_items} items")

    for index, item in enumerate(value, 1):
        if not isinstance(item, str) or not item.strip():
            result.errors.append(f"{label}: {field_name}[{index}] must be a non-empty string")


def print_result(result: ValidationResult) -> None:
    print(f"Categories: {result.category_count}")
    print(f"Positions: {result.position_count}")

    if result.errors:
        print("\nErrors:")
        for item in result.errors:
            print(f"  - {item}")

    if result.warnings:
        print("\nWarnings:")
        for item in result.warnings:
            print(f"  - {item}")

    print("\nValidation:", "PASS" if result.ok else "FAIL")


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate data/ai_positions.json")
    parser.add_argument("--path", default=str(Path(__file__).with_name("ai_positions.json")))
    parser.add_argument("--strict", action="store_true", help="Treat warnings as failures")
    args = parser.parse_args()

    path = Path(args.path)
    try:
        data = _load_json(path)
    except Exception as exc:
        print(f"Failed to read {path}: {exc}", file=sys.stderr)
        return 1

    result = validate_positions_data(data)
    print_result(result)

    if result.errors or (args.strict and result.warnings):
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
