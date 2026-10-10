"""prep.py: the GPT Image 2.5 render in source/gen/a/ -> assets/ill/objectives.webp (and where its focus is).

The two objectives were generated with a real alpha channel (Codex image_gen's transparent_background option). This
keeps the full 16:9 frame, resizes it to 1920 wide, saves WebP with alpha, and records the focus in meta.json: the point
on the illumination objective's axis right under the detection objective's tip, where the light sheet meets the
sample. Both are measured from the alpha: each objective's axis is the middle of what it fills at its edge, and its tip is
where the opaque run along that axis ends. Run: python3 gen-src/prep.py"""
import json, pathlib
import numpy as np
from PIL import Image
P = pathlib.Path(__file__).resolve().parents[1]
im = Image.open(P / 'source/gen/a/objectives.png').convert('RGBA').resize((1920, 1080), Image.LANCZOS)
a = np.asarray(im)[..., 3] > 60
h, w = a.shape
# each objective enters from an edge: follow its axis (the middle of the rows or columns it fills at that edge)
# inward until the opaque run ends; that is its tip
rows = [y for y in range(h) if a[y, :8].any()]
axis_y = int(np.median(rows)); tip_x = int(np.argmin(a[axis_y]) - 1) if not a[axis_y].all() else w - 1
cols = [x for x in range(w) if a[:8, x].any()]
axis_x = int(np.median(cols)); tip_y = int(np.argmin(a[:, axis_x]) - 1) if not a[:, axis_x].all() else h - 1
im.save(P / 'assets/ill/objectives.webp', 'WEBP', quality=88, method=6)
meta = {'objectives': {'size': [w, h], 'focus': [axis_x, axis_y], 'illTip': [tip_x, axis_y], 'detTip': [axis_x, tip_y]}}
(P / 'assets/ill/meta.json').write_text(json.dumps(meta, indent=1))
print(meta, (P / 'assets/ill/objectives.webp').stat().st_size // 1024, 'KB')
