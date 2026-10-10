"""Simulated data for the fictional behaviour manuscript (source/manuscript.md). Deterministic (seed 7).

Open field: every mouse is a correlated random walk in a 40 x 40 cm box for 10 minutes at 10 Hz, with pauses, a speed
around 7 cm/s and a pull toward the walls (thigmotaxis) whose strength is the mouse's anxiety; the vehicle group's pull
is stronger. Centre time is the share of samples in the middle 20 x 20 cm. Occupancy heatmaps are the 2D histograms of
all twelve mice per group (1-cm bins), smoothed. Water maze: escape latencies over five days of four trials (the same
for both groups, as the manuscript reports), and one swim path per group on day 1 and day 5.
Two-sided t-tests compare the groups' centre times and distances. Writes source/data/*.csv and assets/data/behaviour.json."""
import csv, json, math, pathlib
import numpy as np
from scipy.ndimage import gaussian_filter
from scipy import stats
ROOT = pathlib.Path(__file__).resolve().parents[1]
rng = np.random.default_rng(7)
HZ, T, BOX = 10, 600, 40.0
GROUPS = ['vehicle', 'BXM-2']

def walk(pull, seed):
    r = np.random.default_rng(seed)
    p = np.array([r.uniform(4, 36), r.uniform(4, 36)]); th = r.uniform(0, 2 * math.pi)
    out, moving = [], True
    for i in range(T * HZ):
        if r.random() < (0.012 if moving else 0.05): moving = not moving
        v = (r.lognormal(math.log(8.2), 0.35) if moving else 0.0) / HZ
        # the nearest wall, and the turn that brings the mouse toward it (or along it when close)
        dw = [p[0], BOX - p[0], p[1], BOX - p[1]]; k = int(np.argmin(dw)); d = dw[k]
        wall_dir = [math.pi, 0.0, -math.pi / 2, math.pi / 2][k]
        diff = math.atan2(math.sin(wall_dir - th), math.cos(wall_dir - th))
        th += r.normal(0, 0.32) + (pull * diff / HZ if d > 4 else 0.0)
        q = p + v * np.array([math.cos(th), math.sin(th)])
        if not (1 < q[0] < BOX - 1 and 1 < q[1] < BOX - 1):            # bounce off the wall
            th += math.pi * (0.6 + 0.8 * r.random()); q = np.clip(q, 1.05, BOX - 1.05)
        p = q; out.append(p.copy())
    return np.array(out)

def centre(tr): return float(np.mean((np.abs(tr[:, 0] - 20) < 10) & (np.abs(tr[:, 1] - 20) < 10)))
def dist(tr): return float(np.sum(np.linalg.norm(np.diff(tr, axis=0), axis=1)) / 100)
PULL = {'vehicle': 0.47, 'BXM-2': 0.17}            # tuned so the group means land on the manuscript's numbers
mice = {g: [walk(PULL[g] * rng.uniform(0.8, 1.2), 1000 * gi + m) for m in range(12)] for gi, g in enumerate(GROUPS)}
heat = {}
for g in GROUPS:
    H = np.zeros((40, 40))
    for tr in mice[g]:
        h, _, _ = np.histogram2d(tr[:, 1], tr[:, 0], bins=40, range=[[0, 40], [0, 40]]); H += h
    H = gaussian_filter(H, 1.2); heat[g] = (H / H.max()).round(3).tolist()
ct = {g: [round(centre(t) * 100, 1) for t in mice[g]] for g in GROUPS}
dw = {g: [round(dist(t), 1) for t in mice[g]] for g in GROUPS}
# the example mouse per group: the one closest to its group's mean centre time; its track at 5 Hz
ex = {}
for g in GROUPS:
    m = int(np.argmin([abs(c - np.mean(ct[g])) for c in ct[g]])); ex[g] = mice[g][m][::2].round(2).tolist()
# water maze: latency (s) per day, mean of 4 trials, per mouse; both groups learn alike
days = np.arange(1, 6)
lat = {g: [[round(float(np.clip(58 * math.exp(-(d - 1) / 1.6) + 8 + rng.normal(0, 5), 5, 60)), 1) for d in days] for _ in range(12)] for g in GROUPS}
def swim(day, seed):                                                  # a path from the wall to the platform at (20, 20)
    r = np.random.default_rng(seed); a = r.uniform(0, 2 * math.pi); p = np.array([math.cos(a), math.sin(a)]) * 56.0
    goal = np.array([20.0, 20.0]); out = [p.copy()]; th = math.atan2(-p[1], -p[0])
    search = 1.0 if day == 1 else 0.12
    for i in range(600):
        to = math.atan2(goal[1] - p[1], goal[0] - p[0])
        th += r.normal(0, 0.35 * search + 0.05) + (0.05 if day == 1 else 0.6) * math.atan2(math.sin(to - th), math.cos(to - th))
        p = p + 2.2 * np.array([math.cos(th), math.sin(th)])
        if np.linalg.norm(p) > 58: th += math.pi * 0.8; p = p / np.linalg.norm(p) * 58
        out.append(p.copy())
        if np.linalg.norm(p - goal) < 6: break
    return np.array(out).round(1).tolist()
paths = {g: {'1': swim(1, 50 + gi), '5': swim(5, 60 + gi)} for gi, g in enumerate(GROUPS)}

(ROOT / 'source/data').mkdir(parents=True, exist_ok=True)
with open(ROOT / 'source/data/open_field.csv', 'w', newline='') as f:
    w = csv.writer(f); w.writerow(['group', 'mouse', 'centre_pct', 'distance_m'])
    for g in GROUPS:
        for m in range(12): w.writerow([g, m + 1, ct[g][m], dw[g][m]])
with open(ROOT / 'source/data/water_maze.csv', 'w', newline='') as f:
    w = csv.writer(f); w.writerow(['group', 'mouse', 'day', 'latency_s'])
    for g in GROUPS:
        for m in range(12):
            for d in days: w.writerow([g, m + 1, int(d), lat[g][m][d - 1]])
out = {'note': 'simulated for a fictional manuscript (paper-src/simulate.py)', 'groups': GROUPS, 'box': BOX, 'hz': 5,
       'example': ex, 'heat': heat, 'centre': ct, 'distance': dw, 'latency': lat, 'swim': paths, 'platform': [20, 20], 'pool': 60,
       'test': {k: (lambda r: {'t': round(float(r.statistic), 2), 'p': float('%.2g' % r.pvalue)})(stats.ttest_ind(v['BXM-2'], v['vehicle'])) for k, v in (('centre', ct), ('distance', dw))}}
(ROOT / 'assets/data').mkdir(parents=True, exist_ok=True)
(ROOT / 'assets/data/behaviour.json').write_text(json.dumps(out, separators=(',', ':')))
for g in GROUPS:
    print(g, 'centre %.1f%%' % np.mean(ct[g]), 'distance %.1f m' % np.mean(dw[g]), 'latency', [round(float(np.mean([l[d] for l in lat[g]])), 1) for d in range(5)])
print('json', (ROOT / 'assets/data/behaviour.json').stat().st_size // 1024, 'KB')
