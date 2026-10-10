"""prep.py: the GPT Image 2.5 originals in source/gen/*/ -> assets/ill/*.webp, sized for how big each is drawn.

The illustrations were generated with a real alpha channel (Codex image_gen's transparent_background option), so no
keying is needed: each is trimmed to its visible pixels, resized and saved as WebP with alpha. It also measures what
the scenes have to line up with, written to assets/ill/meta.json: the open channel through the Cas9 protein (where the
code-drawn DNA passes), and the contact side of the attacking T cell. Run: python3 gen-src/prep.py"""
import json, pathlib
import numpy as np
from PIL import Image
P = pathlib.Path(__file__).resolve().parents[1]
GEN, OUT = P / 'source/gen', P / 'assets/ill'
OUT.mkdir(parents=True, exist_ok=True)
SPEC = {  # name: (job, longest side in px as drawn at 1920 x 1080, trim to the alpha?)
    'tme_bg': ('a', 1920, False), 'tumor_cluster': ('a', 1300, True), 'tcell_tired': ('b', 760, True),
    'cas9': ('b', 1000, True), 'tcell_attack': ('c', 820, True), 'tumor_single': ('c', 700, True), 'tcell': ('t', 520, True),
}
meta = {}
for name, (job, side, trim) in SPEC.items():
    im = Image.open(GEN / job / f'{name}.png').convert('RGBA')
    if trim:
        a = np.asarray(im)[..., 3]; ys, xs = np.where(a > 8)
        im = im.crop((max(0, xs.min() - 4), max(0, ys.min() - 4), min(im.size[0], xs.max() + 5), min(im.size[1], ys.max() + 5)))
    k = side / max(im.size); im = im.resize((round(im.size[0] * k), round(im.size[1] * k)), Image.LANCZOS)
    if name == 'tme_bg': im = im.resize((1920, 1080), Image.LANCZOS)
    im.save(OUT / f'{name}.webp', 'WEBP', quality=88, method=6)
    m = {'size': list(im.size)}
    a = np.asarray(im)[..., 3]
    if name == 'cas9':                                              # the channel: the widest run of clear pixels inside the protein
        best = None
        for y in range(int(im.size[1] * 0.3), int(im.size[1] * 0.75)):
            row = a[y] > 40; xs = np.where(row)[0]
            if len(xs) < 2: continue
            gaps = np.diff(xs); g = int(np.argmax(gaps))
            if gaps[g] > 1 and (best is None or gaps[g] > best[0]): best = (int(gaps[g]), y, int(xs[g]), int(xs[g + 1]))
        ys = [y for y in range(im.size[1]) if (lambda r: (lambda xs: len(xs) > 1 and np.diff(xs).max() > best[0] * 0.6)(np.where(r)[0]))(a[y] > 40)]
        m['channel'] = {'y': round((min(ys) + max(ys)) / 2), 'x0': best[2], 'x1': best[3], 'h': max(ys) - min(ys) + 1}
    if name == 'tcell_attack':                                      # the flattened contact side: rightmost opaque column, mid height
        cols = np.where((a > 40).any(0))[0]; xr = int(cols.max()); yy = np.where(a[:, xr - 6] > 40)[0]
        m['contact'] = [xr, int(yy.mean())]
    meta[name] = m
    print(name, im.size, (OUT / f'{name}.webp').stat().st_size // 1024, 'KB', {k: v for k, v in m.items() if k != 'size'})
(OUT / 'meta.json').write_text(json.dumps(meta, indent=1))
