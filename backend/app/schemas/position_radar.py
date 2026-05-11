from pydantic import BaseModel, Field


class PositionRadarPreferences(BaseModel):
    target_city: str | None = None
    experience_level: str | None = None
    preferred_tracks: list[str] = Field(default_factory=list)


class PositionRadarRequest(BaseModel):
    resume_text: str
    preferences: PositionRadarPreferences = Field(default_factory=PositionRadarPreferences)


class PositionRadarResponse(BaseModel):
    record_id: str
    result: dict

