"""Local-only server for the gns-hub desktop interface."""

from __future__ import annotations

import json
import os
import secrets
import sys
import threading
import webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

from audio import AudioError, AudioService

ROOT = Path(__file__).resolve().parents[2]
DIST = ROOT / "apps" / "desktop" / "dist"
CONFIG = Path(os.environ.get("XDG_CONFIG_HOME", Path.home() / ".config")) / "gns-hub" / "audio.json"
SERVICE = AudioService(CONFIG)
TOKEN = secrets.token_urlsafe(32)
LOCK = threading.Lock()


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DIST), **kwargs)

    def _host_ok(self) -> bool:
        host = self.headers.get("Host", "")
        return host in {f"127.0.0.1:{self.server.server_port}", f"localhost:{self.server.server_port}"}

    def _respond(self, status: int, payload: dict) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if not self._host_ok():
            self._respond(403, {"error": "Host inválido."})
            return
        path = urlsplit(self.path).path
        if path == "/api/session":
            self._respond(200, {"token": TOKEN})
        elif path == "/api/audio":
            try:
                self._respond(200, SERVICE.state())
            except AudioError as exc:
                self._respond(503, {"error": str(exc)})
        else:
            super().do_GET()

    def do_POST(self):
        origin = self.headers.get("Origin", "")
        allowed_origins = {f"http://127.0.0.1:{self.server.server_port}", f"http://localhost:{self.server.server_port}"}
        if not self._host_ok() or origin not in allowed_origins or self.headers.get("X-GNS-Token") != TOKEN:
            self._respond(403, {"error": "Acesso não autorizado."})
            return
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if size < 0 or size > 4096:
                raise ValueError
            body = json.loads(self.rfile.read(size))
            if not isinstance(body, dict):
                raise ValueError
        except (ValueError, json.JSONDecodeError):
            self._respond(400, {"error": "Pedido inválido."})
            return
        try:
            with LOCK:
                if self.path == "/api/audio/select":
                    result = SERVICE.select(body.get("id"))
                elif self.path == "/api/audio/favorites":
                    result = SERVICE.favorites(body.get("ids"))
                elif self.path == "/api/audio/toggle":
                    result = SERVICE.toggle()
                else:
                    self._respond(404, {"error": "Ação não encontrada."})
                    return
            self._respond(200, result)
        except AudioError as exc:
            self._respond(409, {"error": str(exc)})


def main() -> None:
    if not (DIST / "index.html").exists():
        sys.exit("Interface ausente. Execute `npm install --offline && npm run build` em apps/desktop.")
    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    url = f"http://127.0.0.1:{server.server_port}"
    print(f"gns-hub disponível em {url}", flush=True)
    if "--no-browser" not in sys.argv:
        webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
