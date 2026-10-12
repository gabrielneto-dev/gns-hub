"""PipeWire/PulseAudio output selection through pactl, without shell execution."""

from __future__ import annotations

import json
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Any


class AudioError(Exception):
    pass


def _available(value: Any) -> bool:
    return str(value).lower() not in {"no", "not available", "false"}


def _ports(raw: Any) -> list[dict[str, Any]]:
    if isinstance(raw, list):
        return [port for port in raw if isinstance(port, dict)]
    if isinstance(raw, dict):
        return [dict(value, name=key) for key, value in raw.items() if isinstance(value, dict)]
    return []


def _active_port(raw: Any) -> str | None:
    if isinstance(raw, str):
        return raw
    if isinstance(raw, dict):
        return raw.get("name")
    return None


def _kind(sink: dict[str, Any], port: dict[str, Any] | None) -> str:
    name = f"{sink.get('name', '')} {port.get('name', '') if port else ''}".lower()
    if "bluez" in name or "bluetooth" in name:
        return "Bluetooth"
    if "headphone" in name or "headset" in name:
        return "Fone"
    if "speaker" in name or "analog" in name:
        return "Alto-falante"
    if "hdmi" in name or "displayport" in name:
        return "HDMI / DisplayPort"
    if "usb" in name:
        return "USB"
    return "Saída"


def _label(sink: dict[str, Any], port: dict[str, Any] | None) -> str:
    sink_label = str(sink.get("description") or "").strip()
    if sink_label in {"", "(null)"}:
        sink_label = _kind(sink, port) if port is None else "Dispositivo de áudio"
    if not port:
        return sink_label
    port_label = str(port.get("description") or "").strip()
    if port_label in {"", "(null)"}:
        port_label = _kind(sink, port)
    if port_label.lower() == "speaker":
        return "Alto-falantes"
    if port_label.lower() == "headphones":
        return "Fone de ouvido"
    if port_label.lower() in sink_label.lower():
        return port_label
    return f"{port_label} · {sink_label}"


@dataclass
class Pactl:
    timeout: float = 5.0

    def run(self, *arguments: str) -> str:
        try:
            result = subprocess.run(
                ["pactl", *arguments], capture_output=True, text=True,
                timeout=self.timeout, check=False,
            )
        except (OSError, subprocess.TimeoutExpired) as exc:
            raise AudioError("Não foi possível acessar o servidor de áudio.") from exc
        if result.returncode:
            raise AudioError((result.stderr or "Falha no servidor de áudio.").strip()[:300])
        if len(result.stdout) > 2_000_000:
            raise AudioError("A resposta do servidor de áudio excedeu o limite permitido.")
        return result.stdout.strip()

    def listing(self, section: str) -> list[dict[str, Any]]:
        try:
            data = json.loads(self.run("-f", "json", "list", section))
        except json.JSONDecodeError as exc:
            raise AudioError("O servidor de áudio retornou dados inválidos.") from exc
        if not isinstance(data, list):
            raise AudioError("O servidor de áudio retornou um formato inesperado.")
        return [item for item in data if isinstance(item, dict)]


