"""Illustrative data for the fictional manuscript in source/manuscript.md (nothing here is measured).

Writes the paper's supplementary tables and the compact copy the reel reads:
  source/data/cells.csv    one row per sampled cell: id, cluster, umap_1, umap_2, x_um, y_um, pseudotime
  source/data/markers.csv  dot-plot table: gene, cluster, mean_expr (0-1, scaled), pct_expressing
  assets/data/atlas.json   the same, quantized for the reel
Deterministic (seed 7). Run: python3 paper-src/simulate.py
"""
import csv, json, math, pathlib
import numpy as np

ROOT = pathlib.Path(__file__).resolve().parents[1]
rng = np.random.default_rng(7)

# cluster: (label, short, colour, count, markers)
CLUSTERS = [
    ("AT2", "AT2", "#2F6FDB", 1150, ["SFTPC", "LAMP3", "ABCA3"]),
    ("KRT8+ transitional", "KRT8+", "#E8553A", 520, ["KRT8", "CLDN4", "SFN"]),
    ("AT1", "AT1", "#13A39A", 760, ["AGER", "RTKN2"]),
    ("Basal", "Basal", "#8A63D2", 330, ["KRT5", "TP63"]),
    ("Ciliated", "Ciliated", "#F0A030", 300, ["FOXJ1"]),
    ("Fibroblast", "Fibro", "#5E9A4B", 620, ["COL1A1", "CTHRC1"]),
    ("Endothelial", "Endo", "#D6478B", 700, ["CLDN5"]),
    ("Macrophage", "Mac", "#56687C", 520, ["MARCO", "SPP1"]),
]
K = len(CLUSTERS)

# ── UMAP: the epithelial repair continuum AT2 -> KRT8+ -> AT1 is one arc (pseudotime 0..1); the rest are islands
def arc(s):  # s in 0..1 -> point on the repair arc (UMAP units, roughly -10..10)
    a = math.pi * (0.95 - 0.9 * s)
    return np.array([-1.6 + 7.4 * math.cos(a), 1.2 + 3.0 * math.sin(a) - 1.2 * s])

ISLANDS = {3: (-8.6, -3.4, 0.9, 0.7, 0.5), 4: (-6.4, -6.0, 0.7, 1.0, -0.4), 5: (1.2, -4.4, 2.1, 0.8, 0.35),
           6: (8.4, -5.6, 1.1, 1.3, 0.6), 7: (-2.4, -7.2, 1.3, 0.7, -0.15)}
cells = []
for k, (_, _, _, n, _) in enumerate(CLUSTERS):
    for i in range(n):
        if k <= 2:
            lo, hi = [(0.0, 0.42), (0.36, 0.66), (0.6, 1.0)][k]
            s = rng.uniform(lo, hi) if k != 1 else rng.beta(2.2, 2.2) * (hi - lo) + lo
            p = arc(s)
            # thickness: wide clouds at the ends, a narrow bridge through the transitional state
            w = 0.55 if k == 1 else 0.95
            ang = math.pi * (0.95 - 0.9 * s)
            nrm = np.array([math.cos(ang), math.sin(ang)])
            p = p + nrm * rng.normal(0, w) + rng.normal(0, 0.18, 2)
            pt = s
        else:
            cx, cy, sx, sy, rot = ISLANDS[k]
            v = rng.normal(0, 1, 2) * [sx, sy]
            if rng.random() < 0.18:  # a sub-state lobe on every island
                v = v * 0.5 + np.array([sx * 1.3, -sy * 0.6])
            c, s_ = math.cos(rot), math.sin(rot)
            p = np.array([cx + c * v[0] - s_ * v[1], cy + s_ * v[0] + c * v[1]])
            pt = -1.0
        cells.append([k, p[0], p[1], pt])

# ── tissue section, 1.6 x 0.9 mm: alveolar sacs (rings of AT1 with AT2 corners), capillaries between them,
#    an airway with basal + ciliated lining at the left, an injury niche at (1080, 470) um where KRT8+ cells,
#    fibroblasts and SPP1+ macrophages pile up.
SW, SH = 1600.0, 900.0
NICHE = np.array([1080.0, 470.0]); NR = 175.0
alv = []
while len(alv) < 70:
    c = rng.uniform([40, 40], [SW - 40, SH - 40])
    r = rng.uniform(42, 70)
    if np.hypot(c[0] - 250, (c[1] - 450) * 1.6) < 230: continue           # airway
    if all(np.hypot(*(c - a[:2])) > r + a[2] + 14 for a in alv): alv.append(np.array([c[0], c[1], r]))
alv = np.array(alv)

def on_ring(a, jitter=4.0):
    th = rng.uniform(0, 2 * math.pi)
    return a[:2] + (a[2] + rng.normal(0, jitter)) * np.array([math.cos(th), math.sin(th)])

def between():  # interstitium: sample until outside every sac and the airway lumen
    while True:
        p = rng.uniform([0, 0], [SW, SH])
        d = np.hypot(alv[:, 0] - p[0], alv[:, 1] - p[1]) - alv[:, 2]
        if d.min() > 3 and np.hypot(p[0] - 250, (p[1] - 450) * 1.6) > 200: return p

