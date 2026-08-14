"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { ArrowLeft, BookOpenCheck, BriefcaseBusiness, Check, FolderKanban, Loader2, Save } from "lucide-react";
import {
  experienceLibrary,
  type ExperienceLibraryEntrySnapshot,
  type ExperienceLibraryItemSnapshot,
  type ExperienceLibrarySnapshot,
} from "@/lib/api";
import { AuthRequiredError, getLoginPath, isAuthenticated } from "@/lib/auth";

function LibraryItemEditor({ item, entry, onSaved }: {
  item: ExperienceLibraryItemSnapshot;
  entry: ExperienceLibraryEntrySnapshot | null;
  onSaved: (snapshot: ExperienceLibrarySnapshot) => void;
}) {
  const [title, setTitle] = useState(item.title);
  const [organization, setOrganization] = useState(entry?.organization || "");
  const [role, setRole] = useState(entry?.role || "");
  const [dateRange, setDateRange] = useState(entry?.date_range || "");
  const [facts, setFacts] = useState(item.base_facts.map((fact) => ({ id: fact.id, text: fact.text })));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setTitle(item.title);
    setOrganization(entry?.organization || "");
    setRole(entry?.role || "");
    setDateRange(entry?.date_range || "");
    setFacts(item.base_facts.map((fact) => ({ id: fact.id, text: fact.text })));
  }, [entry?.date_range, entry?.organization, entry?.role, item]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const snapshot = await experienceLibrary.updateItem({
        experience_item_id: item.id,
        title,
        entry_context: entry ? {
          organization,
          role,
          date_range: dateRange.trim() || null,
        } : null,
        base_facts: facts,
      });
      onSaved(snapshot);
      setMessage("已保存当前内容");
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : "保存失败，请重试");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border border-studio-ink/15 bg-white p-5 shadow-[3px_3px_0_#e5dfd2]">
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6b786e]">经历项目</span>
            <input
              aria-label={`${item.title} 项目名称`}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              maxLength={240}
              className="w-full border-0 border-b-2 border-studio-ink/20 bg-transparent px-0 py-2 text-lg font-semibold outline-none focus:border-studio-accent"
            />
          </label>

          {entry && (
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block">
                <span className="mb-1 block text-xs text-[#617066]">组织</span>
                <input value={organization} onChange={(event) => setOrganization(event.target.value)} required className="w-full border border-studio-ink/15 bg-[#f7f4ed] px-3 py-2 text-sm outline-none focus:border-studio-accent" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-[#617066]">角色</span>
                <input value={role} onChange={(event) => setRole(event.target.value)} required className="w-full border border-studio-ink/15 bg-[#f7f4ed] px-3 py-2 text-sm outline-none focus:border-studio-accent" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-[#617066]">时间</span>
                <input value={dateRange} onChange={(event) => setDateRange(event.target.value)} className="w-full border border-studio-ink/15 bg-[#f7f4ed] px-3 py-2 text-sm outline-none focus:border-studio-accent" />
              </label>
            </div>
          )}

          <div>
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6b786e]">Base Facts</div>
            <div className="space-y-2">
              {facts.map((fact, index) => (
                <label key={fact.id} className="grid grid-cols-[18px_1fr] gap-2">
                  <span className="pt-2.5 font-mono text-xs text-[#8b958d]">{index + 1}</span>
                  <textarea
                    aria-label={`${item.title} 事实 ${index + 1}`}
                    value={fact.text}
                    onChange={(event) => setFacts((current) => current.map((candidate) => (
                      candidate.id === fact.id ? { ...candidate, text: event.target.value } : candidate
                    )))}
                    required
                    rows={2}
                    className="w-full resize-y border border-studio-ink/15 bg-[#fbfaf6] px-3 py-2 text-sm leading-6 outline-none focus:border-studio-accent"
                  />
                </label>
              ))}
            </div>
          </div>
        </div>

        <button type="submit" disabled={saving} className="inline-flex items-center justify-center gap-2 bg-studio-ink px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#26372d] disabled:opacity-50">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          保存修改
        </button>
      </div>
      {message && <p role="status" className="mt-3 flex items-center gap-1.5 text-xs text-[#526357]"><Check className="h-3.5 w-3.5" /> {message}</p>}
    </form>
  );
}

