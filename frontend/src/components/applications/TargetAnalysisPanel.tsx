"use client";

import { Loader2, Quote, Radar, Sparkles } from "lucide-react";

import type { RoleSignalSnapshot, TargetAnalysisSnapshot } from "@/lib/api";


interface TargetAnalysisPanelProps {
  analysis: TargetAnalysisSnapshot;
  roleSignals: RoleSignalSnapshot[];
  busy: boolean;
  onAnalyze: () => void;
}


export default function TargetAnalysisPanel({
  analysis,
  roleSignals,
  busy,
  onAnalyze,
}: TargetAnalysisPanelProps) {
  return (
    <section className="mb-10 border-t-4 border-studio-accent bg-studio-paper px-5 py-6 shadow-[4px_4px_0_#ddd5c6] sm:px-7">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-studio-accent">
            <Radar className="h-4 w-4" /> Target analysis
          </div>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">这份 JD 真正在找什么</h2>
          <p className="mt-2 text-sm leading-6 text-studio-muted">提炼不超过三个岗位信号。明确写在 JD 里的内容保留原文，需要综合理解的内容会单独标注。</p>
          <p className="mt-2 text-xs leading-5 text-[#6b786e]">点击后，这份 JD 会发送给你配置的模型服务商。</p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={onAnalyze}
          className="inline-flex shrink-0 items-center justify-center gap-2 bg-studio-ink px-4 py-2.5 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {busy
            ? "正在阅读 JD"
            : analysis.status === "completed"
              ? "重新提取"
              : analysis.status === "failed"
                ? "重新尝试"
                : "提取岗位信号"}
        </button>
      </div>

      {analysis.status === "failed" && analysis.last_error && (
        <div className="mt-6 flex flex-col gap-3 border-l-4 border-studio-accent bg-[#fff1ec] px-4 py-3 text-sm text-[#7e2c1b] sm:flex-row sm:items-center sm:justify-between">
          <span>{analysis.last_error.message}</span>
          <span className="shrink-0 text-xs font-semibold">现有材料未被改动</span>
        </div>
      )}

      {roleSignals.length ? (
        <div className="mt-7 grid gap-4 xl:grid-cols-3">
          {roleSignals.map((signal, index) => (
            <article key={signal.id} className="relative overflow-hidden border border-studio-line/15 bg-white px-5 pb-5 pt-6">
              <div className="absolute right-4 top-2 font-serif text-5xl leading-none text-studio-ink/[0.06]">{String(index + 1).padStart(2, "0")}</div>
              <div className="relative text-[11px] font-semibold uppercase tracking-[0.16em] text-studio-muted">优先信号 {index + 1}</div>
              <h3 className="relative mt-3 text-lg font-semibold leading-7 text-studio-ink">{signal.signal}</h3>
              {signal.source_type === "explicit" ? (
                <div className="mt-5 border-t border-studio-line/10 pt-4">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#4b6d46]"><Quote className="h-3.5 w-3.5" /> JD 原文</div>
                  <blockquote className="mt-2 text-sm leading-6 text-[#435047]">“{signal.jd_excerpt}”</blockquote>
                </div>
              ) : (
                <div className="mt-5 border-t border-studio-line/10 pt-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-studio-accent">AI 解读</div>
                  <p className="mt-2 text-sm leading-6 text-[#435047]">{signal.rationale}</p>
                  <p className="mt-3 text-[11px] leading-5 text-studio-muted">这是对 JD 的解释，不代表招聘方确定结论。</p>
                </div>
              )}
            </article>
          ))}
        </div>
      ) : analysis.status !== "failed" ? (
        <div className="mt-6 grid gap-3 border-y border-studio-line/10 py-4 text-sm text-studio-muted sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <span>{analysis.status === "completed" ? "这份 JD 没有支持足够明确的优先信号；系统不会为了凑数补写弱结论。" : "先保留原始 JD，再由 AI 判断最值得优先回应的岗位要求；信号不足时不会凑满三条。"}</span>
          <span className="text-xs font-semibold text-[#536158]">只呈现信号与来源</span>
        </div>
      ) : null}
    </section>
  );
}
