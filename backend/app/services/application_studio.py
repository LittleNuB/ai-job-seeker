from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.application import TargetApplication
from ..schemas.application import (
    ApplicationListItem,
    ApplicationSnapshot,
    BaseFactSnapshot,
    ExperienceEntrySnapshot,
    ExperienceItemSnapshot,
    MoveExperienceItemCommand,
    ResumeSourceSnapshot,
    StartApplicationCommand,
    TargetApplicationInputSnapshot,
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
}
_BULLET_PREFIX = re.compile(r"^(?:[-*•·▪◦]|\d+[.)、])\s*")


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
            else:
                self.unplaced_lines.append((line_number, line))

        self._ensure_items_have_facts()
        if not self.entries and not self.standalone_items:
            facts = [self._fact(number, line) for number, line in self.unplaced_lines]
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
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def execute(
        self,
        command: StartApplicationCommand | MoveExperienceItemCommand,
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

        selected_item = None
        for entry in snapshot.experience_entries:
            for item in entry.experience_items:
                if item.id == command.experience_item_id:
                    selected_item = item
                    break
            if selected_item is not None:
                entry.experience_items = [
                    item for item in entry.experience_items if item.id != selected_item.id
                ]
                break

        if selected_item is None:
            selected_item = next(
                (
                    item
                    for item in snapshot.standalone_experience_items
                    if item.id == command.experience_item_id
                ),
                None,
            )
            if selected_item is not None:
                snapshot.standalone_experience_items = [
                    item
                    for item in snapshot.standalone_experience_items
                    if item.id != selected_item.id
                ]

        if selected_item is None:
            raise ApplicationCommandError("经历项目不存在")

        selected_item.entry_id = destination.id if destination else None
        if destination:
            destination.experience_items.append(selected_item)
        else:
            snapshot.standalone_experience_items.append(selected_item)

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
