from __future__ import annotations

import json
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from uuid import uuid4

from pydantic import ValidationError
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.application import TargetApplication
from ..models.experience_library import (
    ExperienceLibraryBaseFact,
    ExperienceLibraryEntry,
    ExperienceLibraryItem,
)
from ..prompts.claim_studio import (
    CLAIM_STUDIO_PROMPT_VERSION,
    build_claim_studio_prompts,
)
from ..prompts.claim_studio_review import (
    CLAIM_STUDIO_REVIEW_PROMPT_VERSION,
    build_claim_studio_review_prompts,
)
from ..prompts.target_analysis import (
    TARGET_ANALYSIS_PROMPT_VERSION,
    build_target_analysis_prompts,
)
from ..schemas.application import (
    AnalyzeTargetCommand,
    ApplicationBehaviorEventSnapshot,
    ApplicationListItem,
    ApplicationSnapshot,
    BaseFactSnapshot,
    ClaimSourceSnapshot,
    ClaimStudioModelOutput,
    ClaimStudioReviewModelOutput,
    ClaimStudioSnapshot,
    CompetitiveClaimSnapshot,
    EditResumeClaimCommand,
    ExperienceLibraryEntrySnapshot,
    ExperienceLibraryItemSnapshot,
    ExperienceLibraryLinkSnapshot,
    ExperienceLibrarySnapshot,
    ExperienceEntryContextSnapshot,
    ExperienceEntrySnapshot,
    ExperienceItemSnapshot,
    GenerateClaimsCommand,
    MergeExperienceItemsCommand,
    MoveExperienceItemCommand,
    PromptRunSnapshot,
    ReanalyzeClaimCommand,
    RecoverableAnalysisErrorSnapshot,
    ResumeSourceSnapshot,
    RoleSignalSnapshot,
    SaveTargetedResumeClaimsCommand,
    SaveExperienceToLibraryCommand,
    SourceChangeNoticeSnapshot,
    SplitExperienceItemCommand,
    StartApplicationCommand,
    TargetAnalysisModelOutput,
    TargetAnalysisSnapshot,
    TargetApplicationInputSnapshot,
    TargetedResumeExport,
    TargetedResumeClaimSnapshot,
    UpdateExperienceLibraryItemCommand,
)
from .application_model import (
    ApplicationModelError,
    ApplicationModelPort,
    ModelInvalidOutputError,
    get_application_model,
)


class ApplicationNotFoundError(Exception):
    pass


class ApplicationCommandError(Exception):
    pass


class ApplicationConflictError(Exception):
    pass


class ExperienceLibraryNotFoundError(Exception):
    pass


@dataclass(frozen=True)
class _CurrentClaimSource:
    item: ExperienceItemSnapshot
    entry_context: ExperienceEntryContextSnapshot | None


_SECTION_NAMES = {
    "工作经历": "employment",
    "实习经历": "employment",
    "职业经历": "employment",
    "employment": "employment",
    "work experience": "employment",
    "项目经历": "project",
    "个人项目": "project",
    "project experience": "project",
    "projects": "project",
    "教育经历": "ignored",
    "教育背景": "ignored",
    "学历信息": "ignored",
    "education": "ignored",
    "专业技能": "ignored",
    "技能清单": "ignored",
    "技能": "ignored",
    "skills": "ignored",
    "个人信息": "ignored",
    "个人简介": "ignored",
    "自我评价": "ignored",
    "summary": "ignored",
}
_BULLET_PREFIX = re.compile(r"^(?:[-*•·▪◦]|\d+[.)、])\s*")
_EXPERIENCE_ACTION_MARKERS = (
    "负责",
    "设计",
    "实现",
    "推动",
    "主导",
    "协同",
    "协作",
    "优化",
    "搭建",
    "建立",
    "完成",
    "开发",
    "运营",
    "led ",
    "built ",
    "designed ",
    "implemented ",
    "improved ",
    "launched ",
)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _new_id() -> str:
    return str(uuid4())


def _section_for(line: str) -> str | None:
    normalized = re.sub(r"[：:]$", "", line.strip()).lower()
    return _SECTION_NAMES.get(normalized)


def _is_bullet(line: str) -> bool:
    return bool(_BULLET_PREFIX.match(line.strip()))


def _bullet_text(line: str) -> str:
    return _BULLET_PREFIX.sub("", line.strip()).strip()


def _looks_like_experience_fact(line: str) -> bool:
    if not _is_bullet(line):
        return False
    lowered = f"{_bullet_text(line).lower()} "
    return any(marker in lowered for marker in _EXPERIENCE_ACTION_MARKERS)


def _parse_entry_header(line: str) -> tuple[str, str, str | None] | None:
    if "｜" in line or "|" in line:
        parts = [part.strip() for part in re.split(r"[｜|]", line) if part.strip()]
    elif "  " in line:
        parts = [part.strip() for part in re.split(r"\s{2,}", line) if part.strip()]
    else:
        return None
    if len(parts) < 2:
        return None
    return parts[0], parts[1], parts[2] if len(parts) > 2 else None


class _ResumeStructureBuilder:
    def __init__(self) -> None:
        self.entries: list[ExperienceEntrySnapshot] = []
        self.standalone_items: list[ExperienceItemSnapshot] = []
        self.section: str | None = None
        self.current_entry: ExperienceEntrySnapshot | None = None
        self.current_item: ExperienceItemSnapshot | None = None
        self.unplaced_lines: list[tuple[int, str]] = []

    def parse(self, resume_text: str) -> tuple[list[ExperienceEntrySnapshot], list[ExperienceItemSnapshot]]:
        for line_number, raw_line in enumerate(resume_text.splitlines(), start=1):
            line = raw_line.strip()
            if not line:
                continue
            section = _section_for(line)
            if section:
                self.section = section
                self.current_entry = None
                self.current_item = None
                continue
            if self.section == "employment":
                self._consume_employment_line(line_number, line)
            elif self.section == "project":
                self._consume_project_line(line_number, line)
            elif self.section is None:
                self.unplaced_lines.append((line_number, line))

        self._ensure_items_have_facts()
        if not self.entries and not self.standalone_items:
            facts = [
                self._fact(number, _bullet_text(line))
                for number, line in self.unplaced_lines
                if _looks_like_experience_fact(line)
            ]
            if facts:
                self.standalone_items.append(
                    ExperienceItemSnapshot(
                        id=_new_id(),
                        title="待整理经历",
                        entry_id=None,
                        base_facts=facts,
                    )
                )
        return self.entries, self.standalone_items

    def _consume_employment_line(self, line_number: int, line: str) -> None:
        header = _parse_entry_header(line)
        if header:
            entry_id = _new_id()
            self.current_entry = ExperienceEntrySnapshot(
                id=entry_id,
                organization=header[0],
                role=header[1],
                date_range=header[2],
                experience_items=[],
            )
            self.entries.append(self.current_entry)
            self.current_item = None
            return

        if self.current_entry is None:
            entry_id = _new_id()
            self.current_entry = ExperienceEntrySnapshot(
                id=entry_id,
                organization="待补充组织",
                role="待补充角色",
                experience_items=[],
            )
            self.entries.append(self.current_entry)

        if _is_bullet(line):
            if self.current_item is None:
                self.current_item = self._new_item("主要职责", self.current_entry.id)
                self.current_entry.experience_items.append(self.current_item)
            self.current_item.base_facts.append(self._fact(line_number, _bullet_text(line)))
            return

        self.current_item = self._new_item(line, self.current_entry.id)
        self.current_entry.experience_items.append(self.current_item)

    def _consume_project_line(self, line_number: int, line: str) -> None:
        if _is_bullet(line):
            if self.current_item is None or self.current_item.entry_id is not None:
                self.current_item = self._new_item("待命名项目", None)
                self.standalone_items.append(self.current_item)
            self.current_item.base_facts.append(self._fact(line_number, _bullet_text(line)))
            return

        self.current_entry = None
        self.current_item = self._new_item(line, None)
        self.standalone_items.append(self.current_item)

    @staticmethod
    def _new_item(title: str, entry_id: str | None) -> ExperienceItemSnapshot:
        return ExperienceItemSnapshot(
            id=_new_id(), title=title, entry_id=entry_id, base_facts=[]
        )

    @staticmethod
    def _fact(line_number: int, text: str) -> BaseFactSnapshot:
        return BaseFactSnapshot(
            id=_new_id(), text=text, source_location=f"resume:line:{line_number}"
        )

    def _ensure_items_have_facts(self) -> None:
        all_items = [
            *(item for entry in self.entries for item in entry.experience_items),
            *self.standalone_items,
        ]
        for item in all_items:
            if not item.base_facts:
                item.base_facts.append(
                    BaseFactSnapshot(
                        id=_new_id(),
                        text=item.title,
                        source_location="resume:proposed-item-title",
                    )
                )


