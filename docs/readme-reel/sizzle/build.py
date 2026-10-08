#!/usr/bin/env python3
"""Build the README's sizzle previews with the motion-showreel runtime: assets/readme/hero.webp, twin-*.webp and
moment-*.webp. Every frame of them is rendered by the skill's own runtime; this script only cuts and encodes.

  python3 docs/readme-reel/sizzle/build.py                 # everything (cwebp -m 6)
  python3 docs/readme-reel/sizzle/build.py hero --draft    # one target, faster encode (-m 4)
  python3 docs/readme-reel/sizzle/build.py --list          # targets, durations and shot lists
Needs the runtime set up (npm install in skills/motion-showreel/runtime), Pillow + numpy, and cwebp + webpmux
(libwebp). Frames are cached in build/ and composite/build/ (git-ignored); --fresh renders them again.

How (edit.json holds every decision):
  1. Footage. Each shot is a range of a real cut of one of the two example projects (the same cut plans that
     render.mjs turns into the MP4s), rendered frame by frame with frames.mjs (openReel from runtime/stills.mjs) at
     the preview frame rate, plus margins on both sides for transitions. The title card is a scene of its own project
     (title/, styled by ../style.json, which tools/extract_style.py derived from this repository's README).
  2. Edits (hero, twins). composite/ is a reel project whose scene `footage` draws those frames; build.py writes its
     cut plan (one scene per shot, on the edit's beat grid, `in` = the examples' own transitions) and the runtime's
     compositor renders every frame, transitions included (frames inside a whip average 4 sub-frame renders).
     Moments are single ranges and skip this stage.
  3. Encode. Lanczos downscale, then an animated WebP that loops forever: each frame sends only the box that changed
     (plan_rects), encoded on its own with cwebp and assembled with webpmux. Each loop opens inside its end-card
     hold: the first frame is a finished poster frame and the loop seam is a hard cut back to the opening shot.
Film grain is off in these renders (edit.json "grain"): it is new noise in every frame, which an animated WebP pays
for in full; everything else renders exactly as the projects define it.
"""
import argparse
import hashlib
import json
import math
import os
import shutil
import subprocess
import sys
import time
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
COMPOSITE = HERE / 'composite'
BUILD = HERE / 'build'
TRANS_DEF = {  # runtime/compositor.js TRANS_DEF: transition windows in beats (pre, post)
    'cut': (0, 0), 'blobWipe': (1, 0), 'zoomInto': (1, 0), 'whip': (0.3, 0.3), 'glitch': (0.2, 0.44), 'flash': (0, 0),
    'strobe': (0, 0), 'match': (0, 0), 'impact': (0, 0), 'portalFlash': (0.8, 1.2), 'dissolve': (0.5, 0.5), 'push': (0.5, 0),
}
SMOOTH = {'whip': 4}   # transitions whose frames are averaged from sub-frame renders (count)


def rel(p):
    return os.path.relpath(p, Path.cwd())


def run(cmd, **kw):
    r = subprocess.run(cmd, **kw)
    if r.returncode:
        sys.exit(f'failed ({r.returncode}): {" ".join(map(str, cmd[:3]))} ...')
    return r


def durations(n, fps):
    """Integer-millisecond frame durations whose running sum stays on the exact fps clock."""
    return [round((i + 1) * 1000 / fps) - round(i * 1000 / fps) for i in range(n)]


_PH = {}


def project_hash(P):
    """Hash of what a source project draws with: reel.config, its style file, scenes, modules and assets."""
    P = Path(P).resolve()
    if P not in _PH:
        cfg = P / 'reel.config.json'
        files = [cfg, (P / json.loads(cfg.read_text()).get('style', 'style.json')).resolve()]
        files += sorted((P / 'scenes').glob('*.js')) + sorted((P / 'modules').glob('*.js'))
        files += sorted(f for f in (P / 'assets').rglob('*') if f.is_file()) if (P / 'assets').is_dir() else []
        h = hashlib.sha1()
        for f in files:
            if f.exists():
                h.update(f.name.encode() + f.read_bytes())
        _PH[P] = h.hexdigest()
    return _PH[P]


