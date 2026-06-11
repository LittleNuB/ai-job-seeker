# AGENTS.md

## Project Identity

This repository is the formal AI Job Copilot / 寻径星图 project.

Formal repository path:

`C:\Users\LittleNub\ai-job-seeker`

GitHub repository:

`https://github.com/LittleNuB/ai-job-seeker`

Do not treat `C:\Users\LittleNub\Documents\New project 2` as the formal repository. That directory is only a historical standalone Pathfinder snapshot.

## Product Direction

AI Job Copilot is no longer a generic resume optimizer. The current Pathfinder / 寻径星图 direction is:

> 基于真实用户背景，用可解释证据链帮助用户找到 AI 岗位试航路径，并生成可追溯作品集起点。

Pathfinder must avoid:

- 能力认证
- offer / 录用概率预测
- 企业筛选候选人
- 简历 / 履历包装
- 暗示用户参与 OpenDocuments 官方贡献
- 多项目黑箱推荐
- 真实 RAG 主链路
- 复杂评分或百分比展示
- LLM 决定路径、项目或结论

## Current Pathfinder Scope

P1-B.1 scope:

- Real user background input
- Rule-first path recommendation
- Audited open-source project matching
- TrialPackageCandidate generation
- OpenDocuments as the only approved user-visible project for full trial package
- P1-A 6-question trial, anti-packaging guard, Markdown export, and `analysis_records` persistence remain compatible

P1-B.1 does not add Alembic migrations or dedicated Pathfinder tables.

P1-C planning scope:

- AI may be used for structured pre-flight interview, follow-up questions, and candidate signal extraction.
- User-confirmed signals are required before path recommendation or trial package generation.
- LLMs must not directly decide final role paths, project eligibility, or employment conclusions.
- GitHub Search is deferred beyond P1-C.1; when introduced, search results must enter `needs_review` before any full trial package can be generated.
- OpenDocuments should become one project in an audited project library, not the permanent only product path.

## Repository Discipline

Before editing, every agent must run:

```powershell
git rev-parse --show-toplevel
git branch --show-current
git status --short --branch
```

Agents must confirm they are operating in the formal repo or an explicit worktree under:

`C:\Users\LittleNub\ai-job-seeker-worktrees\...`

Do not edit files from projectless Codex directories such as:

`C:\Users\LittleNub\Documents\Codex\...`

Do not edit the historical demo snapshot unless the user explicitly asks.

## Dirty File Protection

Do not stage, commit, revert, or modify these existing user / unrelated dirty files unless explicitly instructed:

- `README.md`
- `data/ai_job_copilot.db`
- `docs/DEVELOPMENT_LOG.md`
- `services/resume_service.py`
- `docs/AI_TRANSITION_COMPASS_PRD.md`
- `docs/product/*`

Never use `git add .` unless the entire dirty diff has been audited and confirmed relevant.

Use path-level staging.

## Cross-Process Delegation Rules

If using child Codex conversations:

1. Use project-bound or worktree-bound threads only.
2. Child thread names should use `职责+字母`, for example:
   - 前端开发A
   - 后端开发A
   - 数据方案A
   - QA验证A
3. Child threads must operate only in their assigned worktree.
4. Child threads must not push, create PRs, merge branches, or touch B-class dirty files.
5. Child threads must report back to the main Agent thread after completion.
6. If project-bound thread creation is unavailable, do not create a projectless coding thread. Provide the prompt to the user instead.

## Editing Rules

Use `apply_patch` for manual edits.

Do not overwrite whole project files from another repo or demo snapshot.

When integrating Pathfinder into the formal repo, migrate modules selectively. Do not replace:

- `frontend/src/app/layout.tsx` wholesale unless audited
- `frontend/src/app/page.tsx` wholesale unless audited
- `backend/app/main.py` wholesale
- `backend/app/config.py`
- `backend/app/database.py`
- `backend/requirements.txt`
- existing models or migrations

## Validation Commands

Standard project check:

```powershell
.\scripts\check_all.ps1
```

Frontend checks:

```powershell
cd frontend
npm run test:safety
npm run lint
npm run build
npm run test:e2e -- e2e/pathfinder.spec.ts
```

Backend checks:

```powershell
cd backend
python -m pytest
```

Optional full E2E with controlled ports:

```powershell
.\scripts\check_all.ps1 -E2E -StartServices -BackendPort 8010 -FrontendPort 3010 -E2EBaseUrl http://localhost:3010 -E2EWorkers 2
```

If full E2E fails outside Pathfinder, report the exact failing area. Do not claim full pass if only Pathfinder passed.

## Pathfinder Auth / Persistence

Pathfinder currently reuses `analysis_records`.

`X-User-Id` may exist only as a demo / development fallback. It must not be treated as production auth.

Formal auth integration should prefer the existing project auth dependency.

## Reporting

Final reports must include:

- branch
- commit hash and message
- files changed
- validation commands and results
- whether anything was pushed
- remaining risks
- whether forbidden scope was touched

Do not push unless explicitly instructed.
