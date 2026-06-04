import Link from "next/link";
import { ArrowRight, Brain, Compass, FileText, Radar, Target } from "lucide-react";

const features = [
  {
    title: "岗位适配雷达",
    desc: "上传简历后直接推荐主投、冲刺和暂不建议的 AI 岗位方向。",
    icon: Radar,
    href: "/radar",
    color: "bg-slate-900 text-white",
  },
  {
    title: "AI 岗位情报",
    desc: "基于 46 个 AI 岗位 taxonomy，理解岗位能力、路径和面试主题。",
    icon: Compass,
    href: "/explore",
    color: "bg-blue-50 text-blue-700",
  },
  {
    title: "JD 可信拆解",
    desc: "区分硬门槛、加分项、隐藏信号和高概率面试追问。",
    icon: FileText,
    href: "/jd",
    color: "bg-emerald-50 text-emerald-700",
  },
  {
    title: "可解释简历匹配",
    desc: "用证据链解释优势、缺口、投递判断和改写建议。",
    icon: Target,
    href: "/match",
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
              专注 AI 岗位的求职决策 Copilot
            </div>
            <h1 className="max-w-3xl text-4xl font-bold leading-tight text-slate-950 md:text-5xl">
              AI Job Copilot
            </h1>
            <p className="mt-3 text-2xl font-semibold leading-tight text-slate-900 md:text-3xl">
              看懂 AI 岗位，再决定怎么求职
            </p>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600">
              AI Job Copilot 不只是简历美化器。它会结合 AI 岗位库、真实 JD 信号和你的简历证据，判断适合投什么、差距在哪里，以及未来 7 天该做什么。
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/radar"
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-3 font-medium text-white transition-colors hover:bg-slate-800"
              >
                上传简历生成岗位雷达
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/explore"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-5 py-3 font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                浏览 AI 岗位情报
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
            "从“怎么改简历”前移到“该投什么岗位”。",
            "每个判断尽量给出证据、风险和下一步动作。",
            "聚焦 AI 岗位，不做泛泛的全行业求职工具。",
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

