#!/usr/bin/env python3
"""Extract figures, tables, images and pages from papers and slide decks for a showreel.

    pdf_figures.py INPUT [--out P/assets/captures/pdf] [--mode auto|paper|slides|pages|images]
                   [--pages 1-3,7] [--zoom 3] [--dark auto|on|off] [--style P/style.json] [--tables]
                   [--min-size 160] [--pad 8] [--no-trim] [--sheet] [--max N] [--find TEXT ...]

INPUT is a PDF, or an office document (.pptx .ppt .odp .key* .docx .doc .odt) converted with LibreOffice first
(*Keynote: export to PDF from Keynote; LibreOffice cannot read .key).

What it finds (paper mode):
  figure   numbered caption ("Figure 3", "Fig. 3", "그림 3", "図3" ...) + the vector drawings and placed images above
           it in the same column, grown to include their axis labels, legends and panel letters (text that is not
           body text), rendered at --zoom (3 = 216 dpi), whitespace trimmed.
  table    "Table N" caption + the table region below it (PyMuPDF find_tables when present); with --tables the cell
           text goes into the sidecar so real numbers can be re-plotted in vector.
  graphic  large drawing/image regions without a caption.
  image    embedded raster images saved losslessly (original pixels, alpha kept) — --mode images or slide photos.
  page     whole pages / slides rendered so the long side is >= 2400 px (slides mode, --mode pages).
Each output gets a JSON sidecar (kind, label, caption, page, bbox in PDF points, px, dpi, source, sha1; "panels"
[{panel, bbox}] when the figure has panel letters "(a)", "(b)" ...) and <out>/<doc>/figures.json indexes them.
--find "a quoted sentence" adds "finds": where the text sits (page, bbox, and px inside each extracted image), so a
scene can zoom to the exact line or equation. Filled boxes of running text (abstracts, sidebars) are not figures,
and section headings never become captions. --dark on|auto (auto: when --style says the reel is dark) also writes
<name>.dark.png: white paper removed to alpha (colour-to-alpha) and lightness inverted with hue kept, for dark
stages. Prefer the original on a light "paper card" when colours carry meaning (heatmaps, brand colours); label a
recoloured figure as such in the credits.
"""
import argparse
import datetime as dt
import hashlib
import json
import math
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

try:
    import pymupdf as fitz  # PyMuPDF >= 1.24 (the old "fitz" name prints a deprecation warning on new versions)
except ImportError:  # pragma: no cover
    try:
        import fitz  # older PyMuPDF
    except ImportError:
        sys.exit("PyMuPDF is required: python3 -m pip install pymupdf")
import numpy as np
from PIL import Image, ImageDraw, ImageFont

VERSION = "1.0.0"
CAPTION_RE = re.compile(
    r"^\s*(?P<kw>Figure|Fig\.?|FIGURE|FIG\.?|Table|TABLE|Tab\.?|Chart|Exhibit|Plate|Scheme|Algorithm|Supplementary\s+Figure|"
    r"Extended\s+Data\s+Fig\.?|그림|도표|표|図|表|图)\s*(?P<num>[A-Z]?\d+[a-z]?|[IVXLC]+)\s*(?P<sep>[.:|—–-]|\s)",
    re.UNICODE)
TABLE_KW = re.compile(r"^(Table|TABLE|Tab\.?|표|表)$")
OFFICE = {".pptx", ".ppt", ".odp", ".docx", ".doc", ".odt", ".rtf", ".pps", ".ppsx", ".key"}


def log(*a):
    print(*a, flush=True)


def parse_pages(spec, n):
    if not spec:
        return list(range(n))
    out = []
    for part in spec.split(","):
        part = part.strip()
        if "-" in part:
            a, b = part.split("-", 1)
            out += list(range(int(a) - 1, min(n, int(b))))
        elif part:
            out.append(int(part) - 1)
    return [p for p in out if 0 <= p < n]


def to_pdf(src, tmp):
    if src.suffix.lower() == ".pdf":
        return src
    if src.suffix.lower() == ".key":
        sys.exit("Keynote files: export to PDF from Keynote (File > Export To > PDF), then run this on the PDF")
    soffice = shutil.which("soffice") or shutil.which("libreoffice")
    if not soffice:
        sys.exit(f"{src.suffix} needs LibreOffice (soffice) to convert to PDF")
    r = subprocess.run([soffice, "--headless", "--convert-to", "pdf", "--outdir", str(tmp), str(src)], capture_output=True, text=True, timeout=300)
    pdf = Path(tmp) / (src.stem + ".pdf")
    if r.returncode or not pdf.exists():
        sys.exit("LibreOffice conversion failed: " + (r.stderr or r.stdout)[-400:])
    return pdf


