"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import {
  createPathfinderRecord,
  deletePathfinderRecord,
  generatePathfinderTrialPackage,
  getPathfinderRecord,
  isPathfinderApiEnabled,
  requestPathfinderRecommendations,
  savePathfinderResult,
  updatePathfinderTrialAnswers,
} from "./api";
import {
  createInitialPathfinderState,
  createPathfinderStateFromTrailRecord,
  legacyPathfinderStateStorageKey,
  normalizeStoredPathfinderState,
  pathfinderStateStorageKey,
  trialAnswerMapFromRecord,
  updateTrailRecordAnswer,
  updateTrailRecordProfile,
  withP1BRecommendation,
  withTrialPackageCandidate,
  withMarkdownSnapshot,
} from "./contract";
import type {
  AntiPackagingCheck,
  BackendSyncState,
  GenerateTrialPackageResponse,
  MarkdownSnapshot,
  PathfinderRecommendationResponse,
  PathfinderState,
  PathId,
  TrailRecord,
  TrialQuestionId,
  UserProfileInput,
} from "./types";

type PathfinderAction =
  | {
      type: "submit_profile";
      recommendationResponse?: PathfinderRecommendationResponse;
    }
  | { type: "update_profile"; profile: UserProfileInput }
  | { type: "answer_question"; questionId: TrialQuestionId; value: string }
  | {
      type: "attach_trial_package";
      response: GenerateTrialPackageResponse;
    }
  | {
      type: "save_markdown_snapshot";
      snapshot: MarkdownSnapshot;
      antiPackagingCheck: AntiPackagingCheck;
    }
  | { type: "attach_record_identity"; record: TrailRecord }
  | { type: "set_backend_sync"; backendSync: BackendSyncState }
  | { type: "reset" }
  | { type: "hydrate"; state: PathfinderState };

const initialState = createInitialPathfinderState();

interface PathfinderContextValue {
  state: PathfinderState;
  userProfile: UserProfileInput;
  trialAnswerMap: Partial<Record<TrialQuestionId, string>>;
  updateUserProfile: (profile: UserProfileInput) => void;
  submitUserProfile: () => void;
  generateTrialPackage: (params: {
    selectedPathId: PathId;
    selectedProjectId: string;
  }) => Promise<void>;
  ensurePriorityPath: () => void;
  answerQuestion: (questionId: TrialQuestionId, value: string) => void;
  saveMarkdownSnapshot: (
    snapshot: MarkdownSnapshot,
    antiPackagingCheck: AntiPackagingCheck,
  ) => void;
  reset: () => void;
}

const PathfinderContext = createContext<PathfinderContextValue | null>(null);

function reducer(
  state: PathfinderState,
  action: PathfinderAction,
): PathfinderState {
  switch (action.type) {
    case "hydrate":
      return action.state;
    case "submit_profile":
      return withP1BRecommendation(state, action.recommendationResponse);
    case "update_profile":
      return {
        ...state,
        trailRecord: updateTrailRecordProfile(
          state.trailRecord,
          action.profile,
        ),
      };
    case "answer_question":
      return {
        ...state,
        trailRecord: updateTrailRecordAnswer(
          state.trailRecord,
          action.questionId,
          action.value,
        ),
      };
    case "attach_trial_package":
      return withTrialPackageCandidate(state, action.response);
    case "save_markdown_snapshot":
      return {
        ...state,
        trailRecord: withMarkdownSnapshot(
          state.trailRecord,
          action.snapshot,
          action.antiPackagingCheck,
        ),
      };
    case "attach_record_identity":
      return {
        ...state,
        trailRecord: {
          ...state.trailRecord,
          recordId: action.record.recordId ?? state.trailRecord.recordId,
          createdAt: action.record.createdAt ?? state.trailRecord.createdAt,
          updatedAt: action.record.updatedAt ?? state.trailRecord.updatedAt,
        },
      };
    case "set_backend_sync":
      return {
        ...state,
        backendSync: action.backendSync,
      };
    case "reset":
      return createInitialPathfinderState();
    default:
      return state;
  }
}

