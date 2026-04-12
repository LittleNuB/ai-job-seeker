"""JD解析服务：Prompt工程 + 结果解析"""

JD_SYSTEM_PROMPT = """你是一位拥有10年经验的AI行业资深技术招聘专家。你深谙AI行业各类岗位的真实需求，能从JD文字背后读出团队真正想要什么样的人。

你的分析必须基于对AI行业的深刻理解，包括：
- 不同规模公司（大厂/创业公司/研究院）的招聘倾向差异
- AI岗位技术栈的真实要求vs JD中的"理想化"描述
- 面试中真正考察的能力点

请严格按指定JSON格式输出分析结果，不要添加任何格式外的内容。"""

JD_USER_PROMPT_TEMPLATE = """请分析以下AI岗位的JD，从三个维度进行深度解读：

【岗位JD】
{jd_text}

请按以下JSON格式输出：
{{
  "position_overview": {{
    "inferred_role": "推断的核心岗位角色",
    "seniority_level": "推断的职级（初级/中级/高级/专家）",
    "company_type_hint": "推断的公司类型（大厂/创业公司/研究院/外企）"
  }},
  "surface_requirements": {{
    "hard_skills": ["明确的硬技能要求1", "..."],
    "soft_skills": ["明确的软技能要求1", "..."],
    "experience": "经验年限要求",
    "education": "学历要求"
  }},
  "hidden_needs": {{
    "team_context": "团队真正面临的挑战和需要解决的问题",
    "real_priorities": ["团队实际最看重的3个能力，按优先级排序"],
    "culture_signals": ["JD中暗示的团队文化和工作方式"],
    "why_this_role": "为什么这个岗位在招人（业务扩张/技术转型/人员替换等推断）"
  }},
  "interview_focus": {{
    "likely_topics": [
      {{"topic": "面试主题", "depth": "考察深度（了解/掌握/精通）", "preparation": "准备建议"}},
      {{"topic": "面试主题", "depth": "考察深度", "preparation": "准备建议"}}
    ],
    "red_flags": ["JD中暗示的可能踩坑的点"],
    "standout_angles": ["面试中可以脱颖而出的切入点"]
  }}
}}

要求：
1. hidden_needs是分析的核心价值，必须给出有洞察的推断，不能泛泛而谈
2. interview_focus要具体可操作，而不是"准备好算法题"这种空话
3. 所有推断都要有JD文本依据，并在内心链条中明确关联"""


def build_jd_prompt(jd_text: str) -> tuple[str, str]:
    """构建JD解析的system和user prompt"""
    return JD_SYSTEM_PROMPT, JD_USER_PROMPT_TEMPLATE.format(jd_text=jd_text)


def analyze_jd(glm_client, jd_text: str) -> dict:
    """执行JD分析"""
    system_prompt, user_prompt = build_jd_prompt(jd_text)
    return glm_client.chat_with_retry(system_prompt, user_prompt, temperature=0.7)
