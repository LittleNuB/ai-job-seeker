# Secure Public Release Plan

## Goal

Prepare AI Job Copilot for a broader public launch with stronger privacy, security, reliability, compliance, and operational readiness.

This plan is longer than the MVP plan. A realistic target is about 6-8 weeks after the MVP foundation is stable.

## Launch Standard

Public launch means unknown users may upload real resumes, JD content, chat messages, and career-related personal data. The system must therefore be designed for:

- clear user consent and disclosure;
- reliable account and data-rights workflows;
- hardened authentication and upload paths;
- production-grade database and backups;
- model cost and quality controls;
- monitoring and incident response.

## Compliance Baseline

This is a product engineering plan, not legal advice. Before public launch, have the final policy pages and data handling reviewed by a qualified legal/compliance professional.

Relevant public references:

- Personal information handling should support clear disclosure and user rights such as access, copy, correction, and deletion. See the Personal Information Protection Law reference maintained by SAMR: https://www.samr.gov.cn/zw/zfxxgk/fdzdgknr/bgt/art/2023/art_f374e8245320413181742e6d1baf4366.html
- Generative AI services should protect user input/use records and provide complaint/report handling. See the Interim Measures for Generative AI Services: https://www.miit.gov.cn/zcfg/qtl/art/2023/art_f4e8f71ae1dc43b0980b962907b7738f.html

## P0 Public Launch Requirements

### Privacy And User Rights

- Privacy policy, user agreement, model-provider disclosure, and AI disclaimer.
- Account deletion with cascading data deletion.
- User data export covering:
  - account metadata;
  - JD analysis records;
  - resume match records;
  - chat conversations/messages;
  - uploaded file metadata if retained.
- Deletion for individual analysis records and chat conversations.
- Data retention policy and implementation.
- Consent/notice before uploading resume/JD to third-party model APIs.

### Authentication And Account Security

- Login/register rate limiting.
- Password change.
- Password reset flow.
- Strong password validation.
- JWT/session strategy review:
  - consider HttpOnly secure cookies for browser sessions;
  - reduce localStorage token exposure if practical.
- Production-only HTTPS.
- Security headers through reverse proxy or app middleware.

### Data Security

- Migrate production DB from SQLite to PostgreSQL.
- Alembic migration process validated against production-like DB.
- Automated backups and restore test.
- Access-control review for every user-scoped endpoint.
- Sensitive-log redaction:
  - do not log full resume text;
  - do not log full JD text;
  - do not log model prompts/responses by default.
- File upload controls:
  - type allowlist;
  - size limits;
  - parser failure isolation;
  - malware scan or equivalent hosting-layer control for public launch.

### AI Safety And Product Claims

- Clear "for reference only" disclaimer.
- No employment guarantee language.
- Feedback/report entry for harmful, wrong, or privacy-sensitive AI output.
- Prompt/model output logging policy.
- Provider fallback and timeout strategy.
- Model-cost guardrails and quotas.

### Operations

- Docker or platform-native deployment scripts.
- Production environment variable checklist.
- Domain, HTTPS, reverse proxy, and CORS allowlist.
- Monitoring:
  - API error rate;
  - model timeout/failure rate;
  - model latency;
  - daily cost;
  - signup/login failures.
- Incident response checklist:
  - data leak suspicion;
  - model provider outage;
  - abusive uploads;
  - account compromise.

## P1 Public Launch Requirements

- Full model evaluation using planned candidates:
  - `glm-4.7flashX`
  - `deepseek-v4-flash`
  - `qwen3.6-flash`
  - `Doubao-Seed-2.0-mini`
  - `MiniMax-M2.5-highspeed`
  - `glm5.1`
  - `deepseek-v4-pro`
- Default model and fallback model selected from evaluation.
- Evaluation report includes:
  - JSON/tool-call success rate;
  - match score quality;
  - evidence quality;
  - latency P50/P95;
  - timeout rate;
  - estimated cost per 100 runs.
- Frontend E2E for:
  - JD result rendering;
  - match result rendering;
  - report download;
  - account deletion;
  - data export;
  - chat deletion.
- Basic support/contact page.
- Versioned release notes.

## P2 Post-Launch Improvements

- Admin/support dashboard.
- User quota management.
- Resume version management.
- Job favorites and comparison.
- More detailed interview preparation workflow.
- Payment/subscription system.
- Advanced audit logs.
- Organization/team accounts.

## Suggested 6-8 Week Roadmap

### Phase 1: Data Rights And Compliance Foundation

- Account deletion.
- User data export.
- Chat deletion.
- Privacy/user agreement/disclaimer pages.
- Policy links in auth/account/footer areas.

### Phase 2: Production Infrastructure

- PostgreSQL deployment path.
- Docker or cloud deployment workflow.
- Backup/restore procedure.
- HTTPS/CORS/env configuration.

### Phase 3: Security Hardening

- Auth rate limiting.
- Password reset/change.
- Upload restrictions.
- Log redaction.
- Security headers.

### Phase 4: Model Evaluation And Reliability

- Multi-provider config layer.
- Seven-model evaluation run.
- Default/fallback model choice.
- Timeout/retry/fallback tuning.

### Phase 5: Observability And Support

- Metrics and logging.
- Cost tracking.
- Error tracking.
- Feedback/report workflow.
- Incident response checklist.

### Phase 6: Launch Acceptance

- Full regression suite.
- Production deployment rehearsal.
- Backup restore rehearsal.
- Privacy/security review.
- Small public beta release.

## Public Launch Acceptance Criteria

- All P0 items are complete.
- Full local checks pass:

```powershell
.\scripts\check_all.ps1 -E2E -StartServices
```

- Production deployment has been rehearsed.
- Backup restore has been tested.
- Legal/compliance review is complete or explicitly accepted by the project owner.
- Users can delete/export their data without developer intervention.
- Monitoring can detect outages, model failures, and cost spikes.

## Deferred Until After Public Launch

- Paid plans.
- Enterprise/team management.
- Advanced analytics dashboard.
- Large-scale marketing growth.
- Deep CRM workflows.
