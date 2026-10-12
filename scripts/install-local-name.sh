#!/usr/bin/env bash
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Execute como administrador: sudo ./scripts/install-local-name.sh" >&2
  exit 1
fi

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [[ ! -f "$project_root/deploy/gns-hub-proxy.socket" ]]; then
  echo "Arquivos de implantação ausentes." >&2
  exit 1
fi

python3 - <<'PY'
from pathlib import Path

path = Path("/etc/hosts")
lines = path.read_text().splitlines()
target = "127.0.0.1 gns.hub # gns-hub local"
updated = [line for line in lines if "# gns-hub local" not in line]
existing = [line.split("#", 1)[0].split() for line in updated]
matches = [parts[0] for parts in existing if len(parts) > 1 and "gns.hub" in parts[1:]]
if matches and any(address != "127.0.0.1" for address in matches):
    raise SystemExit("gns.hub já aponta para outro endereço em /etc/hosts.")
if not matches:
    updated.append(target)
if updated != lines:
    path.write_text("\n".join(updated) + "\n")
PY

install -m 0644 "$project_root/deploy/gns-hub-proxy.socket" /etc/systemd/system/gns-hub-proxy.socket
install -m 0644 "$project_root/deploy/gns-hub-proxy.service" /etc/systemd/system/gns-hub-proxy.service
systemctl daemon-reload
systemctl enable --now gns-hub-proxy.socket
systemctl status gns-hub-proxy.socket --no-pager
