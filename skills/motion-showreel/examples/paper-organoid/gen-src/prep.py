"""prep.py: the GPT Image 2.5 originals in source/gen/*/ -> assets/ill/*.webp, sized for the notebook.

The cover and the stained organoid are opaque prints, resized. The tool sketches and the pen were generated with a
real alpha channel (the image tool's transparent background): the sketch sheet is cut into its three drawings
(connected shapes, left to right: pipette, plate, dish), and the pen is trimmed and its felt tip measured (the lowest
opaque pixel), so the pen can be drawn with its tip exactly on the handwriting. Writes assets/ill/meta.json.
Run: python3 gen-src/prep.py"""
import json, pathlib
import numpy as np
from PIL import Image
from scipy import ndimage
P = pathlib.Path(__file__).resolve().parents[1]
GEN, OUT = P / 'source/gen', P / 'assets/ill'
OUT.mkdir(parents=True, exist_ok=True)
meta = {}
def save(im, name, side):
    k = side / max(im.size); im = im.resize((round(im.size[0] * k), round(im.size[1] * k)), Image.LANCZOS)
    im.save(OUT / f'{name}.webp', 'WEBP', quality=88, method=6); meta[name] = {'size': list(im.size)}; return im, k
save(Image.open(GEN / 'a/cover_organoid.png').convert('RGB'), 'cover', 900)
save(Image.open(GEN / 'a/stained_organoid.png').convert('RGB'), 'stained', 720)
sk = Image.open(GEN / 'b/tools_sketch.png').convert('RGBA'); a = np.asarray(sk)[..., 3] > 30
lab, n = ndimage.label(ndimage.binary_dilation(a, iterations=6))
objs = sorted([o for o in ndimage.find_objects(lab) if (o[0].stop - o[0].start) * (o[1].stop - o[1].start) > 4000], key=lambda o: o[1].start)
for name, o in zip(['pipette', 'plate', 'dish'], objs):
    save(sk.crop((o[1].start, o[0].start, o[1].stop, o[0].stop)), name, 520)
pen = Image.open(GEN / 'b/pen.png').convert('RGBA'); a = np.asarray(pen)[..., 3]
ys, xs = np.where(a > 40); pen = pen.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
im, k = save(pen, 'pen', 760)
a = np.asarray(im)[..., 3] > 60; ys, xs = np.where(a); i = np.argmax(ys - xs * 0.001)
meta['pen']['tip'] = [int(xs[i]), int(ys[i])]
(OUT / 'meta.json').write_text(json.dumps(meta, indent=1))
print(json.dumps(meta))
