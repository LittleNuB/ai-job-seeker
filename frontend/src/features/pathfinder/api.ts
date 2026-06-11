import {
  pathfinderSchemaVersion,
  p1aTrialPackage,
} from "./contract";
import {
  buildConfirmedUserProfileFromSignals,
  buildFallbackInterviewSession,
  buildFallbackInterviewSignals,
  buildFallbackInterviewTurn,
  buildFallbackProjectsResponse,
  buildFallbackRecommendationResponse,
  buildFallbackTrialPackageResponse,
} from "./data";
import type {
  AntiPackagingCheck,
  ConfirmInterviewSignalsResponse,
  CreateInterviewSessionResponse,
  ExtractedProfileSignal,
  ExtractInterviewSignalsResponse,
  GenerateTrialPackageResponse,
  PathfinderInterviewSession,
  MarkdownSnapshot,
  PathfinderProjectsResponse,
  PathfinderRecommendationResponse,
  PathfinderRecordStatus,
  PortfolioDraft,
  InterviewPrep,
  PathId,
  SubmitInterviewTurnResponse,
  TrailRecord,
  TrialAnswer,
  TrialQuestionId,
  UserProfileInput,
} from "./types";

const pathfinderRecordsPath = "/api/pathfinder/records";
const pathfinderRecommendationsPath = "/api/pathfinder/recommendations";
const pathfinderProjectsPath = "/api/pathfinder/projects";
const pathfinderGeneratePath = "/api/pathfinder/trial-packages/generate";
const pathfinderInterviewSessionsPath = "/api/pathfinder/interview/sessions";
const defaultPathfinderUserId = "pathfinder-p1-a-demo-user";
const p1cSchemaVersion = "p1c.v1" as const;

type BackendInterviewMessage = {
  messageId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  modelStatus?: "ok" | "no_key" | "error" | "invalid_json" | "fallback" | null;
};

type BackendExtractedProfileSignal = {
  signalId: string;
  category: ExtractedProfileSignal["category"];
  label: string;
  evidenceText: string;
  sourceMessageIds?: string[];
  confidence: ExtractedProfileSignal["confidence"];
  status?: "candidate" | "confirmed" | "edited" | "rejected";
  userEditedText?: string | null;
};

type BackendSignalConfirmation = BackendExtractedProfileSignal & {
  status: "confirmed" | "edited" | "rejected";
};

type BackendInterviewSession = {
  schemaVersion: typeof p1cSchemaVersion;
  sessionId: string;
  status: "active" | "signals_extracted" | "signals_confirmed" | "archived";
  messages: BackendInterviewMessage[];
  extractedSignals: BackendExtractedProfileSignal[];
  confirmedSignals?: BackendSignalConfirmation[];
  llmStatus?: "ok" | "no_key" | "error" | "invalid_json" | "fallback";
};

type BackendInterviewTurnResponse = {
  schemaVersion: typeof p1cSchemaVersion;
  sessionId: string;
  assistantMessage: BackendInterviewMessage;
  session: BackendInterviewSession;
};

type BackendSignalExtractionResult = {
  schemaVersion: typeof p1cSchemaVersion;
  sessionId: string;
  modelStatus: "ok" | "no_key" | "error" | "invalid_json";
  signals: BackendExtractedProfileSignal[];
  summary?: string | null;
  fallbackReason?: string | null;
  createdAt: string;
};

export interface UpdateTrialAnswersResponse {
  recordId: string;
  status: PathfinderRecordStatus;
  trialAnswers: TrialAnswer[];
  updatedAt: string;
}

export interface SavePathfinderResultResponse {
  recordId: string;
  status: PathfinderRecordStatus;
  markdownSnapshotSaved: boolean;
  updatedAt: string;
}

function normalizeInterviewMessage(
  message: BackendInterviewMessage,
): PathfinderInterviewSession["messages"][number] {
  return {
    id: message.messageId,
    role: message.role,
    content: message.content,
    createdAt: message.createdAt,
    status: message.role === "user" ? "sent" : "received",
  };
}

function normalizeSignal(
  signal: BackendExtractedProfileSignal,
): ExtractedProfileSignal {
  const confirmed =
    signal.status === "confirmed" || signal.status === "edited";
  return {
    signalId: signal.signalId,
    category: signal.category,
    label: signal.label,
    sourceField: "interview",
    evidenceText: signal.evidenceText,
    confidence: signal.confidence,
    confirmationStatus: confirmed ? "user_confirmed" : "pending_confirmation",
    userEditableText: signal.userEditedText ?? signal.evidenceText,
  };
}

