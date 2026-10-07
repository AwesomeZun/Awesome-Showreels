"""Regression tests for the sound chain: arrange.py --stem naming, mix_vo.py and verify_sync.py.

Slow (about a minute): it arranges real cuts of examples/research-cli in a temp copy.
Run from the repo root:  python3 -m unittest tests.test_audio_sync -v
"""
from __future__ import annotations

import json
import shutil
import subprocess
import sys
import tempfile
import unittest
import wave
from pathlib import Path

import numpy as np

SKILL = Path(__file__).resolve().parents[1] / "skills" / "motion-showreel"
EXAMPLE = SKILL / "examples" / "research-cli"
PY = [sys.executable, "-B"]


def run(*args: str, ok: bool = True) -> subprocess.CompletedProcess:
    r = subprocess.run([*PY, *args], capture_output=True, text=True)
    if ok and r.returncode != 0:
        raise AssertionError(f"{' '.join(args)} exited {r.returncode}\n{r.stdout[-3000:]}\n{r.stderr[-3000:]}")
    return r


class SoundChain(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        cls.P = Path(cls.tmp.name) / "rc"
        shutil.copytree(EXAMPLE, cls.P, ignore=shutil.ignore_patterns("build", "dist"))

    @classmethod
    def tearDownClass(cls):
        cls.tmp.cleanup()

    def verify(self, wav: Path, cut: str, ok: bool = True) -> str:
        r = run(str(SKILL / "audio" / "verify_sync.py"), "--wav", str(wav), "--cut", str(self.P / "build" / f"cut-{cut}.json"),
                ok=False)
        out = r.stdout + r.stderr
        if ok:
            self.assertEqual(r.returncode, 0, out[-4000:])
        return out

    def test_1_long_cut_tonal_pulses_pass(self):
        """60 s music: tonal 'pulse' cues once read one or two periods early (-10/-20 ms) and failed."""
        run(str(SKILL / "timing" / "plan_cut.py"), "--project", str(self.P), "--cut", "60", "-q")
        run(str(SKILL / "audio" / "arrange.py"), "--project", str(self.P), "--cut", "60", "--quiet")
        out = self.verify(self.P / "build" / "music-60.wav", "60")
        self.assertIn("PASS", out)

    def test_2_stem_keeps_the_song_and_mix_passes(self):
        """--stem writes music-<cut>-stem.* and leaves the mastered song alone; the ducked dry-run mix verifies."""
        P, b = self.P, self.P / "build"
        run(str(SKILL / "timing" / "plan_cut.py"), "--project", str(P), "--cut", "30", "-q")
        run(str(SKILL / "audio" / "arrange.py"), "--project", str(P), "--cut", "30", "--quiet")
        song = (b / "music-30.wav").read_bytes()
        run(str(SKILL / "narration" / "vo_timeline.py"), "--project", str(P), "--estimate")
        run(str(SKILL / "narration" / "tts_gemini.py"), "batch", "--project", str(P), "--dry-run")
        run(str(SKILL / "narration" / "vo_timeline.py"), "--project", str(P))
        run(str(SKILL / "timing" / "plan_cut.py"), "--project", str(P), "--cut", "30", "-q")
        run(str(SKILL / "audio" / "arrange.py"), "--project", str(P), "--cut", "30", "--stem", "--quiet")
        self.assertTrue((b / "music-30-stem.wav").exists())
        self.assertTrue(json.loads((b / "music-30-stem.json").read_text())["stem"])
        self.assertEqual((b / "music-30.wav").read_bytes(), song, "--stem overwrote the mastered song")
        self.assertFalse(json.loads((b / "music-30.json").read_text())["stem"])
        run(str(SKILL / "narration" / "mix_vo.py"), "--project", str(P), "--cut", "30")
        rep = json.loads((b / "mix-30.json").read_text())
        self.assertTrue(rep["placeholder"])
        self.assertTrue(rep["bed"].endswith("music-30-stem.wav"))
        out = self.verify(b / "mix-30.wav", "30")          # cues under the voice once failed (+81 ms, -60 ms)
        self.assertIn("placeholder narration", out)
        self.verify(b / "music-30-stem.wav", "30")

    def test_3_real_offset_still_fails(self):
        """A soundtrack 20 ms late (beyond one frame, inside the beat-grid tolerance) must FAIL per cue."""
        b = self.P / "build"
        if not (b / "music-30.wav").exists():
            run(str(SKILL / "timing" / "plan_cut.py"), "--project", str(self.P), "--cut", "30", "-q")
            run(str(SKILL / "audio" / "arrange.py"), "--project", str(self.P), "--cut", "30", "--quiet")
        with wave.open(str(b / "music-30.wav")) as w:
            sr, ch, sw, n = w.getframerate(), w.getnchannels(), w.getsampwidth(), w.getnframes()
            raw = w.readframes(n)
        shift = int(0.020 * sr) * ch * sw
        late = b / "late-30.wav"
        with wave.open(str(late), "wb") as w:
            w.setnchannels(ch)
            w.setsampwidth(sw)
            w.setframerate(sr)
            w.writeframes(bytes(shift) + raw[: len(raw) - shift])
        shutil.copyfile(b / "music-30.json", b / "late-30.json")
        out = self.verify(late, "30", ok=False)
        self.assertIn("FAIL", out.splitlines()[-1])
        self.assertGreaterEqual(out.count(" FAIL "), 3, out[-3000:])


if __name__ == "__main__":
    unittest.main()
