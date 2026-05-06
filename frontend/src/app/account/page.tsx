"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AlertCircle, BarChart3, Clock3, Database, Download, FileText, History, Loader2, Shield, Target, Trash2 } from "lucide-react";
import { auth } from "@/lib/api";
import { AuthRequiredError, clearAuthSession, redirectToLogin, requireAuth } from "@/lib/auth";

interface Profile {
  user_id: string;
  email: string;
  name?: string | null;
  created_at?: string | null;
  stats: {
    total_records: number;
    jd_records: number;
    match_records: number;
    chat_conversations: number;
  };
}

export default function AccountPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!requireAuth()) return;

    let mounted = true;
    auth
      .profile()
      .then((data) => {
        if (mounted) setProfile(data);
      })
      .catch((err: unknown) => {
        if (err instanceof AuthRequiredError) {
          redirectToLogin();
          return;
        }
        if (mounted) setError(err instanceof Error ? err.message : "账号信息加载失败");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  async function handleDataExport() {
    if (!requireAuth()) return;
    setExporting(true);
    setError("");
    setNotice("");
    try {
      await auth.downloadDataExport();
      setNotice("数据导出已开始下载，请妥善保存文件。");
    } catch (err: unknown) {
      if (err instanceof AuthRequiredError) {
        redirectToLogin();
        return;
      }
      setError(err instanceof Error ? err.message : "数据导出失败，请稍后重试");
    } finally {
      setExporting(false);
    }
  }

  async function handleDeleteAccount() {
    if (!requireAuth()) return;
    if (deleteConfirm !== "DELETE") return;

    setDeleting(true);
    setError("");
    setNotice("");
    try {
      await auth.deleteAccount();
      clearAuthSession();
      router.replace("/");
    } catch (err: unknown) {
      if (err instanceof AuthRequiredError) {
        redirectToLogin();
        return;
      }
      setError(err instanceof Error ? err.message : "账号注销失败，请稍后重试");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">账号中心</h1>
          <p className="mt-1 text-sm text-gray-500">查看账号资料、分析记录和数据管理状态</p>
        </div>
        <Link
          href="/history"
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          <History className="h-4 w-4" />
          历史记录
        </Link>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-24 text-gray-400">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      )}

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <span className="text-sm text-red-700">{error}</span>
        </div>
      )}

      {notice && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
          <span className="text-sm text-blue-700">{notice}</span>
        </div>
      )}

      {profile && (
        <div className="space-y-6">
          <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-gray-200 bg-white p-4 md:col-span-2">
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900">
                <Shield className="h-4 w-4 text-blue-600" />
                账号信息
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <InfoItem label="邮箱" value={profile.email} />
                <InfoItem label="昵称" value={profile.name || "未设置"} />
                <InfoItem label="用户 ID" value={profile.user_id} mono />
                <InfoItem label="注册时间" value={formatDate(profile.created_at)} />
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900">
                <Clock3 className="h-4 w-4 text-blue-600" />
                最近状态
              </div>
              <div className="text-3xl font-bold text-gray-900">{profile.stats.total_records}</div>
              <div className="mt-1 text-sm text-gray-500">条分析记录</div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-blue-600"
                  style={{ width: `${Math.min(100, profile.stats.total_records * 12)}%` }}
                />
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={Database} label="全部记录" value={profile.stats.total_records} tone="blue" />
            <StatCard icon={FileText} label="JD 解析" value={profile.stats.jd_records} tone="green" />
            <StatCard icon={Target} label="简历匹配" value={profile.stats.match_records} tone="amber" />
            <StatCard icon={BarChart3} label="AI 对话" value={profile.stats.chat_conversations} tone="slate" />
          </section>

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <ActionLink href="/history" icon={History} title="查看历史记录" description="浏览、导出或删除自己的 JD 和匹配记录。" />
            <ActionLink href="/jd" icon={FileText} title="新增 JD 解析" description="分析新的岗位描述并保存到账号记录。" />
            <ActionLink href="/match" icon={Target} title="新增简历匹配" description="基于目标岗位生成匹配分析和提升计划。" />
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900">
              <Database className="h-4 w-4 text-blue-600" />
              数据管理
            </div>
            <div className="flex flex-col gap-3 border-b border-gray-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-medium text-gray-900">导出我的数据</div>
                <p className="mt-1 text-xs leading-relaxed text-gray-500">
                  下载账号资料、分析记录和 AI 对话记录的 JSON 文件。
                </p>
              </div>
              <button
                type="button"
                onClick={handleDataExport}
                disabled={exporting}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {exporting ? "导出中..." : "导出数据"}
              </button>
            </div>

            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-red-900">
                    <Trash2 className="h-4 w-4" />
                    注销账号
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-red-700">
                    注销后将删除账号、分析记录、AI 对话记录，当前登录状态也会失效。
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    value={deleteConfirm}
                    onChange={(event) => setDeleteConfirm(event.target.value)}
                    placeholder="输入 DELETE 确认"
                    disabled={deleting}
                    className="h-10 rounded-lg border border-red-200 bg-white px-3 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-red-400 focus:ring-2 focus:ring-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={handleDeleteAccount}
                    disabled={deleting || deleteConfirm !== "DELETE"}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-red-600 px-3 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    {deleting ? "注销中..." : "确认注销"}
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function InfoItem({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-xs font-medium text-gray-400">{label}</div>
      <div className={`mt-1 break-all text-sm text-gray-900 ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Database;
  label: string;
  value: number;
  tone: "blue" | "green" | "amber" | "slate";
}) {
  const tones = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-green-50 text-green-700",
    amber: "bg-amber-50 text-amber-700",
    slate: "bg-slate-100 text-slate-700",
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className={`mb-4 inline-flex h-9 w-9 items-center justify-center rounded-lg ${tones[tone]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="mt-1 text-sm text-gray-500">{label}</div>
    </div>
  );
}

function ActionLink({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: typeof History;
  title: string;
  description: string;
}) {
  return (
    <Link href={href} className="rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-sm">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-gray-700">
        <Icon className="h-4 w-4" />
      </div>
      <div className="text-sm font-semibold text-gray-900">{title}</div>
      <p className="mt-1 text-xs leading-relaxed text-gray-500">{description}</p>
    </Link>
  );
}

function formatDate(value?: string | null): string {
  if (!value) return "未知";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "未知";
  return date.toLocaleString("zh-CN");
}
