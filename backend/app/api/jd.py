import uuid
import json

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models.analysis import AnalysisRecord
from ..models.position import Position
from ..schemas.jd import JDAnalyzeRequest, JDAnalyzeResponse
from ..services.glm_client import get_glm_client
from ..services.jd_service import analyze_jd

router = APIRouter()


@router.post("/analyze", response_model=JDAnalyzeResponse)
async def analyze_jd_endpoint(req: JDAnalyzeRequest, db: AsyncSession = Depends(get_db)):
    glm = get_glm_client()
    result = await analyze_jd(glm, req.jd_text)

    record = AnalysisRecord(
        id=uuid.uuid4(),
        type="jd",
        input_text=req.jd_text,
        result=result,
    )
    if req.position_id:
        record.result["reference_position_id"] = req.position_id

    db.add(record)
    await db.commit()
    await db.refresh(record)

    return JDAnalyzeResponse(record_id=str(record.id), result=result)
