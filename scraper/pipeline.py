"""数据清洗、去重、聚类流水线"""

import json
import logging
import os
import re
from collections import defaultdict

from scraper.config import (
    RAW_DIR, CLEANED_DIR, TARGET_POSITIONS, CLUSTER_KEYWORDS,
    POSITION_CATEGORY_MAP, CATEGORIES,
)

logger = logging.getLogger(__name__)


class DataPipeline:
    """原始 JD → 清洗去重 → 按岗位聚类"""

    def run(self) -> dict[str, list[dict]]:
        """执行完整流水线，返回 {position_id: [jd_dicts]}"""
        raw_jds = self._load_all_raw()
        logger.info(f"加载原始JD: {len(raw_jds)} 条")

        cleaned = self.clean(raw_jds)
        logger.info(f"清洗后: {len(cleaned)} 条")

        clusters = self.cluster(cleaned)
        logger.info(f"聚类结果: {len(clusters)} 个岗位，覆盖 JD 数: {sum(len(v) for v in clusters.values())}")

        self._save_cleaned(cleaned)
        return clusters

    # ──── 加载 ────

    def _load_all_raw(self) -> list[dict]:
        """加载 raw/ 目录下所有 JSON 文件"""
        all_jds = []
        if not os.path.exists(RAW_DIR):
            logger.warning(f"原始数据目录不存在: {RAW_DIR}")
            return all_jds

        for filename in os.listdir(RAW_DIR):
            if not filename.endswith(".json"):
                continue
            filepath = os.path.join(RAW_DIR, filename)
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    jds = json.load(f)
                    if isinstance(jds, list):
                        all_jds.extend(jds)
            except Exception as e:
                logger.warning(f"加载失败: {filepath} — {e}")

        return all_jds

    # ──── 清洗 ────

    def clean(self, jds: list[dict]) -> list[dict]:
        """清洗和去重"""
        # 1. 过滤空/极短 JD
        jds = [j for j in jds if len(j.get("jd_text", "")) >= 50]

        # 2. 清洗 JD 文本
        for jd in jds:
            jd["jd_text"] = self._clean_text(jd["jd_text"])

        # 3. 过滤清洗后过短的
        jds = [j for j in jds if len(j.get("jd_text", "")) >= 50]

        # 4. 去重（同一公司同一标题）
        seen = set()
        unique = []
        for jd in jds:
            key = f"{jd.get('title', '')}@{jd.get('company', '')}"
            if key not in seen:
                seen.add(key)
                unique.append(jd)

        # 5. 解析薪资格式
        for jd in unique:
            jd["salary_parsed"] = self._parse_salary(jd.get("salary", ""))

        # 6. 推断经验级别
        for jd in unique:
            jd["level"] = self._infer_level(jd)

        return unique

    def _clean_text(self, text: str) -> str:
        """清洗 JD 文本"""
        # 去除 HTML 标签
        text = re.sub(r"<[^>]+>", " ", text)
        # 去除多余空白
        text = re.sub(r"\s+", " ", text)
        # 去除首尾空白
        text = text.strip()
        # 去除常见无意义前缀
        text = re.sub(r"^(岗位职责|岗位要求|任职要求|工作职责|Job Description)[:：]?\s*", "", text)
        return text

    def _parse_salary(self, salary_str: str) -> dict | None:
        """解析薪资格式为标准万/年"""
        if not salary_str or salary_str in ("面议", "薪资面议", "negotiable"):
            return None

        # 匹配 "30-60K" / "30-60K·14薪" / "30K-60K"
        m = re.search(r"(\d+)\s*[-~到至]\s*(\d+)\s*[kK]", salary_str)
        if m:
            low_k = int(m.group(1))
            high_k = int(m.group(2))
            # 提取月数
            months_m = re.search(r"[·x×]\s*(\d+)\s*薪", salary_str)
            months = int(months_m.group(1)) if months_m else 12
            low_wan = round(low_k * months / 12, 1)
            high_wan = round(high_k * months / 12, 1)
            return {"min": low_wan, "max": high_wan, "unit": "万/年", "months": months}

        # 匹配 "30-60万" / "30万-60万"
        m = re.search(r"(\d+)\s*[-~到至]\s*(\d+)\s*万", salary_str)
        if m:
            return {"min": int(m.group(1)), "max": int(m.group(2)), "unit": "万/年", "months": 12}

        # 匹配 "300-500元/天"（实习，排除）
        m = re.search(r"(\d+)\s*[-~]\s*(\d+)\s*元/天", salary_str)
        if m:
            return None  # 实习薪资，不统计

        return None

    def _infer_level(self, jd: dict) -> str:
        """从 JD 文本和经验要求推断职级"""
        exp = str(jd.get("experience", ""))
        title = str(jd.get("title", ""))
        text = str(jd.get("jd_text", ""))

        # 从经验字段推断
        exp_map = {
            "应届": "junior", "1年": "junior", "1-3年": "junior",
            "2年": "junior", "3年": "mid",
            "3-5年": "mid", "4年": "mid",
            "5年": "senior", "5-8年": "senior", "5-10年": "senior",
            "8年": "leadership", "10年": "leadership",
        }
        for key, level in exp_map.items():
            if key in exp:
                return level

        # 从标题推断
        if "专家" in title or "架构师" in title:
            return "senior"
        if "高级" in title or "资深" in title:
            return "mid"
        if "初级" in title or "助理" in title or "实习" in title:
            return "junior"
        if "总监" in title or "负责人" in title or "VP" in title.upper():
            return "leadership"

        # 从 JD 文本推断
        if "5年以上" in text or "8年以上" in text:
            return "senior"
        if "3年以上" in text:
            return "mid"
        if "1年以上" in text or "应届" in text:
            return "junior"

        return "mid"  # 默认中级

    # ──── 聚类 ────

    def cluster(self, jds: list[dict]) -> dict[str, list[dict]]:
        """将 JD 按岗位类型聚类"""
        clusters = defaultdict(list)

        for jd in jds:
            position_id = self._classify_jd(jd)
            if position_id:
                clusters[position_id].append(jd)

        # 过滤 JD 太少的聚类
        valid_clusters = {}
        for pid, jd_list in clusters.items():
            if len(jd_list) >= 2:
                valid_clusters[pid] = jd_list
            else:
                # JD 太少也保留，后续 LLM 可以基于行业知识补充
                valid_clusters[pid] = jd_list
                logger.debug(f"岗位 {TARGET_POSITIONS.get(pid, pid)} 仅 {len(jd_list)} 条JD")

        return valid_clusters

    def _classify_jd(self, jd: dict) -> str | None:
        """将单条 JD 分类到目标岗位"""
        title = str(jd.get("title", "")).lower()
        jd_text = str(jd.get("jd_text", "")).lower()
        combined = f"{title} {jd_text[:200]}"

        best_match = None
        best_score = 0

        for position_id, keywords in CLUSTER_KEYWORDS.items():
            score = 0
            for kw in keywords:
                kw_lower = kw.lower()
                # 标题匹配权重更高
                if kw_lower in title:
                    score += 3
                elif kw_lower in combined:
                    score += 1

            if score > best_score:
                best_score = score
                best_match = position_id

        # 最低匹配阈值
        if best_score < 2:
            return None

        return best_match

    # ──── 保存 ────

    def _save_cleaned(self, jds: list[dict]):
        """保存清洗后的数据"""
        os.makedirs(CLEANED_DIR, exist_ok=True)
        filepath = os.path.join(CLEANED_DIR, "cleaned_jds.json")
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(jds, f, ensure_ascii=False, indent=2)
        logger.info(f"清洗数据已保存: {filepath}")

    # ──── 统计 ────

    def print_stats(self, clusters: dict[str, list[dict]]):
        """打印聚类统计信息"""
        print("\n" + "=" * 60)
        print("岗位聚类统计")
        print("=" * 60)

        # 按分类统计
        cat_stats = defaultdict(lambda: {"count": 0, "jds": 0})
        for pid, jd_list in clusters.items():
            cat_id = POSITION_CATEGORY_MAP.get(pid, "unknown")
            cat_stats[cat_id]["count"] += 1
            cat_stats[cat_id]["jds"] += len(jd_list)

        for cat in CATEGORIES:
            stats = cat_stats.get(cat["id"], {"count": 0, "jds": 0})
            print(f"\n[{cat['id']}] {cat['name']}: {stats['count']} 个岗位, {stats['jds']} 条JD")

        # 详细岗位列表
        print(f"\n{'岗位ID':<35} {'岗位名':<20} {'JD数':>6}")
        print("-" * 65)
        for pid, jd_list in sorted(clusters.items(), key=lambda x: -len(x[1])):
            name = TARGET_POSITIONS.get(pid, pid)
            print(f"{pid:<35} {name:<20} {len(jd_list):>6}")

        total_positions = len(clusters)
        total_jds = sum(len(v) for v in clusters.values())
        print(f"\n合计: {total_positions} 个岗位, {total_jds} 条JD")
