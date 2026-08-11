"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BriefcaseBusiness, Check, ChevronRight, CircleDot, FileText, FolderKanban, Loader2, RotateCcw } from "lucide-react";
import { applications, type ApplicationSnapshot, type ExperienceEntrySnapshot, type ExperienceItemSnapshot } from "@/lib/api";
import { AuthRequiredError, getLoginPath, isAuthenticated } from "@/lib/auth";

function itemCount(snapshot: ApplicationSnapshot): number {
  return snapshot.standalone_experience_items.length + snapshot.experience_entries.reduce(
    (total, entry) => total + entry.experience_items.length,
    0,
  );
}

function ExperienceItemCard({ item, entries, moving, onMove }: {
  item: ExperienceItemSnapshot;
  entries: ExperienceEntrySnapshot[];
  moving: boolean;
  onMove: (itemId: string, destinationEntryId: string | null) => void;
}) {
  return (
    <article className="border border-[#1c2921]/15 bg-white p-5 shadow-[3px_3px_0_#e5dfd2]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6b786e]">
            <CircleDot className="h-3 w-3 text-[#d24d31]" /> 经历材料
          </div>
          <h4 className="mt-2 text-lg font-semibold tracking-tight text-[#16221a]">{item.title}</h4>
        </div>
        <label className="flex shrink-0 items-center gap-2 text-xs text-[#5f6d63]">
          归入
          <select
            aria-label={`${item.title} 归入`}
            value={item.entry_id || "standalone"}
            disabled={moving}
            onChange={(event) => onMove(item.id, event.target.value === "standalone" ? null : event.target.value)}
            className="max-w-52 border border-[#1c2921]/20 bg-[#f7f4ed] px-2 py-1.5 font-medium text-[#26332b] outline-none focus:border-[#d24d31]"
          >
            <option value="standalone">独立项目</option>
            {entries.map((entry) => <option key={entry.id} value={entry.id}>{entry.organization} · {entry.role}</option>)}
          </select>
          {moving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        </label>
      </div>
      <ul className="mt-4 space-y-3 border-t border-[#1c2921]/10 pt-4">
        {item.base_facts.map((fact) => (
          <li key={fact.id} className="grid grid-cols-[14px_1fr] gap-2 text-sm leading-6 text-[#39483e]">
            <span className="mt-[9px] h-1.5 w-1.5 rounded-full bg-[#d24d31]" />
            <span>{fact.text}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

export default function ApplicationWorkspacePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const applicationId = params.id;
  const [snapshot, setSnapshot] = useState<ApplicationSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [movingItemId, setMovingItemId] = useState<string | null>(null);
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

  async function moveItem(itemId: string, destinationEntryId: string | null) {
    setMovingItemId(itemId);
    setError("");
    try {
      setSnapshot(await applications.moveExperienceItem(applicationId, itemId, destinationEntryId));
    } catch (err: unknown) {
      if (err instanceof AuthRequiredError) router.push(getLoginPath(`/applications/${applicationId}`));
      else setError(err instanceof Error ? err.message : "经历归组没有保存，请重试");
    } finally {
      setMovingItemId(null);
    }
  }

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center bg-[#f2efe8] text-sm text-[#5f6d63]"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> 正在打开投递工作台</div>;
  }

  if (!snapshot) {
    return (
      <div className="min-h-[60vh] bg-[#f2efe8] px-5 py-16 text-center">
        <h1 className="text-2xl font-semibold">无法打开这份投递</h1>
        <p className="mt-3 text-sm text-[#5f6d63]">{error || "记录不存在，或你没有查看权限。"}</p>
        <Link href="/applications" className="mt-6 inline-flex items-center gap-2 bg-[#17211b] px-4 py-2 text-sm font-semibold text-white"><ArrowLeft className="h-4 w-4" /> 返回投递列表</Link>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#f2efe8] text-[#17211b]">
      <div className="border-b border-[#17211b]/15 bg-[#fffdf8]">
        <div className="mx-auto max-w-[1440px] px-5 py-5 lg:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Link href="/applications" className="inline-flex items-center gap-1 text-xs font-semibold text-[#657168] hover:text-[#17211b]"><ArrowLeft className="h-3.5 w-3.5" /> 所有投递</Link>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <span className="bg-[#ddefbb] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#30472c]">Source review</span>
                <span className="inline-flex items-center gap-1.5 text-xs text-[#657168]"><Check className="h-3.5 w-3.5 text-[#42763b]" /> 已保存，可随时回来继续</span>
              </div>
              <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-[#132019] md:text-5xl">{snapshot.target_application.target_role}</h1>
            </div>
            <div className="flex items-center gap-5 border-l-2 border-[#d24d31] pl-4 text-sm">
              <div><div className="text-2xl font-semibold tabular-nums">{totalItems}</div><div className="text-xs text-[#657168]">段可用经历</div></div>
              <ChevronRight className="h-5 w-5 text-[#9aa39c]" />
              <div><div className="font-semibold">先确认材料结构</div><div className="mt-1 text-xs text-[#657168]">系统已提出分组，你可以直接调整</div></div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-[1440px] gap-8 px-5 py-8 lg:grid-cols-[330px_minmax(0,1fr)] lg:px-8">
        <aside className="space-y-6 lg:sticky lg:top-20 lg:self-start">
          <section className="border-t-4 border-[#17211b] bg-[#e8e3d8] p-5">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.16em] text-[#536158]">Target JD <FileText className="h-4 w-4" /></div>
            <p className="mt-4 max-h-64 overflow-y-auto whitespace-pre-line pr-2 text-sm leading-6 text-[#344239]">{snapshot.target_application.jd_text}</p>
          </section>
          <section className="border-y border-[#17211b]/15 py-5">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#657168]">本次材料边界</div>
            <p className="mt-3 text-sm leading-6 text-[#435047]">当前经历只属于这次投递。修正分组不会改写原始简历，也不会自动写入可复用经历库。</p>
          </section>
        </aside>

        <main>
          <div className="mb-6 flex flex-col gap-3 border-b border-[#17211b]/15 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div><div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#d24d31]">Experience map</div><h2 className="mt-1 text-2xl font-semibold tracking-tight">经历编排</h2></div>
            <p className="max-w-lg text-xs leading-5 text-[#657168]">一段工作可以包含多个项目或责任模块；独立项目无需挂在工作经历下面。调整后会立即保存。</p>
          </div>

          {error && (
            <div role="alert" className="mb-5 flex items-center justify-between gap-4 border-l-4 border-[#d24d31] bg-[#fff1ec] px-4 py-3 text-sm text-[#7e2c1b]">
              <span>{error}</span>
              <button type="button" onClick={() => window.location.reload()} className="inline-flex items-center gap-1 font-semibold underline underline-offset-4"><RotateCcw className="h-3.5 w-3.5" /> 重试</button>
            </div>
          )}

          <div className="space-y-8">
            {snapshot.experience_entries.map((entry) => (
              <section key={entry.id}>
                <div className="mb-3 flex flex-col gap-2 border-l-4 border-[#17211b] pl-4 sm:flex-row sm:items-end sm:justify-between">
                  <div><div className="flex items-center gap-2 text-xs text-[#657168]"><BriefcaseBusiness className="h-3.5 w-3.5" /> 工作 / 实习经历</div><h3 className="mt-1 text-xl font-semibold">{entry.organization}</h3></div>
                  <div className="text-sm text-[#536158] sm:text-right"><div className="font-medium text-[#26332b]">{entry.role}</div>{entry.date_range && <div className="mt-0.5 text-xs">{entry.date_range}</div>}</div>
                </div>
                <div className="space-y-3 sm:pl-5">
                  {entry.experience_items.length ? entry.experience_items.map((item) => (
                    <ExperienceItemCard key={item.id} item={item} entries={snapshot.experience_entries} moving={movingItemId === item.id} onMove={moveItem} />
                  )) : <div className="border border-dashed border-[#17211b]/25 px-5 py-6 text-sm text-[#657168]">这段经历暂时没有项目材料，可从下方独立项目中调整归入。</div>}
                </div>
              </section>
            ))}

            <section>
              <div className="mb-3 flex items-center gap-2 border-l-4 border-[#d24d31] pl-4"><FolderKanban className="h-4 w-4 text-[#b44128]" /><h3 className="text-xl font-semibold">独立项目</h3></div>
              <div className="space-y-3 sm:pl-5">
                {snapshot.standalone_experience_items.length ? snapshot.standalone_experience_items.map((item) => (
                  <ExperienceItemCard key={item.id} item={item} entries={snapshot.experience_entries} moving={movingItemId === item.id} onMove={moveItem} />
                )) : <div className="border border-dashed border-[#17211b]/25 px-5 py-6 text-sm text-[#657168]">当前没有独立项目，所有材料都已归入工作或实习经历。</div>}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
