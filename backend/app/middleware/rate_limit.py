from __future__ import annotations

from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
import json

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

# Path prefixes that consume LLM tokens
LLM_PATH_PREFIXES = ("/api/jd/analyze", "/api/match/analyze", "/api/chat/message")
AUTH_LIMITS = {
    "/api/auth/login": {"limit": 5, "window_minutes": 15},
    "/api/auth/register": {"limit": 10, "window_minutes": 15},
}

DEFAULT_DAILY_LIMIT = 20


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, daily_limit: int = DEFAULT_DAILY_LIMIT):
        super().__init__(app)
        self.daily_limit = daily_limit
        self._counts: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
        self._auth_attempts: dict[str, list[datetime]] = defaultdict(list)

    def _client_ip(self, request: Request) -> str:
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.client.host if request.client else "unknown"

    def _cleanup(self, ip: str) -> None:
        today = date.today().isoformat()
        dates = self._counts.get(ip)
        if dates:
            expired = [d for d in dates if d != today]
            for d in expired:
                del dates[d]

    async def _auth_key(self, request: Request, path: str) -> str:
        ip = self._client_ip(request)
        identity = ""
        try:
            body = await request.body()
            payload = json.loads(body.decode("utf-8")) if body else {}
            email = payload.get("email")
            if isinstance(email, str):
                identity = email.strip().lower()
        except (json.JSONDecodeError, UnicodeDecodeError):
            identity = ""
        return f"{path}:{ip}:{identity}"

    def _check_auth_limit(self, key: str, *, limit: int, window_minutes: int) -> tuple[bool, int]:
        now = datetime.now(timezone.utc)
        cutoff = now - timedelta(minutes=window_minutes)
        attempts = [value for value in self._auth_attempts[key] if value > cutoff]
        self._auth_attempts[key] = attempts

        if len(attempts) >= limit:
            return False, 0

        attempts.append(now)
        return True, limit - len(attempts)

    async def dispatch(self, request: Request, call_next):
        path = request.url.path.rstrip("/")

        if request.method == "POST" and path in AUTH_LIMITS:
            key = await self._auth_key(request, path)
            config = AUTH_LIMITS[path]
            allowed, remaining = self._check_auth_limit(
                key,
                limit=config["limit"],
                window_minutes=config["window_minutes"],
            )
            if not allowed:
                return JSONResponse(
                    status_code=429,
                    content={
                        "detail": f"认证请求过于频繁，请{config['window_minutes']}分钟后再试",
                        "limit": config["limit"],
                        "remaining": 0,
                    },
                    headers={
                        "X-Auth-RateLimit-Limit": str(config["limit"]),
                        "X-Auth-RateLimit-Remaining": "0",
                    },
                )

            response = await call_next(request)
            response.headers["X-Auth-RateLimit-Limit"] = str(config["limit"])
            response.headers["X-Auth-RateLimit-Remaining"] = str(remaining)
            return response

        is_llm = path in LLM_PATH_PREFIXES or any(path.startswith(p) for p in LLM_PATH_PREFIXES)
        if not is_llm or request.method != "POST":
            return await call_next(request)

        ip = self._client_ip(request)
        self._cleanup(ip)

        today = date.today().isoformat()
        count = self._counts[ip][today]

        if count >= self.daily_limit:
            return JSONResponse(
                status_code=429,
                content={
                    "detail": f"今日LLM调用次数已达上限（{self.daily_limit}次/日），请明天再试",
                    "limit": self.daily_limit,
                    "remaining": 0,
                },
            )

        response = await call_next(request)

        # Only count successful calls (2xx)
        if 200 <= response.status_code < 300:
            self._counts[ip][today] += 1

        remaining = max(0, self.daily_limit - self._counts[ip][today])
        response.headers["X-RateLimit-Limit"] = str(self.daily_limit)
        response.headers["X-RateLimit-Remaining"] = str(remaining)

        return response
