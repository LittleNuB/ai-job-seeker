import io
import base64
import pdfplumber
from docx import Document

from ..config import get_settings

RESUME_TEXT_EXTENSIONS = {"txt", "md"}


async def extract_text(content: bytes, filename: str) -> tuple[str, str]:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    if ext == "pdf":
        return _extract_pdf(content), "pdf"
    elif ext in ("docx", "doc"):
        return _extract_docx(content), "docx"
    elif ext in ("jpg", "jpeg", "png"):
        return await _extract_image(content, filename), "image"
    else:
        raise ValueError(f"不支持的文件类型：.{ext}")


async def extract_resume_text(content: bytes, filename: str) -> tuple[str, str]:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext in RESUME_TEXT_EXTENSIONS:
        return _decode_plain_text(content), ext
    if ext == "doc":
        try:
            text, _ = await extract_text(content, filename)
        except Exception:
            text = _decode_plain_text(content)
        return text, "doc"
    text, parsed_type = await extract_text(content, filename)
    return text, parsed_type


def _decode_plain_text(content: bytes) -> str:
    if not content:
        raise ValueError("文本文件为空")

    for encoding in ("utf-8-sig", "utf-16", "gb18030"):
        try:
            text = content.decode(encoding)
            break
        except UnicodeDecodeError:
            continue
    else:
        text = content.decode("utf-8", errors="replace")

    text = text.replace("\x00", "").strip()
    if not text:
        raise ValueError("文本文件中未提取到内容")
    return text


def _extract_pdf(content: bytes) -> str:
    with pdfplumber.open(io.BytesIO(content)) as pdf:
        pages = [page.extract_text() or "" for page in pdf.pages]
    text = "\n\n".join(pages)
    if not text.strip():
        raise ValueError("PDF 中未提取到文本，可能是扫描件，请尝试上传图片")
    return text


def _extract_docx(content: bytes) -> str:
    doc = Document(io.BytesIO(content))
    paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
    if not paragraphs:
        raise ValueError("DOCX 中未提取到文本")
    return "\n".join(paragraphs)


async def _extract_image(content: bytes, filename: str) -> str:
    settings = get_settings()
    if not settings.model_api_key:
        raise ValueError("图片文字识别需要配置 LLM_API_KEY/GLM_API_KEY")

    b64 = base64.b64encode(content).decode()

    ext = filename.rsplit(".", 1)[-1].lower()
    mime = "image/jpeg" if ext in ("jpg", "jpeg") else "image/png"

    from openai import AsyncOpenAI
    client = AsyncOpenAI(
        api_key=settings.model_api_key,
        base_url=settings.model_base_url,
        timeout=settings.model_timeout_seconds,
        max_retries=settings.model_max_retries,
    )

    response = await client.chat.completions.create(
        model=settings.model_chat_model,
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "请提取图片中的所有文字内容，按原始格式输出。如果图片不是文字内容，请描述图片中的信息。"},
                    {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{b64}"}},
                ],
            }
        ],
        temperature=0.1,
        max_tokens=2048,
    )
    text = response.choices[0].message.content
    if not text or not text.strip():
        raise ValueError("图片中未提取到文字内容")
    return text