# ───────── geometry ─────────
def area(r):
    """Area of a rect (0 when empty or inverted). Works on every PyMuPDF version (Rect.get_area is 1.27+)."""
    w, h = r[2] - r[0], r[3] - r[1]
    return float(w * h) if w > 0 and h > 0 else 0.0


SECTION_HEAD = re.compile(r"^\s*(?:\d+(?:\.\d+)*\.?|[IVXLC]+\.|[A-Z]\.)\s+\S|^\s*(?:Abstract|Introduction|Related Work|Background|"
                          r"Method|Methods|Approach|Experiments?|Results|Discussion|Conclusions?|References|Acknowledg\w*|"
                          r"Appendix|초록|서론|결론|참고문헌|요약)\b", re.I)


def is_heading(b, body):
    """A section heading: short, and numbered ("1 Introduction", "2.3 Setup") or set larger/bolder than body text."""
    t = b["text"].strip()
    return len(t) < 90 and len(b["lines"]) <= 2 and (bool(SECTION_HEAD.match(t)) or b["size"] > body + 0.9)


def R(r):
    return fitz.Rect(r)


def union(rs):
    u = fitz.Rect(rs[0])
    for r in rs[1:]:
        u |= r
    return u


def near(a, b, gap):
    return fitz.Rect(a.x0 - gap, a.y0 - gap, a.x1 + gap, a.y1 + gap).intersects(b)


def x_overlap(a, b):
    return max(0.0, min(a.x1, b.x1) - max(a.x0, b.x0))


def merge_close(rects, gap):
    rs = [fitz.Rect(r) for r in rects]
    changed = True
    while changed:
        changed = False
        out = []
        while rs:
            r = rs.pop()
            i = 0
            while i < len(rs):
                if near(r, rs[i], gap):
                    r |= rs.pop(i)
                    changed = True
                else:
                    i += 1
            out.append(r)
        rs = out
    return rs


# ───────── text model ─────────
def text_blocks(page):
    """[{rect, text, size, lines}] for text blocks (dominant font size, joined lines)."""
    out = []
    d = page.get_text("dict")
    for b in d.get("blocks", []):
        if b.get("type") != 0:
            continue
        sizes, chars, lines = [], 0, []
        for ln in b.get("lines", []):
            t = "".join(s.get("text", "") for s in ln.get("spans", []))
            if t.strip():
                lines.append(t)
            for s in ln.get("spans", []):
                n = len(s.get("text", "").strip())
                if n:
                    sizes.append((s.get("size", 0), n))
                    chars += n
        if not lines:
            continue
        size = max(sizes, key=lambda x: x[1])[0] if sizes else 0
        tot = sum(n for _, n in sizes) or 1
        avg = sum(sz * n for sz, n in sizes) / tot
        out.append({"rect": R(b["bbox"]), "text": " ".join(l.strip() for l in lines), "lines": lines, "size": size, "avg": avg, "chars": chars})
    return out


def body_size(doc, pages):
    from collections import Counter
    c = Counter()
    for pno in pages[:30]:
        for b in text_blocks(doc[pno]):
            c[round(b["size"] * 2) / 2] += b["chars"]
    return c.most_common(1)[0][0] if c else 10.0


def is_body(b, body, page_w):
    """Running text: body-sized and paragraph-like (several lines, or wide)."""
    return abs(b["size"] - body) <= 0.75 and (len(b["lines"]) >= 2 or b["rect"].width > 0.38 * page_w) and b["chars"] > 40


