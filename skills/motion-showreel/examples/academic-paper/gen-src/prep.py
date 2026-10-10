"""prep.py: the GPT Image 2.5 originals in source/gen/v2/ -> assets/ill/*.webp, sized for how big each is drawn (v2).

The alveoli and the niche's three cells were generated with a real alpha channel (Codex image_gen's
transparent_background option), so no keying is needed: each is trimmed to its visible pixels, resized and saved as
WebP with alpha; the airspace is an opaque background. It also measures what the scenes line up with, written to
assets/ill/meta.json: the injured patch on the alveoli (its centre measured by eye on the trimmed image, since the
red capillaries fool any colour measure), and
the centre of each of the niche's three cells (the three largest opaque islands, left to right: fibroblast,
transitional cell, macrophage). Run: python3 gen-src/prep.py"""
import json, pathlib
import numpy as np
from PIL import Image
from scipy import ndimage
P = pathlib.Path(__file__).resolve().parents[1]
GEN, OUT = P / 'source/gen/v2', P / 'assets/ill'
OUT.mkdir(parents=True, exist_ok=True)
SPEC = {'alveoli': (980, True), 'niche': (1150, True), 'airspace': (1920, False)}   # longest side as drawn, trim?
meta = {}
for name, (side, trim) in SPEC.items():
    im = Image.open(GEN / f'{name}.png').convert('RGBA')
    if trim:
        a = np.asarray(im)[..., 3]; ys, xs = np.where(a > 8)
        im = im.crop((max(0, xs.min() - 4), max(0, ys.min() - 4), min(im.size[0], xs.max() + 5), min(im.size[1], ys.max() + 5)))
    k = side / max(im.size); im = im.resize((round(im.size[0] * k), round(im.size[1] * k)), Image.LANCZOS)
    if name == 'airspace': im = im.convert('RGB').resize((1920, 1080), Image.LANCZOS)
    im.save(OUT / f'{name}.webp', 'WEBP', quality=86, method=6)
    m = {'size': list(im.size)}
    if name == 'alveoli': m['injury'] = [790, 690]                         # the sac with crowded cells, lower right
    if name == 'niche':
        a = np.asarray(im)[..., 3] > 60; lab, n = ndimage.label(ndimage.binary_closing(a, iterations=6))
        sizes = ndimage.sum(a, lab, range(1, n + 1)); top = np.argsort(sizes)[::-1][:3] + 1
        cs = sorted([[float(v) for v in ndimage.center_of_mass(a, lab, i)][::-1] for i in top])
        m['cells'] = {'fibroblast': [round(c) for c in cs[0]], 'transitional': [round(c) for c in cs[1]], 'macrophage': [round(c) for c in cs[2]]}
    meta[name] = m
(OUT / 'meta.json').write_text(json.dumps(meta, indent=1))
print(json.dumps(meta))
