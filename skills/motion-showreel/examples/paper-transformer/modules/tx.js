// tx: the explainer's kit (a project module). Typeset like the paper: STIX Two on cream paper with fibres, black ink,
// one vermilion accent and a quiet ink per attention head; a sheet stack for depth and a desk lamp's warmth. It holds a
// small formula typesetter (sequences, italics, superscripts, subscripts, fractions, radicals; every atom can carry an
// id so a scene can find where it was set and grow a matrix out of it), and the toy model the reel computes for real:
// ten words, 16 numbers each (eight for the kind of word, eight for the paper's sinusoidal position code), and eight
// heads whose queries and keys (16 numbers) are hand-set linear maps of those, each giving softmax(QK^T / sqrt(d_k)).
// Exposes window.TX.
(() => {
  const PAPER = '#F4EEE1', INK = '#1C1B19', RULE = '#CFC6B4', RED = '#C0392B';
  const HEADS = [
    { name: 'one word back', ink: '#2C4A9A' }, { name: 'one word on', ink: '#1F7A7A' }, { name: 'same kind of word', ink: '#B7791F' },
    { name: 'pronoun → noun', ink: RED }, { name: 'verb → nouns', ink: '#7A3E6E' }, { name: 'adjective → noun', ink: '#5E7A1F' },
    { name: 'the first word', ink: '#4A5568' }, { name: 'everywhere', ink: '#8B5A2B' },
  ];
  // ───────── the toy model
  const WORDS = ['The', 'robot', 'picked', 'up', 'the', 'ball', 'because', 'it', 'was', 'light'];
  const KIND = ['DET', 'NOUN', 'VERB', 'PRT', 'DET', 'NOUN', 'CONJ', 'PRON', 'AUX', 'ADJ'];
  const KINDS = ['DET', 'NOUN', 'VERB', 'PRT', 'CONJ', 'PRON', 'AUX', 'ADJ'];
  const N = WORDS.length, DPE = 8, DK = 16;
  const pe = (pos) => { const v = []; for (let i = 0; i < DPE / 2; i++) { const w = 1 / Math.pow(10000, (2 * i) / DPE); v.push(Math.sin(pos * w), Math.cos(pos * w)); } return v; };
  const onehot = (k) => KINDS.map(x => (x === k ? 1 : 0));
  const X = WORDS.map((_, i) => [...onehot(KIND[i]), ...pe(i)]);   // the 16 numbers of each word
  // shift a position code by k places: each (sin, cos) pair rotates by k * w (the paper's linear-offset property)
  const shift = (v, k) => { const o = []; for (let i = 0; i < DPE / 2; i++) { const w = 1 / Math.pow(10000, (2 * i) / DPE), c = Math.cos(k * w), s = Math.sin(k * w), a = v[2 * i], b = v[2 * i + 1]; o.push(a * c + b * s, b * c - a * s); } return o; };
  const PEi = (i) => X[i].slice(8), KD = (i) => X[i].slice(0, 8), dot = (a, b) => a.reduce((s, v, j) => s + v * b[j], 0);
  const nounE = onehot('NOUN');
  // nearness for the noun-seeking heads uses only the second sine-cosine pair (wavelength ~63 words): the first pair
  // wraps around every ~6 words, so six words away would look nearer than two
  const near = (i) => PEi(i).map((v, t) => (t === 2 || t === 3 ? v : 0));
  // per head: q_i and k_j, 16 numbers each (a kind part and a position part, kept apart), linear in the word's numbers
  const Z = new Array(8).fill(0), cat = (a, b) => [...a, ...b], sc = (v, k) => v.map(x => x * k);
  const QK = [
    { q: (i) => cat(Z, sc(shift(PEi(i), -1), 20)), k: (j) => cat(Z, PEi(j)) },
    { q: (i) => cat(Z, sc(shift(PEi(i), 1), 20)), k: (j) => cat(Z, PEi(j)) },
    { q: (i) => cat(sc(KD(i), 5.7), Z), k: (j) => cat(KD(j), Z) },
    { q: (i) => (KIND[i] === 'PRON' ? cat(sc(nounE, 17), sc(near(i), 42)) : cat(Z, sc(PEi(i), 0.4))), k: (j) => cat(KD(j), near(j)) },
    { q: (i) => (KIND[i] === 'VERB' ? cat(sc(nounE, 7), Z) : cat(Z, Z)), k: (j) => cat(KD(j), Z) },
    { q: (i) => (KIND[i] === 'ADJ' ? cat(sc(nounE, 17), sc(near(i), 42)) : cat(Z, sc(PEi(i), 0.4))), k: (j) => cat(KD(j), near(j)) },
    { q: () => cat(Z, sc(pe(0), 20)), k: (j) => cat(Z, PEi(j)) },
    { q: () => cat(Z, Z), k: (j) => cat(Z, PEi(j)) },
  ];
  const softmax = (row) => { const m = Math.max(...row), e = row.map(v => Math.exp(v - m)), s = e.reduce((a, b) => a + b, 0); return e.map(v => v / s); };
  let A = null;
  function attention() {                                             // A[h][i][j], computed once
    if (A) return A;
    A = QK.map(({ q, k }) => { const Q = WORDS.map((_, i) => q(i)), K = WORDS.map((_, j) => k(j)); return Q.map(qi => softmax(K.map(kj => dot(qi, kj) / Math.sqrt(DK)))); });
    return A;
  }
  // the matrices of one head, for the formula scene
  function matrices(h) {
    const { q, k } = QK[h], Q = WORDS.map((_, i) => q(i)), K = WORDS.map((_, j) => k(j)), V = X.map(x => x.slice());
    const S = Q.map(qi => K.map(kj => dot(qi, kj) / Math.sqrt(DK))), Aw = S.map(softmax), O = Aw.map(row => V[0].map((_, c) => row.reduce((s, a, j) => s + a * V[j][c], 0)));
    return { Q, K, KT: K[0].map((_, c) => K.map(r => r[c])), S, A: Aw, V, O };
  }
  // ───────── paper, light, depth
  let TEX = null;
  function paperTex() {
    if (TEX) return TEX;
    const b = makeBuf(W, H), g = b.g; g.fillStyle = PAPER; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 2600; i++) { const x = hash(i * 1.7) * W, y = hash(i * 3.1) * H, l = 6 + hash(i * 5.3) * 26, a = hash(i * 7.9) * TAU; g.strokeStyle = `rgba(120,100,70,${0.03 + hash(i) * 0.05})`; g.lineWidth = 0.8; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l * 0.4); g.stroke(); }
    TEX = b.c; return TEX;
  }
  // the desk under the page, a second sheet behind it, the page, the lamp; the camera pushes in slowly (z, dx, dy)
  function page(ctx, cam = {}) {
    const z = cam.z ?? 1, dx = cam.dx ?? 0, dy = cam.dy ?? 0;
    ctx.fillStyle = '#2B2622'; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.translate(W / 2 + dx * 0.4, H / 2 + dy * 0.4); ctx.scale(z * 0.985, z * 0.985); ctx.rotate(0.012);
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.filter = 'blur(20px)'; ctx.fillRect(-W / 2 + 20, -H / 2 + 30, W, H); ctx.filter = 'none';
    ctx.fillStyle = '#E8E1D2'; ctx.fillRect(-W / 2 + 6, -H / 2 + 6, W - 12, H - 12); ctx.restore();
    ctx.save(); ctx.translate(W / 2 + dx, H / 2 + dy); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2);
    ctx.drawImage(paperTex(), 0, 0);
    ctx.restore();
    ctx.fillStyle = radial(ctx, W * 0.28, H * 0.12, 0, W * 0.95, [[0, 'rgba(255,240,210,0.16)'], [0.6, 'rgba(255,240,210,0)'], [1, 'rgba(40,25,10,0.22)']]); ctx.fillRect(0, 0, W, H);
  }
  // the camera transform for content set on the page
  function onPage(ctx, cam, fn) { const z = cam.z ?? 1; ctx.save(); ctx.translate(W / 2 + (cam.dx ?? 0), H / 2 + (cam.dy ?? 0)); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2); fn(ctx); ctx.restore(); }
  // ───────── type
  const fam = (o) => (o.math ? '"STIX Two Math", ' : '') + '"STIX Two Text", serif';
  function font(ctx, o) { ctx.font = `${o.it ? 'italic ' : ''}${o.weight || 400} ${o.size || 32}px ${fam(o)}`; }
  function txt(ctx, s, x, y, o = {}) {
    ctx.save(); font(ctx, o); ctx.textAlign = o.align || 'left'; ctx.fillStyle = o.color || INK; ctx.globalAlpha *= o.a ?? 1;
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${o.ls ?? 0}px`;
    ctx.fillText(o.n !== undefined ? String(s).slice(0, Math.max(0, Math.floor(o.n))) : s, x, y); ctx.restore();
  }
  // set a line of type letter by letter: each letter drops into place, a caret marks the insertion point
  function typeset(ctx, s, x, y, p, o = {}) {
    if (p <= 0) return; font(ctx, o);
    const total = ctx.measureText(s).width, x0 = o.align === 'center' ? x - total / 2 : x, n = s.length * clamp(p);
    let cx = x0;
    for (let i = 0; i < s.length; i++) {
      const w = ctx.measureText(s[i]).width, k = clamp(n - i);
      if (k > 0) { ctx.save(); font(ctx, o); ctx.fillStyle = o.color || INK; ctx.globalAlpha *= (o.a ?? 1) * clamp(k * 1.6); ctx.fillText(s[i], cx, y - (1 - Ease.outC(k)) * (o.size || 32) * 0.35); ctx.restore(); }
      cx += w;
    }
    if (p < 1) { const cxp = x0 + (() => { font(ctx, o); return ctx.measureText(s.slice(0, Math.floor(n))).width; })(); ctx.fillStyle = rgba(RED, 0.9); ctx.fillRect(cxp + 2, y - (o.size || 32) * 0.82, 2, (o.size || 32) * 1.0); }
  }
  // ───────── a small formula typesetter. Nodes: string | {it, s} | {seq: []} | {sup: [base, sup]} | {sub: [base, sub]}
  // | {frac: [num, den]} | {sqrt: body}; any node may have id. lay() returns a box tree with x, y offsets.
  function lay(ctx, nd, size) {
    if (typeof nd === 'string' || nd.s !== undefined) {
      const s = typeof nd === 'string' ? nd : nd.s, o = { size, it: nd.it, math: nd.math }; font(ctx, o);
      return { kind: 'text', s, o, w: ctx.measureText(s).width + (nd.it ? size * 0.04 : 0), asc: size * 0.72, desc: size * 0.22, id: nd.id };
    }
    if (nd.seq) { const kids = nd.seq.map(k => lay(ctx, k, size)); let x = 0; kids.forEach(k => { k.dx = x; k.dy = 0; x += k.w + (k.gap || 0); }); return { kind: 'seq', kids, w: x, asc: Math.max(...kids.map(k => k.asc)), desc: Math.max(...kids.map(k => k.desc)), id: nd.id }; }
    if (nd.sup || nd.sub) {
      const [b, s] = nd.sup || nd.sub, B = lay(ctx, b, size), S = lay(ctx, s, size * 0.62);
      B.dx = 0; B.dy = 0; S.dx = B.w + size * 0.03; S.dy = nd.sup ? -size * 0.42 : size * 0.24;
      return { kind: 'seq', kids: [B, S], w: B.w + S.w + size * 0.05, asc: Math.max(B.asc, nd.sup ? S.asc + size * 0.42 : 0), desc: Math.max(B.desc, nd.sub ? S.desc + size * 0.24 : 0), id: nd.id };
    }
    if (nd.frac) {
      const [n, d] = nd.frac, Nn = lay(ctx, n, size * 0.92), Dd = lay(ctx, d, size * 0.92), w = Math.max(Nn.w, Dd.w) + size * 0.3, axis = -size * 0.28;
      Nn.dx = (w - Nn.w) / 2; Nn.dy = axis - size * 0.14 - Nn.desc; Dd.dx = (w - Dd.w) / 2; Dd.dy = axis + size * 0.14 + Dd.asc;
      return { kind: 'frac', kids: [Nn, Dd], w, axis, asc: -Nn.dy + Nn.asc, desc: Dd.dy + Dd.desc, id: nd.id };
    }
    if (nd.sqrt) { const Bd = lay(ctx, nd.sqrt, size); Bd.dx = size * 0.62; Bd.dy = 0; return { kind: 'sqrt', kids: [Bd], w: Bd.w + size * 0.72, asc: Bd.asc + size * 0.16, desc: Bd.desc, size, id: nd.id }; }
    throw new Error('formula node');
  }
  // draw a laid-out formula at (x, y baseline); p reveals atoms in order; returns a map id -> [x, y, w, asc, desc]
  function setFormula(ctx, box, x, y, o = {}) {
    let atoms = 0; (function c(b) { if (b.kind === 'text') atoms++; b.kids && b.kids.forEach(c); })(box);
    const ids = {}; let count = 0; const p = o.p ?? 1, total = o.atoms || atoms;
    (function draw(b, bx, by) {
      if (b.id) ids[b.id] = [bx, by, b.w, b.asc, b.desc];
      if (b.kind === 'text') { const k = clamp(p * total - count++); if (k > 0) { ctx.save(); font(ctx, b.o); ctx.fillStyle = (o.colorOf && o.colorOf(b)) || o.color || INK; ctx.globalAlpha *= (o.a ?? 1) * k; ctx.fillText(b.s, bx, by - (1 - k) * 8); ctx.restore(); } return; }
      if (b.kind === 'frac') { const k = clamp(p * total - count); ctx.fillStyle = rgba(o.color || INK, (o.a ?? 1) * k); ctx.fillRect(bx, by + b.axis - 1, b.w * k, 2); }
      if (b.kind === 'sqrt') {
        const k = clamp(p * total - count), s = b.size, top = by - b.asc;
        ctx.save(); ctx.strokeStyle = rgba(o.color || INK, (o.a ?? 1) * k); ctx.lineWidth = s * 0.05; ctx.lineJoin = 'round'; ctx.beginPath();
        ctx.moveTo(bx + s * 0.05, by - s * 0.32); ctx.lineTo(bx + s * 0.2, by - s * 0.4); ctx.lineTo(bx + s * 0.36, by + s * 0.12); ctx.lineTo(bx + s * 0.58, top); ctx.lineTo(bx + b.w, top); ctx.stroke(); ctx.restore();
      }
      b.kids && b.kids.forEach(kd => draw(kd, bx + kd.dx, by + kd.dy));
    })(box, x, y);
    return ids;
  }
  // ───────── a matrix as ink squares: values v (rows x cols), cell size c; signed values use red for negatives
  function matrix(ctx, v, x, y, c, k = 1, o = {}) {
    if (k <= 0) return; const r = v.length, cl = v[0].length, mx = o.max ?? (Math.max(...v.flat().map(Math.abs)) || 1);
    for (let i = 0; i < r; i++) for (let j = 0; j < cl; j++) {
      const kk = clamp(k * (r + cl) - (i + j) * 0.6); if (kk <= 0) continue;
      const u = v[i][j] / mx;
      ctx.fillStyle = u >= 0 ? rgba(o.ink || INK, (0.06 + 0.84 * Math.min(1, u)) * kk) : rgba(RED, (0.06 + 0.84 * Math.min(1, -u)) * kk);
      ctx.fillRect(x + j * c + 1, y + i * c + 1, c - 2, c - 2);
    }
    ctx.strokeStyle = rgba(INK, 0.55 * clamp(k * 2)); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x - 4, y - 2); ctx.lineTo(x - 8, y - 2); ctx.lineTo(x - 8, y + r * c + 2); ctx.lineTo(x - 4, y + r * c + 2);
    ctx.moveTo(x + cl * c + 4, y - 2); ctx.lineTo(x + cl * c + 8, y - 2); ctx.lineTo(x + cl * c + 8, y + r * c + 2); ctx.lineTo(x + cl * c + 4, y + r * c + 2); ctx.stroke();
  }
  // the sentence on a baseline: word centres; and the attention arcs of head h above it
  function wordsAt(x0, x1, y, size = 46) { const c = document.createElement('canvas').getContext('2d'); font(c, { size }); const ws = WORDS.map(w => c.measureText(w).width), gap = (x1 - x0 - ws.reduce((a, b) => a + b, 0)) / (N - 1); let x = x0; return WORDS.map((w, i) => { const r = { x, w: ws[i], c: x + ws[i] / 2, y }; x += ws[i] + gap; return r; }); }
  function arcs(ctx, pos, h, k, o = {}) {
    if (k <= 0) return; const Aw = attention()[h], col = HEADS[h].ink;
    ctx.save(); ctx.lineCap = 'round';
    for (let i = 0; i < N; i++) {
      if (o.only !== undefined && o.only !== i) continue;
      for (let j = 0; j < N; j++) {
        const w = Aw[i][j]; if (w < (o.min ?? 0.14) || i === j) continue;
        if ((h === 0 && j > i) || (h === 1 && j < i)) continue;          // no word before the first (the code wraps)
        const a = pos[i], b = pos[j], hgt = 40 + 30 * Math.abs(i - j), kk = clamp(k * 1.6 - Math.abs(i - j) * 0.05);
        if (kk <= 0) continue;
        const x0 = a.c, x1 = a.c + (b.c - a.c) * Ease.outC(kk), y0 = a.y - (o.lift ?? 58), mx = (x0 + b.c) / 2;
        ctx.strokeStyle = rgba(col, (0.2 + 0.8 * w) * (o.a ?? 1)); ctx.lineWidth = 0.8 + 6 * w;
        ctx.beginPath(); ctx.moveTo(x0, y0);
        // a quadratic arc from the query to the key, cut at its drawn length
        const steps = 30; for (let s = 1; s <= steps * kk; s++) { const t = s / steps, X = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * mx + t * t * b.c, Y = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * (y0 - hgt * 2) + t * t * y0; ctx.lineTo(X, Y); }
        ctx.stroke();
        if (kk >= 1) { ctx.fillStyle = rgba(col, (0.3 + 0.7 * w) * (o.a ?? 1)); circle(ctx, b.c, y0, 2 + 4 * w); ctx.fill(); }
      }
    }
    ctx.restore();
  }
  window.TX = { PAPER, INK, RULE, RED, HEADS, WORDS, KIND, N, X, pe, attention, matrices, page, onPage, txt, typeset, lay, setFormula, matrix, wordsAt, arcs, font };
})();
