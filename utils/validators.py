"""输入校验工具"""


def validate_jd_text(text: str) -> tuple[bool, str]:
    """校验JD文本"""
    if not text or not text.strip():
        return False, "请输入岗位JD内容"
    if len(text.strip()) < 30:
        return False, "JD内容过短，请输入完整的岗位描述（至少30字）"
    if len(text) > 10000:
        return False, "JD内容过长，请精简到10000字以内"
    return True, ""


def validate_resume_text(text: str) -> tuple[bool, str]:
    """校验简历文本"""
    if not text or not text.strip():
        return False, "请输入简历内容"
    if len(text.strip()) < 50:
        return False, "简历内容过短，请输入更详细的简历（至少50字）"
    if len(text) > 15000:
        return False, "简历内容过长，请精简到15000字以内"
    return True, ""
