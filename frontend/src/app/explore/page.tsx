"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, ChevronRight, DollarSign, Clock, ArrowRight } from "lucide-react";
import { positions } from "@/lib/api";
import ChatPanel from "@/components/chat/ChatPanel";

interface Position {
  id: string;
  name: string;
  name_en: string | null;
  summary: string;
  capability_requirements: any;
  salary_range: any;
  career_path: any;
  common_interview_topics: any;
  industry_trends: string | null;
  category_name?: string;
  category_id?: string;
}

interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export default function ExplorePage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [positionList, setPositionList] = useState<Position[]>([]);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    try {
      const cats = await positions.getCategories();
      setCategories(cats);
      if (cats.length > 0) {
        setActiveCategory(cats[0].id);
        loadPositions(cats[0].id);
      }
    } catch (err) {
      console.error("Failed to load categories:", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadPositions(categoryId: string) {
    setActiveCategory(categoryId);
    try {
      const list = await positions.getPositions({ category_id: categoryId });
      setPositionList(list);
      setSelectedPosition(null);
    } catch (err) {
      console.error("Failed to load positions:", err);
    }
  }

  async function handleSearch() {
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const results = await positions.semanticSearch(searchQuery);
      setPositionList(results);
      setActiveCategory("");
      setSelectedPosition(null);
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading && categories.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 text-center text-gray-400">
        加载中...
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="搜索岗位：大模型、NLP、推荐算法..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => loadPositions(cat.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              activeCategory === cat.id
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {cat.icon} {cat.name}
          </button>
        ))}
      </div>

      {/* Content: Position List + Detail */}
      <div className="flex gap-6">
        {/* Position List */}
        <div className={`${selectedPosition ? "w-1/3" : "w-full"} transition-all`}>
          <div className="grid gap-3">
            {positionList.map((pos) => (
              <button
                key={pos.id}
                onClick={async () => {
                  // If position lacks detail fields, fetch full data
                  if (!pos.capability_requirements && !pos.salary_range) {
                    try {
                      const full = await positions.getPosition(pos.id);
                      setSelectedPosition(full);
                    } catch {
                      setSelectedPosition(pos);
                    }
                  } else {
                    setSelectedPosition(pos);
                  }
                }}
                className={`text-left p-4 rounded-lg border transition-all ${
                  selectedPosition?.id === pos.id
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
                }`}
              >
                <div className="font-medium text-gray-900">{pos.name}</div>
                {pos.name_en && <div className="text-xs text-gray-500 mt-0.5">{pos.name_en}</div>}
                {pos.summary && (
                  <div className="text-sm text-gray-600 mt-2 line-clamp-2">{pos.summary}</div>
                )}
              </button>
            ))}
            {positionList.length === 0 && (
              <div className="text-center text-gray-400 py-8">暂无岗位数据</div>
            )}
          </div>
        </div>

        {/* Position Detail */}
        {selectedPosition && (
          <div className="w-2/3 bg-white rounded-lg border border-gray-200 p-6">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900">{selectedPosition.name}</h2>
              {selectedPosition.name_en && (
                <div className="text-sm text-gray-500 mt-1">{selectedPosition.name_en}</div>
              )}
            </div>

            {selectedPosition.summary && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-500 mb-2">岗位概述</h3>
                <p className="text-sm text-gray-700 leading-relaxed">{selectedPosition.summary}</p>
              </div>
            )}

            {/* Capability Requirements */}
            {selectedPosition.capability_requirements && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-500 mb-2">能力要求</h3>
                <div className="space-y-3">
                  {selectedPosition.capability_requirements.must_have && (
                    <div>
                      <div className="text-xs font-medium text-gray-400 mb-1">必须具备</div>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedPosition.capability_requirements.must_have.map((s: string, i: number) => (
                          <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedPosition.capability_requirements.nice_to_have && (
                    <div>
                      <div className="text-xs font-medium text-gray-400 mb-1">加分项</div>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedPosition.capability_requirements.nice_to_have.map((s: string, i: number) => (
                          <span key={i} className="px-2 py-0.5 bg-green-50 text-green-700 text-xs rounded">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedPosition.capability_requirements.tools && (
                    <div>
                      <div className="text-xs font-medium text-gray-400 mb-1">工具/技术栈</div>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedPosition.capability_requirements.tools.map((s: string, i: number) => (
                          <span key={i} className="px-2 py-0.5 bg-purple-50 text-purple-700 text-xs rounded">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Salary Range */}
            {selectedPosition.salary_range && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-500 mb-2 flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5" /> 薪资范围
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  {["junior", "mid", "senior"].map((level) => {
                    const s = selectedPosition.salary_range[level];
                    if (!s) return null;
                    return (
                      <div key={level} className="bg-gray-50 rounded-lg p-3 text-center">
                        <div className="text-xs text-gray-400 capitalize">{level === "junior" ? "初级" : level === "mid" ? "中级" : "高级"}</div>
                        <div className="text-sm font-medium text-gray-900 mt-1">{s.min}-{s.max}万</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Career Path */}
            {selectedPosition.career_path && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-500 mb-2 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> 职业路径
                </h3>
                <div className="flex items-center gap-2 text-sm">
                  {["junior", "mid", "senior", "leadership"].map((level, i, arr) => {
                    const path = selectedPosition.career_path[level];
                    if (!path) return null;
                    return (
                      <span key={level} className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">{path}</span>
                        {i < arr.length - 1 && <ChevronRight className="w-3 h-3 text-gray-300" />}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Interview Topics */}
            {selectedPosition.common_interview_topics && (
              <div>
                <h3 className="text-sm font-semibold text-gray-500 mb-2">常见面试主题</h3>
                <div className="space-y-1">
                  {selectedPosition.common_interview_topics.map((topic: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                      <span className="w-5 h-5 flex items-center justify-center bg-gray-100 rounded text-xs text-gray-500">{i + 1}</span>
                      {typeof topic === "string" ? topic : topic.topic || topic.name || JSON.stringify(topic)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Go to Match */}
            <button
              onClick={() => {
                localStorage.setItem("match_prefill", JSON.stringify({
                  positionId: selectedPosition.id,
                  positionName: selectedPosition.name,
                  source: "explore",
                }));
                router.push("/match?from=explore");
              }}
              className="mt-6 w-full py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
            >
              用此岗位匹配简历 <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Chat Panel */}
      <ChatPanel
        contextType="explore"
        contextData={selectedPosition ? { position: selectedPosition } : undefined}
      />
    </div>
  );
}