class AudioService:
    def __init__(self, store: Path, pactl: Pactl | None = None):
        self.store = store
        self.pactl = pactl or Pactl()

    def _settings(self) -> dict[str, Any]:
        try:
            data = json.loads(self.store.read_text())
            favorites = data.get("favorites", [])
            hidden = data.get("hidden", [])
            aliases = data.get("aliases", {})
            return {
                "favorites": [item for item in favorites if isinstance(item, str)] if isinstance(favorites, list) else [],
                "lastFavorite": data.get("lastFavorite"),
                "hidden": [item for item in hidden if isinstance(item, str)] if isinstance(hidden, list) else [],
                "aliases": {key: value for key, value in aliases.items() if isinstance(key, str) and isinstance(value, str)} if isinstance(aliases, dict) else {},
            }
        except (FileNotFoundError, ValueError, OSError):
            return {"favorites": [], "lastFavorite": None, "hidden": [], "aliases": {}}

    def _save(self, settings: dict[str, Any]) -> None:
        self.store.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
        temporary = self.store.with_suffix(".tmp")
        temporary.write_text(json.dumps(settings, ensure_ascii=False))
        temporary.chmod(0o600)
        temporary.replace(self.store)

    def _discover(self) -> tuple[list[dict[str, Any]], str]:
        sinks = self.pactl.listing("sinks")
        default = self.pactl.run("get-default-sink")
        outputs: list[dict[str, Any]] = []
        for sink in sinks:
            name = sink.get("name")
            if not isinstance(name, str) or not name:
                continue
            ports = _ports(sink.get("ports"))
            active_port = _active_port(sink.get("active_port"))
            # A sink with no exposed ports is still a selectable destination.
            for port in ports or [None]:
                port_name = port.get("name") if port else None
                if port and not isinstance(port_name, str):
                    continue
                output_id = json.dumps([name, port_name], separators=(",", ":"))
                outputs.append({
                    "id": output_id,
                    "label": _label(sink, port),
                    "kind": _kind(sink, port),
                    "available": _available(sink.get("availability")) and (not port or _available(port.get("availability"))),
                    "active": name == default and (port_name is None or port_name == active_port),
                    "sink": name,
                    "port": port_name,
                })
        return outputs, default

    def state(self) -> dict[str, Any]:
        outputs, _ = self._discover()
        settings = self._settings()
        for output in outputs:
            output["name"] = settings["aliases"].get(output["id"], output["label"])
            output["hidden"] = output["id"] in settings["hidden"]
        return {"outputs": outputs, "favorites": settings["favorites"], "lastFavorite": settings["lastFavorite"]}

    def favorites(self, ids: Any) -> dict[str, Any]:
        if not isinstance(ids, list) or len(ids) > 64 or not all(isinstance(x, str) for x in ids) or len(ids) != len(set(ids)):
            raise AudioError("A fila de favoritos é inválida.")
        current = {output["id"] for output in self.state()["outputs"]} | set(self._settings()["favorites"])
        if any(output_id not in current for output_id in ids):
            raise AudioError("Um destino não está mais na lista. Atualize as saídas.")
        settings = self._settings()
        settings["favorites"] = ids
        if settings["lastFavorite"] not in ids:
            settings["lastFavorite"] = None
        self._save(settings)
        return self.state()

    def rename(self, output_id: Any, name: Any) -> dict[str, Any]:
        if not isinstance(output_id, str) or not isinstance(name, str) or len(name) > 50:
            raise AudioError("Use um nome com até 50 caracteres.")
        if output_id not in {output["id"] for output in self.state()["outputs"]}:
            raise AudioError("Destino não encontrado. Atualize as saídas.")
        settings = self._settings()
        clean = name.strip()
        if clean:
            settings["aliases"][output_id] = clean
        else:
            settings["aliases"].pop(output_id, None)
        self._save(settings)
        return self.state()

    def visibility(self, output_id: Any, hidden: Any) -> dict[str, Any]:
        if not isinstance(output_id, str) or not isinstance(hidden, bool):
            raise AudioError("Pedido de visibilidade inválido.")
        if output_id not in {output["id"] for output in self.state()["outputs"]}:
            raise AudioError("Destino não encontrado. Atualize as saídas.")
        settings = self._settings()
        settings["hidden"] = [item for item in settings["hidden"] if item != output_id]
        if hidden:
            settings["hidden"].append(output_id)
        self._save(settings)
        return self.state()

    def select(self, output_id: str) -> dict[str, Any]:
        if not isinstance(output_id, str):
            raise AudioError("Destino inválido.")
        outputs, _ = self._discover()
        target = next((output for output in outputs if output["id"] == output_id), None)
        if not target:
            raise AudioError("Destino não encontrado. Atualize as saídas.")
        if not target["available"]:
            raise AudioError("Esta saída está indisponível.")
        sink = target["sink"]
        port = target["port"]
        if port:
            self.pactl.run("set-sink-port", sink, port)
        self.pactl.run("set-default-sink", sink)
        moved = 0
        warnings: list[str] = []
        for stream in self.pactl.listing("sink-inputs"):
            index = stream.get("index")
            if not isinstance(index, int):
                continue
            try:
                self.pactl.run("move-sink-input", str(index), sink)
                moved += 1
            except AudioError:
                # Streams may end while the list is being processed.
                warnings.append(f"Não foi possível mover o fluxo {index}.")
        settings = self._settings()
        if output_id in settings["favorites"]:
            settings["lastFavorite"] = output_id
            self._save(settings)
        state = self.state()
        actual = next((item for item in state["outputs"] if item["id"] == output_id), None)
        if not actual or not actual["active"]:
            warnings.append("O sistema não confirmou esta saída como ativa.")
        return {**state, "moved": moved, "warnings": warnings}

    def toggle(self) -> dict[str, Any]:
        state = self.state()
        by_id = {output["id"]: output for output in state["outputs"]}
        favorites = [item for item in state["favorites"] if item in by_id and by_id[item]["available"] and not by_id[item]["hidden"]]
        if len(favorites) < 2:
            raise AudioError("Deixe pelo menos dois favoritos visíveis e disponíveis para alternar.")
        active = next((item["id"] for item in state["outputs"] if item["active"]), None)
        destination = favorites[(favorites.index(active) + 1) % len(favorites)] if active in favorites else favorites[0]
        return self.select(destination)
