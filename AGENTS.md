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

- Start from a concrete target role or JD.
- Accept candidate-provided statements as the working input; do not require external proof in the primary workflow.
- Strengthen selection, framing, specificity, and relevance without silently adding a new material fact.
- Ask or mark an open detail when responsibility, technology, scale, causality, or outcome has not been supplied.
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
- Add database changes through Alembic migrations. Do not edit an applied migration to represent a new change.
- Keep SQLite development behavior and PostgreSQL deployment behavior compatible.
- Preserve user ownership checks on every record, conversation, export, and application-state query.

## AI behavior and prompts

- Prompt changes are product changes. Version or otherwise identify prompts used by evaluation runs.
- Ask one high-information question at a time.
- Generate `Steady`, `Competitive`, and `Stretch` claims from one shared Base Fact set.
- Explain material differences between expression levels.
- Never fabricate a metric or silently promote participation into sole ownership.
- Prefer a marked Open Detail over an invented number, technology, responsibility, or outcome.
- Generate interview follow-ups from the claim the user actually selected.
- Treat model evaluation as decision support, not proof of recruiter preference or hiring outcomes.

## Data and privacy

- Treat resumes, JDs, chat messages, and application outcomes as private user data.
- Store only what the workflow requires and scope persisted data to its owner.
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
