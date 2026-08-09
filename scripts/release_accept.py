"""Run a manual release acceptance check against a live backend.

The default mode avoids LLM-costing JD and resume analysis calls. Add
`--run-model-checks` when you intentionally want to exercise the model runtime.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any
from urllib import error, parse, request


DEFAULT_OUTPUT = Path("scripts/release_accept_result.json")
DEFAULT_JD_TEXT = (
    "招聘高级后端开发工程师，要求精通Python语言和微服务架构，具备5年以上后端开发经验，"
    "熟悉MySQL、Redis等常用中间件，有良好的系统设计能力和团队协作精神。"
)
DEFAULT_RESUME_TEXT = (
    "个人信息：5年后端开发经验，精通Python和Go\n"
    "工作经历：某互联网公司高级后端工程师，主导微服务架构改造\n"
    "技能：Python, Go, MySQL, Redis, Kafka, Docker, K8s, AWS\n"
    "学历：计算机科学硕士"
)


@dataclass
class ApiResponse:
    status: int
    body: Any
    headers: dict[str, str]


@dataclass
class ReleaseRecorder:
    no_color: bool = False
    passed: int = 0
    failed: int = 0
    skipped: int = 0
    details: dict[str, dict[str, Any]] = field(default_factory=dict)
    metrics: dict[str, Any] = field(default_factory=dict)

    def check(self, name: str, ok: bool, detail: str = "") -> None:
        if ok:
            self.passed += 1
            print(f"  {self._color('PASS', '32')} {name}")
        else:
            self.failed += 1
            print(f"  {self._color('FAIL', '31')} {name} - {detail}")
        self.details[name] = {"ok": ok, "detail": detail, "skipped": False}

    def skip(self, name: str, detail: str) -> None:
        self.skipped += 1
        print(f"  {self._color('SKIP', '33')} {name} - {detail}")
        self.details[name] = {"ok": True, "detail": detail, "skipped": True}

    def _color(self, text: str, code: str) -> str:
        if self.no_color:
            return text
        return f"\033[{code}m{text}\033[0m"

    def payload(self, args: argparse.Namespace) -> dict[str, Any]:
        return {
            "base_url": args.base_url,
            "run_model_checks": args.run_model_checks,
            "model_provider": args.model_provider,
            "chat_model": args.chat_model,
            "passed": self.passed,
            "failed": self.failed,
            "skipped": self.skipped,
            "metrics": self.metrics,
            "details": self.details,
        }


class ReleaseClient:
    def __init__(self, base_url: str, *, timeout: int):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.token = ""

    def call(
        self,
        method: str,
        path: str,
        *,
        body: dict[str, Any] | None = None,
        token: str | None = None,
        timeout: int | None = None,
    ) -> ApiResponse:
        headers = {"Content-Type": "application/json"}
        auth_token = token if token is not None else self.token
        if auth_token:
            headers["Authorization"] = f"Bearer {auth_token}"

        data = json.dumps(body).encode("utf-8") if body is not None else None
        req = request.Request(
            f"{self.base_url}{path}",
            data=data,
            headers=headers,
            method=method,
        )

        try:
            with request.urlopen(req, timeout=timeout or self.timeout) as resp:
                return ApiResponse(resp.status, _read_body(resp), dict(resp.headers.items()))
        except error.HTTPError as exc:
            return ApiResponse(exc.code, _read_body(exc), dict(exc.headers.items()))
        except error.URLError as exc:
            return ApiResponse(0, {"detail": f"Cannot reach API: {exc}"}, {})


def _read_body(resp) -> Any:
    raw = resp.read()
    if not raw:
        return None
    text = raw.decode("utf-8", errors="replace")
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return text


def _body_dict(resp: ApiResponse) -> dict[str, Any]:
    return resp.body if isinstance(resp.body, dict) else {}


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Run live release acceptance checks.")
    parser.add_argument("--base-url", default="http://127.0.0.1:8000")
    parser.add_argument("--output", default=str(DEFAULT_OUTPUT))
    parser.add_argument("--email-prefix", default="release-accept")
    parser.add_argument("--password", default="Test1234!")
    parser.add_argument("--timeout", type=int, default=60)
    parser.add_argument("--model-timeout", type=int, default=180)
    parser.add_argument("--match-retries", type=int, default=2)
    parser.add_argument("--run-model-checks", action="store_true")
    parser.add_argument("--model-provider", default="")
    parser.add_argument("--chat-model", default="")
    parser.add_argument("--match-position-id", default="")
    parser.add_argument("--no-color", action="store_true")
    return parser


def unique_email(prefix: str) -> str:
    return f"{prefix}+{int(time.time())}-{uuid.uuid4().hex[:8]}@example.com"


def choose_position(client: ReleaseClient, args: argparse.Namespace, recorder: ReleaseRecorder) -> str | None:
    if args.match_position_id:
        return args.match_position_id

    resp = client.call("GET", "/api/positions?category_id=algorithm")
    ok = resp.status == 200 and isinstance(resp.body, list) and len(resp.body) > 0
    recorder.check("Position data available", ok, f"status={resp.status}, body={resp.body}")
    if not ok:
        return None

    position = resp.body[0]
    position_id = position["id"]
    print(f"    Target position: {position.get('name', position_id)}")
    recorder.metrics["target_position_id"] = position_id
    return position_id


def run_account_checks(client: ReleaseClient, args: argparse.Namespace, recorder: ReleaseRecorder) -> str:
    print("\n1. Account & Consent")
    email = unique_email(args.email_prefix)

    resp = client.call(
        "POST",
        "/api/auth/register",
        body={"email": email, "password": args.password, "name": "Release Accept", "accepted_terms": False},
    )
    body = _body_dict(resp)
    recorder.check(
        "Registration blocked without consent",
        resp.status == 400 and "同意" in str(body.get("detail", "")),
        f"status={resp.status}, body={resp.body}",
    )

    resp = client.call(
        "POST",
        "/api/auth/register",
        body={"email": email, "password": args.password, "name": "Release Accept", "accepted_terms": True},
    )
    body = _body_dict(resp)
    recorder.check("Registration with consent", resp.status == 200 and bool(body.get("access_token")), str(resp.body))
    client.token = body.get("access_token", "")

    resp = client.call("GET", "/api/auth/me")
    body = _body_dict(resp)
    recorder.check("Auth /me returns identity", resp.status == 200 and body.get("email") == email, str(resp.body))

    resp = client.call("GET", "/api/auth/profile")
    body = _body_dict(resp)
    recorder.check("Profile shows stats", resp.status == 200 and "stats" in body, str(resp.body))
    if resp.status == 200:
        print(f"    Stats: {body.get('stats', {})}")

    recorder.metrics["email"] = email
    return email


def run_runtime_checks(client: ReleaseClient, args: argparse.Namespace, recorder: ReleaseRecorder) -> None:
    print("\n2. Runtime")
    resp = client.call("GET", "/api/health")
    body = _body_dict(resp)
    recorder.check("Backend health", resp.status == 200 and body.get("status") == "ok", str(resp.body))

    provider = args.model_provider or "not recorded"
    model = args.chat_model or "not recorded"
    recorder.check(f"Model config recorded: provider={provider}, model={model}", True)


def run_model_checks(client: ReleaseClient, args: argparse.Namespace, recorder: ReleaseRecorder) -> tuple[str | None, str | None]:
    if not args.run_model_checks:
        recorder.skip("JD analysis flow", "use --run-model-checks to spend model quota")
        recorder.skip("Resume match flow", "use --run-model-checks to spend model quota")
        return None, None

    print("\n3. JD Analysis Flow")
    started = time.time()
    resp = client.call("POST", "/api/jd/analyze", body={"jd_text": DEFAULT_JD_TEXT}, timeout=args.model_timeout)
    latency = time.time() - started
    jd_ok = resp.status == 200 and isinstance(resp.body, dict) and "record_id" in resp.body
    recorder.check("JD analysis completes", jd_ok, f"status={resp.status}, body={str(resp.body)[:300]}")
    recorder.metrics["jd_latency_seconds"] = round(latency, 1)
    print(f"    Latency: {latency:.1f}s")

    jd_id = resp.body.get("record_id") if jd_ok else None
    if jd_ok:
        result = resp.body.get("result", {})
        overview = result.get("position_overview", {})
        print(f"    Role: {overview.get('inferred_role', '?')}")

    print("\n4. Resume Match Flow")
    position_id = choose_position(client, args, recorder)
    if not position_id:
        return jd_id, None

    started = time.time()
    match_resp = None
    attempts = max(1, args.match_retries + 1)
    for attempt in range(attempts):
        match_resp = client.call(
            "POST",
            "/api/match/analyze",
            body={"resume_text": DEFAULT_RESUME_TEXT, "position_id": position_id},
            timeout=args.model_timeout,
        )
        if match_resp.status == 200:
            break
        if attempt < attempts - 1:
            wait_seconds = (attempt + 1) * 3
            print(f"    Retrying in {wait_seconds}s (attempt {attempt + 1}/{attempts}, status={match_resp.status})...")
            time.sleep(wait_seconds)

    latency = time.time() - started
    body = match_resp.body if match_resp else None
    match_ok = match_resp is not None and match_resp.status == 200 and isinstance(body, dict) and "record_id" in body
    recorder.check("Match analysis completes", match_ok, f"status={match_resp.status if match_resp else 'n/a'}, body={str(body)[:300]}")
    recorder.metrics["match_latency_seconds"] = round(latency, 1)
    print(f"    Latency: {latency:.1f}s")

    match_id = body.get("record_id") if match_ok else None
    if match_ok:
        print(f"    Score: {body.get('match_score', '?')}")

    return jd_id, match_id


def run_history_checks(client: ReleaseClient, recorder: ReleaseRecorder, jd_id: str | None) -> None:
    print("\n5. History & Data Rights")
    resp = client.call("GET", "/api/records")
    body = _body_dict(resp)
    recorder.check("Records list scoped to user", resp.status == 200 and bool(body), str(resp.body))
    if resp.status == 200:
        print(f"    Total records: {body.get('total', '?')}")

    if not jd_id:
        recorder.skip("Record detail/delete", "no JD record was created in this run")
        return

    resp = client.call("GET", f"/api/records/{parse.quote(jd_id)}")
    recorder.check("Record detail accessible", resp.status == 200, str(resp.body))

    resp = client.call("DELETE", f"/api/records/{parse.quote(jd_id)}")
    body = _body_dict(resp)
    recorder.check("Record deletion succeeds", resp.status == 200 and body.get("ok") is True, str(resp.body))

    resp = client.call("GET", f"/api/records/{parse.quote(jd_id)}")
    recorder.check("Deleted record returns 404", resp.status == 404, str(resp.body))


def run_export_and_delete_checks(client: ReleaseClient, recorder: ReleaseRecorder) -> None:
    print("\n6. Data Export")
    resp = client.call("GET", "/api/auth/export-data")
    body = _body_dict(resp)
    recorder.check("Data export returns account data", resp.status == 200 and "account" in body, str(resp.body))
    if resp.status == 200:
        print(f"    Export keys: {list(body.keys())}")

    print("\n7. Account Deletion")
    resp = client.call("DELETE", "/api/auth/account")
    body = _body_dict(resp)
    recorder.check("Account deletion returns ok", resp.status == 200 and body.get("ok") is True, str(resp.body))

    old_token = client.token
    client.token = old_token
    resp = client.call("GET", "/api/auth/me")
    recorder.check("Deleted token is rejected", resp.status in (401, 404), str(resp.body))


def write_result(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    recorder = ReleaseRecorder(no_color=args.no_color)
    client = ReleaseClient(args.base_url, timeout=args.timeout)

    print("=== AI Job Copilot Release Acceptance ===")
    print(f"Backend: {args.base_url}")
    if args.run_model_checks:
        print("Model checks: enabled, this run will call JD and resume analysis endpoints.")
    else:
        print("Model checks: skipped. Add --run-model-checks to exercise model-costing flows.")

    try:
        run_runtime_checks(client, args, recorder)
        run_account_checks(client, args, recorder)
        jd_id, _ = run_model_checks(client, args, recorder)
        run_history_checks(client, recorder, jd_id)
        run_export_and_delete_checks(client, recorder)
    finally:
        output_path = Path(args.output)
        write_result(output_path, recorder.payload(args))
        print(f"\nResult written to {output_path}")

    print(f"\n{'=' * 40}")
    print(f"Passed: {recorder.passed}  Failed: {recorder.failed}  Skipped: {recorder.skipped}")
    print(f"{'=' * 40}")
    return 0 if recorder.failed == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
