from __future__ import annotations

from app.schemas.pathfinder import UserProfileInput, UserProfileSignal


def extract_profile_signals(user_profile: UserProfileInput) -> list[UserProfileSignal]:
    signals: list[UserProfileSignal] = []

    _append_list_signals(
        signals,
        category="industry_background",
        label="Industry background",
        source_field="industryBackground",
        values=user_profile.industryBackground,
    )
    _append_list_signals(
        signals,
        category="domain_material",
        label="Document and research experience",
        source_field="documentAndResearchExperience",
        values=user_profile.documentAndResearchExperience,
    )
    _append_list_signals(
        signals,
        category="communication",
        label="Project or communication experience",
        source_field="projectExperience",
        values=user_profile.projectExperience,
    )
    _append_list_signals(
        signals,
        category="technical_foundation",
        label="Technical foundation",
        source_field="technicalBasics",
        values=user_profile.technicalBasics,
    )
    _append_list_signals(
        signals,
        category="ai_tool_usage",
        label="AI tool usage",
        source_field="aiToolUsage",
        values=user_profile.aiToolUsage,
    )
    if user_profile.availableTimeWindow:
        signals.append(
            _signal(
                index=len(signals) + 1,
                category="career_constraint",
                label="Available time window",
                source_field="availableTimeWindow",
                evidence_text=user_profile.availableTimeWindow,
                confidence="rule_medium",
            )
        )
    for item in user_profile.careerConstraints:
        if isinstance(item, dict) and item:
            evidence = "; ".join(f"{key}: {value}" for key, value in item.items() if value)
            if evidence:
                signals.append(
                    _signal(
                        index=len(signals) + 1,
                        category="career_constraint",
                        label="Career constraint",
                        source_field="careerConstraints",
                        evidence_text=evidence,
                        confidence="rule_medium",
                    )
                )

    if not signals:
        signals.append(
            _signal(
                index=1,
                category="risk",
                label="Insufficient profile signal",
                source_field="userProfile",
                evidence_text="No usable background signal was provided in the submitted profile.",
                confidence="needs_user_clarification",
            )
        )

    return signals


def _append_list_signals(
    signals: list[UserProfileSignal],
    *,
    category: str,
    label: str,
    source_field: str,
    values: list[str],
) -> None:
    for value in values:
        text = str(value).strip()
        if not text:
            continue
        signals.append(
            _signal(
                index=len(signals) + 1,
                category=category,
                label=label,
                source_field=source_field,
                evidence_text=text,
                confidence="rule_high",
            )
        )


def _signal(
    *,
    index: int,
    category: str,
    label: str,
    source_field: str,
    evidence_text: str,
    confidence: str,
) -> UserProfileSignal:
    return UserProfileSignal(
        signalId=f"profile-signal-{index}",
        category=category,  # type: ignore[arg-type]
        label=label,
        sourceField=source_field,
        evidenceText=evidence_text,
        confidence=confidence,  # type: ignore[arg-type]
    )
