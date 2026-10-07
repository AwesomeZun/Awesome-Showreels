#!/usr/bin/env python3
"""prep_assets.py - turn source images into reel-ready cutouts for the motion-showreel skill.

Config (default P/assets.json):
  {
    "defaults": {...},                       # applied to every asset
    "kinds": {"product": {...}},             # per-kind overrides
    "assets": {
      "hero":   "source/mascot.png",                                     # shorthand: src only, kind character
      "wave":   {"src": "source/gen/wave.png", "match": {"to": "hero"}},
      "prod":   {"src": "source/gen/sheet.png", "kind": "product", "split": true, "names": ["toner", "jar"]},
      "logo":   {"src": "source/logo.png", "kind": "logo"},
      "bubble": {"src": "source/design/chat_bubble.png", "kind": "ui", "inpaintText": true},
      "street": {"src": "source/street.jpg", "kind": "photo", "parallax": true}
    }
  }
Outputs: P/assets/<name>.webp (+ <name>_blink.webp when eyes are found, <name>_bg.webp for text-free or parallax
plates); P/assets/meta.json is merged: {name: {w, h, eyes?, kind, ax?, plate?, textRows?, sheet?, idx?}}.
Generated, outside assets/ (everything in assets/ ships in the HTML): P/build/provenance.json, QA sheets and
report in P/build/qa/ (cutouts.png, blink.png, report.json), mask cache in P/build/lift/.
Default size caps assume a 1920x1080 frame and scale with reel.config.json "size".

Background removal backends: vision (macOS 14+, compiles lift.swift once into ~/.cache/motion-showreel/),
flatbg (OpenCV, any OS: flat/chroma backgrounds), rembg (optional pip package). "auto" = vision on macOS, else
rembg if importable, else flatbg. Every key, default and the QA protocol: references/imagery.md.

  python3 prep_assets.py --project P [--config FILE] [--only a,b] [--backend auto|vision|flatbg|rembg] [--force]
  python3 prep_assets.py --project P --src FILE --name NAME [--kind character] [--split]   # one asset, no config
                                                         # (FILE: from the current folder, else relative to P)
  python3 prep_assets.py --check                                                         # backend status
"""
from __future__ import annotations

import argparse
import hashlib
import io
import json
import math
import os
import platform
import shutil
import subprocess
import sys
import time
from pathlib import Path

try:
    import cv2
    import numpy as np
    from PIL import Image, ImageCms, ImageDraw, ImageFont, ImageOps
    from scipy import ndimage
except ImportError as _e:   # one actionable line instead of a traceback
    sys.exit(f"prep_assets.py needs numpy, scipy, Pillow and OpenCV ({_e.name} is missing): "
             "python3 -m pip install numpy scipy pillow opencv-python")

HERE = Path(__file__).resolve().parent
LIFT_SWIFT = HERE / "lift.swift"

BASE = dict(
    lift="auto", backend="auto", trim=True, pad=6, maxH=None, maxW=None, quality=92, lossless=False,
    edge="snap", defringe=True, choke=0.0, feather=0.0, shadow="auto", holes="auto", islands=0.002,
    blink=False, eyes=None, eyeParams=None, blinkFrom=None, blinkColor=None,
    split=False, names=None, scale="shared", minArea=0.05,
    match=None, inpaintText=False, textColor="auto", textSize=None, textBoxes=None,
    parallax=False, prov=None,
)
KIND_DEFAULTS = {
    "character": dict(maxH=980, blink="auto"),
    "product": dict(maxH=600),
    "prop": dict(maxH=600),
    "illustration": dict(maxH=980),
    "logo": dict(maxH=600, backend="flatbg", holes="keep", shadow="keep", lossless=True),
    "ui": dict(lift=False, trim=False, pad=0, quality=95, edge="keep", shadow="keep", holes="keep", islands=0),
    "photo": dict(lift=False, trim=False, maxW=1920, maxH=1080, quality=88, shadow="keep", islands=0),
}
KINDS = tuple(KIND_DEFAULTS)
EYE_DEFAULTS = dict(upper=0.62, minArea=0.00006, maxArea=0.004, maxSpan=0.45)
# Pass 1 = proven thresholds for bead/plush eyes; 2 = lash eyes (lower fill); 3 = coloured or round eyes (relative).
EYE_PASSES = (
    dict(mode="abs", lum=120, fill=0.5, aspect=1.2, ring=150, contrast=40, maxArea=None),
    dict(mode="abs", lum=120, fill=0.35, aspect=1.05, ring=150, contrast=40, maxArea=None),
    dict(mode="rel", rel=45, fill=0.55, aspect=0.85, ring=0, contrast=55, maxArea=0.012),
)
# Edge snap: the colour model is trusted from |F - B| = TRUST[0] (none) to TRUST[0] + TRUST[1] (full), in RGB
# units; SNAP_BLUR (px) smooths surface texture before measuring colour distances.
TRUST = (12.0, 18.0)
SNAP_BLUR = 0.0
WARN = []  # global log of warnings for the console summary


# ───────────────────────── small helpers ─────────────────────────
def log(*a):
    print(*a, flush=True)


def hexrgb(h, default=(0, 0, 0)):
    try:
        h = str(h).strip().lstrip("#")
        if len(h) == 3:
            h = "".join(c * 2 for c in h)
        return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], np.float32)
    except (ValueError, TypeError):
        return np.array(default, np.float32)


def rgbhex(c):
    c = np.clip(np.round(c), 0, 255).astype(int)
    return "#%02X%02X%02X" % tuple(c[:3])


def s2l(c):
    c = np.asarray(c, np.float32) / 255.0
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def l2s(c):
    c = np.clip(c, 0, 1)
    return np.where(c <= 0.0031308, c * 12.92, 1.055 * np.power(c, 1 / 2.4) - 0.055) * 255.0


def lum_of(rgb):
    return rgb[..., 0] * 0.299 + rgb[..., 1] * 0.587 + rgb[..., 2] * 0.114


def to_lab(rgb):
    return cv2.cvtColor(np.ascontiguousarray(rgb, np.float32) / 255.0, cv2.COLOR_RGB2Lab)


def from_lab(lab):
    return cv2.cvtColor(np.ascontiguousarray(lab, np.float32), cv2.COLOR_Lab2RGB) * 255.0


