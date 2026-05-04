from __future__ import annotations

import json
from uuid import uuid4

from app.database import async_session
from app.models.analysis import AnalysisRecord


async def test_records_reject_anonymous(client):
    res = await client.get("/api/records")
    assert res.status_code == 401

    res = await client.get(f"/api/records/{uuid4()}")
    assert res.status_code == 401

    res = await client.delete(f"/api/records/{uuid4()}")
    assert res.status_code == 401


async def test_list_only_returns_own_records(client, auth_headers):
    owner_headers = await auth_headers(client)
    other_headers = await auth_headers(client)

    owner = await client.get("/api/auth/me", headers=owner_headers)
    owner_id = owner.json()["user_id"]

    async with async_session() as session:
        record = AnalysisRecord(
            user_id=owner_id,
            type="jd",
            input_text="JD text for owner",
            result=json.dumps({"position_overview": {"inferred_role": "后端工程师"}}, ensure_ascii=False),
            match_score=None,
        )
        session.add(record)
        await session.commit()

    owner_list = await client.get("/api/records", headers=owner_headers)
    assert owner_list.status_code == 200
    owner_data = owner_list.json()
    assert owner_data["total"] >= 1
    assert any(r["input_text_preview"] and "JD text" in r["input_text_preview"] for r in owner_data["items"])

    other_list = await client.get("/api/records", headers=other_headers)
    assert other_list.status_code == 200
    other_data = other_list.json()
    assert not any(r["input_text_preview"] and "JD text" in r["input_text_preview"] for r in other_data["items"])


async def test_detail_is_scoped_to_owner(client, auth_headers):
    owner_headers = await auth_headers(client)
    other_headers = await auth_headers(client)

    owner = await client.get("/api/auth/me", headers=owner_headers)
    owner_id = owner.json()["user_id"]

    async with async_session() as session:
        record = AnalysisRecord(
            user_id=owner_id,
            type="jd",
            input_text="Secret JD",
            result=json.dumps({"test": True}, ensure_ascii=False),
        )
        session.add(record)
        await session.commit()
        await session.refresh(record)
        record_id = record.id

    other_detail = await client.get(f"/api/records/{record_id}", headers=other_headers)
    assert other_detail.status_code == 404

    owner_detail = await client.get(f"/api/records/{record_id}", headers=owner_headers)
    assert owner_detail.status_code == 200
    assert owner_detail.json()["input_text"] == "Secret JD"
    assert owner_detail.json()["result"] == {"test": True}


async def test_delete_is_scoped_to_owner(client, auth_headers):
    owner_headers = await auth_headers(client)
    other_headers = await auth_headers(client)

    owner = await client.get("/api/auth/me", headers=owner_headers)
    owner_id = owner.json()["user_id"]

    async with async_session() as session:
        record = AnalysisRecord(
            user_id=owner_id,
            type="match",
            input_text="Resume text",
            result=json.dumps({"match_score": 85}, ensure_ascii=False),
            match_score=85,
        )
        session.add(record)
        await session.commit()
        await session.refresh(record)
        record_id = record.id

    other_delete = await client.delete(f"/api/records/{record_id}", headers=other_headers)
    assert other_delete.status_code == 404

    owner_delete = await client.delete(f"/api/records/{record_id}", headers=owner_headers)
    assert owner_delete.status_code == 200
    assert owner_delete.json()["ok"] is True

    owner_detail = await client.get(f"/api/records/{record_id}", headers=owner_headers)
    assert owner_detail.status_code == 404


async def test_list_pagination(client, auth_headers):
    headers = await auth_headers(client)
    user = await client.get("/api/auth/me", headers=headers)
    user_id = user.json()["user_id"]

    async with async_session() as session:
        for i in range(12):
            record = AnalysisRecord(
                user_id=user_id,
                type="jd",
                input_text=f"JD {i}",
                result=json.dumps({"position_overview": {"inferred_role": f"Role {i}"}}, ensure_ascii=False),
            )
            session.add(record)
        await session.commit()

    page1 = await client.get("/api/records?page=1&page_size=5", headers=headers)
    assert page1.status_code == 200
    data1 = page1.json()
    assert data1["page"] == 1
    assert data1["page_size"] == 5
    assert len(data1["items"]) == 5
    assert data1["total"] >= 12

    page3 = await client.get("/api/records?page=3&page_size=5", headers=headers)
    assert page3.status_code == 200
    data3 = page3.json()
    assert len(data3["items"]) == data3["total"] - 10 if data3["total"] > 10 else 0


async def test_list_type_filter(client, auth_headers):
    headers = await auth_headers(client)
    user = await client.get("/api/auth/me", headers=headers)
    user_id = user.json()["user_id"]

    async with async_session() as session:
        for _ in range(3):
            session.add(AnalysisRecord(
                user_id=user_id, type="jd",
                input_text="JD", result=json.dumps({"position_overview": {"inferred_role": "Dev"}}, ensure_ascii=False),
            ))
        for _ in range(2):
            session.add(AnalysisRecord(
                user_id=user_id, type="match",
                input_text="Resume", result=json.dumps({"match_score": 80}, ensure_ascii=False), match_score=80,
            ))
        await session.commit()

    all_res = await client.get("/api/records", headers=headers)
    assert all_res.status_code == 200
    assert all_res.json()["total"] >= 5

    jd_res = await client.get("/api/records?type=jd", headers=headers)
    assert jd_res.status_code == 200
    jd_items = jd_res.json()["items"]
    assert all(r["type"] == "jd" for r in jd_items)

    match_res = await client.get("/api/records?type=match", headers=headers)
    assert match_res.status_code == 200
    match_items = match_res.json()["items"]
    assert all(r["type"] == "match" for r in match_items)


async def test_result_summary(client, auth_headers):
    headers = await auth_headers(client)
    user = await client.get("/api/auth/me", headers=headers)
    user_id = user.json()["user_id"]

    async with async_session() as session:
        jd_record = AnalysisRecord(
            user_id=user_id, type="jd",
            input_text="JD text",
            result=json.dumps({"position_overview": {"inferred_role": "高级前端工程师"}}, ensure_ascii=False),
        )
        session.add(jd_record)
        match_record = AnalysisRecord(
            user_id=user_id, type="match",
            input_text="Resume text",
            result=json.dumps({"match_score": 92}, ensure_ascii=False),
            match_score=92,
        )
        session.add(match_record)
        await session.commit()

    res = await client.get("/api/records", headers=headers)
    assert res.status_code == 200
    items = res.json()["items"]

    jd_item = next(r for r in items if r["type"] == "jd")
    assert jd_item["result_summary"] == "高级前端工程师"

    match_item = next(r for r in items if r["type"] == "match")
    assert "92" in match_item["result_summary"]
