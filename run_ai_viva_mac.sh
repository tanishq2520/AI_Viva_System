#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_DIR="$ROOT/result_storage_module"
UI_DIR="$ROOT/Viva_UI_Module-main/Viva_UI_Module-main"
QUESTION_DIR="$ROOT/ai_viva_question_module-main/ai_viva_question_module-main"
VALIDATION_DIR="$ROOT/Validation-Module_AI-Viva-main/Validation-Module_AI-Viva-main"
SPEECH_DIR="$ROOT/Viva-speech-Module-main/Viva-speech-Module-main"
LOG_DIR="$ROOT/.run_logs"

mkdir -p "$LOG_DIR"

python_cmd() {
  if command -v python3 >/dev/null 2>&1; then
    echo "python3"
  elif command -v python >/dev/null 2>&1; then
    echo "python"
  else
    echo ""
  fi
}

PYTHON="$(python_cmd)"
if [[ -z "$PYTHON" ]]; then
  echo "Python was not found. Install Python 3 and run this script again."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm was not found. Install Node.js/npm and run this script again."
  exit 1
fi

ensure_python_deps() {
  local module_dir="$1"
  local requirements="$module_dir/requirements.txt"
  if [[ -f "$requirements" ]]; then
    "$PYTHON" -m pip install -r "$requirements"
  fi
}

start_service() {
  local name="$1"
  local dir="$2"
  shift 2

  if [[ ! -d "$dir" ]]; then
    echo "Skipping $name: directory not found at $dir"
    return
  fi

  echo "Starting $name..."
  (
    cd "$dir"
    "$@"
  ) >"$LOG_DIR/$name.log" 2>&1 &
  echo $! >"$LOG_DIR/$name.pid"
}

cleanup_old_processes() {
  for pid_file in "$LOG_DIR"/*.pid; do
    [[ -f "$pid_file" ]] || continue
    old_pid="$(cat "$pid_file" || true)"
    if [[ -n "${old_pid:-}" ]] && kill -0 "$old_pid" >/dev/null 2>&1; then
      kill "$old_pid" >/dev/null 2>&1 || true
    fi
    rm -f "$pid_file"
  done
}

trap 'echo; echo "Stopping AI Viva services..."; cleanup_old_processes' INT TERM

cleanup_old_processes

echo "Preparing AI Viva System..."

if [[ -f "$SPEECH_DIR/setup_db.py" ]]; then
  echo "Initializing Speech module database..."
  (cd "$SPEECH_DIR" && "$PYTHON" setup_db.py) >"$LOG_DIR/speech_setup.log" 2>&1 || true
fi

if [[ -d "$UI_DIR" && ! -d "$UI_DIR/node_modules" ]]; then
  echo "Installing UI dependencies..."
  (cd "$UI_DIR" && npm install)
fi

if [[ -d "$QUESTION_DIR" && ! -f "$QUESTION_DIR/.env" ]]; then
  cat >"$QUESTION_DIR/.env" <<EOF
DATABASE_URL=sqlite:///./question_module.db
SECRET_KEY=ai-viva-local-dev-secret
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
EOF
fi

if [[ -d "$VALIDATION_DIR" && ! -f "$VALIDATION_DIR/.env" ]]; then
  cat >"$VALIDATION_DIR/.env" <<EOF
MODEL_NAME=all-MiniLM-L6-v2
MULTILINGUAL_MODEL_NAME=paraphrase-multilingual-MiniLM-L12-v2
GEMINI_API_KEY=
EOF
fi

if command -v uvicorn >/dev/null 2>&1; then
  UVICORN="uvicorn"
else
  UVICORN="$PYTHON -m uvicorn"
fi

start_service "result_storage_api" "$API_DIR" "$PYTHON" server.py

if [[ -f "$QUESTION_DIR/main.py" ]]; then
  start_service "question_api" "$QUESTION_DIR" bash -lc "$UVICORN main:app --host 127.0.0.1 --port 8001"
fi

if [[ -f "$VALIDATION_DIR/app/main.py" ]]; then
  start_service "validation_api" "$VALIDATION_DIR" env DEBUG=True APP_ENV=development bash -lc "$UVICORN app.main:app --host 127.0.0.1 --port 8002"
fi

start_service "proxy_server" "$ROOT" "$PYTHON" proxy_server.py
start_service "ui" "$UI_DIR" npm run dev -- --host 127.0.0.1 --port 5173

echo
echo "AI Viva services are starting."
echo
echo "Proxy Server:           http://127.0.0.1:8000"
echo "UI:                     http://127.0.0.1:5173"
echo
echo "Logs are in: $LOG_DIR"
echo "Press Ctrl+C in this terminal to stop services started by this script."

while true; do
  sleep 3600
done
