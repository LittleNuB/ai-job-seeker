"use client";

import { useCallback, useEffect, useState } from "react";
import { FileText, Loader2, Target, Trash2, Download, Eye, MessageSquare } from "lucide-react";
import { chat, records, exportApi } from "@/lib/api";
import { AuthRequiredError, redirectToLogin, requireAuth } from "@/lib/auth";

interface RecordItem {
  id: string;
  type: string;
  input_text_preview: string | null;
  match_score: number | null;
  result_summary: string | null;
  created_at: string;
}

interface RecordDetail {
  id: string;
  type: string;
  input_text: string | null;
  result: any;
  match_score: number | null;
  created_at: string;
}

interface ChatConversationItem {
  id: string;
  context_type?: string | null;
  context_id?: string | null;
  title: string;
  message_count: number;
  latest_message_preview?: string | null;
  created_at: string;
  latest_message_at: string;
}

interface ChatMessageItem {
  role: string;
  content: string | null;
  tool_calls: any;
  created_at: string;
}

type HistoryView = "records" | "chats";

export default function HistoryPage() {
  const [viewMode, setViewMode] = useState<HistoryView>("records");
  const [items, setItems] = useState<RecordItem[]>([]);
  const [chatItems, setChatItems] = useState<ChatConversationItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string | undefined>();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<RecordDetail | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessageItem[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const pageSize = 10;

  useEffect(() => {
    if (!requireAuth()) return;
  }, []);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      if (viewMode === "records") {
        const res = await records.getList({ page, page_size: pageSize, type: filterType });
        setItems(res.items);
        setTotal(res.total);
      } else {
        const res = await chat.getConversations();
        setChatItems(res.items);
        setTotal(res.total);
      }
    } catch (err: unknown) {
      if (err instanceof AuthRequiredError) {
        redirectToLogin();
        return;
      }
    } finally {
      setLoading(false);
    }
  }, [page, filterType, viewMode]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  async function handleViewDetail(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
      setDetail(null);
      setChatMessages([]);
      return;
    }
    setExpandedId(id);
    setDetailLoading(true);
    try {
      if (viewMode === "records") {
        const res = await records.getDetail(id);
        setDetail(res);
        setChatMessages([]);
      } else {
        const res = await chat.getMessages(id);
        setChatMessages(res);
        setDetail(null);
      }
    } catch (err: unknown) {
      if (err instanceof AuthRequiredError) {
        redirectToLogin();
      }
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleDelete(id: string) {
    const message = viewMode === "records" ? "确定要删除这条记录吗？" : "确定要删除这段 AI 对话吗？";
    if (!confirm(message)) return;
    try {
      if (viewMode === "records") {
        await records.deleteRecord(id);
      } else {
        await chat.deleteConversation(id);
      }
      setExpandedId(null);
      setDetail(null);
      setChatMessages([]);
      fetchList();
    } catch (err: unknown) {
      if (err instanceof AuthRequiredError) {
        redirectToLogin();
      }
    }
  }

  async function handleExport(id: string) {
    try {
      await exportApi.downloadReport(id);
    } catch (err: unknown) {
      if (err instanceof AuthRequiredError) {
        redirectToLogin();
      }
    }
  }

  function handleFilterChange(type: string | undefined) {
    setFilterType(type);
    setPage(1);
    setExpandedId(null);
    setDetail(null);
    setChatMessages([]);
  }

  function handleViewModeChange(mode: HistoryView) {
    setViewMode(mode);
    setPage(1);
    setExpandedId(null);
    setDetail(null);
    setChatMessages([]);
  }

  const totalPages = viewMode === "records" ? Math.max(1, Math.ceil(total / pageSize)) : 1;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">历史记录</h1>

      <div className="mb-4 flex flex-wrap gap-2">
        {[
          { label: "分析记录", value: "records" as const },
          { label: "AI 对话", value: "chats" as const },
        ].map((tab) => (
          <button
            key={tab.label}
            type="button"
            onClick={() => handleViewModeChange(tab.value)}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              viewMode === tab.value
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {tab.value === "records" ? <FileText className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
            {tab.label}
          </button>
        ))}
      </div>

      {viewMode === "records" && (
        <div className="mb-4 flex gap-2">
          {[
            { label: "全部", value: undefined },
            { label: "JD 解析", value: "jd" },
            { label: "简历匹配", value: "match" },
          ].map((tab) => (
            <button
              key={tab.label}
              type="button"
              onClick={() => handleFilterChange(tab.value)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                filterType === tab.value
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : viewMode === "records" && items.length === 0 ? (
        <div className="py-20 text-center text-gray-400">
          <FileText className="mx-auto mb-3 h-10 w-10" />
          <p>尚无分析记录</p>
          <p className="mt-1 text-sm">完成 JD 解析或简历匹配后，记录会显示在这里</p>
        </div>
      ) : viewMode === "chats" && chatItems.length === 0 ? (
        <div className="py-20 text-center text-gray-400">
          <MessageSquare className="mx-auto mb-3 h-10 w-10" />
          <p>尚无 AI 对话</p>
          <p className="mt-1 text-sm">在岗位探索、JD 解析或简历匹配页追问后，对话会显示在这里</p>
        </div>
      ) : viewMode === "chats" ? (
        <div className="space-y-3">
          {chatItems.map((item) => (
            <div key={item.id} className="rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-sm">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-blue-500" />
                    <span className="max-w-full truncate text-sm font-medium text-gray-900">{item.title}</span>
                    {item.context_type && (
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                        {labelContext(item.context_type)}
                      </span>
                    )}
                    <span className="text-xs text-gray-400">{item.message_count} 条消息</span>
                    <span className="text-xs text-gray-400">
                      {new Date(item.latest_message_at).toLocaleString("zh-CN")}
                    </span>
                  </div>
                  {item.latest_message_preview && (
                    <p className="truncate text-sm text-gray-500">{item.latest_message_preview}</p>
                  )}
                </div>
                <div className="ml-4 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleViewDetail(item.id)}
                    className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    title="查看对话"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                    title="删除"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {expandedId === item.id && (
                <div className="mt-3 border-t border-gray-100 pt-3">
                  {detailLoading ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {chatMessages.map((message, index) => (
                        <div
                          key={`${message.created_at}-${index}`}
                          className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[82%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
                              message.role === "user" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {message.content || ""}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id}>
              <div className="rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {item.type === "jd" ? (
                        <FileText className="h-4 w-4 text-blue-500" />
                      ) : (
                        <Target className="h-4 w-4 text-green-500" />
                      )}
                      <span className="text-sm font-medium text-gray-900">
                        {item.type === "jd" ? "JD 解析" : "简历匹配"}
                      </span>
                      {item.match_score != null && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            item.match_score >= 80
                              ? "bg-green-100 text-green-700"
                              : item.match_score >= 60
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-red-100 text-red-700"
                          }`}
                        >
                          {item.match_score} 分
                        </span>
                      )}
                      <span className="text-xs text-gray-400">
                        {new Date(item.created_at).toLocaleString("zh-CN")}
                      </span>
                    </div>
                    {item.input_text_preview && (
                      <p className="text-sm text-gray-500 truncate">{item.input_text_preview}</p>
                    )}
                    {item.result_summary && (
                      <p className="mt-1 text-sm text-gray-400">{item.result_summary}</p>
                    )}
                  </div>
                  <div className="ml-4 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleViewDetail(item.id)}
                      className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                      title="查看详情"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExport(item.id)}
                      className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                      title="导出报告"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                      title="删除"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {expandedId === item.id && (
                  <div className="mt-3 border-t border-gray-100 pt-3">
                    {detailLoading ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                      </div>
                    ) : detail ? (
                      <div className="space-y-3">
                        {detail.input_text && (
                          <div>
                            <p className="text-xs font-medium text-gray-500 mb-1">
                              {detail.type === "jd" ? "JD 原文" : "简历原文"}
                            </p>
                            <pre className="whitespace-pre-wrap rounded bg-gray-50 p-3 text-xs text-gray-700 max-h-40 overflow-y-auto">
                              {detail.input_text}
                            </pre>
                          </div>
                        )}
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-2">分析结果</p>
                          <ResultView type={detail.type} result={detail.result} />
                        </div>
                      </div>
                    ) : (
                      <p className="py-2 text-center text-sm text-gray-400">加载失败</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                上一页
              </button>
              <span className="text-sm text-gray-500">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                下一页
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ResultView({ type, result }: { type: string; result: any }) {
  if (!result) return null;

  if (type === "jd") {
    const po = result.position_overview;
    const sr = result.surface_requirements;
    const hn = result.hidden_needs;
    const inf = result.interview_focus;

    return (
      <div className="space-y-3 text-sm">
        {po && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
            {po.inferred_role && <span className="text-gray-900 font-medium">{po.inferred_role}</span>}
            {po.seniority_level && <span className="rounded bg-blue-50 px-1.5 py-0.5 text-blue-700">{po.seniority_level}</span>}
            {po.company_type_hint && <span className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-600">{po.company_type_hint}</span>}
          </div>
        )}
        {sr && (
          <div className="space-y-1.5">
            {arr(sr.hard_skills).length > 0 && <TagRow label="硬技能" items={arr(sr.hard_skills)} color="bg-blue-50 text-blue-700" />}
            {arr(sr.soft_skills).length > 0 && <TagRow label="软技能" items={arr(sr.soft_skills)} color="bg-green-50 text-green-700" />}
            {arr(sr.experience).length > 0 && <TagRow label="经验" items={arr(sr.experience)} color="bg-amber-50 text-amber-700" />}
            {arr(sr.education).length > 0 && <TagRow label="学历" items={arr(sr.education)} color="bg-purple-50 text-purple-700" />}
          </div>
        )}
        {hn && (
          <div className="space-y-1.5">
            {hn.team_context && <TextLine label="团队背景" text={hn.team_context} />}
            {arr(hn.real_priorities).length > 0 && (
              <div>
                <span className="text-xs text-gray-400">核心优先级</span>
                <ol className="mt-0.5 list-decimal pl-5 space-y-0.5 text-xs text-gray-600">
                  {arr(hn.real_priorities).map((p: string, i: number) => <li key={i}>{p}</li>)}
                </ol>
              </div>
            )}
            {arr(hn.culture_signals).length > 0 && <TagRow label="文化信号" items={arr(hn.culture_signals)} color="bg-indigo-50 text-indigo-700" />}
            {hn.why_this_role && <TextLine label="招聘原因" text={hn.why_this_role} />}
          </div>
        )}
        {inf && (
          <div className="space-y-1.5">
            {arr(inf.likely_topics).length > 0 && (
              <div>
                <span className="text-xs text-gray-400">面试重点</span>
                <div className="mt-0.5 space-y-1">
                  {inf.likely_topics.map((t: any, i: number) => (
                    <div key={i} className="flex items-start gap-1.5 text-xs">
                      <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                      <span className="text-gray-700">{t.topic}</span>
                      <span className="text-gray-400">{t.depth}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {arr(inf.red_flags).length > 0 && <TagRow label="风险点" items={arr(inf.red_flags)} color="bg-red-50 text-red-700" />}
            {arr(inf.standout_angles).length > 0 && (
              <div>
                <span className="text-xs text-gray-400">加分项</span>
                <ul className="mt-0.5 space-y-0.5 text-xs text-gray-600">
                  {arr(inf.standout_angles).map((s: string, i: number) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green-400" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // match type
  const score = result.match_score;
  const r = result.result || result;

  return (
    <div className="space-y-2.5 text-sm">
      {score != null && (
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-gray-900">{score}</span>
          <span className="text-xs text-gray-400">/ 100</span>
        </div>
      )}
      {r?.score_breakdown && (
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
          {Object.entries(r.score_breakdown).map(([k, v]) => (
            <span key={k} className="text-gray-500">{labelSB(k)} <span className="text-gray-700 font-medium">{v as number}</span></span>
          ))}
        </div>
      )}
      {arr(r?.core_advantages).length > 0 && (
        <div>
          <span className="text-xs text-gray-400">核心优势</span>
          <ul className="mt-0.5 space-y-1">
            {r.core_advantages.map((a: any, i: number) => (
              <li key={i} className="text-xs text-gray-700 flex items-start gap-1">
                <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green-400" />
                <span><span className="font-medium">{a.advantage}</span>{a.evidence ? ` — ${a.evidence}` : ''}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {arr(r?.capability_gaps).length > 0 && (
        <div>
          <span className="text-xs text-gray-400">能力差距</span>
          <ul className="mt-0.5 space-y-1">
            {r.capability_gaps.map((g: any, i: number) => (
              <li key={i} className="text-xs text-gray-700 flex items-start gap-1">
                <span className={`mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full ${g.severity === '高' ? 'bg-red-400' : g.severity === '中' ? 'bg-yellow-400' : 'bg-green-400'}`} />
                <span><span className="font-medium">{g.gap}</span>{g.mitigation ? ` — ${g.mitigation}` : ''}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {r?.improvement_plan && (
        <div className="flex gap-3 text-xs">
          {Object.entries(r.improvement_plan).map(([k, v]) => (
            <div key={k} className="flex-1 rounded bg-gray-50 p-2">
              <div className="font-medium text-gray-500 mb-1">{labelIMP(k)}</div>
              {(v as string[]).map((item: string, i: number) => (
                <div key={i} className="text-gray-600">· {item}</div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function labelContext(value: string): string {
  const map: Record<string, string> = {
    explore: "岗位探索",
    jd: "JD 解析",
    match: "简历匹配",
    e2e: "测试对话",
  };
  return map[value] || value;
}

function arr(v: any): any[] {
  if (Array.isArray(v)) return v;
  if (typeof v === 'string' && v.length > 0) return [v];
  return [];
}

function TextLine({ label, text }: { label: string; text: string }) {
  return (
    <div className="text-xs">
      <span className="text-gray-400">{label}：</span>
      <span className="text-gray-700">{text}</span>
    </div>
  );
}

function TagRow({ label, items, color }: { label: string; items: string[]; color: string }) {
  return (
    <div className="flex items-start gap-1.5 text-xs">
      <span className="text-gray-400 shrink-0">{label}</span>
      <div className="flex flex-wrap gap-1">
        {items.map((item, i) => (
          <span key={i} className={`rounded px-1.5 py-0.5 ${color}`}>{item}</span>
        ))}
      </div>
    </div>
  );
}

function labelSB(k: string) {
  const map: Record<string, string> = { hard_skills_match: '硬技能', experience_match: '经验', culture_fit: '文化', growth_potential: '潜力' };
  return map[k] || k;
}

function labelIMP(k: string) {
  const map: Record<string, string> = { immediate: '1-2周', short_term: '1-3月', medium_term: '3-6月' };
  return map[k] || k;
}
