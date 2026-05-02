import json

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import PlainTextResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models.analysis import AnalysisRecord
from ..services.export_service import export_jd_markdown, export_match_markdown

router = APIRouter()


@router.get("/{record_id}", response_class=PlainTextResponse)
async def export_report(record_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(AnalysisRecord).where(AnalysisRecord.id == record_id)
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="记录未找到")

    data = json.loads(record.result)

    if record.type == "jd":
        md = export_jd_markdown(data, jd_text=record.input_text or "")
    elif record.type == "match":
        md = export_match_markdown(data, resume_text=record.input_text or "")
    else:
        raise HTTPException(status_code=400, detail="不支持的记录类型")

    filename = f"{record.type}-report-{record_id[:8]}.md"
    return PlainTextResponse(
        content=md,
        media_type="text/markdown; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