export default function ExperienceLibraryPage() {
  const router = useRouter();
  const [library, setLibrary] = useState<ExperienceLibrarySnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace(getLoginPath("/experience-library"));
      return;
    }
    experienceLibrary.get()
      .then(setLibrary)
      .catch((err: unknown) => {
        if (err instanceof AuthRequiredError) router.replace(getLoginPath("/experience-library"));
        else setError(err instanceof Error ? err.message : "暂时无法读取经历库");
      })
      .finally(() => setLoading(false));
  }, [router]);

  const itemCount = library
    ? library.standalone_experience_items.length
      + library.experience_entries.reduce((total, entry) => total + entry.experience_items.length, 0)
    : 0;

  return (
    <div className="min-h-full bg-studio-canvas text-studio-ink">
      <header className="border-b border-studio-ink/15 bg-studio-sage">
        <div className="mx-auto max-w-6xl px-5 py-10 lg:px-8">
          <Link href="/applications" className="inline-flex items-center gap-2 text-xs font-semibold text-[#526357] underline decoration-[#526357]/30 underline-offset-4">
            <ArrowLeft className="h-3.5 w-3.5" /> 返回投递工作台
          </Link>
          <div className="mt-7 grid gap-5 md:grid-cols-[1fr_0.48fr] md:items-end">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#40553b]"><BookOpenCheck className="h-4 w-4" /> Current source</div>
              <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] md:text-5xl">经历库</h1>
            </div>
            <p className="text-sm leading-6 text-[#405048]">
              这里只保留你显式保存的当前内容。后续修改不会覆盖已经用于投递的来源快照。
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-10 lg:px-8">
        {loading ? (
          <div className="flex items-center gap-2 border-y border-studio-ink/15 py-8 text-sm text-[#617066]"><Loader2 className="h-4 w-4 animate-spin" /> 正在读取经历库</div>
        ) : error ? (
          <div role="alert" className="border-l-4 border-[#cc4f32] bg-[#fff1ec] px-4 py-3 text-sm text-[#7e2c1b]">{error}</div>
        ) : !library || itemCount === 0 ? (
          <section className="border-y border-studio-ink/15 py-12">
            <FolderKanban className="h-7 w-7 text-[#b44128]" />
            <h2 className="mt-4 text-xl font-semibold">还没有可复用经历</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[#617066]">先从一份具体投递导入简历，整理好项目边界后，再把值得复用的经历显式保存到这里。</p>
          </section>
        ) : (
          <div className="space-y-10">
            {library.experience_entries.map((entry) => (
              <section key={entry.id}>
                <div className="mb-4 flex items-end justify-between gap-4 border-l-4 border-studio-ink pl-4">
                  <div><div className="flex items-center gap-2 text-xs text-[#617066]"><BriefcaseBusiness className="h-3.5 w-3.5" /> 工作 / 实习经历</div><h2 className="mt-1 text-xl font-semibold">{entry.organization}</h2></div>
                  <div className="text-right text-sm text-[#526357]"><div className="font-medium">{entry.role}</div>{entry.date_range && <div className="mt-0.5 text-xs">{entry.date_range}</div>}</div>
                </div>
                <div className="space-y-4 sm:pl-5">
                  {entry.experience_items.map((item) => <LibraryItemEditor key={item.id} item={item} entry={entry} onSaved={setLibrary} />)}
                </div>
              </section>
            ))}

            {library.standalone_experience_items.length > 0 && (
              <section>
                <div className="mb-4 flex items-center gap-2 border-l-4 border-studio-accent pl-4"><FolderKanban className="h-4 w-4 text-[#b44128]" /><h2 className="text-xl font-semibold">独立项目</h2></div>
                <div className="space-y-4 sm:pl-5">
                  {library.standalone_experience_items.map((item) => <LibraryItemEditor key={item.id} item={item} entry={null} onSaved={setLibrary} />)}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
