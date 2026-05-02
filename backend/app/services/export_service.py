from __future__ import annotations

import json
from datetime import datetime, timezone


def _fmt_list(items: list, indent: str = "  ") -> str:
    return "\n".join(f"{indent}- {item}" for item in items)


def export_jd_markdown(result: dict, jd_text: str = "") -> str:
    lines: list[str] = []
    lines.append("# JD 分析报告")
    lines.append(f"\n> 生成时间：{datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}")
    lines.append("")

    if jd_text:
        lines.append("## 原始JD")
        lines.append(f"\n> {jd_text[:500]}{'...' if len(jd_text) > 500 else ''}\n")

    if result.get("position_summary"):
        lines.append("## 岗位概述")
        lines.append(f"\n{result['position_summary']}\n")

    if result.get("core_requirements"):
        lines.append("## 核心要求")
        lines.append(_fmt_list(result["core_requirements"]))
        lines.append("")

    if result.get("preferred_qualifications"):
        lines.append("## 加分项")
        lines.append(_fmt_list(result["preferred_qualifications"]))
        lines.append("")

    if result.get("salary_insight"):
        s = result["salary_insight"]
        lines.append("## 薪资洞察")
        if isinstance(s, dict):
            for k, v in s.items():
                lines.append(f"- **{k}**: {v}")
        else:
            lines.append(str(s))
        lines.append("")

    if result.get("interview_focus"):
        lines.append("## 面试重点")
        lines.append(_fmt_list(result["interview_focus"]))
        lines.append("")

    if result.get("career_development"):
        lines.append("## 职业发展")
        lines.append(f"\n{result['career_development']}\n")

    # Fallback: dump any top-level keys we didn't handle
    handled = {"position_summary", "core_requirements", "preferred_qualifications",
               "salary_insight", "interview_focus", "career_development"}
    extra = {k: v for k, v in result.items() if k not in handled}
    if extra:
        lines.append("## 其他信息")
        lines.append(f"\n```json\n{json.dumps(extra, ensure_ascii=False, indent=2)}\n```\n")

    return "\n".join(lines)


def export_match_markdown(result: dict, resume_text: str = "", position_name: str = "") -> str:
    lines: list[str] = []
    lines.append("# 简历匹配报告")
    lines.append(f"\n> 生成时间：{datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}")
    if position_name:
        lines.append(f"> 目标岗位：{position_name}")
    lines.append("")

    score = result.get("match_score")
    if score is not None:
        lines.append(f"## 匹配得分：{score}/100\n")

    if result.get("score_breakdown"):
        lines.append("### 分项得分")
        label_map = {
            "hard_skills_match": "硬技能",
            "experience_match": "经验",
            "culture_fit": "文化匹配",
            "growth_potential": "成长潜力",
        }
        for k, v in result["score_breakdown"].items():
            lines.append(f"- **{label_map.get(k, k)}**: {v}")
        lines.append("")

    if result.get("core_advantages"):
        lines.append("## 核心优势")
        for i, a in enumerate(result["core_advantages"], 1):
            adv = a.get("advantage", a) if isinstance(a, dict) else a
            evi = a.get("evidence", "") if isinstance(a, dict) else ""
            line = f"{i}. **{adv}**"
            if evi:
                line += f" — {evi}"
            lines.append(line)
        lines.append("")

    if result.get("capability_gaps"):
        lines.append("## 能力差距")
        for i, g in enumerate(result["capability_gaps"], 1):
            gap = g.get("gap", g) if isinstance(g, dict) else g
            sev = g.get("severity", "") if isinstance(g, dict) else ""
            mit = g.get("mitigation", "") if isinstance(g, dict) else ""
            line = f"{i}. "
            if sev:
                line += f"[{sev}] "
            line += f"**{gap}**"
            if mit:
                line += f" — {mit}"
            lines.append(line)
        lines.append("")

    if result.get("improvement_plan"):
        plan = result["improvement_plan"]
        lines.append("## 提升计划")
        phases = [
            ("immediate", "1-2周（即时行动）"),
            ("short_term", "1-3月（短期目标）"),
            ("medium_term", "3-6月（中期规划）"),
        ]
        for key, label in phases:
            items = plan.get(key)
            if items:
                lines.append(f"\n### {label}")
                lines.append(_fmt_list(items))
        lines.append("")

    # Fallback
    handled = {"match_score", "score_breakdown", "core_advantages", "capability_gaps", "improvement_plan"}
    extra = {k: v for k, v in result.items() if k not in handled}
    if extra:
        lines.append("## 其他信息")
        lines.append(f"\n```json\n{json.dumps(extra, ensure_ascii=False, indent=2)}\n```\n")

    return "\n".join(lines)
