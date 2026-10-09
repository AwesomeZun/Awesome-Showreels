"""Simulated data for the fictional light-sheet manuscript (source/manuscript.md). Deterministic (seed 5).
An embryo is an ellipsoid shell of nuclei around the yolk; tracked cells converge on the dorsal midline (+y) and
extend along the body axis (x) between 6 and 24 hpf, by lineage. Writes source/data/*.csv and assets/data/embryo.json."""
import csv, json, math, pathlib
import numpy as np
ROOT = pathlib.Path(__file__).resolve().parents[1]
rng = np.random.default_rng(5)
LIN = [('notochord', 8.0), ('muscle', 10.1), ('neural', 9.4), ('skin', 11.2)]
# nuclei of a 10-hpf embryo: a shell (radius 1, a little flattened), denser on the dorsal side
nuc = []
while len(nuc) < 2400:
    v = rng.normal(0, 1, 3); v /= np.linalg.norm(v)
    if v[1] < -0.2 and rng.random() < 0.6: continue
    r = 1 + rng.normal(0, 0.035)
    nuc.append([v[0] * 1.15 * r, v[1] * 0.95 * r, v[2] * r])
nuc = np.array(nuc)
mem = (np.abs(np.sin(nuc[:, 0] * 9) * np.cos(nuc[:, 2] * 9)) > 0.75).astype(int)        # membranes bright in patches
noto = ((np.abs(nuc[:, 2]) < 0.12) & (nuc[:, 1] > 0.5)).astype(int)                      # the notochord stripe
# tracks: 19 time points from 6 to 24 hpf
T = np.linspace(6, 24, 19); tracks = []
for i in range(300):
    lin = rng.choice(4, p=[0.18, 0.34, 0.28, 0.20])
    a0 = rng.uniform(0, 2 * math.pi); h0 = rng.uniform(-0.3, 0.8)
    start = np.array([math.cos(a0) * math.sqrt(1 - h0 ** 2) * 1.15, h0 * 0.95, math.sin(a0) * math.sqrt(1 - h0 ** 2)])
    end_z = {0: rng.normal(0, 0.03), 1: rng.choice([-1, 1]) * rng.uniform(0.15, 0.35), 2: rng.normal(0, 0.08), 3: rng.choice([-1, 1]) * rng.uniform(0.4, 0.8)}[lin]
    end_x = rng.uniform(-1.1, 1.1) * (1.25 if lin in (0, 2) else 1.0)
    end_y = {0: 0.86, 1: 0.8, 2: 0.98, 3: 0.55}[lin]
    end = np.array([end_x, end_y, end_z])
    pts = []
    for k, t in enumerate(T):
        u = (t - 6) / 18; e = u * u * (3 - 2 * u)
        p = start * (1 - e) + end * e + rng.normal(0, 0.012, 3) * math.sin(math.pi * u)
        p = p / max(1e-6, np.linalg.norm(p / [1.15, 0.95, 1])) if lin == 3 else p
        pts.append([round(float(c), 3) for c in p])
    tracks.append([int(lin), pts])
(ROOT / 'source/data').mkdir(parents=True, exist_ok=True)
with open(ROOT / 'source/data/nuclei_10hpf.csv', 'w', newline='') as f:
    w = csv.writer(f); w.writerow(['x', 'y', 'z', 'membrane', 'notochord'])
    for p, m, n in zip(nuc, mem, noto): w.writerow([f'{p[0]:.3f}', f'{p[1]:.3f}', f'{p[2]:.3f}', m, n])
with open(ROOT / 'source/data/tracks.csv', 'w', newline='') as f:
    w = csv.writer(f); w.writerow(['track', 'lineage', 'hpf', 'x', 'y', 'z'])
    for i, (l, pts) in enumerate(tracks):
        for t, p in zip(T, pts): w.writerow([i, LIN[l][0], f'{t:.1f}', *p])
out = {'note': 'simulated for a fictional manuscript', 'lineages': [l for l, _ in LIN], 'commit': [c for _, c in LIN], 'hpf': [float(t) for t in T],
       'nuclei': [[round(float(a), 3) for a in p] + [int(m), int(n)] for p, m, n in zip(nuc, mem, noto)], 'tracks': tracks}
(ROOT / 'assets/data').mkdir(parents=True, exist_ok=True)
(ROOT / 'assets/data/embryo.json').write_text(json.dumps(out, separators=(',', ':')))
print('nuclei', len(nuc), 'tracks', len(tracks), 'noto', int(noto.sum()))