function normalizeInterviewStatus(
  session: BackendInterviewSession,
): PathfinderInterviewSession["status"] {
  if (session.status === "signals_confirmed") return "confirmed";
  if (
    session.llmStatus === "no_key" ||
    session.llmStatus === "fallback" ||
    session.llmStatus === "error" ||
    session.llmStatus === "invalid_json"
  ) {
    return "fallback";
  }
  return "idle";
}

function normalizeInterviewSession(
  session: BackendInterviewSession,
  source: PathfinderInterviewSession["source"],
): PathfinderInterviewSession {
  const messages = session.messages.map(normalizeInterviewMessage);
  const signals = session.confirmedSignals?.length
    ? session.confirmedSignals
    : session.extractedSignals;
  const lastAssistantMessage = [...messages]
    .reverse()
    .find((message) => message.role === "assistant");

  return {
    sessionId: session.sessionId,
    status: normalizeInterviewStatus(session),
    messages,
    extractedSignals: signals.map(normalizeSignal),
    nextQuestion: lastAssistantMessage?.content,
    source,
  };
}

function normalizeExtractedSignalsIntoSession(params: {
  session: PathfinderInterviewSession;
  extraction: BackendSignalExtractionResult;
}): PathfinderInterviewSession {
  const source =
    params.extraction.modelStatus === "ok" ? params.session.source : "fallback_mock";
  return {
    ...params.session,
    status: source === "fallback_mock" ? "fallback" : "idle",
    source,
    extractedSignals: params.extraction.signals.map(normalizeSignal),
  };
}

function confirmedSignalPayload(
  signal: ExtractedProfileSignal,
): BackendSignalConfirmation {
  const edited = signal.userEditableText.trim() !== signal.evidenceText.trim();
  return {
    signalId: signal.signalId,
    category: signal.category,
    label: signal.label,
    evidenceText: signal.evidenceText,
    sourceMessageIds: [],
    confidence: signal.confidence,
    status: edited ? "edited" : "confirmed",
    userEditedText: edited ? signal.userEditableText.trim() : null,
  };
}

export function isPathfinderApiEnabled() {
  return process.env.NEXT_PUBLIC_PATHFINDER_API_ENABLED !== "false";
}

export async function createPathfinderInterviewSession(params?: {
  initialAnswer?: string;
}): Promise<CreateInterviewSessionResponse> {
  if (!isPathfinderApiEnabled()) {
    const session = buildFallbackInterviewSession();
    return {
      schemaVersion: "p1c.v1",
      session: params?.initialAnswer
        ? buildFallbackInterviewTurn({
            session,
            answer: params.initialAnswer,
          })
        : session,
    };
  }

  try {
    const session = await requestJson<BackendInterviewSession>(
      pathfinderInterviewSessionsPath,
      {
        method: "POST",
        body: JSON.stringify({
          schemaVersion: p1cSchemaVersion,
          initialUserInput: params?.initialAnswer?.trim() || undefined,
        }),
      },
    );
    return {
      schemaVersion: p1cSchemaVersion,
      session: normalizeInterviewSession(session, "api"),
    };
  } catch {
    const session = buildFallbackInterviewSession();
    return {
      schemaVersion: p1cSchemaVersion,
      session: params?.initialAnswer
        ? buildFallbackInterviewTurn({
            session,
            answer: params.initialAnswer,
          })
        : session,
    };
  }
}

export async function getPathfinderInterviewSession(
  sessionId: string,
): Promise<CreateInterviewSessionResponse> {
  try {
    const session = await requestJson<BackendInterviewSession>(
      `${pathfinderInterviewSessionsPath}/${sessionId}`,
      {
        method: "GET",
      },
    );
    return {
      schemaVersion: p1cSchemaVersion,
      session: normalizeInterviewSession(session, "api"),
    };
  } catch {
    return {
      schemaVersion: p1cSchemaVersion,
      session: {
        ...buildFallbackInterviewSession(),
        sessionId,
      },
    };
  }
}

