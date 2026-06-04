import { getAntiPackagingFindings } from "./content-guard";
import {
  candidateProfile,
  demoTrialAnswers,
  forbiddenClaimsNotice,
  interviewPrep,
  metricRows,
  openSourceProject,
  pageCopy,
  portfolioDraft,
  portfolioPolishBoundary,
  priorityPathId,
  riskRows,
  trialQuestionImpacts,
  trialQuestions,
} from "./data";
import type {
  AntiPackagingCheck,
  BackendSyncState,
  MarkdownSnapshot,
  PathfinderRecordStatus,
  PathfinderState,
  PortfolioDraft,
  RequiredMarkdownSection,
  TrailRecord,
  TrialAnswer,
  TrialPackage,
  TrialQuestionId,
} from "./types";

export const pathfinderSchemaVersion = "p1-a.v1" as const;
export const markdownTemplateVersion = "frontend.pathfinder.p1-a.v1";
export const pathfinderStateStorageKey = "pathfinder-p1-a-state";
export const legacyPathfinderStateStorageKey = "pathfinder-p0-state";

export const initialBackendSyncState: BackendSyncState = {
  status: "local_only",
};

export const requiredTrialQuestionIds = trialQuestions.map(
  (question) => question.id,
) as TrialQuestionId[];

export const p1aTrialPackage: TrialPackage = {
  id: "p0-xiaoc-opendocuments",
  version: "1.0.0",
  title: "小 C 的 OpenDocuments 工程企业知识库 AI 助手试航",
  targetUser: "小 C",
  sourceProject: {
    name: openSourceProject.name,
    url: openSourceProject.sourceUrl,
    license: openSourceProject.license,
    role: "reference_only",
  },
  task: {
    id: "engineering-enterprise-knowledge-base-ai-assistant",
    title: "工程企业知识库 AI 助手试航",
  },
  questionIds: requiredTrialQuestionIds,
};

export const requiredMarkdownSectionLabels: Record<
  RequiredMarkdownSection,
  string
> = {
  candidate_background: "## 候选人背景",
  path_conclusion: "## 星图路径结论",
  sample_jd_note: "## 样例 JD 说明",
  opendocuments_source_license: "## OpenDocuments 来源与 License",
  opendocuments_original_capabilities: "## OpenDocuments 原项目能力",
  xiaoc_trial_contribution: "## 小 C 试航贡献",
  forbidden_claims: "## 不可声称内容",
  six_question_answers: "## 固定 6 问作答",
  disclaimer: "## 免责声明",
};

export function createInitialPathfinderState(): PathfinderState {
  return {
    demoLoaded: false,
    trailRecord: createTrailRecord(),
    backendSync: initialBackendSyncState,
  };
}

export function createTrailRecord(options?: {
  selectedPathId?: string | null;
  trialAnswers?: Partial<Record<TrialQuestionId, string>>;
  recordId?: string;
}): TrailRecord {
  const trialAnswers = createTrialAnswers(options?.trialAnswers ?? {});
  const antiPackagingCheck = evaluateTrialAnswersAntiPackaging(trialAnswers);
  const createdAt = new Date().toISOString();
  const record: TrailRecord = {
    schemaVersion: pathfinderSchemaVersion,
    recordId: options?.recordId,
    trialPackageId: p1aTrialPackage.id,
    trialPackageVersion: p1aTrialPackage.version,
    status: "draft",
    userProfileSnapshot: candidateProfile,
    selectedPathId: priorityPathId,
    trialAnswers,
    antiPackagingCheck,
    portfolioDraft: createPortfolioDraftContract(),
    interviewPrep: createInterviewPrepContract(),
    createdAt,
    updatedAt: createdAt,
  };

  return recomputeTrailRecordStatus(record);
}

