"""Agent 工具定义与执行分发"""

import json
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.position import Position, Category

# GLM function calling 工具定义
TOOL_DEFINITIONS = [
    {
        "type": "function",
        "function": {
            "name": "search_positions",
            "description": "搜索AI相关岗位，支持关键词和语义搜索",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "搜索关键词，如'大模型'、'推荐算法'、'NLP'"}
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_position_details",
            "description": "获取某个岗位的详细信息，包括能力要求、薪资、职业路径等",
            "parameters": {
                "type": "object",
                "properties": {
                    "position_id": {"type": "string", "description": "岗位ID，如'llm_engineer'"}
                },
                "required": ["position_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "analyze_jd",
            "description": "深度解析JD文本，提取表面要求、隐藏需求和面试重点",
            "parameters": {
                "type": "object",
                "properties": {
                    "jd_text": {"type": "string", "description": "JD原文文本"}
                },
                "required": ["jd_text"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "match_resume",
            "description": "将简历与目标岗位进行匹配分析，给出评分和改进建议",
            "parameters": {
                "type": "object",
                "properties": {
                    "resume_text": {"type": "string", "description": "简历文本"},
                    "position_details": {"type": "string", "description": "目标岗位的详细信息JSON"}
                },
                "required": ["resume_text", "position_details"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "extract_file_content",
            "description": "从上传的文件中提取文本内容（PDF、DOCX、图片）",
            "parameters": {
                "type": "object",
                "properties": {
                    "file_content": {"type": "string", "description": "文件的base64编码内容"},
                    "filename": {"type": "string", "description": "文件名，用于判断文件类型"},
                    "purpose": {"type": "string", "enum": ["jd", "resume"], "description": "文件用途"}
                },
                "required": ["file_content", "filename", "purpose"]
            }
        }
    },
]


async def execute_tool(name: str, arguments: dict, db: AsyncSession) -> str:
    """执行工具调用，返回 JSON 字符串结果"""
    if name == "search_positions":
        return await _search_positions(arguments["query"], db)
    elif name == "get_position_details":
        return await _get_position_details(arguments["position_id"], db)
    elif name == "analyze_jd":
        from .jd_service import analyze_jd
        from .glm_client import get_glm_client
        result = await analyze_jd(get_glm_client(), arguments["jd_text"])
        return json.dumps(result, ensure_ascii=False)
    elif name == "match_resume":
        from .resume_service import match_resume
        from .glm_client import get_glm_client
        result = await match_resume(get_glm_client(), arguments["resume_text"], arguments["position_details"])
        return json.dumps(result, ensure_ascii=False)
    elif name == "extract_file_content":
        import base64
        from .file_parser import extract_text
        try:
            content = base64.b64decode(arguments["file_content"])
            text, file_type = await extract_text(content, arguments["filename"])
            return json.dumps({
                "text": text,
                "file_type": file_type,
                "purpose": arguments["purpose"],
            }, ensure_ascii=False)
        except Exception as e:
            return json.dumps({"error": f"文件提取失败：{str(e)}"}, ensure_ascii=False)
    else:
        return json.dumps({"error": f"未知工具: {name}"}, ensure_ascii=False)


async def _search_positions(query: str, db: AsyncSession) -> str:
    q = f"%{query}%"
    stmt = select(Position).where(
        or_(
            Position.name.ilike(q),
            Position.name_en.ilike(q),
            Position.summary.ilike(q),
        )
    ).limit(10)
    result = await db.execute(stmt)
    positions = result.scalars().all()
    if not positions:
        return json.dumps({"message": f"未找到与'{query}'相关的岗位"}, ensure_ascii=False)
    return json.dumps([
        {"id": p.id, "name": p.name, "name_en": p.name_en, "summary": p.summary}
        for p in positions
    ], ensure_ascii=False)


async def _get_position_details(position_id: str, db: AsyncSession) -> str:
    result = await db.execute(select(Position).where(Position.id == position_id))
    pos = result.scalar_one_or_none()
    if not pos:
        return json.dumps({"error": f"岗位 {position_id} 不存在"}, ensure_ascii=False)
    return json.dumps({
        "id": pos.id,
        "name": pos.name,
        "name_en": pos.name_en,
        "level": pos.level,
        "summary": pos.summary,
        "positioning": pos.positioning,
        "capability_requirements": pos.capability_requirements,
        "career_path": pos.career_path,
        "salary_range": pos.salary_range,
        "common_interview_topics": pos.common_interview_topics,
        "industry_trends": pos.industry_trends,
    }, ensure_ascii=False)
