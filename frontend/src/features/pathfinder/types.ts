export const currentTrialPackageId =
  "p1a-opendocuments-engineering-kb" as const;
export const legacyTrialPackageId = "p0-xiaoc-opendocuments" as const;

export type DemoVersion = typeof currentTrialPackageId;
export type LegacyDemoVersion = typeof legacyTrialPackageId;

export type PathfinderSchemaVersion = "p1-a.v1" | "p1b.v1";

export type PathId =
  | "industry-ai-product-assistant"
  | "industry-ai-solution-assistant"
  | "ai-data-evaluation-assistant"
  | "ai-application-ops-implementation-assistant"
  | "algorithm-llm-engineer";

export type PathVerdict =
  | "priority_trial"
  | "explore"
  | "not_recommended_short_term";

export type TrialQuestionId =
  | "project_understanding"
  | "role_connection"
  | "scenario_gap"
  | "application_solution"
  | "portfolio_extension"
  | "ai_usage_explanation";

export type SampleJdNotice =
  "样例 JD，用于当前试航和样本趋势参考，不代表具体公司岗位要求或求职结果判断。";

export interface UserProfileInput {
  displayName: string;
  professionalBackground: string;
  jobTarget: string;
  timeline: string;
  projectExperience: string;
  aiToolExperience: string;
  technicalBasics: string;
  currentConfusion: string;
  constraints: string;
}

export type InterviewMessageRole = "assistant" | "user" | "system";

export type InterviewMessageStatus = "sent" | "received" | "failed";

export interface InterviewMessage {
  id: string;
  role: InterviewMessageRole;
  content: string;
  createdAt: string;
  status: InterviewMessageStatus;
}

export type UserProfileSignalConfirmationStatus =
  | "from_user_answer"
  | "pending_confirmation"
  | "user_confirmed";

export interface ExtractedProfileSignal extends UserProfileSignal {
  confirmationStatus: UserProfileSignalConfirmationStatus;
  userEditableText: string;
}

export type SignalConfirmationStatus =
  | "not_started"
  | "pending_confirmation"
  | "confirmed";

export type AiInterviewStatus =
  | "idle"
  | "asking"
  | "extracting"
  | "fallback"
  | "failed"
  | "confirmed";

export type PathfinderApiSource = "api" | "fallback_mock";

export type ResumeUploadStatus = "idle" | "uploading" | "parsed" | "error";

export type ResumeSignalReadiness =
  | "ready"
  | "suggested_more"
  | "insufficient";

export interface ResumeParseState {
  status: ResumeUploadStatus;
  fileName?: string;
  fileType?: string;
  textLength?: number;
  modelStatus?: string;
  readiness?: ResumeSignalReadiness;
  missingSignalTypes: string[];
  userMessage?: string;
  error?: string;
}

export interface ParsePathfinderResumeResponse {
  source: string;
  fileName: string;
  fileType?: string;
  textLength: number;
  modelStatus: string;
  signals: ExtractedProfileSignal[];
  readiness: ResumeSignalReadiness;
  missingSignalTypes: string[];
  userMessage: string;
}

export type RecommendationDecision =
  | "priority_trial"
  | "explore"
  | "not_recommended_short_term"
  | "insufficient_information";

export interface UserProfileSignal {
  signalId: string;
  category:
    | "industry_background"
    | "domain_material"
    | "project_experience"
    | "communication"
    | "data_handling"
    | "ai_tool_usage"
    | "technical_foundation"
    | "career_constraint"
    | "risk"
    | "goal";
  label: string;
  sourceField: keyof UserProfileInput | string;
  evidenceText: string;
  confidence:
    | "rule_high"
    | "rule_medium"
    | "needs_user_clarification"
    | "low"
    | "medium"
    | "high"
    | "needs_user_review";
}

export interface RecommendationEvidence {
  evidenceId: string;
  type:
    | "jd_sample"
    | "user_profile"
    | "open_source_project"
    | "risk"
    | "next_trial";
  title: string;
  detail: string;
  sourceRef: string;
}

export interface RolePathRecommendation {
  pathId: PathId;
  title: string;
  decision: RecommendationDecision;
  rationale: string;
  evidence: RecommendationEvidence[];
  riskNotes: string[];
  suggestedProjectTypes: string[];
  nextTrialAction: string;
}

