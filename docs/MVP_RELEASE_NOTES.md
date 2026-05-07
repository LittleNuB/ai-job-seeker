# MVP Trial Release Notes

Use this as the internal release note for a trusted small-scope trial. Fill in the release candidate fields before sharing.

## Release Candidate

- Branch:
- Commit:
- Release date:
- Frontend URL:
- Backend URL:
- Environment:
- Model provider:
- Chat model:
- Embedding model:
- Trial owner:

## Summary

This MVP trial lets trusted users:

- analyze job descriptions;
- match resumes against target positions;
- ask AI follow-up questions;
- view history;
- export analysis reports;
- export account data;
- delete records, chats, or the account.

The release is intended to validate product value, result quality, latency, and data handling before broader public launch.

## Included

### Core Product

- JD deep analysis with role overview, requirements, hidden needs, and interview focus.
- Resume matching with score breakdown, advantages, gaps, and improvement plan.
- Position exploration and search.
- AI follow-up panel attached to JD/match context.
- History page for analysis records and chat conversations.
- Report export for JD and match analyses.

### Account And Data Rights

- Registration and login.
- Account center.
- User data export.
- Account deletion.
- Analysis record deletion.
- Chat conversation deletion.
- Privacy policy and user agreement pages.
- Disclosure that resume/JD/chat content may be sent to third-party AI providers.

### Safety And Reliability

- Authenticated user scoping for protected data.
- Production JWT guardrails.
- Production CORS allowlist.
- HTTPS-only production middleware.
- Login/register throttling.
- File upload type and size guards.
- Sensitive log redaction.
- Resume-match waiting, cancel, timeout, and retry UX.
- Generic `LLM_*` model configuration with legacy `GLM_*` fallback.

### Verification

- Backend pytest coverage for auth, scoping, export, deletion, config, upload guards, logging redaction, and model config.
- Frontend E2E coverage for public pages, auth, session, protected redirects, history/account flows, match waiting/retry, result rendering, and report download.
- Standard verification command:

```powershell
.\scripts\check_all.ps1 -E2E -StartServices
```

## Not Included

- Public self-serve launch.
- Billing or subscription.
- Team/organization accounts.
- Admin/support dashboard.
- Password reset or password change.
- Production PostgreSQL migration and backup automation.
- Full legal/compliance review.
- Full multi-model evaluation and automatic fallback.

## Required Before Inviting Trial Users

- Complete `docs/MVP_TRIAL_ACCEPTANCE.md`.
- Record a `GO` or explicit `GO_WITH_NOTES` decision.
- Confirm no secrets, local DB files, raw user feedback, or unintended scraper artifacts are staged.
- Confirm trial frontend/backend URLs are HTTPS if users outside localhost will access them.
- Confirm the active model provider and timeout settings.
- Prepare feedback channel and owner.

## Known Risks

- Resume and JD data are sensitive.
- Model output may be incorrect, generic, or overconfident.
- Match scores are directional and should not be treated as hiring decisions.
- Long inputs may increase latency or trigger timeout/retry flows.
- SQLite remains local/dev-oriented and is not the long-term production database.
- Position data quality may vary while the scraped job database is being expanded.

## Trial Operating Rules

- Keep the trial group small.
- Tell users not to upload unnecessary sensitive data.
- Review feedback daily during the trial.
- Pause onboarding if account deletion, data export, auth scoping, or privacy disclosure bugs appear.
- Track model provider, latency, timeout rate, failure rate, and qualitative result feedback.

## Rollback / Stop Conditions

Stop or pause the trial if:

- users can access another user's data;
- account deletion or data export fails;
- secrets or sensitive data appear in logs;
- upload handling accepts unsafe file types;
- model provider outage causes widespread failures;
- trial users report privacy concerns that cannot be immediately addressed.

## Links

- MVP plan: `docs/MVP_RELEASE_PLAN.md`
- Trial acceptance: `docs/MVP_TRIAL_ACCEPTANCE.md`
- Trial feedback template: `docs/TRIAL_FEEDBACK_TEMPLATE.md`
- Deployment guide: `docs/DEPLOYMENT.md`
- Testing guide: `docs/TESTING.md`
- Handoff notes: `docs/HANDOFF.md`
