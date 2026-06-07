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
  LockKeyhole,
  Map as MapIcon,
  Navigation,
  PenLine,
  ShieldCheck,
  UserRound,
} from "lucide-react";
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
  candidatePolish,
  candidateProfile,
  createMarkdownInput,
  forbiddenClaimsNotice,
  flowSketchSteps,
  getRecommendationPath,
  markdownExportItems,
  metricRows,
  openSourceProject,
  pageCopy,
  portfolioDraft,
  portfolioPolishBoundary,
  priorityPathId,
  recommendationPaths,
  riskRows,
  sampleJdNotice,
  sampleJds,
  traceChain,
  trialQuestionImpacts,
  trialQuestions,
} from "./data";
import { requiredMarkdownSectionLabels } from "./contract";
import { generatePathfinderMarkdown, getMissingQuestionIds } from "./markdown";
import { usePathfinder } from "./state";
import type {
  BackendSyncStatus,
  PathfinderRecordStatus,
  PathId,
  PathVerdict,
  RequiredMarkdownSection,
} from "./types";

function toneForVerdict(verdict: PathVerdict) {
  if (verdict === "priority_trial") return "teal";
  if (verdict === "explore") return "amber";
  return "amber";
}

function labelForMissing(questionId: string) {
  return trialQuestions.find((question) => question.id === questionId)?.title;
}

