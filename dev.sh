#!/usr/bin/env bash
set -euo pipefail
if ! command -v bun >/dev/null 2>&1; then
  echo 'Bun no está instalado o no se encuentra en PATH.'
  exit 1
fi
if [ ! -f .env ]; then cp .env.example .env; fi
export NODE_ENV=development
SERVER_PID=''
WEB_PID=''
cleanup() {
  trap - EXIT INT TERM
  if [ -n "$SERVER_PID" ]; then kill "$SERVER_PID" 2>/dev/null || true; fi
  if [ -n "$WEB_PID" ]; then kill "$WEB_PID" 2>/dev/null || true; fi
}
trap cleanup EXIT INT TERM
bun run db:migrate
echo 'AulaPlay online · http://localhost:5173'
echo 'Las credenciales nuevas aparecen una sola vez en la consola del primer arranque.'
bun --watch src/entry.ts &
SERVER_PID=$!
bun --bun run dev:web --host &
WEB_PID=$!
wait -n "$SERVER_PID" "$WEB_PID"
