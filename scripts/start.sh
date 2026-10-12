#!/usr/bin/env bash
# Start the Kamai Passport dev server at http://127.0.0.1:4317.
# Usage: ./scripts/start.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PORT=4317
URL="http://127.0.0.1:${PORT}"
RUN_DIR="${ROOT}/.kamai"
PID_FILE="${RUN_DIR}/dev.pid"
LOG_FILE="${RUN_DIR}/dev.log"

export NO_PROXY="127.0.0.1,localhost"
export no_proxy="127.0.0.1,localhost"

mkdir -p "$RUN_DIR"

app_is_up() {
  curl --noproxy '*' -fsS --max-time 2 "$URL" 2>/dev/null | grep -q "Kamai Passport"
}

port_is_busy() {
  local pids
  pids="$(lsof -nP -iTCP:"${PORT}" -sTCP:LISTEN -t 2>/dev/null || true)"
  [[ -n "${pids//[[:space:]]/}" ]]
}

if app_is_up; then
  echo "Kamai Passport is already running at ${URL}"
  exit 0
fi

if port_is_busy; then
  echo "Port ${PORT} is in use, but Kamai Passport is not responding at ${URL}." >&2
  exit 1
fi

if [[ ! -d node_modules ]]; then
  npm install
fi

: >"$LOG_FILE"

perl -e '
  use POSIX qw(setsid);
  open(STDOUT, ">>", $ARGV[0]) or die $!;
  open(STDERR, ">>&STDOUT") or die $!;
  setsid();
  exec("npm", "run", "dev") or die $!;
' "$LOG_FILE" &
echo $! >"$PID_FILE"
disown "$!" 2>/dev/null || true

for _ in $(seq 1 120); do
  if app_is_up; then
    echo "Kamai Passport is running at ${URL}"
    exit 0
  fi
  if ! kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
    echo "Dev server exited before it was ready. See ${LOG_FILE}" >&2
    tail -n 40 "$LOG_FILE" >&2 || true
    exit 1
  fi
  sleep 0.5
done

echo "Timed out waiting for ${URL}. See ${LOG_FILE}" >&2
tail -n 40 "$LOG_FILE" >&2 || true
exit 1
