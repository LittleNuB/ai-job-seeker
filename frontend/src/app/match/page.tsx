"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle, Clock3, Download, Loader2, RefreshCw, Target, XCircle } from "lucide-react";
import { exportApi, matchApi, positions as positionsApi } from "@/lib/api";
import { AuthRequiredError, redirectToLogin, requireAuth } from "@/lib/auth";
import ChatPanel from "@/components/chat/ChatPanel";
import FileUploader from "@/components/FileUploader";
import ScoreBar from "@/components/ScoreBar";
import ScoreRing from "@/components/ScoreRing";

interface PositionOption {
  id: string;
  name: string;
}

interface MatchFailure {
  title: string;
  message: string;
  hint: string;
  isTimeout: boolean;
}

const MATCH_TIMEOUT_MS = 90_000;

const WAIT_STEPS = [
  { title: "整理输入", detail: "正在读取简历和岗位要求，准备匹配上下文。" },
  { title: "提取证据", detail: "正在从简历中寻找可验证的技能、经历和协作证据。" },
  { title: "多维评分", detail: "正在按硬技能、经验、文化匹配和成长潜力分别打分。" },
  { title: "生成建议", detail: "正在整理优势、缺口、面试策略和提升计划。" },
];

function waitStageIndex(seconds: number): number {
  if (seconds >= 45) return 3;
  if (seconds >= 22) return 2;
  if (seconds >= 8) return 1;
  return 0;
}

function waitProgress(seconds: number): number {
  if (seconds < 8) return 12 + seconds * 3;
  if (seconds < 22) return 36 + (seconds - 8) * 2;
  if (seconds < 45) return 64 + Math.floor((seconds - 22) * 0.8);
  return Math.min(92, 82 + Math.floor((seconds - 45) * 0.2));
}

