"use client";

import { useEffect, useMemo, useState } from "react";
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
import {
  p1aTrialPackage,
  requiredMarkdownSectionLabels,
} from "./contract";
import { generatePathfinderMarkdown, getMissingQuestionIds } from "./markdown";
import { usePathfinder } from "./state";
import type {
  BackendSyncStatus,
  PathfinderRecordStatus,
  PathVerdict,
  RequiredMarkdownSection,
} from "./types";

function toneForVerdict(verdict: PathVerdict) {
  if (verdict === "priority_trial") return "teal";
  if (verdict === "explore") return "amber";
  return "rose";
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

export function PathfinderEntryPage() {
  const { loadDemo } = usePathfinder();

  return (
    <div>
      <PageHeader
        title="寻径星图：小 C 的工程企业知识库 AI 助手试航"
        description={pageCopy.entrySubtitle}
      />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Panel tone="teal">
          <h2 className="text-2xl font-semibold text-slate-950">
            固定 Demo 边界
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-700">
            {pageCopy.entryScope}
          </p>
          <div className="mt-5 grid gap-3 text-sm text-slate-700 sm:grid-cols-5">
            {["小 C 背景", "3 条样例 JD", "OpenDocuments", "6 问试航", "Markdown"].map(
              (step, index) => (
                <div
                  key={step}
                  className="rounded-md border border-teal-200 bg-white p-3"
                >
                  <div className="text-xs font-semibold text-teal-700">
                    Step {index + 1}
                  </div>
                  <div className="mt-1 font-medium text-slate-900">{step}</div>
                </div>
              ),
            )}
          </div>
          <p className="mt-6 text-sm leading-6 text-slate-700">
            本次 Demo 只围绕 OpenDocuments 和工程企业知识库 AI 助手试航展开，
            不扩展真实检索、多项目推荐或动态岗位生成。
          </p>
          <div className="mt-5">
            <Notice title="反包装边界" tone="amber">
              {pageCopy.entryBoundaryNotice}
            </Notice>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <ButtonLink
              href="/pathfinder/background"
              onClick={loadDemo}
              variant="primary"
            >
              进入小 C Demo
            </ButtonLink>
            <ButtonLink href="/pathfinder/background" variant="secondary">
              查看固定样例
            </ButtonLink>
          </div>
        </Panel>

        <Panel>
          <h2 className="text-lg font-semibold text-slate-950">固定输入 / 输出</h2>
          <div className="mt-4">
            <BulletList items={pageCopy.entryBoundary} />
          </div>
          <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
            输出内容包括航迹表摘要、作品集一页纸草稿、指标表、风险清单和
            Markdown 导出。
          </div>
        </Panel>
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
        eyebrow={state.demoLoaded ? "Demo 已加载" : "固定样例预览"}
      />

      <div className="mb-8 flex flex-wrap gap-3">
        <ActionButton onClick={loadDemo}>一键加载 Demo</ActionButton>
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
          <div className="grid gap-5 lg:grid-cols-4">
            <InfoBlock title="身份" items={[candidateProfile.identity]} />
            <InfoBlock title="优势" items={[candidatePolish.advantage]} />
            <InfoBlock title="短板" items={[candidatePolish.weakness]} />
            <InfoBlock title="目标" items={[candidatePolish.goal]} />
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
          {sampleJds.map((jd) => (
            <Panel key={jd.id}>
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
            </Panel>
          ))}
        </div>
      </Section>
    </div>
  );
}

export function PathfinderRecommendationPage() {
  const { state, ensurePriorityPath } = usePathfinder();

  if (!state.demoLoaded) {
    return (
      <div>
        <PageHeader
          title="需要先加载小 C 背景和样例 JD"
          description="推荐页依赖固定 Demo 数据。请回到背景页加载小 C 背景与 3 条样例 JD。"
        />
        <Notice title="Demo 数据尚未加载" tone="amber">
          未加载 Demo 时不展示岗位路径判断，避免把静态样例误读为开放推荐器。
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

      <div className="grid gap-5">
        {recommendationPaths.map((path) => (
          <Panel key={path.id} tone={toneForVerdict(path.verdict)}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-xl font-semibold text-slate-950">
                    {path.title}
                  </h2>
                  <StatusPill
                    label={path.statusLabel}
                    tone={toneForVerdict(path.verdict)}
                  />
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  {path.summary}
                </p>
              </div>
              {path.id === "industry-ai-product-assistant" ? (
                <ButtonLink
                  href="/pathfinder/trial"
                  onClick={ensurePriorityPath}
                  variant="primary"
                >
                  开始 OpenDocuments 试航
                </ButtonLink>
              ) : (
                <div className="rounded-md border border-white/70 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
                  对照路径，仅保留下一步说明
                </div>
              )}
            </div>
            <div className="mt-5 grid gap-3 lg:grid-cols-5">
              {path.evidence.map((evidence) => (
                <div
                  key={evidence.title}
                  className="rounded-md border border-white/70 bg-white p-4"
                >
                  <h3 className="text-sm font-semibold text-slate-950">
                    {evidence.title}
                  </h3>
                  <div className="mt-3">
                    <BulletList items={evidence.points} />
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        ))}
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
        description="左侧是 OpenDocuments 原项目能力，右侧是小 C 本次试航贡献 / 固定 6 问作答。"
        eyebrow={`当前路径：${selectedPath.title} / ${selectedPath.statusLabel} / ${labelForRecordStatus(state.trailRecord.status)}`}
      />

      <div className="mb-6">
        <Notice title="边界提示" tone="teal">
          {pageCopy.trialBoundary}
        </Notice>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.4fr]">
        <div className="space-y-6">
          <Section title="OpenDocuments 原项目能力">
            <Panel>
              <div className="text-sm leading-6 text-slate-700">
                <p className="font-semibold text-slate-950">
                  OpenDocuments 是公开参考项目
                </p>
                <p className="mt-2">
                  原项目能力包括多来源文档接入、AI 文档搜索、RAG 问答、引用来源展示，以及 Web UI / CLI / MCP 等公开能力。
                </p>
                <p className="mt-2 text-slate-600">
                  定位：{openSourceProject.positioning}
                </p>
              </div>
              <div className="mt-4">
                <BulletList items={openSourceProject.originalCapabilities} />
              </div>
              <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-700">
                来源：
                <span className="break-all">{openSourceProject.sourceUrl}</span>
                <br />
                License：{openSourceProject.license}
              </div>
            </Panel>
          </Section>

          <Section title="小 C 本次试航贡献">
            <Panel tone="slate">
              <p className="text-sm leading-6 text-slate-700">
                小 C 的贡献只包括：场景拆解、2 周 MVP 方案、指标、风险、演示材料和作品集表达草稿。不得写成 OpenDocuments 官方贡献或个人开发成果。
              </p>
            </Panel>
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
                  label={`${p1aTrialPackage.id}@${p1aTrialPackage.version}`}
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
                  填入演示用小 C 作答，可继续编辑
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

        <Section title="小 C 本次试航贡献 / 固定 6 问作答">
          <div className="space-y-4">
            {trialQuestions.map((question, index) => {
              const value = trialAnswerMap[question.id] ?? "";
              return (
                <Panel key={question.id}>
                  <label
                    htmlFor={question.id}
                    className="block text-base font-semibold text-slate-950"
                  >
                    {index + 1}. {question.title}
                  </label>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    {question.prompt}
                  </p>
                  <p className="mt-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-700">
                    影响结果模块：{trialQuestionImpacts[question.id]}
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
                        : "这一问会影响结果页对应模块。"}
                    </p>
                  ) : null}
                </Panel>
              );
            })}
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
        title="航迹表结果页"
        description={pageCopy.resultBoundary}
        eyebrow={`推荐路径：${selectedPath.title} / ${labelForRecordStatus(state.trailRecord.status)}`}
      />

      <div className="mb-6">
        <Panel tone={toneForRecordStatus(state.trailRecord.status)}>
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-sm font-semibold text-slate-950">追溯链</div>
            <StatusPill
              label={labelForRecordStatus(state.trailRecord.status)}
              tone={toneForRecordStatus(state.trailRecord.status)}
            />
            <StatusPill
              label={`${p1aTrialPackage.id}@${p1aTrialPackage.version}`}
              tone="slate"
            />
            <StatusPill
              label={labelForBackendSyncStatus(state.backendSync.status)}
              tone={toneForBackendSyncStatus(state.backendSync.status)}
            />
          </div>
          <p className="mt-2 text-base leading-7 text-slate-800">
            {traceChain}
          </p>
          {state.backendSync.status === "failed" ? (
            <p className="mt-2 text-sm leading-6 text-rose-800">
              后端保存失败，不影响本地试航；可继续编辑或导出本地草稿。
            </p>
          ) : null}
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-md border border-white bg-white p-3 text-sm text-slate-700">
              输入：样例 JD、小 C 背景、OpenDocuments 原项目能力
            </div>
            <div className="rounded-md border border-white bg-white p-3 text-sm text-slate-700">
              过程：固定 6 问试航作答
            </div>
            <div className="rounded-md border border-white bg-white p-3 text-sm text-slate-700">
              输出：航迹表、作品集草稿、Markdown
            </div>
          </div>
        </Panel>
      </div>

      <Section title="P1-A 反包装检查摘要">
        <Panel tone={antiPackagingCheck.exportAllowed ? "teal" : "rose"}>
          <div className="grid gap-3 md:grid-cols-3">
            <InfoBlock
              title="检查状态"
              items={[
                antiPackagingCheck.status === "passed"
                  ? "通过，可完整导出"
                  : antiPackagingCheck.status === "blocked"
                    ? "阻断完整 Markdown 导出"
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
              title="模板源"
              items={[`frontend / ${markdownResult.ok ? markdownResult.snapshot.templateVersion : "等待完整快照"}`]}
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
                填入演示用小 C 作答，可继续编辑
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
                "小 C 背景 + 3 条样例 JD + OpenDocuments 原项目能力",
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
