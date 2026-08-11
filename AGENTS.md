# AI Job Copilot Agent Guide

This file defines the operating rules for agents and contributors working in this repository. It is the project-level source of truth for how changes are explored, designed, implemented, and verified.

## Read before changing code

Read the smallest relevant set in this order:

1. `AGENTS.md` for project rules.
2. `CONTEXT.md` for the canonical domain language.
3. `DESIGN.md` for product and architecture invariants.
4. Relevant files under `docs/adr/` for accepted decisions.
5. The implementation and tests in the area being changed.

For product-positioning work, also read `docs/PRODUCT_DEFINITION.md` and `docs/COMPETITIVE_CAPABILITY_MATRIX.md` when they exist.

## Product scope

AI Job Copilot helps a candidate prepare one concrete AI-role application. It turns candidate-provided experience into stronger, job-relevant resume claims and interview stories.

- Start from concrete JD text. A role title or generic position profile may support browsing but cannot start the P0 Claim Studio.
- Accept candidate-provided statements as the working input; do not require external proof in the primary workflow.
- Strengthen selection, framing, specificity, and relevance without silently adding a new material fact.
- Mark an Open Detail or recommend a Stretch Direction when responsibility, technology, scale, causality, or outcome has not been supplied. Do not force a question during claim generation.
- Keep the candidate in control of the final wording.
- Do not turn this repository into a career-path, long-term learning-plan, recruiter-screening, or auto-apply product.
- Do not describe a score as an interview or hiring probability.

## Repository map

- `frontend/`: Next.js, React, TypeScript, Tailwind CSS, and Playwright tests.
- `backend/`: FastAPI, Pydantic, SQLAlchemy async, Alembic, and pytest.
- `data/`: versioned position and JD fixtures only; never store private resumes here.
- `docs/`: product, testing, deployment, compliance, agent, and ADR documentation.
- `scripts/`: repeatable validation, migration, smoke, seed, and release checks.
- `deploy/`: deployment and database operations.

## Change workflow

1. Verify the active checkout and branch before editing.
2. Inspect `git status` and preserve unrelated or user-authored changes.
3. Prefer a small vertical slice that proves one user outcome over broad speculative infrastructure.
4. Put behavior behind a deep module with a small interface. Keep provider, database, and transport details inside or behind justified adapters.
5. Add or update tests through the same interface used by callers.
6. Run the smallest relevant checks first, then the standard suite when the change is ready.
7. Update `CONTEXT.md`, `DESIGN.md`, or an ADR when a change introduces a durable term, invariant, or decision.

Do not commit, push, create a PR, rename the remote repository, or change external state unless the user explicitly authorizes that action.

## Architecture rules

- The frontend owns interaction and presentation; the backend owns persisted application state and product behavior.
- Keep model-provider code behind an injectable seam. Production and test adapters must exercise the same product interface.
- Validate structured model output with Pydantic before persistence or rendering.
- Do not let route handlers accumulate prompt, state-transition, and persistence logic. Route handlers translate transport requests into module commands.
- Do not use a generic chat transcript as the only source of application state. Facts, claims, user decisions, and workflow phase must be available as structured state.
- Keep the P0 product core in the deterministic `Application Studio` workflow defined by ADR-0001. The existing generic Agent Loop is not a core orchestrator.
- Keep reusable Experience Items and Base Facts in the owner-scoped Experience Library defined by ADR-0003. The user works with current saved content; Target Applications retain read-only Source Snapshots for historical stability.
- Model employment context and claim sources separately as defined by ADR-0004: an internship or full-time role is an Experience Entry, while each coherent project, responsibility module, or outcome story is an Experience Item. Standalone projects are Experience Items without a required employment parent.
- Resume import creates application-local draft facts that Claim Studio may use immediately. It never writes to the Experience Library until the user explicitly chooses to save it there.
- Add database changes through Alembic migrations. Do not edit an applied migration to represent a new change.
- Keep SQLite development behavior and PostgreSQL deployment behavior compatible.
- Preserve user ownership checks on every record, conversation, export, and application-state query.

## AI behavior and prompts

