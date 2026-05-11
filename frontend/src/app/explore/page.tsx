"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, BriefcaseBusiness, Clock, DollarSign, ExternalLink, Loader2, Search } from "lucide-react";
import { positions } from "@/lib/api";
import ChatPanel from "@/components/chat/ChatPanel";
import Timeline from "@/components/Timeline";

interface Position {
  id: string;
  name: string;
  name_en?: string | null;
  summary?: string;
  capability_requirements?: any;
  salary_range?: any;
  career_path?: any;
  common_interview_topics?: any;
  industry_trends?: string | null;
  category_name?: string;
  category_id?: string;
  score?: number;
}

interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
}

const careerLabels: Record<string, string> = {
  junior: "初级",
  mid: "中级",
  senior: "高级",
  leadership: "管理",
};

export default function ExplorePage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState("");
  const [positionList, setPositionList] = useState<Position[]>([]);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [jdQuery, setJdQuery] = useState("");
  const [jdCompany, setJdCompany] = useState("");
  const [realJds, setRealJds] = useState<any[]>([]);
  const [jdCompanies, setJdCompanies] = useState<string[]>([]);
  const [jdDatasetTotal, setJdDatasetTotal] = useState(0);
  const [jdTotal, setJdTotal] = useState(0);
  const [jdLoading, setJdLoading] = useState(false);
  const [expandedJdIndex, setExpandedJdIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadPositions = useCallback(async (categoryId: string) => {
    setActiveCategory(categoryId);
    setLoading(true);
    setError("");
    try {
      const list = await positions.getPositions({ category_id: categoryId });
      setPositionList(list);
      setSelectedPosition(null);
    } catch (err) {
      console.error("Failed to load positions:", err);
      setError(err instanceof Error ? err.message : "加载岗位数据失败");
      setPositionList([]);
      setSelectedPosition(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const cats = await positions.getCategories();
      setCategories(cats);
      if (cats.length > 0) {
        await loadPositions(cats[0].id);
      } else {
        setPositionList([]);
        setSelectedPosition(null);
      }
    } catch (err) {
      console.error("Failed to load categories:", err);
      setError(err instanceof Error ? err.message : "加载岗位分类失败");
      setPositionList([]);
    } finally {
      setLoading(false);
    }
  }, [loadPositions]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  async function handleSearch() {
    const query = searchQuery.trim();
    if (!query) return;

    setLoading(true);
    setError("");
    try {
      const results = await positions.semanticSearch(query);
      setPositionList(results);
      setActiveCategory("");
      setSelectedPosition(null);
    } catch (err) {
      console.error("Search failed:", err);
      setError(err instanceof Error ? err.message : "搜索失败，请稍后重试");
      setPositionList([]);
      setSelectedPosition(null);
    } finally {
      setLoading(false);
    }
  }

  async function selectPosition(position: Position) {
    setRealJds([]);
    setExpandedJdIndex(null);
    if (!position.capability_requirements && !position.salary_range) {
      try {
        const full = await positions.getPosition(position.id);
        setSelectedPosition(full);
        loadRealJds(full.id);
        return;
      } catch {
        setSelectedPosition(position);
        loadRealJds(position.id);
        return;
      }
    }
    setSelectedPosition(position);
    loadRealJds(position.id);
  }

  async function loadRealJds(positionId = selectedPosition?.id, options?: { query?: string; company?: string }) {
    setJdLoading(true);
    setExpandedJdIndex(null);
    try {
      const response = await positions.getRealJds({
        position_id: positionId,
        query: options?.query ?? jdQuery,
        company: options?.company ?? jdCompany,
        limit: 8,
      });
      setRealJds(response.items);
      setJdCompanies(response.companies);
      setJdDatasetTotal(response.dataset_total);
      setJdTotal(response.total);
    } catch (err) {
      console.error("Failed to load real JDs:", err);
      setRealJds([]);
    } finally {
      setJdLoading(false);
    }
  }

  function handleJdSearch() {
    loadRealJds();
  }

  function handleCompanyChange(company: string) {
    setJdCompany(company);
    loadRealJds(selectedPosition?.id, { company });
  }

  function goToMatch() {
    if (!selectedPosition) return;
    localStorage.setItem(
      "match_prefill",
      JSON.stringify({
        positionId: selectedPosition.id,
        positionName: selectedPosition.name,
        source: "explore",
      }),
    );
    router.push("/match?from=explore");
  }

  if (loading && categories.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 text-center text-gray-400">
        加载中...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6">
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="搜索岗位：大模型、NLP、推荐算法..."
            className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => loadPositions(category.id)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              activeCategory === category.id
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {category.icon} {category.name}
          </button>
        ))}
      </div>

      <div className="flex gap-6">
        <div className={`${selectedPosition ? "w-1/3" : "w-full"} transition-all`}>
          <div className="grid gap-3">
            {loading && (
              <div className="py-8 text-center text-gray-400">加载岗位数据...</div>
            )}

            {!loading &&
              positionList.map((position) => (
                <button
                  key={position.id}
                  type="button"
                  onClick={() => selectPosition(position)}
                  className={`rounded-lg border p-4 text-left transition-all ${
                    selectedPosition?.id === position.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
                  }`}
                >
                  <div className="font-medium text-gray-900">{position.name}</div>
                  {position.name_en && (
                    <div className="mt-0.5 text-xs text-gray-500">{position.name_en}</div>
                  )}
                  {position.summary && (
                    <div className="mt-2 line-clamp-2 text-sm text-gray-600">{position.summary}</div>
                  )}
                </button>
              ))}

            {!loading && positionList.length === 0 && (
              <div className="py-8 text-center text-gray-400">暂无岗位数据</div>
            )}
          </div>
        </div>

        {selectedPosition && (
          <div className="w-2/3 rounded-lg border border-gray-200 bg-white p-6">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900">{selectedPosition.name}</h2>
              {selectedPosition.name_en && (
                <div className="mt-1 text-sm text-gray-500">{selectedPosition.name_en}</div>
              )}
            </div>

            {selectedPosition.summary && (
              <div className="mb-6">
                <h3 className="mb-2 text-sm font-semibold text-gray-500">岗位概述</h3>
                <p className="text-sm leading-relaxed text-gray-700">{selectedPosition.summary}</p>
              </div>
            )}

            {selectedPosition.capability_requirements && (
              <div className="mb-6">
                <h3 className="mb-2 text-sm font-semibold text-gray-500">能力要求</h3>
                <div className="space-y-3">
                  {selectedPosition.capability_requirements.must_have && (
                    <RequirementTags
                      label="必须具备"
                      colorClass="bg-blue-50 text-blue-700"
                      items={selectedPosition.capability_requirements.must_have}
                    />
                  )}
                  {selectedPosition.capability_requirements.nice_to_have && (
                    <RequirementTags
                      label="加分项"
                      colorClass="bg-green-50 text-green-700"
                      items={selectedPosition.capability_requirements.nice_to_have}
                    />
                  )}
                  {selectedPosition.capability_requirements.tools && (
                    <RequirementTags
                      label="工具/技术栈"
                      colorClass="bg-purple-50 text-purple-700"
                      items={selectedPosition.capability_requirements.tools}
                    />
                  )}
                </div>
              </div>
            )}

            {selectedPosition.salary_range && (
              <div className="mb-6">
                <h3 className="mb-2 flex items-center gap-1 text-sm font-semibold text-gray-500">
                  <DollarSign className="h-3.5 w-3.5" /> 薪资范围
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  {["junior", "mid", "senior"].map((level) => {
                    const salary = selectedPosition.salary_range[level];
                    if (!salary) return null;
                    return (
                      <div key={level} className="rounded-lg bg-gray-50 p-3 text-center">
                        <div className="text-xs text-gray-400">{careerLabels[level]}</div>
                        <div className="mt-1 text-sm font-medium text-gray-900">
                          {salary.min}-{salary.max}万
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {selectedPosition.career_path && (
              <div className="mb-6">
                <h3 className="mb-2 flex items-center gap-1 text-sm font-semibold text-gray-500">
                  <Clock className="h-3.5 w-3.5" /> 职业路径
                </h3>
                <Timeline
                  items={["junior", "mid", "senior", "leadership"]
                    .filter((level) => selectedPosition.career_path[level])
                    .map((level) => ({
                      label: careerLabels[level],
                      title: selectedPosition.career_path[level],
                    }))}
                />
              </div>
            )}

            {selectedPosition.common_interview_topics && (
              <div className="mb-6">
                <h3 className="mb-2 text-sm font-semibold text-gray-500">常见面试主题</h3>
                <div className="space-y-1">
                  {selectedPosition.common_interview_topics.map((topic: any, index: number) => (
                    <div key={index} className="flex items-center gap-2 text-sm text-gray-700">
                      <span className="flex h-5 w-5 items-center justify-center rounded bg-gray-100 text-xs text-gray-500">
                        {index + 1}
                      </span>
                      {typeof topic === "string" ? topic : topic.topic || topic.name || JSON.stringify(topic)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <RealJdPanel
              query={jdQuery}
              company={jdCompany}
              companies={jdCompanies}
              datasetTotal={jdDatasetTotal}
              total={jdTotal}
              items={realJds}
              loading={jdLoading}
              expandedIndex={expandedJdIndex}
              onQueryChange={setJdQuery}
              onCompanyChange={handleCompanyChange}
              onSearch={handleJdSearch}
              onRefresh={() => loadRealJds()}
              onToggleExpand={(index) => setExpandedJdIndex(expandedJdIndex === index ? null : index)}
            />

            <button
              type="button"
              onClick={goToMatch}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 py-2.5 font-medium text-white transition-colors hover:bg-green-700"
            >
              用此岗位匹配简历 <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <ChatPanel
        contextType="explore"
        contextData={selectedPosition ? { position: selectedPosition } : undefined}
      />
    </div>
  );
}

function RealJdPanel({
  query,
  company,
  companies,
  datasetTotal,
  total,
  items,
  loading,
  expandedIndex,
  onQueryChange,
  onCompanyChange,
  onSearch,
  onRefresh,
  onToggleExpand,
}: {
  query: string;
  company: string;
  companies: string[];
  datasetTotal: number;
  total: number;
  items: any[];
  loading: boolean;
  expandedIndex: number | null;
  onQueryChange: (value: string) => void;
  onCompanyChange: (value: string) => void;
  onSearch: () => void;
  onRefresh: () => void;
  onToggleExpand: (index: number) => void;
}) {
  return (
    <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <BriefcaseBusiness className="h-4 w-4 text-blue-600" />
            真实 JD 样本
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            来自清洗后的招聘 JD 数据库，当前数据集 {datasetTotal || "-"} 条；本岗位匹配 {total} 条。
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
          刷新样本
        </button>
      </div>

      <div className="mb-3 grid gap-2 md:grid-cols-[1fr_160px_auto]">
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && onSearch()}
          placeholder="在真实 JD 中搜索关键词，如 RAG、Agent、CUDA"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={company}
          onChange={(event) => onCompanyChange(event.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">全部公司</option>
          {companies.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={onSearch}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          搜索
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8 text-sm text-slate-400">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          正在读取真实 JD...
        </div>
      ) : items.length > 0 ? (
        <div className="space-y-3">
          {items.map((jd, index) => (
            <div key={`${jd.company}-${jd.title}-${index}`} className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="font-medium text-slate-900">{jd.title}</div>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
                    {jd.company && <span>{jd.company}</span>}
                    {jd.city && <span>{jd.city}</span>}
                    {jd.level && <span>{jd.level}</span>}
                    {jd.scraped_at && <span>抓取于 {jd.scraped_at}</span>}
                  </div>
                </div>
                {jd.url && (
                  <a
                    href={jd.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                  >
                    来源
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                {expandedIndex === index ? jd.jd_text : jd.excerpt}
              </p>
              {jd.jd_text && jd.excerpt && jd.jd_text.length > jd.excerpt.length && (
                <button
                  type="button"
                  onClick={() => onToggleExpand(index)}
                  className="mt-2 text-xs font-medium text-blue-600 hover:text-blue-700"
                >
                  {expandedIndex === index ? "收起原文" : "展开查看原文"}
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white py-8 text-center text-sm text-slate-400">
          暂未匹配到真实 JD，可换一个关键词或查看全部公司。
        </div>
      )}
    </div>
  );
}

function RequirementTags({
  label,
  items,
  colorClass,
}: {
  label: string;
  items: string[];
  colorClass: string;
}) {
  return (
    <div>
      <div className="mb-1 text-xs font-medium text-gray-400">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, index) => (
          <span key={index} className={`rounded px-2 py-0.5 text-xs ${colorClass}`}>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
