"use client";

import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  CircleAlert,
  ClipboardList,
  Database,
  FileText,
  GitBranch,
  Map as MapIcon,
  MessageSquareText,
  PencilLine,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import {
  ActionButton,
  BulletList,
  ButtonLink,
  DataTable,
  Notice,
  PageHeader,
  Panel,
  Section,
  StatusPill,
} from "./components";
import {
  buildRecommendationPaths,
  createMarkdownInput,
  displayNameForProfile,
  flowSketchSteps,
  forbiddenClaimsNotice,
  getApprovedProjectMatches,
  getP1BRolePath,
  getRecommendationPath,
  isUserProfileReady,
  markdownExportItems,
  metricRows,
  openDocumentsProjectRecord,
  pageCopy,
  portfolioDraft,
  portfolioPolishBoundary,
  priorityPathId,
  riskRows,
  sampleJdNotice,
  traceChainForProfile,
  trialQuestionImpacts,
  trialQuestions,
  userProfileFields,
} from "./data";
import { requiredMarkdownSectionLabels } from "./contract";
import { requestPathfinderProjects } from "./api";
import { generatePathfinderMarkdown } from "./markdown";
import { usePathfinder } from "./state";
import type {
  BackendSyncStatus,
  OpenSourceProjectRecord,
  PathfinderRecordStatus,
  PathId,
  ProjectMatch,
  RecommendationDecision,
  RequiredMarkdownSection,
  TrialQuestion,
  UserProfileInput,
} from "./types";

function toneForDecision(decision: RecommendationDecision) {
  if (decision === "priority_trial") return "teal";
  if (decision === "explore") return "amber";
  return "rose";
}

function labelForDecision(decision: RecommendationDecision) {
  const labels: Record<RecommendationDecision, string> = {
    priority_trial: "优先试航",
    explore: "可探索",
    not_recommended_short_term: "暂缓主攻",
    insufficient_information: "信息不足",
  };
  return labels[decision];
}

function labelForMissing(questionId: string) {
  return trialQuestions.find((question) => question.id === questionId)?.title;
}

function labelForRecordStatus(status: PathfinderRecordStatus) {
  const labels: Record<PathfinderRecordStatus, string> = {
    draft: "草稿",
    answers_incomplete: "问答缺项",
    anti_packaging_blocked: "反包装阻断",
    ready_to_export: "完整可导出",
    exported: "已保存快照",
  };
  return labels[status];
}

function toneForRecordStatus(status: PathfinderRecordStatus) {
  if (status === "ready_to_export" || status === "exported") return "teal";
  if (status === "anti_packaging_blocked") return "rose";
  return "amber";
}

function labelForBackendSyncStatus(status: BackendSyncStatus) {
  const labels: Record<BackendSyncStatus, string> = {
    local_only: "本地草稿",
    creating: "正在保存",
    saving: "正在保存",
    saved: "已保存",
    failed: "保存失败，可继续本地试航",
  };
  return labels[status];
}

function toneForBackendSyncStatus(status: BackendSyncStatus) {
  if (status === "saved") return "teal";
  if (status === "failed") return "rose";
  return "amber";
}

const pathVisualMeta: Record<
  PathId,
  {
    index: string;
    shortLabel: string;
    panelClass: string;
  }
> = {
  "industry-ai-product-assistant": {
    index: "01",
    shortLabel: "主航线",
    panelClass: "border-teal-200 bg-teal-50",
  },
  "industry-ai-solution-assistant": {
    index: "02",
    shortLabel: "探索线",
    panelClass: "border-sky-200 bg-sky-50",
  },
  "ai-data-evaluation-assistant": {
    index: "03",
    shortLabel: "评测线",
    panelClass: "border-violet-200 bg-violet-50",
  },
  "ai-application-ops-implementation-assistant": {
    index: "04",
    shortLabel: "Ops",
    panelClass: "border-cyan-200 bg-cyan-50",
  },
  "algorithm-llm-engineer": {
    index: "05",
    shortLabel: "长期线",
    panelClass: "border-amber-200 bg-amber-50",
  },
};

const interviewFallbackQuestions = [
  "请先讲一个你亲自参与过的真实项目或流程场景：当时要解决什么问题，你具体负责哪一部分？",
  "这个经历里你主要和谁协作？你需要理解或影响哪些人的需求、流程或决策？",
  "你当时处理了哪些资料、数据、文档或工具？最后形成了什么可展示的产出？",
  "这个过程中最难的一点是什么？你当时怎么判断、推进或调整？",
  "如果把这段经历用于 AI 求职试航，哪些内容可以如实展示，哪些内容需要脱敏、人工核验或明确不能声称？",
];

function isUsableChineseInterviewQuestion(content: string): boolean {
  const cjkCount = Array.from(content).filter(
    (char) => char >= "\u4e00" && char <= "\u9fff",
  ).length;
  const asciiLetterCount = Array.from(content).filter(
    (char) => /^[A-Za-z]$/.test(char),
  ).length;
  const hasMojibake = /[鎴璇鐢锛€]/.test(content);
  return Boolean(content.trim()) && !hasMojibake && cjkCount >= 6 && asciiLetterCount <= Math.max(18, cjkCount);
}

function displayInterviewContent(content: string, index: number, role: string): string {
  if (role !== "assistant" || isUsableChineseInterviewQuestion(content)) {
    return content;
  }
  return interviewFallbackQuestions[Math.min(index, interviewFallbackQuestions.length - 1)];
}

