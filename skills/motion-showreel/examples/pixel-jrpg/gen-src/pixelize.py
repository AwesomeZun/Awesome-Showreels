"""pixelize.py: turn the GPT Image 2.5 originals in source/gen/*/ into true pixel art in assets/px/.

Each original was asked for 'every art pixel an exact 4x4 block' on a flat #00FF00 key where it needs alpha. Steps:
  1. key out the green (and its anti-aliased fringe) into a hard alpha;
  2. downscale to the art grid with a per-block majority vote (no blended in-between colours);
  3. quantize every asset to ONE shared palette (median cut over all assets together, 40 colours), so all scenes sit
     in the same 16-bit world; alpha stays 0 or 255;
  4. sprite sheets are split into frames on fully transparent columns.
Run: python3 gen-src/pixelize.py  (needs Pillow and numpy)."""
import json, pathlib
import numpy as np
from PIL import Image
P = pathlib.Path(__file__).resolve().parents[1]
GEN, OUT = P / 'source/gen', P / 'assets/px'
OUT.mkdir(parents=True, exist_ok=True)
# name: (job, target width in art pixels, or ('h', n) to make the content n art pixels tall, keyed?)
SPEC = {
    'corridor_bg': ('a', 416, False), 'corridor_fg': ('a', 416, True), 'hero_sheet': ('a', ('h', 64), True),
    'town_sky': ('b', 416, False), 'town_mid': ('b', 480, True), 'town_near': ('b', 480, True),
    'overworld': ('c', 256, False), 'airship': ('c', ('h', 48), True), 'clouds': ('c', 416, True),
    'battle_bg': ('d', 400, False), 'boss': ('d', ('h', 120), True), 'party': ('d', ('h', 60), True),
}
def key_alpha(a):
    r, g, b = a[..., 0].astype(int), a[..., 1].astype(int), a[..., 2].astype(int)
    green = (g > 150) & (g - np.maximum(r, b) > 60)
    return ~green
