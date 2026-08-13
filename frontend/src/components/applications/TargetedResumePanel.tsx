"use client";

import { useState } from "react";
import { Check, Clipboard, Download, FileText, Loader2, ShieldCheck } from "lucide-react";

import type { ClaimSourceSnapshot, TargetedResumeVersionSnapshot } from "@/lib/api";


export default function TargetedResumePanel({
  version,
  sources,
  onCopy,
  onDownload,
}: {
  version: TargetedResumeVersionSnapshot;
  sources: ClaimSourceSnapshot[];
  onCopy: () => Promise<boolean>;
  onDownload: () => Promise<boolean>;
}) {
  const [action, setAction] = useState<"copy" | "download" | null>(null);
  const [copied, setCopied] = useState(false);
  const sourcesById = new Map(sources.map((source) => [source.id, source]));
  const hasSavedClaims = version.resume_claims.length > 0;

  async function copyResume() {
    setAction("copy");
    setCopied(false);
    try {
      if (await onCopy()) {
        setCopied(true);
      }
    } finally {
      setAction(null);
    }
  }

  async function downloadResume() {
    setAction("download");
    try {
      await onDownload();
    } finally {
      setAction(null);
    }
  }

  return (
    <section className="mb-10 border border-studio-ink/15 bg-[#e3ded2] p-3 shadow-[4px_4px_0_#182019] sm:p-5">
      <div className="flex flex-col gap-5 border-b border-studio-ink/15 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a6422c]">
            <FileText className="h-4 w-4" /> Targeted resume version
          </div>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.025em] text-[#17231b]">这份简历，只收录你明确保存的主张</h2>
          <p className="mt-2 text-sm leading-6 text-[#59665d]">可继续回到上方改写并更新；复制和导出始终以这里的已保存版本为准。</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!hasSavedClaims || Boolean(action)}
            onClick={copyResume}
            className="inline-flex items-center gap-2 border border-studio-ink/25 bg-[#f8f4eb] px-4 py-2.5 text-xs font-semibold text-[#26332b] transition hover:-translate-y-0.5 hover:bg-white disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-40"
          >
            {action === "copy" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : copied ? <Check className="h-3.5 w-3.5" /> : <Clipboard className="h-3.5 w-3.5" />}
            {copied ? <span>已复制</span> : <span>复制目标简历</span>}
          </button>
          <button
            type="button"
            disabled={!hasSavedClaims || Boolean(action)}
            onClick={downloadResume}
            className="inline-flex items-center gap-2 bg-[#17231b] px-4 py-2.5 text-xs font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#2d4534] disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-40"
          >
            {action === "download" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            下载 Markdown
          </button>
        </div>
      </div>

      <div className="mt-5 bg-[#fcfaf5] px-5 py-6 sm:px-8 sm:py-8">
        <div className="flex items-center justify-between border-b-2 border-studio-ink pb-3">
          <div className="font-serif text-xl font-semibold text-[#17231b]">Resume claims</div>
          <div className="text-xs font-semibold tabular-nums text-[#667269]">{version.resume_claims.length} saved</div>
        </div>

        {hasSavedClaims ? (
          <ol className="divide-y divide-studio-ink/10">
            {version.resume_claims.map((claim, index) => {
              const source = sourcesById.get(claim.source_snapshot_id);
              return (
                <li key={claim.id} className="grid gap-3 py-5 sm:grid-cols-[28px_minmax(0,1fr)]">
                  <span className="font-serif text-lg text-[#b34b34]">{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <p className="text-base font-semibold leading-7 text-[#1e2a22]">{claim.resume_claim}</p>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[#68736c]">
                      {source && <span>{source.item_title}</span>}
                      <span>Role Signal · {claim.primary_role_signal.signal}</span>
                      {claim.selected_resume_claim_is_edited && <span className="font-semibold text-[#446a3f]">你的改写</span>}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        ) : (
          <div className="py-10 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#e7eadf] text-[#5b7650]"><FileText className="h-5 w-5" /></div>
            <p className="mt-3 text-sm font-semibold text-[#354239]">还没有保存任何主张</p>
            <p className="mt-1 text-xs leading-5 text-[#6b766f]">在上方确认文字后，点击“保存到目标简历”。</p>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-start gap-2 text-xs leading-5 text-[#58655c]">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#4f7446]" />
        <span>冲刺方向只用于启发补全，不会进入复制内容或导出文件。</span>
      </div>
    </section>
  );
}
