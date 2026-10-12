// moodfm: the MOOD FM reel's shared kit (a project module). The colour of every frame is the app's own: its OKLCH
// helpers (domain/color.ts), its eight stations and four corner anchors mixed by inverse distance to the power 3.2
// in OKLab (paletteAt in domain/mood.ts), its ink choice, and its stage gradient (app.css .stage: m2 with radial m3 at
// 82% 18%, radial m1 at 12% 92% and linear 135deg m1-m2-m3). The dial, the pad's 40 x 40 colour map, the logo and the
// track names (describeTrack's words and seeded picks) are ported too.
(() => {
  // ---- domain/color.ts ----
  const cl = (v, a, b) => Math.min(b, Math.max(a, v));
  const toLab = ({ l, c, h }) => { const r = h * Math.PI / 180; return { l, a: c * Math.cos(r), b: c * Math.sin(r) }; };
  const toLch = ({ l, a, b }) => { const c = Math.hypot(a, b); let h = Math.atan2(b, a) * 180 / Math.PI; if (h < 0) h += 360; return { l, c, h: c < 1e-6 ? 0 : h }; };
  function labToLinear({ l, a, b }) { const l_ = l + 0.3963377774 * a + 0.2158037573 * b, m_ = l - 0.1055613458 * a - 0.0638541728 * b, s_ = l - 0.0894841775 * a - 1.291485548 * b;
    const L = l_ ** 3, M = m_ ** 3, S = s_ ** 3; return [4.0767416621 * L - 3.3077115913 * M + 0.2309699292 * S, -1.2684380046 * L + 2.6097574011 * M - 0.3413193965 * S, -0.0041960863 * L - 0.7034186147 * M + 1.707614701 * S]; }
  const gam = (v) => (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055), lin = (v) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  const inGamut = (rgb) => rgb.every(v => v >= -0.0005 && v <= 1.0005);
  function toGamut(c) { const l = cl(c.l, 0, 1); if (inGamut(labToLinear(toLab({ ...c, l })))) return { ...c, l }; let lo = 0, hi = c.c;
    for (let i = 0; i < 16; i++) { const mid = (lo + hi) / 2; if (inGamut(labToLinear(toLab({ l, c: mid, h: c.h })))) lo = mid; else hi = mid; } return { l, c: lo, h: c.h }; }
  const toRgb = (c) => labToLinear(toLab(toGamut(c))).map(v => Math.round(cl(gam(cl(v, 0, 1)), 0, 1) * 255));
  const hex = (c) => '#' + toRgb(c).map(v => v.toString(16).padStart(2, '0')).join('');
  const hexRgb = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const lum = (h) => { const [r, g, b] = hexRgb(h).map(v => lin(v / 255)); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const DARK = '#0b0b0c', LIGHT = '#f6f2ee';
  const inkFor = (bg) => (contrast(bg, DARK) >= contrast(bg, LIGHT) ? DARK : LIGHT);
  function mix(colors, weights) { let l = 0, a = 0, b = 0, t = 0; colors.forEach((c, i) => { const w = weights[i] || 0, k = toLab(c); l += k.l * w; a += k.a * w; b += k.b * w; t += w; }); return toLch({ l: l / t, a: a / t, b: b / t }); }
  // ---- domain/mood.ts ----
  const P = (l, c, h) => ({ l, c, h });
  const STATIONS = [
    { id: 'still', name: '고요', en: 'STILL', freq: 88.1, x: 0.14, y: 0.1, palette: [P(0.19, 0.012, 40), P(0.26, 0.02, 50), P(0.37, 0.06, 35)], tagline: '아무것도 하지 않는 시간의 소리예요.' },
    { id: 'dawn', name: '새벽', en: 'DAWN', freq: 90.7, x: 0.24, y: 0.24, palette: [P(0.28, 0.08, 275), P(0.43, 0.1, 305), P(0.52, 0.09, 40)], tagline: '잠들지 못한 새벽의 푸른 창가예요.' },
    { id: 'rain', name: '비', en: 'RAIN', freq: 93.1, x: 0.32, y: 0.42, palette: [P(0.47, 0.055, 232), P(0.37, 0.045, 218), P(0.28, 0.03, 200)], tagline: '빗소리 위에 젖은 코드가 얹혀요.' },
    { id: 'focus', name: '집중', en: 'FOCUS', freq: 95.9, x: 0.46, y: 0.6, palette: [P(0.52, 0.09, 200), P(0.41, 0.06, 240), P(0.3, 0.03, 250)], tagline: '한 가지 일에 오래 머무는 리듬이에요.' },
    { id: 'soft', name: '몽글', en: 'SOFT', freq: 98.3, x: 0.7, y: 0.26, palette: [P(0.84, 0.08, 25), P(0.8, 0.07, 340), P(0.92, 0.04, 70)], tagline: '구름 같은 이불 속에서 듣는 노래예요.' },
    { id: 'clear', name: '맑음', en: 'CLEAR', freq: 100.7, x: 0.86, y: 0.54, palette: [P(0.8, 0.1, 225), P(0.87, 0.07, 180), P(0.94, 0.04, 90)], tagline: '빨래가 잘 마르는 날의 공기예요.' },
    { id: 'walk', name: '산책', en: 'WALK', freq: 103.5, x: 0.74, y: 0.76, palette: [P(0.73, 0.15, 135), P(0.83, 0.16, 105), P(0.9, 0.12, 90)], tagline: '발걸음에 맞춰 흔들리는 그루브예요.' },
    { id: 'hype', name: '들뜸', en: 'HYPE', freq: 106.1, x: 0.84, y: 0.92, palette: [P(0.73, 0.17, 38), P(0.7, 0.2, 20), P(0.67, 0.2, 350)], tagline: '심장이 먼저 뛰는 밤의 네온이에요.' },
  ];
  const ANCHORS = [{ x: 0, y: 0, palette: [P(0.2, 0.05, 270), P(0.26, 0.06, 285), P(0.32, 0.05, 260)] }, { x: 0, y: 1, palette: [P(0.36, 0.16, 320), P(0.43, 0.18, 340), P(0.3, 0.12, 300)] },
    { x: 1, y: 0, palette: [P(0.9, 0.04, 50), P(0.94, 0.03, 80), P(0.88, 0.05, 30)] }, { x: 1, y: 1, palette: [P(0.82, 0.17, 75), P(0.78, 0.18, 55), P(0.88, 0.14, 95)] }];
  const c01 = (v) => cl(v, 0, 1);
  const CACHE = new Map();
  function paletteAt(x, y) {
    const key = Math.round(c01(x) * 400) + ':' + Math.round(c01(y) * 400); if (CACHE.has(key)) return CACHE.get(key);
    const px = c01(x), py = c01(y), src = [...STATIONS, ...ANCHORS];
    const w = src.map(s => { const d = Math.hypot(s.x - px, s.y - py); return d < 1e-4 ? 1e8 : 1 / Math.pow(d, 3.2); });
    const m = [0, 1, 2].map(i => mix(src.map(s => s.palette[i]), w)), ink = inkFor(hex(m[1]));
    const ok = m.map(c => { let cur = c; for (let i = 0; i < 40; i++) { if (contrast(hex(cur), ink) >= 4.6) break; cur = { ...cur, l: c01(cur.l + (ink === DARK ? 0.01 : -0.01)) }; } return cur; });
    const out = { colors: ok.map(hex), ink, light: ink === DARK }; if (CACHE.size > 20000) CACHE.clear(); CACHE.set(key, out); return out;
  }
  const describe = (x, y) => `${x < 0.34 ? '어둡고' : x < 0.67 ? '은은하고' : '밝고'} ${y < 0.34 ? '차분한' : y < 0.67 ? '잔잔한' : '들뜬'}`;
  function nearest(x, y) { let b = STATIONS[0], d = Infinity; for (const s of STATIONS) { const e = Math.hypot(s.x - x, s.y - y); if (e < d) { d = e; b = s; } } return b; }
  function dialToMood(t) { const c = cl(t, 0, 7), i = Math.min(6, Math.floor(c)), u = c - i, a = STATIONS[i], b = STATIONS[i + 1]; return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u }; }
  function dialToFreq(t) { const c = cl(t, 0, 7), i = Math.min(6, Math.floor(c)), u = c - i; return STATIONS[i].freq + (STATIONS[i + 1].freq - STATIONS[i].freq) * u; }
  // ---- domain/music.ts: track names ----
  const mulberry = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const pick = (r, xs) => xs[Math.floor(r() * xs.length)];
  const ADJ = { cd: ['느린', '젖은', '고요한', '희미한', '낮은', '먼'], cb: ['부드러운', '포근한', '말간', '가벼운', '하얀', '둥근'], ed: ['붉은', '검은', '빠른', '깊은', '뜨거운', '거친'], eb: ['맑은', '반짝이는', '노란', '튀는', '높은', '환한'] };
  const NOUNS = { still: ['호수', '촛불', '먼지', '달', '숨', '방'], dawn: ['첫 전철', '창가', '가로등', '골목', '라디오', '새벽 네 시'], rain: ['우산', '빗방울', '창문', '버스 정류장', '물웅덩이', '젖은 신발'],
    focus: ['책상', '연필', '형광등', '타자기', '메모', '커피'], soft: ['구름', '이불', '우유', '풍선', '낮잠', '털실'], clear: ['하늘', '빨래', '자전거', '유리창', '오후', '창문 너머'], walk: ['공원', '발걸음', '바람', '나무', '골목', '강변'], hype: ['불꽃', '네온', '롤러코스터', '심장', '파티', '옥상'] };
  const SUF = ['', '', '', ' no.2', ' (dub)', ' reprise', ' 두 번째', ' 다시', ' pt.2'];
  function track(seed, st) { const r = mulberry(seed ^ 0x9e3779b9); r(); const list = st.y < 0.5 ? (st.x < 0.5 ? ADJ.cd : ADJ.cb) : (st.x < 0.5 ? ADJ.ed : ADJ.eb);
    const noun = pick(r, NOUNS[st.id]), adjs = list.filter(a => !noun.includes(a)); return { title: `${pick(r, adjs.length ? adjs : list)} ${noun}${pick(r, SUF)}`, seed: (seed >>> 0).toString(16).toUpperCase().padStart(8, '0').slice(-4) }; }
  // ---- drawing ----
  // the stage gradient (app.css .stage) over a rect
  function stage(ctx, x, y, w, h, pal, o = {}) {
    const [m1, m2, m3] = pal.colors; ctx.save(); if (o.r) { rr(ctx, x, y, w, h, o.r); ctx.clip(); }
    const L = (w + h) / 2 * 0.72, cx = x + w / 2, cy = y + h / 2, g = ctx.createLinearGradient(cx - L * 0.707, cy - L * 0.707, cx + L * 0.707, cy + L * 0.707);
    g.addColorStop(0, m1); g.addColorStop(0.52, m2); g.addColorStop(1, m3); ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    const rad = (px, py, rx, ry, c) => { ctx.save(); ctx.translate(x + px * w, y + py * h); ctx.scale(rx * w, ry * h); const r = ctx.createRadialGradient(0, 0, 0, 0, 0, 1); r.addColorStop(0, c); r.addColorStop(0.7, c + '00'); ctx.fillStyle = r; ctx.fillRect(-1.5, -1.5, 3, 3); ctx.restore(); };
    rad(0.82, 0.18, 0.6, 0.55, m3); rad(0.12, 0.92, 0.55, 0.6, m1);
    ctx.restore();
  }
  // ink that turns smoothly instead of flipping
  function ink(pal) { const d = contrast(pal.colors[1], DARK), l = contrast(pal.colors[1], LIGHT), k = clamp((d / (d + l) - 0.42) / 0.16); return { k, c: k > 0.5 ? DARK : LIGHT, a: Math.abs(k - 0.5) * 2 }; }
  function inkColor(pal) { const { k } = ink(pal), a = hexRgb(LIGHT), b = hexRgb(DARK); return `rgb(${a.map((v, i) => Math.round(lerp(v, b[i], k))).join(',')})`; }
  // the pad's colour map (MoodPad.tsx: 40 x 40, colour 2 of the palette at each point)
  let MAP = null;
  function padMap() { if (MAP) return MAP; const b = makeBuf(40, 40), id = b.g.createImageData(40, 40);
    for (let j = 0; j < 40; j++) for (let i = 0; i < 40; i++) { const rgb = hexRgb(paletteAt(i / 39, 1 - j / 39).colors[1]), k = (j * 40 + i) * 4; id.data[k] = rgb[0]; id.data[k + 1] = rgb[1]; id.data[k + 2] = rgb[2]; id.data[k + 3] = 255; }
    b.g.putImageData(id, 0, 0); return (MAP = b.c); }
  // the logo mark (Icons.tsx LogoMark, viewBox 64): chrome ring, dark face, twelve ticks, the coral needle at angle a
  function logo(ctx, x, y, s, o = {}) {
    ctx.save(); ctx.globalAlpha *= o.alpha ?? 1; ctx.translate(x, y); ctx.scale(s / 64, s / 64);
    const g = ctx.createLinearGradient(2, 2, 62, 62); [[0, '#fbfbfb'], [0.35, '#8e8e93'], [0.55, '#f4f4f6'], [0.8, '#5d5d63'], [1, '#d9d9de']].forEach(([p, c]) => g.addColorStop(p, c));
    ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3; circle(ctx, 32, 32, 30); ctx.fillStyle = g; ctx.fill(); ctx.shadowColor = 'transparent';
    const f = ctx.createRadialGradient(32 - 6.4, 32 - 8.4, 0, 32, 32, 23 * 1.4); f.addColorStop(0, '#2a2a2e'); f.addColorStop(1, '#0b0b0c'); circle(ctx, 32, 32, 23); ctx.fillStyle = f; ctx.fill();
    ctx.strokeStyle = 'rgba(246,242,238,0.55)'; ctx.lineWidth = 1.6; ctx.lineCap = 'round'; ctx.beginPath();
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; ctx.moveTo(32 + Math.cos(a) * 17, 32 + Math.sin(a) * 17); ctx.lineTo(32 + Math.cos(a) * 20, 32 + Math.sin(a) * 20); } ctx.stroke();
    const a = o.angle ?? Math.atan2(19 - 32, 44 - 32), len = Math.hypot(12, 13);
    ctx.strokeStyle = '#F08464'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(32, 32); ctx.lineTo(32 + Math.cos(a) * len, 32 + Math.sin(a) * len); ctx.stroke(); ctx.fillStyle = '#F08464'; circle(ctx, 32, 32, 4.5); ctx.fill();
    ctx.restore();
  }
  function word(ctx, x, y, size, color, o = {}) { ctx.save(); ctx.globalAlpha *= o.alpha ?? 1; ctx.font = `900 ${size}px ${FAM.display}`; if ('letterSpacing' in ctx) ctx.letterSpacing = `${-0.055 * size}px`;
    const a = ctx.measureText('MOOD').width, gap = size * 0.19, w = a + gap + ctx.measureText('FM').width, x0 = o.align === 'center' ? x - w / 2 : x;
    ctx.fillStyle = color; ctx.fillText('MOOD', x0, y); ctx.fillStyle = '#F08464'; ctx.fillText('FM', x0 + a + gap, y); ctx.restore(); return w; }
  function spaced(ctx, s, x, y, size, ls, align) { let w = 0; for (const ch of s) w += ctx.measureText(ch).width + size * ls; w -= size * ls;
    let cx = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x; for (const ch of s) { ctx.fillText(ch, cx, y); cx += ctx.measureText(ch).width + size * ls; } return w; }
  function label(ctx, s, x, y, o = {}) { ctx.save(); ctx.globalAlpha *= o.alpha ?? 1; ctx.font = `${o.weight || 600} ${o.size || 20}px ${FAM.mono}`; ctx.fillStyle = o.color || '#F6F2EE'; const w = spaced(ctx, s, x, y, o.size || 20, 0.12, o.align); ctx.restore(); return w; }
  function lamp(ctx, x, y, r, on) { ctx.save(); if (on > 0) { ctx.shadowColor = `rgba(240,132,100,${0.8 * on})`; ctx.shadowBlur = 16 * on; } ctx.fillStyle = on > 0.5 ? '#F08464' : 'rgba(246,242,238,0.35)'; circle(ctx, x, y, r); ctx.fill(); ctx.restore(); }
  // the top ticker (Shell.tsx Header)
  function ticker(ctx, st, freq, title, on, color) { ctx.save(); ctx.fillStyle = 'rgba(11,11,12,0.35)'; ctx.fillRect(0, 0, W, 40); ctx.font = `600 16px ${FAM.mono}`; ctx.fillStyle = color; ctx.globalAlpha *= 0.85;
    spaced(ctx, 'MOOD FM — GENERATIVE RADIO', 28, 26, 16, 0.12); const s = `${on > 0.5 ? 'ON AIR' : 'OFF AIR'} · ${freq.toFixed(1)} MHz · ${st.name} ${st.en} · ${title}`; ctx.font = `600 16px ${FAM.mono}`;
    const w = spaced(ctx, s, W / 2 + 12, 26, 16, 0.12, 'center'); ctx.globalAlpha /= 0.85; lamp(ctx, W / 2 - w / 2 - 6, 20, 5, on); ctx.restore(); }
  window.MF = { STATIONS, paletteAt, describe, nearest, dialToMood, dialToFreq, track, stage, ink, inkColor, padMap, logo, word, label, lamp, ticker, spaced };
})();
