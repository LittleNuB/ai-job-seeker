"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, Compass, Loader2, Radar, Sparkles, Target } from "lucide-react";
import { positionRadar } from "@/lib/api";
import { AuthRequiredError, redirectToLogin, requireAuth } from "@/lib/auth";
import ActionPlanPanel from "@/components/ActionPlanPanel";
import FileUploader from "@/components/FileUploader";

const TRACKS = [
  { id: "algorithm", label: "算法研究" },
  { id: "engineering", label: "工程落地" },
  { id: "product", label: "产品业务" },
  { id: "data", label: "数据分析" },
  { id: "applied", label: "AI 应用" },
  { id: "industry", label: "AI+行业" },
];

export default function RadarPage() {
  const router = useRouter();
  const [resumeText, setResumeText] = useState("");
  const [targetCity, setTargetCity] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("");
  const [preferredTracks, setPreferredTracks] = useState<string[]>([]);
  const [result, setResult] = useState<any>(null);
  const [recordId, setRecordId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function toggleTrack(trackId: string) {
    setPreferredTracks((current) =>
      current.includes(trackId) ? current.filter((id) => id !== trackId) : [...current, trackId],
    );
  }

  async function handleAnalyze() {
    if (!resumeText.trim()) return;
    if (!requireAuth()) {
      setError("请先登录后再生成岗位适配雷达");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);
    setRecordId("");
    try {
      const response = await positionRadar.analyze({
        resume_text: resumeText,
        preferences: {
          target_city: targetCity,
          experience_level: experienceLevel,
          preferred_tracks: preferredTracks,
        },
      });
      setResult(response.result);
      setRecordId(response.record_id);
    } catch (err) {
      if (err instanceof AuthRequiredError) {
        setError(err.message);
        redirectToLogin();
        return;
      }
      setError(err instanceof Error ? err.message : "岗位雷达生成失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  function goToMatch(position: any) {
    localStorage.setItem(
      "match_prefill",
      JSON.stringify({
        positionId: position.position_id,
        positionName: position.position_name,
        source: "radar",
      }),
    );
    router.push("/match?from=radar");
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6 rounded-lg border border-slate-200 bg-slate-950 px-6 py-7 text-white">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm text-slate-200">
              <Radar className="h-4 w-4" />
              AI 岗位适配雷达
            </div>
            <h1 className="text-3xl font-bold">先看投什么，再想怎么投</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              基于 46 个 AI 岗位 taxonomy 和你的简历背景，推荐主投方向、冲刺方向和暂不建议方向。
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              ["7", "岗位方向"],
              ["46", "AI 岗位"],
              ["2537", "清洗 JD"],
            ].map(([value, label]) => (
              <div key={label} className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
                <div className="text-2xl font-bold">{value}</div>
                <div className="text-xs text-slate-300">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-slate-500">简历或个人背景</h2>
            <FileUploader onTextExtracted={setResumeText} />
            <textarea
              value={resumeText}
              onChange={(event) => setResumeText(event.target.value)}
              rows={12}
              placeholder="粘贴简历、项目经历、教育背景或当前技能。越具体，推荐越稳定。"
              className="mt-3 w-full rounded-lg border border-slate-300 p-3 text-sm leading-6 focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-slate-500">偏好设置</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                value={targetCity}
                onChange={(event) => setTargetCity(event.target.value)}
                placeholder="目标城市，可选"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
              <select
                value={experienceLevel}
                onChange={(event) => setExperienceLevel(event.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="">经验阶段，可选</option>
                <option value="junior">应届 / 初级</option>
                <option value="mid">1-3 年</option>
                <option value="senior">3 年以上</option>
              </select>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {TRACKS.map((track) => (
                <button
                  key={track.id}
                  type="button"
                  onClick={() => toggleTrack(track.id)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                    preferredTracks.includes(track.id)
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {track.label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleAnalyze}
            disabled={loading || !resumeText.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 py-3 font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            生成岗位雷达
          </button>
        </div>

        <div className="space-y-4">
          {!result && (
            <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center">
              <Compass className="mx-auto mb-3 h-10 w-10 text-slate-400" />
              <h2 className="text-lg font-semibold text-slate-900">上传简历后查看你的 AI 岗位地图</h2>
              <p className="mt-2 text-sm text-slate-500">系统会把岗位分成“现在可投”“2-4 周冲刺”和“暂不主投”。</p>
            </div>
          )}

          {result && (
            <>
              <div className="rounded-lg border border-slate-200 bg-white p-5">
                <div className="flex items-start gap-3">
                  <Target className="mt-1 h-5 w-5 text-blue-600" />
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">推荐主线：{result.suggested_primary_path}</h2>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{result.summary}</p>
                    <p className="mt-2 text-xs text-slate-400">{result.method_note}</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-3">
                {result.recommended_positions?.map((position: any) => (
                  <div key={position.position_id} className="rounded-lg border border-slate-200 bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold text-slate-900">{position.position_name}</h3>
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                            {position.recommendation_group_label}
                          </span>
                        </div>
                        {position.position_name_en && (
                          <div className="mt-0.5 text-xs text-slate-500">{position.position_name_en}</div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-slate-900">{position.fit_score}</div>
                        <div className="text-xs text-slate-400">适配度</div>
                      </div>
                    </div>

                    <div className="mt-3 grid gap-3 md:grid-cols-3">
                      <Metric label="面试机会" value={position.interview_probability} />
                      <Metric label="补强难度" value={position.gap_difficulty} />
                      <Metric label="成长潜力" value={position.growth_potential} />
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <ListBlock title="为什么适合" items={position.why_fit} color="green" />
                      <ListBlock title="主要风险" items={position.main_risks} color="red" />
                    </div>
                    <div className="mt-4">
                      <ListBlock title="下一步动作" items={position.next_actions} color="blue" />
                    </div>

                    <button
                      type="button"
                      onClick={() => goToMatch(position)}
                      className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                      用这个岗位匹配简历
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              <ActionPlanPanel sourceType="position_radar" sourceRecordId={recordId} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-800">{value}</div>
    </div>
  );
}

function ListBlock({ title, items, color }: { title: string; items?: string[]; color: "green" | "red" | "blue" }) {
  const colorMap = {
    green: "bg-emerald-50 text-emerald-700",
    red: "bg-red-50 text-red-700",
    blue: "bg-blue-50 text-blue-700",
  };

  if (!items?.length) return null;

  return (
    <div>
      <div className="mb-2 text-xs font-semibold text-slate-400">{title}</div>
      <div className="space-y-1.5">
        {items.map((item, index) => (
          <div key={index} className={`rounded-md px-3 py-2 text-sm ${colorMap[color]}`}>
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}
