# Domain Docs

This file defines how engineering skills consume the repository's domain and design documentation before exploring or changing code.

## Before exploring, read these

- `CONTEXT.md` at the repository root for the canonical domain language.
- `DESIGN.md` at the repository root for stable product and architecture contracts.
- ADRs under `docs/adr/` that affect the area being changed.
- `docs/PRODUCT_DEFINITION.md` for product-positioning or evaluation work when it exists.

If an optional file does not exist, proceed without treating its absence as a blocker. Create or update domain documents only when terminology or decisions have actually been resolved.

## Layout

This is a single-context repository:

```text
/
├── AGENTS.md
├── CONTEXT.md
├── DESIGN.md
├── docs/
│   ├── agents/
│   └── adr/
├── backend/
└── frontend/
```

Do not introduce `CONTEXT-MAP.md` or per-package contexts unless the repository becomes a genuine multi-context monorepo.

## Use the glossary's vocabulary

When output names a domain concept in an issue, design proposal, hypothesis, schema, prompt, or test, use the term defined in `CONTEXT.md`. Do not drift to a synonym that the glossary explicitly avoids.

If a required concept is missing, first check whether existing language already covers it. If it is a durable new concept, update the glossary through domain-modeling work.

## Respect the design contract

New feature work must preserve the invariants in `DESIGN.md`. If a proposal conflicts with the design contract, surface the conflict explicitly and decide whether the proposal or the contract should change.

## Flag ADR conflicts

If work contradicts an accepted ADR, do not silently override it. Name the ADR and explain why reopening the decision may be justified.
