from __future__ import annotations

import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any
from urllib.parse import urlparse, parse_qs

from storage import (
    get_latest_attempt,
    get_student_latest_attempt,
    get_student_attempts,
    get_attempt_by_id,
    get_all_attempts,
    init_db,
    public_questions,
    save_attempt,
)


HOST = "127.0.0.1"
PORT = 8010


class VivaApiHandler(BaseHTTPRequestHandler):
    server_version = "AI-Viva-ResultStorage/1.0"

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self.send_cors_headers()
        self.end_headers()

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        path = parsed.path

        if path == "/api/health":
            self.send_json({"status": "ok", "module": "result-storage"})

        elif path == "/api/questions":
            self.send_json({"questions": public_questions()})

        elif path == "/api/results/latest":
            latest = get_latest_attempt()
            self.send_json({"result": latest})

        elif path == "/api/feedback/latest":
            latest = get_latest_attempt()
            self.send_json({"feedback": latest["feedbackSummary"] if latest else None})

        # /api/results/student/<student_id>
        elif path.startswith("/api/results/student/"):
            student_id = path.removeprefix("/api/results/student/").strip("/")
            if not student_id:
                self.send_error_json(400, "student_id is required")
                return
            result = get_student_latest_attempt(student_id)
            self.send_json({"result": result})

        # /api/attempts/student/<student_id>
        elif path.startswith("/api/attempts/student/"):
            student_id = path.removeprefix("/api/attempts/student/").strip("/")
            if not student_id:
                self.send_error_json(400, "student_id is required")
                return
            attempts = get_student_attempts(student_id)
            self.send_json({"attempts": attempts})

        # /api/attempts/<attempt_id> — full detail for admin
        elif path.startswith("/api/attempts/"):
            attempt_id_str = path.removeprefix("/api/attempts/").strip("/")
            try:
                attempt_id = int(attempt_id_str)
            except ValueError:
                self.send_error_json(400, "Invalid attempt ID")
                return
            result = get_attempt_by_id(attempt_id)
            if result is None:
                self.send_error_json(404, "Attempt not found")
                return
            self.send_json({"result": result})

        # /api/results/all — summary list for admin/faculty
        elif path == "/api/results/all":
            self.send_json({"attempts": get_all_attempts()})

        else:
            self.send_error_json(404, "Endpoint not found")

    def do_POST(self) -> None:
        path = urlparse(self.path).path
        if path != "/api/attempts":
            self.send_error_json(404, "Endpoint not found")
            return

        try:
            payload = self.read_json()
            result = save_attempt(payload)
            self.send_json({"result": result}, status=201)
        except Exception as exc:
            self.send_error_json(400, str(exc))

    def read_json(self) -> dict[str, Any]:
        length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(length).decode("utf-8") if length else "{}"
        return json.loads(raw or "{}")

    def send_json(self, payload: dict[str, Any], status: int = 200) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_cors_headers()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def send_error_json(self, status: int, message: str) -> None:
        self.send_json({"error": message}, status=status)

    def send_cors_headers(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def log_message(self, format: str, *args: Any) -> None:
        print(f"{self.address_string()} - {format % args}")


def run() -> None:
    init_db()
    server = ThreadingHTTPServer((HOST, PORT), VivaApiHandler)
    print(f"Result & Storage API running at http://{HOST}:{PORT}")
    print("Endpoints:")
    print("  GET  /api/health")
    print("  GET  /api/questions")
    print("  POST /api/attempts")
    print("  GET  /api/results/latest")
    print("  GET  /api/results/student/<student_id>")
    print("  GET  /api/results/all")
    print("  GET  /api/feedback/latest")
    server.serve_forever()


if __name__ == "__main__":
    run()