export function createTrialAnswers(
  answers: Partial<Record<TrialQuestionId, string>>,
  previous?: TrialAnswer[],
): TrialAnswer[] {
  const previousById = new Map(previous?.map((answer) => [answer.id, answer]));
  const now = new Date().toISOString();

  return trialQuestions.map((question) => {
    const existing = previousById.get(question.id);
    const answer = answers[question.id] ?? existing?.answer ?? "";
    return {
      id: question.id,
      answer,
      status: answer.trim() ? "complete" : "empty",
      questionSnapshot: question.prompt,
      impactModuleIds: [trialQuestionImpacts[question.id]],
      updatedAt:
        existing && existing.answer === answer ? existing.updatedAt : now,
    };
  });
}

export function trialAnswerMapFromRecord(
  record: TrailRecord,
): Partial<Record<TrialQuestionId, string>> {
  return Object.fromEntries(
    record.trialAnswers.map((answer) => [answer.id, answer.answer]),
  ) as Partial<Record<TrialQuestionId, string>>;
}

export function missingQuestionIdsFromAnswers(
  trialAnswers: TrialAnswer[],
): TrialQuestionId[] {
  const answerMap = new Map(trialAnswers.map((answer) => [answer.id, answer]));
  return requiredTrialQuestionIds.filter((id) => {
    const answer = answerMap.get(id);
    return !answer?.answer.trim();
  });
}

export function isCompleteTrialAnswers(trialAnswers: TrialAnswer[]): boolean {
  return missingQuestionIdsFromAnswers(trialAnswers).length === 0;
}

export function updateTrailRecordAnswer(
  record: TrailRecord,
  questionId: TrialQuestionId,
  value: string,
): TrailRecord {
  const nextAnswers = createTrialAnswers(
    {
      ...trialAnswerMapFromRecord(record),
      [questionId]: value,
    },
    record.trialAnswers,
  );

  return recomputeTrailRecordStatus({
    ...record,
    trialAnswers: nextAnswers,
    antiPackagingCheck: evaluateTrialAnswersAntiPackaging(nextAnswers),
    markdownSnapshot: undefined,
    updatedAt: new Date().toISOString(),
  });
}

export function fillDemoTrailRecordAnswers(record: TrailRecord): TrailRecord {
  const nextAnswers = createTrialAnswers(demoTrialAnswers, record.trialAnswers);
  return recomputeTrailRecordStatus({
    ...record,
    selectedPathId: priorityPathId,
    trialAnswers: nextAnswers,
    antiPackagingCheck: evaluateTrialAnswersAntiPackaging(nextAnswers),
    markdownSnapshot: undefined,
    updatedAt: new Date().toISOString(),
  });
}

export function ensurePriorityTrailRecordPath(record: TrailRecord): TrailRecord {
  if (record.selectedPathId === priorityPathId) return record;
  return recomputeTrailRecordStatus({
    ...record,
    selectedPathId: priorityPathId,
    updatedAt: new Date().toISOString(),
  });
}

export function withMarkdownSnapshot(
  record: TrailRecord,
  snapshot: MarkdownSnapshot,
  antiPackagingCheck: AntiPackagingCheck,
): TrailRecord {
  return recomputeTrailRecordStatus({
    ...record,
    antiPackagingCheck,
    markdownSnapshot: snapshot,
    updatedAt: new Date().toISOString(),
  });
}

export function recomputeTrailRecordStatus(record: TrailRecord): TrailRecord {
  return {
    ...record,
    status: computeTrailRecordStatus(record),
  };
}

export function computeTrailRecordStatus(
  record: Pick<
    TrailRecord,
    "trialAnswers" | "antiPackagingCheck" | "markdownSnapshot"
  >,
): PathfinderRecordStatus {
  const missing = missingQuestionIdsFromAnswers(record.trialAnswers);
  if (missing.length === requiredTrialQuestionIds.length) return "draft";
  if (missing.length > 0) return "answers_incomplete";
  if (
    record.antiPackagingCheck.status === "blocked" ||
    !record.antiPackagingCheck.exportAllowed
  ) {
    return "anti_packaging_blocked";
  }
  if (record.markdownSnapshot?.exportScope === "full") return "exported";
  return "ready_to_export";
}

export function evaluateTrialAnswersAntiPackaging(
  trialAnswers: TrialAnswer[],
): AntiPackagingCheck {
  const copy = trialAnswers
    .map((answer) => `${answer.id}: ${answer.answer}`)
    .join("\n");
  return createAntiPackagingCheck(copy, createRequiredSectionState(true));
}

