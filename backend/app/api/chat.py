import uuid
import json

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models.chat import ChatConversation, ChatMessage
from ..schemas.chat import ChatRequest
from ..services.agent_engine import run_agent_loop, stream_agent_loop

router = APIRouter()


@router.post("/message")
async def send_message(req: ChatRequest, db: AsyncSession = Depends(get_db)):
    """发送追问消息（非流式）"""
    # Get or create conversation
    conversation = None
    if req.conversation_id:
        result = await db.execute(
            select(ChatConversation).where(ChatConversation.id == uuid.UUID(req.conversation_id))
        )
        conversation = result.scalar_one_or_none()

    if not conversation:
        conversation = ChatConversation(
            id=uuid.uuid4(),
            context_type=req.context_type,
            context_id=req.context_data.get("position_id") if req.context_data else None,
        )
        db.add(conversation)
        await db.commit()
        await db.refresh(conversation)

    # Load history
    history_result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.conversation_id == conversation.id)
        .order_by(ChatMessage.created_at)
    )
    db_messages = history_result.scalars().all()
    history = [{"role": m.role, "content": m.content} for m in db_messages]

    # Save user message
    user_msg = ChatMessage(
        conversation_id=conversation.id,
        role="user",
        content=req.message,
    )
    db.add(user_msg)
    await db.commit()

    # Run agent
    response = await run_agent_loop(
        user_message=req.message,
        history=history,
        context_type=req.context_type,
        context_data=req.context_data,
        db=db,
    )

    # Save assistant message
    assistant_msg = ChatMessage(
        conversation_id=conversation.id,
        role="assistant",
        content=response.get("content"),
        tool_calls=response.get("tool_calls"),
    )
    db.add(assistant_msg)
    await db.commit()

    return {
        "conversation_id": str(conversation.id),
        "message": response,
    }


@router.post("/message/stream")
async def stream_message(req: ChatRequest, db: AsyncSession = Depends(get_db)):
    """流式追问（SSE）"""
    conversation = None
    if req.conversation_id:
        result = await db.execute(
            select(ChatConversation).where(ChatConversation.id == uuid.UUID(req.conversation_id))
        )
        conversation = result.scalar_one_or_none()

    if not conversation:
        conversation = ChatConversation(
            id=uuid.uuid4(),
            context_type=req.context_type,
            context_id=req.context_data.get("position_id") if req.context_data else None,
        )
        db.add(conversation)
        await db.commit()
        await db.refresh(conversation)

    history_result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.conversation_id == conversation.id)
        .order_by(ChatMessage.created_at)
    )
    db_messages = history_result.scalars().all()
    history = [{"role": m.role, "content": m.content} for m in db_messages]

    user_msg = ChatMessage(conversation_id=conversation.id, role="user", content=req.message)
    db.add(user_msg)
    await db.commit()

    conversation_id = str(conversation.id)

    async def event_generator():
        full_content = ""
        async for event in stream_agent_loop(
            user_message=req.message,
            history=history,
            context_type=req.context_type,
            context_data=req.context_data,
            db=db,
        ):
            yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"
            if event.get("type") == "content":
                full_content = event.get("content", "")

        # Save final response
        async with db.begin():
            assistant_msg = ChatMessage(
                conversation_id=uuid.UUID(conversation_id),
                role="assistant",
                content=full_content,
            )
            db.add(assistant_msg)

        yield f"data: {json.dumps({'type': 'done', 'conversation_id': conversation_id}, ensure_ascii=False)}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.get("/conversations/{conversation_id}/messages")
async def get_conversation_messages(conversation_id: str, db: AsyncSession = Depends(get_db)):
    """获取对话历史"""
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.conversation_id == uuid.UUID(conversation_id))
        .order_by(ChatMessage.created_at)
    )
    messages = result.scalars().all()
    return [{"role": m.role, "content": m.content, "tool_calls": m.tool_calls, "created_at": str(m.created_at)} for m in messages]
