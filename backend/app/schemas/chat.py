from pydantic import BaseModel


class ChatRequest(BaseModel):
    message: str
    conversation_id: str | None = None
    context_type: str | None = None   # "explore" | "jd" | "match"
    context_data: dict | None = None  # 页面上下文数据


class ChatMessageResponse(BaseModel):
    role: str
    content: str | None = None
    tool_calls: list | None = None
