import {
  pathfinderSchemaVersion,
  p1aTrialPackage,
} from "./contract";
import type {
  AntiPackagingCheck,
  MarkdownSnapshot,
  PathfinderRecordStatus,
  PortfolioDraft,
  InterviewPrep,
  TrailRecord,
  TrialAnswer,
  TrialQuestionId,
} from "./types";

const pathfinderRecordsPath = "/api/pathfinder/records";
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
