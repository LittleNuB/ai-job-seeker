# VPS Docker Compose Deployment

This guide is for the MVP trusted trial deployment on a single VPS.

## Target Architecture

```text
Browser
  -> HTTPS domain served by Caddy
  -> /api/* reverse proxy to FastAPI backend
  -> all other paths reverse proxy to Next.js frontend
  -> backend connects to PostgreSQL and Redis on the Docker network
  -> backend calls the configured LLM provider
```

Services:

- `caddy`: public HTTP/HTTPS entrypoint and reverse proxy.
- `frontend`: Next.js standalone server.
- `backend`: FastAPI/Uvicorn server.
- `postgres`: PostgreSQL trial database.
- `redis`: reserved cache/rate-limit backend for production-like topology.

## Files

- `docker-compose.prod.yml`
- `.env.production.example`
- `backend/Dockerfile`
- `frontend/Dockerfile`
- `deploy/caddy/Caddyfile`
- `deploy/scripts/backup_postgres.sh`
- `deploy/scripts/restore_postgres.sh`

## VPS Prerequisites

- Ubuntu 22.04/24.04 or similar Linux VPS.
- Docker Engine and Docker Compose plugin installed.
- Domain DNS A record pointing to the VPS public IP.
- Ports `80` and `443` open.
- Git access to this repository.

Suggested baseline for a small trial:

- 2 vCPU
- 4 GB RAM
- 40 GB disk

## First Deploy

Clone or update the repo on the VPS:

```bash
git clone <repo-url> ai-job-seeker
cd ai-job-seeker
git checkout codex/mvp-vps-deploy
```

Create the production env file:

```bash
cp .env.production.example .env.production
```

Edit `.env.production`:

```bash
nano .env.production
```

Required changes:

- `CADDY_SITE_ADDRESS`
- `CORS_ALLOW_ORIGINS`
- `POSTGRES_PASSWORD`
- `JWT_SECRET`
- `LLM_API_KEY`
- `LLM_CHAT_MODEL`
- `LLM_BASE_URL`

Generate a strong JWT secret:

```bash
openssl rand -base64 48
```

For same-domain deployment, keep:

```env
NEXT_PUBLIC_API_URL=
```

The browser will call `/api/*`, and Caddy will route those requests to the backend.

Build and start:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

Check status:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml ps
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f backend
```

## Migrations

The backend service runs Alembic before starting Uvicorn:

```bash
python -m alembic upgrade head
```

To run migrations manually:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml run --rm backend python -m alembic upgrade head
```

## Smoke Checks

From the VPS or your local machine:

```bash
python scripts/smoke_api.py --base-url https://app.example.com
```

Replace `https://app.example.com` with `https://<CADDY_SITE_ADDRESS>`.

Also verify in the browser:

- home page loads;
- registration works;
- login works;
- `/api/health` returns `{"status":"ok"}`;
- JD analysis and resume match show retryable errors if the model key is invalid;
- report download starts after a mocked or real analysis run.

## Logs

View logs:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f caddy
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f backend
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f frontend
```

Do not paste full resume/JD/chat content into support notes. The backend has log redaction, but operational notes should still avoid raw sensitive content.

## Backups

Create a PostgreSQL backup:

```bash
sh deploy/scripts/backup_postgres.sh
```

Restore a backup:

```bash
sh deploy/scripts/restore_postgres.sh backups/ai_job_copilot-YYYYMMDD-HHMMSS.dump
```

Before restore:

- pause trial onboarding;
- record the current commit and backup file;
- understand that `--clean --if-exists` can replace current database objects.

## Update Deploy

```bash
git fetch
git checkout codex/mvp-vps-deploy
git pull
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
python scripts/smoke_api.py --base-url https://app.example.com
```

If frontend env such as `NEXT_PUBLIC_API_URL` changes, rebuild the frontend image because Next.js public env values are captured at build time.

## Rollback

```bash
git checkout <previous-good-commit>
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
python scripts/smoke_api.py --base-url https://app.example.com
```

Do not roll back database migrations unless a rollback has been tested.

## Trial Caveats

- PostgreSQL starts empty. Import/seed position data before inviting users, or the position exploration and resume-match dropdown will be incomplete.
- Keep the user group small until `docs/MVP_TRIAL_ACCEPTANCE.md` has a `GO` or explicit `GO_WITH_NOTES` decision.
- Keep `.env.production`, backups, and filled feedback notes out of git.
