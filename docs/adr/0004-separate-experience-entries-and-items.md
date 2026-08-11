# ADR-0004: Separate employment context from claim-source items

Status: Accepted
Date: 2026-08-10

## Context

A single internship or full-time role may contain several unrelated projects, responsibility areas, and outcomes. Treating the entire employment record as one claim source makes prompts coarse and provenance unclear. Flattening every project into an independent employment record would instead duplicate organization, role, and date context.

The product needs a reusable unit small enough for job-specific claim generation without importing a full project-dossier or evidence-management workflow.

## Decision

P0 will use two experience levels:

- `Experience Entry` is one internship or full-time employment container holding shared organization, role, and date context.
- `Experience Item` is one standalone project or one coherent project, responsibility module, or outcome story inside an Experience Entry. It is the smallest reusable source for Competitive Claims and owns its relevant Base Facts.

A standalone personal or public project can exist as an Experience Item without an employment parent. An Experience Entry with only one coherent story may contain one Experience Item; Claim Studio still receives the item rather than treating the entry as a different source type.

Resume import may propose Experience Item boundaries, and the user can correct the grouping. P0 does not require full project dossiers, evidence files, or a separate approval workflow.

## Consequences

Claim Studio can rank and trace precise stories while still inheriting the organization, role, and date context needed for readable resume wording. The Experience Library, import parser, Source Snapshot, and editing UI must preserve the parent-child relationship. Some imported resumes will have ambiguous boundaries, so the UI must allow lightweight correction without blocking first-pass generation.

## Alternatives considered

- Treat each internship or job as one Experience Item: rejected because multi-project roles become an undifferentiated source and produce weaker claim selection.
- Flatten every project into a complete employment record: rejected because it duplicates shared context and makes maintenance error-prone.
- Build full project dossiers with evidence and approval states: rejected because it exceeds P0's claim-generation needs and would import workflow complexity from a different product context.
