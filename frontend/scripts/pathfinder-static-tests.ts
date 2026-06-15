import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildConfirmedUserProfileFromSignals,
  buildFallbackInterviewSession,
  buildFallbackInterviewSignals,
  buildFallbackInterviewTurn,
  buildFallbackRecommendationResponse,
  buildFallbackTrialPackageResponse,
  createMarkdownInput,
  emptyUserProfile,
  forbiddenClaimsNotice,
  isUserProfileReady,
  markdownExportItems,
  pageCopy,
  priorityPathId,
  sampleJdNotice,
  sampleJds,
  trialQuestionImpacts,
  trialQuestions,
  userProfileFields,
} from "../src/features/pathfinder/data";
import {
  assertSafePathfinderCopy,
  stringifyForCopyCheck,
} from "../src/features/pathfinder/content-guard";
import {
  createInitialPathfinderState,
  createMarkdownSnapshot,
  createTrialAnswers,
  evaluateTrialAnswersAntiPackaging,
  missingQuestionIdsFromAnswers,
  p1aTrialPackage,
  pathfinderSchemaVersion,
  requiredMarkdownSectionLabels,
  requiredTrialQuestionIds,
} from "../src/features/pathfinder/contract";
import { generatePathfinderMarkdown } from "../src/features/pathfinder/markdown";
import type {
  OpenSourceProjectRecord,
  TrialQuestionId,
  UserProfileInput,
} from "../src/features/pathfinder/types";

const userVisibleEngineeringPatterns: Array<{ label: string; pattern: RegExp }> = [
  { label: "API", pattern: /\bAPI\b/ },
  { label: "后端", pattern: /后端/ },
  { label: "前端", pattern: /前端/ },
  { label: "不新增", pattern: /不新增/ },
  { label: "占位", pattern: /占位/ },
  { label: "fallback", pattern: /fallback/i },
  { label: "mock", pattern: /mock/i },
  { label: "schema", pattern: /schema/i },
  { label: "fixture", pattern: /fixture/i },
  { label: "P1-D", pattern: /P1-D/i },
  { label: "P1-C", pattern: /P1-C/i },
  { label: "实现范围", pattern: /实现范围/ },
  { label: "低摩擦入口心智", pattern: /低摩擦入口心智/ },
  { label: "低摩擦", pattern: /低摩擦/ },
  { label: "本轮", pattern: /本轮/ },
  { label: "运行逻辑", pattern: /运行逻辑/ },
  { label: "migration", pattern: /migration/i },
];

function assertNoUserVisibleEngineeringTerms(copy: string, context: string) {
  const failures = copy
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) =>
      userVisibleEngineeringPatterns
        .filter(({ pattern }) => pattern.test(line))
        .map(({ label }) => `${label}: ${line}`),
    );

  assert.deepEqual(
    failures,
    [],
    `${context} contains user-visible engineering terms`,
  );
}

