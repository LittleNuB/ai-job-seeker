from pydantic import BaseModel


class MatchAnalyzeRequest(BaseModel):
    resume_text: str
    position_id: str
    jd_text: str | None = None


class MatchAnalyzeResponse(BaseModel):
    record_id: str
    match_score: int
    result: dict
