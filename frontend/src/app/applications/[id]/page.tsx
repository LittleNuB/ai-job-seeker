"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BookmarkPlus, BriefcaseBusiness, Check, ChevronRight, CircleDot, FileText, FolderKanban, GitMerge, Loader2, RotateCcw, Scissors } from "lucide-react";
import { applications, type ApplicationSnapshot, type ExperienceEntrySnapshot, type ExperienceItemSnapshot, type ExperienceLibraryLinkSnapshot } from "@/lib/api";
import { AuthRequiredError, getLoginPath, isAuthenticated } from "@/lib/auth";
import ClaimStudioPanel from "@/components/applications/ClaimStudioPanel";
import TargetedResumePanel from "@/components/applications/TargetedResumePanel";
import TargetAnalysisPanel from "@/components/applications/TargetAnalysisPanel";

function itemCount(snapshot: ApplicationSnapshot): number {
  return snapshot.standalone_experience_items.length + snapshot.experience_entries.reduce(
    (total, entry) => total + entry.experience_items.length,
    0,
  );
}

function ExperienceItemCard({ item, entries, allItems, libraryLink, busy, onMove, onSplit, onMerge, onSaveToLibrary }: {
  item: ExperienceItemSnapshot;
  entries: ExperienceEntrySnapshot[];
  allItems: ExperienceItemSnapshot[];
  libraryLink?: ExperienceLibraryLinkSnapshot;
  busy: boolean;
  onMove: (itemId: string, destinationEntryId: string | null) => void;
  onSplit: (itemId: string, factIds: string[], newTitle: string) => Promise<boolean>;
  onMerge: (sourceItemId: string, destinationItemId: string) => Promise<boolean>;
  onSaveToLibrary: (itemId: string) => Promise<boolean>;
}) {
  const [editingBoundary, setEditingBoundary] = useState(false);
  const [selectedFactIds, setSelectedFactIds] = useState<string[]>([]);
  const [newItemTitle, setNewItemTitle] = useState("");
  const [mergeTargetId, setMergeTargetId] = useState("");
  const mergeTargets = allItems.filter(
    (candidate) => candidate.id !== item.id && candidate.entry_id === item.entry_id,
  );

  function toggleFact(factId: string) {
    setSelectedFactIds((current) => current.includes(factId)
      ? current.filter((id) => id !== factId)
      : [...current, factId]);
  }

  async function handleSplit() {
    if (await onSplit(item.id, selectedFactIds, newItemTitle)) {
      setSelectedFactIds([]);
      setNewItemTitle("");
      setEditingBoundary(false);
    }
  }

  async function handleMerge() {
    if (mergeTargetId && await onMerge(item.id, mergeTargetId)) {
      setMergeTargetId("");
      setEditingBoundary(false);
    }
  }

  return (
    <article className="border border-studio-line/15 bg-white p-5 shadow-[3px_3px_0_#e5dfd2]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6b786e]">
            <CircleDot className="h-3 w-3 text-studio-accent" /> 经历材料
            {libraryLink?.relationship === "selected_for_application" && (
              <span className="bg-studio-sage px-2 py-0.5 normal-case tracking-normal text-[#36503a]">来自经历库</span>
            )}
            {libraryLink?.relationship === "saved_from_application" && (
              <span className="bg-[#eee9dd] px-2 py-0.5 normal-case tracking-normal text-[#59675e]">已保存到经历库</span>
            )}
          </div>
          <h4 className="mt-2 text-lg font-semibold tracking-tight text-[#16221a]">{item.title}</h4>
        </div>
        <label className="flex shrink-0 items-center gap-2 text-xs text-[#5f6d63]">
          归入
          <select
            aria-label={`${item.title} 归入`}
            value={item.entry_id || "standalone"}
            disabled={busy}
            onChange={(event) => onMove(item.id, event.target.value === "standalone" ? null : event.target.value)}
            className="max-w-52 border border-studio-line/20 bg-[#f7f4ed] px-2 py-1.5 font-medium text-[#26332b] outline-none focus:border-studio-accent"
          >
            <option value="standalone">独立项目</option>
            {entries.map((entry) => <option key={entry.id} value={entry.id}>{entry.organization} · {entry.role}</option>)}
          </select>
          {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        </label>
      </div>
      <ul className="mt-4 space-y-3 border-t border-studio-line/10 pt-4">
        {item.base_facts.map((fact) => (
          <li key={fact.id} className="grid grid-cols-[14px_1fr] gap-2 text-sm leading-6 text-[#39483e]">
            <span className="mt-[9px] h-1.5 w-1.5 rounded-full bg-studio-accent" />
            <span>{fact.text}</span>
          </li>
        ))}
      </ul>

      <div className="mt-4 border-t border-studio-line/10 pt-3">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {!libraryLink && (
            <button
              type="button"
              aria-label={`保存 ${item.title} 到经历库`}
              disabled={busy}
              onClick={() => onSaveToLibrary(item.id)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#b44128] underline decoration-[#b44128]/30 underline-offset-4 hover:text-[#7f2818] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <BookmarkPlus className="h-3.5 w-3.5" /> 保存到经历库
            </button>
          )}
          <button
            type="button"
            onClick={() => setEditingBoundary((current) => !current)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5f6d63] underline decoration-[#5f6d63]/30 underline-offset-4 hover:text-studio-ink"
          >
            <Scissors className="h-3.5 w-3.5" /> 调整项目边界
          </button>
        </div>

        {editingBoundary && (
          <div className="mt-4 grid gap-4 bg-[#f7f4ed] p-4 lg:grid-cols-2">
            <div>
              <div className="text-xs font-semibold text-[#26332b]">拆出新的经历项目</div>
              {item.base_facts.length > 1 ? (
                <>
                  <div className="mt-3 space-y-2">
                    {item.base_facts.map((fact) => (
                      <label key={fact.id} className="flex items-start gap-2 text-xs leading-5 text-[#4c5a51]">
                        <input
                          type="checkbox"
                          checked={selectedFactIds.includes(fact.id)}
                          onChange={() => toggleFact(fact.id)}
                          className="mt-1 accent-studio-accent"
                        />
                        <span>{fact.text}</span>
                      </label>
                    ))}
                  </div>
                  <input
                    aria-label={`${item.title} 新项目名称`}
                    value={newItemTitle}
                    onChange={(event) => setNewItemTitle(event.target.value)}
                    placeholder="新的项目或责任模块名称"
                    className="mt-3 w-full border border-studio-line/20 bg-white px-3 py-2 text-xs outline-none focus:border-studio-accent"
                  />
                  <button
                    type="button"
                    disabled={busy || !newItemTitle.trim() || selectedFactIds.length === 0 || selectedFactIds.length === item.base_facts.length}
                    onClick={handleSplit}
                    className="mt-2 inline-flex items-center gap-1.5 bg-studio-ink px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Scissors className="h-3.5 w-3.5" /> 保存拆分
                  </button>
                </>
              ) : (
                <p className="mt-2 text-xs leading-5 text-[#6b786e]">至少有两条 Base Fact 时才能拆分。</p>
              )}
            </div>

            <div className="border-t border-studio-line/10 pt-4 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
              <div className="text-xs font-semibold text-[#26332b]">合并到已有项目</div>
              {mergeTargets.length ? (
                <>
                  <select
                    aria-label={`${item.title} 合并到`}
                    value={mergeTargetId}
                    onChange={(event) => setMergeTargetId(event.target.value)}
                    className="mt-3 w-full border border-studio-line/20 bg-white px-2 py-2 text-xs outline-none focus:border-studio-accent"
                  >
                    <option value="">选择目标项目</option>
                    {mergeTargets.map((target) => <option key={target.id} value={target.id}>{target.title}</option>)}
                  </select>
                  <button
                    type="button"
                    disabled={busy || !mergeTargetId}
                    onClick={handleMerge}
                    className="mt-2 inline-flex items-center gap-1.5 border border-studio-ink/25 bg-white px-3 py-2 text-xs font-semibold text-[#26332b] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <GitMerge className="h-3.5 w-3.5" /> 合并材料
                  </button>
                </>
              ) : (
                <p className="mt-2 text-xs leading-5 text-[#6b786e]">当前没有其他项目可供合并。</p>
              )}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

export default function ApplicationWorkspacePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const applicationId = params.id;
  const [snapshot, setSnapshot] = useState<ApplicationSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingItemId, setPendingItemId] = useState<string | null>(null);
  const [pendingClaimId, setPendingClaimId] = useState<string | null>(null);
  const [analyzingTarget, setAnalyzingTarget] = useState(false);
  const [generatingClaims, setGeneratingClaims] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace(getLoginPath(`/applications/${applicationId}`));
      return;
    }
    applications
      .get(applicationId)
      .then(setSnapshot)
      .catch((err: unknown) => {
        if (err instanceof AuthRequiredError) router.replace(getLoginPath(`/applications/${applicationId}`));
        else setError(err instanceof Error ? err.message : "暂时无法打开投递工作台");
      })
      .finally(() => setLoading(false));
  }, [applicationId, router]);

  const totalItems = useMemo(() => (snapshot ? itemCount(snapshot) : 0), [snapshot]);
  const allItems = useMemo(() => snapshot ? [
    ...snapshot.experience_entries.flatMap((entry) => entry.experience_items),
    ...snapshot.standalone_experience_items,
  ] : [], [snapshot]);

  async function applyItemMutation(
    itemId: string,
    fallbackMessage: string,
    mutation: () => Promise<ApplicationSnapshot>,
  ): Promise<boolean> {
    setPendingItemId(itemId);
    setError("");
    try {
      setSnapshot(await mutation());
      return true;
    } catch (err: unknown) {
      if (err instanceof AuthRequiredError) router.push(getLoginPath(`/applications/${applicationId}`));
      else setError(err instanceof Error ? err.message : fallbackMessage);
      return false;
    } finally {
      setPendingItemId(null);
    }
  }

  async function moveItem(itemId: string, destinationEntryId: string | null) {
    await applyItemMutation(
      itemId,
      "经历归组没有保存，请重试",
      () => applications.moveExperienceItem(applicationId, itemId, destinationEntryId),
    );
  }

  function splitItem(itemId: string, factIds: string[], newTitle: string) {
    return applyItemMutation(
      itemId,
      "经历项目没有拆分成功，请重试",
      () => applications.splitExperienceItem(applicationId, itemId, factIds, newTitle),
    );
  }

  function mergeItems(sourceItemId: string, destinationItemId: string) {
    return applyItemMutation(
      sourceItemId,
      "经历项目没有合并成功，请重试",
      () => applications.mergeExperienceItems(applicationId, sourceItemId, destinationItemId),
    );
  }

  function saveItemToLibrary(itemId: string) {
    return applyItemMutation(
      itemId,
      "经历没有保存到经历库，请重试",
      () => applications.saveExperienceToLibrary(applicationId, [itemId]),
    );
  }

  async function analyzeTarget() {
    setAnalyzingTarget(true);
    setError("");
    try {
      setSnapshot(await applications.analyzeTarget(applicationId));
    } catch (err: unknown) {
      if (err instanceof AuthRequiredError) router.push(getLoginPath(`/applications/${applicationId}`));
      else setError(err instanceof Error ? err.message : "岗位信号没有提取成功，请重试");
    } finally {
      setAnalyzingTarget(false);
    }
  }

  async function generateClaims() {
    setGeneratingClaims(true);
    setError("");
    try {
      setSnapshot(await applications.generateClaims(applicationId));
    } catch (err: unknown) {
      if (err instanceof AuthRequiredError) router.push(getLoginPath(`/applications/${applicationId}`));
      else setError(err instanceof Error ? err.message : "竞争主张没有生成成功，请重试");
    } finally {
      setGeneratingClaims(false);
    }
  }

  function handleClaimActionError(err: unknown, fallback: string) {
    if (err instanceof AuthRequiredError) router.push(getLoginPath(`/applications/${applicationId}`));
    else setError(err instanceof Error ? err.message : fallback);
  }

  async function editClaim(claimId: string, resumeClaim: string): Promise<boolean> {
    const currentClaim = snapshot?.competitive_claims.find((claim) => claim.id === claimId);
    if (!currentClaim || currentClaim.selected_resume_claim === resumeClaim) return Boolean(currentClaim);

    setPendingClaimId(claimId);
    setError("");
    try {
      setSnapshot(await applications.editResumeClaim(applicationId, claimId, resumeClaim));
      return true;
    } catch (err: unknown) {
      handleClaimActionError(err, "主张修改没有保存，请重试");
      return false;
    } finally {
      setPendingClaimId(null);
    }
  }

  async function saveClaim(claimId: string, resumeClaim: string): Promise<boolean> {
    const currentClaim = snapshot?.competitive_claims.find((claim) => claim.id === claimId);
    if (!currentClaim) return false;

    setPendingClaimId(claimId);
    setError("");
    try {
      let nextSnapshot = snapshot;
      if (currentClaim.selected_resume_claim !== resumeClaim) {
        nextSnapshot = await applications.editResumeClaim(applicationId, claimId, resumeClaim);
      }
      nextSnapshot = await applications.saveTargetedResumeClaims(applicationId, [claimId]);
      setSnapshot(nextSnapshot);
      return true;
    } catch (err: unknown) {
      handleClaimActionError(err, "目标简历没有保存，请重试");
      return false;
    } finally {
      setPendingClaimId(null);
    }
  }

  async function copyTargetedResume(): Promise<boolean> {
    setError("");
    try {
      const content = await applications.getTargetedResumeText(applicationId);
      await navigator.clipboard.writeText(content);
      return true;
    } catch (err: unknown) {
      handleClaimActionError(err, "目标简历没有复制成功，请重试");
      return false;
    }
  }

  async function downloadTargetedResume(): Promise<boolean> {
    setError("");
    try {
      await applications.downloadTargetedResumeMarkdown(applicationId);
      return true;
    } catch (err: unknown) {
      handleClaimActionError(err, "目标简历没有下载成功，请重试");
      return false;
    }
  }

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center bg-studio-canvas text-sm text-[#5f6d63]"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> 正在打开投递工作台</div>;
  }

  if (!snapshot) {
    return (
      <div className="min-h-[60vh] bg-studio-canvas px-5 py-16 text-center">
        <h1 className="text-2xl font-semibold">无法打开这份投递</h1>
        <p className="mt-3 text-sm text-[#5f6d63]">{error || "记录不存在，或你没有查看权限。"}</p>
        <Link href="/applications" className="mt-6 inline-flex items-center gap-2 bg-studio-ink px-4 py-2 text-sm font-semibold text-white"><ArrowLeft className="h-4 w-4" /> 返回投递列表</Link>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-studio-canvas text-studio-ink">
      <div className="border-b border-studio-ink/15 bg-studio-paper">
        <div className="mx-auto max-w-[1440px] px-5 py-5 lg:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Link href="/applications" className="inline-flex items-center gap-1 text-xs font-semibold text-studio-muted hover:text-studio-ink"><ArrowLeft className="h-3.5 w-3.5" /> 所有投递</Link>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <span className="bg-[#ddefbb] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#30472c]">{snapshot.workflow_phase === "claim_review" ? "Claim review" : snapshot.workflow_phase === "role_signal_review" ? "Role signal review" : "Source review"}</span>
                <span className="inline-flex items-center gap-1.5 text-xs text-studio-muted"><Check className="h-3.5 w-3.5 text-[#42763b]" /> 已保存，可随时回来继续</span>
              </div>
              <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-[#132019] md:text-5xl">{snapshot.target_application.target_role}</h1>
            </div>
            <div className="flex items-center gap-5 border-l-2 border-studio-accent pl-4 text-sm">
              <div><div className="text-2xl font-semibold tabular-nums">{totalItems}</div><div className="text-xs text-studio-muted">段可用经历</div></div>
              <ChevronRight className="h-5 w-5 text-[#9aa39c]" />
              <div><div className="font-semibold">{snapshot.competitive_claims.length ? "查看竞争主张" : snapshot.role_signals.length ? "生成竞争主张" : "先确认材料结构"}</div><div className="mt-1 text-xs text-studio-muted">{snapshot.competitive_claims.length ? "主张与冲刺方向严格分开" : snapshot.role_signals.length ? "从高价值经历中选择，不会凑数" : "系统已提出分组，你可以直接调整"}</div></div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-[1440px] gap-8 px-5 py-8 lg:grid-cols-[330px_minmax(0,1fr)] lg:px-8">
        <aside className="space-y-6 lg:sticky lg:top-20 lg:self-start">
          <section className="border-t-4 border-studio-ink bg-[#e8e3d8] p-5">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.16em] text-[#536158]">Target JD <FileText className="h-4 w-4" /></div>
            <p className="mt-4 max-h-64 overflow-y-auto whitespace-pre-line pr-2 text-sm leading-6 text-[#344239]">{snapshot.target_application.jd_text}</p>
          </section>
          <section className="border-y border-studio-ink/15 py-5">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-studio-muted">本次材料边界</div>
            <p className="mt-3 text-sm leading-6 text-[#435047]">当前经历只属于这次投递。修正分组不会改写原始简历，也不会自动写入可复用经历库。</p>
          </section>
        </aside>

        <main>
          <TargetAnalysisPanel
            analysis={snapshot.target_analysis}
            roleSignals={snapshot.role_signals}
            busy={analyzingTarget}
            onAnalyze={analyzeTarget}
          />

          <ClaimStudioPanel
            studio={snapshot.claim_studio}
            claims={snapshot.competitive_claims}
            sources={snapshot.source_snapshots}
            sourceChangeNotices={snapshot.source_change_notices}
            savedClaims={snapshot.targeted_resume_version.resume_claims}
            canGenerate={snapshot.role_signals.length > 0}
            busy={generatingClaims}
            pendingClaimId={pendingClaimId}
            onGenerate={generateClaims}
            onEditClaim={editClaim}
            onSaveClaim={saveClaim}
          />

          <TargetedResumePanel
            version={snapshot.targeted_resume_version}
            sources={snapshot.source_snapshots}
            onCopy={copyTargetedResume}
            onDownload={downloadTargetedResume}
          />

          <div className="mb-6 flex flex-col gap-3 border-b border-studio-ink/15 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div><div className="text-xs font-semibold uppercase tracking-[0.16em] text-studio-accent">Experience map</div><h2 className="mt-1 text-2xl font-semibold tracking-tight">经历编排</h2></div>
            <p className="max-w-lg text-xs leading-5 text-studio-muted">一段工作可以包含多个项目或责任模块；独立项目无需挂在工作经历下面。调整后会立即保存。</p>
          </div>

          {error && (
            <div role="alert" className="mb-5 flex items-center justify-between gap-4 border-l-4 border-studio-accent bg-[#fff1ec] px-4 py-3 text-sm text-[#7e2c1b]">
              <span>{error}</span>
              <button type="button" onClick={() => window.location.reload()} className="inline-flex items-center gap-1 font-semibold underline underline-offset-4"><RotateCcw className="h-3.5 w-3.5" /> 重试</button>
            </div>
          )}

          <div className="space-y-8">
            {snapshot.experience_entries.map((entry) => (
              <section key={entry.id}>
                <div className="mb-3 flex flex-col gap-2 border-l-4 border-studio-ink pl-4 sm:flex-row sm:items-end sm:justify-between">
                  <div><div className="flex items-center gap-2 text-xs text-studio-muted"><BriefcaseBusiness className="h-3.5 w-3.5" /> 工作 / 实习经历</div><h3 className="mt-1 text-xl font-semibold">{entry.organization}</h3></div>
                  <div className="text-sm text-[#536158] sm:text-right"><div className="font-medium text-[#26332b]">{entry.role}</div>{entry.date_range && <div className="mt-0.5 text-xs">{entry.date_range}</div>}</div>
                </div>
                <div className="space-y-3 sm:pl-5">
                  {entry.experience_items.length ? entry.experience_items.map((item) => (
                    <ExperienceItemCard key={item.id} item={item} entries={snapshot.experience_entries} allItems={allItems} libraryLink={snapshot.experience_library_links?.find((link) => link.application_experience_item_id === item.id)} busy={pendingItemId === item.id} onMove={moveItem} onSplit={splitItem} onMerge={mergeItems} onSaveToLibrary={saveItemToLibrary} />
                  )) : <div className="border border-dashed border-studio-ink/25 px-5 py-6 text-sm text-studio-muted">这段经历暂时没有项目材料，可从下方独立项目中调整归入。</div>}
                </div>
              </section>
            ))}

            <section>
              <div className="mb-3 flex items-center gap-2 border-l-4 border-studio-accent pl-4"><FolderKanban className="h-4 w-4 text-[#b44128]" /><h3 className="text-xl font-semibold">独立项目</h3></div>
              <div className="space-y-3 sm:pl-5">
                {snapshot.standalone_experience_items.length ? snapshot.standalone_experience_items.map((item) => (
                  <ExperienceItemCard key={item.id} item={item} entries={snapshot.experience_entries} allItems={allItems} libraryLink={snapshot.experience_library_links?.find((link) => link.application_experience_item_id === item.id)} busy={pendingItemId === item.id} onMove={moveItem} onSplit={splitItem} onMerge={mergeItems} onSaveToLibrary={saveItemToLibrary} />
                )) : <div className="border border-dashed border-studio-ink/25 px-5 py-6 text-sm text-studio-muted">当前没有独立项目，所有材料都已归入工作或实习经历。</div>}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
