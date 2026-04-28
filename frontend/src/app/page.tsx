import Link from "next/link";
import { Compass, FileText, Target } from "lucide-react";

const features = [
  {
    title: "岗位探索",
    desc: "44个AI岗位全览，语义搜索精准定位目标",
    icon: Compass,
    href: "/explore",
    color: "blue",
  },
  {
    title: "JD深度解析",
    desc: "表面要求+隐藏需求+面试策略，三维度解读",
    icon: FileText,
    href: "/jd",
    color: "emerald",
  },
  {
    title: "简历匹配",
    desc: "四维评分+差距分析+提升计划，精准匹配",
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
    <div className="max-w-5xl mx-auto px-4 py-16">
      {/* Hero */}
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          AI Job Copilot
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          你的AI求职智能助手。探索44个AI方向岗位，深度解析JD隐藏需求，
          精准匹配简历与目标岗位，每个环节都有AI追问帮你理解。
        </p>
      </div>

      {/* Feature Cards - Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {features.map((f) => {
          const Icon = f.icon;
          return (
            <Link
              key={f.href}
              href={f.href}
              className="group block bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-gray-300 transition-all"
            >
              <div className={`inline-flex p-3 rounded-lg mb-4 ${iconBgMap[f.color]}`}>
                <Icon className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                {f.title}
              </h2>
              <p className="text-sm text-gray-600">{f.desc}</p>
            </Link>
          );
        })}
      </div>

      {/* Stats */}
      <div className="mt-12 grid grid-cols-3 gap-4 text-center">
        {[
          { label: "AI岗位", value: "44" },
          { label: "覆盖公司", value: "5+" },
          { label: "原始JD", value: "827" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-2xl font-bold text-blue-600">{s.value}</div>
            <div className="text-sm text-gray-500">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
