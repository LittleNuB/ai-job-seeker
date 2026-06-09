from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

from app.config import PROJECT_ROOT
from app.schemas.pathfinder import OpenSourceProjectRecord


APPROVED_STATUS = "approved_for_trial_package"
OPENDOCUMENTS_PROJECT_ID = "opendocuments"

_PROJECT_FIXTURE = PROJECT_ROOT / "data" / "pathfinder" / "open-source-projects" / "opendocuments.json"

_DEFAULT_FORBIDDEN_CLAIMS = [
    "Do not claim the user contributed to the original OpenDocuments repository.",
    "Do not claim role fit, hiring probability, offer probability, candidate screening, or resume packaging.",
    "Do not claim real-time repository fetching, live RAG, or official project affiliation.",
]

_DEFAULT_ALLOWED_CONTEXTS = [
    "Public project reference only.",
    "Used to understand scenario, scope, task structure, and risk boundaries.",
    "Not a user contribution claim and not a hiring judgment.",
]

_DEFAULT_ROLE_PATH_IDS = [
    "industry-ai-product-assistant",
    "industry-ai-solution-assistant",
]

_DEFAULT_PROJECT_TAGS = ["document_qa", "knowledge_base"]
_DEFAULT_CAPABILITY_TAGS = [
    "requirement_breakdown",
    "qa_pair_design",
    "retrieval_boundary_design",
    "citation_and_source_display",
    "risk_boundary_documentation",
]
_DEFAULT_RISK_TAGS = ["attribution_risk", "real_runtime_claim_risk", "resume_packaging_risk"]


def list_approved_projects(
    *,
    role_path_id: str | None = None,
    capability_tag: str | None = None,
    status_filter: str | None = None,
) -> list[OpenSourceProjectRecord]:
    projects = [project for project in load_project_library() if _is_approved(project)]
    if status_filter and status_filter != APPROVED_STATUS:
        return []
    if role_path_id:
        projects = [project for project in projects if role_path_id in project.rolePathIds]
    if capability_tag:
        projects = [project for project in projects if capability_tag in project.capabilityTags]
    return projects


def get_approved_project(project_id: str) -> OpenSourceProjectRecord:
    for project in load_project_library():
        if project.projectId == project_id and _is_approved(project):
            return project
    raise ValueError("Selected project is not approved for trial package generation.")


@lru_cache(maxsize=1)
def load_project_library() -> tuple[OpenSourceProjectRecord, ...]:
    fixture = _load_fixture(_PROJECT_FIXTURE)
    return (_normalize_opendocuments(fixture),)


def _load_fixture(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as file:
        value = json.load(file)
    return value if isinstance(value, dict) else {}


def _normalize_opendocuments(raw: dict[str, Any]) -> OpenSourceProjectRecord:
    return OpenSourceProjectRecord(
        projectId=str(raw.get("projectId") or OPENDOCUMENTS_PROJECT_ID),
        name=str(raw.get("name") or "OpenDocuments"),
        sourceUrl=str(raw.get("sourceUrl") or "https://github.com/joungminsung/OpenDocuments"),
        host=raw.get("host") or "github",
        description=(
            "OpenDocuments is used as a manually reviewed public reference for document QA, "
            "knowledge-base assistant, citation display, and retrieval-boundary trial tasks."
        ),
        license=str(raw.get("license") or "MIT"),
        licenseSpdxId=raw.get("licenseSpdxId") or "MIT",
        licenseFileUrl=raw.get("licenseFileUrl"),
        licenseVerificationStatus=raw.get("licenseVerificationStatus") or "verified",
        lastManualCheckAt=raw.get("lastManualCheckAt"),
        referenceRole=raw.get("referenceRole") or "reference_only",
        status=raw.get("status") or APPROVED_STATUS,
        rolePathIds=list(raw.get("rolePathIds") or _DEFAULT_ROLE_PATH_IDS),
        projectTags=list(raw.get("projectTags") or _DEFAULT_PROJECT_TAGS),
        capabilityTags=list(raw.get("capabilityTags") or _DEFAULT_CAPABILITY_TAGS),
        riskTags=list(raw.get("riskTags") or _DEFAULT_RISK_TAGS),
        publicCapabilities=list(raw.get("publicCapabilities") or []),
        notClaimed=list(raw.get("notClaimed") or []),
        forbiddenClaims=list(raw.get("forbiddenClaims") or _DEFAULT_FORBIDDEN_CLAIMS),
        allowedContexts=list(raw.get("allowedContexts") or _DEFAULT_ALLOWED_CONTEXTS),
        needsReview=raw.get("status") != APPROVED_STATUS,
        generateEligible=_is_approved_raw(raw),
    )


def _is_approved(project: OpenSourceProjectRecord) -> bool:
    return (
        project.status == APPROVED_STATUS
        and project.referenceRole == "reference_only"
        and project.licenseVerificationStatus == "verified"
        and bool(project.licenseFileUrl)
        and bool(project.lastManualCheckAt)
    )


def _is_approved_raw(raw: dict[str, Any]) -> bool:
    return (
        raw.get("status") == APPROVED_STATUS
        and raw.get("referenceRole") == "reference_only"
        and raw.get("licenseVerificationStatus") == "verified"
        and bool(raw.get("licenseFileUrl"))
        and bool(raw.get("lastManualCheckAt"))
    )
