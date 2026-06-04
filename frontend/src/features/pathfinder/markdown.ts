import { assertSafePathfinderCopy } from "./content-guard";
import {
  createAntiPackagingCheck,
  createMarkdownSnapshot,
  evaluateMarkdownAntiPackaging,
  getRequiredMarkdownSections,
} from "./contract";
import {
  forbiddenClaimsNotice,
  markdownExportItems,
  pageCopy,
  portfolioPolishBoundary,
  traceChain,
} from "./data";
import type {
  MarkdownInput,
  MarkdownResult,
  TrialQuestionId,
} from "./types";

export function getMissingQuestionIds(input: {
  trialQuestions: { id: TrialQuestionId }[];
  trialAnswers: Partial<Record<TrialQuestionId, string>>;
}): TrialQuestionId[] {
  return input.trialQuestions
    .filter((question) => !input.trialAnswers[question.id]?.trim())
    .map((question) => question.id);
}

export function generatePathfinderMarkdown(
  input: MarkdownInput,
): MarkdownResult {
  const missingQuestionIds = getMissingQuestionIds(input);

  if (missingQuestionIds.length > 0) {
    return {
      ok: false,
      reason: "missing_questions",
      missingQuestionIds,
      antiPackagingCheck: createAntiPackagingCheck("", getRequiredMarkdownSections("")),
    };
  }

  const answers = input.trialAnswers as Record<TrialQuestionId, string>;

  const markdown = [
    "# 寻径星图航迹表",
    renderCandidateProfile(input),
    renderPathConclusion(input),
    renderSampleJdNotice(input),
    renderOpenSource(input),
    renderOriginalCapabilities(input),
    renderCandidateContribution(input),
    renderForbiddenClaims(),
    renderSixQuestions(input, answers),
    renderResultModules(input),
    renderDisclaimer(input),
  ].join("\n\n");

  const antiPackagingCheck = evaluateMarkdownAntiPackaging(markdown);

  if (!antiPackagingCheck.exportAllowed) {
    return {
      ok: false,
      reason: "anti_packaging_blocked",
      markdown,
      missingQuestionIds: [],
      antiPackagingCheck,
      draftSnapshot: createMarkdownSnapshot(markdown, "draft"),
    };
  }

  assertSafePathfinderCopy(markdown);

  return {
    ok: true,
    filename: "pathfinder-xiaoc-opendocuments.md",
    markdown,
    antiPackagingCheck,
    snapshot: createMarkdownSnapshot(markdown, "full"),
  };
}

function renderCandidateProfile(input: MarkdownInput): string {
  const { profile } = input;

  return [
    "## 候选人背景",
    `- 候选人：${profile.name}`,
    `- 身份：${profile.identity}`,
    `- 背景：${profile.background.join("；")}`,
    `- 技术基础：${profile.technicalBasics.join("；")}`,
    `- 短板：${profile.weaknesses.join("；")}`,
    `- 目标：${profile.goals.join("；")}`,
  ].join("\n");
}

function renderPathConclusion(input: MarkdownInput): string {
  return [
    "## 星图路径结论",
    `- 推荐路径：${input.selectedPath.title}`,
    `- 状态：${input.selectedPath.statusLabel}`,
    `- 结论：${input.selectedPath.summary}`,
    "",
    ...input.selectedPath.evidence.flatMap((evidence) => [
      `### ${evidence.title}`,
      ...evidence.points.map((point) => `- ${point}`),
      "",
    ]),
  ]
    .join("\n")
    .trim();
}

function renderSampleJdNotice(input: MarkdownInput): string {
  return [
    "## 样例 JD 说明",
    input.sampleJdNotice,
    "",
    ...input.sampleJds.map(
      (jd) =>
        `- ${jd.title}：${jd.statusLabel}。${jd.scenario} ${jd.gapOrAdvice.join("；")}`,
    ),
  ].join("\n");
}

function renderOpenSource(input: MarkdownInput): string {
  const { openSourceProject } = input;

  return [
    "## OpenDocuments 来源与 License",
    `- 项目名称：${openSourceProject.name}`,
    `- 项目来源：${openSourceProject.sourceUrl}`,
    `- License：${openSourceProject.license}`,
    `- 项目定位：${openSourceProject.positioning}`,
  ].join("\n");
}

