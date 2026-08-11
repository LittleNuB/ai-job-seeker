# Architecture Decision Records

Use an Architecture Decision Record for a durable decision that has meaningful alternatives, affects more than one change, or would otherwise be repeatedly rediscovered.

Do not create an ADR for routine implementation details, temporary experiments, or unresolved ideas. Put those in the relevant GitHub Issue.

## Naming

Use a four-digit sequence and a short kebab-case title:

```text
0001-persist-application-snapshots-as-json.md
0002-inject-model-provider-adapter.md
```

## Required sections

```markdown
# ADR-NNNN: Decision title

Status: Proposed | Accepted | Superseded | Rejected
Date: YYYY-MM-DD

## Context

What forces and constraints require a decision?

## Decision

What is being decided?

## Consequences

What becomes easier, harder, required, or intentionally unsupported?

## Alternatives considered

What credible alternatives were rejected, and why?
```

Accepted ADRs are not edited to reverse their decision. Create a new ADR that supersedes the old one and link both records.

## Records

- [ADR-0001: Use a deterministic AI workflow for the product core](./0001-deterministic-application-workflow.md)
- [ADR-0002: Store reusable experience facts in a versioned library](./0002-versioned-experience-library.md) — superseded by ADR-0003
- [ADR-0003: Preserve application history with source snapshots](./0003-use-application-source-snapshots.md)
- [ADR-0004: Separate employment context from claim-source items](./0004-separate-experience-entries-and-items.md)
- [ADR-0005: Preserve claims when their source changes](./0005-preserve-claims-after-source-change.md)
