#!/bin/sh
set -eu

export RUST_API_HOST="${RUST_API_HOST:-0.0.0.0}"
export RUST_API_PORT="${PORT:-8080}"
export REDIS_URL="${REDIS_URL:-redis://127.0.0.1:6379}"
export PYTHON_SERVICE_URL="${PYTHON_SERVICE_URL:-http://127.0.0.1:8000}"
export RUST_API_URL="${RUST_API_URL:-http://127.0.0.1:${RUST_API_PORT}}"
export PYTHON_API_PORT="${PYTHON_API_PORT:-8000}"

redis-server --daemonize yes --save "" --appendonly no

cd /app/python-services
uvicorn app.main:app --host 127.0.0.1 --port "$PYTHON_API_PORT" --workers "${PYTHON_WORKERS:-2}" &
python_pid=$!

companyagent-api &
rust_pid=$!

shutdown() {
  kill "$python_pid" "$rust_pid" 2>/dev/null || true
  redis-cli shutdown 2>/dev/null || true
}

trap shutdown INT TERM

while true; do
  if ! kill -0 "$rust_pid" 2>/dev/null; then
    wait "$rust_pid"
    exit $?
  fi

  if ! kill -0 "$python_pid" 2>/dev/null; then
    wait "$python_pid"
    exit $?
  fi

  sleep 2
done
