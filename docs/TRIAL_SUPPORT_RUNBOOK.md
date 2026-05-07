# Trial Support Runbook

This runbook is for the person operating the trusted MVP trial.

## Daily Checks

- Confirm `/api/health` is healthy.
- Review error logs for model failures, upload failures, auth errors, and unexpected 500s.
- Confirm no logs contain full resume/JD/chat/prompt content or secrets.
- Review new feedback entries.
- Check whether any user requested deletion or data export help.
- Record notable model latency or timeout issues.

## When A User Reports A Problem

Collect:

- user email or account identifier;
- approximate time;
- workflow: JD analysis, resume match, upload, history, export, account, chat;
- browser/device;
- screenshot or error message if available;
- whether the issue involved sensitive data.

Do not ask users to send full resumes, private documents, API keys, cookies, or tokens in feedback channels.

## Common Issues

### Upload Fails

Check:

- file extension is supported: PDF, DOC, DOCX, JPG, JPEG, PNG;
- file size is below 10MB;
- MIME type matches the extension;
- backend `/api/files/upload` is reachable;
- user is logged in.

### Match Analysis Times Out

Check:

- current model provider status;
- `LLM_TIMEOUT_SECONDS`;
- input length of resume and optional JD;
- backend logs for timeout or JSON parsing failures.

Suggested user response:

```text
The model call timed out. Please retry once, or shorten the resume/JD text and run the match again.
```

### Empty Position Data

Check:

- backend is connected to the expected database;
- positions table has rows;
- frontend API base URL points to the expected backend;
- latest position import passed data quality checks.

### User Cannot Log In

Check:

- email/password typo;
- auth rate limit from repeated failed attempts;
- account was deleted;
- backend auth route errors.

Do not manually reset passwords in the database during the MVP trial unless the project owner explicitly approves.

### User Wants Data Removed

Preferred path:

1. Ask the user to use account deletion in the account center.
2. If only one record/chat should be removed, ask them to delete it from history.
3. Confirm whether the account center no longer shows the deleted data.

If manual intervention is needed, record the action outside git and avoid exposing raw resume/JD content.

## Escalation Triggers

Escalate and pause onboarding if:

- one user can see another user's records or chats;
- account deletion does not remove associated records;
- data export includes another user's data;
- logs contain full sensitive content or secrets;
- production CORS/HTTPS settings are misconfigured;
- model responses contain harmful or privacy-sensitive output patterns.

## Feedback Triage

Use these categories:

- `bug`: broken workflow or incorrect state;
- `model_quality`: irrelevant, generic, hallucinated, or poorly evidenced output;
- `latency`: slow or timeout-prone operation;
- `ux`: confusing copy, layout, or navigation;
- `data`: position data missing, duplicated, or low quality;
- `privacy`: consent, deletion, export, or sensitive-data concern.

Suggested priority:

- `P0`: data isolation, deletion/export failure, secret leak, trial-blocking outage.
- `P1`: core JD/match flow broken, frequent model timeout, upload unavailable.
- `P2`: confusing UX, low-quality result pattern, missing position data.
- `P3`: polish, copy tweaks, minor layout issues.

## End Of Trial Review

Summarize:

- number of trial users;
- number of JD analyses;
- number of resume matches;
- model provider and average latency;
- timeout/failure count;
- top 5 user pain points;
- top 5 model quality issues;
- recommended next work;
- go/no-go recommendation for broader beta.
