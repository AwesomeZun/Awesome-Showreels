#!/usr/bin/env python3
"""extract_style.py - derive a draft P/style.json (tone & manner spec) from any source material.

Method (references/tone-and-manner.md): inventory -> measure -> interpret -> spec -> board.
Every decision in the draft carries a rationale that cites evidence ids (E1, E2, ...) from the extraction log,
and fields that need human/Claude judgment are listed under "review".

Usage:
  python3 extract_style.py --source <files|dirs|urls...> --project P [--board] [options]
  python3 extract_style.py --project P --board-only       re-render P/build/style-board.png from P/style.json
  python3 extract_style.py --validate P/style.json        check a style.json against templates/style.schema.json
  python3 extract_style.py --tables                       print the interpretation tables (markdown)

Options:
  --board               also render P/build/style-board.png (+ style-board.html)
  --offline             no network: URL sources are skipped, remote page resources are blocked
  --no-snapshot         do not run source_snapshot.mjs (no Chromium); HTML/CSS/markdown are still parsed
  --purpose P           hint: launch|pitch|paper|docs|tool|brand|portfolio|demo|explainer
  --audience A          hint: developers|researchers|consumers|investors|designers|general
  --lang L              hint: primary language, BCP-47 (ko-KR, en-US, ja-JP ...)
  --theme light|dark    hint: force the layout theme
  --narration on|off    hint: the user's narration preference
  --title T             title shown on the board (default: detected from the material)
  --force               replace a reviewed (meta.draft=false) P/style.json; old copy -> P/build/style.prev.json
  --max-images N        cap on analysed images (default 48)
  --quiet               less console output

Outputs (P = project folder):
  P/style.json                    draft spec (meta.draft = true). A reviewed spec is never overwritten without
                                  --force; the new draft then goes to P/build/style.draft.json
  P/build/style-extract.json      sources, evidence, measurements, axes, inventory, decisions, review
  P/build/style-extract.md        the same as a readable extraction log
  P/build/snapshots/              page renders (web/markdown/html), PDF pages, slide renders
  P/build/style-board.html/.png   one-page style board (with --board / --board-only)

Requires numpy + Pillow. Optional: PyMuPDF (PDF), fontTools (font files), jsonschema (validation), node +
playwright-core + Chromium (snapshots, board), soffice (pptx/odp -> PDF; Keynote: export to PDF, the .key preview and
images are read directly), pdftoppm/pdffonts/pdftotext (PDF fallback), fc-list (installed fonts; fontTools scan
fallback). Secrets (.env*, private keys) are never read; an explicitly passed source that is skipped is warned about.
"""
from __future__ import annotations

import argparse
import hashlib
import html as htmllib
import json
import math
import os
import plistlib
import re
import shutil
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ET
import zipfile
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from html.parser import HTMLParser
from io import BytesIO
from pathlib import Path
from urllib.parse import unquote, urlparse, parse_qs

import numpy as np

try:
    from PIL import Image, ImageDraw, ImageFont
    Image.MAX_IMAGE_PIXELS = 200_000_000
except ImportError:  # pragma: no cover
    sys.exit("extract_style.py needs Pillow: pip install pillow")

try:
    import fitz  # PyMuPDF
    try:
        fitz.TOOLS.mupdf_display_errors(False)
        fitz.TOOLS.mupdf_display_warnings(False)
    except Exception:
        pass
except Exception:
    fitz = None

VERSION = "1.0.0"
HERE = Path(__file__).resolve().parent
SKILL = HERE.parent
SCHEMA_PATH = SKILL / "templates" / "style.schema.json"
SNAPSHOT_JS = HERE / "source_snapshot.mjs"
QUIET = False

IMAGE_EXT = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".tif", ".tiff", ".svg", ".avif", ".heic"}
MD_EXT = {".md", ".markdown", ".mdx", ".rst", ".txt", ".adoc"}
HTML_EXT = {".html", ".htm"}
CSS_EXT = {".css", ".scss", ".sass", ".less", ".pcss"}
SLIDE_EXT = {".pptx", ".potx", ".key", ".odp", ".ppt"}
SKIP_DIRS = {"node_modules", ".git", ".hg", ".svn", "dist", "build", "out", "target", "vendor", "venv", ".venv", "env",
             "__pycache__", ".next", ".nuxt", ".cache", "coverage", ".tox", ".mypy_cache", ".pytest_cache", "site-packages",
             ".idea", ".vscode", "Pods", ".gradle", "bower_components", ".turbo", ".parcel-cache", "_scratch"}
SECRET_RE = re.compile(r"(^\.env.*|.*\.(pem|key|p12|pfx|keystore|jks)$|^id_(rsa|dsa|ecdsa|ed25519).*|^\.npmrc$|^\.netrc$|^\.pypirc$|"
                       r".*credential.*|.*secret.*|.*\.kdbx$|^\.htpasswd$)", re.I)


def log(*a):
    if not QUIET:
        print("[extract_style]", *a, file=sys.stderr)


def warn(msg, ctx=None):
    log("warning:", msg)
    if ctx is not None:
        ctx.warnings.append(msg)


def clamp(x, a=0.0, b=1.0):
    return a if x < a else b if x > b else x


def lerp(a, b, t):
    return a + (b - a) * t


def sat(x, k):
    """Saturating map of a non-negative rate to 0..1 (k = rate giving 63%)."""
    return 1.0 - math.exp(-max(0.0, x) / max(k, 1e-9))


def r2(x, n=2):
    return float(round(float(x), n))


def slugify(s, n=40):
    s = re.sub(r"[^a-z0-9]+", "-", str(s).lower()).strip("-")[:n] or "item"
    return s


def short_hash(s, n=6):
    return hashlib.sha1(str(s).encode("utf8")).hexdigest()[:n]


def is_url(s):
    return bool(re.match(r"^https?://", str(s), re.I))


def is_keynote(p: Path):
    """A Keynote deck (.key zip package or bundle folder), not a private key."""
    if p.suffix.lower() != ".key":
        return False
    try:
        if p.is_dir():
            return (p / "Index.zip").exists() or (p / "Index").is_dir() or (p / "index.apxl").exists()
        if zipfile.is_zipfile(str(p)):
            names = zipfile.ZipFile(str(p)).namelist()
            return any(n.startswith(("Index/", "Data/", "Metadata/")) or n in ("index.apxl", "preview.jpg") for n in names[:400])
    except (OSError, zipfile.BadZipFile):
        return False
    return False


def is_secret(p: Path):
    return bool(SECRET_RE.match(p.name)) and not is_keynote(p)


def read_text(p: Path, limit=2_000_000):
    if is_secret(p):
        return ""
    try:
        b = p.read_bytes()[:limit]
    except Exception:
        return ""
    for enc in ("utf-8", "utf-16", "cp949", "latin-1"):
        try:
            return b.decode(enc)
        except Exception:
            continue
    return ""


def fetch_bytes(url, limit=8_000_000, timeout=15):
    """GET a public resource (images referenced by the material). Never sends credentials or cookies."""
    import ssl
    import urllib.request
    ua = "Mozilla/5.0 (motion-showreel extract_style)"
    try:
        try:
            import certifi
            sslctx = ssl.create_default_context(cafile=certifi.where())
        except ImportError:
            sslctx = ssl.create_default_context()
        req = urllib.request.Request(url, headers={"User-Agent": ua})
        with urllib.request.urlopen(req, timeout=timeout, context=sslctx) as r:
            data = r.read(limit + 1)
        return data if len(data) <= limit else None
    except Exception:
        pass
    curl = shutil.which("curl")
    if curl:
        try:
            r = subprocess.run([curl, "-fsSL", "--max-time", str(timeout), "--max-filesize", str(limit), "-A", ua, url],
                               capture_output=True, timeout=timeout + 5)
            if r.returncode == 0 and r.stdout and len(r.stdout) <= limit:
                return r.stdout
        except Exception:
            pass
    return None


class Disp:
    """Formats paths for output files: project-relative, cwd-relative, ~-relative, never a raw home path."""

    def __init__(self, project: Path):
        self.project = project.resolve()
        self.home = Path.home().resolve()
        self.cwd = Path.cwd().resolve()

    def __call__(self, p) -> str:
        if p is None:
            return ""
        if is_url(p):
            return str(p)
        p = Path(p).resolve()
        for base, pre in ((self.project, ""), (self.cwd, "")):
            try:
                return pre + str(p.relative_to(base)).replace(os.sep, "/") or "."
            except ValueError:
                pass
        # outside the project and the current folder: relative to the project when both sit under a shared folder
        # inside home (../../repo/README.md), else ~-relative, else the last two parts; never an absolute path
        try:
            common = Path(os.path.commonpath([str(self.project), str(p)]))
            if common != Path(common.anchor) and (common == self.home or self.home in common.parents):
                return os.path.relpath(p, self.project).replace(os.sep, "/")
        except ValueError:
            pass
        try:
            return "~/" + str(p.relative_to(self.home)).replace(os.sep, "/")
        except ValueError:
            return ".../" + "/".join(p.parts[-2:])


# ═════════════════════════════════════════ colour science ═════════════════════════════════════════
_M_RGB2XYZ = np.array([[0.4124564, 0.3575761, 0.1804375], [0.2126729, 0.7151522, 0.0721750], [0.0193339, 0.1191920, 0.9503041]])
_M_XYZ2RGB = np.linalg.inv(_M_RGB2XYZ)
_WHITE = np.array([0.95047, 1.0, 1.08883])
_D50 = np.array([0.96422, 1.0, 0.82521])
_BRADFORD_50_65 = np.array([[0.9554734527042182, -0.023098536874261423, 0.0632593086610217],
                            [-0.028369706963208136, 1.0099954580058226, 0.021041398966943008],
                            [0.012314001688319899, -0.020507696433477912, 1.3303659366080753]])


def srgb_to_linear(c):
    c = np.asarray(c, dtype=np.float64)
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def linear_to_srgb(c):
    c = np.asarray(c, dtype=np.float64)
    return np.where(c <= 0.0031308, 12.92 * c, 1.055 * np.power(np.clip(c, 0, None), 1 / 2.4) - 0.055)


def _f(t):
    d = 6 / 29
    return np.where(t > d ** 3, np.cbrt(t), t / (3 * d * d) + 4 / 29)


def _finv(t):
    d = 6 / 29
    return np.where(t > d, t ** 3, 3 * d * d * (t - 4 / 29))


def xyz_to_lab(xyz, white=_WHITE):
    f = _f(np.asarray(xyz) / white)
    L = 116 * f[..., 1] - 16
    return np.stack([L, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], -1)


def lab_to_xyz(lab, white=_WHITE):
    lab = np.asarray(lab, dtype=np.float64)
    fy = (lab[..., 0] + 16) / 116
    fx = fy + lab[..., 1] / 500
    fz = fy - lab[..., 2] / 200
    return np.stack([_finv(fx), _finv(fy), _finv(fz)], -1) * white


def rgb_to_lab(rgb):
    """sRGB 0..1 (..., 3) -> CIE Lab D65."""
    return xyz_to_lab(srgb_to_linear(rgb) @ _M_RGB2XYZ.T)


def lab_to_rgb_raw(lab):
    return linear_to_srgb(lab_to_xyz(lab) @ _M_XYZ2RGB.T)


def lab_to_rgb(lab):
    """Lab -> sRGB 0..1 with gamut mapping by chroma reduction (keeps L and hue)."""
    lab = np.asarray(lab, dtype=np.float64)
    rgb = lab_to_rgb_raw(lab)
    if np.all((rgb >= -1e-4) & (rgb <= 1 + 1e-4)):
        return np.clip(rgb, 0, 1)
    lo, hi = 0.0, 1.0
    for _ in range(22):
        mid = (lo + hi) / 2
        t = lab_to_rgb_raw(np.array([lab[0], lab[1] * mid, lab[2] * mid]))
        if np.all((t >= -1e-4) & (t <= 1 + 1e-4)):
            lo = mid
        else:
            hi = mid
    return np.clip(lab_to_rgb_raw(np.array([lab[0], lab[1] * lo, lab[2] * lo])), 0, 1)


def hex_to_rgb(h):
    h = str(h).strip().lstrip("#")
    if len(h) in (3, 4):
        h = "".join(c * 2 for c in h[:3])
    if len(h) not in (6, 8) or not re.fullmatch(r"[0-9a-fA-F]+", h):
        return None
    return np.array([int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)])


def rgb_to_hex(rgb):
    r = np.clip(np.round(np.asarray(rgb, dtype=np.float64) * 255), 0, 255).astype(int)
    return "#%02X%02X%02X" % tuple(r[:3])


def hex_to_lab(h):
    return rgb_to_lab(hex_to_rgb(h))


def lab_to_hex(lab):
    return rgb_to_hex(lab_to_rgb(lab))


def lch_of(lab):
    lab = np.asarray(lab, dtype=np.float64)
    C = float(math.hypot(lab[1], lab[2]))
    h = float(math.degrees(math.atan2(lab[2], lab[1])) % 360)
    return float(lab[0]), C, h


def from_lch(L, C, h):
    return np.array([L, C * math.cos(math.radians(h)), C * math.sin(math.radians(h))])


def rel_lum(rgb):
    lin = srgb_to_linear(rgb)
    return float(0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2])


def contrast(h1, h2):
    a, b = rel_lum(hex_to_rgb(h1)), rel_lum(hex_to_rgb(h2))
    hi, lo = max(a, b), min(a, b)
    return (hi + 0.05) / (lo + 0.05)


def de00(lab1, lab2):
    """CIEDE2000 colour difference (vectorised)."""
    lab1, lab2 = np.asarray(lab1, dtype=np.float64), np.asarray(lab2, dtype=np.float64)
    L1, a1, b1 = lab1[..., 0], lab1[..., 1], lab1[..., 2]
    L2, a2, b2 = lab2[..., 0], lab2[..., 1], lab2[..., 2]
    C1, C2 = np.hypot(a1, b1), np.hypot(a2, b2)
    Cb = (C1 + C2) / 2
    G = 0.5 * (1 - np.sqrt(Cb ** 7 / (Cb ** 7 + 25.0 ** 7)))
    a1p, a2p = (1 + G) * a1, (1 + G) * a2
    C1p, C2p = np.hypot(a1p, b1), np.hypot(a2p, b2)
    h1p = np.degrees(np.arctan2(b1, a1p)) % 360
    h2p = np.degrees(np.arctan2(b2, a2p)) % 360
    dLp, dCp = L2 - L1, C2p - C1p
    dh = h2p - h1p
    dh = np.where(C1p * C2p == 0, 0, np.where(dh > 180, dh - 360, np.where(dh < -180, dh + 360, dh)))
    dHp = 2 * np.sqrt(C1p * C2p) * np.sin(np.radians(dh / 2))
    Lbp, Cbp = (L1 + L2) / 2, (C1p + C2p) / 2
    hs = h1p + h2p
    hbp = np.where(C1p * C2p == 0, hs, np.where(np.abs(h1p - h2p) <= 180, hs / 2, np.where(hs < 360, (hs + 360) / 2, (hs - 360) / 2)))
    T = (1 - 0.17 * np.cos(np.radians(hbp - 30)) + 0.24 * np.cos(np.radians(2 * hbp)) + 0.32 * np.cos(np.radians(3 * hbp + 6))
         - 0.20 * np.cos(np.radians(4 * hbp - 63)))
    dth = 30 * np.exp(-(((hbp - 275) / 25) ** 2))
    Rc = 2 * np.sqrt(Cbp ** 7 / (Cbp ** 7 + 25.0 ** 7))
    Sl = 1 + 0.015 * (Lbp - 50) ** 2 / np.sqrt(20 + (Lbp - 50) ** 2)
    Sc, Sh = 1 + 0.045 * Cbp, 1 + 0.015 * Cbp * T
    Rt = -np.sin(np.radians(2 * dth)) * Rc
    return np.sqrt((dLp / Sl) ** 2 + (dCp / Sc) ** 2 + (dHp / Sh) ** 2 + Rt * (dCp / Sc) * (dHp / Sh))


def dE(h1, h2):
    return float(de00(hex_to_lab(h1), hex_to_lab(h2)))


def hue_dist(h1, h2):
    d = abs(h1 - h2) % 360
    return min(d, 360 - d)


def ensure_contrast(fg, bg, target):
    """Move fg's L* (hue kept, chroma gamut-mapped) until contrast(fg, bg) >= target. Returns (hex, changed)."""
    if contrast(fg, bg) >= target:
        return fg, False
    lab = hex_to_lab(fg)
    darker = rel_lum(hex_to_rgb(bg)) > 0.18
    lo, hi = (0.0, float(lab[0])) if darker else (float(lab[0]), 100.0)
    best = None
    for _ in range(30):
        mid = (lo + hi) / 2
        cand = lab_to_hex(np.array([mid, lab[1], lab[2]]))
        if contrast(cand, bg) >= target:
            best = cand
            if darker:
                lo = mid
            else:
                hi = mid
        else:
            if darker:
                hi = mid
            else:
                lo = mid
    if best is None:
        best = "#000000" if darker else "#FFFFFF"
    return best, True


def mix(h1, h2, t):
    return lab_to_hex(hex_to_lab(h1) * (1 - t) + hex_to_lab(h2) * t)


def tone(h, L=None, C=None, hue=None, dL=0.0, dC=0.0, cscale=1.0):
    L0, C0, H0 = lch_of(hex_to_lab(h))
    return lab_to_hex(from_lch(clamp((L if L is not None else L0) + dL, 0, 100), max(0.0, ((C if C is not None else C0) + dC) * cscale),
                               hue if hue is not None else H0))


_CVD = {
    "protan": np.array([[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]]),
    "deutan": np.array([[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.011820, 0.042940, 0.968881]]),
    "tritan": np.array([[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.303900]]),
}


def cvd(h, kind):
    lin = srgb_to_linear(hex_to_rgb(h))
    return rgb_to_hex(np.clip(linear_to_srgb(np.clip(_CVD[kind] @ lin, 0, 1)), 0, 1))


_NAMED = """aliceblue f0f8ff antiquewhite faebd7 aqua 00ffff aquamarine 7fffd4 azure f0ffff beige f5f5dc bisque ffe4c4 black 000000
blanchedalmond ffebcd blue 0000ff blueviolet 8a2be2 brown a52a2a burlywood deb887 cadetblue 5f9ea0 chartreuse 7fff00 chocolate d2691e
coral ff7f50 cornflowerblue 6495ed cornsilk fff8dc crimson dc143c cyan 00ffff darkblue 00008b darkcyan 008b8b darkgoldenrod b8860b
darkgray a9a9a9 darkgreen 006400 darkgrey a9a9a9 darkkhaki bdb76b darkmagenta 8b008b darkolivegreen 556b2f darkorange ff8c00
darkorchid 9932cc darkred 8b0000 darksalmon e9967a darkseagreen 8fbc8f darkslateblue 483d8b darkslategray 2f4f4f darkslategrey 2f4f4f
darkturquoise 00ced1 darkviolet 9400d3 deeppink ff1493 deepskyblue 00bfff dimgray 696969 dimgrey 696969 dodgerblue 1e90ff
firebrick b22222 floralwhite fffaf0 forestgreen 228b22 fuchsia ff00ff gainsboro dcdcdc ghostwhite f8f8ff gold ffd700 goldenrod daa520
gray 808080 green 008000 greenyellow adff2f grey 808080 honeydew f0fff0 hotpink ff69b4 indianred cd5c5c indigo 4b0082 ivory fffff0
khaki f0e68c lavender e6e6fa lavenderblush fff0f5 lawngreen 7cfc00 lemonchiffon fffacd lightblue add8e6 lightcoral f08080
lightcyan e0ffff lightgoldenrodyellow fafad2 lightgray d3d3d3 lightgreen 90ee90 lightgrey d3d3d3 lightpink ffb6c1 lightsalmon ffa07a
lightseagreen 20b2aa lightskyblue 87cefa lightslategray 778899 lightslategrey 778899 lightsteelblue b0c4de lightyellow ffffe0 lime 00ff00
limegreen 32cd32 linen faf0e6 magenta ff00ff maroon 800000 mediumaquamarine 66cdaa mediumblue 0000cd mediumorchid ba55d3
mediumpurple 9370db mediumseagreen 3cb371 mediumslateblue 7b68ee mediumspringgreen 00fa9a mediumturquoise 48d1cc
mediumvioletred c71585 midnightblue 191970 mintcream f5fffa mistyrose ffe4e1 moccasin ffe4b5 navajowhite ffdead navy 000080
oldlace fdf5e6 olive 808000 olivedrab 6b8e23 orange ffa500 orangered ff4500 orchid da70d6 palegoldenrod eee8aa palegreen 98fb98
paleturquoise afeeee palevioletred db7093 papayawhip ffefd5 peachpuff ffdab9 peru cd853f pink ffc0cb plum dda0dd powderblue b0e0e6
purple 800080 rebeccapurple 663399 red ff0000 rosybrown bc8f8f royalblue 4169e1 saddlebrown 8b4513 salmon fa8072 sandybrown f4a460
seagreen 2e8b57 seashell fff5ee sienna a0522d silver c0c0c0 skyblue 87ceeb slateblue 6a5acd slategray 708090 slategrey 708090
snow fffafa springgreen 00ff7f steelblue 4682b4 tan d2b48c teal 008080 thistle d8bfd8 tomato ff6347 turquoise 40e0d0 violet ee82ee
wheat f5deb3 white ffffff whitesmoke f5f5f5 yellow ffff00 yellowgreen 9acd32"""
NAMED_COLORS = dict(zip(_NAMED.split()[0::2], ("#" + v.upper() for v in _NAMED.split()[1::2])))
SHIELDS_COLORS = {"brightgreen": "#44CC11", "green": "#97CA00", "yellow": "#DFB317", "yellowgreen": "#A4A61D", "orange": "#FE7D37",
                  "red": "#E05D44", "blue": "#007EC6", "grey": "#555555", "gray": "#555555", "lightgrey": "#9F9F9F",
                  "lightgray": "#9F9F9F", "success": "#44CC11", "important": "#FE7D37", "critical": "#E05D44",
                  "informational": "#007EC6", "inactive": "#9F9F9F", "blueviolet": "#8A2BE2"}


def _num(s, pct_scale=1.0):
    s = s.strip()
    if s.endswith("%"):
        return float(s[:-1]) / 100 * pct_scale
    if s.endswith("deg"):
        return float(s[:-3])
    if s.endswith("turn"):
        return float(s[:-4]) * 360
    if s.endswith("rad"):
        return math.degrees(float(s[:-3]))
    return float(s)


def parse_css_color(v):
    """CSS colour string -> (rgb 0..1 ndarray, alpha) or None. hex, rgb(a), hsl(a), hwb, named, oklch, oklab, lab, lch,
    bare 'r, g, b' / 'r g b' channel tokens (Bootstrap/Tailwind). Never raises."""
    try:
        if v is None or len(str(v)) > 120 or "url(" in str(v):
            return None
        return _parse_css_color(v)
    except Exception:
        return None


