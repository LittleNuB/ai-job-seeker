# MVP Trial Acceptance Checklist

This checklist is for the trusted small-scope trial of AI Job Copilot. Run it before inviting trial users and again after meaningful changes to auth, model calls, matching, history, exports, or deployment.

## Release Candidate

- Branch:
- Commit:
- Environment:
- Backend URL:
- Frontend URL:
- Model provider:
- Chat model:
- Embedding model:
- Tester:
- Date:

## Automated Gate

Run the full local gate before manual acceptance:

```powershell
.\scripts\check_all.ps1 -E2E -StartServices
```

Expected result:

- Backend pytest: pass
- Frontend typecheck: pass
- Frontend lint: pass
- Frontend E2E: pass
- No local database, secrets, temporary files, or scraper raw outputs staged for commit unless explicitly intended

Optional live API acceptance script:

```powershell
python scripts\trial_accept.py --base-url http://127.0.0.1:8000 --no-color
```

By default this script skips JD analysis and resume matching to avoid model cost. To intentionally exercise the model runtime, record the provider/model and run:

```powershell
python scripts\trial_accept.py --base-url http://127.0.0.1:8000 --run-model-checks --model-provider glm --chat-model glm-4.7flashX --no-color
```

The result is written to `scripts/trial_accept_result.json`, which is ignored by git.

## Account And Consent

- New user can register with email, password, optional name, and terms/privacy consent.
- Registration is blocked when terms/privacy consent is not checked.
- User can log out and log back in.
- Protected pages redirect anonymous users to login and preserve `next`.
- Account center shows email, account metadata, and record statistics.
- Privacy policy and user agreement links are visible from auth/footer flows.
- AI/third-party model disclosure is visible before trial users provide real resume or JD content.

Result:

```text
Status:
Notes:
```

## JD Analysis Flow

Use a realistic JD with enough detail to exercise hidden needs and interview focus.

- User can paste JD text.
- User can upload a supported JD file if testing file upload.
- JD analysis completes without page reload.
- Result renders:
  - position overview;
  - surface requirements;
  - hidden needs;
  - interview focus;
  - report export action;
  - AI follow-up entry.
- Exported report downloads and contains the analyzed role/result.
- "Use this JD to match resume" carries JD context into the match page.
- Failure state is clear when backend/model fails.

Record:

```text
JD source:
Latency:
Output quality:
Confusing UI:
Errors:
```

## Resume Match Flow

Use a realistic resume and a target position from the current position database.

- User can choose a target position.
- User can paste resume text.
- User can upload a supported resume file if testing file upload.
- Optional JD context can be added.
- Waiting UI shows progress, elapsed time, and cancel action.
- Cancel stops the visible analysis state.
- Timeout/failure state provides retry guidance.
- Retry can successfully produce a result.
- Result renders:
  - total match score;
  - score breakdown;
  - core advantages;
  - capability gaps;
  - improvement plan;
  - report export action;
  - AI follow-up entry.
- Exported report downloads and contains the match result.

Record:

```text
Resume source:
Target position:
Latency:
Score reasonableness:
Evidence quality:
Actionability:
Errors:
```

## History And Data Rights

- History page lists only the current user's analysis records.
- User can open a JD analysis record detail.
- User can open a resume match record detail.
- User can delete an analysis record they no longer want stored.
- AI conversation history lists only the current user's conversations.
- User can expand a chat conversation.
- User can delete a chat conversation.
- Account data export downloads a JSON file containing account, analysis, and chat data.
- Account deletion requires explicit confirmation and clears the session.
- Deleted account cannot keep using an old token.

Result:

```text
Status:
Notes:
```

## Position Data

Use this section when DeepSeek or another agent updates the scraped position database.

- Position exploration page loads without empty-state regressions.
- Search returns relevant positions for common AI job keywords.
- Category filters still work.
- Position detail page renders major fields without blank/garbled sections.
- Resume match target dropdown includes newly imported positions.
- Semantic search falls back to keyword search if no model key or embedding model is configured.
- Startup/first search latency remains acceptable after new positions are imported.

Record:

```text
Position dataset source:
Position count:
Search latency:
Embedding index behavior:
Data quality issues:
```

## Model Runtime

- Effective model configuration is recorded for the trial run.
- `LLM_TIMEOUT_SECONDS` is lower than frontend match timeout.
- Model timeout or provider outage produces a retryable user-facing error.
- JSON parsing failures are not frequent in realistic JD/match cases.
- Latency and failure notes are recorded for each scenario.
- If `LLM_EMBEDDING_MODEL` is empty, semantic search gracefully uses keyword fallback.

Record:

```text
Provider:
Chat model:
Embedding model:
Average latency:
Timeouts:
Failures:
Estimated cost:
```

## Security And Deployment Smoke

- `/api/health` returns `{"status":"ok"}`.
- Production uses HTTPS frontend and backend origins.
- Production CORS allows only expected frontend origins.
- `APP_ENV=production` rejects weak `JWT_SECRET`.
- `DEBUG=false` in production.
- Upload rejects unsupported file types, empty files, mismatched MIME types, and files over 10MB.
- Logs do not contain full resume/JD/model prompt content, bearer tokens, API keys, phone numbers, or email addresses.

Result:

```text
Status:
Notes:
```

## Trial Decision

Use one of:

- `GO`: ready for a small trusted trial.
- `GO_WITH_NOTES`: ready, with known non-blocking issues documented below.
- `NO_GO`: do not invite users until blocking issues are fixed.

Decision:

```text
Decision:
Blocking issues:
Non-blocking issues:
Next owner:
```
