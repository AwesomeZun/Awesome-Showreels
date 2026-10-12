"""pads.py: read the pad states (0 off, 1 on, 2 accent) of each captured sequencer image into assets/captures/ui/app/pads.json.
Geometry comes from seq_geo.txt (written by capture/app.json from the DOM); states from the lime of each pad's centre."""
import json, pathlib
import numpy as np
from PIL import Image
D = pathlib.Path(__file__).resolve().parent.parent / 'assets/captures/ui/app'
g = json.loads((D / 'seq_geo.txt').read_text())
out = {'note': 'pad states read from the captured sequencer images (0 off, 1 on, 2 accent); geometry from the DOM (CSS px inside the module, the layer adds 16 px of padding)',
       'w': g['w'], 'h': g['h'], 'rows': [{'name': r['name'], 'pads': [[round(p['x'], 1), round(p['y'], 1), round(p['w'], 1), round(p['h'], 1)] for p in r['pads']]} for r in g['rows']], 'states': {}}
for key in ['lofi', 'house', 'break', 'ambient']:
    src = D / f'seq_{key}.png'
    if not src.exists(): src = D / f'seq_{key}.webp'
    im = np.array(Image.open(src).convert('RGB')).astype(int)
    out['states'][key] = [[(lambda r: 2 if r > 230 else 1 if r > 130 else 0)(im[int((p['y'] + 16 + p['h'] * 0.35) * 2) - 6:int((p['y'] + 16 + p['h'] * 0.35) * 2) + 6,
                            int((p['x'] + 16 + p['w'] / 2) * 2) - 14:int((p['x'] + 16 + p['w'] / 2) * 2) + 14, 1].mean()) for p in r['pads']] for r in g['rows']]
(D / 'pads.json').write_text(json.dumps(out))
print('pads.json', {k: [''.join(map(str, row)) for row in v] for k, v in out['states'].items()})
# (title.webp: after capture it is cropped to the wordmark band and its near-black background keyed to alpha,
#  max channel 22..62 -> 0..1, so the app's panel colour does not show as a box on the reel's stage)
