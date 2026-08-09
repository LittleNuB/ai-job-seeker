import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-5 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between">
        <div>AI Job Copilot。AI 输出仅供求职准备参考。</div>
        <div className="flex flex-wrap items-center gap-4">
          <Link href="/privacy" className="hover:text-gray-900">
            隐私政策
          </Link>
          <Link href="/terms" className="hover:text-gray-900">
            用户协议
          </Link>
        </div>
      </div>
    </footer>
  );
}
