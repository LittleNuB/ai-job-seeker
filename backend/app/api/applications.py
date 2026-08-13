from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..middleware.auth import get_current_user
from ..schemas.application import (
    ApplicationListResponse,
    ApplicationMutationCommand,
    ApplicationSnapshot,
    StartApplicationCommand,
)
from ..services.application_studio import (
    ApplicationCommandError,
    ApplicationConflictError,
    ApplicationNotFoundError,
    ApplicationStudio,
)
from ..services.application_model import ApplicationModelPort, get_application_model

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


async def _targeted_resume_response(
    application_id: str,
    export_format: str,
    db: AsyncSession,
    user_id: str,
) -> Response:
    try:
        export = await ApplicationStudio(db).render_targeted_resume(
            application_id,
            user_id,
            export_format=export_format,
        )
    except ApplicationNotFoundError as exc:
        raise _not_found() from exc
    except ApplicationCommandError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return Response(
        content=export.content,
        media_type=export.media_type,
        headers={
            "Content-Disposition": f'attachment; filename="{export.filename}"'
        },
    )


@router.get("/{application_id}/targeted-resume.txt")
async def export_targeted_resume_text(
    application_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    return await _targeted_resume_response(application_id, "text", db, user_id)


@router.get("/{application_id}/targeted-resume.md")
async def export_targeted_resume_markdown(
    application_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    return await _targeted_resume_response(
        application_id, "markdown", db, user_id
    )


@router.post("/{application_id}/commands", response_model=ApplicationSnapshot)
async def execute_application_command(
    application_id: str,
    command: ApplicationMutationCommand,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user),
    model: ApplicationModelPort = Depends(get_application_model),
):
    try:
        return await ApplicationStudio(db, model).execute(
            command, owner_id=user_id, application_id=application_id
        )
    except ApplicationNotFoundError as exc:
        raise _not_found() from exc
    except ApplicationConflictError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except ApplicationCommandError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