export interface OpenSourceProjectRecord {
  projectId: string;
  name: string;
  sourceUrl: string;
  officialUrl?: string;
  host: "github" | "gitlab" | "other_public_source";
  repositoryVisibility?: "public" | "private" | "unknown";
  description: string;
  license: string;
  licenseSpdxId?: string;
  licenseFileUrl?: string;
  licenseVerificationStatus: "verified" | "pending" | "failed";
  licenseVerifiedBy?: string;
  licenseVerifiedAt?: string;
  licenseVerificationMethod?: string;
  lastManualCheckAt?: string;
  manualCheckMethod?: string[];
  referenceRole: "reference_only";
  status: "candidate" | "approved_for_trial_package" | "needs_review" | "retired";
  projectDirection?: string[];
  rolePathIds: PathId[];
  projectTags: string[];
  capabilityTags: string[];
  riskTags: string[];
  suitableUserSignals?: string[];
  unsuitableUserSignals?: string[];
  pathFit?: Array<{
    pathId: PathId;
    fit: "strong" | "medium" | "weak" | "not_applicable";
    rationale: string;
  }>;
  publicCapabilities: string[];
  trialTaskIdea?: {
    title: string;
    summary: string;
    genericTemplateId?: string;
  };
  evidenceRequirements?: string[];
  riskNotes?: string[];
  sourceBoundary?: string;
  notClaimed: string[];
  forbiddenClaims: string[];
  allowedContexts: string[];
  reviewTriggers?: string[];
  sourceSnapshot?: {
    checkedBranch?: string;
    readmeSummary?: string;
    licenseSummary?: string;
    manualCheckNotes?: string[];
    nonCanonicalMetadata?: Record<string, unknown>;
  };
}

export interface ProjectMatch {
  projectId: string;
  rolePathId: PathId;
  decision: "matched_for_trial" | "candidate_needs_review" | "not_matched";
  matchedRules: string[];
  evidence: RecommendationEvidence[];
  boundaryNotes: string[];
}

export interface PathfinderRuleVersion {
  version: string;
  effectiveAt: string;
  rolePathTaxonomyVersion: string;
  projectLibraryVersion: string;
  antiPackagingRuleVersion: string;
  notes: string[];
}

export interface RecommendationRun {
  recommendationRunId: string;
  schemaVersion: "p1b.v1";
  createdAt: string;
  ruleVersion: PathfinderRuleVersion;
  userProfileSnapshot: UserProfileInput;
  profileSignals: UserProfileSignal[];
  paths: RolePathRecommendation[];
  projectMatches: ProjectMatch[];
  selectedPathId?: PathId;
  selectedProjectId?: string;
}

export interface TrialPackageCandidate {
  trialPackageId: string;
  trialPackageVersion: string;
  generatedFrom: {
    recommendationRunId: string;
    selectedPathId: PathId;
    selectedProjectId: string;
    ruleVersion: string;
  };
  title: string;
  targetRolePath: RolePathRecommendation;
  sourceProject: OpenSourceProjectRecord;
  trialQuestions: Array<{
    questionId: TrialQuestionId;
    title: string;
    prompt: string;
    required: boolean;
  }>;
  requiredMarkdownSections: string[];
  forbiddenClaims: string[];
  sampleJdDisclaimer: string;
}

export interface PathfinderRecommendationResponse {
  schemaVersion: "p1b.v1";
  recommendationRun: RecommendationRun;
  profileSignals: UserProfileSignal[];
  paths: RolePathRecommendation[];
  projectMatches: ProjectMatch[];
  scopeDisclaimer: string;
  source: PathfinderApiSource;
}

export interface PathfinderProjectsResponse {
  schemaVersion: "p1b.v1";
  projects: OpenSourceProjectRecord[];
  dataBoundary: string;
  source: PathfinderApiSource;
}

export interface GenerateTrialPackageResponse {
  schemaVersion: "p1b.v1";
  trialPackageCandidate: TrialPackageCandidate;
  antiPackagingDefaults: AntiPackagingCheck;
  source: PathfinderApiSource;
}

export interface PathfinderInterviewSession {
  sessionId: string;
  status: AiInterviewStatus;
  messages: InterviewMessage[];
  extractedSignals: ExtractedProfileSignal[];
  nextQuestion?: string;
  source: PathfinderApiSource;
}

