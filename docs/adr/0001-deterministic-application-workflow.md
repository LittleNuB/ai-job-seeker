# ADR-0001: Use a deterministic AI workflow for the product core

Status: Accepted
Date: 2026-08-10

## Context

AI Job Copilot has a bounded product path from a Target Application to Competitive Claims, Stretch Directions, Interview Rehearsal, and an on-demand Interview Review. The repository already contains a generic tool-calling Agent Loop, but it chooses tools from free-form chat, relies on chat history as state, and still reflects the former score-centered matching flow. The new product must support versioned prompts, structured output validation, owner-scoped state, recoverable transitions, and node-level evaluation.

## Decision

The P0 product core will use a deterministic `Application Studio` workflow controlled by product code, not an autonomous Agent Loop. It has four versioned prompt families: `Target Analysis`, `Claim Studio`, `Interview Rehearsal`, and `Interview Review`. The model may decide whether another Interview Rehearsal question has value, but it may not choose arbitrary tools, reorder product phases, or treat a chat transcript as canonical state. The existing `agent_engine` remains outside the product core and may later be retired or retained only as an auxiliary surface.

## Consequences

State transitions, retries, ownership, prompt versions, and evaluation artifacts become explicit and testable. The product gives up open-ended tool planning inside the core path and requires product code to define each supported transition. Introducing an Agent later requires a new decision tied to a genuinely open-ended, multi-tool task.

## Alternatives considered

- Reuse the existing Agent Loop for the new experience: rejected because free-form tool choice and transcript state make product behavior and prompt attribution difficult to evaluate and recover.
- Build a new end-to-end application Agent: rejected because the current workflow has known inputs, outputs, and transitions, so autonomous planning adds uncertainty without unlocking a required user outcome.