def niche_pt(scale=1.0):
    r = NR * scale * min(abs(rng.normal(0, 0.55)), 1.0); th = rng.uniform(0, 2 * math.pi)
    return NICHE + r * np.array([math.cos(th), math.sin(th) * 0.8])

def airway(ks):
    th = rng.uniform(0, 2 * math.pi); r = 200 + rng.normal(0, 6) + (14 if ks == 3 else 0)
    return np.array([250 + r * math.cos(th), 450 + r * math.sin(th) / 1.6])

near = lambda p: np.hypot(*(p - NICHE)) < NR * 1.15
for c in cells:
    k = c[0]
    if k == 0: p = on_ring(alv[rng.integers(len(alv))], 3) if rng.random() < 0.85 else niche_pt(1.3)
    elif k == 1: p = niche_pt(0.9) if rng.random() < 0.8 else on_ring(alv[rng.integers(len(alv))], 3)
    elif k == 2:
        while True:
            p = on_ring(alv[rng.integers(len(alv))], 2.5)
            if not near(p) or rng.random() < 0.15: break
    elif k in (3, 4): p = airway(k)
    elif k == 5: p = niche_pt(1.05) if rng.random() < 0.45 else between()
    elif k == 6:
        while True:
            p = between()
            if not near(p) or rng.random() < 0.3: break
    else: p = niche_pt(1.0) if rng.random() < 0.4 else alv[rng.integers(len(alv)), :2] + rng.normal(0, 14, 2)
    c += [float(np.clip(p[0], 0, SW)), float(np.clip(p[1], 0, SH))]

order = rng.permutation(len(cells))
cells = [cells[i] for i in order]

# ── marker dot plot: each cluster's own markers high; KRT8 also lifts in AT2 near the niche (partial), etc.
GENES = [g for c in CLUSTERS for g in c[4]]
def expr(gene, k):
    own = CLUSTERS[k][4]
    if gene in own: return 0.82 + 0.15 * rng.random(), 0.78 + 0.2 * rng.random()
    shared = {("KRT8", 0): (0.34, 0.41), ("KRT8", 2): (0.28, 0.33), ("CLDN4", 0): (0.22, 0.25), ("SFN", 2): (0.30, 0.37),
              ("SFTPC", 1): (0.36, 0.48), ("AGER", 1): (0.25, 0.30), ("SPP1", 1): (0.18, 0.22), ("CTHRC1", 7): (0.10, 0.14)}
    if (gene, k) in shared: return shared[(gene, k)]
    return 0.02 + 0.05 * rng.random(), 0.02 + 0.08 * rng.random()

markers = [(g, k, *expr(g, k)) for g in GENES for k in range(K)]

# enrichment within the niche (computed, not invented): share of each type inside vs outside
inside = np.array([near(np.array(c[4:6])) for c in cells])
types = np.array([c[0] for c in cells])
enrich = [float((types[inside] == k).mean() / max((types == k).mean(), 1e-9)) for k in range(K)]

(ROOT / "source/data").mkdir(parents=True, exist_ok=True)
with open(ROOT / "source/data/cells.csv", "w", newline="") as f:
    w = csv.writer(f); w.writerow(["id", "cluster", "umap_1", "umap_2", "x_um", "y_um", "pseudotime"])
    for i, c in enumerate(cells): w.writerow([i, CLUSTERS[c[0]][0], f"{c[1]:.3f}", f"{c[2]:.3f}", f"{c[4]:.1f}", f"{c[5]:.1f}", f"{c[3]:.3f}" if c[3] >= 0 else ""])
with open(ROOT / "source/data/markers.csv", "w", newline="") as f:
    w = csv.writer(f); w.writerow(["gene", "cluster", "mean_expr", "pct_expressing"])
    for g, k, m, p in markers: w.writerow([g, CLUSTERS[k][0], f"{m:.3f}", f"{p:.3f}"])

atlas = {
    "note": "illustrative data generated by paper-src/simulate.py for a fictional manuscript; not measured",
    "clusters": [{"label": c[0], "short": c[1], "color": c[2], "n": c[3], "markers": c[4]} for c in CLUSTERS],
    "umapRange": [-11, 11, -9, 7], "section": [SW, SH], "niche": [*NICHE.tolist(), NR],
    "alveoli": [[round(a[0], 1), round(a[1], 1), round(a[2], 1)] for a in alv],
    # k, ux, uy, sx, sy, pseudotime(-1 none)
    "cells": [[c[0], round(c[1], 2), round(c[2], 2), round(c[4]), round(c[5]), round(c[3], 3)] for c in cells],
    "genes": GENES, "dot": [[GENES.index(g), k, round(m, 3), round(p, 3)] for g, k, m, p in markers],
    "enrich": [round(e, 2) for e in enrich],
}
(ROOT / "assets/data").mkdir(parents=True, exist_ok=True)
(ROOT / "assets/data/atlas.json").write_text(json.dumps(atlas, separators=(",", ":")))
print("cells", len(cells), "enrichment", dict(zip([c[1] for c in CLUSTERS], atlas["enrich"])))
