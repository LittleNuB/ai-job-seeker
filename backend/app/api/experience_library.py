from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..middleware.auth import get_current_user
from ..schemas.application import (
    ExperienceLibrarySnapshot,
    UpdateExperienceLibraryItemCommand,
)
from ..services.application_studio import (
    ApplicationCommandError,
    ApplicationStudio,
    ExperienceLibraryNotFoundError,
)

router = APIRouter()


@router.get("", response_model=ExperienceLibrarySnapshot)
async def get_experience_library(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    return await ApplicationStudio(db).get_experience_library(user_id)


@router.post("/commands", response_model=ExperienceLibrarySnapshot)
async def execute_experience_library_command(
    command: UpdateExperienceLibraryItemCommand,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    try:
        return await ApplicationStudio(db).update_experience_library_item(
            command, user_id
        )
    except ExperienceLibraryNotFoundError as exc:
        raise HTTPException(status_code=404, detail="经历库项目不存在") from exc
    except ApplicationCommandError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
