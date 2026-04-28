from pydantic import BaseModel


class JDAnalyzeRequest(BaseModel):
    jd_text: str
    position_id: str | None = None


class JDAnalyzeResponse(BaseModel):
    record_id: str
    result: dict
