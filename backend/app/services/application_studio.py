from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from uuid import uuid4

from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.application import TargetApplication
from ..prompts.target_analysis import (
    TARGET_ANALYSIS_PROMPT_VERSION,
    build_target_analysis_prompts,
)
from ..schemas.application import (
    AnalyzeTargetCommand,
    ApplicationListItem,
    ApplicationSnapshot,
    BaseFactSnapshot,
    ExperienceEntrySnapshot,
    ExperienceItemSnapshot,
    MergeExperienceItemsCommand,
    MoveExperienceItemCommand,
    PromptRunSnapshot,
    RecoverableAnalysisErrorSnapshot,
    ResumeSourceSnapshot,
    RoleSignalSnapshot,
    SplitExperienceItemCommand,
    StartApplicationCommand,
    TargetAnalysisModelOutput,
    TargetAnalysisSnapshot,
    TargetApplicationInputSnapshot,
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
        ),
        *,
        owner_id: str,
        application_id: str | None = None,
    ) -> ApplicationSnapshot:
        if isinstance(command, StartApplicationCommand):
            if application_id is not None:
                raise ApplicationCommandError("创建投递不能指定已有投递")
            return await self._start(command, owner_id)
        if isinstance(command, MoveExperienceItemCommand):
            if application_id is None:
                raise ApplicationCommandError("修正经历归属需要目标投递")
            return await self._move_item(command, owner_id, application_id)
        if isinstance(command, SplitExperienceItemCommand):
            if application_id is None:
                raise ApplicationCommandError("拆分经历项目需要目标投递")
            return await self._split_item(command, owner_id, application_id)
        if isinstance(command, MergeExperienceItemsCommand):
            if application_id is None:
                raise ApplicationCommandError("合并经历项目需要目标投递")
            return await self._merge_items(command, owner_id, application_id)
        if isinstance(command, AnalyzeTargetCommand):
            if application_id is None:
                raise ApplicationCommandError("Target Analysis 需要目标投递")
            return await self._analyze_target(owner_id, application_id)
        raise ApplicationCommandError("不支持的工作台命令")

    async def get_snapshot(self, application_id: str, owner_id: str) -> ApplicationSnapshot:
        record = await self._get_record(application_id, owner_id)
        return ApplicationSnapshot.model_validate_json(record.snapshot_json)

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

    async def _start(
        self, command: StartApplicationCommand, owner_id: str
    ) -> ApplicationSnapshot:
        entries, standalone_items = _ResumeStructureBuilder().parse(command.resume_text)
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
        return await self._save_snapshot(record, snapshot)

    async def _analyze_target(
        self, owner_id: str, application_id: str
    ) -> ApplicationSnapshot:
        record = await self._get_record(application_id, owner_id)
        snapshot = ApplicationSnapshot.model_validate_json(record.snapshot_json)
        system_prompt, user_prompt = build_target_analysis_prompts(
            target_role=snapshot.target_application.target_role,
            jd_text=snapshot.target_application.jd_text,
        )
        run_id = _new_id()
        run_created_at = _now_iso()

        try:
            raw_output = await self.model.generate_json(
                system_prompt=system_prompt, user_prompt=user_prompt
            )
            output = TargetAnalysisModelOutput.model_validate(raw_output)
            for signal in output.role_signals:
                if (
                    signal.source_type == "explicit"
                    and signal.jd_excerpt not in snapshot.target_application.jd_text
                ):
                    raise ModelInvalidOutputError("显式 Role Signal 引用的内容不在当前 JD 中")
        except ValidationError:
            return await self._save_analysis_failure(
                record,
                snapshot,
                run_id=run_id,
                run_created_at=run_created_at,
                code="invalid_output",
                message="模型返回的岗位信号格式不完整，请重试。",
            )
        except ApplicationModelError as exc:
            return await self._save_analysis_failure(
                record,
                snapshot,
                run_id=run_id,
                run_created_at=run_created_at,
                code=exc.code,
                message=self._analysis_error_message(exc.code),
            )

        snapshot.role_signals = [
            RoleSignalSnapshot(id=_new_id(), **signal.model_dump())
            for signal in output.role_signals
        ]
        snapshot.target_analysis = TargetAnalysisSnapshot(
            status="completed", last_error=None
        )
        snapshot.workflow_phase = "role_signal_review"
        snapshot.prompt_runs.append(
            PromptRunSnapshot(
                id=run_id,
                prompt_family="target_analysis",
                prompt_version=TARGET_ANALYSIS_PROMPT_VERSION,
                model_provider=self.model.provider_name,
                model_name=self.model.model_name,
                status="completed",
                created_at=run_created_at,
            )
        )
        return await self._save_snapshot(record, snapshot)

    async def _save_analysis_failure(
        self,
        record: TargetApplication,
        snapshot: ApplicationSnapshot,
        *,
        run_id: str,
        run_created_at: str,
        code: str,
        message: str,
    ) -> ApplicationSnapshot:
        snapshot.target_analysis = TargetAnalysisSnapshot(
            status="failed",
            last_error=RecoverableAnalysisErrorSnapshot(
                code=code, message=message, retryable=True
            ),
        )
        snapshot.prompt_runs.append(
            PromptRunSnapshot(
                id=run_id,
                prompt_family="target_analysis",
                prompt_version=TARGET_ANALYSIS_PROMPT_VERSION,
                model_provider=self.model.provider_name,
                model_name=self.model.model_name,
                status="failed",
                error_code=code,
                created_at=run_created_at,
            )
        )
        return await self._save_snapshot(record, snapshot)

    @staticmethod
    def _analysis_error_message(code: str) -> str:
        if code == "timeout":
            return "模型响应超时，现有投递内容已保留，请重试。"
        if code == "invalid_output":
            return "模型返回的岗位信号格式不完整，请重试。"
        return "模型服务暂时不可用，现有投递内容已保留，请稍后重试。"

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
        snapshot.updated_at = _now_iso()
        record.snapshot_json = snapshot.model_dump_json()
        await self.db.commit()
        return snapshot

    async def _get_record(self, application_id: str, owner_id: str) -> TargetApplication:
        result = await self.db.execute(
            select(TargetApplication).where(
                TargetApplication.id == application_id,
                TargetApplication.user_id == owner_id,
            )
        )
        record = result.scalar_one_or_none()
        if record is None:
            raise ApplicationNotFoundError
        return record
