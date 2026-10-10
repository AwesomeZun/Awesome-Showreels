"""pixelize.py: turn the GPT Image 2.5 originals in source/gen/*/ into the shop's 16-colour pixel art in assets/px/.

Every original was asked for 4x4 art pixels in the 16 pastels of source/palette.txt on a flat #00FF00 background. Each
one is keyed and every pixel is snapped to the nearest of the 16 colours by CIELAB distance (plain RGB distance turns
the orange-tan wood into peach and rose blotches); then it is sampled one art pixel per generated block (the block
size is measured, not assumed) with a per-block majority vote, and alpha is 0 or 255. The PNGs hold only the shop's
palette, so the engine (modules/diorama.js) reads them back as palette indices. The room sets the scale (its wall is
about 3 m = 137 art pixels, so 1 m is about 45): the two sprite sheets are cut into one PNG per item and every item is
sampled again from the original at the block size that gives it its real height in the room; the people sheet is cut
into rows of frames at one shared block size. meta.json records every item's size and the pixel it stands on.
Run: python3 gen-src/pixelize.py"""
import json, pathlib
import numpy as np
from PIL import Image
from scipy import ndimage
from skimage import color
P = pathlib.Path(__file__).resolve().parents[1]
GEN, OUT = P / 'source/gen', P / 'assets/px'
OUT.mkdir(parents=True, exist_ok=True)
NAMES, PAL = [], []
for line in (P / 'source/palette.txt').read_text().split('\n'):
    if line.strip():
        n, h = line.split(); NAMES.append(n); PAL.append([int(h[i:i + 2], 16) for i in (1, 3, 5)])
PAL = np.array(PAL)
SHEETS = {  # sheet: item names in reading order (the order the prompt asked for)
    'props_big': ['roaster', 'counter', 'espresso', 'pastry', 'shelf', 'easel', 'sacks', 'monstera'],
    'props_small': ['table', 'chair_l', 'chair_r', 'stool', 'pendant', 'pothos', 'cactus', 'rug', 'record', 'box', 'box_open', 'cups'],
}
TARGET = {  # item: height in art pixels in the room (1 m is about 45), or ('w', width) for flat things
    'roaster': 82, 'counter': 80, 'espresso': 46, 'pastry': 64, 'shelf': 100, 'easel': 58, 'sacks': 38, 'monstera': 72,
    'table': 42, 'chair_l': 50, 'chair_r': 50, 'stool': 40, 'pendant': 46, 'pothos': 50, 'cactus': 26, 'rug': ('w', 96),
    'record': 44, 'box': 32, 'box_open': 38, 'cups': 20,
}
PEOPLE_H = 74                           # a person, standing (the barista's first frame sets the sheet's block size)
CAT_H = 18                              # the cat, sitting
SPEC = {   # name: (job, keyed?)
    'shell': ('a', True), 'props_big': ('a', True), 'props_small': ('b', True), 'people': ('b', True),
    'exterior': ('c', True), 'latte_wide': ('d', False),
}
FORCE_W = {'latte_wide': 320}           # the close-up is drawn to fill the 320 x 180 view at 6x exactly
def period(img):
    L = img.mean(-1); out = []
    for ax in (1, 0):
        g = np.abs(np.diff(L, axis=ax)).sum(axis=1 - ax); g = g - g.mean()
        f = np.abs(np.fft.rfft(g)); fr = np.fft.rfftfreq(len(g)); m = (fr > 1 / 9) & (fr < 1 / 2.5)
        out.append(1 / fr[np.argmax(f * m)])
    return min(out)                     # the finer axis is the honest block size (the other may lock onto a harmonic)
def key_alpha(a):
    r, g, b = a[..., 0].astype(int), a[..., 1].astype(int), a[..., 2].astype(int)
    return ~((g > 170) & (g - r > 70) & (g - b > 70))
PAL_LAB = color.rgb2lab(PAL[None].astype(float) / 255)[0]
def nearest(img):                       # CIELAB distance to the 16 pastels
    lab = color.rgb2lab(img.astype(float) / 255)
    return ((lab[..., None, :] - PAL_LAB[None, None]) ** 2).sum(-1).argmin(-1)
def majority_down(idx, alpha, s):
    h, w = alpha.shape; tw, th = int(round(w / s)), int(round(h / s)); out = np.full((th, tw), 255, np.uint8)
    for y in range(th):
        y0, y1 = int(y * s), max(int(y * s) + 1, int((y + 1) * s))
        for x in range(tw):
            x0, x1 = int(x * s), max(int(x * s) + 1, int((x + 1) * s)); ab = alpha[y0:y1, x0:x1]
            if ab.mean() < 0.5: continue
            out[y, x] = np.bincount(idx[y0:y1, x0:x1][ab], minlength=16).argmax()
    return out
def save(t, path):
    rgba = np.zeros(t.shape + (4,), np.uint8); m = t < 255; rgba[m, :3] = PAL[t[m]]; rgba[m, 3] = 255
    Image.fromarray(rgba, 'RGBA').save(path)
def crop(t):
    ys, xs = np.where(t < 255); return t[ys.min():ys.max() + 1, xs.min():xs.max() + 1], (int(xs.min()), int(ys.min()))