def key(E, *parts):
    """Content key for cached footage: a shot's frames are reused only while its source range and the source
    project's code and style are unchanged."""
    S = json.dumps([E['sources'][parts[0]], project_hash(HERE / E['sources'][parts[0]]['project']), E['fps'], E['grain'],
                    *parts], sort_keys=True)
    return hashlib.sha1(S.encode()).hexdigest()[:10]


def window(tr, params, beat):
    pre, post = TRANS_DEF.get(tr, (0, 0))
    pre = params.get('pre', params.get('preBeats', pre) * beat)
    post = params.get('post', params.get('postBeats', post) * beat)
    if tr == 'match' and params.get('fade'):
        pre, post = max(pre, params['fade'] / 2), max(post, params['fade'] / 2)
    return pre, post


def render_jobs(jobs, workers):
    """jobs: [(key, job dict)] for frames.mjs; skips frames that already exist."""
    for key, job in jobs:
        todo = [it for it in job['items'] if not Path(it[1]).exists()]
        if not todo:
            continue
        job = {**job, 'items': todo, 'workers': workers}
        jf = BUILD / 'jobs' / f'{key}.json'
        jf.parent.mkdir(parents=True, exist_ok=True)
        jf.write_text(json.dumps(job))
        run(['node', str(HERE / 'frames.mjs'), str(jf)])


def ensure_plans(E, uses):
    """Cut plans are generated (git-ignored): plan any source cut that is missing with the skill's planner."""
    for src, cut in sorted(uses):
        P = (HERE / E['sources'][src]['project']).resolve()
        if not (P / 'build' / f'cut-{cut}.json').exists():
            run([sys.executable, str(ROOT / 'skills/motion-showreel/timing/plan_cut.py'), '--project', str(P), '--cut', cut])


def source_job(E, src, cut=None):
    S = E['sources'][src]
    job = {'project': str((HERE / S['project']).resolve()), 'grain': E['grain']}
    if 'scene' in S:
        job.update(mode='scene', scene=S['scene'], dur=S['dur'], cut=S['cut'], post=True)
    else:
        job.update(mode='out', cut=cut)
    return job


# ───────── edits (hero, twins): footage -> composite plan -> composite frames ─────────
def plan_edit(name, E, ed):
    fps, beat = E['fps'], 60 / ed['bpm']
    shots, t = [], 0.0
    for k, s in enumerate(ed['shots']):
        n0 = round(t * fps)
        t += s['dur']
        shots.append({**s, 'k': k, 'f0': n0, 'f1': round(t * fps)})
    for i, s in enumerate(shots):
        tr = s.get('in', 'cut') if i else 'cut'
        s['pre'], s['post'] = window(tr, s.get('inParams', {}), beat)
    for i, s in enumerate(shots):          # footage margins: the incoming pre-roll and the outgoing run-on
        nxt = shots[i + 1] if i + 1 < len(shots) else None
        s['padL'] = math.ceil(s['pre'] * fps) + 2
        s['padR'] = math.ceil((nxt['post'] if nxt else 0) * fps) + 2
        s['n'] = s['padL'] + (s['f1'] - s['f0']) + s['padR']
        s['dir'] = f'{name}-{s["k"]:02d}-' + key(E, s['src'], s.get('cut'), s['at'], s['padL'], s['n'])
    total = shots[-1]['f1']
    plan = {
        'cut': name, 'bpm': ed['bpm'], 'beatsPerBar': 4, 'beatSec': beat, 'barSec': 4 * beat, 'duration': total / fps,
        'bars': total / fps / (4 * beat), 'fps': fps, 'frames': total, 'music': [], 'cues': [], 'captions': [],
        'planner': 'docs/readme-reel/sizzle/build.py (edit.json)',
        'scenes': [{
            'id': 'footage', 't0': s['f0'] / fps, 't1': s['f1'] / fps, 'in': (s.get('in', 'cut') if s['k'] else 'cut'),
            'inParams': s.get('inParams', {}), 'inBeats': 0, 'outBeats': 0, 'dark': False, 'label': s.get('label', s['dir']),
            'footage': {'dir': s['dir'], 'fps': fps, 'pad': s['padL'], 'n': s['n']},
        } for s in shots],
    }
    return shots, plan, total


