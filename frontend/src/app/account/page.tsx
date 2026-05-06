"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertCircle, BarChart3, Clock3, Database, FileText, History, Loader2, Shield, Target } from "lucide-react";
import { auth } from "@/lib/api";
import { AuthRequiredError, redirectToLogin, requireAuth } from "@/lib/auth";

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
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
