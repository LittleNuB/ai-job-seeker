import json
import uuid
from datetime import datetime, timezone

import bcrypt
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models.analysis import AnalysisRecord
from ..models.application import TargetApplication
from ..models.chat import ChatConversation, ChatMessage
from ..models.user import User
from ..schemas.auth import AuthResponse, LoginRequest, RegisterRequest, UserProfileResponse, UserProfileStats
from ..middleware.auth import create_access_token, get_current_user
from ..schemas.records import DeleteResponse

router = APIRouter()


def _safe_json_loads(value: str | None):
    if not value:
        return None
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return value


def _iso(value) -> str | None:
    return value.isoformat() if value else None


def _password_bytes(password: str) -> bytes:
    data = password.encode("utf-8")
    if len(data) > 72:
        raise HTTPException(status_code=400, detail="密码过长，请控制在72字节以内")
    return data


def hash_password(password: str) -> str:
    return bcrypt.hashpw(_password_bytes(password), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(_password_bytes(password), hashed.encode("utf-8"))
    except (ValueError, TypeError):
        return False


@router.post("/register", response_model=AuthResponse)
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    if not req.accepted_terms:
        raise HTTPException(status_code=400, detail="请先阅读并同意用户协议和隐私政策")

    result = await db.execute(select(User).where(User.email == req.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="该邮箱已注册")
    user = User(
        email=req.email,
        password=hash_password(req.password),
        name=req.name,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    token = create_access_token(str(user.id))
    return AuthResponse(access_token=token, user_id=str(user.id), email=user.email, name=user.name)


@router.post("/login", response_model=AuthResponse)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == req.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(req.password, user.password):
        raise HTTPException(status_code=401, detail="邮箱或密码错误")
    token = create_access_token(str(user.id))
    return AuthResponse(access_token=token, user_id=str(user.id), email=user.email, name=user.name)


@router.get("/me")
async def get_me(user_id: str = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    return {"user_id": str(user.id), "email": user.email, "name": user.name}


async def _count_records(db: AsyncSession, user_id: str, record_type: str | None = None) -> int:
    stmt = select(func.count()).select_from(AnalysisRecord).where(AnalysisRecord.user_id == user_id)
    if record_type:
        stmt = stmt.where(AnalysisRecord.type == record_type)
    result = await db.execute(stmt)
    return int(result.scalar_one() or 0)


@router.get("/profile", response_model=UserProfileResponse)
async def get_profile(user_id: str = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")

    chat_count = await db.execute(
        select(func.count()).select_from(ChatConversation).where(ChatConversation.user_id == user_id)
    )

    return UserProfileResponse(
        user_id=str(user.id),
        email=user.email,
        name=user.name,
        created_at=user.created_at,
        stats=UserProfileStats(
            total_records=await _count_records(db, user_id),
            jd_records=await _count_records(db, user_id, "jd"),
            match_records=await _count_records(db, user_id, "match"),
            chat_conversations=int(chat_count.scalar_one() or 0),
        ),
    )


@router.get("/export-data")
async def export_user_data(user_id: str = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")

    records_result = await db.execute(
        select(AnalysisRecord)
        .where(AnalysisRecord.user_id == user_id)
        .order_by(AnalysisRecord.created_at)
    )
    records = records_result.scalars().all()

    conversations_result = await db.execute(
        select(ChatConversation)
        .where(ChatConversation.user_id == user_id)
        .order_by(ChatConversation.created_at)
    )
    conversations = conversations_result.scalars().all()
    conversation_ids = [conversation.id for conversation in conversations]
    messages_by_conversation: dict[str, list[ChatMessage]] = {conversation_id: [] for conversation_id in conversation_ids}

    if conversation_ids:
        messages_result = await db.execute(
            select(ChatMessage)
            .where(ChatMessage.conversation_id.in_(conversation_ids))
            .order_by(ChatMessage.created_at)
        )
        for message in messages_result.scalars().all():
            messages_by_conversation.setdefault(message.conversation_id, []).append(message)

    exported_at = datetime.now(timezone.utc).isoformat()
    payload = {
        "exported_at": exported_at,
        "account": {
            "user_id": str(user.id),
            "email": user.email,
            "name": user.name,
            "created_at": _iso(user.created_at),
        },
        "analysis_records": [
            {
                "id": str(record.id),
                "type": record.type,
                "input_text": record.input_text,
                "input_file_url": record.input_file_url,
                "result": _safe_json_loads(record.result),
                "match_score": record.match_score,
                "created_at": _iso(record.created_at),
            }
            for record in records
        ],
        "chat_conversations": [
            {
                "id": str(conversation.id),
                "context_type": conversation.context_type,
                "context_id": conversation.context_id,
                "title": conversation.title,
                "created_at": _iso(conversation.created_at),
                "messages": [
                    {
                        "id": str(message.id),
                        "role": message.role,
                        "content": message.content,
                        "tool_calls": _safe_json_loads(message.tool_calls),
                        "created_at": _iso(message.created_at),
                    }
                    for message in messages_by_conversation.get(conversation.id, [])
                ],
            }
            for conversation in conversations
        ],
    }

    filename = f"ai-job-copilot-data-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}.json"
    return Response(
        content=json.dumps(payload, ensure_ascii=False, indent=2),
        media_type="application/json; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.delete("/account", response_model=DeleteResponse)
async def delete_account(user_id: str = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")

    conversations_result = await db.execute(select(ChatConversation.id).where(ChatConversation.user_id == user_id))
    conversation_ids = list(conversations_result.scalars().all())

    if conversation_ids:
        await db.execute(delete(ChatMessage).where(ChatMessage.conversation_id.in_(conversation_ids)))

    await db.execute(delete(ChatConversation).where(ChatConversation.user_id == user_id))
    await db.execute(delete(AnalysisRecord).where(AnalysisRecord.user_id == user_id))
    await db.execute(delete(TargetApplication).where(TargetApplication.user_id == user_id))
    await db.delete(user)
    await db.commit()

    return DeleteResponse(ok=True)
