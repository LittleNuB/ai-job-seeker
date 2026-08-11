"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Brain, BriefcaseBusiness, Compass, FileText, History, LogIn, LogOut, Target, UserCircle } from "lucide-react";
import { AUTH_CHANGED_EVENT, clearAuthSession, getAuthEmail, getLoginPath } from "@/lib/auth";

const links = [
  { href: "/", label: "首页", icon: Brain },
  { href: "/applications", label: "投递工作台", icon: BriefcaseBusiness },
  { href: "/explore", label: "岗位资料", icon: Compass },
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
    <nav className="sticky top-0 z-50 border-b border-studio-ink/15 bg-studio-paper/95 backdrop-blur">
      <div className="mx-auto max-w-7xl px-3 sm:px-4">
        <div className="flex h-14 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-base font-bold text-studio-ink sm:text-lg">
            <Brain className="h-5 w-5 sm:h-6 sm:w-6" />
            AI Job Copilot
          </Link>

          <div className="hidden items-center gap-1 lg:flex">
            {links.map(({ href, label, icon: Icon }) => {
              const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "bg-studio-sage text-[#2e472f]"
                      : "text-[#59675e] hover:bg-[#f0ece3] hover:text-studio-ink"
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
                className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-[#59675e] transition-colors hover:bg-[#f0ece3] hover:text-studio-ink"
                title={`当前账号：${email}`}
              >
                <span className="hidden max-w-[180px] truncate xl:inline">{compactEmail(email)}</span>
                <LogOut className="h-4 w-4" />
                退出
              </button>
            ) : (
              <Link
                href={getLoginPath(pathname)}
                className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  pathname.startsWith("/auth")
                    ? "bg-studio-sage text-[#2e472f]"
                    : "text-[#59675e] hover:bg-[#f0ece3] hover:text-studio-ink"
                }`}
              >
                <LogIn className="h-4 w-4" /> 登录
              </Link>
            )}
          </div>

          {email ? (
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-md px-2.5 py-2 text-sm font-medium text-[#59675e] transition-colors hover:bg-[#f0ece3] hover:text-studio-ink lg:hidden"
              title={`当前账号：${email}`}
            >
              <LogOut className="h-4 w-4" />
              退出
            </button>
          ) : (
            <Link
              href={getLoginPath(pathname)}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors lg:hidden ${
                pathname.startsWith("/auth")
                  ? "bg-studio-sage text-[#2e472f]"
                  : "text-[#59675e] hover:bg-[#f0ece3] hover:text-studio-ink"
              }`}
            >
              <LogIn className="h-4 w-4" /> 登录
            </Link>
          )}
        </div>

        <div className="flex items-center gap-1 overflow-x-auto border-t border-studio-ink/10 py-1 lg:hidden">
          {links.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-2 text-xs font-medium transition-colors ${
                  active
                    ? "bg-studio-sage text-[#2e472f]"
                    : "text-[#59675e] hover:bg-[#f0ece3] hover:text-studio-ink"
                }`}
              >
                <Icon className="h-3.5 w-3.5" /> {label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