export function createAntiPackagingCheck(
  copy: string,
  requiredMarkdownSections: Record<RequiredMarkdownSection, boolean>,
): AntiPackagingCheck {
  const findings = getAntiPackagingFindings(copy);
  const missingRequiredSectionFindings = Object.entries(requiredMarkdownSections)
    .filter(([, present]) => !present)
    .map(([section]) => ({
      ruleId: `missing_markdown_section_${section}`,
      riskLevel: "blocking" as const,
      matchedText: requiredMarkdownSectionLabels[section as RequiredMarkdownSection],
      riskReason: "完整 Markdown 快照缺少必需章节。",
      suggestedRewrite: "补齐 P1-A 契约要求的 Markdown 九项内容。",
      blockingPolicy: "block_full_markdown_export" as const,
      context: "positive_claim" as const,
    }));
  const allFindings = [...findings, ...missingRequiredSectionFindings];
  const blockingCount = allFindings.filter(
    (finding) => finding.riskLevel === "blocking",
  ).length;
  const warningCount = allFindings.filter(
    (finding) => finding.riskLevel === "warning",
  ).length;

  return {
    rulesVersion: "p1-a.frontend-rules.v1",
    status:
      blockingCount > 0 ? "blocked" : warningCount > 0 ? "warning" : "passed",
    exportAllowed: blockingCount === 0,
    checkedAt: new Date().toISOString(),
    findings: allFindings,
    requiredMarkdownSections,
    blockingCount,
    warningCount,
  };
}

export function createNotRunAntiPackagingCheck(): AntiPackagingCheck {
  return {
    rulesVersion: "p1-a.frontend-rules.v1",
    status: "not_run",
    exportAllowed: false,
    findings: [],
    requiredMarkdownSections: createRequiredSectionState(false),
    blockingCount: 0,
    warningCount: 0,
  };
}

export function evaluateMarkdownAntiPackaging(markdown: string) {
  return createAntiPackagingCheck(
    markdown,
    getRequiredMarkdownSections(markdown),
  );
}

export function getRequiredMarkdownSections(
  markdown: string,
): Record<RequiredMarkdownSection, boolean> {
  return Object.fromEntries(
    Object.entries(requiredMarkdownSectionLabels).map(([section, label]) => [
      section,
      markdown.includes(label),
    ]),
  ) as Record<RequiredMarkdownSection, boolean>;
}

function createRequiredSectionState(
  present: boolean,
): Record<RequiredMarkdownSection, boolean> {
  return Object.fromEntries(
    Object.keys(requiredMarkdownSectionLabels).map((section) => [
      section,
      present,
    ]),
  ) as Record<RequiredMarkdownSection, boolean>;
}

export function createMarkdownSnapshot(
  content: string,
  exportScope: "draft" | "full",
): MarkdownSnapshot {
  return {
    templateSource: "frontend",
    templateVersion: markdownTemplateVersion,
    exportScope,
    content,
    contentHash: createContentHash(content),
    createdAt: new Date().toISOString(),
  };
}

function createContentHash(content: string): string {
  let hash = 5381;
  for (let index = 0; index < content.length; index += 1) {
    hash = (hash * 33) ^ content.charCodeAt(index);
  }
  return `djb2-${(hash >>> 0).toString(16)}`;
}

function createPortfolioDraftContract(): PortfolioDraft {
  return {
    title: portfolioDraft.title,
    targetPathId: priorityPathId,
    problemContext: portfolioDraft.problemBackground,
    userScenario: "工程企业资料检索、引用核验和低风险内部问答场景。",
    solutionOutline: portfolioDraft.solutionOverview,
    mvpScope: portfolioDraft.mvpScope.split("、"),
    metrics: metricRows.map((row) => ({
      dimension: row.dimension,
      metric: row.metric,
      acceptanceLens: row.trialCriterion,
    })),
    risks: riskRows.map((row) => ({
      risk: row.risk,
      manifestation: row.signal,
      mitigation: row.suggestion,
    })),
    opendocumentsReference: {
      name: openSourceProject.name,
      url: openSourceProject.sourceUrl,
      license: openSourceProject.license,
      role: "reference_only",
      originalCapabilities: openSourceProject.originalCapabilities,
    },
    xiaocTrialContribution: portfolioDraft.outputs,
    notClaimed: [forbiddenClaimsNotice],
    disclaimer: pageCopy.resultBoundary,
  };
}

