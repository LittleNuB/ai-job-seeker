"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Loader2, AlertCircle, Tag, ArrowRight, Download } from "lucide-react";
import { jd as jdApi, exportApi } from "@/lib/api";
import ChatPanel from "@/components/chat/ChatPanel";
import FileUploader from "@/components/FileUploader";

export default function JDPage() {
  const router = useRouter();
  const [jdText, setJdText] = useState("");
  const [analysis, setAnalysis] = useState<any>(null);
  const [recordId, setRecordId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleGoMatch() {
    localStorage.setItem("match_prefill", JSON.stringify({
      positionName: analysis?.position_overview?.inferred_role || "",
      jdText,
      source: "jd",
    }));
    router.push("/match?from=jd");
  }

  async function handleAnalyze() {
    if (!jdText.trim()) return;
    setLoading(true);
    setError("");
    setAnalysis(null);
    try {
      const res = await jdApi.analyze({ jd_text: jdText });
      setRecordId(res.record_id);
      setAnalysis(res.result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">JD 深度解析</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input */}
        <div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <FileUploader onTextExtracted={setJdText} label="上传JD文件" />
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">粘贴JD内容</span>
            </div>
            <textarea
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
              placeholder="将JD内容粘贴到这里..."
              className="w-full h-64 p-3 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleAnalyze}
              disabled={loading || !jdText.trim()}
              className="mt-3 w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  解析中...
                </span>
              ) : (
                "开始深度解析"
              )}
            </button>
          </div>
        </div>

        {/* Results */}
        <div>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-2 mb-4">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}

          {analysis && (
            <div className="space-y-4">
              {/* Overview */}
              {analysis.position_overview && (
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <h3 className="text-sm font-semibold text-gray-500 mb-3">岗位概览</h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-blue-50 rounded-lg p-3 text-center">
                      <div className="text-xs text-gray-400">推断岗位</div>
                      <div className="text-sm font-medium text-gray-900 mt-1">{analysis.position_overview.inferred_role}</div>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-3 text-center">
                      <div className="text-xs text-gray-400">推断职级</div>
                      <div className="text-sm font-medium text-gray-900 mt-1">{analysis.position_overview.seniority_level}</div>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-3 text-center">
                      <div className="text-xs text-gray-400">公司类型</div>
                      <div className="text-sm font-medium text-gray-900 mt-1">{analysis.position_overview.company_type_hint}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Surface Requirements */}
              {analysis.surface_requirements && (
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <h3 className="text-sm font-semibold text-gray-500 mb-3">表面要求</h3>
                  <div className="space-y-3">
                    {analysis.surface_requirements.hard_skills?.length > 0 && (
                      <div>
                        <div className="text-xs font-medium text-gray-400 mb-1">硬技能</div>
                        <div className="flex flex-wrap gap-1.5">
                          {analysis.surface_requirements.hard_skills.map((s: string, i: number) => (
                            <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded">{s}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {analysis.surface_requirements.soft_skills?.length > 0 && (
                      <div>
                        <div className="text-xs font-medium text-gray-400 mb-1">软技能</div>
                        <div className="flex flex-wrap gap-1.5">
                          {analysis.surface_requirements.soft_skills.map((s: string, i: number) => (
                            <span key={i} className="px-2 py-0.5 bg-green-50 text-green-700 text-xs rounded">{s}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Hidden Needs */}
              {analysis.hidden_needs && (
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <h3 className="text-sm font-semibold text-gray-500 mb-3">隐藏需求</h3>
                  {analysis.hidden_needs.team_context && (
                    <p className="text-sm text-gray-700 mb-3">{analysis.hidden_needs.team_context}</p>
                  )}
                  {analysis.hidden_needs.real_priorities?.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-gray-400 mb-1">团队最看重的3个能力</div>
                      <div className="space-y-1">
                        {analysis.hidden_needs.real_priorities.map((p: string, i: number) => (
                          <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                            <span className="w-5 h-5 flex items-center justify-center bg-amber-100 text-amber-700 rounded text-xs font-medium">{i + 1}</span>
                            {p}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Interview Focus */}
              {analysis.interview_focus && (
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <h3 className="text-sm font-semibold text-gray-500 mb-3">面试聚焦</h3>
                  {analysis.interview_focus.likely_topics?.length > 0 && (
                    <div className="space-y-2">
                      {analysis.interview_focus.likely_topics.map((t: any, i: number) => (
                        <div key={i} className="flex items-start gap-2 text-sm">
                          <Tag className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" />
                          <div>
                            <span className="text-gray-700">{t.topic}</span>
                            <span className="ml-2 text-xs text-gray-400">{t.depth}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Export + Go to Match */}
              <div className="flex gap-3">
                {recordId && (
                  <button
                    type="button"
                    onClick={() => exportApi.downloadReport(recordId).catch((err) => setError(err.message))}
                    className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" /> 导出报告
                  </button>
                )}
                <button
                onClick={handleGoMatch}
                className="w-full py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
              >
                用此JD匹配简历 <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {!analysis && !error && !loading && (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-400 text-sm">
              粘贴JD内容后点击&apos;开始深度解析&apos;
            </div>
          )}
        </div>
      </div>

      {/* Chat Panel */}
      <ChatPanel
        contextType="jd"
        contextData={analysis ? { analysis } : undefined}
      />
    </div>
  );
}