function labelForRecordStatus(status: PathfinderRecordStatus) {
  const labels: Record<PathfinderRecordStatus, string> = {
    draft: "草稿",
    answers_incomplete: "6 问缺项",
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
    routeClass: string;
    routeStroke: string;
    nodeClass: string;
    badgeClass: string;
    panelClass: string;
    muted: string;
    shortLabel: string;
    x: number;
    y: number;
  }
> = {
  "industry-ai-product-assistant": {
    index: "01",
    routeClass: "border-teal-300 bg-teal-400/10 text-teal-100",
    routeStroke: "#2dd4bf",
    nodeClass: "border-teal-300 bg-teal-300 text-slate-950 shadow-[0_0_24px_rgba(45,212,191,0.35)]",
    badgeClass: "border-teal-300 bg-teal-300 text-slate-950",
    panelClass: "border-teal-200 bg-teal-50",
    muted: "text-teal-700",
    shortLabel: "主航线",
    x: 76,
    y: 27,
  },
  "industry-ai-solution-assistant": {
    index: "02",
    routeClass: "border-sky-300 bg-sky-400/10 text-sky-100",
    routeStroke: "#93c5fd",
    nodeClass: "border-sky-300 bg-sky-100 text-slate-900",
    badgeClass: "border-sky-200 bg-sky-50 text-sky-800",
    panelClass: "border-sky-200 bg-sky-50",
    muted: "text-sky-700",
    shortLabel: "次级航线",
    x: 76,
    y: 53,
  },
  "algorithm-llm-engineer": {
    index: "03",
    routeClass: "border-amber-400/60 bg-amber-400/10 text-amber-100",
    routeStroke: "#a3a3a3",
    nodeClass: "border-amber-300 bg-slate-200 text-slate-700",
    badgeClass: "border-amber-200 bg-amber-50 text-amber-800",
    panelClass: "border-amber-200 bg-amber-50",
    muted: "text-amber-700",
    shortLabel: "远距边界",
    x: 76,
    y: 78,
  },
};

const evidenceIconMap = {
  "JD 证据": FileText,
  "小 C 背景证据": UserRound,
  "OpenDocuments 证据": Database,
  "风险证据": ShieldCheck,
  "下一步试航": Navigation,
};

const evidenceShortLabelMap: Record<string, string> = {
  "JD 证据": "JD",
  "小 C 背景证据": "背景",
  "OpenDocuments 证据": "OpenDocs",
  "风险证据": "风险",
  "下一步试航": "试航",
};

function detailTitleForEvidence(title: string) {
  const titles: Record<string, string> = {
    "JD 证据": "JD 信号详情",
    "小 C 背景证据": "背景信号详情",
    "OpenDocuments 证据": "OpenDocuments 参照详情",
    "风险证据": "风险边界详情",
    "下一步试航": "试航动作详情",
  };
  return titles[title] ?? title;
}

function firstPoint(points: string[]) {
  return points[0] ?? "";
}

export function PathfinderEntryPage() {
  const { loadDemo } = usePathfinder();

  return (
    <div>
      <PageHeader
        title="寻径星图：小 C 的工程企业知识库 AI 助手试航"
        description={pageCopy.entrySubtitle}
      />

      <div className="grid gap-6 lg:grid-cols-[1.05fr_1.25fr]">
        <div className="rounded-lg border border-slate-800 bg-[#111b20] p-5 text-slate-100 shadow-sm">
          <div
            className="rounded-md border border-slate-700/80 p-5"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 30%, rgba(45,212,191,0.18) 0 1px, transparent 2px), radial-gradient(circle at 78% 24%, rgba(226,232,240,0.26) 0 1px, transparent 2px), linear-gradient(rgba(148,163,184,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.12) 1px, transparent 1px)",
              backgroundSize: "180px 140px, 220px 180px, 42px 42px, 42px 42px",
            }}
          >
            <div className="inline-flex rounded-md border border-teal-300/50 px-3 py-1 text-sm font-semibold text-teal-100">
              试航起点
            </div>
            <h2 className="mt-5 text-2xl font-semibold text-white">
              小 C 的试航起点
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              {pageCopy.entryScope}
            </p>
            <div className="mt-6 grid gap-3">
              {["小 C 背景", "3 条样例 JD", "OpenDocuments", "6 问试航", "Markdown"].map(
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
            <p className="mt-6 text-sm leading-6 text-slate-300">
              当前版本聚焦 OpenDocuments 和工程企业知识库 AI 助手试航，
              帮助体验者清楚看到路径判断、证据来源和输出边界。
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <ButtonLink
                href="/pathfinder/background"
                onClick={loadDemo}
                variant="primary"
              >
                开始小 C 试航
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </ButtonLink>
              <ButtonLink href="/pathfinder/background" variant="secondary">
                查看试航材料
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
                  从背景、JD、开源来源到结果档案保持同一条链路，便于复核来源和边界。
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
                  输出内容包括航迹表摘要、作品集一页纸草稿、指标表、风险清单和
                  Markdown 导出。
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
  const { state, loadDemo } = usePathfinder();

  return (
    <div>
      <PageHeader
        title="小 C 背景与 3 条样例 JD"
        description={pageCopy.fixedDemoNotice}
        eyebrow={state.demoLoaded ? "试航材料已载入" : "固定样例预览"}
      />

      <div className="mb-8 flex flex-wrap gap-3">
        <ActionButton onClick={loadDemo}>载入试航材料</ActionButton>
        <ButtonLink
          href="/pathfinder/recommendation"
          onClick={loadDemo}
          variant="secondary"
        >
          查看星图推荐
        </ButtonLink>
      </div>

      <Section title="小 C 优势 / 短板 / 目标">
        <Panel>
          <div className="mb-5 flex items-center gap-3 border-b border-slate-200 pb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-md border border-teal-200 bg-teal-50 text-teal-700">
              <UserRound className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <div className="text-sm font-semibold text-teal-700">起点坐标</div>
              <div className="text-base font-semibold text-slate-950">
                小 C 当前背景
              </div>
            </div>
          </div>
          <div className="grid gap-5 lg:grid-cols-4">
            <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
              <InfoBlock title="身份" items={[candidateProfile.identity]} />
            </div>
            <div className="rounded-md border border-teal-200 bg-teal-50 p-4">
              <InfoBlock title="优势" items={[candidatePolish.advantage]} />
            </div>
            <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
              <InfoBlock title="短板" items={[candidatePolish.weakness]} />
            </div>
            <div className="rounded-md border border-slate-200 bg-white p-4">
              <InfoBlock title="目标" items={[candidatePolish.goal]} />
            </div>
          </div>
          <div className="mt-5 border-t border-slate-200 pt-5">
            <InfoBlock
              title="技术基础"
              items={candidateProfile.technicalBasics}
            />
          </div>
        </Panel>
      </Section>

      <Section
        title="3 条样例 JD"
        description={sampleJdNotice}
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {sampleJds.map((jd, index) => (
            <div
              key={jd.id}
              className="min-w-0 rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-normal text-slate-500">
                <span className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-700">
                  {index + 1}
                </span>
                路径观测样本
              </div>
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-lg font-semibold text-slate-950">
                  {jd.title}
                </h3>
                <StatusPill
                  label={jd.statusLabel}
                  tone={
                    jd.targetPathId === "industry-ai-product-assistant"
                      ? "teal"
                      : jd.targetPathId === "industry-ai-solution-assistant"
                        ? "amber"
                        : "rose"
                  }
                />
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-700">
                {jd.scenario}
              </p>
              <div className="mt-4 space-y-4">
                <InfoBlock title="主要职责" items={jd.responsibilities} />
                <InfoBlock title="要求信号" items={jd.requirementSignals} />
                <InfoBlock title="小 C 连接点" items={jd.candidateConnection} />
                <InfoBlock title="待补点" items={jd.gapOrAdvice} />
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

export function PathfinderRecommendationPage() {
  const { state, ensurePriorityPath } = usePathfinder();
  const [selectedPathId, setSelectedPathId] = useState<PathId>(priorityPathId);
  const selectedPath = getRecommendationPath(selectedPathId);
  const selectedMeta = pathVisualMeta[selectedPathId];

  if (!state.demoLoaded) {
    return (
      <div>
        <PageHeader
          title="需要先加载小 C 背景和样例 JD"
          description="请先载入小 C 的背景和 3 条样例 JD，再查看路径星图。"
        />
        <Notice title="试航材料尚未载入" tone="amber">
          载入背景、样例 JD 和开源来源后，系统才会展示可追溯的路径判断。
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
        title="小 C 的 AI 转岗试航星图"
        description={sampleJdNotice}
      />

      <div className="mb-6">
        <Notice title="推荐结论" tone="teal">
          {pageCopy.recommendationConclusion}
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
                从小 C 当前背景出发，沿三条岗位航线查看证据、风险和下一步试航。
              </p>
            </div>
            <div className="rounded-md border border-amber-300/40 bg-amber-300/10 px-3 py-2 text-xs font-semibold text-amber-100">
              风险边界：可视化提示，不做能力否定
            </div>
          </div>
          <div
            className="relative hidden min-h-[590px] overflow-hidden rounded-md border border-slate-700/80 lg:block"
            style={{
              backgroundImage:
                "radial-gradient(circle at 18% 22%, rgba(45,212,191,0.2) 0 1px, transparent 2px), radial-gradient(circle at 60% 12%, rgba(226,232,240,0.32) 0 1px, transparent 2px), radial-gradient(circle at 82% 76%, rgba(226,232,240,0.24) 0 1px, transparent 2px), linear-gradient(rgba(148,163,184,0.13) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.13) 1px, transparent 1px)",
              backgroundSize: "170px 130px, 210px 150px, 240px 190px, 48px 48px, 48px 48px",
            }}
          >
            <svg
              className="absolute inset-0 h-full w-full"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path
                d="M20 82 C36 70 58 70 92 77 L92 96 L18 96 C10 90 11 86 20 82Z"
                fill="rgba(245, 158, 11, 0.11)"
                stroke="rgba(245, 158, 11, 0.55)"
                strokeDasharray="1.2 1.2"
              />
              <circle cx="18" cy="49" r="18" fill="none" stroke="rgba(148,163,184,0.16)" />
              <circle cx="18" cy="49" r="30" fill="none" stroke="rgba(148,163,184,0.11)" />
              <path
                d="M18 49 C32 25 52 28 76 27"
                fill="none"
                stroke={pathVisualMeta["industry-ai-product-assistant"].routeStroke}
                strokeLinecap="round"
                strokeWidth="0.75"
              />
              <path
                d="M18 49 C34 51 55 52 76 53"
                fill="none"
                stroke={pathVisualMeta["industry-ai-solution-assistant"].routeStroke}
                strokeLinecap="round"
                strokeWidth="0.55"
              />
              <path
                d="M18 49 C35 72 56 74 76 78"
                fill="none"
                stroke={pathVisualMeta["algorithm-llm-engineer"].routeStroke}
                strokeDasharray="1.4 1.4"
                strokeLinecap="round"
                strokeWidth="0.5"
              />
            </svg>

            <div className="absolute left-[7%] top-[38%] flex h-36 w-36 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-teal-300 bg-slate-950/85 text-center shadow-[0_0_34px_rgba(45,212,191,0.24)]">
              <UserRound className="h-8 w-8 text-teal-200" aria-hidden="true" />
              <div className="mt-2 text-lg font-semibold text-white">小 C</div>
              <div className="text-sm text-teal-100">当前背景</div>
            </div>

            {recommendationPaths.map((path) => {
              const meta = pathVisualMeta[path.id];
              const selected = selectedPathId === path.id;
              const evidenceNodes = path.evidence;
              return (
                <div key={path.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedPathId(path.id)}
                    className={`absolute w-[180px] rounded-md border p-3 text-left transition ${
                      selected
                        ? `${meta.routeClass} shadow-[0_0_28px_rgba(45,212,191,0.18)]`
                        : "border-slate-600 bg-slate-950/70 text-slate-200 hover:border-slate-400"
                    }`}
                    style={{
                      left: `${meta.x}%`,
                      top: `${meta.y}%`,
                      transform: "translateY(-50%)",
                    }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-semibold text-slate-400">
                        {meta.shortLabel}
                      </span>
                      <StatusPill
                        label={path.statusLabel}
                        tone={toneForVerdict(path.verdict)}
                      />
                    </div>
                    <h2 className="mt-2 text-base font-semibold leading-6 text-white">
                      {path.title}
                    </h2>
                  </button>

                  {evidenceNodes.map((evidence, index) => {
                    const Icon = evidenceIconMap[evidence.title];
                    const yOffset = path.id === "industry-ai-product-assistant"
                      ? 31
                      : path.id === "industry-ai-solution-assistant"
                        ? 53
                        : 74;
                    const xOffset = [36, 46, 56, 65, 72][index];
                    return (
                      <div
                        key={`${path.id}-${evidence.title}`}
                        className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2 text-center"
                        style={{ left: `${xOffset}%`, top: `${yOffset}%` }}
                      >
                        <span className={`flex h-9 w-9 items-center justify-center rounded-full border ${meta.nodeClass}`}>
                          <Icon className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <h3
                          role="heading"
                          aria-level={3}
                          className="max-w-[4.75rem] text-xs font-semibold leading-5 text-slate-100"
                        >
                          <span className="sr-only">{evidence.title}</span>
                          <span aria-hidden="true">
                            {evidenceShortLabelMap[evidence.title]}
                          </span>
                        </h3>
                      </div>
                    );
                  })}
                </div>
              );
            })}

            <div className="absolute bottom-5 left-5 rounded-md border border-slate-700 bg-slate-950/75 p-4 text-xs text-slate-300">
              <div className="mb-3 font-semibold text-slate-100">航线状态图例</div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="h-1 w-9 rounded-full bg-teal-300" />
                  优先试航（主航线）
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-1 w-9 rounded-full bg-sky-300" />
                  适合探索（次航线）
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-1 w-9 rounded-full border-t border-dashed border-slate-300" />
                  短期不建议
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-9 rounded-sm border border-amber-300/70 bg-amber-300/20" />
                  风险边界
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 lg:hidden">
            {recommendationPaths.map((path) => {
              const meta = pathVisualMeta[path.id];
              const primary = path.id === priorityPathId;
              return (
                <div
                  key={path.id}
                  className={`rounded-lg border p-4 ${
                    primary ? "border-teal-300 bg-white" : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md border text-sm font-semibold ${meta.badgeClass}`}>
                        {meta.index}
                      </span>
                      <div>
                        <h2 className="text-lg font-semibold text-slate-950">
                          {path.title}
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {primary ? path.summary : firstPoint(path.evidence[3]?.points ?? [])}
                        </p>
                      </div>
                    </div>
                    <StatusPill
                      label={path.statusLabel}
                      tone={toneForVerdict(path.verdict)}
                    />
                  </div>
                  {primary ? (
                    <div className="mt-4 rounded-md border border-teal-100 bg-teal-50 p-3">
                      <div className="text-sm font-semibold text-teal-800">
                        主路径证据节点
                      </div>
                      <div className="mt-3 grid gap-2">
                        {path.evidence.slice(0, 4).map((evidence) => {
                          const Icon = evidenceIconMap[evidence.title];
                          return (
                            <div
                              key={evidence.title}
                              className="flex items-center gap-3 rounded-md border border-white bg-white px-3 py-2 text-sm text-slate-700"
                            >
                              <Icon className="h-4 w-4 text-teal-700" aria-hidden="true" />
                              {detailTitleForEvidence(evidence.title)}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setSelectedPathId(path.id)}
                      className="mt-4 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm font-semibold text-slate-700"
                    >
                      展开查看当前路径说明
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className={`text-sm font-semibold ${selectedMeta.muted}`}>
                当前选中路径
              </div>
              <div className="mt-2 text-xl font-semibold text-slate-950">
                {selectedPath.title}
              </div>
            </div>
            <span className={`rounded-md border px-3 py-1 text-xs font-semibold ${selectedMeta.badgeClass}`}>
              {selectedPath.statusLabel}
            </span>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-700">
            {selectedPath.summary}
          </p>
          <div className="mt-5 space-y-3">
            {selectedPath.evidence.map((evidence) => {
              const Icon = evidenceIconMap[evidence.title];
              return (
                <div
                  key={evidence.title}
                  className={`rounded-md border p-3 ${selectedMeta.panelClass}`}
                >
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {detailTitleForEvidence(evidence.title)}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    {firstPoint(evidence.points)}
                  </p>
                </div>
              );
            })}
          </div>
          <div className="mt-5 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
            风险提示只用于提示表达边界，不代表失败、分数或岗位结果预测。
          </div>
          <div className="mt-5">
            <ButtonLink
              href="/pathfinder/trial"
              onClick={ensurePriorityPath}
              variant="primary"
            >
              开始 OpenDocuments 试航
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </ButtonLink>
          </div>
        </aside>
      </div>
    </div>
  );
}

export function PathfinderTrialPage() {
  const {
    state,
    trialAnswerMap,
    ensurePriorityPath,
    answerQuestion,
    fillDemoAnswers,
  } =
    usePathfinder();
  const selectedPathId = priorityPathId;
  const selectedPath = getRecommendationPath(selectedPathId);
  const missing = getMissingQuestionIds({
    trialQuestions,
    trialAnswers: trialAnswerMap,
  });
  const aiUsageMissing = !trialAnswerMap.ai_usage_explanation?.trim();
  const canOpenResult = Boolean(
    trialAnswerMap.ai_usage_explanation?.trim(),
  );

  useEffect(() => {
    if (!state.demoLoaded || state.trailRecord.selectedPathId !== priorityPathId) {
      ensurePriorityPath();
    }
  }, [ensurePriorityPath, state.demoLoaded, state.trailRecord.selectedPathId]);

  return (
    <div>
      <PageHeader
        title="OpenDocuments 6 问试航"
        description="先确认公开来源和使用边界，再完成 6 个问题，把工程企业知识库 AI 助手试航整理成可追溯的作品集起点。"
        eyebrow={`当前路径：${selectedPath.title} / ${selectedPath.statusLabel} / ${labelForRecordStatus(state.trailRecord.status)}`}
      />

      <div className="mb-6">
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
          <div className="flex items-start gap-3">
            <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <div>
              <div className="font-semibold">先标清来源，再记录自己的试航产出</div>
              <div className="mt-1">{pageCopy.trialBoundary}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.4fr]">
        <div className="space-y-6">
          <Section title="OpenDocuments 来源参照">
            <div
              className="rounded-lg border border-sky-200 bg-sky-50 p-5 shadow-sm"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(14,116,144,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(14,116,144,0.08) 1px, transparent 1px)",
                backgroundSize: "28px 28px",
              }}
            >
              <div className="flex items-start justify-between gap-3 border-b border-sky-200 pb-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-sky-300 bg-white text-sky-800">
                    <LockKeyhole className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-950">
                      公开项目能力，仅作为试航参照
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-700">
                      可用于理解企业知识库问答中的文档接入、AI 搜索、RAG 问答、引用来源和工具界面，不代表小 C 参与该项目开发。
                    </p>
                  </div>
                </div>
                <span className="rounded-md border border-sky-200 bg-white px-2.5 py-1 text-xs font-semibold text-sky-800">
                  只读来源
                </span>
              </div>
              <div className="mt-4 rounded-md border border-sky-200 bg-white p-3 text-sm leading-6 text-slate-700">
                <div className="font-semibold text-slate-950">来源坐标</div>
                <div className="mt-2">
                  来源：
                  <span className="break-all">{openSourceProject.sourceUrl}</span>
                  <br />
                  License：{openSourceProject.license}
                  <br />
                  定位：{openSourceProject.positioning}
                </div>
              </div>
              <div className="mt-4 grid gap-2">
                {openSourceProject.originalCapabilities.map((capability) => (
                  <div
                    key={capability}
                    className="flex items-center gap-3 rounded-md border border-sky-200 bg-white px-3 py-2 text-sm text-slate-700"
                  >
                    <Database className="h-4 w-4 shrink-0 text-sky-800" aria-hidden="true" />
                    {capability}
                  </div>
                ))}
              </div>
            </div>
          </Section>

          <Section title="本次可写入作品集的内容">
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <PenLine className="mt-1 h-5 w-5 shrink-0 text-teal-700" aria-hidden="true" />
                <p className="text-sm leading-6 text-slate-700">
                  小 C 可以表达的是场景理解、2 周试点方案、指标设计、风险识别和作品集表达草稿；不能写成 OpenDocuments 官方贡献或个人开发成果。
                </p>
              </div>
            </div>
          </Section>

          <Section title="试航进度">
            <Panel tone={toneForRecordStatus(state.trailRecord.status)}>
              <div className="flex flex-wrap items-center gap-3">
                <div className="text-sm font-semibold text-slate-950">
                  已完成 {trialQuestions.length - missing.length} /{" "}
                  {trialQuestions.length}
                </div>
                <StatusPill
                  label={labelForRecordStatus(state.trailRecord.status)}
                  tone={toneForRecordStatus(state.trailRecord.status)}
                />
                <StatusPill
                  label="试航包 v1"
                  tone="slate"
                />
                <StatusPill
                  label={labelForBackendSyncStatus(state.backendSync.status)}
                  tone={toneForBackendSyncStatus(state.backendSync.status)}
                />
              </div>
              {missing.length > 0 ? (
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  {pageCopy.missingQuestions}
                  <br />
                  未完成：{missing.map(labelForMissing).join("、")}。
                </p>
              ) : (
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  6 问已完成，可进入结果页复制或下载 Markdown。
                </p>
              )}
              {state.backendSync.status === "failed" ? (
                <p className="mt-2 text-sm leading-6 text-rose-800">
                  后端保存失败，不影响本地试航；刷新前会继续保留本地草稿。
                </p>
              ) : null}
              {aiUsageMissing ? (
                <div className="mt-3 rounded-md border border-amber-300 bg-white p-3 text-sm leading-6 text-amber-900">
                  {pageCopy.aiUsageBlocker}
                </div>
              ) : null}
              {state.trailRecord.antiPackagingCheck.blockingCount > 0 ? (
                <div className="mt-3 rounded-md border border-rose-200 bg-white p-3 text-sm leading-6 text-rose-900">
                  反包装检查命中阻断项：
                  {state.trailRecord.antiPackagingCheck.findings
                    .filter((finding) => finding.riskLevel === "blocking")
                    .map((finding) => finding.riskReason)
                    .join("；")}
                </div>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-3">
                <ActionButton onClick={fillDemoAnswers} variant="secondary">
                  填入小 C 示例作答，可继续编辑
                </ActionButton>
                {canOpenResult ? (
                  <ButtonLink href="/pathfinder/result">进入结果页</ButtonLink>
                ) : (
                  <ActionButton disabled>进入结果页</ActionButton>
                )}
              </div>
              {!canOpenResult ? (
                <p className="mt-3 text-xs leading-5 text-slate-600">
                  第 6 问为空时，结果页也会保持完整 Markdown 导出阻断。
                </p>
              ) : null}
            </Panel>
          </Section>
        </div>

        <Section title="小 C 试航工单">
          <div
            className="rounded-lg border border-slate-300 bg-white p-4 shadow-sm sm:p-5"
            style={{
              backgroundImage:
                "linear-gradient(rgba(15,23,42,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.04) 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          >
            <div className="mb-5 flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <ClipboardList className="mt-1 h-5 w-5 shrink-0 text-teal-700" aria-hidden="true" />
                <div>
                  <div className="text-base font-semibold text-slate-950">
                    试航工单
                  </div>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    6 个问题会生成航迹档案中的对应模块，请用自己能解释清楚的表达填写。
                  </p>
                </div>
              </div>
              <StatusPill
                label={`已完成 ${trialQuestions.length - missing.length} / ${trialQuestions.length}`}
                tone={missing.length > 0 ? "amber" : "teal"}
              />
            </div>
            <div className="space-y-4">
            {trialQuestions.map((question, index) => {
              const value = trialAnswerMap[question.id] ?? "";
              return (
                <div
                  key={question.id}
                  className={`rounded-md border bg-white p-4 ${
                    value.trim()
                      ? "border-teal-100"
                      : question.id === "ai_usage_explanation"
                        ? "border-amber-300"
                        : "border-slate-200"
                  }`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <label
                      htmlFor={question.id}
                      className="flex min-w-0 items-start gap-3 text-base font-semibold text-slate-950"
                    >
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border text-sm ${
                        value.trim()
                          ? "border-teal-200 bg-teal-50 text-teal-800"
                          : "border-slate-200 bg-slate-50 text-slate-700"
                      }`}>
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
                    placeholder="填写小 C 对这一问的试航作答"
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
          </div>
        </Section>
      </div>
    </div>
  );
}

export function PathfinderResultPage() {
  const { state, trialAnswerMap, fillDemoAnswers, saveMarkdownSnapshot } =
    usePathfinder();
  const [copyStatus, setCopyStatus] = useState<string>("");
  const selectedPathId = priorityPathId;
  const selectedPath = getRecommendationPath(selectedPathId);
  const markdownInput = useMemo(
    () => createMarkdownInput(selectedPathId, trialAnswerMap),
    [selectedPathId, trialAnswerMap],
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
        title="航迹档案：航迹表结果页"
        description={pageCopy.resultBoundary}
        eyebrow={`推荐路径：${selectedPath.title} / ${labelForRecordStatus(state.trailRecord.status)}`}
      />

      <div className="mb-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
              <GitBranch className="h-4 w-4 text-teal-700" aria-hidden="true" />
              追溯链
            </div>
            <StatusPill
              label={labelForRecordStatus(state.trailRecord.status)}
              tone={toneForRecordStatus(state.trailRecord.status)}
            />
            <StatusPill
              label="试航包 v1"
              tone="slate"
            />
            <StatusPill
              label={labelForBackendSyncStatus(state.backendSync.status)}
              tone={toneForBackendSyncStatus(state.backendSync.status)}
            />
          </div>
          <p className="mt-3 text-base leading-7 text-slate-800">
            {traceChain}
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
              body="样例 JD、小 C 背景、OpenDocuments 公开来源"
            />
            <ArrowRight className="hidden h-5 w-5 text-teal-700 md:block" aria-hidden="true" />
            <TraceNode
              icon={<ClipboardList className="h-5 w-5" aria-hidden="true" />}
              title="过程"
              body="6 问试航作答与边界说明"
            />
            <ArrowRight className="hidden h-5 w-5 text-teal-700 md:block" aria-hidden="true" />
            <TraceNode
              icon={<BookOpen className="h-5 w-5" aria-hidden="true" />}
              title="输出"
              body="航迹表、作品集草稿、Markdown"
            />
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-md border ${
              markdownResult.ok
                ? "border-teal-200 bg-teal-50 text-teal-700"
                : "border-amber-200 bg-amber-50 text-amber-700"
            }`}>
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
        </div>
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
          <Notice title="6 问尚未完成" tone="amber">
            {pageCopy.missingQuestions}
            <br />
            缺少：{missing.map(labelForMissing).join("、")}。
            <div className="mt-3">
              <ActionButton onClick={fillDemoAnswers} variant="secondary">
                填入小 C 示例作答，可继续编辑
              </ActionButton>
            </div>
          </Notice>
        </div>
      ) : null}

      <Section title="1. 航迹表摘要">
        <Panel>
          <DataTable
            headers={["字段", "内容"]}
            rows={[
              ["试航对象", openSourceProject.name],
              ["推荐路径", selectedPath.title],
              ["试航主题", "工程企业知识库 AI 助手"],
              [
                "输入来源",
                "小 C 背景 + 3 条样例 JD + OpenDocuments 公开来源",
              ],
              ["输出结果", "作品集一页纸草稿 + 指标表 + 风险清单"],
            ]}
          />
        </Panel>
      </Section>

      <Section title="2. 作品集一页纸草稿">
        <Panel>
          <div className="grid gap-4 lg:grid-cols-2">
            <InfoBlock title="标题" items={[portfolioDraft.title]} />
            <InfoBlock title="作者" items={[portfolioDraft.author]} />
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
            <InfoBlock title="我的产出" items={portfolioDraft.outputs} />
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