export async function submitPathfinderInterviewTurn(params: {
  session: PathfinderInterviewSession;
  answer: string;
}): Promise<SubmitInterviewTurnResponse> {
  if (!isPathfinderApiEnabled() || params.session.source === "fallback_mock") {
    return {
      schemaVersion: p1cSchemaVersion,
      session: buildFallbackInterviewTurn(params),
    };
  }

  try {
    const response = await requestJson<BackendInterviewTurnResponse>(
      `${pathfinderInterviewSessionsPath}/${params.session.sessionId}/turns`,
      {
        method: "POST",
        body: JSON.stringify({
          schemaVersion: p1cSchemaVersion,
          message: params.answer,
        }),
      },
    );
    return {
      schemaVersion: p1cSchemaVersion,
      session: normalizeInterviewSession(response.session, "api"),
    };
  } catch {
    return {
      schemaVersion: p1cSchemaVersion,
      session: buildFallbackInterviewTurn(params),
    };
  }
}

export async function extractPathfinderInterviewSignals(params: {
  session: PathfinderInterviewSession;
}): Promise<ExtractInterviewSignalsResponse> {
  if (!isPathfinderApiEnabled() || params.session.source === "fallback_mock") {
    return {
      schemaVersion: p1cSchemaVersion,
      session: buildFallbackInterviewSignals(params.session),
    };
  }

  try {
    const extraction = await requestJson<BackendSignalExtractionResult>(
      `${pathfinderInterviewSessionsPath}/${params.session.sessionId}/signals`,
      {
        method: "POST",
      },
    );
    return {
      schemaVersion: p1cSchemaVersion,
      session: normalizeExtractedSignalsIntoSession({
        session: params.session,
        extraction,
      }),
    };
  } catch {
    return {
      schemaVersion: p1cSchemaVersion,
      session: buildFallbackInterviewSignals(params.session),
    };
  }
}

export async function confirmPathfinderInterviewSignals(params: {
  session: PathfinderInterviewSession;
  signals: ExtractedProfileSignal[];
  currentProfile: UserProfileInput;
}): Promise<ConfirmInterviewSignalsResponse> {
  const confirmedSignals = params.signals.map((signal) => ({
    ...signal,
    confirmationStatus: "user_confirmed" as const,
    evidenceText: signal.userEditableText,
  }));
  const fallbackUserProfile = buildConfirmedUserProfileFromSignals({
    signals: confirmedSignals,
    currentProfile: params.currentProfile,
  });

  if (!isPathfinderApiEnabled() || params.session.source === "fallback_mock") {
    return {
      schemaVersion: p1cSchemaVersion,
      session: {
        ...params.session,
        status: "confirmed",
        extractedSignals: confirmedSignals,
      },
      userProfile: fallbackUserProfile,
    };
  }

  try {
    const session = await requestJson<BackendInterviewSession>(
      `${pathfinderInterviewSessionsPath}/${params.session.sessionId}/confirmed-signals`,
      {
        method: "PUT",
        body: JSON.stringify({
          schemaVersion: p1cSchemaVersion,
          confirmedSignals: confirmedSignals.map(confirmedSignalPayload),
        }),
      },
    );
    const normalizedSession = normalizeInterviewSession(session, "api");
    return {
      schemaVersion: p1cSchemaVersion,
      session: normalizedSession,
      userProfile: buildConfirmedUserProfileFromSignals({
        signals: normalizedSession.extractedSignals,
        currentProfile: params.currentProfile,
      }),
    };
  } catch {
    return {
      schemaVersion: p1cSchemaVersion,
      session: {
        ...params.session,
        status: "confirmed",
        extractedSignals: confirmedSignals,
      },
      userProfile: fallbackUserProfile,
    };
  }
}

export async function requestPathfinderRecommendations(params: {
  userProfile: UserProfileInput;
}): Promise<PathfinderRecommendationResponse> {
  if (!isPathfinderApiEnabled()) {
    return buildFallbackRecommendationResponse(params.userProfile);
  }

  try {
    const response = await requestJson<Omit<PathfinderRecommendationResponse, "source">>(
      pathfinderRecommendationsPath,
      {
        method: "POST",
        body: JSON.stringify({
          userProfile: params.userProfile,
          ruleVersion: "p1b.frontend-contract.v1",
        }),
      },
    );
    return { ...response, source: "api" };
  } catch {
    return buildFallbackRecommendationResponse(params.userProfile);
  }
}

