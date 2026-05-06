from pydantic import BaseModel, EmailStr
from datetime import datetime


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    email: str
    name: str | None = None


class UserProfileStats(BaseModel):
    total_records: int
    jd_records: int
    match_records: int
    chat_conversations: int


class UserProfileResponse(BaseModel):
    user_id: str
    email: str
    name: str | None = None
    created_at: datetime | None = None
    stats: UserProfileStats