export interface CreateInterviewSessionResponse {
  schemaVersion: "p1c.v1";
  session: PathfinderInterviewSession;
}

export interface SubmitInterviewTurnResponse {
  schemaVersion: "p1c.v1";
  session: PathfinderInterviewSession;
}

export interface ExtractInterviewSignalsResponse {
  schemaVersion: "p1c.v1";
  session: PathfinderInterviewSession;
}

export interface ConfirmInterviewSignalsResponse {
  schemaVersion: "p1c.v1";
  session: PathfinderInterviewSession;
  userProfile: UserProfileInput;
}

export interface SampleJd {
  id: string;
  title: string;
  targetPathId: PathId;
  notice: SampleJdNotice;
  statusLabel: string;
  scenario: string;
  responsibilities: string[];
  requirementSignals: string[];
  userConnectionPrompts: string[];
  gapOrAdvice: string[];
}

export interface OpenSourceProject {
  name: "OpenDocuments";
  sourceUrl: string;
  license: "MIT";
  positioning: string;
  originalCapabilities: string[];
  whyForUser: string[];
  boundaryNotice: string;
}

export interface EvidenceItem {
  title:
    | "JD 样本证据"
    | "用户背景证据"
    | "OpenDocuments 证据"
    | "风险证据"
    | "下一步试航";
  points: string[];
}

export interface RecommendationPath {
  id: PathId;
  title: string;
  verdict: PathVerdict;
  statusLabel: string;
  summary: string;
  evidence: EvidenceItem[];
}

export interface TrialQuestion {
  id: TrialQuestionId;
  title: string;
  prompt: string;
  helper: string;
}

export interface PortfolioOnePagerDraft {
  title: string;
  targetRole: string;
  problemBackground: string;
  solutionOverview: string;
  mvpScope: string;
  evaluationMetrics: string[];
  outputs: string[];
  boundaryNotice: string;
}

export interface MetricRow {
  dimension: string;
  metric: string;
  trialCriterion: string;
}

export interface RiskRow {
  risk: string;
  signal: string;
  suggestion: string;
}

export interface ComplianceAdvice {
  allowed: string[];
  avoid: string[];
}

export interface InterviewPrepItem {
  question: string;
  answer: string;
}

export type PathfinderRecordStatus =
  | "draft"
  | "answers_incomplete"
  | "anti_packaging_blocked"
  | "ready_to_export"
  | "exported";

export type TrialAnswerStatus = "empty" | "draft" | "complete";

export interface TrialPackage {
  id: string;
  version: string;
  title: string;
  targetUser: string;
  sourceProject: {
    name: string;
    url: string;
    license: string;
    role: "reference_only";
  };
  task: {
    id: string;
    title: string;
  };
  questionIds: TrialQuestionId[];
}

export interface TrialAnswer {
  id: TrialQuestionId;
  answer: string;
  status: TrialAnswerStatus;
  questionSnapshot?: string;
  impactModuleIds?: string[];
  updatedAt?: string;
}

export type AntiPackagingRiskLevel = "info" | "warning" | "blocking";

export type AntiPackagingBlockingPolicy =
  | "none"
  | "warn_only"
  | "block_full_markdown_export";

export interface AntiPackagingFinding {
  ruleId: string;
  riskLevel: AntiPackagingRiskLevel;
  matchedText: string;
  riskReason: string;
  suggestedRewrite?: string;
  blockingPolicy: AntiPackagingBlockingPolicy;
  context: "positive_claim" | "negated_context" | "allowed_context";
}

export type RequiredMarkdownSection =
  | "candidate_background"
  | "path_conclusion"
  | "sample_jd_note"
  | "opendocuments_source_license"
  | "opendocuments_original_capabilities"
  | "user_trial_contribution"
  | "forbidden_claims"
  | "six_question_answers"
  | "disclaimer";

export interface AntiPackagingCheck {
  rulesVersion: string;
  status: "not_run" | "passed" | "warning" | "blocked";
  exportAllowed: boolean;
  checkedAt?: string;
  findings: AntiPackagingFinding[];
  requiredMarkdownSections: Record<RequiredMarkdownSection, boolean>;
  blockingCount: number;
  warningCount: number;
}