export async function requestPathfinderProjects(): Promise<PathfinderProjectsResponse> {
  if (!isPathfinderApiEnabled()) return buildFallbackProjectsResponse();

  try {
    const response = await requestJson<Omit<PathfinderProjectsResponse, "source">>(
      `${pathfinderProjectsPath}?status=approved_for_trial_package`,
      {
        method: "GET",
      },
    );
    return { ...response, source: "api" };
  } catch {
    return buildFallbackProjectsResponse();
  }
}

export async function generatePathfinderTrialPackage(params: {
  recommendationResponse: PathfinderRecommendationResponse;
  userProfile: UserProfileInput;
  selectedPathId: PathId;
  selectedProjectId: string;
}): Promise<GenerateTrialPackageResponse> {
  if (!isPathfinderApiEnabled()) {
    return buildFallbackTrialPackageResponse(params);
  }

  try {
    const response = await requestJson<Omit<GenerateTrialPackageResponse, "source">>(
      pathfinderGeneratePath,
      {
        method: "POST",
        body: JSON.stringify({
          recommendationRunId:
            params.recommendationResponse.recommendationRun.recommendationRunId,
          userProfileSnapshot: params.userProfile,
          selectedPathId: params.selectedPathId,
          selectedProjectId: params.selectedProjectId,
        }),
      },
    );
    return { ...response, source: "api" };
  } catch {
    return buildFallbackTrialPackageResponse(params);
  }
}

export async function createPathfinderRecord(
  record: TrailRecord,
): Promise<TrailRecord> {
  return requestJson<TrailRecord>(pathfinderRecordsPath, {
    method: "POST",
    body: JSON.stringify({
      schemaVersion: pathfinderSchemaVersion,
      trialPackageId: p1aTrialPackage.id,
      trialPackageVersion: p1aTrialPackage.version,
      selectedPathId: record.selectedPathId,
      recommendationRunId: record.recommendationRunId,
      selectedProjectId: record.selectedProjectId,
      trialPackageCandidate: record.trialPackageCandidate,
      userProfileSnapshot: record.userProfileSnapshot,
    }),
  });
}

export async function getPathfinderRecord(
  recordId: string,
): Promise<TrailRecord> {
  return requestJson<TrailRecord>(`${pathfinderRecordsPath}/${recordId}`, {
    method: "GET",
  });
}

export async function updatePathfinderTrialAnswers(params: {
  recordId: string;
  changedQuestionId?: TrialQuestionId;
  trialAnswers: TrialAnswer[];
}): Promise<UpdateTrialAnswersResponse> {
  return requestJson<UpdateTrialAnswersResponse>(
    `${pathfinderRecordsPath}/${params.recordId}/trial-answers`,
    {
      method: "PATCH",
      body: JSON.stringify({
        schemaVersion: pathfinderSchemaVersion,
        changedQuestionId: params.changedQuestionId,
        trialAnswers: params.trialAnswers,
      }),
    },
  );
}

export async function savePathfinderResult(params: {
  recordId: string;
  status: PathfinderRecordStatus;
  antiPackagingCheck: AntiPackagingCheck;
  portfolioDraft?: PortfolioDraft;
  interviewPrep?: InterviewPrep;
  markdownSnapshot?: MarkdownSnapshot;
}): Promise<SavePathfinderResultResponse> {
  return requestJson<SavePathfinderResultResponse>(
    `${pathfinderRecordsPath}/${params.recordId}/result`,
    {
      method: "PUT",
      body: JSON.stringify({
        schemaVersion: pathfinderSchemaVersion,
        status: params.status,
        antiPackagingCheck: params.antiPackagingCheck,
        portfolioDraft: params.portfolioDraft,
        interviewPrep: params.interviewPrep,
        markdownSnapshot: params.markdownSnapshot,
      }),
    },
  );
}

export async function deletePathfinderRecord(recordId: string): Promise<void> {
  await requestJson<void>(`${pathfinderRecordsPath}/${recordId}`, {
    method: "DELETE",
  });
}

async function requestJson<T>(
  path: string,
  init: RequestInit,
): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-User-Id":
        process.env.NEXT_PUBLIC_PATHFINDER_USER_ID ?? defaultPathfinderUserId,
      ...init.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`Pathfinder API ${response.status}: ${path}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
