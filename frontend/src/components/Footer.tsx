import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-[#17211b]/15 bg-[#fffdf8]">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-5 text-xs text-[#657168] sm:flex-row sm:items-center sm:justify-between">
        <div>AI Job Copilot。AI 输出仅供求职准备参考。</div>
        <div className="flex flex-wrap items-center gap-4">
          <Link href="/privacy" className="hover:text-[#17211b]">
            隐私政策
          </Link>
          <Link href="/terms" className="hover:text-[#17211b]">
            用户协议
          </Link>
        </div>
      </div>
    </footer>
  );
}