def majority_down(img, alpha, tw):
    h, w = alpha.shape; s = w / tw; th = int(round(h / s))
    out = np.zeros((th, tw, 3), np.uint8); oa = np.zeros((th, tw), bool)
    for y in range(th):
        y0, y1 = int(y * s), max(int(y * s) + 1, int((y + 1) * s))
        for x in range(tw):
            x0, x1 = int(x * s), max(int(x * s) + 1, int((x + 1) * s))
            blk, ab = img[y0:y1, x0:x1].reshape(-1, 3), alpha[y0:y1, x0:x1].reshape(-1)
            if ab.mean() < 0.5: continue
            px = blk[ab]
            q = (px // 24).astype(int); keys = q[:, 0] * 10000 + q[:, 1] * 100 + q[:, 2]
            vals, cnt = np.unique(keys, return_counts=True); k = vals[cnt.argmax()]
            out[y, x] = px[keys == k].mean(0); oa[y, x] = True
    return out, oa
done = {}
for name, (job, tw, keyed) in SPEC.items():
    src = GEN / job / f'{name}.png'
    if not src.exists(): print('missing', src); continue
    im = np.asarray(Image.open(src).convert('RGB'))
    alpha = key_alpha(im) if keyed else np.ones(im.shape[:2], bool)
    if isinstance(tw, tuple):                      # ('h', n): scale so the opaque content is n art pixels tall
        ys, xs = np.where(alpha); hgt = ys.max() - ys.min() + 1
        tw = max(8, int(round(im.shape[1] * tw[1] / hgt)))
    rgb, a = majority_down(im, alpha, tw)
    done[name] = (rgb, a)
    print(name, rgb.shape)
# one shared palette over everything that is opaque
allpx = np.concatenate([rgb[a] for rgb, a in done.values()])
pal_img = Image.fromarray(allpx.reshape(1, -1, 3)).quantize(40, method=Image.Quantize.MEDIANCUT)
palette = pal_img.getpalette()[:120]
pimg = Image.new('P', (1, 1)); pimg.putpalette(palette + [0] * (768 - 120))
meta = {}
for name, (rgb, a) in done.items():
    q = Image.fromarray(rgb).quantize(palette=pimg, dither=Image.Dither.NONE).convert('RGB')
    arr = np.asarray(q); rgba = np.dstack([arr, (a * 255).astype(np.uint8)])
    img = Image.fromarray(rgba, 'RGBA')
    if name.endswith('_sheet') or name in ('party',):
        cols = a.any(0); frames = []; x = 0; W = a.shape[1]
        while x < W:
            while x < W and not cols[x]: x += 1
            x0 = x
            while x < W and cols[x]: x += 1
            if x - x0 >= 6: frames.append([x0, x])
        meta[name] = {'frames': frames, 'size': [a.shape[1], a.shape[0]]}
    img.save(OUT / f'{name}.png')
(P / 'assets/px/meta.json').write_text(json.dumps({'palette': ['#%02X%02X%02X' % tuple(palette[i:i + 3]) for i in range(0, 120, 3)], 'sheets': meta}, indent=1))
print('palette', len(palette) // 3, 'sheets', {k: len(v['frames']) for k, v in meta.items()})

# ───────── extras the scenes need (read back from the quantized files)
from collections import deque
M = json.loads((OUT / 'meta.json').read_text())
def rgba(name): return np.asarray(Image.open(OUT / f'{name}.png').convert('RGBA')).astype(int)
# party: split three heroes at the two emptiest columns near 1/3 and 2/3
pa = rgba('party'); dens = (pa[..., 3] > 0).sum(0); W_ = pa.shape[1]
cuts = [int(np.argmin(dens[int(W_ * f - W_ * 0.12):int(W_ * f + W_ * 0.12)]) + int(W_ * f - W_ * 0.12)) for f in (1 / 3, 2 / 3)]
M['sheets']['party'] = {'frames': [[0, cuts[0]], [cuts[0], cuts[1]], [cuts[1], W_]], 'size': [W_, pa.shape[0]], 'foot': int(np.where((pa[..., 3] > 0).any(1))[0].max() + 1)}
# hero: the lantern (brightest warm pixel) in each frame, as an offset from the frame's bottom centre
hs = rgba('hero_sheet'); lan = []
for f0, f1 in M['sheets']['hero_sheet']['frames']:
    fr = hs[:, f0:f1]; warm = (fr[..., 0] > 200) & (fr[..., 1] > 120) & (fr[..., 2] < 140) & (fr[..., 3] > 0)
    ys, xs = np.where(warm); rows = np.where((fr[..., 3] > 0).any(1))[0]; foot = rows.max() + 1
    lan.append([round(float(xs.mean()) - (f1 - f0) / 2, 1), round(float(ys.mean()) - foot, 1)] if len(xs) else [12, -30])
M['sheets']['hero_sheet']['lantern'] = lan
M['sheets']['hero_sheet']['foot'] = int(np.where((hs[..., 3] > 0).any(1))[0].max() + 1)
# town: the lit windows as components; an unlit copy with every window pixel turned to night glass
tm = rgba('town_mid'); lit = (tm[..., 0] > 180) & (tm[..., 1] > 120) & (tm[..., 2] < 120) & (tm[..., 3] > 0)
seen = np.zeros_like(lit); wins = []
for y in range(lit.shape[0]):
    for x in range(lit.shape[1]):
        if lit[y, x] and not seen[y, x]:
            q = deque([(y, x)]); seen[y, x] = 1; pts = []
            while q:
                cy, cx = q.popleft(); pts.append((cy, cx))
                for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, -1), (1, -1), (-1, 1)):
                    ny, nx = cy + dy, cx + dx
                    if 0 <= ny < lit.shape[0] and 0 <= nx < lit.shape[1] and lit[ny, nx] and not seen[ny, nx]: seen[ny, nx] = 1; q.append((ny, nx))
            if len(pts) >= 3:
                ys, xs = zip(*pts); wins.append([min(xs), min(ys), max(xs) - min(xs) + 1, max(ys) - min(ys) + 1])
un = tm.copy(); un[lit] = [27, 36, 72, 255]
Image.fromarray(un.astype(np.uint8), 'RGBA').save(OUT / 'town_mid_unlit.png')
M['town_windows'] = sorted(wins, key=lambda r: r[0])
(OUT / 'meta.json').write_text(json.dumps(M, indent=1))
print('party cuts', cuts, 'lantern', lan[:2], 'windows', len(wins))
