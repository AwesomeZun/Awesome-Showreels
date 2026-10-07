#!/usr/bin/env python3
"""Objective motion QA for a rendered reel: frozen stretches, one-frame pops and how alive each scene's hold is.

    python3 motion_qa.py --video reel-30.mp4 [--cut P/build/cut-30.json] [--still 0.5] [--json report.json]
    python3 motion_qa.py --frames DIR --fps 60 [--cut ...]            # a folder of stills (sorted by name)

Every frame is reduced to 320x180 grey (area filter, which averages film grain away). A window of --still seconds
(default 0.5) is "alive" when at least --alive-share (default 0.05%) of its pixels vary by more than --level (default
4 levels) inside it, so one twinkle, a caret, a ticking counter or a slow soft drift counts and grain does not. A
"frozen" run is a stretch where every such window is dead: nothing on screen moves for longer than --still, a defect. A "pop" is a frame whose mean change jumps above --pop x
the median of its +-6-frame neighbourhood and above --pop-min levels, away from scene boundaries and cues (+-2 frames)
of the cut, where hard changes are expected. With --cut, each scene reports its motion and, for the hold, the share
of the picture that changes within one second (median of 1-s windows): a hold under --hold-area (default 1%) only
drifts and is reported as "near-static" (a failure with --strict).
Exit codes: 0 clean, 1 frozen runs, pops (or near-static holds with --strict), 2 bad input.
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

import numpy as np

GW, GH = 320, 180


def frames_from_video(path: str) -> tuple[np.ndarray, float]:
    """Decode to grey 320x180 frames with ffmpeg; returns (frames [n, h, w] uint8, fps)."""
    pr = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=r_frame_rate",
                         "-of", "default=nw=1:nk=1", path], capture_output=True, text=True)
    if pr.returncode != 0:
        raise SystemExit(f"ffprobe could not read {path}: {pr.stderr.strip()[:200]}")
    num, _, den = pr.stdout.strip().partition("/")
    fps = float(num) / float(den or 1)
    out = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-map", "0:v:0", "-vf",
                          f"scale={GW}:{GH}:flags=area,format=gray", "-f", "rawvideo", "-"], capture_output=True)
    if out.returncode != 0:
        raise SystemExit(f"ffmpeg could not decode {path}: {out.stderr.decode(errors='ignore').strip()[:200]}")
    a = np.frombuffer(out.stdout, dtype=np.uint8)
    n = a.size // (GW * GH)
    return a[: n * GW * GH].reshape(n, GH, GW), fps


def frames_from_dir(d: str) -> np.ndarray:
    from PIL import Image
    files = sorted(p for p in Path(d).iterdir() if p.suffix.lower() in (".png", ".jpg", ".jpeg", ".webp"))
    if not files:
        raise SystemExit(f"no images in {d}")
    return np.stack([np.asarray(Image.open(f).convert("L").resize((GW, GH), Image.BOX)) for f in files])


def runs(mask: np.ndarray) -> list[tuple[int, int]]:
    """[start, end) index runs where mask is True."""
    out, start = [], None
    for i, v in enumerate(mask):
        if v and start is None:
            start = i
        elif not v and start is not None:
            out.append((start, i))
            start = None
    if start is not None:
        out.append((start, len(mask)))
    return out


def analyse(fr: np.ndarray, fps: float, cut: dict | None, a) -> dict:
    f = fr.astype(np.float32)
    n = len(f)
    d = np.zeros(n, np.float32)            # mean change per frame (levels)
    share = np.zeros(n, np.float32)        # share of pixels changing by more than --level
    for i in range(1, n):
        x = np.abs(f[i] - f[i - 1])
        d[i] = x.mean()
        share[i] = (x > a.level).mean()
    alive = share >= a.alive_share
    alive[0] = True
    t = np.arange(n) / fps
    report = {"frames": int(n), "fps": fps, "duration": round(n / fps, 3), "level": a.level, "aliveShare": a.alive_share,
              "still": a.still}
    # frozen: windows of --still seconds in which (almost) no pixel varies; 160x90 is enough to see any motion
    sm = f.reshape(n, GH // 2, 2, GW // 2, 2).mean(axis=(2, 4))
    W = max(2, int(round(a.still * fps)) + 1)
    step = max(1, W // 6)
    dead = np.zeros(n, bool)                # union of dead windows: each one is >= --still s without motion
    starts = list(range(0, max(1, n - W + 1), step))
    if starts and starts[-1] != max(0, n - W):
        starts.append(max(0, n - W))
    for i0 in starts:
        seg = sm[i0:i0 + W]
        if float(((seg.max(axis=0) - seg.min(axis=0)) > a.level).mean()) < a.alive_share:
            dead[i0:i0 + W] = True
    frozen = []
    for s0, e in runs(dead):
        if (e - s0) / fps > a.still * 0.99:
            frozen.append({"t0": round(s0 / fps, 3), "t1": round(e / fps, 3), "seconds": round((e - s0) / fps, 3)})
    expect = np.zeros(n, bool)
    if cut:
        for sc in cut.get("scenes", [])[1:]:
            k = int(round(float(sc["t0"]) * fps))
            expect[max(0, k - 2):k + 3] = True
        for c in cut.get("cues", []):
            k = int(round(float(c["t"]) * fps))
            expect[max(0, k - 2):k + 3] = True
    pops = []
    for i in range(1, n):
        lo, hi = max(1, i - 6), min(n, i + 7)
        nb = np.concatenate([d[lo:i], d[i + 1:hi]])
        med = float(np.median(nb)) if nb.size else 0.0
        if d[i] > a.pop_min and d[i] > a.pop * max(med, 0.05) and not expect[i]:
            pops.append({"t": round(float(t[i]), 3), "frame": i, "d": round(float(d[i]), 2), "neighbours": round(med, 2)})
    report["frozen"] = frozen
    report["pops"] = pops
    report["motion"] = {"mean": round(float(d[1:].mean()), 3), "alive": round(float(alive[1:].mean()), 3)}
    w = max(1, int(round(fps)))            # 1-s windows: how much of the picture changes within a second

    def area(i0: int, i1: int):
        vals = [float((np.abs(f[j + w] - f[j]) > 2 * a.level).mean()) for j in range(i0, max(i0, i1 - w), max(1, w // 4))]
        return float(np.median(vals)) if vals else None

    near = []
    if cut:
        per = []
        for sc in cut.get("scenes", []):
            i0, i1 = int(round(float(sc["t0"]) * fps)) + 1, min(n, int(round(float(sc["t1"]) * fps)))
            hs, he = float(sc.get("holdStart", sc["t0"])), float(sc.get("outStart", sc["t1"]))
            h0, h1 = int(round(hs * fps)) + 1, min(n, int(round(he * fps)))
            seg = d[i0:i1]
            row = {"id": sc["id"], "t0": sc["t0"], "t1": sc["t1"], "mean": round(float(seg.mean()), 3) if seg.size else 0.0,
                   "alive": round(float(alive[i0:i1].mean()), 3) if i1 > i0 else 0.0, "holdSeconds": round(max(0.0, he - hs), 3)}
            if he - hs >= 1.0:
                ha = area(h0, h1)
                row["holdArea"] = round(ha, 4) if ha is not None else None
                if ha is not None and ha < a.hold_area:
                    near.append({"id": sc["id"], "t0": round(hs, 3), "t1": round(he, 3), "area": round(ha, 4)})
            per.append(row)
        report["scenes"] = per
    report["nearStatic"] = near
    report["pass"] = not frozen and not pops and not (a.strict and near)
    return report


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    src = ap.add_mutually_exclusive_group(required=True)
    src.add_argument("--video", help="rendered MP4 (or any video ffmpeg reads)")
    src.add_argument("--frames", help="folder of stills in time order")
    ap.add_argument("--fps", type=float, default=60.0, help="frame rate of --frames (default 60)")
    ap.add_argument("--cut", help="P/build/cut-<cut>.json: per-scene report, expected changes at boundaries and cues")
    ap.add_argument("--still", type=float, default=0.5, help="frozen when nothing moves for longer than this (s)")
    ap.add_argument("--level", type=float, default=4.0, help="a pixel moves when it changes by more than this (0..255)")
    ap.add_argument("--alive-share", type=float, default=0.0005, help="a frame is alive when this share of pixels moves")
    ap.add_argument("--hold-area", type=float, default=0.01, help="a hold is near-static below this share changing per second")
    ap.add_argument("--pop", type=float, default=8.0, help="pop: mean change above this x the local median")
    ap.add_argument("--pop-min", type=float, default=6.0, help="...and above this many levels")
    ap.add_argument("--strict", action="store_true", help="near-static holds fail too")
    ap.add_argument("--json", help="write the full report here")
    a = ap.parse_args(argv)
    try:
        if a.video:
            fr, fps = frames_from_video(a.video)
        else:
            fr, fps = frames_from_dir(a.frames), a.fps
        cut = json.loads(Path(a.cut).read_text()) if a.cut else None
    except (OSError, ValueError) as e:
        print(f"error: {e}", file=sys.stderr)
        return 2
    if len(fr) < 2:
        print("error: need at least two frames", file=sys.stderr)
        return 2
    r = analyse(fr, fps, cut, a)
    if a.json:
        Path(a.json).write_text(json.dumps(r, indent=1))
    print(f"{r['frames']} frames @ {fps:g} fps ({r['duration']:.2f} s): mean change {r['motion']['mean']:.2f} levels/frame, "
          f"{r['motion']['alive'] * 100:.0f}% of frames alive")
    for sc in r.get("scenes", []):
        hold = f", hold {sc['holdSeconds']:.1f} s: {sc['holdArea'] * 100:.1f}% of the picture changes per second" if sc.get("holdArea") is not None else ""
        print(f"  {sc['id']:<14} {sc['t0']:7.2f}-{sc['t1']:<7.2f} mean {sc['mean']:5.2f}  alive {sc['alive'] * 100:3.0f}%{hold}")
    for z in r["nearStatic"]:
        print(f"  {'FAIL' if a.strict else 'WARN'}   near-static hold in {z['id']} {z['t0']:.2f}-{z['t1']:.2f} s "
              f"({z['area'] * 100:.2f}% of the picture changes per second)")
    for z in r["frozen"]:
        print(f"  FROZEN {z['t0']:.2f}-{z['t1']:.2f} s ({z['seconds']:.2f} s without motion)")
    for p in r["pops"][:20]:
        print(f"  POP    {p['t']:.3f} s (frame {p['frame']}): {p['d']:.1f} levels vs {p['neighbours']:.2f} around it")
    if len(r["pops"]) > 20:
        print(f"  ... {len(r['pops']) - 20} more pops")
    print("PASS" if r["pass"] else "FAIL")
    return 0 if r["pass"] else 1


if __name__ == "__main__":
    sys.exit(main())
