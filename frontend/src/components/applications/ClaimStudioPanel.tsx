"use client";

import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  CheckCircle2,
  FileCheck2,
  History,
  Lightbulb,
  Link2,
  Loader2,
  PencilLine,
  RefreshCw,
  Save,
  Sparkles,
} from "lucide-react";

import type {
  ClaimSourceSnapshot,
  ClaimStudioSnapshot,
  CompetitiveClaimSnapshot,
  SourceChangeNoticeSnapshot,
  TargetedResumeClaimSnapshot,
} from "@/lib/api";


interface ClaimStudioPanelProps {
  studio: ClaimStudioSnapshot;
  claims: CompetitiveClaimSnapshot[];
  sources: ClaimSourceSnapshot[];
  sourceChangeNotices: SourceChangeNoticeSnapshot[];
  savedClaims: TargetedResumeClaimSnapshot[];
  canGenerate: boolean;
  busy: boolean;
  pendingClaimId: string | null;
  onGenerate: () => void;
  onEditClaim: (claimId: string, resumeClaim: string) => Promise<boolean>;
  onSaveClaim: (claimId: string, resumeClaim: string) => Promise<boolean>;
  onReanalyzeClaim: (claimId: string) => Promise<boolean>;
}


function SourceLabel({ source }: { source?: ClaimSourceSnapshot }) {
  if (!source) return <span>已捕获的经历材料</span>;
  return (
    <span>
      {source.item_title}
      {source.entry_context && (
        <span className="font-normal text-[#647168]">
          {" "}· {source.entry_context.organization} / {source.entry_context.role}
        </span>
      )}
    </span>
  );
}


