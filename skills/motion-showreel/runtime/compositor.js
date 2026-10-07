'use strict';
// compositor.js: loader, scene compositor (transitions on buffers), frame FX, HUD, captions, post, player, time maps.
// Data-driven by window.MANIFEST = {config (reel.config.json), style (style.json), cuts {name: build/cut-<name>.json},
// cutOrder, defaultCut, meta, images, assets, fonts, audio {cut: url}, scale, warp, posterT, title}.
// Scenes register SCENES['<id>'] = { draw(ctx, t, env), portal?(t, env) -> {x, y, w, h, r} }.
// t is scene time in seconds (the time map is applied before); env.lt = t - scene start.

// Globals: SCENES (scene registry), REEL (state; REEL.drawing = the scene being drawn, read by gl.js) and boot().
// Everything else stays inside the closure so scene or module code cannot collide with compositor internals.
const SCENES = {};
const REEL = { plans: {}, order: [], cut: null, plan: null, scale: 1, warp: null, OUT: 0, toScene: T => T, audio: {}, drawing: null };
const boot = (() => {
let MAIN = null, FRAME = null, BUF = null, FX = null;

// Transition windows in beats around the incoming scene's first bar line: [t0 - pre, t0 + post].
// inParams may override: preBeats/postBeats (beats) or pre/post (seconds), plus per-type keys documented below.
const TRANS_DEF = {
  cut: { pre: 0, post: 0 },
  blobWipe: { pre: 1, post: 0 },      // x, y (centre px), edge (css)
  zoomInto: { pre: 1, post: 0 },      // rect {x,y,w,h,r} (or outgoing scene's portal(t, env)), zoom
  whip: { pre: 0.3, post: 0.3 },      // dir: left|right|up|down
  glitch: { pre: 0.2, post: 0.44 },   // amount
  flash: { pre: 0, post: 0 },         // color, amount, decay
  strobe: { pre: 0, post: 0 },        // color, amount
  match: { pre: 0, post: 0 },         // fade (seconds, crossfade centred on the cut)
  impact: { pre: 0, post: 0 },        // zoom, shake, flash
  portalFlash: { pre: 0.8, post: 1.2 },// x, y (burst centre; else outgoing portal(t, env) rect centre), color
  dissolve: { pre: 0.5, post: 0.5 },  // extra: soft crossfade
  push: { pre: 0.5, post: 0 },        // extra: slide without blur; dir
};

// ───────── load ─────────
async function loadAll(M) {
  META = { ...(M.meta || {}) };
  const jobs = [];
  for (const f of M.fonts || []) {
    const [family, url, weight, style] = Array.isArray(f) ? f : [f.family, f.url, f.weight, f.style];
    jobs.push((async () => {
      try {
        const ff = new FontFace(family, `url(${url})`, { weight: String(weight || '400'), style: style || 'normal' });
        await ff.load();
        document.fonts.add(ff);
      } catch (e) { console.warn(`[reel] font failed to load: ${family} ${weight || ''} (${e.message || e})`); }
    })());
  }
  const loadImg = async url => { const im = new Image(); im.src = url; await im.decode(); return im; };
  for (const [k, url] of Object.entries(M.images || {})) {
    jobs.push((async () => {
      try {
        const im = await loadImg(url);
        IMG[k] = im;
        if (!META[k]) META[k] = { w: im.naturalWidth, h: im.naturalHeight };
      } catch (e) { console.error(`[reel] image failed to load: ${k}`); }
    })());
  }
  for (const [p, a] of Object.entries(M.assets || {})) {
    jobs.push((async () => {
      try {
        if (a.type === 'image') {
          const im = await loadImg(a.url);
          ASSETS[p] = im;
          const alias = p.replace(/\.[^./]+$/, '');
          if (!IMG[alias]) { IMG[alias] = im; if (!META[alias]) META[alias] = { w: im.naturalWidth, h: im.naturalHeight }; }
        } else if (a.data !== undefined) ASSETS[p] = a.data;
        else {
          const r = await fetch(a.url);
          if (!r.ok) throw new Error('HTTP ' + r.status);
          ASSETS[p] = a.type === 'json' ? await r.json() : await r.text();
        }
      } catch (e) { console.error(`[reel] asset failed to load: ${p} (${e.message || e})`); }
    })());
  }
  await Promise.all(jobs);
  const weights = [...new Set([400, 600, 700, TYPE.displayWeight || 800, TYPE.bodyWeight || 500])];
  try { await Promise.all(['display', 'sans', 'mono', 'serif', 'cjk'].flatMap(k => weights.map(w => document.fonts.load(`${w} 40px ${FAM[k]}`, 'Aa가あ0')))); } catch (e) { /* system stacks */ }
  await document.fonts.ready;
  makeGrain();
  for (const m of window.REEL_MODULES || []) {
    if (m && typeof m.load === 'function') {
      try { await m.load(M); } catch (e) { console.error(`[reel] module ${m.name || '?'} failed to load: ${e.message || e}`); }
    }
  }
}

// ───────── plans ─────────
const _cfgScenes = () => Object.fromEntries(((CONFIG && CONFIG.scenes) || []).map(s => [s.id, s]));
let _CFG = null;
function sceneCfg(id) { if (!_CFG) _CFG = _cfgScenes(); return _CFG[id] || {}; }
function makePlan(c, name) {
  const bpm = c.bpm || CONFIG.bpm || STYLE.sound.bpm || 120, bpb = c.beatsPerBar || CONFIG.beatsPerBar || 4;
  const beatSec = c.beatSec || 60 / bpm, barSec = c.barSec || beatSec * bpb;
  const cues = c.cues || [];
  const scenes = (c.scenes || []).map((s, i) => {
    const cfg = sceneCfg(s.id);
    const t0 = s.t0 ?? s.fromBar * barSec, t1 = s.t1 ?? s.toBar * barSec, dur = t1 - t0;
    const inBeats = s.inBeats ?? cfg.inBeats ?? bpb, outBeats = s.outBeats ?? cfg.outBeats ?? 1;
    const type = i === 0 ? 'cut' : s.in || cfg.in || 'cut';
    if (!TRANS_DEF[type]) console.warn(`[reel] unknown transition '${type}' into ${s.id}; using cut`);
    const params = s.inParams || cfg.inParams || {};
    const def = TRANS_DEF[type] || TRANS_DEF.cut;
    let pre = params.pre ?? (params.preBeats ?? def.pre) * beatSec, post = params.post ?? (params.postBeats ?? def.post) * beatSec;
    if (type === 'match' && params.fade) { pre = Math.max(pre, params.fade / 2); post = Math.max(post, params.fade / 2); }
    if (inBeats * beatSec + outBeats * beatSec > dur + 1e-6) console.warn(`[reel] ${name}: scene ${s.id} is ${dur.toFixed(2)} s but in+out phases need ${((inBeats + outBeats) * beatSec).toFixed(2)} s`);
    return {
      ...s, i, t0, t1, dur, inSec: inBeats * beatSec, outSec: outBeats * beatSec, dark: !!(s.dark ?? cfg.dark),
      label: s.label || cfg.label || s.id, hud: s.hud ?? cfg.hud,
      trans: { type: TRANS_DEF[type] ? type : 'cut', params, pre, post },
      cues: cues.filter(q => q.scene === s.id).map(q => ({ ...q, lt: q.t - t0 })),
    };
  });
  if (!scenes.length) throw new Error(`cut '${name}' has no scenes`);
  const duration = c.duration ?? scenes[scenes.length - 1].t1;
  return { cut: c.cut ?? name, name, bpm, beatsPerBar: bpb, beatSec, barSec, bars: c.bars ?? duration / barSec, duration, scenes, music: c.music || [], cues, captions: c.captions || [] };
}
function setTimeMap(scale, warp) {
  const D = REEL.plan.duration;
  if (typeof warp === 'string') warp = warp.split(',').map(k => k.split(':').map(Number));
  if (warp && warp.length >= 2) {
    const knots = warp.map(k => [+k[0], +k[1]]);
    for (let i = 1; i < knots.length; i++) if (!(knots[i][0] > knots[i - 1][0])) throw new Error('warp knots must increase in output time');
    if (Math.abs(knots[knots.length - 1][1] - D) > 1e-3) console.warn(`[reel] warp ends at scene ${knots[knots.length - 1][1]} s but the cut is ${D.toFixed(3)} s`);
    REEL.warp = knots; REEL.scale = 1; REEL.OUT = knots[knots.length - 1][0];
    REEL.toScene = T => {
      for (let i = 1; i < knots.length; i++) {
        const [o0, s0] = knots[i - 1], [o1, s1] = knots[i];
        if (T <= o1 || i === knots.length - 1) return s0 + ((s1 - s0) * (T - o0)) / (o1 - o0);
      }
      return T;
    };
  } else {
    const s = +scale > 0 ? +scale : 1;
    REEL.warp = null; REEL.scale = s; REEL.OUT = D * s; REEL.toScene = T => T / s;
  }
}
function setCut(name, o = {}) {
  name = String(name);
  if (!REEL.plans[name]) throw new Error(`unknown cut '${name}' (available: ${REEL.order.join(', ')})`);
  REEL.cut = name; REEL.plan = REEL.plans[name]; DUR = REEL.plan.duration;
  const M = window.MANIFEST || {};
  const warp = o.warp ?? (M.warp && !Array.isArray(M.warp) ? M.warp[name] : M.warp);
  setTimeMap(o.scale ?? M.scale ?? 1, warp);
}

// ───────── scene drawing ─────────
function resetCtx(g) {
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = 1;
  g.globalCompositeOperation = 'source-over';
  g.filter = 'none';
  g.shadowBlur = 0; g.shadowColor = 'transparent'; g.shadowOffsetX = 0; g.shadowOffsetY = 0;
  g.setLineDash([]);
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  g.letterSpacing = '0px';
}
function fxDefaults() {
  return { zoom: 1, shake: 0, ca: 0, flash: 0, flashColor: '#FFFFFF', invert: 0, hud: 1, captions: 1, bloom: null, vignette: null, grain: null, dark: null };
}
function activeCaptions(t) {
  const L = REEL.plan ? REEL.plan.captions : [];
  return L.filter(c => t >= c.t0 && t < c.t1);
}
// Palette of a scene: a "dark": true scene on a light reel gets style.paletteAlt (built like C) when the style has one
// for the dark theme; every other scene gets C. env.paletteMain is always C, env.paletteAlt the alternate (or null).
function paletteFor(s) {
  return s && s.dark === true && THEME !== 'dark' && C2 && ALT_THEME === 'dark' ? C2 : C;
}
function envFor(s, t, extra = {}) {
  const P = REEL.plan, lt = t - s.t0;
  const env = {
    id: s.id, lt, dur: s.dur, bpm: P.bpm, beatSec: P.beatSec, barSec: P.barSec, beat: lt / P.beatSec, bar: lt / P.barSec,
    inSec: s.inSec, outSec: s.outSec, cut: P.cut, dark: s.dark, style: STYLE, palette: paletteFor(s), paletteMain: C,
    paletteAlt: C2, captions: activeCaptions(t),
    fx: FX, t, t0: s.t0, t1: s.t1, index: s.i, label: s.label, cues: s.cues || [], music: s.music, ...extra,
  };
  env.phase = phaseOf(env);
  return env;
}
const _warned = new Set();
function warnOnce(key, msg, err = false) { if (_warned.has(key)) return; _warned.add(key); (err ? console.error : console.warn)(msg); }
// Opt-in shutter motion blur per scene: reel.config scene (or cut plan) "motionBlur": true | {samples, shutter}
// (shutter = fraction of a frame, 0.5 = 180 degrees), or a reel-wide CONFIG.motionBlur. Scenes are pure in t, so
// subframes are exact; they are averaged with incremental alpha (one rounding per sample). Costs samples x draw time.
function motionBlurOf(s) {
  const v = s.motionBlur ?? sceneCfg(s.id).motionBlur ?? CONFIG.motionBlur;
  if (!v) return null;
  const o = v === true ? {} : v;
  const n = Math.max(2, Math.min(16, Math.round(o.samples ?? 5)));
  return { samples: n, shutter: clamp(o.shutter ?? 0.5, 0.05, 1) };
}
function drawScene(s, g, t, extra) {
  const mb = motionBlurOf(s);
  const env = drawScene1(s, g, t, extra);          // centre sample: the only one whose env.fx counts
  if (!mb) return env;
  const realFX = FX;
  FX = fxDefaults();
  let k = 1;
  for (let i = 0; i < mb.samples; i++) {
    const ti = t + (mb.shutter / FPS) * (i / (mb.samples - 1) - 0.5);
    if (Math.abs(ti - t) < 1e-9) continue;
    const b = BUF.mb;
    freshCtx(b.g); b.g.fillStyle = C.bg; b.g.fillRect(0, 0, W, H);
    drawScene1(s, b.g, ti, extra);
    k++;
    g.save(); resetCtx(g); g.globalAlpha = 1 / k; g.drawImage(b.c, 0, 0); g.restore();
  }
  FX = realFX;
  return env;
}
function drawScene1(s, g, t, extra) {
  g.save();
  resetCtx(g);
  const sc = SCENES[s.id];
  const env = envFor(s, t, extra);
  const prev = REEL.drawing;
  REEL.drawing = s;
  if (sc && typeof sc.draw === 'function') {
    try { sc.draw(g, t, env); }
    catch (e) {
      // the scene may have left saves/clips on the stack: wipe the whole context state, then draw the error card
      if (g.reset) g.reset(); else { g.restore(); g.save(); }
      g.save(); resetCtx(g);
      placeholder(g, s, env, e);
      warnOnce('err:' + s.id, `[reel] scene ${s.id} threw at t=${t.toFixed(3)}: ${(e && e.stack) || e}`, true);
    }
  } else {
    placeholder(g, s, env);
    warnOnce('missing:' + s.id, `[reel] scene '${s.id}' is not registered (scenes/${s.id}.js); drawing a placeholder`);
  }
  REEL.drawing = prev;
  g.restore();
  return env;
}
// Labeled placeholder: scene id, label, bars, an in/hold/out timeline with the playhead, beat dots.
function placeholder(g, s, env, err) {
  const dark = THEME === 'dark' || s.dark;
  const bg = err ? mix(C.deny, '#000000', 0.55) : dark ? C.night : C.bg2;
  const ink = err ? '#FFFFFF' : onColor(bg, '#FFFFFF', C.ink);
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  g.strokeStyle = rgba(ink, 0.08); g.lineWidth = 1;
  for (let x = 0; x <= W; x += 120) { g.beginPath(); g.moveTo(x + 0.5, 0); g.lineTo(x + 0.5, H); g.stroke(); }
  for (let y = 0; y <= H; y += 120) { g.beginPath(); g.moveTo(0, y + 0.5); g.lineTo(W, y + 0.5); g.stroke(); }
  const m = 120;
  text(g, (err ? 'ERROR · ' : 'PLACEHOLDER · ') + s.id, m, m + 30, { size: 22, weight: 700, fam: 'M', color: rgba(ink, 0.6), ls: 2 });
  text(g, s.label || s.id, m, H / 2 - 40, { size: Math.min(110, fitSize(g, s.label || s.id, W - 2 * m, { size: 110, weight: 800, fam: 'D' })), weight: 800, fam: 'D', color: ink });
  const bars = env.dur / env.barSec;
  text(g, `${bars.toFixed(bars % 1 ? 2 : 0)} bars · ${env.dur.toFixed(2)} s · in ${env.inSec.toFixed(2)} s · out ${env.outSec.toFixed(2)} s · ${s.trans ? s.trans.type : 'cut'} in`, m, H / 2 + 30, { size: 26, fam: 'M', color: rgba(ink, 0.75) });
  if (err) text(g, String(err.message || err).slice(0, 140), m, H / 2 + 90, { size: 24, fam: 'M', color: '#FFFFFF' });
  // timeline
  const x0 = m, x1 = W - m, y = H - 220, w = x1 - x0, k = v => x0 + (w * v) / env.dur;
  g.fillStyle = rgba(ink, 0.12); g.fillRect(x0, y, w, 14);
  g.fillStyle = rgba(C.accent, 0.85); g.fillRect(x0, y, k(env.inSec) - x0, 14);
  g.fillStyle = rgba(C.accent3, 0.85); g.fillRect(k(env.dur - env.outSec), y, x1 - k(env.dur - env.outSec), 14);
  for (let b = 0; b <= bars + 1e-6; b += 1 / (env.barSec / env.beatSec)) {
    const bx = k(b * env.barSec), bar = Math.abs(b - Math.round(b)) < 1e-6;
    g.fillStyle = rgba(ink, bar ? 0.7 : 0.3); g.fillRect(bx - 1, y - (bar ? 18 : 8), 2, bar ? 50 : 30);
  }
  const ph = clamp(env.lt / env.dur);
  g.fillStyle = ink; g.fillRect(k(ph * env.dur) - 2, y - 30, 4, 74);
  text(g, `lt ${env.lt.toFixed(2)} s · beat ${Math.floor(env.beat) + 1}`, k(ph * env.dur) + 10, y - 36, { size: 20, fam: 'M', color: ink });
  const pulse = beatPulse(env, 6);
  circle(g, W - m - 40, m + 22, 16 + pulse * 10); g.fillStyle = rgba(C.accent, 0.4 + 0.6 * pulse); g.fill();
}
// Fresh context state for a buffer (clears leaked clips/saves from a previous use), then the stage colour.
function freshCtx(g) { if (g.reset) g.reset(); resetCtx(g); }
function sceneBuf(s, buf, t, extra) {
  freshCtx(buf.g);
  buf.g.fillStyle = C.bg; buf.g.fillRect(0, 0, W, H);
  drawScene(s, buf.g, t, extra);
  return buf.c;
}
// zoomInto geometry at progress k: the outgoing frame is scaled by z about (cx, cy); the portal lands at (X, Y) with
// size rect x z; the incoming frame is drawn scaled by s about the centre, clipped to that rect.
const zoomDefaultRect = () => ({ x: W * 0.35, y: H * 0.3, w: W * 0.3, h: H * 0.4, r: 24 });
function zoomGeom(rect, params, k) {
  const zEnd = (params && params.zoom) ?? Math.max(W / rect.w, H / rect.h) * 1.02;
  const ke = Ease.ioC(k), z = Math.pow(zEnd, Ease.inC(k));
  const cx = lerp(W / 2, rect.x + rect.w / 2, ke), cy = lerp(H / 2, rect.y + rect.h / 2, ke);
  return { z, zEnd, cx, cy, X: W / 2 + z * (rect.x - cx), Y: H / 2 + z * (rect.y - cy), s: lerp(1.25, 1, Ease.outC(k)) };
}
// For a scene entered by zoomInto: where the outgoing scene's portal sits in THIS scene's frame at env.t, as
// {x, y, w, h, r, k} (k = zoom progress, clamped to 1 after the cut, when the window fills the frame); null for any
// other entry. Draw the window's content there (the same capture at the same place) and the zoom lands on the same
// pixels instead of an empty stage; then animate from that rect into the scene's own layout.
function entryPortal(env) {
  const S = REEL.plan ? REEL.plan.scenes : [], j = S.findIndex(x => x.id === env.id), B = S[j];
  if (!B || j < 1 || !B.trans || B.trans.type !== 'zoomInto') return null;
  const tr = { A: S[j - 1], B, params: B.trans.params || {}, t0: B.t0, pre: B.trans.pre, post: B.trans.post };
  const span = tr.pre + tr.post || 1e-6, tt = Math.min(env.t, B.t0 + tr.post);
  const k = clamp((tt - (B.t0 - tr.pre)) / span);
  const rect = portalRect(tr, tt) || zoomDefaultRect(), gm = zoomGeom(rect, tr.params, k);
  return { x: W / 2 + (gm.X - W / 2) / gm.s, y: H / 2 + (gm.Y - H / 2) / gm.s, w: (rect.w * gm.z) / gm.s, h: (rect.h * gm.z) / gm.s,
    r: ((rect.r || 0) * gm.z) / gm.s, k, from: tr.A.id };
}
function portalRect(tr, t) {
  if (tr.params.rect) return tr.params.rect;
  const sc = SCENES[tr.A.id];
  if (sc && typeof sc.portal === 'function') {
    try { const r = sc.portal(t, envFor(tr.A, t)); if (r) return r; } catch (e) { warnOnce('portal:' + tr.A.id, `[reel] ${tr.A.id}.portal threw: ${e.message}`, true); }
  }
  return null;
}
// env.portal(ctx, x, y, w, h, r?) for the outgoing scene: draws the incoming scene through that window.
function portalFn(B, t) {
  let img = null;
  return (gg, x, y, w, h, r = 0) => {
    // single sample (no motion blur): BUF.mb may be busy with the outgoing scene's subframes
    if (!img) { freshCtx(BUF.b.g); BUF.b.g.fillStyle = C.bg; BUF.b.g.fillRect(0, 0, W, H); drawScene1(B, BUF.b.g, t); img = BUF.b.c; }
    gg.save();
    if (r) rr(gg, x, y, w, h, r); else { gg.beginPath(); gg.rect(x, y, w, h); }
    gg.clip();
    const sc = Math.max(w / W, h / H) * 1.15;
    gg.drawImage(img, x + w / 2 - (W * sc) / 2, y + h / 2 - (H * sc) / 2, W * sc, H * sc);
    gg.restore();
  };
}

// ───────── transitions (on buffers) ─────────
// RGB split + horizontal slice displacement.
function glitchBlit(ctx, src, amt, t) {
  const f = Math.floor(t * FPS);
  const off = 4 + amt * 26;
  for (const [b, col] of [[BUF.g1, '#FF0000'], [BUF.g2, '#00FFFF']]) {
    resetCtx(b.g); b.g.clearRect(0, 0, W, H);
    b.g.drawImage(src, 0, 0);
    b.g.globalCompositeOperation = 'multiply';
    b.g.fillStyle = col; b.g.fillRect(0, 0, W, H);
    b.g.globalCompositeOperation = 'destination-in';
    b.g.drawImage(src, 0, 0);
  }
  ctx.save();
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  ctx.drawImage(BUF.g2.c, -off * 0.5, 0);
  ctx.globalCompositeOperation = 'lighter';
  ctx.drawImage(BUF.g1.c, off, 0);
  ctx.restore();
  const n = Math.floor(3 + amt * 9);
  for (let i = 0; i < n; i++) {
    const y = Math.floor(hsh2(i, f) * H), h = 6 + hsh2(i + 9, f) * 70 * amt;
    const dx = (hsh2(i + 3, f) - 0.5) * 160 * amt;
    ctx.drawImage(src, 0, y, W, h, dx, y, W, h);
  }
}
// Chromatic split of a whole frame (px offset), used for FX.ca.
function rgbSplit(ctx, src, off) {
  for (const [b, col] of [[BUF.g1, '#FF0000'], [BUF.g2, '#00FFFF']]) {
    resetCtx(b.g); b.g.clearRect(0, 0, W, H);
    b.g.drawImage(src, 0, 0);
    b.g.globalCompositeOperation = 'multiply';
    b.g.fillStyle = col; b.g.fillRect(0, 0, W, H);
    b.g.globalCompositeOperation = 'destination-in';
    b.g.drawImage(src, 0, 0);
  }
  resetCtx(ctx);
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  ctx.drawImage(BUF.g2.c, -off / 2, 0);
  ctx.globalCompositeOperation = 'lighter';
  ctx.drawImage(BUF.g1.c, off / 2, 0);
  ctx.globalCompositeOperation = 'source-over';
}
const TRANS = {
  cut(g, tr, t) { drawScene(t < tr.t0 ? tr.A : tr.B, g, t); },
  flash(g, tr, t) { TRANS.cut(g, tr, t); },
  strobe(g, tr, t) { TRANS.cut(g, tr, t); },
  impact(g, tr, t) { TRANS.cut(g, tr, t); },
  match(g, tr, t) {
    const fade = tr.params.fade || 0;
    if (fade <= 0) return TRANS.cut(g, tr, t);
    const a = sceneBuf(tr.A, BUF.a, t), b = sceneBuf(tr.B, BUF.b, t);
    g.drawImage(a, 0, 0);
    g.globalAlpha = Ease.ioQ(rm(t, tr.t0 - fade / 2, tr.t0 + fade / 2));
    g.drawImage(b, 0, 0);
    g.globalAlpha = 1;
  },
  dissolve(g, tr, t) {
    const a = sceneBuf(tr.A, BUF.a, t), b = sceneBuf(tr.B, BUF.b, t);
    g.drawImage(a, 0, 0);
    g.globalAlpha = Ease.ioQ(tr.k);
    g.drawImage(b, 0, 0);
    g.globalAlpha = 1;
  },
  blobWipe(g, tr, t) {
    const k = Ease.ioC(tr.k), p = tr.params;
    g.drawImage(sceneBuf(tr.A, BUF.a, t), 0, 0);
    if (k <= 0) return;
    const x = p.x ?? W / 2, y = p.y ?? H * 0.55;
    const r = lerp(0, Math.hypot(Math.max(x, W - x), Math.max(y, H - y)) * 1.14, k);
    const b = sceneBuf(tr.B, BUF.b, t);
    g.save();
    blobPath(g, x, y, r, k * 6, 0.09);
    g.save(); g.clip(); g.drawImage(b, 0, 0); g.restore();
    blobPath(g, x, y, r, k * 6, 0.09);
    g.strokeStyle = rgba(p.edge || (tr.B.dark || THEME === 'dark' ? C.accent : '#FFFFFF'), 0.75 * (1 - k));
    g.lineWidth = 10 * (1 - k) + 2;
    g.stroke();
    g.restore();
  },
  zoomInto(g, tr, t) {
    const k = tr.k, rect = portalRect(tr, t) || zoomDefaultRect();
    const { z, cx, cy, X, Y, s } = zoomGeom(rect, tr.params, k);
    const a = sceneBuf(tr.A, BUF.a, t, { portal: portalFn(tr.B, t) });
    g.save();
    g.translate(W / 2, H / 2); g.scale(z, z); g.translate(-cx, -cy);
    g.drawImage(a, 0, 0);
    g.restore();
    const b = sceneBuf(tr.B, BUF.b, t);
    g.save();
    rr(g, X, Y, rect.w * z, rect.h * z, (rect.r || 0) * z);
    g.clip();
    g.globalAlpha = Ease.outC(rm(k, 0, 0.45));
    g.translate(W / 2, H / 2); g.scale(s, s); g.translate(-W / 2, -H / 2);
    g.drawImage(b, 0, 0);
    g.restore();
  },
  whip(g, tr, t) {
    const d = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[tr.params.dir || 'left'] || [-1, 0];
    const a = sceneBuf(tr.A, BUF.a, t), b = sceneBuf(tr.B, BUF.b, t);
    const pos = tt => Ease.ioQuint(rm(tt, tr.t0 - tr.pre, tr.t0 + tr.post));
    const N = 12;
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    g.save();
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < N; i++) {
      const k = pos(t - (i / N) * (1 / FPS));
      g.globalAlpha = 1 / N;
      g.drawImage(a, d[0] * W * k, d[1] * H * k);
      g.drawImage(b, d[0] * W * (k - 1), d[1] * H * (k - 1));
    }
    g.restore();
    FX.ca = Math.max(FX.ca, 0.5 * Math.sin(Math.PI * tr.k));
  },
  push(g, tr, t) {
    const d = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[tr.params.dir || 'left'] || [-1, 0];
    const k = Ease.ioQuint(tr.k);
    g.drawImage(sceneBuf(tr.A, BUF.a, t), d[0] * W * k, d[1] * H * k);
    g.drawImage(sceneBuf(tr.B, BUF.b, t), d[0] * W * (k - 1), d[1] * H * (k - 1));
  },
  glitch(g, tr, t) {
    const amt = tr.params.amount ?? 1;
    if (t < tr.t0) glitchBlit(g, sceneBuf(tr.A, BUF.a, t), rm(t, tr.t0 - tr.pre, tr.t0) * amt, t);
    else glitchBlit(g, sceneBuf(tr.B, BUF.a, t), (1 - rm(t, tr.t0, tr.t0 + tr.post)) * amt, t);
  },
  portalFlash(g, tr, t) {
    if (t < tr.t0) drawScene(tr.A, g, t, { portal: portalFn(tr.B, t) });
    else drawScene(tr.B, g, t);
    const p = tr.params, rect = portalRect(tr, t);
    const x = p.x ?? (rect ? rect.x + rect.w / 2 : W / 2), y = p.y ?? (rect ? rect.y + rect.h / 2 : H / 2);
    const k = rm(t, tr.t0 - 0.1, tr.t0 + 0.12), out = rm(t, tr.t0 + 0.12, tr.t0 + tr.post);
    if (k <= 0) return;
    const r = lerp(60, Math.hypot(W, H) * 1.05, Ease.inQ(k)), col = p.color || mix('#FFFFFF', C.accent, 0.12);
    g.save();
    g.globalAlpha = 0.95 * (1 - Ease.outC(out));
    g.fillStyle = radial(g, x, y, 0, r, [[0, '#FFFFFF'], [0.5, rgba(col, 0.98)], [1, rgba(col, 0)]]);
    g.fillRect(0, 0, W, H);
    g.restore();
  },
};
// Effects of hard-cut transitions, keyed off the time since each boundary.
function boundaryFX(t) {
  const S = REEL.plan.scenes;
  for (let i = 1; i < S.length; i++) {
    const s = S[i], dt = t - s.t0, p = s.trans.params, type = s.trans.type;
    if (dt < -0.25 || dt > 1) continue;
    if (type === 'flash' && dt >= 0) {
      FX.flash = Math.max(FX.flash, (p.amount ?? 0.85) * Math.exp(-dt * (p.decay ?? 9)));
      FX.flashColor = p.color || (s.dark || THEME === 'dark' ? mix('#FFFFFF', C.accent, 0.15) : '#FFFFFF');
    } else if (type === 'strobe') {
      // two-frame pulses around the cut: inverted frames by default (reads on light and dark), or flashes of p.color
      const on = (dt >= -0.067 && dt < -0.034) || (dt >= 0 && dt < 0.034) || (dt >= 0.1 && dt < 0.134);
      if (on && p.color) { FX.flash = Math.max(FX.flash, p.amount ?? 0.7); FX.flashColor = p.color; }
      else if (on) FX.invert = Math.max(FX.invert, p.amount ?? 1);
    } else if (type === 'impact' && dt >= 0) {
      FX.zoom *= 1 + (p.zoom ?? 0.07) * Math.exp(-dt * 9);
      FX.shake = Math.max(FX.shake, (p.shake ?? 16) * Math.exp(-dt * 8));
      FX.flash = Math.max(FX.flash, (p.flash ?? 0.35) * Math.exp(-dt * 16));
      FX.flashColor = p.color || '#FFFFFF';
      FX.ca = Math.max(FX.ca, 0.8 * Math.exp(-dt * 10));
    } else if (type === 'glitch') {
      const w = Math.max(s.trans.pre, s.trans.post, 1e-3);
      if (Math.abs(dt) < w) FX.ca = Math.max(FX.ca, 0.35 * (1 - Math.abs(dt) / w));
    }
  }
}
// Which scene(s) to draw at t: {cur, tr} with tr = {type, A, B, t0, pre, post, k, params} inside a window.
function locate(t) {
  const S = REEL.plan.scenes;
  let j = S.length - 1;
  for (let i = 0; i < S.length; i++) if (t < S[i].t1) { j = i; break; }
  if (t < S[0].t0) j = 0;
  const win = i => {
    if (i < 1 || i >= S.length) return null;
    const B = S[i], tr = B.trans;
    if (tr.pre + tr.post <= 0) return null;
    if (t >= B.t0 - tr.pre && t < B.t0 + tr.post) return { type: tr.type, A: S[i - 1], B, t0: B.t0, pre: tr.pre, post: tr.post, params: tr.params, k: (t - (B.t0 - tr.pre)) / (tr.pre + tr.post) };
    return null;
  };
  const tr = win(j) || win(j + 1);
  const cur = tr ? (t < tr.t0 ? tr.A : tr.B) : S[j];
  return { cur, tr, j };
}
// 0..1 darkness of the frame (eases across boundaries between dark and light scenes).
function darkAt(t, loc) {
  const S = REEL.plan.scenes, j = loc.j, s = S[j];
  const d = x => (x && (x.dark || THEME === 'dark') ? 1 : 0);
  if (loc.tr) return lerp(d(loc.tr.A), d(loc.tr.B), Ease.ioQ(clamp(loc.tr.k)));
  if (j > 0 && t - s.t0 < 0.12) return lerp(d(S[j - 1]), d(s), rm(t, s.t0, s.t0 + 0.12));
  return d(s);
}

// ───────── frame ─────────
function renderFrame(t) {
  const P = REEL.plan;
  if (!P) return;
  FX = fxDefaults();
  const g = FRAME.g;
  freshCtx(g);
  g.fillStyle = C.bg; g.fillRect(0, 0, W, H);
  const loc = locate(t);
  if (loc.tr) (TRANS[loc.tr.type] || TRANS.cut)(g, loc.tr, t);
  else drawScene(loc.cur, g, t);
  boundaryFX(t);
  const dk = FX.dark ?? darkAt(t, loc);
  composeFX(t);
  post(MAIN.g, t, loc, dk);
}
function composeFX(t) {
  const m = MAIN.g;
  resetCtx(m);
  let src = FRAME.c;
  if (FX.ca > 0.01) { rgbSplit(BUF.c.g, FRAME.c, FX.ca * 12); src = BUF.c.c; }
  const [sx, sy] = FX.shake > 0.05 ? shake(t, FX.shake, 7.3, 30) : [0, 0];
  if (FX.zoom !== 1 || sx || sy) {
    m.fillStyle = C.bg; m.fillRect(0, 0, W, H);
    m.save();
    m.translate(W / 2 + sx, H / 2 + sy); m.scale(FX.zoom, FX.zoom); m.translate(-W / 2, -H / 2);
    m.drawImage(src, 0, 0);
    m.restore();
  } else m.drawImage(src, 0, 0);
  if (FX.invert > 0.002) {
    m.save(); m.globalCompositeOperation = 'difference'; m.globalAlpha = clamp(FX.invert); m.fillStyle = '#FFFFFF'; m.fillRect(0, 0, W, H); m.restore();
  }
  if (FX.flash > 0.002) {
    const f = clamp(FX.flash);
    m.save();
    m.fillStyle = FX.flashColor;
    if (luma(FX.flashColor) > 0.3) {
      // light flash: additive exposure lift, then a wash toward the colour for strong flashes
      m.globalCompositeOperation = 'lighter'; m.globalAlpha = f * 0.6; m.fillRect(0, 0, W, H);
      m.globalCompositeOperation = 'source-over'; m.globalAlpha = Ease.inQ(rm(f, 0.45, 1)); m.fillRect(0, 0, W, H);
    } else { m.globalAlpha = f * 0.9; m.fillRect(0, 0, W, H); }   // dark flash: a dip to the colour
    m.restore();
  }
}
function bloom(m, amt) {
  if (amt <= 0.003) return;
  const s = BUF.s1, s2 = BUF.s2, sw = s.c.width, sh = s.c.height;
  resetCtx(s.g); resetCtx(s2.g);
  s.g.clearRect(0, 0, sw, sh);
  s.g.drawImage(MAIN.c, 0, 0, sw, sh);
  s2.g.clearRect(0, 0, sw, sh); s2.g.drawImage(s.c, 0, 0);
  s.g.globalCompositeOperation = 'multiply';
  s.g.drawImage(s2.c, 0, 0); s.g.drawImage(s2.c, 0, 0);   // ~x^3: keeps highlights, drops mid-tones
  s2.g.clearRect(0, 0, sw, sh);
  s2.g.filter = 'blur(3px)'; s2.g.drawImage(s.c, 0, 0);
  s2.g.filter = 'blur(12px)'; s2.g.globalCompositeOperation = 'lighter'; s2.g.drawImage(s.c, 0, 0);
  s2.g.filter = 'none';
  m.save();
  m.globalCompositeOperation = 'screen'; m.globalAlpha = clamp(amt);
  m.drawImage(s2.c, 0, 0, W, H);
  m.restore();
}
function post(m, t, loc, dk) {
  const pst = STYLE.post || {}, vg = pst.vignette || {};
  const light = THEME !== 'dark';
  const bl = FX.bloom ?? (light ? lerp(pst.bloom || 0, Math.max(pst.bloom || 0, 0.25), dk) : pst.bloom || 0);
  bloom(m, bl);
  const va = FX.vignette ?? (light ? lerp(vg.a ?? 0.16, Math.max(vg.a ?? 0.16, 0.5), dk) : vg.a ?? 0.4);
  vignette(m, va, light && dk > 0.5 ? C.night : null);
  if (FX.hud > 0) drawHUD(m, t, loc, dk);
  const cc = CONFIG.captions && CONFIG.captions.enabled !== undefined ? CONFIG.captions.enabled : STYLE.layout.captions && STYLE.layout.captions.enabled;
  if (cc && FX.captions > 0) withAlpha(m, FX.captions, () => drawCaptions(m, t, REEL.plan.captions));
  const ga = FX.grain ?? lerp(pst.grain ?? 0.04, (pst.grain ?? 0.04) * 1.5, dk);
  grain(m, t, ga);
}

// ───────── HUD ─────────
// config.hud = {steps: [labels], map: {sceneId: stepIndex}, look: 'steps'|'frame', label, subtitle, showCut, url, darkAccent}
// 'frame' shows the title (label, else config.title) and an optional subtitle; showCut: true adds "30s cut" (a review
// slate, off by default so deliverables carry no production labels).
// 'steps' (default when steps exist): pill step bar top-right (keep x > W - 740, y < 112 free in scenes).
// 'frame': corner brackets, title, timecode, beat dots, scene index/label, progress (keep a 90 px border free).
// Without config.hud, style.layout.hud = true draws the 'frame' look. Per scene `hud: false` in reel.config hides it.
function hudSpec() {
  const h = CONFIG.hud;
  if (h && h.enabled === false) return null;
  if (h) return { ...h, look: h.look || (h.steps && h.steps.length ? 'steps' : 'frame') };
  return STYLE.layout.hud ? { look: 'frame' } : null;
}
function drawHUD(m, t, loc, dk) {
  const spec = hudSpec();
  if (!spec) return;
  const S = REEL.plan.scenes, j = loc.j, s = S[j];
  const shown = x => (x && x.hud !== false && (spec.look !== 'steps' || (spec.map && spec.map[x.id] !== undefined)) ? 1 : 0);
  let a = shown(s);
  if (j > 0 && t - s.t0 < 0.4) a = lerp(shown(S[j - 1]), a, Ease.ioC(rm(t, s.t0, s.t0 + 0.4)));
  a *= clamp(FX.hud);
  if (a <= 0.002) return;
  // drawn in a virtual frame of (W, H) / UNIT so the chrome keeps its 1080p proportions at any output size
  m.save();
  m.scale(UNIT, UNIT);
  if (spec.look === 'steps') hudSteps(m, t, spec, j, a, dk, W / UNIT, H / UNIT);
  else hudFrame(m, t, spec, j, a, dk, W / UNIT, H / UNIT);
  m.restore();
}
function hudSteps(m, t, spec, j, a, dk, W, H) {
  const S = REEL.plan.scenes, steps = spec.steps || [], map = spec.map || {};
  const idx = i => { for (let q = i; q >= 0; q--) if (map[S[q].id] !== undefined) return map[S[q].id]; return 0; };
  const s0 = S[j];
  let si = idx(j);
  if (j > 0 && t - s0.t0 < 0.35) si = lerp(idx(j - 1), si, Ease.ioC(rm(t, s0.t0 - 0.05, s0.t0 + 0.3)));
  const darkUI = dk > 0.5;
  const size = 17, gap = 8, pad = 16, hh = 40, y = 64;
  const ws = steps.map(l => measure(m, l, { size, weight: 600 }) + pad * 2);
  const total = ws.reduce((p, c) => p + c, 0) + gap * (steps.length - 1) + 12 + 44;
  const x1 = W - 80, x0 = x1 - total;
  m.save();
  m.globalAlpha *= a;
  m.shadowColor = rgba(C.shadow, darkUI ? 0.5 : 0.18); m.shadowBlur = 30; m.shadowOffsetY = 10;
  rr(m, x0, y - hh / 2 - 6, total, hh + 12, (hh + 12) / 2);
  m.fillStyle = darkUI ? rgba(mix(C.night, '#000000', 0.2), 0.78) : rgba(C.surface, 0.84);
  m.fill();
  m.shadowBlur = 0; m.shadowOffsetY = 0; m.shadowColor = 'transparent';
  if (darkUI) { m.strokeStyle = 'rgba(255,255,255,0.10)'; m.lineWidth = 1.5; m.stroke(); }
  orb(m, x0 + 30, y, 11, t * 1.5, 1);
  let x = x0 + 52;
  const xs = [];
  for (let i = 0; i < steps.length; i++) { xs.push(x); x += ws[i] + gap; }
  const i0 = clamp(Math.floor(si), 0, steps.length - 1), i1 = Math.min(i0 + 1, steps.length - 1), f = si - i0;
  const hx = lerp(xs[i0], xs[i1], f), hw = lerp(ws[i0], ws[i1], f);
  const acc = darkUI ? spec.darkAccent || C.accent : C.accent;
  rr(m, hx, y - hh / 2, hw, hh, hh / 2); m.fillStyle = acc; m.fill();
  const on = onColor(acc, '#FFFFFF', C.ink);
  for (let i = 0; i < steps.length; i++) {
    const act = 1 - clamp(Math.abs(si - i));
    text(m, steps[i], xs[i] + ws[i] / 2, y + 6, { size, weight: 600, align: 'center', color: act > 0.5 ? on : darkUI ? 'rgba(255,255,255,0.55)' : rgba(C.ink, 0.55) });
  }
  m.restore();
}
function hudFrame(m, t, spec, j, a, dk, W, H) {
  const S = REEL.plan.scenes, s = S[j], P = REEL.plan;
  const darkUI = dk > 0.5 || THEME === 'dark';
  const ink = darkUI ? 'rgba(235,242,250,0.92)' : rgba(C.ink, 0.85), dim = darkUI ? 'rgba(200,214,230,0.55)' : rgba(C.ink, 0.5);
  const acc = darkUI ? spec.darkAccent || C.accent : C.accent, mg = 44;
  const pad2 = n => String(n).padStart(2, '0');
  m.save();
  m.globalAlpha *= a;
  brackets(m, mg, mg, W - mg * 2, H - mg * 2, 22, darkUI ? 'rgba(160,200,220,0.5)' : rgba(C.ink, 0.35), 1.5, 0.8);
  const title = spec.label || CONFIG.title || '';
  if (title) text(m, title, mg + 34, mg + 40, { size: 20, weight: 800, color: ink, ls: 3 });
  const tw = title ? measure(m, title, { size: 20, weight: 800, ls: 3 }) : 0;
  const sub = spec.subtitle || (spec.showCut ? (/^\d+$/.test(P.name) ? `${P.name}s cut` : `${P.name} cut`) : '');
  if (sub) text(m, sub, mg + 34 + tw + (title ? 18 : 0), mg + 39, { size: 15, weight: 500, color: dim });
  const fr = Math.floor(t * FPS + 1e-6);
  text(m, `TC ${pad2(Math.floor(fr / FPS / 60))}:${pad2(Math.floor(fr / FPS) % 60)}:${pad2(fr % FPS)}`, W - mg - 34, mg + 39, { size: 15, fam: 'M', color: dim, align: 'right', ls: 1 });
  const bpb = P.beatsPerBar, beat = ((Math.floor(t / P.beatSec) % bpb) + bpb) % bpb;
  for (let k = 0; k < bpb; k++) { m.globalAlpha = a * (k === beat ? 0.95 : 0.25); m.fillStyle = k === beat ? acc : dim; m.fillRect(W - mg - 34 - 190 + k * 14, mg + 29, 8, 8); }
  m.globalAlpha = a;
  const label = `${pad2(j + 1)} / ${pad2(S.length)}   ${s.label || s.id}`;
  text(m, scramble(label, rm(t - s.t0, 0, 0.45), j * 7.7, t), mg + 34, H - mg - 30, { size: 16, weight: 600, color: ink, ls: 1 });
  if (spec.url) text(m, spec.url, W - mg - 34, H - mg - 30, { size: 16, fam: 'M', color: acc, align: 'right', ls: 1 });
  m.globalAlpha = a * 0.5; m.fillStyle = dim; m.fillRect(mg + 34, H - mg - 14, 240, 2);
  m.globalAlpha = a * 0.9; m.fillStyle = acc; m.fillRect(mg + 34, H - mg - 14, 240 * clamp(t / P.duration), 2);
  m.restore();
}

// ───────── QA + covers ─────────
// Render one scene alone at local time lt for a given duration (no transitions, HUD, captions or post unless o.post).
function renderScene(id, lt, dur, o = {}) {
  const P = REEL.plan, cfg = sceneCfg(id);
  let s = P.scenes.find(x => x.id === id);
  if (!s) s = { id, i: 0, label: cfg.label || id, dark: !!cfg.dark, inSec: (cfg.inBeats ?? P.beatsPerBar) * P.beatSec, outSec: (cfg.outBeats ?? 1) * P.beatSec, dur: (cfg.minBars || 2) * P.barSec, cues: [], trans: { type: 'cut' } };
  const d = dur ?? s.dur;
  const ss = { ...s, t0: 0, t1: d, dur: d, cues: (s.cues || []).map(q => ({ ...q, t: q.lt })) };
  FX = fxDefaults();
  freshCtx(FRAME.g); FRAME.g.fillStyle = C.bg; FRAME.g.fillRect(0, 0, W, H);
  drawScene(ss, FRAME.g, lt);
  if (o.post) { FX.hud = 0; composeFX(lt); post(MAIN.g, lt, { cur: ss, tr: null, j: 0 }, ss.dark ? 1 : 0); }
  else { resetCtx(MAIN.g); MAIN.g.drawImage(FRAME.c, 0, 0); }
}
// Cover image: the frame at output time T, cover-cropped to o.w x o.h (default W x H), with an optional play icon
// (o.play) and duration badge (o.badge: true or a label). Returns a data URL (o.type 'image/png' | 'image/jpeg').
function renderPoster(T, o = {}) {
  renderFrame(REEL.toScene(T));
  const w = Math.round(o.w || W), h = Math.round(o.h || H);
  const b = w === W && h === H ? null : makeBuf(w, h);
  const g = b ? b.g : MAIN.g;
  resetCtx(g);
  if (b) {
    const s = Math.max(w / W, h / H), dw = W * s, dh = H * s;
    g.drawImage(MAIN.c, (w - dw) * (o.ax ?? 0.5), (h - dh) * (o.ay ?? 0.5), dw, dh);
  }
  if (o.play) {
    g.fillStyle = radial(g, w / 2, h / 2, 0, w * 0.6, [[0, 'rgba(0,0,0,0.16)'], [1, 'rgba(0,0,0,0.36)']]);
    g.fillRect(0, 0, w, h);
    const r = h * 0.075, x = o.x ?? w / 2, y = o.y ?? h / 2;
    g.save(); g.shadowColor = 'rgba(0,0,0,0.35)'; g.shadowBlur = r * 0.5;
    circle(g, x, y, r); g.fillStyle = 'rgba(10,12,16,0.55)'; g.fill(); g.restore();
    circle(g, x, y, r); g.lineWidth = Math.max(2, r * 0.05); g.strokeStyle = 'rgba(255,255,255,0.92)'; g.stroke();
    g.beginPath(); g.moveTo(x - r * 0.28, y - r * 0.42); g.lineTo(x + r * 0.46, y); g.lineTo(x - r * 0.28, y + r * 0.42); g.closePath();
    g.fillStyle = '#FFFFFF'; g.fill();
  }
  if (o.badge) {
    const sec = Math.round(REEL.OUT), lab = typeof o.badge === 'string' ? o.badge : `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
    const size = Math.max(12, Math.round(h * 0.026)), bw = measure(g, lab, { size, weight: 700, fam: 'M' }) + size * 1.2, bh = size * 1.8;
    const bx = w - w * 0.04 - bw, by = h - h * 0.05 - bh;
    rr(g, bx, by, bw, bh, size * 0.3); g.fillStyle = 'rgba(0,0,0,0.72)'; g.fill();
    text(g, lab, bx + bw / 2, by + bh * 0.68, { size, weight: 700, fam: 'M', color: '#FFFFFF', align: 'center' });
  }
  return (b ? b.c : MAIN.c).toDataURL(o.type || 'image/png', o.quality ?? 0.92);
}
function frameInfo(t) {
  const loc = locate(t), s = loc.cur;
  return { scene: s.id, lt: t - s.t0, dur: s.dur, transition: loc.tr ? { type: loc.tr.type, from: loc.tr.A.id, to: loc.tr.B.id, k: loc.tr.k } : null };
}
// Times worth checking: each boundary (window edges, one frame before/after the cut) for QA stills.
function boundaryTimes() {
  const S = REEL.plan.scenes, out = [], f = 1 / FPS;
  for (let i = 1; i < S.length; i++) {
    const s = S[i], tr = s.trans;
    const ts0 = [s.t0 - tr.pre, s.t0 - f, s.t0, s.t0 + f, s.t0 + tr.post, s.t0 + Math.max(tr.post, 0.25)];
    if (tr.pre > 0) ts0.push(s.t0 - tr.pre / 2);
    for (const x of ts0) if (x >= 0 && x <= REEL.plan.duration) out.push(+x.toFixed(4));
  }
  return [...new Set(out)].sort((a, b) => a - b);
}

// ───────── player ─────────
function $(id) { return document.getElementById(id); }
function fmtTime(s) { s = Math.max(0, s); return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}.${String(Math.floor((s % 1) * 100)).padStart(2, '0')}`; }
function initPlayer(q) {
  const M = window.MANIFEST || {};
  const cv = MAIN.c, ui = $('ui'), btn = $('play'), bar = $('bar'), tl = $('time'), cutsEl = $('cuts'), ov = $('overlay');
  let playing = false, base = q.has('t') ? parseFloat(q.get('t')) || 0 : 0, t0 = 0, posterShown = !q.has('t') && !q.has('autoplay');
  const audioFor = name => {
    if (!(M.audio && M.audio[name])) return null;
    if (!REEL.audio[name]) { const a = new Audio(M.audio[name]); a.preload = 'auto'; REEL.audio[name] = a; }
    return REEL.audio[name];
  };
  const cur = () => audioFor(REEL.cut);
  const now = () => {
    if (!playing) return base;
    const a = cur();
    if (a && !a.paused && !a.ended && a.readyState >= 2) return a.currentTime;
    return base + (performance.now() - t0) / 1000;
  };
  function setPlaying(p) {
    if (p === playing) return;
    if (p) {
      if (base >= REEL.OUT - 0.01) base = 0;
      playing = true; t0 = performance.now();
      const a = cur();
      if (a) { try { a.currentTime = base; } catch (e) { /* not seekable yet */ } a.play().catch(() => {}); }
      hidePoster();
    } else {
      base = now(); playing = false;
      const a = cur(); if (a) a.pause();
    }
    btn.textContent = playing ? '❚❚' : '▶';
    btn.setAttribute('aria-label', playing ? 'Pause' : 'Play');
    wake();
  }
  function seek(T) {
    base = clamp(T, 0, Math.max(0, REEL.OUT - 1 / FPS));
    if (playing) { t0 = performance.now(); const a = cur(); if (a) { try { a.currentTime = base; } catch (e) { /* ignore */ } } }
    hidePoster();
    draw();
  }
  function selectCut(name) {
    const wasPlaying = playing;
    if (playing) setPlaying(false);
    setCut(name);
    base = 0;
    for (const b of cutsEl.querySelectorAll('button')) b.classList.toggle('on', b.dataset.cut === REEL.cut);
    draw();
    if (wasPlaying) setPlaying(true);
  }
  function draw() {
    const T = now();
    renderFrame(REEL.toScene(Math.min(T, REEL.OUT - 1 / FPS)));
    bar.value = String(REEL.OUT ? (T / REEL.OUT) * 1000 : 0);
    tl.textContent = `${fmtTime(T)} / ${fmtTime(REEL.OUT)}`;
  }
  // Poster frame under the play overlay: MANIFEST.posterT / config.poster (output s), else the end of the first
  // scene's in-phase (its entrances have landed).
  function showPoster() {
    if (!ov) return;
    let pt = M.posterT ?? CONFIG.poster ?? null;
    if (pt == null) { const s0 = REEL.plan.scenes[0]; pt = (s0.t0 + Math.min(s0.inSec, Math.max(0, s0.dur - s0.outSec))) * REEL.scale; }
    renderFrame(REEL.toScene(Math.min(Math.max(0, pt), REEL.OUT - 1 / FPS)));
    ov.hidden = false;
  }
  function hidePoster() { if (ov && !ov.hidden) { ov.hidden = true; posterShown = false; } }
  cutsEl.innerHTML = '';
  const outDur = name => {
    const w = M.warp && !Array.isArray(M.warp) ? M.warp[name] : name === REEL.cut ? REEL.warp : null;
    if (w) { const k = typeof w === 'string' ? w.split(',').map(x => x.split(':').map(Number)) : w; return +k[k.length - 1][0]; }
    return REEL.plans[name].duration * (name === REEL.cut ? REEL.scale : +M.scale || 1);
  };
  REEL.order.forEach((name, i) => {
    const b = document.createElement('button');
    const d = Math.round(outDur(name));
    b.textContent = /^\d+$/.test(name) && d === +name ? `${name}s` : `${name} · ${d}s`;
    b.dataset.cut = name; b.title = `Cut ${name} (key ${i + 1})`;
    b.onclick = () => selectCut(name);
    b.classList.toggle('on', name === REEL.cut);
    cutsEl.appendChild(b);
  });
  if (REEL.order.length < 2) cutsEl.style.display = 'none';
  btn.onclick = () => setPlaying(!playing);
  cv.onclick = () => setPlaying(!playing);
  if (ov) ov.onclick = () => setPlaying(true);
  bar.oninput = () => seek((bar.value / 1000) * REEL.OUT);
  window.addEventListener('keydown', e => {
    if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName) && e.code !== 'Space') return;
    if (e.code === 'Space') { e.preventDefault(); setPlaying(!playing); }
    else if (e.code === 'ArrowRight' || e.code === 'ArrowLeft') {
      e.preventDefault();
      if (playing) setPlaying(false);
      seek(base + (e.code === 'ArrowRight' ? 1 : -1) * (e.shiftKey ? 1 : 1 / FPS));
    } else if (e.code === 'Home') { e.preventDefault(); seek(0); }
    else if (e.code === 'End') { e.preventDefault(); seek(REEL.OUT); }
    else if (/^Digit[1-9]$/.test(e.code)) { const n = +e.code.slice(5) - 1; if (REEL.order[n]) selectCut(REEL.order[n]); }
    else if (e.key === 'f' || e.key === 'F') {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      else (document.documentElement.requestFullscreen ? document.documentElement.requestFullscreen() : Promise.resolve()).catch(() => {});
    }
    wake();
  });
  let idle = 0;
  function wake() {
    ui.classList.remove('idle'); document.body.classList.remove('idle');
    clearTimeout(idle);
    idle = setTimeout(() => { if (playing) { ui.classList.add('idle'); document.body.classList.add('idle'); } }, 2200);
  }
  window.addEventListener('mousemove', wake); window.addEventListener('touchstart', wake, { passive: true });
  function loop() {
    if (playing) {
      let T = now();
      if (T >= REEL.OUT) { base = REEL.OUT; setPlaying(false); T = REEL.OUT; }
      draw();
    }
    requestAnimationFrame(loop);
  }
  if (posterShown && ov) showPoster(); else { if (ov) ov.hidden = true; draw(); }
  tl.textContent = `${fmtTime(base)} / ${fmtTime(REEL.OUT)}`;
  requestAnimationFrame(loop);
  if (q.has('autoplay')) setPlaying(true);
}

