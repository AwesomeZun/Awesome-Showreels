"""Regression tests for tools: pdf_figures.py (layout boxes, headings, panels, --find, PyMuPDF compatibility),
motion_qa.py (frozen runs and pops) and prep_assets.py (fresh project, exit code).

Run from the repo root:  python3 -B -m unittest tests.test_tools -v
"""
from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SKILL = Path(__file__).resolve().parents[1] / "skills" / "motion-showreel"
PY = [sys.executable, "-B"]


def paper_pdf(path: Path) -> None:
    try:
        import pymupdf as fitz
    except ImportError:
        import fitz
    doc = fitz.open()
    page = doc.new_page(width=612, height=792)
    page.insert_text((72, 80), "Sparse Attention Benchmarks Made Comparable", fontsize=18)
    page.draw_rect(fitz.Rect(72, 110, 540, 250), color=(0.8, 0.8, 0.85), fill=(0.93, 0.94, 0.97))     # abstract box
    page.insert_textbox(fitz.Rect(84, 120, 528, 245), ("Abstract. Kernels that skip empty blocks report speedups that are hard "
                        "to compare. On the demo run the sparse kernel reaches 4.1x the dense throughput. ") * 3, fontsize=9.5)
    page.insert_text((72, 275), "1 Introduction", fontsize=13)
    page.insert_textbox(fitz.Rect(72, 285, 540, 380), "Attention cost grows with the square of the length. " * 6, fontsize=10)
    page.draw_line((140, 600), (480, 600)); page.draw_line((140, 600), (140, 420))
    for i, h in enumerate([40, 70, 110, 150]):
        page.draw_rect(fitz.Rect(170 + i * 70, 600 - h, 210 + i * 70, 600), fill=(0.2, 0.7, 0.9), color=None)
    page.insert_text((150, 432), "(a)", fontsize=9); page.insert_text((330, 432), "(b)", fontsize=9)
    page.insert_text((72, 640), "Figure 1: Throughput relative to dense attention.", fontsize=9)
    page.insert_textbox(fitz.Rect(72, 655, 540, 760), "Attention cost grows with the square of the length. " * 6, fontsize=10)
    doc.save(str(path))


class PdfFigures(unittest.TestCase):
    def test_figures_panels_find_and_no_layout_boxes(self):
        with tempfile.TemporaryDirectory() as tmp:
            pdf = Path(tmp) / "paper.pdf"
            paper_pdf(pdf)
            r = subprocess.run([*PY, str(SKILL / "tools" / "pdf_figures.py"), str(pdf), "--out", str(Path(tmp) / "out"),
                                "--find", "4.1x the dense throughput"], capture_output=True, text=True)
            self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
            idx = json.loads((Path(tmp) / "out" / "paper" / "figures.json").read_text())
            kinds = [i["kind"] for i in idx["items"]]
            self.assertEqual(kinds, ["figure"], f"the abstract box must not become a graphic: {kinds}")
            fig = idx["items"][0]
            self.assertEqual([p["panel"] for p in fig.get("panels", [])], ["a", "b"])
            self.assertTrue(idx.get("finds") and idx["finds"][0]["page"] == 1)
            self.assertNotIn("Introduction", json.dumps(idx["items"]))


class MotionQA(unittest.TestCase):
    def test_frozen_run_and_pop(self):
        from PIL import Image, ImageDraw
        with tempfile.TemporaryDirectory() as tmp:
            for i in range(120):
                im = Image.new("L", (640, 360), 40)
                g = ImageDraw.Draw(im)
                x = 100 + (i if i < 40 or i >= 100 else 40) * 4      # moves, holds still for 1 s, moves again
                g.ellipse([x, 150, x + 60, 210], fill=220)
                if i == 110:
                    g.rectangle([0, 0, 640, 360], fill=255)          # a one-frame pop
                im.save(Path(tmp) / f"f{i:04d}.png")
            out = Path(tmp) / "r.json"
            r = subprocess.run([*PY, str(SKILL / "tools" / "motion_qa.py"), "--frames", tmp, "--fps", "60", "--json", str(out)],
                               capture_output=True, text=True)
            self.assertEqual(r.returncode, 1, r.stdout + r.stderr)
            rep = json.loads(out.read_text())
            self.assertEqual(len(rep["frozen"]), 1)
            self.assertGreater(rep["frozen"][0]["seconds"], 0.8)
            self.assertTrue(any(abs(p["t"] - 110 / 60) < 0.02 for p in rep["pops"]))


class PrepAssets(unittest.TestCase):
    def test_fresh_project_and_exit_code(self):
        from PIL import Image, ImageDraw
        with tempfile.TemporaryDirectory() as tmp:
            P = Path(tmp) / "P"
            (P / "source").mkdir(parents=True)
            im = Image.new("RGB", (600, 600), (249, 221, 226))
            ImageDraw.Draw(im).ellipse([150, 120, 450, 520], fill=(255, 255, 255), outline=(120, 90, 100), width=5)
            im.save(P / "source" / "m.png")
            tool = str(SKILL / "tools" / "prep_assets.py")
            r = subprocess.run([*PY, tool, "--project", str(P), "--src", "source/m.png", "--name", "hero", "--backend", "flatbg"],
                               capture_output=True, text=True, cwd=tmp)
            self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
            self.assertTrue((P / "build" / "provenance.json").exists())
            self.assertTrue((P / "assets" / "hero.webp").exists())
            r = subprocess.run([*PY, tool, "--project", str(P), "--src", "source/none.png", "--name", "x", "--backend", "flatbg"],
                               capture_output=True, text=True, cwd=tmp)
            self.assertEqual(r.returncode, 1, r.stdout + r.stderr)


if __name__ == "__main__":
    unittest.main()
