import { getAntiPackagingFindings } from "./content-guard";
import {
  buildFallbackRecommendationResponse,
  emptyUserProfile,
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
  UserProfileInput,
} from "./types";
import { currentTrialPackageId } from "./types";

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
  id: currentTrialPackageId,
  version: "1.0.0",
  title: "OpenDocuments 工程企业知识库 AI 助手试航",
  targetUser: "真实用户输入",
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
  opendocuments_original_capabilities: "## OpenDocuments 公开能力",
  user_trial_contribution: "## 用户试航产出",
  forbidden_claims: "## 不可声称内容",
  six_question_answers: "## 6 问作答",
  disclaimer: "## 免责声明",
};

export function createInitialPathfinderState(): PathfinderState {
  return {
    profileSubmitted: false,
    recommendationResponse: undefined,
    trialPackageResponse: undefined,
    trailRecord: createTrailRecord(),
    backendSync: initialBackendSyncState,
  };
}

export function createTrailRecord(options?: {
  selectedPathId?: string | null;
  trialAnswers?: Partial<Record<TrialQuestionId, string>>;
  userProfileSnapshot?: Partial<UserProfileInput> | unknown;
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
    userProfileSnapshot: normalizeUserProfile(options?.userProfileSnapshot),
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

export function normalizeUserProfile(value: unknown): UserProfileInput {
  if (typeof value !== "object" || value === null) {
    return { ...emptyUserProfile };
  }

  const input = value as Partial<Record<keyof UserProfileInput, unknown>>;
  const legacy = value as {
    name?: unknown;
    identity?: unknown;
    background?: unknown;
    technicalBasics?: unknown;
    weaknesses?: unknown;
    goals?: unknown;
  };
  return {
    displayName:
      typeof input.displayName === "string"
        ? input.displayName
        : typeof legacy.name === "string"
          ? legacy.name
          : "",
    professionalBackground:
      typeof input.professionalBackground === "string"
        ? input.professionalBackground
        : Array.isArray(legacy.background)
          ? legacy.background.join("；")
          : typeof legacy.identity === "string"
            ? legacy.identity
            : "",
    jobTarget:
      typeof input.jobTarget === "string"
        ? input.jobTarget
        : Array.isArray(legacy.goals)
          ? legacy.goals.join("；")
          : "",
    timeline: typeof input.timeline === "string" ? input.timeline : "",
    projectExperience:
      typeof input.projectExperience === "string"
        ? input.projectExperience
        : "",
    aiToolExperience:
      typeof input.aiToolExperience === "string"
        ? input.aiToolExperience
        : "",
    technicalBasics:
      typeof input.technicalBasics === "string"
        ? input.technicalBasics
        : Array.isArray(legacy.technicalBasics)
          ? legacy.technicalBasics.join("；")
          : "",
    currentConfusion:
      typeof input.currentConfusion === "string"
        ? input.currentConfusion
        : Array.isArray(legacy.weaknesses)
          ? legacy.weaknesses.join("；")
          : "",
    constraints:
      typeof input.constraints === "string" ? input.constraints : "",
  };
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

export function updateTrailRecordProfile(
  record: TrailRecord,
  profile: UserProfileInput,
): TrailRecord {
  return recomputeTrailRecordStatus({
    ...record,
    userProfileSnapshot: normalizeUserProfile(profile),
    markdownSnapshot: undefined,
    updatedAt: new Date().toISOString(),
  });
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

export function ensurePriorityTrailRecordPath(record: TrailRecord): TrailRecord {
  if (record.selectedPathId === priorityPathId) return record;
  return recomputeTrailRecordStatus({
    ...record,
    selectedPathId: priorityPathId,
    updatedAt: new Date().toISOString(),
  });
}

export function withP1BRecommendation(
  state: PathfinderState,
  recommendationResponse = buildFallbackRecommendationResponse(
    state.trailRecord.userProfileSnapshot,
  ),
): PathfinderState {
  return {
    ...state,
    profileSubmitted: true,
    recommendationResponse,
    trailRecord: recomputeTrailRecordStatus({
      ...state.trailRecord,
      recommendationRunId:
        recommendationResponse.recommendationRun.recommendationRunId,
      updatedAt: new Date().toISOString(),
    }),
  };
}

export function withTrialPackageCandidate(
  state: PathfinderState,
  response: NonNullable<PathfinderState["trialPackageResponse"]>,
): PathfinderState {
  const candidate = response.trialPackageCandidate;
  return {
    ...state,
    trialPackageResponse: response,
    trailRecord: recomputeTrailRecordStatus({
      ...state.trailRecord,
      schemaVersion: "p1b.v1",
      trialPackageId: candidate.trialPackageId,
      trialPackageVersion: candidate.trialPackageVersion,
      selectedPathId: candidate.generatedFrom.selectedPathId,
      selectedProjectId: candidate.generatedFrom.selectedProjectId,
      recommendationRunId: candidate.generatedFrom.recommendationRunId,
      trialPackageCandidate: candidate,
      markdownSnapshot: undefined,
      updatedAt: new Date().toISOString(),
    }),
  };
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
      suggestedRewrite: "补齐完整 Markdown 所需的九项内容。",
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
    sourceProjectReference: {
      name: openSourceProject.name,
      url: openSourceProject.sourceUrl,
      license: openSourceProject.license,
      role: "reference_only",
      originalCapabilities: openSourceProject.originalCapabilities,
    },
    userTrialContribution: portfolioDraft.outputs,
    // Legacy backend compatibility only; current P1-A contract uses the two fields above.
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
          note: "来自固定 P1-A TrialPackage 和公开参考项目。",
        },
      ],
      boundaryReminder:
        "回答只解释试航过程、证据和边界，不做岗位结论。",
      forbiddenClaims: [forbiddenClaimsNotice, portfolioPolishBoundary],
    })),
  };
}