// ───────── boot ─────────
async function boot() {
  const M = window.MANIFEST;
  const q = new URLSearchParams(location.search);
  const api = window.__reel = {
    ready: false, error: null, version: '1.0.0',
    renderFrame, renderOut: T => renderFrame(REEL.toScene(T)), toScene: T => REEL.toScene(T),
    get OUT() { return REEL.OUT; }, get cut() { return REEL.cut; }, get cuts() { return REEL.order.slice(); },
    get plan() { return REEL.plan; }, get scale() { return REEL.scale; }, get warp() { return REEL.warp; },
    setCut: (name, o) => { setCut(name, o || {}); return { cut: REEL.cut, OUT: REEL.OUT, duration: REEL.plan.duration }; },
    setTimeMap: (scale, warp) => { setTimeMap(scale, warp); return REEL.OUT; },
    canvas: null, W, H, fps: FPS,
    renderScene, renderPoster, frameInfo, boundaryTimes,
  };
  const loading = $('loading');
  try {
    if (!M) throw new Error('window.MANIFEST is missing: open a built reel (build.mjs) or a dev page from stills.mjs');
    const cv = $('reel');
    cv.width = W; cv.height = H;
    document.documentElement.style.setProperty('--aspect', `${W} / ${H}`);
    document.documentElement.style.setProperty('--accent', C.accent);
    document.documentElement.style.setProperty('--stage', THEME === 'dark' ? C.bg : mix(C.ink, '#000000', 0.6));
    MAIN = { c: cv, g: cv.getContext('2d') };
    FRAME = makeBuf();
    BUF = { a: makeBuf(), b: makeBuf(), c: makeBuf(), g1: makeBuf(), g2: makeBuf(), mb: makeBuf(), s1: makeBuf(Math.ceil(W / 4), Math.ceil(H / 4)), s2: makeBuf(Math.ceil(W / 4), Math.ceil(H / 4)) };
    api.canvas = cv;
    if (M.title || CONFIG.title) document.title = M.title || CONFIG.title;
    await loadAll(M);
    for (const [name, c] of Object.entries(M.cuts || {})) REEL.plans[name] = makePlan(c, name);
    REEL.order = (M.cutOrder || Object.keys(REEL.plans)).map(String).filter(n => REEL.plans[n]);
    if (!REEL.order.length) throw new Error('no cuts in the manifest (run timing/plan_cut.py, then build or render)');
    setCut(q.get('cut') || M.defaultCut || REEL.order[0], { scale: q.get('scale') || undefined, warp: q.get('warp') || undefined });
    if (q.has('render')) document.body.classList.add('render');
    else initPlayer(q);
    if (loading) loading.hidden = true;
    api.ready = true;
    window.__reelReady = true;
  } catch (e) {
    api.error = String((e && e.stack) || e);
    console.error('[reel] boot failed: ' + api.error);
    if (loading) { loading.hidden = false; loading.textContent = 'Error: ' + (e && e.message ? e.message : e); }
  }
}
REEL.TRANS_DEF = TRANS_DEF;
REEL.entryPortal = entryPortal;   // scenes: REEL.entryPortal(env) (see entryPortal above)
return boot;
})();
