#!/usr/bin/env bash
# Stop the Kamai Passport dev server started by scripts/start.sh.
# Usage: ./scripts/stop.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT=4317
PID_FILE="${ROOT}/.kamai/dev.pid"

port_pids() {
  lsof -nP -iTCP:"${PORT}" -sTCP:LISTEN -t 2>/dev/null || true
}

port_is_busy() {
  local pids
  pids="$(port_pids)"
  [[ -n "${pids//[[:space:]]/}" ]]
}

stop_pid() {
  local pid="$1"
  if ! kill -0 "$pid" 2>/dev/null; then
    return 0
  fi
  kill -TERM -- "-${pid}" 2>/dev/null || kill -TERM "$pid" 2>/dev/null || true
  for _ in $(seq 1 20); do
    kill -0 "$pid" 2>/dev/null || return 0
    sleep 0.25
  done
  kill -KILL -- "-${pid}" 2>/dev/null || kill -KILL "$pid" 2>/dev/null || true
}

if [[ -f "$PID_FILE" ]]; then
  pid="$(tr -d '[:space:]' <"$PID_FILE")"
  if [[ "$pid" =~ ^[0-9]+$ ]]; then
    stop_pid "$pid"
  fi
  rm -f "$PID_FILE"
fi

if port_is_busy; then
  while read -r pid; do
    [[ -z "$pid" ]] && continue
    args="$(ps -p "$pid" -o args= 2>/dev/null || true)"
    if [[ "$args" == *"${ROOT}"* ]]; then
      stop_pid "$pid"
    fi
  done < <(port_pids)
fi

for _ in $(seq 1 20); do
  if ! port_is_busy; then
    echo "Kamai Passport is stopped."
    exit 0
  fi
  sleep 0.25
done

echo "Port ${PORT} is still in use." >&2
lsof -nP -iTCP:"${PORT}" -sTCP:LISTEN >&2 || true
exit 1