def build_edit(name, E, ed, workers):
    fps = E['fps']
    shots, plan, total = plan_edit(name, E, ed)
    (COMPOSITE / 'build').mkdir(parents=True, exist_ok=True)
    (COMPOSITE / 'build' / f'cut-{name}.json').write_text(json.dumps(plan, indent=1))
    jobs = {}
    for s in shots:                         # footage, grouped per source so each cut boots once per worker
        job = source_job(E, s['src'], s.get('cut'))
        jk = f'{name}-src-{s["src"]}-{job.get("cut")}'
        jobs.setdefault(jk, {**job, 'items': []})
        d = COMPOSITE / 'build' / 'footage' / s['dir']
        for i in range(s['n']):
            jobs[jk]['items'].append([round(s['at'] + (i - s['padL']) / fps, 6), str(d / f'{i:04d}.png')])
    render_jobs(list(jobs.items()), workers)
    fdir = BUILD / 'frames' / name
    if fdir.exists():                       # composite frames depend on every shot: always re-render them
        shutil.rmtree(fdir)
    # A whip blurs 12 copies of each frame across one frame interval (runtime/compositor.js); at a preview frame rate
    # those copies step visibly, so frames inside a whip window average 4 renders whose copies interleave (48 copies).
    def times(f):
        t = f / fps
        for s in shots[1:]:
            if s.get('in') in SMOOTH and s['f0'] / fps - s['pre'] - 1 / fps <= t <= s['f0'] / fps + s['post'] + 1 / fps:
                k = SMOOTH[s['in']]
                return [round(t + j / (fps * 12 * k), 7) for j in range(k)]
        return t
    comp = {'project': str(COMPOSITE), 'cut': name, 'mode': 'out', 'prepare': True,
            'items': [[times(f), str(fdir / f'{f:04d}.png')] for f in range(total)]}
    render_jobs([(f'{name}-composite', comp)], workers)
    qs = [None] * total
    for s in shots:
        for f in range(s['f0'], s['f1']):
            qs[f] = s.get('q', ed['q'])
    qs[0] = ed.get('qPoster', qs[0])
    return [str(fdir / f'{f:04d}.png') for f in range(total)], qs


def build_moment(name, E, m, workers):
    fps = E['fps']
    a, b, r = m['from'], m['to'], m['poster']
    n = round((b - a) * fps)
    job = source_job(E, m['src'], m['cut'])
    d = BUILD / 'frames' / f'{name}-{key(E, m["src"], m["cut"], a, n)}'
    job['items'] = [[round(a + i / fps, 6), str(d / f'{i:04d}.png')] for i in range(n)]
    render_jobs([(name, job)], workers)
    k = round((r - a) * fps)                # rotate: open inside the end hold, seam = cut back to the start
    order = list(range(k, n)) + list(range(0, k))
    qs = [m['q']] * n
    qs[0] = m.get('qPoster', m['q'])
    return [str(d / f'{i:04d}.png') for i in order], qs


# ───────── encode ─────────
def resize_one(args):
    """Lanczos in sRGB, like the skill's own preview recipe (linear-light Lanczos rings dark around bright type).
    crop: a box taken before the downscale. The edits keep a 16:9 safe area (32 px and 18 px in from each edge of the
    1920x1080 frame): the compositor's glitch shifts the red channel up to 30 px right and cyan 15 px left (whip less),
    which leaves saturated cyan and red bars at the canvas edges; the HUDs sit about 75 px in, so nothing else is lost."""
    src, dst, w, h, crop = args
    im = Image.open(src).convert('RGB')
    if crop:
        im = im.crop(crop)
    if im.size != (w, h):
        im = im.resize((w, h), Image.LANCZOS)
    im.save(dst, compress_level=1)
    return dst


