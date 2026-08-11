# ADR-0005: Preserve claims when their source changes

Status: Accepted
Date: 2026-08-10

## Context

Candidates may correct or strengthen an Experience Item or Base Fact after Claim Studio has generated a Competitive Claim, and library content may also change after a Target Application captures its Source Snapshot. Automatically regenerating would overwrite user work and spend model quota unexpectedly. Silently presenting the existing claim as based on updated facts would instead make its provenance misleading.

The product needs to acknowledge source drift without turning every edit into a blocking invalidation workflow.

## Decision

When current Experience Item or Base Fact content differs from the Source Snapshot behind an existing claim, the product keeps the generated or user-edited claim unchanged and shows a non-blocking `Source Change Notice`.

The change does not automatically call a model, replace the claim, delete it, mark it unusable, or move it to a newer Source Snapshot. Only an explicit re-analysis command generates from the updated source and captures the source used by that new model run. Existing claims retain their original provenance.

## Consequences

User edits remain safe, model calls stay intentional, and claim provenance remains understandable. The application state must compare current source selection with each claim's Source Snapshot and expose a notice through the same Application Studio snapshot used by the frontend. Tests must prove that a source edit makes no model call and preserves claim text, while explicit re-analysis uses the updated source.

The UI must explain the status without implying the claim is false. P0 does not require users to resolve the notice before copying, saving, exporting, or entering Interview Rehearsal.

## Alternatives considered

- Regenerate immediately after every source edit: rejected because it overwrites work, surprises the user, and spends model quota without an explicit request.
- Invalidate or delete the existing claim: rejected because a source change does not prove the claim is unusable and the user may intentionally keep its wording.
- Silently attach the claim to the newest source: rejected because the text was not generated from that source and historical provenance would be false.
