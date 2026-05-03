from fastapi import APIRouter, UploadFile, File, HTTPException, Depends

from ..services.file_parser import extract_text
from ..middleware.auth import get_current_user

router = APIRouter()

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


@router.post("/upload")
async def upload_file(file: UploadFile = File(...), user_id: str = Depends(get_current_user)):
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="文件大小超过10MB限制")

    try:
        text, file_type = await extract_text(content, file.filename or "")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"文件解析失败：{str(e)}")

    return {
        "text": text,
        "file_type": file_type,
        "filename": file.filename,
    }