def normconv(img, w, sigma):
    """Normalized convolution: blur img using only pixels where w > 0. Returns (estimate, support).

    Wide kernels run at reduced resolution (the result is smooth by construction).
    """
    w = w.astype(np.float32)
    x = img * (w[..., None] if img.ndim == 3 else w)
    f = int(max(1, sigma // 3))
    if f > 1:
        H, W = w.shape
        size = (max(1, W // f), max(1, H // f))
        den = cv2.resize(cv2.GaussianBlur(cv2.resize(w, size, interpolation=cv2.INTER_AREA), (0, 0), sigma / f),
                         (W, H), interpolation=cv2.INTER_LINEAR)
        num = cv2.resize(cv2.GaussianBlur(cv2.resize(x, size, interpolation=cv2.INTER_AREA), (0, 0), sigma / f),
                         (W, H), interpolation=cv2.INTER_LINEAR)
    else:
        den = cv2.GaussianBlur(w, (0, 0), sigma)
        num = cv2.GaussianBlur(x, (0, 0), sigma)
    if img.ndim == 3:
        return num / np.maximum(den, 1e-6)[..., None], den
    return num / np.maximum(den, 1e-6), den


def disk(r):
    r = max(int(r), 1)
    return cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1, 2 * r + 1))


def sha1_file(p: Path):
    h = hashlib.sha1()
    with open(p, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def rel(p: Path, root: Path):
    try:
        return str(Path(p).resolve().relative_to(root.resolve()))
    except ValueError:
        return Path(p).name  # never leak absolute paths outside the project


def guided_filter(G, p, r, eps):
    """Colour guided filter (He et al.). G: guide HxWx3 in [0,1], p: HxW. Transfers G's edges into p."""
    k = (2 * r + 1, 2 * r + 1)

    def box(x):
        return cv2.boxFilter(x, -1, k, borderType=cv2.BORDER_REFLECT)

    mI = box(G)
    mp = box(p)
    mIp = box(G * p[..., None])
    cov = mIp - mI * mp[..., None]
    v = {}
    for i in range(3):
        for j in range(i, 3):
            v[i, j] = box(G[..., i] * G[..., j]) - mI[..., i] * mI[..., j] + (eps if i == j else 0.0)
    a11, a12, a13, a22, a23, a33 = v[0, 0], v[0, 1], v[0, 2], v[1, 1], v[1, 2], v[2, 2]
    c11 = a22 * a33 - a23 * a23
    c12 = a13 * a23 - a12 * a33
    c13 = a12 * a23 - a13 * a22
    c22 = a11 * a33 - a13 * a13
    c23 = a13 * a12 - a11 * a23
    c33 = a11 * a22 - a12 * a12
    det = a11 * c11 + a12 * c12 + a13 * c13
    det = np.where(np.abs(det) < 1e-12, 1e-12, det)
    a0 = (c11 * cov[..., 0] + c12 * cov[..., 1] + c13 * cov[..., 2]) / det
    a1 = (c12 * cov[..., 0] + c22 * cov[..., 1] + c23 * cov[..., 2]) / det
    a2 = (c13 * cov[..., 0] + c23 * cov[..., 1] + c33 * cov[..., 2]) / det
    b = mp - a0 * mI[..., 0] - a1 * mI[..., 1] - a2 * mI[..., 2]
    return box(a0) * G[..., 0] + box(a1) * G[..., 1] + box(a2) * G[..., 2] + box(b)


# ───────────────────────── loading ─────────────────────────
def load_image(path: Path, cache: Path):
    """-> (rgb float32 HxWx3 in 0..255 sRGB, alpha float32 HxW or None, path Vision should read)."""
    vision_path = path
    try:
        im = Image.open(path)
        im.load()
    except Exception:
        # HEIC and other formats PIL cannot read: convert with sips on macOS
        if platform.system() == "Darwin" and shutil.which("sips"):
            cache.mkdir(parents=True, exist_ok=True)
            out = cache / f"{path.stem}-{sha1_file(path)[:8]}-converted.png"
            subprocess.run(["sips", "-s", "format", "png", str(path), "--out", str(out)], check=True,
                           capture_output=True)
            im = Image.open(out)
            im.load()
            vision_path = out
        else:
            raise
    im = ImageOps.exif_transpose(im)
    icc = im.info.get("icc_profile")
    alpha = None
    if im.mode in ("RGBA", "LA", "PA") or (im.mode == "P" and "transparency" in im.info):
        im = im.convert("RGBA")
        alpha = np.asarray(im.getchannel("A"), np.float32) / 255.0
    rgb_im = im.convert("RGB")
    if icc:
        try:
            prof = ImageCms.ImageCmsProfile(io.BytesIO(icc))
            if "srgb" not in ImageCms.getProfileDescription(prof).lower().replace(" ", ""):
                rgb_im = ImageCms.profileToProfile(rgb_im, prof, ImageCms.createProfile("sRGB"), outputMode="RGB")
        except Exception:
            pass
    rgb = np.asarray(rgb_im, np.float32)
    if alpha is not None and (alpha < 0.98).mean() < 0.001:
        alpha = None  # an opaque alpha channel carries no cutout
    return rgb, alpha, vision_path


# ───────────────────────── backgrounds ─────────────────────────
class BgModel:
    """Smooth background estimate: quadratic surface per channel, robustly fitted."""

    def __init__(self, coef, color, noise, flat, shape):
        self.coef, self.color, self.noise, self.flat, self.shape = coef, color, noise, flat, shape
        self._pred = None

    def predict(self):
        if self._pred is None:
            h, w = self.shape
            yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
            X = _design(xx / w - 0.5, yy / h - 0.5)
            self._pred = np.einsum("hwk,kc->hwc", X, self.coef).astype(np.float32)
        return self._pred


def _design(x, y):
    return np.stack([np.ones_like(x), x, y, x * x, x * y, y * y], -1)


def border_connected(mask):
    """Pixels of a boolean mask that connect (4-neighbour) to the frame border."""
    n, lab = cv2.connectedComponents(mask.astype(np.uint8), connectivity=4)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    return np.isin(lab, list(border)) if border else np.zeros(mask.shape, bool)


def outside(alpha):
    """True background around a cutout: transparent pixels connected to the frame (holes excluded)."""
    return border_connected(alpha < 0.01)


def fit_background(rgb, alpha=None):
    h, w = rgb.shape[:2]
    if alpha is None:
        m = max(3, int(0.03 * min(h, w)))
        sel = np.zeros((h, w), bool)
        sel[:m] = sel[-m:] = True
        sel[:, :m] = sel[:, -m:] = True
    else:
        sel = cv2.erode(outside(alpha).astype(np.uint8), disk(3)).astype(bool)
    ys, xs = np.nonzero(sel)
    if len(ys) < 50:
        return None
    if len(ys) > 60000:
        idx = np.random.default_rng(0).choice(len(ys), 60000, replace=False)
        ys, xs = ys[idx], xs[idx]
    X = _design(xs / w - 0.5, ys / h - 0.5).astype(np.float64)
    Y = rgb[ys, xs].astype(np.float64)
    keep = np.ones(len(ys), bool)
    coef = None
    for _ in range(3):
        coef, *_ = np.linalg.lstsq(X[keep], Y[keep], rcond=None)
        res = np.linalg.norm(Y - X @ coef, axis=1)
        mad = np.median(res[keep]) * 1.4826 + 0.5
        keep = res < 3 * mad + 2
    res = np.linalg.norm(Y - X @ coef, axis=1)
    noise = float(np.median(res[keep]) * 1.4826)
    inlier = float(keep.mean())
    color = np.median(Y[keep], axis=0)
    # flat: small residual noise and most samples explained by a smooth surface
    flat = noise < 4.5 and inlier > 0.8
    return BgModel(coef.astype(np.float32), color.astype(np.float32), noise, flat, (h, w))


def local_background(rgb, alpha, bgm, sigma):
    """Per-pixel background colour behind the subject edge: nearby true background, else the smooth model."""
    est, sup = normconv(rgb, outside(alpha), sigma)
    model = bgm.predict() if bgm is not None else est
    k = np.clip(sup / 0.08, 0, 1)[..., None]
    return est * k + model * (1 - k)


# ───────────────────────── lifting backends ─────────────────────────
def cache_dir():
    base = os.environ.get("XDG_CACHE_HOME") or str(Path.home() / ".cache")
    return Path(base) / "motion-showreel"


def ensure_lift(explicit=None, quiet=False):
    """Path to a compiled lift binary, compiling lift.swift on first use. None when unavailable."""
    if explicit:
        return Path(explicit)
    if os.environ.get("LIFT_BIN"):
        return Path(os.environ["LIFT_BIN"])
    if platform.system() != "Darwin" or not LIFT_SWIFT.exists():
        return None
    swiftc = shutil.which("swiftc")
    if not swiftc:
        return None
    tag = hashlib.sha1(LIFT_SWIFT.read_bytes()).hexdigest()[:10]
    out = cache_dir() / f"lift-{tag}"
    if out.exists():
        return out
    out.parent.mkdir(parents=True, exist_ok=True)
    tmp = out.with_name(out.name + f".tmp{os.getpid()}")
    if not quiet:
        log("compiling lift.swift (first run only) ...")
    r = subprocess.run([swiftc, "-O", str(LIFT_SWIFT), "-o", str(tmp)], capture_output=True, text=True)
    if r.returncode != 0:
        log("lift.swift failed to compile:\n" + r.stderr[-2000:])
        return None
    os.replace(tmp, out)
    for old in out.parent.glob("lift-*"):  # binaries of earlier lift.swift versions
        if old != out and len(old.name) == 15:
            old.unlink(missing_ok=True)
    return out


def rembg_ok():
    try:
        import rembg  # noqa: F401
        return True
    except Exception:
        return False


def vision_lift(src: Path, shape, key: str, lift_bin: Path, cache: Path, force: bool):
    """Run lift (Vision). -> dict(alpha, instances=[(alpha, bbox)], count, edgePx) or None if no subject."""
    cache.mkdir(parents=True, exist_ok=True)
    prefix = cache / key
    jpath = cache / f"{key}.json"
    info = None
    if jpath.exists() and not force:
        try:
            info = json.loads(jpath.read_text())
            if not (cache / info["all"]["mask"]).exists():
                info = None
        except Exception:
            info = None
    if info is None:
        r = subprocess.run([str(lift_bin), str(src), str(prefix), "--masks", "--no-images", "--json", "--instances"],
                           capture_output=True, text=True)
        if r.returncode == 3:
            return None
        if r.returncode != 0:
            raise RuntimeError(f"lift failed ({r.returncode}): {r.stderr.strip()[-500:]}")
        info = json.loads(r.stdout)
        info["input"] = Path(info["input"]).name  # cache entries are relative: the project folder can move
        for d in [info["all"]] + info["instances"]:
            if d.get("mask"):
                d["mask"] = Path(d["mask"]).name
        jpath.write_text(json.dumps(info, indent=1))
    h, w = shape

    def read(name):
        m = np.asarray(Image.open(cache / name).convert("L"), np.float32) / 255.0
        if m.shape != (h, w):
            WARN.append(f"{key}: Vision mask {m.shape[::-1]} != image {(w, h)}; resized")
            m = cv2.resize(m, (w, h), interpolation=cv2.INTER_LINEAR)
        return m

    inst = [(read(i["mask"]), i["bbox"], i["area"]) for i in info["instances"] if i.get("mask")]
    return dict(alpha=read(info["all"]["mask"]), instances=inst, count=info["count"], edgePx=info["all"]["edgePx"])


def rembg_lift(rgb):
    from rembg import new_session, remove  # optional dependency
    sess = new_session(os.environ.get("REMBG_MODEL", "isnet-general-use"))
    m = remove(Image.fromarray(rgb.astype(np.uint8)), only_mask=True, session=sess)
    return np.asarray(m.convert("L"), np.float32) / 255.0


def shadow_like(rgb, Bimg, loose=False):
    """Pixels that look like the background in shadow: darker, same hue, no extra chroma."""
    lab, labB = to_lab(rgb), to_lab(Bimg)
    dL = labB[..., 0] - lab[..., 0]
    dab = np.linalg.norm(lab[..., 1:] - labB[..., 1:], axis=2)
    cB = np.linalg.norm(labB[..., 1:], axis=2)
    cI = np.linalg.norm(lab[..., 1:], axis=2)
    cos = (lab[..., 1] * labB[..., 1] + lab[..., 2] * labB[..., 2]) / (cI * cB + 1e-6)
    hue_ok = np.where(cB > 5, cos > 0.92, cI < cB + 6)
    return (dL > (0.5 if loose else 1.2)) & (dL < 45) & hue_ok & (dab < 0.7 * dL + (8 if loose else 5)), lab


def flatbg_lift(rgb):
    """OpenCV fallback for flat or chroma-key backgrounds.

    Trimap: background = pixels reachable from the frame through background-coloured or soft-shadow pixels
    without crossing a hard edge (so floor shadows go, pastel objects with crisp outlines stay); everything else
    that differs from the background is probable foreground. GrabCut settles the rest at <= 720 px.
    """
    h, w = rgb.shape[:2]
    s = min(1.0, 720.0 / max(h, w))
    sz = (max(1, round(w * s)), max(1, round(h * s)))
    small = cv2.GaussianBlur(cv2.resize(rgb, sz, interpolation=cv2.INTER_AREA), (0, 0), 1.0)
    bgs = fit_background(small, None)
    bgm = fit_background(rgb, None)
    if bgs is None or bgm is None:
        raise RuntimeError("cannot estimate the background")
    Bs = bgs.predict()
    d = np.linalg.norm(small - Bs, axis=2)
    lo = max(4.0, 3.0 * bgs.noise + 2.0)
    g = np.hypot(cv2.Sobel(d, cv2.CV_32F, 1, 0, ksize=3), cv2.Sobel(d, cv2.CV_32F, 0, 1, ksize=3)) / 8
    shade, _ = shadow_like(small, Bs, loose=True)
    # generous colour tolerance is safe here: only soft transitions are crossed, hard edges stop the flood
    reach = border_connected(((d < 1.5 * lo + 3) | shade) & (g < 2.5))
    m = np.full(d.shape, cv2.GC_PR_FGD, np.uint8)
    m[d <= lo + 3] = cv2.GC_PR_BGD                 # background-coloured but enclosed: let GrabCut decide
    m[reach] = cv2.GC_PR_BGD                       # soft cast shadows reached from the frame
    m[reach & (d < lo)] = cv2.GC_BGD
    m[(d > 3 * (lo + 22)) & ~reach] = cv2.GC_FGD
    hard = (m == cv2.GC_FGD) | (m == cv2.GC_PR_FGD)
    if hard.any() and (m == cv2.GC_BGD).any():
        try:
            bgd, fgd = np.zeros((1, 65), np.float64), np.zeros((1, 65), np.float64)
            img8 = cv2.cvtColor(np.clip(small, 0, 255).astype(np.uint8), cv2.COLOR_RGB2BGR)
            cv2.grabCut(img8, m, None, bgd, fgd, 4, cv2.GC_INIT_WITH_MASK)
            hard = (m == cv2.GC_FGD) | (m == cv2.GC_PR_FGD)
        except cv2.error:
            pass
    alpha = cv2.resize(hard.astype(np.float32), (w, h), interpolation=cv2.INTER_LINEAR)
    return alpha, bgm


# ───────────────────────── alpha refinement ─────────────────────────
def apply_fill(alpha, fill, band, report):
    """Make refilled holes opaque together with the lifter's soft transition around them (out to `band`), but only
    on the hole's side of the Voronoi split against the true outside, so thin rims keep their real outer edge."""
    if not fill.any():
        return alpha
    d_hole = ndimage.distance_transform_edt(fill == 0)
    d_out = ndimage.distance_transform_edt(~outside(alpha))
    region = (d_hole <= band) & (d_hole < d_out) & ((alpha >= 0.01) | (fill > 0))  # never a nearby kept gap
    report["holesFilledPx"] = int(fill.sum())
    return np.where(region, 1.0, alpha).astype(np.float32)


def fill_holes(alpha, rgb, Bmodel, noise, report, band, everything=False):
    """Enclosed transparent regions coloured unlike the background are subject: refill them.

    Lifters cut holes where a subject part resembles the backdrop (pink inner ears on pink). Holes that show the
    backdrop itself (gaps between arm and body) stay transparent. Bmodel is the smooth background model, never a
    local estimate (a hole would be compared with itself). everything=True fills all holes.
    """
    hard = alpha >= 0.5
    n, lab, stats, _ = cv2.connectedComponentsWithStats((~hard).astype(np.uint8), connectivity=4)
    if n <= 2:
        return alpha
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]])))
    d = np.linalg.norm(rgb - Bmodel, axis=2)
    thr = max(8.0, 4.0 * noise)
    fill = np.zeros(alpha.shape, np.uint8)
    kept = 0
    for i in range(1, n):
        if i in border or stats[i, cv2.CC_STAT_AREA] < 4:
            continue
        reg = lab == i
        core = cv2.erode(reg.astype(np.uint8), disk(2)).astype(bool)
        if core.sum() < 8:
            core = reg
        if everything or np.median(d[core]) > thr:
            fill[reg] = 1
        else:
            kept += int(reg.sum())
    alpha = apply_fill(alpha, fill, band, report)
    if kept:
        report["holesKeptPx"] = kept
    return alpha


def fg_core(rgb, alpha, B, noise):
    """Reliable foreground colours: opaque, not background-coloured, 1 px inside the edge.

    A coarse mask (GrabCut at reduced scale) marks rim pixels opaque; using them as 'the subject colour' would keep
    the backdrop colour on the edge (green outlines on chroma key).
    """
    core = alpha > 0.98
    if B is not None:
        core &= np.linalg.norm(rgb - B, axis=-1) > max(10.0, 5.0 * noise)
    return cv2.erode(core.astype(np.uint8), disk(1)).astype(bool)


