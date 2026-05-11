from pydantic import BaseModel


class ActionPlanRequest(BaseModel):
    source_type: str
    source_record_id: str


class ActionPlanResponse(BaseModel):
    record_id: str
    result: dict

