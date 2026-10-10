"""prep.py: the GPT Image 2.5 originals in source/gen/*/ -> assets/ill/*.webp (all made with a real alpha channel).

Each is trimmed to its visible pixels and sized for how big it is drawn. For the mouse seen from above it also records
the pivot the scenes turn it about (the middle of the body, not of the image, which the tail stretches) and the body
length in pixels, so a mouse can be scaled to its arena in centimetres. Writes assets/ill/meta.json.
Run: python3 gen-src/prep.py"""
import json, pathlib
import numpy as np
from PIL import Image
P = pathlib.Path(__file__).resolve().parents[1]
GEN, OUT = P / 'source/gen', P / 'assets/ill'
OUT.mkdir(parents=True, exist_ok=True)
meta = {}
for name, job, side in [('mouse_side', 'a', 900), ('mouse_top', 'a', 420), ('microbes', 'b', 1100)]:
    im = Image.open(GEN / job / f'{name}.png').convert('RGBA'); a = np.asarray(im)[..., 3]
    ys, xs = np.where(a > 20); im = im.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    k = side / max(im.size); im = im.resize((round(im.size[0] * k), round(im.size[1] * k)), Image.LANCZOS)
    im.save(OUT / f'{name}.webp', 'WEBP', quality=90, method=6); m = {'size': list(im.size)}
    if name == 'mouse_top':                                          # the body: rows wider than a tail
        a = np.asarray(im)[..., 3] > 60; widths = a.sum(1); body = np.where(widths > widths.max() * 0.25)[0]
        m['pivot'] = [int(im.size[0] / 2), int((body.min() + body.max()) / 2)]; m['body'] = int(body.max() - body.min())
    meta[name] = m
(OUT / 'meta.json').write_text(json.dumps(meta, indent=1)); print(json.dumps(meta))
