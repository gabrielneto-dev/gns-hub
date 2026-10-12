#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
frontend="$project_root/apps/desktop"

if [[ ! -f "$frontend/dist/index.html" ]]; then
  if [[ ! -d "$frontend/node_modules" ]]; then
    (cd "$frontend" && npm ci)
  fi
  (cd "$frontend" && npm run build)
fi

exec python3 "$project_root/apps/backend/server.py" "$@"
