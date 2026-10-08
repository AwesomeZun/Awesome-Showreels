#!/usr/bin/env python3
"""encode.py - downscale rendered reel frames and encode a looping animated WebP (or the social preview PNG).

  encode.py webp   --frames DIR --out F.webp --size 720x405 --fps 24 [--q 84] [--start K] [--method 6] [--tol 2]
  encode.py poster --src F.png --out F.png --size 1280x640 [--crop x,y,w,h]

webp: every DIR/f*.png (full-resolution frames from make_webp.mjs, in order) is resized with Lanczos (in sRGB, like
the skill's own preview recipe), then each frame sends only the box that changed since the pixels last sent for that
area (a 16x16 block counts as changed when 4+ of its pixels moved more than --tol levels, or any pixel more than
4 x --tol), encoded on its own by cwebp (lossy, -m 6, -sharp_yuv) in parallel and assembled by webpmux into an
animation that loops forever. Comparing with the source pixels last sent (not decoded ones) keeps every area within
--tol of its source, so slow changes never ghost (libwebp's own animation encoder skips changes below a
quality-derived threshold, up to 5 levels at q 76). Frame durations are whole milliseconds that add up to exactly
frames / fps seconds (24 fps: 42, 42, 41, ...), so a 6-s loop is 6000 ms and never drifts against its beat; an
unchanged frame extends the previous one. --start K rotates a seamless loop so the file opens on frame K (the
poster) and plays on through the seam. -sharp_yuv keeps thin saturated strokes and labels from dimming in the 4:2:0
conversion (about 5% more bytes). --radius R rounds the corners (transparent, so the README's page colour shows in
both themes and each loop reads as a card); a box that touches a corner carries the mask, the others stay opaque.
The same method encodes the sizzle previews (sizzle/build.py).
"""
from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
import tempfile
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

import numpy as np
from PIL import Image


def durations(n: int, fps: float) -> list[int]:
    """Integer ms per frame whose running sum tracks i * 1000 / fps exactly."""
    out, acc = [], 0
    for i in range(n):
        nxt = round((i + 1) * 1000 / fps)
        out.append(nxt - acc)
        acc = nxt
    return out


def _resize(args):
    src, dst, w, h = args
    im = Image.open(src).convert("RGB")
    if im.size != (w, h):
        im = im.resize((w, h), Image.LANCZOS, reducing_gap=3.0)
    im.save(dst, compress_level=1)
    return dst