function createInterviewPrepContract() {
  return {
    items: interviewPrep.map((item) => ({
      question: item.question,
      answerPoints: [item.answer],
      evidenceSources: [
        {
          sourceType: "trial_package" as const,
          sourceId: p1aTrialPackage.id,
          note: "来自固定 P1-A TrialPackage 和 P0 内容资产。",
        },
      ],
      boundaryReminder:
        "回答只解释试航过程、证据和边界，不做岗位胜任认证。",
      forbiddenClaims: [forbiddenClaimsNotice, portfolioPolishBoundary],
    })),
  };
}

export function normalizeStoredPathfinderState(value: unknown): PathfinderState {
  if (isP1APathfinderState(value)) {
    return {
      demoLoaded: value.demoLoaded,
      trailRecord: normalizeTrailRecord(value.trailRecord),
      backendSync: normalizeBackendSyncState(value.backendSync),
    };
  }

  if (isLegacyPathfinderState(value)) {
    return {
      demoLoaded: value.demoLoaded,
      trailRecord: createTrailRecord({
        selectedPathId: value.selectedPathId,
        trialAnswers: value.trialAnswers,
      }),
      backendSync: initialBackendSyncState,
    };
  }

  return createInitialPathfinderState();
}

export function createPathfinderStateFromTrailRecord(
  record: TrailRecord,
  options?: {
    demoLoaded?: boolean;
    backendSync?: BackendSyncState;
  },
): PathfinderState {
  return {
    demoLoaded: options?.demoLoaded ?? true,
    trailRecord: normalizeTrailRecord(record),
    backendSync:
      options?.backendSync ??
      ({
        status: "saved",
        lastSavedAt: record.updatedAt,
      } satisfies BackendSyncState),
  };
}

function normalizeTrailRecord(record: TrailRecord): TrailRecord {
  return recomputeTrailRecordStatus({
    ...createTrailRecord(),
    ...record,
    schemaVersion: pathfinderSchemaVersion,
    trialPackageId: p1aTrialPackage.id,
    trialPackageVersion: p1aTrialPackage.version,
    selectedPathId: priorityPathId,
    trialAnswers: createTrialAnswers(trialAnswerMapFromRecord(record)),
    antiPackagingCheck:
      record.antiPackagingCheck ?? createNotRunAntiPackagingCheck(),
  });
}

function isP1APathfinderState(value: unknown): value is PathfinderState {
  return (
    typeof value === "object" &&
    value !== null &&
    "trailRecord" in value &&
    typeof (value as { trailRecord?: unknown }).trailRecord === "object"
  );
}

function normalizeBackendSyncState(value: unknown): BackendSyncState {
  if (typeof value !== "object" || value === null || !("status" in value)) {
    return initialBackendSyncState;
  }

  const status = (value as { status?: unknown }).status;
  if (
    status !== "local_only" &&
    status !== "creating" &&
    status !== "saving" &&
    status !== "saved" &&
    status !== "failed"
  ) {
    return initialBackendSyncState;
  }

  const lastSavedAt = (value as { lastSavedAt?: unknown }).lastSavedAt;
  const error = (value as { error?: unknown }).error;

  return {
    status,
    lastSavedAt: typeof lastSavedAt === "string" ? lastSavedAt : undefined,
    error: typeof error === "string" ? error : undefined,
  };
}

function isLegacyPathfinderState(value: unknown): value is {
  demoLoaded: boolean;
  selectedPathId: string | null;
  trialAnswers: Partial<Record<TrialQuestionId, string>>;
} {
  return (
    typeof value === "object" &&
    value !== null &&
    "trialAnswers" in value &&
    typeof (value as { trialAnswers?: unknown }).trialAnswers === "object"
  );
}
