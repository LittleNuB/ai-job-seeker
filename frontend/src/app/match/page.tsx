"use client";

import { useState } from "react";
import { Target, Loader2, AlertCircle } from "lucide-react";
import { matchApi, positions as positionsApi } from "@/lib/api";
import ChatPanel from "@/components/chat/ChatPanel";

export default function MatchPage() {
  const [resumeText, setResumeText] = useState("");
  const [positionId, setPositionId] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [positionList, setPositionList] = useState<any[]>([]);
  const [positionsLoaded, setPositionsLoaded] = useState(false);

  async function loadPositions() {
    if (positionsLoaded) return;
    try {
      const list = await positionsApi.getPositions();
      setPositionList(list);
      setPositionsLoaded(true);
    } catch (err) {
      console.error("Failed to load positions:", err);
    }
  }

  async function handleMatch() {
    if (!resumeText.trim() || !positionId) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await matchApi.analyze({ resume_text: resumeText, position_id: positionId });
      setResult(res);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const scoreColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 75) return "text-blue-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const severityColor = (s: string) => {
    if (s === "高") return "bg-red-50 text-red-700";
    if (s === "中") return "bg-yellow-50 text-yellow-700";
    return "bg-green-50 text-green-700";
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">简历匹配</h1>

      {/* Input Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm font-medium text-gray-700 mb-3">简历内容</div>
          <textarea
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            placeholder="粘贴你的简历内容..."
            className="w-full h-48 p-3 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm font-medium text-gray-700 mb-3">目标岗位</div>
          <select
            value={positionId}
            onChange={(e) => setPositionId(e.target.value)}
            onFocus={loadPositions}
            className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">选择目标岗位...</option>
            {positionList.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      <button
        onClick={handleMatch}
        disabled={loading || !resumeText.trim() || !positionId}
        className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mb-6"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> 匹配分析中...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <Target className="w-4 h-4" /> 开始匹配分析
          </span>
        )}
      </button>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-2 mb-4">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
          <span className="text-sm text-red-700">{error}</span>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Score */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 flex items-center justify-center gap-8">
            <div className="text-center">
              <div className={`text-5xl font-bold ${scoreColor(result.match_score)}`}>
                {result.match_score}
              </div>
              <div className="text-sm text-gray-500 mt-1">匹配得分</div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {result.result?.score_breakdown && Object.entries(result.result.score_breakdown).map(([key, val]) => (
                <div key={key} className="text-center">
                  <div className="text-lg font-semibold text-gray-900">{val as number}</div>
                  <div className="text-xs text-gray-500">
                    {key === "hard_skills_match" ? "硬技能" :
                     key === "experience_match" ? "经验" :
                     key === "culture_fit" ? "文化匹配" : "成长潜力"}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Advantages */}
          {result.result?.core_advantages && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-green-600 mb-3">核心优势</h3>
              <div className="space-y-2">
                {result.result.core_advantages.map((a: any, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <span className="w-5 h-5 flex items-center justify-center bg-green-100 text-green-700 rounded text-xs shrink-0">{i + 1}</span>
                    <div>
                      <span className="font-medium text-gray-900">{a.advantage}</span>
                      <span className="text-gray-600 ml-2">{a.evidence}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Gaps */}
          {result.result?.capability_gaps && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-red-600 mb-3">能力差距</h3>
              <div className="space-y-2">
                {result.result.capability_gaps.map((g: any, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${severityColor(g.severity)}`}>
                      {g.severity}
                    </span>
                    <div>
                      <span className="font-medium text-gray-900">{g.gap}</span>
                      <span className="text-gray-600 ml-2">{g.mitigation}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Improvement Plan */}
          {result.result?.improvement_plan && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-500 mb-3">提升计划</h3>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { key: "immediate", label: "1-2周", color: "blue" },
                  { key: "short_term", label: "1-3月", color: "emerald" },
                  { key: "medium_term", label: "3-6月", color: "violet" },
                ].map(({ key, label }) => {
                  const items = result.result.improvement_plan[key];
                  if (!items?.length) return null;
                  return (
                    <div key={key} className="bg-gray-50 rounded-lg p-3">
                      <div className="text-xs font-medium text-gray-400 mb-2">{label}</div>
                      <div className="space-y-1">
                        {items.map((item: string, i: number) => (
                          <div key={i} className="text-xs text-gray-700">{item}</div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Chat Panel */}
      <ChatPanel
        contextType="match"
        contextData={result ? { result: result.result } : undefined}
      />
    </div>
  );
}