def fill_holes_busy(alpha, rgb, report, band):
    """Busy backgrounds: refill an enclosed hole unless its colour is common in the backdrop right around the
    silhouette (a real gap shows that backdrop; a lifter error shows subject colours)."""
    hard = alpha >= 0.5
    n, lab, stats, _ = cv2.connectedComponentsWithStats((~hard).astype(np.uint8), connectivity=4)
    if n <= 2:
        return alpha
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]])))
    near = outside(alpha) & (ndimage.distance_transform_edt(~hard) < 25)
    labimg = to_lab(rgb)
    h, w = alpha.shape
    fill = np.zeros(alpha.shape, np.uint8)
    kept = 0
    for i in range(1, n):
        if i in border or stats[i, cv2.CC_STAT_AREA] < 4:
            continue
        x, y, bw, bh, _ = (int(v) for v in stats[i])
        R = max(bw, bh) + 20
        ys, xs = slice(max(0, y - R), min(h, y + bh + R)), slice(max(0, x - R), min(w, x + bw + R))
        reg = lab[ys, xs] == i
        core = cv2.erode(reg.astype(np.uint8), disk(2)).astype(bool)
        core = core if core.sum() >= 8 else reg
        ring = near[ys, xs]
        if ring.sum() < 30:  # no backdrop nearby: a lifter error inside the subject
            fill[lab == i] = 1
            continue
        c = np.median(labimg[ys, xs][core], axis=0)
        frac = float((np.linalg.norm(labimg[ys, xs][ring] - c, axis=1) < 10).mean())
        if frac < 0.15:
            fill[lab == i] = 1
        else:
            kept += int(reg.sum())
    alpha = apply_fill(alpha, fill, band, report)
    if kept:
        report["holesKeptPx"] = kept
    return alpha


def drop_frame_leaks(alpha, rgb, Bmodel, noise, report):
    """Remove background the lifter kept where the subject leaves the frame (between ears cut by the top edge)."""
    d = np.linalg.norm(rgb - Bmodel, axis=2)
    leak = border_connected((alpha >= 0.5) & (d < max(8.0, 4.0 * noise)))
    if leak.sum() < max(50, 0.001 * (alpha >= 0.5).sum()):
        return alpha
    soft = cv2.GaussianBlur(cv2.dilate(leak.astype(np.uint8), disk(1)).astype(np.float32), (0, 0), 1.0)
    report["frameLeakPx"] = int(leak.sum())
    return alpha * (1 - np.clip(soft, 0, 1))


def snap_flat(rgb, alpha, Bimg, noise, band, free):
    """Snap a soft mask to the real edge on a flat background.

    Two estimates: the colour model alpha = |I - B| / |F - B| (F = nearest reliable foreground colour), trusted
    only where F and B differ; and a geometric sharpening of the mask itself (a contrast stretch around 0.5 that
    keeps the lifter's sub-pixel contour but turns its ~2 x `band` ramp into ~1.5 px). Within `free` px of the
    contour the blend of both decides; deeper inside the subject only grows (the colour model cannot tell a pink
    shade on the subject from a pink backdrop); farther outside only shrinks, except clearly-foreground pixels.
    `free`: ~1 px for Vision/rembg (smooth contour within 1-2 px of the truth; a wider zone lets subject colours
    that lie between F and B, like a lid's lit top face, read as transparency), `band` for flatbg (GrabCut's
    contour is jagged and leans 2-4 px outward).
    """
    core = fg_core(rgb, alpha, Bimg, noise)
    if core.sum() < 50:
        return alpha
    _, (iy, ix) = ndimage.distance_transform_edt(~core, return_indices=True)
    sm = cv2.GaussianBlur(rgb, (0, 0), SNAP_BLUR) if SNAP_BLUR > 0 else rgb  # texture noise -> jagged alpha
    F = sm[iy, ix]
    d = np.linalg.norm(sm - Bimg, axis=2)
    D = np.linalg.norm(F - Bimg, axis=2)
    nf = 2.0 * noise + 1.0
    a_cd = np.clip((d - nf) / np.maximum(D - nf, 1.0), 0, 1)
    a_geo = np.clip((alpha - 0.5) * max(2.0, 0.75 * band) + 0.5, 0, 1)
    w = np.clip((D - TRUST[0]) / TRUST[1], 0, 1)  # trust the colour model only where F and B clearly differ
    model = w * a_cd + (1 - w) * a_geo
    inside = alpha >= 0.5
    d_in = ndimage.distance_transform_edt(inside)
    d_out = ndimage.distance_transform_edt(~inside)
    out = alpha.copy()
    near = np.where(inside, d_in, d_out) <= free
    out[near] = model[near]
    deep = inside & ~near & (d_in <= 2 * band)
    out[deep] = np.maximum(a_geo, model)[deep]
    far = ~inside & ~near & (d_out <= 2 * band)
    strong = d > max(50.0, 6.0 * noise)
    out[far] = np.where(strong[far], np.maximum(alpha[far], model[far]), np.minimum(alpha[far], model[far]))
    # isolated faint specks (shading in narrow background wedges): 3x3 median, on the transparent side only
    med = cv2.medianBlur(np.clip(np.round(out * 255), 0, 255).astype(np.uint8), 3).astype(np.float32) / 255
    return np.where(out < 0.5, np.minimum(out, med), out)


def snap_guided(rgb, alpha, band):
    """Snap a soft mask to image edges on a busy background, only inside the edge band.

    The guided filter moves the transition onto the image edge but keeps the soft mask's averaged levels
    (~0.1 outside, ~0.9 inside); the level stretch restores 0 and 1 on both sides.
    """
    r = int(max(2, min(16, round(band * 0.6))))
    q = np.clip(guided_filter(rgb / 255.0, alpha.astype(np.float32), r, 1e-4), 0, 1)
    q = np.clip((q - 0.15) / 0.7, 0, 1)
    inside = alpha >= 0.5
    dist = np.where(inside, ndimage.distance_transform_edt(inside), ndimage.distance_transform_edt(~inside))
    k = np.clip(1.0 - (dist - band) / 3.0, 0, 1)
    out = alpha * (1 - k) + q * k
    # background texture leaks into the filter as speckle: median in the band, then drop faint pixels that are
    # not attached to the solid silhouette
    med = cv2.medianBlur(np.clip(np.round(out * 255), 0, 255).astype(np.uint8), 5).astype(np.float32) / 255
    out = np.where(k > 0, med, out)
    attached = cv2.dilate((out > 0.5).astype(np.uint8), disk(3)).astype(bool)
    return np.where(attached | (out >= 0.5) | (k <= 0), out, 0).astype(np.float32)


def find_shadow(alpha, rgb, Bimg, loose):
    """Floor-shadow pixels baked into a mask. A candidate is background-hued, darker than the backdrop and smooth;
    it must sit in the bottom band of its own object (each object of a sheet separately), be wide and flat, reach
    the outside, and stick out sideways beyond the object's footprint just above it (a cast shadow spreads wider
    than what casts it; a pink cap at the bottom of a pink tube does not). loose=False also requires no edges inside
    and a low profile, so it can run as a detector. -> uint8 mask of shadow pixels (empty when none).
    """
    rm = np.zeros(alpha.shape, np.uint8)
    solid = alpha > 0.5
    if solid.sum() < 100:
        return rm
    cand, lab = shadow_like(rgb, Bimg, loose=True)  # include the faint fade, or the shadow never reaches outside
    L = lab[..., 0]
    sd = np.sqrt(np.maximum(cv2.GaussianBlur(L * L, (0, 0), 2) - cv2.GaussianBlur(L, (0, 0), 2) ** 2, 0))
    cand &= (sd < (5.0 if loose else 3.0)) & (alpha > 0.03)
    Ls = cv2.GaussianBlur(L, (0, 0), 1.0)
    grad = np.hypot(cv2.Sobel(Ls, cv2.CV_32F, 1, 0, ksize=3), cv2.Sobel(Ls, cv2.CV_32F, 0, 1, ksize=3)) / 8
    _, objs = cv2.connectedComponents(cv2.dilate(solid.astype(np.uint8), disk(2)), connectivity=8)
    n, labl, stats, _ = cv2.connectedComponentsWithStats(cand.astype(np.uint8), 8)
    out_ring = cv2.dilate((alpha < 0.03).astype(np.uint8), disk(2)).astype(bool)
    for i in range(1, n):
        x, y, bw, bh, area = (int(v) for v in stats[i])
        comp = labl == i
        ids = np.unique(objs[comp])
        ids = ids[ids > 0]
        if not len(ids) or bw < 1.5 * bh or not (comp & out_ring).any():
            continue  # floor shadows are wide and flat and reach the outside
        obj = np.isin(objs, ids) & solid
        oys, oxs = np.nonzero(obj)
        oy0, oy1, ox0, ox1 = oys.min(), oys.max(), oxs.min(), oxs.max()
        ohgt, owid = oy1 - oy0 + 1, ox1 - ox0 + 1
        if area < max(30, obj.sum() * (0.0005 if loose else 0.002)) or y < oy1 - (0.3 if loose else 0.15) * ohgt:
            continue
        if not loose and (bh > 0.1 * ohgt or np.percentile(grad[comp], 90) > 0.9):
            continue  # a subject part (has edges or height), not a soft cast shadow
        rows = slice(max(oy0, y - max(4, bh)), max(oy0, y))
        cols = np.nonzero((obj & ~cand)[rows].any(0))[0]
        m = 0.03 * owid
        if len(cols) and not (x < cols.min() - m or x + bw - 1 > cols.max() + m):
            continue  # does not spread beyond the footprint above it: part of the object (cap, base, feet)
        rm[comp] = 1
    if rm.sum() > 0.25 * solid.sum():
        return np.zeros_like(rm)  # subject coloured like its background: refuse
    return rm


def remove_shadow(alpha, rm, report):
    soft = cv2.GaussianBlur(cv2.dilate(rm, disk(1)).astype(np.float32), (0, 0), 1.0)
    report["shadowRemovedPx"] = int(rm.sum())
    return alpha * (1 - np.clip(soft, 0, 1))


def clean_islands(alpha, min_frac, report):
    """Drop specks and small detached islands; zero faint haze far from the kept subject (keeps trims tight)."""
    hard = (alpha > 0.5).astype(np.uint8)
    n, lab, stats, _ = cv2.connectedComponentsWithStats(hard, 8)
    if n <= 1:
        return alpha
    areas = stats[1:, cv2.CC_STAT_AREA]
    big = areas.max()
    keep_ids = [i + 1 for i, a in enumerate(areas) if a >= min_frac * big]
    keep = np.isin(lab, keep_ids).astype(np.uint8)
    removed = int(hard.sum() - keep.sum())
    if removed:
        report["islandsRemovedPx"] = removed
    h, w = alpha.shape
    reach = cv2.dilate(keep, disk(max(4, int(0.012 * max(h, w))))).astype(bool)
    return np.where(reach, alpha, 0).astype(np.float32)


def choke(alpha, px):
    if px <= 0:
        return alpha
    lo, hi = int(math.floor(px)), int(math.ceil(px))
    e_lo = cv2.erode(alpha, disk(lo)) if lo > 0 else alpha
    e_hi = cv2.erode(alpha, disk(hi))
    f = px - lo
    return e_lo * (1 - f) + e_hi * f


def decontaminate(rgb, alpha, Bimg, noise, reach):
    """Solve I = aF + (1-a)B for the foreground colour F on soft edges (removes background halos).

    Only pixels within `reach` of real background (anything still transparent once lifter holes are refilled: the
    outside and kept gaps); soft pixels deep inside the subject carry no backdrop colour.
    """
    core = fg_core(rgb, alpha, Bimg, noise)
    if core.sum() < 20:
        return rgb
    _, (iy, ix) = ndimage.distance_transform_edt(~core, return_indices=True)
    Fn = rgb[iy, ix]
    a = alpha[..., None]
    Fs = (rgb - (1 - a) * Bimg) / np.maximum(a, 1e-3)
    wgt = np.clip((alpha - 0.1) / 0.5, 0, 1)[..., None]
    F = np.clip(wgt * Fs + (1 - wgt) * Fn, 0, 255)
    near = ndimage.distance_transform_edt(alpha >= 0.01) <= reach
    edge = ((alpha > 0) & (alpha < 0.995) & near)[..., None]
    return np.where(edge, F, rgb).astype(np.float32)


def bleed(rgb, alpha, B, noise=1.0):
    """Mean background contamination of soft-edge colours (0 = clean, 1 = edge pixels are pure background).

    B: per-pixel background estimate (H x W x 3) or one colour.
    """
    if B is None:
        return None
    B = np.asarray(B, np.float32)
    B = B if B.ndim == 3 else B[None, None]
    core = fg_core(rgb, alpha, B, noise)
    band = (alpha > 0.05) & (alpha < 0.95)
    if core.sum() < 20 or band.sum() < 20:
        return None
    _, (iy, ix) = ndimage.distance_transform_edt(~core, return_indices=True)
    Fn = rgb[iy, ix]
    v = B - Fn
    den = (v * v).sum(2)
    ok = band & (den > 400)
    if ok.sum() < 20:
        return None
    c = np.clip(((rgb - Fn) * v).sum(2) / np.maximum(den, 1), 0, 1)
    wgt = (alpha * (1 - alpha))[ok]
    return round(float((c[ok] * wgt).sum() / wgt.sum()), 3)


