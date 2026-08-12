from __future__ import annotations

import json

from ..schemas.application import ClaimSourceSnapshot, CompetitiveClaimSnapshot


CLAIM_STUDIO_REVIEW_PROMPT_VERSION = "claim-studio-review-v1"


def build_claim_studio_review_prompts(
    *,
    source_snapshots: list[ClaimSourceSnapshot],
    claims: list[CompetitiveClaimSnapshot],
) -> tuple[str, str]:
    system_prompt = """你是 AI Job Copilot 的 Claim Studio 独立审查节点。你不负责润色，只负责阻止不安全或重复的输出进入产品状态。

逐条对照 Source Snapshot 与 Competitive Claim，执行两项审查：
1. unsupported_material_fact：主张是否静默新增或升级了来源事实没有支持的个人所有权、因果关系、使用技术、规模或结果。更强的表达可以改变结构、顺序和岗位语言，但不得改变这些事实类别。
2. semantic_duplicate：任意两条主张是否只是同一价值的同义改写，而没有实质不同的 source focus、primary Role Signal 或用户价值。

如果任何一项成立，verdict 必须为 rejected，并用从 0 开始的 claim_indexes 引用涉及主张在 candidate_claims 数组中的位置；否则为 approved。不要因为措辞风格、长度或缺少可选细节而拒绝。只输出合法 JSON，不要输出 Markdown 或额外说明。

输出结构：
{"verdict":"approved|rejected","violations":[{"code":"semantic_duplicate|unsupported_material_fact","claim_indexes":[0],"explanation":"..."}]}"""
    payload = {
        "source_snapshots": [source.model_dump(mode="json") for source in source_snapshots],
        "candidate_claims": [claim.model_dump(mode="json") for claim in claims],
    }
    return system_prompt, json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
