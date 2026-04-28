"""LLM 结构化：将聚类后的 JD 归纳为标准岗位数据"""

import json
import logging
import os
import re
import time
from collections import defaultdict

from openai import OpenAI

from scraper.config import (
    GLM_API_KEY, GLM_MODEL, GLM_BASE_URL,
    TARGET_POSITIONS, POSITION_CATEGORY_MAP,
    STRUCTURED_DIR,
)

logger = logging.getLogger(__name__)

STRUCTURER_SYSTEM_PROMPT = """你是一位AI行业岗位分析师。你将收到同一岗位的多条真实JD（来自不同公司），请归纳出该岗位的通用画像。

要求：
1. must_have: 在超过60%的JD中出现的技能要求，归纳为5-7条
2. nice_to_have: 出现频率较低但有价值的技能，归纳为3-5条
3. tools: JD中明确提到的工具/框架，归纳为5-8个
4. salary_range: 根据JD薪资数据统计（取中位数区间），单位为万/年
5. 所有字段必须是归纳总结，不是复制某一条JD
6. career_path 按初中级/中级/中高级/高级/专家/管理路线给出
7. related_positions 只填已有的岗位ID，不要编造
8. common_interview_topics 给5个具体可操作的面试主题

请严格按指定JSON格式输出，不要添加任何格式外的内容。"""

STRUCTURER_USER_TEMPLATE = """请分析以下{position_name}岗位的{count}条真实JD，归纳出该岗位的标准画像：

【岗位名称】{position_name}
【JD样本】
{jd_samples}

请按以下JSON格式输出：
{{
  "name": "标准中文岗位名",
  "name_en": "English Title",
  "level": "主流职级（初中级/中级/中高级/高级/专家）",
  "summary": "一句话概述（30字内）",
  "positioning": "在AI产品链路中的定位（50字内）",
  "capability_requirements": {{
    "must_have": ["必备技能1", "必备技能2", "必备技能3", "必备技能4", "必备技能5"],
    "nice_to_have": ["加分技能1", "加分技能2", "加分技能3"],
    "tools": ["工具1", "工具2", "工具3", "工具4", "工具5"]
  }},
  "career_path": {{
    "junior": "初级岗位描述（含年限）",
    "mid": "中级岗位描述（含年限）",
    "senior": "高级岗位描述（含年限）",
    "leadership": "管理岗描述（含年限）"
  }},
  "salary_range": {{
    "junior": {{"min": 数字, "max": 数字, "unit": "万/年", "city_tier": "一线城市"}},
    "mid": {{"min": 数字, "max": 数字, "unit": "万/年", "city_tier": "一线城市"}},
    "senior": {{"min": 数字, "max": 数字, "unit": "万/年", "city_tier": "一线城市"}}
  }},
  "industry_trends": "行业趋势（100字内）",
  "related_positions": ["关联岗位id1", "关联岗位id2"],
  "common_interview_topics": ["面试主题1", "面试主题2", "面试主题3", "面试主题4", "面试主题5"]
}}"""

# JD 不足时的降级 Prompt
FALLBACK_USER_TEMPLATE = """你没有收到足够的真实JD样本，请基于你对AI行业的专业知识，为{position_name}岗位生成标准画像。

请确保：
1. must_have 和 nice_to_have 基于该岗位的真实行业要求
2. salary_range 参考同类AI岗位的市场行情
3. 所有内容必须真实可信，不能编造不存在的技能或工具

【岗位名称】{position_name}
【参考信息】{reference_info}

请按以下JSON格式输出：
{{
  "name": "标准中文岗位名",
  "name_en": "English Title",
  "level": "主流职级",
  "summary": "一句话概述（30字内）",
  "positioning": "在AI产品链路中的定位（50字内）",
  "capability_requirements": {{
    "must_have": ["必备技能1", "必备技能2", "必备技能3", "必备技能4", "必备技能5"],
    "nice_to_have": ["加分技能1", "加分技能2", "加分技能3"],
    "tools": ["工具1", "工具2", "工具3", "工具4", "工具5"]
  }},
  "career_path": {{
    "junior": "初级岗位描述（含年限）",
    "mid": "中级岗位描述（含年限）",
    "senior": "高级岗位描述（含年限）",
    "leadership": "管理岗描述（含年限）"
  }},
  "salary_range": {{
    "junior": {{"min": 数字, "max": 数字, "unit": "万/年", "city_tier": "一线城市"}},
    "mid": {{"min": 数字, "max": 数字, "unit": "万/年", "city_tier": "一线城市"}},
    "senior": {{"min": 数字, "max": 数字, "unit": "万/年", "city_tier": "一线城市"}}
  }},
  "industry_trends": "行业趋势（100字内）",
  "related_positions": ["关联岗位id1", "关联岗位id2"],
  "common_interview_topics": ["面试主题1", "面试主题2", "面试主题3", "面试主题4", "面试主题5"]
}}"""