def edge_hits(alpha):
    out = {}
    for side, strip in (("top", alpha[:2]), ("bottom", alpha[-2:]), ("left", alpha[:, :2]), ("right", alpha[:, -2:])):
        out[side] = int((strip > 0.5).sum())
    return out


def trim_box(alpha, pad, thr=0.03):
    ys, xs = np.nonzero(alpha > thr)
    h, w = alpha.shape
    if len(ys) == 0:
        return 0, 0, w, h
    return (max(int(xs.min()) - pad, 0), max(int(ys.min()) - pad, 0),
            min(int(xs.max()) + pad + 1, w), min(int(ys.max()) + pad + 1, h))


def to_rgba(rgb, alpha):
    a = np.clip(np.round(alpha * 255), 0, 255).astype(np.uint8)
    c = np.clip(np.round(rgb), 0, 255).astype(np.uint8)
    c[a == 0] = 0
    return np.dstack([c, a])


def resize_rgba(rgba, s):
    if abs(s - 1) < 1e-6:
        return rgba
    h, w = rgba.shape[:2]
    size = (max(1, round(w * s)), max(1, round(h * s)))
    return np.asarray(Image.fromarray(rgba, "RGBA").resize(size, Image.LANCZOS))  # PIL premultiplies RGBA


def fit_scale(w, h, maxW, maxH):
    s = 1.0
    if maxH:
        s = min(s, maxH / h)
    if maxW:
        s = min(s, maxW / w)
    return s


def foot_anchor(alpha_u8):
    """Horizontal centre of the support (lowest 3% of opaque rows), as a fraction of the width."""
    a = alpha_u8.astype(np.float32) / 255
    ys = np.nonzero(a.max(1) > 0.5)[0]
    if len(ys) == 0:
        return 0.5
    y1 = ys.max()
    band = a[max(0, y1 - max(2, int(0.03 * len(ys)))):y1 + 1]
    col = band.sum(0)
    if col.sum() <= 0:
        return 0.5
    return round(float((col * np.arange(a.shape[1])).sum() / col.sum() / a.shape[1]), 3)


# ───────────────────────── colour matching ─────────────────────────
def match_palette(rgba, style, strength, report):
    """White-balance near-white areas toward the style's paper colour (light theme) or ink (dark theme)."""
    pal = (style or {}).get("palette") or {}
    theme = ((style or {}).get("layout") or {}).get("theme", "light")
    if theme == "light":
        target = pal.get("surface") or pal.get("bg")
    else:
        target = pal.get("ink") or pal.get("surface")
    if not target:
        WARN.append("match palette: style.json has no palette; skipped")
        return rgba
    rgb = rgba[..., :3].astype(np.float32)
    a = rgba[..., 3] > 240
    lab = to_lab(rgb)
    chroma = np.linalg.norm(lab[..., 1:], axis=2)
    cand = a & (chroma < 12) & (lab[..., 0] > 70)
    if cand.sum() < 200:
        report["match"] = "palette: no near-white area, skipped"
        return rgba
    L = lab[..., 0][cand]
    top = cand & (lab[..., 0] >= np.percentile(L, 90))
    src_w = s2l(rgb[top].mean(0))
    tgt = s2l(hexrgb(target))
    g = tgt / np.maximum(src_w, 1e-4)
    g = g / (0.2126 * g[0] + 0.7152 * g[1] + 0.0722 * g[2])  # keep luminance, change only the cast
    g = np.clip(g, 0.9, 1.1)
    g = 1 + (g - 1) * strength
    out = rgba.copy()
    out[..., :3] = np.clip(np.round(l2s(s2l(rgb) * g[None, None])), 0, 255).astype(np.uint8)
    report["match"] = f"palette {target} gains {np.round(g, 3).tolist()}"
    return out


def match_asset(rgba, ref, strength, report):
    """Pull colour statistics (Lab mean, limited spread) toward a reference cutout of the same character."""
    def stats(x):
        m = x[..., 3] > 240
        lab = to_lab(x[..., :3].astype(np.float32))[m]
        return lab.mean(0), lab.std(0) + 1e-3

    if (rgba[..., 3] > 240).sum() < 100 or (ref[..., 3] > 240).sum() < 100:
        return rgba
    ms, ss = stats(rgba)
    mr, sr = stats(ref)
    k = np.clip(sr / ss, 0.8, 1.25)
    lab = to_lab(rgba[..., :3].astype(np.float32))
    new = (lab - ms) * k + mr
    lab = lab + (new - lab) * strength
    out = rgba.copy()
    out[..., :3] = np.clip(np.round(from_lab(lab)), 0, 255).astype(np.uint8)
    report["match"] = f"asset: dLab mean {np.round((mr - ms) * strength, 2).tolist()}"
    return out


# ───────────────────────── eyes & blink ─────────────────────────
def find_eyes(rgba, params=None):
    """Find a pair of dark eye blobs in the upper part of a character cutout.

    -> dict(eyes=[{cx, cy, w, h, color, mask}], tilt, pass, second) or None.
    """
    params = params or {}
    P = dict(EYE_DEFAULTS, **{k: v for k, v in params.items() if k in EYE_DEFAULTS})
    h, w = rgba.shape[:2]
    rgb = rgba[..., :3].astype(np.float32)
    lum = lum_of(rgb)
    solid = rgba[..., 3] > 200
    top = int(h * P["upper"])
    over = {k: v for k, v in params.items() if k in ("lum", "rel", "fill", "aspect", "ring", "contrast", "maxArea")}
    passes = [dict(p, **over) for p in EYE_PASSES]
    env = None
    first, every = None, []
    for pi, pas in enumerate(passes):
        if pas["mode"] == "abs":
            dark = (lum < pas["lum"]) & solid
        else:
            if env is None:
                s = 0.25
                small = cv2.resize(lum, None, fx=s, fy=s, interpolation=cv2.INTER_AREA)
                k = max(5, int(0.12 * min(h, w) * s)) | 1
                closed = cv2.morphologyEx(small, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_RECT, (k, k)))
                env = cv2.resize(closed, (w, h), interpolation=cv2.INTER_LINEAR)  # local brightness envelope
            dark = (lum < env - pas["rel"]) & solid
        dark[top:] = False
        n, lab, stats, cent = cv2.connectedComponentsWithStats(dark.astype(np.uint8), 8)
        maxA = pas["maxArea"] or P["maxArea"]
        cands = []
        for i in range(1, n):
            x, y, bw, bh, area = (int(v) for v in stats[i])
            if area < h * w * P["minArea"] or area > h * w * maxA or area < 6:
                continue
            fill = area / float(bw * bh)
            if fill < pas["fill"] or bh < bw * pas["aspect"] or bh > bw * 3.5:
                continue
            pad = max(5, int(0.5 * max(bw, bh)))
            ya, yb, xa, xb = max(y - pad, 0), min(y + bh + pad, h), max(x - pad, 0), min(x + bw + pad, w)
            comp = lab[ya:yb, xa:xb] == i
            near = cv2.dilate(comp.astype(np.uint8), disk(2)).astype(bool)
            ring = ~near & solid[ya:yb, xa:xb]
            if ring.sum() < 12:
                continue
            ring_med = float(np.median(lum[ya:yb, xa:xb][ring]))
            eye_med = float(np.median(lum[ya:yb, xa:xb][comp]))
            if ring_med < pas["ring"] or ring_med - eye_med < pas["contrast"]:
                continue
            color = np.median(rgb[ya:yb, xa:xb][comp], axis=0)
            cands.append(dict(i=i, area=area, cx=float(cent[i][0]), cy=float(cent[i][1]), w=bw, h=bh, color=color))
        pairs = _pairs(cands, w, P)
        if pairs and first is None:
            first = (pi, pairs[0], lab)
        every += pairs
    if first is None:
        return None
    pi, best, lab = first
    eyes = [dict(cx=e["cx"], cy=e["cy"], w=e["w"], h=e["h"], color=e["color"], mask=lab == e["i"]) for e in best[1:]]
    a, b = eyes

    def far(p, q):
        return math.hypot(p["cx"] - q["cx"], p["cy"] - q["cy"]) > max(p["w"], q["w"])

    # another face: a valid pair (any pass) away from both chosen eyes -> group shot
    second = any(p[0] > 0.3 * best[0] and all(far(x, y) for x in p[1:] for y in best[1:]) for p in every)
    return dict(eyes=eyes, tilt=math.atan2(b["cy"] - a["cy"], b["cx"] - a["cx"]), pass_=pi + 1, second=second)


def _pairs(cands, w, P):
    """Valid eye pairs, best first: level, separated, similar size/shape/colour."""
    pairs = []
    for a in cands:
        for b in cands:
            if a["cx"] >= b["cx"]:
                continue
            dy, dx = abs(a["cy"] - b["cy"]), b["cx"] - a["cx"]
            ratio = min(a["area"], b["area"]) / max(a["area"], b["area"])
            shape = abs(math.log((a["h"] / a["w"]) / (b["h"] / b["w"])))
            dcol = float(np.linalg.norm(a["color"] - b["color"]))
            if (dy < max(a["h"], b["h"]) * 1.1 and dx > max(a["w"], b["w"]) * 2 and dx < w * P["maxSpan"]
                    and ratio > 0.3 and shape < math.log(1.6) and dcol < 60):
                pairs.append(((a["area"] + b["area"]) * ratio - dy * 5, a, b))
    pairs.sort(key=lambda p: -p[0])
    return pairs


def manual_eyes(rgba, boxes):
    """Eye boxes given in output pixels [[cx, cy, w, h], ...] -> eye dicts with elliptical masks."""
    h, w = rgba.shape[:2]
    eyes = []
    for cx, cy, ew, eh in boxes:
        m = np.zeros((h, w), np.uint8)
        cv2.ellipse(m, (int(round(cx)), int(round(cy))), (max(1, int(ew / 2)), max(1, int(eh / 2))), 0, 0, 360, 1, -1)
        m = m.astype(bool) & (rgba[..., 3] > 0)
        px = rgba[..., :3][m].astype(np.float32)
        lum = lum_of(px) if len(px) else np.zeros(0)
        color = np.median(px[lum <= np.percentile(lum, 40)], 0) if len(px) > 4 else np.array([50, 36, 40], np.float32)
        eyes.append(dict(cx=float(cx), cy=float(cy), w=int(ew), h=int(eh), color=color, mask=m))
    eyes.sort(key=lambda e: e["cx"])
    tilt = math.atan2(eyes[-1]["cy"] - eyes[0]["cy"], eyes[-1]["cx"] - eyes[0]["cx"]) if len(eyes) > 1 else 0.0
    return dict(eyes=eyes, tilt=tilt, pass_="manual", second=False)


