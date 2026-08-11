from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..middleware.auth import get_current_user
from ..schemas.application import (
    ApplicationListResponse,
    ApplicationSnapshot,
    MoveExperienceItemCommand,
    StartApplicationCommand,
)
from ..services.application_studio import (
    ApplicationCommandError,
    ApplicationNotFoundError,
    ApplicationStudio,
)

router = APIRouter()


def _not_found() -> HTTPException:
    return HTTPException(status_code=404, detail="目标投递不存在")


@router.post("/commands", response_model=ApplicationSnapshot)
async def start_application(
    command: StartApplicationCommand,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    return await ApplicationStudio(db).execute(command, owner_id=user_id)


@router.get("", response_model=ApplicationListResponse)
async def list_applications(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    return ApplicationListResponse(
        items=await ApplicationStudio(db).list_applications(user_id)
    )


@router.get("/{application_id}", response_model=ApplicationSnapshot)
async def get_application(
    application_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    try:
        return await ApplicationStudio(db).get_snapshot(application_id, user_id)
    except ApplicationNotFoundError as exc:
        raise _not_found() from exc


@router.post("/{application_id}/commands", response_model=ApplicationSnapshot)
async def execute_application_command(
    application_id: str,
    command: MoveExperienceItemCommand,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    try:
        return await ApplicationStudio(db).execute(
            command, owner_id=user_id, application_id=application_id
        )
    except ApplicationNotFoundError as exc:
        raise _not_found() from exc
    except ApplicationCommandError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