def plan_rects(frames, durs, tol, full_frac=0.55, align=16):
    """Sub-rectangles for an animated WebP. Each frame is compared with the source pixels last sent for that area; a
    16x16 block counts as changed when 4+ of its pixels moved more than `tol` levels or any pixel moved more than
    4 x `tol` (a lone pixel nudged by resampling is not a change). Only the box around the changed blocks is sent; an
    unchanged frame extends the previous frame's duration. Comparing with sent source pixels (not decoded ones) keeps
    the drift of any area within `tol`, and every sub-frame is encoded on its own, so no error carries from frame to
    frame (libwebp's own animation encoder reuses blocks within a quality-derived tolerance, up to 6 levels at q 72,
    which blotches soft gradients)."""
    ref, plan, W, H = None, [], 0, 0
    for i, f in enumerate(frames):
        a = np.asarray(Image.open(f).convert('RGB'))
        if ref is None:
            H, W = a.shape[:2]
            ref = a.copy()
            plan.append([i, (0, 0, W, H), durs[i]])
            continue
        d = np.abs(a.astype(np.int16) - ref.astype(np.int16)).max(axis=2)
        bh, bw = -(-H // align), -(-W // align)
        pd = np.zeros((bh * align, bw * align), np.int16)
        pd[:H, :W] = d
        blocks = pd.reshape(bh, align, bw, align)
        changed = ((blocks > tol).sum(axis=(1, 3)) >= 4) | ((blocks > 4 * tol).any(axis=(1, 3)))
        if not changed.any():
            plan[-1][2] += durs[i]
            continue
        rows, cols = np.nonzero(changed.any(axis=1))[0], np.nonzero(changed.any(axis=0))[0]
        x0, y0 = cols[0] * align, rows[0] * align
        x1, y1 = min(W, (cols[-1] + 1) * align), min(H, (rows[-1] + 1) * align)
        if (x1 - x0) * (y1 - y0) > full_frac * W * H:
            x0, y0, x1, y1 = 0, 0, W, H
        ref[y0:y1, x0:x1] = a[y0:y1, x0:x1]
        plan.append([i, (int(x0), int(y0), int(x1), int(y1)), durs[i]])
    return plan


def corner_mask(w, h, r):
    """L-mode mask with rounded corners (anti-aliased by 4x supersampling), or None for square corners."""
    if r <= 0:
        return None
    from PIL import ImageDraw
    big = Image.new('L', (w * 4, h * 4), 0)
    ImageDraw.Draw(big).rounded_rectangle((0, 0, w * 4 - 1, h * 4 - 1), radius=r * 4, fill=255)
    return big.resize((w, h), Image.LANCZOS)


def _cwebp(args):
    src, box, png, out, q, method, extra, mask, r = args
    im = Image.open(src).convert('RGB')
    W, H = im.size
    x0, y0, x1, y1 = box
    if mask is not None and (x0 < r or x1 > W - r) and (y0 < r or y1 > H - r):   # the box reaches into a corner
        im.putalpha(mask)
    im.crop(box).save(png, compress_level=1)
    r = subprocess.run(['cwebp', '-quiet', '-q', f'{q:g}', '-m', str(method), *extra, png, '-o', out], capture_output=True, text=True)
    if r.returncode:
        raise RuntimeError(f'cwebp failed on {png}: {r.stderr[-300:]}')
    return out


SAFE = (32, 18, 1888, 1062)     # 1856x1044: exactly 16:9, inside the channel-shift fringe of glitch (<= 30 px) and whip


def encode(name, frames, qs, size, method, fps, out, tol=2, extra=(), crop=None, radius=0):
    """Downscale, plan sub-rectangles, encode each with cwebp (lossy) and assemble with webpmux (loops forever).
    radius: rounded, transparent corners (px at the output size), so each preview reads as a card on the README's
    light and dark pages; a box that reaches into a corner carries the mask, the others stay opaque."""
    w, h = size
    sd = BUILD / 'scaled' / f'{name}-{w}'
    if sd.exists():
        shutil.rmtree(sd)
    sd.mkdir(parents=True)
    with ProcessPoolExecutor() as ex:
        scaled = list(ex.map(resize_one, [(f, str(sd / f'{i:04d}.png'), w, h, crop) for i, f in enumerate(frames)], chunksize=4))
    t0 = time.time()
    plan = plan_rects(scaled, durations(len(scaled), fps), tol)
    wd = BUILD / 'webp' / name
    if wd.exists():
        shutil.rmtree(wd)
    wd.mkdir(parents=True)
    mask = corner_mask(w, h, radius)
    jobs = [(scaled[i], box, str(wd / f'{k:04d}.png'), str(wd / f'{k:04d}.webp'), qs[i], method, list(extra), mask, radius)
            for k, (i, box, _) in enumerate(plan)]
    with ProcessPoolExecutor() as ex:
        files = list(ex.map(_cwebp, jobs))
    args = ['webpmux']
    for (i, (x0, y0, x1, y1), d), f in zip(plan, files):
        args += ['-frame', f, f'+{d}+{x0}+{y0}+0-b']
    out.parent.mkdir(parents=True, exist_ok=True)
    run(args + ['-loop', '0', '-o', str(out)], capture_output=True)
    for d in (sd, wd):                      # per-encode scratch; the rendered frames stay cached
        shutil.rmtree(d)
    full = sum(1 for p in plan if p[1] == (0, 0, w, h))
    return out.stat().st_size, time.time() - t0, len(plan), full


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('targets', nargs='*', help='hero, twin-playful, twin-research, moment-..., or "moments" (default: all)')
    ap.add_argument('--draft', action='store_true', help='faster encode (cwebp -m 4) for trials')
    ap.add_argument('--q', type=float, help='override the quality of every target')
    ap.add_argument('--out', help='write the WebPs here instead of the repository assets (for trials)')
    ap.add_argument('--workers', type=int, default=8)
    ap.add_argument('--fresh', action='store_true', help='re-render frames that already exist')
    ap.add_argument('--list', action='store_true')
    a = ap.parse_args()
    E = json.loads((HERE / 'edit.json').read_text())
    targets = {**{k: ('edit', v) for k, v in E['edits'].items()}, **{k: ('moment', v) for k, v in E['moments'].items()}}
    want = a.targets or list(targets)
    if 'moments' in want:
        want = [t for t in want if t != 'moments'] + [k for k in E['moments']]
    for t in want:
        if t not in targets:
            sys.exit(f'unknown target {t} (known: {", ".join(targets)})')
    if a.list:
        for t in want:
            kind, v = targets[t]
            if kind == 'edit':
                shots, _, total = plan_edit(t, E, v)
                print(f'{t}: {total / E["fps"]:.3f} s, {total} frames @ {E["fps"]} fps, {v["size"][0]}x{v["size"][1]}, q {v["q"]}')
                for s in shots:
                    print(f'   {s["f0"] / E["fps"]:6.3f}-{s["f1"] / E["fps"]:6.3f}  {s.get("in", "cut") if s["k"] else "(open)":9s}  '
                          f'{s["src"]:8s} {str(s.get("cut", "")):5s} from {s["at"]:.4f}  {s.get("label", "")}')
            else:
                print(f'{t}: {v["src"]} cut {v["cut"]} {v["from"]}-{v["to"]} s ({v["to"] - v["from"]:.3f} s), poster {v["poster"]}, '
                      f'{v["size"][0]}x{v["size"][1]}, q {v["q"]}')
        return
    if a.fresh:
        for d in [BUILD / 'frames', COMPOSITE / 'build' / 'footage']:
            if d.exists():
                shutil.rmtree(d)
    uses = set()
    for t in want:
        kind, v = targets[t]
        for s in (v['shots'] if kind == 'edit' else [v]):
            S = E['sources'][s['src']]
            uses.add((s['src'], S.get('cut') or s['cut']))
    ensure_plans(E, uses)
    report = []
    for t in want:
        kind, v = targets[t]
        frames, qs = build_edit(t, E, v, a.workers) if kind == 'edit' else build_moment(t, E, v, a.workers)
        if a.q is not None:
            qs = [a.q] * len(qs)
        out = Path(a.out) / f'{t}.webp' if a.out else ROOT / v['out']
        size, secs, nsub, nfull = encode(t, frames, qs, v['size'], 4 if a.draft else 6, E['fps'], out, E.get('tol', 2), E.get('cwebp', []),
                                         crop=SAFE if kind == 'edit' else None, radius=v.get('radius', 0))
        if kind == 'edit':                  # composite frames are rendered again on every build
            shutil.rmtree(BUILD / 'frames' / t)
        dur = sum(durations(len(frames), E['fps'])) / 1000
        qr = f'{min(qs):g}' if min(qs) == max(qs) else f'{min(qs):g}-{max(qs):g}'
        line = (f'{rel(out)}: {v["size"][0]}x{v["size"][1]}, {len(frames)} frames ({nsub} in the file, {nfull} full), '
                f'{dur:.3f} s @ {E["fps"]} fps, q {qr}, {size / 1e6:.2f} MB (encode {secs:.0f} s)')
        if v.get('maxMB') and size / 1e6 > v['maxMB']:
            line += f'  !! over the {v["maxMB"]} MB budget'
        print(line, flush=True)
        report.append(line)
    print('\n'.join(['--- summary ---', *report]))


if __name__ == '__main__':
    main()
