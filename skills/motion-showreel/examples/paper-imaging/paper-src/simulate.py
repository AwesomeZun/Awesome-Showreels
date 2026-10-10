"""Simulated data for the fictional light-sheet manuscript (source/manuscript.md). Deterministic (seed 5).

Every one of the 4,812 tracked cells has a position at six times (6, 8, 10, 13, 17 and 24 hpf). At 6 hpf the cells
are a cap over the animal half of the yolk; by 10 hpf they have spread over all of it (epiboly) and gathered on the
dorsal side (convergence), thicker along the body axis. From there the axial cells extend into the body: the
notochord along the axis, the neural tube above it, muscle either side, while skin covers everything. Lineage is
read from where a cell sits at 10 hpf. One notochord founder's lineage tree is written too: it divides into a branch
that becomes notochord and one that becomes muscle at 8 hpf, two hours before the notochord marker comes on.
Axes: animal pole +y, dorsal +z, left-right x; the yolk is an ellipsoid of radius ~1 (about 300 um).
Writes source/data/nuclei_10hpf.csv, source/data/tracks_sample.csv and assets/data/embryo.json."""
import csv, json, math, pathlib
import numpy as np
ROOT = pathlib.Path(__file__).resolve().parents[1]
rng = np.random.default_rng(5)
N = 4812
LIN = [('notochord', 8.0), ('muscle', 10.1), ('neural', 9.4), ('skin', 11.2)]
HPF = [6, 8, 10, 13, 17, 24]
AX = np.array([1.0, 0.94, 0.94])                                     # yolk semi-axes
sm = lambda a, b, x: (lambda u: u * u * (3 - 2 * u))(min(1.0, max(0.0, (x - a) / (b - a))))
def sph(lat, lon, r):                                                # lon 0 = dorsal (+z), +pi/2 = +x
    return np.array([math.cos(lat) * math.sin(lon), math.sin(lat), math.cos(lat) * math.cos(lon)]) * AX * r

cells = []
while len(cells) < N:
    v = rng.normal(0, 1, 3); v /= np.linalg.norm(v)
    lon, lat = math.atan2(v[0], v[2]), math.asin(v[1])
    band = math.exp(-(lon / 0.42) ** 2)
    if rng.random() > 0.3 + 0.7 * band: continue                     # denser along the dorsal axis
    depth = rng.random()                                             # 0 outer .. 1 inner
    axial = lat > -1.25 and lat < 1.15
    if axial and abs(lon) < 0.09 and depth > 0.45: lin = 0           # notochord: deep on the midline
    elif axial and abs(lon) < 0.30 and depth < 0.5 and lat > -1.0: lin = 2   # neural: outer, on the axis
    elif axial and 0.07 < abs(lon) < 0.42 and depth >= 0.5: lin = 1  # muscle: deep, either side
    else: lin = 3                                                    # skin and the rest
    cells.append((lat, lon, depth, band, lin))

def keyframes(lat, lon, depth, band, lin):
    th10 = 0.035 + 0.09 * band
    p10 = sph(lat, lon, 1.02 + th10 * (1 - depth))
    # 6 and 8 hpf: half and three-quarter epiboly, before convergence
    lon6 = math.pi * math.tanh(1.6 * lon / math.pi) / math.tanh(1.6)
    lat6 = math.pi / 2 - (math.pi / 2 - lat) * 0.5
    p6 = sph(lat6, lon6, 1.02 + 0.13 * (1 - depth))
    p8 = sph(math.pi / 2 - (math.pi / 2 - lat) * 0.75, (lon6 + lon) / 2, 1.02 + (0.13 + th10) / 2 * (1 - depth))
    # 24 hpf: the body along the dorsal meridian, extended 20% and lifting off at the tail
    if lin == 3:
        p24 = sph(lat, lon * 0.92, 1.03 + 0.05 * (1 - depth) + 0.06 * band)
    else:
        a = 1.2 - (1.2 - lat) * 1.2
        R = 1.08 + 0.32 * sm(-1.3, -2.1, a)
        lateral = {0: 0.0, 1: math.copysign(0.07 + 0.08 * (1 - depth), lon), 2: lon * 0.25}[lin]
        radial = {0: 0.0, 1: -0.01, 2: 0.07 + 0.03 * (1 - depth)}[lin]
        p24 = np.array([lateral, math.sin(a) * (R + radial) * AX[1], math.cos(a) * (R + radial) * AX[2]])
    # 13 and 17 hpf: on the way, the axis first
    early = {0: 0.55, 1: 0.5, 2: 0.4, 3: 0.35}[lin]
    p13 = p10 + (p24 - p10) * early
    p17 = p10 + (p24 - p10) * (early + (1 - early) * 0.6)
    return [p6, p8, p10, p13, p17, p24]

K = [keyframes(*c) for c in cells]
lineage = [c[4] for c in cells]
# a sample of tracks to draw: every notochord cell, and an even share of the rest
pick = [i for i in range(N) if lineage[i] == 0] + [i for i in range(N) if lineage[i] != 0 and rng.random() < 0.16]
pick = sorted(pick)

# one notochord founder's lineage tree: a binary tree; the division at 8 hpf splits notochord from muscle
DIV = [6.9, 8.0, 9.4, 11.2, 13.6, 16.8, 20.6]
def tree(t0, level, fate):
    t1 = DIV[level] + rng.normal(0, 0.12) if level < len(DIV) else 24.0
    if level >= 6 or t1 >= 24: return {'t0': round(t0, 2), 't1': 24.0, 'fate': fate}
    if level == 1: kids = [tree(t1, level + 1, 'notochord'), tree(t1, level + 1, 'muscle')]
    else: kids = [tree(t1, level + 1, fate), tree(t1, level + 1, fate)]
    return {'t0': round(t0, 2), 't1': round(t1, 2), 'fate': fate, 'kids': kids}
founder = tree(6.0, 0, 'uncommitted')

(ROOT / 'source/data').mkdir(parents=True, exist_ok=True)
for old in ('tracks.csv',):
    if (ROOT / 'source/data' / old).exists(): (ROOT / 'source/data' / old).unlink()
with open(ROOT / 'source/data/nuclei_10hpf.csv', 'w', newline='') as f:
    w = csv.writer(f); w.writerow(['cell', 'x', 'y', 'z', 'lineage'])
    for i, k in enumerate(K): w.writerow([i, *[f'{c:.3f}' for c in k[2]], LIN[lineage[i]][0]])
with open(ROOT / 'source/data/tracks_sample.csv', 'w', newline='') as f:
    w = csv.writer(f); w.writerow(['cell', 'lineage', 'hpf', 'x', 'y', 'z'])
    for i in pick:
        for t, p in zip(HPF, K[i]): w.writerow([i, LIN[lineage[i]][0], t, *[f'{c:.3f}' for c in p]])
out = {'note': 'simulated for a fictional manuscript (paper-src/simulate.py)', 'lineages': [l for l, _ in LIN],
       'commit': [c for _, c in LIN], 'hpf': HPF, 'lineage': lineage,
       'pos': [[round(float(c), 3) for p in k for c in p] for k in K], 'tracks': pick, 'founder': founder}
(ROOT / 'assets/data').mkdir(parents=True, exist_ok=True)
(ROOT / 'assets/data/embryo.json').write_text(json.dumps(out, separators=(',', ':')))
print('cells', N, 'by lineage', np.bincount(lineage, minlength=4).tolist(), 'tracks drawn', len(pick),
      'json', (ROOT / 'assets/data/embryo.json').stat().st_size // 1024, 'KB')
