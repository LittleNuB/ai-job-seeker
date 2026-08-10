# VPS Docker Compose Deployment

This guide covers the reference single-VPS deployment.

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
- `postgres`: PostgreSQL database.
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

Suggested baseline for a small deployment:

- 2 vCPU
- 4 GB RAM
- 40 GB disk

## First Deploy

Clone or update the repo on the VPS:

```bash
git clone <repo-url> ai-job-copilot
cd ai-job-copilot
git checkout main
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

If the VPS cannot reach Docker Hub reliably, uncomment and use the optional image mirror variables in `.env.production`:

```env
PYTHON_IMAGE=docker.m.daocloud.io/library/python:3.12-slim
NODE_IMAGE=docker.m.daocloud.io/library/node:20-alpine
POSTGRES_IMAGE=docker.m.daocloud.io/library/postgres:16-alpine
REDIS_IMAGE=docker.m.daocloud.io/library/redis:7-alpine
CADDY_IMAGE=docker.m.daocloud.io/library/caddy:2-alpine
```

For local Docker Desktop smoke tests, keep Caddy listening on port 80 inside the container and override only the host ports:

```env
CADDY_SITE_ADDRESS=:80
CADDY_HTTP_PORT=8088
CADDY_HTTPS_PORT=8443
```

Then use `http://localhost:8088` for local checks. On the VPS, keep the default public ports `80` and `443`.

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

On Windows or local Docker Desktop, the scripted deployment check can validate data, Compose config, image build, readiness, and smoke checks:

```powershell
.\scripts\check_deploy.ps1 -EnvFile .env.production -StartStack -Cleanup
```

Use `-DestroyVolumes` only for disposable local smoke runs where deleting PostgreSQL/Redis/Caddy volumes is intended.

## Migrations

The backend service runs Alembic and then upserts `data/positions.json` before starting Uvicorn:

```bash
python -m alembic upgrade head
python scripts/data/seed_positions.py
```

To run migrations manually:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml run --rm backend python -m alembic upgrade head
```

To validate and preview position data sync manually:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml run --rm backend python scripts/data/validate_positions.py
docker compose --env-file .env.production -f docker-compose.prod.yml run --rm backend python scripts/data/seed_positions.py --dry-run
```

## Smoke Checks

From the VPS or your local machine:

```bash
python scripts/smoke_api.py --base-url https://app.example.com
```

Replace `https://app.example.com` with `https://<CADDY_SITE_ADDRESS>`.
By default the smoke check expects at least 7 categories and 40 positions; override with `--min-categories` and `--min-positions` if the bundled dataset intentionally changes.

For a local Docker Desktop stack using the port override above:

```bash
python scripts/smoke_api.py --base-url http://localhost:8088
```

Also verify in the browser:

- home page loads;
- registration works;
- `/api/health` returns `{"status":"ok"}`;
- `/api/health/ready` returns `{"status":"ok"}` and reports non-zero position data;
- login works;
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

- pause new traffic or account onboarding;
- record the current commit and backup file;
- understand that `--clean --if-exists` can replace current database objects.

## Update Deploy

```bash
git fetch
git checkout main
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

## Operational Checks

- PostgreSQL starts empty, but the backend container upserts the bundled `data/positions.json` on startup. Confirm the smoke check's position-data assertions pass before directing traffic to the deployment.
- Run the automated checks and release acceptance helper before directing traffic to a new version.
- Keep `.env.production`, backups, and filled feedback notes out of git.
