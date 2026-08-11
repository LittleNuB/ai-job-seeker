# ADR-0003: Preserve application history with source snapshots

Status: Accepted
Date: 2026-08-10
Supersedes: [ADR-0002](./0002-versioned-experience-library.md)

## Context

Candidates need to reuse projects, internships, work history, and Base Facts across Target Applications. The product must also prevent later library edits from silently changing historical claims or evaluation inputs. ADR-0002 addressed those needs with a versioned Experience Library, but further product review found that a user-managed fact revision lifecycle would import document-release complexity into a high-frequency editing product.

AI Job Copilot needs explicit control over what enters long-term memory and a stable record of what each application used. It does not need fact approval, content-hash gates, or a visible `Draft/Saved/Superseded` workflow in P0.

## Decision

P0 will provide an owner-scoped `Experience Library` that presents the current saved Experience Items and Base Facts. Resume imports remain local to their Target Application, and claim edits or Interview Rehearsal answers remain Fact Update Proposals, until the user explicitly chooses to save them to the library.

When application-local or Experience Library content is used to generate claims, the Target Application captures a read-only `Source Snapshot` containing the selected source content and provenance. Later edits update the current source or library content without rewriting snapshots already stored by earlier applications. Regeneration from updated content is explicit.

The persistence implementation may use opaque internal snapshot or revision identifiers. P0 does not expose revision management, rollback, approval states, content hashes, or a fact-release state machine to the user.

## Consequences

Users get a simple current-content library and one understandable save boundary. Historical applications, prompt runs, saved claims, and reviews remain reproducible enough for product use and evaluation. The Target Application stores some duplicated source data, and P0 intentionally offers no library revision browser or restore workflow.

The product must preserve ownership on library records and Source Snapshots. A later retention or deletion policy must explicitly decide how user deletion interacts with historical snapshots; this ADR does not silently choose that policy.

## Alternatives considered

- Use the user-managed revision lifecycle from ADR-0002: rejected for P0 because it adds state, terminology, and interaction cost without improving the primary claim workflow.
- Maintain one mutable global record and let applications read it live: rejected because historical output would change without user action and prompt evaluations would become irreproducible.
- Keep all facts inside individual Target Applications: rejected because candidates would repeatedly re-enter the same experience and the Experience Library would provide no value.