meta = {'palette': {n: '#%02X%02X%02X' % tuple(c) for n, c in zip(NAMES, PAL)}, 'items': {}, 'sizes': {}, 'people': {}}
for name, (job, keyed) in SPEC.items():
    src = GEN / job / f'{name}.png'
    if not src.exists(): print('missing', src); continue
    im = np.asarray(Image.open(src).convert('RGB'))
    s = im.shape[1] / FORCE_W[name] if name in FORCE_W else period(im); alpha = key_alpha(im) if keyed else np.ones(im.shape[:2], bool)
    t = majority_down(nearest(im), alpha, s)
    print(f'{name}: block {s:.2f}px -> {t.shape[1]}x{t.shape[0]}')
    if name in SHEETS:
        lab, n = ndimage.label(ndimage.binary_dilation(t < 255, iterations=3))
        comps = [ndimage.find_objects(lab)[i] for i in range(n)]
        comps = [c for c in comps if (c[0].stop - c[0].start) * (c[1].stop - c[1].start) > 60]
        rows = sorted(comps, key=lambda c: (c[0].start + c[0].stop) / 2)
        # group into rows by vertical overlap, then left to right
        lines = []
        for c in rows:
            cy = (c[0].start + c[0].stop) / 2
            for ln in lines:
                if abs(ln[0] - cy) < 40: ln[1].append(c); break
            else: lines.append([cy, [c]])
        order = [c for _, cs in sorted(lines, key=lambda l: l[0]) for c in sorted(cs, key=lambda c: c[1].start)]
        names = SHEETS[name]
        if len(order) != len(names): print(f'  {name}: found {len(order)} shapes for {len(names)} names')
        idx_full = nearest(im)
        for nm, c in zip(names, order):
            # the item's box in original pixels, sampled again at the block size that gives it its height in the room
            y0, y1, x0, x1 = int(c[0].start * s), int(c[0].stop * s), int(c[1].start * s), int(c[1].stop * s)
            m = (lab[c] > 0)
            mask_full = np.zeros(alpha.shape, bool)
            for yy in range(c[0].start, c[0].stop):
                for xx in range(c[1].start, c[1].stop):
                    if m[yy - c[0].start, xx - c[1].start]: mask_full[int(yy * s):int((yy + 1) * s) + 1, int(xx * s):int((xx + 1) * s) + 1] = True
            a_item = alpha[y0:y1, x0:x1] & mask_full[y0:y1, x0:x1]
            ys, xs = np.where(a_item)
            tg = TARGET[nm]
            bs = (xs.max() - xs.min() + 1) / tg[1] if isinstance(tg, tuple) else (ys.max() - ys.min() + 1) / tg
            sub = majority_down(idx_full[y0:y1, x0:x1], a_item, bs); sub, _ = crop(sub)
            save(sub, OUT / f'{nm}.png'); ys, xs = np.where(sub < 255)
            meta['items'][nm] = {'size': [sub.shape[1], sub.shape[0]], 'foot': [int(xs[ys == ys.max()].mean()), int(ys.max())]}
            print(f'  {nm}: {sub.shape[1]}x{sub.shape[0]} (block {bs:.2f})')
    elif name == 'people':
        lab, n = ndimage.label(ndimage.binary_dilation(t < 255, iterations=1))
        objs = [o for o in ndimage.find_objects(lab) if (o[0].stop - o[0].start) > 12]
        hmed = np.median([o[0].stop - o[0].start for o in objs])
        split = []                                                  # two figures stacked into one shape: cut at the emptiest row
        for o in objs:
            h = o[0].stop - o[0].start
            if h > 1.5 * hmed:
                rows_fill = (t[o] < 255).sum(1); mid = slice(int(h * 0.3), int(h * 0.7))
                cut = o[0].start + mid.start + int(np.argmin(rows_fill[mid]))
                split += [(slice(o[0].start, cut), o[1]), (slice(cut, o[0].stop), o[1])]
            else: split.append(o)
        objs = split
        lines = []
        for o in sorted(objs, key=lambda o: o[0].stop):           # rows by the feet line
            for ln in lines:
                if abs(ln[0] - o[0].stop) < hmed * 0.5: ln[1].append(o); break
            else: lines.append([o[0].stop, [o]])
        rows = [sorted(cs, key=lambda o: o[1].start) for _, cs in sorted(lines, key=lambda l: l[0])]
        bs = (rows[0][0][0].stop - rows[0][0][0].start) * s / PEOPLE_H   # one block size for every frame
        idx_full = nearest(im)
        labels = ['barista', 'walk_l', 'walk_r', 'misc']
        cat_bs = (rows[3][2][0].stop - rows[3][2][0].start) * s / CAT_H if len(rows) > 3 and len(rows[3]) > 2 else bs
        for li, row in enumerate(rows):
            frames = []
            for k, o in enumerate(row):
                y0, y1, x0, x1 = int(o[0].start * s), int(o[0].stop * s), int(o[1].start * s), int(o[1].stop * s)
                b = cat_bs if (li == 3 and k >= 2) else bs                 # the cat was drawn far too big for a cat
                sub = majority_down(idx_full[y0:y1, x0:x1], alpha[y0:y1, x0:x1], b); sub, _ = crop(sub)
                nm = f'{labels[li] if li < len(labels) else "row" + str(li)}_{k}'
                save(sub, OUT / f'{nm}.png'); ys, xs = np.where(sub < 255)
                frames.append(nm); meta['items'][nm] = {'size': [sub.shape[1], sub.shape[0]], 'foot': [int(xs[ys == ys.max()].mean()), int(ys.max())]}
            meta['people'][labels[li] if li < len(labels) else f'row{li}'] = frames
            print(f'  row {li}: {len(row)} frames, block {bs:.2f}')
    else:
        save(t, OUT / f'{name}.png'); meta['sizes'][name] = [t.shape[1], t.shape[0]]
(OUT / 'meta.json').write_text(json.dumps(meta, indent=1))