# ───────── graphics model ─────────
def graphic_rects(page, min_side=6.0):
    pw, ph = page.rect.width, page.rect.height
    rects = []
    try:
        drawings = page.get_drawings()
    except Exception:
        drawings = []
    try:
        clusters = [R(r) for r in page.cluster_drawings(x_tolerance=4, y_tolerance=4)]
        # cluster_drawings drops zero-area paths (table rules, axis lines): add those back, stroke-inflated
        for d in drawings:
            r = R(d["rect"])
            if (r.width < 1.0 or r.height < 1.0) and not any(c.contains(r) for c in clusters):
                w = max(0.6, (d.get("width") or 1.0) / 2)
                clusters.append(fitz.Rect(r.x0 - (w if r.width < 1 else 0), r.y0 - (w if r.height < 1 else 0), r.x1 + (w if r.width < 1 else 0), r.y1 + (w if r.height < 1 else 0)))
    except Exception:
        clusters = [R(d["rect"]) for d in drawings]
    for r in clusters:
        r = R(r)
        if r.is_infinite:
            continue
        if r.height < 1.0:      # horizontal rules (booktabs tables, axes) have zero-height rects
            r = fitz.Rect(r.x0, r.y0 - 0.6, r.x1, r.y1 + 0.6)
        if r.width < 1.0:
            r = fitz.Rect(r.x0 - 0.6, r.y0, r.x1 + 0.6, r.y1)
        if r.is_empty:
            continue
        thin = min(r.width, r.height)
        if thin < 1.5 and max(r.width, r.height) > 0.45 * pw:      # page rules, header/footer lines
            continue
        if max(r.width, r.height) < min_side:
            continue
        if r.width > 0.97 * pw and r.height > 0.97 * ph:          # full-page background
            continue
        rects.append(("draw", r, None))
    for info in page.get_image_info(xrefs=True):
        r = R(info["bbox"])
        if r.is_empty or max(r.width, r.height) < min_side:
            continue
        rects.append(("image", r, info.get("xref")))
    return rects


# ───────── rendering + post ─────────
def render(page, rect, zoom, alpha=False):
    pix = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom), clip=rect, alpha=alpha)
    mode = "RGBA" if pix.alpha else "RGB"
    return Image.frombytes(mode, (pix.width, pix.height), pix.samples)


def paper_color(page):
    """Most common colour of a low-res page render (the paper; white for most PDFs)."""
    pix = page.get_pixmap(matrix=fitz.Matrix(0.25, 0.25), alpha=False)
    a = np.frombuffer(pix.samples, np.uint8).reshape(pix.height, pix.width, pix.n)[..., :3]
    vals, counts = np.unique(a.reshape(-1, 3), axis=0, return_counts=True)
    return vals[counts.argmax()].astype(np.int16)


def trim(im, pad, tol=10, bg=None):
    a = np.asarray(im.convert("RGB")).astype(np.int16)
    if bg is None:
        bg = np.median(np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]]), axis=0)
    diff = np.abs(a - bg).max(-1) > tol
    ys, xs = np.where(diff)
    if not len(ys):
        return im, (0, 0, im.width, im.height)
    x0, y0 = max(0, xs.min() - pad), max(0, ys.min() - pad)
    x1, y1 = min(im.width, xs.max() + 1 + pad), min(im.height, ys.max() + 1 + pad)
    return im.crop((x0, y0, x1, y1)), (int(x0), int(y0), int(x1), int(y1))


def _s2l(c):
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def _l2s(c):
    c = np.clip(c, 0, 1)
    return np.where(c <= 0.0031308, 12.92 * c, 1.055 * np.power(c, 1 / 2.4) - 0.055)


def dark_variant(im, paper=None):
    """Colour-to-alpha against the paper colour; neutral ink inverted in OKLab, colours keep hue (lifted for a dark stage)."""
    a = np.asarray(im.convert("RGB")).astype(np.float64) / 255.0
    bg = np.asarray(paper, dtype=np.float64) / 255.0 if paper is not None else np.median(np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]]), axis=0)
    # colour-to-alpha (GIMP): alpha = max over channels of the distance towards the paper colour
    d = np.where(a < bg, (bg - a) / np.maximum(bg, 1e-6), (a - bg) / np.maximum(1 - bg, 1e-6))
    alpha = np.clip(d.max(-1), 0, 1)
    alpha = np.where(np.abs(a - bg).max(-1) <= 3 / 255.0, 0.0, alpha)     # paper within 3 levels -> transparent
    with np.errstate(divide="ignore", invalid="ignore"):
        fg = np.where(alpha[..., None] > 1e-4, (a - bg * (1 - alpha[..., None])) / alpha[..., None], 0)
    fg = np.clip(fg, 0, 1)
    lin = _s2l(fg)
    l = np.cbrt(lin @ np.array([[0.4122214708, 0.2119034982, 0.0883024619], [0.5363325363, 0.6806995451, 0.2817188376], [0.0514459929, 0.1073969566, 0.6299787005]]))
    L = l @ np.array([0.2104542553, 0.7936177850, -0.0040720468])
    A = l @ np.array([1.9779984951, -2.4285922050, 0.4505937099])
    B = l @ np.array([0.0259040371, 0.7827717662, -0.8086757660])
    C = np.hypot(A, B)
    w = np.clip((C - 0.035) / (0.11 - 0.035), 0, 1)
    w = w * w * (3 - 2 * w)                      # 0 = neutral ink, 1 = chromatic
    # neutral ink inverts (black text and axes -> near white); colours keep hue and are lifted to stay vivid
    L2 = np.clip((1 - w) * (1.0 - L * 0.92) + w * np.maximum(L, 0.66), 0, 1)
    l_ = L2 + 0.3963377774 * A + 0.2158037573 * B
    m_ = L2 - 0.1055613458 * A - 0.0638541728 * B
    s_ = L2 - 0.0894841775 * A - 1.2914855480 * B
    lms = np.stack([l_ ** 3, m_ ** 3, s_ ** 3], -1)
    rgb = lms @ np.array([[4.0767416621, -1.2684380046, -0.0041960863], [-3.3077115913, 2.6097574011, -0.7034186147], [0.2309699292, -0.3413193965, 1.7076147010]])
    out = np.dstack([_l2s(rgb), alpha])
    return Image.fromarray((out * 255 + 0.5).astype(np.uint8), "RGBA")