def make_blink(rgba, found, color=None, seed=1):
    """Inpaint the open eyes and draw a gently curved closed-eye stroke (4x supersampled)."""
    h, w = rgba.shape[:2]
    eyes, tilt = found["eyes"], found["tilt"]
    lum0 = lum_of(rgba[..., :3].astype(np.float32))
    solid = rgba[..., 3] > 200
    mask = np.zeros((h, w), np.uint8)
    for e in eyes:
        pts = cv2.findNonZero(e["mask"].astype(np.uint8))
        if pts is None:
            continue
        hull = np.zeros((h, w), np.uint8)
        cv2.fillConvexPoly(hull, cv2.convexHull(pts), 1)  # hull also covers enclosed highlights
        # attached dark details (lashes, eye outline): dark pixels connected to the eye, close to it
        ring = cv2.dilate(hull, disk(max(3, int(0.3 * e["h"])))).astype(bool) & ~hull.astype(bool) & solid
        if ring.sum() > 10:
            dark = (lum0 < np.median(lum0[ring]) - 35) & solid
            near = cv2.dilate(hull, disk(max(2, int(0.45 * e["h"])))).astype(bool)
            cand = cv2.dilate(((dark & near) | hull.astype(bool)).astype(np.uint8), disk(1))
            n, lab = cv2.connectedComponents(cand, connectivity=8)
            ids = np.unique(lab[hull.astype(bool)])
            hull = (np.isin(lab, ids[ids > 0]) & (cand > 0)).astype(np.uint8)
        mask |= hull * 255
    ew = max(e["w"] for e in eyes)
    k = max(2, int(round(ew * 0.12)))
    mask = cv2.dilate(mask, disk(k), iterations=2)
    bgr = np.ascontiguousarray(rgba[..., :3][..., ::-1])
    filled = cv2.inpaint(bgr, mask, max(5, int(ew * 0.4)), cv2.INPAINT_TELEA).astype(np.float32)
    m = (mask > 0)
    # restore the surface texture the inpaint smoothed away (plush, paper, grain)
    ring = cv2.dilate(mask, disk(k * 2 + 3)).astype(bool) & ~m & solid
    if ring.sum() > 20:
        hf = (lum0 - cv2.GaussianBlur(lum0, (0, 0), 1.5))[ring]
        sd = float(np.clip(hf.std(), 0, 6))
        noise = np.random.default_rng(seed).normal(0, sd, (h, w)).astype(np.float32)
        filled = cv2.GaussianBlur(filled, (0, 0), 1.2) * m[..., None] + filled * (~m[..., None])
        filled += (noise * m)[..., None]
    out = rgba.copy()
    out[..., :3] = np.clip(np.round(filled), 0, 255).astype(np.uint8)[..., ::-1]
    # closed-eye strokes
    S = 4
    over = Image.new("RGBA", (w * S, h * S), (0, 0, 0, 0))
    d = ImageDraw.Draw(over)
    ca, sa = math.cos(tilt), math.sin(tilt)
    for e in eyes:
        c = hexrgb(color) if color else np.array(e["color"], np.float32)
        L = float(lum_of(c[None])[0])
        if L > 90:
            c = c * (90.0 / L)
        col = tuple(int(v) for v in np.clip(c, 0, 255)) + (255,)
        half = min(e["w"] * 0.85, e["h"] * 0.7)
        th = float(np.clip(e["w"] * 0.28, 2.2, 6.5 * max(1.0, e["w"] / 26.0)))
        sag = e["h"] * 0.16
        pts = []
        for u in np.linspace(-1, 1, 24):
            px, py = u * half, e["h"] * 0.12 + (1 - u * u) * sag
            pts.append(((e["cx"] + px * ca - py * sa) * S, (e["cy"] + px * sa + py * ca) * S))
        d.line(pts, fill=col, width=max(1, int(round(th * S))), joint="curve")
        r = th * S / 2
        for p in (pts[0], pts[-1]):
            d.ellipse([p[0] - r, p[1] - r, p[0] + r, p[1] + r], fill=col)
    over = np.asarray(over.resize((w, h), Image.LANCZOS)).copy()
    over[..., 3] = (over[..., 3].astype(np.float32) * (rgba[..., 3] / 255.0)).astype(np.uint8)
    base = Image.fromarray(out, "RGBA")
    base.alpha_composite(Image.fromarray(over, "RGBA"))
    res = np.asarray(base).copy()
    res[..., 3] = rgba[..., 3]
    return res


def cv_msg(e):
    """Short OpenCV error text (the raw message carries build paths)."""
    import re
    m = re.search(r"\((-?\d+:[^)]*)\)", str(e))
    return m.group(1) if m else type(e).__name__


def blink_from(open_rgba, closed_rgba, found, report):
    """Blink variant from a generated eyes-closed image of the same pose: register the face, transplant the eyes.

    1) place the closed image in the open image's frame by matching silhouette boxes (height + bottom centre);
    2) refine with affine ECC on the face window; 3) feathered transplant of the eye regions only.
    -> (blink rgba, eyes) or (None, None).
    """
    h, w = open_rgba.shape[:2]
    oa, ca_ = open_rgba[..., 3] > 128, closed_rgba[..., 3] > 128
    if oa.sum() < 100 or ca_.sum() < 100:
        return None, None
    oy, ox = np.nonzero(oa)
    cy, cx = np.nonzero(ca_)
    s = (oy.max() - oy.min() + 1) / (cy.max() - cy.min() + 1)
    tx = (ox.min() + ox.max()) / 2 - s * (cx.min() + cx.max()) / 2
    ty = oy.max() - s * cy.max()
    pre = cv2.warpAffine(closed_rgba, np.array([[s, 0, tx], [0, s, ty]], np.float32), (w, h),
                         flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0, 0))
    if found:
        xs = [e["cx"] for e in found["eyes"]]
        ys = [e["cy"] for e in found["eyes"]]
        ew = max(e["w"] for e in found["eyes"])
        eh = max(e["h"] for e in found["eyes"])
        x0, x1 = int(min(xs) - 3 * ew), int(max(xs) + 3 * ew)
        y0, y1 = int(min(ys) - 2.5 * eh), int(max(ys) + 2.5 * eh)
    else:
        x0, x1 = int(ox.min()), int(ox.max())
        y0, y1 = int(oy.min()), int(oy.min() + 0.45 * (oy.max() - oy.min()))
    x0, y0, x1, y1 = max(0, x0), max(0, y0), min(w, x1), min(h, y1)

    def gray(x):
        g = lum_of(x[..., :3].astype(np.float32)) * (x[..., 3] / 255.0) + 128 * (1 - x[..., 3] / 255.0)
        return cv2.GaussianBlur(g.astype(np.float32), (0, 0), 1.0)

    tmpl, inp = gray(open_rgba[y0:y1, x0:x1]), gray(pre[y0:y1, x0:x1])
    W = np.eye(2, 3, dtype=np.float32)
    try:
        _, W = cv2.findTransformECC(tmpl, inp, W, cv2.MOTION_AFFINE,
                                    (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 200, 1e-6),
                                    (pre[y0:y1, x0:x1, 3] > 128).astype(np.uint8), 5)
        report["blinkFrom"] = "registered (silhouette box + affine ECC on the face)"
    except cv2.error as e:
        report.setdefault("warnings", []).append(f"blinkFrom: face registration did not converge ({cv_msg(e)}); "
                                                 "using silhouette alignment only - check the blink sheet")
        W = np.eye(2, 3, dtype=np.float32)
    al = cv2.warpAffine(pre[y0:y1, x0:x1], W, (x1 - x0, y1 - y0), flags=cv2.INTER_LINEAR | cv2.WARP_INVERSE_MAP,
                        borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0, 0))
    warped = np.zeros_like(open_rgba)
    warped[y0:y1, x0:x1] = al
    win = np.zeros((h, w), bool)
    win[y0:y1, x0:x1] = True
    if found:
        m = np.zeros((h, w), np.uint8)
        for e in found["eyes"]:
            cv2.ellipse(m, (int(e["cx"]), int(e["cy"] + e["h"] * 0.05)), (int(e["w"] * 1.25), int(e["h"] * 1.05)),
                        math.degrees(found["tilt"]), 0, 360, 255, -1)
        eyes = found["eyes"]
    else:
        diff = np.abs(lum_of(open_rgba[..., :3].astype(np.float32)) - lum_of(warped[..., :3].astype(np.float32)))
        dm = ((diff > 40) & win & (warped[..., 3] > 200) & oa).astype(np.uint8)
        dm = cv2.morphologyEx(dm, cv2.MORPH_OPEN, disk(1))
        n, lab, stats, cent = cv2.connectedComponentsWithStats(dm, 8)
        if n < 3:
            report.setdefault("warnings", []).append("blinkFrom: no eye change found between open and closed images")
            return None, None
        order = np.argsort(-stats[1:, cv2.CC_STAT_AREA])[:2] + 1
        m = np.zeros((h, w), np.uint8)
        eyes = []
        for i in sorted(order, key=lambda i: cent[i][0]):
            bw, bh = int(stats[i, cv2.CC_STAT_WIDTH]), int(stats[i, cv2.CC_STAT_HEIGHT])
            cv2.ellipse(m, (int(cent[i][0]), int(cent[i][1])), (int(bw * 0.9) + 3, int(bh * 0.9) + 3),
                        0, 0, 360, 255, -1)
            eyes.append(dict(cx=float(cent[i][0]), cy=float(cent[i][1]), w=bw, h=bh,
                             area=int(stats[i, cv2.CC_STAT_AREA])))
        a, b = eyes
        if not (abs(a["cy"] - b["cy"]) < 1.1 * max(a["h"], b["h"]) and b["cx"] - a["cx"] > 2 * max(a["w"], b["w"])
                and min(a["area"], b["area"]) > 0.3 * max(a["area"], b["area"])):
            report.setdefault("warnings", []).append(
                "blinkFrom: the changed regions do not look like a pair of eyes; set \"eyes\" [[cx, cy, w, h], ...]")
            return None, None
    feather = max(1.5, 0.15 * max(e["w"] for e in eyes))
    mf = cv2.GaussianBlur(m.astype(np.float32) / 255, (0, 0), feather)[..., None]
    mf = mf * (warped[..., 3:4] / 255.0)
    out = open_rgba.copy()
    out[..., :3] = np.clip(np.round(open_rgba[..., :3] * (1 - mf) + warped[..., :3] * mf), 0, 255).astype(np.uint8)
    return out, eyes


# ───────────────────────── UI text removal ─────────────────────────
def remove_text(rgba, spec, report):
    """Inpaint text out of a UI element: background = morphological closing/opening; returns (clean, rows)."""
    h, w = rgba.shape[:2]
    rgb = rgba[..., :3].astype(np.float32)
    a = rgba[..., 3]
    inset = max(4, int(0.02 * min(h, w)))
    interior = cv2.erode((a > 250).astype(np.uint8), disk(inset)).astype(bool)
    ts = spec.get("textSize") or max(9, int(0.06 * min(h, w)))
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (int(ts) | 1, int(ts) | 1))
    close = cv2.morphologyEx(rgb, cv2.MORPH_CLOSE, k)
    opn = cv2.morphologyEx(rgb, cv2.MORPH_OPEN, k)
    dark_d = (close - rgb).max(2)
    light_d = (rgb - opn).max(2)
    pol = spec.get("textColor", "auto")
    if pol not in ("dark", "light"):
        # polarity from luminance against the element's own fill (morphology on dense text fakes the other one)
        lum = lum_of(rgb)
        dev = lum[interior] - np.median(lum[interior]) if interior.any() else np.zeros(1)
        pol = "dark" if (dev < -40).sum() >= (dev > 40).sum() else "light"
    est, dmap = (close, dark_d) if pol == "dark" else (opn, light_d)
    tm = (dmap > 24) & interior
    for bx, by, bw, bh in spec.get("textBoxes") or []:
        tm[int(by):int(by + bh), int(bx):int(bx + bw)] |= interior[int(by):int(by + bh), int(bx):int(bx + bw)]
    if tm.sum() == 0:
        report.setdefault("warnings", []).append("inpaintText: no text found")
        return rgba, []
    tmd = cv2.dilate(tm.astype(np.uint8), disk(2)).astype(bool)
    fill = rgb.copy()
    fill[tmd] = est[tmd]
    soft = cv2.GaussianBlur(fill, (0, 0), 1.5)
    sm = cv2.GaussianBlur(tmd.astype(np.float32), (0, 0), 1.0)[..., None]
    fill = fill * (1 - sm) + soft * sm
    # anything still deviating (glyphs thicker than the kernel) -> TELEA
    med = cv2.medianBlur(np.clip(fill, 0, 255).astype(np.uint8), 5).astype(np.float32)
    resid = (np.abs(fill - med).max(2) > 18) & tmd
    if resid.sum() > 0:
        bgr = np.ascontiguousarray(np.clip(fill, 0, 255).astype(np.uint8)[..., ::-1])
        fill = cv2.inpaint(bgr, cv2.dilate(resid.astype(np.uint8), disk(2)) * 255, 5, cv2.INPAINT_TELEA)[..., ::-1]
    out = rgba.copy()
    out[..., :3] = np.clip(np.round(fill), 0, 255).astype(np.uint8)
    # text rows: horizontal projection of the undilated text mask
    prof = tm.sum(1) > 0
    runs, y = [], 0
    while y < h:
        if prof[y]:
            y0 = y
            while y < h and prof[y]:
                y += 1
            runs.append([y0, y])
        y += 1
    if runs:
        med = float(np.median([r[1] - r[0] for r in runs]))
        merged = [runs[0]]
        for r in runs[1:]:
            if r[0] - merged[-1][1] < 0.3 * med:
                merged[-1][1] = r[1]
            else:
                merged.append(r)
        runs = [r for r in merged if r[1] - r[0] >= max(3, 0.3 * med)]
    rows = []
    for y0, y1 in runs:
        cols = np.nonzero(tm[y0:y1].any(0))[0]
        rows.append([int(cols.min()), int(y0), int(cols.max() + 1), int(y1)])
    report["textRows"] = len(rows)
    report["textPolarity"] = pol
    return out, rows


