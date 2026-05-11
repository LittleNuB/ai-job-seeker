"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Brain, Compass, FileText, History, LogIn, LogOut, Radar, Target, UserCircle } from "lucide-react";
import { AUTH_CHANGED_EVENT, clearAuthSession, getAuthEmail, getLoginPath } from "@/lib/auth";

const links = [
  { href: "/", label: "首页", icon: Brain },
  { href: "/radar", label: "岗位雷达", icon: Radar },
  { href: "/explore", label: "岗位探索", icon: Compass },
  { href: "/jd", label: "JD 解析", icon: FileText },
  { href: "/match", label: "简历匹配", icon: Target },
  { href: "/history", label: "历史记录", icon: History },
  { href: "/account", label: "账号", icon: UserCircle },
];

function compactEmail(email: string): string {
  if (email.length <= 22) return email;
  const [name, domain] = email.split("@");
  if (!domain) return `${email.slice(0, 18)}...`;
  return `${name.slice(0, 8)}...@${domain}`;
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    function syncEmail() {
      setEmail(getAuthEmail());
    }

    syncEmail();
    window.addEventListener(AUTH_CHANGED_EVENT, syncEmail);
    return () => window.removeEventListener(AUTH_CHANGED_EVENT, syncEmail);
  }, [pathname]);

  function handleLogout() {
    clearAuthSession();
    setEmail(null);
    router.push("/auth");
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold text-blue-600">
          <Brain className="h-6 w-6" />
          AI Job Copilot
        </Link>

        <div className="flex items-center gap-1">
          {links.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-blue-50 text-blue-600"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}

          {email ? (
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
              title={`当前账号：${email}`}
            >
              <span className="hidden max-w-[180px] truncate lg:inline">{compactEmail(email)}</span>
              <LogOut className="h-4 w-4" />
              退出
            </button>
          ) : (
            <Link
              href={getLoginPath(pathname)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                pathname.startsWith("/auth")
                  ? "bg-blue-50 text-blue-600"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <LogIn className="h-4 w-4" />
              登录
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
