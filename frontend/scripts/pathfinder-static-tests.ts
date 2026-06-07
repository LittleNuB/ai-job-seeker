import assert from "node:assert/strict";
import {
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
import type { TrialQuestionId, UserProfileInput } from "../src/features/pathfinder/types";

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

const validTrialAnswers: Record<TrialQuestionId, string> = {
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
assert.deepEqual(requiredTrialQuestionIds, p1aTrialPackage.questionIds);
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
  "我开发了企业 RAG 系统。",
  "我有官方贡献记录。",
  "AI 可替代合同人工复核。",
]) {
  assert.throws(() => assertSafePathfinderCopy(unsafeCopy));
}

console.log("Pathfinder static safety tests passed.");
