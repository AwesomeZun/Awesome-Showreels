"""uncomposite.py <webp>...: remove the app's translucent backdrop layer baked into a capture (its colour and alpha
measured on the capture's border), leaving only the content over transparency."""
import sys
import numpy as np
from PIL import Image
for p in sys.argv[1:]:
    im = np.asarray(Image.open(p).convert('RGBA')).astype(float) / 255
    h, w = im.shape[:2]
    border = np.concatenate([im[:4].reshape(-1, 4), im[-4:].reshape(-1, 4), im[:, :4].reshape(-1, 4), im[:, -4:].reshape(-1, 4)])
    border = border[border[:, 3] < 0.75]
    ab = np.median(border[:, 3]); B = np.median(border[:, :3], axis=0)
    a = im[..., 3]; c = im[..., :3]
    a2 = np.clip((a - ab) / (1 - ab), 0, 1)
    c2 = np.where(a2[..., None] > 1e-3, (c * a[..., None] - B * ab * (1 - a2[..., None])) / np.maximum(a2[..., None], 1e-3), 0)
    out = np.dstack([np.clip(c2, 0, 1), a2])
    Image.fromarray((out * 255 + 0.5).astype(np.uint8), 'RGBA').save(p, 'WEBP', quality=88, method=6)
    print(p, 'backdrop alpha %.2f colour %s' % (ab, (B * 255).round().astype(int).tolist()))
