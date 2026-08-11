# ADR-0002: Store reusable experience facts in a versioned library

Status: Superseded
Date: 2026-08-10
Superseded by: [ADR-0003](./0003-use-application-source-snapshots.md)

This record preserves the original decision and rationale. ADR-0003 replaces its user-managed revision implications with a lighter current-library and application-snapshot model.

## Context

Candidates reuse the same projects, internships, and work history across multiple Target Applications. Keeping Base Facts inside each application would force repeated entry, while one mutable global record would let a later edit silently change historical claims and make prompt runs impossible to reproduce. Claim edits and Interview Rehearsal answers may also reveal useful facts, but generated text must not become candidate history automatically.

## Decision

P0 will provide an owner-scoped, versioned `Experience Library` containing Experience Items and Base Fact revisions. A Target Application explicitly selects library items and pins the exact fact revisions used for generation. Claim edits and Interview Rehearsal answers may produce a `Fact Update Proposal`, but only an explicit user save creates a new library revision. Existing Target Applications, saved claims, prompt runs, and reviews remain linked to their original revisions.

## Consequences

Users can reuse experience material without re-entering it, and historical output remains reproducible. The product must support item selection, revision identifiers, proposal review, and owner-scoped read/write/delete behavior. Updating the library does not cascade into earlier Target Applications; regenerating from newer facts is always an explicit action.

## Alternatives considered

- Keep facts inside each Target Application: rejected because it repeats work and prevents the intended cross-application reuse.
- Maintain one mutable global experience record: rejected because silent retroactive changes would break user control, auditability, and prompt evaluation.
- Automatically learn facts from saved claims or interview answers: rejected because model-inferred or rhetorically strengthened text must not silently become candidate history.