- Prompt changes are product changes. Version or otherwise identify prompts used by evaluation runs.
- Maintain separate prompt families for `Target Analysis`, `Claim Studio`, `Interview Rehearsal`, and `Interview Review`; do not collapse the product into one agent prompt.
- Do not interrogate the user to complete a claim. Recommend concise completion directions and let the user decide whether and how to add information.
- Generate one `Competitive Claim` from current Base Facts and a separate `Stretch Direction` that recommends how the user could strengthen it.
- Never render a `Stretch Direction` as though the missing detail were already part of the candidate's history.
- Treat user-edited claim text as authoritative. Never trigger a model rewrite or replace the edit unless the user explicitly requests re-analysis.
- Claim edits and Interview Rehearsal answers may yield Fact Update Proposals, but they never mutate the Experience Library automatically.
- Later Experience Library edits must not rewrite Source Snapshots already captured by Target Applications. Do not expose fact approval, hash gates, or a user-managed revision lifecycle in P0.
- If current source content changes after claim generation, preserve every generated or user-edited claim and show a non-blocking Source Change Notice. Only explicit re-analysis may call the model with the updated source or capture a new Source Snapshot.
- Never fabricate a metric or silently promote participation into sole ownership.
- Competitive Claim wording may compress, reorder, translate into job language, and use a stronger verb only when the Base Facts entail that action. It may not upgrade the category of ownership, causality, technology, scale, or outcome.
- Learn a Writing Preference Profile only from explicit saved-claim edits. Keep it owner-scoped, inspectable, editable, disableable, clearable, and limited to style; record the profile snapshot used by each generation.
- Prefer a marked Open Detail over an invented number, technology, responsibility, or outcome.
- In Interview Rehearsal, ask one adaptive follow-up at a time from the selected claim and answers already given. The AI decides whether another useful question remains and stops without filling a turn quota. Never reuse this behavior in claim completion.
- Continue Interview Rehearsal only while another question is likely to materially improve the story's context, personal role, key action or decision, result or limitation, Role Signal relevance, or internal coherence.
- Generate an Interview Review only after an explicit user request; never attach it automatically to the end of questioning.
- Interview Review uses qualitative, answer-grounded feedback. Never produce an overall score, interview probability, or hiring probability.
- Treat model evaluation as decision support, not proof of recruiter preference or hiring outcomes.
- Run high-frequency prompt regression with a strong-model pairwise judge using a versioned rubric and randomized source-blind ordering. A model judge is a proxy; stage acceptance requires blind review by real candidates and relevant hiring or recruiting reviewers.

## Data and privacy

- Treat resumes, JDs, chat messages, and application outcomes as private user data.
- Store only what the workflow requires and scope persisted data to its owner.
- Keep P0 behavior metrics owner-scoped and local to the user's account or self-hosted instance. Never upload content or allegedly de-identified telemetry automatically.
- Evaluation samples require per-case authorization, user-initiated export, and manual de-identification before entering a shared dataset.
- Define P0 product telemetry through observable actions. `Saved Claim Rate` means the share of successful analyses where at least one Competitive Claim is explicitly saved into the Targeted Resume Version; never label that event as proof that the claim is useful.
- Never commit credentials, model keys, private resumes, user exports, or generated local databases.
- Do not read browser profiles, login state, unrelated files, or credentials.
- Document any new third-party data transmission and provide a failure path when the provider is unavailable.

## Validation

Use the project-level standard suite before a commit-ready handoff:

```powershell
.\scripts\check_all.ps1
```

Run focused checks during development:

```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest

cd ..\frontend
npx tsc --noEmit
npm run lint
```

Run Playwright when user-visible behavior changes:

```powershell
.\scripts\check_all.ps1 -E2E -StartServices
```

- Do not spend model quota in deterministic tests.
- Use an injected fake model adapter for product-state tests.
- Add E2E coverage for the representative happy path and important ownership or failure states.
- Report what was and was not tested; do not turn engineering checks into claims about user adoption or hiring outcomes.

## Documentation rules

- Use the canonical terms from `CONTEXT.md`; do not drift to avoided synonyms.
- Keep `DESIGN.md` focused on stable development contracts, not feature backlogs.
- Record durable, contested decisions as ADRs under `docs/adr/`.
- Put feature requirements and implementation tickets in GitHub Issues.
- Keep public product language grounded in implemented or explicitly proposed behavior.

## Agent skills

### Issue tracker

Issues and PRDs are tracked in this repository's GitHub Issues. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the canonical Matt Pocock triage labels. See `docs/agents/triage-labels.md`.

### Domain docs

This is a single-context repository. Read the root `CONTEXT.md`, `DESIGN.md`, and relevant ADRs before changing product behavior. See `docs/agents/domain.md`.
