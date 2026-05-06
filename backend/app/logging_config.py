from __future__ import annotations

import logging
import re
from typing import Any

MAX_LOG_MESSAGE_LENGTH = 1200

REDACTION_PATTERNS: tuple[tuple[re.Pattern[str], str], ...] = (
    (re.compile(r"Bearer\s+[A-Za-z0-9._~+/=-]+", re.IGNORECASE), "Bearer [REDACTED]"),
    (re.compile(r"(api[_-]?key|secret|token)\s*[:=]\s*['\"]?[^,'\"\s}]+", re.IGNORECASE), r"\1=[REDACTED]"),
    (re.compile(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+"), "[EMAIL_REDACTED]"),
    (re.compile(r"(?<!\d)1[3-9]\d{9}(?!\d)"), "[PHONE_REDACTED]"),
)

SENSITIVE_FIELD_PATTERNS: tuple[re.Pattern[str], ...] = (
    re.compile(
        r"(?P<prefix>['\"]?(?:resume_text|jd_text|input_text|content|prompt|messages)['\"]?\s*[:=]\s*['\"])(?P<value>.*?)(?P<suffix>['\"])",
        re.IGNORECASE | re.DOTALL,
    ),
)


def redact_log_message(value: Any) -> str:
    text = str(value)
    for pattern in SENSITIVE_FIELD_PATTERNS:
        text = pattern.sub(lambda match: f"{match.group('prefix')}[REDACTED_TEXT]{match.group('suffix')}", text)

    for pattern, replacement in REDACTION_PATTERNS:
        text = pattern.sub(replacement, text)

    if len(text) > MAX_LOG_MESSAGE_LENGTH:
        text = f"{text[:MAX_LOG_MESSAGE_LENGTH]}...[TRUNCATED]"

    return text


class RedactingFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        record.msg = redact_log_message(record.getMessage())
        record.args = ()
        if record.exc_text:
            record.exc_text = redact_log_message(record.exc_text)
        return True


def configure_logging() -> None:
    root_logger = logging.getLogger()
    redacting_filter = RedactingFilter()

    if not root_logger.handlers:
        logging.basicConfig(
            level=logging.INFO,
            format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
        )

    root_logger.addFilter(redacting_filter)
    for handler in root_logger.handlers:
        handler.addFilter(redacting_filter)
