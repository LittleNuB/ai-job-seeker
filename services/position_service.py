import json
from pathlib import Path
import streamlit as st


class PositionService:
    """岗位数据服务"""

    def __init__(self):
        self.data_path = Path(__file__).parent.parent / "data" / "ai_positions.json"

    @st.cache_data(ttl=3600)
    def load_positions(_self) -> dict:
        """加载并缓存岗位数据"""
        try:
            with open(_self.data_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except FileNotFoundError:
            st.error("岗位数据文件未找到，请检查 data/ai_positions.json 是否存在")
            return {"categories": []}
        except json.JSONDecodeError:
            st.error("岗位数据文件格式错误，请检查 data/ai_positions.json 的JSON格式")
            return {"categories": []}

    def get_all_categories(self) -> list[dict]:
        """获取所有分类"""
        data = self.load_positions()
        return data["categories"]

    def get_positions_by_category(self, category_id: str) -> list[dict]:
        """按分类获取岗位列表"""
        for cat in self.get_all_categories():
            if cat["id"] == category_id:
                return cat["positions"]
        return []

    def get_position_by_id(self, position_id: str) -> dict | None:
        """通过ID查找岗位，附带分类信息"""
        for cat in self.get_all_categories():
            for pos in cat["positions"]:
                if pos["id"] == position_id:
                    return {**pos, "category_name": cat["name"], "category_id": cat["id"]}
        return None

    def search_positions(self, query: str) -> list[dict]:
        """关键词搜索岗位（匹配名称、摘要、技能）"""
        results = []
        query_lower = query.lower()
        for cat in self.get_all_categories():
            for pos in cat["positions"]:
                searchable = (
                    pos["name"] + pos.get("name_en", "") + pos["summary"]
                    + " ".join(pos["capability_requirements"].get("must_have", []))
                    + " ".join(pos["capability_requirements"].get("tools", []))
                ).lower()
                if query_lower in searchable:
                    results.append({**pos, "category_name": cat["name"]})
        return results

    def get_all_positions_flat(self) -> list[dict]:
        """获取所有岗位的扁平列表，附带分类信息"""
        results = []
        for cat in self.get_all_categories():
            for pos in cat["positions"]:
                results.append({**pos, "category_name": cat["name"], "category_id": cat["id"]})
        return results
