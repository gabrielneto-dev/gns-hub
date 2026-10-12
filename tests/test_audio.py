import json
import tempfile
import unittest
from pathlib import Path
from sys import path

path.insert(0, str(Path(__file__).resolve().parents[1] / "apps" / "backend"))
from audio import AudioError, AudioService  # noqa: E402


class FakePactl:
    def __init__(self):
        self.default = "analog"
        self.port = "speaker"
        self.calls = []
        self.headphones = True
        self.streams = [{"index": 17}]

    def listing(self, section):
        if section == "sink-inputs":
            return self.streams
        return [{"name": "analog", "description": "Áudio integrado", "active_port": self.port,
                 "ports": [{"name": "speaker", "description": "Alto-falantes", "availability": "available"},
                           {"name": "headphones", "description": "Fone P2", "availability": "available" if self.headphones else "not available"}]},
                {"name": "bluez", "description": "Fone Bluetooth", "ports": []}]

    def run(self, *args):
        self.calls.append(args)
        if args[0] == "get-default-sink":
            return self.default
        if args[0] == "set-sink-port":
            self.port = args[2]
        if args[0] == "set-default-sink":
            self.default = args[1]
        return ""


class AudioTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.fake = FakePactl()
        self.service = AudioService(Path(self.temp.name) / "audio.json", self.fake)

    def tearDown(self):
        self.temp.cleanup()

    def test_port_switch_and_active_stream(self):
        outputs = self.service.state()["outputs"]
        fone = next(output for output in outputs if output["port"] == "headphones")
        result = self.service.select(fone["id"])
        self.assertTrue(next(output for output in result["outputs"] if output["id"] == fone["id"])["active"])
        self.assertIn(("set-sink-port", "analog", "headphones"), self.fake.calls)
        self.assertIn(("move-sink-input", "17", "analog"), self.fake.calls)
        self.assertEqual(result["moved"], 1)

    def test_favorites_and_toggle(self):
        outputs = self.service.state()["outputs"]
        speaker = next(output["id"] for output in outputs if output["port"] == "speaker")
        bluetooth = next(output["id"] for output in outputs if output["sink"] == "bluez")
        self.service.favorites([speaker, bluetooth])
        result = self.service.toggle()
        self.assertEqual(self.fake.default, "bluez")
        self.assertEqual(result["lastFavorite"], bluetooth)
        self.assertEqual(json.loads(self.service.store.read_text())["favorites"], [speaker, bluetooth])

    def test_unavailable_and_bad_input(self):
        self.fake.headphones = False
        fone = next(output for output in self.service.state()["outputs"] if output["port"] == "headphones")
        with self.assertRaises(AudioError):
            self.service.select(fone["id"])
        with self.assertRaises(AudioError):
            self.service.favorites([["not a string"]])
        self.assertFalse(any(call[0] == "set-sink-port" for call in self.fake.calls))

    def test_cycle_three_destinations_and_wrap(self):
        outputs = self.service.state()["outputs"]
        ids = [next(item["id"] for item in outputs if item["port"] == port) for port in ("speaker", "headphones")]
        ids.append(next(item["id"] for item in outputs if item["sink"] == "bluez"))
        self.service.favorites(ids)
        for expected in (ids[1], ids[2], ids[0]):
            self.service.toggle()
            active = next(item["id"] for item in self.service.state()["outputs"] if item["active"])
            self.assertEqual(active, expected)

    def test_hidden_and_unavailable_favorites_are_skipped(self):
        outputs = self.service.state()["outputs"]
        speaker = next(item["id"] for item in outputs if item["port"] == "speaker")
        fone = next(item["id"] for item in outputs if item["port"] == "headphones")
        bluetooth = next(item["id"] for item in outputs if item["sink"] == "bluez")
        self.service.favorites([speaker, fone, bluetooth])
        self.service.visibility(fone, True)
        self.service.toggle()
        self.assertEqual(self.fake.default, "bluez")
        self.fake.headphones = False
        self.service.toggle()
        self.assertEqual(self.fake.default, "analog")
        self.assertEqual(self.fake.port, "speaker")

    def test_custom_name_and_visibility_persist(self):
        output = self.service.state()["outputs"][0]
        self.service.rename(output["id"], "Mesa")
        self.service.visibility(output["id"], True)
        fresh = AudioService(self.service.store, self.fake)
        restored = next(item for item in fresh.state()["outputs"] if item["id"] == output["id"])
        self.assertEqual(restored["name"], "Mesa")
        self.assertTrue(restored["hidden"])
        fresh.rename(output["id"], "")
        self.assertEqual(next(item for item in fresh.state()["outputs"] if item["id"] == output["id"])["name"], output["label"])


if __name__ == "__main__":
    unittest.main()