function ClaimCard({
  claim,
  index,
  source,
  sourceChangeNotice,
  savedClaim,
  busy,
  onEditClaim,
  onSaveClaim,
  onReanalyzeClaim,
}: {
  claim: CompetitiveClaimSnapshot;
  index: number;
  source?: ClaimSourceSnapshot;
  sourceChangeNotice?: SourceChangeNoticeSnapshot;
  savedClaim?: TargetedResumeClaimSnapshot;
  busy: boolean;
  onEditClaim: (claimId: string, resumeClaim: string) => Promise<boolean>;
  onSaveClaim: (claimId: string, resumeClaim: string) => Promise<boolean>;
  onReanalyzeClaim: (claimId: string) => Promise<boolean>;
}) {
  const persistedText = claim.selected_resume_claim || claim.competitive_claim;
  const [draft, setDraft] = useState(persistedText);

  useEffect(() => {
    setDraft(persistedText);
  }, [claim.id, persistedText]);

  const normalizedDraft = draft.trim();
  const hasUnsavedEdit = normalizedDraft !== persistedText;
  const savedIsCurrent = savedClaim?.resume_claim === normalizedDraft;
  const sourceWasRemoved = sourceChangeNotice?.changed_dimensions.includes("source_removed") ?? false;

  async function persistDraft() {
    if (!normalizedDraft || !hasUnsavedEdit || busy) return;
    await onEditClaim(claim.id, normalizedDraft);
  }

  return (
    <article className="overflow-hidden bg-[#f8f4eb] text-studio-ink">
      {sourceChangeNotice && (
        <div className="border-b border-[#b78b4a]/25 bg-[#f5ead0] px-5 py-4 text-[#604b2c] sm:px-6">
          <div className="flex items-start gap-3">
            <History className="mt-0.5 h-4 w-4 shrink-0 text-[#9a652c]" />
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold leading-5">来源版本已更新</div>
              <p className="mt-1 text-xs leading-5">{sourceChangeNotice.message}</p>
              <p className="mt-1 text-xs leading-5 text-[#796442]">
                {sourceWasRemoved
                  ? "原主张仍可继续编辑、保存和使用；由于对应材料已移除，暂时不能基于它重新分析。"
                  : "主张仍可继续编辑、保存和使用。重新分析会基于当前材料新增一条主张，旧版本和原始来源不会改变。"}
              </p>
              {!sourceWasRemoved && (
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-[11px] leading-4 text-[#806c4b]">
                    点击后，当前 JD、Role Signal、Experience Item 和 Base Facts 会发送给你配置的模型服务商。
                  </span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onReanalyzeClaim(claim.id)}
                    className="inline-flex shrink-0 items-center justify-center gap-2 border border-[#8b642f] bg-[#fffaf0] px-3 py-2 text-xs font-semibold text-[#60431f] transition hover:-translate-y-0.5 hover:bg-white disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-50"
                  >
                    {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                    {busy ? "正在重新分析" : "使用最新材料重新分析"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <header className="flex flex-col gap-3 border-b border-studio-ink/15 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="font-serif text-3xl leading-none text-[#ba4d35]">{String(index + 1).padStart(2, "0")}</span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-studio-muted"><Link2 className="h-3 w-3" /> 来源 Experience Item</div>
            <div className="mt-1 truncate text-sm font-semibold"><SourceLabel source={source} /></div>
          </div>
        </div>
        <div className="max-w-md border-l-2 border-[#8eb068] pl-3 text-xs leading-5 text-[#425047]">
          <span className="font-semibold text-[#2d3d31]">主 Role Signal</span>
          <span className="ml-2">{claim.primary_role_signal.signal}</span>
        </div>
      </header>

      <div className="grid lg:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.75fr)]">
        <div className="px-5 py-6 sm:px-6 sm:py-7">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#3f7041]">
              <PencilLine className="h-4 w-4" /> Resume claim · 你的当前版本
            </div>
            <span className={`text-[11px] font-semibold ${hasUnsavedEdit ? "text-[#a64831]" : "text-[#647168]"}`}>
              {hasUnsavedEdit ? "修改尚未同步" : claim.selected_resume_claim_is_edited ? "你的改写已同步" : "AI 初稿，可直接改写"}
            </span>
          </div>
          <textarea
            aria-label={`竞争主张 ${index + 1}`}
            value={draft}
            disabled={busy}
            rows={4}
            maxLength={1200}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={persistDraft}
            className="mt-4 w-full resize-y border-0 border-l-4 border-[#8eb068] bg-white/70 px-4 py-3 text-lg font-semibold leading-8 tracking-[-0.014em] text-[#17231b] outline-none transition focus:border-[#ba4d35] focus:bg-white sm:text-xl"
          />
          <div className="mt-4 flex flex-col gap-3 border-t border-studio-ink/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs leading-5 text-[#647168]">
              <span className="font-semibold text-[#3e4c42]">切入重点</span>
              <span className="ml-2">{claim.source_focus}</span>
              {source && <span className="ml-2">· 引用 {claim.supported_base_fact_ids.length}/{source.base_facts.length} 条 Base Fact</span>}
            </div>
            <button
              type="button"
              disabled={busy || !normalizedDraft || Boolean(savedIsCurrent && !hasUnsavedEdit)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onSaveClaim(claim.id, normalizedDraft)}
              className="inline-flex shrink-0 items-center justify-center gap-2 bg-[#17231b] px-4 py-2.5 text-xs font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#2d4534] disabled:cursor-not-allowed disabled:translate-y-0 disabled:bg-[#d8d9d3] disabled:text-[#6d746f]"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : savedIsCurrent && !hasUnsavedEdit ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
              {busy ? "正在保存" : savedIsCurrent && !hasUnsavedEdit ? "已保存到目标简历" : savedClaim ? "更新目标简历" : "保存到目标简历"}
            </button>
          </div>

          {claim.selected_resume_claim_is_edited && (
            <details className="mt-4 border-t border-dashed border-studio-ink/15 pt-3 text-xs text-[#667269]">
              <summary className="cursor-pointer font-semibold">查看 AI 初稿</summary>
              <p className="mt-2 leading-5">{claim.competitive_claim}</p>
            </details>
          )}
        </div>

        <aside className="relative border-t border-[#c75d42]/25 bg-[#f3d8ca] px-5 py-6 lg:border-l lg:border-t-0 sm:px-6 sm:py-7">
          <div className="absolute right-0 top-0 border-l-[34px] border-t-[34px] border-l-transparent border-t-[#c95d42]" />
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9c3825]">
            <Lightbulb className="h-4 w-4" /> Stretch direction · 不属于履历事实
          </div>
          <p className="mt-4 text-base font-semibold leading-7 text-[#4a251d]">{claim.stretch_direction.expression_gap}</p>
          <p className="mt-3 text-sm leading-6 text-[#674138]">{claim.stretch_direction.why_it_matters}</p>
          <div className="mt-5 border-t border-[#9c3825]/20 pt-4">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#85321f]"><ArrowUpRight className="h-3.5 w-3.5" /> 可以往这里想</div>
            <p className="mt-2 text-sm leading-6 text-[#57342c]">{claim.stretch_direction.expansion_direction}</p>
          </div>
          <p className="mt-5 text-[11px] leading-5 text-[#81584e]">这是供你自行拓展的方向，不会作为候选人历史进入目标简历。</p>
        </aside>
      </div>
    </article>
  );
}


export default function ClaimStudioPanel({
  studio,
  claims,
  sources,
  sourceChangeNotices,
  savedClaims,
  canGenerate,
  busy,
  pendingClaimId,
  onGenerate,
  onEditClaim,
  onSaveClaim,
  onReanalyzeClaim,
}: ClaimStudioPanelProps) {
  const sourcesById = new Map(sources.map((source) => [source.id, source]));
  const noticesByClaimId = new Map(sourceChangeNotices.map((notice) => [notice.claim_id, notice]));
  const savedByClaimId = new Map(savedClaims.map((claim) => [claim.source_claim_id, claim]));

  return (
    <section className="mb-10 overflow-hidden border border-studio-ink/15 bg-[#151d18] text-white shadow-[6px_6px_0_#cfc7b8]">
      <div className="relative border-b border-white/15 px-5 py-7 sm:px-7">
        <div className="pointer-events-none absolute -right-8 -top-16 font-serif text-[180px] leading-none text-white/[0.025]">C</div>
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#c6e28f]">
              <Sparkles className="h-4 w-4" /> Claim studio
            </div>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.035em]">把可用经历，压成值得被看见的主张</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[#bec8c1]">
              AI 会优先挑选不超过三段高价值材料。你可以直接改写主张；只有点击保存，当前版本才会进入目标简历。
            </p>
          </div>
          {claims.length === 0 && (
            <button
              type="button"
              disabled={busy || Boolean(pendingClaimId) || !canGenerate}
              onClick={onGenerate}
              className="inline-flex shrink-0 items-center justify-center gap-2 bg-[#dcefaa] px-5 py-3 text-sm font-semibold text-[#182019] transition-all hover:-translate-y-0.5 hover:bg-[#e7f7bf] disabled:cursor-not-allowed disabled:translate-y-0 disabled:bg-white/10 disabled:text-white/40"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCheck2 className="h-4 w-4" />}
              {busy
                ? "正在提炼主张"
                : studio.status === "failed"
                  ? "重试生成竞争主张"
                  : "生成竞争主张"}
            </button>
          )}
        </div>
        <p className="relative mt-4 text-xs leading-5 text-[#9eaaa2]">
          点击生成后，当前 JD、Role Signals、Experience Items 和 Base Facts 会发送给你配置的模型服务商。编辑与保存均为本地确定性操作，不会再次调用模型。
        </p>
        {!canGenerate && (
          <p className="relative mt-5 border-l-2 border-[#d97757] pl-3 text-xs leading-5 text-[#e3c9c0]">
            先完成 Target Analysis，确认至少一个 Role Signal 后再生成。
          </p>
        )}
      </div>

      {studio.status === "failed" && studio.last_error && (
        <div className="mx-5 mt-5 flex flex-col gap-2 border-l-4 border-[#e47a58] bg-[#44271f] px-4 py-3 text-sm text-[#ffd9cc] sm:mx-7 sm:flex-row sm:items-center sm:justify-between">
          <span>{studio.last_error.message}</span>
          <span className="shrink-0 text-xs font-semibold">来源与已有主张均已保留</span>
        </div>
      )}

      {claims.length ? (
        <div className="px-5 py-7 sm:px-7">
          <div className="mb-5 flex flex-col gap-2 border-b border-white/15 pb-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#c6e28f]">Selected opportunities</div>
              <div className="mt-1 text-lg font-semibold">已提炼 {claims.length} 条高价值主张</div>
            </div>
            <p className="text-xs text-[#aeb9b1]">数量由材料价值决定，不为凑满三条而重复改写。</p>
          </div>

          <div className="space-y-5">
            {claims.map((claim, index) => (
              <ClaimCard
                key={claim.id}
                claim={claim}
                index={index}
                source={sourcesById.get(claim.source_snapshot_id)}
                sourceChangeNotice={noticesByClaimId.get(claim.id)}
                savedClaim={savedByClaimId.get(claim.id)}
                busy={pendingClaimId === claim.id}
                onEditClaim={onEditClaim}
                onSaveClaim={onSaveClaim}
                onReanalyzeClaim={onReanalyzeClaim}
              />
            ))}
          </div>
        </div>
      ) : studio.status === "completed" ? (
        <div className="px-5 py-7 text-sm leading-6 text-[#bec8c1] sm:px-7">
          当前材料没有支持足够有价值的竞争主张；系统没有为了数量补写弱主张。
        </div>
      ) : (
        <div className="grid gap-3 px-5 py-6 text-sm text-[#aeb9b1] sm:grid-cols-[1fr_auto] sm:items-center sm:px-7">
          <span>Role Signal 准备好后，一次生成最多三条主张与各自唯一的冲刺方向。</span>
          <span className="text-xs font-semibold text-[#d6e9ac]">不提问 · 不打分 · 不凑数</span>
        </div>
      )}
    </section>
  );
}
