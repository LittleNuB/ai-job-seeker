"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const steps = [
  { href: "/pathfinder", label: "入口" },
  { href: "/pathfinder/background", label: "背景" },
  { href: "/pathfinder/recommendation", label: "星图" },
  { href: "/pathfinder/trial", label: "试航" },
  { href: "/pathfinder/result", label: "结果" },
];

export function PathfinderShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <Link href="/pathfinder" className="group">
            <div className="text-sm font-semibold text-teal-700">
              AI Job Copilot
            </div>
            <div className="text-xl font-semibold tracking-normal text-slate-950">
              寻径星图 P0
            </div>
          </Link>
          <nav
            aria-label="寻径星图流程"
            className="flex gap-2 overflow-x-auto pb-1 lg:pb-0"
          >
            {steps.map((step, index) => {
              const active = pathname === step.href;
              return (
                <Link
                  key={step.href}
                  href={step.href}
                  className={`flex min-w-fit items-center gap-2 rounded-md border px-3 py-2 text-sm transition ${
                    active
                      ? "border-teal-500 bg-teal-50 text-teal-800"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
                  }`}
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-current text-[11px] font-semibold text-white">
                    {index + 1}
                  </span>
                  {step.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  eyebrow,
}: {
  title: string;
  description: string;
  eyebrow?: string;
}) {
  return (
    <div className="mb-8 max-w-4xl">
      {eyebrow ? (
        <p className="mb-2 text-sm font-semibold text-teal-700">{eyebrow}</p>
      ) : null}
      <h1 className="text-3xl font-semibold tracking-normal text-slate-950 sm:text-4xl">
        {title}
      </h1>
      <p className="mt-4 text-base leading-7 text-slate-600">{description}</p>
    </div>
  );
}

export function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="mb-8 min-w-0">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
        {description ? (
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function Panel({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "teal" | "amber" | "rose" | "slate";
}) {
  const tones = {
    default: "border-slate-200 bg-white",
    teal: "border-teal-200 bg-teal-50",
    amber: "border-amber-200 bg-amber-50",
    rose: "border-rose-200 bg-rose-50",
    slate: "border-slate-200 bg-slate-100",
  };

  return (
    <div className={`min-w-0 rounded-lg border p-5 shadow-sm ${tones[tone]}`}>
      {children}
    </div>
  );
}

export function ButtonLink({
  href,
  children,
  variant = "primary",
  onClick,
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
  onClick?: () => void;
}) {
  const classes =
    variant === "primary"
      ? "border-teal-700 bg-teal-700 text-white hover:bg-teal-800"
      : "border-slate-300 bg-white text-slate-800 hover:bg-slate-100";

  return (
    <Link
      href={href}
      onClick={onClick}
      className={`inline-flex min-h-11 max-w-full items-center justify-center rounded-md border px-4 py-2 text-center text-sm font-semibold transition ${classes}`}
    >
      {children}
    </Link>
  );
}

export function ActionButton({
  children,
  onClick,
  variant = "primary",
  disabled,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  const classes = {
    primary: "border-teal-700 bg-teal-700 text-white hover:bg-teal-800",
    secondary: "border-slate-300 bg-white text-slate-800 hover:bg-slate-100",
    danger: "border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex min-h-11 max-w-full items-center justify-center rounded-md border px-4 py-2 text-center text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${classes[variant]}`}
    >
      {children}
    </button>
  );
}

export function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2 text-sm leading-6 text-slate-700">
      {items.map((item) => (
        <li key={item} className="flex gap-2">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-600" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function Notice({
  title,
  children,
  tone = "slate",
}: {
  title: string;
  children: ReactNode;
  tone?: "slate" | "teal" | "amber" | "rose";
}) {
  const tones = {
    slate: "border-slate-200 bg-slate-100 text-slate-800",
    teal: "border-teal-200 bg-teal-50 text-teal-900",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    rose: "border-rose-200 bg-rose-50 text-rose-900",
  };

  return (
    <div className={`min-w-0 rounded-lg border p-4 ${tones[tone]}`}>
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-2 text-sm leading-6">{children}</div>
    </div>
  );
}

export function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: "teal" | "amber" | "rose" | "slate";
}) {
  const tones = {
    teal: "border-teal-200 bg-teal-50 text-teal-800",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    rose: "border-rose-200 bg-rose-50 text-rose-800",
    slate: "border-slate-200 bg-slate-100 text-slate-700",
  };

  return (
    <span
      className={`inline-flex max-w-full rounded-md border px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}
    >
      {label}
    </span>
  );
}

export function DataTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: string[][];
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-100 text-left text-slate-700">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-4 py-3 font-semibold">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr key={row.join("|")}>
              {row.map((cell) => (
                <td key={cell} className="px-4 py-3 leading-6 text-slate-700">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
