from __future__ import annotations

import json
from uuid import uuid4

from sqlalchemy import select

from app.database import async_session
from app.models.analysis import AnalysisRecord
from app.models.chat import ChatConversation, ChatMessage
from app.models.user import User


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

    profile = await client.get("/api/auth/profile")
    assert profile.status_code == 401

    data_export = await client.get("/api/auth/export-data")
    assert data_export.status_code == 401

    account_delete = await client.delete("/api/auth/account")
    assert account_delete.status_code == 401


async def test_profile_returns_scoped_account_stats(client, auth_headers):
    owner_headers = await auth_headers(client)
    other_headers = await auth_headers(client)

    owner = await client.get("/api/auth/me", headers=owner_headers)
    owner_id = owner.json()["user_id"]
    other = await client.get("/api/auth/me", headers=other_headers)
    other_id = other.json()["user_id"]

    async with async_session() as session:
        session.add(
            AnalysisRecord(
                user_id=owner_id,
                type="jd",
                input_text="Owner JD",
                result=json.dumps({"summary": "owner jd"}, ensure_ascii=False),
            )
        )
        session.add(
            AnalysisRecord(
                user_id=owner_id,
                type="match",
                input_text="Owner resume",
                result=json.dumps({"match_score": 80}, ensure_ascii=False),
                match_score=80,
            )
        )
        session.add(
            AnalysisRecord(
                user_id=other_id,
                type="jd",
                input_text="Other JD",
                result=json.dumps({"summary": "other jd"}, ensure_ascii=False),
            )
        )

        owner_conversation = ChatConversation(user_id=owner_id, title="Owner chat")
        other_conversation = ChatConversation(user_id=other_id, title="Other chat")
        session.add(owner_conversation)
        session.add(other_conversation)
        await session.commit()

    profile = await client.get("/api/auth/profile", headers=owner_headers)
    assert profile.status_code == 200, profile.text
    data = profile.json()
    assert data["user_id"] == owner_id
    assert data["email"] == owner.json()["email"]
    assert data["created_at"]
    assert data["stats"]["total_records"] == 2
    assert data["stats"]["jd_records"] == 1
    assert data["stats"]["match_records"] == 1
    assert data["stats"]["chat_conversations"] == 1


async def test_export_data_returns_only_current_user_data(client, auth_headers):
    owner_headers = await auth_headers(client)
    other_headers = await auth_headers(client)

    owner = await client.get("/api/auth/me", headers=owner_headers)
    owner_id = owner.json()["user_id"]
    other = await client.get("/api/auth/me", headers=other_headers)
    other_id = other.json()["user_id"]

    async with async_session() as session:
        owner_record = AnalysisRecord(
            user_id=owner_id,
            type="jd",
            input_text="Owner export JD",
            result=json.dumps({"position_overview": {"inferred_role": "Owner Role"}}, ensure_ascii=False),
        )
        other_record = AnalysisRecord(
            user_id=other_id,
            type="jd",
            input_text="Other export JD",
            result=json.dumps({"position_overview": {"inferred_role": "Other Role"}}, ensure_ascii=False),
        )
        session.add(owner_record)
        session.add(other_record)

        owner_conversation = ChatConversation(user_id=owner_id, title="Owner export chat")
        other_conversation = ChatConversation(user_id=other_id, title="Other export chat")
        session.add(owner_conversation)
        session.add(other_conversation)
        await session.commit()
        await session.refresh(owner_conversation)
        await session.refresh(other_conversation)

        session.add(ChatMessage(conversation_id=owner_conversation.id, role="user", content="owner private message"))
        session.add(ChatMessage(conversation_id=other_conversation.id, role="user", content="other private message"))
        await session.commit()

    response = await client.get("/api/auth/export-data", headers=owner_headers)
    assert response.status_code == 200, response.text
    assert "attachment" in response.headers["content-disposition"]
    data = response.json()

    assert data["account"]["user_id"] == owner_id
    assert data["account"]["email"] == owner.json()["email"]
    assert data["exported_at"]
    assert any(record["input_text"] == "Owner export JD" for record in data["analysis_records"])
    assert not any(record["input_text"] == "Other export JD" for record in data["analysis_records"])
    assert any(conversation["title"] == "Owner export chat" for conversation in data["chat_conversations"])
    assert not any(conversation["title"] == "Other export chat" for conversation in data["chat_conversations"])
    exported_messages = [
        message["content"]
        for conversation in data["chat_conversations"]
        for message in conversation["messages"]
    ]
    assert "owner private message" in exported_messages
    assert "other private message" not in exported_messages