# ───────────────────────── the per-asset pipeline ─────────────────────────
class Ctx:
    def __init__(self, project: Path, args, style):
        self.P = project
        self.assets = project / "assets"
        self.cache = project / "build" / "lift"
        self.qa = project / "build" / "qa"
        self.args = args
        self.style = style
        self._lift = None
        self._lift_checked = False

    def lift_bin(self):
        if not self._lift_checked:
            self._lift = ensure_lift(self.args.lift_bin)
            self._lift_checked = True
        return self._lift

    def backend(self, want):
        if want in ("vision", "flatbg", "rembg"):
            return want
        if self.lift_bin():
            return "vision"
        return "rembg" if rembg_ok() else "flatbg"


def resolve_src(ctx, s):
    p = Path(os.path.expanduser(str(s)))
    return p if p.is_absolute() else (ctx.P / p)


LIFT_MAX = 2048  # lifters work at <= this many px; outputs are capped far below it anyway


def resize_f(img, s, interp=cv2.INTER_AREA):
    h, w = img.shape[:2]
    return cv2.resize(img, (max(1, round(w * s)), max(1, round(h * s))), interpolation=interp)


class Cut:
    """Result of cutout(): working-resolution colour + alpha and the source -> working transform."""

    def __init__(self, rgb, alpha, instances=None, bgcolor=None, scale=1.0, origin=(0, 0)):
        self.rgb, self.alpha, self.instances, self.bgcolor = rgb, alpha, instances, bgcolor
        self.scale, self.origin = scale, origin  # x_work = x_src * scale - origin[0]

    def to_work(self, x, y):
        return x * self.scale - self.origin[0], y * self.scale - self.origin[1]


def cutout(ctx, name, spec, src, report):
    """Load, lift and refine. Large sources are lifted at <= LIFT_MAX px, cropped to the subject and refined at
    ~1.5x their final size (refining 12 MP to ship 1 MP only costs minutes and gigabytes). -> Cut."""
    rgb, a_in, vpath = load_image(src, ctx.cache)
    h, w = rgb.shape[:2]
    report["srcSize"] = [w, h]
    lift = spec["lift"]
    if spec.get("parallax"):
        lift = True
    if lift == "auto":
        lift = a_in is None
    if not lift:
        report["backend"] = "alpha" if a_in is not None else "none"
        return Cut(rgb, a_in if a_in is not None else np.ones((h, w), np.float32))
    if a_in is not None:
        report.setdefault("notes", []).append("source has alpha; lifted anyway and multiplied with it")
    # 1) lift at <= LIFT_MAX px
    ps = min(1.0, LIFT_MAX / max(h, w))
    if ps < 1.0:
        rgb = resize_f(rgb, ps)
        a_in = resize_f(a_in, ps) if a_in is not None else None
        h, w = rgb.shape[:2]
    backend = ctx.backend(spec["backend"] if spec["backend"] != "auto" else ctx.args.backend)
    instances, bgm = None, None
    alpha = None
    if backend == "vision":
        lb = ctx.lift_bin()
        if lb is None:
            report.setdefault("warnings", []).append("Vision unavailable; using flatbg")
            backend = "flatbg"
        else:
            tag = hashlib.sha1(LIFT_SWIFT.read_bytes()).hexdigest()[:6]
            key = f"{name}-{sha1_file(src)[:10]}-{tag}-{w}"
            if ps < 1.0:  # Vision reads a file: hand it the oriented, downscaled copy
                ctx.cache.mkdir(parents=True, exist_ok=True)
                vpath = ctx.cache / f"{key}-src.png"
                if not vpath.exists() or ctx.args.force:
                    Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8)).save(vpath)
            try:
                res = vision_lift(vpath, (h, w), key, lb, ctx.cache, ctx.args.force)
            except RuntimeError as e:
                report.setdefault("warnings", []).append(f"Vision failed ({e}); using flatbg")
                res, backend = None, "flatbg"
            if res is None and backend == "vision":
                report.setdefault("warnings", []).append("Vision found no subject; using flatbg")
                backend = "flatbg"
            elif res is not None:
                alpha = res["alpha"]
                instances = res["instances"]
                report["instances"] = res["count"]
    if backend == "rembg":
        try:
            alpha = rembg_lift(rgb)
        except Exception as e:  # missing package or model download failure
            report.setdefault("warnings", []).append(f"rembg failed ({type(e).__name__}); using flatbg")
            backend = "flatbg"
    if backend == "flatbg":
        alpha, bgm = flatbg_lift(rgb)
    report["backend"] = backend
    if a_in is not None:
        alpha = alpha * a_in
    # cut-off check on the whole frame, before any crop
    eh = edge_hits(alpha)
    cut = {k: v for k, v in eh.items() if v > max(6, 0.004 * (w if k in ("top", "bottom") else h))}
    if cut and not spec.get("split") and spec["kind"] not in ("photo", "ui"):
        report.setdefault("warnings", []).append(
            "subject touches the frame edge (" + ", ".join(f"{k} {v}px" for k, v in cut.items())
            + "): cropped ears/feet? regenerate with more margin")
    # 2) working frame: crop to the subject (single assets) and scale to ~1.5x the final size
    origin, ws = (0, 0), 1.0
    ys, xs = np.nonzero(alpha > 0.01)
    if len(ys):
        if spec.get("parallax"):
            fs = fit_scale(w, h, spec["maxW"], spec["maxH"])
        elif spec.get("split"):
            hs = [b[3] for _, b, _ in instances] if instances else [ys.max() - ys.min() + 1]
            fs = fit_scale(1, max(hs), None, spec["maxH"])
        else:
            bw, bh = xs.max() - xs.min() + 1, ys.max() - ys.min() + 1
            fs = fit_scale(bw, bh, spec["maxW"], spec["maxH"])
            m = int(max(48, 0.06 * max(bw, bh)))
            x0, y0 = max(0, xs.min() - m), max(0, ys.min() - m)
            x1, y1 = min(w, xs.max() + m + 1), min(h, ys.max() + m + 1)
            if (x1 - x0) * (y1 - y0) < 0.8 * w * h:
                rgb, alpha = rgb[y0:y1, x0:x1], alpha[y0:y1, x0:x1]
                origin = (x0, y0)
        ws = min(1.0, 1.5 * fs)
        if ws < 0.9:
            rgb, alpha = resize_f(rgb, ws), np.clip(resize_f(alpha, ws), 0, 1)
            if instances:
                instances = [(resize_f(m, ws), [int(v * ws) for v in b], a) for m, b, a in instances]
            origin = (origin[0] * ws, origin[1] * ws)
        else:
            ws = 1.0
    h, w = alpha.shape
    band = max(6.0, 0.008 * max(h, w)) if backend != "flatbg" else max(3.0, 0.004 * max(h, w))
    # 3) refine
    if bgm is None or ws != 1.0 or origin != (0, 0):
        bgm = fit_background(rgb, alpha)
    flat = bool(bgm is not None and bgm.flat)
    report["flatBg"] = flat
    bgcolor = bgm.color if bgm is not None else None
    if bgcolor is not None:
        report["bg"] = rgbhex(bgcolor)
    holes = spec["holes"]
    if bgm is not None and (flat or holes == "fill"):
        Bmodel = bgm.predict()
        if holes == "fill" or (holes == "auto" and flat):
            alpha = fill_holes(alpha, rgb, Bmodel, bgm.noise, report, band, everything=holes == "fill")
        if flat:
            alpha = drop_frame_leaks(alpha, rgb, Bmodel, bgm.noise, report)
    elif holes == "auto" and not flat:
        alpha = fill_holes_busy(alpha, rgb, report, band)
    Bimg = local_background(rgb, alpha, bgm, sigma=max(3.0, band)) if bgm is not None else None
    if spec["edge"] == "snap":
        if flat and Bimg is not None:
            free = band if backend == "flatbg" else max(1.0, 0.15 * band)
            alpha = snap_flat(rgb, alpha, Bimg, bgm.noise, band, free)
        else:
            alpha = snap_guided(rgb, alpha, band)
    shadow = spec["shadow"]
    if shadow != "keep" and flat and Bimg is not None:
        rm = find_shadow(alpha, rgb, Bimg, loose=shadow == "remove")
        if rm.any() and shadow == "remove":
            alpha = remove_shadow(alpha, rm, report)
        elif rm.any():  # auto: Vision/rembg normally exclude cast shadows, so only flag it
            report.setdefault("warnings", []).append(f"possible baked floor shadow ({int(rm.sum())}px): "
                                                     "if the QA sheet shows it, set \"shadow\": \"remove\"")
    if spec["islands"]:
        alpha = clean_islands(alpha, float(spec["islands"]), report)
    alpha = choke(alpha, float(spec["choke"]))
    if spec["feather"]:
        alpha = cv2.GaussianBlur(alpha, (0, 0), float(spec["feather"]))
    alpha = np.clip(alpha, 0, 1).astype(np.float32)
    if Bimg is not None:
        Bimg = local_background(rgb, alpha, bgm, sigma=max(3.0, band))
        report["bleedBefore"] = bleed(rgb, alpha, Bimg, bgm.noise)
        if spec["defringe"]:
            rgb = decontaminate(rgb, alpha, Bimg, bgm.noise, reach=2 * band + 2)
            report["bleedAfter"] = bleed(rgb, alpha, Bimg, bgm.noise)
    return Cut(rgb, alpha, instances, bgcolor, scale=ps * ws, origin=origin)


def reading_order(boxes):
    """Sort [x, y, w, h] boxes into rows (top to bottom), then left to right."""
    idx = sorted(range(len(boxes)), key=lambda i: boxes[i][1] + boxes[i][3] / 2)
    hmed = float(np.median([b[3] for b in boxes])) if boxes else 1
    rows, cur, cy = [], [], None
    for i in idx:
        c = boxes[i][1] + boxes[i][3] / 2
        if cur and c - cy > 0.5 * hmed:
            rows.append(cur)
            cur = []
        cur.append(i)
        cy = float(np.mean([boxes[j][1] + boxes[j][3] / 2 for j in cur]))
    if cur:
        rows.append(cur)
    return [i for r in rows for i in sorted(r, key=lambda j: boxes[j][0])]


def split_parts(alpha, instances, min_area):
    """Per-instance alphas from Vision instance masks (soft partition) or from connected components."""
    h, w = alpha.shape
    parts = []
    if instances and len(instances) > 1:
        stack = np.stack([m for m, _, _ in instances], 0)
        tot = np.maximum(stack.sum(0), 1e-6)
        for m, _, _ in instances:
            parts.append(alpha * (m / tot) * (stack.max(0) > 0.002))
    else:
        hard = (alpha > 0.5).astype(np.uint8)
        grow = cv2.dilate(hard, disk(max(2, int(0.006 * max(h, w)))))
        n, lab = cv2.connectedComponents(grow, connectivity=8)
        for i in range(1, n):
            reg = cv2.dilate((lab == i).astype(np.uint8), disk(2)).astype(bool)
            parts.append(np.where(reg, alpha, 0).astype(np.float32))
    areas = [float((p > 0.5).sum()) for p in parts]
    if not areas:
        return []
    big = max(areas)
    parts = [p for p, a in zip(parts, areas) if a >= min_area * big]
    boxes = []
    for p in parts:
        ys, xs = np.nonzero(p > 0.5)
        boxes.append([int(xs.min()), int(ys.min()), int(xs.max() - xs.min() + 1), int(ys.max() - ys.min() + 1)])
    order = reading_order(boxes)
    return [parts[i] for i in order]


def finish(ctx, name, rgb, alpha, spec, report, scale=None, keep_frame=False, base=1.0):
    """Trim, resize and turn into RGBA uint8. -> (rgba, scale applied here, (x0, y0) trim offset).

    base: source -> working scale of rgb/alpha, so report["scale"] is source -> output.
    """
    h, w = alpha.shape
    x0, y0, x1, y1 = (0, 0, w, h) if (keep_frame or not spec["trim"]) else trim_box(alpha, int(spec["pad"]))
    rgba = to_rgba(rgb[y0:y1, x0:x1], alpha[y0:y1, x0:x1])
    s = scale if scale is not None else fit_scale(x1 - x0, y1 - y0, spec["maxW"], spec["maxH"])
    s = min(s, 1.0)
    rgba = resize_rgba(rgba, s)
    report["scale"] = round(s * base, 4)
    return rgba, s, (x0, y0)


