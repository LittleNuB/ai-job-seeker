from __future__ import annotations

import re
from collections import Counter
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.position import Position
from ..schemas.position_radar import PositionRadarPreferences


TRACK_KEYWORDS = {
    "algorithm": ["算法", "模型", "训练", "机器学习", "深度学习", "nlp", "cv", "llm", "推荐", "搜索"],
    "engineering": ["后端", "工程", "部署", "平台", "架构", "服务", "api", "python", "java", "docker", "kubernetes"],
    "product": ["产品", "需求", "用户", "增长", "商业", "项目", "路线图", "体验"],
    "data": ["数据", "分析", "指标", "sql", "bi", "治理", "标注", "数据仓库"],
    "applied": ["应用", "agent", "rag", "prompt", "工作流", "插件", "全栈", "运营"],
    "chip": ["芯片", "cuda", "推理", "算力", "加速", "gpu", "asic"],
    "industry": ["金融", "医疗", "教育", "自动驾驶", "机器人", "行业", "解决方案"],
}


def _as_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value
    if isinstance(value, dict):
        return " ".join(_as_text(item) for item in value.values())
    if isinstance(value, list):
        return " ".join(_as_text(item) for item in value)
    return str(value)


def _tokens(text: str) -> Counter[str]:
    words = re.findall(r"[A-Za-z0-9+#.]+|[\u4e00-\u9fff]{2,}", text.lower())
    return Counter(words)


def _position_text(position: Position) -> str:
    chunks = [
        position.id,
        position.category_id,
        position.name,
        position.name_en,
        position.summary,
        position.positioning,
        _as_text(position.get_json_field("capability_requirements")),
        _as_text(position.get_json_field("common_interview_topics")),
        position.industry_trends,
    ]
    return " ".join(chunk for chunk in chunks if chunk)


def _score_position(resume_counts: Counter[str], position: Position, preferences: PositionRadarPreferences) -> tuple[int, list[str]]:
    position_text = _position_text(position).lower()
    score = 36
    reasons: list[str] = []

    for token, count in resume_counts.items():
        if len(token) < 2:
            continue
        if token in position_text:
            score += min(8, 2 + count)
            if len(reasons) < 4:
                reasons.append(f"简历中的「{token}」与该岗位能力要求有重合")

    track_hits = [kw for kw in TRACK_KEYWORDS.get(position.category_id, []) if kw.lower() in " ".join(resume_counts.elements())]
    if track_hits:
        score += min(16, len(track_hits) * 4)
        reasons.append(f"背景中出现 {', '.join(track_hits[:3])}，贴近该方向")

    if position.category_id in preferences.preferred_tracks:
        score += 10
        reasons.append("该岗位方向符合你的偏好选择")

    if preferences.experience_level and position.level and preferences.experience_level in position.level:
        score += 4

    return max(0, min(96, score)), reasons[:5]


def _bucket(score: int) -> str:
    if score >= 75:
        return "ready_now"
    if score >= 58:
        return "sprint_2_4_weeks"
    return "not_primary"


def _label_bucket(bucket: str) -> str:
    return {
        "ready_now": "现在可以投",
        "sprint_2_4_weeks": "适合 2-4 周冲刺",
        "not_primary": "暂不建议主投",
    }[bucket]


async def build_position_radar(
    db: AsyncSession,
    resume_text: str,
    preferences: PositionRadarPreferences,
) -> dict:
    resume_counts = _tokens(resume_text)
    result = await db.execute(select(Position).order_by(Position.category_id, Position.name))
    positions = result.scalars().all()

    scored: list[dict[str, Any]] = []
    for position in positions:
        score, reasons = _score_position(resume_counts, position, preferences)
        bucket = _bucket(score)
        capability = position.get_json_field("capability_requirements") or {}
        must_have = capability.get("must_have") if isinstance(capability, dict) else []
        first_gap = must_have[0] if must_have else "补充该岗位核心项目证据"
        scored.append(
            {
                "position_id": position.id,
                "position_name": position.name,
                "position_name_en": position.name_en,
                "category_id": position.category_id,
                "fit_score": score,
                "interview_probability": "high" if score >= 80 else "medium" if score >= 62 else "low",
                "gap_difficulty": "low" if score >= 78 else "medium" if score >= 58 else "high",
                "growth_potential": "high" if position.category_id in {"applied", "engineering", "algorithm"} else "medium",
                "recommendation_group": bucket,
                "recommendation_group_label": _label_bucket(bucket),
                "why_fit": reasons or ["该岗位与简历存在部分通用能力重合，可作为探索方向"],
                "main_risks": [
                    f"需要补强或明确展示：{first_gap}",
                    "当前判断基于简历文本和岗位库关键词，建议结合真实 JD 再做一次匹配",
                ],
                "next_actions": [
                    "用该岗位选择 1 个真实 JD 做可信拆解",
                    "补充简历中能证明岗位核心能力的项目结果和数据",
                    "生成 7 天行动计划，明确本周要改写和准备的材料",
                ],
            }
        )

    scored.sort(key=lambda item: item["fit_score"], reverse=True)
    recommended = scored[:5]
    grouped = {
        "ready_now": [item for item in scored if item["recommendation_group"] == "ready_now"][:5],
        "sprint_2_4_weeks": [item for item in scored if item["recommendation_group"] == "sprint_2_4_weeks"][:5],
        "not_primary": [item for item in scored if item["recommendation_group"] == "not_primary"][:5],
    }
    primary = recommended[0]["position_name"] if recommended else ""
    backup = recommended[1]["position_name"] if len(recommended) > 1 else primary

    return {
        "summary": f"基于当前简历，优先建议围绕「{primary}」建立主投路径，并保留「{backup}」作为备选方向。",
        "suggested_primary_path": primary,
        "suggested_backup_path": backup,
        "recommended_positions": recommended,
        "grouped_positions": grouped,
        "method_note": "岗位雷达基于 AI 岗位库、简历关键词和方向偏好生成，用于求职决策参考；最终投递前建议结合真实 JD 再做匹配。",
    }