function extractPotentialVisibleCopyFromSource(source: string): string {
  const fragments: string[] = [];
  const stringPattern = /(["'`])((?:\\.|(?!\1)[\s\S])*?)\1/g;
  let stringMatch: RegExpExecArray | null;
  while ((stringMatch = stringPattern.exec(source)) !== null) {
    const fragment = stringMatch[2]
      .replace(/\\n/g, "\n")
      .replace(/\\"/g, '"')
      .replace(/\\'/g, "'");
    if (/[\u4e00-\u9fffA-Za-z]/.test(fragment)) {
      fragments.push(fragment);
    }
  }

  const jsxTextPattern = />\s*([^<>{}\n][^<>{}]*)\s*</g;
  let jsxMatch: RegExpExecArray | null;
  while ((jsxMatch = jsxTextPattern.exec(source)) !== null) {
    const fragment = jsxMatch[1].replace(/\s+/g, " ").trim();
    if (/[\u4e00-\u9fffA-Za-z]/.test(fragment)) {
      fragments.push(fragment);
    }
  }

  return fragments.join("\n");
}

const routedPathfinderCopy = [
  "src/features/pathfinder/p1d-pages.tsx",
  "src/features/pathfinder/components.tsx",
].map((filePath) =>
  extractPotentialVisibleCopyFromSource(readFileSync(filePath, "utf8")),
).join("\n");
const p1dPagesSource = readFileSync(
  "src/features/pathfinder/p1d-pages.tsx",
  "utf8",
);
const roleStarPointsSource =
  p1dPagesSource.match(
    /const roleStarPoints: RoleStarPoint\[\] = \[([\s\S]*?)\];/,
  )?.[1] ?? "";
const roleStarTitles = Array.from(
  roleStarPointsSource.matchAll(/title:\s*"([^"]+)"/g),
  (match) => match[1],
);
const roleStarOrbits = Array.from(
  roleStarPointsSource.matchAll(/orbit:\s*([1-4])/g),
  (match) => Number(match[1]),
);
const expectedRoleStarTitles = [
  "AI 产品经理（AI应用方向）",
  "数据产品经理（AI数据方向）",
  "AI解决方案架构师",
  "AI应用实施顾问",
  "AI应用开发工程师",
  "RAG工程师",
  "Agent应用开发工程师",
  "MLOps/AI平台工程师",
  "LLM评测工程师",
  "AI数据标注与质检专家",
  "AI数据分析师",
  "AI运营/增长专家",
];
const retiredRoleStarTitles = [
  "大模型应用工程师",
  "数据标注质检专家",
  "模型反馈分析师",
  "AI 项目经理（交付方向）",
];

const expectedQuestions: Array<{ id: TrialQuestionId; prompt: string }> = [
  {
    id: "project_understanding",
    prompt: "这个开源项目主要解决什么问题？输入和输出是什么？",
  },
  {
    id: "role_connection",
    prompt: "它能帮助你理解哪些 AI 产品或行业解决方案岗位工作？",
  },
  {
    id: "scenario_gap",
    prompt:
      "如果放到工程企业资料、规范、合同或施工方案管理场景中，还缺什么？",
  },
  {
    id: "application_solution",
    prompt: "你会如何设计一个面向工程企业的 2 周试点 MVP？",
  },
  {
    id: "portfolio_extension",
    prompt: "如果把这次试航做成作品集草稿，你会包含哪些部分？",
  },
  {
    id: "ai_usage_explanation",
    prompt: "你是否使用 AI 辅助？AI 帮你做了什么？你如何筛选和修改？",
  },
];

const validUserProfile: UserProfileInput = {
  displayName: "测试候选人",
  professionalBackground: "机械工程背景，做过设备资料整理和项目协作。",
  jobTarget: "希望试航行业 AI 应用产品助理方向。",
  timeline: "计划 3 个月内完成作品集并开始投递。",
  projectExperience: "做过工艺文档整理、跨团队需求沟通和报告撰写。",
  aiToolExperience: "使用 AI 辅助整理资料和草拟提纲，最终人工核验。",
  technicalBasics: "了解基础 Python、数据清洗、文档系统和 RAG 概念。",
  currentConfusion: "不确定如何把行业经验转成 AI 产品证据。",
  constraints: "不能使用真实企业内部资料，只能用脱敏或公开样例。",
};

const validTrialAnswers: Partial<Record<TrialQuestionId, string>> = {
  project_understanding:
    "OpenDocuments 主要解决企业资料分散、检索成本高、问答缺少来源依据的问题。",
  role_connection:
    "它能帮助我理解 AI 知识库、文档问答和行业 AI 产品助理的需求拆解任务。",
  scenario_gap:
    "放到工程企业场景中还需要权限、脱敏、术语表、引用核验和人工复核节点。",
  application_solution:
    "我会设计一个 2 周试点，先限定资料范围，再整理问题、导入资料、测试问答并记录风险。",
  portfolio_extension:
    "作品集会包含背景、目标用户、MVP 范围、流程图、指标表、风险清单和边界说明。",
  ai_usage_explanation:
    "AI 用于辅助整理公开信息和草拟结构，最终内容由我筛选、核验和改写。",
};

const chatwootProject: OpenSourceProjectRecord = {
  projectId: "chatwoot",
  name: "Chatwoot",
  sourceUrl: "https://github.com/chatwoot/chatwoot",
  officialUrl: "https://www.chatwoot.com/",
  host: "github",
  repositoryVisibility: "public",
  description: "Open-source customer support platform.",
  license:
    "MIT Expat outside enterprise directory; enterprise directory has separate license",
  licenseSpdxId: "MIT",
  licenseVerificationStatus: "verified",
  licenseVerifiedAt: "2026-06-11",
  referenceRole: "reference_only",
  status: "approved_for_trial_package",
  rolePathIds: ["industry-ai-product-assistant"],
  projectTags: ["customer_support_assistant"],
  capabilityTags: ["scenario_mapping", "handoff_checklist"],
  riskTags: ["attribution_risk", "sensitive_data_risk"],
  publicCapabilities: [
    "live chat",
    "email support",
    "conversation management across channels",
  ],
  sourceBoundary:
    "已审计项目库 / 当前样本参考；Chatwoot enterprise 目录有单独 License 边界。",
  notClaimed: ["不声明用户参与 Chatwoot 原仓库。"],
  forbiddenClaims: [
    "不得声明用户开发或部署 Chatwoot。",
    "不得忽略 enterprise 目录单独 License 边界。",
  ],
  allowedContexts: [
    "基于 Chatwoot 公开信息设计客服流程和工单试航。",
    "用户产出是 SOP、分类、话术和反馈流程。",
  ],
};

assert.deepEqual(
  trialQuestions.map((question) => ({
    id: question.id,
    prompt: question.prompt,
  })),
  expectedQuestions,
  "trialQuestions must use the fixed six questions",
);

assert.equal(pathfinderSchemaVersion, "p1-a.v1");
assert.equal(createInitialPathfinderState().backendSync.status, "local_only");
assert.equal(createInitialPathfinderState().profileSubmitted, false);
assert.equal(createInitialPathfinderState().interviewSessionId, undefined);
assert.deepEqual(createInitialPathfinderState().interviewMessages, []);
assert.deepEqual(createInitialPathfinderState().extractedSignals, []);
assert.equal(createInitialPathfinderState().signalConfirmationStatus, "not_started");
assert.equal(createInitialPathfinderState().aiInterviewStatus, "idle");
assert.deepEqual(createInitialPathfinderState().resumeParse, {
  status: "idle",
  missingSignalTypes: [],
});
assert.deepEqual(createInitialPathfinderState().trailRecord.userProfileSnapshot, emptyUserProfile);
assert.deepEqual(
  createInitialPathfinderState().trailRecord.trialAnswers.map((answer) => answer.answer),
  ["", "", "", "", "", ""],
);
assert.equal(p1aTrialPackage.id, "p1a-opendocuments-engineering-kb");
assert.equal(p1aTrialPackage.targetUser, "真实用户输入");
assert.equal(p1aTrialPackage.version, "1.0.0");
assert.equal(p1aTrialPackage.sourceProject.role, "reference_only");
assert.deepEqual(
  p1aTrialPackage.questionIds,
  expectedQuestions.map((question) => question.id),
);

const fallbackRecommendation = buildFallbackRecommendationResponse(validUserProfile);
assert.equal(fallbackRecommendation.schemaVersion, "p1b.v1");
assert.equal(fallbackRecommendation.source, "fallback_mock");
assert.equal(fallbackRecommendation.paths.length, 4);
assert.equal(
  fallbackRecommendation.paths.some(
    (path) =>
      path.pathId === "algorithm-llm-engineer" &&
      path.decision === "not_recommended_short_term",
  ),
  true,
);
assert.equal(
  fallbackRecommendation.projectMatches.every(
    (match) => match.projectId === "opendocuments",
  ),
  true,
);
const fallbackPackage = buildFallbackTrialPackageResponse({
  recommendationResponse: fallbackRecommendation,
  selectedPathId: "industry-ai-product-assistant",
  selectedProjectId: "opendocuments",
});
assert.equal(fallbackPackage.source, "fallback_mock");
assert.equal(fallbackPackage.trialPackageCandidate.trialPackageId, p1aTrialPackage.id);
assert.equal(
  fallbackPackage.trialPackageCandidate.sourceProject.status,
  "approved_for_trial_package",
);
assert.deepEqual(requiredTrialQuestionIds, p1aTrialPackage.questionIds);
const genericTrialAnswers = createTrialAnswers(
  {
    application_solution: "我会先限定试航范围，再拆成两周内可验证的交付步骤。",
    portfolio_extension: "作品集只呈现我的试航产出，不声明参与原项目。",
  },
  undefined,
  [
    { questionId: "application_solution", prompt: "如何规划一次小范围 MVP？" },
    { questionId: "portfolio_extension", prompt: "作品集边界如何说明？" },
    { questionId: "ai_usage_explanation", prompt: "AI 如何辅助？" },
  ],
);
assert.deepEqual(
  genericTrialAnswers.map((answer) => answer.id),
  ["application_solution", "portfolio_extension", "ai_usage_explanation"],
);
assert.deepEqual(missingQuestionIdsFromAnswers(genericTrialAnswers), [
  "ai_usage_explanation",
]);
assert.equal(
  Object.prototype.hasOwnProperty.call(
    requiredMarkdownSectionLabels,
    "user_trial_contribution",
  ),
  true,
);
assert.equal(
  Object.prototype.hasOwnProperty.call(
    requiredMarkdownSectionLabels,
    "xiaoc_trial_contribution",
  ),
  false,
);

const initialPortfolioDraft =
  createInitialPathfinderState().trailRecord.portfolioDraft;
assert.equal(
  initialPortfolioDraft?.sourceProjectReference.name,
  "OpenDocuments",
);
assert.deepEqual(
  initialPortfolioDraft?.userTrialContribution,
  initialPortfolioDraft?.xiaocTrialContribution,
  "Legacy xiaocTrialContribution is compatibility-only; userTrialContribution is the current P1-A key.",
);
assert.deepEqual(
  initialPortfolioDraft?.sourceProjectReference,
  initialPortfolioDraft?.opendocumentsReference,
  "Legacy opendocumentsReference is compatibility-only; sourceProjectReference is the current P1-A key.",
);

assert.equal(isUserProfileReady(emptyUserProfile), false);
assert.equal(isUserProfileReady(validUserProfile), true);
assert.ok(userProfileFields.length >= 9);

const fallbackInterviewSession = buildFallbackInterviewSession();
assert.equal(fallbackInterviewSession.source, "fallback_mock");
assert.equal(fallbackInterviewSession.status, "fallback");
assert.equal(fallbackInterviewSession.extractedSignals.length, 0);
const fallbackInterviewTurn = buildFallbackInterviewTurn({
  session: fallbackInterviewSession,
  answer: "我做过客服知识库整理，也用 AI 辅助整理初稿。",
});
assert.equal(
  fallbackInterviewTurn.messages.some((message) => message.role === "user"),
  true,
);
const fallbackInterviewSignals = buildFallbackInterviewSignals(fallbackInterviewTurn);
assert.equal(fallbackInterviewSignals.extractedSignals.length > 0, true);
assert.equal(
  fallbackInterviewSignals.extractedSignals.every(
    (signal) => signal.confirmationStatus === "pending_confirmation",
  ),
  true,
);
const confirmedProfile = buildConfirmedUserProfileFromSignals({
  signals: fallbackInterviewSignals.extractedSignals.map((signal) => ({
    ...signal,
    confirmationStatus: "user_confirmed",
  })),
  currentProfile: emptyUserProfile,
});
assert.equal(isUserProfileReady(confirmedProfile), true);

for (const jd of sampleJds) {
  assert.equal(jd.notice, sampleJdNotice);
}

const incomplete = generatePathfinderMarkdown(
  createMarkdownInput(priorityPathId, validUserProfile, {
    project_understanding: validTrialAnswers.project_understanding,
  }),
);
assert.equal(incomplete.ok, false);
if (!incomplete.ok) {
  assert.equal(incomplete.reason, "missing_questions");
}

const complete = generatePathfinderMarkdown(
  createMarkdownInput(priorityPathId, validUserProfile, validTrialAnswers),
);
assert.equal(complete.ok, true);

if (complete.ok) {
  for (const requiredSection of Object.values(requiredMarkdownSectionLabels)) {
    assert.ok(
      complete.markdown.includes(requiredSection),
      `Markdown missing ${requiredSection}`,
    );
  }

  assert.ok(
    complete.markdown.includes(
      "https://github.com/joungminsung/OpenDocuments",
    ),
  );
  assert.ok(complete.markdown.includes("MIT"));
  assert.ok(complete.markdown.includes("测试候选人"));
  assert.ok(!complete.markdown.includes("小 C"));
  assert.equal(complete.antiPackagingCheck.status, "passed");
  assert.equal(complete.antiPackagingCheck.exportAllowed, true);
  assert.equal(complete.snapshot.templateSource, "frontend");
  assert.equal(complete.snapshot.exportScope, "full");
  assert.equal(complete.snapshot.content, complete.markdown);
  assert.ok(complete.snapshot.templateVersion.includes("p1-a"));
  assertSafePathfinderCopy(complete.markdown);
  assertNoUserVisibleEngineeringTerms(complete.markdown, "default markdown");
}

const chatwootMarkdown = generatePathfinderMarkdown(
  createMarkdownInput(
    priorityPathId,
    { ...validUserProfile, displayName: "tester" },
    validTrialAnswers,
    trialQuestions,
    chatwootProject,
  ),
);
assert.equal(chatwootMarkdown.ok, true);
if (chatwootMarkdown.ok) {
  assert.equal(chatwootMarkdown.filename, "pathfinder-tester-chatwoot.md");
  assert.ok(chatwootMarkdown.markdown.includes("## 项目来源与 License"));
  assert.ok(chatwootMarkdown.markdown.includes("## 公开项目能力"));
  assert.ok(chatwootMarkdown.markdown.includes("试航对象：Chatwoot"));
  assert.ok(chatwootMarkdown.markdown.includes(chatwootProject.license));
  assert.ok(chatwootMarkdown.markdown.includes(chatwootProject.sourceBoundary!));
  assert.ok(!chatwootMarkdown.markdown.includes("试航对象：OpenDocuments"));
  assert.ok(!chatwootMarkdown.markdown.includes("## OpenDocuments 来源与 License"));
  assert.ok(!chatwootMarkdown.markdown.includes("## OpenDocuments 公开能力"));
  assertNoUserVisibleEngineeringTerms(
    chatwootMarkdown.markdown,
    "Chatwoot markdown",
  );
}

const answerPackage = createTrialAnswers({
  project_understanding: validTrialAnswers.project_understanding,
});
assert.deepEqual(missingQuestionIdsFromAnswers(answerPackage), [
  "role_connection",
  "scenario_gap",
  "application_solution",
  "portfolio_extension",
  "ai_usage_explanation",
]);

const blockingAnswerPackage = createTrialAnswers({
  ...validTrialAnswers,
  portfolio_extension: "我开发了 OpenDocuments，并完成了企业级 RAG 系统。",
});
const blockingCheck = evaluateTrialAnswersAntiPackaging(blockingAnswerPackage);
assert.equal(blockingCheck.status, "blocked");
assert.equal(blockingCheck.exportAllowed, false);

const blockedMarkdown = generatePathfinderMarkdown(
  createMarkdownInput(priorityPathId, validUserProfile, {
    ...validTrialAnswers,
    portfolio_extension: "我开发了 OpenDocuments，并完成了企业级 RAG 系统。",
  }),
);
assert.equal(blockedMarkdown.ok, false);
if (!blockedMarkdown.ok) {
  assert.equal(blockedMarkdown.reason, "anti_packaging_blocked");
}

const snapshot = createMarkdownSnapshot("draft", "draft");
assert.equal(snapshot.templateSource, "frontend");
assert.equal(snapshot.exportScope, "draft");

assertSafePathfinderCopy(
  stringifyForCopyCheck({
    emptyUserProfile,
    forbiddenClaimsNotice,
    markdownExportItems,
    sampleJds,
    trialQuestionImpacts,
    trialQuestions,
    pageCopy,
    fallbackRecommendation,
    fallbackPackage,
  }),
);

const visibleDefaultCopy = stringifyForCopyCheck({
  emptyUserProfile,
  markdownExportItems,
  pageCopy,
  sampleJds,
  trialQuestions,
});
assert.equal(visibleDefaultCopy.includes("小 C"), false);

assert.equal(visibleDefaultCopy.includes("GitHub Search"), false);
assert.equal(visibleDefaultCopy.includes("DeepSeek"), false);
assert.equal(visibleDefaultCopy.includes("DEEPSEEK_API_KEY"), false);
assert.equal(visibleDefaultCopy.includes("Key.txt"), false);
assertNoUserVisibleEngineeringTerms(
  visibleDefaultCopy,
  "Pathfinder data and markdown copy",
);
assertNoUserVisibleEngineeringTerms(
  routedPathfinderCopy,
  "routed Pathfinder page copy",
);
assert.equal(roleStarTitles.length, 12);
assert.equal(roleStarOrbits.length, 12);
assert.deepEqual(
  Array.from(new Set(roleStarOrbits)).sort(),
  [1, 2, 3, 4],
  "roleStarPoints must remain distributed across four starmap orbits",
);
assert.deepEqual(
  [...roleStarTitles].sort((a, b) => a.localeCompare(b, "zh-Hans")),
  [...expectedRoleStarTitles].sort((a, b) => a.localeCompare(b, "zh-Hans")),
  "roleStarPoints titles must match the PM-approved 12 role star baseline",
);
for (const retiredTitle of retiredRoleStarTitles) {
  assert.equal(
    roleStarTitles.includes(retiredTitle),
    false,
    `${retiredTitle} must not remain a front-stage role star title`,
  );
}
assert.equal(routedPathfinderCopy.includes("岗位星图导航盘"), true);
assert.equal(routedPathfinderCopy.includes("岗位适配判断"), true);
assert.equal(/Top\s*[123]/.test(routedPathfinderCopy), false);

for (const unsafeCopy of [
  "我已经可以胜任这个岗位。",
  "这个 Demo 可以预测 offer 概率。",
  "可以用于简历包装。",
  "这个产品提供企业推荐。",
  "可以做多开源项目智能推荐。",
  "这里会运行真实 RAG 检索。",
  "可以展示复杂评分系统。",
  "这里是算法工程速成。",
  "OpenDocuments 是我的项目。",
  "用户开发了 OpenDocuments。",
  "我维护了 Chatwoot 原项目。",
  "候选人贡献了 RAGFlow 官方仓库。",
  "我完整复现了开源项目平台。",
  "我完成了企业级客服系统交付。",
  "我开发了企业 RAG 系统。",
  "我有官方贡献记录。",
  "AI 可替代合同人工复核。",
]) {
  assert.throws(() => assertSafePathfinderCopy(unsafeCopy));
}

console.log("Pathfinder static safety tests passed.");
