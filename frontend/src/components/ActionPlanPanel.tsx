"use client";

import { useState } from "react";
import { CalendarDays, CheckCircle2, Copy, Download, Loader2 } from "lucide-react";
import { actionPlan, exportApi } from "@/lib/api";
import { AuthRequiredError, redirectToLogin, requireAuth } from "@/lib/auth";

interface ActionPlanPanelProps {
  sourceType: "position_radar" | "jd" | "match";
  sourceRecordId: string;
}

export default function ActionPlanPanel({ sourceType, sourceRecordId }: ActionPlanPanelProps) {
  const [plan, setPlan] = useState<any>(null);
  const [planRecordId, setPlanRecordId] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function createPlan() {
    if (!sourceRecordId) return;
    if (!requireAuth()) {
      setError("请先登录后再生成行动计划");
      return;
    }

    setLoading(true);
    setError("");
    setNotice("");
    try {
      const response = await actionPlan.create({
        source_type: sourceType,
        source_record_id: sourceRecordId,
      });
      setPlan(response.result);
      setPlanRecordId(response.record_id);
    } catch (err) {
      if (err instanceof AuthRequiredError) {
        setError(err.message);
        redirectToLogin();
        return;
      }
      setError(err instanceof Error ? err.message : "行动计划生成失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  async function copyMarkdown() {
    if (!plan?.markdown) return;
    await navigator.clipboard.writeText(plan.markdown);
    setNotice("已复制 Markdown 行动计划");
  }

  async function exportPlan() {
    if (!planRecordId) return;
    await exportApi.downloadReport(planRecordId);
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <CalendarDays className="h-4 w-4 text-blue-600" />
            7 天求职行动计划
          </div>
          <p className="mt-1 text-sm text-slate-500">把当前分析结果转成一周内可完成的简历、JD 和面试任务。</p>
        </div>
        {!plan && (
          <button
            type="button"
            onClick={createPlan}
            disabled={loading || !sourceRecordId}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarDays className="h-4 w-4" />}
            生成计划
          </button>
        )}
      </div>

      {error && <div className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
      {notice && <div className="mt-3 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{notice}</div>}

      {plan && (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-slate-700">{plan.summary}</p>
          <div className="grid gap-2 md:grid-cols-2">
            {plan.tasks?.map((task: any) => (
              <div key={`${task.day}-${task.title}`} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  {task.day}｜{task.title}
                </div>
                <p className="mt-2 text-sm text-slate-600">{task.action}</p>
                <div className="mt-2 text-xs text-slate-500">
                  完成标准：{task.done_when} · {task.estimated_time}
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={copyMarkdown}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Copy className="h-4 w-4" />
              复制 Markdown
            </button>
            <button
              type="button"
              onClick={exportPlan}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Download className="h-4 w-4" />
              导出计划
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

