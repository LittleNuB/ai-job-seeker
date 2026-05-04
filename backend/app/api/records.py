import json

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..middleware.auth import get_current_user
from ..models.analysis import AnalysisRecord
from ..schemas.records import (
    DeleteResponse,
    RecordDetailResponse,
    RecordListItem,
    RecordListResponse,
)

router = APIRouter()


def _extract_summary(type_: str, result_json: str) -> str | None:
    try:
        data = json.loads(result_json)
    except (json.JSONDecodeError, TypeError):
        return None
    if type_ == "jd":
        return data.get("position_overview", {}).get("inferred_role")
    elif type_ == "match":
        score = data.get("match_score")
        return f"匹配得分：{score}/100" if score is not None else None
    return None


@router.get("", response_model=RecordListResponse)
async def list_records(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=50),
    type: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    base = select(AnalysisRecord).where(AnalysisRecord.user_id == user_id)
    if type:
        base = base.where(AnalysisRecord.type == type)

    count_query = select(func.count()).select_from(base.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    offset = (page - 1) * page_size
    rows_result = await db.execute(
        base.order_by(AnalysisRecord.created_at.desc()).offset(offset).limit(page_size)
    )
    rows = rows_result.scalars().all()

    items = [
        RecordListItem(
            id=r.id,
            type=r.type,
            input_text_preview=r.input_text[:80] if r.input_text else None,
            match_score=r.match_score,
            result_summary=_extract_summary(r.type, r.result),
            created_at=str(r.created_at),
        )
        for r in rows
    ]

    return RecordListResponse(items=items, total=total, page=page, page_size=page_size)


@router.get("/{record_id}", response_model=RecordDetailResponse)
async def get_record(
    record_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    result = await db.execute(
        select(AnalysisRecord).where(
            AnalysisRecord.id == record_id,
            AnalysisRecord.user_id == user_id,
        )
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="记录未找到")

    return RecordDetailResponse(
        id=record.id,
        type=record.type,
        input_text=record.input_text,
        result=json.loads(record.result),
        match_score=record.match_score,
        created_at=str(record.created_at),
    )


@router.delete("/{record_id}", response_model=DeleteResponse)
async def delete_record(
    record_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    result = await db.execute(
        select(AnalysisRecord).where(
            AnalysisRecord.id == record_id,
            AnalysisRecord.user_id == user_id,
        )
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="记录未找到")

    await db.delete(record)
    await db.commit()
    return DeleteResponse(ok=True)
