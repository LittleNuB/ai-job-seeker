import Link from "next/link";
import { Compass, FileText, Target } from "lucide-react";

const features = [
  {
    title: "岗位探索",
    desc: "44 个 AI 岗位全景梳理，支持语义搜索，快速定位目标方向。",
    icon: Compass,
    href: "/explore",
    color: "blue",
  },
  {
    title: "JD 深度解析",
    desc: "拆解表面要求、隐藏需求和面试重点，帮你读懂招聘方真正关心什么。",
    icon: FileText,
    href: "/jd",
    color: "emerald",
  },
  {
    title: "简历匹配",
    desc: "四维评分、差距分析和提升计划，判断简历与目标岗位的匹配度。",
    icon: Target,
    href: "/match",
    color: "violet",
  },
];

const iconBgMap: Record<string, string> = {
  blue: "bg-blue-100 text-blue-600",
  emerald: "bg-emerald-100 text-emerald-600",
  violet: "bg-violet-100 text-violet-600",
};

export default function Home() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <div className="mb-16 text-center">
        <h1 className="mb-4 text-4xl font-bold text-gray-900">AI Job Copilot</h1>
        <p className="mx-auto max-w-2xl text-lg text-gray-600">
          你的 AI 求职智能助手。探索 AI 行业岗位，深度解析 JD 隐藏需求，精准匹配简历与目标岗位。
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <Link
              key={feature.href}
              href={feature.href}
              className="group block rounded-xl border border-gray-200 bg-white p-6 transition-all hover:border-gray-300 hover:shadow-lg"
            >
              <div className={`mb-4 inline-flex rounded-lg p-3 ${iconBgMap[feature.color]}`}>
                <Icon className="h-6 w-6" />
              </div>
              <h2 className="mb-2 text-lg font-semibold text-gray-900 transition-colors group-hover:text-blue-600">
                {feature.title}
              </h2>
              <p className="text-sm text-gray-600">{feature.desc}</p>
            </Link>
          );
        })}
      </div>

      <div className="mt-12 grid grid-cols-3 gap-4 text-center">
        {[
          { label: "AI 岗位", value: "44" },
          { label: "岗位方向", value: "7" },
          { label: "核心流程", value: "3" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="text-2xl font-bold text-blue-600">{stat.value}</div>
            <div className="text-sm text-gray-500">{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