export interface PortfolioDraft {
  title: string;
  targetPathId: string;
  problemContext: string;
  userScenario: string;
  solutionOutline: string;
  mvpScope: string[];
  metrics: Array<{
    dimension: string;
    metric: string;
    acceptanceLens: string;
  }>;
  risks: Array<{
    risk: string;
    manifestation: string;
    mitigation: string;
  }>;
  sourceProjectReference: {
    name: string;
    url: string;
    license: string;
    role: "reference_only";
    originalCapabilities: string[];
  };
  userTrialContribution: string[];
  // Legacy backend compatibility only; current P1-A keys are sourceProjectReference/userTrialContribution.
  opendocumentsReference?: {
    name: string;
    url: string;
    license: string;
    role: "reference_only";
    originalCapabilities: string[];
  };
  xiaocTrialContribution?: string[];
  notClaimed: string[];
  disclaimer: string;
  updatedAt?: string;
}

export interface InterviewPrep {
  items: Array<{
    question: string;
    answerPoints: string[];
    evidenceSources: Array<{
      sourceType:
        | "trial_package"
        | "trial_answer"
        | "portfolio_draft"
        | "opendocuments_reference";
      sourceId: string;
      note: string;
    }>;
    boundaryReminder: string;
    forbiddenClaims: string[];
  }>;
  updatedAt?: string;
}

export interface MarkdownSnapshot {
  templateSource: "frontend";
  templateVersion: string;
  exportScope: "draft" | "full";
  content: string;
  contentHash?: string;
  createdAt: string;
}

export interface TrailRecord {
  schemaVersion: PathfinderSchemaVersion;
  recordId?: string;
  trialPackageId: string;
  trialPackageVersion: string;
  status: PathfinderRecordStatus;
  userProfileSnapshot: UserProfileInput;
  selectedPathId: string;
  recommendationRunId?: string;
  selectedProjectId?: string;
  trialPackageCandidate?: TrialPackageCandidate;
  trialAnswers: TrialAnswer[];
  antiPackagingCheck: AntiPackagingCheck;
  portfolioDraft?: PortfolioDraft;
  interviewPrep?: InterviewPrep;
  markdownSnapshot?: MarkdownSnapshot;
  createdAt?: string;
  updatedAt?: string;
}

export type BackendSyncStatus =
  | "local_only"
  | "creating"
  | "saving"
  | "saved"
  | "failed";

export interface BackendSyncState {
  status: BackendSyncStatus;
  lastSavedAt?: string;
  error?: string;
}

export interface PathfinderState {
  profileSubmitted: boolean;
  interviewSessionId?: string;
  interviewMessages: InterviewMessage[];
  extractedSignals: ExtractedProfileSignal[];
  signalConfirmationStatus: SignalConfirmationStatus;
  aiInterviewStatus: AiInterviewStatus;
  resumeParse: ResumeParseState;
  recommendationResponse?: PathfinderRecommendationResponse;
  trialPackageResponse?: GenerateTrialPackageResponse;
  trailRecord: TrailRecord;
  backendSync: BackendSyncState;
}

export interface MarkdownInput {
  demoVersion: DemoVersion;
  userProfile: UserProfileInput;
  sampleJdNotice: SampleJdNotice;
  sampleJds: SampleJd[];
  openSourceProject: OpenSourceProject;
  sourceProject: OpenSourceProjectRecord;
  selectedPath: RecommendationPath;
  trialQuestions: TrialQuestion[];
  trialAnswers: Partial<Record<TrialQuestionId, string>>;
  portfolioDraft: PortfolioOnePagerDraft;
  metrics: MetricRow[];
  risks: RiskRow[];
  complianceAdvice: ComplianceAdvice;
  interviewPrep: InterviewPrepItem[];
}

export type MarkdownResult =
  | {
      ok: true;
      filename: string;
      markdown: string;
      antiPackagingCheck: AntiPackagingCheck;
      snapshot: MarkdownSnapshot;
    }
  | {
      ok: false;
      reason: "missing_questions";
      missingQuestionIds: TrialQuestionId[];
      antiPackagingCheck: AntiPackagingCheck;
    }
  | {
      ok: false;
      reason: "anti_packaging_blocked";
      markdown: string;
      missingQuestionIds: [];
      antiPackagingCheck: AntiPackagingCheck;
      draftSnapshot: MarkdownSnapshot;
    };
