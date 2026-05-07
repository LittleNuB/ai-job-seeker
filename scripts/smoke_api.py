"""Smoke test the running AI Job Copilot API.

This script intentionally uses only the Python standard library so it can run
before the project has a test framework. It avoids LLM endpoints that would
consume model quota, except checking that protected endpoints reject unauthenticated
requests.

Usage:
    python scripts/smoke_api.py --base-url http://localhost:8000
"""

from __future__ import annotations

import argparse
import json
import sys
import time
import uuid
from dataclasses import dataclass
from typing import Any
from urllib import error, parse, request


@dataclass
class Response:
    status: int
    body: Any
    headers: dict[str, str]


class SmokeFailure(AssertionError):
    pass


def _json_bytes(data: Any) -> bytes:
    return json.dumps(data).encode("utf-8")


def _read_body(resp) -> Any:
    raw = resp.read()
    if not raw:
        return None
    text = raw.decode("utf-8")
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return text


def call(base_url: str, method: str, path: str, *, token: str | None = None,
         json_body: Any | None = None, body: bytes | None = None,
         headers: dict[str, str] | None = None) -> Response:
    url = base_url.rstrip("/") + path
    req_headers = dict(headers or {})
    if token:
        req_headers["Authorization"] = f"Bearer {token}"
    if json_body is not None:
        body = _json_bytes(json_body)
        req_headers["Content-Type"] = "application/json"
    req = request.Request(url, data=body, method=method, headers=req_headers)
    try:
        with request.urlopen(req, timeout=15) as resp:
            return Response(resp.status, _read_body(resp), dict(resp.headers.items()))
    except error.HTTPError as exc:
        return Response(exc.code, _read_body(exc), dict(exc.headers.items()))
    except error.URLError as exc:
        raise SmokeFailure(f"Cannot reach API at {url}: {exc}") from exc


def multipart_file(field_name: str, filename: str, content: bytes, content_type: str) -> tuple[bytes, str]:
    boundary = f"----codex-smoke-{uuid.uuid4().hex}"
    lines = [
        f"--{boundary}\r\n".encode(),
        f'Content-Disposition: form-data; name="{field_name}"; filename="{filename}"\r\n'.encode(),
        f"Content-Type: {content_type}\r\n\r\n".encode(),
        content,
        f"\r\n--{boundary}--\r\n".encode(),
    ]
    return b"".join(lines), f"multipart/form-data; boundary={boundary}"


def expect(name: str, condition: bool, detail: str = "") -> None:
    if not condition:
        raise SmokeFailure(f"{name} failed" + (f": {detail}" if detail else ""))
    print(f"PASS {name}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default="http://localhost:8000")
    parser.add_argument("--email-prefix", default="smoke")
    args = parser.parse_args()

    base_url = args.base_url.rstrip("/")
    unique = f"{int(time.time())}-{uuid.uuid4().hex[:8]}"
    email = f"{args.email_prefix}+{unique}@example.com"
    password = "SmokeTest123!"

    try:
        resp = call(base_url, "GET", "/api/health")
        expect("health", resp.status == 200 and resp.body.get("status") == "ok", str(resp.body))

        resp = call(base_url, "GET", "/api/positions/categories")
        expect("categories", resp.status == 200 and isinstance(resp.body, list), str(resp.body))

        resp = call(base_url, "GET", "/api/positions/positions")
        expect("positions", resp.status == 200 and isinstance(resp.body, list), str(resp.body))

        query = parse.quote("LLM")
        resp = call(base_url, "GET", f"/api/positions/search?query={query}&top_k=3")
        expect("position search", resp.status == 200 and isinstance(resp.body, list), str(resp.body))

        resp = call(base_url, "POST", "/api/jd/analyze", json_body={"jd_text": "test"})
        expect("protected jd rejects anonymous", resp.status == 401, str(resp.body))

        resp = call(base_url, "GET", f"/api/export/{uuid.uuid4()}")
        expect("protected export rejects anonymous", resp.status == 401, str(resp.body))

        resp = call(base_url, "POST", "/api/auth/register", json_body={
            "email": email,
            "password": password,
            "name": "Smoke Test",
            "accepted_terms": True,
        })
        expect("register", resp.status == 200 and resp.body.get("access_token"), str(resp.body))
        token = resp.body["access_token"]

        resp = call(base_url, "POST", "/api/auth/login", json_body={"email": email, "password": password})
        expect("login", resp.status == 200 and resp.body.get("access_token"), str(resp.body))
        token = resp.body["access_token"]

        resp = call(base_url, "GET", "/api/auth/me", token=token)
        expect("auth me", resp.status == 200 and resp.body.get("email") == email, str(resp.body))

        resp = call(base_url, "GET", f"/api/chat/conversations/{uuid.uuid4()}/messages", token=token)
        expect("chat history is scoped", resp.status == 404, str(resp.body))

        resp = call(base_url, "GET", f"/api/export/{uuid.uuid4()}", token=token)
        expect("export is scoped", resp.status == 404, str(resp.body))

        body, content_type = multipart_file("file", "unsupported.txt", b"hello", "text/plain")
        resp = call(base_url, "POST", "/api/files/upload", token=token, body=body,
                    headers={"Content-Type": content_type})
        expect("file upload auth path", resp.status == 415, str(resp.body))

    except SmokeFailure as exc:
        print(f"FAIL {exc}", file=sys.stderr)
        return 1

    print("All smoke checks passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