export function PathfinderEntryPage() {
  return (
    <div>
      <PageHeader
        title="寻径星图：航前试航"
        description={pageCopy.entrySubtitle}
      />

      <div className="grid gap-6 lg:grid-cols-[1.05fr_1.25fr]">
        <div className="rounded-lg border border-slate-800 bg-[#111b20] p-5 text-slate-100 shadow-sm">
          <div
            className="rounded-md border border-slate-700/80 p-5"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 30%, rgba(45,212,191,0.18) 0 1px, transparent 2px), radial-gradient(circle at 78% 24%, rgba(226,232,240,0.26) 0 1px, transparent 2px), linear-gradient(rgba(148,163,184,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.12) 1px, transparent 1px)",
              backgroundSize:
                "180px 140px, 220px 180px, 42px 42px, 42px 42px",
            }}
          >
            <div className="inline-flex rounded-md border border-teal-300/50 px-3 py-1 text-sm font-semibold text-teal-100">
              真实背景试航
            </div>
            <h2 className="mt-5 text-2xl font-semibold text-white">
              从真实背景开始一次试航
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              {pageCopy.entryScope}
            </p>
            <div className="mt-6 grid gap-3">
              {["真实背景", "样例 JD", "已审计项目", "试航问答", "Markdown"].map(
                (step, index) => (
                  <div key={step} className="flex items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-teal-300/60 bg-teal-300/10 text-sm font-semibold text-teal-100">
                      {index + 1}
                    </span>
                    <div className="h-px flex-1 bg-slate-700" />
                    <span className="min-w-[8.5rem] rounded-md border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-100">
                      {step}
                    </span>
                  </div>
                ),
              )}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <ButtonLink href="/pathfinder/background" variant="primary">
                填写背景
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </ButtonLink>
            </div>
          </div>
        </div>

        <div className="grid gap-5">
          <Panel>
            <div className="flex items-start gap-3">
              <MapIcon className="mt-1 h-5 w-5 shrink-0 text-teal-700" aria-hidden="true" />
              <div>
                <h2 className="text-lg font-semibold text-slate-950">
                  可追溯输入 / 输出
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  从用户背景、样例 JD、开源来源到结果档案保持同一条链路，便于复核来源和边界。
                </p>
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-semibold text-slate-950">输入坐标</div>
                <div className="mt-3">
                  <BulletList items={pageCopy.entryBoundary} />
                </div>
              </div>
              <div className="rounded-md border border-teal-200 bg-teal-50 p-4 text-sm leading-6 text-slate-700">
                <div className="font-semibold text-slate-950">输出资产</div>
                <p className="mt-3">
                  航迹表摘要、作品集一页纸草稿、指标表、风险清单和 Markdown 导出。
                </p>
              </div>
            </div>
          </Panel>

          <Notice title="反包装边界" tone="amber">
            {pageCopy.entryBoundaryNotice}
          </Notice>
        </div>
      </div>
    </div>
  );
}

