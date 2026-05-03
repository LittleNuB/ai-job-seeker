"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Clock, DollarSign, Search } from "lucide-react";
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
    if (!position.capability_requirements && !position.salary_range) {
      try {
        const full = await positions.getPosition(position.id);
        setSelectedPosition(full);
        return;
      } catch {
        setSelectedPosition(position);
        return;
      }
    }
    setSelectedPosition(position);
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
              <div>
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
