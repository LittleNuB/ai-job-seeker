# Pathfinder P1-B.1 Data Fixtures

Date: 2026-06-09

Task: DATA-004

## Scope

This fixture set implements the minimum P1-B.1 data surface only. It does not change runtime code, add migrations, add a real RAG pipeline, run live repository search, or add a black-box recommendation system.

## Files

- `data/pathfinder/role-paths/p1b-role-paths.json`
- `data/pathfinder/project-match-rules/p1b-rules.json`
- `data/pathfinder/trial-task-templates/opendocuments-product-assistant.json`
- `data/pathfinder/trial-task-templates/opendocuments-solution-assistant.json`
- `data/pathfinder/open-source-projects/opendocuments.json`

## Decisions

OpenDocuments remains the only `approved_for_trial_package` project in P1-B.1. It is still `reference_only`, MIT-licensed, and manually checked as of 2026-06-07.

The first taxonomy has four active trial role paths:

- `industry-ai-product-assistant`
- `industry-ai-solution-assistant`
- `ai-data-evaluation-assistant`
- `ai-application-ops-implementation-assistant`

`algorithm-llm-engineer` is retained only as an excluded risk path with `not_recommended_short_term` semantics. DATA-004 does not create a trial task template for it.

Other project areas are stored only as candidate project types with pending license and README verification. They cannot generate full trial packages until a public repository URL, license, README summary, manual checker, check date, attribution boundaries, allowed contexts, and review triggers are filled and reviewed.

## Template Coverage

P1-B.1 creates two approved trial task templates, both sourced only from OpenDocuments:

- `opendocuments-product-assistant`
- `opendocuments-solution-assistant`

No full template is generated for data evaluation, operations implementation, or algorithm and LLM engineering in this task.

## Guardrails

The fixtures keep the same P1-A/P1-B boundaries:

- no capability certification
- no employment outcome prediction
- no company or candidate screening
- no resume packaging
- no real repository RAG in P1-B.1
- no live repository search
- no black-box multi-project recommendation
- no public score, percentage, rank, or popularity-based recommendation

All visible conclusions should remain traceable to user-authorized input, sample JD trend references, a manually checked project record, and anti-packaging boundaries.
