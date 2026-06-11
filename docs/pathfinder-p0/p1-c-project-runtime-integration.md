# P1-C.1 Project Runtime Integration

## Scope

BE-004 connects the DATA-003 audited project library to the Pathfinder backend runtime. It keeps the existing `analysis_records` storage model and does not add tables, migrations, GitHub Search, RAG, scoring, certification, employer screening, or resume packaging.

## Runtime Data Sources

- Project library: `data/pathfinder/open-source-projects/*.json`
- Matching rules and generic trial template: `data/pathfinder/project-matching/p1c-project-library-matching.json`
- Dedicated legacy trial fixture retained for OpenDocuments: `data/pathfinder/trial-packages/p1a-opendocuments-engineering-kb.json`

`load_project_library()` now loads every JSON file in the audited project directory and normalizes each fixture into `OpenSourceProjectRecord`. User-visible and trial-generatable projects must pass all hard gates:

- `status == "approved_for_trial_package"`
- `licenseVerificationStatus == "verified"`
- `referenceRole == "reference_only"`
- `licenseFileUrl` present
- `lastManualCheckAt` present

`candidate`, `needs_review`, `retired`, non-verified license records, and non-reference-only records remain blocked from full trial package generation.

## API Behavior

`GET /api/pathfinder/projects` returns the currently approved audited project set and preserves existing filters:

- `rolePathId`
- `capabilityTag`
- `status`

The `status` filter only returns records for `approved_for_trial_package`; blocked statuses return an empty list instead of exposing non-generatable projects.

## Project Matching

Recommendation `projectMatches` now evaluates all approved audited projects against the P1-C.1 matching fixture. A project/path pair becomes `matched_for_trial` only when:

- the role path is allowed by the matching rule,
- the project id is eligible for the rule,
- required project tags are present,
- at least one required capability tag is present,
- required user/profile signal types are present,
- the role path decision is `priority_trial` or `explore`.

The result is a rule-hit explanation. The backend does not use repository stars, forks, commit counts, popularity, numeric fit metrics, ordered comparisons, hiring predictions, certification, or company screening.

## Trial Package Generation

OpenDocuments keeps the existing P1-A dedicated trial package fixture. Other approved projects use `genericTrialTemplate` from `p1c-project-library-matching.json`, producing the fixed six generic project questions:

1. `project_understanding`
2. `role_connection`
3. `scenario_gap`
4. `mvp_plan`
5. `portfolio_boundary`
6. `ai_usage_explanation`

Generated candidates preserve the selected project as `sourceProject`, include project-level `forbiddenClaims`, and add license/source boundary text to `sampleJdDisclaimer`. This is especially important for Chatwoot, whose MIT Expat boundary excludes the separately licensed enterprise directory.

## Verification Notes

Backend tests cover:

- `/projects` returns seven approved projects.
- `candidate` and `needs_review` statuses do not return generatable projects.
- role path and capability tag filters.
- recommendation returns multiple project matches without `score`, `ranking`, or `probability` in the response JSON.
- non-OpenDocuments trial package generation.
- Chatwoot license boundary retention.
- unaudited project rejection.

## Remaining Risks

- Project fixture license and source checks still require periodic data-owner revalidation.
- Matching signal detection is intentionally rule-first and conservative; product may later tune user-signal categories after observing real interview confirmations.
- UI exposure policy for showing all seven approved projects versus staged project cards remains a product decision.
