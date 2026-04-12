"""简历匹配服务：Prompt工程 + 结果解析"""

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
    """构建简历匹配的system和user prompt"""
    return RESUME_SYSTEM_PROMPT, RESUME_USER_PROMPT_TEMPLATE.format(
        resume_text=resume_text,
        position_details=position_details
    )


def match_resume(glm_client, resume_text: str, position_details: str) -> dict:
    """执行简历匹配分析"""
    system_prompt, user_prompt = build_resume_prompt(resume_text, position_details)
    return glm_client.chat_with_retry(system_prompt, user_prompt, temperature=0.6)
