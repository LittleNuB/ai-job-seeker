from __future__ import annotations

from typing import Any


def _pick_focus(result: dict[str, Any], source_type: str) -> str:
    if source_type == "position_radar":
        return result.get("suggested_primary_path") or "目标 AI 岗位"
    if source_type == "match":
        return result.get("target_position") or result.get("position_name") or "目标岗位"
    overview = result.get("position_overview") or {}
    return overview.get("inferred_role") or "目标 JD"


def build_action_plan(source_type: str, source_record_id: str, source_result: dict[str, Any]) -> dict:
    focus = _pick_focus(source_result, source_type)
    gaps = source_result.get("capability_gaps") or []
    first_gap = gaps[0].get("gap") if gaps and isinstance(gaps[0], dict) else "核心能力证据"
    risks = source_result.get("interview_risks") or source_result.get("candidate_risks") or []
    first_risk = risks[0] if risks else "面试追问准备"

    days = [
        ("Day 1", "确认主投方向", f"先把求职重心收敛到「{focus}」。", f"围绕「{focus}」确认主投岗位和 1 个备选方向。", "写下主投/备选岗位及不投方向的理由。", "45 分钟", focus),
        ("Day 2", "改写核心项目", "简历需要先证明你和目标岗位有关，而不是只列技能。", f"把最相关的 1 个项目改写成能证明「{focus}」能力的版本。", "至少完成 3 条带动作、技术、结果的 bullet。", "90 分钟", first_gap),
        ("Day 3", "补齐证据链", f"当前最需要补强的是「{first_gap}」。", f"针对「{first_gap}」补充课程、项目、作品或数据证明。", "形成一段可放入简历或面试自述的证据。", "60 分钟", first_gap),
        ("Day 4", "准备高频追问", "面试风险提前准备，比临场解释更可靠。", f"围绕「{first_risk}」准备 5 个可能追问。", "每个问题写出 1 分钟回答提纲。", "75 分钟", first_risk),
        ("Day 5", "筛选真实 JD", "用真实 JD 校准岗位，而不是只看岗位名称。", f"找 5-10 个「{focus}」相关 JD，标记硬门槛和加分项。", "选出 3 个最值得投递的 JD。", "60 分钟", focus),
        ("Day 6", "定制投递材料", "同一份简历很难同时命中所有岗位。", "根据 3 个 JD 分别调整简历摘要、项目顺序和关键词。", "产出 1 份主投简历和 1 份备选简历。", "120 分钟", "简历定制"),
        ("Day 7", "复盘并调整", "一周后需要根据材料完成度和岗位反馈调整方向。", "回看本周材料，判断是否继续主投或切换备选岗位。", "形成下周投递清单和继续补强项。", "45 分钟", "求职策略"),
    ]

    return {
        "source_type": source_type,
        "source_record_id": source_record_id,
        "focus": focus,
        "summary": f"这是一份围绕「{focus}」的 7 天求职行动计划，目标是把分析结果转成可投递、可面试的材料。",
        "tasks": [
            {
                "day": day,
                "title": title,
                "why": why,
                "action": action,
                "done_when": done_when,
                "estimated_time": estimated_time,
                "related_focus": related_focus,
            }
            for day, title, why, action, done_when, estimated_time, related_focus in days
        ],
        "markdown": "\n".join(
            [
                f"# 7 天求职行动计划：{focus}",
                "",
                *[
                    f"- **{day}｜{title}**：{action} 完成标准：{done_when}（预计 {estimated_time}）"
                    for day, title, _, action, done_when, estimated_time, _ in days
                ],
            ]
        ),
    }
