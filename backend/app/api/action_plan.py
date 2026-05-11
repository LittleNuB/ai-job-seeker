import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..middleware.auth import get_current_user
from ..models.analysis import AnalysisRecord
from ..schemas.action_plan import ActionPlanRequest, ActionPlanResponse
from ..services.action_plan_service import build_action_plan

router = APIRouter()


@router.post("", response_model=ActionPlanResponse)
async def action_plan_endpoint(
    req: ActionPlanRequest,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    source_type = req.source_type.strip()
    if source_type not in {"position_radar", "jd", "match"}:
        raise HTTPException(status_code=400, detail="不支持的行动计划来源")

    source_result = await db.execute(
        select(AnalysisRecord).where(
            AnalysisRecord.id == req.source_record_id,
            AnalysisRecord.user_id == user_id,
        )
    )
    source_record = source_result.scalar_one_or_none()
    if not source_record:
        raise HTTPException(status_code=404, detail="来源记录未找到")
    if source_record.type != source_type:
        raise HTTPException(status_code=400, detail="来源记录类型不匹配")

    result = build_action_plan(source_type, source_record.id, json.loads(source_record.result))
    record = AnalysisRecord(
        type="action_plan",
        user_id=user_id,
        input_text=f"{source_type}:{source_record.id}",
        result=json.dumps(result, ensure_ascii=False),
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)

    return ActionPlanResponse(record_id=str(record.id), result=result)

