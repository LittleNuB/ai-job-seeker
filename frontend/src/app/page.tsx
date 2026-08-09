import Link from "next/link";
import { ArrowRight, Brain, Compass, FileText, History, Target } from "lucide-react";

const features = [
  {
    title: "AI 岗位资料库",
    desc: "查询 46 个结构化岗位样例，了解能力要求、面试主题和相关 JD。",
    icon: Compass,
    href: "/explore",
    color: "bg-slate-900 text-white",
  },
  {
    title: "JD 证据拆解",
    desc: "从目标 JD 中整理硬门槛、加分项、岗位信号和面试准备点。",
    icon: FileText,
    href: "/jd",
    color: "bg-blue-50 text-blue-700",
  },
  {
    title: "定向简历匹配",
    desc: "围绕一个明确岗位，对照简历证据、能力缺口和改写建议。",
    icon: Target,
    href: "/match",
    color: "bg-emerald-50 text-emerald-700",
  },
  {
    title: "追问与留档",
    desc: "围绕一次 JD 或匹配结果继续追问，并保存、导出或删除记录。",
    icon: History,
    href: "/history",
    color: "bg-amber-50 text-amber-700",
  },
];

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <section className="rounded-lg border border-slate-200 bg-white p-8 md:p-10">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
              <Brain className="h-4 w-4" />
              专注 AI 岗位的投递准备工作台
            </div>
            <h1 className="max-w-3xl text-4xl font-bold leading-tight text-slate-950 md:text-5xl">
              看懂目标 JD，再准备这次投递
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600">
              AI Job Copilot 面向已经有目标岗位或目标 JD 的求职者：整理岗位要求，把简历经历逐项对照，并把这次投递需要准备的材料集中保存下来。
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/jd"
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-3 font-medium text-white transition-colors hover:bg-slate-800"
              >
                粘贴目标 JD
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/explore"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-5 py-3 font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                查看岗位资料
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { value: "7", label: "AI 岗位方向" },
              { value: "46", label: "结构化岗位" },
              { value: "2537", label: "清洗 JD" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-lg bg-slate-50 p-4">
                <div className="text-3xl font-bold text-slate-950">{stat.value}</div>
                <div className="mt-1 text-xs text-slate-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <Link
              key={feature.href}
              href={feature.href}
              className="group rounded-lg border border-slate-200 bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm"
            >
              <div className={`mb-4 inline-flex rounded-lg p-3 ${feature.color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="text-base font-semibold text-slate-950">{feature.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{feature.desc}</p>
            </Link>
          );
        })}
      </section>

      <section className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-5">
        <div className="text-sm font-semibold text-slate-900">核心差异化</div>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {[
            "从一个明确岗位或 JD 出发，不替用户预测职业方向。",
            "把岗位要求与简历原文放在同一次分析中对照。",
            "保留分析、追问和导出记录，服务一轮真实投递准备。",
          ].map((item) => (
            <div key={item} className="rounded-lg bg-white p-3 text-sm text-slate-600">
              {item}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

