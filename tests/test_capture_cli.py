"""Leak tests for tools/capture_cli.py: nothing secret or identifying may reach the shipped cast, sidecar or screen.

Run from the repo root:  python3 -m unittest tests.test_capture_cli -v
(macOS/Linux only: the recorder needs a pseudo-terminal.)
"""
from __future__ import annotations

import getpass
import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SKILL = Path(__file__).resolve().parents[1] / "skills" / "motion-showreel"
TOOL = SKILL / "tools" / "capture_cli.py"
FAKE_OPENAI = "sk-proj-" + "FAKEfake0123456789abcdefFAKE"          # shaped like a key; not a real one
FAKE_GITHUB = "ghp_" + "FAKEfake0123456789abcdefghijklmnopqr"
FAKE_ENV = "zq81-not-a-real-token-7f3a"


def shipped(cast: Path) -> str:
    return "\n".join(p.read_text(encoding="utf-8") for p in (cast, cast.with_suffix(".json"), cast.with_suffix(".screen.txt"))
                     if p.exists())


class CaptureLeaks(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.dir = Path(self.tmp.name)

    def tearDown(self):
        self.tmp.cleanup()

    def rec(self, *args: str, ok: bool = True) -> subprocess.CompletedProcess:
        r = subprocess.run([sys.executable, "-B", str(TOOL), *args], capture_output=True, text=True, cwd=self.dir,
                           env={**os.environ, "MY_SERVICE_TOKEN": "inherited-secret-value-123"})
        if ok:
            self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        return r

    def scan(self, cast: Path) -> int:
        return subprocess.run([sys.executable, "-B", str(TOOL), "scan", str(cast)], capture_output=True, text=True).returncode

    def test_no_echo_command_line_is_masked(self):
        cast = self.dir / "a.cast"
        self.rec("--cmd", f"echo ok # token={FAKE_OPENAI}", "--no-echo", "--out", str(cast))
        self.assertNotIn(FAKE_OPENAI, shipped(cast))
        self.assertEqual(self.scan(cast), 0)

    def test_sent_keys_are_masked(self):
        cast = self.dir / "b.cast"
        self.rec("--cmd", "read -r x; echo got", "--send", f"0.3:{FAKE_GITHUB}\\n", "--out", str(cast), "--timeout", "10")
        self.assertNotIn(FAKE_GITHUB, shipped(cast))

    def test_env_values_are_masked(self):
        cast = self.dir / "c.cast"
        self.rec("--cmd", "echo $MY_TOKEN; echo $MY_SERVICE_TOKEN", "--env", f"MY_TOKEN={FAKE_ENV}",
                 "--keep-env", "MY_SERVICE_TOKEN", "--out", str(cast))
        text = shipped(cast)
        self.assertNotIn(FAKE_ENV, text)
        self.assertNotIn("inherited-secret-value-123", text)

    def test_sidecar_lists_no_env_names(self):
        cast = self.dir / "d.cast"
        self.rec("--cmd", "echo hi", "--out", str(cast))
        side = json.loads(cast.with_suffix(".json").read_text())
        self.assertIsInstance(side["env"]["dropped"], int)
        self.assertNotIn("MY_SERVICE_TOKEN", shipped(cast))

    def test_scan_sees_header_sidecar_and_identity(self):
        cast = self.dir / "e.cast"
        self.rec("--cmd", "echo hi", "--out", str(cast))
        self.assertEqual(self.scan(cast), 0)
        # plant a secret in the header title and the home path in the sidecar: scan must fail, --fix must clean
        lines = cast.read_text(encoding="utf-8").split("\n")
        head = json.loads(lines[0])
        head["title"] = f"demo {FAKE_OPENAI}"
        lines[0] = json.dumps(head)
        cast.write_text("\n".join(lines), encoding="utf-8")
        side = json.loads(cast.with_suffix(".json").read_text())
        side["cwd"] = os.path.expanduser("~") + "/somewhere"
        cast.with_suffix(".json").write_text(json.dumps(side))
        self.assertEqual(self.scan(cast), 1)
        r = subprocess.run([sys.executable, "-B", str(TOOL), "scan", str(cast), "--fix"], capture_output=True, text=True)
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        text = shipped(cast)
        self.assertNotIn(FAKE_OPENAI, text)
        self.assertNotIn(os.path.expanduser("~") + "/", text)
        self.assertEqual(self.scan(cast), 0)

    def test_side_effect_commands_are_refused(self):
        r = self.rec("--cmd", "git push origin main", "--out", str(self.dir / "f.cast"), ok=False)
        self.assertNotEqual(r.returncode, 0)
        self.assertIn("refusing", r.stderr)
        self.assertFalse((self.dir / "f.cast").exists())

    def test_flattened_temp_path_user_is_anonymized(self):
        user = getpass.getuser()
        if len(user) < 3:
            self.skipTest("short user name")
        cast = self.dir / "g.cast"
        self.rec("--cmd", f"echo /private/tmp/claude/-Users-{user}-proj/x", "--out", str(cast))
        self.assertNotIn(f"-Users-{user}-", shipped(cast))


if __name__ == "__main__":
    unittest.main()