export function PathfinderBackgroundPage() {
  const router = useRouter();
  const {
    state,
    userProfile,
    updateUserProfile,
    startInterviewSession,
    answerInterviewQuestion,
    extractInterviewSignals,
    updateExtractedSignal,
    confirmExtractedSignals,
    submitUserProfile,
  } = usePathfinder();
  const [interviewAnswer, setInterviewAnswer] = useState("");
  const [isInterviewBusy, setIsInterviewBusy] = useState(false);
  const ready = isUserProfileReady(userProfile);
  const hasPendingSignals = state.extractedSignals.length > 0;
  const canConfirmSignals = state.extractedSignals.some((signal) =>
    signal.userEditableText.trim(),
  );

  function updateField(key: keyof UserProfileInput, value: string) {
    updateUserProfile({ ...userProfile, [key]: value });
  }

  async function onStartInterview() {
    setIsInterviewBusy(true);
    try {
      await startInterviewSession();
    } finally {
      setIsInterviewBusy(false);
    }
  }

  async function onSendInterviewAnswer() {
    const answer = interviewAnswer.trim();
    if (!answer) return;
    setIsInterviewBusy(true);
    try {
      await answerInterviewQuestion(answer);
      setInterviewAnswer("");
    } finally {
      setIsInterviewBusy(false);
    }
  }

  async function onExtractSignals() {
    setIsInterviewBusy(true);
    try {
      await extractInterviewSignals();
    } finally {
      setIsInterviewBusy(false);
    }
  }

  async function onConfirmSignals() {
    if (!canConfirmSignals) return;
    setIsInterviewBusy(true);
    try {
      await confirmExtractedSignals();
      router.push("/pathfinder/recommendation");
    } finally {
      setIsInterviewBusy(false);
    }
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready) return;
    submitUserProfile();
    router.push("/pathfinder/recommendation");
  }

  return (
    <div>
      <PageHeader
        title="航前访谈：先聊一轮背景"
        description="先用自然语言讲真实经历，系统会整理可编辑的转岗信号；只有你确认后的内容才会进入后续推荐。"
      />

      <div className="mb-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Panel>
          <div className="flex items-start gap-3">
            <MessageSquareText
              className="mt-1 h-5 w-5 shrink-0 text-teal-700"
              aria-hidden="true"
            />
            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                先聊一轮背景，再生成可编辑的转岗信号
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                你可以讲项目、流程、资料、协作、AI 工具和限制条件。AI
                只负责整理草稿，不替你编经历，也不直接决定推荐结果。
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {state.interviewMessages.length ? (
              state.interviewMessages.map((message, index) => (
                <div
                  key={message.id}
                  className={`rounded-md border p-3 text-sm leading-6 ${
                    message.role === "user"
                      ? "border-teal-200 bg-teal-50 text-teal-950"
                      : "border-slate-200 bg-slate-50 text-slate-800"
                  }`}
                >
                  <div className="mb-1 text-xs font-semibold text-slate-500">
                    {message.role === "user" ? "你的回答" : "下一问"}
                  </div>
                  {displayInterviewContent(message.content, index, message.role)}
                </div>
              ))
            ) : (
              <Notice title="从真实经历开始" tone="teal">
                不需要写成长表单。先回答一段话，后续问题会围绕你已经说过的内容继续追问。
              </Notice>
            )}
          </div>

          <label className="mt-5 block">
            <span className="text-sm font-semibold text-slate-950">
              你的回答
            </span>
            <textarea
              value={interviewAnswer}
              onChange={(event) => setInterviewAnswer(event.target.value)}
              rows={5}
              placeholder="例如：我做过客服知识库整理，把常见问题、处理流程和用户反馈归类，也用 AI 工具辅助整理初稿，但最终会人工确认。"
              className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            />
          </label>

          <div className="mt-4 flex flex-wrap gap-3">
            {!state.interviewSessionId ? (
              <ActionButton
                onClick={
                  interviewAnswer.trim()
                    ? onSendInterviewAnswer
                    : onStartInterview
                }
                disabled={isInterviewBusy}
              >
                {interviewAnswer.trim() ? "发送回答" : "开始访谈"}
              </ActionButton>
            ) : (
              <ActionButton
                onClick={onSendInterviewAnswer}
                disabled={!interviewAnswer.trim() || isInterviewBusy}
              >
                发送回答
              </ActionButton>
            )}
            <ActionButton
              onClick={onExtractSignals}
              variant="secondary"
              disabled={
                !state.interviewMessages.some(
                  (message) => message.role === "user",
                ) || isInterviewBusy
              }
            >
              整理信号草稿
            </ActionButton>
          </div>
        </Panel>

        <div className="grid content-start gap-4">
          <Notice
            title={
              state.aiInterviewStatus === "failed"
                ? "访谈服务暂不可用"
                : state.signalConfirmationStatus === "confirmed"
                  ? "信号已由你确认"
                  : hasPendingSignals
                    ? "信号待你确认"
                    : "用户保留控制权"
            }
            tone={
              state.signalConfirmationStatus === "confirmed"
                ? "teal"
                : state.aiInterviewStatus === "failed"
                  ? "rose"
                  : "amber"
            }
          >
            {state.aiInterviewStatus === "fallback"
              ? "当前使用本地兜底整理，不读取或暴露任何模型 key；你仍然可以编辑并确认信号。"
              : "AI 只整理你已经回答的内容；确认前不会进入推荐。"}
          </Notice>
          <Panel>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
              <PencilLine className="h-4 w-4 text-teal-700" aria-hidden="true" />
              AI 提取的背景信号草稿
            </div>
            {hasPendingSignals ? (
              <div className="mt-4 space-y-3">
                {state.extractedSignals.map((signal) => (
                  <label key={signal.signalId} className="block">
                    <span className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
                      {signal.label}
                      <StatusPill
                        label={
                          signal.confirmationStatus === "user_confirmed"
                            ? "用户已确认"
                            : signal.confirmationStatus ===
                                "pending_confirmation"
                              ? "待确认"
                              : "来自用户回答"
                        }
                        tone={
                          signal.confirmationStatus === "user_confirmed"
                            ? "teal"
                            : "amber"
                        }
                      />
                    </span>
                    <textarea
                      value={signal.userEditableText}
                      onChange={(event) =>
                        updateExtractedSignal(
                          signal.signalId,
                          event.target.value,
                        )
                      }
                      rows={3}
                      className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm leading-6 text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                    />
                  </label>
                ))}
                <ActionButton
                  onClick={onConfirmSignals}
                  disabled={!canConfirmSignals || isInterviewBusy}
                >
                  确认信号并查看推荐
                </ActionButton>
              </div>
            ) : (
              <p className="mt-3 text-sm leading-6 text-slate-600">
                回答后点击“整理信号草稿”，这里会出现可编辑信号。你可以删改措辞，再确认用于推荐。
              </p>
            )}
          </Panel>
        </div>
      </div>

      <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Panel>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-950">
              手动背景输入
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              如果访谈不可用，或你更想直接填写结构化背景，可以继续使用手动输入。
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {userProfileFields.map((field) => (
              <label
                key={field.key}
                className={field.rows && field.rows > 3 ? "md:col-span-2" : ""}
              >
                <span className="text-sm font-semibold text-slate-950">
                  {field.label}
                  {field.required ? (
                    <span className="ml-1 text-rose-600">*</span>
                  ) : null}
                </span>
                {field.rows ? (
                  <textarea
                    value={userProfile[field.key]}
                    onChange={(event) =>
                      updateField(field.key, event.target.value)
                    }
                    rows={field.rows}
                    placeholder={field.placeholder}
                    className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  />
                ) : (
                  <input
                    value={userProfile[field.key]}
                    onChange={(event) =>
                      updateField(field.key, event.target.value)
                    }
                    placeholder={field.placeholder}
                    className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  />
                )}
              </label>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <ActionButton type="submit" disabled={!ready}>
              保存背景并查看星图
            </ActionButton>
            <ButtonLink href="/pathfinder" variant="secondary">
              返回入口
            </ButtonLink>
          </div>
        </Panel>

        <div className="grid content-start gap-4">
          <Notice title={ready ? "背景已可用于证据链" : "请补齐必填背景"} tone={ready ? "teal" : "amber"}>
            推荐页会继续展示固定三条路径；这些输入只作为背景证据，不触发新推荐或评分。
          </Notice>
          <Panel tone="slate">
            <InfoBlock
              title="样例 JD 展示方式"
              items={[
                sampleJdNotice,
                "页面默认弱化公司名，仅展示样例 JD 与当前样本趋势参考。",
              ]}
            />
          </Panel>
        </div>
      </form>
    </div>
  );
}

function projectBoundaryItems(params: {
  match: ProjectMatch;
  project?: OpenSourceProjectRecord;
}) {
  const { match, project } = params;
  return [
    project
      ? `${project.name}：${project.description}`
      : `项目：${match.projectId}`,
    project
      ? `License：${project.license}（${project.licenseVerificationStatus}）`
      : "License：等待项目库返回核验信息。",
    project?.sourceBoundary
      ? `来源边界：${project.sourceBoundary}`
      : "来源边界：仅作已审计公开项目参考，不声明用户参与原项目。",
    ...match.boundaryNotes,
  ];
}

export function PathfinderRecommendationPage() {
  const { state, userProfile, generateTrialPackage } = usePathfinder();
  const router = useRouter();
  const [selectedPathId, setSelectedPathId] = useState<PathId>(priorityPathId);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [projects, setProjects] = useState<OpenSourceProjectRecord[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const fallbackPaths = useMemo(() => buildRecommendationPaths(userProfile), [userProfile]);
  const recommendation = state.recommendationResponse;
  const p1bPaths = recommendation?.paths ?? [];
  const selectedPath = getP1BRolePath(selectedPathId, recommendation);
  const approvedMatches = useMemo(
    () => getApprovedProjectMatches(selectedPathId, recommendation),
    [recommendation, selectedPathId],
  );
  const approvedMatchKey = approvedMatches
    .map((match) => match.projectId)
    .join("|");
  const projectById = useMemo(
    () => new Map(projects.map((project) => [project.projectId, project])),
    [projects],
  );
  const canGeneratePackage = approvedMatches.some(
    (match) => match.projectId === selectedProjectId,
  );
  const confirmedSignals =
    state.signalConfirmationStatus === "confirmed" && state.extractedSignals.length
      ? state.extractedSignals
      : [];

  useEffect(() => {
    let active = true;
    void requestPathfinderProjects().then((response) => {
      if (active) setProjects(response.projects);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const stillAvailable = approvedMatches.some(
      (match) => match.projectId === selectedProjectId,
    );
    if (!stillAvailable) {
      setSelectedProjectId(approvedMatches[0]?.projectId ?? "");
    }
  }, [approvedMatchKey, approvedMatches, selectedProjectId]);

  async function onGenerateTrialPackage() {
    if (!canGeneratePackage || !selectedProjectId || isGenerating) return;
    setIsGenerating(true);
    try {
      await generateTrialPackage({
        selectedPathId,
        selectedProjectId,
      });
      router.push("/pathfinder/trial");
    } finally {
      setIsGenerating(false);
    }
  }

  if (!state.profileSubmitted || !isUserProfileReady(userProfile)) {
    return (
      <div>
        <PageHeader
          title="需要先补充真实背景"
          description="请先在背景页填写专业、目标、时间线、经历、AI 工具、技术基础、困惑和限制条件，再查看路径星图。"
        />
        <Notice title="背景证据不足" tone="amber">
          P1-A 不套用默认身份或示意背景；缺少背景时不会展示伪造的用户证据链。
        </Notice>
        <div className="mt-6">
          <ButtonLink href="/pathfinder/background">返回背景页</ButtonLink>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={`${displayNameForProfile(userProfile)}的 AI 转岗试航星图`}
        description={sampleJdNotice}
      />

      <div className="mb-6">
        <Notice title="推荐依据" tone={recommendation?.source === "fallback_mock" ? "amber" : "teal"}>
          {pageCopy.recommendationConclusion}
          {recommendation?.source === "fallback_mock" ? (
            <>
              <br />
              当前使用本地规则兜底；推荐仍只使用你确认的背景、样例 JD 和已审计项目库。
            </>
          ) : null}
        </Notice>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-lg border border-slate-800 bg-[#111b20] p-4 text-slate-100 shadow-sm sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-teal-200">
                路径星图工作台
              </div>
              <p className="mt-1 text-sm text-slate-400">
                查看已确认信号、样例 JD、已审计项目和风险边界。
              </p>
            </div>
            <div className="rounded-md border border-amber-300/40 bg-amber-300/10 px-3 py-2 text-xs font-semibold text-amber-100">
              不做评分，AI 不直接决定结果
            </div>
          </div>
          <div className="grid gap-3">
            {(p1bPaths.length ? p1bPaths : fallbackPaths.map((path) => ({
              pathId: path.id,
              title: path.title,
              decision: path.verdict,
              rationale: path.summary,
              evidence: [],
              riskNotes: [],
              suggestedProjectTypes: [],
              nextTrialAction: "",
            }))).map((path) => {
              const selected = selectedPathId === path.pathId;
              const meta = pathVisualMeta[path.pathId];
              return (
                <button
                  type="button"
                  key={path.pathId}
                  onClick={() => setSelectedPathId(path.pathId)}
                  className={`rounded-md border p-4 text-left transition ${
                    selected
                      ? "border-teal-300 bg-teal-300/10"
                      : "border-slate-700 bg-slate-900/60 hover:border-slate-500"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md border border-slate-600 px-2 py-1 text-xs font-semibold text-slate-200">
                      {meta.index}
                    </span>
                    <span className="text-base font-semibold text-white">
                      {path.title}
                    </span>
                    <StatusPill
                      label={labelForDecision(path.decision)}
                      tone={toneForDecision(path.decision)}
                    />
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-300">
                    {path.rationale}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        <Panel>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-950">
              {selectedPath.title}
            </h2>
            <StatusPill
              label={labelForDecision(selectedPath.decision)}
              tone={toneForDecision(selectedPath.decision)}
            />
          </div>
          <p className="text-sm leading-6 text-slate-700">
            {selectedPath.rationale}
          </p>
          <div className="mt-5 space-y-3">
            {(confirmedSignals.length || recommendation?.profileSignals.length) ? (
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                  <UserRound className="h-4 w-4 text-teal-700" aria-hidden="true" />
                  已确认背景信号
                </div>
                <div className="mt-2">
                  <BulletList
                    items={(confirmedSignals.length
                      ? confirmedSignals
                      : recommendation?.profileSignals ?? []
                    ).map(
                      (signal) => `${signal.label}：${signal.evidenceText}`,
                    )}
                  />
                </div>
              </div>
            ) : null}
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                <FileText className="h-4 w-4 text-teal-700" aria-hidden="true" />
                路径证据链
              </div>
              <div className="mt-2">
                <BulletList
                  items={selectedPath.evidence.map(
                    (item) => `${item.title}：${item.detail}`,
                  )}
                />
              </div>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                <Database className="h-4 w-4 text-teal-700" aria-hidden="true" />
                已审计项目库
              </div>
              <div className="mt-3 space-y-3">
                {approvedMatches.length ? (
                  approvedMatches.map((match) => {
                    const project = projectById.get(match.projectId);
                    const selected = selectedProjectId === match.projectId;
                    return (
                      <button
                        key={`${match.rolePathId}-${match.projectId}`}
                        type="button"
                        onClick={() => setSelectedProjectId(match.projectId)}
                        className={`w-full rounded-md border p-3 text-left transition ${
                          selected
                            ? "border-teal-300 bg-teal-50"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-slate-950">
                            {project?.name ?? match.projectId}
                          </span>
                          <StatusPill
                            label={selected ? "当前可试航项目" : "已审计项目"}
                            tone={selected ? "teal" : "slate"}
                          />
                        </div>
                        <div className="mt-2">
                          <BulletList
                            items={projectBoundaryItems({ match, project })}
                          />
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <BulletList
                    items={[
                      "该路径当前没有可进入试航的已审计项目匹配。",
                      "待核验项目不会进入完整试航包生成链路。",
                    ]}
                  />
                )}
              </div>
            </div>
            {selectedPath.riskNotes.length ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                  <ShieldCheck className="h-4 w-4 text-amber-700" aria-hidden="true" />
                  风险边界
                </div>
                <div className="mt-2">
                  <BulletList items={selectedPath.riskNotes} />
                </div>
              </div>
            ) : null}
          </div>
          <div className="mt-5">
            {canGeneratePackage ? (
              <ActionButton onClick={onGenerateTrialPackage} disabled={isGenerating}>
                {isGenerating ? "正在生成试航包" : "生成试航包"}
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </ActionButton>
            ) : (
              <ActionButton disabled>该路径暂不生成试航包</ActionButton>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}

export function PathfinderTrialPage() {
  const { state, userProfile, trialAnswerMap, answerQuestion } =
    usePathfinder();
  const sourceProject =
    state.trailRecord.trialPackageCandidate?.sourceProject ??
    openDocumentsProjectRecord;

  const activeTrialQuestions = useMemo<TrialQuestion[]>(() => {
    const candidateQuestions =
      state.trailRecord.trialPackageCandidate?.trialQuestions;
    if (!candidateQuestions?.length) return trialQuestions;

    return candidateQuestions.map((question) => {
      const fallback = trialQuestions.find(
        (item) => item.id === question.questionId,
      );
      return {
        id: question.questionId,
        title: question.title,
        prompt: question.prompt,
        helper:
          fallback?.helper ??
          "请基于你的真实经历作答，并保留项目来源与个人产出的边界。",
      };
    });
  }, [state.trailRecord.trialPackageCandidate?.trialQuestions]);

  const missing = activeTrialQuestions.filter(
    (question) => !trialAnswerMap[question.id]?.trim(),
  );
  const canEnterResult =
    state.profileSubmitted &&
    isUserProfileReady(userProfile) &&
    missing.length === 0 &&
    state.trailRecord.status !== "anti_packaging_blocked";

  if (!state.profileSubmitted || !isUserProfileReady(userProfile)) {
    return (
      <div>
        <PageHeader
          title="需要先填写背景"
          description="试航问答必须基于真实用户背景开始，不提供默认身份或默认作答。"
        />
        <ButtonLink href="/pathfinder/background">返回背景页</ButtonLink>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={`${sourceProject.name} 试航问答`}
        description={pageCopy.trialBoundary}
        eyebrow={`候选人：${displayNameForProfile(userProfile)} / ${labelForRecordStatus(state.trailRecord.status)}`}
      />

      <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <div className="grid content-start gap-4">
          <Panel>
            <div className="flex items-center gap-3">
              <Database className="h-5 w-5 text-teal-700" aria-hidden="true" />
              <h2 className="text-lg font-semibold text-slate-950">
                {sourceProject.name} 来源参照
              </h2>
            </div>
            <div className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
              <p>项目：{sourceProject.name}</p>
              <p>来源：{sourceProject.sourceUrl}</p>
              <p>License：{sourceProject.license}</p>
              <p>核验状态：{sourceProject.licenseVerificationStatus}</p>
              {sourceProject.sourceBoundary ? (
                <p>{sourceProject.sourceBoundary}</p>
              ) : null}
              <InfoBlock
                title="公开能力"
                items={sourceProject.publicCapabilities.slice(0, 4)}
              />
              <InfoBlock
                title="可用表达边界"
                items={sourceProject.allowedContexts.slice(0, 3)}
              />
              <InfoBlock
                title="不可声称"
                items={sourceProject.forbiddenClaims.slice(0, 3)}
              />
            </div>
          </Panel>
          <Notice
            title={missing.length ? "试航问答尚未完成" : "试航问答已完成"}
            tone={missing.length ? "amber" : "teal"}
          >
            {missing.length
              ? `未完成：${missing.map((question) => question.title).join("、")}。`
              : "可以进入结果页查看反包装检查和 Markdown 导出。"}
          </Notice>
          <StatusPill
            label={labelForBackendSyncStatus(state.backendSync.status)}
            tone={toneForBackendSyncStatus(state.backendSync.status)}
          />
        </div>

        <Section title="试航作答">
          <Panel>
            <div className="space-y-5">
              {activeTrialQuestions.map((question, index) => {
                const value = trialAnswerMap[question.id] ?? "";
                return (
                  <div key={question.id} className="rounded-md border border-slate-200 bg-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <label
                        htmlFor={question.id}
                        className="flex items-center gap-3 text-base font-semibold text-slate-950"
                      >
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border text-sm ${
                            value.trim()
                              ? "border-teal-200 bg-teal-50 text-teal-800"
                              : "border-slate-200 bg-slate-50 text-slate-700"
                          }`}
                        >
                          {index + 1}
                        </span>
                        <span>{question.title}</span>
                      </label>
                      <StatusPill
                        label={value.trim() ? "已填写" : "缺项"}
                        tone={value.trim() ? "teal" : "amber"}
                      />
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-700">
                      {question.prompt}
                    </p>
                    <p className="mt-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-700">
                      {question.helper}
                    </p>
                    <p className="mt-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-700">
                      生成档案模块：{trialQuestionImpacts[question.id]}
                    </p>
                    <textarea
                      id={question.id}
                      value={value}
                      onChange={(event) =>
                        answerQuestion(question.id, event.target.value)
                      }
                      rows={5}
                      className="mt-4 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm leading-6 text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                      placeholder="填写你的真实试航作答"
                    />
                    {!value.trim() ? (
                      <p className="mt-2 text-xs text-amber-700">
                        {question.id === "ai_usage_explanation"
                          ? pageCopy.aiUsageBlocker
                          : "这一问会生成结果页中的对应档案内容。"}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              {canEnterResult ? (
                <ButtonLink href="/pathfinder/result">进入结果页</ButtonLink>
              ) : (
                <ActionButton disabled>进入结果页</ActionButton>
              )}
              <ButtonLink href="/pathfinder/recommendation" variant="secondary">
                返回星图
              </ButtonLink>
            </div>
          </Panel>
        </Section>
      </div>
    </div>
  );
}

export function PathfinderResultPage() {
  const { state, userProfile, trialAnswerMap, saveMarkdownSnapshot } =
    usePathfinder();
  const [copyStatus, setCopyStatus] = useState<string>("");
  const selectedPathId = state.trailRecord.selectedPathId as PathId;
  const selectedPath = getRecommendationPath(selectedPathId, userProfile);
  const sourceProject =
    state.trailRecord.trialPackageCandidate?.sourceProject ??
    openDocumentsProjectRecord;
  const activeTrialQuestions = useMemo<TrialQuestion[]>(() => {
    const candidateQuestions =
      state.trailRecord.trialPackageCandidate?.trialQuestions;
    if (!candidateQuestions?.length) return trialQuestions;

    return candidateQuestions.map((question) => {
      const fallback = trialQuestions.find(
        (item) => item.id === question.questionId,
      );
      return {
        id: question.questionId,
        title: question.title,
        prompt: question.prompt,
        helper:
          fallback?.helper ??
          "请基于你的真实经历作答，并保留项目来源与个人产出的边界。",
      };
    });
  }, [state.trailRecord.trialPackageCandidate?.trialQuestions]);
  const markdownInput = useMemo(
    () =>
      createMarkdownInput(
        selectedPathId,
        userProfile,
        trialAnswerMap,
        activeTrialQuestions,
        sourceProject,
      ),
    [
      activeTrialQuestions,
      selectedPathId,
      sourceProject,
      trialAnswerMap,
      userProfile,
    ],
  );
  const markdownResult = useMemo(
    () => generatePathfinderMarkdown(markdownInput),
    [markdownInput],
  );
  const missing =
    !markdownResult.ok && markdownResult.reason === "missing_questions"
      ? markdownResult.missingQuestionIds
      : [];
  const antiPackagingCheck = markdownResult.antiPackagingCheck;

  useEffect(() => {
    if (
      !markdownResult.ok &&
      markdownResult.reason === "anti_packaging_blocked" &&
      state.trailRecord.markdownSnapshot?.exportScope !== "draft"
    ) {
      saveMarkdownSnapshot(markdownResult.draftSnapshot, antiPackagingCheck);
    }
  }, [
    antiPackagingCheck,
    markdownResult,
    saveMarkdownSnapshot,
    state.trailRecord.markdownSnapshot?.exportScope,
  ]);

  async function copyMarkdown(markdown: string) {
    try {
      await navigator.clipboard.writeText(markdown);
      if (markdownResult.ok) {
        saveMarkdownSnapshot(markdownResult.snapshot, antiPackagingCheck);
      }
      setCopyStatus("Markdown 已复制。");
    } catch {
      setCopyStatus("复制失败，请手动选择预览内容。");
    }
  }

  function downloadMarkdown(markdown: string, filename: string) {
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
    if (markdownResult.ok) {
      saveMarkdownSnapshot(markdownResult.snapshot, antiPackagingCheck);
    }
    setCopyStatus("Markdown 已开始下载。");
  }

  return (
    <div>
      <PageHeader
        title="航迹档案：试航结果页"
        description={pageCopy.resultBoundary}
        eyebrow={`候选人：${displayNameForProfile(userProfile)} / 推荐路径：${selectedPath.title} / ${labelForRecordStatus(state.trailRecord.status)}`}
      />

      <div className="mb-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Panel>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
              <GitBranch className="h-4 w-4 text-teal-700" aria-hidden="true" />
              追溯链
            </div>
            <StatusPill
              label={labelForRecordStatus(state.trailRecord.status)}
              tone={toneForRecordStatus(state.trailRecord.status)}
            />
            <StatusPill label="试航包 v1" tone="slate" />
            <StatusPill
              label={labelForBackendSyncStatus(state.backendSync.status)}
              tone={toneForBackendSyncStatus(state.backendSync.status)}
            />
          </div>
          <p className="mt-3 text-base leading-7 text-slate-800">
            {traceChainForProfile(userProfile, sourceProject.name)}
          </p>
          {state.backendSync.status === "failed" ? (
            <p className="mt-2 text-sm leading-6 text-rose-800">
              后端保存失败，不影响本地试航；可继续编辑或导出本地草稿。
            </p>
          ) : null}
          <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-center">
            <TraceNode
              icon={<FileText className="h-5 w-5" aria-hidden="true" />}
              title="输入"
              body={`样例 JD、${displayNameForProfile(userProfile)}背景、${sourceProject.name} 公开来源`}
            />
            <ArrowRight className="hidden h-5 w-5 text-teal-700 md:block" aria-hidden="true" />
            <TraceNode
              icon={<ClipboardList className="h-5 w-5" aria-hidden="true" />}
              title="过程"
              body="试航作答与边界说明"
            />
            <ArrowRight className="hidden h-5 w-5 text-teal-700 md:block" aria-hidden="true" />
            <TraceNode
              icon={<BookOpen className="h-5 w-5" aria-hidden="true" />}
              title="输出"
              body="航迹表、作品集草稿、Markdown"
            />
          </div>
        </Panel>

        <Panel>
          <div className="flex items-start gap-3">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-md border ${
                markdownResult.ok
                  ? "border-teal-200 bg-teal-50 text-teal-700"
                  : "border-amber-200 bg-amber-50 text-amber-700"
              }`}
            >
              {markdownResult.ok ? (
                <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
              ) : (
                <CircleAlert className="h-6 w-6" aria-hidden="true" />
              )}
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-500">
                航迹档案状态
              </div>
              <div className="mt-1 text-xl font-semibold text-slate-950">
                {markdownResult.ok
                  ? "可生成完整 Markdown"
                  : "存在导出阻断，需补齐说明"}
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {antiPackagingCheck.exportAllowed
                  ? "反包装检查未发现阻断。"
                  : "缺项或风险表达会阻断完整导出。"}
              </p>
            </div>
          </div>
        </Panel>
      </div>

      <Section title="反包装检查摘要">
        <Panel tone={antiPackagingCheck.exportAllowed ? "teal" : "rose"}>
          <div className="grid gap-3 md:grid-cols-3">
            <InfoBlock
              title="检查状态"
              items={[
                antiPackagingCheck.status === "passed"
                  ? "未发现导出阻断，可生成完整 Markdown"
                  : antiPackagingCheck.status === "blocked"
                    ? "存在导出阻断，需补齐说明"
                    : antiPackagingCheck.status,
              ]}
            />
            <InfoBlock
              title="命中统计"
              items={[
                `阻断 ${antiPackagingCheck.blockingCount} 项`,
                `提示 ${antiPackagingCheck.warningCount} 项`,
              ]}
            />
            <InfoBlock
              title="导出状态"
              items={[markdownResult.ok ? "完整档案已就绪" : "等待补齐后生成完整档案"]}
            />
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {Object.entries(requiredMarkdownSectionLabels).map(
              ([section, label]) => (
                <div
                  key={section}
                  className={`rounded-md border px-3 py-2 text-sm ${
                    antiPackagingCheck.requiredMarkdownSections[
                      section as RequiredMarkdownSection
                    ]
                      ? "border-teal-100 bg-white text-slate-700"
                      : "border-rose-100 bg-rose-50 text-rose-800"
                  }`}
                >
                  {label.replace("## ", "")}
                </div>
              ),
            )}
          </div>
          {antiPackagingCheck.findings.length > 0 ? (
            <div className="mt-4 space-y-2">
              {antiPackagingCheck.findings.map((finding, index) => (
                <div
                  key={`${finding.ruleId}-${index}`}
                  className="rounded-md border border-rose-100 bg-white p-3 text-sm leading-6 text-rose-900"
                >
                  <div className="font-semibold">{finding.riskReason}</div>
                  <div className="mt-1 break-words text-rose-800">
                    {finding.matchedText}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </Panel>
      </Section>

      {missing.length > 0 ? (
        <div className="mb-6">
          <Notice title="试航问答尚未完成" tone="amber">
            {pageCopy.missingQuestions}
            <br />
            缺少：{missing.map(labelForMissing).join("、")}。
          </Notice>
        </div>
      ) : null}

      <Section title="1. 航迹表摘要">
        <DataTable
          headers={["字段", "内容"]}
          rows={[
            ["候选人", displayNameForProfile(userProfile)],
            ["试航对象", sourceProject.name],
            ["推荐路径", selectedPath.title],
            ["试航主题", "工程企业知识库 AI 助手"],
            [
              "输入来源",
              `${displayNameForProfile(userProfile)}背景 + 样例 JD + ${sourceProject.name} 公开来源`,
            ],
            ["输出结果", "作品集一页纸草稿 + 指标表 + 风险清单"],
          ]}
        />
      </Section>

      <Section title="2. 作品集一页纸草稿">
        <Panel>
          <div className="grid gap-4 lg:grid-cols-2">
            <InfoBlock title="标题" items={[portfolioDraft.title]} />
            <InfoBlock title="候选人" items={[displayNameForProfile(userProfile)]} />
            <InfoBlock title="目标岗位" items={[portfolioDraft.targetRole]} />
            <InfoBlock
              title="问题背景"
              items={[portfolioDraft.problemBackground]}
            />
            <InfoBlock
              title="方案概述"
              items={[portfolioDraft.solutionOverview]}
            />
            <InfoBlock title="MVP 范围" items={[portfolioDraft.mvpScope]} />
            <InfoBlock
              title="评估指标"
              items={portfolioDraft.evaluationMetrics}
            />
            <InfoBlock title="用户试航产出" items={portfolioDraft.outputs} />
          </div>
          <div className="mt-5">
            <Notice title="边界说明" tone="slate">
              {portfolioPolishBoundary}
            </Notice>
          </div>
        </Panel>
      </Section>

      <Section title="3. 指标表">
        <DataTable
          headers={["维度", "指标", "试航口径"]}
          rows={metricRows.map((row) => [
            row.dimension,
            row.metric,
            row.trialCriterion,
          ])}
        />
      </Section>

      <Section title="4. 用户流程草图说明">
        <Panel>
          <ol className="grid gap-3 lg:grid-cols-5">
            {flowSketchSteps.map((step, index) => (
              <li
                key={step}
                className="rounded-md border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-700"
              >
                <div className="mb-2 text-xs font-semibold text-teal-700">
                  Step {index + 1}
                </div>
                {step}
              </li>
            ))}
          </ol>
        </Panel>
      </Section>

      <Section title="5. 风险清单">
        <DataTable
          headers={["风险", "表现", "建议处理"]}
          rows={riskRows.map((row) => [
            row.risk,
            row.signal,
            row.suggestion,
          ])}
        />
      </Section>

      <Section title="6. 合规表达建议">
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel tone="teal">
            <h3 className="mb-3 text-base font-semibold text-slate-950">
              可用表达
            </h3>
            <BulletList items={markdownInput.complianceAdvice.allowed} />
          </Panel>
          <Panel tone="rose">
            <h3 className="mb-3 text-base font-semibold text-slate-950">
              回避表达
            </h3>
            <BulletList items={markdownInput.complianceAdvice.avoid} />
          </Panel>
        </div>
      </Section>

      <Section title="不可声称内容提示">
        <Notice title="不可声称" tone="rose">
          {forbiddenClaimsNotice}
        </Notice>
      </Section>

      <Section title="7. 面试追问准备">
        <div className="grid gap-4 lg:grid-cols-2">
          {markdownInput.interviewPrep.map((item) => (
            <Panel key={item.question}>
              <h3 className="text-base font-semibold text-slate-950">
                问：{item.question}
              </h3>
              <p className="mt-3 text-sm leading-6 text-slate-700">
                答：{item.answer}
              </p>
            </Panel>
          ))}
        </div>
      </Section>

      <Section title="8. Markdown 导出">
        <Panel tone={markdownResult.ok ? "teal" : "amber"}>
          <div className="mb-4">
            <p className="text-sm leading-6 text-slate-700">
              {pageCopy.markdownExportDescription}
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {markdownExportItems.map((item) => (
                <div
                  key={item}
                  className="rounded-md border border-white bg-white px-3 py-2 text-sm text-slate-700"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
          {markdownResult.ok ? (
            <div>
              <div className="mb-4 flex flex-wrap gap-3">
                <ActionButton
                  onClick={() => copyMarkdown(markdownResult.markdown)}
                >
                  复制 Markdown
                </ActionButton>
                <ActionButton
                  onClick={() =>
                    downloadMarkdown(
                      markdownResult.markdown,
                      markdownResult.filename,
                    )
                  }
                  variant="secondary"
                >
                  下载 Markdown
                </ActionButton>
                {copyStatus ? (
                  <span className="self-center text-sm text-teal-800">
                    {copyStatus}
                  </span>
                ) : null}
              </div>
              <textarea
                readOnly
                value={markdownResult.markdown}
                rows={18}
                className="w-full rounded-md border border-teal-200 bg-white px-3 py-2 font-mono text-xs leading-5 text-slate-800"
              />
            </div>
          ) : (
            <div>
              <p className="text-sm leading-6 text-slate-700">
                {markdownResult.reason === "anti_packaging_blocked"
                  ? "反包装检查命中阻断项，可保存草稿快照，但不能导出完整 Markdown。"
                  : pageCopy.missingQuestions}
              </p>
              {markdownResult.reason === "anti_packaging_blocked" ? (
                <textarea
                  readOnly
                  value={markdownResult.markdown}
                  rows={12}
                  className="mt-4 w-full rounded-md border border-rose-200 bg-white px-3 py-2 font-mono text-xs leading-5 text-slate-800"
                />
              ) : null}
              <div className="mt-4 flex flex-wrap gap-3">
                <ActionButton disabled>复制 Markdown</ActionButton>
                <ActionButton disabled variant="secondary">
                  下载 Markdown
                </ActionButton>
                <ButtonLink href="/pathfinder/trial" variant="secondary">
                  返回补充作答
                </ButtonLink>
              </div>
            </div>
          )}
        </Panel>
      </Section>
    </div>
  );
}

function InfoBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
      <div className="mt-2">
        <BulletList items={items} />
      </div>
    </div>
  );
}

function TraceNode({
  icon,
  title,
  body,
}: {
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
        <span className="text-teal-700">{icon}</span>
        {title}
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-700">{body}</p>
    </div>
  );
}
