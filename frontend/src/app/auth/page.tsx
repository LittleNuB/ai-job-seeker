"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { auth } from "@/lib/api";
import { setAuthSession } from "@/lib/auth";

const MAX_BCRYPT_BYTES = 72;

function byteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

function AuthPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const trimmedEmail = email.trim();
  const trimmedName = name.trim();
  const passwordTooLong = byteLength(password) > MAX_BCRYPT_BYTES;
  const canSubmit = Boolean(trimmedEmail && password && !passwordTooLong && !loading);
  const nextPath = getSafeNextPath(searchParams.get("next"));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setError("");

    try {
      const res =
        mode === "login"
          ? await auth.login({ email: trimmedEmail, password })
          : await auth.register({
              email: trimmedEmail,
              password,
              name: trimmedName || undefined,
            });

      setAuthSession(res.access_token, res.email);
      router.push(nextPath);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "认证失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  function switchMode() {
    setMode((current) => (current === "login" ? "register" : "login"));
    setError("");
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold text-gray-900">
          {mode === "login" ? "登录" : "注册"}
        </h1>
        <p className="mb-6 text-sm text-gray-500">
          登录后可以保存、查看并导出你的分析记录。
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "register" && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                昵称 <span className="font-normal text-gray-400">可选</span>
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="怎么称呼你"
                autoComplete="name"
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">邮箱</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="请输入密码"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
            {passwordTooLong && (
              <p className="mt-1 text-xs text-red-600">
                密码过长，请控制在 72 字节以内。
              </p>
            )}
          </div>

          <div className="min-h-[44px]">
            {error && (
              <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "login" ? "登录" : "注册并登录"}
          </button>
        </form>

        <button
          type="button"
          onClick={switchMode}
          className="mt-4 w-full text-sm text-blue-600 hover:text-blue-700"
        >
          {mode === "login" ? "还没有账号？创建一个" : "已有账号？去登录"}
        </button>
      </div>
    </div>
  );
}

function getSafeNextPath(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/";
  }
  return next;
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-md px-4 py-12 text-center text-sm text-gray-400">加载中...</div>}>
      <AuthPageContent />
    </Suspense>
  );
}