export function PathfinderProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [hydrated, setHydrated] = useState(false);
  const createRecordPromiseRef = useRef<Promise<string | undefined> | null>(
    null,
  );
  const syncGenerationRef = useRef(0);
  const lastSyncedSignatureRef = useRef<string>("");
  const remoteHydrationPendingRef = useRef(false);
  const skipAutoSyncAfterRemoteHydrationRef = useRef(false);

  useEffect(() => {
    const raw =
      window.sessionStorage.getItem(pathfinderStateStorageKey) ??
      window.sessionStorage.getItem(legacyPathfinderStateStorageKey);
    if (!raw) {
      setHydrated(true);
      return;
    }

    try {
      const parsed = JSON.parse(raw) as unknown;
      const restoredState = normalizeStoredPathfinderState(parsed);
      dispatch({ type: "hydrate", state: restoredState });
      const recordId = restoredState.trailRecord.recordId;
      if (recordId && isPathfinderApiEnabled()) {
        remoteHydrationPendingRef.current = true;
        dispatch({
          type: "set_backend_sync",
          backendSync: { status: "saving" },
        });
        void getPathfinderRecord(recordId)
          .then((remoteRecord) => {
            const remoteState = createPathfinderStateFromTrailRecord(
              remoteRecord,
              {
                profileSubmitted: restoredState.profileSubmitted,
              },
            );
            lastSyncedSignatureRef.current = createTrailRecordSyncSignature(
              remoteState.trailRecord,
            );
            skipAutoSyncAfterRemoteHydrationRef.current = true;
            dispatch({ type: "hydrate", state: remoteState });
          })
          .catch((error: unknown) => {
            dispatch({
              type: "set_backend_sync",
              backendSync: {
                status: "failed",
                error:
                  error instanceof Error
                    ? error.message
                    : "Pathfinder API 读取失败。",
              },
            });
          })
          .finally(() => {
            remoteHydrationPendingRef.current = false;
          });
      }
    } catch {
      window.sessionStorage.removeItem(pathfinderStateStorageKey);
      window.sessionStorage.removeItem(legacyPathfinderStateStorageKey);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.sessionStorage.setItem(
      pathfinderStateStorageKey,
      JSON.stringify(state),
    );
  }, [hydrated, state]);

  const ensureRemoteRecordId = useCallback(
    async (record: TrailRecord): Promise<string | undefined> => {
      if (!isPathfinderApiEnabled()) return undefined;
      if (record.recordId) return record.recordId;

      if (!createRecordPromiseRef.current) {
        createRecordPromiseRef.current = createPathfinderRecord(record)
          .then((remoteRecord) => {
            dispatch({
              type: "attach_record_identity",
              record: remoteRecord,
            });
            return remoteRecord.recordId;
          })
          .finally(() => {
            createRecordPromiseRef.current = null;
          });
      }

      return createRecordPromiseRef.current;
    },
    [],
  );

  const syncTrailRecord = useCallback(
    async (record: TrailRecord, generation: number) => {
      try {
        const recordId = await ensureRemoteRecordId(record);
        if (!recordId || generation !== syncGenerationRef.current) return;

        const recordForSync = { ...record, recordId };

        await updatePathfinderTrialAnswers({
          recordId,
          trialAnswers: recordForSync.trialAnswers,
        });
        if (generation !== syncGenerationRef.current) return;

        await savePathfinderResult({
          recordId,
          status: recordForSync.status,
          antiPackagingCheck: recordForSync.antiPackagingCheck,
          portfolioDraft: recordForSync.portfolioDraft,
          interviewPrep: recordForSync.interviewPrep,
          markdownSnapshot: recordForSync.markdownSnapshot,
        });
        lastSyncedSignatureRef.current =
          createTrailRecordSyncSignature(recordForSync);
        dispatch({
          type: "set_backend_sync",
          backendSync: {
            status: "saved",
            lastSavedAt: new Date().toISOString(),
          },
        });
      } catch {
        lastSyncedSignatureRef.current = "";
        dispatch({
          type: "set_backend_sync",
          backendSync: {
            status: "failed",
            error: "Pathfinder API 保存失败。",
          },
        });
      }
    },
    [ensureRemoteRecordId],
  );

  useEffect(() => {
    if (!hydrated || !state.profileSubmitted || !isPathfinderApiEnabled()) {
      return;
    }
    if (remoteHydrationPendingRef.current) return;

    const signature = createTrailRecordSyncSignature(state.trailRecord);
    if (skipAutoSyncAfterRemoteHydrationRef.current) {
      lastSyncedSignatureRef.current = signature;
      skipAutoSyncAfterRemoteHydrationRef.current = false;
      return;
    }
    if (signature === lastSyncedSignatureRef.current) return;

    const generation = syncGenerationRef.current + 1;
    syncGenerationRef.current = generation;
    dispatch({
      type: "set_backend_sync",
      backendSync: {
        status: state.trailRecord.recordId ? "saving" : "creating",
      },
    });
    const timeoutId = window.setTimeout(() => {
      void syncTrailRecord(state.trailRecord, generation);
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [hydrated, state.profileSubmitted, state.trailRecord, syncTrailRecord]);

  const updateUserProfile = useCallback((profile: UserProfileInput) => {
    skipAutoSyncAfterRemoteHydrationRef.current = false;
    dispatch({ type: "update_profile", profile });
  }, []);
  const submitUserProfile = useCallback(() => {
    skipAutoSyncAfterRemoteHydrationRef.current = false;
    const userProfileSnapshot = state.trailRecord.userProfileSnapshot;
    void requestPathfinderRecommendations({
      userProfile: userProfileSnapshot,
    }).then((recommendationResponse) => {
      dispatch({ type: "submit_profile", recommendationResponse });
    });
  }, [state.trailRecord.userProfileSnapshot]);
  const generateTrialPackage = useCallback(
    async (params: { selectedPathId: PathId; selectedProjectId: string }) => {
      skipAutoSyncAfterRemoteHydrationRef.current = false;
      const recommendationResponse =
        state.recommendationResponse ??
        (await requestPathfinderRecommendations({
          userProfile: state.trailRecord.userProfileSnapshot,
        }));
      dispatch({ type: "submit_profile", recommendationResponse });
      const response = await generatePathfinderTrialPackage({
        recommendationResponse,
        userProfile: state.trailRecord.userProfileSnapshot,
        selectedPathId: params.selectedPathId,
        selectedProjectId: params.selectedProjectId,
      });
      dispatch({ type: "attach_trial_package", response });
    },
    [state.recommendationResponse, state.trailRecord.userProfileSnapshot],
  );
  const ensurePriorityPath = useCallback(() => {
    skipAutoSyncAfterRemoteHydrationRef.current = false;
    dispatch({
      type: "submit_profile",
      recommendationResponse: state.recommendationResponse,
    });
  }, [state.recommendationResponse]);
  const answerQuestion = useCallback(
    (questionId: TrialQuestionId, value: string) => {
      skipAutoSyncAfterRemoteHydrationRef.current = false;
      dispatch({ type: "answer_question", questionId, value });
    },
    [],
  );
  const saveMarkdownSnapshot = useCallback(
    (snapshot: MarkdownSnapshot, antiPackagingCheck: AntiPackagingCheck) => {
      skipAutoSyncAfterRemoteHydrationRef.current = false;
      dispatch({
        type: "save_markdown_snapshot",
        snapshot,
        antiPackagingCheck,
      });
    },
    [],
  );
  const reset = useCallback(() => {
    skipAutoSyncAfterRemoteHydrationRef.current = false;
    const recordId = state.trailRecord.recordId;
    if (recordId && isPathfinderApiEnabled()) {
      void deletePathfinderRecord(recordId).catch(() => undefined);
    }
    dispatch({ type: "reset" });
  }, [state.trailRecord.recordId]);
  const trialAnswerMap = useMemo(
    () => trialAnswerMapFromRecord(state.trailRecord),
    [state.trailRecord],
  );
  const userProfile = state.trailRecord.userProfileSnapshot;

  const value = useMemo(
    () => ({
      state,
      userProfile,
      trialAnswerMap,
      updateUserProfile,
      submitUserProfile,
      generateTrialPackage,
      ensurePriorityPath,
      answerQuestion,
      saveMarkdownSnapshot,
      reset,
    }),
    [
      state,
      userProfile,
      trialAnswerMap,
      updateUserProfile,
      submitUserProfile,
      generateTrialPackage,
      ensurePriorityPath,
      answerQuestion,
      saveMarkdownSnapshot,
      reset,
    ],
  );

  return (
    <PathfinderContext.Provider value={value}>
      {hydrated ? children : null}
    </PathfinderContext.Provider>
  );
}

export function usePathfinder() {
  const context = useContext(PathfinderContext);
  if (!context) {
    throw new Error("usePathfinder must be used inside PathfinderProvider");
  }
  return context;
}

function createTrailRecordSyncSignature(record: TrailRecord) {
  return JSON.stringify({
    recordId: record.recordId,
    userProfileSnapshot: record.userProfileSnapshot,
    trialAnswers: record.trialAnswers,
    antiPackagingCheck: record.antiPackagingCheck,
    portfolioDraft: record.portfolioDraft,
    interviewPrep: record.interviewPrep,
    markdownSnapshot: record.markdownSnapshot,
  });
}
