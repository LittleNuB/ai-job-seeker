import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..middleware.auth import get_current_user
from ..models.analysis import AnalysisRecord
from ..schemas.position_radar import PositionRadarRequest, PositionRadarResponse
from ..services.position_radar_service import build_position_radar

router = APIRouter()


@router.post("", response_model=PositionRadarResponse)
async def position_radar_endpoint(
    req: PositionRadarRequest,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    resume_text = req.resume_text.strip()
    if len(resume_text) < 40:
        raise HTTPException(status_code=400, detail="请提供更完整的简历或个人背景，至少包含技能、项目或经历信息")
    if len(resume_text) > 30000:
        raise HTTPException(status_code=400, detail="简历内容过长，请精简到 30000 字以内后重试")

    result = await build_position_radar(db, resume_text, req.preferences)
    record = AnalysisRecord(
        type="position_radar",
        user_id=user_id,
        input_text=resume_text,
        result=json.dumps(result, ensure_ascii=False),
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)

    return PositionRadarResponse(record_id=str(record.id), result=result)

