from __future__ import annotations

import logging

from app.logging_config import RedactingFilter, redact_log_message


def test_redact_log_message_masks_common_sensitive_values():
    raw = (
        "Authorization: Bearer abc.def.ghi "
        "email=user@example.com "
        "phone=13800138000 "
        "api_key=secret-value"
    )

    redacted = redact_log_message(raw)

    assert "abc.def.ghi" not in redacted
    assert "user@example.com" not in redacted
    assert "13800138000" not in redacted
    assert "secret-value" not in redacted
    assert "Bearer [REDACTED]" in redacted
    assert "[EMAIL_REDACTED]" in redacted
    assert "[PHONE_REDACTED]" in redacted


def test_redact_log_message_masks_sensitive_text_fields():
    raw = {
        "resume_text": "candidate name phone work history long private resume",
        "jd_text": "private job description",
        "prompt": "system and user prompt content",
    }

    redacted = redact_log_message(raw)

    assert "candidate name" not in redacted
    assert "private job description" not in redacted
    assert "system and user prompt" not in redacted
    assert redacted.count("[REDACTED_TEXT]") >= 3


def test_redact_log_message_truncates_long_messages():
    redacted = redact_log_message("x" * 1400)

    assert len(redacted) < 1250
    assert redacted.endswith("[TRUNCATED]")


def test_redacting_filter_sanitizes_formatted_record():
    record = logging.LogRecord(
        name="test",
        level=logging.INFO,
        pathname=__file__,
        lineno=1,
        msg="login failed for %s with token=%s",
        args=("user@example.com", "secret-token-value"),
        exc_info=None,
    )

    assert RedactingFilter().filter(record)

    message = record.getMessage()
    assert "user@example.com" not in message
    assert "secret-token-value" not in message
    assert record.args == ()
