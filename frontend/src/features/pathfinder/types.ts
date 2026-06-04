export type DemoVersion = "p0-xiaoc-opendocuments";

export type PathfinderSchemaVersion = "p1-a.v1";

export type PathId =
  | "industry-ai-product-assistant"
  | "industry-ai-solution-assistant"
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
  "样例 JD，用于 P0 Demo 和当前样本趋势参考，不代表具体公司岗位要求或录用判断。";

export interface CandidateProfile {
  id: "xiaoc";
  name: "小 C";
  identity: string;
  background: string[];
  technicalBasics: string[];
  weaknesses: string[];
  goals: string[];
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
  candidateConnection: string[];
  gapOrAdvice: string[];
}

export interface OpenSourceProject {
  name: "OpenDocuments";
  sourceUrl: string;
  license: "MIT";
  positioning: string;
  originalCapabilities: string[];
  whyForCandidate: string[];
  boundaryNotice: string;
}

export interface EvidenceItem {
  title:
    | "JD 证据"
    | "小 C 背景证据"
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
}

export interface PortfolioOnePagerDraft {
  title: string;
  author: string;
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
  | "xiaoc_trial_contribution"
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
  opendocumentsReference: {
    name: "OpenDocuments";
    url: string;
    license: string;
    role: "reference_only";
    originalCapabilities: string[];
  };
  xiaocTrialContribution: string[];
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
  userProfileSnapshot: unknown;
  selectedPathId: string;
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
  demoLoaded: boolean;
  trailRecord: TrailRecord;
  backendSync: BackendSyncState;
}

export interface MarkdownInput {
  demoVersion: DemoVersion;
  profile: CandidateProfile;
  sampleJdNotice: SampleJdNotice;
  sampleJds: SampleJd[];
  openSourceProject: OpenSourceProject;
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
