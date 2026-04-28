import uuid
import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models.analysis import AnalysisRecord
from ..models.position import Position
from ..schemas.match import MatchAnalyzeRequest, MatchAnalyzeResponse
from ..services.glm_client import get_glm_client
from ..services.resume_service import match_resume

router = APIRouter()


@router.post("/analyze", response_model=MatchAnalyzeResponse)
async def match_resume_endpoint(req: MatchAnalyzeRequest, db: AsyncSession = Depends(get_db)):
    # Get position details
    result = await db.execute(select(Position).where(Position.id == req.position_id))
    pos = result.scalar_one_or_none()
    if not pos:
        raise HTTPException(status_code=404, detail="岗位未找到")

    # Build position details text for prompt
    position_details = json.dumps({
        "name": pos.name,
        "name_en": pos.name_en,
        "summary": pos.summary,
        "capability_requirements": pos.capability_requirements,
        "salary_range": pos.salary_range,
    }, ensure_ascii=False)

    if req.jd_text:
        position_details += f"\n\n【JD原文】\n{req.jd_text}"

    glm = get_glm_client()
    match_result = await match_resume(glm, req.resume_text, position_details)

    score = match_result.get("match_score", 0)
    record = AnalysisRecord(
        id=uuid.uuid4(),
        type="match",
        input_text=req.resume_text,
        result=match_result,
        match_score=score,
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)

    return MatchAnalyzeResponse(record_id=str(record.id), match_score=score, result=match_result)
