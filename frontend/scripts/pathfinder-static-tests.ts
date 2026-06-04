import assert from "node:assert/strict";
import {
  candidateProfile,
  createMarkdownInput,
  demoTrialAnswers,
  forbiddenClaimsNotice,
  markdownExportItems,
  pageCopy,
  priorityPathId,
  sampleJdNotice,
  sampleJds,
  trialQuestionImpacts,
  trialQuestions,
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
  requiredTrialQuestionIds,
} from "../src/features/pathfinder/contract";
import { generatePathfinderMarkdown } from "../src/features/pathfinder/markdown";
import type { TrialQuestionId } from "../src/features/pathfinder/types";

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

assert.deepEqual(
  trialQuestions.map((question) => ({
    id: question.id,
    prompt: question.prompt,
  })),
  expectedQuestions,
  "trialQuestions must use the fixed P0 six questions",
);

assert.equal(pathfinderSchemaVersion, "p1-a.v1");
assert.equal(createInitialPathfinderState().backendSync.status, "local_only");
assert.equal(p1aTrialPackage.id, "p0-xiaoc-opendocuments");
assert.equal(p1aTrialPackage.version, "1.0.0");
assert.equal(p1aTrialPackage.sourceProject.role, "reference_only");
assert.deepEqual(
  p1aTrialPackage.questionIds,
  expectedQuestions.map((question) => question.id),
);
assert.deepEqual(requiredTrialQuestionIds, p1aTrialPackage.questionIds);

assert.deepEqual(
  Object.keys(demoTrialAnswers).sort(),
  expectedQuestions.map((question) => question.id).sort(),
  "demoTrialAnswers must cover all fixed questions",
);

for (const question of expectedQuestions) {
  assert.ok(
    demoTrialAnswers[question.id].trim().length > 0,
    `demoTrialAnswers.${question.id} must not be empty`,
  );
}

assert.ok(candidateProfile.identity);
assert.ok(candidateProfile.background.length > 0);
assert.ok(candidateProfile.technicalBasics.length > 0);
assert.ok(candidateProfile.weaknesses.length > 0);
assert.ok(candidateProfile.goals.length > 0);

for (const jd of sampleJds) {
  assert.equal(jd.notice, sampleJdNotice);
}

const incomplete = generatePathfinderMarkdown(
  createMarkdownInput(priorityPathId, {
    project_understanding: demoTrialAnswers.project_understanding,
  }),
);
assert.equal(incomplete.ok, false);
if (!incomplete.ok) {
  assert.equal(incomplete.reason, "missing_questions");
}

const complete = generatePathfinderMarkdown(
  createMarkdownInput(priorityPathId, demoTrialAnswers),
);
assert.equal(complete.ok, true);

if (complete.ok) {
  for (const requiredSection of [
    "## 候选人背景",
    "## 星图路径结论",
    "## 样例 JD 说明",
    "## OpenDocuments 来源与 License",
    "## OpenDocuments 原项目能力",
    "## 小 C 试航贡献",
    "## 不可声称内容",
    "## 固定 6 问作答",
    "## 免责声明",
  ]) {
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
  assert.equal(complete.antiPackagingCheck.status, "passed");
  assert.equal(complete.antiPackagingCheck.exportAllowed, true);
  assert.equal(complete.snapshot.templateSource, "frontend");
  assert.equal(complete.snapshot.exportScope, "full");
  assert.equal(complete.snapshot.content, complete.markdown);
  assert.ok(complete.snapshot.templateVersion.includes("p1-a"));
  assertSafePathfinderCopy(complete.markdown);
}

const answerPackage = createTrialAnswers({
  project_understanding: demoTrialAnswers.project_understanding,
});
assert.deepEqual(missingQuestionIdsFromAnswers(answerPackage), [
  "role_connection",
  "scenario_gap",
  "application_solution",
  "portfolio_extension",
  "ai_usage_explanation",
]);

const blockingAnswerPackage = createTrialAnswers({
  ...demoTrialAnswers,
  portfolio_extension: "我开发了 OpenDocuments，并完成了企业级 RAG 系统。",
});
const blockingCheck = evaluateTrialAnswersAntiPackaging(blockingAnswerPackage);
assert.equal(blockingCheck.status, "blocked");
assert.equal(blockingCheck.exportAllowed, false);

const blockedMarkdown = generatePathfinderMarkdown(
  createMarkdownInput(priorityPathId, {
    ...demoTrialAnswers,
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
    candidateProfile,
    forbiddenClaimsNotice,
    markdownExportItems,
    sampleJds,
    trialQuestionImpacts,
    trialQuestions,
    demoTrialAnswers,
    pageCopy,
  }),
);

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
  "小 C 开发了 OpenDocuments。",
  "我开发了企业 RAG 系统。",
  "我有官方贡献记录。",
  "AI 可替代合同人工复核。",
]) {
  assert.throws(() => assertSafePathfinderCopy(unsafeCopy));
}

console.log("Pathfinder static safety tests passed.");
