# Deployment Guide

This guide captures the minimum requirements for running AI Job Copilot outside local development.

## Target Shape

- The reference deployment is a single VPS with Docker Compose, Caddy, FastAPI, Next.js, PostgreSQL, and Redis.
- Put the backend behind an HTTPS reverse proxy.
- Serve the frontend through HTTPS.
- Keep backend environment variables outside git.
- Use PostgreSQL for persisted user data. SQLite is acceptable only for local development.
- Run the health check before directing traffic to the deployment:

```text
GET /api/health
```

See the concrete VPS runbook in `docs/VPS_DOCKER_DEPLOYMENT.md`.

## Required Backend Environment

```env
APP_ENV=production
DEBUG=false
APP_NAME=AI Job Copilot

DATABASE_URL=postgresql+asyncpg://USER:PASSWORD@HOST:5432/ai_job_copilot
REDIS_URL=redis://HOST:6379/0

JWT_SECRET=<stable-random-secret-at-least-32-characters>
JWT_ALGORITHM=HS256
JWT_EXPIRE_HOURS=72

LLM_PROVIDER=glm
LLM_API_KEY=<model-provider-api-key>
LLM_CHAT_MODEL=glm-4.6V
LLM_BASE_URL=https://open.bigmodel.cn/api/paas/v4/
LLM_TEMPERATURE=0.7
LLM_MAX_TOKENS=4096
LLM_TIMEOUT_SECONDS=60
LLM_MAX_RETRIES=1
LLM_EMBEDDING_MODEL=embedding-3

CORS_ALLOW_ORIGINS=https://app.example.com,https://www.example.com
```

Production startup refuses weak or missing `JWT_SECRET`, `DEBUG=true`, missing `CORS_ALLOW_ORIGINS`, wildcard CORS origins, and non-HTTPS CORS origins.

Model settings are also range-checked at startup. Prefer the generic `LLM_*` variables for new deployments; legacy `GLM_*` variables still work as a fallback for existing environments. Keep `LLM_TIMEOUT_SECONDS` below the frontend match timeout so users receive a clear retryable error instead of waiting indefinitely. Start with one SDK retry and raise it only if transient provider or network failures are common. Leave `LLM_EMBEDDING_MODEL` empty only when the selected provider has no compatible embedding interface; semantic search will then fall back to keyword search.

## Required Frontend Environment

```env
NEXT_PUBLIC_API_URL=
```

For the recommended same-domain Caddy deployment, leave this empty so browser requests use `/api/*` on the same origin. If the frontend and backend are deployed on different origins, set this to the HTTPS backend origin visible to users' browsers.

## CORS Policy

Development and test allow local frontend ports such as `localhost:3000`, `localhost:3001`, or temporary E2E ports.

Production does not allow local regex CORS. Set `CORS_ALLOW_ORIGINS` to the exact frontend origin list:

```env
CORS_ALLOW_ORIGINS=https://app.example.com,https://www.example.com
```

Do not use `*` in production. Do not include `http://` origins in production.

## HTTPS

Enforce HTTPS at the platform or reverse-proxy layer. The backend rejects production requests unless the request scheme is HTTPS or the reverse proxy sends `X-Forwarded-Proto: https`.

Recommended options:

- Managed platforms that issue certificates automatically.
- Caddy with automatic HTTPS.
- Nginx behind a certificate manager such as Let's Encrypt.
- Cloudflare or another TLS-terminating proxy in front of the app.

If the backend is behind a reverse proxy, forward these headers:

```text
X-Forwarded-Proto: https
X-Forwarded-For: <client-ip>
Host: <api-domain>
```

The backend uses bearer tokens and receives resume and JD content, so do not expose it over plain HTTP.

## Database And Migrations

Run Alembic migrations before starting the production backend:

```powershell
cd backend
.\.venv\Scripts\python.exe -m alembic upgrade head
```

For Linux deployment, use the platform Python path instead of the Windows venv path.

In the Docker Compose deployment, the backend container runs Alembic automatically before Uvicorn starts.

## Smoke Checks

After deployment:

```powershell
python scripts\smoke_api.py --base-url https://api.example.com
```

For same-domain Caddy deployment, use the frontend domain:

```powershell
python scripts\smoke_api.py --base-url https://app.example.com
```

Also verify from the frontend domain:

- Register a test account.
- Confirm login works.
- Confirm `/api/health` returns `{"status":"ok"}`.
- Confirm CORS blocks requests from an unlisted origin.

## Rollback

Keep each deploy tied to a git commit hash. To roll back:

1. Stop directing new traffic to the affected deployment.
2. Redeploy the previous known-good commit.
3. Keep the database unchanged unless a migration rollback has been tested.
4. Re-run smoke checks.
5. Record the incident, affected version, and corrective action in the project issue tracker or release notes.

## Secrets

Never commit `.env`, API keys, database credentials, JWT secrets, or local database files. Use `.env.example` for placeholders only.
