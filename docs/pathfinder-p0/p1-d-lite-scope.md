# 寻径星图 P1-D Lite Scope

Date: 2026-06-14
Submission deadline: 2026-06-14 17:00

## 1. Positioning

P1-D Lite moves Pathfinder from a fixed trial demo toward a low-friction AI role exploration product.

Core promise:

> The user uploads a resume or talks with AI about real experiences. Pathfinder generates a personal AI career star map, highlights several role star points worth exploring, and offers a low-barrier pilot task for the selected direction.

This version is for competition submission. It should improve the product experience without destabilizing the existing P1-C.1 backend and persistence path.

## 2. Product Decisions

### 2.1 Entry Experience

The default entry should no longer be a long manual form.

P1-D Lite entry should prioritize:

- resume upload entry;
- open-ended AI interview entry;
- editable extracted signal draft after upload or interview.

The existing manual fields may remain as an edit or fallback surface, but should not be the default first impression.

### 2.2 AI Interview

The AI interview is open-ended.

- It is not capped to a fixed number of turns.
- AI keeps asking until it believes enough signal exists.
- The user can stop at any time with a control such as "暂时够了，生成星图".
- The user can continue adding information later.
- Only user-confirmed signals can enter recommendation, star-map highlighting, and pilot-task generation.

The system should use a three-level readiness state:

- `ready`: enough information to generate a first star map;
- `suggested_more`: enough to proceed, but some signals are weak;
- `insufficient`: missing real experience or concrete user actions.

Self-awareness signals may influence ranking and explanation, but cannot independently decide a role recommendation.

### 2.3 Star Map

The star map is the core product surface.

P1-D Lite should use a stable 2.5D star-map workstation instead of full Three.js.

- Use 12 role star points in the first version.
- Group role star points by star fields.
- Highlight the top 3 role star points for the user.
- Allow users to click non-highlighted star points for exploration.
- Do not use scores, percentages, offer probability, certification, or employer screening language.

Three.js is deferred to a later productization version after competition submission.

### 2.4 Role Gap / Role Star Point

Internal concept: `岗位裂隙`.

User-facing concept: `岗位星点`.

A role star point must be supported by JD sample signals and taxonomy structure. LLM may help name, summarize, or simulate examples, but cannot replace JD evidence.

Each role star point should explain:

- related role names;
- common JD sample tasks;
- common tools or deliverables;
- migration entry points for the user;
- why it is highlighted or not highlighted;
- matching pilot task type.

### 2.5 Pilot Task Types

P1-D Lite introduces three pilot-task types:

1. Development role pilot:
   - audited open-source project reading and scenario adaptation;
   - output: project breakdown, scenario adaptation plan, technical boundary notes, interview follow-up preparation.

2. Product role pilot:
   - Vibe Coding prototype pilot;
   - output: prototype concept, PRD summary, user flow, acceptance indicators, iteration checklist.

3. Operations role pilot:
   - AI tool experience-camp operations pilot;
   - output: target audience, event rhythm, content calendar, AI tool tasks, feedback loop, conversion or review indicators, risk boundary.

### 2.6 Result Page

The result page should become an `适航成果包`, not a Markdown-first report.

The result should include:

- role star point conclusion and supporting evidence;
- pilot outcome package based on selected task type;
- evidence chain and boundaries;
- 3-day or 7-day next polishing plan.

Markdown or PDF is an export format, not the primary product result.

## 3. P1-D Lite Implementation Scope

For 2026-06-14 competition submission, implement only a stable product-direction upgrade.

Recommended scope:

1. Home / entry:
   - show resume upload and AI interview as primary entry choices;
   - demote long manual form to signal editing or fallback.

2. Background / interview:
   - keep existing P1-C interview API;
   - add user-controlled stop/proceed action;
   - show signal readiness state.

3. Recommendation:
   - redesign into a 2.5D role star-map surface;
   - show 12 role star points and top 3 highlighted points;
   - support click-to-explore details.

4. Pilot selection:
   - present three pilot task categories: development, product, operations;
   - keep existing open-source-project trial path usable for development;
   - add product and operations pilot copy/cards as guided next actions, without building full generators.

5. Result:
   - rename and reorder result page around `适航成果包`;
   - reuse existing data where needed;
   - keep Markdown export as secondary.

## 4. Explicit Non-Scope Before Submission

Do not implement:

- full Three.js star map;
- GitHub Search;
- real RAG retrieval;
- new database tables or Alembic migrations;
- full resume parsing pipeline rewrite;
- full generators for all three pilot task types;
- scoring, percentages, offer probability, certification, employer screening, or resume packaging;
- LLM-only role or project decisions;
- unreviewed open-source projects as full pilot packages.

## 5. Acceptance Criteria

P1-D Lite is acceptable for competition submission if:

- first screen no longer feels like a long form;
- user can enter via resume upload or AI interview;
- AI interview is open-ended and user can stop to generate the star map;
- recommendation page visually reads as a role star map;
- 12 role star points are visible or represented;
- top 3 role star points are highlighted with evidence;
- users can explore role star point details;
- three pilot-task types are visible and clearly tied to role demand;
- result page is framed as a pilot outcome package;
- anti-packaging and evidence-boundary language remains intact;
- existing Pathfinder E2E passes;
- no unrelated B-class dirty files are committed.