export function normalizeStoredPathfinderState(value: unknown): PathfinderState {
  if (isP1APathfinderState(value)) {
    const legacyDemoLoaded =
      typeof (value as { demoLoaded?: unknown }).demoLoaded === "boolean"
        ? Boolean((value as { demoLoaded?: unknown }).demoLoaded)
        : false;
  return {
    profileSubmitted:
      typeof value.profileSubmitted === "boolean"
        ? value.profileSubmitted
        : legacyDemoLoaded,
    recommendationResponse: value.recommendationResponse,
    trialPackageResponse: value.trialPackageResponse,
    trailRecord: normalizeTrailRecord(value.trailRecord),
    backendSync: normalizeBackendSyncState(value.backendSync),
  };
  }

  if (isLegacyPathfinderState(value)) {
    return {
      profileSubmitted: Boolean(value.demoLoaded),
      trailRecord: createTrailRecord({
        selectedPathId: value.selectedPathId,
        trialAnswers: value.trialAnswers,
        userProfileSnapshot: value.userProfileSnapshot,
      }),
      backendSync: initialBackendSyncState,
    };
  }

  return createInitialPathfinderState();
}

export function createPathfinderStateFromTrailRecord(
  record: TrailRecord,
  options?: {
    profileSubmitted?: boolean;
    demoLoaded?: boolean;
    backendSync?: BackendSyncState;
  },
): PathfinderState {
  return {
    profileSubmitted:
      options?.profileSubmitted ?? options?.demoLoaded ?? true,
    recommendationResponse: buildFallbackRecommendationResponse(
      record.userProfileSnapshot,
    ),
    trialPackageResponse: undefined,
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
    selectedPathId: record.selectedPathId ?? priorityPathId,
    userProfileSnapshot: normalizeUserProfile(record.userProfileSnapshot),
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
  userProfileSnapshot?: unknown;
} {
  return (
    typeof value === "object" &&
    value !== null &&
    "trialAnswers" in value &&
    typeof (value as { trialAnswers?: unknown }).trialAnswers === "object"
  );
}
