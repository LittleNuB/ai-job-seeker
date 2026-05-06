# MVP Release Plan

## Goal

Ship a small-scope trial version of AI Job Copilot for trusted users within about 2 weeks.

The MVP should be good enough for real resume/JD workflows, but it is not a broad public launch. The priority is to validate product value, model quality, and operating cost while keeping user data handling controlled.

## Target Users

- Small trusted trial group.
- Users who understand this is an AI-assisted job-seeking tool, not career/legal/employment advice.
- Users who can provide feedback on result quality, latency, and confusing UX.

## Non-Goals

- No paid subscription or billing.
- No public self-serve growth campaign.
- No admin dashboard unless needed for support.
- No full multi-tenant enterprise controls.
- No complex resume versioning or job-application CRM yet.

## P0 Scope

These must be complete before inviting real trial users.

### Account And Data Rights

- Account center: done in `135ce41`.
- User data export.
- Account deletion.
- Analysis record deletion: mostly present through history records.
- Chat conversation deletion.
- Clear privacy policy and user agreement pages.
- Explicit disclosure that resume/JD content may be sent to third-party model providers.

### Security Minimum

- Production `JWT_SECRET` required and debug disabled: already guarded.
- Login rate limit or auth-specific throttling.
- File upload size and type limits.
- Avoid logging full resume/JD/model prompt content.
- HTTPS-only deployment.
- Production CORS allowlist.
- Environment variables documented for deployment.

### Product Stability

- Resume matching waiting, cancel, timeout, retry UX: done.
- Account/profile page: done.
- Standard full check command:

```powershell
.\scripts\check_all.ps1 -E2E -StartServices
```

- E2E should pass before trial release.

### Model Choice

- Use one default model for MVP if multi-model evaluation is not ready.
- Add a simple model config layer only if provider switching is needed during the trial.
- Record latency, timeout rate, and failure rate manually or in logs.

## Suggested 2-Week Schedule

### Week 1

- Day 1-2: user data export and account deletion.
- Day 3: chat deletion/history management.
- Day 4: privacy policy, user agreement, AI disclaimer.
- Day 5: login rate limit, upload limits, log redaction pass.

### Week 2

- Day 1-2: deployment packaging and environment docs.
- Day 3: model config sanity pass and timeout/fallback settings.
- Day 4: trial acceptance testing with realistic resumes/JDs.
- Day 5: bug fixes, release notes, trial onboarding instructions.

## MVP Acceptance Criteria

- A new user can register, log in, analyze JD, match resume, view history, export reports, and manage account data.
- A user can delete their account and request/export their stored data.
- A user can delete analysis/chat data they no longer want stored.
- Sensitive local files and test artifacts are not committed.
- Full verification passes:

```text
Backend pytest: pass
Frontend typecheck: pass
Frontend lint: pass
Frontend E2E: pass
```

- Privacy policy and user agreement are linked from the app.
- The app clearly states that AI outputs are for reference only.

## Trial Operating Rules

- Keep the trial user group small.
- Tell users not to upload unnecessary sensitive data.
- Track model provider, latency, failures, and user feedback.
- Manually review early support issues daily.
- Pause onboarding if deletion/export/security bugs appear.

## Risks

- Resume data is sensitive; even small-scope trial needs careful disclosure.
- Model output quality may be inconsistent for matching scores.
- Current local SQLite setup is not ideal for production scale.
- Existing `8000` local stale listener issue can confuse verification; use fresh deployment or non-conflicting ports.

## Reference

- Development log: `docs/DEVELOPMENT_LOG.md`
- Compliance gaps: `docs/COMPLIANCE_GAPS.md`
- Handoff notes: `docs/HANDOFF.md`
- Testing workflow: `docs/TESTING.md`
