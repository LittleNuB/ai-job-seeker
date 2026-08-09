import Link from "next/link";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

interface Section {
  title: string;
  body?: string;
  items?: string[];
}

interface LegalPageProps {
  title: string;
  updatedAt: string;
  intro: string;
  sections: Section[];
}

export default function LegalPage({ title, updatedAt, intro, sections }: LegalPageProps) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 rounded-lg border border-blue-100 bg-blue-50 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
          <div>
            <p className="text-sm font-semibold text-blue-950">法律与数据说明</p>
            <p className="mt-1 text-sm leading-relaxed text-blue-800">
              以下内容说明当前产品实现中的使用和数据处理边界。面向公众运营时，部署方应结合实际模型供应商、存储位置和适用法律完成专业复核。
            </p>
          </div>
        </div>
      </div>

      <header className="mb-8">
        <p className="mb-2 text-sm font-medium text-blue-600">AI Job Copilot</p>
        <h1 className="text-3xl font-bold text-gray-950">{title}</h1>
        <p className="mt-2 text-sm text-gray-500">最近更新：{updatedAt}</p>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-gray-600">{intro}</p>
      </header>

      <div className="space-y-4">
        {sections.map((section) => (
          <section key={section.title} className="rounded-lg border border-gray-200 bg-white p-5">
            <div className="mb-3 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-blue-600" />
              <h2 className="text-base font-semibold text-gray-950">{section.title}</h2>
            </div>
            {section.body && <p className="text-sm leading-7 text-gray-600">{section.body}</p>}
            {section.items && (
              <ul className="space-y-2 text-sm leading-7 text-gray-600">
                {section.items.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-300" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/auth" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          返回登录/注册
        </Link>
        <Link href="/" className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          返回首页
        </Link>
      </div>
    </div>
  );
}