class ApplicationStudio:
    def __init__(
        self, db: AsyncSession, model: ApplicationModelPort | None = None
    ) -> None:
        self.db = db
        self.model = model or get_application_model()

    async def execute(
        self,
        command: (
            StartApplicationCommand
            | MoveExperienceItemCommand
            | SplitExperienceItemCommand
            | MergeExperienceItemsCommand
            | AnalyzeTargetCommand
            | GenerateClaimsCommand
            | ReanalyzeClaimCommand
            | EditResumeClaimCommand
            | SaveTargetedResumeClaimsCommand
            | SaveExperienceToLibraryCommand
        ),
        *,
        owner_id: str,
        application_id: str | None = None,
    ) -> ApplicationSnapshot:
        if isinstance(command, StartApplicationCommand):
            if application_id is not None:
                raise ApplicationCommandError("创建投递不能指定已有投递")
            snapshot = await self._start(command, owner_id)
        elif isinstance(command, MoveExperienceItemCommand):
            if application_id is None:
                raise ApplicationCommandError("修正经历归属需要目标投递")
            snapshot = await self._move_item(command, owner_id, application_id)
        elif isinstance(command, SplitExperienceItemCommand):
            if application_id is None:
                raise ApplicationCommandError("拆分经历项目需要目标投递")
            snapshot = await self._split_item(command, owner_id, application_id)
        elif isinstance(command, MergeExperienceItemsCommand):
            if application_id is None:
                raise ApplicationCommandError("合并经历项目需要目标投递")
            snapshot = await self._merge_items(command, owner_id, application_id)
        elif isinstance(command, AnalyzeTargetCommand):
            if application_id is None:
                raise ApplicationCommandError("Target Analysis 需要目标投递")
            snapshot = await self._analyze_target(owner_id, application_id)
        elif isinstance(command, GenerateClaimsCommand):
            if application_id is None:
                raise ApplicationCommandError("Claim Studio 需要目标投递")
            snapshot = await self._generate_claims(owner_id, application_id)
        elif isinstance(command, ReanalyzeClaimCommand):
            if application_id is None:
                raise ApplicationCommandError("重新分析 Competitive Claim 需要目标投递")
            snapshot = await self._reanalyze_claim(command, owner_id, application_id)
        elif isinstance(command, EditResumeClaimCommand):
            if application_id is None:
                raise ApplicationCommandError("编辑 Resume Claim 需要目标投递")
            snapshot = await self._edit_resume_claim(command, owner_id, application_id)
        elif isinstance(command, SaveTargetedResumeClaimsCommand):
            if application_id is None:
                raise ApplicationCommandError("保存 Targeted Resume Version 需要目标投递")
            snapshot = await self._save_targeted_resume_claims(
                command, owner_id, application_id
            )
        elif isinstance(command, SaveExperienceToLibraryCommand):
            if application_id is None:
                raise ApplicationCommandError("保存到 Experience Library 需要目标投递")
            snapshot = await self._save_experience_to_library(
                command, owner_id, application_id
            )
        else:
            raise ApplicationCommandError("不支持的工作台命令")
        return await self._with_current_source_notices(snapshot, owner_id)

    async def get_snapshot(self, application_id: str, owner_id: str) -> ApplicationSnapshot:
        record = await self._get_record(application_id, owner_id)
        snapshot = ApplicationSnapshot.model_validate_json(record.snapshot_json)
        return await self._with_current_source_notices(snapshot, owner_id)

    async def list_applications(self, owner_id: str) -> list[ApplicationListItem]:
        result = await self.db.execute(
            select(TargetApplication)
            .where(TargetApplication.user_id == owner_id)
            .order_by(TargetApplication.updated_at.desc(), TargetApplication.created_at.desc())
        )
        items: list[ApplicationListItem] = []
        for record in result.scalars().all():
            snapshot = ApplicationSnapshot.model_validate_json(record.snapshot_json)
            item_count = len(snapshot.standalone_experience_items) + sum(
                len(entry.experience_items) for entry in snapshot.experience_entries
            )
            items.append(
                ApplicationListItem(
                    application_id=snapshot.application_id,
                    target_role=snapshot.target_application.target_role,
                    workflow_phase=snapshot.workflow_phase,
                    experience_item_count=item_count,
                    updated_at=snapshot.updated_at,
                )
            )
        return items

    async def get_experience_library(
        self, owner_id: str
    ) -> ExperienceLibrarySnapshot:
        entries = list(
            (
                await self.db.execute(
                    select(ExperienceLibraryEntry)
                    .where(ExperienceLibraryEntry.user_id == owner_id)
                    .order_by(
                        ExperienceLibraryEntry.updated_at.desc(),
                        ExperienceLibraryEntry.created_at.asc(),
                    )
                    .execution_options(populate_existing=True)
                )
            )
            .scalars()
            .all()
        )
        items = list(
            (
                await self.db.execute(
                    select(ExperienceLibraryItem)
                    .where(ExperienceLibraryItem.user_id == owner_id)
                    .order_by(
                        ExperienceLibraryItem.updated_at.desc(),
                        ExperienceLibraryItem.created_at.asc(),
                    )
                    .execution_options(populate_existing=True)
                )
            )
            .scalars()
            .all()
        )
        item_ids = [item.id for item in items]
        facts = (
            list(
                (
                    await self.db.execute(
                        select(ExperienceLibraryBaseFact)
                        .where(ExperienceLibraryBaseFact.item_id.in_(item_ids))
                        .order_by(ExperienceLibraryBaseFact.created_at.asc())
                        .execution_options(populate_existing=True)
                    )
                )
                .scalars()
                .all()
            )
            if item_ids
            else []
        )
        facts_by_item: dict[str, list[BaseFactSnapshot]] = {}
        for fact in facts:
            facts_by_item.setdefault(fact.item_id, []).append(
                BaseFactSnapshot(
                    id=fact.id,
                    text=fact.text,
                    source_location=fact.source_location,
                    library_base_fact_id=fact.id,
                )
            )

        item_snapshots = {
            item.id: ExperienceLibraryItemSnapshot(
                id=item.id,
                title=item.title,
                entry_id=item.entry_id,
                base_facts=facts_by_item.get(item.id, []),
                updated_at=item.updated_at.isoformat(),
            )
            for item in items
        }
        entry_snapshots = [
            ExperienceLibraryEntrySnapshot(
                id=entry.id,
                organization=entry.organization,
                role=entry.role,
                date_range=entry.date_range,
                experience_items=[
                    item_snapshots[item.id]
                    for item in items
                    if item.entry_id == entry.id
                ],
                updated_at=entry.updated_at.isoformat(),
            )
            for entry in entries
        ]
        standalone = [
            item_snapshots[item.id] for item in items if item.entry_id is None
        ]
        return ExperienceLibrarySnapshot(
            experience_entries=entry_snapshots,
            standalone_experience_items=standalone,
        )

    async def update_experience_library_item(
        self,
        command: UpdateExperienceLibraryItemCommand,
        owner_id: str,
    ) -> ExperienceLibrarySnapshot:
        item = (
            (
                await self.db.execute(
                    select(ExperienceLibraryItem).where(
                        ExperienceLibraryItem.id == command.experience_item_id,
                        ExperienceLibraryItem.user_id == owner_id,
                    )
                )
            )
            .scalars()
            .one_or_none()
        )
        if item is None:
            raise ExperienceLibraryNotFoundError

        facts = list(
            (
                await self.db.execute(
                    select(ExperienceLibraryBaseFact).where(
                        ExperienceLibraryBaseFact.item_id == item.id
                    )
                )
            )
            .scalars()
            .all()
        )
        facts_by_id = {fact.id: fact for fact in facts}
        if set(facts_by_id) != {fact.id for fact in command.base_facts}:
            raise ApplicationCommandError(
                "Experience Library 更新必须保留当前 Base Fact 集合"
            )

        if item.entry_id is None:
            if command.entry_context is not None:
                raise ApplicationCommandError("独立项目不能填写工作经历上下文")
        else:
            if command.entry_context is None:
                raise ApplicationCommandError("工作经历项目必须保留 Experience Entry 上下文")
            entry = (
                (
                    await self.db.execute(
                        select(ExperienceLibraryEntry).where(
                            ExperienceLibraryEntry.id == item.entry_id,
                            ExperienceLibraryEntry.user_id == owner_id,
                        )
                    )
                )
                .scalars()
                .one_or_none()
            )
            if entry is None:
                raise ExperienceLibraryNotFoundError
            entry.organization = command.entry_context.organization
            entry.role = command.entry_context.role
            entry.date_range = command.entry_context.date_range

        item.title = command.title
        for fact_input in command.base_facts:
            facts_by_id[fact_input.id].text = fact_input.text
        await self.db.commit()
        return await self.get_experience_library(owner_id)

    async def render_targeted_resume(
        self,
        application_id: str,
        owner_id: str,
        *,
        export_format: str,
    ) -> TargetedResumeExport:
        snapshot = await self.get_snapshot(application_id, owner_id)
        resume_claims = snapshot.targeted_resume_version.resume_claims
        if not resume_claims:
            raise ApplicationCommandError("请先显式保存至少一条 Resume Claim")

        if export_format == "text":
            content = "\n".join(
                [
                    f"{snapshot.target_application.target_role} · 目标简历",
                    "",
                    *(f"• {claim.resume_claim}" for claim in resume_claims),
                    "",
                ]
            )
            return TargetedResumeExport(
                content=content,
                media_type="text/plain",
                filename=f"targeted-resume-{application_id}.txt",
            )
        if export_format == "markdown":
            content = "\n".join(
                [
                    f"# {snapshot.target_application.target_role} · 目标简历",
                    "",
                    *(f"- {claim.resume_claim}" for claim in resume_claims),
                    "",
                ]
            )
            return TargetedResumeExport(
                content=content,
                media_type="text/markdown",
                filename=f"targeted-resume-{application_id}.md",
            )
        raise ApplicationCommandError("不支持的目标简历导出格式")

    async def _start(
        self, command: StartApplicationCommand, owner_id: str
    ) -> ApplicationSnapshot:
        entries, standalone_items = (
            _ResumeStructureBuilder().parse(command.resume_text)
            if command.resume_text
            else ([], [])
        )
        selected_links: list[ExperienceLibraryLinkSnapshot] = []
        selected_sources: list[ClaimSourceSnapshot] = []
        if command.library_experience_item_ids:
            library = await self.get_experience_library(owner_id)
            library_items = {
                item.id: item
                for entry in library.experience_entries
                for item in entry.experience_items
            }
            library_items.update(
                {item.id: item for item in library.standalone_experience_items}
            )
            missing_ids = [
                item_id
                for item_id in command.library_experience_item_ids
                if item_id not in library_items
            ]
            if missing_ids:
                raise ApplicationCommandError(
                    "选择的 Experience Library 项目不存在或不属于当前用户"
                )

            selected_ids = set(command.library_experience_item_ids)
            captured_at = _now_iso()

            def copy_library_item(
                item: ExperienceLibraryItemSnapshot,
                application_entry_id: str | None,
                library_entry_id: str | None,
                entry_context: ExperienceEntryContextSnapshot | None,
            ) -> ExperienceItemSnapshot:
                application_item_id = _new_id()
                copied_facts = [
                    BaseFactSnapshot(
                        id=_new_id(),
                        text=fact.text,
                        source_location=f"experience-library:base-fact:{fact.id}",
                        library_base_fact_id=fact.id,
                    )
                    for fact in item.base_facts
                ]
                copied_item = ExperienceItemSnapshot(
                    id=application_item_id,
                    title=item.title,
                    entry_id=application_entry_id,
                    source_scope="experience_library",
                    library_experience_item_id=item.id,
                    base_facts=copied_facts,
                )
                source_snapshot_id = _new_id()
                selected_sources.append(
                    ClaimSourceSnapshot(
                        id=source_snapshot_id,
                        prompt_run_id=None,
                        experience_item_id=application_item_id,
                        source_scope="experience_library",
                        library_experience_item_id=item.id,
                        item_title=item.title,
                        entry_context=entry_context,
                        base_facts=[
                            fact.model_copy(deep=True) for fact in copied_facts
                        ],
                        captured_at=captured_at,
                    )
                )
                selected_links.append(
                    ExperienceLibraryLinkSnapshot(
                        application_experience_item_id=application_item_id,
                        library_experience_item_id=item.id,
                        library_experience_entry_id=library_entry_id,
                        source_snapshot_id=source_snapshot_id,
                        relationship="selected_for_application",
                    )
                )
                return copied_item

            for library_entry in library.experience_entries:
                selected_items = [
                    item
                    for item in library_entry.experience_items
                    if item.id in selected_ids
                ]
                if not selected_items:
                    continue
                application_entry_id = _new_id()
                entry_context = ExperienceEntryContextSnapshot(
                    organization=library_entry.organization,
                    role=library_entry.role,
                    date_range=library_entry.date_range,
                )
                entries.append(
                    ExperienceEntrySnapshot(
                        id=application_entry_id,
                        organization=library_entry.organization,
                        role=library_entry.role,
                        date_range=library_entry.date_range,
                        experience_items=[
                            copy_library_item(
                                item,
                                application_entry_id,
                                library_entry.id,
                                entry_context,
                            )
                            for item in selected_items
                        ],
                    )
                )

            standalone_items.extend(
                copy_library_item(item, None, None, None)
                for item in library.standalone_experience_items
                if item.id in selected_ids
            )

        application_id = _new_id()
        created_at = _now_iso()
        snapshot = ApplicationSnapshot(
            application_id=application_id,
            target_application=TargetApplicationInputSnapshot(
                target_role=command.target_role, jd_text=command.jd_text
            ),
            resume_source=ResumeSourceSnapshot(text=command.resume_text),
            experience_entries=entries,
            standalone_experience_items=standalone_items,
            experience_library_links=selected_links,
            source_snapshots=selected_sources,
            created_at=created_at,
            updated_at=created_at,
        )
        self.db.add(
            TargetApplication(
                id=application_id,
                user_id=owner_id,
                snapshot_json=snapshot.model_dump_json(),
            )
        )
        await self.db.commit()
        return snapshot

    async def _move_item(
        self,
        command: MoveExperienceItemCommand,
        owner_id: str,
        application_id: str,
    ) -> ApplicationSnapshot:
        record = await self._get_record(application_id, owner_id)
        snapshot = ApplicationSnapshot.model_validate_json(record.snapshot_json)
        destination = None
        if command.destination_entry_id is not None:
            destination = next(
                (
                    entry
                    for entry in snapshot.experience_entries
                    if entry.id == command.destination_entry_id
                ),
                None,
            )
            if destination is None:
                raise ApplicationCommandError("目标工作经历不存在")

        selected_item, source_items = self._find_item(
            snapshot, command.experience_item_id
        )
        source_items.remove(selected_item)

        selected_item.entry_id = destination.id if destination else None
        if destination:
            destination.experience_items.append(selected_item)
        else:
            snapshot.standalone_experience_items.append(selected_item)

        snapshot.source_change_notices = self._source_change_notices(snapshot)
        return await self._save_snapshot(record, snapshot)

    async def _split_item(
        self,
        command: SplitExperienceItemCommand,
        owner_id: str,
        application_id: str,
    ) -> ApplicationSnapshot:
        record = await self._get_record(application_id, owner_id)
        snapshot = ApplicationSnapshot.model_validate_json(record.snapshot_json)
        source_item, source_items = self._find_item(snapshot, command.source_item_id)
        selected_ids = set(command.base_fact_ids)
        available_ids = {fact.id for fact in source_item.base_facts}
        if not selected_ids.issubset(available_ids):
            raise ApplicationCommandError("待拆分的 Base Fact 不属于该经历项目")
        if selected_ids == available_ids:
            raise ApplicationCommandError("拆分后原经历项目至少保留一条 Base Fact")

        split_facts = [fact for fact in source_item.base_facts if fact.id in selected_ids]
        source_item.base_facts = [
            fact for fact in source_item.base_facts if fact.id not in selected_ids
        ]
        new_item = ExperienceItemSnapshot(
            id=_new_id(),
            title=command.new_item_title,
            entry_id=source_item.entry_id,
            base_facts=split_facts,
        )
        source_index = source_items.index(source_item)
        source_items.insert(source_index + 1, new_item)
        snapshot.source_change_notices = self._source_change_notices(snapshot)
        return await self._save_snapshot(record, snapshot)

    async def _merge_items(
        self,
        command: MergeExperienceItemsCommand,
        owner_id: str,
        application_id: str,
    ) -> ApplicationSnapshot:
        if command.source_item_id == command.destination_item_id:
            raise ApplicationCommandError("经历项目不能与自身合并")
        record = await self._get_record(application_id, owner_id)
        snapshot = ApplicationSnapshot.model_validate_json(record.snapshot_json)
        source_item, source_items = self._find_item(snapshot, command.source_item_id)
        destination_item, _ = self._find_item(snapshot, command.destination_item_id)
        if source_item.entry_id != destination_item.entry_id:
            raise ApplicationCommandError("只能合并同一工作经历内的项目，跨经历请先调整归属")
        destination_item.base_facts.extend(source_item.base_facts)
        source_items.remove(source_item)
        snapshot.source_change_notices = self._source_change_notices(snapshot)
        return await self._save_snapshot(record, snapshot)

    async def _analyze_target(
        self, owner_id: str, application_id: str
    ) -> ApplicationSnapshot:
        initial_record = await self._get_record(application_id, owner_id)
        initial_snapshot = ApplicationSnapshot.model_validate_json(
            initial_record.snapshot_json
        )
        system_prompt, user_prompt = build_target_analysis_prompts(
            target_role=initial_snapshot.target_application.target_role,
            jd_text=initial_snapshot.target_application.jd_text,
        )
        run_id = _new_id()
        run_created_at = _now_iso()
        output: TargetAnalysisModelOutput | None = None
        failure_code: str | None = None
        failure_message: str | None = None

        try:
            raw_output = await self.model.generate_json(
                system_prompt=system_prompt, user_prompt=user_prompt
            )
            output = TargetAnalysisModelOutput.model_validate(raw_output)
            for signal in output.role_signals:
                if (
                    signal.source_type == "explicit"
                    and signal.jd_excerpt
                    not in initial_snapshot.target_application.jd_text
                ):
                    raise ModelInvalidOutputError("显式 Role Signal 引用的内容不在当前 JD 中")
        except ValidationError:
            failure_code = "invalid_output"
            failure_message = "模型返回的岗位信号格式不完整，请重试。"
        except ApplicationModelError as exc:
            failure_code = exc.code
            failure_message = self._analysis_error_message(exc.code)

        if output is None:
            if not (failure_code and failure_message):
                raise ApplicationCommandError("Target Analysis 未返回可保存的结果")

        return await self._save_analysis_outcome(
            application_id=application_id,
            owner_id=owner_id,
            output=output,
            failure_code=failure_code,
            failure_message=failure_message,
            run_id=run_id,
            run_created_at=run_created_at,
        )

    async def _save_analysis_outcome(
        self,
        *,
        application_id: str,
        owner_id: str,
        output: TargetAnalysisModelOutput | None,
        failure_code: str | None,
        failure_message: str | None,
        run_id: str,
        run_created_at: str,
    ) -> ApplicationSnapshot:
        # A model call can overlap with candidate edits. Compare-and-swap makes
        # the save atomic; on conflict, analysis-only fields are merged onto the
        # latest owner snapshot and retried without replaying the provider call.
        for attempt in range(3):
            await self.db.rollback()
            record = await self._get_record(application_id, owner_id)
            snapshot = ApplicationSnapshot.model_validate_json(record.snapshot_json)

            if failure_code and failure_message:
                snapshot.target_analysis = TargetAnalysisSnapshot(
                    status="failed",
                    last_error=RecoverableAnalysisErrorSnapshot(
                        code=failure_code,
                        message=failure_message,
                        retryable=True,
                    ),
                )
                run_status = "failed"
            else:
                if output is None:
                    raise ApplicationCommandError(
                        "Target Analysis 未返回可保存的结果"
                    )
                snapshot.role_signals = [
                    RoleSignalSnapshot(id=_new_id(), **signal.model_dump())
                    for signal in output.role_signals
                ]
                snapshot.target_analysis = TargetAnalysisSnapshot(
                    status="completed", last_error=None
                )
                snapshot.workflow_phase = "role_signal_review"
                run_status = "completed"

            snapshot.prompt_runs.append(
                PromptRunSnapshot(
                    id=run_id,
                    prompt_family="target_analysis",
                    prompt_version=TARGET_ANALYSIS_PROMPT_VERSION,
                    model_provider=self.model.provider_name,
                    model_name=self.model.model_name,
                    status=run_status,
                    error_code=failure_code,
                    created_at=run_created_at,
                )
            )
            try:
                return await self._save_snapshot(record, snapshot)
            except ApplicationConflictError:
                if attempt == 2:
                    raise

        raise ApplicationConflictError("投递内容刚刚发生变化，请重试")

    async def _generate_claims(
        self, owner_id: str, application_id: str
    ) -> ApplicationSnapshot:
        prepared_snapshot, prepared_sources, run_id, _ = (
            await self._prepare_claim_generation(owner_id, application_id)
        )
        claims, failure_code, failure_message, review_run = (
            await self._generate_and_review_claims(
                snapshot=prepared_snapshot,
                source_snapshots=prepared_sources,
                role_signals=prepared_snapshot.role_signals,
            )
        )
        return await self._save_claim_outcome(
            application_id=application_id,
            owner_id=owner_id,
            claims=claims,
            failure_code=failure_code,
            failure_message=failure_message,
            run_id=run_id,
            review_run=review_run,
            append_claims=False,
        )

    async def _reanalyze_claim(
        self,
        command: ReanalyzeClaimCommand,
        owner_id: str,
        application_id: str,
    ) -> ApplicationSnapshot:
        prepared_snapshot, prepared_sources, run_id = (
            await self._prepare_claim_reanalysis(command, owner_id, application_id)
        )
        original_claim = next(
            claim
            for claim in prepared_snapshot.competitive_claims
            if claim.id == command.claim_id
        )
        role_signals = [original_claim.primary_role_signal]
        claims, failure_code, failure_message, review_run = (
            await self._generate_and_review_claims(
                snapshot=prepared_snapshot,
                source_snapshots=prepared_sources,
                role_signals=role_signals,
            )
        )
        return await self._save_claim_outcome(
            application_id=application_id,
            owner_id=owner_id,
            claims=claims,
            failure_code=failure_code,
            failure_message=failure_message,
            run_id=run_id,
            review_run=review_run,
            append_claims=True,
        )

    async def _generate_and_review_claims(
        self,
        *,
        snapshot: ApplicationSnapshot,
        source_snapshots: list[ClaimSourceSnapshot],
        role_signals: list[RoleSignalSnapshot],
    ) -> tuple[
        list[CompetitiveClaimSnapshot] | None,
        str | None,
        str | None,
        PromptRunSnapshot | None,
    ]:
        system_prompt, user_prompt = build_claim_studio_prompts(
            target_role=snapshot.target_application.target_role,
            jd_text=snapshot.target_application.jd_text,
            role_signals=role_signals,
            source_snapshots=source_snapshots,
        )
        claims: list[CompetitiveClaimSnapshot] | None = None
        failure_code: str | None = None
        failure_message: str | None = None
        review_run: PromptRunSnapshot | None = None

        try:
            raw_output = await self.model.generate_json(
                system_prompt=system_prompt, user_prompt=user_prompt
            )
            output = ClaimStudioModelOutput.model_validate(raw_output)
            claims = self._validated_claim_snapshots(
                output=output,
                source_snapshots=source_snapshots,
                role_signals=role_signals,
            )
        except ValidationError:
            failure_code = "invalid_output"
            failure_message = self._claim_error_message(failure_code)
        except ApplicationModelError as exc:
            failure_code = exc.code
            failure_message = self._claim_error_message(exc.code)

        if claims:
            review_run = PromptRunSnapshot(
                id=_new_id(),
                prompt_family="claim_studio",
                prompt_version=CLAIM_STUDIO_REVIEW_PROMPT_VERSION,
                model_provider=self.model.provider_name,
                model_name=self.model.model_name,
                status="running",
                error_code=None,
                created_at=_now_iso(),
            )
            review_system_prompt, review_user_prompt = (
                build_claim_studio_review_prompts(
                    source_snapshots=source_snapshots,
                    claims=claims,
                )
            )
            try:
                raw_review = await self.model.generate_json(
                    system_prompt=review_system_prompt,
                    user_prompt=review_user_prompt,
                )
                review = ClaimStudioReviewModelOutput.model_validate(raw_review)
                if any(
                    any(index >= len(claims) for index in violation.claim_indexes)
                    for violation in review.violations
                ):
                    raise ModelInvalidOutputError(
                        "Claim Studio 审查引用了不存在的主张"
                    )
                review_run.status = "completed"
                if review.verdict == "rejected":
                    failure_code = "invalid_output"
                    failure_message = (
                        "独立审查发现竞争主张包含语义重复或来源未支持的事实升级，请重试。"
                    )
            except ValidationError:
                failure_code = "invalid_output"
                failure_message = "竞争主张独立审查返回的格式不完整，请重试。"
                review_run.status = "failed"
                review_run.error_code = "invalid_output"
            except ApplicationModelError as exc:
                failure_code = exc.code
                failure_message = self._claim_review_error_message(exc.code)
                review_run.status = "failed"
                review_run.error_code = exc.code

        if claims is None and not (failure_code and failure_message):
            raise ApplicationCommandError("Claim Studio 未返回可保存的结果")

        return claims, failure_code, failure_message, review_run

    async def _prepare_claim_reanalysis(
        self,
        command: ReanalyzeClaimCommand,
        owner_id: str,
        application_id: str,
    ) -> tuple[ApplicationSnapshot, list[ClaimSourceSnapshot], str]:
        record = await self._get_record(application_id, owner_id)
        snapshot = ApplicationSnapshot.model_validate_json(record.snapshot_json)
        current_sources = await self._current_claim_sources(snapshot, owner_id)
        snapshot.source_change_notices = self._source_change_notices(
            snapshot, current_sources=current_sources
        )
        claim = next(
            (
                candidate
                for candidate in snapshot.competitive_claims
                if candidate.id == command.claim_id
            ),
            None,
        )
        if claim is None:
            raise ApplicationCommandError("Competitive Claim 不存在")
        notice = next(
            (
                candidate
                for candidate in snapshot.source_change_notices
                if candidate.claim_id == claim.id
            ),
            None,
        )
        if notice is None:
            raise ApplicationCommandError("当前主张的来源没有变化，无需重新分析")
        if "source_removed" in notice.changed_dimensions:
            raise ApplicationCommandError("当前来源已被移除，无法重新分析")

        current_source = current_sources.get(claim.experience_item_id)
        if current_source is None:
            raise ApplicationCommandError("当前来源已被移除，无法重新分析")
        item = current_source.item
        entry_context = current_source.entry_context

        run_id = _new_id()
        run_created_at = _now_iso()
        source = ClaimSourceSnapshot(
            id=_new_id(),
            prompt_run_id=run_id,
            experience_item_id=item.id,
            source_scope=item.source_scope,
            library_experience_item_id=item.library_experience_item_id,
            item_title=item.title,
            entry_context=entry_context,
            base_facts=[fact.model_copy(deep=True) for fact in item.base_facts],
            captured_at=run_created_at,
        )
        snapshot.source_snapshots.append(source)
        snapshot.claim_studio = ClaimStudioSnapshot(status="running", last_error=None)
        snapshot.prompt_runs.append(
            PromptRunSnapshot(
                id=run_id,
                prompt_family="claim_studio",
                prompt_version=CLAIM_STUDIO_PROMPT_VERSION,
                model_provider=self.model.provider_name,
                model_name=self.model.model_name,
                status="running",
                error_code=None,
                created_at=run_created_at,
            )
        )
        saved = await self._save_snapshot(record, snapshot)
        return saved, [source], run_id

    async def _prepare_claim_generation(
        self, owner_id: str, application_id: str
    ) -> tuple[ApplicationSnapshot, list[ClaimSourceSnapshot], str, str]:
        record = await self._get_record(application_id, owner_id)
        snapshot = ApplicationSnapshot.model_validate_json(record.snapshot_json)
        if not snapshot.role_signals:
            raise ApplicationCommandError("请先完成 Target Analysis，再生成竞争主张")
        if snapshot.competitive_claims:
            raise ApplicationCommandError(
                "已有 Competitive Claim；来源变化后请从 Source Change Notice 明确重新分析"
            )

        current_sources = await self._current_claim_sources(snapshot, owner_id)
        if not current_sources:
            raise ApplicationCommandError("当前没有可用于 Claim Studio 的 Experience Item")

        run_id = _new_id()
        run_created_at = _now_iso()
        source_snapshots = self._capture_claim_sources(
            current_sources=current_sources,
            run_id=run_id,
            captured_at=run_created_at,
        )
        snapshot.source_snapshots.extend(source_snapshots)
        snapshot.claim_studio = ClaimStudioSnapshot(status="running", last_error=None)
        snapshot.prompt_runs.append(
            PromptRunSnapshot(
                id=run_id,
                prompt_family="claim_studio",
                prompt_version=CLAIM_STUDIO_PROMPT_VERSION,
                model_provider=self.model.provider_name,
                model_name=self.model.model_name,
                status="running",
                error_code=None,
                created_at=run_created_at,
            )
        )
        saved = await self._save_snapshot(record, snapshot)
        return saved, source_snapshots, run_id, run_created_at

    @staticmethod
    def _capture_claim_sources(
        *,
        current_sources: dict[str, _CurrentClaimSource],
        run_id: str,
        captured_at: str,
    ) -> list[ClaimSourceSnapshot]:
        return [
            ClaimSourceSnapshot(
                id=_new_id(),
                prompt_run_id=run_id,
                experience_item_id=current_source.item.id,
                source_scope=current_source.item.source_scope,
                library_experience_item_id=(
                    current_source.item.library_experience_item_id
                ),
                item_title=current_source.item.title,
                entry_context=current_source.entry_context,
                base_facts=[
                    fact.model_copy(deep=True)
                    for fact in current_source.item.base_facts
                ],
                captured_at=captured_at,
            )
            for current_source in current_sources.values()
        ]

    @staticmethod
    def _validated_claim_snapshots(
        *,
        output: ClaimStudioModelOutput,
        source_snapshots: list[ClaimSourceSnapshot],
        role_signals: list[RoleSignalSnapshot],
    ) -> list[CompetitiveClaimSnapshot]:
        sources_by_item = {
            source.experience_item_id: source for source in source_snapshots
        }
        signals_by_id = {signal.id: signal for signal in role_signals}
        claims: list[CompetitiveClaimSnapshot] = []
        for claim in output.competitive_claims:
            source = sources_by_item.get(claim.experience_item_id)
            if source is None:
                raise ModelInvalidOutputError(
                    "Competitive Claim 引用了本次输入之外的 Experience Item"
                )
            signal = signals_by_id.get(claim.primary_role_signal_id)
            if signal is None:
                raise ModelInvalidOutputError(
                    "Competitive Claim 引用了本次输入之外的 Role Signal"
                )
            available_fact_ids = {fact.id for fact in source.base_facts}
            if not set(claim.supported_base_fact_ids).issubset(available_fact_ids):
                raise ModelInvalidOutputError(
                    "Competitive Claim 引用了来源中不存在的 Base Fact"
                )
            claims.append(
                CompetitiveClaimSnapshot(
                    id=_new_id(),
                    source_snapshot_id=source.id,
                    experience_item_id=claim.experience_item_id,
                    source_focus=claim.source_focus,
                    opportunity_value=claim.opportunity_value,
                    supported_base_fact_ids=claim.supported_base_fact_ids,
                    primary_role_signal_id=signal.id,
                    primary_role_signal=signal.model_copy(deep=True),
                    competitive_claim=claim.competitive_claim,
                    selected_resume_claim=claim.competitive_claim,
                    selected_resume_claim_is_edited=False,
                    selected_resume_claim_updated_at=None,
                    stretch_direction=claim.stretch_direction,
                )
            )
        return claims

    async def _save_claim_outcome(
        self,
        *,
        application_id: str,
        owner_id: str,
        claims: list[CompetitiveClaimSnapshot] | None,
        failure_code: str | None,
        failure_message: str | None,
        run_id: str,
        review_run: PromptRunSnapshot | None,
        append_claims: bool,
    ) -> ApplicationSnapshot:
        # Source Snapshots and the running Prompt Run are saved before the
        # provider call. Merge only the result fields onto the latest snapshot
        # so concurrent candidate edits cannot be overwritten by a slow model.
        for attempt in range(3):
            await self.db.rollback()
            record = await self._get_record(application_id, owner_id)
            snapshot = ApplicationSnapshot.model_validate_json(record.snapshot_json)
            prompt_run = next(
                (run for run in snapshot.prompt_runs if run.id == run_id), None
            )
            if prompt_run is None:
                raise ApplicationConflictError("Claim Studio 运行记录不存在，请重试")

            if failure_code and failure_message:
                snapshot.claim_studio = ClaimStudioSnapshot(
                    status="failed",
                    last_error=RecoverableAnalysisErrorSnapshot(
                        code=failure_code,
                        message=failure_message,
                        retryable=True,
                    ),
                )
                if claims is None:
                    prompt_run.status = "failed"
                    prompt_run.error_code = failure_code
                else:
                    prompt_run.status = "completed"
                    prompt_run.error_code = None
            else:
                if claims is None:
                    raise ApplicationCommandError(
                        "Claim Studio 未返回可保存的结果"
                    )
                saved_claims = [claim.model_copy(deep=True) for claim in claims]
                if append_claims:
                    snapshot.competitive_claims.extend(saved_claims)
                else:
                    snapshot.competitive_claims = saved_claims
                snapshot.claim_studio = ClaimStudioSnapshot(
                    status="completed", last_error=None
                )
                snapshot.workflow_phase = "claim_review"
                prompt_run.status = "completed"
                prompt_run.error_code = None
                snapshot.source_change_notices = self._source_change_notices(
                    snapshot
                )

            if review_run is not None:
                snapshot.prompt_runs.append(review_run.model_copy(deep=True))

            try:
                return await self._save_snapshot(record, snapshot)
            except ApplicationConflictError:
                if attempt == 2:
                    raise

        raise ApplicationConflictError("投递内容刚刚发生变化，请重试")

    async def _edit_resume_claim(
        self,
        command: EditResumeClaimCommand,
        owner_id: str,
        application_id: str,
    ) -> ApplicationSnapshot:
        record = await self._get_record(application_id, owner_id)
        snapshot = ApplicationSnapshot.model_validate_json(record.snapshot_json)
        claim = next(
            (
                candidate
                for candidate in snapshot.competitive_claims
                if candidate.id == command.claim_id
            ),
            None,
        )
        if claim is None:
            raise ApplicationCommandError("Competitive Claim 不存在")

        claim.selected_resume_claim = command.resume_claim
        claim.selected_resume_claim_is_edited = (
            command.resume_claim != claim.competitive_claim
        )
        claim.selected_resume_claim_updated_at = _now_iso()
        return await self._save_snapshot(record, snapshot)

    async def _save_targeted_resume_claims(
        self,
        command: SaveTargetedResumeClaimsCommand,
        owner_id: str,
        application_id: str,
    ) -> ApplicationSnapshot:
        record = await self._get_record(application_id, owner_id)
        snapshot = ApplicationSnapshot.model_validate_json(record.snapshot_json)
        claims_by_id = {claim.id: claim for claim in snapshot.competitive_claims}
        missing_claim_ids = [
            claim_id for claim_id in command.claim_ids if claim_id not in claims_by_id
        ]
        if missing_claim_ids:
            raise ApplicationCommandError("待保存的 Competitive Claim 不存在")

        sources_by_id = {source.id: source for source in snapshot.source_snapshots}
        existing_by_source_claim_id = {
            claim.source_claim_id: claim
            for claim in snapshot.targeted_resume_version.resume_claims
        }
        saved_at = _now_iso()
        for claim_id in command.claim_ids:
            claim = claims_by_id[claim_id]
            source = sources_by_id.get(claim.source_snapshot_id)
            if source is None:
                raise ApplicationCommandError("Competitive Claim 的 Source Snapshot 不存在")
            if source.prompt_run_id is None:
                raise ApplicationCommandError(
                    "Competitive Claim 的 Source Snapshot 缺少 prompt-run 来源"
                )
            saved_claim = TargetedResumeClaimSnapshot(
                id=(
                    existing_by_source_claim_id[claim_id].id
                    if claim_id in existing_by_source_claim_id
                    else _new_id()
                ),
                source_claim_id=claim.id,
                resume_claim=claim.selected_resume_claim,
                experience_item_id=claim.experience_item_id,
                source_snapshot_id=claim.source_snapshot_id,
                primary_role_signal=claim.primary_role_signal.model_copy(deep=True),
                prompt_run_id=source.prompt_run_id,
                selected_resume_claim_is_edited=(
                    claim.selected_resume_claim_is_edited
                ),
                saved_at=saved_at,
            )
            if claim_id in existing_by_source_claim_id:
                index = snapshot.targeted_resume_version.resume_claims.index(
                    existing_by_source_claim_id[claim_id]
                )
                snapshot.targeted_resume_version.resume_claims[index] = saved_claim
            else:
                snapshot.targeted_resume_version.resume_claims.append(saved_claim)
            existing_by_source_claim_id[claim_id] = saved_claim

        snapshot.targeted_resume_version.updated_at = saved_at
        snapshot.behavior_events.append(
            ApplicationBehaviorEventSnapshot(
                id=_new_id(),
                event_type="claim_saved",
                claim_ids=command.claim_ids,
                created_at=saved_at,
            )
        )
        return await self._save_snapshot(record, snapshot)

    async def _save_experience_to_library(
        self,
        command: SaveExperienceToLibraryCommand,
        owner_id: str,
        application_id: str,
    ) -> ApplicationSnapshot:
        record = await self._get_record(application_id, owner_id)
        snapshot = ApplicationSnapshot.model_validate_json(record.snapshot_json)
        selected_items: list[ExperienceItemSnapshot] = []
        for item_id in command.experience_item_ids:
            item, _ = self._find_item(snapshot, item_id)
            selected_items.append(item)

        existing_links = {
            link.application_experience_item_id: link
            for link in snapshot.experience_library_links
        }
        entry_by_id = {entry.id: entry for entry in snapshot.experience_entries}
        library_entry_by_application_entry: dict[str, str] = {}
        for entry in snapshot.experience_entries:
            for item in entry.experience_items:
                link = existing_links.get(item.id)
                if link and link.library_experience_entry_id:
                    library_entry_by_application_entry[entry.id] = (
                        link.library_experience_entry_id
                    )
                    break

        for item in selected_items:
            if item.id in existing_links:
                continue

            library_entry_id: str | None = None
            if item.entry_id is not None:
                library_entry_id = library_entry_by_application_entry.get(item.entry_id)
                if library_entry_id is None:
                    entry = entry_by_id[item.entry_id]
                    library_entry_id = _new_id()
                    self.db.add(
                        ExperienceLibraryEntry(
                            id=library_entry_id,
                            user_id=owner_id,
                            organization=entry.organization,
                            role=entry.role,
                            date_range=entry.date_range,
                        )
                    )
                    library_entry_by_application_entry[item.entry_id] = (
                        library_entry_id
                    )

            library_item_id = _new_id()
            self.db.add(
                ExperienceLibraryItem(
                    id=library_item_id,
                    user_id=owner_id,
                    entry_id=library_entry_id,
                    title=item.title,
                )
            )
            for fact in item.base_facts:
                self.db.add(
                    ExperienceLibraryBaseFact(
                        id=_new_id(),
                        item_id=library_item_id,
                        text=fact.text,
                        source_location=fact.source_location,
                    )
                )
            link = ExperienceLibraryLinkSnapshot(
                application_experience_item_id=item.id,
                library_experience_item_id=library_item_id,
                library_experience_entry_id=library_entry_id,
                source_snapshot_id=None,
                relationship="saved_from_application",
            )
            snapshot.experience_library_links.append(link)
            existing_links[item.id] = link

        return await self._save_snapshot(record, snapshot)

    @staticmethod
    def _analysis_error_message(code: str) -> str:
        if code == "timeout":
            return "模型响应超时，现有投递内容已保留，请重试。"
        if code == "invalid_output":
            return "模型返回的岗位信号格式不完整，请重试。"
        return "模型服务暂时不可用，现有投递内容已保留，请稍后重试。"

    @staticmethod
    def _claim_error_message(code: str) -> str:
        if code == "timeout":
            return "竞争主张生成超时，已捕获的来源和现有主张均已保留，请重试。"
        if code == "invalid_output":
            return "模型返回的竞争主张格式或来源引用不完整，请重试。"
        return "模型服务暂时不可用，已捕获的来源和现有主张均已保留，请稍后重试。"

    @staticmethod
    def _claim_review_error_message(code: str) -> str:
        if code == "timeout":
            return "竞争主张独立审查超时，已捕获的来源和现有主张均已保留，请重试。"
        if code == "invalid_output":
            return "竞争主张独立审查返回的格式不完整，请重试。"
        return "竞争主张独立审查服务暂时不可用，已捕获的来源和现有主张均已保留，请稍后重试。"

    async def _with_current_source_notices(
        self, snapshot: ApplicationSnapshot, owner_id: str
    ) -> ApplicationSnapshot:
        current_sources = await self._current_claim_sources(snapshot, owner_id)
        snapshot.source_change_notices = self._source_change_notices(
            snapshot, current_sources=current_sources
        )
        return snapshot

    async def _current_claim_sources(
        self, snapshot: ApplicationSnapshot, owner_id: str
    ) -> dict[str, _CurrentClaimSource]:
        current_sources = self._application_claim_sources(snapshot)
        selected_links = [
            link
            for link in snapshot.experience_library_links
            if link.relationship == "selected_for_application"
        ]
        if not selected_links:
            return current_sources

        library = await self.get_experience_library(owner_id)
        library_sources: dict[
            str,
            tuple[
                ExperienceLibraryItemSnapshot,
                ExperienceEntryContextSnapshot | None,
            ],
        ] = {}
        for entry in library.experience_entries:
            context = ExperienceEntryContextSnapshot(
                organization=entry.organization,
                role=entry.role,
                date_range=entry.date_range,
            )
            library_sources.update(
                {item.id: (item, context) for item in entry.experience_items}
            )
        library_sources.update(
            {item.id: (item, None) for item in library.standalone_experience_items}
        )
        selection_sources = {
            source.id: source for source in snapshot.source_snapshots
        }

        for link in selected_links:
            application_current = current_sources.get(
                link.application_experience_item_id
            )
            selection_source = selection_sources.get(link.source_snapshot_id or "")
            library_current = library_sources.get(link.library_experience_item_id)
            if application_current is None or selection_source is None:
                continue
            if library_current is None:
                continue

            application_item = application_current.item
            application_context = application_current.entry_context
            library_item, library_context = library_current
            application_facts_by_library_id = {
                fact.library_base_fact_id: fact
                for fact in application_item.base_facts
                if fact.library_base_fact_id is not None
            }
            mapped_library_facts = [
                BaseFactSnapshot(
                    id=(
                        application_facts_by_library_id[fact.id].id
                        if fact.id in application_facts_by_library_id
                        else fact.id
                    ),
                    text=fact.text,
                    source_location=(
                        application_facts_by_library_id[fact.id].source_location
                        if fact.id in application_facts_by_library_id
                        else fact.source_location
                    ),
                    library_base_fact_id=fact.id,
                )
                for fact in library_item.base_facts
            ]
            current_item = application_item.model_copy(
                update={
                    "title": (
                        application_item.title
                        if application_item.title != selection_source.item_title
                        else library_item.title
                    ),
                    "base_facts": (
                        application_item.base_facts
                        if application_item.base_facts != selection_source.base_facts
                        else mapped_library_facts
                    ),
                },
                deep=True,
            )
            current_context = (
                application_context
                if application_context != selection_source.entry_context
                else library_context
            )
            current_sources[link.application_experience_item_id] = _CurrentClaimSource(
                item=current_item,
                entry_context=current_context,
            )
        return current_sources

    @staticmethod
    def _application_claim_sources(
        snapshot: ApplicationSnapshot,
    ) -> dict[str, _CurrentClaimSource]:
        current_sources: dict[str, _CurrentClaimSource] = {}
        for entry in snapshot.experience_entries:
            context = ExperienceEntryContextSnapshot(
                organization=entry.organization,
                role=entry.role,
                date_range=entry.date_range,
            )
            current_sources.update(
                {
                    item.id: _CurrentClaimSource(
                        item=item, entry_context=context
                    )
                    for item in entry.experience_items
                }
            )
        current_sources.update(
            {
                item.id: _CurrentClaimSource(item=item, entry_context=None)
                for item in snapshot.standalone_experience_items
            }
        )
        return current_sources

    @staticmethod
    def _source_change_notices(
        snapshot: ApplicationSnapshot,
        current_sources: dict[str, _CurrentClaimSource] | None = None,
    ) -> list[SourceChangeNoticeSnapshot]:
        sources_by_id = {source.id: source for source in snapshot.source_snapshots}
        if current_sources is None:
            current_sources = ApplicationStudio._application_claim_sources(snapshot)

        notices: list[SourceChangeNoticeSnapshot] = []
        for claim in snapshot.competitive_claims:
            captured = sources_by_id.get(claim.source_snapshot_id)
            if captured is None:
                continue
            current = current_sources.get(claim.experience_item_id)
            changed_dimensions: list[
                str
            ] = []
            if current is None:
                changed_dimensions.append("source_removed")
            else:
                current_item = current.item
                current_context = current.entry_context
                if current_item.title != captured.item_title:
                    changed_dimensions.append("item_title")
                if current_context != captured.entry_context:
                    changed_dimensions.append("entry_context")
                if current_item.base_facts != captured.base_facts:
                    changed_dimensions.append("base_facts")
            if changed_dimensions:
                notices.append(
                    SourceChangeNoticeSnapshot(
                        claim_id=claim.id,
                        source_snapshot_id=captured.id,
                        experience_item_id=claim.experience_item_id,
                        changed_dimensions=changed_dimensions,
                        message=(
                            "当前经历材料已变化；这条主张仍保留生成时的来源，"
                            "只有你明确重新分析时才会使用新材料。"
                        ),
                    )
                )
        return notices

    @staticmethod
    def _find_item(
        snapshot: ApplicationSnapshot, item_id: str
    ) -> tuple[ExperienceItemSnapshot, list[ExperienceItemSnapshot]]:
        item_collections = [
            *(entry.experience_items for entry in snapshot.experience_entries),
            snapshot.standalone_experience_items,
        ]
        for items in item_collections:
            item = next((candidate for candidate in items if candidate.id == item_id), None)
            if item is not None:
                return item, items
        raise ApplicationCommandError("经历项目不存在")

    async def _save_snapshot(
        self, record: TargetApplication, snapshot: ApplicationSnapshot
    ) -> ApplicationSnapshot:
        expected_snapshot_json = record.snapshot_json
        snapshot.updated_at = _now_iso()
        next_snapshot_json = snapshot.model_dump_json()
        result = await self.db.execute(
            update(TargetApplication)
            .where(
                TargetApplication.id == record.id,
                TargetApplication.user_id == record.user_id,
                TargetApplication.snapshot_json == expected_snapshot_json,
            )
            .values(snapshot_json=next_snapshot_json)
        )
        if result.rowcount != 1:
            await self.db.rollback()
            raise ApplicationConflictError("投递内容刚刚发生变化，请重试")
        await self.db.commit()
        return snapshot

    async def _get_record(self, application_id: str, owner_id: str) -> TargetApplication:
        result = await self.db.execute(
            select(TargetApplication)
            .where(
                TargetApplication.id == application_id,
                TargetApplication.user_id == owner_id,
            )
            .execution_options(populate_existing=True)
        )
        record = result.scalar_one_or_none()
        if record is None:
            raise ApplicationNotFoundError
        return record
