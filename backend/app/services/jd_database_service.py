from __future__ import annotations

import json
import re
from functools import lru_cache
from pathlib import Path
from typing import Any

from ..models.position import Position


def _as_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value
    return json.dumps(value, ensure_ascii=False)


def _project_root() -> Path:
    for parent in Path(__file__).resolve().parents:
        if (parent / "data" / "jd_samples.json").exists():
            return parent
    return Path(__file__).resolve().parents[3]


JD_DATA_PATH = _project_root() / "data" / "jd_samples.json"


def _normalize(text: str | None) -> str:
    return (text or "").lower()


def _keywords(text: str) -> list[str]:
    words = re.findall(r"[A-Za-z0-9+#.]+|[\u4e00-\u9fff]{2,}", text.lower())
    seen: set[str] = set()
    result: list[str] = []
    for word in words:
        if len(word) < 2 or word in seen:
            continue
        seen.add(word)
        result.append(word)
    return result[:40]


@lru_cache(maxsize=1)
def load_jd_samples() -> list[dict[str, Any]]:
    if not JD_DATA_PATH.exists():
        return []
    with JD_DATA_PATH.open("r", encoding="utf-8") as file:
        data = json.load(file)
    return data if isinstance(data, list) else []


def _position_keywords(position: Position | None) -> list[str]:
    if not position:
        return []
    text = " ".join(
        [
            position.id,
            position.name,
            position.name_en or "",
            position.summary or "",
            position.positioning or "",
            _as_text(position.get_json_field("capability_requirements")),
            _as_text(position.get_json_field("common_interview_topics")),
        ]
    )
    return _keywords(text)


def _score_jd(jd: dict[str, Any], keywords: list[str], query: str | None) -> int:
    title = _normalize(jd.get("title"))
    body = _normalize(jd.get("jd_text"))
    score = 0
    for keyword in keywords:
        if keyword in title:
            score += 8
        elif keyword in body:
            score += 2
    if query:
        q = query.lower()
        if q in title:
            score += 16
        elif q in body or q in _normalize(jd.get("company")) or q in _normalize(jd.get("city")):
            score += 8
    return score


def _excerpt(text: str, query: str | None, max_len: int = 260) -> str:
    clean = " ".join((text or "").split())
    if len(clean) <= max_len:
        return clean
    if query:
        idx = clean.lower().find(query.lower())
        if idx > 0:
            start = max(0, idx - 80)
            return ("..." if start else "") + clean[start : start + max_len] + "..."
    return clean[:max_len] + "..."


def search_real_jds(
    *,
    position: Position | None = None,
    query: str | None = None,
    company: str | None = None,
    limit: int = 8,
) -> dict[str, Any]:
    all_jds = load_jd_samples()
    companies = sorted({jd.get("company") for jd in all_jds if jd.get("company")})
    keywords = _position_keywords(position)

    rows: list[tuple[int, dict[str, Any]]] = []
    for jd in all_jds:
        if company and jd.get("company") != company:
            continue
        if query:
            q = query.lower()
            searchable = " ".join(
                [
                    _normalize(jd.get("title")),
                    _normalize(jd.get("company")),
                    _normalize(jd.get("city")),
                    _normalize(jd.get("jd_text")),
                ]
            )
            if q not in searchable:
                continue
        score = _score_jd(jd, keywords, query)
        if position and score <= 0 and not query:
            continue
        rows.append((score, jd))

    rows.sort(key=lambda item: item[0], reverse=True)
    selected = rows[:limit]
    return {
        "total": len(rows),
        "dataset_total": len(all_jds),
        "companies": companies,
        "items": [
            {
                "title": jd.get("title") or "未命名岗位",
                "company": jd.get("company") or "",
                "city": jd.get("city") or "",
                "salary": jd.get("salary") or "",
                "experience": jd.get("experience") or "",
                "education": jd.get("education") or "",
                "level": jd.get("level") or "",
                "url": jd.get("url") or "",
                "scraped_at": jd.get("scraped_at") or "",
                "match_score": score,
                "excerpt": _excerpt(jd.get("jd_text") or "", query),
                "jd_text": (jd.get("jd_text") or "")[:5000],
            }
            for score, jd in selected
        ],
    }

