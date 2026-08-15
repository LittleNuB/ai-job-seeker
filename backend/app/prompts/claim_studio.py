from __future__ import annotations

import json

from ..schemas.application import (
    ClaimSourceSnapshot,
    RoleSignalSnapshot,
    WritingPreferenceProfileSnapshot,
)


CLAIM_STUDIO_PROMPT_VERSION = "claim-studio-v2"


def build_claim_studio_prompts(
    *,
    target_role: str,
    jd_text: str,
    role_signals: list[RoleSignalSnapshot],
    source_snapshots: list[ClaimSourceSnapshot],
    writing_preference_profile: WritingPreferenceProfileSnapshot,
) -> tuple[str, str]:
    system_prompt = """你是 AI Job Copilot 的 Claim Studio 节点。

你的唯一任务是从候选人当前提供的 Experience Item 与 Base Fact 中，选择最多三个对本次 Target Application 价值最高的机会。每个机会只生成一条可直接使用的 Competitive Claim，并附上一条视觉和语义上独立的 Stretch Direction。

规则：
1. Competitive Claim 只能选择、压缩、重排、翻译和强化 Base Fact 已经蕴含的内容。不得静默升级个人所有权、因果关系、使用技术、规模或结果。
2. 每条输出必须引用一个真实 experience_item_id、一个 primary_role_signal_id，以及至少一个真实 supported_base_fact_id。不要引用未提供的 ID。
3. source_focus 用一句短语说明这条主张从该 Experience Item 的哪一部分切入；opportunity_value 说明这条主张对本次求职表达的独特价值。
4. 同一 Experience Item 可以产生多条主张，但它们必须在来源重点、主 Role Signal 或 opportunity_value 上有实质区别。拒绝同义改写和语义重复。
5. Stretch Direction 只能有一个：指出当前表述最值得补强的 Expression Gap，说明为什么对岗位重要，并给出供候选人自行回想或拓展的方向。它不是候选人的既有事实，也不是第二条简历文案。
6. 不向候选人提问，不要求追问，不虚构缺失的数字、技术、责任或结果。
7. 最多返回三条；材料只支持一条或两条时就返回更少，不得凑数。
8. 不输出匹配分、覆盖分、面试概率、录用概率或任何评分。
9. writing_preference_profile 只能改变句长、信息密度、技术细节呈现和结果位置等表达风格。偏好只能改变表达风格，绝不能增加事实，也不能放宽第 1 条的所有权、因果、技术、规模或结果边界。
10. 当偏好来源是 default，或 enabled=false 时，使用中性的版本化默认风格；不要推断未声明的隐藏偏好。
11. 只输出合法 JSON，不要输出 Markdown 或额外说明。

输出结构：
{"competitive_claims":[{"experience_item_id":"...","primary_role_signal_id":"...","source_focus":"...","opportunity_value":"...","supported_base_fact_ids":["..."],"competitive_claim":"...","stretch_direction":{"expression_gap":"...","why_it_matters":"...","expansion_direction":"..."}}]}"""
    payload = {
        "target_application": {"target_role": target_role, "jd_text": jd_text},
        "role_signals": [signal.model_dump(mode="json") for signal in role_signals],
        "experience_sources": [
            {
                "experience_item_id": source.experience_item_id,
                "item_title": source.item_title,
                "entry_context": (
                    source.entry_context.model_dump(mode="json")
                    if source.entry_context
                    else None
                ),
                "base_facts": [fact.model_dump(mode="json") for fact in source.base_facts],
            }
            for source in source_snapshots
        ],
        "writing_preference_profile": writing_preference_profile.model_dump(mode="json"),
    }
    return system_prompt, json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