def plan_rects(frames: list[str], durs: list[int], tol: float, full_frac: float = 0.55, align: int = 16) -> list:
    """[frame index, (x0, y0, x1, y1), duration ms] per frame that goes into the file (see the module docstring)."""
    ref, plan, W, H = None, [], 0, 0
    for i, f in enumerate(frames):
        a = np.asarray(Image.open(f).convert("RGB"))
        if ref is None:
            H, W = a.shape[:2]
            ref = a.copy()
            plan.append([i, (0, 0, W, H), durs[i]])
            continue
        d = np.abs(a.astype(np.int16) - ref.astype(np.int16)).max(axis=2)
        bh, bw = -(-H // align), -(-W // align)
        pd = np.zeros((bh * align, bw * align), np.int16)
        pd[:H, :W] = d
        blocks = pd.reshape(bh, align, bw, align)
        changed = ((blocks > tol).sum(axis=(1, 3)) >= 4) | ((blocks > 4 * tol).any(axis=(1, 3)))
        if not changed.any():
            plan[-1][2] += durs[i]
            continue
        rows, cols = np.nonzero(changed.any(axis=1))[0], np.nonzero(changed.any(axis=0))[0]
        x0, y0 = int(cols[0] * align), int(rows[0] * align)
        x1, y1 = min(W, int((cols[-1] + 1) * align)), min(H, int((rows[-1] + 1) * align))
        if (x1 - x0) * (y1 - y0) > full_frac * W * H:
            x0, y0, x1, y1 = 0, 0, W, H
        ref[y0:y1, x0:x1] = a[y0:y1, x0:x1]
        plan.append([i, (x0, y0, x1, y1), durs[i]])
    return plan


def corner_mask(w: int, h: int, r: int):
    """L-mode mask with rounded corners (anti-aliased by 4x supersampling), or None for square corners."""
    if r <= 0:
        return None
    from PIL import ImageDraw
    big = Image.new("L", (w * 4, h * 4), 0)
    ImageDraw.Draw(big).rounded_rectangle((0, 0, w * 4 - 1, h * 4 - 1), radius=r * 4, fill=255)
    return big.resize((w, h), Image.LANCZOS)


def crop_masked(src, box, mask, r):
    """The box of frame src, with the corner mask when the box reaches into a corner."""
    im = Image.open(src).convert("RGB")
    if mask is None:
        return im.crop(box)
    W, H = im.size
    x0, y0, x1, y1 = box
    if not ((x0 < r or x1 > W - r) and (y0 < r or y1 > H - r)):
        return im.crop(box)
    im.putalpha(mask)
    return im.crop(box)


def _cwebp(args):
    src, box, png, out, q, method, mask, r = args
    crop_masked(src, box, mask, r).save(png, compress_level=1)
    r = subprocess.run(["cwebp", "-quiet", "-q", f"{q:g}", "-m", str(method), "-sharp_yuv", png, "-o", out],
                       capture_output=True, text=True)
    if r.returncode:
        raise RuntimeError(f"cwebp failed on {png}: {r.stderr[-300:]}")
    return out


def cmd_webp(a) -> int:
    frames = sorted(Path(a.frames).glob("f*.png"))
    if not frames:
        sys.exit(f"no frames in {a.frames}")
    for exe in ("cwebp", "webpmux"):
        if not shutil.which(exe):
            sys.exit(f"{exe} not found: install libwebp (brew install webp, apt install webp)")
    k = a.start % len(frames)
    frames = frames[k:] + frames[:k]                   # the poster first; the loop seam moves inside the file
    w, h = (int(v) for v in a.size.lower().split("x"))
    ds = durations(len(frames), a.fps)
    out = Path(a.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as td, ProcessPoolExecutor() as ex:
        small = list(ex.map(_resize, [(str(f), str(Path(td) / f"s{i:04d}.png"), w, h) for i, f in enumerate(frames)], chunksize=4))
        plan = plan_rects(small, ds, a.tol)
        mask = corner_mask(w, h, a.radius)
        jobs = [(small[i], box, str(Path(td) / f"c{j:04d}.png"), str(Path(td) / f"c{j:04d}.webp"), a.q, a.method, mask, a.radius)
                for j, (i, box, _) in enumerate(plan)]
        files = list(ex.map(_cwebp, jobs))
        argv = ["webpmux"]
        for (i, (x0, y0, x1, y1), d), f in zip(plan, files):
            argv += ["-frame", f, f"+{d}+{x0}+{y0}+0-b"]
        rgb = [int(a.bg.lstrip("#")[i:i + 2], 16) for i in (0, 2, 4)]
        argv += ["-loop", "0", "-bgcolor", "255,%d,%d,%d" % tuple(rgb), "-o", str(out)]
        r = subprocess.run(argv, capture_output=True, text=True)
        if r.returncode:
            sys.exit(r.stderr or "webpmux failed")
    full = sum(1 for p in plan if p[1] == (0, 0, w, h))
    print(f"{out.name}: {len(frames)} frames ({len(plan)} in the file, {full} full), {sum(ds) / 1000:.3f} s @ {a.fps:g} fps, "
          f"{w}x{h}, q {a.q:g}, {out.stat().st_size / 1e6:.2f} MB")
    return 0


def cmd_poster(a) -> int:
    im = Image.open(a.src).convert("RGB")
    if a.crop:
        x, y, cw, ch = (int(v) for v in a.crop.split(","))
        im = im.crop((x, y, x + cw, y + ch))
    w, h = (int(v) for v in a.size.lower().split("x"))
    im = im.resize((w, h), Image.LANCZOS, reducing_gap=3.0)
    out = Path(a.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    im.save(out, optimize=True)
    print(f"{out.name}: {w}x{h}, {out.stat().st_size / 1e6:.2f} MB")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("webp")
    s.add_argument("--frames", required=True)
    s.add_argument("--out", required=True)
    s.add_argument("--size", default="720x405")
    s.add_argument("--fps", type=float, default=24)
    s.add_argument("--q", type=float, default=84)
    s.add_argument("--start", type=int, default=0, help="open on this frame of the loop (the poster)")
    s.add_argument("--radius", type=int, default=0, help="rounded, transparent corners of this radius (px at --size)")
    s.add_argument("--bg", default="#11111B", help="animation background colour (the stage colour)")
    s.add_argument("--tol", type=float, default=2, help="levels a pixel may drift before its block is sent again")
    s.add_argument("--method", type=int, default=6)
    s = sub.add_parser("poster")
    s.add_argument("--src", required=True)
    s.add_argument("--out", required=True)
    s.add_argument("--size", default="1280x640")
    s.add_argument("--crop")
    a = ap.parse_args()
    return {"webp": cmd_webp, "poster": cmd_poster}[a.cmd](a)


if __name__ == "__main__":
    sys.exit(main())
