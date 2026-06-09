import {
  pathfinderSchemaVersion,
  p1aTrialPackage,
} from "./contract";
import {
  buildFallbackProjectsResponse,
  buildFallbackRecommendationResponse,
  buildFallbackTrialPackageResponse,
} from "./data";
import type {
  AntiPackagingCheck,
  GenerateTrialPackageResponse,
  MarkdownSnapshot,
  PathfinderProjectsResponse,
  PathfinderRecommendationResponse,
  PathfinderRecordStatus,
  PortfolioDraft,
  InterviewPrep,
  PathId,
  TrailRecord,
  TrialAnswer,
  TrialQuestionId,
  UserProfileInput,
} from "./types";

const pathfinderRecordsPath = "/api/pathfinder/records";
const pathfinderRecommendationsPath = "/api/pathfinder/recommendations";
const pathfinderProjectsPath = "/api/pathfinder/projects";
const pathfinderGeneratePath = "/api/pathfinder/trial-packages/generate";
const defaultPathfinderUserId = "pathfinder-p1-a-demo-user";

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

export function isPathfinderApiEnabled() {
  return process.env.NEXT_PUBLIC_PATHFINDER_API_ENABLED !== "false";
}

export async function requestPathfinderRecommendations(params: {
  userProfile: UserProfileInput;
}): Promise<PathfinderRecommendationResponse> {
  if (!isPathfinderApiEnabled()) {
    return buildFallbackRecommendationResponse(params.userProfile);
  }

  try {
    return await requestJson<PathfinderRecommendationResponse>(
      pathfinderRecommendationsPath,
      {
        method: "POST",
        body: JSON.stringify({
          userProfile: params.userProfile,
          ruleVersion: "p1b.frontend-contract.v1",
        }),
      },
    );
  } catch {
    return buildFallbackRecommendationResponse(params.userProfile);
  }
}

export async function requestPathfinderProjects(): Promise<PathfinderProjectsResponse> {
  if (!isPathfinderApiEnabled()) return buildFallbackProjectsResponse();

  try {
    return await requestJson<PathfinderProjectsResponse>(
      `${pathfinderProjectsPath}?status=approved_for_trial_package`,
      {
        method: "GET",
      },
    );
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
    return await requestJson<GenerateTrialPackageResponse>(
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