def save(im, path, meta_list, meta):
    im.save(path)
    meta["file"] = path.name
    meta["px"] = [im.width, im.height]
    meta["sha1"] = hashlib.sha1(path.read_bytes()).hexdigest()[:12]
    path.with_suffix(".json").write_text(json.dumps(meta, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    meta_list.append(meta)


# ───────── extraction ─────────
def find_figures(doc, pno, body, opts):
    page = doc[pno]
    pw, ph = page.rect.width, page.rect.height
    blocks = text_blocks(page)
    graphics = graphic_rects(page)
    caps = []
    for b in blocks:
        m = CAPTION_RE.match(b["text"])
        if m and len(b["text"]) > 6:
            kind = "table" if TABLE_KW.match(m.group("kw").rstrip(".")) else "figure"
            caps.append({**b, "kind": kind, "label": f"{m.group('kw').rstrip('.')} {m.group('num')}".replace("Fig ", "Figure ").replace("FIG ", "Figure "), "num": m.group("num")})
    body_blocks = [b for b in blocks if is_body(b, body, pw) and not CAPTION_RE.match(b["text"])]
    used, found = set(), []
    tables = []
    if opts.get("tables") or any(c["kind"] == "table" for c in caps):
        try:
            tables = list(page.find_tables())
        except Exception:
            tables = []
    for c in caps:
        cr = c["rect"]
        if c["kind"] == "figure":
            # graphics above the caption, same column, no running text in between
            cand = []
            for i, (gk, g, xref) in enumerate(graphics):
                if i in used or g.y1 > cr.y0 + 4 or cr.y0 - g.y1 > 0.75 * ph:
                    continue
                if x_overlap(g, cr) < 0.25 * min(g.width, cr.width):
                    continue
                between = fitz.Rect(min(g.x0, cr.x0), g.y1, max(g.x1, cr.x1), cr.y0)
                if any(between.intersects(b["rect"]) and b["rect"].y0 >= g.y1 - 2 and x_overlap(b["rect"], cr) > 0.3 * cr.width for b in body_blocks):
                    continue
                cand.append(i)
            if not cand:
                continue
            # keep the contiguous stack directly above the caption
            cand.sort(key=lambda i: -graphics[i][1].y1)
            region = fitz.Rect(graphics[cand[0]][1])
            chosen = [cand[0]]
            for i in cand[1:]:
                g = graphics[i][1]
                if near(region, g, 0.06 * ph):
                    region |= g; chosen.append(i)
            region = R(region)
        else:
            # table: find_tables region or graphics/text directly below the caption
            region, chosen = None, []
            for tb in tables:
                tr = R(tb.bbox)
                if tr.y0 >= cr.y1 - 4 and tr.y0 - cr.y1 < 0.2 * ph and x_overlap(tr, cr) > 0.25 * min(tr.width, cr.width):
                    region = tr; c["table"] = tb; c["ruled"] = True
                    break
            if region is None:
                for i, (gk, g, xref) in enumerate(graphics):
                    if i not in used and g.y0 >= cr.y1 - 4 and g.y0 - cr.y1 < 0.15 * ph and x_overlap(g, cr) > 0.25 * min(g.width, cr.width):
                        region = fitz.Rect(g) if region is None else region | g; chosen.append(i)
            if region is None:
                # rule-less table: the short (non-body) text lines right under the caption, until running text
                for b in sorted(blocks, key=lambda b: b["rect"].y0):
                    r0 = b["rect"]
                    if b is c or r0.y0 < cr.y1 - 2 or x_overlap(r0, cr) <= 0:
                        continue
                    if b in body_blocks or CAPTION_RE.match(b["text"]) or r0.y0 - (region.y1 if region else cr.y1) > 18:
                        break
                    region = fitz.Rect(r0) if region is None else region | r0
            if region is None:
                continue
        # grow by labels/legends: nearby non-body text that is not another caption
        for _ in range(3):
            grown = False
            for b in blocks:
                if b is c or b in body_blocks or CAPTION_RE.match(b["text"]):
                    continue
                if not region.contains(b["rect"]) and near(region, b["rect"], 10) and (b["rect"].y1 <= cr.y0 + 2 if c["kind"] == "figure" else b["rect"].y0 >= cr.y1 - 2):
                    region |= b["rect"]; grown = True
            if not grown:
                break
        used.update(chosen)
        found.append({"kind": c["kind"], "label": c["label"], "num": c["num"], "caption": c["text"], "captionRect": cr, "rect": region, "table": c.get("table"), "ruled": c.get("ruled", False)})
    # uncaptioned large graphics
    rest = [g for i, (gk, g, xref) in enumerate(graphics) if i not in used]
    for g in merge_close(rest, 8):
        if g.width * g.height >= opts["min_area"] * pw * ph and not any(f["rect"].intersects(g) for f in found):
            # a filled box behind running text (abstract, sidebar, call-out) is layout, not a figure
            text_in = sum(area(b["rect"] & g) for b in blocks if b["rect"].intersects(g))
            if text_in >= 0.45 * area(g) and any(is_body(b, body, pw) and g.contains(b["rect"]) for b in blocks):
                continue
            near_txt = min((b for b in blocks if b["rect"].y0 >= g.y1 and b["rect"].y0 - g.y1 < 30 and x_overlap(b["rect"], g) > 0),
                           key=lambda b: b["rect"].y0, default=None)
            if near_txt is not None and (is_heading(near_txt, body) or is_body(near_txt, body, pw)):
                near_txt = None                     # never caption a graphic with a section heading or running text
            found.append({"kind": "graphic", "label": None, "num": None, "caption": near_txt["text"] if near_txt else None, "rect": g})
    for f in found:
        f["panels"] = panel_rects(page, f["rect"])
    return found


PANEL_RE = re.compile(r"^\(?([a-hA-H])\)$|^([a-h])$")


def panel_rects(page, region):
    """Sub-panels of a figure from its panel letters "(a)" / "a" / "(B)": each letter starts a panel that runs to the
    next letter to its right (same row) or below, clipped to the figure. [] for single-panel figures."""
    labels = []
    for x0, y0, x1, y1, w, *_ in page.get_text("words", clip=region):
        m = PANEL_RE.match(w.strip())
        if m:
            labels.append(((m.group(1) or m.group(2)).lower(), fitz.Rect(x0, y0, x1, y1)))
    letters = [k for k, _ in labels]
    if len(labels) < 2 or len(set(letters)) != len(letters) or letters[0] != "a":
        return []
    rows = []
    for k, r in sorted(labels, key=lambda t: (round(t[1].y0 / 12), t[1].x0)):
        if rows and abs(rows[-1][0][1].y0 - r.y0) < 12:
            rows[-1].append((k, r))
        else:
            rows.append([(k, r)])
    out = []
    for ri, row in enumerate(rows):
        y0 = max(region.y0, min(r.y0 for _, r in row) - 2)
        y1 = min(region.y1, min(r.y0 for _, r in rows[ri + 1]) - 2) if ri + 1 < len(rows) else region.y1
        for ci, (k, r) in enumerate(row):
            x0 = max(region.x0, r.x0 - 4)
            x1 = row[ci + 1][1].x0 - 4 if ci + 1 < len(row) else region.x1
            out.append({"panel": k, "bbox": [round(x0, 2), round(y0, 2), round(x1, 2), round(y1, 2)]})
    return sorted(out, key=lambda p: p["panel"])


def cells_from_words(page, region, min_gutter=5.0):
    """Cells of a (rule-less or booktabs) table from word positions: columns are x-gutters free of text across all
    rows, rows are word baselines."""
    words = [w for w in page.get_text("words", clip=region) if w[4].strip()]
    if not words:
        return None
    x0, x1 = min(w[0] for w in words), max(w[2] for w in words)
    occ = np.zeros(int(math.ceil(x1 - x0)) + 2, bool)
    for w in words:
        occ[int(w[0] - x0):int(math.ceil(w[2] - x0)) + 1] = True
    cuts, run = [], None
    for i, v in enumerate(occ):
        if not v and run is None:
            run = i
        elif v and run is not None:
            if i - run >= min_gutter:
                cuts.append(x0 + (run + i) / 2)
            run = None
    rows = []
    for w in sorted(words, key=lambda w: ((w[1] + w[3]) / 2, w[0])):
        cy = (w[1] + w[3]) / 2
        if rows and abs(rows[-1]["cy"] - cy) < 3:
            rows[-1]["w"].append(w)
        else:
            rows.append({"cy": cy, "w": [w]})
    out = []
    for r in rows:
        cells = [[] for _ in range(len(cuts) + 1)]
        for w in sorted(r["w"], key=lambda w: w[0]):
            k = sum(1 for c in cuts if (w[0] + w[2]) / 2 > c)
            cells[k].append(w[4])
        out.append([" ".join(c) for c in cells])
    return out


def slide_title(page):
    blocks = text_blocks(page)
    if not blocks:
        return None
    b = max(blocks, key=lambda b: (b["size"], -b["rect"].y0))
    return b["text"][:160]


def detect_mode(doc, pages):
    land = sum(1 for p in pages[:10] if doc[p].rect.width > doc[p].rect.height * 1.15)
    if land >= max(1, len(pages[:10]) * 0.6):
        return "slides"
    return "paper"


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0], formatter_class=argparse.RawDescriptionHelpFormatter, epilog=__doc__.split("\n\n", 1)[1])
    ap.add_argument("input")
    ap.add_argument("--out", default="assets/captures/pdf")
    ap.add_argument("--mode", choices=["auto", "paper", "slides", "pages", "images"], default="auto")
    ap.add_argument("--pages", help="1-based pages, e.g. 1-3,7")
    ap.add_argument("--zoom", type=float, default=3.0, help="render scale (3 = 216 dpi)")
    ap.add_argument("--dark", choices=["auto", "on", "off"], default="auto")
    ap.add_argument("--style", help="P/style.json (dark reels get dark variants with --dark auto)")
    ap.add_argument("--tables", action="store_true", help="put table cell text into the sidecars")
    ap.add_argument("--min-size", type=int, default=160, help="minimum embedded image side (px) to extract")
    ap.add_argument("--min-area", type=float, default=0.06, help="uncaptioned graphics: minimum fraction of the page")
    ap.add_argument("--pad", type=int, default=8, help="px of margin kept after trimming")
    ap.add_argument("--no-trim", action="store_true")
    ap.add_argument("--sheet", action="store_true", help="contact sheet of everything extracted")
    ap.add_argument("--max", type=int, default=200)
    ap.add_argument("--find", action="append", metavar="TEXT",
                    help="locate a quoted sentence, term or equation label: page, bbox (pt) and its px rect inside every "
                         "extracted image that contains it (repeatable; written to figures.json 'finds')")
    a = ap.parse_args(argv)

    try:
        fitz.TOOLS.mupdf_display_errors(False)      # LibreOffice PDFs trigger harmless structure-tree warnings
    except Exception:
        pass
    src = Path(a.input).expanduser().resolve()
    if not src.exists():
        sys.exit(f"not found: {a.input}")
    tmp = tempfile.mkdtemp(prefix="pdffig-")
    pdf = to_pdf(src, tmp)
    doc = fitz.open(pdf)
    pages = parse_pages(a.pages, doc.page_count)
    mode = detect_mode(doc, pages) if a.mode == "auto" else a.mode
    out = Path(a.out) / re.sub(r"[^\w.-]+", "-", src.stem).strip("-").lower()
    out.mkdir(parents=True, exist_ok=True)
    dark = a.dark == "on"
    if a.dark == "auto" and a.style:
        try:
            st = json.loads(Path(a.style).read_text(encoding="utf-8"))
            dark = (st.get("layout") or {}).get("theme") == "dark"
        except Exception as e:
            log(f"warning: cannot read --style ({e})")
    when = dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    md = doc.metadata or {}
    source = {"file": src.name, "pages": doc.page_count, "title": md.get("title") or None, "author": md.get("author") or None,
              "converted": src.suffix.lower() != ".pdf"}
    base_meta = {"source": source, "extractedAt": when, "tool": "pdf_figures.py", "toolVersion": VERSION, "zoom": a.zoom, "dpi": round(72 * a.zoom)}
    items, warnings = [], []
    body = body_size(doc, pages)
    seen_x = set()

    def emit(im, name, meta, page=None):
        if len(items) >= a.max:
            return
        crop = None
        paper = paper_color(page) if page is not None else None
        if not a.no_trim and meta["kind"] not in ("page", "image"):
            im, crop = trim(im, a.pad, bg=paper)
        p = out / f"{name}.png"
        m = {**base_meta, **meta}
        if crop and page is not None and m.get("bbox"):
            x0, y0, x1, y1 = m["bbox"]
            m["bbox"] = [round(x0 + crop[0] / a.zoom, 2), round(y0 + crop[1] / a.zoom, 2), round(x0 + crop[2] / a.zoom, 2), round(y0 + crop[3] / a.zoom, 2)]
        if dark and meta["kind"] != "image" and meta.get("rasterFraction", 0) > 0.5:
            m["darkNote"] = "no dark variant: raster content (photo / heat map) keeps its colours — show it on a paper card"
        elif dark and meta["kind"] != "image":
            dv = dark_variant(im, paper)
            dp = out / f"{name}.dark.png"
            dv.save(dp)
            m["dark"] = dp.name
            m["darkNote"] = "paper removed to alpha, lightness inverted (hue kept): recoloured for a dark stage"
        save(im, p, items, m)

    for pno in pages:
        page = doc[pno]
        pw, ph = page.rect.width, page.rect.height
        if mode in ("slides", "pages"):
            z = max(a.zoom, 2400 / max(pw, ph))
            im = render(page, page.rect, z)
            emit(im, f"page-{pno + 1:03d}", {"kind": "page", "page": pno + 1, "bbox": [0, 0, round(pw, 2), round(ph, 2)], "title": slide_title(page), "zoom": round(z, 3), "dpi": round(72 * z)}, page)
        if mode in ("slides", "images"):
            for info in page.get_image_info(xrefs=True):
                xref, r = info.get("xref"), R(info["bbox"])
                if not xref or xref in seen_x:
                    continue
                if mode == "slides" and r.width * r.height < 0.12 * pw * ph:
                    continue
                try:
                    pix = fitz.Pixmap(doc, xref)
                    if pix.n - pix.alpha >= 4:
                        pix = fitz.Pixmap(fitz.csRGB, pix)
                    smask = doc.extract_image(xref).get("smask") if not pix.alpha else 0
                    if smask:
                        pix = fitz.Pixmap(pix, fitz.Pixmap(doc, smask))
                except Exception as e:
                    warnings.append(f"page {pno + 1}: image xref {xref} not extracted ({e})"); continue
                if max(pix.width, pix.height) < a.min_size:
                    continue
                seen_x.add(xref)
                im = Image.frombytes("RGBA" if pix.alpha else "RGB", (pix.width, pix.height), pix.samples)
                emit(im, f"img-p{pno + 1:02d}-x{xref}", {"kind": "image", "page": pno + 1, "bbox": [round(v, 2) for v in r], "xref": xref, "note": "original embedded pixels (not re-rendered)"})
        if mode == "paper":
            for k, f in enumerate(find_figures(doc, pno, body, {"tables": a.tables, "min_area": a.min_area}), 1):
                r = f["rect"] & page.rect
                if r.is_empty:
                    continue
                im = render(page, r, a.zoom)
                kind = f["kind"]
                stem = {"figure": "fig", "table": "table", "graphic": "graphic"}[kind]
                label = (f["num"] or str(k)).lower()
                name = f"{stem}-{label}" if f["num"] else f"{stem}-p{pno + 1:02d}-{k}"
                if (out / f"{name}.png").exists() and any(i["file"] == f"{name}.png" for i in items):
                    name += f"-p{pno + 1}"
                ras = sum(area(R(i["bbox"]) & r) for i in page.get_image_info())
                meta = {"kind": kind, "label": f["label"], "caption": f["caption"], "page": pno + 1, "bbox": [round(v, 2) for v in r],
                        "rasterFraction": round(min(1.0, ras / max(1e-6, area(r))), 3)}
                if f.get("panels"):
                    meta["panels"] = f["panels"]     # PDF points, like bbox: zoom a scene into "(b)" with these
                if kind == "table" and a.tables:
                    cells, tb = None, f.get("table")
                    try:
                        if tb is not None and f.get("ruled"):
                            cells = tb.extract()
                        if not cells:
                            cells = cells_from_words(page, r)
                    except Exception as e:
                        warnings.append(f"page {pno + 1}: table cells not extracted ({e})")
                    if cells:
                        cells = [[(c or "").replace("\n", " ").strip() for c in row] for row in cells]
                        meta["cells"] = [row for row in cells if any(row)]
                        meta["cellsNote"] = "cell text as printed in the source; re-plot from these values, keep units and rounding"
                emit(im, name, meta, page)
    finds = []
    for q in a.find or []:
        n0 = len(finds)
        for pno in pages:
            page = doc[pno]
            zp = max(a.zoom, 2400 / max(page.rect.width, page.rect.height))      # the zoom --mode pages renders at
            for r in page.search_for(q):
                hit = {"text": q, "page": pno + 1, "bbox": [round(v, 2) for v in r],
                       "pagePx": [round(v * zp, 1) for v in r], "pageZoom": round(zp, 3), "in": []}
                for it in items:
                    if it.get("page") != pno + 1 or not it.get("bbox") or it.get("kind") == "image":
                        continue
                    x0, y0, x1, y1 = it["bbox"]
                    if x0 - 0.5 <= r.x0 and y0 - 0.5 <= r.y0 and r.x1 <= x1 + 0.5 and r.y1 <= y1 + 0.5:
                        z = float(it.get("zoom") or a.zoom)
                        hit["in"].append({"file": it["file"], "px": [round((r.x0 - x0) * z, 1), round((r.y0 - y0) * z, 1),
                                                                   round((r.x1 - x0) * z, 1), round((r.y1 - y0) * z, 1)]})
                finds.append(hit)
        if len(finds) == n0:
            warnings.append(f"--find {q!r}: not found (search is case-insensitive; hyphenation or ligatures can split words)")
    index = {**base_meta, "mode": mode, "bodyFontSize": body, "items": items, "warnings": warnings,
             "note": "bbox in PDF points (72/in); files rendered at dpi; captions are the paper's own words — quote them, do not paraphrase in credits"}
    if finds:
        index["finds"] = finds
    (out / "figures.json").write_text(json.dumps(index, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    if a.sheet and items:
        contact_sheet([out / i["file"] for i in items], [f"{i['file']}  {i.get('label') or i['kind']}" for i in items], out / "sheet.png")
    kinds = {}
    for i in items:
        kinds[i["kind"]] = kinds.get(i["kind"], 0) + 1
    log(f"{src.name}: {mode} mode, {len(pages)} page(s) -> {out} ({', '.join(f'{v} {k}' for k, v in kinds.items()) or 'nothing found'})")
    for i in items:
        cap = (i.get("caption") or i.get("title") or i.get("label") or i["kind"])[:80]
        log(f"  {i['file']:<28} p{i['page']:<3} {i['px'][0]}x{i['px'][1]:<6} {cap}")
    for h in finds:
        where = ", ".join(f"{x['file']} px {x['px']}" for x in h["in"]) or f"page {h['page']} px {h['pagePx']} (render with --mode pages)"
        log(f"  find {h['text'][:40]!r}: p{h['page']} {where}")
    for w in warnings:
        log("warning: " + w)
    shutil.rmtree(tmp, ignore_errors=True)
    return 0


SHEET_FONTS = ("/System/Library/Fonts/AppleSDGothicNeo.ttc", "/System/Library/Fonts/Hiragino Sans GB.ttc",
               "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc", "/usr/share/fonts/noto-cjk/NotoSansCJK-Regular.ttc",
               "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc", "C:/Windows/Fonts/malgun.ttf",
               "C:/Windows/Fonts/msyh.ttc", "/System/Library/Fonts/Menlo.ttc", "DejaVuSans.ttf")


def sheet_font(size=14):
    """A label font that also covers Hangul/CJK captions ("그림 4"), else the first available, else PIL's default."""
    for f in SHEET_FONTS:
        try:
            return ImageFont.truetype(f, size)
        except Exception:
            continue
    return ImageFont.load_default()


def contact_sheet(files, labels, path, tw=420, th=320, cols=4):
    font = sheet_font(14)
    rows = math.ceil(len(files) / cols)
    S = Image.new("RGB", (cols * (tw + 14) + 14, rows * (th + 36) + 14), (30, 30, 34))
    d = ImageDraw.Draw(S)
    for i, f in enumerate(files):
        im = Image.open(f).convert("RGBA")
        im.thumbnail((tw, th))
        x, y = 14 + (i % cols) * (tw + 14), 14 + (i // cols) * (th + 36)
        bg = Image.new("RGB", im.size, (255, 255, 255))
        bg.paste(im, (0, 0), im)
        S.paste(bg, (x + (tw - im.width) // 2, y))
        d.text((x, y + th + 8), labels[i][:52], fill=(225, 225, 232), font=font)
    S.save(path)


if __name__ == "__main__":
    sys.exit(main())
