import uuid

import bcrypt
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models.user import User
from ..schemas.auth import RegisterRequest, LoginRequest, AuthResponse
from ..middleware.auth import create_access_token, get_current_user

router = APIRouter()


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