async def test_delete_account_removes_only_current_user_data(client, auth_headers):
    owner_email = f"delete-owner-{uuid4().hex}@example.com"
    owner_password = "TestPass123!"
    owner_register = await client.post(
        "/api/auth/register",
        json={"email": owner_email, "password": owner_password, "name": "Delete Owner"},
    )
    assert owner_register.status_code == 200, owner_register.text
    owner_headers = {"Authorization": f"Bearer {owner_register.json()['access_token']}"}
    other_headers = await auth_headers(client)

    owner = await client.get("/api/auth/me", headers=owner_headers)
    owner_id = owner.json()["user_id"]
    other = await client.get("/api/auth/me", headers=other_headers)
    other_id = other.json()["user_id"]

    async with async_session() as session:
        owner_record = AnalysisRecord(
            user_id=owner_id,
            type="match",
            input_text="Owner resume to delete",
            result=json.dumps({"match_score": 88}, ensure_ascii=False),
            match_score=88,
        )
        other_record = AnalysisRecord(
            user_id=other_id,
            type="match",
            input_text="Other resume to keep",
            result=json.dumps({"match_score": 66}, ensure_ascii=False),
            match_score=66,
        )
        session.add(owner_record)
        session.add(other_record)

        owner_conversation = ChatConversation(user_id=owner_id, title="Owner delete chat")
        other_conversation = ChatConversation(user_id=other_id, title="Other keep chat")
        session.add(owner_conversation)
        session.add(other_conversation)
        await session.commit()
        await session.refresh(owner_conversation)
        await session.refresh(other_conversation)

        owner_conversation_id = owner_conversation.id
        other_conversation_id = other_conversation.id
        session.add(ChatMessage(conversation_id=owner_conversation_id, role="user", content="owner delete message"))
        session.add(ChatMessage(conversation_id=other_conversation_id, role="user", content="other keep message"))
        await session.commit()

    response = await client.delete("/api/auth/account", headers=owner_headers)
    assert response.status_code == 200, response.text
    assert response.json()["ok"] is True

    deleted_profile = await client.get("/api/auth/profile", headers=owner_headers)
    assert deleted_profile.status_code == 401

    deleted_login = await client.post("/api/auth/login", json={"email": owner_email, "password": owner_password})
    assert deleted_login.status_code == 401

    async with async_session() as session:
        deleted_user = await session.get(User, owner_id)
        kept_user = await session.get(User, other_id)
        assert deleted_user is None
        assert kept_user is not None

        owner_records = await session.execute(select(AnalysisRecord).where(AnalysisRecord.user_id == owner_id))
        other_records = await session.execute(select(AnalysisRecord).where(AnalysisRecord.user_id == other_id))
        assert owner_records.scalars().all() == []
        assert len(other_records.scalars().all()) == 1

        owner_conversations = await session.execute(
            select(ChatConversation).where(ChatConversation.user_id == owner_id)
        )
        other_conversations = await session.execute(
            select(ChatConversation).where(ChatConversation.user_id == other_id)
        )
        assert owner_conversations.scalars().all() == []
        assert len(other_conversations.scalars().all()) == 1

        owner_messages = await session.execute(
            select(ChatMessage).where(ChatMessage.conversation_id == owner_conversation_id)
        )
        other_messages = await session.execute(
            select(ChatMessage).where(ChatMessage.conversation_id == other_conversation_id)
        )
        assert owner_messages.scalars().all() == []
        assert len(other_messages.scalars().all()) == 1


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
