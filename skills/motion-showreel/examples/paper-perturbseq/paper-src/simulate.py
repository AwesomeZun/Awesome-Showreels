"""Simulated data for the fictional Perturb-seq manuscript (source/manuscript.md). Deterministic (seed 11).
Writes source/data/effects.csv (perturbation x gene log2FC), source/data/network.csv and assets/data/screen.json."""
import csv, json, pathlib
import numpy as np
ROOT = pathlib.Path(__file__).resolve().parents[1]
rng = np.random.default_rng(11)
PROGRAMS = ['Exhaustion', 'Effector', 'Memory', 'Cycling', 'Stress']
GENES = ['PDCD1', 'HAVCR2', 'LAG3', 'TOX', 'ENTPD1', 'CXCL13', 'TIGIT', 'CTLA4',          # exhaustion
         'GZMB', 'PRF1', 'IFNG', 'TNF', 'GNLY', 'NKG7', 'KLRD1', 'FASLG',                   # effector
         'TCF7', 'SELL', 'IL7R', 'CCR7', 'LEF1', 'KLF2', 'S1PR1', 'BCL6',                   # memory
         'MKI67', 'TOP2A', 'CDK1', 'CCNB1', 'TYMS', 'PCNA', 'MCM2', 'E2F1',                 # cycling
         'HSPA1A', 'DNAJB1', 'ATF3', 'DDIT3', 'XBP1', 'HSPH1', 'JUN', 'FOS']                # stress
HUB = ['TOX', 'NR4A1', 'ARID1A']
PERTS = HUB + ['NR4A2', 'NR4A3', 'BATF', 'IRF4', 'PRDM1', 'EOMES', 'TBX21', 'RUNX3', 'ID2', 'ID3', 'BACH2', 'FOXO1', 'TCF7',
               'KLF2', 'MYB', 'SATB1', 'ETS1', 'STAT3', 'STAT5A', 'NFATC1', 'NFATC2', 'JUNB', 'FOSL2', 'ATF3', 'ATF4', 'XBP1',
               'HIF1A', 'MYC', 'E2F1', 'E2F3', 'CDK4', 'CDK6', 'SMARCA4', 'ARID1B', 'SMARCB1', 'EZH2', 'SUV39H1', 'DNMT3A',
               'TET2', 'KDM6B', 'CHD7', 'CREBBP', 'EP300', 'BRD4', 'HDAC3', 'NCOR1', 'MBD2', 'ZEB2', 'IKZF2', 'IKZF1',
               'RBPJ', 'NOTCH1', 'GATA3', 'RORC', 'PRDM16', 'ZNF281', 'SP1']
assert len(PERTS) == 60
# each perturbation belongs to a programme with a signed effect on each gene block
blocks = {p: slice(i * 8, i * 8 + 8) for i, p in enumerate(PROGRAMS)}
eff = rng.normal(0, 0.18, (len(PERTS), len(GENES)))
module = []
for i, p in enumerate(PERTS):
    if p in HUB: m = 0
    else: m = int(rng.integers(0, 5))
    module.append(m)
    s = 1.0 if p in HUB else rng.uniform(0.4, 0.9)
    if m == 0:  # exhaustion drivers: knockout lowers exhaustion genes, raises effector and memory
        eff[i, blocks['Exhaustion']] -= s * rng.uniform(0.8, 1.6, 8); eff[i, blocks['Effector']] += s * rng.uniform(0.6, 1.3, 8); eff[i, blocks['Memory']] += s * rng.uniform(0.2, 0.7, 8)
    elif m == 1: eff[i, blocks['Effector']] -= s * rng.uniform(0.7, 1.4, 8)
    elif m == 2: eff[i, blocks['Memory']] -= s * rng.uniform(0.6, 1.3, 8); eff[i, blocks['Exhaustion']] += s * rng.uniform(0.2, 0.6, 8)
    elif m == 3: eff[i, blocks['Cycling']] -= s * rng.uniform(0.8, 1.5, 8)
    else: eff[i, blocks['Stress']] += s * rng.uniform(0.6, 1.2, 8)
eff = np.clip(eff, -2.2, 2.2)
order = sorted(range(len(PERTS)), key=lambda i: (module[i], -abs(eff[i]).sum()))
corr = np.corrcoef(eff)
edges = [(a, b, float(corr[a, b])) for a in range(len(PERTS)) for b in range(a + 1, len(PERTS)) if abs(corr[a, b]) > 0.62]
(ROOT / 'source/data').mkdir(parents=True, exist_ok=True)
with open(ROOT / 'source/data/effects.csv', 'w', newline='') as f:
    w = csv.writer(f); w.writerow(['perturbation', 'programme'] + GENES)
    for i in order: w.writerow([PERTS[i], PROGRAMS[module[i]]] + [f'{v:.3f}' for v in eff[i]])
with open(ROOT / 'source/data/network.csv', 'w', newline='') as f:
    w = csv.writer(f); w.writerow(['source', 'target', 'r'])
    for a, b, r in edges: w.writerow([PERTS[a], PERTS[b], f'{r:.3f}'])
killing = {'control': [round(float(x), 1) for x in rng.normal(38, 3, 9)], 'triple KO': [round(float(x), 1) for x in rng.normal(53.6, 3.5, 9)]}
gain = (np.mean(killing['triple KO']) / np.mean(killing['control']) - 1) * 100
# force layout of the strong edges (|r| > 0.8), deterministic
strong = [(order.index(a), order.index(b), r) for a, b, r in edges if abs(r) > 0.8]
n = len(PERTS); pos = rng.normal(0, 1, (n, 2)); mod_o = [module[i] for i in order]
for it in range(400):
    d = pos[:, None] - pos[None]; dist = np.sqrt((d ** 2).sum(-1)) + 1e-3
    f = (d / dist[..., None] ** 3 * 0.02).sum(1)
    for a, b, r in strong:
        v = pos[b] - pos[a]; L = np.linalg.norm(v) + 1e-6; k = (L - 0.35) * 0.05; f[a] += v / L * k; f[b] -= v / L * k
    for i in range(n):                                             # each programme pulls toward its own sector
        ang = mod_o[i] * 2 * np.pi / 5; f[i] += (np.array([np.cos(ang), np.sin(ang)]) * 1.2 - pos[i]) * 0.01
    pos += np.clip(f, -0.05, 0.05)
pos = (pos - pos.mean(0)) / np.abs(pos).max()
out = {'pos': [[round(float(x), 3), round(float(y), 3)] for x, y in pos], 'strong': [[a, b, round(r, 2)] for a, b, r in strong], 'note': 'simulated for a fictional manuscript', 'programs': PROGRAMS, 'genes': GENES, 'perts': [PERTS[i] for i in order], 'module': [module[i] for i in order],
       'effects': [[round(float(v), 2) for v in eff[i]] for i in order], 'edges': [[order.index(a), order.index(b), round(r, 2)] for a, b, r in edges],
       'hub': HUB, 'killing': killing, 'gain': round(gain, 1)}
(ROOT / 'assets/data').mkdir(parents=True, exist_ok=True)
(ROOT / 'assets/data/screen.json').write_text(json.dumps(out, separators=(',', ':')))
print('edges', len(edges), 'gain %.1f%%' % gain, 'modules', np.bincount(module))