def character_extras(ctx, name, rgba, spec, report, s, off, outs, cut=None):
    """Colour match, eyes, blink variant. Mutates outs with the blink image.

    s, off: scale and trim offset applied by finish(); cut: the Cut (maps source pixels to working pixels).
    """
    meta = {}
    m = spec.get("match")
    if m:
        m = {"to": m} if isinstance(m, str) else dict(m)
        to = m.get("to", "palette")
        if to == "palette":
            rgba = match_palette(rgba, ctx.style, float(m.get("strength", 0.35)), report)
        else:
            refp = ctx.assets / f"{to}.webp"
            if refp.exists():
                ref = np.asarray(Image.open(refp).convert("RGBA"))
                rgba = match_asset(rgba, ref, float(m.get("strength", 0.6)), report)
            else:
                report.setdefault("warnings", []).append(f"match: {to}.webp not found (list it before {name})")
    if spec["kind"] in ("character", "illustration", "product", "prop"):
        meta["ax"] = foot_anchor(rgba[..., 3])
    blink = spec["blink"]
    if blink in (False, None, "off", "false"):
        return rgba, meta
    found = None
    if spec.get("eyes"):
        k = cut.scale if cut else 1.0
        boxes = []
        for cx, cy, ew, eh in spec["eyes"]:  # source pixels -> working pixels -> output pixels
            wx, wy = cut.to_work(cx, cy) if cut else (cx, cy)
            boxes.append([(wx - off[0]) * s, (wy - off[1]) * s, ew * k * s, eh * k * s])
        found = manual_eyes(rgba, boxes)
    else:
        found = find_eyes(rgba, spec.get("eyeParams"))
    if found and found.get("second"):
        report.setdefault("warnings", []).append(
            "a second pair of eyes was found: group shot? generate each member alone")
    blink_img, eyes = None, None
    if spec.get("blinkFrom"):
        csrc = resolve_src(ctx, spec["blinkFrom"])
        if not csrc.exists():
            report.setdefault("warnings", []).append(f"blinkFrom not found: {spec['blinkFrom']}")
        else:
            sub = dict(spec, blinkFrom=None, split=False, trim=True)
            crep = {}
            cc = cutout(ctx, name + "_closed", sub, csrc, crep)
            c_rgba, _, _ = finish(ctx, name, cc.rgb, cc.alpha, dict(sub, maxH=None, maxW=None), crep)
            blink_img, eyes = blink_from(rgba, c_rgba, found, report)
    elif found:
        seed = int(hashlib.sha1(name.encode()).hexdigest()[:6], 16)
        blink_img = make_blink(rgba, found, spec.get("blinkColor"), seed=seed)
        eyes = found["eyes"]
    if blink_img is not None and eyes:
        meta["eyes"] = [dict(cx=round(e["cx"], 1), cy=round(e["cy"], 1), w=int(e["w"]), h=int(e["h"])) for e in eyes]
        outs.append((f"{name}_blink", blink_img, None))
        if spec.get("blinkFrom"):
            report["eyes"] = "blinkFrom"
        else:
            report["eyes"] = f"pass {found['pass_']}" if isinstance(found["pass_"], int) else str(found["pass_"])
        report["_eyes"] = [dict(cx=e["cx"], cy=e["cy"], w=e["w"], h=e["h"]) for e in eyes]
    else:
        report["eyes"] = "none"
        if blink is True:
            report.setdefault("warnings", []).append("blink requested but no eyes found: set \"eyes\" or \"blinkFrom\"")
    return rgba, meta


def process(ctx, name, spec):
    """-> list of (outName, rgba, meta|None for helper images), list of report dicts."""
    src = resolve_src(ctx, spec["src"])
    report = dict(name=name, kind=spec["kind"], src=rel(src, ctx.P))
    if not src.exists():
        report["warnings"] = [f"source not found: {rel(src, ctx.P)}"]
        return [], [report]
    cut = cutout(ctx, name, spec, src, report)
    rgb, alpha, instances = cut.rgb, cut.alpha, cut.instances
    base_meta = dict(kind=spec["kind"])
    outs, reports = [], [report]
    if spec.get("parallax"):
        # 2.5D: full-frame subject layer + subject-free plate, both at the same size
        h, w = alpha.shape
        hole = cv2.dilate((alpha > 0.03).astype(np.uint8), disk(max(3, int(0.012 * max(h, w)))))
        sm = 0.25
        small = cv2.resize(rgb.astype(np.uint8), None, fx=sm, fy=sm, interpolation=cv2.INTER_AREA)
        hs = (cv2.resize(hole, small.shape[1::-1], interpolation=cv2.INTER_NEAREST) > 0).astype(np.uint8) * 255
        fill = cv2.inpaint(np.ascontiguousarray(small[..., ::-1]), cv2.dilate(hs, disk(1)), 7,
                           cv2.INPAINT_TELEA)[..., ::-1]
        fill = cv2.resize(fill, (w, h), interpolation=cv2.INTER_CUBIC).astype(np.float32)
        hm = cv2.GaussianBlur(hole.astype(np.float32), (0, 0), 2)[..., None]
        plate = rgb * (1 - hm) + fill * hm
        fg, s, _ = finish(ctx, name, rgb, alpha, spec, report, keep_frame=True, base=cut.scale)
        bg, _, _ = finish(ctx, name, plate, np.ones_like(alpha), spec, {}, scale=s, keep_frame=True)
        outs.append((name, fg, dict(base_meta, w=fg.shape[1], h=fg.shape[0], plate=f"{name}_bg")))
        outs.append((f"{name}_bg", bg[..., :3], dict(kind=spec["kind"], w=bg.shape[1], h=bg.shape[0])))
        return outs, reports
    if spec.get("split"):
        parts = split_parts(alpha, instances, float(spec["minArea"]))
        if not parts:
            report.setdefault("warnings", []).append("split: no parts found")
            return [], reports
        names = list(spec.get("names") or [])
        if names and len(names) != len(parts):
            report.setdefault("warnings", []).append(f"split: {len(parts)} parts but {len(names)} names")
        crops = []
        for p in parts:
            x0, y0, x1, y1 = trim_box(p, int(spec["pad"]))
            crops.append((p, (x0, y0, x1, y1)))
        hmax = max(c[1][3] - c[1][1] for c in crops)
        wmax = max(c[1][2] - c[1][0] for c in crops)
        shared = fit_scale(wmax, hmax, spec["maxW"], spec["maxH"]) if spec["scale"] == "shared" else None
        report["parts"] = len(parts)
        for i, (p, _) in enumerate(crops):
            pname = names[i] if i < len(names) else f"{name}{i}"
            prep = dict(name=pname, kind=spec["kind"], src=report["src"], parent=name)
            rgba, s, off = finish(ctx, pname, rgb, p, spec, prep, scale=shared, base=cut.scale)
            rgba, extra = character_extras(ctx, pname, rgba, dict(spec, eyes=None, blinkFrom=None), prep, s, off, outs)
            outs.append((pname, rgba, dict(base_meta, w=rgba.shape[1], h=rgba.shape[0], sheet=name, idx=i, **extra)))
            reports.append(prep)
        return outs, reports
    rgba, s, off = finish(ctx, name, rgb, alpha, spec, report, base=cut.scale)
    meta = dict(base_meta, w=rgba.shape[1], h=rgba.shape[0])
    if spec.get("inpaintText"):
        clean, rows = remove_text(rgba, spec, report)
        meta.update(plate=f"{name}_bg", textRows=rows)
        outs.append((f"{name}_bg", clean, dict(kind=spec["kind"], w=clean.shape[1], h=clean.shape[0])))
    rgba, extra = character_extras(ctx, name, rgba, spec, report, s, off, outs, cut)
    meta.update(extra)
    if s * cut.scale >= 0.999 and spec["kind"] == "character" and spec["maxH"] and rgba.shape[0] < 0.6 * spec["maxH"]:
        report.setdefault("warnings", []).append(
            f"low resolution: {rgba.shape[0]}px tall; do not draw it taller than that")
    outs.insert(0, (name, rgba, meta))
    return outs, reports


# ───────────────────────── QA sheets ─────────────────────────
def _font(size):
    try:
        return ImageFont.load_default(size=size)
    except TypeError:
        return ImageFont.load_default()