def _parse_css_color(v):
    if v is None:
        return None
    s = str(v).strip().lower().rstrip(";").replace("!important", "").strip()
    if not s:
        return None
    if s in NAMED_COLORS:
        return hex_to_rgb(NAMED_COLORS[s]), 1.0
    if s == "transparent":
        return np.zeros(3), 0.0
    m = re.fullmatch(r"#([0-9a-f]{3,8})", s)
    if m:
        h = m.group(1)
        if len(h) not in (3, 4, 6, 8):
            return None
        a = 1.0
        if len(h) == 4:
            a = int(h[3] * 2, 16) / 255
        if len(h) == 8:
            a = int(h[6:8], 16) / 255
        return hex_to_rgb(h[:6] if len(h) >= 6 else h[:3]), a
    m = re.fullmatch(r"0x([0-9a-f]{6})", s)
    if m:
        return hex_to_rgb(m.group(1)), 1.0
    m = re.fullmatch(r"(\d{1,3})\s*[, ]\s*(\d{1,3})\s*[, ]\s*(\d{1,3})", s)
    if m:
        vals = [int(x) for x in m.groups()]
        if all(0 <= x <= 255 for x in vals):
            return np.array(vals) / 255, 1.0
    m = re.fullmatch(r"([a-z]+)\((.*)\)", s)
    if not m:
        return None
    fn, args = m.group(1), m.group(2)
    if "var(" in args or "calc(" in args:
        return None
    parts = re.split(r"\s*/\s*", args.replace(",", " ").strip())
    comps = parts[0].split()
    alpha = 1.0
    if len(parts) > 1:
        alpha = _num(parts[1])
    elif len(comps) == 4:
        alpha = _num(comps[3])
        comps = comps[:3]
    if len(comps) != 3:
        return None
    try:
        if fn in ("rgb", "rgba"):
            rgb = np.array([_num(c, 255) / 255 if c.endswith("%") else float(c) / 255 for c in comps])
        elif fn in ("hsl", "hsla"):
            hh, ss, ll = _num(comps[0]) % 360, _num(comps[1]), _num(comps[2])
            ss = ss if comps[1].endswith("%") else ss / 100
            ll = ll if comps[2].endswith("%") else ll / 100
            c = (1 - abs(2 * ll - 1)) * ss
            x = c * (1 - abs((hh / 60) % 2 - 1))
            mm = ll - c / 2
            r, g, b = [(c, x, 0), (x, c, 0), (0, c, x), (0, x, c), (x, 0, c), (c, 0, x)][int(hh // 60) % 6]
            rgb = np.array([r + mm, g + mm, b + mm])
        elif fn == "hwb":
            hh, w, bl = _num(comps[0]) % 360, _num(comps[1]), _num(comps[2])
            res = parse_css_color(f"hsl({hh} 100% 50%)")[0]
            rgb = res * (1 - w - bl) + w
        elif fn in ("oklch", "oklab"):
            L = _num(comps[0])
            if fn == "oklch":
                C = _num(comps[1], 0.4)
                H = _num(comps[2]) if comps[2] != "none" else 0
                a, b = C * math.cos(math.radians(H)), C * math.sin(math.radians(H))
            else:
                a, b = _num(comps[1], 0.4), _num(comps[2], 0.4)
            lms = np.array([[1, 0.3963377774, 0.2158037573], [1, -0.1055613458, -0.0638541728], [1, -0.0894841775, -1.2914855480]]) @ np.array([L, a, b])
            lin = np.array([[4.0767416621, -3.3077115913, 0.2309699292], [-1.2684380046, 2.6097574011, -0.3413193965],
                            [-0.0041960863, -0.7034186147, 1.7076147010]]) @ (lms ** 3)
            rgb = np.clip(linear_to_srgb(np.clip(lin, 0, 1)), 0, 1)
        elif fn in ("lab", "lch"):
            L = _num(comps[0], 100)
            if fn == "lch":
                C, H = _num(comps[1], 150), _num(comps[2])
                a, b = C * math.cos(math.radians(H)), C * math.sin(math.radians(H))
            else:
                a, b = _num(comps[1], 125), _num(comps[2], 125)
            xyz50 = lab_to_xyz(np.array([L, a, b]), _D50)
            lin = _M_XYZ2RGB @ (_BRADFORD_50_65 @ xyz50)
            rgb = np.clip(linear_to_srgb(np.clip(lin, 0, 1)), 0, 1)
        else:
            return None
    except (ValueError, TypeError, IndexError):
        return None
    return np.clip(rgb, 0, 1), float(clamp(alpha))


def css_hex(v):
    r = parse_css_color(v)
    if r is None or r[1] < 0.5:
        return None
    return rgb_to_hex(r[0])


# ═════════════════════════════════════════ image analysis ═════════════════════════════════════════
def kmeans_weighted(X, w, k, iters=30, seed=7):
    n = len(X)
    if n <= k:
        return X.copy(), w.copy(), np.arange(n)
    rng = np.random.default_rng(seed)
    centers = [X[int(np.argmax(w))]]
    d2 = ((X - centers[0]) ** 2).sum(1)
    for _ in range(1, k):
        p = d2 * w
        s = p.sum()
        if s <= 1e-12:
            break
        i = int(rng.choice(n, p=p / s))
        centers.append(X[i])
        d2 = np.minimum(d2, ((X - X[i]) ** 2).sum(1))
    C = np.array(centers)
    lab = np.zeros(n, dtype=int)
    for _ in range(iters):
        D = ((X[:, None, :] - C[None]) ** 2).sum(2)
        lab = D.argmin(1)
        newC = C.copy()
        for j in range(len(C)):
            mk = lab == j
            if mk.any():
                newC[j] = np.average(X[mk], axis=0, weights=w[mk])
        if np.allclose(newC, C, atol=1e-3):
            C = newC
            break
        C = newC
    D = ((X[:, None, :] - C[None]) ** 2).sum(2)
    lab = D.argmin(1)
    W = np.array([w[lab == j].sum() for j in range(len(C))])
    return C, W, lab


def load_image(src, name=""):
    """Path or bytes -> PIL RGBA (SVG rasterised with ImageMagick when present) or None."""
    try:
        if isinstance(src, (bytes, bytearray)):
            data = bytes(src)
        else:
            p = Path(src)
            if is_secret(p) or p.stat().st_size > 60_000_000:
                return None
            data = p.read_bytes()
            name = name or p.name
        if name.lower().endswith(".svg") or data[:200].lstrip().startswith((b"<svg", b"<?xml")):
            return rasterize_svg(data)
        im = Image.open(BytesIO(data))
        try:
            im.seek(0)
        except Exception:
            pass
        im.load()
        exif = {}
        try:
            ex = im.getexif()
            exif = {k: ex.get(k) for k in (271, 272) if ex.get(k)}
        except Exception:
            pass
        out = im.convert("RGBA")
        out.info["exif_camera"] = bool(exif)
        return out
    except Exception:
        return None


def rasterize_svg(data: bytes):
    magick = shutil.which("magick") or shutil.which("convert")
    if magick:
        try:
            with tempfile.TemporaryDirectory() as td:
                sp, pp = Path(td) / "in.svg", Path(td) / "out.png"
                sp.write_bytes(data)
                subprocess.run([magick, "-background", "none", "-density", "96", str(sp), "-resize", "512x512>", str(pp)],
                               capture_output=True, timeout=30)
                if pp.exists():
                    return Image.open(pp).convert("RGBA")
        except Exception:
            pass
    # fallback: paint swatches of the fill/stroke colours found in the markup, sized by occurrence
    cols = Counter()
    for m in re.finditer(rb'(?:fill|stroke|stop-color|color)\s*[=:]\s*["\']?\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]*\)|[a-zA-Z]+)', data):
        hx = css_hex(m.group(1).decode("latin-1"))
        if hx:
            cols[hx] += 1
    if not cols:
        return None
    im = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    tot, x = sum(cols.values()), 0
    for hx, n in cols.most_common(12):
        wpx = max(4, int(256 * n / tot))
        d.rectangle([x, 64, x + wpx, 192], fill=tuple(int(c * 255) for c in hex_to_rgb(hx)) + (255,))
        x += wpx
    return im


NAME_HINTS = [
    ("mascot", ("mascot", "character", "chara", "bunny", "rabbit", "kitty", "cat", "dog", "bear", "fox", "robot", "bot", "avatar",
                "sticker", "pose", "plush", "doll", "kawaii", "creature", "monster", "pet", "buddy", "critter")),
    ("logo", ("logo", "wordmark", "brandmark", "emblem", "icon", "favicon", "symbol", "monogram", "brand", "mark", "logotype", "apple-touch")),
    ("banner", ("banner", "hero", "cover", "header", "social", "og", "ogimage", "splash", "keyvisual", "poster", "card")),
    ("screenshot", ("screen", "screenshot", "screenshots", "demo", "preview", "ui", "app", "capture", "shot", "dashboard", "mockup", "gif")),
    ("figure", ("fig", "figure", "chart", "plot", "graph", "diagram", "architecture", "pipeline", "result", "results", "benchmark")),
    ("photo", ("photo", "img", "dsc", "pexels", "unsplash", "portrait", "team", "photography")),
]


def name_hint(name):
    toks = [t for t in re.split(r"[^a-z0-9]+", Path(name).stem.lower()) if t]
    for cls, keys in NAME_HINTS:
        for t in toks:
            for k in keys:
                if t == k or (len(k) >= 3 and t.startswith(k) and (len(t) - len(k) <= 3 or t[len(k):].isdigit())):
                    return cls
    return None


def analyze_image(im, name="", hint=None, k=9):
    """Palette clusters (Lab k-means weighted by area) + image class + stats."""
    w0, h0 = im.size
    th = im.copy()
    th.thumbnail((176, 176), Image.Resampling.BOX)
    a = np.asarray(th).astype(np.float64)
    H, W = a.shape[:2]
    alpha = a[..., 3] / 255.0
    rgb = a[..., :3] / 255.0
    opaque = alpha > 0.5
    alpha_frac = 1.0 - float(opaque.mean())
    bw = max(1, int(round(min(H, W) * 0.04)))
    border = np.zeros((H, W), bool)
    border[:bw, :] = border[-bw:, :] = True
    border[:, :bw] = border[:, -bw:] = True
    border_alpha = float(alpha[border].mean())
    cutout = alpha_frac > 0.06 and border_alpha < 0.35
    if opaque.sum() < 16:
        return None
    lab = rgb_to_lab(rgb[opaque])
    q = np.round(lab / 2.0).astype(np.int32)
    keys, inv, cnt = np.unique(q, axis=0, return_inverse=True, return_counts=True)
    inv = inv.reshape(-1)
    sums = np.zeros((len(keys), 3))
    np.add.at(sums, inv, lab)
    centers_bins = sums / cnt[:, None]
    C, Wt, lab_of_bin = kmeans_weighted(centers_bins, cnt.astype(np.float64), min(k, len(keys)))
    pix_cluster = lab_of_bin[inv]
    # merge near-duplicate clusters
    clusters = [{"lab": C[j], "n": float(Wt[j]), "ids": [j]} for j in range(len(C)) if Wt[j] > 0]
    merged = True
    while merged and len(clusters) > 1:
        merged = False
        best = None
        for i in range(len(clusters)):
            for j in range(i + 1, len(clusters)):
                d = float(de00(clusters[i]["lab"], clusters[j]["lab"]))
                if d < 6.5 and (best is None or d < best[0]):
                    best = (d, i, j)
        if best:
            _, i, j = best
            ci, cj = clusters[i], clusters[j]
            tot = ci["n"] + cj["n"]
            ci["lab"] = (ci["lab"] * ci["n"] + cj["lab"] * cj["n"]) / tot
            ci["n"] = tot
            ci["ids"] += cj["ids"]
            clusters.pop(j)
            merged = True
    total = float(opaque.sum())
    border_opaque = border[opaque]
    nb = max(1.0, float(border_opaque.sum()))
    out = []
    for c in clusters:
        mk = np.isin(pix_cluster, c["ids"])
        share = float(mk.sum()) / total
        bshare = float((mk & border_opaque).sum()) / nb if not cutout else 0.0
        L, Cc, hh = lch_of(c["lab"])
        # representative colour: the most frequent bin of the cluster (avoids muddy averages of gradients)
        bins = np.where(np.isin(lab_of_bin, c["ids"]))[0]
        rep = centers_bins[bins[np.argmax(cnt[bins])]] if len(bins) else c["lab"]
        if float(de00(rep, c["lab"])) > 10:
            rep = c["lab"]
        out.append({"hex": lab_to_hex(rep), "lab": [r2(x) for x in rep], "share": share, "border": bshare,
                    "L": r2(L, 1), "C": r2(Cc, 1), "h": r2(hh, 1)})
    out.sort(key=lambda c: -c["share"])
    # texture statistics
    q3 = np.round(rgb * 31).astype(int)
    eq = (np.abs(np.diff(q3, axis=1)).sum(-1) <= 1) & opaque[:, 1:] & opaque[:, :-1]
    flat = float(eq.sum()) / max(1.0, float((opaque[:, 1:] & opaque[:, :-1]).sum()))
    uniq = len(keys) / max(1.0, total)
    labs = lab
    chroma = np.hypot(labs[:, 1], labs[:, 2])
    stats = {"meanL": r2(labs[:, 0].mean(), 1), "meanC": r2(chroma.mean(), 1), "p90C": r2(np.percentile(chroma, 90), 1),
             "lightShare": r2((labs[:, 0] > 70).mean(), 3), "darkShare": r2((labs[:, 0] < 30).mean(), 3)}
    cls = hint or name_hint(name)
    sig = [c for c in out if c["share"] > 0.02]
    if cls is None:
        if cutout:
            cls = "logo" if (len(sig) <= 5 and flat > 0.55) else "cutout"
        elif im.info.get("exif_camera"):
            cls = "photo"
        elif flat < 0.35 and uniq > 0.18:
            cls = "photo"
        elif out and out[0]["L"] > 93 and out[0]["C"] < 6 and len(sig) <= 7 and flat > 0.6:
            cls = "figure"
        elif min(w0, h0) >= 300:
            cls = "screenshot"
        else:
            cls = "image"
    return {"w": w0, "h": h0, "alpha": r2(alpha_frac, 3), "cutout": cutout, "flat": r2(flat, 3), "uniq": r2(uniq, 3),
            "cls": cls, "clusters": out[:10], "stats": stats}


# role weights per image class: w = evidence weight, then how strongly clusters can play bg / ink / accent
CLASS_WEIGHTS = {
    "logo": dict(w=3.0, bg=0.0, ink=0.35, accent=1.0),
    "mascot": dict(w=2.4, bg=0.0, ink=0.25, accent=0.95),
    "cutout": dict(w=2.2, bg=0.0, ink=0.25, accent=0.9),
    "banner": dict(w=2.0, bg=0.75, ink=0.4, accent=0.85),
    "screenshot": dict(w=1.6, bg=1.0, ink=0.75, accent=0.6),
    "render": dict(w=1.9, bg=1.0, ink=0.85, accent=0.65),
    "figure": dict(w=1.2, bg=0.35, ink=0.4, accent=0.8),
    "photo": dict(w=0.6, bg=0.2, ink=0.1, accent=0.35),
    "image": dict(w=1.0, bg=0.5, ink=0.4, accent=0.6),
}


# ═════════════════════════════════════════ evidence model ═════════════════════════════════════════
@dataclass
class ColorCand:
    hex: str
    weight: float
    roles: dict
    eid: str
    origin: str  # token | computed | theme | meta | image | figure | badge | text | terminal | render
    name: str = ""
    scheme: str | None = None  # light | dark | None (both)
    exact: bool = False
    src: str = ""


@dataclass
class FontCand:
    family: str
    role: str  # display | body | mono | serif | cjk | heading | code
    weight: float
    eid: str
    origin: str
    file: str | None = None
    css_weight: int | None = None


@dataclass
class TextDoc:
    src: str
    kind: str
    text: str
    sections: list = field(default_factory=list)
    headings: list = field(default_factory=list)
    code_blocks: list = field(default_factory=list)
    emphasis: list = field(default_factory=list)
    title: str = ""
    links: list = field(default_factory=list)
    tables: int = 0
    weight: float = 1.0
    notes: str = ""


# ═════════════════════════════════════════ lexicons ═════════════════════════════════════════
def _rx(words, ko=()):
    en = r"\b(?:" + "|".join(words) + r")\b" if words else None
    parts = [p for p in (en, "|".join(ko) if ko else None) if p]
    return re.compile("|".join(parts), re.I)


LEX = {
    "hedge": _rx(["may", "might", "could", "possibly", "perhaps", "likely", "unlikely", "suggests?", "suggested", "appears? to",
                  "seems?", "approximately", "roughly", "preliminary", "limitations?", "hypothesi[sz]e", "potentially", "tends? to",
                  "indicates?", "estimated", "uncertain(?:ty)?", "not necessarily", "to our knowledge", "in principle", "caution"],
                 ["수 있", "가능성", "추정", "것으로 보", "것 같", "대략", "한계", "잠정", "예비", "시사", "경향", "かもしれ", "可能性", "と考えられ"]),
    "citation": re.compile(r"\[\d+(?:\s*[,–-]\s*\d+)*\]|\bet al\.|\bdoi:\s*10\.|\barXiv:\s*\d|\(\s*[A-Z][A-Za-z-]+(?: et al\.)?,? (?:19|20)\d{2}\s*\)|"
                           r"\b(?:Proceedings|ICLR|NeurIPS|ICML|CVPR|ACL|EMNLP|Nature|Science)\b"),
    "marketing": _rx(["best", "fastest", "blazing(?:ly)?", "lightning", "magic(?:al)?", "delight(?:ful)?", "beautiful", "effortless(?:ly)?",
                      "seamless(?:ly)?", "powerful", "revolutionary", "amazing", "awesome", "incredible", "stunning", "ultimate",
                      "game[- ]changing", "next[- ]gen", "supercharge[ds]?", "boost", "instantly", "zero[- ]config", "world[- ]class",
                      "cutting[- ]edge", "love", "loved", "super", "easy", "simple", "fun", "joy", "smile[s]?", "wow"],
                     ["최고", "가장", "놀라운", "완벽", "간편", "쉽게", "빠르게", "혁신", "새로운", "강력", "즐거", "最高", "簡単", "最新"]),
    "playful": _rx(["fun", "cute", "play(?:ful)?", "friendly", "happy", "smiles?", "yay", "woo+hoo", "hooray", "adorable", "cozy", "cosy",
                    "sparkl\\w*", "squishy", "buddy", "pal", "kawaii", "oops", "boop", "bounc\\w*", "cheer\\w*", "hug", "giggle", "tiny",
                    "little", "sweet", "yummy", "garden", "rainbow\\w*", "magic"],
                   ["귀여", "재미", "즐거", "신나", "깜찍", "ㅋㅋ", "ㅎㅎ", "^^", "かわい", "楽し"]),
    "luxe": _rx(["premium", "luxury", "luxurious", "elegan(?:t|ce)", "refined", "craft(?:ed|smanship)", "artisan(?:al)?", "timeless",
                 "exquisite", "bespoke", "couture", "signature", "iconic", "heritage", "atelier", "curated", "sophisticated"],
                ["럭셔리", "프리미엄", "고급", "우아", "장인", "세련", "上質", "高級"]),
    "beauty": _rx(["cosmetics?", "beauty", "skin ?care", "serums?", "make-?up", "fragrances?", "perfumes?", "lipsticks?", "toners?",
                   "moisturi[sz]ers?", "essences?", "ampoules?", "k-beauty", "complexion", "glow(?:y|ing)?"],
                  ["화장품", "뷰티", "스킨케어", "세럼", "메이크업", "향수", "립스틱", "토너", "앰플", "에센스", "피부", "코스메틱",
                   "化粧品", "コスメ", "美容", "スキンケア", "护肤"]),
    "warm": _rx(["community", "love", "care", "family", "together", "friendly", "welcome", "warm", "cozy", "home", "heart", "kind",
                 "human", "people", "friends?", "gentle", "hug"], ["따뜻", "함께", "마음", "가족", "사랑", "친구", "温か", "家族"]),
    "tech": _rx(["api", "sdk", "cli", "gpu", "cpu", "cuda", "kernel", "latency", "throughput", "benchmarks?", "model", "inference",
                 "dataset", "pipeline", "deploy\\w*", "docker", "kubernetes", "k8s", "server", "client", "endpoint", "json", "yaml",
                 "toml", "http", "https", "async", "compile[rd]?", "runtime", "binary", "config\\w*", "plugin", "terminal", "shell",
                 "repo(?:sitory)?", "commit", "branch", "token[s]?", "vector", "embedding[s]?", "tensor", "llm", "agent[s]?", "protocol",
                 "schema", "query", "database", "cache", "thread", "memory", "algorithm", "function", "module", "package", "library",
                 "framework", "typescript", "javascript", "python", "rust", "golang", "node", "npm", "pip", "cargo", "git", "github",
                 "linux", "macos", "flag[s]?", "stdin", "stdout", "regex", "parser", "compiler", "statusline", "prompt", "zsh", "bash",
                 "index(?:es)?", "shard(?:s|ed)?", "cluster", "recall", "precision", "fp16", "quantiz\\w+", "transformer[s]?",
                 "attention", "backbone[s]?", "epoch[s]?", "gradient", "loss"],
                ["에이전트", "모델", "데이터", "서버", "배포", "파이프라인", "추론", "학습", "알고리즘", "코드", "터미널"]),
    "data": _rx(["accuracy", "precision", "recall", "f1", "auc", "benchmark\\w*", "dataset", "samples?", "percentile", "p\\d{2}",
                 "mean", "median", "std", "error", "latency", "throughput", "speed-?up", "faster", "score[s]?", "rate", "ratio",
                 "growth", "revenue", "users", "downloads", "stars", "results?", "measured", "evaluation", "table", "figure"],
                ["정확도", "성능", "증가", "감소", "측정", "결과", "통계", "정밀도"]),
    "disclaimer": _rx(["disclaimer", "not affiliated", "unaffiliated", "fictional", "fictitious", "demo data", "sample data", "dummy",
                       "mock(?:ed)? data", "for illustration", "illustrative", "simulated", "not (?:medical|financial|legal) advice",
                       "for research purposes", "use at your own risk", "trademarks?", "all rights reserved", "experimental",
                       "work in progress", "demo project", "is a demo", "not an official"],
                      ["가상", "데모", "예시", "시뮬레이션", "실제와 다를", "면책", "상표", "참고용", "연구 목적", "架空", "デモ"]),
    "provenance": _rx(["data from", "source[sd]?:", "measured", "computed", "collected", "recorded", "derived from", "based on",
                       "according to", "benchmark(?:ed)? on", "reproduc\\w+", "we ran", "evaluated on", "n\\s?=\\s?\\d+", "public benchmarks",
                       "pilot data", "real data", "nothing faked"],
                      ["출처", "측정", "계산", "수집", "데이터셋", "기반", "실측", "出典", "測定"]),
    "rule": _rx(["never (?:say|use|write|call|show)", "always (?:say|use|write|call)", "do not (?:say|use|write|call|show)",
                 "don't (?:say|use|write|call|show)", "avoid (?:the )?(?:term|word|saying|phrase)", "instead of", "must not",
                 "banned", "forbidden", "do's and don'ts", "spell(?:ed)? as", "always capitali[sz]e", "tone of voice",
                 "never (?:recolou?r|stretch|distort|rotate|alter|change|crop|outline|animate)",
                 "do not (?:recolou?r|stretch|distort|rotate|alter|change|crop|outline|animate)", "clear ?space", "minimum size"],
                ["금지", "쓰지 마", "쓰지 않", "대신", "표현을", "용어", "표기", "말하지", "사용하지"]),
    "second_person": _rx(["you", "your", "you'll", "you're", "yours"], ["당신", "여러분", "あなた"]),
    "first_plural": _rx(["we", "our", "us", "we're", "we've"], ["우리", "저희"]),
}

PURPOSES = {
    "paper": _rx(["abstract", "introduction", "related work", "methods?", "experiments?", "results", "discussion", "conclusions?",
                  "references", "bibliography", "et al", "appendix", "ablation", "hypothes[ie]s", "we propose", "this paper"],
                 ["초록", "서론", "결론", "참고문헌", "본 논문", "論文"]),
    "docs": _rx(["installation", "install", "usage", "configuration", "configure", "api reference", "reference", "guide",
                 "quickstart", "options?", "flags?", "examples?", "parameters?", "returns", "getting started", "tutorial", "faq"],
                ["설치", "사용법", "설정", "가이드", "예제", "インストール", "使い方"]),
    "launch": _rx(["introducing", "announcing", "launch(?:ing|ed)?", "now available", "release[ds]?", "new", "get started",
                   "download", "try it", "sign up", "join", "waitlist", "beta", "free", "app"],
                  ["출시", "공개", "런칭", "새로운", "지금", "시작하기", "무료", "다운로드", "앱", "만나보세요", "今すぐ", "無料", "ダウンロード", "始め"]),
    "pitch": _rx(["problem", "solution", "market", "traction", "team", "the ask", "seed", "investors?", "business model",
                  "competition", "roadmap", "hackathon", "demo day", "judges", "pitch", "customers?", "pilot"],
                 ["문제", "해결", "시장", "투자", "해커톤", "발표", "심사", "팀"]),
    "brand": _rx(["brand", "logo usage", "clear ?space", "color palette", "colou?rs?", "typography", "tone of voice",
                  "brand values", "do's and don'ts", "guidelines?", "trademark", "primary colou?r"], ["브랜드", "로고", "가이드라인", "서체"]),
    "portfolio": _rx(["portfolio", "case stud(?:y|ies)", "selected work", "projects?", "clients?", "about me", "resume", "cv"],
                     ["포트폴리오", "작업", "프로젝트"]),
    "tool": _rx(["cli", "command[- ]line", "terminal", "shell", "statusline", "prompt", "tui", "plugin", "extension", "zsh", "bash",
                 "fish", "tmux", "neovim", "vim", "emacs"], ["터미널", "명령어", "플러그인"]),
}

THIRD_PARTY = {  # well-known brand colours: warn when an accent copies a third party named in the material
    "nvidia": "#76B900", "google": "#4285F4", "openai": "#10A37F", "anthropic": "#D97757", "claude": "#D97757", "aws": "#FF9900",
    "amazon": "#FF9900", "hugging face": "#FFD21E", "huggingface": "#FFD21E", "docker": "#2496ED", "kubernetes": "#326CE5",
    "supabase": "#3ECF8E", "stripe": "#635BFF", "slack": "#4A154B", "discord": "#5865F2", "spotify": "#1DB954", "youtube": "#FF0000",
    "netflix": "#E50914", "figma": "#F24E1E", "python": "#3776AB", "github": "#24292F", "microsoft": "#0078D4", "meta": "#0866FF",
    "twitch": "#9146FF", "linear": "#5E6AD2", "vercel": "#000000", "notion": "#000000", "apple": "#000000", "kakao": "#FEE500",
    "naver": "#03C75A", "line": "#06C755", "samsung": "#1428A0",
}

EMOJI_RE = re.compile("[\U0001F300-\U0001FAFF\U0001F000-\U0001F02F\U0001F0A0-\U0001F0FF\U0001F1E6-\U0001F1FF\u2600-\u27BF\u2B50\u2B55"
                      "\u231A\u231B\u23E9-\u23F3\u23F8-\u23FA\u3030\u303D\u3297\u3299]")
SHORTCODE_RE = re.compile(r"(?<![\w:/]):([a-z][a-z0-9_+-]{1,30}):(?![\w/])")
CUTE_EMOJI = set("🐰🐇🐱🐶🐻🐼🦊🐹🐭🐣🐤🌸🌷🌺🌼💖💕💗💓💞💝🎀🍓🍑🍡🍰🍬🍭🧁🍩🍪🫶🥰😊😍🤗🌈✨🦄🎈🍒")
CELEB_EMOJI = set("🎉🚀🔥⚡💥🙌👏🏆💯🥳🤩⭐🌟")
TECH_EMOJI = set("⚙🔧🔨🛠📦💻🖥🧪🔬🧬🤖🧠📊📈🔒🔑🐛📝📚🔍")


# ═════════════════════════════════════════ text structure ═════════════════════════════════════════
def _attr(tag, name):
    m = re.search(name + r'\s*=\s*("([^"]*)"|\'([^\']*)\'|([^\s>]+))', tag, re.I)
    return (m.group(2) or m.group(3) or m.group(4) or "") if m else ""


def strip_tags(s):
    s = re.sub(r"<(script|style)\b.*?</\1>", " ", s, flags=re.S | re.I)
    s = re.sub(r"<!--.*?-->", " ", s, flags=re.S)
    s = re.sub(r"<br\s*/?>|</p>|</h\d>|</li>|</div>|</tr>", "\n", s, flags=re.I)
    s = re.sub(r"<[^>]+>", " ", s)
    return htmllib.unescape(s)


def md_colour_lines(src):
    """Raw markdown lines tagged by context for colour scanning: ("code:<lang>", line) inside fences, ("table", line)
    for pipe-table rows, ("prose", line) otherwise (front matter dropped)."""
    src = src.replace("\r\n", "\n").replace("\r", "\n").lstrip("\ufeff")
    src = re.sub(r"\A---\n.*?\n---\n", "", src, flags=re.S)
    out, fence, lang = [], None, ""
    lines = src.split("\n")
    for i, line in enumerate(lines):
        m = re.match(r"^[ \t]{0,3}(```+|~~~+)[ \t]*([\w+#.-]*)", line)
        if m and fence is None:
            fence, lang = m.group(1), (m.group(2) or "").lower()
            continue
        if fence is not None:
            if line.strip().startswith(fence):
                fence = None
            else:
                out.append((f"code:{lang}", line))
            continue
        is_row = line.count("|") >= 2 and (line.strip().startswith("|") or any(
            re.match(r"^\s*\|?\s*:?-{2,}", lines[j]) for j in (i - 1, i + 1) if 0 <= j < len(lines)) or any(
            re.match(r"^\s*\|?\s*:?-{2,}:?\s*\|", lines[j]) for j in range(max(0, i - 40), i)))
        out.append(("table" if is_row else "prose", line))
    return out


def parse_markdown(src):
    src = src.replace("\r\n", "\n").replace("\r", "\n").lstrip("\ufeff")
    src = re.sub(r"\A---\n.*?\n---\n", "", src, flags=re.S)
    code_blocks = []

    def _code(m):
        code_blocks.append(((m.group(2) or "").lower(), m.group(3)))
        return "\n"

    body = re.sub(r"^[ \t]{0,3}(```+|~~~+)[ \t]*([\w+#.-]*)[^\n]*\n(.*?)^[ \t]{0,3}\1[ \t]*$", _code, src, flags=re.S | re.M)
    defs = {}

    def _def(m):
        defs[m.group(1).lower()] = m.group(2)
        return ""

    body = re.sub(r"^ {0,3}\[([^\]]+)\]:\s*<?(\S+?)>?(?:\s+[\"'(].*)?$", _def, body, flags=re.M)
    images = []
    for m in re.finditer(r"!\[([^\]]*)\]\(\s*<?([^)\s>]+)>?", body):
        images.append((m.group(2), m.group(1)))
    for m in re.finditer(r"!\[([^\]]*)\]\[([^\]]*)\]", body):
        images.append((defs.get((m.group(2) or m.group(1)).lower(), ""), m.group(1)))
    for m in re.finditer(r"<img\b[^>]*>", body, re.I):
        images.append((_attr(m.group(0), "src"), _attr(m.group(0), "alt")))
    for m in re.finditer(r"<source\b[^>]*>", body, re.I):
        for s in _attr(m.group(0), "srcset").split(","):
            if s.strip():
                images.append((s.strip().split()[0], "picture-source"))
    links = re.findall(r"\]\(\s*<?(https?://[^)\s>]+)", body) + re.findall(r"href=[\"'](https?://[^\"']+)", body, re.I)
    links += [v for v in defs.values() if v.startswith("http")]
    emphasis = [a or b for a, b in re.findall(r"\*\*([^*\n]{2,160})\*\*|__([^_\n]{2,160})__", body)]
    emphasis += [strip_tags(x).strip() for x in re.findall(r"<(?:b|strong)>(.*?)</(?:b|strong)>", body, re.I | re.S)]
    headings = [(len(h), t.strip()) for h, t in re.findall(r"^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$", body, re.M)]
    headings += [(int(l), strip_tags(t).strip()) for l, t in re.findall(r"<h([1-6])\b[^>]*>(.*?)</h\1>", body, re.I | re.S)]
    tables = len(re.findall(r"^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$", body, re.M))
    # prose for tone metrics
    prose = re.sub(r"!\[[^\]]*\]\([^)]*\)|!\[[^\]]*\]\[[^\]]*\]", " ", body)
    prose = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", prose)
    prose = re.sub(r"\[([^\]]+)\]\[[^\]]*\]", r"\1", prose)
    prose = strip_tags(prose)
    prose = re.sub(r"^\s{0,3}#{1,6}\s+", "", prose, flags=re.M)
    prose = re.sub(r"^\s{0,3}>\s?", "", prose, flags=re.M)
    prose = re.sub(r"^\s*[-*+]\s+|^\s*\d+[.)]\s+", "", prose, flags=re.M)
    prose = re.sub(r"\*\*|__|~~|(?<!\w)[*_](?!\s)|(?<!\s)[*_](?!\w)", "", prose)
    prose = re.sub(r"^\s*\|?\s*:?-{2,}.*$", "", prose, flags=re.M).replace("|", " ")
    sections, cur = [], []
    for line in re.sub(r"<h[1-6]\b", "\n# ", body, flags=re.I).split("\n"):
        if re.match(r"^\s{0,3}#{1,6}\s", line):
            if cur:
                sections.append(" ".join(cur))
            cur = []
        else:
            cur.append(line)
    if cur:
        sections.append(" ".join(cur))
    sec_words = [count_words(strip_tags(s)) for s in sections]
    sec_words = [w for w in sec_words if w > 0]
    return {"text": prose, "code_blocks": code_blocks, "images": images, "links": list(dict.fromkeys(links)),
            "emphasis": [e.strip() for e in emphasis if e.strip()], "headings": headings, "tables": tables, "sections": sec_words}


WORD_RE = re.compile(r"[A-Za-z\u00C0-\u024F][A-Za-z\u00C0-\u024F'’-]*|\d+(?:[.,]\d+)*")
HANGUL_RE = re.compile(r"[\uAC00-\uD7A3]+")
KANA_RE = re.compile(r"[\u3040-\u30FF\u31F0-\u31FF]")
HAN_RE = re.compile(r"[\u4E00-\u9FFF\u3400-\u4DBF]")


def count_words(t):
    """Word-equivalents: Latin words + Hangul eojeol + CJK characters / 2."""
    if not t:
        return 0
    return len(WORD_RE.findall(t)) + len(HANGUL_RE.findall(t)) + int(round((len(KANA_RE.findall(t)) + len(HAN_RE.findall(t))) / 2))


STOPWORDS = {
    "en": "the and of to in is for that with on as are this it be by from or an at your you we can will not our more has have",
    "de": "der die und das ist nicht mit sich auf für ein eine den von zu dem des im sie es auch wird werden",
    "fr": "le la les et des est une un pour que dans qui pas sur au avec du ce sont nous vous",
    "es": "el la los las y de que en un una es por para con no se del al lo como más",
    "pt": "o os as e de que em um uma é para com não se do da no na por mais",
    "it": "il la le e di che è un una per non con del della in sono gli",
    "nl": "de het een en van is dat op te in niet zijn met voor ook als",
}
STOPSETS = {k: set(v.split()) for k, v in STOPWORDS.items()}
BCP47 = {"en": "en-US", "ko": "ko-KR", "ja": "ja-JP", "zh": "zh-CN", "de": "de-DE", "fr": "fr-FR", "es": "es-ES", "pt": "pt-BR",
         "it": "it-IT", "nl": "nl-NL", "ru": "ru-RU", "ar": "ar-EG", "he": "he-IL", "th": "th-TH", "hi": "hi-IN", "el": "el-GR"}


def detect_lang(text):
    t = re.sub(r"https?://\S+|`[^`]*`", " ", text or "")
    counts = Counter()
    counts["ko"] = len(HANGUL_RE.findall(t))
    kana, han = len(KANA_RE.findall(t)), len(HAN_RE.findall(t))
    if kana > 0.05 * (kana + han + 1):
        counts["ja"] = (kana + han) / 2
    else:
        counts["zh"] = han / 1.6
    for code, a, b in (("ru", 0x0400, 0x04FF), ("ar", 0x0600, 0x06FF), ("he", 0x0590, 0x05FF), ("th", 0x0E00, 0x0E7F),
                       ("hi", 0x0900, 0x097F), ("el", 0x0370, 0x03FF)):
        n = sum(1 for ch in t if a <= ord(ch) <= b)
        if n:
            counts[code] = n / 5
    words = [w.lower() for w in re.findall(r"[A-Za-z\u00C0-\u024F]+", t)]
    if words:
        hits = {k: sum(1 for w in words if w in s) for k, s in STOPSETS.items()}
        best = max(hits, key=hits.get) if max(hits.values()) > 0 else "en"
        counts[best] += len(words)
    tot = sum(counts.values())
    if tot <= 0:
        return "en", {}
    shares = {k: round(v / tot, 3) for k, v in counts.most_common() if v / tot >= 0.02}
    return max(counts, key=counts.get), shares


def sentences(text):
    out = []
    for block in re.split(r"\n\s*\n", text or ""):
        t = re.sub(r"\s+", " ", block)
        parts = re.split(r"(?<=[.!?。！？])\s+|(?<=[다요까죠])\.\s*", t)
        out += [p.strip() for p in parts if len(p.strip()) > 2]
    return out


def register_of(text, lang):
    t = text or ""
    if lang.startswith("ko"):
        formal = len(re.findall(r"(습니다|ㅂ니다|십시오|습니까|입니다)[.!?]?", t))
        polite = len(re.findall(r"[가-힣]요[.!?~]", t))
        plain = len(re.findall(r"[가-힣](다|한다|이다|였다|었다)[.]", t))
        terse = len(re.findall(r"[가-힣](음|함|임|됨)[.\s]", t))
        c = {"formal polite (합쇼체)": formal, "friendly polite (해요체)": polite, "plain written (해라체)": plain, "terse noun endings (개조식)": terse}
        best = max(c, key=c.get)
        return best if c[best] > 0 else "unknown", c
    if lang.startswith("ja"):
        polite = len(re.findall(r"(です|ます|ました|ません)[。！]?", t))
        plain = len(re.findall(r"(である|だ)[。]", t))
        c = {"polite (です/ます)": polite, "plain (だ/である)": plain}
        best = max(c, key=c.get)
        return best if c[best] > 0 else "unknown", c
    contractions = len(re.findall(r"\b\w+'(?:ll|re|ve|s|d|t|m)\b", t, re.I))
    you = len(LEX["second_person"].findall(t))
    passive = len(re.findall(r"\b(?:is|are|was|were|be|been)\s+\w+ed\b", t, re.I))
    words = max(1, count_words(t))
    conv = (contractions + you) / words * 1000
    form = passive / words * 1000 + len(LEX["citation"].findall(t)) / words * 2000
    reg = "conversational" if conv > form + 8 else "formal" if form > conv + 4 else "neutral"
    return reg, {"contractions_and_you_per_1k": round(conv, 1), "passive_and_citations_per_1k": round(form, 1)}


SHELL_START = re.compile(r"^\s*(?:\$|>|%|❯|➜|PS>)\s+(.+)$")
CLI_WORDS = re.compile(r"^\s*(npm|npx|pnpm|yarn|bun|pip|pip3|pipx|uv|python3?|node|deno|brew|cargo|go|curl|wget|git|docker|kubectl|"
                       r"make|cmake|apt(?:-get)?|dnf|yum|gem|bundle|composer|dotnet|java|mvn|gradle|rustup|conda|poetry|helm|terraform|"
                       r"aws|gcloud|az|gh|ffmpeg|claude|codex|ollama|[a-z][\w-]{2,24})\s+[-\w./@:=~]", re.I)


def extract_commands(code_blocks):
    cmds = []
    for lang, code in code_blocks:
        shellish = lang in ("bash", "sh", "shell", "console", "zsh", "fish", "powershell", "ps", "cmd", "terminal", "")
        for line in code.split("\n"):
            m = SHELL_START.match(line)
            if m:
                cmds.append(m.group(1).strip())
            elif shellish and lang and CLI_WORDS.match(line) and not line.strip().startswith(("#", "//")):
                cmds.append(line.strip())
    seen, out = set(), []
    for c in cmds:
        if c not in seen and 2 < len(c) < 200:
            seen.add(c)
            out.append(c)
    return out


NUM_CLAIM = re.compile(r"((?<![#\w])\d+(?:[.,]\d+)?\s?(?:%|x\b|×|ms\b|s\b|fps|pp\b|k\b|M\b|B\b|GB|TB|배|명|개|초|\+)|[$₩€£¥]\s?\d)", re.I)


def text_metrics(docs):
    allt = "\n".join(d.text for d in docs)
    words = max(1, sum(count_words(d.text) for d in docs))
    per_k = lambda n: round(n / words * 1000, 2)
    emojis = EMOJI_RE.findall(allt)
    shortcodes = SHORTCODE_RE.findall(allt)
    m = {"words": words, "docs": len(docs)}
    m["exclaim_per_1k"] = per_k(allt.count("!") + allt.count("！"))
    m["question_per_1k"] = per_k(allt.count("?") + allt.count("？"))
    m["emoji_per_1k"] = per_k(len(emojis) + len(shortcodes))
    for key in ("hedge", "citation", "marketing", "playful", "luxe", "beauty", "warm", "tech", "data", "second_person", "first_plural"):
        m[f"{key}_per_1k"] = per_k(len(LEX[key].findall(allt)))
    m["numbers_per_1k"] = per_k(len(re.findall(r"(?<![\w.])\d+(?:[.,]\d+)*(?:%|x|×)?", allt)))
    codey = len(re.findall(r"`[^`\n]+`|--[a-z][\w-]+|\b[a-z]+_[a-z_]+\b|\b[a-z]+[A-Z]\w+\b|\b\w+\.(?:js|ts|py|rs|go|json|yaml|toml|md|sh)\b", allt))
    m["codeish_per_1k"] = per_k(codey)
    ss = [s for d in docs for s in sentences(d.text)]
    m["avg_sentence_words"] = round(sum(count_words(s) for s in ss) / max(1, len(ss)), 1)
    secs = [w for d in docs for w in d.sections] or [words]
    m["sections"] = len(secs)
    m["words_per_section_median"] = float(np.median(secs))
    m["code_blocks"] = sum(len(d.code_blocks) for d in docs)
    m["tables"] = sum(d.tables for d in docs)
    m["caps_ratio"] = round(sum(1 for c in allt if c.isupper()) / max(1, sum(1 for c in allt if c.isalpha())), 3)
    cute = sum(1 for e in emojis if e in CUTE_EMOJI)
    celeb = sum(1 for e in emojis if e in CELEB_EMOJI)
    tech = sum(1 for e in emojis if e in TECH_EMOJI)
    m["emoji_mix"] = {"cute": cute, "celebratory": celeb, "technical": tech, "other": len(emojis) - cute - celeb - tech,
                      "shortcodes": len(shortcodes)}
    m["top_emoji"] = [e for e, _ in Counter(emojis).most_common(8)]
    return m


def purpose_scores(docs, flags):
    allt = "\n".join(d.text + "\n" + "\n".join(h for _, h in d.headings) for d in docs)
    words = max(1, sum(count_words(d.text) for d in docs))
    s = {k: len(rx.findall(allt)) / words * 1000 for k, rx in PURPOSES.items()}
    kinds = Counter(d.kind for d in docs)
    if kinds.get("paper"):
        s["paper"] += 25
    if kinds.get("slides"):
        s["pitch"] += 6
    if kinds.get("brand-guide"):
        s["brand"] += 25
    if flags.get("terminal_theme") or flags.get("statusline"):
        s["tool"] += 12
    if flags.get("shell_cmds", 0) >= 2:
        s["docs"] += 3
        s["tool"] += 3
    return {k: round(v, 2) for k, v in s.items()}


def build_inventory(docs, metrics):
    inv = {"title": "", "taglines": [], "slogans": [], "claims": [], "disclaimers": [], "provenance": [], "wordingRules": [],
           "commands": [], "links": [], "speakerNotes": [], "register": {}, "headings": []}
    for d in docs:
        if d.title and not inv["title"]:
            inv["title"] = d.title
    for d in docs:
        for lvl, h in d.headings[:40]:
            if h and len(inv["headings"]) < 30:
                inv["headings"].append(h)
    seen = defaultdict(set)

    def add(key, s, src, lim):
        s = re.sub(r"\s+", " ", s).strip(" -–—*#>|")
        if not s or len(s) > 260 or s.lower() in seen[key] or len(inv[key]) >= lim:
            return
        seen[key].add(s.lower())
        inv[key].append({"text": s, "src": src})

    # taglines: long-enough emphasis (meta description, bold lead, abstract), then lead sentences, then short emphasis
    cands = []
    for di, d in enumerate(docs):
        tl = re.sub(r"[^\w]+", " ", d.title or "").strip().lower()
        for e in d.emphasis[:12]:
            n = count_words(e)
            if 4 <= n <= 24:
                cands.append((0, di, e, d.src))
            elif 2 <= n <= 3:
                cands.append((3, di, e, d.src))
        for s_ in sentences(d.text)[:6]:
            plain = re.sub(r"[^\w]+", " ", s_).strip()
            if tl and plain.lower().startswith(tl):
                s_ = s_[len(d.title):].strip(" -–—:|") if s_.lower().startswith((d.title or "").lower()) else plain[len(tl):].strip()
            s_ = EMOJI_RE.sub("", s_).strip()
            if 5 <= count_words(s_) <= 24:
                cands.append((1, di, s_, d.src))
    for _, _, t_, src_ in sorted(cands, key=lambda c: (c[0], c[1])):
        add("taglines", t_, src_, 6)
    for d in docs:
        sents = sentences(d.text)
        for s in sents:
            n = count_words(s)
            if 2 <= n <= 9 and (s.endswith((".", "!", "。", "！")) or s in d.emphasis):
                add("slogans", s, d.src, 10)
            if NUM_CLAIM.search(s) and n <= 45:
                add("claims", s, d.src, 12)
            if LEX["disclaimer"].search(s):
                add("disclaimers", s, d.src, 10)
            if LEX["provenance"].search(s):
                add("provenance", s, d.src, 10)
            if LEX["rule"].search(s):
                add("wordingRules", s, d.src, 12)
        for c in extract_commands(d.code_blocks):
            if len(inv["commands"]) < 14 and c not in inv["commands"]:
                inv["commands"].append(c)
        for u in d.links:
            if not re.search(r"shields\.io|badge|badgen|travis|codecov|circleci|coveralls|actions/workflows", u) and len(inv["links"]) < 10 \
                    and u not in inv["links"]:
                inv["links"].append(u)
        if d.notes:
            inv["speakerNotes"].append({"text": d.notes[:600], "src": d.src})
    return inv


# ═════════════════════════════════════════ known themes (public colour schemes) ═════════════════════════════════════════
# Used when the material names a theme (README text, config files) or a terminal palette matches one.
KNOWN_THEMES = {
    "catppuccin-latte": dict(rx=r"catppuccin[- ]latte", dark=False, bg="#EFF1F5", bg2="#E6E9EF", surface="#DCE0E8", ink="#4C4F69",
                             ink2="#5C5F77", muted="#8C8FA1", accents=["#8839EF", "#1E66F5", "#FE640B", "#EA76CB", "#179299"],
                             ok="#40A02B", warn="#DF8E1D", deny="#D20F39",
                             ansi=["#5C5F77", "#D20F39", "#40A02B", "#DF8E1D", "#1E66F5", "#EA76CB", "#179299", "#ACB0BE",
                                   "#6C6F85", "#D20F39", "#40A02B", "#DF8E1D", "#1E66F5", "#EA76CB", "#179299", "#BCC0CC"]),
    "catppuccin-frappe": dict(rx=r"catppuccin[- ]frapp[eé]", dark=True, bg="#303446", bg2="#292C3C", surface="#414559", ink="#C6D0F5",
                              ink2="#A5ADCE", muted="#838BA7", accents=["#CA9EE6", "#8CAAEE", "#EF9F76", "#F4B8E4", "#81C8BE"],
                              ok="#A6D189", warn="#E5C890", deny="#E78284"),
    "catppuccin-macchiato": dict(rx=r"catppuccin[- ]macchiato", dark=True, bg="#24273A", bg2="#1E2030", surface="#363A4F",
                                 ink="#CAD3F5", ink2="#A5ADCB", muted="#8087A2", accents=["#C6A0F6", "#8AADF4", "#F5A97F", "#F5BDE6", "#8BD5CA"],
                                 ok="#A6DA95", warn="#EED49F", deny="#ED8796"),
    "catppuccin-mocha": dict(rx=r"catppuccin(?:[- ]mocha)?", dark=True, bg="#1E1E2E", bg2="#181825", surface="#313244", ink="#CDD6F4",
                             ink2="#A6ADC8", muted="#7F849C", accents=["#CBA6F7", "#89B4FA", "#FAB387", "#F5C2E7", "#94E2D5"],
                             ok="#A6E3A1", warn="#F9E2AF", deny="#F38BA8",
                             ansi=["#45475A", "#F38BA8", "#A6E3A1", "#F9E2AF", "#89B4FA", "#F5C2E7", "#94E2D5", "#BAC2DE",
                                   "#585B70", "#F38BA8", "#A6E3A1", "#F9E2AF", "#89B4FA", "#F5C2E7", "#94E2D5", "#A6ADC8"]),
    "dracula": dict(rx=r"dracula", dark=True, bg="#282A36", bg2="#21222C", surface="#44475A", ink="#F8F8F2", ink2=None, muted="#6272A4",
                    accents=["#BD93F9", "#FF79C6", "#8BE9FD", "#FFB86C"], ok="#50FA7B", warn="#F1FA8C", deny="#FF5555",
                    ansi=["#21222C", "#FF5555", "#50FA7B", "#F1FA8C", "#BD93F9", "#FF79C6", "#8BE9FD", "#F8F8F2",
                          "#6272A4", "#FF6E6E", "#69FF94", "#FFFFA5", "#D6ACFF", "#FF92DF", "#A4FFFF", "#FFFFFF"]),
    "nord": dict(rx=r"\bnord(?:[- ]?theme)?\b", dark=True, bg="#2E3440", bg2="#3B4252", surface="#434C5E", ink="#ECEFF4", ink2="#D8DEE9",
                 muted=None, accents=["#88C0D0", "#81A1C1", "#B48EAD", "#8FBCBB"], ok="#A3BE8C", warn="#EBCB8B", deny="#BF616A",
                 ansi=["#3B4252", "#BF616A", "#A3BE8C", "#EBCB8B", "#81A1C1", "#B48EAD", "#88C0D0", "#E5E9F0",
                       "#4C566A", "#BF616A", "#A3BE8C", "#EBCB8B", "#81A1C1", "#B48EAD", "#8FBCBB", "#ECEFF4"]),
    "gruvbox": dict(rx=r"gruvbox", dark=True, bg="#282828", bg2="#1D2021", surface="#3C3836", ink="#EBDBB2", ink2="#D5C4A1",
                    muted="#928374", accents=["#FE8019", "#FABD2F", "#83A598", "#D3869B", "#8EC07C"], ok="#B8BB26", warn="#FABD2F",
                    deny="#FB4934", ansi=["#282828", "#CC241D", "#98971A", "#D79921", "#458588", "#B16286", "#689D6A", "#A89984",
                                          "#928374", "#FB4934", "#B8BB26", "#FABD2F", "#83A598", "#D3869B", "#8EC07C", "#EBDBB2"]),
    "solarized-light": dict(rx=r"solarized[- ]light", dark=False, bg="#FDF6E3", bg2="#EEE8D5", surface="#EEE8D5", ink="#586E75",
                            ink2="#657B83", muted="#93A1A1", accents=["#268BD2", "#2AA198", "#D33682", "#6C71C4"], ok="#859900",
                            warn="#B58900", deny="#DC322F"),
    "solarized-dark": dict(rx=r"solarized", dark=True, bg="#002B36", bg2="#073642", surface="#073642", ink="#93A1A1", ink2="#839496",
                           muted="#657B83", accents=["#268BD2", "#2AA198", "#D33682", "#6C71C4", "#CB4B16"], ok="#859900",
                           warn="#B58900", deny="#DC322F",
                           ansi=["#073642", "#DC322F", "#859900", "#B58900", "#268BD2", "#D33682", "#2AA198", "#EEE8D5",
                                 "#002B36", "#CB4B16", "#586E75", "#657B83", "#839496", "#6C71C4", "#93A1A1", "#FDF6E3"]),
    "tokyo-night": dict(rx=r"tokyo[- ]?night", dark=True, bg="#1A1B26", bg2="#16161E", surface="#24283B", ink="#C0CAF5", ink2="#A9B1D6",
                        muted="#737AA2", accents=["#7AA2F7", "#BB9AF7", "#7DCFFF", "#FF9E64"], ok="#9ECE6A", warn="#E0AF68",
                        deny="#F7768E", ansi=["#15161E", "#F7768E", "#9ECE6A", "#E0AF68", "#7AA2F7", "#BB9AF7", "#7DCFFF", "#A9B1D6",
                                              "#414868", "#F7768E", "#9ECE6A", "#E0AF68", "#7AA2F7", "#BB9AF7", "#7DCFFF", "#C0CAF5"]),
    "one-dark": dict(rx=r"\bone[- ]?dark\b", dark=True, bg="#282C34", bg2="#21252B", surface="#2C313C", ink="#ABB2BF", ink2=None,
                     muted="#7F848E", accents=["#61AFEF", "#C678DD", "#56B6C2", "#D19A66"], ok="#98C379", warn="#E5C07B",
                     deny="#E06C75", ansi=["#282C34", "#E06C75", "#98C379", "#E5C07B", "#61AFEF", "#C678DD", "#56B6C2", "#ABB2BF",
                                           "#5C6370", "#E06C75", "#98C379", "#E5C07B", "#61AFEF", "#C678DD", "#56B6C2", "#FFFFFF"]),
    "monokai": dict(rx=r"monokai", dark=True, bg="#272822", bg2="#1E1F1C", surface="#3E3D32", ink="#F8F8F2", ink2="#CFCFC2",
                    muted="#908A75", accents=["#66D9EF", "#AE81FF", "#FD971F", "#E6DB74"], ok="#A6E22E", warn="#E6DB74", deny="#F92672",
                    ansi=["#272822", "#F92672", "#A6E22E", "#F4BF75", "#66D9EF", "#AE81FF", "#A1EFE4", "#F8F8F2",
                          "#75715E", "#F92672", "#A6E22E", "#F4BF75", "#66D9EF", "#AE81FF", "#A1EFE4", "#F9F8F5"]),
    "rose-pine": dict(rx=r"ros[eé][- ]?pine", dark=True, bg="#191724", bg2="#1F1D2E", surface="#26233A", ink="#E0DEF4", ink2="#908CAA",
                      muted="#6E6A86", accents=["#EBBCBA", "#C4A7E7", "#9CCFD8", "#F6C177"], ok=None, warn="#F6C177", deny="#EB6F92",
                      ansi=["#26233A", "#EB6F92", "#31748F", "#F6C177", "#9CCFD8", "#C4A7E7", "#EBBCBA", "#E0DEF4",
                            "#6E6A86", "#EB6F92", "#31748F", "#F6C177", "#9CCFD8", "#C4A7E7", "#EBBCBA", "#E0DEF4"]),
    "everforest": dict(rx=r"everforest", dark=True, bg="#2D353B", bg2="#232A2E", surface="#343F44", ink="#D3C6AA", ink2="#9DA9A0",
                       muted="#859289", accents=["#A7C080", "#83C092", "#7FBBB3", "#D699B6", "#E69875"], ok="#A7C080", warn="#DBBC7F",
                       deny="#E67E80"),
    "kanagawa": dict(rx=r"kanagawa", dark=True, bg="#1F1F28", bg2="#16161D", surface="#2A2A37", ink="#DCD7BA", ink2="#C8C093",
                     muted="#727169", accents=["#7E9CD8", "#957FB8", "#FFA066", "#7FB4CA", "#D27E99"], ok="#98BB6C", warn="#E6C384",
                     deny="#E46876", ansi=["#16161D", "#C34043", "#76946A", "#C0A36E", "#7E9CD8", "#957FB8", "#6A9589", "#C8C093",
                                           "#727169", "#E82424", "#98BB6C", "#E6C384", "#7FB4CA", "#938AA9", "#7AA89F", "#DCD7BA"]),
    "github-dark": dict(rx=r"github[- ]dark", dark=True, bg="#0D1117", bg2="#010409", surface="#161B22", ink="#E6EDF3", ink2="#9198A1",
                        muted="#7D8590", accents=["#4493F8", "#A371F7", "#DB61A2"], ok="#3FB950", warn="#D29922", deny="#F85149"),
    "github-light": dict(rx=r"github[- ]light", dark=False, bg="#FFFFFF", bg2="#F6F8FA", surface="#FFFFFF", ink="#1F2328",
                         ink2="#59636E", muted="#818B98", accents=["#0969DA", "#8250DF", "#BF3989"], ok="#1A7F37", warn="#9A6700",
                         deny="#D1242F"),
}


def theme_ansi(th):
    if th.get("ansi"):
        return list(th["ansi"])
    acc = th["accents"]

    def near(target_h):
        best = min(acc, key=lambda c: hue_dist(lch_of(hex_to_lab(c))[2], target_h))
        return best

    base = [th.get("bg2") or th["bg"], th.get("deny") or near(25), th.get("ok") or near(135), th.get("warn") or near(85),
            near(270), near(330), near(200), th.get("ink2") or th["ink"]]
    return base + [tone(c, dL=6) for c in base[:-1]] + [th["ink"]]


def match_theme_by_palette(bg, fg):
    best = None
    for name, th in KNOWN_THEMES.items():
        d = dE(bg, th["bg"]) + (dE(fg, th["ink"]) if fg else 0)
        if best is None or d < best[0]:
            best = (d, name)
    return best[1] if best and best[0] < 4 else None


# Accent sets of stock office-suite themes (Office 2013+, Office 2007, LibreOffice, Google Slides "Simple Light"):
# a deck or document still on one of these says nothing about the brand.
STOCK_THEME_ACCENTS = [
    {"#4472C4", "#ED7D31", "#A5A5A5", "#FFC000", "#5B9BD5", "#70AD47"},
    {"#4F81BD", "#C0504D", "#9BBB59", "#8064A2", "#4BACC6", "#F79646"},
    {"#18A303", "#0369A3", "#A33E03", "#8E03A3", "#C99C00", "#C9211E"},
    {"#4285F4", "#212121", "#78909C", "#FFAB40", "#0097A7", "#EEFF41"},
    {"#156082", "#E97132", "#196B24", "#0F9ED5", "#A02B93", "#4EA72E"},
]
STOCK_THEME_FONTS = {"calibri", "calibri light", "cambria", "aptos", "aptos display", "arial", "liberation sans", "liberation serif",
                     "times new roman", "+mj-lt", "+mn-lt"}

# ═════════════════════════════════════════ fonts ═════════════════════════════════════════
FONT_CATS = {
    "mono": ["jetbrains mono", "ibm plex mono", "fira code", "fira mono", "sf mono", "menlo", "monaco", "cascadia code", "cascadia mono",
             "consolas", "courier", "courier new", "dejavu sans mono", "source code pro", "inconsolata", "hack", "ubuntu mono",
             "roboto mono", "space mono", "victor mono", "iosevka", "geist mono", "d2coding", "berkeley mono", "commit mono",
             "monaspace", "operator mono", "andale mono", "lucida console", "pt mono", "noto sans mono", "cmtt", "nimbusmono"],
    "display-serif": ["playfair display", "didot", "bodoni", "bodoni 72", "cormorant", "cormorant garamond", "dm serif display",
                      "abril fatface", "henri didot", "gt super", "canela", "ogg", "recoleta", "fraunces", "prata", "yeseva one"],
    "serif": ["times", "times new roman", "georgia", "garamond", "eb garamond", "minion", "minion pro", "palatino", "book antiqua",
              "cambria", "charter", "baskerville", "caslon", "iowan old style", "new york", "source serif", "source serif 4",
              "source serif pro", "noto serif", "pt serif", "merriweather", "lora", "crimson", "crimson text", "crimson pro",
              "libre baskerville", "newsreader", "literata", "linux libertine", "libertinus serif", "latin modern roman", "cmu serif",
              "computer modern", "stix", "stix two text", "tinos", "nimbusromno9l", "nimbus roman", "tex gyre termes",
              "spectral", "alegreya", "domine", "noto serif kr", "applemyungjo", "nanum myeongjo", "hiragino mincho", "yu mincho",
              "songti", "batang", "dejavu serif", "bitter", "zilla slab", "roboto slab", "rockwell", "cmr", "cmbx", "cmti"],
    "rounded": ["nunito", "quicksand", "varela round", "m plus rounded 1c", "arial rounded mt bold", "sf pro rounded", "comfortaa",
                "fredoka", "baloo", "baloo 2", "rounded mplus", "kosugi maru", "jua", "gaegu", "hiragino maru gothic"],
    "geometric": ["poppins", "montserrat", "avenir", "avenir next", "futura", "century gothic", "gotham", "proxima nova", "circular",
                  "dm sans", "outfit", "urbanist", "lexend", "manrope", "sora", "plus jakarta sans", "gilroy", "product sans",
                  "google sans", "raleway", "josefin sans", "red hat display", "satoshi", "general sans"],
    "grotesk": ["inter", "inter display", "helvetica", "helvetica neue", "arial", "sf pro", "sf pro display", "sf pro text", "system-ui",
                "roboto", "ibm plex sans", "space grotesk", "geist", "suisse", "neue haas grotesk", "akzidenz", "archivo",
                "public sans", "work sans", "dejavu sans", "liberation sans", "segoe ui", "pretendard", "pretendard variable",
                "apple sd gothic neo", "noto sans kr", "spoqa han sans", "malgun gothic", "hiragino sans", "noto sans jp",
                "pingfang sc", "noto sans sc", "microsoft yahei", "calibri", "verdana", "tahoma", "aptos"],
    "humanist": ["source sans", "source sans 3", "source sans pro", "open sans", "noto sans", "lato", "fira sans", "gill sans",
                 "lucida grande", "myriad", "myriad pro", "frutiger", "segoe", "ubuntu", "pt sans", "trebuchet ms", "optima", "candara"],
    "handwriting": ["caveat", "patrick hand", "chalkboard", "chalkboard se", "comic neue", "comic sans ms", "marker felt", "noteworthy",
                    "indie flower", "kalam", "nanum pen script", "gamja flower", "shadows into light", "permanent marker"],
}
ALTERNATIVES = {
    "grotesk": ["Inter", "Helvetica Neue", "Arial", "Noto Sans"],
    "geometric": ["Poppins", "Montserrat", "Avenir Next", "Futura", "Century Gothic"],
    "rounded": ["Nunito", "Quicksand", "M PLUS Rounded 1c", "Arial Rounded MT Bold", "Varela Round"],
    "humanist": ["Source Sans 3", "Open Sans", "Noto Sans", "Segoe UI", "Lucida Grande", "Gill Sans"],
    "serif": ["Source Serif 4", "Newsreader", "Iowan Old Style", "Charter", "Georgia", "Times New Roman"],
    "display-serif": ["Playfair Display", "Didot", "Bodoni 72", "Cormorant Garamond", "Baskerville"],
    "mono": ["JetBrains Mono", "IBM Plex Mono", "Fira Code", "SF Mono", "Menlo", "Cascadia Code", "Consolas", "DejaVu Sans Mono"],
    "handwriting": ["Caveat", "Patrick Hand", "Chalkboard SE", "Comic Neue"],
}
CJK_STACKS = {
    "ko": ["Pretendard", "Pretendard Variable", "Apple SD Gothic Neo", "Noto Sans KR", "Noto Sans CJK KR", "Malgun Gothic"],
    "ko-serif": ["Noto Serif KR", "AppleMyungjo", "Nanum Myeongjo"],
    "ja": ["Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", "Noto Sans CJK JP", "Yu Gothic", "Meiryo"],
    "ja-serif": ["Hiragino Mincho ProN", "Noto Serif JP", "Yu Mincho"],
    "zh": ["PingFang SC", "Hiragino Sans GB", "Noto Sans SC", "Noto Sans CJK SC", "Microsoft YaHei"],
    "zh-serif": ["Songti SC", "Noto Serif SC"],
}
GENERIC = {"grotesk": "sans-serif", "geometric": "sans-serif", "rounded": "sans-serif", "humanist": "sans-serif", "serif": "serif",
           "display-serif": "serif", "mono": "monospace", "handwriting": "cursive"}
EMOJI_FONTS = re.compile(r"emoji|symbol|lastresort|fallback", re.I)
PDF_FONT_ALIASES = [(r"^(cmr|cmbx|cmti|cmsl|lmroman|lmr)", "Latin Modern Roman"), (r"^(cmss|lmsans)", "Latin Modern Sans"),
                    (r"^(cmtt|lmmono)", "Latin Modern Mono"), (r"^(nimbusromno9l|nimbusroman|times)", "Times New Roman"),
                    (r"^(nimbussan|helvetica|arial)", "Helvetica"), (r"^(nimbusmon|courier)", "Courier New"),
                    (r"^dejavusans(?!mono)", "DejaVu Sans"), (r"^dejavuserif", "DejaVu Serif"), (r"^dejavusansmono", "DejaVu Sans Mono"),
                    (r"^stix", "STIX Two Text"), (r"^symbol", None), (r"^zapf", None), (r"^(cmmi|cmsy|cmex|msam|msbm)", None)]


WEIGHT_SUFFIX = re.compile(r"(?:\s+|-)(?:(?:extra|ultra|semi|demi)[\s-]?)?(?:thin|hairline|light|regular|book|normal|medium|bold|black|"
                           r"heavy|italic|oblique|variable|vf)(?:\s+(?:italic|oblique))?$", re.I)


def clean_family(name):
    """Family name as a CSS stack wants it: no PDF subset prefix, no weight/style suffix ("Nunito ExtraLight", the
    default instance a variable font reports, becomes "Nunito")."""
    n = str(name or "").strip().strip("'\"")
    n = re.sub(r"^[A-Z]{6}\+", "", n)  # PDF subset prefix
    if n.startswith(".SF") or n.lower() in ("-apple-system", "blinkmacsystemfont", "system-ui", ".applesystemuifont"):
        return "system-ui"
    for _ in range(2):
        base = WEIGHT_SUFFIX.sub("", n).strip()
        if base and base != n and len(base) >= 3:
            n = base
    return n


def pdf_family(base):
    """'ABCDEF+Times-BoldItalic' -> ('Times New Roman', bold, italic)."""
    n = clean_family(base)
    bold = bool(re.search(r"bold|black|heavy|semibold|demi|bx\d", n, re.I))
    italic = bool(re.search(r"italic|oblique|ti\d|it\b", n, re.I))
    core = re.split(r"[-,]", n)[0]
    low = core.lower()
    for rx, fam in PDF_FONT_ALIASES:
        if re.match(rx, low):
            return fam, bold, italic
    core = re.sub(r"(MT|PS|Std|Pro|LT)$", "", core)
    core = re.sub(r"(?<=[a-z])(?=[A-Z])", " ", core).strip()
    return core or n, bold, italic


def font_category(fam):
    f = clean_family(fam).lower()
    if f == "system-ui":
        return "grotesk"
    for cat in ("mono", "display-serif", "rounded", "handwriting", "serif", "geometric", "humanist", "grotesk"):
        for k in FONT_CATS[cat]:
            if f == k or f.startswith(k + " ") or f.replace(" ", "").startswith(k.replace(" ", "")):
                return cat
    if re.search(r"mono|code|courier|consol|terminal", f):
        return "mono"
    if re.search(r"rounded|round\b|maru", f):
        return "rounded"
    if re.search(r"script|hand|brush|marker|pen\b", f):
        return "handwriting"
    if re.search(r"slab", f):
        return "serif"
    if re.search(r"(?<!sans )serif|roman|garamond|mincho|myeongjo|song|ming|batang|book\b", f) and "sans" not in f:
        return "serif"
    if re.search(r"display|grotesk|grotesque", f):
        return "grotesk"
    return "grotesk"


class FontIndex:
    """Installed font families (fc-list, else a fontTools scan of the usual folders)."""

    def __init__(self):
        self.fams = {}
        self.loaded = False

    def _add(self, fam, style, path):
        fam = fam.strip()
        if not fam or fam.startswith("."):
            return
        d = self.fams.setdefault(fam.lower(), {"name": fam, "files": []})
        if len(d["files"]) < 40:
            d["files"].append((style.lower(), path))

    def load(self):
        if self.loaded:
            return self
        self.loaded = True
        fc = shutil.which("fc-list")
        if fc:
            try:
                out = subprocess.run([fc, "--format", "%{family}\t%{style}\t%{file}\n"], capture_output=True, text=True, timeout=30).stdout
                for line in out.splitlines():
                    parts = line.split("\t")
                    if len(parts) == 3:
                        for f in parts[0].split(","):
                            self._add(f, parts[1].split(",")[0], parts[2])
                if self.fams:
                    return self
            except Exception:
                pass
        try:
            from fontTools.ttLib import TTFont, TTCollection
        except ImportError:
            return self
        home = Path.home()
        dirs = [Path("/System/Library/Fonts"), Path("/System/Library/Fonts/Supplemental"), Path("/Library/Fonts"), home / "Library/Fonts",
                Path("/usr/share/fonts"), Path("/usr/local/share/fonts"), home / ".local/share/fonts", home / ".fonts",
                Path("C:/Windows/Fonts"), Path(os.environ.get("LOCALAPPDATA", "_none_")) / "Microsoft/Windows/Fonts"]
        n = 0
        for d in dirs:
            if not d.exists():
                continue
            for p in d.rglob("*"):
                if n > 4000:
                    break
                if p.suffix.lower() not in (".ttf", ".otf", ".ttc", ".otc"):
                    continue
                n += 1
                try:
                    fonts = TTCollection(str(p), lazy=True).fonts if p.suffix.lower() in (".ttc", ".otc") else [TTFont(str(p), lazy=True)]
                    for f in fonts[:8]:
                        nm = f["name"]
                        fam = nm.getDebugName(16) or nm.getDebugName(1)
                        sty = nm.getDebugName(17) or nm.getDebugName(2) or "Regular"
                        if fam:
                            self._add(fam, sty, str(p))
                except Exception:
                    continue
        return self

    def resolve(self, fam):
        """Installed family name for `fam` (exact, else compact-prefix match such as 'JetBrains Mono' ->
        'JetBrainsMono Nerd Font'), or None."""
        self.load()
        f = clean_family(fam)
        if f == "system-ui":
            return "system-ui"
        k = f.lower()
        if k in self.fams:
            return self.fams[k]["name"]
        ck = re.sub(r"[^a-z0-9]", "", k)
        if len(ck) < 4:
            return None
        ok_suffix = {"nerd", "font", "nf", "nfm", "nfp", "variable", "vf", "pro", "std", "display", "text", "nl", "propo", "regular", "new"}
        cands = []
        for kk, v in self.fams.items():
            if not re.sub(r"[^a-z0-9]", "", kk).startswith(ck):
                continue
            rest, i = kk, 0
            for ch in kk:  # strip the matched compact prefix from the spaced name
                if i >= len(ck):
                    break
                if re.match(r"[a-z0-9]", ch):
                    i += 1
                rest = rest[1:]
            toks = [t for t in re.split(r"[^a-z0-9]+", rest) if t]
            if all(t in ok_suffix for t in toks):
                cands.append(v["name"])
        return min(cands, key=len) if cands else None

    def file_for(self, fam, weight=400):
        self.load()
        d = self.fams.get(str(fam).lower())
        if not d:
            return None
        want = {300: "light", 400: "regular", 500: "medium", 600: "semibold", 700: "bold", 800: "extrabold", 900: "black"}.get(int(weight), "regular")
        for sty, p in d["files"]:
            if sty == want and "italic" not in sty:
                return p
        for sty, p in d["files"]:
            if "italic" not in sty and "oblique" not in sty:
                return p
        return d["files"][0][1] if d["files"] else None


def font_license(path):
    try:
        from fontTools.ttLib import TTFont
        f = TTFont(str(path), lazy=True, fontNumber=0)
        txt = " ".join(filter(None, [f["name"].getDebugName(13), f["name"].getDebugName(14)]))
        if re.search(r"SIL Open Font License|OFL|scripts\.sil\.org/OFL|openfontlicense", txt, re.I):
            return "OFL-1.1"
        if re.search(r"Apache License", txt, re.I):
            return "Apache-2.0"
        if re.search(r"Ubuntu Font Licen", txt, re.I):
            return "UFL-1.0"
        return "unknown" if txt else "unspecified"
    except Exception:
        return "unknown"


# ═════════════════════════════════════════ CSS / HTML parsing ═════════════════════════════════════════
def css_rules(text):
    """[(context(list of at-rule preludes), selector, body)] for every rule; @font-face and @import included."""
    text = re.sub(r"/\*.*?\*/", "", text or "", flags=re.S)
    out = []

    def walk(s, ctx, depth=0):
        if depth > 6:
            return
        i, n = 0, len(s)
        while i < n:
            j = s.find("{", i)
            semi = s.find(";", i)
            if j < 0:
                for m in re.finditer(r"@import\s+(?:url\()?\s*[\"']?([^\"')\s;]+)", s[i:]):
                    out.append((ctx, "@import", m.group(1)))
                break
            if 0 <= semi < j:
                stmt = s[i:semi].strip()
                m = re.match(r"@import\s+(?:url\()?\s*[\"']?([^\"')\s;]+)", stmt)
                if m:
                    out.append((ctx, "@import", m.group(1)))
                    i = semi + 1
                    continue
                if stmt.startswith("@"):
                    i = semi + 1
                    continue
            sel = s[i:j].strip()
            depth_b, k = 1, j + 1
            while k < n and depth_b:
                c = s[k]
                if c == "{":
                    depth_b += 1
                elif c == "}":
                    depth_b -= 1
                k += 1
            body = s[j + 1:k - 1]
            low = sel.lower()
            if low.startswith("@theme"):
                out.append((ctx, ":root", body))
            elif low.startswith(("@media", "@supports", "@layer", "@container", "@document", "@scope")):
                walk(body, ctx + [sel], depth + 1)
            elif low.startswith("@font-face"):
                out.append((ctx, "@font-face", body))
            elif low.startswith("@"):
                pass
            else:
                if "{" in body:
                    flat = re.sub(r"[^;{}]*\{[^{}]*\}", "", body)
                    out.append((ctx, sel, flat))
                    for m in re.finditer(r"([^;{}]+)\{([^{}]*)\}", body):
                        sub = m.group(1).strip()
                        out.append((ctx, sub.replace("&", sel) if "&" in sub else f"{sel} {sub}", m.group(2)))
                else:
                    out.append((ctx, sel, body))
            i = k

    walk(text, [])
    return out


def css_decls(body):
    res = []
    for part in re.split(r";(?![^(]*\))", body or ""):
        if ":" in part:
            p, v = part.split(":", 1)
            p = p.strip()
            if p:
                res.append((p if p.startswith("--") else p.lower(), v.strip()))
    return res


def scheme_of(ctx, sel):
    s = re.sub(r"\s+", " ", (" ".join(ctx) + " " + sel).lower())
    if re.search(r"prefers-color-scheme\s*:\s*dark|\.dark\b|\[data-(?:[\w-]*theme|[\w-]*mode|[\w-]*scheme)\s*=\s*[\"']?(?:dark|slate|night|black|dim)|"
                 r"\.theme-dark|\.dark-mode|\[theme\s*=\s*[\"']?dark|\.dark-theme", s):
        return "dark"
    if re.search(r"prefers-color-scheme\s*:\s*light|\.light\b|\[data-(?:theme|mode|bs-theme|color-mode)\s*=\s*[\"']?light|\.theme-light", s):
        return "light"
    return None


ROOTISH = re.compile(r"^(?::root|html|body|:host|\*|\[data-[\w-]+[^\]]*\]|\.(?:dark|light|theme-[\w-]+|dark-mode)|"
                     r"html\.[\w-]+|:root\.[\w-]+|:root\[[^\]]+\]|html\[[^\]]+\])(?:\s*,\s*.*)?$", re.I)


def resolve_vars(v, table, depth=0):
    if depth > 8 or "var(" not in v:
        return v

    def rep(m):
        name, fb = m.group(1), m.group(2)
        val = table.get(name)
        if val is None:
            return (fb or "").strip()
        return resolve_vars(val, table, depth + 1)

    return re.sub(r"var\(\s*(--[\w-]+)\s*(?:,\s*((?:[^()]|\([^()]*\))*))?\)", rep, v)


TOKEN_ROLE_RULES = [
    ("deny", r"danger|error|destructive|critical|negative|deny|denied|invalid|alert(?!-?bg)"),
    ("warn", r"warn|warning|caution|attention|pending"),
    ("ok", r"success|(?<![a-z])ok(?![a-z])|positive|allow|valid|done|complete"),
    ("line", r"border|divider|stroke|outline|separator|(?<![a-z])rule(?![a-z])|hairline|(?<![a-z])line(?![a-z])"),
    ("bg2", r"(?:bg|background|canvas|base|page)[-_]?(?:2|alt|subtle|secondary|muted|inset|soft|dim|sunken|deep|darker|lighter)|mantle|crust"),
    ("surface", r"surface|card|panel|elevated|raised|popover|modal|sheet|tile|(?<![a-z])well|box[-_]?bg|container"),
    ("ink2", r"(?:text|fg|foreground|ink|font|copy|body|content)[-_]?(?:muted|subtle|secondary|soft|dim|weak|tertiary|placeholder|"
             r"light|2|alt|low)|muted|subtle|subtext|dimmed|secondary[-_]?(?:text|fg|foreground)|comment|overlay\d"),
    ("ink", r"(?:^|[-_])(?:text|fg|foreground|ink|body[-_]?color|font[-_]?color|copy|content|on[-_]?(?:background|surface|bg)|"
            r"base[-_]?content|heading|title)(?:[-_](?:color|default|primary|base|main|1|strong|emphasis|high))?$"),
    ("bg", r"(?:^|[-_])(?:bg|background|canvas|page|paper|backdrop|body[-_]?bg|app[-_]?bg|base)(?:[-_](?:color|default|primary|main|1))?$"),
    ("accent2", r"secondary|accent[-_]?2|complement"),
    ("accent3", r"tertiary|accent[-_]?3"),
    ("accent", r"primary|brand|accent|highlight|(?<![a-z])key(?![a-z])|theme|link|cta|action|focus|tint|signature|hero|mauve"),
]
HUE_NAMES = {"red": 25, "orange": 55, "amber": 70, "yellow": 90, "lime": 115, "green": 135, "emerald": 150, "teal": 185, "cyan": 200,
             "sky": 230, "blue": 270, "indigo": 285, "violet": 300, "purple": 310, "fuchsia": 330, "pink": 350, "rose": 5, "magenta": 330}


def token_role(name):
    n = name.lower().lstrip("-")
    n = re.sub(r"^(?:color|colors|clr|c|theme|tw|bs|md|sys|ui|app|brand-color)[-_]", "", n)
    shade = None
    m = re.search(r"[-_](\d{2,3})$", n)
    if m:
        shade = int(m.group(1))
        n = n[:m.start()]
    if n.endswith("-rgb") or n.endswith("_rgb"):
        n = n[:-4]
    for role, rx in TOKEN_ROLE_RULES:
        if re.search(rx, n):
            return role, shade, n
    base = re.split(r"[-_]", n)[-1] if n else n
    if base in HUE_NAMES or n in HUE_NAMES:
        return "palette", shade, n
    return None, shade, n


class _HP(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.title, self.meta, self.styles, self.links, self.imgs = "", {}, [], [], []
        self.text, self.headings, self.pre, self.strong, self.inline_styles = [], [], [], [], []
        self.html_attrs, self.icons = {}, []
        self._stack, self._cur_h, self._in_pre, self._in_strong, self._skip = [], None, False, False, 0
        self._buf_h, self._buf_pre, self._buf_strong = [], [], []

    def handle_starttag(self, tag, attrs):
        a = {k.lower(): (v or "") for k, v in attrs}
        if tag == "html":
            self.html_attrs = a
        if "style" in a and len(self.inline_styles) < 4000:
            self.inline_styles.append(a["style"])
        if tag in ("script", "style", "noscript", "template", "svg"):
            self._skip += 1
        if tag == "meta":
            k = (a.get("name") or a.get("property") or "").lower()
            if k:
                self.meta.setdefault(k, []).append({"content": a.get("content", ""), "media": a.get("media", "")})
        elif tag == "link":
            rel = a.get("rel", "").lower()
            if "stylesheet" in rel and a.get("href"):
                self.links.append(a["href"])
            if "icon" in rel and a.get("href"):
                self.icons.append(a["href"])
        elif tag == "img" and a.get("src"):
            self.imgs.append((a["src"], a.get("alt", "")))
        elif tag == "source" and a.get("srcset"):
            self.imgs.append((a["srcset"].split(",")[0].strip().split()[0], "picture-source"))
        elif tag in ("h1", "h2", "h3", "h4"):
            self._cur_h, self._buf_h = int(tag[1]), []
        elif tag == "pre":
            self._in_pre, self._buf_pre = True, []
        elif tag in ("strong", "b"):
            self._in_strong, self._buf_strong = True, []
        if tag in ("p", "div", "li", "br", "tr", "section", "article", "h1", "h2", "h3", "h4", "pre", "blockquote"):
            self.text.append("\n")

    def handle_endtag(self, tag):
        if tag in ("script", "style", "noscript", "template", "svg") and self._skip:
            self._skip -= 1
        if tag in ("h1", "h2", "h3", "h4") and self._cur_h:
            self.headings.append((self._cur_h, " ".join("".join(self._buf_h).split())))
            self.text.append("\n§§HEADING§§\n")
            self._cur_h = None
        elif tag == "pre" and self._in_pre:
            self.pre.append("".join(self._buf_pre))
            self._in_pre = False
        elif tag in ("strong", "b") and self._in_strong:
            self.strong.append(" ".join("".join(self._buf_strong).split()))
            self._in_strong = False
        if tag in ("p", "div", "li", "tr", "section", "article", "blockquote"):
            self.text.append("\n")

    def handle_data(self, data):
        if self._skip:
            if self._stack_is_style():
                self.styles.append(data)
            return
        if self.lasttag == "title" and not self.title:
            self.title = data.strip()
        if self._cur_h:
            self._buf_h.append(data)
        if self._in_pre:
            self._buf_pre.append(data)
        if self._in_strong:
            self._buf_strong.append(data)
        self.text.append(data)

    def _stack_is_style(self):
        return self.lasttag == "style"


# ═════════════════════════════════════════ context + readers ═════════════════════════════════════════
class Ctx:
    def __init__(self, project: Path, args):
        self.P = project.resolve()
        self.build = self.P / "build"
        self.snapdir = self.build / "snapshots"
        self.args = args
        self.disp = Disp(self.P)
        self.evidence, self.colors, self.fonts, self.docs, self.images = [], [], [], [], []
        self.sources, self.warnings, self.terminal, self.theme_mentions = [], [], [], Counter()
        self.flags = Counter()
        self.font_files = []
        self.soffice_pdf_ok_for_key = False   # LibreOffice reads only pre-2013 Keynote; modern decks need a PDF export
        self.snap_inputs = []
        self.snap_map = {}
        self.snap_items = []
        self.image_budget = args.max_images
        self.seen_files = set()
        self.seen_images = set()
        self.fontidx = FontIndex()
        self.type_info = {"sizes": [], "heading_ratio": [], "heading_weight": [], "radius": []}

    # evidence ------------------------------------------------------------------
    def ev(self, source, typ, summary, data=None):
        eid = f"E{len(self.evidence) + 1}"
        self.evidence.append({"id": eid, "source": self.disp(source) if source else "", "type": typ, "summary": summary,
                              **({"data": data} if data else {})})
        return eid

    def color(self, hx, weight, roles, eid, origin, name="", scheme=None, exact=False, src=""):
        if not hx:
            return
        self.colors.append(ColorCand(hx.upper(), float(weight), dict(roles), eid, origin, name, scheme, exact, src))

    def font(self, family, role, weight, eid, origin, file=None, css_weight=None):
        fam = clean_family(family)
        if not fam or EMOJI_FONTS.search(fam) or fam.lower() in ("inherit", "initial", "sans-serif", "serif", "monospace", "cursive",
                                                                 "fantasy", "ui-monospace", "ui-sans-serif", "ui-serif", "var"):
            return
        self.fonts.append(FontCand(fam, role, float(weight), eid, origin, file, css_weight))

    # dispatch ------------------------------------------------------------------
    def add_source(self, arg):
        if is_url(arg):
            host = urlparse(arg).netloc.lower()
            m = re.match(r"https?://(?:www\.)?github\.com/([^/]+)/([^/#?]+)", arg)
            kind = "repo" if m else "website"
            entry = {"url": arg, "kind": kind, "notes": ""}
            self.sources.append(entry)
            if self.args.offline:
                entry["notes"] = "skipped (offline)"
                warn(f"offline: URL not analysed: {arg}", self)
            elif self.args.no_snapshot:
                entry["notes"] = "skipped (--no-snapshot)"
                warn(f"--no-snapshot: URL not analysed: {arg}", self)
            else:
                self.snap_inputs.append(arg)
                self.snap_map[arg] = entry
            self.flags["urls"] += 1
            if host.endswith("github.com"):
                self.flags["github_url"] += 1
            return
        p = Path(arg).expanduser()
        if not p.exists():
            warn(f"source not found: {arg}", self)
            return
        if p.is_dir() and not is_keynote(p):
            self.read_dir(p)
        else:
            entry = {"path": self.disp(p), "kind": "other", "notes": ""}
            self.sources.append(entry)
            if is_secret(p):
                entry["notes"] = "skipped: looks like a secret or private key (never read)"
                warn(f"{arg}: skipped, the name looks like a secret or private key; it is never read", self)
                return
            got = self.read_file(p, entry)
            if got is None and not entry.get("notes"):
                entry["notes"] = f"skipped: {p.suffix or 'this file type'} is not analysed"
                warn(f"{arg}: not analysed ({p.suffix or 'no extension'} is not a supported source type)", self)

    def read_dir(self, d: Path):
        files = []
        for root, dirs, fs in os.walk(d):
            files += [Path(root) / x for x in dirs if x.lower().endswith(".key") and is_keynote(Path(root) / x)]  # deck bundles
            dirs[:] = [x for x in dirs if x not in SKIP_DIRS and (not x.startswith(".") or x in (".github",))
                       and not x.lower().endswith(".key")]
            for f in fs:
                p = Path(root) / f
                if not is_secret(p) and not f.startswith("."):
                    files.append(p)
            if len(files) > 6000:
                break
        markers = [x for x in (".git", "package.json", "pyproject.toml", "Cargo.toml", "go.mod", "setup.py", "Gemfile", "pom.xml")
                   if (d / x).exists()]
        readmes = sorted([p for p in files if p.parent == d and re.match(r"readme", p.name, re.I)], key=lambda p: (p.suffix != ".md", len(p.name)))
        kind = "repo" if markers or readmes else "images" if files and all(p.suffix.lower() in IMAGE_EXT for p in files) else "other"
        entry = {"path": self.disp(d), "kind": kind, "notes": ""}
        self.sources.append(entry)
        if kind == "repo":
            self.flags["repo"] += 1
        order = []
        md = [p for p in files if p.suffix.lower() in MD_EXT and p.suffix.lower() != ".txt"]
        md.sort(key=lambda p: (p not in readmes, "docs" not in p.parts, len(p.parts), p.name.lower()))
        order += md[:8]
        order += [p for p in files if p.suffix.lower() in HTML_EXT][:5]
        order += [p for p in files if p.suffix.lower() in CSS_EXT][:16]
        order += [p for p in files if re.match(r"tailwind\.config\.(js|cjs|mjs|ts)$", p.name)][:2]
        theme_rx = r"theme|colou?r|scheme|palette|kitty|alacritty|ghostty|wezterm|foot|xresources|base16|iterm|" + "|".join(
            re.escape(k.split("-")[0]) for k in KNOWN_THEMES)
        order += [p for p in files if p.name in ("package.json", "theme.json", "manifest.json", "site.webmanifest")][:4]
        order += [p for p in files if p.suffix.lower() in (".conf", ".toml", ".yml", ".yaml", ".itermcolors", ".terminal", ".theme", ".json")
                  and p.name not in ("package.json", "package-lock.json", "tsconfig.json")
                  and (re.search(theme_rx, p.name, re.I) or re.search(theme_rx, p.parent.name, re.I))][:12]
        order += [p for p in files if p.suffix.lower() == ".pdf"][:4]
        order += [p for p in files if p.suffix.lower() in SLIDE_EXT][:3]
        order += [p for p in files if p.suffix.lower() == ".docx"][:2]
        order += [p for p in files if p.suffix.lower() in (".woff2", ".woff", ".ttf", ".otf")][:12]
        imgs = [p for p in files if p.suffix.lower() in IMAGE_EXT]

        def img_pri(p):
            h = name_hint(p.name)
            pri = {"logo": 0, "mascot": 0, "banner": 1, "screenshot": 2, "figure": 3, "photo": 4}.get(h, 5)
            loc = 0 if any(x in (".github", "assets", "docs", "public", "static", "images", "img", "media", "design", "brand", "screenshots")
                           for x in p.parts) else 1
            try:
                sz = p.stat().st_size
            except OSError:
                sz = 0
            return (pri, loc, -min(sz, 3_000_000), p.name)

        order += sorted(imgs, key=img_pri)
        counts = Counter()
        for p in order:
            counts[self.read_file(p, entry, inside_dir=True) or "skipped"] += 1
        entry["notes"] = ", ".join(f"{v} {k}" for k, v in counts.most_common() if k != "skipped") or "no readable files"
        if entry["kind"] == "other":
            for k_ in ("brand-guide", "paper", "slides", "website", "docs", "markdown"):
                if counts.get(k_):
                    entry["kind"] = "website" if k_ == "docs" else k_
                    break

    def read_file(self, p: Path, entry, inside_dir=False):
        rp = p.resolve()
        if is_secret(p):
            return None
        if rp in self.seen_files:
            return "already read"          # e.g. an image a README in the same run referenced
        self.seen_files.add(rp)
        ext = p.suffix.lower()
        try:
            if ext in MD_EXT:
                return self.read_markdown(p, entry, inside_dir)
            if ext in HTML_EXT:
                return self.read_html(p, entry, inside_dir)
            if ext in CSS_EXT:
                return self.read_css_file(p)
            if re.match(r"tailwind\.config\.(js|cjs|mjs|ts)$", p.name):
                return self.read_tailwind(p)
            if ext == ".json" or p.name.endswith(".webmanifest"):
                return self.read_json(p, entry)
            if ext in (".itermcolors", ".conf", ".toml", ".yml", ".yaml", ".theme", ".terminal") or re.search(
                    r"kitty|alacritty|ghostty|wezterm|foot|xresources|base16", p.name, re.I):
                return self.read_terminal_conf(p)
            if ext == ".pdf":
                return self.read_pdf(p, entry, inside_dir)
            if ext in SLIDE_EXT:
                return self.read_slides(p, entry, inside_dir)
            if ext == ".docx":
                return self.read_docx(p, entry, inside_dir)
            if ext in (".woff2", ".woff", ".ttf", ".otf"):
                return self.read_font_file(p)
            if ext in IMAGE_EXT:
                return self.read_image_file(p, entry, inside_dir)
        except Exception as e:  # keep going on any malformed file
            warn(f"could not read {self.disp(p)}: {type(e).__name__}: {str(e)[:120]}", self)
            return None
        return None

    # text sources ---------------------------------------------------------------
    def _text_signals(self, text, src, eid_src, colour_lines=None):
        """Theme names, colours written in the material, fonts named in prose. colour_lines: [(context, line)] with
        context "prose" | "table" | "code:<lang>" (markdown passes its raw lines so tables and code are told apart);
        default: every line of text as prose."""
        for name, th in KNOWN_THEMES.items():
            n = len(re.findall(th["rx"], text, re.I))
            if n:
                self.theme_mentions[name] += n
        # explicit colour specs ("Primary: #FF5A1F", "--brand: #ff5a1f;") weigh most; colours in a table cell or a long
        # listing usually DESCRIBE something else (a comparison, an example) and weigh least; skip issue numbers and
        # CLI demo values
        found = 0
        colour_words = r"colou?r|palette|brand|hex|rgb|background|foreground|primary|secondary|accent|fill|stroke|tint|theme|색상|컬러|색"
        css_decl = re.compile(r"(--[\w-]+|(?:background|bg|color|fill|stroke|border(?:-color)?|accent|primary|secondary|foreground|"
                              r"fg|text|surface|canvas)[\w-]*)\s*[:=]\s*[\"']?#[0-9a-fA-F]{3,8}\b", re.I)
        for ctx_kind, line in (colour_lines if colour_lines is not None else [("prose", ln) for ln in text.splitlines()]):
            if len(line) > 400 or found >= 24:
                continue
            low = line.lower()
            code = ctx_kind.startswith("code")
            if not code and re.search(r"(^|\s)(\$|export\s|set\s)|\s--?[a-z][\w.-]*[\s=]+['\"]?#", line):
                continue
            hexes = list(re.finditer(r"(?<![\w&/])#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![\w-])", line))
            listing = len(hexes) >= 4 and not re.search(r"palette|brand|colou?rs?\b|색상|컬러", low)
            prev_end = 0
            for m in hexes:
                h = m.group(1)
                if not re.search(r"[a-fA-F]", h) and not re.search(colour_words, low):
                    continue  # '#909' is an issue number
                if len(h) == 3 and not re.search(colour_words + r"|:\s*#", low):
                    continue
                hx = css_hex("#" + h)
                if not hx:
                    continue
                found += 1
                local = low[max(prev_end, m.start() - 40):m.start()]  # words right before this colour only
                if ctx_kind == "table":
                    local = local.rsplit("|", 1)[-1]          # this cell only (a header cell names the column, not the colour)
                prev_end = m.end()
                role, explicit = "accent", False
                decl = css_decl.search(line[max(0, m.start() - 48):m.end() + 1]) if code or ":" in local or "=" in local else None
                for r, rx in (("bg", r"background|\bbg\b|canvas|backdrop|배경"), ("ink", r"\btext\b|\bink\b|foreground|\bfg\b|body copy|본문|글자"),
                              ("accent2", r"secondary|보조"), ("accent3", r"tertiary"), ("accent", r"primary|brand|accent|\bmain\b|주 ?색"),
                              ("ok", r"success"), ("warn", r"warning"), ("deny", r"error|danger")):
                    if re.search(rx, local):
                        role, explicit = r, True
                        break
                last = re.findall(r"[a-z가-힣]+", local)[-1:]
                if not explicit and last and last[0] in ("light", "dark", "stage", "bg", "base", "backdrop", "canvas", "paper"):
                    role = "bg"                       # "light `#FFF7F2`", "stage #0A0E17": a background named by its neighbour
                if ctx_kind == "table":
                    w, how = 0.35, "table cell"
                elif code:
                    w, how = (2.4, "code declaration") if decl else (0.5, "code")
                elif explicit:
                    w, how = 3.0, "spec"
                else:
                    w, how = 1.0, "context"
                if listing:
                    w *= 0.6
                    how += ", listing"
                snippet = line[max(0, m.start() - 44):m.end() + 44].strip()
                eid = self.ev(src, "text-colour", f"{hx} written in the material ({role}, {how}, weight {w:.2f}): “{snippet}”")
                self.color(hx, w, {role: 1.0}, eid, "text" if not (code and decl) else "text-code",
                           name=f"spec:{role}" if (explicit and ctx_kind != "table") else "",
                           exact=explicit and ctx_kind != "table", src=self.disp(src))
        for m in re.finditer(r"(?:typeface|font(?:-family)?|서체|글꼴)\s*[:：]\s*[\"“]?([A-Z][\w .-]{2,40}?)[\"”]?(?:[,;.\n]|$)", text):
            eid = self.ev(src, "text-font", f"font named in the material: {m.group(1).strip()}")
            self.font(m.group(1).strip(), "body", 1.5, eid, "text")

    def add_doc(self, doc: TextDoc):
        self.docs.append(doc)
        self.flags["code_blocks"] += len(doc.code_blocks)
        self.flags["shell_cmds"] += len(extract_commands(doc.code_blocks))
        self.flags["tables"] += doc.tables
        if re.search(r"statusline|status line|status bar|statusbar|prompt theme|tmux|terminal ui|\btui\b", doc.text, re.I):
            self.flags["statusline"] += 1

    def read_markdown(self, p, entry, inside_dir):
        src = read_text(p)
        if not src.strip():
            return None
        md = parse_markdown(src)
        is_readme = bool(re.match(r"readme", p.name, re.I))
        kind = "readme" if is_readme else "markdown"
        low = md["text"].lower()
        if re.search(r"\babstract\b", low) and re.search(r"\breferences\b|\bbibliography\b", low):
            kind = "paper"
        elif len(PURPOSES["brand"].findall(md["text"])) > 6 and re.search(r"brand|logo", low):
            kind = "brand-guide"
        title = next((h for l, h in md["headings"] if l == 1 and h.strip()), "") or next((h for _, h in md["headings"]), "")
        title = re.sub(r"\s+", " ", title).strip()
        if not title:
            alts = [a for s, a in md["images"] if a and "badge" not in s]
            title = alts[0] if alts else p.stem
        doc = TextDoc(self.disp(p), kind, md["text"], md["sections"], md["headings"], md["code_blocks"], md["emphasis"], title,
                      md["links"], md["tables"], weight=1.6 if is_readme else 1.0)
        self.add_doc(doc)
        if entry.get("kind") in ("other", None) or not inside_dir:
            entry["kind"] = kind
        eid = self.ev(p, "document", f"{kind}: {count_words(md['text'])} words, {len(md['sections'])} sections, "
                                     f"{len(md['code_blocks'])} code blocks, {len(md['images'])} images")
        self._text_signals(md["text"] + "\n" + "\n".join(c for _, c in md["code_blocks"]), p, eid, colour_lines=md_colour_lines(src))
        badges = []
        for s, alt in md["images"]:
            if re.search(r"shields\.io|badgen\.net|badge\.fury|forthebadge|/badge\.svg|codecov\.io|github\.com/.+/actions", s):
                badges.append(s)
                continue
            if is_url(s) or s.startswith("data:"):
                continue
            ip = (p.parent / unquote(s.split("#")[0].split("?")[0])).resolve()
            if ip.exists() and ip.suffix.lower() in IMAGE_EXT:
                self.read_image_file(ip, entry, True, from_doc=self.disp(p))
        if badges:
            self.read_badges(badges, p)
        if not self.args.no_snapshot and (is_readme or not inside_dir) and self.flags["md_snapshots"] < 3:
            self.flags["md_snapshots"] += 1
            self.snap_inputs.append(str(p.resolve()))
            self.snap_map[str(p.resolve())] = entry
        if is_readme and not inside_dir:
            entry["notes"] = f"README, {count_words(md['text'])} words"
        return kind

    def read_badges(self, badges, p):
        styles, cols = Counter(), []
        for b in badges:
            u = urlparse(b)
            q = parse_qs(u.query)
            if "style" in q:
                styles[q["style"][0]] += 1
            c = (q.get("color") or q.get("colorB") or [None])[0]
            m = re.search(r"/badge/(.+)$", u.path)
            if not c and m:
                segs = re.split(r"(?<!-)-(?!-)", unquote(m.group(1)).replace(".svg", ""))
                c = segs[-1] if len(segs) >= 2 else None
            if c:
                named = SHIELDS_COLORS.get(c.lower())
                hx = named or css_hex(c if re.fullmatch(r"[0-9a-fA-F]{3,6}", c) is None else "#" + c)
                if hx:
                    cols.append((hx, not named))
        eid = self.ev(p, "badges", f"{len(badges)} README badges; styles {dict(styles) or 'default'}; colours "
                                   f"{sorted(set(h for h, _ in cols))[:8]} ({sum(1 for _, c in cols if c)} chosen by the author)")
        for hx, custom in cols:
            # a hand-picked hex on a badge is the author's palette; shields' named defaults ("blue") are not
            self.color(hx, 0.9 if custom else 0.3, {"accent": 0.8 if custom else 0.5}, eid, "badge", src=self.disp(p))
        self.flags["badges"] += len(badges)
        if styles.get("for-the-badge"):
            self.flags["loud_badges"] += styles["for-the-badge"]

    def read_html(self, p, entry, inside_dir):
        src = read_text(p)
        hp = _HP()
        try:
            hp.feed(src)
        except Exception:
            pass
        text = "".join(hp.text)
        chunks = [c for c in text.split("§§HEADING§§")]
        text = text.replace("§§HEADING§§", "")
        sections = [w for w in (count_words(c) for c in chunks) if w > 0]
        code_blocks = [("console" if re.search(r"^\s*\$ ", c, re.M) else "", c) for c in hp.pre]
        kind = "website"
        if len(PURPOSES["docs"].findall(text)) >= 4:
            kind = "docs"
        desc = [x["content"] for k in ("description", "og:description", "twitter:description") for x in hp.meta.get(k, []) if x.get("content")]
        doc = TextDoc(self.disp(p), kind, re.sub(r"\n{3,}", "\n\n", text), sections, hp.headings, code_blocks, desc[:1] + hp.strong,
                      hp.title or next((h for l, h in hp.headings if l == 1), p.stem), [], src.lower().count("<table"), 1.3)
        self.add_doc(doc)
        entry["kind"] = kind if not inside_dir else entry.get("kind", kind)
        eid = self.ev(p, "document", f"html ({kind}): {count_words(text)} words, {len(hp.headings)} headings, title “{doc.title[:60]}”")
        self._text_signals(text, p, eid)
        for k, lst in hp.meta.items():
            if k == "theme-color":
                for it in lst:
                    hx = css_hex(it["content"])
                    if hx:
                        e2 = self.ev(p, "meta", f"<meta theme-color> {hx}{' (' + it['media'] + ')' if it['media'] else ''}")
                        sch = "dark" if "dark" in it["media"] else "light" if "light" in it["media"] else None
                        chroma = lch_of(hex_to_lab(hx))[1]
                        self.color(hx, 3.0, {"accent": 0.9} if chroma > 15 else {"bg": 0.6}, e2, "meta", scheme=sch, exact=True)
        css_text = "\n".join(hp.styles)
        for href in hp.links:
            if is_url(href) or href.startswith("//"):
                self._google_fonts(href, p)
                continue
            cp = (p.parent / unquote(href.split("?")[0])).resolve()
            if cp.exists() and not is_secret(cp):
                self.seen_files.add(cp)
                self.read_css_text(read_text(cp), cp)
        if css_text.strip():
            self.read_css_text(css_text, p)
        if hp.inline_styles:
            self.read_css_text("x{" + ";".join(hp.inline_styles) + "}", p, inline=True)
        cls = (hp.html_attrs.get("class", "") + " " + hp.html_attrs.get("data-theme", "")).lower()
        if re.search(r"\bdark\b", cls):
            self.flags["html_dark_class"] += 1
        for s, alt in hp.imgs[:24] + [(i, "icon") for i in hp.icons[:2]]:
            if is_url(s) or s.startswith("data:"):
                continue
            ip = (p.parent / unquote(s.split("?")[0])).resolve()
            if ip.exists() and ip.suffix.lower() in IMAGE_EXT:
                self.read_image_file(ip, entry, True, from_doc=self.disp(p), hint="logo" if alt == "icon" else None)
        if not self.args.no_snapshot and self.flags["html_snapshots"] < 4:
            self.flags["html_snapshots"] += 1
            self.snap_inputs.append(str(p.resolve()))
            self.snap_map[str(p.resolve())] = entry
        return kind

    def _google_fonts(self, href, p):
        if "fonts.googleapis.com" not in href and "fonts.bunny.net" not in href:
            return
        fams = [unquote(f).split(":")[0].replace("+", " ") for f in re.findall(r"family=([^&]+)", href)]
        for f in fams:
            for ff in f.split("|"):
                eid = self.ev(p, "webfont", f"web font requested: {ff} ({urlparse(href).netloc})")
                self.font(ff, "any", 2.0, eid, "webfont")

    def read_css_file(self, p):
        self.read_css_text(read_text(p), p)
        return "css"

    def read_css_text(self, text, p, inline=False, weight_scale=1.0, fonts_only=False):
        """Tokens, key-selector colours, font families and @font-face from CSS. fonts_only: skip colours (used for
        CSS downloaded with a web page, whose colours come resolved from the browser instead)."""
        rules = css_rules(text)
        tables = {None: {}, "light": {}, "dark": {}}
        for ctx, sel, body in rules:
            if sel in ("@font-face", "@import"):
                continue
            sch = scheme_of(ctx, sel)
            for prop, val in css_decls(body):
                if prop.startswith("--"):
                    first = sel.split(",")[0].strip()
                    if ROOTISH.match(first) or inline or sch:
                        tables[sch][prop] = val
        n_tokens = 0
        colour_tokens = []
        for sch, tab in tables.items():
            merged = dict(tables[None])
            merged.update(tab)
            for name, val in tab.items():
                v = resolve_vars(val, merged).strip()
                role, shade, base = token_role(name)
                if re.search(r"font|family|typeface", name, re.I) and not re.search(r"size|weight|leading|tracking|height|spacing", name, re.I):
                    fam = [f.strip().strip("'\"") for f in v.split(",") if f.strip()]
                    if fam:
                        frole = "mono" if re.search(r"mono|code", name, re.I) else "display" if re.search(r"display|heading|title|head", name, re.I) \
                            else "serif" if re.search(r"serif", name, re.I) and "sans" not in name.lower() else "body"
                        eid = self.ev(p, "css-token", f"{name}: {v[:80]}")
                        for i, f in enumerate(fam[:3]):
                            self.font(f, frole, 2.5 / (i + 1), eid, "token")
                    continue
                if re.search(r"radius|rounded", name, re.I):
                    m = re.match(r"([\d.]+)(px|rem|em)?", v)
                    if m:
                        px = float(m.group(1)) * (16 if m.group(2) in ("rem", "em") else 1)
                        if 0 <= px <= 80:
                            self.type_info["radius"].append(px)
                    continue
                if fonts_only:
                    continue
                pc = parse_css_color(v)
                if pc is None or pc[1] < 0.5:
                    continue
                rgb_ = pc[0] if pc[1] >= 0.999 else pc[0] * pc[1] + (np.full(3, 0.07) if sch == "dark" else np.ones(3)) * (1 - pc[1])
                hx = rgb_to_hex(rgb_)
                colour_tokens.append((name, hx, role, shade, sch))
                n_tokens += 1
        if colour_tokens:
            scale = weight_scale * min(1.0, 60.0 / len(colour_tokens)) * (0.5 if inline else 1.0)
            summary = ", ".join(f"{n}={h}" for n, h, *_ in colour_tokens[:14])
            eid = self.ev(p, "css-tokens", f"{len(colour_tokens)} colour tokens{' (inline styles)' if inline else ''}: {summary}"
                                           + (" …" if len(colour_tokens) > 14 else ""))
            for name, hx, role, shade, sch in colour_tokens:
                if role is None:
                    L_, C_, _ = lch_of(hex_to_lab(hx))
                    role = "_neutral_light" if (C_ < 12 and L_ > 88) else "_neutral_dark" if (C_ < 12 and L_ < 20) else "palette" if C_ >= 12 else None
                    if role is None:
                        continue
                w = 3.0 * scale
                if shade is not None:
                    w *= 1.0 - min(abs(shade - 500), 450) / 600
                roles = {"palette": {"accent": 0.5}, "_neutral_light": {"bg": 0.5}, "_neutral_dark": {"ink": 0.4}}.get(role, {role: 1.0})
                self.color(hx, w, roles, eid, "token", name=name, scheme=sch, exact=True, src=self.disp(p))
            dark_tokens = sum(1 for *_, s in colour_tokens if s == "dark")
            if dark_tokens:
                self.flags["css_dark_scheme"] += 1
        # declarations on key selectors (works for CSS without custom properties too)
        root_tab = dict(tables[None])
        for ctx, sel, body in rules:
            if sel == "@font-face":
                fam, srcs, wt = "", [], None
                for prop, val in css_decls(body):
                    if prop == "font-family":
                        fam = val.strip("'\" ")
                    elif prop == "src":
                        srcs = re.findall(r"url\(\s*[\"']?([^\"')]+)", val)
                    elif prop == "font-weight":
                        wt = val
                if fam:
                    eid = self.ev(p, "font-face", f"@font-face {fam} ({len(srcs)} src)")
                    local = None
                    for s in srcs:
                        if not is_url(s) and not s.startswith("data:"):
                            fp = (Path(p).parent / unquote(s)).resolve()
                            if fp.exists():
                                local = str(fp)
                                self.font_files.append({"family": fam, "path": str(fp), "weight": wt or "400"})
                                break
                    self.font(fam, "any", 2.0, eid, "font-face", file=local)
                continue
            if sel == "@import":
                self._google_fonts(body, p)
                continue
            sch = scheme_of(ctx, sel)
            s0 = sel.lower()
            is_root = bool(re.match(r"^(html|body|:root|main|#root|#app|\.app|\.page|\.wrapper)(\s*,|$)", s0)) or bool(
                re.search(r"(^|,)\s*(html|body)\s*(,|$)", s0))
            is_head = bool(re.search(r"(^|[\s,>])(h1|h2|\.title|\.headline|\.hero[\w-]*|\.display[\w-]*)\b", s0))
            is_code = bool(re.search(r"(^|[\s,>])(code|pre|kbd|samp|\.mono|\.code)\b", s0))
            is_btn = bool(re.search(r"(^|[\s,>])(button|\.btn[\w-]*|\.button[\w-]*|\.cta[\w-]*)\b", s0))
            is_link = bool(re.match(r"^a(\s*,|$|:)", s0))
            is_card = bool(re.search(r"\.(card|panel|tile|surface)\b", s0))
            for prop, val in css_decls(body):
                v = resolve_vars(val, root_tab).strip()
                if prop == "font-family" and (is_root or is_head or is_code):
                    fam = [f.strip().strip("'\"") for f in v.split(",") if f.strip()]
                    if fam:
                        eid = self.ev(p, "css-font", f"{sel[:40]} {{ font-family: {v[:70]} }}")
                        for i, f in enumerate(fam[:3]):
                            self.font(f, "mono" if is_code else "display" if is_head else "body", 2.2 / (i + 1), eid, "css")
                elif prop == "font-weight" and is_head:
                    try:
                        self.type_info["heading_weight"].append(int({"bold": "700", "normal": "400", "bolder": "800"}.get(v, v)))
                    except ValueError:
                        pass
                elif prop == "border-radius" and (is_btn or is_card):
                    m = re.match(r"([\d.]+)(px|rem|em)?", v)
                    if m:
                        self.type_info["radius"].append(float(m.group(1)) * (16 if m.group(2) in ("rem", "em") else 1))
                elif prop in ("background", "background-color", "color") and (is_root or is_head or is_btn or is_link or is_card) and not fonts_only:
                    if "gradient" in v:
                        cols = [css_hex(c) for c in re.findall(r"#[0-9a-fA-F]{3,8}|rgba?\([^)]*\)|hsla?\([^)]*\)", v)]
                        cols = [c for c in cols if c]
                    else:
                        cols = [css_hex(v.split(" ")[0] if prop == "background" and not v.startswith(("rgb", "hsl", "#")) else v)]
                        cols = [c for c in cols if c]
                    for hx in cols[:3]:
                        bgp = prop != "color"
                        if is_root:
                            roles = {"bg": 1.0} if bgp else {"ink": 1.0}
                        elif is_btn:
                            roles = {"accent": 1.0} if bgp else {"onAccent": 1.0}
                        elif is_link:
                            roles = {"accent": 0.9}
                        elif is_card:
                            roles = {"surface": 1.0} if bgp else {"ink": 0.5}
                        else:
                            roles = {"ink": 0.6, "accent": 0.5} if not bgp else {"accent": 0.6}
                        eid = self.ev(p, "css-rule", f"{sel[:40]} {{ {prop}: {v[:50]} }} -> {hx}")
                        self.color(hx, 2.4 * weight_scale, roles, eid, "css", scheme=sch, exact=True, src=self.disp(p))

    def read_tailwind(self, p):
        src = read_text(p)
        found = []

        def block(after):
            m = re.search(after + r"\s*:\s*\{", src)
            if not m:
                return ""
            i, depth = m.end(), 1
            while i < len(src) and depth:
                depth += {"{": 1, "}": -1}.get(src[i], 0)
                i += 1
            return src[m.end():i - 1]

        for colors in (block("colors"), block(r"extend\s*:\s*\{[\s\S]*?colors")):
            for m in re.finditer(r"['\"]?([\w-]+)['\"]?\s*:\s*['\"](#[0-9a-fA-F]{3,8}|rgb[^'\"]+|hsl[^'\"]+|oklch[^'\"]+)['\"]", colors):
                found.append((m.group(1), m.group(2)))
            for m in re.finditer(r"['\"]?([\w-]+)['\"]?\s*:\s*\{([^{}]*)\}", colors):
                inner = dict(re.findall(r"['\"]?([\w-]+)['\"]?\s*:\s*['\"](#[0-9a-fA-F]{3,8})['\"]", m.group(2)))
                pick = inner.get("DEFAULT") or inner.get("500") or inner.get("600") or (list(inner.values())[len(inner) // 2] if inner else None)
                if pick:
                    found.append((m.group(1), pick))
        if found:
            eid = self.ev(p, "tailwind", "tailwind colours: " + ", ".join(f"{k}={v}" for k, v in found[:12]))
            for k, v in found:
                hx = css_hex(v)
                if not hx:
                    continue
                role, _, _ = token_role("--" + k)
                L_, C_, _ = lch_of(hex_to_lab(hx))
                roles = ({role: 1.0} if role and role != "palette" else {"bg": 0.5} if (C_ < 12 and L_ > 88) else
                         {"ink": 0.4} if (C_ < 12 and L_ < 20) else {"accent": 0.6})
                self.color(hx, 2.5, roles, eid, "token", name=k, exact=True, src=self.disp(p))
        fams = block("fontFamily")
        for m in re.finditer(r"['\"]?(\w+)['\"]?\s*:\s*\[([^\]]*)\]", fams):
            names = [x.strip().strip("'\"") for x in m.group(2).split(",") if x.strip()]
            if names:
                eid = self.ev(p, "tailwind", f"fontFamily.{m.group(1)}: {', '.join(names[:3])}")
                role = "mono" if m.group(1) == "mono" else "serif" if m.group(1) == "serif" else "display" if m.group(1) in (
                    "display", "heading", "title") else "body"
                self.font(names[0], role, 2.5, eid, "token")
        return "tailwind" if found or fams else None

    def read_json(self, p, entry):
        try:
            data = json.loads(read_text(p))
        except Exception:
            return None
        if not isinstance(data, dict):
            return None
        if p.name == "package.json":
            desc = data.get("description") or ""
            kws = data.get("keywords") or []
            eid = self.ev(p, "package", f"name {data.get('name')}, description “{desc[:100]}”, keywords {kws[:8]}")
            if desc:
                self.add_doc(TextDoc(self.disp(p), "other", desc + ". " + " ".join(map(str, kws)), [count_words(desc)], [], [], [desc],
                                     str(data.get("name") or ""), [], 0, 0.6))
            if data.get("bin"):
                self.flags["cli_bin"] += 1
            return "package"
        if "colors" in data and isinstance(data["colors"], dict) and ("tokenColors" in data or "editor.background" in data["colors"]):
            c = data["colors"]
            bg, fg = css_hex(c.get("editor.background")), css_hex(c.get("editor.foreground") or c.get("foreground"))
            acc = [css_hex(c.get(k)) for k in ("button.background", "focusBorder", "activityBarBadge.background", "textLink.foreground")]
            ansi = [css_hex(c.get(f"terminal.ansi{n}")) for n in ("Black", "Red", "Green", "Yellow", "Blue", "Magenta", "Cyan", "White",
                                                                   "BrightBlack", "BrightRed", "BrightGreen", "BrightYellow", "BrightBlue",
                                                                   "BrightMagenta", "BrightCyan", "BrightWhite")]
            eid = self.ev(p, "editor-theme", f"VS Code theme “{data.get('name', p.stem)}”: bg {bg} fg {fg}")
            self._terminal_palette(p, eid, bg, fg, ansi, name=data.get("name", p.stem), accents=[a for a in acc if a])
            return "theme"
        if "schemes" in data and isinstance(data["schemes"], list):
            for s in data["schemes"][:3]:
                ansi = [css_hex(s.get(k)) for k in ("black", "red", "green", "yellow", "blue", "purple", "cyan", "white", "brightBlack",
                                                     "brightRed", "brightGreen", "brightYellow", "brightBlue", "brightPurple", "brightCyan",
                                                     "brightWhite")]
                eid = self.ev(p, "terminal-theme", f"Windows Terminal scheme “{s.get('name')}”")
                self._terminal_palette(p, eid, css_hex(s.get("background")), css_hex(s.get("foreground")), ansi, name=s.get("name"))
            return "theme"
        if p.name in ("manifest.json", "site.webmanifest"):
            for k in ("theme_color", "background_color"):
                hx = css_hex(data.get(k))
                if hx:
                    eid = self.ev(p, "manifest", f"{k} {hx}")
                    self.color(hx, 2.5, {"accent": 0.9} if k == "theme_color" else {"bg": 0.8}, eid, "meta", exact=True)
            return "manifest"
        return None

    def _terminal_palette(self, p, eid, bg, fg, ansi, name=None, accents=None):
        ansi = [a for a in (ansi or [])]
        valid = [a for a in ansi if a]
        if not (bg or len(valid) >= 6):
            return
        matched = match_theme_by_palette(bg, fg) if bg else None
        self.terminal.append({"name": name or matched or Path(p).stem, "bg": bg, "fg": fg, "ansi": ansi if len(valid) >= 8 else None,
                              "match": matched, "eid": eid, "src": self.disp(p)})
        if matched:
            self.theme_mentions[matched] += 3
        if bg:
            self.color(bg, 1.8, {"bg": 0.9}, eid, "terminal", scheme="dark" if rel_lum(hex_to_rgb(bg)) < 0.2 else "light", exact=True)
        if fg:
            self.color(fg, 1.6, {"ink": 0.9}, eid, "terminal", scheme="dark" if bg and rel_lum(hex_to_rgb(bg)) < 0.2 else None, exact=True)
        for a in (accents or []) + [x for x in valid[1:7] if x]:
            self.color(a, 0.8, {"accent": 0.5}, eid, "terminal", exact=True)
        self.flags["terminal_theme"] += 1

    def read_terminal_conf(self, p):
        if p.suffix.lower() == ".itermcolors":
            try:
                pl = plistlib.loads(p.read_bytes())
            except Exception:
                return None
            def c(k):
                d = pl.get(k)
                return rgb_to_hex([d.get("Red Component", 0), d.get("Green Component", 0), d.get("Blue Component", 0)]) if d else None
            eid = self.ev(p, "terminal-theme", f"iTerm colours {p.stem}")
            self._terminal_palette(p, eid, c("Background Color"), c("Foreground Color"), [c(f"Ansi {i} Color") for i in range(16)], name=p.stem)
            return "terminal"
        text = read_text(p, 300_000)
        bg = fg = None
        ansi = [None] * 16
        section = ""
        names = ["black", "red", "green", "yellow", "blue", "magenta", "cyan", "white"]
        for line in text.splitlines():
            ls = line.strip()
            if not ls or ls.startswith(("#", "!", "//", ";")):
                continue
            sec = re.match(r"^\[(?:colors\.)?(\w+)\]$", ls) or re.match(r"^(primary|normal|bright)\s*:\s*$", ls)
            if sec:
                section = sec.group(1).lower()
                continue
            m = re.match(r"^(?:\*\.?|\w+\*\.?)?(background|foreground|color(\d{1,2})|palette)\s*[:= ]\s*['\"]?(.+?)['\"]?\s*$", ls, re.I)
            if m:
                key, idx, val = m.group(1).lower(), m.group(2), m.group(3).strip()
                if key == "palette":
                    mm = re.match(r"(\d{1,2})\s*=\s*(#?[0-9a-fA-F]{6})", val)
                    if mm and int(mm.group(1)) < 16:
                        ansi[int(mm.group(1))] = css_hex(mm.group(2) if mm.group(2).startswith("#") else "#" + mm.group(2))
                    continue
                hx = css_hex(val.split()[0].replace("0x", "#"))
                if key == "background" and hx:
                    bg = hx
                elif key == "foreground" and hx:
                    fg = hx
                elif idx and hx and int(idx) < 16:
                    ansi[int(idx)] = hx
                continue
            m = re.match(r"^['\"]?(black|red|green|yellow|blue|magenta|cyan|white|background|foreground)['\"]?\s*[:=]\s*['\"]?(?:#|0x)([0-9a-fA-F]{6})", ls, re.I)
            if m:
                k, hx = m.group(1).lower(), "#" + m.group(2)
                if k == "background" and section in ("", "primary"):
                    bg = css_hex(hx)
                elif k == "foreground" and section in ("", "primary"):
                    fg = css_hex(hx)
                elif k in names:
                    ansi[names.index(k) + (8 if section == "bright" else 0)] = css_hex(hx)
            m = re.match(r"^base0([0-9A-Fa-f])\s*:\s*['\"]?#?([0-9a-fA-F]{6})", ls)
            if m:
                i = int(m.group(1), 16)
                hx = "#" + m.group(2)
                if i == 0:
                    bg = css_hex(hx)
                elif i == 5:
                    fg = css_hex(hx)
                mapping = {8: 1, 11: 2, 10: 3, 13: 4, 14: 5, 12: 6}
                if i in mapping:
                    ansi[mapping[i]] = ansi[mapping[i] + 8] = css_hex(hx)
        if bg or sum(1 for a in ansi if a) >= 6:
            eid = self.ev(p, "terminal-theme", f"terminal palette {p.name}: bg {bg} fg {fg}, {sum(1 for a in ansi if a)}/16 ANSI colours")
            self._terminal_palette(p, eid, bg, fg, ansi, name=p.stem)
            return "terminal"
        return None

    def read_font_file(self, p):
        try:
            from fontTools.ttLib import TTFont
            f = TTFont(str(p), lazy=True, fontNumber=0)
            fam = f["name"].getDebugName(16) or f["name"].getDebugName(1)
            sty = f["name"].getDebugName(17) or f["name"].getDebugName(2) or "Regular"
        except Exception:
            fam, sty = p.stem.split("-")[0], "Regular"
        if not fam:
            return None
        wt = 700 if re.search(r"bold", sty, re.I) else 400
        lic = font_license(p)
        eid = self.ev(p, "font-file", f"font file in the material: {fam} {sty} (license: {lic})")
        self.font(fam, "any", 1.5, eid, "font-file", file=str(p))
        self.font_files.append({"family": fam, "path": str(p), "weight": str(wt), "license": lic})
        return "font"

    # images ------------------------------------------------------------------------
    def read_image_file(self, p, entry, inside_dir=False, from_doc=None, hint=None):
        rp = Path(p).resolve()
        if self.image_budget <= 0 or rp in self.seen_images:
            return None
        self.seen_images.add(rp)
        im = load_image(p)
        if im is None:
            return None
        if min(im.size) < 24:
            return None
        self.image_budget -= 1
        return self.add_image(im, str(p), self.disp(p), hint=hint, from_doc=from_doc, entry=None if inside_dir else entry)

    def add_image(self, im, path, label, hint=None, from_doc=None, entry=None, weight_scale=1.0, renderer_colors=None, scheme=None):
        a = analyze_image(im, Path(label).name, hint)
        if a is None:
            return None
        cls = a["cls"]
        cw = CLASS_WEIGHTS.get(cls, CLASS_WEIGHTS["image"])
        top = ", ".join(f"{c['hex']} {c['share'] * 100:.0f}%" for c in a["clusters"][:6])
        eid = self.ev(path, "image", f"{cls} {a['w']}x{a['h']}{' (cutout)' if a['cutout'] else ''}: {top}",
                      {"cls": cls, "flat": a["flat"], "alpha": a["alpha"], "stats": a["stats"]})
        a.update({"eid": eid, "label": label, "path": path, "from": from_doc})
        self.images.append(a)
        self.flags[f"img_{cls}"] += 1
        if entry is not None:
            entry["kind"] = "images" if entry.get("kind") in ("other", None) else entry["kind"]
            entry["notes"] = f"{cls} image {a['w']}x{a['h']}"
        bgc = max(a["clusters"], key=lambda c: c["border"] + c["share"] * 0.5) if a["clusters"] and not a["cutout"] else None
        for c in a["clusters"]:
            if renderer_colors and any(dE(c["hex"], rc) < 3.0 for rc in renderer_colors):
                continue
            share, C = c["share"], c["C"]
            if share < 0.004 or (share < 0.012 and C < 35):
                continue
            chroma_pen = 1.0 if C < 12 else 0.75 if C < 25 else 0.4 if C < 40 else 0.15
            bgness = clamp(max(share * 1.6, c["border"] * 1.1)) * chroma_pen
            inkness = 0.0
            if bgc is not None and c is not bgc and C < 32 and 0.003 <= share <= 0.35:
                ct = contrast(c["hex"], bgc["hex"])
                inkness = 1.0 if ct >= 4.5 else 0.35 if ct >= 3 else 0.0
            elif a["cutout"] and c["L"] < 35 and C < 25 and 0.003 <= share <= 0.2:
                inkness = 0.8  # eyes, outlines, lettering of a logo or mascot
            accentness = clamp((C - 12) / 45) * clamp(share / 0.02) ** 0.5 * (0.5 if c is bgc else 1.0)
            roles = {"bg": cw["bg"] * bgness, "ink": cw["ink"] * inkness, "accent": cw["accent"] * accentness}
            roles = {k: round(v, 3) for k, v in roles.items() if v > 0.02}
            if roles:
                self.color(c["hex"], cw["w"] * weight_scale * math.sqrt(share), roles, eid, "image" if cls != "render" else "render",
                           scheme=scheme, src=label)
        if cls in ("logo", "mascot", "cutout"):
            self.flags["cutouts"] += 1
        return cls

    # PDF ------------------------------------------------------------------------
    def read_pdf(self, p, entry, inside_dir, kind_hint=None, rendered_from=None):
        label = self.disp(rendered_from or p)
        if fitz is None:
            return self.read_pdf_poppler(p, entry, kind_hint, label)
        doc = fitz.open(str(p))
        n = len(doc)
        texts, wpp = [], []
        span_cols, font_chars, size_chars, bold_size = Counter(), Counter(), Counter(), Counter()
        fig_cols = Counter()
        landscape = 0
        title_spans = []
        for i, page in enumerate(doc):
            if i >= 80:
                break
            r = page.rect
            landscape += r.width > r.height * 1.15
            t = page.get_text("text")
            texts.append(t)
            wpp.append(count_words(t))
            if i < 16:
                d = page.get_text("dict")
                for b in d.get("blocks", []):
                    for l in b.get("lines", []):
                        for s in l.get("spans", []):
                            txt = s.get("text", "").strip()
                            if not txt:
                                continue
                            k = len(txt)
                            span_cols["#%06X" % (s.get("color", 0) & 0xFFFFFF)] += k
                            fam, bold, italic = pdf_family(s.get("font", ""))
                            flags = s.get("flags", 0)
                            bold = bold or bool(flags & 16)
                            if fam:
                                font_chars[(fam, round(s.get("size", 0)))] += k
                            sz = round(s.get("size", 0) * 2) / 2
                            size_chars[sz] += k
                            if bold:
                                bold_size[sz] += k
                            if i == 0:
                                title_spans.append((s.get("size", 0), txt, fam))
                if kind_hint != "slides":
                    try:
                        for dr in page.get_drawings():
                            rect = dr.get("rect")
                            area = (rect.width * rect.height) if rect else 0
                            if dr.get("fill") is not None and area > 4:
                                fig_cols[rgb_to_hex(dr["fill"])] += min(area, r.width * r.height * 0.3) * (dr.get("fill_opacity") or 1)
                            if dr.get("color") is not None and rect is not None:
                                fig_cols[rgb_to_hex(dr["color"])] += (rect.width + rect.height) * max(0.5, dr.get("width") or 1) * 3
                    except Exception:
                        pass
                    if self.image_budget > 0:
                        for im_info in page.get_images(full=True)[:4]:
                            try:
                                pix = fitz.Pixmap(doc, im_info[0])
                                if pix.width < 120 or pix.height < 120:
                                    continue
                                if pix.n - pix.alpha >= 4:
                                    pix = fitz.Pixmap(fitz.csRGB, pix)
                                pim = Image.open(BytesIO(pix.tobytes("png"))).convert("RGBA")
                                self.image_budget -= 1
                                self.add_image(pim, str(p), f"{label}#p{i + 1}-img{im_info[0]}", hint=None)
                            except Exception:
                                continue
        full_text = "\n".join(texts)
        low = full_text.lower()
        kind = kind_hint or ("paper" if (re.search(r"\babstract\b", low) and re.search(r"\breferences\b|\bbibliography\b", low))
                             or len(LEX["citation"].findall(full_text)) >= 6 else
                             "slides" if landscape >= max(1, n * 0.6) and (sum(wpp) / max(1, len(wpp))) < 90 else
                             "brand-guide" if len(PURPOSES["brand"].findall(full_text)) > 10 else "other")
        meta_title = (doc.metadata or {}).get("title") or ""
        title = meta_title
        if not title and title_spans:
            mx = max(s for s, _, _ in title_spans)
            title = " ".join(t for s, t, _ in title_spans if s >= mx - 0.5)[:160]
        # sections: headings found as short lines in larger/bold type
        body_size = max(size_chars, key=size_chars.get) if size_chars else 10
        heads = []
        for s_, t_, _ in title_spans:
            if s_ > body_size * 1.15 and len(t_) < 120:
                if heads and abs(heads[-1][2] - s_) < 0.3 and len(heads[-1][1]) < 160:
                    heads[-1] = (1, heads[-1][1] + " " + t_, s_)
                else:
                    heads.append((1, t_, s_))
        heads = [(lv, t_) for lv, t_, _ in heads]
        emph = [t for _, t in heads[:6]] if kind == "slides" else []
        if kind == "paper":
            mabs = re.search(r"\babstract\b[\s.:—-]*(.{40,1200}?[.!?])(?:\s|$)", full_text, re.I | re.S)
            if mabs:
                emph = [re.sub(r"\s+", " ", mabs.group(1)).strip()]
        doc_t = TextDoc(label, kind, full_text, wpp, heads, [], emph, title, [], 0, 1.4)
        self.add_doc(doc_t)
        entry["kind"] = kind if not inside_dir or entry.get("kind") in ("other", None) else entry["kind"]
        eid = self.ev(p, "document", f"pdf ({kind}): {n} pages, {sum(wpp)} words, {round(sum(wpp) / max(1, len(wpp)))} words/page, "
                                     f"title “{title[:70]}”")
        if not inside_dir:
            entry["notes"] = f"{kind}, {n} pages"
        self._text_signals(full_text, p, eid)
        self.flags["pdf_pages"] += n
        # typography
        if font_chars:
            body_font = max(font_chars, key=font_chars.get)[0]
            fams = Counter()
            for (fam, sz), k in font_chars.items():
                fams[fam] += k
            head_fams = Counter()
            for (fam, sz), k in font_chars.items():
                if sz >= body_size * 1.15:
                    head_fams[fam] += k * sz
            eid_f = self.ev(p, "pdf-fonts", f"body font {body_font} at {body_size}pt; fonts " +
                            ", ".join(f"{f} {k}" for f, k in fams.most_common(5)))
            self.font(body_font, "body", 3.0, eid_f, "pdf")
            if head_fams:
                self.font(max(head_fams, key=head_fams.get), "display", 2.5, eid_f, "pdf")
            for fam, k in fams.most_common(6):
                if font_category(fam) == "mono":
                    self.font(fam, "mono", 1.5, eid_f, "pdf")
            big = max(size_chars) if size_chars else body_size
            self.type_info["sizes"].append((body_size, big))
            self.type_info["heading_ratio"].append(big / max(1, body_size))
            if bold_size:
                self.type_info["heading_weight"].append(700 if sum(bold_size.values()) > 0.02 * sum(size_chars.values()) else 400)
        if span_cols:
            tot = sum(span_cols.values())
            eid_c = self.ev(p, "pdf-text-colours", "text colours by characters: " + ", ".join(f"{h} {k / tot * 100:.0f}%" for h, k in span_cols.most_common(5)))
            for hx, k in span_cols.most_common(6):
                share = k / tot
                C = lch_of(hex_to_lab(hx))[1]
                roles = {"ink": 1.0} if C < 25 else {"accent": 0.8, "ink": 0.2}
                self.color(hx, 2.5 * math.sqrt(share), roles, eid_c, "computed", exact=True, src=label)
        if fig_cols:
            tot = sum(fig_cols.values())
            chrom = [(h, v) for h, v in fig_cols.most_common(40) if lch_of(hex_to_lab(h))[1] > 14]
            if chrom:
                ctot = sum(v for _, v in chrom)
                eid_g = self.ev(p, "pdf-figure-colours", "vector figure palette: " + ", ".join(f"{h} {v / ctot * 100:.0f}%" for h, v in chrom[:8]))
                for hx, v in chrom[:8]:
                    self.color(hx, 1.6 * math.sqrt(v / ctot), {"accent": 0.85}, eid_g, "figure", exact=True, src=label)
                self.flags["pdf_figures"] += len(chrom)
        # rasterise pages for area statistics and the board
        self.snapdir.mkdir(parents=True, exist_ok=True)
        slug = slugify(Path(label).stem, 30) + "-" + short_hash(label)
        for i, page in enumerate(doc):
            if i >= (8 if kind != "slides" else 12):
                break
            scale = 0.6 if page.rect.width > 700 else 0.75
            pix = page.get_pixmap(matrix=fitz.Matrix(scale, scale), alpha=False)
            out = self.snapdir / f"{slug}-p{i + 1:02d}.png"
            pix.save(str(out))
            pim = Image.open(out).convert("RGBA")
            self.add_image(pim, str(out), self.disp(out), hint="render", weight_scale=1.0 / max(1.0, math.sqrt(min(n, 8))))
            if i == 0:
                self.flags["first_page_" + slug] += 1
        doc.close()
        return kind

    def read_pdf_poppler(self, p, entry, kind_hint, label):
        txt = ""
        if shutil.which("pdftotext"):
            txt = subprocess.run(["pdftotext", "-layout", str(p), "-"], capture_output=True, text=True, timeout=120).stdout
        pages = max(1, txt.count("\f"))
        kind = kind_hint or ("paper" if re.search(r"\babstract\b", txt, re.I) and re.search(r"\breferences\b", txt, re.I) else "other")
        self.add_doc(TextDoc(label, kind, txt, [count_words(x) for x in txt.split("\f") if x.strip()], [], [], [], p.stem, [], 0, 1.4))
        eid = self.ev(p, "document", f"pdf ({kind}) via poppler: {pages} pages")
        self._text_signals(txt, p, eid)
        if shutil.which("pdffonts"):
            out = subprocess.run(["pdffonts", str(p)], capture_output=True, text=True, timeout=60).stdout.splitlines()[2:]
            fams = Counter(pdf_family(l.split()[0])[0] for l in out if l.strip())
            if fams:
                eid_f = self.ev(p, "pdf-fonts", "pdffonts: " + ", ".join(fams))
                for f, _ in fams.most_common(3):
                    self.font(f, "body", 2.0, eid_f, "pdf")
        if shutil.which("pdftoppm"):
            self.snapdir.mkdir(parents=True, exist_ok=True)
            slug = slugify(Path(label).stem, 30) + "-" + short_hash(label)
            subprocess.run(["pdftoppm", "-r", "40", "-l", "6", "-png", str(p), str(self.snapdir / slug)], capture_output=True, timeout=120)
            for out in sorted(self.snapdir.glob(slug + "-*.png"))[:6]:
                self.add_image(Image.open(out).convert("RGBA"), str(out), self.disp(out), hint="render", weight_scale=0.5)
        entry["kind"] = kind
        return kind

    # slides ------------------------------------------------------------------------
    def read_keynote(self, p, entry):
        """Keynote: its own preview renders and placed images (zip package or bundle). Text and theme need a PDF export."""
        got = 0
        try:
            if p.is_dir():
                cands = [x for x in (p / "preview.jpg", p / "QuickLook" / "Thumbnail.jpg", p / "preview-web.jpg") if x.exists()]
                cands += sorted((x for x in (p / "Data").glob("*") if x.suffix.lower() in (".png", ".jpg", ".jpeg")),
                                key=lambda x: -x.stat().st_size)[:6] if (p / "Data").is_dir() else []
                blobs = [(x.name, x.read_bytes()) for x in cands]
            else:
                z = zipfile.ZipFile(str(p))
                names = z.namelist()
                pv = [n for n in ("preview.jpg", "QuickLook/Thumbnail.jpg", "preview-web.jpg") if n in names]
                data = sorted((i for i in z.infolist() if i.filename.startswith("Data/") and i.filename.lower().endswith((".png", ".jpg", ".jpeg"))),
                              key=lambda i: -i.file_size)[:6]
                blobs = [(n, z.read(n)) for n in pv] + [(i.filename, z.read(i.filename)) for i in data]
        except (OSError, zipfile.BadZipFile, KeyError) as e:
            warn(f"{self.disp(p)}: Keynote package not readable ({e})", self)
            blobs = []
        for name, b in blobs:
            im = load_image(b, Path(name).name)
            if im is None or min(im.size) < 48:
                continue
            self.add_image(im, f"{p}#{name}", f"{self.disp(p)}#{Path(name).name}", hint="render" if "preview" in name.lower() or "Thumbnail" in name else None)
            got += 1
        entry["notes"] = (f"Keynote: {got} preview/placed image(s) read; export to PDF (File > Export To > PDF) for text, "
                          "fonts and every slide")
        warn(f"{self.disp(p)}: Keynote decks cannot be converted here; export to PDF from Keynote and pass the PDF too", self)
        return "slides" if got else None

    def read_slides(self, p, entry, inside_dir):
        ext = p.suffix.lower()
        label = self.disp(p)
        kind = "slides"
        if ext == ".key":
            got = self.read_keynote(p, entry)
            if not self.soffice_pdf_ok_for_key:
                if not inside_dir or entry.get("kind") in ("other", None):
                    entry["kind"] = "slides"
                return got
        if ext in (".pptx", ".potx"):
            kind = self.read_pptx(p, entry)
        pdf = self.soffice_pdf(p)
        if pdf:
            n_before = len(self.docs)
            self.read_pdf(pdf, entry, True, kind_hint="slides", rendered_from=p)
            if ext in (".pptx", ".potx") and len(self.docs) > n_before:
                self.docs.pop()  # text already read from the slide XML
        elif ext not in (".pptx", ".potx"):
            warn(f"{label}: soffice not available; {ext} could not be analysed", self)
        entry["kind"] = kind if not inside_dir or entry.get("kind") in ("other", None) else entry["kind"]
        return kind

    def soffice_pdf(self, p):
        so = shutil.which("soffice") or shutil.which("libreoffice")
        if not so:
            mac = Path("/Applications/LibreOffice.app/Contents/MacOS/soffice")
            so = str(mac) if mac.exists() else None
        if not so:
            return None
        self.snapdir.mkdir(parents=True, exist_ok=True)
        try:
            with tempfile.TemporaryDirectory() as td:
                prof = Path(td) / "profile"
                r = subprocess.run([so, f"-env:UserInstallation={prof.as_uri()}", "--headless", "--convert-to", "pdf", "--outdir", td, str(p)],
                                   capture_output=True, text=True, timeout=240)
                out = Path(td) / (p.stem + ".pdf")
                if out.exists():
                    dst = self.snapdir / f"{slugify(p.stem, 30)}-{short_hash(str(p))}.pdf"
                    shutil.copy(out, dst)
                    return dst
                warn(f"soffice could not convert {self.disp(p)}: {(r.stderr or r.stdout)[-160:]}", self)
        except Exception as e:
            warn(f"soffice failed for {self.disp(p)}: {e}", self)
        return None

    def _ooxml_theme(self, z, prefer=None):
        A = "{http://schemas.openxmlformats.org/drawingml/2006/main}"
        names = [n for n in z.namelist() if re.match(r"(ppt|word|xl)/theme/theme\d+\.xml$", n)]
        if prefer and prefer in names:
            names.remove(prefer)
            names.insert(0, prefer)
        if not names:
            return None
        root = ET.fromstring(z.read(names[0]))
        clr = {}
        cs = root.find(f".//{A}clrScheme")
        if cs is not None:
            for ch in cs:
                tag = ch.tag.replace(A, "")
                s = ch.find(f"{A}srgbClr")
                y = ch.find(f"{A}sysClr")
                v = s.get("val") if s is not None else (y.get("lastClr") if y is not None else None)
                if v:
                    clr[tag] = "#" + v.upper()
        fonts = {}
        fs = root.find(f".//{A}fontScheme")
        if fs is not None:
            for key in ("majorFont", "minorFont"):
                f = fs.find(f"{A}{key}")
                if f is None:
                    continue
                lat = f.find(f"{A}latin")
                ea = f.find(f"{A}ea")
                fonts[key] = {"latin": lat.get("typeface") if lat is not None else "", "ea": ea.get("typeface") if ea is not None else ""}
                for sf in f.findall(f"{A}font"):
                    if sf.get("script") in ("Hang", "Jpan", "Hans", "Hant"):
                        fonts[key][sf.get("script")] = sf.get("typeface")
        acc = [clr.get(f"accent{i}", "").upper() for i in range(1, 7)]
        stock = any(sum(1 for x in acc if x in st) >= 4 for st in STOCK_THEME_ACCENTS)
        return {"part": names[0], "name": (cs.get("name") if cs is not None else ""), "colors": clr, "fonts": fonts, "stock": stock}

    def read_pptx(self, p, entry):
        A = "{http://schemas.openxmlformats.org/drawingml/2006/main}"
        PNS = "{http://schemas.openxmlformats.org/presentationml/2006/main}"
        z = zipfile.ZipFile(str(p))
        names = z.namelist()
        master_theme = None
        try:
            rels = z.read("ppt/slideMasters/_rels/slideMaster1.xml.rels").decode("utf8")
            m = re.search(r'Target="\.\./theme/(theme\d+\.xml)"', rels)
            master_theme = f"ppt/theme/{m.group(1)}" if m else None
        except KeyError:
            pass
        theme = self._ooxml_theme(z, master_theme) or {"colors": {}, "fonts": {}, "name": ""}
        alias = {"bg1": "lt1", "tx1": "dk1", "bg2": "lt2", "tx2": "dk2"}

        def col_of(el):
            if el is None:
                return None
            s = el.find(f"{A}srgbClr")
            if s is not None:
                return "#" + s.get("val", "000000").upper()
            sc = el.find(f"{A}schemeClr")
            if sc is not None:
                k = alias.get(sc.get("val"), sc.get("val"))
                return ("scheme", k)
            return None

        slides = sorted([n for n in names if re.match(r"ppt/slides/slide\d+\.xml$", n)], key=lambda s: int(re.findall(r"\d+", s)[-1]))
        bg_use, text_use, fill_use, sizes, bolds = Counter(), Counter(), Counter(), Counter(), Counter()
        words, titles, all_text, fonts_used = [], [], [], Counter()
        master_bg = None
        try:
            mroot = ET.fromstring(z.read("ppt/slideMasters/slideMaster1.xml"))
            bgp = mroot.find(f".//{PNS}bg")
            if bgp is not None:
                master_bg = col_of(bgp.find(f".//{A}solidFill")) or col_of(bgp.find(f".//{PNS}bgRef"))
        except Exception:
            pass
        for sn in slides:
            root = ET.fromstring(z.read(sn))
            paras = ["".join(t.text or "" for t in para.iter(f"{A}t")).strip() for para in root.iter(f"{A}p")]
            st = "\n\n".join(x for x in paras if x)
            all_text.append(st)
            words.append(count_words(st))
            bg = root.find(f".//{PNS}bg")
            c = col_of(bg.find(f".//{A}solidFill")) if bg is not None else None
            if c is None and bg is not None:
                c = col_of(bg.find(f".//{PNS}bgRef"))
            bg_use[str(c or master_bg or ("scheme", "lt1"))] += 1
            for sp in root.iter(f"{PNS}sp"):
                ph = sp.find(f".//{PNS}ph")
                if ph is not None and ph.get("type") in ("title", "ctrTitle"):
                    tt = " ".join(t.text for t in sp.iter(f"{A}t") if t.text)
                    if tt:
                        titles.append(tt)
                sppr = sp.find(f"{PNS}spPr")
                if sppr is not None:
                    fc = col_of(sppr.find(f"{A}solidFill"))
                    if fc:
                        fill_use[str(fc)] += 1
                for r in sp.iter(f"{A}r"):
                    rpr = r.find(f"{A}rPr")
                    t = r.find(f"{A}t")
                    n = len(t.text) if t is not None and t.text else 0
                    if rpr is None or not n:
                        continue
                    c = col_of(rpr.find(f"{A}solidFill"))
                    if c:
                        text_use[str(c)] += n
                    if rpr.get("sz"):
                        sizes[int(rpr.get("sz")) / 100] += n
                        if rpr.get("b") == "1":
                            bolds[int(rpr.get("sz")) / 100] += n
                    lat = rpr.find(f"{A}latin")
                    if lat is not None and lat.get("typeface") and not lat.get("typeface").startswith("+"):
                        fonts_used[lat.get("typeface")] += n
            if not titles or len(titles) < len(words):
                big = None
                for sp in root.iter(f"{PNS}sp"):
                    for r in sp.iter(f"{A}r"):
                        rpr = r.find(f"{A}rPr")
                        t = r.find(f"{A}t")
                        if rpr is not None and rpr.get("sz") and t is not None and t.text and (big is None or int(rpr.get("sz")) > big[0]):
                            big = (int(rpr.get("sz")), t.text)
                if big and len(titles) < len(words):
                    titles.append(big[1])
        subtitle = None
        if slides:
            r1 = ET.fromstring(z.read(slides[0]))
            runs1 = []
            for r in r1.iter(f"{A}r"):
                rpr, t = r.find(f"{A}rPr"), r.find(f"{A}t")
                if t is not None and t.text and t.text.strip():
                    runs1.append((int(rpr.get("sz")) if rpr is not None and rpr.get("sz") else 1800, t.text.strip()))
            for ph_sp in r1.iter(f"{PNS}sp"):
                ph = ph_sp.find(f".//{PNS}ph")
                if ph is not None and ph.get("type") == "subTitle":
                    tt = " ".join(t.text for t in ph_sp.iter(f"{A}t") if t.text)
                    if tt.strip():
                        subtitle = tt.strip()
            if subtitle is None and len(runs1) >= 2:
                ranked = sorted(runs1, key=lambda x: -x[0])
                subtitle = next((t for _, t in ranked[1:] if t != ranked[0][1] and count_words(t) >= 2), None)
        notes = []
        for nn in sorted(n for n in names if re.match(r"ppt/notesSlides/notesSlide\d+\.xml$", n)):
            nr = ET.fromstring(z.read(nn))
            tx = " ".join(t.text for t in nr.iter(f"{A}t") if t.text and not t.text.strip().isdigit())
            if tx.strip():
                notes.append(tx.strip())
        label = self.disp(p)

        def resolve(k):
            if k.startswith("('scheme'"):
                key = re.findall(r"'([^']+)'\)$", k)
                return theme["colors"].get(key[0]) if key else None
            return k if k.startswith("#") else None

        tc = theme["colors"]
        stock_w = 0.25 if theme.get("stock") else 1.0
        if theme.get("stock"):
            warn(f"{label}: the slide theme is a stock office theme; its colours are weak evidence (the slides' own fills still count)", self)
        eid_t = self.ev(p, "pptx-theme", f"{'stock ' if theme.get('stock') else ''}theme “{theme.get('name')}”: " + ", ".join(f"{k}={v}" for k, v in tc.items()) +
                        f"; fonts major={theme['fonts'].get('majorFont', {}).get('latin')} minor={theme['fonts'].get('minorFont', {}).get('latin')}")
        role_map = {"dk1": {"ink": 0.9}, "lt1": {"bg": 0.4, "surface": 0.6}, "dk2": {"ink": 0.5, "bg": 0.3}, "lt2": {"bg": 0.5, "bg2": 0.4},
                    "accent1": {"accent": 1.0}, "accent2": {"accent2": 0.9, "accent": 0.4}, "accent3": {"accent3": 0.8, "accent": 0.3},
                    "accent4": {"accent": 0.25}, "accent5": {"accent": 0.2}, "accent6": {"accent": 0.2}, "hlink": {"accent": 0.15}}
        usage = Counter()
        for k, v in list(text_use.items()) + list(fill_use.items()):
            hx = resolve(k)
            if hx:
                usage[hx] += v if k in text_use else v * 40
        for k, v in tc.items():
            if k in role_map:
                boost = 1.0 + min(2.0, usage.get(v, 0) / 60.0)
                self.color(v, 2.4 * boost * stock_w * (0.6 if k in ("accent4", "accent5", "accent6", "hlink", "folHlink") else 1.0), role_map[k],
                           eid_t, "theme", name=k, exact=True, src=label)
        tot_bg = sum(bg_use.values()) or 1
        bg_summary = []
        for k, v in bg_use.most_common():
            hx = resolve(k)
            if hx:
                bg_summary.append(f"{hx} on {v}/{tot_bg} slides")
                eid_b = self.ev(p, "slide-backgrounds", f"slide background {hx} on {v} of {tot_bg} slides")
                self.color(hx, 3.0 * v / tot_bg + 0.5, {"bg": 1.0}, eid_b, "theme", scheme="dark" if rel_lum(hex_to_rgb(hx)) < 0.2 else "light",
                           exact=True, src=label)
        dark_slides = sum(v for k, v in bg_use.items() if resolve(k) and rel_lum(hex_to_rgb(resolve(k))) < 0.2)
        self.flags["dark_slides"] += dark_slides
        self.flags["slides"] += len(slides)
        for key, role in (("majorFont", "display"), ("minorFont", "body")):
            f = theme["fonts"].get(key, {})
            if f.get("latin"):
                self.font(f["latin"], role, 0.6 if f["latin"].lower() in STOCK_THEME_FONTS else 3.0, eid_t, "theme")
            for scr in ("Hang", "Jpan", "Hans"):
                if f.get(scr):
                    self.font(f[scr], "cjk", 0.8, eid_t, "theme")
        for fam, n in fonts_used.most_common(3):
            e3 = self.ev(p, "pptx-fonts", f"explicit run font {fam} ({n} chars)")
            self.font(fam, "body", 1.5, e3, "pptx")
        if sizes:
            body = max(sizes, key=sizes.get)
            big = max(sizes)
            self.type_info["sizes"].append((body, big))
            self.type_info["heading_ratio"].append(big / max(1, body))
            if bolds:
                self.type_info["heading_weight"].append(800 if max(bolds) >= big * 0.9 else 700)
        text = "\n".join(all_text)
        doc = TextDoc(label, "slides", text, words, [(1, t) for t in titles], [], ([subtitle] if subtitle else []) + titles,
                      titles[0] if titles else p.stem, [], 0, 1.4, notes=" ".join(notes))
        self.add_doc(doc)
        self._text_signals(text, p, eid_t)
        media = [n for n in names if n.startswith("ppt/media/") and Path(n).suffix.lower() in IMAGE_EXT]
        for mname in media[:10]:
            if self.image_budget <= 0:
                break
            im = load_image(z.read(mname), mname)
            if im is not None and min(im.size) >= 48:
                self.image_budget -= 1
                self.add_image(im, str(p), f"{label}#{Path(mname).name}")
        entry["notes"] = (f"{len(slides)} slides, {round(sum(words) / max(1, len(words)))} words/slide; backgrounds: "
                          + "; ".join(bg_summary[:3]))
        return "slides"

    def read_docx(self, p, entry, inside_dir):
        z = zipfile.ZipFile(str(p))
        W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
        theme = self._ooxml_theme(z)
        try:
            root = ET.fromstring(z.read("word/document.xml"))
        except KeyError:
            return None
        paras = []
        for para in root.iter(f"{W}p"):
            t = "".join(x.text or "" for x in para.iter(f"{W}t"))
            if t.strip():
                paras.append(t)
        text = "\n".join(paras)
        kind = "brand-guide" if len(PURPOSES["brand"].findall(text)) > 8 else "other"
        doc = TextDoc(self.disp(p), kind, text, [count_words(x) for x in paras if count_words(x) > 25] or [count_words(text)], [], [], [],
                      paras[0][:120] if paras else p.stem, [], 0, 1.2)
        self.add_doc(doc)
        eid = self.ev(p, "document", f"docx ({kind}): {count_words(text)} words")
        self._text_signals(text, p, eid)
        if theme and not theme.get("stock"):
            for k, v in theme["colors"].items():
                if k.startswith("accent") or k in ("dk2",):
                    self.color(v, 1.2 if k == "accent1" else 0.6, {"accent": 0.8 if k == "accent1" else 0.3}, eid, "theme", name=k, exact=True)
            for key, role in (("majorFont", "display"), ("minorFont", "body")):
                f = theme["fonts"].get(key, {})
                if f.get("latin"):
                    self.font(f["latin"], role, 1.5, eid, "theme")
        entry["kind"] = kind if not inside_dir else entry.get("kind", kind)
        return kind

    # snapshots ------------------------------------------------------------------------
    def run_snapshots(self):
        if not self.snap_inputs or self.args.no_snapshot:
            return
        node = shutil.which("node")
        if not node or not SNAPSHOT_JS.exists():
            warn("node or source_snapshot.mjs not found: page snapshots skipped (static parsing only)", self)
            return
        self.snapdir.mkdir(parents=True, exist_ok=True)
        cmd = [node, str(SNAPSHOT_JS), "--out", str(self.snapdir)] + (["--offline"] if self.args.offline else []) + self.snap_inputs
        log(f"snapshots: {len(self.snap_inputs)} page(s) via Chromium …")
        try:
            r = subprocess.run(cmd, capture_output=True, text=True, timeout=900)
        except subprocess.TimeoutExpired:
            warn("source_snapshot.mjs timed out", self)
            return
        idx = self.snapdir / "index.json"
        if not idx.exists():
            warn("snapshots failed: " + (r.stderr or r.stdout).strip().splitlines()[-1][:200] if (r.stderr or r.stdout).strip() else "snapshots failed", self)
            return
        data = json.loads(idx.read_text())
        for it in data.get("items", []):
            # items keep the input order ("n"); "input" in the index is a display path, never an absolute one
            n = it.get("n")
            inp = self.snap_inputs[n] if isinstance(n, int) and 0 <= n < len(self.snap_inputs) else it.get("input")
            it["input"] = inp
            entry = self.snap_map.get(inp)
            if not it.get("ok"):
                warn(f"snapshot failed for {self.disp(inp)}: {it.get('error')}", self)
                continue
            try:
                self.ingest_snapshot(it, entry)
            except Exception as e:  # one odd page must not stop the run
                warn(f"could not analyse the snapshot of {self.disp(inp)}: {type(e).__name__}: {str(e)[:120]}", self)

    def ingest_github(self, it, entry):
        """GitHub repo page: analyse the README only (text, headings, badges, its own images, a crop with GitHub colours masked)."""
        inp, gh = it.get("input"), it["github"]
        label = self.disp(inp)
        text = gh.get("text") or ""
        heads = [(h.get("level", 2), h.get("text", "")) for h in gh.get("headings", [])]
        md = parse_markdown(text)
        doc = TextDoc(label, "readme", text, md["sections"] or [count_words(text)], heads, [], [], heads[0][1] if heads else "", it.get("links", []),
                      0, 1.6)
        desc = (it.get("meta") or {}).get("og:description") or (it.get("meta") or {}).get("description") or ""
        desc = re.sub(r"^\s*(?:Contribute to|A|An)?\s*", "", desc) if desc.startswith("Contribute to ") else desc
        if desc and not desc.startswith("Contribute to"):
            doc.emphasis.insert(0, re.sub(r"\s*-\s*[\w.-]+/[\w.-]+\s*$", "", desc))
        self.add_doc(doc)
        eid = self.ev(inp, "document", f"GitHub README: {count_words(text)} words, {len(heads)} headings, {len(gh.get('images', []))} images, "
                                       f"{len(gh.get('badges', []))} badges (page chrome ignored)")
        self._text_signals(text, inp, eid)
        if gh.get("badges"):
            self.read_badges(gh["badges"], inp)
        if entry is not None:
            entry["kind"] = "repo"
            entry["notes"] = f"GitHub README ({count_words(text)} words, {len(gh.get('images', []))} images); GitHub's own UI colours/fonts ignored"
        rc = []
        for v in (it.get("rendererColors") or {}).values():
            rc += [x for x in v if isinstance(x, str) and len(x) == 7]
        for sch, d in (it.get("schemes") or {}).items():
            if d.get("readme"):
                fp = self.snapdir / d["readme"]
                im = load_image(fp)
                if im is not None:
                    self.add_image(im, str(fp), self.disp(fp), hint="render", scheme=sch, weight_scale=0.6, renderer_colors=rc)
        if not self.args.offline:
            imgs = sorted(gh.get("images", []), key=lambda i: -(i.get("w", 0) * i.get("h", 0)))
            seen_src = set()
            for i in imgs[:12]:
                if self.image_budget <= 0 or i.get("w", 0) * i.get("h", 0) < 48 * 48 or i["src"] in seen_src:
                    continue
                seen_src.add(i["src"])
                canon = i.get("canonical") or ""
                data = None
                if is_url(canon) and "camo.githubusercontent" not in canon:
                    data = fetch_bytes(canon, limit=8_000_000)
                data = data or fetch_bytes(i["src"], limit=8_000_000)
                if not data:
                    continue
                name = Path(urlparse(i.get("canonical") or i["src"]).path).name or "image"
                im = load_image(data, name)
                if im is None or min(im.size) < 32:
                    continue
                self.image_budget -= 1
                hint = name_hint(name) or name_hint(i.get("alt", "").replace(" ", "-"))
                self.add_image(im, i.get("canonical") or i["src"], f"{label}#{name}", hint=hint)
        it["_thumbs"] = [d.get("readme") or d.get("shot") for d in (it.get("schemes") or {}).values()]
        self.snap_items.append(it)

    def ingest_snapshot(self, it, entry):
        typ, inp = it.get("type"), it.get("input")
        label = self.disp(inp)
        if typ == "markdown":
            for sch in (it.get("schemes") or {}):
                self.flags["snap_" + sch] += 1
            self.ev(inp, "snapshot", f"rendered markdown ({'+'.join((it.get('schemes') or {}).keys())}) with the neutral stylesheet "
                                     f"for visual review; renderer colours are not evidence")
            it["_thumbs"] = [d.get("shot") for d in (it.get("schemes") or {}).values() if d.get("shot")]
            self.snap_items.append(it)
            return
        is_url_src = typ == "url"
        if it.get("renderer") == "github" and it.get("github"):
            return self.ingest_github(it, entry)
        if is_url_src:
            text = it.get("text") or ""
            heads = [(h.get("level", 2), h.get("text", "")) for h in it.get("headings", [])]
            chunks = re.split(r"\n(?=" + "|".join(re.escape(h) for _, h in heads[:40] if h) + r")", text) if heads else [text]
            kind = entry.get("kind", "website") if entry else "website"
            if kind == "website" and len(PURPOSES["docs"].findall(text)) >= 6:
                kind = "docs"
            pre = re.findall(r"(?m)^\s*\$ .+$", text)
            doc = TextDoc(label, kind, text, [count_words(c) for c in chunks if count_words(c)], heads, [("console", "\n".join(pre))] if pre else [],
                          [], it.get("title") or (it.get("meta") or {}).get("og:title", ""), it.get("links", []), 0, 1.3)
            self.add_doc(doc)
            self._text_signals(text, inp, self.ev(inp, "document", f"web page ({kind}): {count_words(text)} words, title “{(it.get('title') or '')[:60]}”"))
            if entry is not None:
                entry["kind"] = kind
                entry["notes"] = f"{kind}; schemes: {'+'.join((it.get('schemes') or {}).keys())}; dark support: {it.get('darkSupport')}"
            for f in it.get("cssFiles", [])[:12]:
                cp = self.snapdir / f
                if cp.exists():
                    self.read_css_text(read_text(cp, 3_000_000), cp, weight_scale=0.5, fonts_only=True)
            desc = (it.get("meta") or {}).get("description") or (it.get("meta") or {}).get("og:description")
            if desc:
                doc.emphasis.insert(0, desc)
        ds = it.get("darkSupport")
        if ds in ("media", "toggle"):
            self.flags["dark_support"] += 1
        if ds == "default-dark":
            self.flags["default_dark"] += 1
        for sch, d in (it.get("schemes") or {}).items():
            comp = d.get("computed") or {}
            summary = []

            page_bg = np.array((d.get("bodyBg") or [255, 255, 255])[:3]) / 255

            def hx_of(rgba, over=None):
                """Opaque hex of a computed colour, composited over `over` (the page background) when translucent."""
                if not rgba or (len(rgba) > 3 and rgba[3] < 0.5):
                    return None
                rgb = np.array(rgba[:3]) / 255
                a_ = rgba[3] if len(rgba) > 3 else 1.0
                if a_ < 0.999:
                    rgb = rgb * a_ + (page_bg if over is None else over) * (1 - a_)
                return rgb_to_hex(rgb)

            body = comp.get("body") or {}
            bgx = hx_of(d.get("bodyBg"), over=np.ones(3))
            eid = self.ev(inp, "computed-style", f"[{sch}] page background {bgx}, body text {hx_of(body.get('color'))}, "
                                                 f"font {str(body.get('fontFamily', ''))[:60]}")
            if bgx:
                self.color(bgx, 4.0, {"bg": 1.0}, eid, "computed", scheme=sch, exact=True, src=label)
            if hx_of(body.get("color")):
                self.color(hx_of(body.get("color")), 3.2, {"ink": 1.0}, eid, "computed", scheme=sch, exact=True, src=label)
            for role, roles_map, w in (("h1", {"ink": 0.6, "accent": 0.5}, 2.0), ("link", {"accent": 0.9}, 1.8),
                                       ("nav", {"ink2": 0.5}, 0.8), ("code", {"accent": 0.25}, 0.6)):
                c = comp.get(role) or {}
                hx = hx_of(c.get("color"))
                if hx and hx != bgx:
                    if lch_of(hex_to_lab(hx))[1] < 15 and role in ("h1",):
                        roles_map = {"ink": 0.8}
                    self.color(hx, w, roles_map, eid, "computed", scheme=sch, exact=True, src=label)
                    summary.append(f"{role} {hx}")
            btn = comp.get("button") or {}
            if hx_of(btn.get("ownBg")):
                self.color(hx_of(btn["ownBg"]), 2.6, {"accent": 1.0}, eid, "computed", scheme=sch, exact=True, src=label)
                if hx_of(btn.get("color")):
                    self.color(hx_of(btn["color"]), 1.0, {"onAccent": 1.0}, eid, "computed", scheme=sch, exact=True, src=label)
            for role, rr_ in (("card", {"surface": 1.0}), ("pre", {"surface": 0.7}), ("nav", {"bg2": 0.5})):
                c = comp.get(role) or {}
                hx = hx_of(c.get("ownBg"))
                if hx and hx != bgx:
                    self.color(hx, 1.6, rr_, eid, "computed", scheme=sch, exact=True, src=label)
            for role in ("button", "card"):
                rad = (comp.get(role) or {}).get("borderRadius")
                m = re.match(r"([\d.]+)px", str(rad or ""))
                if m:
                    self.type_info["radius"].append(float(m.group(1)))
            h1 = comp.get("h1") or {}
            if body.get("fontSize") and h1.get("fontSize"):
                self.type_info["sizes"].append((body["fontSize"], h1["fontSize"]))
                self.type_info["heading_ratio"].append(h1["fontSize"] / max(1, body["fontSize"]))
            try:
                if h1.get("fontWeight"):
                    self.type_info["heading_weight"].append(int(h1["fontWeight"]))
            except ValueError:
                pass
            pf = d.get("platformFonts") or {}
            for role, frole in (("body", "body"), ("h1", "display"), ("h2", "display"), ("code", "mono"), ("pre", "mono")):
                declared = [x.strip().strip("'\"") for x in str((comp.get(role) or {}).get("fontFamily", "")).split(",") if x.strip()]
                for f in (pf.get(role) or [])[:1]:
                    fam = f.get("familyName")
                    if fam and not EMOJI_FONTS.search(fam):
                        intended = f.get("isCustomFont") or (declared and clean_family(declared[0]).lower() == clean_family(fam).lower())
                        self.font(fam, frole, 3.0 if intended else 0.25, eid, "rendered" if intended else "rendered-fallback")
            for role, frole in (("body", "body"), ("h1", "display"), ("code", "mono")):
                ff = (comp.get(role) or {}).get("fontFamily")
                if ff:
                    first = [x.strip().strip("'\"") for x in ff.split(",") if x.strip()][:2]
                    for i, f in enumerate(first):
                        self.font(f, frole, 1.6 / (i + 1), eid, "css")
            if is_url_src:
                vars_ = d.get("vars") or {}
                cols = [(k, v) for k, v in vars_.items() if v.get("rgba") and v["rgba"][3] >= 0.5]
                if cols:
                    scale = min(1.0, 60.0 / len(cols))
                    eid_v = self.ev(inp, "css-tokens", f"[{sch}] {len(cols)} resolved colour tokens: " +
                                    ", ".join(f"{k}={rgb_to_hex(np.array(v['rgba'][:3]) / 255)}" for k, v in cols[:12]))
                    for k, v in cols:
                        role, shade, _ = token_role(k)
                        if role and role != "palette":
                            self.color(rgb_to_hex(np.array(v["rgba"][:3]) / 255), 2.5 * scale, {role: 1.0}, eid_v, "token", name=k,
                                       scheme=sch, exact=True, src=label)
            for tc in d.get("themeColor") or []:
                hx = hx_of(tc.get("rgba"))
                if hx and is_url_src:
                    self.color(hx, 2.5, {"accent": 0.9} if lch_of(hex_to_lab(hx))[1] > 15 else {"bg": 0.5}, eid, "meta", scheme=sch, exact=True)
            for k in ("full", "shot", "readme"):
                f = d.get(k)
                if not f:
                    continue
                fp = self.snapdir / f
                im = load_image(fp)
                if im is not None:
                    self.add_image(im, str(fp), self.disp(fp), hint="render", scheme=sch, weight_scale=0.7 if k == "readme" else 1.0)
                if k == "full":
                    break
        it["_thumbs"] = [d.get("shot") for d in (it.get("schemes") or {}).values() if d.get("shot")]
        self.snap_items.append(it)


# ═════════════════════════════════════════ interpretation tables ═════════════════════════════════════════
# Every table below is data so that `--tables` can print it and references/tone-and-manner.md can mirror it.
# Axes (0..1): energy, playful, technical, serious, warm, luxe, dark, data; derived: calm = 1-energy, light = 1-dark,
# ui = app/web/terminal capture planned, term = terminal/cli capture planned.
# A signature {axis: w} scores sum(|w| * (axis if w > 0 else 1 - axis)) / sum(|w|) (+ bias where given).

AXIS_FORMULAS = {
    "energy": "0.2 + 0.25·sat(!/1k, 8) + 0.18·sat(emoji/1k, 10) + 0.15·sat(marketing/1k, 12) + 0.15·sat(numbers/1k, 40) "
              "+ 0.12·accentChroma + 0.15·neon + 0.08·loudBadges + 0.10·sparseCopy − 0.22·sat(hedge/1k, 5) "
              "− 0.18·sat(citations/1k, 4) − 0.08·longSentences",
    "playful": "0.1 + 0.32·sat(emoji/1k, 8) + 0.14·sat(!/1k, 10) + 0.22·sat(playfulWords/1k, 6) + 0.12·pastel + 0.10·cutoutOrMascot "
               "+ 0.08·roundedFont + 0.06·cuteEmojiShare − 0.25·sat(citations/1k, 4) − 0.15·sat(hedge/1k, 6) − 0.15·technicalRaw",
    "technical": "0.45·sat(techWords/1k, 30) + 0.2·sat(codeTokens/1k, 15) + 0.15·[≥2 code blocks] + 0.12·[shell commands] "
                 "+ 0.08·[mono font prominent] + 0.10·[terminal theme]",
    "serious": "0.15 + 0.3·sat(hedge/1k, 5) + 0.3·sat(citations/1k, 4) + 0.12·[serif type] + 0.08·longSentences + 0.10·[formal register] "
               "− 0.35·playful − 0.10·sat(!/1k, 8)",
    "warm": "0.5·paletteWarmth + 0.25·sat(warmWords/1k, 8) + 0.15·[cute/heart emoji] + 0.10·playful",
    "luxe": "0.4·[display serif] + 0.12·[serif, not a paper] + 0.25·sat(luxeWords/1k, 4) + 0.2·[low-chroma accents on high contrast] "
            "+ 0.1·sparseCopy − 0.3·playful − 0.2·technical",
    "dark": "1 if the decided layout theme is dark else 0",
    "data": "0.45·sat(numbers/1k, 40) + 0.2·sat(dataWords/1k, 10) + 0.15·[tables] + 0.2·[figures/charts]",
}

PACE_THRESHOLDS = {"calm": "energy < 0.35", "medium": "0.35 ≤ energy ≤ 0.62", "energetic": "energy > 0.62"}
PRESET_FITS_PACE = "calm reels use ambient, lofi, cinematic-lite or corporate; energetic reels use bright-pop, dark-synth, corporate or cinematic-lite"

SOUND_PRESETS = {
    "bright-pop": {"w": {"energy": .30, "playful": .35, "warm": .20, "light": .25, "technical": -.15, "serious": -.20, "luxe": -.25}, "linear": True,
                   "bpm": (112, 124), "instruments": ["pad", "pluck", "bell", "marimba", "bass"],
                   "drums": {"full": ["kick", "clap", "hats", "shaker"], "light": ["kick", "hats", "shaker"]}},
    "dark-synth": {"w": {"energy": .25, "dark": .35, "technical": .30, "data": .10, "playful": -.15, "luxe": -.10}, "linear": True,
                   "bpm": (118, 130), "instruments": ["pad", "saw-pluck", "arp", "saw-bass", "sub", "stab"],
                   "drums": {"full": ["kick", "clap", "snare", "hats"], "light": ["kick", "hats"]}},
    "ambient": {"w": {"calm": .35, "serious": .30, "luxe": .35, "data": .10, "playful": -.20}, "linear": True,
                "bpm": (84, 100), "instruments": ["pad", "strings", "piano", "glass", "bell", "sub"],
                "drums": {"full": ["kick", "rim", "shaker"], "light": ["rim", "shaker"]}},
    "corporate": {"w": {"midEnergy": .30, "serious": .15, "light": .20, "data": .10, "pitch": .10, "playful": -.20, "dark": -.10, "luxe": -.10},
                  "linear": True, "bpm": (100, 118), "instruments": ["strings", "piano", "pluck", "bell", "bass"],
                  "drums": {"full": ["kick", "clap", "hats", "shaker"], "light": ["kick", "rim", "shaker"]}},
    "lofi": {"w": {"warm": .25, "calm": .25, "playful": .20, "technical": .15, "serious": -.20, "luxe": -.15}, "linear": True,
             "bpm": (80, 92), "instruments": ["epiano", "pad", "bass", "crackle"],
             "drums": {"full": ["kick", "snare", "hats", "rim"], "light": ["kick", "rim", "hats"]}},
    "cinematic-lite": {"w": {"serious": .25, "luxe": .50, "dark": .20, "data": .15, "energy": .10, "playful": -.30, "technical": -.10},
                       "linear": True, "bpm": (88, 110), "instruments": ["strings", "piano", "pad", "sub"],
                       "drums": {"full": ["kick", "snare", "toms"], "light": ["toms", "kick"]}},
}

TRANSITIONS = {  # bias + linear weights; chosen when score >= 0.3 (best 3..5)
    "cut": (0.25, {"serious": .45, "luxe": .30, "playful": -.25, "energy": -.15}),
    "match": (0.45, {"serious": .20, "data": .20, "luxe": .15}),
    "blobWipe": (0.10, {"playful": .65, "warm": .20, "technical": -.35, "dark": -.30, "luxe": -.30}),
    "zoomInto": (0.30, {"ui": .30, "energy": .15}),
    "whip": (0.15, {"energy": .55, "serious": -.30}),
    "glitch": (0.05, {"techDark": .55, "term": .30, "playful": -.40, "luxe": -.30, "serious": -.20}),
    "flash": (0.05, {"energyDark": .45, "data": .15, "serious": -.30, "playful": -.20}),
    "strobe": (-0.05, {"energyDarkTech": .60, "serious": -.40}),
    "impact": (0.05, {"dataEnergy": .50, "energy": .25, "claims": .10, "serious": -.20}),
    "portalFlash": (0.05, {"playfulWarm": .45, "energy": .20, "technical": -.30}),
}

TYPE_REVEALS = {  # names of engine text helpers (kinetic, kinetic with pop, revealLine, scramble, typing caret)
    "kinetic": (0.50, {"energy": .30, "playful": .20}),
    "kineticPop": (-0.10, {"playful": .80, "energy": .20}),
    "revealLine": (0.30, {"serious": .40, "luxe": .30}),
    "scramble": (0.10, {"technical": .60, "data": .20, "playful": -.30}),
    "typing": (0.05, {"term": .70, "technical": .20, "luxe": -.20}),
}

EASES = {"outBack": {"playful": 1.0, "energy": .2}, "outExpo": {"technical": .6, "energy": .4, "dark": .2},
         "outQuint": {"serious": .5, "luxe": .5, "calm": .3}, "outC": {"_bias": .45}, "ioC": {"luxe": .4, "calm": .3}}

VOICES = {  # Gemini prebuilt voices and the axes they suit (score = weighted mean); Puck gets +0.03 as the proven default
    "Puck": ("upbeat", {"energy": .7, "playful": .5}),
    "Fenrir": ("excitable", {"energy": .7, "technical": .3, "dark": .1}),
    "Laomedeia": ("upbeat", {"energy": .5, "warm": .3, "playful": .2}),
    "Aoede": ("breezy", {"warm": .4, "playful": .3, "energy": .1}),
    "Achird": ("friendly", {"warm": .5, "playful": .3}),
    "Sulafat": ("warm", {"warm": .6, "calm": .3, "luxe": .1}),
    "Kore": ("firm", {"serious": .3, "energy": .3, "technical": .2, "data": .2}),
    "Charon": ("informative", {"serious": .4, "data": .3, "technical": .3}),
    "Iapetus": ("clear", {"serious": .4, "calm": .3, "technical": .2}),
    "Sadaltager": ("knowledgeable", {"serious": .5, "data": .3, "calm": .2}),
    "Schedar": ("even", {"calm": .3, "serious": .2, "light": .2, "midEnergy": .3}),
    "Algieba": ("smooth", {"luxe": .6, "calm": .3}),
    "Achernar": ("soft", {"luxe": .3, "calm": .4, "warm": .2}),
}

VOICE_PURPOSE_BONUS = {  # purpose breaks near-ties: explainers favour informative voices, launches upbeat ones
    "docs": {"Charon": .05, "Iapetus": .05, "Kore": .03}, "paper": {"Sadaltager": .05, "Charon": .05, "Iapetus": .04},
    "explainer": {"Charon": .05, "Iapetus": .05, "Sadaltager": .04}, "launch": {"Puck": .03, "Laomedeia": .03, "Achird": .02},
    "pitch": {"Kore": .04, "Puck": .03, "Laomedeia": .02}, "brand": {"Algieba": .03, "Sulafat": .03}, "tool": {"Fenrir": .02, "Charon": .02},
}

STYLE_TAGS = [  # first match wins
    ("energetic and playful", lambda a, pace: pace == "energetic" and a["playful"] > .6, "[bright, playful]"),
    ("energetic", lambda a, pace: pace == "energetic", "[fast, energetic]"),
    ("medium, luxe", lambda a, pace: pace == "medium" and a["luxe"] > .5, "[smooth, confident]"),
    ("medium, technical", lambda a, pace: pace == "medium" and a["technical"] > .55, "[confident, clear]"),
    ("medium, warm", lambda a, pace: pace == "medium" and a["warm"] > .55, "[warm, friendly]"),
    ("medium", lambda a, pace: pace == "medium", "[clear, upbeat]"),
    ("calm, luxe", lambda a, pace: a["luxe"] > .5, "[soft, elegant]"),
    ("calm, warm", lambda a, pace: a["warm"] > .6 and a["serious"] < .5, "[warm, gentle]"),
    ("calm", lambda a, pace: True, "[calm, measured]"),
]

SFX_FAMILIES = {"glassy": {"playful": .35, "luxe": .25, "light": .25, "energy": .15}, "digital": {"technical": .5, "dark": .3, "energy": .2},
                "organic": {"warm": .5, "calm": .3, "playful": .2}, "minimal": {"serious": .4, "calm": .3, "light": .2, "playful": -.1}}

MOOD_WORDS = {  # deviation scoring: sum(w * k * (axis - 0.5)) / sum(|w|); k = 0.5 for on/off signals (dark, light, _*, heavy)
    "playful": {"playful": 1}, "bouncy": {"playful": .6, "energy": .6}, "friendly": {"warm": .6, "playful": .4, "serious": -.3},
    "cozy": {"warm": .6, "calm": .4, "playful": .2}, "bright": {"light": .3, "energy": .4, "warm": .3},
    "sweet": {"playful": .5, "warm": .5, "_pastel": .5}, "pastel": {"_pastel": 1}, "energetic": {"energy": 1},
    "bold": {"energy": .3, "sparse": .3, "heavy": .2, "data": .2}, "confident": {"sparse": .25, "heavy": .25, "serious": .1, "playful": -.2, "energy": .2},
    "punchy": {"energy": .4, "sparse": .3, "data": .3}, "clean": {"light": .3, "playful": -.3, "luxe": .1, "serious": .2, "technical": .1},
    "minimal": {"serious": .3, "calm": .4, "playful": -.4, "luxe": .2}, "precise": {"technical": .5, "serious": .5, "playful": -.3},
    "calm": {"calm": 1}, "credible": {"serious": .6, "data": .4}, "scholarly": {"serious": .8, "data": .2, "_citations": .6},
    "airy": {"light": .3, "calm": .4, "sparse": .3}, "technical": {"technical": 1}, "electric": {"dark": .5, "energy": .5, "_neon": .6},
    "neon": {"_neon": 1}, "nocturnal": {"dark": 1}, "data-driven": {"data": 1}, "cinematic": {"dark": .4, "serious": .3, "luxe": .3},
    "elegant": {"luxe": 1}, "refined": {"luxe": .7, "calm": .3}, "warm": {"warm": 1}, "cool": {"warm": -1},
    "hacker": {"technical": .6, "dark": .4, "_term": .6}, "nerdy": {"technical": .6, "playful": .2},
    "trustworthy": {"serious": .4, "calm": .3, "light": .3}, "optimistic": {"warm": .4, "energy": .4, "light": .2},
    "futuristic": {"dark": .4, "technical": .4, "energy": .2}, "earnest": {"serious": .5, "warm": .3},
}
BINARY_SIGNALS = {"dark", "light", "heavy", "_pastel", "_neon", "_term", "_citations"}


def mood_score(sig, ex):
    num = den = 0.0
    for k, w in sig.items():
        kk = 0.5 if k in BINARY_SIGNALS else 1.0
        num += w * kk * (ex.get(k, 0.5) - 0.5)
        den += abs(w)
    return num / den if den else 0.0


def sig_score(sig, a, bias=0.0, linear=False):
    if linear:
        return bias + sum(w * a.get(k, 0.0) for k, w in sig.items() if not k.startswith("_"))
    num = den = 0.0
    for k, w in sig.items():
        x = a.get(k, 0.0)
        num += abs(w) * (x if w > 0 else 1 - x)
        den += abs(w)
    return bias + (num / den if den else 0.0)


def extended_axes(a, extra):
    e = dict(a)
    e.update({"calm": 1 - a["energy"], "light": 1 - a["dark"], "midEnergy": clamp(1 - abs(a["energy"] - 0.55) * 2)})
    e.update(extra)
    e["techDark"] = a["technical"] * a["dark"]
    e["energyDark"] = a["energy"] * a["dark"]
    e["energyDarkTech"] = a["energy"] * a["dark"] * a["technical"]
    e["dataEnergy"] = a["data"] * a["energy"]
    e["playfulWarm"] = a["playful"] * a["warm"]
    return e


def print_tables():
    out = ["# extract_style.py interpretation tables", "", "## Axes", "", "| axis | formula |", "|---|---|"]
    out += [f"| {k} | {v} |" for k, v in AXIS_FORMULAS.items()]
    out += ["", "Pace: " + "; ".join(f"**{k}** {v}" for k, v in PACE_THRESHOLDS.items()), "",
            "## Sound presets (linear score; highest wins among presets that fit the pace; BPM placed in range by energy)", "",
            PRESET_FITS_PACE + ".", "",
            "| preset | weights | BPM | instruments |", "|---|---|---|---|"]
    for k, v in SOUND_PRESETS.items():
        out.append(f"| {k} | {', '.join(f'{a} {w:+.2f}' for a, w in v['w'].items())} | {v['bpm'][0]}–{v['bpm'][1]} | {', '.join(v['instruments'])} "
                   f"+ drums {'/'.join(v['drums']['full'])} |")
    out += ["", "## Transitions (bias + linear weights; keep score ≥ 0.3, best 3–5)", "", "| transition | bias | weights |", "|---|---|---|"]
    for k, (b, w) in TRANSITIONS.items():
        out.append(f"| {k} | {b:+.2f} | {', '.join(f'{a} {x:+.2f}' for a, x in w.items())} |")
    out += ["", "## Text reveals", "", "| reveal | bias | weights |", "|---|---|---|"]
    for k, (b, w) in TYPE_REVEALS.items():
        out.append(f"| {k} | {b:+.2f} | {', '.join(f'{a} {x:+.2f}' for a, x in w.items())} |")
    out += ["", "## Narration voices (Gemini prebuilt)", "", "| voice | character | suits |", "|---|---|---|"]
    for k, (d, w) in VOICES.items():
        out.append(f"| {k} | {d} | {', '.join(f'{a} {x:.1f}' for a, x in w.items())} |")
    out += ["", "Purpose bonus (breaks near-ties): " + "; ".join(f"{p_}: " + ", ".join(f"{v} +{x:.2f}" for v, x in d_.items())
                                                       for p_, d_ in VOICE_PURPOSE_BONUS.items())]
    out += ["", "## Style tags (first match)", "", "| when | tag |", "|---|---|"]
    out += [f"| {d} | `{t}` |" for d, _, t in STYLE_TAGS]
    out += ["", "## SFX families", "", "| family | suits |", "|---|---|"]
    out += [f"| {k} | {', '.join(f'{a} {x:+.2f}' for a, x in w.items())}{' (+0.35 x sat(beautyWords/1k, 4))' if k == 'glassy' else ''} |"
            for k, w in SFX_FAMILIES.items()]
    out += ["", "## Mood words (deviation score; on/off signals count half; top 5 above 0.05)", "", "| word | signature |", "|---|---|"]
    out += [f"| {k} | {', '.join(f'{a} {x:+.1f}' for a, x in w.items())} |" for k, w in MOOD_WORDS.items()]
    out += ["", "## Motion parameters", "",
            "- spring f = lerp(1.6, 3.0, energy); z = clamp(lerp(0.85, 0.38, 0.7·playful + 0.3·energy) + 0.1·serious, 0.35, 0.9)",
            "- overshoot = lerp(0, 1.9, 0.75·playful + 0.25·energy) · (1 − 0.5·serious)",
            "- grain = clamp(0.03 + 0.03·dark + 0.015·playful·(1−dark) + 0.01·warm − 0.01·serious, 0.015, 0.08)",
            "- vignette a = lerp(0.12, 0.5, dark); bloom = 0.6·dark·accentChroma + 0.1·energy·dark",
            "- margin = lerp(96, 144, 0.5·serious + 0.3·luxe + 0.3·calm) rounded to 8 px",
            "- type scale = 24·m^k (k = −2..7), m = clamp(headingRatio^¼, 1.18, 1.38) or lerp(1.2, 1.36, energy)"]
    print("\n".join(out))


# ═════════════════════════════════════════ aggregation helpers ═════════════════════════════════════════
def group_colors(cands, scheme=None, use_all=False):
    cs = [c for c in cands if use_all or c.scheme in (None, scheme)]
    cs.sort(key=lambda c: -c.weight * (1.6 if c.exact else 1.0))
    groups = []
    for c in cs:
        lab = hex_to_lab(c.hex)
        g = None
        for gg in groups:
            if float(de00(gg["lab"], lab)) < (1.5 if (c.exact and gg["exact"]) else 4.0):
                g = gg
                break
        if g is None:
            L, C, H = lch_of(lab)
            g = {"hex": c.hex, "lab": lab, "L": L, "C": C, "h": H, "w": 0.0, "roles": Counter(), "eids": [], "origins": Counter(),
                 "names": [], "exact": c.exact, "srcs": []}
            groups.append(g)
        g["w"] += c.weight
        for r, v in c.roles.items():
            g["roles"][r] += v * c.weight
        if c.eid not in g["eids"]:
            g["eids"].append(c.eid)
        g["origins"][c.origin] += 1
        if c.name and c.name not in g["names"]:
            g["names"].append(c.name)
        if c.src and c.src not in g["srcs"]:
            g["srcs"].append(c.src)
    return groups


def cite(eids, n=4):
    eids = [e for e in eids if e]
    seen = []
    for e in eids:
        if e not in seen:
            seen.append(e)
    return "[" + ", ".join(seen[:n]) + (" …" if len(seen) > n else "") + "]" if seen else ""


def palette_stats(groups):
    chrom = [g for g in groups if g["C"] >= 15 and (g["roles"].get("accent", 0) + g["roles"].get("accent2", 0) + g["roles"].get("accent3", 0)) > 0]
    if not chrom:
        return {"accentC": 0.0, "accentL": 50.0, "warmth": 0.5, "pastel": False, "neonish": 0.0, "n": 0}
    w = np.array([g["roles"].get("accent", 0) + g["roles"].get("accent2", 0) + g["roles"].get("accent3", 0) for g in chrom]) + 1e-6
    C = np.array([g["C"] for g in chrom])
    L = np.array([g["L"] for g in chrom])
    H = np.array([g["h"] for g in chrom])
    warm_each = 0.5 + 0.5 * np.cos(np.radians(H - 50))
    i0 = int(np.argmax(w))
    warmth = 0.5 * float(warm_each[i0]) + 0.5 * float(np.average(warm_each, weights=w * C))
    accentC, accentL = float(np.average(C, weights=w)), float(np.average(L, weights=w))
    past = (L >= 75) & (C >= 14) & (C <= 52)
    pastel = bool(float(w[past].sum()) / float(w.sum()) >= 0.5 and past[i0])
    return {"accentC": round(accentC, 1), "accentL": round(accentL, 1), "warmth": round(warmth, 3), "pastel": bool(pastel),
            "neonish": round(clamp((accentC - 40) / 40) * clamp((accentL - 45) / 30), 3), "n": len(chrom)}


def compute_axes(ctx, m, ps, dark, purpose, fonts_cat):
    f = ctx.flags
    sparse = 1.0 if m["words_per_section_median"] < 40 else 0.0
    longs = 1.0 if m["avg_sentence_words"] > 22 else 0.0
    loud = 1.0 if f.get("loud_badges") else 0.0
    cut_or_mascot = 1.0 if (f.get("img_mascot") or f.get("img_logo") or f.get("img_cutout")) else 0.0
    mix = m["emoji_mix"]
    emo_total = max(1, sum(v for k, v in mix.items() if k != "shortcodes"))
    cute_share = (mix["cute"]) / emo_total if emo_total else 0
    accentC = clamp((ps["accentC"] - 30) / 50)
    neon = dark * ps["neonish"]
    tech_raw = clamp(0.45 * sat(m["tech_per_1k"], 30) + 0.2 * sat(m["codeish_per_1k"], 15) + 0.15 * (m["code_blocks"] >= 2)
                     + 0.12 * (f.get("shell_cmds", 0) >= 1) + 0.08 * (fonts_cat.get("mono_share", 0) > 0.25) + 0.10 * (f.get("terminal_theme", 0) > 0
                                                                                                                     or bool(ctx.theme_mentions)))
    energy = clamp(0.2 + 0.25 * sat(m["exclaim_per_1k"], 8) + 0.18 * sat(m["emoji_per_1k"], 10) + 0.15 * sat(m["marketing_per_1k"], 12)
                   + 0.15 * sat(m["numbers_per_1k"], 40) + 0.12 * accentC + 0.15 * neon + 0.08 * loud + 0.10 * sparse
                   - 0.22 * sat(m["hedge_per_1k"], 5) - 0.18 * sat(m["citation_per_1k"], 4) - 0.08 * longs)
    playful = clamp(0.1 + 0.32 * sat(m["emoji_per_1k"], 8) + 0.14 * sat(m["exclaim_per_1k"], 10) + 0.22 * sat(m["playful_per_1k"], 6)
                    + 0.12 * ps["pastel"] + 0.10 * cut_or_mascot + 0.08 * (fonts_cat.get("display") == "rounded") + 0.06 * cute_share
                    - 0.25 * sat(m["citation_per_1k"], 4) - 0.15 * sat(m["hedge_per_1k"], 6) - 0.15 * tech_raw)
    serif = 1.0 if fonts_cat.get("display") in ("serif", "display-serif") or fonts_cat.get("body") == "serif" else 0.0
    formal = 1.0 if str(m.get("register", "")).startswith(("formal", "plain written")) else 0.0
    serious = clamp(0.15 + 0.3 * sat(m["hedge_per_1k"], 5) + 0.3 * sat(m["citation_per_1k"], 4) + 0.12 * serif + 0.08 * longs
                    + 0.10 * formal - 0.35 * playful - 0.10 * sat(m["exclaim_per_1k"], 8))
    warm_emoji = 1.0 if mix["cute"] >= 2 else 0.0
    warm = clamp(0.5 * ps["warmth"] + 0.25 * sat(m["warm_per_1k"], 8) + 0.15 * warm_emoji + 0.10 * playful)
    lowC_hiCon = 1.0 if (ps["n"] and ps["accentC"] < 25) else 0.0
    luxe = clamp(0.4 * (fonts_cat.get("display") == "display-serif") + 0.12 * (serif and purpose != "paper") + 0.25 * sat(m["luxe_per_1k"], 4)
                 + 0.2 * lowC_hiCon + 0.1 * sparse - 0.3 * playful - 0.2 * tech_raw)
    figures = 1.0 if (f.get("pdf_figures") or f.get("img_figure")) else 0.0
    data = clamp(0.45 * sat(m["numbers_per_1k"], 40) + 0.2 * sat(m["data_per_1k"], 10) + 0.15 * (m["tables"] > 0) + 0.2 * figures)
    a = {"energy": energy, "playful": playful, "technical": tech_raw, "serious": serious, "warm": warm, "luxe": luxe, "dark": float(dark),
         "data": data}
    return {k: round(v, 3) for k, v in a.items()}


def pick_by_scores(table, ax, threshold, lo, hi):
    sc = sorted(((sig_score(w, ax, b, linear=True), k) for k, (b, w) in table.items()), reverse=True)
    chosen = [k for s, k in sc if s >= threshold][:hi]
    for s, k in sc:
        if len(chosen) >= lo:
            break
        if k not in chosen:
            chosen.append(k)
    return chosen, {k: round(s, 3) for s, k in sc}


def round8(x):
    return int(round(x / 8.0) * 8)


def font_list_css(names):
    out = []
    for n in names:
        if not n or n in out:
            continue
        out.append(n)
    generic = {"sans-serif", "serif", "monospace", "cursive", "system-ui", "fantasy", "ui-monospace", "ui-sans-serif", "ui-serif"}
    return ", ".join(n if n in generic else '"' + n.replace('"', "") + '"' for n in out)


# ═════════════════════════════════════════ the interpreter ═════════════════════════════════════════
def interpret(ctx: Ctx, hints):
    a = ctx.args
    docs = ctx.docs
    m = text_metrics(docs) if docs else text_metrics([TextDoc("-", "other", "")])
    lang_code, lang_shares = detect_lang("\n".join(d.text for d in docs))
    if hints.get("lang"):
        lang_bcp = hints["lang"]
        lang_code = lang_bcp.split("-")[0].lower()
    else:
        lang_bcp = BCP47.get(lang_code, lang_code)
    reg, reg_detail = register_of("\n".join(d.text for d in docs), lang_code)
    m["register"] = reg
    m["register_detail"] = reg_detail
    m["lang"] = lang_bcp
    m["lang_shares"] = lang_shares
    inv = build_inventory(docs, m)
    inv["register"] = {"language": lang_bcp, "register": reg, "counts": reg_detail}
    review, warnings = [], ctx.warnings
    dec = {}

    # ---- fonts (categories first: the axes use them)
    fi = ctx.fontidx
    agg = defaultdict(Counter)
    eids_of = defaultdict(list)
    for fc in ctx.fonts:
        agg[fc.family][fc.role] += fc.weight
        eids_of[fc.family].append(fc.eid)
    tot_w = sum(sum(c.values()) for c in agg.values()) or 1.0
    mono_w = sum(sum(c.values()) for fam, c in agg.items() if font_category(fam) == "mono")

    def best(role, cat_filter=None, exclude=()):
        sc = []
        for fam, c in agg.items():
            if fam in exclude or fam == "system-ui":
                continue
            cat = font_category(fam)
            if cat_filter and not cat_filter(cat):
                continue
            s = c.get(role, 0) + 0.35 * c.get("any", 0)
            if role == "body":
                s += 0.3 * c.get("serif", 0)
            if s > 0:
                sc.append((s, fam))
        sc.sort(reverse=True)
        return sc[0][1] if sc else None

    src_body = best("body", lambda c: c != "mono")
    src_display = best("display", lambda c: c != "mono") or None
    src_mono = best("mono", lambda c: c == "mono") or best("any", lambda c: c == "mono")
    uses_system_ui = any("system-ui" == fam for fam in agg)
    fonts_cat = {"body": font_category(src_body) if src_body else None, "display": font_category(src_display or src_body) if (src_display or src_body) else None,
                 "mono_share": mono_w / tot_w}

    # ---- colours: provisional axes -> theme -> palette -> final axes
    groups_all = group_colors(ctx.colors, use_all=True)
    ps = palette_stats(groups_all)
    purpose_sc = purpose_scores(docs, ctx.flags)
    purpose = hints.get("purpose") or (max(purpose_sc, key=purpose_sc.get) if purpose_sc and max(purpose_sc.values()) > 0.5 else "general")
    prov = compute_axes(ctx, m, ps, 0.5, purpose, fonts_cat)

    light_w = sum(c.weight * c.roles.get("bg", 0) for c in ctx.colors if c.scheme in (None, "light") and hex_to_lab(c.hex)[0] > 55)
    dark_w = sum(c.weight * c.roles.get("bg", 0) for c in ctx.colors if c.scheme in (None, "dark") and hex_to_lab(c.hex)[0] < 40)
    def_light = sum(c.weight * c.roles.get("bg", 0) for c in ctx.colors if c.scheme is None and c.origin in ("token", "css")
                    and hex_to_lab(c.hex)[0] > 55)
    def_dark = sum(c.weight * c.roles.get("bg", 0) for c in ctx.colors if c.scheme is None and c.origin in ("token", "css")
                   and hex_to_lab(c.hex)[0] < 40)
    known = None
    if ctx.theme_mentions:
        known = ctx.theme_mentions.most_common(1)[0][0]
    if hints.get("theme"):
        theme, why = hints["theme"], "user hint"
    elif ctx.flags.get("default_dark") and not light_w > dark_w * 1.5:
        theme, why = "dark", "the page is dark by default"
    elif light_w + dark_w > 0.3 and abs(light_w - dark_w) / (light_w + dark_w) >= 0.25:
        theme = "light" if light_w > dark_w else "dark"
        why = f"background evidence {light_w:.1f} light vs {dark_w:.1f} dark"
    elif light_w + dark_w > 0.3 and abs(def_light - def_dark) > 0.5:
        theme = "light" if def_light > def_dark else "dark"
        why = (f"the material supports both schemes ({light_w:.1f} light vs {dark_w:.1f} dark); its default (un-prefixed) "
               f"scheme is {theme}")
    elif known and light_w + dark_w <= 0.3:
        theme, why = ("dark" if KNOWN_THEMES[known]["dark"] else "light"), f"named theme {known}"
    else:
        lean_dark = prov["technical"] > 0.55 and prov["playful"] < 0.4
        theme = "dark" if lean_dark else "light"
        why = (f"no decisive background evidence ({light_w:.1f} light vs {dark_w:.1f} dark); "
               + ("technical tone leans dark" if lean_dark else "non-technical tone leans light"))
        review.append({"field": "layout.theme", "reason": f"theme chosen by tone, not by measured backgrounds ({why})", "confidence": 0.45})
    if ctx.flags.get("dark_support") and not hints.get("theme"):
        review.append({"field": "layout.theme", "reason": "the material supports both light and dark; the other scheme suits 'dark' scenes",
                       "confidence": 0.6})
    dark = 1.0 if theme == "dark" else 0.0
    groups = group_colors(ctx.colors, scheme=theme)
    ps = palette_stats(groups)
    ax = compute_axes(ctx, m, ps, dark, purpose, fonts_cat)

    # ---- palette roles
    pal, pal_ev, pal_note = {}, {}, {}
    th = KNOWN_THEMES.get(known) if known else None
    theme_name_used = None
    if th and (ctx.flags.get("terminal_theme") or ctx.theme_mentions[known] >= 2) and (th["dark"] == (theme == "dark")):
        theme_name_used = known
    acc_hue = None
    chrom_groups = [g for g in groups if g["C"] >= 14]

    def too_close(g, u):
        d = dE(g["hex"], u)
        if d < 10:
            return True
        uL, _, uh = lch_of(hex_to_lab(u))
        return not (hue_dist(g["h"], uh) > 28 or abs(g["L"] - uL) > 22 or d > 22)

    def gscore_bg(g):
        if theme == "light" and g["L"] < 60:
            return 0
        if theme == "dark" and g["L"] > 35:
            return 0
        pen = 1.0 if g["C"] < 20 else 0.6 if g["C"] < 35 else 0.2
        return g["roles"].get("bg", 0) * pen

    if theme_name_used:
        t = KNOWN_THEMES[theme_name_used]
        eids = [e for c in ctx.colors for e in [c.eid] if c.origin in ("terminal",)] + [e["id"] for e in ctx.evidence if e["type"] in ("document", "terminal-theme")][:2]
        base_ev = cite(eids)
        for k in ("bg", "bg2", "surface", "ink", "ink2", "muted", "ok", "warn", "deny"):
            if t.get(k):
                pal[k] = t[k]
                pal_ev[k] = base_ev
                pal_note[k] = f"{theme_name_used} {k}"
        for i, k in enumerate(("accent", "accent2", "accent3")):
            pal[k] = t["accents"][i]
            pal_ev[k] = base_ev
            pal_note[k] = f"{theme_name_used} accent"
    bgg = max(groups, key=gscore_bg) if groups else None
    if "bg" not in pal:
        if bgg is not None and gscore_bg(bgg) > 0.05:
            pal["bg"], pal_ev["bg"] = bgg["hex"], cite(bgg["eids"])
            pal_note["bg"] = f"measured ({', '.join(list(bgg['origins'])[:3])})"
        else:
            pal["bg"], pal_ev["bg"], pal_note["bg"] = None, "", "derived"
    # accents
    used, chosen_acc = [], {}

    def acc_score(g, slot):
        if pal.get("bg") and dE(g["hex"], pal["bg"]) < 10:
            return 0
        base = g["roles"].get("accent", 0) + 0.7 * g["roles"].get("accent2", 0) + 0.5 * g["roles"].get("accent3", 0)
        if slot == "accent2":
            base += 0.8 * g["roles"].get("accent2", 0)
        if slot == "accent3":
            base += 0.8 * g["roles"].get("accent3", 0)
        auth = 1.25 if (g["origins"].get("token") or g["origins"].get("theme") or g["origins"].get("meta") or g["origins"].get("computed")) else 1.0
        want = {"accent": r"^spec:accent$|primary|brand", "accent2": r"^spec:accent2$|secondary", "accent3": r"^spec:accent3$|tertiary"}[slot]
        named = any(re.search(want, n_, re.I) for n_ in g["names"])  # the material says which colour is primary/secondary
        return base * (g["C"] / 50) ** 0.5 * auth * (3.0 if named else 1.0)

    for slot in ("accent", "accent2", "accent3"):
        if slot in pal:
            continue
        cands = []
        for g in chrom_groups:
            if any(too_close(g, u) for u in used):
                continue
            if any(g["roles"].get(r, 0) > g["roles"].get("accent", 0) * 1.5 + 0.01 for r in ("ok", "warn", "deny")):
                continue
            s = acc_score(g, slot)
            if s > 0.02:
                cands.append((s, g))
        if cands:
            s, g = max(cands, key=lambda t: t[0])
            pal[slot], pal_ev[slot] = g["hex"], cite(g["eids"])
            pal_note[slot] = "measured" + (f" ({g['names'][0]})" if g["names"] else "")
            used.append(g["hex"])
            chosen_acc[slot] = g
        else:
            pal[slot] = None
    if chosen_acc and all(set(g["origins"]) <= {"text"} for g in chosen_acc.values()):
        review.append({"field": "palette.accent", "reason": "the accents come only from hex codes written in the text ("
                       + ", ".join(f"{k} {g['hex']}" for k, g in chosen_acc.items()) + "); text can describe other things "
                       "(a comparison table, an example); confirm them or add the project's CSS, theme file, logo or screenshots",
                       "confidence": 0.35})
    if pal.get("accent") is None:
        hue = 350 if ax["warm"] > 0.5 else 250
        Lc = 72 if theme == "light" and ax["playful"] > 0.5 else 60 if theme == "light" else 72
        pal["accent"] = lab_to_hex(from_lch(Lc, 45, hue))
        pal_note["accent"] = "derived (no chromatic colour in the material)"
        pal_ev["accent"] = ""
        review.append({"field": "palette.accent", "reason": "no brand/accent colour found in the material; derived from tone", "confidence": 0.3})
    accL, accC, acc_hue = lch_of(hex_to_lab(pal["accent"]))
    off = (35, -35) if (ax["serious"] > 0.55 or ax["luxe"] > 0.5) else (150, 210) if (ax["technical"] > 0.55 and dark) else \
        (100, -100) if ax["playful"] > 0.55 else (60, -60)
    for slot, o in (("accent2", off[0]), ("accent3", off[1])):
        if pal.get(slot) is None:
            if slot == "accent3" and str(pal_note.get("accent2", "")).startswith("measured"):
                L2, C2, h2 = lch_of(hex_to_lab(pal["accent2"]))
                dh = ((h2 - acc_hue + 540) % 360) - 180
                pal[slot] = lab_to_hex(from_lch((accL + L2) / 2, max((accC + C2) / 2, 30), (acc_hue + dh / 2) % 360))
                pal_note[slot] = "derived: hue midway between accent and accent2"
            else:
                Ld = accL if theme == "light" else max(accL, 64)
                pal[slot] = lab_to_hex(from_lch(Ld, max(accC * 0.9, 30), (acc_hue + o) % 360))
                pal_note[slot] = f"derived: accent hue {o:+d}°"
            pal_ev[slot] = pal_ev.get("accent", "")
    # background
    if pal["bg"] is None:
        if theme == "light":
            pal["bg"] = lab_to_hex(from_lch(97.4, 4.5 if ax["warm"] > 0.4 or ps["pastel"] else 2.0, acc_hue))
        else:
            pal["bg"] = lab_to_hex(from_lch(7.0, 6.0, acc_hue if ax["technical"] < 0.5 else 270))
        pal_note["bg"] = "derived: tinted toward the accent hue (no measured page background)"
        review.append({"field": "palette.bg", "reason": "no measured background (cutout images / text-only material); derived", "confidence": 0.5})
    bgL, bgC, bgH = lch_of(hex_to_lab(pal["bg"]))
    if theme == "light" and bgL > 99.3 and bgC < 1.0:
        old = pal["bg"]
        pal["bg"] = lab_to_hex(from_lch(98.0, 1.6, acc_hue))
        pal_note["bg"] += f"; softened from {old} (pure white glares on video; revert if the brand requires it)"
    elif theme == "dark" and bgL < 1.5:
        old = pal["bg"]
        pal["bg"] = lab_to_hex(from_lch(5.5, 3.0, acc_hue))
        pal_note["bg"] += f"; lifted from {old} (pure black crushes in H.264)"
    bgL, bgC, bgH = lch_of(hex_to_lab(pal["bg"]))

    def best_role(role, ok_fn=lambda g: True):
        cands = [(g["roles"].get(role, 0), g) for g in groups if g["roles"].get(role, 0) > 0.05 and ok_fn(g)]
        return max(cands, key=lambda t: t[0])[1] if cands else None

    # ink
    if "ink" not in pal:
        inks = [g for g in groups if g["roles"].get("ink", 0) > 0.05 and g["C"] < 38 and contrast(g["hex"], pal["bg"]) >= 3.0]
        g = max(inks, key=lambda g: g["roles"]["ink"] * (min(contrast(g["hex"], pal["bg"]), 15) / 15) ** 0.8) if inks else None
        if g:
            txt = any(g["origins"].get(o) for o in ("computed", "token", "css", "theme", "terminal", "text", "text-code"))
            pal["ink"], pal_ev["ink"] = g["hex"], cite(g["eids"])
            pal_note["ink"] = "measured text colour" if txt else f"measured text-like detail of {', '.join(Path(x).name for x in g['srcs'][:2])}"
        else:
            pal["ink"] = lab_to_hex(from_lch(15 if theme == "light" else 94, min(12, accC * 0.3), acc_hue)) if theme == "light" else \
                lab_to_hex(from_lch(94, 3, bgH))
            pal_note["ink"], pal_ev["ink"] = "derived: accent-tinted near-black" if theme == "light" else "derived: near-white", ""
    ink0 = pal["ink"]
    ink_target = 7.0 if ("text colour" in pal_note.get("ink", "") or "derived" in pal_note.get("ink", "") or theme_name_used) else 9.0
    pal["ink"], ch = ensure_contrast(pal["ink"], pal["bg"], ink_target)
    if ch:
        pal_note["ink"] += f"; adjusted from {ink0} to reach {ink_target:.0f}:1 on bg"
    # bg2 / surface / line
    if "bg2" not in pal:
        g = best_role("bg2", lambda g: dE(g["hex"], pal["bg"]) > 2.5 and abs(g["L"] - bgL) < 25)
        if g:
            pal["bg2"], pal_ev["bg2"], pal_note["bg2"] = g["hex"], cite(g["eids"]), "measured secondary background"
        else:
            main_bg = gscore_bg(bgg) if bgg is not None else 0.0
            sec = [gg for gg in groups if gg is not bgg and gscore_bg(gg) > max(0.05, 0.25 * main_bg) and dE(gg["hex"], pal["bg"]) > 3
                   and abs(gg["L"] - bgL) < 22]
            if sec:
                gg = max(sec, key=gscore_bg)
                pal["bg2"], pal_ev["bg2"], pal_note["bg2"] = gg["hex"], cite(gg["eids"]), "second measured background"
            else:
                h2 = bgH if bgC >= 4 else acc_hue
                pal["bg2"] = lab_to_hex(from_lch(bgL - 4.0 if theme == "light" else bgL + 4.5, bgC + 3.0, h2))
                pal_note["bg2"] = "derived: bg one step " + ("darker" if theme == "light" else "lighter") + (" in its own hue" if bgC >= 4 else " toward the accent hue")
    if "surface" not in pal:
        g = best_role("surface", lambda g: dE(g["hex"], pal["bg"]) > 1.5 and (g["L"] > 75 if theme == "light" else g["L"] < 40))
        if g:
            pal["surface"], pal_ev["surface"], pal_note["surface"] = g["hex"], cite(g["eids"]), "measured card/panel colour"
        else:
            if theme == "light":
                pal["surface"] = "#FFFFFF" if bgL < 99 else lab_to_hex(from_lch(bgL - 2.5, bgC + 2, bgH))
            else:
                pal["surface"] = lab_to_hex(from_lch(bgL + 6.5, bgC + 2.0, bgH))
            pal_note["surface"] = "derived from bg"
    g = best_role("line", lambda g: dE(g["hex"], pal["bg"]) > 2 and g["C"] < 25 and 1.08 <= contrast(g["hex"], pal["bg"]) <= 3.5)
    pal["line"] = g["hex"] if g else mix(pal["ink"], pal["bg"], 0.86)
    # ink2 / muted
    if "ink2" not in pal:
        g = best_role("ink2", lambda g: g["C"] < 40 and contrast(g["hex"], pal["bg"]) >= 3.0 and dE(g["hex"], pal["ink"]) > 6)
        if g:
            pal["ink2"], pal_ev["ink2"], pal_note["ink2"] = g["hex"], cite(g["eids"]), "measured secondary text"
        else:
            pal["ink2"], pal_note["ink2"] = mix(pal["ink"], pal["bg"], 0.3), "derived: ink 30% toward bg"
    if not pal.get("ink2"):
        pal["ink2"], pal_note["ink2"] = mix(pal["ink"], pal["bg"], 0.3), "derived: ink 30% toward bg"
    if contrast(pal["ink2"], pal["bg"]) > contrast(pal["ink"], pal["bg"]) + 0.5:
        if contrast(pal["ink2"], pal["bg"]) >= 7.0 and "measured" in pal_note.get("ink2", ""):
            pal["ink"], pal["ink2"] = pal["ink2"], pal["ink"]
            pal_note["ink"], pal_note["ink2"] = pal_note.get("ink2", "") + " (swapped: higher contrast)", pal_note.get("ink", "")
        else:
            pal["ink2"], pal_note["ink2"] = mix(pal["ink"], pal["bg"], 0.3), "derived: ink 30% toward bg (measured one out-contrasted ink)"
    iL, iC, _ = lch_of(hex_to_lab(pal["ink"]))
    if iC < 3 and (iL < 2.0 or iL > 99.3) and not theme_name_used:
        old = pal["ink"]
        pal["ink"] = lab_to_hex(from_lch(9.0 if iL < 50 else 96.5, 3.0, acc_hue))
        pal_note["ink"] = pal_note.get("ink", "") + f"; softened from {old} (pure black/white text is harsh on video)"
    pal["ink2"], _ = ensure_contrast(pal["ink2"], pal["bg"], 4.5)
    if not pal.get("muted"):
        pal["muted"], pal_note["muted"] = mix(pal["ink"], pal["bg"], 0.52), "derived: ink 52% toward bg"
    # muted is a TEXT role (labels, meta lines, disclaimers): 4.5:1 like body text; "line" is the decoration role
    pal["muted"], ch = ensure_contrast(pal["muted"], pal["bg"], 4.5)
    if ch:
        pal_note["muted"] = pal_note.get("muted", "") + "; lifted to 4.5:1 (muted is used for small text)"
    # semantic
    sem = {"ok": (145, (52, 50) if theme == "light" else (80, 55)), "warn": (70, (60, 66) if theme == "light" else (84, 62)),
           "deny": (25, (50, 62) if theme == "light" else (66, 62))}
    windows = {"ok": (118, 172, 28), "warn": (58, 100, 40), "deny": (-22, 45, 45)}
    for k, (hue, (Ls, Cs)) in sem.items():
        if pal.get(k):
            pal[k], _ = ensure_contrast(pal[k], pal["bg"], 3.0)
            continue
        g = best_role(k, lambda g: g["C"] > 20)
        lo_, hi_, cmin = windows[k]
        reuse = None
        for slot in ("accent2", "accent3"):
            L_, C_, h_ = lch_of(hex_to_lab(pal[slot]))
            hh_ = h_ - 360 if h_ > 300 else h_
            if str(pal_note.get(slot, "")).startswith("measured") and C_ >= cmin and lo_ <= hh_ <= hi_:
                reuse = slot
                break
        if g is not None:
            pal[k], pal_ev[k], pal_note[k] = g["hex"], cite(g["eids"]), "measured (named token/theme)"
        elif reuse:
            pal[k], pal_ev[k], pal_note[k] = pal[reuse], pal_ev.get(reuse, ""), f"the material's own {reuse} sits in the {k} hue window"
        else:
            cs = Cs * (0.8 if ps["pastel"] or ax["luxe"] > 0.5 else 1.0)
            others = [pal[x] for x in ("accent", "accent2", "accent3", "ok", "warn", "deny") if pal.get(x) and x != k]
            best_c = None
            for step in (0, 14, -14, 28, -28):
                c_, _ = ensure_contrast(lab_to_hex(from_lch(Ls, cs, hue + step)), pal["bg"], 3.0)
                dmin = min((dE(c_, o) for o in others), default=99.0) - abs(step) * 0.15  # prefer the canonical hue
                if best_c is None or dmin > best_c[0]:
                    best_c = (dmin, c_)
                if dmin > 18 and step == 0:
                    break
            pal[k], pal_note[k] = best_c[1], "derived semantic colour (hue chosen for distance from the accents)"
        pal[k], _ = ensure_contrast(pal[k], pal["bg"], 3.0)
    for slot in ("accent2", "accent3"):
        if str(pal_note.get(slot, "")).startswith("derived"):
            L_, C_, h_ = lch_of(hex_to_lab(pal[slot]))
            for _ in range(8):
                if all(dE(pal[slot], pal[x]) > 15 for x in ("ok", "warn", "deny")):
                    break
                h_ = (h_ + 30) % 360
                pal[slot] = lab_to_hex(from_lch(L_, C_, h_))
    pal["accentInk"], ch = ensure_contrast(pal["accent"], pal["bg"], 4.5)
    if ch:
        pal_note["accentInk"] = f"accent {pal['accent']} is {contrast(pal['accent'], pal['bg']):.1f}:1 on bg; text variant reaches 4.5:1"
    g = best_role("onAccent", lambda g: contrast(g["hex"], pal["accent"]) >= 3.0)
    if g is not None:
        pal["onAccent"] = g["hex"]
        pal_note["onAccent"] = f"measured (text on the material's accent buttons, {contrast(g['hex'], pal['accent']):.1f}:1)"
    else:
        best_on = max(("#FFFFFF", pal["ink"], pal["bg"]), key=lambda c: contrast(c, pal["accent"]))
        pal["onAccent"], _ = ensure_contrast(best_on, pal["accent"], 4.5)
    order = ["bg", "bg2", "surface", "ink", "ink2", "muted", "accent", "accent2", "accent3", "ok", "warn", "deny", "accentInk", "onAccent", "line"]
    pal = {k: pal[k].upper() for k in order if pal.get(k)}
    contrasts = {k: round(contrast(v, pal["bg"]), 2) for k, v in pal.items() if k != "bg"}
    # accessibility checks
    for kind in ("deutan", "protan"):
        d = dE(cvd(pal["ok"], kind), cvd(pal["deny"], kind))
        if d < 12:
            warnings.append(f"ok {pal['ok']} and deny {pal['deny']} are hard to tell apart for {kind} viewers (ΔE00 {d:.1f}); "
                            "pair them with icons/shapes (✓/✕, stamps), never colour alone")
            break
    if contrast(pal["accent"], pal["bg"]) < 3.0:
        warnings.append(f"accent {pal['accent']} has {contrast(pal['accent'], pal['bg']):.1f}:1 on bg: use it for fills/glows, "
                        f"and accentInk {pal['accentInk']} for text")
    alltext = "\n".join(d.text for d in docs).lower()
    title_low = (inv.get("title") or "").lower()
    for k in ("accent", "accent2", "accent3"):
        for brand, bhex in THIRD_PARTY.items():
            if dE(pal[k], bhex) < 4.0 and re.search(r"\b" + re.escape(brand) + r"\b", alltext) and brand not in title_low:
                warnings.append(f"{k} {pal[k]} is close to {brand}'s brand colour {bhex} and {brand} is named in the material: "
                                f"keep that colour for {brand}'s own mark, not as the reel's identity")
                review.append({"field": f"palette.{k}", "reason": f"matches third-party brand colour ({brand})", "confidence": 0.4})
    dec["theme"] = {"value": theme, "why": why, "known_theme": theme_name_used or known}
    alt_pal, alt_note = build_alt_palette(ctx, pal, theme, acc_hue, theme_name_used or known)

    # ---- swatches (measured colours, for decoration)
    sw = []
    for g in sorted(groups, key=lambda g: -g["w"])[:12]:
        sw.append({"hex": g["hex"], "share": round(g["w"] / max(1e-6, sum(gg["w"] for gg in groups)), 3),
                   "role": max(g["roles"], key=g["roles"].get) if g["roles"] else "", "from": g["srcs"][:2]})

    # ---- fonts
    def stack(primary, cat, cjk=False):
        names = []
        for n in primary:
            if not n:
                continue
            names.append(n)
            r = fi.resolve(n)
            if r and r != n:
                names.append(r)
        alts = CJK_STACKS.get(cat, []) if cjk else ALTERNATIVES.get(cat, ALTERNATIVES["grotesk"])
        inst = [fi.resolve(x) for x in alts]
        inst = [x for x in inst if x]
        names += inst[:3 if cjk else 2]
        if cjk and alts:
            names += [x for x in alts if "CJK" in x][:1]
        if not primary:
            names = [alts[0]] + names if alts and alts[0] not in names else names
        if not inst and alts:
            names += alts[:2]
        return font_list_css(names + [GENERIC.get(cat, "sans-serif")] if not cjk else names + ["sans-serif"])

    term_tool = bool((ctx.flags.get("terminal_theme") and (purpose in ("tool", "docs") or ax["technical"] > 0.5)) or ctx.flags.get("statusline")
                     or (purpose == "tool" and ax["technical"] > 0.6))
    tone_display = "mono" if (term_tool and ax["technical"] > 0.7 and ax["playful"] < 0.4) else \
        "rounded" if ax["playful"] > 0.6 else "display-serif" if ax["luxe"] > 0.55 else "serif" if ax["serious"] > 0.6 \
        else "grotesk" if ax["technical"] > 0.55 else "geometric" if ax["energy"] > 0.6 else "grotesk"
    disp_fam = src_display or (src_body if src_body and fonts_cat["body"] not in ("serif",) and ax["serious"] < 0.6 else None)
    disp_cat = font_category(disp_fam) if disp_fam else tone_display
    fonts = {}
    fonts["display"] = stack([disp_fam] if disp_fam else [], disp_cat if disp_fam else tone_display)
    sans_src = src_body if src_body and font_category(src_body) not in ("serif", "display-serif", "mono") else None
    fonts["sans"] = stack([sans_src] if sans_src else [], font_category(sans_src) if sans_src else
                          ("rounded" if ax["playful"] > 0.7 else "humanist" if ax["warm"] > 0.6 and ax["technical"] < 0.4 else "grotesk"))
    serif_src = next((f for f in (src_display, src_body) if f and font_category(f) in ("serif", "display-serif")), None)
    fonts["serif"] = stack([serif_src] if serif_src else [], font_category(serif_src) if serif_src else ("display-serif" if ax["luxe"] > 0.55 else "serif"))
    fonts["mono"] = stack([src_mono] if src_mono else [], "mono")
    cjk_key = lang_code if lang_code in ("ko", "ja", "zh") else None
    if cjk_key is None:
        for k in ("ko", "ja", "zh"):
            if lang_shares.get(k, 0) >= 0.05:
                cjk_key = k
                break
    if cjk_key:
        fonts["cjk"] = stack([], cjk_key + ("-serif" if disp_cat in ("serif", "display-serif") and ax["serious"] > 0.6 else ""), cjk=True)
    else:
        fonts["cjk"] = font_list_css([x for x in (fi.resolve(n) for n in CJK_STACKS["ko"][:3] + CJK_STACKS["ja"][:2]) if x][:3]
                                     + ["Noto Sans CJK KR", "Noto Sans CJK JP", "sans-serif"])
    # CJK-first copy: a Latin-only display/body face would hand every Hangul/kana/hanzi glyph to an unplanned system
    # fallback. Keep the source face for Latin, put the CJK face second, and flag the pairing for review.
    if lang_code in ("ko", "ja", "zh"):
        cjk_face = next((x.strip().strip('"') for x in fonts["cjk"].split(",") if x.strip().strip('"') not in ("sans-serif", "serif")), None)
        cjk_rx = re.compile(r"CJK|\b(KR|JP|SC|TC|HK)\b|Gothic|Mincho|Pretendard|Hiragino|PingFang|Malgun|Nanum|Spoqa|SUIT|Apple SD|"
                            r"Noto Sans (KR|JP|SC|TC)|Noto Serif (KR|JP|SC|TC)|Gmarket|Yu |Meiryo|Source Han|Sarasa|Black Han", re.I)
        for role in ("display", "sans"):
            names = [x.strip().strip('"') for x in fonts[role].split(",") if x.strip()]
            if cjk_face and names and not cjk_rx.search(names[0]) and cjk_face not in names:
                fonts[role] = font_list_css([names[0], cjk_face] + names[1:])
                review.append({"field": f"fonts.{role}", "reason": f"the copy is mostly {lang_bcp}, but {names[0]} has no {lang_code} glyphs: "
                               f"they render in {cjk_face} (placed second in the stack); confirm the pairing or choose a "
                               f"{lang_code} display face", "confidence": 0.5})
    files, seen_paths = [], {}
    for ff in sorted(ctx.font_files, key=lambda f: (" " not in str(f.get("weight", "400")), str(f["path"]))):
        if str(Path(ff["path"]).resolve()) in seen_paths:      # one entry per file (a CSS weight range wins)
            continue
        seen_paths[str(Path(ff["path"]).resolve())] = True
        ff = {**ff, "family": clean_family(ff["family"])}
        pth = Path(ff["path"])
        try:
            rel = pth.resolve().relative_to(ctx.P)
            files.append({"family": ff["family"], "path": str(rel).replace(os.sep, "/"), "weight": str(ff.get("weight", "400"))})
        except ValueError:
            if a.copy_fonts:
                dst = ctx.P / "assets" / "fonts" / pth.name
                dst.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy(pth, dst)
                files.append({"family": ff["family"], "path": f"assets/fonts/{pth.name}", "weight": str(ff.get("weight", "400"))})
    fonts["files"] = files
    font_report = []
    for fam in sorted(agg, key=lambda f: -sum(agg[f].values()))[:12]:
        font_report.append({"family": fam, "category": font_category(fam), "roles": {k: round(v, 2) for k, v in agg[fam].items()},
                            "installed": fam == "system-ui" or bool(fi.resolve(fam)), "evidence": eids_of[fam][:3]})
    for fam in (src_display, src_body, src_mono):
        if fam and fam != "system-ui" and not fi.resolve(fam):
            review.append({"field": "fonts", "reason": f"source font “{fam}” is not installed here; the stack falls back to "
                                                       f"installed alternatives. Install it or add its file to fonts.files (check the licence)",
                           "confidence": 0.6})
    if ctx.font_files and not files:
        review.append({"field": "fonts.files", "reason": "the material ships font files outside the project; copy licensed files into "
                                                         "P/assets/fonts (or rerun with --copy-fonts) to embed them", "confidence": 0.6})

    # ---- type
    ratios = ctx.type_info["heading_ratio"]
    ratio = float(np.median(ratios)) if ratios else None
    mstep = clamp(ratio ** 0.25, 1.18, 1.38) if ratio else lerp(1.2, 1.36, ax["energy"])
    base = 26 if (ax["serious"] > 0.6 or cjk_key) else 24
    scale = sorted({int(round(base * mstep ** k / 2.0) * 2) for k in range(-2, 8)})
    hw = ctx.type_info["heading_weight"]
    src_hw = int(np.median(hw)) if hw else None
    if disp_cat in ("serif", "display-serif"):
        dw = 600 if ax["serious"] > 0.6 else 500 if ax["luxe"] > 0.5 else 600
    else:
        dw = 800 if (ax["energy"] > 0.6 or ax["playful"] > 0.6 or (src_hw and src_hw >= 800)) else 700 if (src_hw is None or src_hw >= 600 or ax["energy"] > 0.35) else 600
    bw = 400 if theme == "dark" else 500
    tracking = round(-0.025 if (disp_cat in ("grotesk", "geometric") and ax["energy"] > 0.5) else -0.015 if disp_cat in (
        "grotesk", "geometric", "humanist", "rounded") else 0.0 if disp_cat in ("serif", "mono") else 0.01, 3)
    typ = {"scale": scale, "displayWeight": dw, "bodyWeight": bw, "tracking": tracking,
           "trackingLabel": round(lerp(0.08, 0.15, max(ax["technical"], ax["luxe"])), 3)}

    # ---- visual sources
    vs = ["vector"]
    f = ctx.flags
    if f.get("img_mascot"):
        vs.append("mascot-cutouts")
    if f.get("img_screenshot") or (f.get("urls") and purpose not in ("paper",)) or (any(d.kind == "website" for d in docs)):
        vs.append("app-ui")
    if term_tool:
        vs.append("terminal")
    if f.get("shell_cmds", 0) >= 1 or f.get("cli_bin"):
        vs.append("cli")
    if f.get("pdf_pages") and (f.get("pdf_figures") or f.get("img_figure") or any(d.kind == "paper" for d in docs)):
        vs.append("pdf-figures")
    if f.get("urls") or any(d.kind in ("docs", "website") for d in docs):
        vs.append("web-shots")
    if f.get("img_photo"):
        vs.append("photos")
    vs = list(dict.fromkeys(vs))
    src_heavy = (max(hw) >= 700) if hw else None
    extra = {"ui": 1.0 if any(v in vs for v in ("app-ui", "web-shots", "terminal", "cli")) else 0.0,
             "sparse": clamp((60 - m["words_per_section_median"]) / 40), "heavy": 0.5 if src_heavy is None else float(src_heavy),
             "term": 1.0 if any(v in vs for v in ("terminal", "cli")) else 0.0, "pitch": 1.0 if purpose in ("pitch", "launch") else 0.0,
             "claims": 1.0 if inv["claims"] else 0.0, "_pastel": 1.0 if ps["pastel"] else 0.0,
             "_neon": clamp(dark * ps["neonish"] * 1.6), "_citations": sat(m["citation_per_1k"], 4), "_term": 1.0 if term_tool else 0.0,
             "beauty": sat(m.get("beauty_per_1k", 0.0), 4)}   # cosmetics / skincare copy -> glassy SFX (audio.md)
    ex = extended_axes(ax, extra)

    # ---- motion
    pace = "energetic" if ax["energy"] > 0.62 else "calm" if ax["energy"] < 0.35 else "medium"
    trans, trans_sc = pick_by_scores(TRANSITIONS, ex, 0.3, 3, 5)
    reveals, rev_sc = pick_by_scores(TYPE_REVEALS, ex, 0.45, 2, 3)
    ease_sc = {k: (w.get("_bias", 0) + sum(x * ex.get(kk, 0) for kk, x in w.items() if kk != "_bias")) for k, w in EASES.items()}
    ease = max(ease_sc, key=ease_sc.get)
    spring = {"f": r2(lerp(1.6, 3.0, ax["energy"])), "z": r2(clamp(lerp(0.85, 0.38, 0.7 * ax["playful"] + 0.3 * ax["energy"]) + 0.1 * ax["serious"], 0.35, 0.9))}
    overshoot = r2(lerp(0, 1.9, 0.75 * ax["playful"] + 0.25 * ax["energy"]) * (1 - 0.5 * ax["serious"]))
    characters = bool(f.get("img_mascot"))
    data_viz = bool(ax["data"] >= 0.45 or f.get("pdf_figures") or (m["tables"] and m["numbers_per_1k"] > 15))
    motion = {"pace": pace, "spring": spring, "overshoot": overshoot, "ease": ease, "transitions": trans, "characters": characters,
              "dataViz": data_viz, "visualSources": vs, "typeReveal": reveals}
    if "strobe" in trans or "flash" in trans:
        warnings.append("flash/strobe transitions: keep ≤ 3 flashes per second and avoid full-frame saturated red flashes (WCAG 2.3.1)")

    # ---- layout
    rad = ctx.type_info["radius"]
    radius = int(round(np.median(rad))) if rad else int(round(clamp(lerp(4, 32, ax["playful"]) - 6 * ax["technical"], 2, 40)))
    hud = bool((ax["technical"] > 0.55 and ax["energy"] > 0.3) or purpose in ("pitch", "demo", "tool") or (ax["data"] > 0.6 and ax["energy"] > 0.35))

    # ---- narration (decided before captions)
    narr_hint = hints.get("narration")
    words_total = m["words"]
    rec = purpose in ("paper", "docs", "explainer") or ax["serious"] > 0.55 or (ax["data"] > 0.6 and ax["technical"] > 0.5)
    if purpose in ("launch", "brand", "portfolio") and ax["playful"] > 0.6:
        rec = False
    if words_total < 80:
        rec = False
    rec_why = (f"purpose {purpose}, serious {ax['serious']:.2f}, data {ax['data']:.2f}, technical {ax['technical']:.2f}, "
               f"{words_total} words, {m['words_per_section_median']:.0f} words/section")
    if narr_hint in ("on", "off"):
        rec = narr_hint == "on"
        rec_why = "user hint"
    vsc = {k: sig_score(w, ex) + (0.03 if k == "Puck" else 0.0) + VOICE_PURPOSE_BONUS.get(purpose, {}).get(k, 0.0) for k, (_, w) in VOICES.items()}
    voice = max(vsc, key=vsc.get)
    tag = next(t for _, cond, t in STYLE_TAGS if cond(ax, pace))
    narration = {"recommended": bool(rec), "voice": voice, "styleTag": tag, "lang": lang_bcp}
    cap_font = fonts["cjk"] if cjk_key else fonts["sans"]
    plate = pal["surface"] if theme == "light" else tone(pal["bg"], dL=-2)
    r_, g_, b_ = (int(x * 255) for x in hex_to_rgb(plate))
    cap_fg, _ = ensure_contrast(pal["ink"], plate, 7.0)
    captions = {"enabled": bool(rec), "font": cap_font, "size": 38 if cjk_key else 36, "fg": cap_fg,
                "bg": f"rgba({r_},{g_},{b_},{0.86 if theme == 'light' else 0.74})", "y": 960}
    layout = {"theme": theme, "margin": round8(lerp(96, 144, clamp(0.5 * ax["serious"] + 0.3 * ax["luxe"] + 0.3 * (1 - ax["energy"])))),
              "grid": 12, "gutter": 24, "baseline": 8, "hud": hud, "captions": captions, "radius": radius}

    # ---- post
    grain = r2(clamp(0.03 + 0.03 * dark + 0.015 * ax["playful"] * (1 - dark) + 0.01 * ax["warm"] - 0.01 * ax["serious"], 0.015, 0.08), 3)
    vig_col = lab_to_hex(from_lch(22, min(30, accC * 0.5), acc_hue)) if theme == "light" else lab_to_hex(from_lch(2.5, 4, bgH))
    vig_a = r2(lerp(0.12, 0.5, dark) + (0.05 if ax["luxe"] > 0.5 else 0), 2)
    bloom = r2(clamp(0.6 * dark * clamp((ps["accentC"] - 35) / 45) + 0.1 * ax["energy"] * dark, 0, 0.6))
    post = {"grain": grain, "vignette": {"a": vig_a, "color": vig_col}, "bloom": bloom}

    # ---- sound
    psc = {k: round(sig_score(v["w"], ex, linear=True), 3) for k, v in SOUND_PRESETS.items()}
    fits_pace = {"calm": ("ambient", "lofi", "cinematic-lite", "corporate"), "energetic": ("bright-pop", "dark-synth", "corporate", "cinematic-lite")}
    allowed = fits_pace.get(pace, tuple(SOUND_PRESETS))
    preset = max((k for k in psc if k in allowed), key=psc.get)
    lo, hi = SOUND_PRESETS[preset]["bpm"]
    bpm = int(round(lo + (hi - lo) * ax["energy"]))
    minor = (0.4 * dark + 0.2 * ax["serious"] + 0.2 * ax["technical"] + 0.2 * (1 - ax["warm"])) > (0.35 * ax["playful"] + 0.35 * ax["warm"] + 0.3 * (1 - dark))
    keys = [(20, "C"), (45, "G"), (75, "D"), (110, "A"), (170, "E"), (235, "B"), (285, "F#"), (315, "Db"), (345, "Ab"), (361, "F")]
    hh = acc_hue % 360
    key = next(k for lim, k in keys if hh < lim)
    if hh < 20 and hh >= 0 and accC < 25:
        key = "F"
    drums = "full" if (ax["energy"] >= 0.55 or (preset in ("dark-synth", "bright-pop") and ax["energy"] >= 0.45)) else "light" if ax["energy"] >= 0.25 else "none"
    if preset == "ambient" and drums == "full":
        drums = "light"
    sfx_sc = {k: sig_score(w, ex) for k, w in SFX_FAMILIES.items()}
    sfx_sc["glassy"] += 0.35 * ex.get("beauty", 0.0)     # cosmetics / skincare copy: glassy pops and shimmers (audio.md)
    sfx = max(sfx_sc, key=sfx_sc.get)
    e = ax["energy"]
    energy = {"intro": r2(0.25 + 0.15 * e), "groove": r2(0.45 + 0.35 * e), "breakdown": r2(0.25 + 0.2 * e), "drop": r2(0.6 + 0.4 * e),
              "outro": r2(0.3 + 0.2 * e)}
    sound = {"bpm": bpm, "key": key, "mode": "minor" if minor else "major", "preset": preset,
             "instruments": list(SOUND_PRESETS[preset]["instruments"]) + list(SOUND_PRESETS[preset]["drums"].get(drums, [])),
             "drums": drums, "sfx": sfx, "energy": energy}

    # ---- mood
    msc = {k: mood_score(w, ex) for k, w in MOOD_WORDS.items()}
    for k, w in MOOD_WORDS.items():
        for gate in ("_pastel", "_neon", "_citations", "_term"):
            if gate in w and ex.get(gate, 0) < 0.5:
                msc[k] = min(msc[k], 0.0)
    ranked = [k for k, v in sorted(msc.items(), key=lambda t: -t[1])]
    mood = [k for k in ranked if msc[k] > 0.05][:5]
    mood = mood if len(mood) >= 3 else ranked[:3]

    # ---- terminal block
    terminal = None
    if ctx.terminal or theme_name_used or any(v in vs for v in ("terminal", "cli")):
        if ctx.terminal:
            tp = ctx.terminal[0]
            tname = tp.get("match") or tp.get("name")
            thd = KNOWN_THEMES.get(tp.get("match") or "", {})
            ansi = tp["ansi"] if tp.get("ansi") and all(tp["ansi"]) else (theme_ansi(thd) if thd else None)
            terminal = {"theme": tname, "bg": tp["bg"] or (thd.get("bg") if thd else pal["bg"]), "fg": tp["fg"] or (thd.get("ink") if thd else pal["ink"]),
                        "ansi": ansi, "source": tp["src"]}
        elif theme_name_used or known:
            t = KNOWN_THEMES[theme_name_used or known]
            terminal = {"theme": theme_name_used or known, "bg": t["bg"], "fg": t["ink"], "ansi": theme_ansi(t), "source": "named in the material"}
        if terminal is None or not terminal.get("ansi"):
            wbg = pal["bg"] if theme == "dark" else lab_to_hex(from_lch(11, min(8, accC * 0.2), acc_hue))
            fgw = lab_to_hex(from_lch(90, 3, acc_hue))
            hues = [25, 140, 90, 265, 330, 200]
            base_ = [lab_to_hex(from_lch(72, 45, h)) for h in hues]
            br = [lab_to_hex(from_lch(80, 40, h)) for h in hues]
            black, white = lab_to_hex(from_lch(lch_of(hex_to_lab(wbg))[0] + 14, 6, acc_hue)), lab_to_hex(from_lch(82, 3, acc_hue))
            ansi = [black] + base_ + [white] + [tone(black, dL=12)] + br + [fgw]
            terminal = terminal or {"theme": "derived", "bg": wbg, "fg": fgw, "source": "derived from the palette"}
            terminal["ansi"] = ansi

    # ---- rationale + review
    def pc(k):
        return f"{k} {pal[k]} ({pal_note.get(k, 'measured')}{', ' + pal_ev[k] if pal_ev.get(k) else ''})"

    rat = {}
    rat["palette"] = (f"{theme.capitalize()} theme: {why}. " + "; ".join(pc(k) for k in ("bg", "ink", "accent", "accent2", "accent3"))
                      + f". Contrast on bg: ink {contrasts['ink']}:1, ink2 {contrasts['ink2']}:1, muted {contrasts['muted']}:1, "
                        f"accent {contrasts['accent']}:1 (accentInk {contrasts['accentInk']}:1)."
                      + (f" Palette is pastel (accent L {ps['accentL']:.0f}, C {ps['accentC']:.0f})." if ps["pastel"] else "")
                      + (f" Named theme: {theme_name_used}." if theme_name_used else "")
                      + f" paletteAlt ({'dark' if theme == 'light' else 'light'} scenes): bg {alt_pal['bg']} ({alt_note.get('bg') or alt_note.get('all', '')})."
                      + (f" {ctx.flags['dark_slides']} of {ctx.flags['slides']} slides are dark: use paletteAlt for dark scenes."
                         if ctx.flags.get("dark_slides") and theme == "light" else ""))
    fe = cite([e for fam in (src_display, src_body, src_mono) if fam for e in eids_of.get(fam, [])])
    rat["type"] = (f"Source fonts: display {src_display or '—'}, body {src_body or ('system UI' if uses_system_ui else '—')}, mono {src_mono or '—'}{' ' + fe if fe else ''}. "
                   f"Display category {disp_cat}{' (chosen by tone: no source display font)' if not disp_fam else ''}; "
                   f"heading/body ratio {f'{ratio:.2f}' if ratio else 'n/a'} → modular step {mstep:.2f}; displayWeight {dw}"
                   f"{f' (source headings {src_hw})' if src_hw else ''}, bodyWeight {bw} ({'light text on dark reads heavier' if theme == 'dark' else 'compression thins strokes on light'}).")
    rat["motion"] = (f"Energy {ax['energy']:.2f} (‘!’ {m['exclaim_per_1k']}/1k, emoji {m['emoji_per_1k']}/1k, marketing {m['marketing_per_1k']}/1k, "
                     f"numbers {m['numbers_per_1k']}/1k, hedges {m['hedge_per_1k']}/1k, citations {m['citation_per_1k']}/1k) → {pace} pace; "
                     f"playful {ax['playful']:.2f}, technical {ax['technical']:.2f}, serious {ax['serious']:.2f} → spring f {spring['f']} z {spring['z']}, "
                     f"overshoot {overshoot}, ease {ease}; transitions {', '.join(f'{t} {trans_sc[t]:.2f}' for t in trans)}.")
    second = sorted(psc.items(), key=lambda t: -t[1])[1]
    rat["sound"] = (f"{preset} scored {psc[preset]:.2f} (next {second[0]} {second[1]:.2f}) from dark {dark:.0f}, warm {ax['warm']:.2f}, "
                    f"playful {ax['playful']:.2f}, technical {ax['technical']:.2f}; {bpm} BPM inside {lo}–{hi} by energy; key {key} from the accent hue "
                    f"{acc_hue:.0f}° (free choice), {sound['mode']} mode; drums {drums}; sfx {sfx}.")
    rat["narration"] = (f"{'Recommended' if rec else 'Not recommended'}: {rec_why}. Voice {voice} ({VOICES[voice][0]}), tag {tag}, "
                        f"language {lang_bcp} ({', '.join(f'{k} {v:.0%}' for k, v in list(lang_shares.items())[:3])}); register: {reg}.")
    vis_bits = []
    if f.get("img_mascot"):
        vis_bits.append(f"{f['img_mascot']} mascot cutout(s)")
    if f.get("img_logo"):
        vis_bits.append(f"{f['img_logo']} logo(s)")
    if f.get("img_screenshot"):
        vis_bits.append(f"{f['img_screenshot']} screenshot(s)")
    if f.get("pdf_figures"):
        vis_bits.append(f"{f['pdf_figures']} figure colours in PDF vector art")
    if f.get("shell_cmds"):
        vis_bits.append(f"{f['shell_cmds']} shell command(s)")
    if term_tool:
        vis_bits.append("terminal tool (theme/statusline)")
    if f.get("img_photo"):
        vis_bits.append(f"{f['img_photo']} photo(s)")
    rat["visuals"] = (f"Found: {', '.join(vis_bits) or 'text only'}. Sources: {', '.join(vs)}; characters {characters}"
                      f"{' (no mascot image in the material)' if not characters else ''}; dataViz {data_viz} (data {ax['data']:.2f}, "
                      f"{m['tables']} tables). Purpose {purpose}.")
    # standard review items
    review.append({"field": "mood", "reason": "heuristic from copy + palette; confirm against the material's voice", "confidence": 0.55})
    if not characters and (f.get("img_logo") or f.get("img_cutout")) and ax["playful"] > 0.6:
        review.append({"field": "motion.characters", "reason": "playful material with a cutout logo but no mascot: animate the logo as a "
                                                              "character only if the brand treats it as one", "confidence": 0.4})
    if characters:
        review.append({"field": "motion.characters", "reason": "mascot images found: confirm usage rights before generating poses", "confidence": 0.7})
    review.append({"field": "sound", "reason": f"preset/BPM inferred from tone ({preset}, {bpm} BPM); confirm with the brief", "confidence": 0.55})
    review.append({"field": "narration.recommended", "reason": rec_why, "confidence": 0.5})
    if not docs:
        review.append({"field": "*", "reason": "no text in the material: tone axes rest on visuals only", "confidence": 0.3})
    if purpose == "general":
        review.append({"field": "purpose", "reason": f"no clear purpose signal ({purpose_sc}); pass --purpose", "confidence": 0.4})

    style = {
        "$schema": "../templates/style.schema.json",
        "meta": {"generator": f"extract_style.py {VERSION}", "draft": True, "evidence": "build/style-extract.json",
                 "purpose": purpose, "audience": hints.get("audience") or audience_of(ax, purpose, m), "title": inv.get("title") or ""},
        "source": [dict(s, kind="website", notes=("docs site; " + s.get("notes", "")).strip("; ")) if s.get("kind") == "docs" else s
                   for s in ctx.sources],
        "mood": mood,
        "rationale": rat,
        "palette": pal,
        "fonts": fonts,
        "type": typ,
        "layout": layout,
        "motion": motion,
        "post": post,
        "sound": sound,
        "narration": narration,
    }
    style["paletteAlt"] = alt_pal
    if terminal:
        style["terminal"] = terminal
    style["swatches"] = sw
    style["review"] = review
    decisions = {"axes": ax, "extended_axes": {k: round(v, 3) for k, v in ex.items()}, "palette_stats": ps, "purpose_scores": purpose_sc,
                 "purpose": purpose, "contrast": contrasts, "palette_notes": pal_note, "transition_scores": trans_sc,
                 "reveal_scores": rev_sc, "ease_scores": {k: round(v, 3) for k, v in ease_sc.items()}, "sound_scores": psc,
                 "voice_scores": {k: round(v, 3) for k, v in vsc.items()}, "sfx_scores": {k: round(v, 3) for k, v in sfx_sc.items()},
                 "mood_scores": {k: round(v, 3) for k, v in sorted(msc.items(), key=lambda t: -t[1])[:12]}, "fonts": font_report,
                 "font_sources": {"display": src_display, "body": src_body, "mono": src_mono, "system_ui": uses_system_ui},
                 "theme": dec["theme"], "bg_votes": {"light": round(light_w, 2), "dark": round(dark_w, 2)}, "heading_ratio": ratio,
                 "palette_alt_notes": alt_note}
    return style, m, inv, decisions


THEME_SIBLINGS = {"catppuccin-mocha": "catppuccin-latte", "catppuccin-macchiato": "catppuccin-latte", "catppuccin-frappe": "catppuccin-latte",
                  "catppuccin-latte": "catppuccin-mocha", "solarized-dark": "solarized-light", "solarized-light": "solarized-dark",
                  "github-dark": "github-light", "github-light": "github-dark"}


def build_alt_palette(ctx, pal, theme, acc_hue, theme_name=None):
    """Opposite-theme palette for scenes flagged dark (on a light reel) or light (on a dark reel).
    Measured from the material's other scheme when it has one, else a known sibling theme, else derived."""
    alt = "light" if theme == "dark" else "dark"
    dark = alt == "dark"
    note = {}
    sib = KNOWN_THEMES.get(THEME_SIBLINGS.get(theme_name or "", ""))
    if sib:
        out = {"theme": alt, "bg": sib["bg"], "bg2": sib["bg2"], "surface": sib["surface"], "ink": sib["ink"],
               "ink2": sib.get("ink2") or mix(sib["ink"], sib["bg"], 0.3), "muted": sib.get("muted") or mix(sib["ink"], sib["bg"], 0.52),
               "accent": sib["accents"][0], "accent2": sib["accents"][1], "accent3": sib["accents"][2], "ok": sib["ok"] or pal["ok"],
               "warn": sib["warn"], "deny": sib["deny"]}
        note["all"] = f"sibling theme {THEME_SIBLINGS[theme_name]}"
    else:
        groups_alt = group_colors([c for c in ctx.colors if c.scheme == alt], use_all=True)

        def gb(g):
            if (alt == "light" and g["L"] < 60) or (dark and g["L"] > 35):
                return 0
            return g["roles"].get("bg", 0) * (1.0 if g["C"] < 20 else 0.6 if g["C"] < 35 else 0.2)

        mb = max(groups_alt, key=gb) if groups_alt else None
        if mb is not None and gb(mb) > 0.05:
            bg = mb["hex"]
            note["bg"] = f"measured in the material's {alt} scheme {cite(mb['eids'])}"
        else:
            bg = lab_to_hex(from_lch(7.5, 7.0, acc_hue)) if dark else lab_to_hex(from_lch(97.6, 3.0, acc_hue))
            note["bg"] = "derived from the accent hue"
        bL, bC, bH = lch_of(hex_to_lab(bg))
        gi = [g for g in groups_alt if g["roles"].get("ink", 0) > 0.05 and g["C"] < 38 and contrast(g["hex"], bg) >= 3]
        ink = max(gi, key=lambda g: g["roles"]["ink"])["hex"] if gi else (
            lab_to_hex(from_lch(94, 3, bH)) if dark else lab_to_hex(from_lch(14, 8, acc_hue)))
        out = {"theme": alt, "bg": bg, "bg2": lab_to_hex(from_lch(bL + 4.5 if dark else bL - 4.0, bC + 3, bH if bC >= 4 else acc_hue)),
               "surface": lab_to_hex(from_lch(bL + 7.0, bC + 2, bH)) if dark else ("#FFFFFF" if bL < 99 else lab_to_hex(from_lch(bL - 2.5, bC + 2, bH))),
               "ink": ink}
        for k in ("accent", "accent2", "accent3", "ok", "warn", "deny"):
            out[k] = pal[k]
    out["ink"], _ = ensure_contrast(out["ink"], out["bg"], 7.0)
    out["ink2"], _ = ensure_contrast(out.get("ink2") or mix(out["ink"], out["bg"], 0.3), out["bg"], 4.5)
    out["muted"], _ = ensure_contrast(out.get("muted") or mix(out["ink"], out["bg"], 0.52), out["bg"], 4.5)
    for k in ("accent", "accent2", "accent3", "ok", "warn", "deny"):
        out[k], _ = ensure_contrast(out[k], out["bg"], 3.0)
    out["accentInk"], _ = ensure_contrast(out["accent"], out["bg"], 4.5)
    best_on = max(("#FFFFFF", out["ink"], out["bg"]), key=lambda c: contrast(c, out["accent"]))
    out["onAccent"], _ = ensure_contrast(best_on, out["accent"], 4.5)
    out["line"] = mix(out["ink"], out["bg"], 0.85)
    order = ["theme", "bg", "bg2", "surface", "ink", "ink2", "muted", "accent", "accent2", "accent3", "ok", "warn", "deny", "accentInk", "onAccent", "line"]
    return {k: (out[k].upper() if k != "theme" else out[k]) for k in order}, note


def audience_of(ax, purpose, m):
    if purpose == "paper":
        return "researchers"
    if purpose == "pitch":
        return "investors and judges"
    if purpose == "brand":
        return "designers and marketers"
    if purpose in ("docs", "tool") or ax["technical"] > 0.55:
        return "developers"
    if ax["playful"] > 0.5 or m.get("second_person_per_1k", 0) > 15:
        return "consumers"
    return "general"


# ═════════════════════════════════════════ validation ═════════════════════════════════════════
REQUIRED = {
    "source": list, "mood": list, "rationale": dict, "palette": dict, "fonts": dict, "type": dict, "layout": dict, "motion": dict,
    "post": dict, "sound": dict, "narration": dict,
}
PALETTE_KEYS = ["bg", "bg2", "surface", "ink", "ink2", "muted", "accent", "accent2", "accent3", "ok", "warn", "deny"]
ENUMS = {
    ("layout", "theme"): ("light", "dark"),
    ("motion", "pace"): ("calm", "medium", "energetic"),
    ("sound", "preset"): ("bright-pop", "dark-synth", "ambient", "corporate", "lofi", "cinematic-lite"),
    ("sound", "drums"): ("none", "light", "full"),
    ("sound", "sfx"): ("glassy", "digital", "organic", "minimal"),
    ("sound", "mode"): ("major", "minor"),
}
TRANSITION_NAMES = ("cut", "blobWipe", "zoomInto", "whip", "glitch", "flash", "strobe", "match", "impact", "portalFlash")
VISUAL_SOURCES = ("vector", "mascot-cutouts", "app-ui", "terminal", "cli", "pdf-figures", "web-shots", "photos")


def validate_style(obj):
    """Errors as 'path: message'. Uses jsonschema + templates/style.schema.json when available, plus built-in checks."""
    errs = []
    if SCHEMA_PATH.exists():
        try:
            import jsonschema
            schema = json.loads(SCHEMA_PATH.read_text())
            v = jsonschema.Draft202012Validator(schema)
            for e in sorted(v.iter_errors(obj), key=lambda e: [str(x) for x in e.path]):
                errs.append(f"{'/'.join(map(str, e.path)) or '(root)'}: {e.message}")
        except ImportError:
            pass
        except Exception as e:
            errs.append(f"(schema) {e}")
    for k, t in REQUIRED.items():
        if k not in obj:
            errs.append(f"{k}: required")
        elif not isinstance(obj[k], t):
            errs.append(f"{k}: must be {t.__name__}")
    pal = obj.get("palette", {})
    for k in PALETTE_KEYS:
        if not re.fullmatch(r"#[0-9A-Fa-f]{6}", str(pal.get(k, ""))):
            errs.append(f"palette/{k}: '#RRGGBB' required")
    for (a, b), allowed in ENUMS.items():
        val = (obj.get(a) or {}).get(b)
        if val not in allowed:
            errs.append(f"{a}/{b}: {val!r} not in {allowed}")
    for t in (obj.get("motion") or {}).get("transitions", []):
        if t not in TRANSITION_NAMES:
            errs.append(f"motion/transitions: unknown {t!r}")
    for s in (obj.get("motion") or {}).get("visualSources", []):
        if s not in VISUAL_SOURCES:
            errs.append(f"motion/visualSources: unknown {s!r}")
    for k in ("display", "sans", "serif", "mono", "cjk"):
        if not isinstance((obj.get("fonts") or {}).get(k), str) or not obj["fonts"][k].strip():
            errs.append(f"fonts/{k}: CSS font stack required")
    bpm = (obj.get("sound") or {}).get("bpm")
    if not isinstance(bpm, (int, float)) or not 50 <= bpm <= 200:
        errs.append("sound/bpm: number in 50..200 required")
    try:
        for k in ("ink", "ink2", "muted"):        # text roles (line is the decoration role)
            if pal.get(k) and pal.get("bg") and contrast(pal[k], pal["bg"]) < 4.5:
                errs.append(f"palette/{k}: contrast {contrast(pal[k], pal['bg']):.2f}:1 on bg is below 4.5:1 (a text role)")
    except Exception:
        pass
    seen, out = set(), []
    for e in errs:
        if e not in seen:
            seen.add(e)
            out.append(e)
    return out


# ═════════════════════════════════════════ log writers ═════════════════════════════════════════
def md_escape(s):
    return str(s).replace("|", "\\|").replace("\n", " ")


def write_log(ctx, style, m, inv, dec, path_json, path_md):
    data = {"tool": f"extract_style.py {VERSION}", "project": ".", "sources": ctx.sources, "flags": dict(ctx.flags),
            "theme_mentions": dict(ctx.theme_mentions), "metrics": m, "decisions": dec, "inventory": inv,
            "terminal": ctx.terminal, "images": [{k: v for k, v in im.items() if k not in ("path",)} for im in ctx.images],
            "review": style.get("review", []), "warnings": ctx.warnings, "evidence": ctx.evidence}
    path_json.write_text(json.dumps(data, indent=1, ensure_ascii=False, default=lambda o: o.tolist() if hasattr(o, "tolist") else str(o)))
    L = []
    title = inv.get("title") or style["meta"].get("title") or "untitled"
    L += [f"# Style extraction log: {md_escape(title)}", "",
          f"Generated by `extract_style.py {VERSION}`. This is a **draft**: read the review list, check the board, edit `style.json`, "
          f"then set `meta.draft` to `false`.", ""]
    L += ["## Sources", "", "| # | source | kind | notes |", "|---|---|---|---|"]
    for i, s in enumerate(ctx.sources, 1):
        L.append(f"| {i} | `{md_escape(s.get('path') or s.get('url'))}` | {s.get('kind')} | {md_escape(s.get('notes', ''))} |")
    pal = style["palette"]
    L += ["", "## Palette", "", f"Theme **{style['layout']['theme']}**: {md_escape(dec['theme']['why'])}.", "",
          "| role | hex | contrast on bg | note |", "|---|---|---|---|"]
    for k, v in pal.items():
        ct = "—" if k == "bg" else f"{contrast(v, pal['bg']):.2f}:1"
        L.append(f"| {k} | `{v}` | {ct} | {md_escape(dec['palette_notes'].get(k, ''))} |")
    if style.get("swatches"):
        L += ["", "Measured colours (merged across sources): " + ", ".join(f"`{s['hex']}` {s['share'] * 100:.0f}% ({s['role']})" for s in style["swatches"][:10])]
    f = style["fonts"]
    L += ["", "## Fonts and type", "", "| role | stack |", "|---|---|"]
    for k in ("display", "sans", "serif", "mono", "cjk"):
        L.append(f"| {k} | `{md_escape(f[k])}` |")
    if f.get("files"):
        L.append("")
        L.append("Font files: " + ", ".join(f"`{x['path']}` ({x['family']} {x['weight']})" for x in f["files"]))
    if dec["fonts"]:
        L += ["", "| family seen | category | roles | installed | evidence |", "|---|---|---|---|---|"]
        for fr in dec["fonts"]:
            L.append(f"| {md_escape(fr['family'])} | {fr['category']} | {md_escape(json.dumps(fr['roles']))} | {'yes' if fr['installed'] else 'no'} | {', '.join(fr['evidence'])} |")
    else:
        L += ["", "No fonts are declared or rendered by the material; stacks were chosen by tone."]
    t = style["type"]
    L += ["", f"Type scale `{t['scale']}`, display weight {t['displayWeight']}, body weight {t['bodyWeight']}, tracking {t['tracking']} em "
              f"(labels {t.get('trackingLabel', '—')} em)."]
    mo, so, na, lay, po = style["motion"], style["sound"], style["narration"], style["layout"], style["post"]
    L += ["", "## Motion, layout, post, sound, narration", "",
          f"- **Motion**: pace {mo['pace']}, spring f {mo['spring']['f']} z {mo['spring']['z']}, overshoot {mo['overshoot']}, ease `{mo['ease']}`, "
          f"transitions {', '.join(mo['transitions'])}, text reveals {', '.join(mo.get('typeReveal', []))}, characters {mo['characters']}, "
          f"dataViz {mo['dataViz']}, visual sources {', '.join(mo['visualSources'])}",
          f"- **Layout**: {lay['theme']}, margin {lay['margin']} px, radius {lay.get('radius')} px, HUD {lay['hud']}, captions {lay['captions']['enabled']}",
          f"- **Post**: grain {po['grain']}, vignette {po['vignette']['a']} `{po['vignette']['color']}`, bloom {po['bloom']}",
          f"- **Sound**: {so['preset']} {so['bpm']} BPM, {so['key']} {so['mode']}, drums {so['drums']}, sfx {so['sfx']}, energy `{json.dumps(so['energy'])}`",
          f"- **Narration**: recommended {na['recommended']}, voice {na['voice']}, tag `{na['styleTag']}`, {na['lang']}"]
    if style.get("terminal"):
        tm = style["terminal"]
        L.append(f"- **Terminal**: {tm['theme']} bg `{tm['bg']}` fg `{tm['fg']}` ({tm.get('source', '')})")
    L += ["", "### Rationale", ""]
    for k, v in style["rationale"].items():
        L.append(f"- **{k}**: {md_escape(v)}")
    L += ["", "## Tone axes", "", "| axis | value |", "|---|---|"] + [f"| {k} | {v:.2f} |" for k, v in dec["axes"].items()]
    L += ["", f"Purpose **{dec['purpose']}** (scores {md_escape(dec['purpose_scores'])}); audience {style['meta'].get('audience')}.", "",
          "Mood scores: " + ", ".join(f"{k} {v:.2f}" for k, v in dec["mood_scores"].items()), "",
          "Sound preset scores: " + ", ".join(f"{k} {v:.2f}" for k, v in sorted(dec["sound_scores"].items(), key=lambda t: -t[1])), "",
          "Transition scores: " + ", ".join(f"{k} {v:.2f}" for k, v in dec["transition_scores"].items())]
    L += ["", "## Text metrics", "", "| metric | value |", "|---|---|"]
    for k, v in m.items():
        if k in ("register_detail",):
            continue
        L.append(f"| {k} | {md_escape(v)} |")
    L += ["", "## Inventory (copy for the storyboard)", "", f"- **Title**: {md_escape(inv.get('title') or '—')}",
          f"- **Register**: {md_escape(inv['register'].get('register'))} ({inv['register'].get('language')}). Keep this register in on-screen copy."]
    for key, label in (("taglines", "Taglines"), ("slogans", "Slogan-length lines"), ("claims", "Claims with numbers (need provenance)"),
                       ("disclaimers", "Disclaimers (must stay visible)"), ("provenance", "Provenance statements"),
                       ("wordingRules", "Wording rules (violations are bugs)")):
        items = inv.get(key) or []
        L.append(f"- **{label}**: " + ("; ".join(f"“{md_escape(x['text'])}” ({x['src']})" for x in items[:8]) if items else "none found"))
    if inv.get("commands"):
        L.append("- **Commands** (candidates for capture_cli.py): " + "; ".join(f"`{md_escape(c)}`" for c in inv["commands"][:10]))
    if inv.get("links"):
        L.append("- **Links** (candidates for web/app captures): " + ", ".join(inv["links"][:8]))
    if inv.get("speakerNotes"):
        L.append("- **Speaker notes**: " + " / ".join(md_escape(x["text"][:200]) for x in inv["speakerNotes"][:3]))
    L += ["", "## Review (needs human or Claude judgment)", ""]
    L += [f"- `{r['field']}` (confidence {r['confidence']:.2f}): {md_escape(r['reason'])}" for r in style.get("review", [])] or ["- none"]
    L += ["", "## Warnings", ""] + ([f"- {md_escape(w)}" for w in ctx.warnings] or ["- none"])
    L += ["", "## Evidence", "", "| id | source | type | summary |", "|---|---|---|---|"]
    for e in ctx.evidence:
        L.append(f"| {e['id']} | `{md_escape(e['source'])}` | {e['type']} | {md_escape(e['summary'])[:300]} |")
    path_md.write_text("\n".join(L) + "\n")


# ═════════════════════════════════════════ style board ═════════════════════════════════════════
def _thumb_data_uri(path, max_side=420):
    """(data URI, is_tall) of a downscaled copy, or (None, False)."""
    try:
        im = Image.open(path)
        tall = im.height > im.width * 1.2
        im.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
        bio = BytesIO()
        if im.mode in ("RGBA", "LA", "P"):
            im.convert("RGBA").save(bio, "PNG", optimize=True)
            mime = "image/png"
        else:
            im.convert("RGB").save(bio, "JPEG", quality=82)
            mime = "image/jpeg"
        import base64
        return f"data:{mime};base64," + base64.b64encode(bio.getvalue()).decode("ascii"), tall
    except Exception:
        return None, False


def _font_face_css(style, P):
    import base64
    css = []
    for f in (style.get("fonts") or {}).get("files", []):
        p = (P / f["path"]) if not os.path.isabs(f["path"]) else Path(f["path"])
        if p.exists() and p.stat().st_size < 6_000_000:
            fmt = {".woff2": "woff2", ".woff": "woff", ".otf": "opentype", ".ttf": "truetype"}.get(p.suffix.lower(), "truetype")
            b64 = base64.b64encode(p.read_bytes()).decode("ascii")
            css.append(f"@font-face{{font-family:'{f['family']}';src:url(data:font/{fmt};base64,{b64}) format('{fmt}');font-weight:{f.get('weight', '400')};}}")
    return "\n".join(css)


def board_html(style, inv, thumbs, P):
    pal, fonts, typ, lay, mo, so, na, po = (style["palette"], style["fonts"], style["type"], style["layout"], style["motion"], style["sound"],
                                            style["narration"], style["post"])
    e = htmllib.escape
    title = (style.get("meta") or {}).get("title") or inv.get("title") or "Untitled"
    title = re.sub(r"[\U0001F300-\U0001FAFF\u2600-\u27BF]", "", title).strip() or "Untitled"
    tagline = next((x["text"] for x in (inv.get("taglines") or []) if 2 <= count_words(x["text"]) <= 16), "") or \
        next((h for h in (inv.get("headings") or []) if h and h != title), "")
    claim = next((x["text"] for x in (inv.get("claims") or []) if len(x["text"]) < 70), "")
    cmd = (inv.get("commands") or [""])[0]
    mono_line = ("$ " + cmd[:60]) if cmd else (claim[:60] if claim else "0123456789 · +12.5% · p99 4.8 ms")
    cjk_sample = {"ko": "모션은 소재의 말투를 따릅니다", "ja": "モーションは素材の語り口に従います", "zh": "动态跟随素材的语气"}.get(
        str(na.get("lang", "")).split("-")[0], "모션 · モーション · 动态")
    dw, bw = typ.get("displayWeight", 700), typ.get("bodyWeight", 400)
    tr = typ.get("tracking", 0)
    trd = tr.get("display", 0) if isinstance(tr, dict) else float(tr or 0)
    trl = typ.get("trackingLabel", tr.get("label", 0.12) if isinstance(tr, dict) else 0.12)
    vars_css = ";".join(f"--{k}:{v}" for k, v in pal.items())
    rad = lay.get("radius", 16)
    sw = []
    order = [k for k in ("bg", "bg2", "surface", "line", "ink", "ink2", "muted", "accent", "accent2", "accent3", "accentInk", "onAccent", "ok", "warn", "deny") if k in pal]
    for k in order:
        v = pal[k]
        ct = contrast(v, pal["bg"]) if k != "bg" else None
        badge = "" if ct is None else ("AAA" if ct >= 7 else "AA" if ct >= 4.5 else "AA-large" if ct >= 3 else "fill only")
        txt = "#FFFFFF" if contrast("#FFFFFF", v) >= contrast("#111111", v) else "#111111"
        sw.append(f'<div class="sw"><div class="chip" style="background:{v};color:{txt}">{e(k)}</div><div class="hx">{v}</div>'
                  f'<div class="ct">{"" if ct is None else f"{ct:.1f}:1 · {badge}"}</div></div>')
    moods = "".join(f'<span class="mood">{e(x)}</span>' for x in style.get("mood", []))
    trans = "".join(f'<span class="pill">{e(x)}</span>' for x in mo.get("transitions", []))
    srcs = "".join(f'<span class="pill ghost">{e(x)}</span>' for x in mo.get("visualSources", []))
    reveals = "".join(f'<span class="pill ghost">{e(x)}</span>' for x in mo.get("typeReveal", []))
    en = so.get("energy", {})
    en_items = en.items() if isinstance(en, dict) else zip(["intro", "groove", "breakdown", "drop", "outro"], en)
    bars = "".join(f'<div class="bar"><div style="height:{int(v * 100)}%"></div><span>{e(k)}</span></div>' for k, v in en_items)
    th_html = "".join(f'<figure><img src="{u}" style="object-position:{"top" if tall and not whole else "center"}'
                      f'{";object-fit:contain;padding:6px;box-sizing:border-box" if whole else ""}"><figcaption>{e(lbl)}</figcaption></figure>'
                      for u, lbl, tall, *rest in thumbs[:4] for whole in [bool(rest and rest[0])])
    hud = ""
    if lay.get("hud"):
        hud = ('<div class="hud"><i></i><b class="on">Intro</b><b>Proof</b><b>Demo</b><b>Close</b></div>')
    cap = ""
    if lay.get("captions", {}).get("enabled"):
        c = lay["captions"]
        cap = f'<div class="cap" style="background:{c["bg"]};color:{c["fg"]};font-family:{c["font"]}">{e(tagline[:70] or "Captions follow the narration")}</div>'
    grain_op = clamp(po.get("grain", 0.04) * 5, 0, 0.35)
    vig = po.get("vignette", {"a": 0.2, "color": "#000000"})
    vr, vg, vb = (int(x * 255) for x in hex_to_rgb(vig.get("color", "#000000")))
    noise = ("data:image/svg+xml;utf8," + "<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence "
             "type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter>"
             "<rect width='100%' height='100%' filter='url(%23n)'/></svg>")
    review = style.get("review", [])
    rv = " · ".join(sorted({r["field"] for r in review}))[:180]
    fam1 = lambda s: s.split(",")[0].strip().strip('"')
    return f"""<!doctype html><html><head><meta charset="utf-8"><title>Style board</title><style>
{_font_face_css(style, P)}
:root{{{vars_css};--display:{fonts['display']};--sans:{fonts['sans']};--serif:{fonts['serif']};--mono:{fonts['mono']};--cjk:{fonts['cjk']}}}
*{{box-sizing:border-box}}html,body{{margin:0;width:1920px;height:1080px;overflow:hidden;background:var(--bg2);color:var(--ink);font-family:var(--sans)}}
.wrap{{position:absolute;inset:0;padding:44px 56px;display:grid;grid-template-columns:960px 1fr;grid-template-rows:auto 1fr auto;gap:22px 40px}}
header{{grid-column:1/3;display:flex;align-items:flex-end;justify-content:space-between;gap:24px}}
.kick{{font:600 15px/1 var(--mono);letter-spacing:{trl}em;text-transform:uppercase;color:var(--muted)}}
h1{{margin:10px 0 0;font:{dw} 60px/1.02 var(--display);letter-spacing:{trd}em;color:var(--ink);max-width:1200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}}
.sub{{margin-top:8px;font:{bw} 19px/1.3 var(--sans);color:var(--ink2)}}
.moods{{display:flex;gap:10px;flex-wrap:wrap;justify-content:flex-end;max-width:640px}}
.mood{{font:600 20px/1 var(--sans);padding:12px 18px;border-radius:999px;background:var(--surface);color:var(--accentInk);border:1.5px solid var(--line)}}
.panel{{background:var(--surface);border-radius:{min(rad, 28)}px;padding:22px 24px;border:1px solid var(--line)}}
.left{{display:flex;flex-direction:column;gap:20px;min-height:0}}
.swatches{{display:grid;grid-template-columns:repeat(5,1fr);gap:12px 14px}}
.sw .chip{{height:66px;border-radius:12px;display:flex;align-items:flex-end;padding:8px 10px;font:600 13px/1 var(--mono);box-shadow:inset 0 0 0 1px rgba(0,0,0,.08)}}
.sw .hx{{margin-top:6px;font:600 14px/1 var(--mono);color:var(--ink)}}.sw .ct{{margin-top:4px;font:500 12px/1 var(--mono);color:var(--muted)}}
.type .row{{display:flex;align-items:baseline;gap:18px;border-top:1px solid var(--line);padding:9px 0}}.type .row:first-child{{border-top:0}}
.type .lab{{width:110px;flex:none;font:600 12px/1.2 var(--mono);color:var(--muted);text-transform:uppercase;letter-spacing:.08em}}
.type .lab small{{display:block;text-transform:none;letter-spacing:0;font-weight:500;margin-top:3px}}
.d{{font:{dw} 64px/1.05 var(--display);letter-spacing:{trd}em;white-space:nowrap;overflow:hidden}}
.s{{font:{bw} 23px/1.35 var(--sans);color:var(--ink2)}}.se{{font:500 28px/1.2 var(--serif)}}.m{{font:500 21px/1.2 var(--mono);color:var(--accentInk)}}
.c{{font:{dw} 30px/1.2 var(--cjk)}}
.right{{display:flex;flex-direction:column;gap:20px;min-height:0}}
.card{{position:relative;width:100%;aspect-ratio:16/9;border-radius:18px;overflow:hidden;background:linear-gradient(135deg,var(--bg),var(--bg2));box-shadow:0 20px 50px rgba(0,0,0,.18)}}
.blob{{position:absolute;border-radius:50%;filter:blur(46px);opacity:.75}}
.card .t{{position:absolute;left:7%;top:24%;right:7%;font:{dw} 72px/1.0 var(--display);letter-spacing:{trd}em;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}}
.card .tg{{position:absolute;left:7%;top:45%;right:18%;font:{bw} 24px/1.3 var(--sans);color:var(--ink2)}}
.card .row{{position:absolute;left:7%;top:63%;display:flex;gap:12px;align-items:center}}
.cta{{background:var(--accent);color:var(--onAccent);font:700 19px/1 var(--sans);padding:13px 20px;border-radius:{rad}px}}
.chipx{{background:var(--surface);color:var(--accentInk);font:600 17px/1 var(--sans);padding:12px 16px;border-radius:{rad}px;border:1px solid var(--line)}}
.okx{{color:var(--ok);font:700 17px/1 var(--mono)}}.denyx{{color:var(--deny);font:700 17px/1 var(--mono)}}
.hud{{position:absolute;right:3.5%;top:6%;display:flex;gap:6px;align-items:center;padding:6px;border-radius:99px;background:var(--surface);border:1px solid var(--line);font:600 13px/1 var(--sans)}}
.hud i{{width:16px;height:16px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#fff,var(--accent2) 45%,var(--accent))}}
.hud b{{padding:7px 11px;border-radius:99px;color:var(--muted);font-weight:600}}.hud b.on{{background:var(--accent);color:var(--onAccent)}}
.cap{{position:absolute;left:50%;transform:translateX(-50%);bottom:6%;padding:9px 18px;border-radius:10px;font-size:20px;font-weight:600;white-space:nowrap}}
.vig{{position:absolute;inset:0;background:radial-gradient(ellipse at center,rgba({vr},{vg},{vb},0) 45%,rgba({vr},{vg},{vb},{vig.get('a', 0.2)}) 100%)}}
.grain{{position:absolute;inset:0;background-image:url("{noise}");mix-blend-mode:overlay;opacity:{grain_op:.2f}}}
.facts{{display:grid;grid-template-columns:1fr 1fr;gap:16px}}
.facts h3{{margin:0 0 10px;font:700 13px/1 var(--mono);letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}}
.kv{{font:500 17px/1.55 var(--sans);color:var(--ink)}}.kv b{{font-weight:700}}
.pill{{display:inline-block;margin:0 6px 6px 0;padding:6px 11px;border-radius:99px;background:var(--accent);color:var(--onAccent);font:600 14px/1 var(--sans)}}
.pill.ghost{{background:transparent;color:var(--ink2);border:1.5px solid var(--line)}}
.bars{{display:flex;gap:10px;align-items:flex-end;height:76px;margin-top:8px}}.bar{{flex:1;height:100%;display:flex;flex-direction:column;justify-content:flex-end;align-items:center}}
.bar div{{width:100%;background:linear-gradient(var(--accent),var(--accent2));border-radius:6px 6px 2px 2px}}.bar span{{font:500 11px/1 var(--mono);color:var(--muted);margin-top:5px}}
.thumbs{{display:flex;gap:14px;align-items:flex-start}}.thumbs figure{{margin:0;flex:1;min-width:0}}
.thumbs img{{width:100%;height:118px;object-fit:cover;object-position:top;border-radius:10px;border:1px solid var(--line);background:var(--bg)}}
.thumbs figcaption{{font:500 12px/1.3 var(--mono);color:var(--muted);margin-top:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}}
footer{{grid-column:1/3;display:flex;justify-content:space-between;font:500 14px/1.3 var(--mono);color:var(--muted)}}
</style></head><body><div class="wrap">
<header><div><div class="kick">Style board · draft · {e(style.get('meta', {}).get('purpose', ''))} · {e(na.get('lang', ''))} · {e(lay.get('theme', ''))}</div>
<h1>{e(title)}</h1><div class="sub">{e(tagline[:150])}</div></div><div class="moods">{moods}</div></header>
<div class="left"><div class="panel"><div class="swatches">{''.join(sw)}</div></div>
<div class="panel type">
<div class="row"><div class="lab">display<small>{e(fam1(fonts['display']))} {dw}</small></div><div class="d">{e(title[:28])}</div></div>
<div class="row"><div class="lab">sans<small>{e(fam1(fonts['sans']))} {bw}</small></div><div class="s">{e((tagline or 'The quick brown fox jumps over the lazy dog.')[:110])}</div></div>
<div class="row"><div class="lab">serif<small>{e(fam1(fonts['serif']))}</small></div><div class="se">Evidence, not adjectives. 0123456789</div></div>
<div class="row"><div class="lab">mono<small>{e(fam1(fonts['mono']))}</small></div><div class="m">{e(mono_line)}</div></div>
<div class="row"><div class="lab">cjk<small>{e(fam1(fonts['cjk']))}</small></div><div class="c">{e(cjk_sample)}</div></div>
</div></div>
<div class="right"><div class="card">
<div class="blob" style="background:var(--accent);width:46%;height:62%;left:56%;top:-14%"></div>
<div class="blob" style="background:var(--accent2);width:34%;height:46%;left:70%;top:52%"></div>
<div class="blob" style="background:var(--accent3);width:28%;height:38%;left:-8%;top:70%"></div>
{hud}<div class="t">{e(title[:30])}</div><div class="tg">{e((tagline or '')[:80])}</div>
<div class="row"><span class="cta">Watch the reel</span><span class="chipx">{e(mo.get('pace', ''))} · {so.get('bpm')} BPM</span><span class="okx">✓ ok</span><span class="denyx">✕ deny</span></div>
{cap}<div class="vig"></div><div class="grain"></div></div>
<div class="facts"><div class="panel"><h3>Motion</h3><div class="kv"><b>{e(mo.get('pace', ''))}</b> · spring f {mo['spring']['f']} z {mo['spring']['z']} · overshoot {mo.get('overshoot')} · {e(mo.get('ease', ''))}</div>
<div style="margin-top:10px">{trans}</div><div>{reveals}</div><div>{srcs}</div></div>
<div class="panel"><h3>Sound · narration</h3><div class="kv"><b>{e(so.get('preset', ''))}</b> · {so.get('bpm')} BPM · {e(so.get('key', ''))} {e(so.get('mode', ''))} · drums {e(so.get('drums', ''))} · sfx {e(so.get('sfx', ''))}</div>
<div class="bars">{bars}</div><div class="kv" style="margin-top:8px">VO {'on' if na.get('recommended') else 'off'} · {e(na.get('voice', ''))} {e(na.get('styleTag', ''))}</div></div></div>
<div class="thumbs">{th_html}</div></div>
<footer><span>review: {e(rv) or 'none'}</span><span>extract_style.py {VERSION} · grain {po.get('grain')} · vignette {vig.get('a')} · bloom {po.get('bloom')}</span></footer>
</div></body></html>"""


def board_thumbs(ctx_or_none, P, log_data=None):
    """Up to 4 (data-uri, label) thumbnails: page renders first, then logos/mascots/figures."""
    thumbs = []
    snap = P / "build" / "snapshots"
    cands = []
    if log_data:
        for im in log_data.get("images", []):
            cls = im.get("cls")
            lab = im.get("label", "")
            p = Path(lab) if os.path.isabs(lab) else (P / lab)
            if not p.exists():
                p = Path(lab)
            pri = 0 if cls == "render" else 1 if cls in ("logo", "mascot", "cutout", "banner") else 2
            if lab.endswith("-full.png"):
                pri = 3
            if re.search(r"-p0[3-9]\.png$|-p[1-9]\d\.png$", lab):
                pri = 4
            cands.append((pri, str(p), lab, cls))
    idx = snap / "index.json"
    if idx.exists():
        try:
            for it in json.loads(idx.read_text()).get("items", []):
                for d in (it.get("schemes") or {}).values():
                    if d.get("shot"):
                        cands.append((0, str(snap / d["shot"]), it.get("input", ""), "render"))
        except Exception:
            pass
    cands.sort(key=lambda t: t[0])
    per_doc, used = Counter(), set()
    for pri, p, lab, cls in cands:
        name = Path(p).name
        key = re.sub(r"-(light|dark)(-full|-readme)?\.png$|-p\d+\.png$", "", name)
        limit = 2 if re.search(r"-p\d+\.png$", name) else 1
        if per_doc[key] >= limit or p in used or not Path(p).exists():
            continue
        u, tall = _thumb_data_uri(p)
        if u:
            per_doc[key] += 1
            used.add(p)
            centre = bool(re.search(r"-p\d+\.png$", name)) and not tall  # landscape slide renders
            # logos, mascots and cutouts are shown whole (contain); renders and screenshots fill the frame
            thumbs.append((u, Path(lab).name if not is_url(lab) else lab, not centre, cls in ("logo", "mascot", "cutout")))
        if len(thumbs) >= 4:
            break
    return thumbs


def render_board(style, inv, P, log_data=None):
    build = P / "build"
    build.mkdir(parents=True, exist_ok=True)
    html_path, png = build / "style-board.html", build / "style-board.png"
    html_path.write_text(board_html(style, inv, board_thumbs(None, P, log_data), P))
    node = shutil.which("node")
    if node and SNAPSHOT_JS.exists():
        r = subprocess.run([node, str(SNAPSHOT_JS), "--page", str(html_path), "--png", str(png), "--size", "1920x1080"],
                           capture_output=True, text=True, timeout=180)
        if png.exists() and r.returncode == 0:
            return png, "chromium"
        log("board: Chromium render failed, using the Pillow fallback:", (r.stderr or r.stdout).strip()[-200:])
    board_pil(style, inv, png)
    return png, "pillow"


def board_pil(style, inv, png):
    pal = style["palette"]
    W, H = 1920, 1080
    im = Image.new("RGB", (W, H), tuple(int(x * 255) for x in hex_to_rgb(pal["bg2"])))
    d = ImageDraw.Draw(im)

    def font(sz):
        try:
            return ImageFont.load_default(size=sz)
        except TypeError:
            return ImageFont.load_default()

    ink = tuple(int(x * 255) for x in hex_to_rgb(pal["ink"]))
    d.text((56, 44), "STYLE BOARD (fallback render)", fill=ink, font=font(18))
    d.text((56, 76), (style.get("meta", {}).get("title") or inv.get("title") or "Untitled")[:60], fill=ink, font=font(52))
    d.text((56, 146), "  ·  ".join(style.get("mood", [])), fill=tuple(int(x * 255) for x in hex_to_rgb(pal["accentInk"] if "accentInk" in pal else pal["accent"])), font=font(26))
    x, y = 56, 210
    for i, (k, v) in enumerate(pal.items()):
        c = tuple(int(t * 255) for t in hex_to_rgb(v))
        d.rounded_rectangle([x, y, x + 160, y + 90], 12, fill=c)
        d.text((x, y + 98), f"{k} {v}", fill=ink, font=font(16))
        x += 180
        if (i + 1) % 5 == 0:
            x, y = 56, y + 140
    mo, so, na = style["motion"], style["sound"], style["narration"]
    lines = [f"pace {mo['pace']} · spring f {mo['spring']['f']} z {mo['spring']['z']} · ease {mo['ease']}",
             f"transitions: {', '.join(mo['transitions'])}", f"sources: {', '.join(mo['visualSources'])}",
             f"sound: {so['preset']} {so['bpm']} BPM {so['key']} {so['mode']} · drums {so['drums']} · sfx {so['sfx']}",
             f"narration: {'on' if na['recommended'] else 'off'} · {na['voice']} {na['styleTag']} · {na['lang']}",
             f"fonts: display {style['fonts']['display'][:70]}", f"       sans {style['fonts']['sans'][:70]}"]
    for i, l in enumerate(lines):
        d.text((56, 660 + i * 40), l, fill=ink, font=font(24))
    im.save(png)


# ═════════════════════════════════════════ main ═════════════════════════════════════════
def parse_args(argv):
    ap = argparse.ArgumentParser(prog="extract_style.py", description=__doc__.split("\n\n")[0],
                                 formatter_class=argparse.RawDescriptionHelpFormatter, epilog=__doc__.split("Options:")[0].split("Usage:")[1])
    ap.add_argument("--source", nargs="+", default=[], help="files, folders or URLs of the material")
    ap.add_argument("--project", "-p", help="reel project folder P")
    ap.add_argument("--board", action="store_true", help="also render P/build/style-board.png")
    ap.add_argument("--board-only", action="store_true", help="render the board from P/style.json and exit")
    ap.add_argument("--validate", metavar="STYLE_JSON", help="validate a style.json and exit")
    ap.add_argument("--tables", action="store_true", help="print the interpretation tables (markdown) and exit")
    ap.add_argument("--offline", action="store_true")
    ap.add_argument("--no-snapshot", action="store_true")
    ap.add_argument("--purpose", choices=["launch", "pitch", "paper", "docs", "tool", "brand", "portfolio", "demo", "explainer", "general"])
    ap.add_argument("--audience")
    ap.add_argument("--lang")
    ap.add_argument("--theme", choices=["light", "dark"])
    ap.add_argument("--narration", choices=["on", "off"])
    ap.add_argument("--title")
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--copy-fonts", action="store_true", help="copy font files found in the material into P/assets/fonts (check licences)")
    ap.add_argument("--max-images", type=int, default=48)
    ap.add_argument("--out", help="write the spec here instead of P/style.json")
    ap.add_argument("--quiet", action="store_true")
    return ap.parse_args(argv)


def main(argv=None):
    global QUIET
    args = parse_args(sys.argv[1:] if argv is None else argv)
    QUIET = args.quiet
    if args.tables:
        print_tables()
        return 0
    if args.validate:
        obj = json.loads(Path(args.validate).read_text())
        errs = validate_style(obj)
        for e in errs:
            print("✗", e)
        print("valid" if not errs else f"{len(errs)} problem(s)")
        return 0 if not errs else 1
    if not args.project:
        print("--project is required (see --help)", file=sys.stderr)
        return 2
    P = Path(args.project).expanduser()
    P.mkdir(parents=True, exist_ok=True)
    (P / "build").mkdir(exist_ok=True)
    if args.board_only:
        sp = Path(args.out) if args.out else P / "style.json"
        if not sp.exists():
            print(f"{sp} not found", file=sys.stderr)
            return 2
        style = json.loads(sp.read_text())
        logp = P / "build" / "style-extract.json"
        log_data = json.loads(logp.read_text()) if logp.exists() else {}
        inv = log_data.get("inventory", {"taglines": [], "commands": []})
        png, how = render_board(style, inv, P.resolve(), log_data)
        print(f"board: {Disp(P)(png)} ({how})")
        return 0
    if not args.source:
        print("--source is required (files, folders or URLs)", file=sys.stderr)
        return 2
    ctx = Ctx(P, args)
    for s in args.source:
        ctx.add_source(s)
    ctx.run_snapshots()
    hints = {k: getattr(args, k) for k in ("purpose", "audience", "lang", "theme", "narration") if getattr(args, k)}
    style, m, inv, dec = interpret(ctx, hints)
    if args.title:
        style["meta"]["title"] = args.title
        inv["title"] = args.title
    for h, v in hints.items():
        style["meta"].setdefault("hints", {})[h] = v
    errs = validate_style(style)
    if errs:
        warn("draft failed validation: " + "; ".join(errs[:6]), ctx)
    out = Path(args.out) if args.out else P / "style.json"
    target = out
    if out.exists() and not args.force:
        try:
            prev = json.loads(out.read_text())
            reviewed = not (prev.get("meta") or {}).get("draft", False)
        except Exception:
            reviewed = True
        if reviewed:
            target = P / "build" / "style.draft.json"
            log(f"{out} is reviewed (meta.draft is not true): kept; new draft written to {target}")
    elif out.exists() and args.force:
        shutil.copy(out, P / "build" / "style.prev.json")
    target.write_text(json.dumps(style, indent=2, ensure_ascii=False) + "\n")
    write_log(ctx, style, m, inv, dec, P / "build" / "style-extract.json", P / "build" / "style-extract.md")
    print(f"style: {target}")
    print(f"log:   {P / 'build' / 'style-extract.md'}")
    if args.board:
        log_data = json.loads((P / "build" / "style-extract.json").read_text())
        png, how = render_board(style, inv, P.resolve(), log_data)
        print(f"board: {Disp(P)(png)} ({how})")
    pal = style["palette"]
    print(f"theme {style['layout']['theme']} · bg {pal['bg']} ink {pal['ink']} accent {pal['accent']} · mood {', '.join(style['mood'])}")
    print(f"pace {style['motion']['pace']} · {style['sound']['preset']} {style['sound']['bpm']} BPM · narration "
          f"{'on' if style['narration']['recommended'] else 'off'} · review {len(style.get('review', []))} item(s), warnings {len(ctx.warnings)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
