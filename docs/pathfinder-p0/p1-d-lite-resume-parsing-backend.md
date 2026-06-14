# P1-D Lite Resume Parsing Backend

Date: 2026-06-14
Task: BE-006

## API

`POST /api/pathfinder/resume/parse`

Request:

- `multipart/form-data`
- `file`: uploaded resume file
- `source`: optional, currently only `resume_upload`

Supported file extensions:

- `.pdf`
- `.docx`
- `.doc`
- `.txt`
- `.md`

Limits:

- Maximum file size: 10MB
- Minimum extracted text length: 80 characters
- Model input is capped at 30,000 characters

Response fields:

- `source`
- `fileName`
- `fileType`
- `textLength`
- `modelProvider`
- `modelName`
- `modelStatus`: `ok`, `fallback`, or `error`
- `signals`: `ExtractedProfileSignal[]`
- `readiness`: `ready`, `suggested_more`, or `insufficient`
- `missingSignalTypes`
- `userMessage`

The API never returns the full extracted resume text.

## Signal Extraction

The API uses `DeepSeekInterviewClient.extract_resume_signals()` when a DeepSeek/OpenAI-compatible key is configured through the existing `DEEPSEEK_API_KEY` or `LLM_API_KEY` path.

The prompt is Chinese and restricts the model to extracting confirmable user background signals only. It explicitly forbids role, project, or company recommendations; scores; percentages; offer probability; certification; employer screening; resume packaging; and invented experience.

All model output is checked for forbidden keys and then converted through the existing `ExtractedProfileSignal` schema. Signals are always returned as `candidate`; users must confirm or edit them before recommendation.

## Fallback Behavior

If the model is unavailable, returns invalid JSON, emits forbidden fields, or returns invalid signal data, the API uses a conservative rule fallback. The fallback extracts limited candidate signals from visible resume lines and still requires user confirmation.

Readiness is computed from six signal groups:

- `background_source`
- `real_experience`
- `concrete_action`
- `tool_exposure`
- `career_goal`
- `constraint_or_self_awareness`

Missing `real_experience` or `concrete_action` forces `insufficient`.

## Scope Guard

BE-006 does not:

- create database tables or migrations
- save full resume text
- create recommendations or trial packages
- add GitHub Search or RAG
- score users or predict offers
- certify ability
- screen candidates for employers
- package or rewrite resumes
- touch frontend code

## Validation

Required validation:

- `cd backend && python -m pytest tests/test_pathfinder.py -q`
- `cd backend && python -m pytest`
- `git diff --check`
- `git ls-files --others --exclude-standard backend/alembic/versions`
