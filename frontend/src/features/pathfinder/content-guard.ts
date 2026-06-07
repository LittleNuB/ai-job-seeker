import type { AntiPackagingFinding } from "./types";

const unsafePositivePatterns: Array<{
  ruleId: string;
  pattern: RegExp;
  riskReason: string;
  suggestedRewrite: string;
}> = [
  {
    ruleId: "job_competency_claim",
    pattern: /(?:已|已经|可以|能够).{0,12}胜任/,
    riskReason: "把试航材料写成岗位胜任结论。",
    suggestedRewrite: "改为“用于路径试航和面试表达准备”。",
  },
  {
    ruleId: "ability_certification_claim",
    pattern: /(?:能力|岗位|胜任).{0,8}认证/,
    riskReason: "暗示能力认证或岗位认证。",
    suggestedRewrite: "改为“试航记录，不构成能力认证”。",
  },
  {
    ruleId: "score_claim",
    pattern: /(?:能力|胜任力|匹配).{0,6}(?:评分|打分|分数)/,
    riskReason: "暗示评分、匹配分或胜任分。",
    suggestedRewrite: "改为证据链或边界说明，不使用分数。",
  },
  {
    ruleId: "offer_probability_claim",
    pattern: /(?:offer|录用).{0,8}(?:概率|预测|几率)/i,
    riskReason: "暗示 offer 或录用概率预测。",
    suggestedRewrite: "改为“不预测求职结果”。",
  },
  {
    ruleId: "landing_probability_claim",
    pattern: /上岸.{0,6}(?:概率|预测|几率)/,
    riskReason: "暗示求职上岸概率。",
    suggestedRewrite: "改为“求职准备参考”。",
  },
  {
    ruleId: "admission_rate_claim",
    pattern: /提升.{0,8}录用.{0,4}(?:概率|几率|率)/,
    riskReason: "暗示提升录用概率或录用率。",
    suggestedRewrite: "改为“整理可追溯材料”。",
  },
  {
    ruleId: "company_screening_or_recommendation",
    pattern: /企业(?:筛选|推荐)/,
    riskReason: "暗示企业筛选或企业推荐能力。",
    suggestedRewrite: "删除企业侧筛选或推荐表述。",
  },
  {
    ruleId: "referral_claim",
    pattern: /精准内推/,
    riskReason: "暗示精准内推能力。",
    suggestedRewrite: "删除内推承诺。",
  },
  {
    ruleId: "resume_packaging_claim",
    pattern: /简历包装/,
    riskReason: "暗示简历包装。",
    suggestedRewrite: "改为“作品集表达草稿”。",
  },
  {
    ruleId: "resume_optimization_claim",
    pattern: /简历自动优化/,
    riskReason: "暗示简历自动优化。",
    suggestedRewrite: "改为“人工整理表达材料”。",
  },
  {
    ruleId: "multi_project_recommendation_claim",
    pattern: /多开源项目智能推荐/,
    riskReason: "暗示多开源项目智能推荐。",
    suggestedRewrite: "改为“固定 OpenDocuments 试航包”。",
  },
  {
    ruleId: "real_rag_claim",
    pattern: /真实 RAG 检索/,
    riskReason: "暗示当前功能执行真实 RAG 检索。",
    suggestedRewrite: "改为“基于公开项目信息的试航”。",
  },
  {
    ruleId: "complex_score_claim",
    pattern: /复杂评分系统/,
    riskReason: "暗示复杂评分系统。",
    suggestedRewrite: "改为“证据链展示”。",
  },
  {
    ruleId: "algorithm_shortcut_claim",
    pattern: /算法工程速成/,
    riskReason: "暗示算法工程速成。",
    suggestedRewrite: "改为“短期不建议主投算法方向”。",
  },
  {
    ruleId: "llm_training_path_claim",
    pattern: /大模型研发训练路径/,
    riskReason: "暗示大模型研发训练路径。",
    suggestedRewrite: "删除训练路径承诺。",
  },
  {
    ruleId: "opendocuments_contribution_claim",
    pattern: /(?:参与|贡献|维护).{0,12}OpenDocuments(?:\s|。|，|项目|仓库)/,
    riskReason: "暗示参与 OpenDocuments 原项目。",
    suggestedRewrite: "改为“基于 OpenDocuments 公开能力做产品拆解”。",
  },
  {
    ruleId: "opendocuments_ownership_claim",
    pattern: /OpenDocuments.{0,8}(?:是|属于).{0,4}(?:我|我的)/,
    riskReason: "暗示 OpenDocuments 属于个人项目。",
    suggestedRewrite: "改为“OpenDocuments 是公开参考项目”。",
  },
  {
    ruleId: "xiaoc_developed_opendocuments_claim",
    pattern: /小 C.{0,8}开发.{0,8}OpenDocuments/,
    riskReason: "把公开项目能力写成小 C 开发成果。",
    suggestedRewrite: "改为“小 C 做场景拆解和试航方案”。",
  },
  {
    ruleId: "enterprise_rag_claim",
    pattern: /(?:完成|开发).{0,8}企业级 RAG 系统/,
    riskReason: "把试航草稿写成企业级 RAG 系统交付。",
    suggestedRewrite: "改为“2 周 MVP 试点设计”。",
  },
  {
    ruleId: "algorithm_capability_claim",
    pattern: /具备.{0,8}算法研发能力/,
    riskReason: "暗示算法研发能力背书。",
    suggestedRewrite: "改为“对 RAG 产品流程有初步理解”。",
  },
  {
    ruleId: "first_person_project_claim",
    pattern: /我(?:开发|做了).{0,12}(?:OpenDocuments|企业 RAG 系统)/,
    riskReason: "第一人称声称开发原项目或企业 RAG 系统。",
    suggestedRewrite: "改为“我完成了试航方案、指标和风险清单”。",
  },
  {
    ruleId: "ai_replaces_review_claim",
    pattern: /AI.{0,10}替代.{0,12}(?:人工复核|专业审核)/,
    riskReason: "暗示 AI 替代专业复核。",
    suggestedRewrite: "改为“合同、规范和施工方案需人工复核”。",
  },
  {
    ruleId: "official_contribution_claim",
    pattern: /官方贡献/,
    riskReason: "暗示官方贡献记录。",
    suggestedRewrite: "改为“不是官方贡献记录”。",
  },
];

const safeNegation =
  /不|不得|不能|不可|禁止|回避|避免|不是|并非|不表述为|不声称|非具体公司|不可声称|没有|不得写成|只作为|只用于|不构成/;

export function assertSafePathfinderCopy(copy: string): void {
  const failingLines = getAntiPackagingFindings(copy)
    .filter((finding) => finding.context === "positive_claim")
    .map((finding) => finding.matchedText);

  if (failingLines.length > 0) {
    throw new Error(`Unsafe Pathfinder copy:\n${failingLines.join("\n")}`);
  }
}

export function getAntiPackagingFindings(copy: string): AntiPackagingFinding[] {
  return copy
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) =>
      unsafePositivePatterns
        .filter(({ pattern }) => pattern.test(line))
        .map(({ ruleId, riskReason, suggestedRewrite }) => {
          const negated = safeNegation.test(line);
          return {
            ruleId,
            riskLevel: negated ? "info" : "blocking",
            matchedText: line,
            riskReason,
            suggestedRewrite,
            blockingPolicy: negated ? "none" : "block_full_markdown_export",
            context: negated ? "allowed_context" : "positive_claim",
          } satisfies AntiPackagingFinding;
        }),
    );
}

export function stringifyForCopyCheck(value: unknown): string {
  return JSON.stringify(value, null, 2);
}
