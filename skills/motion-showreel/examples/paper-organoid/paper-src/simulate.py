"""Simulated data for the fictional organoid manuscript (source/manuscript.md). Deterministic (seed 21).
A 96-well plate: rows A-H, columns 1-12 (1-2 control, 3-5 pulse day 2, 6-8 day 3, 9-10 day 4, 11-12 day 5).
Writes source/data/plate.csv, source/data/growth.csv and assets/data/organoid.json."""
import csv, json, pathlib
import numpy as np
ROOT = pathlib.Path(__file__).resolve().parents[1]
rng = np.random.default_rng(21)
COND = {1: 'control', 2: 'control', 3: 'day 2', 4: 'day 2', 5: 'day 2', 6: 'day 3', 7: 'day 3', 8: 'day 3', 9: 'day 4', 10: 'day 4', 11: 'day 5', 12: 'day 5'}
MEAN = {'control': 21, 'day 2': 15, 'day 3': 30, 'day 4': 43, 'day 5': 33}
plate = []
for r in 'ABCDEFGH':
    for c in range(1, 13):
        cond = COND[c]; v = float(np.clip(rng.normal(MEAN[cond], 3.2), 4, 70))
        plate.append([r, c, cond, round(v, 1)])
days = np.arange(0, 7.01, 0.25)
growth = [[float(d), round(float(40 + 520 * (1 - np.exp(-d / 3.2)) + rng.normal(0, 6)), 1), int(max(0, np.floor((d - 1.8) * 1.6)))] for d in days]
(ROOT / 'source/data').mkdir(parents=True, exist_ok=True)
with open(ROOT / 'source/data/plate.csv', 'w', newline='') as f:
    w = csv.writer(f); w.writerow(['row', 'col', 'condition', 'enterocytes_pct']); w.writerows(plate)
with open(ROOT / 'source/data/growth.csv', 'w', newline='') as f:
    w = csv.writer(f); w.writerow(['day', 'diameter_um', 'crypt_buds']); w.writerows(growth)
ctl = [p[3] for p in plate if p[2] == 'control']; d4 = [p[3] for p in plate if p[2] == 'day 4']
out = {'note': 'simulated for a fictional manuscript', 'plate': plate, 'growth': growth, 'control': ctl, 'day4': d4,
       'means': {k: round(float(np.mean([p[3] for p in plate if p[2] == k])), 1) for k in MEAN}}
(ROOT / 'assets/data').mkdir(parents=True, exist_ok=True)
(ROOT / 'assets/data/organoid.json').write_text(json.dumps(out, separators=(',', ':')))
print(out['means'])
