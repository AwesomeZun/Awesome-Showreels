"""Regression tests for timing/plan_cut.py.

Run from the repo root:  python3 -m unittest discover -s tests -v
"""
from __future__ import annotations

import contextlib
import copy
import io
import json
import sys
import tempfile
import unittest
from pathlib import Path

SKILL = Path(__file__).resolve().parents[1] / "skills" / "motion-showreel"
sys.path.insert(0, str(SKILL / "timing"))
sys.dont_write_bytecode = True
import plan_cut  # noqa: E402


def run(project: Path, *args: str) -> tuple[int, str]:
    out, err = io.StringIO(), io.StringIO()
    with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
        rc = plan_cut.main(["--project", str(project), *args])
    return rc, out.getvalue() + err.getvalue()


class BarLineQA(unittest.TestCase):
    """Long cuts at any integer tempo must pass the planner's own bar-line QA (exit 4 was a rounding bug)."""

    def test_template_every_tempo_and_length(self):
        cfg = json.loads((SKILL / "templates" / "reel.config.template.json").read_text())
        lengths = (15, 30, 60, 90, 120)
        failures = []
        with tempfile.TemporaryDirectory() as tmp:
            for bpm in range(70, 151):
                c = copy.deepcopy(cfg)
                c["bpm"] = bpm
                c["cuts"] = {str(s): {"seconds": s} for s in lengths}
                c["cuts"]["15"] = cfg["cuts"]["15"]
                p = Path(tmp) / f"p{bpm}"
                p.mkdir()
                (p / "reel.config.json").write_text(json.dumps(c))
                for s in lengths:
                    rc, log = run(p, "--cut", str(s), "--no-write", "-q")
                    if rc == 4:
                        failures.append(f"{bpm} BPM {s} s: {log.strip()[:160]}")
        self.assertEqual(failures, [], "\n".join(failures[:10]))

    def test_known_bad_tempi(self):
        """116 BPM / 60 s and 130 BPM / 120 s failed before the fix."""
        cfg = json.loads((SKILL / "templates" / "reel.config.template.json").read_text())
        with tempfile.TemporaryDirectory() as tmp:
            for bpm, sec in ((116, 60), (130, 120), (123, 90), (94, 60)):
                c = copy.deepcopy(cfg)
                c["bpm"] = bpm
                c["cuts"] = {str(sec): {"seconds": sec}}
                p = Path(tmp) / f"p{bpm}"
                p.mkdir()
                (p / "reel.config.json").write_text(json.dumps(c))
                rc, log = run(p, "--cut", str(sec), "--no-write", "-q")
                self.assertNotEqual(rc, 4, f"{bpm} BPM {sec} s: {log}")


class NarrationFilterWarning(unittest.TestCase):
    """A narration line tagged for other cuts must not silently disappear from a new cut."""

    def test_warns_when_cuts_filter_drops_lines(self):
        import subprocess
        cfg = json.loads((SKILL / "templates" / "reel.config.template.json").read_text())
        cfg["bpm"] = 120
        with tempfile.TemporaryDirectory() as tmp:
            p = Path(tmp)
            (p / "reel.config.json").write_text(json.dumps(cfg))
            (p / "narration.json").write_text(json.dumps({"lang": "en", "lines": [
                {"scene": "hook", "text": "Every cut hears this line."},
                {"scene": "proof", "text": "Only the thirty-second cut hears this one.", "cuts": ["30"]},
            ]}))
            r = subprocess.run([sys.executable, str(SKILL / "narration" / "vo_timeline.py"), "--project", str(p),
                                "--estimate"], capture_output=True, text=True)
            self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
            rc, log = run(p, "--cut", "60", "--no-write")
            self.assertIn("proof play in cut 60 without their lines", log)
            rc, log = run(p, "--cut", "30", "--no-write")
            self.assertNotIn("without their lines", log)
            self.assertNotIn("narration.json differs", log)
            # the script gains "60" but vo_timeline.py is not re-run: the planner names the stale timeline instead
            (p / "narration.json").write_text(json.dumps({"lang": "en", "lines": [
                {"scene": "hook", "text": "Every cut hears this line."},
                {"scene": "proof", "text": "Only the thirty-second cut hears this one.", "cuts": ["30", "60"]},
            ]}))
            rc, log = run(p, "--cut", "60", "--no-write")
            self.assertIn("narration.json differs from build/vo-timeline.json", log)
            self.assertNotIn("without their lines (tagged", log)


if __name__ == "__main__":
    unittest.main()
