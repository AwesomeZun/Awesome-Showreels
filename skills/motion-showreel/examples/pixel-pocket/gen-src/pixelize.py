"""pixelize.py: turn the GPT Image 2.5 originals in source/gen/*/ into four-tone pixel art in assets/px/.

The brand allows exactly four greens. Each original (asked for 6x6 art pixels, four greens, flat #00FF00 behind
anything that needs alpha) is keyed and downsampled to the 240 x 135 grid's scale, one art pixel per generated block.
Most images use a per-block majority vote of the nearest green, which keeps the dithering the original already has.
Two use the classic handheld conversion instead (mode 'dither'): block-mean luminance, stretched between two
percentiles, pulled part-way toward the four levels (so flat areas stay flat instead of turning into a checkerboard)
and quantised to four levels with a 4x4 ordered dither. The night camp needs it because its original is
dark green on dark green, and the topographic map because its contour terraces are one block wide. Alpha is 0 or 255. The PNGs in assets/px hold only those
four colours, so the engine (modules/pocket2.js) can read them back as tone indices 0..3 and light them by tone.
Run: python3 gen-src/pixelize.py"""
import json, pathlib
import numpy as np
from PIL import Image
P = pathlib.Path(__file__).resolve().parents[1]
GEN, OUT = P / 'source/gen', P / 'assets/px'
OUT.mkdir(parents=True, exist_ok=True)
GREENS = np.array([[0x1B, 0x2B, 0x1A], [0x3E, 0x5E, 0x2E], [0x8F, 0xAE, 0x3A], [0xD4, 0xE5, 0x9A]])
SPEC = {   # name: (job, target width in art px or ('h', n) for content n px tall, keyed?, mode)
    # widths follow each original's native block size (~6.6 px), so one art pixel samples one generated block
    'dawn_far': ('a', 270, False, 'vote'), 'trailhead': ('a', 246, True, 'vote'), 'hiker_sheet': ('a', ('h', 38), True, 'vote'),
    'forest': ('b', 250, False, 'vote'), 'forest_near': ('b', 256, True, 'vote'), 'topo_map': ('b', 256, False, ('dither', 1, 99.5, 1.0, 0.35)),
    'summit': ('c', 250, False, 'vote'), 'camp': ('c', 250, False, ('dither', 1, 99.5, 0.85, 0.55)), 'cloud_sea': ('c', 254, True, 'vote'),
}
B4 = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]])
def dither_down(img, tw, lo_p, hi_p, gamma, terrace=0):
    L = (0.3 * img[..., 0] + 0.59 * img[..., 1] + 0.11 * img[..., 2]) / 255
    h, w = L.shape; s = w / tw; th = int(round(h / s)); v = np.zeros((th, tw))
    for y in range(th):
        y0, y1 = int(y * s), max(int(y * s) + 1, int((y + 1) * s))
        for x in range(tw):
            x0, x1 = int(x * s), max(int(x * s) + 1, int((x + 1) * s)); v[y, x] = L[y0:y1, x0:x1].mean()
    lo, hi = np.percentile(v, lo_p), np.percentile(v, hi_p)
    v = np.clip((v - lo) / (hi - lo), 0, 1) ** gamma * 3
    v = v + terrace * (np.round(v) - v)        # pull values toward the four levels: fewer half-tone checkers, same shapes
    t = (B4[np.arange(th)[:, None] % 4, np.arange(tw)[None, :] % 4] + 0.5) / 16
    return np.clip(np.floor(v + t), 0, 3).astype(np.uint8)
def key_alpha(a):
    r, g, b = a[..., 0].astype(int), a[..., 1].astype(int), a[..., 2].astype(int)
    return ~((g > 200) & (r < 90) & (b < 90))
def majority_down(img, alpha, tw):
    h, w = alpha.shape; s = w / tw; th = int(round(h / s))
    tones = np.full((th, tw), 255, np.uint8)
    d = ((img[..., None, :].astype(int) - GREENS[None, None]) ** 2).sum(-1).argmin(-1)      # nearest green per source px
    for y in range(th):
        y0, y1 = int(y * s), max(int(y * s) + 1, int((y + 1) * s))
        for x in range(tw):
            x0, x1 = int(x * s), max(int(x * s) + 1, int((x + 1) * s))
            ab = alpha[y0:y1, x0:x1]
            if ab.mean() < 0.5: continue
            v = d[y0:y1, x0:x1][ab]; tones[y, x] = np.bincount(v, minlength=4).argmax()
    return tones
meta = {'greens': ['#%02X%02X%02X' % tuple(c) for c in GREENS], 'sheets': {}}
for name, (job, tw, keyed, mode) in SPEC.items():
    src = GEN / job / f'{name}.png'
    if not src.exists(): print('missing', src); continue
    im = np.asarray(Image.open(src).convert('RGB'))
    alpha = key_alpha(im) if keyed else np.ones(im.shape[:2], bool)
    if isinstance(tw, tuple):
        ys, xs = np.where(alpha); tw = max(8, int(round(im.shape[1] * tw[1] / (ys.max() - ys.min() + 1))))
    t = majority_down(im, alpha, tw) if mode == 'vote' else dither_down(im, tw, *mode[1:])
    rgba = np.zeros(t.shape + (4,), np.uint8); m = t < 4; rgba[m, :3] = GREENS[t[m]]; rgba[m, 3] = 255
    Image.fromarray(rgba, 'RGBA').save(OUT / f'{name}.png')
    if name.endswith('_sheet'):
        cols = m.any(0); frames = []; x = 0
        while x < m.shape[1]:
            while x < m.shape[1] and not cols[x]: x += 1
            x0 = x
            while x < m.shape[1] and cols[x]: x += 1
            if x - x0 >= 4: frames.append([x0, x])
        meta['sheets'][name] = {'frames': frames, 'size': [m.shape[1], m.shape[0]], 'foot': int(np.where(m.any(1))[0].max() + 1)}
    print(name, t.shape)
(OUT / 'meta.json').write_text(json.dumps(meta, indent=1))
print(meta['sheets'])
