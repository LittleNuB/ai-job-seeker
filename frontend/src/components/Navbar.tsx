"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Brain, FileText, Target, Compass, LogIn, LogOut } from "lucide-react";

const links = [
  { href: "/", label: "首页", icon: Brain },
  { href: "/explore", label: "岗位探索", icon: Compass },
  { href: "/jd", label: "JD解析", icon: FileText },
  { href: "/match", label: "简历匹配", icon: Target },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    setEmail(localStorage.getItem("auth_email"));
  }, [pathname]);

  function handleLogout() {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_email");
    setEmail(null);
    router.push("/auth");
  }

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg text-blue-600">
          <Brain className="w-6 h-6" />
          AI Job Copilot
        </Link>
        <div className="flex items-center gap-1">
          {links.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  active
                    ? "bg-blue-50 text-blue-600"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            );
          })}
          {email ? (
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
              title={email}
            >
              <LogOut className="w-4 h-4" />
              退出
            </button>
          ) : (
            <Link
              href="/auth"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                pathname.startsWith("/auth")
                  ? "bg-blue-50 text-blue-600"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <LogIn className="w-4 h-4" />
              登录
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
