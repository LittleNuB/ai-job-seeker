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
  getPathfinderRecord,
  isPathfinderApiEnabled,
  savePathfinderResult,
  updatePathfinderTrialAnswers,
} from "./api";
import {
  createPathfinderStateFromTrailRecord,
  createInitialPathfinderState,
  ensurePriorityTrailRecordPath,
  fillDemoTrailRecordAnswers,
  legacyPathfinderStateStorageKey,
  normalizeStoredPathfinderState,
  pathfinderStateStorageKey,
  trialAnswerMapFromRecord,
  updateTrailRecordAnswer,
  withMarkdownSnapshot,
} from "./contract";
import type {
  AntiPackagingCheck,
  BackendSyncState,
  MarkdownSnapshot,
  PathfinderState,
  TrailRecord,
  TrialQuestionId,
} from "./types";

type PathfinderAction =
  | { type: "load_demo" }
  | { type: "answer_question"; questionId: TrialQuestionId; value: string }
  | { type: "fill_demo_answers" }
  | {
      type: "save_markdown_snapshot";
      snapshot: MarkdownSnapshot;
      antiPackagingCheck: AntiPackagingCheck;
    }
  | { type: "attach_record_identity"; record: TrailRecord }
  | { type: "set_backend_sync"; backendSync: BackendSyncState }
  | { type: "reset_demo" }
  | { type: "hydrate"; state: PathfinderState };

const initialState = createInitialPathfinderState();

interface PathfinderContextValue {
  state: PathfinderState;
  trialAnswerMap: Partial<Record<TrialQuestionId, string>>;
  loadDemo: () => void;
  ensurePriorityPath: () => void;
  answerQuestion: (questionId: TrialQuestionId, value: string) => void;
  fillDemoAnswers: () => void;
  saveMarkdownSnapshot: (
    snapshot: MarkdownSnapshot,
    antiPackagingCheck: AntiPackagingCheck,
  ) => void;
  resetDemo: () => void;
}

const PathfinderContext = createContext<PathfinderContextValue | null>(null);

function reducer(
  state: PathfinderState,
  action: PathfinderAction,
): PathfinderState {
  switch (action.type) {
    case "hydrate":
      return action.state;
    case "load_demo":
      return {
        ...state,
        demoLoaded: true,
        trailRecord: ensurePriorityTrailRecordPath(state.trailRecord),
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
    case "fill_demo_answers":
      return {
        ...state,
        demoLoaded: true,
        trailRecord: fillDemoTrailRecordAnswers(state.trailRecord),
      };
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
    case "reset_demo":
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
                demoLoaded: restoredState.demoLoaded,
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
    if (!hydrated || !state.demoLoaded || !isPathfinderApiEnabled()) return;
    if (remoteHydrationPendingRef.current) return;

    const signature = createTrailRecordSyncSignature(state.trailRecord);
    if (skipAutoSyncAfterRemoteHydrationRef.current) {
      lastSyncedSignatureRef.current = signature;
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
  }, [hydrated, state.demoLoaded, state.trailRecord, syncTrailRecord]);

  const loadDemo = useCallback(() => {
    skipAutoSyncAfterRemoteHydrationRef.current = false;
    dispatch({ type: "load_demo" });
  }, []);
  const ensurePriorityPath = useCallback(() => {
    skipAutoSyncAfterRemoteHydrationRef.current = false;
    dispatch({ type: "load_demo" });
  }, []);
  const answerQuestion = useCallback(
    (questionId: TrialQuestionId, value: string) => {
      skipAutoSyncAfterRemoteHydrationRef.current = false;
      dispatch({ type: "answer_question", questionId, value });
    },
    [],
  );
  const fillDemoAnswers = useCallback(() => {
    skipAutoSyncAfterRemoteHydrationRef.current = false;
    dispatch({ type: "fill_demo_answers" });
  }, []);
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
  const resetDemo = useCallback(() => {
    skipAutoSyncAfterRemoteHydrationRef.current = false;
    const recordId = state.trailRecord.recordId;
    if (recordId && isPathfinderApiEnabled()) {
      void deletePathfinderRecord(recordId).catch(() => undefined);
    }
    dispatch({ type: "reset_demo" });
  }, [state.trailRecord.recordId]);
  const trialAnswerMap = useMemo(
    () => trialAnswerMapFromRecord(state.trailRecord),
    [state.trailRecord],
  );

  const value = useMemo(
    () => ({
      state,
      trialAnswerMap,
      loadDemo,
      ensurePriorityPath,
      answerQuestion,
      fillDemoAnswers,
      saveMarkdownSnapshot,
      resetDemo,
    }),
    [
      state,
      trialAnswerMap,
      loadDemo,
      ensurePriorityPath,
      answerQuestion,
      fillDemoAnswers,
      saveMarkdownSnapshot,
      resetDemo,
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
    trialAnswers: record.trialAnswers,
    antiPackagingCheck: record.antiPackagingCheck,
    portfolioDraft: record.portfolioDraft,
    interviewPrep: record.interviewPrep,
    markdownSnapshot: record.markdownSnapshot,
  });
}
