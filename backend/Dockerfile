ARG PYTHON_IMAGE=python:3.12-slim
FROM ${PYTHON_IMAGE}

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt ./requirements.txt
RUN pip install -r requirements.txt

COPY backend/alembic.ini ./alembic.ini
COPY backend/alembic ./alembic
COPY backend/app ./app
COPY data/positions.json ./data/positions.json
COPY data/jd_samples.json ./data/jd_samples.json
COPY scripts/data ./scripts/data

EXPOSE 8000

CMD bash -c 'for i in 1 2 3 4 5; do alembic -c alembic.ini upgrade head && break || sleep 5; done && python scripts/data/seed_positions.py && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --proxy-headers'
