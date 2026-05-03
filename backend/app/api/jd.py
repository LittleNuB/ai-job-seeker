import json

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models.analysis import AnalysisRecord
from ..schemas.jd import JDAnalyzeRequest, JDAnalyzeResponse
from ..services.glm_client import get_glm_client
from ..services.jd_service import analyze_jd
from ..middleware.auth import get_current_user

router = APIRouter()


@router.post("/analyze", response_model=JDAnalyzeResponse)
async def analyze_jd_endpoint(req: JDAnalyzeRequest, db: AsyncSession = Depends(get_db), user_id: str = Depends(get_current_user)):
    glm = get_glm_client()
    result = await analyze_jd(glm, req.jd_text)

    if req.position_id:
        result["reference_position_id"] = req.position_id

    record = AnalysisRecord(
        type="jd",
        user_id=user_id,
        input_text=req.jd_text,
        result=json.dumps(result, ensure_ascii=False),
    )

    db.add(record)
    await db.commit()
    await db.refresh(record)

    return JDAnalyzeResponse(record_id=str(record.id), result=result)
