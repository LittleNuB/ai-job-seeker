"""Agent Loop：上下文感知追问引擎

核心流程：
1. 用户提问 → 组装 messages（系统提示 + 页面上下文 + 对话历史）
2. 调用 GLM chat_with_tools
3. 有 tool_calls → 执行工具 → 追加结果 → 回到步骤2
4. 无 tool_calls → 返回最终回复（流式）
最多循环 5 轮
"""

import json
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession

from .glm_client import get_glm_client
from .tools import TOOL_DEFINITIONS, execute_tool

MAX_LOOPS = 5

_TOOL_LABELS = {
    "search_positions": "正在搜索岗位...",
    "get_position_details": "正在获取岗位详情...",
    "analyze_jd": "正在解析JD...",
    "match_resume": "正在匹配简历...",
    "extract_file_content": "正在提取文件内容...",
}

CHAT_SYSTEM_PROMPT = """你是 AI Job Copilot 的智能助手，专门帮助用户理解AI行业岗位信息、分析JD、评估简历匹配度。

你可以使用工具来搜索岗位、获取岗位详情、分析JD或匹配简历。回答时要：
1. 基于工具返回的客观数据，不要编造
2. 给出具体可操作的建议
3. 用简洁清晰的语言回答

{context}"""


def _build_context_message(context_type: str | None, context_data: dict | None) -> str:
    """根据页面类型构建上下文注入"""
    if not context_type or not context_data:
        return ""

    parts = ["\n当前页面上下文："]

    if context_type == "explore" and context_data.get("position"):
        pos = context_data["position"]
        parts.append(f"- 用户正在查看岗位：{pos.get('name', '')} ({pos.get('name_en', '')})")
        parts.append(f"- 岗位摘要：{pos.get('summary', '')[:200]}")

    elif context_type == "jd" and context_data.get("analysis"):
        analysis = context_data["analysis"]
        overview = analysis.get("position_overview", {})
        parts.append(f"- 用户刚完成JD解析：{overview.get('inferred_role', '未知岗位')}")
        parts.append(f"- 推断职级：{overview.get('seniority_level', '未知')}")

    elif context_type == "match" and context_data.get("result"):
        result = context_data["result"]
        parts.append(f"- 用户刚完成简历匹配，得分：{result.get('match_score', '未知')}/100")

    return "\n".join(parts)


async def run_agent_loop(
    user_message: str,
    history: list[dict],
    context_type: str | None = None,
    context_data: dict | None = None,
    db: AsyncSession | None = None,
) -> dict:
    """同步执行 Agent Loop，返回最终回复（用于非流式场景）"""
    glm = get_glm_client()
    system_prompt = CHAT_SYSTEM_PROMPT.format(context=_build_context_message(context_type, context_data))

    messages = [{"role": "system", "content": system_prompt}] + history + [{"role": "user", "content": user_message}]

    for _ in range(MAX_LOOPS):
        choice = await glm.chat_with_tools(messages, tools=TOOL_DEFINITIONS)
        msg = choice.message

        # No tool calls — return final response
        if not msg.tool_calls:
            return {"role": "assistant", "content": msg.content}

        # Has tool calls — execute them
        messages.append({"role": "assistant", "content": msg.content, "tool_calls": [
            {"id": tc.id, "type": "function", "function": {"name": tc.function.name, "arguments": tc.function.arguments}}
            for tc in msg.tool_calls
        ]})

        for tc in msg.tool_calls:
            args = json.loads(tc.function.arguments) if isinstance(tc.function.arguments, str) else tc.function.arguments
            result_str = await execute_tool(tc.function.name, args, db) if db else json.dumps({"error": "数据库未连接"})
            messages.append({"role": "tool", "tool_call_id": tc.id, "content": result_str})

    return {"role": "assistant", "content": "抱歉，处理过程过于复杂，请尝试更具体的问题。"}


async def _execute_tool_with_session(tc, db, session_factory):
    """Execute a tool, preferring session_factory for streaming context."""
    args = json.loads(tc.function.arguments) if isinstance(tc.function.arguments, str) else tc.function.arguments
    if session_factory:
        async with session_factory() as tool_db:
            return await execute_tool(tc.function.name, args, tool_db)
    elif db:
        return await execute_tool(tc.function.name, args, db)
    return json.dumps({"error": "数据库未连接"})


async def stream_agent_loop(
    user_message: str,
    history: list[dict],
    context_type: str | None = None,
    context_data: dict | None = None,
    db: AsyncSession | None = None,
    session_factory=None,
) -> AsyncGenerator[dict, None]:
    """流式执行 Agent Loop，逐 token yield 事件"""
    glm = get_glm_client()
    system_prompt = CHAT_SYSTEM_PROMPT.format(context=_build_context_message(context_type, context_data))

    messages = [{"role": "system", "content": system_prompt}] + history + [{"role": "user", "content": user_message}]

    for loop_count in range(MAX_LOOPS):
        choice = await glm.chat_with_tools(messages, tools=TOOL_DEFINITIONS)
        msg = choice.message

        if not msg.tool_calls:
            # Reuse the first model response. Calling the model again here can double cost
            # and produce a different answer from the one that decided no tools were needed.
            if msg.content:
                yield {"type": "token", "content": msg.content}
            return

        # Tool calls — execute and report progress
        tool_names = [tc.function.name for tc in msg.tool_calls]
        tool_labels = {name: _TOOL_LABELS.get(name, f"正在调用 {name}...") for name in tool_names}
        yield {"type": "tool_calls", "tools": tool_names, "labels": tool_labels}

        messages.append({"role": "assistant", "content": msg.content, "tool_calls": [
            {"id": tc.id, "type": "function", "function": {"name": tc.function.name, "arguments": tc.function.arguments}}
            for tc in msg.tool_calls
        ]})

        for tc in msg.tool_calls:
            result_str = await _execute_tool_with_session(tc, db, session_factory)
            messages.append({"role": "tool", "tool_call_id": tc.id, "content": result_str})
            yield {"type": "tool_result", "tool": tc.function.name, "status": "complete"}

    yield {"type": "token", "content": "抱歉，处理过程过于复杂，请尝试更具体的问题。"}
