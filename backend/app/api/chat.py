import json

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db, async_session
from ..models.chat import ChatConversation, ChatMessage
from ..schemas.chat import ChatRequest
from ..services.agent_engine import run_agent_loop, stream_agent_loop
from ..middleware.auth import get_current_user

router = APIRouter()


@router.post("/message")
async def send_message(req: ChatRequest, db: AsyncSession = Depends(get_db), user_id: str = Depends(get_current_user)):
    conversation = None
    if req.conversation_id:
        result = await db.execute(
            select(ChatConversation).where(ChatConversation.id == req.conversation_id, ChatConversation.user_id == user_id)
        )
        conversation = result.scalar_one_or_none()

    if req.conversation_id and not conversation:
        raise HTTPException(status_code=404, detail="会话不存在")

    if not conversation:
        conversation = ChatConversation(
            user_id=user_id,
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

    user_msg = ChatMessage(
        conversation_id=conversation.id,
        role="user",
        content=req.message,
    )
    db.add(user_msg)
    await db.commit()

    response = await run_agent_loop(
        user_message=req.message,
        history=history,
        context_type=req.context_type,
        context_data=req.context_data,
        db=db,
    )

    assistant_msg = ChatMessage(
        conversation_id=conversation.id,
        role="assistant",
        content=response.get("content"),
        tool_calls=json.dumps(response.get("tool_calls"), ensure_ascii=False) if response.get("tool_calls") else None,
    )
    db.add(assistant_msg)
    await db.commit()

    return {
        "conversation_id": str(conversation.id),
        "message": response,
    }


@router.post("/message/stream")
async def stream_message(req: ChatRequest, db: AsyncSession = Depends(get_db), user_id: str = Depends(get_current_user)):
    conversation = None
    if req.conversation_id:
        result = await db.execute(
            select(ChatConversation).where(ChatConversation.id == req.conversation_id, ChatConversation.user_id == user_id)
        )
        conversation = result.scalar_one_or_none()

    if req.conversation_id and not conversation:
        raise HTTPException(status_code=404, detail="会话不存在")

    if not conversation:
        conversation = ChatConversation(
            user_id=user_id,
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

    # Release the DI session before streaming starts
    await db.close()

    async def event_generator():
        full_content = ""
        try:
            async for event in stream_agent_loop(
                user_message=req.message,
                history=history,
                context_type=req.context_type,
                context_data=req.context_data,
                db=None,
                session_factory=async_session,
            ):
                event_type = event.get("type", "message")
                yield f"event: {event_type}\ndata: {json.dumps(event, ensure_ascii=False)}\n\n"
                if event.get("type") == "token":
                    full_content += event.get("content", "")
        except Exception as e:
            yield f"event: error\ndata: {json.dumps({'type': 'error', 'message': str(e)}, ensure_ascii=False)}\n\n"

        # Save assistant message with a fresh DB session
        try:
            async with async_session() as save_session:
                assistant_msg = ChatMessage(
                    conversation_id=conversation_id,
                    role="assistant",
                    content=full_content,
                )
                save_session.add(assistant_msg)
                await save_session.commit()
        except Exception:
            pass  # Best-effort save; user already saw the response

        yield f"event: done\ndata: {json.dumps({'type': 'done', 'conversation_id': conversation_id}, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/conversations/{conversation_id}/messages")
async def get_conversation_messages(conversation_id: str, db: AsyncSession = Depends(get_db), user_id: str = Depends(get_current_user)):
    conversation_result = await db.execute(
        select(ChatConversation).where(ChatConversation.id == conversation_id, ChatConversation.user_id == user_id)
    )
    conversation = conversation_result.scalar_one_or_none()
    if not conversation:
        raise HTTPException(status_code=404, detail="会话不存在")

    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.conversation_id == conversation.id)
        .order_by(ChatMessage.created_at)
    )
    messages = result.scalars().all()
    return [{"role": m.role, "content": m.content, "tool_calls": m.tool_calls, "created_at": str(m.created_at)} for m in messages]
