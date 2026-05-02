from __future__ import annotations

from collections import defaultdict
from datetime import date

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

# Path prefixes that consume LLM tokens
LLM_PATH_PREFIXES = ("/api/jd/analyze", "/api/match/analyze", "/api/chat/message")

DEFAULT_DAILY_LIMIT = 20


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, daily_limit: int = DEFAULT_DAILY_LIMIT):
        super().__init__(app)
        self.daily_limit = daily_limit
        self._counts: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))

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

    async def dispatch(self, request: Request, call_next):
        path = request.url.path.rstrip("/")

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
