"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle, Download, Loader2, Target } from "lucide-react";
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

function MatchPageContent() {
  const searchParams = useSearchParams();
  const [resumeText, setResumeText] = useState("");
  const [positionId, setPositionId] = useState("");
  const [jdText, setJdText] = useState("");
  const [showJd, setShowJd] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [recordId, setRecordId] = useState("");
  const [loading, setLoading] = useState(false);
  const [positionsLoading, setPositionsLoading] = useState(false);
  const [error, setError] = useState("");
  const [positionList, setPositionList] = useState<PositionOption[]>([]);
  const [positionsLoaded, setPositionsLoaded] = useState(false);

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

  async function handleMatch() {
    if (!resumeText.trim() || !positionId) return;
    if (!requireAuth()) {
      setError("请先登录后再进行简历匹配");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await matchApi.analyze({
        resume_text: resumeText,
        position_id: positionId,
        ...(jdText.trim() ? { jd_text: jdText } : {}),
      });
      setRecordId(response.record_id);
      setResult(response);
    } catch (err: unknown) {
      if (err instanceof AuthRequiredError) {
        setError(err.message);
        redirectToLogin();
        return;
      }
      setError(err instanceof Error ? err.message : "匹配分析失败，请稍后重试");
    } finally {
      setLoading(false);
    }
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
