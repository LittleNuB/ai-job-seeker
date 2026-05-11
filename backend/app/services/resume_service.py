"""简历匹配服务：复用 Prompt，改为异步"""

RESUME_SYSTEM_PROMPT = """你是一位AI行业职业规划顾问和技术面试官。你的任务是将求职者的简历与目标岗位进行深度匹配分析。

你需要：
1. 识别求职者的核心竞争优势（而不仅仅是罗列匹配的关键词）
2. 诚实但建设性地指出能力差距
3. 给出具体可执行的改进建议，而不是泛泛的建议

匹配评分标准：
- 90+：高度匹配，核心能力全面覆盖
- 75-89：较好匹配，主要能力具备，有少量差距
- 60-74：基本匹配，有较明显的能力缺口
- 45-59：部分匹配，存在较大差距，需要系统提升
- 0-44：匹配度低，需要重大方向调整

请严格按指定JSON格式输出。"""

RESUME_USER_PROMPT_TEMPLATE = """请将以下简历与目标岗位进行匹配分析：

【求职者简历】
{resume_text}

【目标岗位】
{position_details}

请按以下JSON格式输出：
{{
  "match_score": 85,
  "score_breakdown": {{
    "hard_skills_match": 90,
    "experience_match": 80,
    "culture_fit": 85,
    "growth_potential": 88
  }},
  "core_advantages": [
    {{"advantage": "优势描述", "evidence": "简历中的佐证", "why_matters": "为什么这个优势对这个岗位重要"}}
  ],
  "capability_gaps": [
    {{"gap": "差距描述", "severity": "高/中/低", "impact": "对面试/入职的影响", "mitigation": "短期可采取的弥补措施"}}
  ],
  "improvement_plan": {{
    "immediate": ["1-2周内可以做的准备"],
    "short_term": ["1-3个月的提升方向"],
    "medium_term": ["3-6个月的发展建议"]
  }},
  "interview_strategy": {{
    "highlight_topics": ["面试中应主动引导到的话题"],
    "prepare_for": ["需要重点准备的被问方向"],
    "narrative_angle": "简历故事线的建议叙述角度"
  }}
}}"""


def build_resume_prompt(resume_text: str, position_details: str) -> tuple[str, str]:
    return RESUME_SYSTEM_PROMPT, RESUME_USER_PROMPT_TEMPLATE.format(
        resume_text=resume_text,
        position_details=position_details,
    )


async def match_resume(glm_client, resume_text: str, position_details: str) -> dict:
    system_prompt, user_prompt = build_resume_prompt(resume_text, position_details)
    result = await glm_client.chat_with_retry(system_prompt, user_prompt, temperature=0.2)
    return enrich_match_result(result, resume_text)


def _snippet(text: str) -> str:
    clean = " ".join(text.strip().split())
    return clean[:160] if clean else "简历中已有经历"


def enrich_match_result(result: dict, resume_text: str) -> dict:
    """Add explainable matching fields while keeping the original response shape."""
    score = int(result.get("match_score") or 0)
    if score >= 80:
        decision = "建议投"
        score_reason = "核心能力和岗位要求重合度较高，适合进入定制简历和面试准备。"
    elif score >= 62:
        decision = "可以冲"
        score_reason = "已有部分相关基础，但需要补强证据和岗位关键词表达。"
    else:
        decision = "暂缓投"
        score_reason = "当前简历与目标岗位存在明显差距，建议先补项目或调整主投方向。"

    advantages = result.get("core_advantages") or []
    gaps = result.get("capability_gaps") or []
    resume_snippet = _snippet(resume_text)

    result.setdefault("application_decision", decision)
    result.setdefault("score_explanation", score_reason)
    result.setdefault(
        "resume_evidence",
        [
            {
                "capability": item.get("advantage", "相关能力") if isinstance(item, dict) else str(item),
                "resume_evidence": item.get("evidence", resume_snippet) if isinstance(item, dict) else resume_snippet,
                "strength": "strong" if score >= 75 else "medium",
            }
            for item in advantages[:4]
        ]
        or [
            {
                "capability": "可迁移经历",
                "resume_evidence": resume_snippet,
                "strength": "medium",
            }
        ],
    )
    result.setdefault(
        "gap_severity",
        [
            {
                "gap": item.get("gap", "岗位关键能力表达不足") if isinstance(item, dict) else str(item),
                "severity": item.get("severity", "中") if isinstance(item, dict) else "中",
                "impact": item.get("impact", "可能影响简历筛选或面试追问") if isinstance(item, dict) else "可能影响简历筛选或面试追问",
                "fix": item.get("mitigation", "补充项目证据并用 JD 关键词重写经历") if isinstance(item, dict) else "补充项目证据并用 JD 关键词重写经历",
            }
            for item in gaps[:4]
        ],
    )
    result.setdefault(
        "resume_rewrite_suggestions",
        [
            "将项目描述改成「动作 + 技术选择 + 业务/效果指标」结构。",
            "把目标岗位高频关键词自然放入项目经历，而不是集中堆在技能栏。",
            "补充一条能证明端到端落地能力的经历，包括数据、模型、部署或协作结果。",
        ],
    )
    result.setdefault(
        "interview_risks",
        [
            "面试官可能追问项目是否真实落地、你负责的边界和最终效果。",
            "如果简历只写工具名，可能被追问技术选择、失败案例和优化过程。",
        ],
    )
    return result