function MatchPageContent() {
  const searchParams = useSearchParams();
  const [resumeText, setResumeText] = useState("");
  const [positionId, setPositionId] = useState("");
  const [jdText, setJdText] = useState("");
  const [showJd, setShowJd] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [recordId, setRecordId] = useState("");
  const [loading, setLoading] = useState(false);
  const [matchStartedAt, setMatchStartedAt] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [positionsLoading, setPositionsLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [failure, setFailure] = useState<MatchFailure | null>(null);
  const [positionList, setPositionList] = useState<PositionOption[]>([]);
  const [positionsLoaded, setPositionsLoaded] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const activeRunRef = useRef(0);

  const loadPositions = useCallback(async () => {
    if (positionsLoaded) return positionList;

    setPositionsLoading(true);
    try {
      const list = await positionsApi.getPositions();
      setPositionList(list);
      setPositionsLoaded(true);
      return list;
    } catch (err) {
      console.error("Failed to load positions:", err);
      setError(err instanceof Error ? err.message : "加载岗位列表失败");
      return [];
    } finally {
      setPositionsLoading(false);
    }
  }, [positionList, positionsLoaded]);

  useEffect(() => {
    const from = searchParams.get("from");
    if (!from) return;

    const raw = localStorage.getItem("match_prefill");
    if (!raw) return;

    try {
      const data = JSON.parse(raw);
      localStorage.removeItem("match_prefill");

      if (data.jdText) {
        setJdText(data.jdText);
        setShowJd(true);
      }

      if (data.positionId) {
        setPositionId(data.positionId);
        loadPositions();
      } else if (data.positionName) {
        loadPositions().then((list) => {
          const matched = list.find(
            (position: PositionOption) =>
              position.name.includes(data.positionName) || data.positionName.includes(position.name),
          );
          if (matched) setPositionId(matched.id);
        });
      }
    } catch {
      localStorage.removeItem("match_prefill");
    }
  }, [loadPositions, searchParams]);

  useEffect(() => {
    if (!loading || !matchStartedAt) return undefined;

    const timer = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - matchStartedAt) / 1000));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [loading, matchStartedAt]);

  async function handleMatch() {
    if (!resumeText.trim() || !positionId) return;
    if (!requireAuth()) {
      setError("请先登录后再进行简历匹配");
      return;
    }

    setLoading(true);
    setElapsedSeconds(0);
    setMatchStartedAt(Date.now());
    setError("");
    setNotice("");
    setFailure(null);
    setResult(null);
    setRecordId("");
    const controller = new AbortController();
    abortRef.current = controller;
    const runId = activeRunRef.current + 1;
    activeRunRef.current = runId;
    const timeoutId = window.setTimeout(() => {
      controller.abort("timeout");
    }, MATCH_TIMEOUT_MS);

    try {
      const response = await matchApi.analyze({
        resume_text: resumeText,
        position_id: positionId,
        ...(jdText.trim() ? { jd_text: jdText } : {}),
      }, {
        signal: controller.signal,
      });
      if (activeRunRef.current !== runId) return;
      setRecordId(response.record_id);
      setResult(response);
    } catch (err: unknown) {
      if (activeRunRef.current !== runId) return;
      if (err instanceof Error && err.message === "请求已取消") {
        setNotice("已取消本次匹配分析，可以调整简历或岗位后重新开始。");
        return;
      }
      if (err instanceof AuthRequiredError) {
        setError(err.message);
        redirectToLogin();
        return;
      }
      const message = err instanceof Error ? err.message : "匹配分析失败，请稍后重试";
      const isTimeout = message.includes("超时");
      setFailure({
        title: isTimeout ? "匹配分析超时" : "匹配分析失败",
        message,
        hint: isTimeout
          ? "当前模型响应时间过长，可以稍后重试，或减少简历/JD 文本长度后再次分析。"
          : "请检查网络和后端服务状态；如果输入内容较长，也可以精简后重新分析。",
        isTimeout,
      });
    } finally {
      window.clearTimeout(timeoutId);
      if (activeRunRef.current === runId) {
        setLoading(false);
        setMatchStartedAt(null);
        abortRef.current = null;
      }
    }
  }

  function handleCancelMatch() {
    activeRunRef.current += 1;
    abortRef.current?.abort("cancel");
    abortRef.current = null;
    setLoading(false);
    setMatchStartedAt(null);
    setNotice("已取消本次匹配分析，可以调整简历或岗位后重新开始。");
  }

  function handleExport() {
    if (!recordId) return;
    if (!requireAuth()) {
      setError("请先登录后再导出报告");
      return;
    }
    exportApi.downloadReport(recordId).catch((err) => {
      if (err instanceof AuthRequiredError) {
        setError(err.message);
        redirectToLogin();
        return;
      }
      setError(err instanceof Error ? err.message : "导出失败，请稍后重试");
    });
  }

  function severityColor(severity: string) {
    if (severity === "高") return "bg-red-50 text-red-700";
    if (severity === "中") return "bg-yellow-50 text-yellow-700";
    return "bg-green-50 text-green-700";
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">简历匹配</h1>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <FileUploader onTextExtracted={setResumeText} label="上传简历文件" />
          <div className="mb-3 text-sm font-medium text-gray-700">简历内容</div>
          <textarea
            value={resumeText}
            onChange={(event) => setResumeText(event.target.value)}
            placeholder="粘贴你的简历内容..."
            className="h-48 w-full resize-none rounded-lg border border-gray-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="mb-3 text-sm font-medium text-gray-700">目标岗位</div>
          <select
            value={positionId}
            onChange={(event) => setPositionId(event.target.value)}
            onFocus={loadPositions}
            className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">{positionsLoading ? "岗位加载中..." : "选择目标岗位..."}</option>
            {positionList.map((position) => (
              <option key={position.id} value={position.id}>
                {position.name}
              </option>
            ))}
          </select>

          <div className="mt-4">
            <button
              type="button"
              onClick={() => setShowJd((current) => !current)}
              className="text-xs text-blue-600 hover:text-blue-700"
            >
              {showJd ? "隐藏 JD 文本" : "附加 JD 文本（可选）"}
            </button>
            {showJd && (
              <textarea
                value={jdText}
                onChange={(event) => setJdText(event.target.value)}
                placeholder="粘贴 JD 内容，可增强匹配分析精度..."
                className="mt-2 h-32 w-full resize-none rounded-lg border border-gray-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={handleMatch}
        disabled={loading || !resumeText.trim() || !positionId}
        className="mb-6 w-full rounded-lg bg-blue-600 py-2.5 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> 匹配分析中...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <Target className="h-4 w-4" /> 开始匹配分析
          </span>
        )}
      </button>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <span className="text-sm text-red-700">{error}</span>
        </div>
      )}

      {notice && !loading && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
          <span className="text-sm text-blue-700">{notice}</span>
        </div>
      )}

      {loading && <MatchWaitingPanel elapsedSeconds={elapsedSeconds} onCancel={handleCancelMatch} />}

      {failure && !loading && <MatchFailurePanel failure={failure} onRetry={handleMatch} />}

      {result && (
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-10 rounded-lg border border-gray-200 bg-white p-6">
            <ScoreRing score={result.match_score} />
            <div className="w-64 space-y-3">
              {result.result?.score_breakdown &&
                Object.entries(result.result.score_breakdown).map(([key, value]) => (
                  <ScoreBar
                    key={key}
                    label={
                      key === "hard_skills_match"
                        ? "硬技能"
                        : key === "experience_match"
                          ? "经验"
                          : key === "culture_fit"
                            ? "文化匹配"
                            : "成长潜力"
                    }
                    value={value as number}
                  />
                ))}
            </div>
          </div>

          {result.result?.core_advantages && (
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <h3 className="mb-3 text-sm font-semibold text-green-600">核心优势</h3>
              <div className="space-y-2">
                {result.result.core_advantages.map((advantage: any, index: number) => (
                  <div key={index} className="flex items-start gap-2 text-sm">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-green-100 text-xs text-green-700">
                      {index + 1}
                    </span>
                    <div>
                      <span className="font-medium text-gray-900">{advantage.advantage}</span>
                      <span className="ml-2 text-gray-600">{advantage.evidence}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.result?.capability_gaps && (
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <h3 className="mb-3 text-sm font-semibold text-red-600">能力差距</h3>
              <div className="space-y-2">
                {result.result.capability_gaps.map((gap: any, index: number) => (
                  <div key={index} className="flex items-start gap-2 text-sm">
                    <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${severityColor(gap.severity)}`}>
                      {gap.severity}
                    </span>
                    <div>
                      <span className="font-medium text-gray-900">{gap.gap}</span>
                      <span className="ml-2 text-gray-600">{gap.mitigation}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.result?.improvement_plan && (
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <h3 className="mb-3 text-sm font-semibold text-gray-500">提升计划</h3>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { key: "immediate", label: "1-2 周" },
                  { key: "short_term", label: "1-3 月" },
                  { key: "medium_term", label: "3-6 月" },
                ].map(({ key, label }) => {
                  const items = result.result.improvement_plan[key];
                  if (!items?.length) return null;
                  return (
                    <div key={key} className="rounded-lg bg-gray-50 p-3">
                      <div className="mb-2 text-xs font-medium text-gray-400">{label}</div>
                      <div className="space-y-1">
                        {items.map((item: string, index: number) => (
                          <div key={index} className="text-xs text-gray-700">
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {recordId && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleExport}
                className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                <Download className="h-4 w-4" /> 导出匹配报告
              </button>
            </div>
          )}
        </div>
      )}

      <ChatPanel contextType="match" contextData={result ? { result: result.result } : undefined} />
    </div>
  );
}

export default function MatchPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-8 text-center text-gray-400">加载中...</div>}>
      <MatchPageContent />
    </Suspense>
  );
}

function MatchWaitingPanel({
  elapsedSeconds,
  onCancel,
}: {
  elapsedSeconds: number;
  onCancel: () => void;
}) {
  const activeIndex = waitStageIndex(elapsedSeconds);
  const progress = waitProgress(elapsedSeconds);

  return (
    <div className="mb-6 overflow-hidden rounded-lg border border-blue-100 bg-white shadow-sm">
      <div className="border-b border-blue-50 bg-blue-50/60 px-4 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
              <Loader2 className="h-4 w-4 animate-spin" />
            </span>
            <div>
              <div className="text-sm font-semibold text-gray-900">正在进行深度匹配分析</div>
              <div className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-500">
                <Clock3 className="h-3.5 w-3.5" />
                已用时 {elapsedSeconds} 秒
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
          >
            <XCircle className="h-3.5 w-3.5" />
            取消分析
          </button>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-blue-100">
          <div
            className="h-full rounded-full bg-blue-600 transition-all duration-700 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 divide-y divide-gray-100 md:grid-cols-4 md:divide-x md:divide-y-0">
        {WAIT_STEPS.map((step, index) => {
          const isActive = index === activeIndex;
          const isDone = index < activeIndex;
          return (
            <div key={step.title} className={`p-4 ${isActive ? "bg-blue-50/40" : "bg-white"}`}>
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                    isDone
                      ? "bg-green-100 text-green-700"
                      : isActive
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {index + 1}
                </span>
                <span className={`text-sm font-medium ${isActive ? "text-blue-700" : "text-gray-700"}`}>
                  {step.title}
                </span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-gray-500">{step.detail}</p>
            </div>
          );
        })}
      </div>

      {elapsedSeconds >= 30 && (
        <div className="border-t border-amber-100 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-800">
          当前模型需要完成证据提取和多维评分，等待时间可能超过 1 分钟。页面会在结果生成后自动展示。
        </div>
      )}
    </div>
  );
}

function MatchFailurePanel({
  failure,
  onRetry,
}: {
  failure: MatchFailure;
  onRetry: () => void;
}) {
  return (
    <div
      className={`mb-6 rounded-lg border bg-white p-4 shadow-sm ${
        failure.isTimeout ? "border-amber-200" : "border-red-200"
      }`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span
            className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
              failure.isTimeout ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
            }`}
          >
            <AlertCircle className="h-4 w-4" />
          </span>
          <div>
            <div className="text-sm font-semibold text-gray-900">{failure.title}</div>
            <p className="mt-1 text-sm leading-relaxed text-gray-600">{failure.message}</p>
            <p className="mt-2 text-xs leading-relaxed text-gray-500">{failure.hint}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          <RefreshCw className="h-4 w-4" />
          重新分析
        </button>
      </div>
    </div>
  );
}
