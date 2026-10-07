#!/usr/bin/env node
// capture_ui.mjs — capture REAL web / app UI as layers for a showreel (Playwright + Chromium).
//
//   node capture_ui.mjs --spec spec.json [--out DIR] [--only name,name] [--headed] [--keep-going]
//   node capture_ui.mjs --example                       print an annotated example spec
//   node capture_ui.mjs --textfree shot.png --out bg.png --roi x,y,w,h [--rows rows.json] [--dpr 3] [--kernel 41] [--fill median|telea]
//                                                        text-free variant + text rows of any raster (native captures)
//
// A spec drives one page through steps and captures LAYERS, not whole screens: the screen base, each element
// (bubble, card, chip row), each state of a component, a text-free copy of a text layer plus the measured rows of
// its text (typing wipes), timed sequences of real state changes. Every capture records its rect, so a scene can
// place it at 1 CSS px = 1 reel px inside a drawn device (dpr 3 leaves room to zoom).
//
// Pitfalls handled (from production): never pause CSS animations to freeze a state (entrance animations freeze at
// opacity 0 -> blank captures); app timers race class changes, so states are set on a STATIC CLONE of the element
// (cloned, inserted after the original, original hidden, clone's animations off; the original comes back after the
// step unless "keep": true); the viewport is the device screen minus the status bar the reel draws; fonts are
// awaited; caret and scrollbars are hidden. Start a recorded flow with record.trigger (a click step settles 300 ms
// and the first state can pass before a separate record step begins). Recorded URLs drop query values and fragments;
// local files are recorded relative to the spec. textFree needs opencv-python; everything else numpy + Pillow.
//
// Outputs in the spec's out dir: <name>.png per layer (state layers <name>_<k>.png, sequences <name>_<nnn>.png),
// <name>.json per step (rects, rows, files, timings), <name>.textfree.png / .mask.png / .rows.png (QA overlay) when
// textFree is set, layers.json (index: device, viewport, url, time, every layer) and sheet.png (contact sheet).
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SKILL = path.resolve(HERE, '..');
const VERSION = '1.0.0';

// ───────── devices (CSS px). viewport = screen - statusBar - homeIndicator (the reel draws those bars) ─────────
const UA = {
  ios: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  ipad: 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  android: 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
};
const DEVICES = {
  'reel-phone': { screen: [412, 872], statusBar: 44, dpr: 3, mobile: true, touch: true, ua: 'ios', note: 'engine.js PHONE screen at 1080p (440x900, inset 14)' },
  iphone: { screen: [393, 852], statusBar: 54, dpr: 3, mobile: true, touch: true, ua: 'ios' },
  'iphone-pro-max': { screen: [440, 956], statusBar: 62, dpr: 3, mobile: true, touch: true, ua: 'ios' },
  'iphone-se': { screen: [375, 667], statusBar: 20, dpr: 3, mobile: true, touch: true, ua: 'ios' },
  android: { screen: [412, 915], statusBar: 28, dpr: 3, mobile: true, touch: true, ua: 'android' },
  ipad: { screen: [820, 1180], statusBar: 24, dpr: 2, mobile: true, touch: true, ua: 'ipad' },
  laptop: { screen: [1280, 800], statusBar: 0, dpr: 2, mobile: false, touch: false },
  desktop: { screen: [1440, 900], statusBar: 0, dpr: 2, mobile: false, touch: false },
  'desktop-hd': { screen: [1920, 1080], statusBar: 0, dpr: 2, mobile: false, touch: false },
};
const MIME = { '.html': 'text/html; charset=utf-8', '.htm': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.otf': 'font/otf', '.mp4': 'video/mp4', '.webm': 'video/webm', '.txt': 'text/plain; charset=utf-8', '.wasm': 'application/wasm' };
const BASE_CSS = '*{caret-color:transparent!important}::-webkit-scrollbar{display:none!important;width:0!important;height:0!important}html,body{scrollbar-width:none!important}';
const CLONE_CSS = '[data-capture-clone],[data-capture-clone] *{animation:none!important;transition:none!important}';
const TEXTFREE_CSS = '[data-cap-target],[data-cap-target] *,[data-cap-target]::before,[data-cap-target]::after,[data-cap-target] *::before,[data-cap-target] *::after{-webkit-text-fill-color:transparent!important;text-shadow:none!important;caret-color:transparent!important;text-decoration-color:transparent!important}[data-cap-target] ::placeholder,[data-cap-target]::placeholder{-webkit-text-fill-color:transparent!important;color:transparent!important}';
const ISOLATE_CSS = 'html,body{background:transparent!important}body *:not([data-cap-target]):not([data-cap-target] *){visibility:hidden!important}[data-cap-target]{visibility:visible!important}';

const EXAMPLE = {
  name: 'app', url: 'https://example.com/app', out: '../assets/captures/ui/app',
  device: 'reel-phone', locale: 'ko-KR', timezone: 'Asia/Seoul', colorScheme: 'light', fixedTime: '2026-10-07T18:02:00+09:00',
  wait: { until: 'networkidle', timeout: 60000, settle: 800 },
  hide: ['#cookie-banner', '.intercom-launcher'], block: ['**/analytics/**'],
  steps: [
    { do: 'shot', name: 'welcome', note: 'first screen as the app shows it' },
    { do: 'click', text: '예시 질문', note: 'start the real flow' },
    { do: 'wait', selector: '.loading', state: 'visible' },
    { do: 'record', name: 'progress', selector: '.loading', every: 250, ms: 15000, until: 'stable:4', note: 'real timing of the progress card' },
    { do: 'states', name: 'load', selector: '.loading', count: 6, js: "(el, k) => el.querySelectorAll('.steps li').forEach((li, i) => { li.className = i < k ? 'done' : i === k ? 'on' : '' })", note: 'deterministic states on a static clone' },
    { do: 'layer', name: 'bubble', selector: '.msg.user .bubble', nth: -1, textFree: true, rows: true },
    { do: 'hide', id: 'msgs', selector: '.msg, .loading' },
    { do: 'shot', name: 'base', note: 'empty chat base under the animated layers' },
    { do: 'show', id: 'msgs' },
  ],
};

// ───────── args ─────────
function parseArgs(argv) {
  const a = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (!k.startsWith('--')) { a._.push(k); continue; }
    const key = k.slice(2), nx = argv[i + 1];
    if (['headed', 'keep-going', 'example', 'help', 'no-sheet'].includes(key)) a[key] = true;
    else { a[key] = nx; i++; }
  }
  return a;
}
const log = (...m) => console.log(...m);
const die = m => { console.error('error: ' + m); process.exit(1); };
const sha1 = b => crypto.createHash('sha1').update(b).digest('hex');
const round = (v, d = 2) => (typeof v === 'number' ? Math.round(v * 10 ** d) / 10 ** d : v);
const rnd = r => r && { x: round(r.x), y: round(r.y), w: round(r.width ?? r.w), h: round(r.height ?? r.h) };

