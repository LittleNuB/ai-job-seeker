"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { ArrowRight, BriefcaseBusiness, FileCheck2, Loader2, Plus, Sparkles } from "lucide-react";
import FileUploader from "@/components/FileUploader";
import { applications, type ApplicationListItem } from "@/lib/api";
import { AuthRequiredError, getLoginPath, isAuthenticated } from "@/lib/auth";

const phaseLabel: Record<string, string> = { source_review: "整理经历" };

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function ApplicationsPage() {
  const router = useRouter();
  const [targetRole, setTargetRole] = useState("");
  const [jdText, setJdText] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [recent, setRecent] = useState<ApplicationListItem[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace(getLoginPath("/applications"));
      return;
    }
    applications
      .list()
      .then(({ items }) => setRecent(items))
      .catch((err: unknown) => {
        if (err instanceof AuthRequiredError) router.replace(getLoginPath("/applications"));
        else setError(err instanceof Error ? err.message : "暂时无法读取投递记录");
      })
      .finally(() => setLoadingRecent(false));
  }, [router]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!isAuthenticated()) {
      router.push(getLoginPath("/applications"));
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const snapshot = await applications.start({ target_role: targetRole, jd_text: jdText, resume_text: resumeText });
      router.push(`/applications/${snapshot.application_id}`);
    } catch (err: unknown) {
      if (err instanceof AuthRequiredError) router.push(getLoginPath("/applications"));
      else setError(err instanceof Error ? err.message : "建立投递工作台失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-full bg-[#f2efe8] text-[#17211b]">
      <div className="border-b border-[#17211b]/15 bg-[#e4efcf]">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 lg:grid-cols-[1fr_0.72fr] lg:items-end lg:px-8">
          <div>
            <div className="mb-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#40553b]">
              <Sparkles className="h-4 w-4" /> One application at a time
            </div>
            <h1 className="max-w-4xl text-4xl font-semibold leading-[1.05] tracking-[-0.045em] text-[#132019] md:text-6xl">
              为这一次投递，重新组织你的经历。
            </h1>
          </div>
          <p className="max-w-xl text-base leading-7 text-[#405048] lg:pb-1">
            从一份具体 JD 开始。系统先把实习、工作和项目经历拆成可调整的材料单元，之后所有主张和面试准备都留在同一个工作台里。
          </p>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)] lg:px-8">
        <form onSubmit={handleSubmit} className="border border-[#17211b]/20 bg-[#fffdf8] shadow-[8px_8px_0_#d7d2c5]">
          <div className="flex items-center justify-between border-b border-[#17211b]/15 px-6 py-5">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#cc4f32]">新投递</div>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight">建立材料底稿</h2>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#17211b]/20 bg-[#f2efe8]">
              <Plus className="h-5 w-5" />
            </span>
          </div>

          <div className="space-y-7 p-6">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold">目标岗位</span>
              <input
                aria-label="目标岗位"
                value={targetRole}
                onChange={(event) => setTargetRole(event.target.value)}
                required
                maxLength={120}
                placeholder="例如：AI 产品经理"
                className="w-full border-0 border-b-2 border-[#17211b]/25 bg-transparent px-0 py-3 text-xl font-medium outline-none transition-colors placeholder:text-[#17211b]/30 focus:border-[#cc4f32]"
              />
            </label>

            <label className="block">
              <span className="mb-2 flex items-baseline justify-between gap-4 text-sm font-semibold">
                具体 JD <span className="text-xs font-normal text-[#617066]">需包含职责与任职要求</span>
              </span>
              <textarea
                aria-label="具体 JD"
                value={jdText}
                onChange={(event) => setJdText(event.target.value)}
                required
                rows={9}
                placeholder="粘贴你实际准备投递的完整职位描述……"
                className="w-full resize-y border border-[#17211b]/20 bg-white p-4 text-sm leading-7 outline-none transition-colors placeholder:text-[#17211b]/35 focus:border-[#cc4f32] focus:ring-1 focus:ring-[#cc4f32]"
              />
            </label>

            <div>
              <div className="mb-2 flex items-baseline justify-between gap-4 text-sm font-semibold">
                简历内容 <span className="text-xs font-normal text-[#617066]">粘贴或上传均可</span>
              </div>
              <FileUploader onTextExtracted={setResumeText} label="从现有简历提取内容" />
              <textarea
                aria-label="简历内容"
                value={resumeText}
                onChange={(event) => setResumeText(event.target.value)}
                required
                rows={10}
                placeholder="粘贴工作经历、实习经历和项目经历……"
                className="w-full resize-y border border-[#17211b]/20 bg-white p-4 text-sm leading-7 outline-none transition-colors placeholder:text-[#17211b]/35 focus:border-[#cc4f32] focus:ring-1 focus:ring-[#cc4f32]"
              />
            </div>

            {error && <div role="alert" className="border-l-4 border-[#cc4f32] bg-[#fff1ec] px-4 py-3 text-sm text-[#7e2c1b]">{error}</div>}

            <div className="flex flex-col gap-3 border-t border-[#17211b]/15 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-md text-xs leading-5 text-[#617066]">
                导入内容只保存在这次投递中，不会自动写入可复用经历库。
              </p>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex min-w-44 items-center justify-center gap-2 bg-[#17211b] px-5 py-3 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 hover:bg-[#26372d] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                建立投递工作台
              </button>
            </div>
          </div>
        </form>

        <aside>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#617066]">Recent desks</div>
              <h2 className="mt-1 text-xl font-semibold">最近的投递</h2>
            </div>
            <BriefcaseBusiness className="h-5 w-5 text-[#617066]" />
          </div>

          {loadingRecent ? (
            <div className="flex items-center gap-2 border-y border-[#17211b]/15 py-6 text-sm text-[#617066]">
              <Loader2 className="h-4 w-4 animate-spin" /> 正在读取投递记录
            </div>
          ) : recent.length === 0 ? (
            <div className="border-y border-[#17211b]/15 py-6">
              <FileCheck2 className="h-6 w-6 text-[#cc4f32]" />
              <p className="mt-3 text-sm font-medium">第一份投递工作台会出现在这里。</p>
              <p className="mt-1 text-xs leading-5 text-[#617066]">建立后可随时离开，不会丢失已经整理的经历。</p>
            </div>
          ) : (
            <div className="divide-y divide-[#17211b]/15 border-y border-[#17211b]/15">
              {recent.map((item, index) => (
                <article key={item.application_id} className="py-5">
                  <div className="flex items-start gap-4">
                    <span className="mt-0.5 font-mono text-xs text-[#8b958d]">{String(index + 1).padStart(2, "0")}</span>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-lg font-semibold">{item.target_role}</h3>
                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#617066]">
                        <span>{phaseLabel[item.workflow_phase] || item.workflow_phase}</span>
                        <span>{item.experience_item_count} 段经历</span>
                        <span>{formatDate(item.updated_at)}</span>
                      </div>
                      <Link href={`/applications/${item.application_id}`} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#b43f27] underline decoration-[#b43f27]/30 underline-offset-4 hover:text-[#7f2818]">
                        继续准备 <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
