"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, Download, FileText, Loader2, Tag } from "lucide-react";
import { exportApi, jd as jdApi } from "@/lib/api";
import { AuthRequiredError, redirectToLogin, requireAuth } from "@/lib/auth";
import ChatPanel from "@/components/chat/ChatPanel";
import FileUploader from "@/components/FileUploader";

export default function JDPage() {
  const router = useRouter();
  const [jdText, setJdText] = useState("");
  const [analysis, setAnalysis] = useState<any>(null);
  const [recordId, setRecordId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleGoMatch() {
    localStorage.setItem(
      "match_prefill",
      JSON.stringify({
        positionName: analysis?.position_overview?.inferred_role || "",
        jdText,
        source: "jd",
      }),
    );
    router.push("/match?from=jd");
  }

  async function handleAnalyze() {
    if (!jdText.trim()) return;
    if (!requireAuth()) {
      setError("请先登录后再解析 JD");
      return;
    }

    setLoading(true);
    setError("");
    setAnalysis(null);

    try {
      const response = await jdApi.analyze({ jd_text: jdText });
      setRecordId(response.record_id);
      setAnalysis(response.result);
    } catch (err: unknown) {
      if (err instanceof AuthRequiredError) {
        setError(err.message);
        redirectToLogin();
        return;
      }
      setError(err instanceof Error ? err.message : "JD 解析失败，请稍后重试");
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

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">JD 深度解析</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <FileUploader onTextExtracted={setJdText} label="上传 JD 文件" />
            <div className="mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">粘贴 JD 内容</span>
            </div>
            <textarea
              value={jdText}
              onChange={(event) => setJdText(event.target.value)}
              placeholder="将 JD 内容粘贴到这里..."
              className="h-64 w-full resize-none rounded-lg border border-gray-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={loading || !jdText.trim()}
              className="mt-3 w-full rounded-lg bg-blue-600 py-2.5 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  解析中...
                </span>
              ) : (
                "开始深度解析"
              )}
            </button>
          </div>
        </div>

        <div>
          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}

          {analysis && (
            <div className="space-y-4">
              {analysis.position_overview && (
                <div className="rounded-lg border border-gray-200 bg-white p-4">
                  <h3 className="mb-3 text-sm font-semibold text-gray-500">岗位概览</h3>
                  <div className="grid grid-cols-3 gap-3">
                    <OverviewItem label="推断岗位" value={analysis.position_overview.inferred_role} />
                    <OverviewItem label="推断职级" value={analysis.position_overview.seniority_level} />
                    <OverviewItem label="公司类型" value={analysis.position_overview.company_type_hint} />
                  </div>
                </div>
              )}

              {analysis.surface_requirements && (
                <div className="rounded-lg border border-gray-200 bg-white p-4">
                  <h3 className="mb-3 text-sm font-semibold text-gray-500">表面要求</h3>
                  <div className="space-y-3">
                    {analysis.surface_requirements.hard_skills?.length > 0 && (
                      <TagList label="硬技能" items={analysis.surface_requirements.hard_skills} colorClass="bg-blue-50 text-blue-700" />
                    )}
                    {analysis.surface_requirements.soft_skills?.length > 0 && (
                      <TagList label="软技能" items={analysis.surface_requirements.soft_skills} colorClass="bg-green-50 text-green-700" />
                    )}
                    {analysis.surface_requirements.experience?.length > 0 && (
                      <TagList label="经验要求" items={analysis.surface_requirements.experience} colorClass="bg-amber-50 text-amber-700" />
                    )}
                  </div>
                </div>
              )}

              {analysis.hidden_needs && (
                <div className="rounded-lg border border-gray-200 bg-white p-4">
                  <h3 className="mb-3 text-sm font-semibold text-gray-500">隐藏需求</h3>
                  {analysis.hidden_needs.team_context && (
                    <p className="mb-3 text-sm text-gray-700">{analysis.hidden_needs.team_context}</p>
                  )}
                  {analysis.hidden_needs.real_priorities?.length > 0 && (
                    <div>
                      <div className="mb-1 text-xs font-medium text-gray-400">团队最看重的能力</div>
                      <div className="space-y-1">
                        {analysis.hidden_needs.real_priorities.map((priority: string, index: number) => (
                          <div key={index} className="flex items-center gap-2 text-sm text-gray-700">
                            <span className="flex h-5 w-5 items-center justify-center rounded bg-amber-100 text-xs font-medium text-amber-700">
                              {index + 1}
                            </span>
                            {priority}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {analysis.interview_focus && (
                <div className="rounded-lg border border-gray-200 bg-white p-4">
                  <h3 className="mb-3 text-sm font-semibold text-gray-500">面试聚焦</h3>
                  {analysis.interview_focus.likely_topics?.length > 0 && (
                    <div className="space-y-2">
                      {analysis.interview_focus.likely_topics.map((topic: any, index: number) => (
                        <div key={index} className="flex items-start gap-2 text-sm">
                          <Tag className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-500" />
                          <div>
                            <span className="text-gray-700">{topic.topic}</span>
                            <span className="ml-2 text-xs text-gray-400">{topic.depth}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3">
                {recordId && (
                  <button
                    type="button"
                    onClick={handleExport}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 py-2.5 font-medium text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    <Download className="h-4 w-4" /> 导出报告
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleGoMatch}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 py-2.5 font-medium text-white transition-colors hover:bg-green-700"
                >
                  用此 JD 匹配简历 <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {!analysis && !error && !loading && (
            <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-400">
              粘贴 JD 内容后点击“开始深度解析”
            </div>
          )}
        </div>
      </div>

      <ChatPanel contextType="jd" contextData={analysis ? { analysis } : undefined} />
    </div>
  );
}

function OverviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-blue-50 p-3 text-center">
      <div className="text-xs text-gray-400">{label}</div>
      <div className="mt-1 text-sm font-medium text-gray-900">{value}</div>
    </div>
  );
}

function TagList({ label, items, colorClass }: { label: string; items: string[]; colorClass: string }) {
  return (
    <div>
      <div className="mb-1 text-xs font-medium text-gray-400">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, index) => (
          <span key={index} className={`rounded px-2 py-0.5 text-xs ${colorClass}`}>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