// ───────── browser ─────────
async function getLauncher() {
  try {
    const m = await import(pathToFileURL(path.join(SKILL, 'runtime', 'stills.mjs')).href);
    if (typeof m.launchBrowser === 'function') return o => m.launchBrowser(o);
  } catch (e) { /* fall back below */ }
  let pw = null;
  for (const base of [path.join(SKILL, 'runtime'), process.cwd(), SKILL]) {
    for (const name of ['playwright-core', 'playwright']) {
      try { pw = await import(pathToFileURL(createRequire(path.join(base, 'noop.js')).resolve(name)).href); break; } catch (e) { /* next */ }
    }
    if (pw) break;
  }
  if (!pw) die('playwright-core not found: run `npm install` in skills/motion-showreel/runtime');
  const chromium = pw.chromium || (pw.default && pw.default.chromium);
  const exe = () => {
    const ok = p => { try { return p && fs.statSync(p).isFile(); } catch { return false; } };
    if (ok(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
    try { const p = chromium.executablePath(); if (ok(p)) return p; } catch { /* none */ }
    for (const p of ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe']) if (ok(p)) return p;
    die('no Chromium found: set CHROME_PATH or `npx playwright install chromium`');
  };
  return o => chromium.launch({ executablePath: exe(), headless: o.headless !== false, args: ['--force-color-profile=srgb', '--font-render-hinting=none', '--hide-scrollbars'] });
}

// ───────── python helper (text-free variants, rows from a raster, contact sheet, webp) ─────────
const PY = String.raw`
import sys, json, math
import numpy as np
from PIL import Image, ImageDraw, ImageFont
A = json.loads(sys.argv[1])
if A["mode"] == "textfree":    # OpenCV only for text-free plates; sheets and WebP copies need numpy + Pillow only
    try:
        import cv2
    except ImportError:
        sys.exit("textFree needs OpenCV: python3 -m pip install opencv-python")

def load(p):
    return np.array(Image.open(p).convert("RGBA"))

def rows_from_mask(m, gap=2, min_h=3):
    ys = np.where(m.any(1))[0]
    out = []
    if not len(ys):
        return out
    start = prev = ys[0]
    for y in list(ys[1:]) + [None]:
        if y is not None and y - prev <= gap:
            prev = y
            continue
        band = m[start:prev + 1]
        xs = np.where(band.any(0))[0]
        if prev - start + 1 >= min_h and len(xs):
            out.append([int(xs[0]), int(start), int(xs[-1]) + 1, int(prev) + 1])
        if y is not None:
            start = prev = y
    return out

def fill_rows(img, rows, thr, band=6, grow=3):
    """Rebuild each text row's background from the bands just above and below it (robust per-column medians,
    interpolated vertically) and replace only the pixels that deviate from it. Works for any text size."""
    H, W = img.shape[:2]
    rgb = img[..., :3].astype(np.float32)
    out = img.copy()
    total = np.zeros((H, W), bool)
    k3 = np.ones((3, 3), np.uint8)

    def est(b):
        if b.shape[0] == 0 or b.shape[1] == 0:
            return None
        m = np.median(b, axis=0)
        if m.shape[0] >= 15:
            m = cv2.medianBlur(np.ascontiguousarray(m[None].clip(0, 255).astype(np.uint8)), 15)[0].astype(np.float32)
        return m

    for x0, y0, x1, y1 in rows:
        X0, Y0 = max(0, int(x0) - grow), max(0, int(y0) - grow)
        X1, Y1 = min(W, int(math.ceil(x1)) + grow), min(H, int(math.ceil(y1)) + grow)
        if X1 <= X0 or Y1 <= Y0:
            continue
        t, b = est(rgb[max(0, Y0 - band):Y0, X0:X1]), est(rgb[Y1:min(H, Y1 + band), X0:X1])
        t = b if t is None else t
        b = t if b is None else b
        if t is None:
            continue
        k = np.linspace(0, 1, Y1 - Y0)[:, None, None]
        bg = t[None] * (1 - k) + b[None] * k
        box = rgb[Y0:Y1, X0:X1]
        m = (np.abs(box - bg).max(-1) > thr).astype(np.uint8) * 255
        m = cv2.dilate(m, k3, iterations=2)
        soft = cv2.GaussianBlur(m, (0, 0), 1.0)[..., None] / 255.0
        out[Y0:Y1, X0:X1, :3] = (bg * soft + box * (1 - soft)).clip(0, 255).astype(np.uint8)
        total[Y0:Y1, X0:X1] |= m > 0
    return out, total


def textfree(a):
    img = load(a["a"])
    H, W = img.shape[:2]
    rgb = img[..., :3].astype(np.int16)
    rows = [list(map(float, r)) for r in (a.get("rows") or [])]
    region = np.zeros((H, W), bool)
    if rows:
        for x0, y0, x1, y1 in rows:
            region[max(0, int(y0) - 2):min(H, int(math.ceil(y1)) + 2), max(0, int(x0) - 2):min(W, int(math.ceil(x1)) + 2)] = True
    elif a.get("roi"):
        x, y, w, h = map(int, a["roi"])
        region[max(0, y):y + h, max(0, x):x + w] = True
    else:
        region[:] = True
    k3 = np.ones((3, 3), np.uint8)
    info = {}
    if a.get("b"):
        clean = load(a["b"])
        diff = np.abs(rgb - clean[..., :3].astype(np.int16)).max(-1)
        mask = diff > 16
        # residual glyphs CSS cannot hide (colour emoji, images of text) inside the measured text rows
        resid = np.zeros_like(mask)
        if rows:
            bg = cv2.medianBlur(np.ascontiguousarray(clean[..., :3]), 21).astype(np.int16)
            resid = (np.abs(clean[..., :3].astype(np.int16) - bg).max(-1) > 48) & region
            if resid.sum() > 0:
                rm = cv2.dilate(resid.astype(np.uint8) * 255, k3, iterations=2)
                fixed = cv2.inpaint(np.ascontiguousarray(clean[..., :3][..., ::-1]), rm, 5, cv2.INPAINT_TELEA)[..., ::-1]
                clean = clean.copy()
                clean[..., :3] = np.where(rm[..., None] > 0, fixed, clean[..., :3])
        mask = mask | resid
        info["residualPixels"] = int(resid.sum())
        out = clean
    else:
        # pass 1 (polarity-free): a large median blur approximates the background; pixels far from it are text.
        # It finds the rows; pass 2 rebuilds each row's background from its surrounding bands (any text size).
        ksz = int(a.get("kernel") or 41) | 1
        thr = int(a.get("threshold") or 36)
        rgbu = np.ascontiguousarray(img[..., :3])
        bgm = cv2.medianBlur(rgbu, ksz)
        mask1 = (np.abs(rgbu.astype(np.int16) - bgm.astype(np.int16)).max(-1) > thr) & region
        rows_px = rows or [r for r in rows_from_mask(mask1, gap=max(2, ksz // 8)) if (r[2] - r[0]) * (r[3] - r[1]) > 12]
        if a.get("fill") == "telea":
            md = cv2.dilate(mask1.astype(np.uint8) * 255, k3, iterations=2)
            out = img.copy()
            out[..., :3] = cv2.inpaint(np.ascontiguousarray(rgbu[..., ::-1]), md, 5, cv2.INPAINT_TELEA)[..., ::-1]
            mask = mask1
        else:
            out, mask = fill_rows(img, rows_px, thr)
        rows = rows_px
        info["kernel"] = ksz
    m8 = (mask.astype(np.uint8) * 255)
    Image.fromarray(out, "RGBA").save(a["out"])
    if a.get("mask"):
        Image.fromarray(m8, "L").save(a["mask"])
    info["maskPixels"] = int(mask.sum())
    found = rows if rows else [r for r in rows_from_mask(mask) if (r[2] - r[0]) * (r[3] - r[1]) > 12]
    info["rowsPx"] = found
    if a.get("overlay"):
        ov = Image.fromarray(img, "RGBA").convert("RGB")
        tint = np.array(ov)
        tint[mask] = (0.45 * tint[mask] + 0.55 * np.array([255, 40, 90])).astype(np.uint8)
        ov = Image.fromarray(tint)
        d = ImageDraw.Draw(ov)
        for x0, y0, x1, y1 in found:
            d.rectangle([x0, y0, x1, y1], outline=(0, 200, 255), width=2)
        ov.save(a["overlay"])
    print(json.dumps(info))

def sheet(a):
    files = a["files"]
    if not files:
        return
    tw, th, cols = int(a.get("tw", 360)), int(a.get("th", 360)), int(a.get("cols", 5))
    try:
        font = ImageFont.truetype(a.get("font") or "/System/Library/Fonts/Menlo.ttc", 14)
    except Exception:
        font = ImageFont.load_default()
    rows = math.ceil(len(files) / cols)
    S = Image.new("RGB", (cols * (tw + 12) + 12, rows * (th + 34) + 12), (28, 28, 32))
    d = ImageDraw.Draw(S)
    for i, f in enumerate(files):
        im = Image.open(f).convert("RGBA")
        im.thumbnail((tw, th))
        x, y = 12 + (i % cols) * (tw + 12), 12 + (i // cols) * (th + 34)
        chk = Image.new("RGB", (im.width, im.height), (60, 60, 66))
        cd = ImageDraw.Draw(chk)
        for yy in range(0, im.height, 12):
            for xx in range(0, im.width, 12):
                if (xx // 12 + yy // 12) % 2:
                    cd.rectangle([xx, yy, xx + 11, yy + 11], fill=(80, 80, 88))
        chk.paste(im, (0, 0), im)
        S.paste(chk, (x + (tw - im.width) // 2, y))
        d.text((x, y + th + 6), a["labels"][i][:44], fill=(220, 220, 228), font=font)
    S.save(a["out"])

def webp(a):
    for f in a["files"]:
        im = Image.open(f)
        im.save(f[:-4] + ".webp", "WEBP", quality=int(a.get("quality", 95)), method=6)

{"textfree": textfree, "sheet": sheet, "webp": webp}[A["mode"]](A)
`;
function py(args) {
  const r = spawnSync(process.env.PYTHON || 'python3', ['-c', PY, JSON.stringify(args)], { encoding: 'utf8', maxBuffer: 64 << 20 });
  if (r.status !== 0) throw new Error('python helper failed: ' + (r.stderr || r.stdout || '').trim().split('\n').slice(-3).join(' | '));
  const line = (r.stdout || '').trim().split('\n').pop();
  try { return line ? JSON.parse(line) : {}; } catch { return {}; }
}

// ───────── page helpers ─────────
function resolveLocator(page, s) {
  let loc;
  if (s.selector && s.selector.startsWith('@')) loc = page.locator(`[data-capture-clone="${s.selector.slice(1)}"]`);
  else if (s.selector) loc = page.locator(s.selector);
  else if (s.text) loc = page.getByText(s.text, { exact: !!s.exact });
  else if (s.role) loc = page.getByRole(s.role, s.name ? { name: s.name } : {});
  else return null;
  if (s.nth === -1 || s.nth === 'last') return loc.last();
  if (typeof s.nth === 'number') return loc.nth(s.nth);
  return loc.first();
}
async function addStyle(page, css, id) {
  await page.evaluate(([c, i]) => { const st = document.createElement('style'); st.setAttribute('data-capture-style', i); st.textContent = c; document.head.appendChild(st); }, [css, id]);
}
async function removeStyle(page, id) {
  await page.evaluate(i => document.querySelectorAll(`style[data-capture-style="${i}"]`).forEach(n => n.remove()), id);
}
async function settle(page, ms = 120) {
  await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
  await page.evaluate(() => new Promise(r => {
    const c = window.__capture || {}, raf = c.raf || requestAnimationFrame, st = c.timeout || setTimeout;
    raf(() => raf(r)); st(r, 250);   // two frames, or 250 ms if frames are throttled
  }));
  if (ms) await page.waitForTimeout(ms);
}
// Text rows of an element: per-character client rects grouped into lines (CSS px, relative to the padded box).
async function measureRows(loc, pad) {
  return loc.evaluate((el, pad) => {
    const base = el.getBoundingClientRect(), ox = base.left - pad, oy = base.top - pad;
    const chars = [];
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    while (walker.nextNode()) {
      const n = walker.currentNode, s = n.textContent;
      if (!s || !s.trim()) continue;
      const pe = n.parentElement, cs = pe && getComputedStyle(pe);
      if (cs && (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0)) continue;
      let i = 0;
      for (const ch of s) {
        const len = ch.length;
        range.setStart(n, i); range.setEnd(n, i + len); i += len;
        if (ch === '\n' || ch === '\r') continue;
        for (const r of range.getClientRects()) if (r.width > 0 && r.height > 0) chars.push({ ch, x0: r.left - ox, x1: r.right - ox, y0: r.top - oy, y1: r.bottom - oy, sp: /\s/.test(ch) });
      }
    }
    const rows = [];
    for (const c of chars) {
      const cy = (c.y0 + c.y1) / 2;
      let row = rows.find(r => cy > r.y0 && cy < r.y1);
      if (!row) { row = { y0: c.y0, y1: c.y1, chars: [] }; rows.push(row); }
      row.y0 = Math.min(row.y0, c.y0); row.y1 = Math.max(row.y1, c.y1); row.chars.push(c);
    }
    rows.sort((a, b) => a.y0 - b.y0);
    const r2 = v => Math.round(v * 100) / 100;
    return rows.map(r => {
      r.chars.sort((a, b) => a.x0 - b.x0);
      const ink = r.chars.filter(c => !c.sp);
      if (!ink.length) return null;
      return { x0: r2(Math.min(...ink.map(c => c.x0))), x1: r2(Math.max(...ink.map(c => c.x1))), y0: r2(r.y0), y1: r2(r.y1), text: r.chars.map(c => c.ch).join('').trim(), cx: r.chars.map(c => r2(c.x1)) };
    }).filter(Boolean);
  }, pad);
}
async function elementInfo(loc) {
  return loc.evaluate(el => {
    const cs = getComputedStyle(el), r = el.getBoundingClientRect();
    const px = v => parseFloat(v) || 0;
    return {
      rect: { x: r.left, y: r.top, w: r.width, h: r.height }, scroll: { x: window.scrollX, y: window.scrollY },
      radius: [px(cs.borderTopLeftRadius), px(cs.borderTopRightRadius), px(cs.borderBottomRightRadius), px(cs.borderBottomLeftRadius)],
      bg: cs.backgroundColor, color: cs.color, font: `${cs.fontWeight} ${cs.fontSize}/${cs.lineHeight} ${cs.fontFamily}`.slice(0, 160),
      tag: el.tagName.toLowerCase(), text: (el.innerText || '').trim().slice(0, 400),
    };
  });
}

// Playwright clamps screenshot clips to the viewport; clamp first so the recorded rect matches the image.
function clampClip(c, vw, vh) {
  const x0 = Math.max(0, c.x), y0 = Math.max(0, c.y), x1 = Math.min(vw, c.x + c.width), y1 = Math.min(vh, c.y + c.height);
  return { x: x0, y: y0, width: Math.max(1, x1 - x0), height: Math.max(1, y1 - y0) };
}

// ───────── capture runner ─────────
class Run {
  constructor(spec, specFile, a) {
    this.spec = spec;
    this.dir = path.dirname(path.resolve(specFile));
    this.out = path.resolve(a.out ? path.resolve(a.out) : path.resolve(this.dir, spec.out || `captures-${spec.name || 'ui'}`));
    fs.mkdirSync(this.out, { recursive: true });
    this.only = a.only ? new Set(String(a.only).split(',')) : null;
    this.keepGoing = !!a['keep-going'] || !!spec.keepGoing;
    this.layers = {};
    this.files = [];
    this.warnings = [];
    const d = typeof spec.device === 'string' ? DEVICES[spec.device] : { ...(DEVICES[spec.device && spec.device.preset] || {}), ...(spec.device || {}) };
    if (!d || !d.screen) die(`unknown device ${JSON.stringify(spec.device)} (presets: ${Object.keys(DEVICES).join(', ')}) or give {screen, statusBar, dpr}`);
    this.dev = { statusBar: 0, homeIndicator: 0, dpr: 3, mobile: false, touch: false, ...d };
    const vp = spec.viewport || [this.dev.screen[0], this.dev.screen[1] - this.dev.statusBar - this.dev.homeIndicator];
    this.viewport = { width: vp[0], height: vp[1] };
  }
  file(n) { return path.join(this.out, n); }
  write(name, data) { fs.writeFileSync(this.file(name), typeof data === 'string' ? data : JSON.stringify(data, null, 1) + '\n'); return name; }
  url(u) {
    if (!u) return u;
    if (/^[a-z]+:/i.test(u)) return u;
    if (this.spec.serve) return 'http://capture.local' + (u.startsWith('/') ? u : '/' + u);
    const m = /^([^?#]*)(.*)$/.exec(u);   // a local path keeps its ?query / #hash
    return pathToFileURL(path.resolve(this.dir, m[1])).href + m[2];
  }
  // The page URL as it may ship (sidecars are inlined into the single-file HTML): file: URLs become a path relative
  // to the spec (never an absolute user path), http(s) URLs lose credentials, the fragment and query VALUES (which
  // can hold session, magic-link or OAuth tokens; parameter names stay).
  safeUrl(u) {
    if (!u) return null;
    if (u.startsWith('http://capture.local')) return '(served)' + u.slice('http://capture.local'.length).replace(/[?#].*$/, '');
    try {
      const x = new URL(u);
      if (x.protocol === 'file:') {
        const p = fileURLToPath(x), r = path.relative(this.dir, p);
        return '(file) ' + (r && !r.startsWith('..') && !path.isAbsolute(r) ? r.split(path.sep).join('/') : path.basename(p));
      }
      if (x.protocol === 'http:' || x.protocol === 'https:') {
        const keys = [...new Set(x.searchParams.keys())];
        return x.origin + x.pathname + (keys.length ? '?' + keys.map(k => `${encodeURIComponent(k)}=…`).join('&') : '');
      }
      return x.protocol;
    } catch { return '(url)'; }
  }
  meta(extra = {}) {
    return { url: this.page ? this.safeUrl(this.page.url()) : null, capturedAt: new Date().toISOString(), tool: 'capture_ui.mjs', toolVersion: VERSION, ...extra };
  }
  async start(launch, headed) {
    const S = this.spec, dv = this.dev;
    this.browser = await launch({ headless: !headed });
    const ctxOpts = {
      viewport: this.viewport, screen: { width: dv.screen[0], height: dv.screen[1] }, deviceScaleFactor: dv.dpr,
      isMobile: !!dv.mobile, hasTouch: !!dv.touch, userAgent: S.userAgent || dv.userAgent || (dv.ua ? UA[dv.ua] : undefined),
      locale: S.locale || dv.locale, timezoneId: S.timezone || dv.timezone, colorScheme: S.colorScheme || 'light', reducedMotion: S.reducedMotion || 'no-preference',
    };
    Object.keys(ctxOpts).forEach(k => ctxOpts[k] === undefined && delete ctxOpts[k]);
    this.ctx = await this.browser.newContext(ctxOpts);
    if (S.cookies) await this.ctx.addCookies(S.cookies);
    if (S.localStorage || S.init) {
      await this.ctx.addInitScript(([ls, init]) => {
        try { for (const [k, v] of Object.entries(ls || {})) localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); } catch (e) { /* opaque origin */ }
        if (init) (0, eval)(init);
      }, [S.localStorage || null, S.init || null]);
    }
    for (const pat of S.block || []) await this.ctx.route(pat, r => r.abort());
    if (S.serve) {
      const root = path.resolve(this.dir, S.serve);
      await this.ctx.route('http://capture.local/**', route => {
        let p = decodeURIComponent(new URL(route.request().url()).pathname);
        if (p.endsWith('/')) p += 'index.html';
        const f = path.join(root, p);
        if (!f.startsWith(root) || !fs.existsSync(f) || !fs.statSync(f).isFile()) return route.fulfill({ status: 404, body: 'not found' });
        return route.fulfill({ status: 200, path: f, headers: { 'content-type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream' } });
      });
    }
    this.page = await this.ctx.newPage();
    this.page.on('pageerror', e => this.warnings.push('pageerror: ' + e.message.split('\n')[0]));
    if (S.fixedTime && this.page.clock) await this.page.clock.setFixedTime(new Date(S.fixedTime));
    if (S.url) await this.goto(S.url);
  }
  async goto(u) {
    const w = { until: 'networkidle', timeout: 60000, settle: 800, ...(this.spec.wait || {}) };
    await this.page.goto(this.url(u), { waitUntil: w.until, timeout: w.timeout });
    await addStyle(this.page, BASE_CSS + (this.spec.css || '') + (this.spec.hide || []).map(s => `${s}{visibility:hidden!important}`).join(''), 'base');
    await settle(this.page, w.settle);
  }
  // capture one element (or the viewport when no target) -> {file, rect, ...}
  async capture(name, s, loc) {
    const page = this.page, pad = s.pad || 0, alpha = !!s.alpha;
    let info = null, clip = null;
    if (loc) {
      await loc.waitFor({ state: 'visible', timeout: s.timeout || 15000 });
      let bb = await loc.boundingBox();
      if (!bb) throw new Error(`no box for ${name}`);
      const vw = this.viewport.width, vh = this.viewport.height;
      if (bb.y < 0 || bb.x < 0 || bb.y + bb.height > vh || bb.x + bb.width > vw) { await loc.scrollIntoViewIfNeeded(); await settle(page, 80); bb = await loc.boundingBox(); }
      info = await elementInfo(loc);
      clip = clampClip({ x: bb.x - pad, y: bb.y - pad, width: bb.width + 2 * pad, height: bb.height + 2 * pad }, vw, vh);
      if (bb.height + 2 * pad > vh) this.warnings.push(`${name}: element taller than the viewport; clipped (use a full-page shot)`);
    }
    const shoot = async (file, extraCss) => {
      if (extraCss) { await addStyle(page, extraCss, 'tmp'); await settle(page, 60); }
      const buf = await page.screenshot({ path: this.file(file), clip: clip || undefined, fullPage: !loc && !!s.full, omitBackground: alpha, animations: s.animations || 'allow', caret: 'hide', scale: 'device' });
      if (extraCss) await removeStyle(page, 'tmp');
      return buf;
    };
    if (loc) await loc.evaluate(el => el.setAttribute('data-cap-target', '1'));
    const file = `${name}.png`;
    const buf = await shoot(file, alpha ? ISOLATE_CSS : null);
    this.files.push(file);
    const L = { file, kind: loc ? 'element' : s.full ? 'page' : 'screen', px: null, dpr: this.dev.dpr, sha1: sha1(buf).slice(0, 12) };
    if (loc) {
      const c = clip;   // the clamped capture rect (CSS px, viewport)
      Object.assign(L, {
        rect: rnd({ x: c.x, y: c.y, w: c.width, h: c.height }),
        screen: rnd({ x: c.x, y: c.y + this.dev.statusBar, w: c.width, h: c.height }),
        page: rnd({ x: c.x + info.scroll.x, y: c.y + info.scroll.y, w: c.width, h: c.height }),
        element: rnd({ x: info.rect.x - c.x, y: info.rect.y - c.y, w: info.rect.w, h: info.rect.h }),
        pad, radius: info.radius, bg: info.bg, color: info.color, font: info.font, text: s.keepText === false ? undefined : info.text, alpha,
      });
    } else Object.assign(L, { rect: { x: 0, y: 0, w: this.viewport.width, h: this.viewport.height }, screen: { x: 0, y: this.dev.statusBar, w: this.viewport.width, h: this.viewport.height }, scroll: await page.evaluate(() => [scrollX, scrollY]) });
    L.px = [Math.round(L.rect.w * this.dev.dpr), Math.round(L.rect.h * this.dev.dpr)];
    if (loc && (s.rows || s.textFree)) {
      L.rows = await measureRows(loc, pad);
      const dx = (info.rect.x - pad) - clip.x, dy = (info.rect.y - pad) - clip.y;   // padded box -> clamped clip
      if (dx || dy) for (const r of L.rows) { r.x0 += dx; r.x1 += dx; r.y0 += dy; r.y1 += dy; r.cx = r.cx.map(v => v + dx); }
      if (!L.rows.length) this.warnings.push(`${name}: no visible text rows found`);
    }
    if (loc && s.textFree) {
      const mode = s.textFree === true ? 'dom' : s.textFree;
      const tf = `${name}.textfree.png`, mk = `${name}.mask.png`, ov = `${name}.rows.png`;
      let res;
      if (mode === 'dom') {
        await shoot(`${name}.notext.tmp.png`, TEXTFREE_CSS + (alpha ? ISOLATE_CSS : ''));
        res = py({ mode: 'textfree', a: this.file(file), b: this.file(`${name}.notext.tmp.png`), out: this.file(tf), mask: this.file(mk), overlay: this.file(ov), rows: L.rows.map(r => [r.x0, r.y0, r.x1, r.y1].map(v => v * this.dev.dpr)) });
        fs.rmSync(this.file(`${name}.notext.tmp.png`), { force: true });
      } else {
        res = py({ mode: 'textfree', a: this.file(file), out: this.file(tf), mask: this.file(mk), overlay: this.file(ov), rows: L.rows.map(r => [r.x0, r.y0, r.x1, r.y1].map(v => v * this.dev.dpr)), kernel: s.kernel, fill: s.fill });
      }
      Object.assign(L, { textFree: tf, mask: mk, rowsOverlay: ov, textFreeMode: mode, maskPixels: res.maskPixels, residualPixels: res.residualPixels });
      if (!res.maskPixels) this.warnings.push(`${name}: text-free copy is identical to the layer (text rendered as image or canvas?) — try textFree: "inpaint"`);
      this.files.push(tf);
    }
    if (loc) await loc.evaluate(el => el.removeAttribute('data-cap-target')).catch(() => {});
    return L;
  }
  async freeze(loc, as, how = 'none') {
    await addStyle(this.page, CLONE_CSS, 'clone');
    await loc.evaluate((el, [as, how]) => {
      const c = el.cloneNode(true);
      c.setAttribute('data-capture-clone', as);
      el.after(c);
      el.setAttribute('data-capture-orig', as);
      el.style.setProperty('display', 'none', 'important');
      if (how === 'finish') { c.querySelectorAll('*').forEach(n => n.style && n.style.setProperty('animation', 'none', 'important')); }
    }, [as, how]);
    await settle(this.page, 60);
    return this.page.locator(`[data-capture-clone="${as}"]`).first();
  }
  async unfreeze(as) {
    await this.page.evaluate(as => {
      document.querySelectorAll(`[data-capture-clone="${as}"]`).forEach(n => n.remove());
      document.querySelectorAll(`[data-capture-orig="${as}"]`).forEach(n => { n.style.removeProperty('display'); n.removeAttribute('data-capture-orig'); });
    }, as);
    await settle(this.page, 60);
  }
  fn(js) {
    const src = String(js).trim();
    return /^(async\s*)?(\(|function\b|[A-Za-z_$][\w$]*\s*=>)/.test(src) ? src : `(el, k, page) => { ${src} }`;
  }
  async step(s) {
    const page = this.page;
    const loc = () => resolveLocator(page, s);
    switch (s.do) {
      case 'goto': await this.goto(s.url); break;
      case 'wait':
        if (s.ms) await page.waitForTimeout(s.ms);
        if (s.selector || s.text) await loc().waitFor({ state: s.state || 'visible', timeout: s.timeout || 30000 });
        if (s.fn) await page.waitForFunction(s.fn, null, { timeout: s.timeout || 30000 });
        if (s.network) await page.waitForLoadState('networkidle', { timeout: s.timeout || 30000 });
        break;
      case 'click': await loc().click({ force: !!s.force, timeout: s.timeout || 15000 }); if (s.settle !== 0) await settle(page, s.settle ?? 300); break;
      case 'hover': await loc().hover({ timeout: s.timeout || 15000 }); await settle(page, s.settle ?? 200); break;
      case 'fill': await loc().fill(s.value ?? s.text2 ?? s.input ?? '', { timeout: s.timeout || 15000 }); break;
      case 'type': await loc().pressSequentially(s.value ?? s.input ?? '', { delay: s.delay ?? 40 }); break;
      case 'press': if (s.selector || s.text) await loc().press(s.key); else await page.keyboard.press(s.key); break;
      case 'scroll':
        if (s.to) await resolveLocator(page, { selector: s.to }).scrollIntoViewIfNeeded();
        else await page.evaluate(([y, within]) => { const e = within ? document.querySelector(within) : document.scrollingElement; e.scrollTop = y; }, [s.y || 0, s.within || null]);
        await settle(page, s.settle ?? 200); break;
      case 'eval': await page.evaluate(s.js); await settle(page, s.settle ?? 100); break;
      case 'css': await addStyle(page, s.css, s.id || 'css'); await settle(page, s.settle ?? 100); break;
      case 'uncss': case 'show': await removeStyle(page, s.id); await settle(page, s.settle ?? 100); break;
      case 'hide': await addStyle(page, `${s.selector}{visibility:hidden!important}`, s.id || 'hide'); await settle(page, s.settle ?? 100); break;
      case 'stopApp':
        // freeze the app: no more timers, frames or network (the DOM stays as it is right now)
        await page.evaluate(() => {
          // keep the originals for the capture tool itself (settle() waits on animation frames)
          window.__capture = { raf: window.requestAnimationFrame.bind(window), timeout: window.setTimeout.bind(window) };
          // timer ids count up (fake clocks start near 1e12): clear the low range and the most recent 50k ids
          const max = setTimeout(() => {}, 0);
          for (let i = 0; i <= Math.min(max, 50000); i++) { clearTimeout(i); clearInterval(i); }
          for (let i = Math.max(50001, max - 50000); i <= max; i++) { clearTimeout(i); clearInterval(i); }
          window.setTimeout = window.setInterval = () => 0; window.requestAnimationFrame = () => 0;
        });
        await this.ctx.route('**', r => (r.request().url().startsWith('http://capture.local') ? r.fallback() : r.abort()));
        break;
      case 'shot': {
        const L = await this.capture(s.name, s, null);
        this.layers[s.name] = { step: 'shot', note: s.note, ...L };
        this.write(`${s.name}.json`, { ...this.layers[s.name], ...this.meta() });
        break;
      }
      case 'layer': {
        if (s.all) {
          const base = s.selector ? page.locator(s.selector) : page.getByText(s.text, { exact: !!s.exact });
          const n = await base.count();
          const list = [];
          for (let i = 0; i < n; i++) {
            const L = await this.capture(`${s.name}_${i}`, s, base.nth(i));
            this.layers[`${s.name}_${i}`] = { step: 'layer', note: s.note, ...L }; list.push(L);
          }
          this.write(`${s.name}.json`, { step: 'layer', all: true, layers: list, ...this.meta({ selector: s.selector }) });
        } else {
          const L = await this.capture(s.name, s, loc());
          this.layers[s.name] = { step: 'layer', note: s.note, selector: s.selector || s.text, ...L };
          this.write(`${s.name}.json`, { ...this.layers[s.name], ...this.meta() });
        }
        break;
      }
      case 'states': {
        let target = loc();
        const cloned = s.clone !== false && !(s.selector || '').startsWith('@');
        if (cloned) target = await this.freeze(target, s.as || s.name, s.freeze);
        const fn = this.fn(s.js || '');
        const items = s.list || Array.from({ length: s.count || 1 }, (_, k) => ({ k }));
        const out = [];
        for (let i = 0; i < items.length; i++) {
          const it = items[i];
          const f = it.js ? this.fn(it.js) : fn;
          await target.evaluate((el, [src, k]) => (0, eval)(src)(el, k), [f, it.k ?? i]);
          await settle(page, s.settle ?? 120);
          const nm = `${s.name}_${it.name ?? i}`;
          const L = await this.capture(nm, s, target);
          this.layers[nm] = { step: 'states', state: it.name ?? i, note: s.note, ...L };
          out.push({ state: it.name ?? i, ...L });
        }
        this.write(`${s.name}.json`, { step: 'states', clone: s.clone !== false, states: out, ...this.meta({ selector: s.selector }) });
        // put the page back (clone removed, original shown) so later steps find the live element; keep: true leaves
        // the clone in place for later steps that target it as "@<as>"
        if (cloned && !s.keep) await this.unfreeze(s.as || s.name);
        break;
      }
      case 'freeze': await this.freeze(loc(), s.as || s.name || 'frozen', s.freeze); break;
      case 'record': {
        // Real state changes over time (provenance: the app's own timing). dedupe 'dom' (default): a frame is taken
        // when the target's DOM changes (CSS spinners do not count), after its finite animations/transitions finish;
        // t = when the change was seen. 'pixels': when the screenshot changes (canvas UIs). 'none': every poll.
        if (s.trigger) await this.step(s.trigger);
        const target = s.selector || s.text ? loc() : null;
        const every = s.every ?? 200, limit = s.ms ?? 10000, mode = s.dedupe || 'dom', pad = s.pad || 0;
        const until = String(s.until || '');
        const stableN = /^stable:(\d+)/.test(until) ? +until.split(':')[1] : 0;
        const host = target || page.locator('body');
        const sig = async () => (mode === 'dom' ? sha1(await host.evaluate(el => el.outerHTML)) : null);
        const settleAnims = () => host.evaluate(async (el, max) => {
          const t0 = performance.now();
          const busy = () => el.getAnimations({ subtree: true }).filter(a => a.playState === 'running' && (!a.effect || !a.effect.getTiming || a.effect.getTiming().iterations !== Infinity)).length;
          const st = (window.__capture && window.__capture.timeout) || setTimeout;
          while (busy() && performance.now() - t0 < max) await new Promise(r => st(r, 25));
        }, s.settleMax ?? 1200);
        const shoot = async () => {
          if (!target) return { buf: await page.screenshot({ caret: 'hide' }), rect: null };
          const bb = await target.boundingBox();
          if (!bb) return null;
          const c = clampClip({ x: bb.x - pad, y: bb.y - pad, width: bb.width + 2 * pad, height: bb.height + 2 * pad }, this.viewport.width, this.viewport.height);
          const rect = rnd({ x: c.x, y: c.y, w: c.width, h: c.height });
          return { buf: await page.screenshot({ clip: c, caret: 'hide' }), rect };
        };
        const t0 = Date.now(), frames = [];
        let last = null, quiet = 0, i = 0;
        while (Date.now() - t0 < limit) {
          const tt = (Date.now() - t0) / 1000;
          if (target && until === 'gone' && !(await target.isVisible().catch(() => false))) break;
          if (/^selector:/.test(until) && (await page.locator(until.slice(9)).count())) break;
          const cur = mode === 'dom' ? await sig().catch(() => null) : null;
          let shot = null, key = cur;
          if (mode === 'dom') {
            if (cur && cur !== last) { await settleAnims().catch(() => {}); shot = await shoot(); key = await sig().catch(() => cur); }
          } else {
            shot = await shoot();
            key = shot && (mode === 'pixels' ? sha1(shot.buf) : String(i));
            if (key === last) shot = null;
          }
          if (shot) {
            const file = `${s.name}_${String(i).padStart(3, '0')}.png`;
            fs.writeFileSync(this.file(file), shot.buf); this.files.push(file);
            frames.push({ file, t: round(tt, 3), rect: shot.rect, screen: shot.rect && { ...shot.rect, y: round(shot.rect.y + this.dev.statusBar) } });
            last = key; quiet = 0; i++;
          } else if (frames.length && stableN && ++quiet >= stableN) break;
          await page.waitForTimeout(Math.max(10, every - ((Date.now() - t0) / 1000 - tt) * 1000));
        }
        for (const f of frames) this.layers[f.file.replace(/\.png$/, '')] = { step: 'record', file: f.file, t: f.t, rect: f.rect, screen: f.screen, dpr: this.dev.dpr };
        this.write(`${s.name}.json`, { step: 'record', dedupe: mode, every, frames, seconds: round((Date.now() - t0) / 1000, 3), ...this.meta({ selector: s.selector || s.text || null, note: 't = seconds since the recording started when the change was seen (real app timing); frames are taken after finite animations settle' }) });
        log(`  record ${s.name}: ${frames.length} state(s) over ${((Date.now() - t0) / 1000).toFixed(1)} s (${frames.map(f => f.t.toFixed(2)).join(', ')})`);
        break;
      }
      case 'scrollShots': {
        const step = s.step || Math.round(this.viewport.height * 0.8), max = s.max || 12, out = [];
        for (let k = 0; k < max; k++) {
          const done = await page.evaluate(([y, within]) => { const e = within ? document.querySelector(within) : document.scrollingElement; e.scrollTop = y; return e.scrollTop + e.clientHeight >= e.scrollHeight - 2; }, [k * step, s.within || null]);
          await settle(page, s.settle ?? 250);
          const L = await this.capture(`${s.name}_${String(k).padStart(2, '0')}`, s, null);
          this.layers[`${s.name}_${k}`] = { step: 'scrollShots', ...L }; out.push(L);
          if (done) break;
        }
        this.write(`${s.name}.json`, { step: 'scrollShots', shots: out, ...this.meta() });
        break;
      }
      case 'text': { const t = s.selector || s.text ? await loc().innerText() : await page.evaluate(() => document.body.innerText); this.write(`${s.name}.txt`, t); break; }
      case 'dom': this.write(`${s.name}.html`, await page.content()); break;
      default: throw new Error(`unknown step "${s.do}"`);
    }
  }
  async run() {
    for (const [i, s] of (this.spec.steps || []).entries()) {
      if (this.only && s.name && !this.only.has(s.name) && ['shot', 'layer', 'states', 'record', 'scrollShots'].includes(s.do)) continue;
      const label = `${String(i + 1).padStart(2)} ${s.do}${s.name ? ' ' + s.name : ''}${s.selector ? ' ' + s.selector : s.text ? ` "${s.text}"` : ''}`;
      const t0 = Date.now();
      try { await this.step(s); log(`  ok ${label} (${Date.now() - t0} ms)`); }
      catch (e) {
        const msg = `${label}: ${(e.message || String(e)).split('\n')[0]}`;
        if (s.optional || this.keepGoing) { this.warnings.push('step failed: ' + msg); log('  !! ' + msg); }
        else { this.warnings.push('step failed: ' + msg); this.fatal = msg; break; }
      }
    }
  }
  finish(sheet) {
    const idx = {
      name: this.spec.name || null, ...this.meta(),
      device: { ...this.dev, preset: typeof this.spec.device === 'string' ? this.spec.device : undefined }, viewport: [this.viewport.width, this.viewport.height],
      statusBar: this.dev.statusBar, dpr: this.dev.dpr, locale: this.spec.locale || null, colorScheme: this.spec.colorScheme || 'light',
      placement: 'screen rect = position inside the device screen in CSS px (y includes the status bar the reel draws); draw at 1 CSS px = 1 reel px, image px = CSS px * dpr',
      layers: this.layers, warnings: this.warnings,
    };
    this.write('layers.json', idx);
    if (sheet && this.files.length) {
      try { py({ mode: 'sheet', files: this.files.map(f => this.file(f)), labels: this.files, out: this.file('sheet.png') }); } catch (e) { this.warnings.push('sheet: ' + e.message); }
    }
    if (this.spec.webp) py({ mode: 'webp', files: this.files.map(f => this.file(f)), quality: this.spec.webp === true ? 95 : this.spec.webp });
  }
}

async function main() {
  const a = parseArgs(process.argv.slice(2));
  if (a.example) { console.log(JSON.stringify(EXAMPLE, null, 2)); return; }
  if (a.textfree) {
    if (!a.out) die('--textfree needs --out');
    const rows = a.rows ? JSON.parse(fs.readFileSync(a.rows, 'utf8')) : null;
    const dpr = +a.dpr || 1;
    const rowsPx = rows ? (rows.rows || rows).map(r => (Array.isArray(r) ? r : [r.x0, r.y0, r.x1, r.y1]).map(v => v * dpr)) : null;
    const base = a.out.replace(/\.(png|webp)$/i, '');
    const res = py({ mode: 'textfree', a: path.resolve(a.textfree), out: path.resolve(a.out), mask: path.resolve(base + '.mask.png'), overlay: path.resolve(base + '.rows.png'), rows: rowsPx, roi: a.roi ? a.roi.split(',').map(Number) : null, threshold: a.threshold ? +a.threshold : undefined, kernel: a.kernel ? +a.kernel : undefined, fill: a.fill || 'median' });
    if (!a.roi && !rowsPx) log('warning: no --roi / --rows: every edge in the image counts as text; confine it to the text area');
    const rowsCss = (res.rowsPx || []).map(([x0, y0, x1, y1]) => ({ x0: round(x0 / dpr), y0: round(y0 / dpr), x1: round(x1 / dpr), y1: round(y1 / dpr) }));
    fs.writeFileSync(base + '.rows.json', JSON.stringify({ source: path.basename(a.textfree), dpr, rows: rowsCss, maskPixels: res.maskPixels, kernel: res.kernel, tool: 'capture_ui.mjs --textfree' }, null, 1) + '\n');
    log(`wrote ${a.out}, ${base}.mask.png, ${base}.rows.png, ${base}.rows.json (${rowsCss.length} rows, ${res.maskPixels} text px)`);
    return;
  }
  if (!a.spec || a.help) {
    const head = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1);
    console.log(head.slice(0, head.findIndex(l => !l.startsWith('//'))).map(l => l.replace(/^\/\/ ?/, '')).join('\n'));
    console.log(`devices: ${Object.entries(DEVICES).map(([k, v]) => `${k} ${v.screen.join('x')}${v.statusBar ? ` (status ${v.statusBar})` : ''} @${v.dpr}x`).join(', ')}`);
    if (!a.spec) process.exitCode = a.help ? 0 : 1;
    return;
  }
  const spec = JSON.parse(fs.readFileSync(a.spec, 'utf8'));
  const run = new Run(spec, a.spec, a);
  const launch = await getLauncher();
  const t0 = Date.now();
  log(`capture_ui: ${spec.name || path.basename(a.spec)} -> ${path.relative(process.cwd(), run.out) || '.'} · ${typeof spec.device === 'string' ? spec.device : 'custom'} viewport ${run.viewport.width}x${run.viewport.height} @${run.dev.dpr}x (status bar ${run.dev.statusBar})`);
  try {
    await run.start(launch, !!a.headed);
    await run.run();
  } catch (e) {
    run.fatal = (e.message || String(e)).split('\n')[0];
  } finally {
    run.finish(!a['no-sheet']);
    if (run.browser) await run.browser.close().catch(() => {});
  }
  for (const w of run.warnings) log('warning: ' + w);
  log(`${Object.keys(run.layers).length} layer(s), ${run.files.length} file(s) in ${((Date.now() - t0) / 1000).toFixed(1)} s · ${path.join(path.relative(process.cwd(), run.out) || '.', 'layers.json')}`);
  if (run.fatal) { console.error('error: ' + run.fatal); process.exitCode = 1; }
}
main().catch(e => { console.error(e.stack || e.message || e); process.exit(1); });
