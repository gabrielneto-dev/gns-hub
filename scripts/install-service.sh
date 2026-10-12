#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [[ "$project_root" != "$HOME/gns-hub" ]]; then
  echo "Este serviço espera o projeto em $HOME/gns-hub." >&2
  exit 1
fi

if [[ ! -f "$project_root/apps/desktop/dist/index.html" ]]; then
  (cd "$project_root/apps/desktop" && npm ci && npm run build)
fi

systemctl --user link "$project_root/deploy/gns-hub.service"
systemctl --user daemon-reload
systemctl --user enable --now gns-hub.service
systemctl --user status gns-hub.service --no-pager