class PositionStructurer:
    """LLM 驱动的岗位数据结构化"""

    def __init__(self):
        if not GLM_API_KEY:
            raise ValueError("GLM_API_KEY 未配置，请在 .env 中设置")
        self.client = OpenAI(api_key=GLM_API_KEY, base_url=GLM_BASE_URL)
        self.model = GLM_MODEL

    def structure_all(self, clusters: dict[str, list[dict]]) -> list[dict]:
        """批量结构化所有岗位聚类"""
        results = []
        total = len(clusters)

        for i, (position_id, jd_list) in enumerate(clusters.items(), 1):
            position_name = TARGET_POSITIONS.get(position_id, position_id)
            logger.info(f"[{i}/{total}] 结构化: {position_name} ({len(jd_list)} 条JD)")

            try:
                if len(jd_list) >= 3:
                    structured = self._structure_from_jds(position_id, position_name, jd_list)
                else:
                    structured = self._structure_fallback(position_id, position_name, jd_list)

                structured["id"] = position_id
                results.append(structured)
                logger.info(f"  ✓ {position_name} 完成")
            except Exception as e:
                logger.error(f"  ✗ {position_name} 失败: {e}")
                continue

            # API 调用间隔
            time.sleep(2)

        self._save_structured(results)
        return results

    def _structure_from_jds(self, position_id: str, position_name: str,
                            jd_list: list[dict]) -> dict:
        """从真实 JD 归纳结构化数据"""
        # 最多取 10 条 JD，控制 token
        samples = jd_list[:10]
        jd_samples = self._format_jd_samples(samples)

        # 统计薪资
        salary_stats = self._aggregate_salaries(jd_list)
        salary_context = ""
        if salary_stats:
            salary_context = f"\n【薪资统计参考】{json.dumps(salary_stats, ensure_ascii=False)}"

        user_prompt = STRUCTURER_USER_TEMPLATE.format(
            position_name=position_name,
            count=len(samples),
            jd_samples=jd_samples,
        ) + salary_context

        result = self._call_llm(STRUCTURER_SYSTEM_PROMPT, user_prompt)

        # 用统计薪资覆盖 LLM 生成的薪资（如果有的话）
        if salary_stats:
            result["salary_range"] = salary_stats

        return result

    def _structure_fallback(self, position_id: str, position_name: str,
                            jd_list: list[dict]) -> dict:
        """JD 不足时的降级策略：LLM 基于行业知识生成"""
        reference_info = ""
        if jd_list:
            # 即使只有 1-2 条也提供参考
            reference_info = f"仅有 {len(jd_list)} 条JD参考：\n"
            for jd in jd_list[:2]:
                reference_info += f"- {jd.get('title', '')} @ {jd.get('company', '')}: {jd.get('jd_text', '')[:300]}\n"

        user_prompt = FALLBACK_USER_TEMPLATE.format(
            position_name=position_name,
            reference_info=reference_info,
        )

        result = self._call_llm(STRUCTURER_SYSTEM_PROMPT, user_prompt)

        # 用统计薪资覆盖（如果有）
        salary_stats = self._aggregate_salaries(jd_list)
        if salary_stats:
            result["salary_range"] = salary_stats

        return result

    # ──── LLM 调用 ────

    def _call_llm(self, system_prompt: str, user_prompt: str,
                  max_retries: int = 2) -> dict:
        """调用 GLM API 并解析 JSON 响应"""
        last_error = None
        for attempt in range(max_retries + 1):
            try:
                if attempt > 0:
                    user_prompt += "\n\n【重要】请严格只输出JSON，不要包含任何其他文字或markdown格式。"

                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    temperature=0.5,
                    max_tokens=4096,
                )
                raw = response.choices[0].message.content
                return parse_json_response(raw)
            except (json.JSONDecodeError, ValueError) as e:
                last_error = e
                if attempt < max_retries:
                    time.sleep(1)

        raise RuntimeError(f"LLM 返回非预期格式: {last_error}")

    # ──── 工具方法 ────

    def _format_jd_samples(self, jd_list: list[dict]) -> str:
        """格式化 JD 样本供 LLM 分析"""
        parts = []
        for i, jd in enumerate(jd_list, 1):
            salary = jd.get("salary", "")
            company = jd.get("company", "")
            title = jd.get("title", "")
            text = jd.get("jd_text", "")
            # 截取每条 JD 最多 500 字
            text = text[:500] + ("..." if len(text) > 500 else "")
            parts.append(f"[JD{i}] {title} @ {company} ({salary})\n{text}")
        return "\n\n".join(parts)

    def _aggregate_salaries(self, jd_list: list[dict]) -> dict | None:
        """从 JD 薪资数据统计各职级薪资范围"""
        level_salaries = defaultdict(list)

        for jd in jd_list:
            parsed = jd.get("salary_parsed")
            level = jd.get("level", "mid")
            if parsed and parsed.get("min") and parsed.get("max"):
                level_salaries[level].append(parsed)

        if not level_salaries:
            return None

        result = {}
        for level in ["junior", "mid", "senior"]:
            sals = level_salaries.get(level, [])
            if len(sals) >= 2:
                mins = [s["min"] for s in sals]
                maxs = [s["max"] for s in sals]
                result[level] = {
                    "min": int(round(sum(mins) / len(mins))),
                    "max": int(round(sum(maxs) / len(maxs))),
                    "unit": "万/年",
                    "city_tier": "一线城市",
                }

        # 如果某些级别数据不足，用已有数据推断
        if result and len(result) < 3:
            if "junior" not in result and "mid" in result:
                mid = result["mid"]
                result["junior"] = {"min": int(mid["min"] * 0.6), "max": int(mid["max"] * 0.6),
                                    "unit": "万/年", "city_tier": "一线城市"}
            if "senior" not in result and "mid" in result:
                mid = result["mid"]
                result["senior"] = {"min": int(mid["min"] * 1.6), "max": int(mid["max"] * 1.6),
                                    "unit": "万/年", "city_tier": "一线城市"}

        return result if result else None

    def _save_structured(self, positions: list[dict]):
        """保存结构化数据"""
        os.makedirs(STRUCTURED_DIR, exist_ok=True)
        filepath = os.path.join(STRUCTURED_DIR, "structured_positions.json")
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(positions, f, ensure_ascii=False, indent=2)
        logger.info(f"结构化数据已保存: {filepath} ({len(positions)} 个岗位)")


def parse_json_response(text: str) -> dict:
    """三级 fallback 解析 JSON（复用项目的解析逻辑）"""
    text = text.strip()

    # Level 1: 直接解析
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Level 2: 提取 markdown 代码块中的 JSON
    code_block_pattern = r"```(?:json)?\s*\n?(.*?)\n?\s*```"
    matches = re.findall(code_block_pattern, text, re.DOTALL)
    for match in matches:
        try:
            return json.loads(match.strip())
        except json.JSONDecodeError:
            continue

    # Level 3: 正则提取最外层花括号内容
    brace_pattern = r"\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}"
    matches = re.findall(brace_pattern, text, re.DOTALL)
    for match in matches:
        try:
            return json.loads(match)
        except json.JSONDecodeError:
            continue

    raise ValueError("无法从 LLM 响应中解析出 JSON")
