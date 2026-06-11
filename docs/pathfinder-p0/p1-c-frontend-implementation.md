# 寻径星图 P1-C.1 前端实现说明

## Scope

FE-003 implements the P1-C.1 pre-flight interview flow in the Pathfinder frontend.

- Adds an AI-assisted interview block on `/pathfinder/background`.
- Keeps manual background input as fallback.
- Calls the BE-003 interview APIs and normalizes backend session/extraction responses into frontend state.
- Requires user confirmation of extracted signals before entering the recommendation flow.
- Loads BE-004 audited project records at runtime and displays matched project cards without score, ranking, or probability.
- Preserves project license/source boundaries, including the Chatwoot enterprise-directory license boundary.

## State

The frontend state now includes:

- `interviewSessionId`
- `interviewMessages`
- `extractedSignals`
- `signalConfirmationStatus`
- `aiInterviewStatus`

These fields are persisted through the existing `sessionStorage` fallback. Initial state remains empty: no default user identity, no default interview answers, and no demo-user content.

## API Alignment

The client aligns with the BE-003 endpoints:

- `POST /api/pathfinder/interview/sessions`
- `GET /api/pathfinder/interview/sessions/{session_id}`
- `POST /api/pathfinder/interview/sessions/{session_id}/turns`
- `POST /api/pathfinder/interview/sessions/{session_id}/signals`
- `PUT /api/pathfinder/interview/sessions/{session_id}/confirmed-signals`

Backend response shapes are normalized in `frontend/src/features/pathfinder/api.ts`; backend-only fields and provider keys are not exposed to UI state.

## Product Behavior

- AI is framed as a signal organizer, not the decision maker.
- Extracted signals are editable and must be confirmed by the user before recommendation.
- Unconfirmed interview signals do not unlock the full recommendation page.
- If the interview API fails, local fallback generates editable signals from the user's own answer.
- GitHub Search, live scraping, scoring, ranking, probabilities, certifications, resume packaging, and official contribution claims are not added.

## Project Runtime

The recommendation page calls `/api/pathfinder/projects` and renders project cards from the audited project library. BE-004 currently supports seven approved, verified, `reference_only` projects. Trial package generation can use any matched approved project returned by the recommendation response.

OpenDocuments keeps its dedicated package. Other projects use the backend generic trial template while preserving the stable six question IDs (`project_understanding`, `role_connection`, `scenario_gap`, `application_solution`, `portfolio_extension`, `ai_usage_explanation`). Generic templates may change titles and prompts, but the frontend does not emit `mvp_plan` or `portfolio_boundary` as runtime answer IDs.

## FE-003 Amendment

The amend after review fixed two merge blockers:

- Runtime trial answer IDs are limited to the backend-compatible six question IDs.
- Trial, result, and Markdown output now read the selected `trialPackageCandidate.sourceProject` instead of hard-coding OpenDocuments.
- Markdown visible section titles use generic labels: `项目来源与 License` and `公开项目能力`.
- Markdown filenames include the selected project slug, for example `pathfinder-tester-chatwoot.md`.
- Chatwoot license boundary is covered by static and E2E assertions.

## Validation

Implemented/updated tests cover:

- AI interview available mock path.
- AI failure fallback.
- User editing and confirming extracted signals.
- Recommendation guard when signals are not confirmed.
- No default demo-user content.
- No GitHub Search UI.
- Multi-project runtime card rendering and Chatwoot license boundary retention.
- Dynamic generic trial question IDs.