function renderOriginalCapabilities(input: MarkdownInput): string {
  return [
    "## OpenDocuments 原项目能力",
    "以下为公开项目信息中的原项目能力，只作为小 C 试航理解的参考来源，不作为小 C 的个人产出。",
    ...input.openSourceProject.originalCapabilities.map(
      (capability) => `- ${capability}`,
    ),
  ].join("\n");
}

function renderCandidateContribution(input: MarkdownInput): string {
  return [
    "## 小 C 试航贡献",
    "小 C 的贡献限定为基于公开项目信息完成产品拆解、岗位连接和试点方案草稿。",
    ...input.portfolioDraft.outputs.map((output) => `- ${output}`),
  ].join("\n");
}

function renderForbiddenClaims(): string {
  return [
    "## 不可声称内容",
    forbiddenClaimsNotice,
    "",
    "- 不能声称参与 OpenDocuments 原仓库开发。",
    "- 不能声称有官方贡献记录。",
    "- 不能把试航记录表述为能力认证。",
    "- 不能预测录用结果。",
    "- 不能把公开项目能力写成小 C 的个人开发成果。",
    "- 不能把 2 周 MVP 试点设计说成企业级上线系统。",
  ].join("\n");
}

function renderSixQuestions(
  input: MarkdownInput,
  answers: Record<TrialQuestionId, string>,
): string {
  return [
    "## 固定 6 问作答",
    ...input.trialQuestions.flatMap((question, index) => [
      `### ${index + 1}. ${question.title}`,
      `问题：${question.prompt}`,
      `小 C 作答：${answers[question.id]}`,
      "",
    ]),
  ]
    .join("\n")
    .trim();
}

function renderResultModules(input: MarkdownInput): string {
  return [
    "## 航迹表摘要",
    "- 试航对象：OpenDocuments",
    `- 推荐路径：${input.selectedPath.title}`,
    "- 试航主题：工程企业知识库 AI 助手",
    "- 输入来源：小 C 背景 + 3 条样例 JD + OpenDocuments 原项目能力",
    "- 输出结果：作品集一页纸草稿 + 指标表 + 风险清单",
    "",
    "## 作品集一页纸草稿",
    `- 标题：${input.portfolioDraft.title}`,
    `- 作者：${input.portfolioDraft.author}`,
    `- 目标岗位：${input.portfolioDraft.targetRole}`,
    `- 问题背景：${input.portfolioDraft.problemBackground}`,
    `- 方案概述：${input.portfolioDraft.solutionOverview}`,
    `- MVP 范围：${input.portfolioDraft.mvpScope}`,
    `- 评估指标：${input.portfolioDraft.evaluationMetrics.join("、")}`,
    `- 我的产出：${input.portfolioDraft.outputs.join("、")}`,
    `- 边界说明：${portfolioPolishBoundary}`,
    "",
    "## 指标表",
    "| 维度 | 指标 | 试航口径 |",
    "|---|---|---|",
    ...input.metrics.map(
      (row) =>
        `| ${row.dimension} | ${row.metric} | ${row.trialCriterion} |`,
    ),
    "",
    "## 用户流程草图说明",
    "- 限定资料范围 -> 整理脱敏资料 -> 设计典型问题 -> 导入与问答测试 -> 引用核验 -> 失败案例记录 -> 输出试点报告",
    "",
    "## 风险清单",
    "| 风险 | 表现 | 建议处理 |",
    "|---|---|---|",
    ...input.risks.map(
      (row) => `| ${row.risk} | ${row.signal} | ${row.suggestion} |`,
    ),
    "",
    "## 合规表达建议",
    "可用表达：",
    ...input.complianceAdvice.allowed.map((item) => `- ${item}`),
    "",
    "回避表达：",
    ...input.complianceAdvice.avoid.map((item) => `- ${item}`),
    "",
    "## 面试追问准备",
    ...input.interviewPrep.flatMap((item) => [
      `- 问：${item.question}`,
      `  答：${item.answer}`,
    ]),
  ].join("\n");
}

function renderDisclaimer(input: MarkdownInput): string {
  return [
    "## 免责声明",
    `- 追溯链：${traceChain}`,
    `- ${pageCopy.resultBoundary}`,
    "- 本结果仅用于寻径星图 P0 Demo 和求职准备参考。",
    `- ${input.sampleJdNotice}`,
    `- ${input.openSourceProject.boundaryNotice}`,
    "- 本航迹表不是能力认证，不是官方参与记录，也不用于预测录用结果。",
    "",
    "完整 Markdown 九项：",
    ...markdownExportItems.map((item) => `- ${item}`),
  ].join("\n");
}