def _checker(w, h, s=12):
    yy, xx = np.mgrid[0:h, 0:w]
    c = (((yy // s) + (xx // s)) % 2).astype(np.uint8)
    return np.dstack([np.where(c, 206, 238)] * 3).astype(np.uint8)


def _tile(rgba, bg, size):
    """Cutout fitted into a size x size tile over a colour (1-D array) or an image (H x W x 3 array)."""
    if np.asarray(bg).ndim == 3:
        T = Image.fromarray(np.asarray(bg, np.uint8)[:size, :size])
    else:
        T = Image.new("RGB", (size, size), tuple(int(v) for v in bg))
    im = Image.fromarray(rgba, "RGBA")
    im.thumbnail((size - 16, size - 16), Image.LANCZOS)
    T.paste(im, ((size - im.width) // 2, (size - im.height) // 2), im)
    return T


def _zoom(rgba, bg, size):
    """4x nearest-neighbour zoom on the softest stretch of the silhouette, over a dark background."""
    a = rgba[..., 3].astype(np.float32) / 255
    band = ((a > 0.04) & (a < 0.96)).astype(np.float32)
    win = max(8, size // 4)
    if band.sum() == 0:
        cy, cx = np.array(a.shape) // 2
    else:
        dens = cv2.boxFilter(band, -1, (win, win))
        cy, cx = np.unravel_index(np.argmax(dens), dens.shape)
    h, w = a.shape
    y0 = int(np.clip(cy - win // 2, 0, max(0, h - win)))
    x0 = int(np.clip(cx - win // 2, 0, max(0, w - win)))
    crop = rgba[y0:y0 + win, x0:x0 + win]
    T = Image.new("RGB", (crop.shape[1], crop.shape[0]), tuple(int(v) for v in bg))
    T.paste(Image.fromarray(crop, "RGBA"), (0, 0), Image.fromarray(crop, "RGBA"))
    return T.resize((size, size), Image.NEAREST)


def qa_sheets(ctx, items, reports):
    if not items:
        return []
    ctx.qa.mkdir(parents=True, exist_ok=True)
    for old in list(ctx.qa.glob("cutouts*.png")) + list(ctx.qa.glob("blink.png")):
        old.unlink()  # the sheets describe the last run only
    pal = (ctx.style or {}).get("palette") or {}
    theme = ((ctx.style or {}).get("layout") or {}).get("theme", "light")
    dark = hexrgb(pal.get("bg"), (14, 14, 18)) if theme == "dark" else np.array([14, 14, 18], np.float32)
    light = hexrgb(pal.get("bg"), (244, 242, 240)) if theme == "light" else np.array([244, 242, 240], np.float32)
    T, pad, lab_h = 240, 8, 34
    f = _font(14)
    byname = {r["name"]: r for r in reports}
    files = []
    chunks = [items[i:i + 10] for i in range(0, len(items), 10)]
    for ci, chunk in enumerate(chunks):
        sheet = Image.new("RGB", (4 * T + 5 * pad, len(chunk) * (T + lab_h) + pad), (30, 30, 34))
        d = ImageDraw.Draw(sheet)
        for r, (name, rgba) in enumerate(chunk):
            y = pad + r * (T + lab_h)
            rep = byname.get(name, {})
            info = f"{name}  {rgba.shape[1]}x{rgba.shape[0]}  {rep.get('kind', '')}  {rep.get('backend', '')}"
            if rep.get("eyes"):
                info += f"  eyes:{rep['eyes']}"
            if rep.get("bleedBefore") is not None:
                info += f"  bleed {rep.get('bleedBefore')}->{rep.get('bleedAfter')}"
            d.text((pad, y), info, font=f, fill=(235, 235, 235))
            warn = "; ".join(rep.get("warnings", []))
            if warn:
                d.text((pad, y + 16), "! " + warn[:150], font=f, fill=(255, 170, 90))
            tiles = [_tile(rgba, dark, T), _tile(rgba, light, T), _tile(rgba, _checker(T, T), T), _zoom(rgba, dark, T)]
            for k, t in enumerate(tiles):
                sheet.paste(t, (pad + k * (T + pad), y + lab_h - 2))
        p = ctx.qa / ("cutouts.png" if len(chunks) == 1 else f"cutouts-{ci + 1}.png")
        sheet.save(p)
        files.append(p)
    return files


def blink_sheet(ctx, pairs):
    """pairs: [(name, open_rgba, blink_rgba, eyes)] -> face crops open | closed at a readable zoom."""
    if not pairs:
        return None
    rows = []
    f = _font(14)
    for name, op, bl, eyes in pairs:
        xs = [e["cx"] for e in eyes]
        ys = [e["cy"] for e in eyes]
        ew = max(e["w"] for e in eyes)
        eh = max(e["h"] for e in eyes)
        x0, x1 = int(max(0, min(xs) - 2.4 * ew)), int(min(op.shape[1], max(xs) + 2.4 * ew))
        y0, y1 = int(max(0, min(ys) - 2.2 * eh)), int(min(op.shape[0], max(ys) + 2.0 * eh))
        z = 220.0 / max(1, (y1 - y0))
        crops = []
        for k, img in enumerate((op, bl)):
            c = Image.new("RGB", (x1 - x0, y1 - y0), (128, 128, 132))
            ci = Image.fromarray(img[y0:y1, x0:x1], "RGBA")
            c.paste(ci, (0, 0), ci)
            c = c.resize((max(1, int((x1 - x0) * z)), 220), Image.LANCZOS)
            if k == 0:
                dd = ImageDraw.Draw(c)
                for e in eyes:
                    ex, ey = (e["cx"] - x0) * z, (e["cy"] - y0) * z
                    dd.ellipse([ex - e["w"] * z / 2 - 2, ey - e["h"] * z / 2 - 2, ex + e["w"] * z / 2 + 2,
                                ey + e["h"] * z / 2 + 2], outline=(0, 220, 255), width=1)
            crops.append(c)
        thumb = Image.new("RGB", (160, 220), (128, 128, 132))
        ti = Image.fromarray(op, "RGBA")
        ti.thumbnail((150, 210))
        thumb.paste(ti, ((160 - ti.width) // 2, (220 - ti.height) // 2), ti)
        rows.append((name, [thumb] + crops))
    W = max(sum(c.width for c in cs) + 8 * (len(cs) + 1) for _, cs in rows)
    sheet = Image.new("RGB", (W, len(rows) * (220 + 30) + 8), (30, 30, 34))
    d = ImageDraw.Draw(sheet)
    for r, (name, cs) in enumerate(rows):
        y = 8 + r * 250
        d.text((8, y), f"{name}: open (eye boxes) | blink", font=f, fill=(235, 235, 235))
        x = 8
        for c in cs:
            sheet.paste(c, (x, y + 22))
            x += c.width + 8
    ctx.qa.mkdir(parents=True, exist_ok=True)
    p = ctx.qa / "blink.png"
    sheet.save(p)
    return p


# ───────────────────────── config & main ─────────────────────────
def load_config(path: Path):
    cfg = json.loads(path.read_text())
    if "assets" in cfg:
        return cfg.get("defaults", {}), cfg.get("kinds", {}), cfg["assets"]
    return {}, {}, {k: v for k, v in cfg.items() if not k.startswith("_")}


def resolve_spec(name, raw, defaults, kinds, frame=(1920, 1080)):
    """Merge: base < kind defaults (caps scaled to the reel frame) < config defaults < config kinds < asset."""
    raw = {"src": raw} if isinstance(raw, str) else dict(raw)
    kind = raw.get("kind") or defaults.get("kind") or ("product" if raw.get("split") else "character")
    if kind not in KIND_DEFAULTS:
        raise SystemExit(f"{name}: unknown kind '{kind}' (one of {', '.join(KINDS)})")
    spec = dict(BASE)
    kd = dict(KIND_DEFAULTS[kind])
    if kd.get("maxH"):
        kd["maxH"] = round(kd["maxH"] * frame[1] / 1080)
    if kd.get("maxW"):
        kd["maxW"] = round(kd["maxW"] * frame[0] / 1920)
    spec.update(kd)
    spec.update({k: v for k, v in defaults.items() if k != "kind"})
    spec.update(kinds.get(kind, {}))
    spec.update(raw)
    spec["kind"] = kind
    unknown = set(spec) - set(BASE) - {"src", "kind"}
    if unknown:
        WARN.append(f"{name}: unknown keys ignored: {', '.join(sorted(unknown))}")
    if "src" not in spec:
        raise SystemExit(f"{name}: missing src")
    return spec


def save_webp(arr, path: Path, spec):
    im = Image.fromarray(arr, "RGBA" if arr.shape[2] == 4 else "RGB")
    if spec["lossless"]:
        im.save(path, "WEBP", lossless=True, quality=100, method=5)
    else:
        im.save(path, "WEBP", quality=int(spec["quality"]), method=5)  # 6 is ~30x slower for ~2% smaller files


def check_env():
    log(f"platform: {platform.system()} {platform.release()}  python {platform.python_version()}")
    if platform.system() == "Darwin":
        log(f"macOS {platform.mac_ver()[0]} (Vision subject lifting needs 14+)")
        log(f"swiftc: {shutil.which('swiftc') or 'missing (xcode-select --install)'}")
        lb = ensure_lift()
        log(f"lift binary: {lb if lb else 'unavailable'}")
    else:
        log("Vision: not available on this OS -> flatbg (OpenCV) or rembg")
    log(f"rembg: {'installed' if rembg_ok() else 'not installed (optional: pip install rembg)'}")


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--project", "-p", type=Path)
    ap.add_argument("--config", type=Path, help="asset config (default P/assets.json)")
    ap.add_argument("--only", help="comma-separated asset names")
    ap.add_argument("--backend", default="auto", choices=["auto", "vision", "flatbg", "rembg"])
    ap.add_argument("--lift-bin", help="prebuilt lift binary (else env LIFT_BIN, else compiled on demand)")
    ap.add_argument("--src", type=Path, help="one-off: source image (no config needed)")
    ap.add_argument("--name", help="one-off: asset name")
    ap.add_argument("--kind", default=None, choices=KINDS)
    ap.add_argument("--split", action="store_true", help="one-off: split a sheet into instances")
    ap.add_argument("--max-h", type=int, help="one-off: max height")
    ap.add_argument("--force", action="store_true", help="ignore the lift mask cache")
    ap.add_argument("--no-qa", action="store_true")
    ap.add_argument("--dry-run", action="store_true", help="print the resolved plan only")
    ap.add_argument("--check", action="store_true", help="report available backends and exit")
    args = ap.parse_args(argv)
    if args.check:
        check_env()
        return 0
    if not args.project:
        ap.error("--project is required")
    P = args.project
    style = None
    sp = P / "style.json"
    if sp.exists():
        try:
            style = json.loads(sp.read_text())
        except json.JSONDecodeError:
            WARN.append("style.json is not valid JSON; palette features off")
    if args.src:
        if not args.name:
            ap.error("--src needs --name")
        src = args.src if args.src.exists() or args.src.is_absolute() or not (P / args.src).exists() else P / args.src
        raw = {"src": str(src.resolve()), "split": args.split}
        if args.kind:
            raw["kind"] = args.kind
        if args.max_h:
            raw["maxH"] = args.max_h
        defaults, kinds, assets = {}, {}, {args.name: raw}
    else:
        cp = args.config or (P / "assets.json")
        if not cp.exists():
            ap.error(f"no asset config at {cp} (or use --src/--name)")
        defaults, kinds, assets = load_config(cp)
    only = set(args.only.split(",")) if args.only else None
    frame = (1920, 1080)
    rc = P / "reel.config.json"
    if rc.exists():
        try:
            fw, fh = json.loads(rc.read_text()).get("size", frame)
            frame = (int(fw), int(fh))
        except (ValueError, TypeError, json.JSONDecodeError):
            WARN.append("reel.config.json: unreadable size; caps assume 1920x1080")
    specs = {n: resolve_spec(n, r, defaults, kinds, frame) for n, r in assets.items() if not only or n in only}
    if args.dry_run:  # resolved spec: src, kind and every key that differs from the base defaults
        for n, sp in specs.items():
            log(n, json.dumps({k: v for k, v in sp.items() if k in ("src", "kind") or BASE.get(k, object()) != v}))
        return 0
    ctx = Ctx(P, args, style)
    ctx.assets.mkdir(parents=True, exist_ok=True)
    # provenance lives in build/: every file in assets/ ships inside the single-file HTML
    meta_p, prov_p = ctx.assets / "meta.json", P / "build" / "provenance.json"
    meta = json.loads(meta_p.read_text()) if meta_p.exists() else {}
    prov = json.loads(prov_p.read_text()) if prov_p.exists() else {}
    all_reports, qa_items, blink_items = [], [], []
    for name, spec in specs.items():
        log(f"- {name} ({spec['kind']}) <- {spec['src']}")
        t0 = time.perf_counter()
        try:
            outs, reports = process(ctx, name, spec)
        except Exception as e:  # keep going; report the failure
            import traceback
            traceback.print_exc()
            reports, outs = [dict(name=name, kind=spec["kind"], warnings=[f"failed: {type(e).__name__}: {e}"])], []
        reports[0]["seconds"] = round(time.perf_counter() - t0, 2)
        all_reports += reports
        produced = {o[0] for o in outs}
        # drop outputs an earlier run made for this asset that this run no longer makes (e.g. fewer sheet parts)
        for child, info in list(prov.items()):
            if info.get("parent") == name and child not in produced:
                for suffix in ("", "_blink", "_bg"):
                    (ctx.assets / f"{child}{suffix}.webp").unlink(missing_ok=True)
                meta.pop(child, None)
                prov.pop(child, None)
        src_rel = rel(resolve_src(ctx, spec["src"]), P)
        src_sha = sha1_file(resolve_src(ctx, spec["src"]))[:12] if resolve_src(ctx, spec["src"]).exists() else None
        for oname, arr, m in outs:
            save_webp(arr, ctx.assets / f"{oname}.webp", spec)
            if m is None:  # helper image (blink variant) of the previous entry
                continue
            if "eyes" not in m:
                (ctx.assets / f"{oname}_blink.webp").unlink(missing_ok=True)
            meta[oname] = m
            prov[oname] = dict(src=src_rel, sha1=src_sha, kind=spec["kind"], parent=name,
                               **({"prov": spec["prov"]} if spec.get("prov") else {}))
            if arr.shape[2] == 4 and not oname.endswith("_bg"):
                qa_items.append((oname, arr))
            rep = next((r for r in reports if r["name"] == oname), None) or reports[0]
            if m.get("eyes"):
                bl = next(a for n2, a, _ in outs if n2 == f"{oname}_blink")
                blink_items.append((oname, arr, bl, rep.get("_eyes") or m["eyes"]))
            log(f"  {oname}: {m['w']}x{m['h']}" + ("  eyes" if m.get("eyes") else "") +
                (f"  plate={m['plate']}" if m.get("plate") else ""))
        for r in reports:
            for wmsg in r.get("warnings", []):
                log(f"  ! {r['name']}: {wmsg}")
    meta_p.write_text(json.dumps(meta, indent=1, ensure_ascii=False))
    prov_p.parent.mkdir(parents=True, exist_ok=True)      # a fresh project has no build/ yet (every backend)
    prov_p.write_text(json.dumps(prov, indent=1, ensure_ascii=False))
    if not args.no_qa:
        ctx.qa.mkdir(parents=True, exist_ok=True)
        files = qa_sheets(ctx, qa_items, all_reports)
        bp = blink_sheet(ctx, blink_items)
        clean = [{k: v for k, v in r.items() if not k.startswith("_")} for r in all_reports]
        (ctx.qa / "report.json").write_text(json.dumps(clean, indent=1, ensure_ascii=False))
        for p in files + ([bp] if bp else []):
            log(f"QA: {rel(p, P)}")
    for wmsg in WARN:
        log(f"! {wmsg}")
    failed = sorted({r["name"] for r in all_reports
                     if any(str(w).startswith(("source not found", "failed:")) for w in r.get("warnings", []))})
    if failed:
        log(f"! {len(failed)} asset(s) not produced: {', '.join(failed)}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
