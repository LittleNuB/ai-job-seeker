from __future__ import annotations

import json
from uuid import uuid4

from app.database import async_session
from app.models.analysis import AnalysisRecord
from app.models.chat import ChatConversation, ChatMessage


async def test_register_login_and_me(client):
    email = f"user-{uuid4().hex}@example.com"
    password = "TestPass123!"

    register = await client.post(
        "/api/auth/register",
        json={"email": email, "password": password, "name": "Test User"},
    )
    assert register.status_code == 200, register.text
    assert register.json()["access_token"]

    login = await client.post("/api/auth/login", json={"email": email, "password": password})
    assert login.status_code == 200, login.text
    token = login.json()["access_token"]

    me = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200, me.text
    assert me.json()["email"] == email


async def test_protected_routes_reject_anonymous(client):
    jd = await client.post("/api/jd/analyze", json={"jd_text": "test"})
    assert jd.status_code == 401

    export = await client.get(f"/api/export/{uuid4()}")
    assert export.status_code == 401

    chat = await client.get(f"/api/chat/conversations/{uuid4()}/messages")
    assert chat.status_code == 401


async def test_export_is_scoped_to_current_user(client, auth_headers):
    owner_headers = await auth_headers(client)
    other_headers = await auth_headers(client)

    owner = await client.get("/api/auth/me", headers=owner_headers)
    owner_id = owner.json()["user_id"]

    async with async_session() as session:
        record = AnalysisRecord(
            user_id=owner_id,
            type="jd",
            input_text="Backend engineer JD",
            result=json.dumps({"summary": "ok"}, ensure_ascii=False),
        )
        session.add(record)
        await session.commit()
        await session.refresh(record)
        record_id = record.id

    other_export = await client.get(f"/api/export/{record_id}", headers=other_headers)
    assert other_export.status_code == 404

    owner_export = await client.get(f"/api/export/{record_id}", headers=owner_headers)
    assert owner_export.status_code == 200
    assert "Backend engineer JD" in owner_export.text


async def test_chat_history_is_scoped_to_current_user(client, auth_headers):
    owner_headers = await auth_headers(client)
    other_headers = await auth_headers(client)

    owner = await client.get("/api/auth/me", headers=owner_headers)
    owner_id = owner.json()["user_id"]

    async with async_session() as session:
        conversation = ChatConversation(user_id=owner_id, title="Private conversation")
        session.add(conversation)
        await session.commit()
        await session.refresh(conversation)

        message = ChatMessage(conversation_id=conversation.id, role="user", content="private note")
        session.add(message)
        await session.commit()
        conversation_id = conversation.id

    other_history = await client.get(f"/api/chat/conversations/{conversation_id}/messages", headers=other_headers)
    assert other_history.status_code == 404

    owner_history = await client.get(f"/api/chat/conversations/{conversation_id}/messages", headers=owner_headers)
    assert owner_history.status_code == 200
    assert owner_history.json()[0]["content"] == "private note"
