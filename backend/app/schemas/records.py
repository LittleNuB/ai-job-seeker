from pydantic import BaseModel


class RecordListItem(BaseModel):
    id: str
    type: str
    input_text_preview: str | None = None
    match_score: int | None = None
    result_summary: str | None = None
    created_at: str


class RecordListResponse(BaseModel):
    items: list[RecordListItem]
    total: int
    page: int
    page_size: int


class RecordDetailResponse(BaseModel):
    id: str
    type: str
    input_text: str | None = None
    result: dict
    match_score: int | None = None
    created_at: str


class DeleteResponse(BaseModel):
    ok: bool
