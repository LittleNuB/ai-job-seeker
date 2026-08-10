# Issue tracker: GitHub

Issues and PRDs for this repo live as GitHub issues. Use the `gh` CLI for all operations.

## Conventions

- **Create an issue**: `gh issue create --title "..." --body "..."`. Use a here-string or body file for multi-line bodies on PowerShell.
- **Read an issue**: `gh issue view <number> --comments`, also fetching labels when triage state matters.
- **List issues**: `gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'` with appropriate label and state filters.
- **Comment on an issue**: `gh issue comment <number> --body "..."`.
- **Apply or remove labels**: `gh issue edit <number> --add-label "..."` or `--remove-label "..."`.
- **Close**: `gh issue close <number> --comment "..."`.

Infer the repository from `git remote -v`; `gh` does this automatically when run inside this clone.

## Pull requests as a triage surface

**PRs as a request surface: no.** Set this to `yes` only if the repository later treats external PRs as feature requests.

When set to `yes`, PRs run through the same labels and states as issues, using the `gh pr` equivalents:

- **Read a PR**: `gh pr view <number> --comments` and `gh pr diff <number>`.
- **List external PRs for triage**: `gh pr list --state open --json number,title,body,labels,author,authorAssociation,comments`, then keep only `CONTRIBUTOR`, `FIRST_TIME_CONTRIBUTOR`, or `NONE` author associations.
- **Comment, label, or close**: `gh pr comment`, `gh pr edit --add-label` or `--remove-label`, and `gh pr close`.

GitHub shares one number space across issues and PRs. Resolve an ambiguous `#42` with `gh pr view 42`, then fall back to `gh issue view 42`.

## Skill operations

When a skill says **publish to the issue tracker**, create a GitHub issue.

When a skill says **fetch the relevant ticket**, run `gh issue view <number> --comments` and fetch labels.

## Wayfinding operations

The map is one issue and its tickets are child issues.

- **Map**: an issue labelled `wayfinder:map`, holding Notes, Decisions-so-far, and Fog.
- **Child ticket**: a GitHub sub-issue linked to the map and labelled `wayfinder:<type>`, where type is `research`, `prototype`, `grilling`, or `task`.
- **Fallback child link**: if sub-issues are unavailable, add the child to a task list in the map and put `Part of #<map>` at the top of the child body.
- **Blocking**: prefer GitHub's native issue dependencies. Use a `Blocked by: #<n>, #<n>` line only when native dependencies are unavailable.
- **Frontier**: choose the first open child in map order that has no open blocker and no assignee.
- **Claim**: `gh issue edit <number> --add-assignee @me`; claiming is the session's first external write.
- **Resolve**: comment with the answer, close the child, and append a context pointer to the map's Decisions-so-far.
