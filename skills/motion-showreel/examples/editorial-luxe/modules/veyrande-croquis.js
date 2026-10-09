// veyrande-croquis.js (project module): the house croquis of Maison Veyrande, drawn in code with an ink pen.
// The path data is the same as source/sketches/look-*.svg (viewBox 0 0 600 1500, absolute M/C/L/Z commands).
// Exposes window.VEYRANDE.croquis:
//   prep(look)                               -> {strokes, fills, over, dots, total, emb}  (cached, pure)
//   draw(ctx, look, cx, top, h, u, o)        draw look `look` with its strokes drawn on to progress u (0..1)
//   sequins(ctx, look, cx, top, h, k, t, o)  the embroidery of a look (look 31): k 0..1 how much is sewn, t for glints
//   plate(look, h, P)                        a cached canvas of the finished croquis (for lookbook plates)
// Pure in its inputs: no time, no random (hash() only). Colours come from the palette passed in o.P.
(() => {
  const V = (window.VEYRANDE = window.VEYRANDE || {});
  const VBW = 600, VBH = 1500;

  // ───────── SVG path data -> sampled polylines ─────────
  function parsePath(d) {
    const tok = String(d).match(/[MCLQZmclqz]|-?\d*\.?\d+(?:e-?\d+)?/g) || [];
    const subs = [];
    let i = 0, cmd = null, cur = [0, 0], start = [0, 0], sub = null;
    const num = () => +tok[i++];
    while (i < tok.length) {
      if (/[A-Za-z]/.test(tok[i])) cmd = tok[i++];
      const rel = cmd === cmd.toLowerCase(), C = cmd.toUpperCase();
      const pt = () => { const x = num(), y = num(); return rel ? [cur[0] + x, cur[1] + y] : [x, y]; };
      if (C === 'M') { cur = pt(); start = cur; sub = { pts: [cur], segs: [] }; subs.push(sub); cmd = rel ? 'l' : 'L'; }
      else if (C === 'L') { const p = pt(); sub.segs.push(['L', cur, p]); cur = p; }
      else if (C === 'Q') { const a = pt(), p = pt(); sub.segs.push(['Q', cur, a, p]); cur = p; }
      else if (C === 'C') { const a = pt(), b = pt(), p = pt(); sub.segs.push(['C', cur, a, b, p]); cur = p; }
      else if (C === 'Z') { sub.segs.push(['L', cur, start]); sub.closed = true; cur = start; }
      else i++;
    }
    return subs;
  }
  function bez(s, t) {
    const u = 1 - t;
    if (s[0] === 'L') return [s[1][0] + (s[2][0] - s[1][0]) * t, s[1][1] + (s[2][1] - s[1][1]) * t];
    if (s[0] === 'Q') return [u * u * s[1][0] + 2 * u * t * s[2][0] + t * t * s[3][0], u * u * s[1][1] + 2 * u * t * s[2][1] + t * t * s[3][1]];
    return [u * u * u * s[1][0] + 3 * u * u * t * s[2][0] + 3 * u * t * t * s[3][0] + t * t * t * s[4][0],
      u * u * u * s[1][1] + 3 * u * u * t * s[2][1] + 3 * u * t * t * s[3][1] + t * t * t * s[4][1]];
  }
  function sample(sub, step = 3) {
    const pts = [sub.segs.length ? sub.segs[0][1] : sub.pts[0]];
    for (const s of sub.segs) {
      const a = s[1], b = s[s.length - 1];
      const est = Math.hypot(b[0] - a[0], b[1] - a[1]) + (s[0] === 'C' ? Math.hypot(s[2][0] - a[0], s[2][1] - a[1]) + Math.hypot(s[3][0] - b[0], s[3][1] - b[1]) : 0);
      const n = Math.max(2, Math.ceil(est / step));
      for (let k = 1; k <= n; k++) pts.push(bez(s, k / n));
    }
    const cum = [0];
    for (let k = 1; k < pts.length; k++) cum.push(cum[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]));
    return { pts, cum, len: cum[cum.length - 1] };
  }

  // ───────── the croquis: a 10-head figure in profile, weight on one hip, viewBox 600 x 1500 ─────────
  // Each stroke: {id, d, w (width in viewBox units), a (ink alpha), col (palette role, default ink)}. Strokes draw in
  // this order with pen lifts between them, the way an illustrator works: head, collar, bodice, skirt, arms, folds.
  const S = (id, d, w = 3, a = 1, col) => ({ id, d, w, a, col });
  const HEAD = [
    S('profile', 'M 276 62 C 265 75 261 89 262 101 C 256 109 249 118 248 125 C 248 129 253 131 258 132 C 255 136 255 140 259 142 C 256 146 257 150 261 152 C 262 159 266 166 273 171 C 283 178 297 181 309 178', 3.2),
    S('crown', 'M 270 68 C 284 44 324 36 349 56 C 369 73 374 103 363 128', 3.8),
    S('chignon', 'M 363 128 C 382 125 393 142 387 159 C 380 174 359 176 351 163 C 346 155 349 145 357 139', 3.2),
    S('sweep', 'M 273 71 C 297 75 320 89 336 107 C 346 119 352 129 357 141', 2, 0.75),
    S('strand', 'M 301 51 C 327 57 347 75 356 99 C 360 111 362 121 362 131', 1.4, 0.5),
    S('swirl', 'M 369 139 C 378 144 380 155 373 162', 1.4, 0.6),
    S('ear', 'M 331 121 C 337 127 337 139 331 146', 1.6, 0.5),
  ];
  const NECK = [
    S('throat', 'M 291 178 C 290 202 288 224 284 247', 2.4, 0.9),
    S('nape', 'M 341 163 C 339 193 342 221 351 245', 2.4, 0.9),
  ];
  const SHOULDERS = [
    S('shoulderL', 'M 284 247 C 259 259 231 268 207 285', 2.6, 0.9),
    S('shoulderR', 'M 351 245 C 371 253 393 260 407 272', 2.6, 0.9),
  ];
  const LOOKS = {
    '01': {
      name: 'MANTEAU DU SOIR',
      strokes: [
        ...HEAD, ...NECK,
        S('collarL', 'M 290 250 C 280 232 270 212 262 196 C 252 191 240 195 231 204 C 234 236 236 268 239 300', 3.4),
        S('collarR', 'M 346 246 C 356 228 366 208 374 192 C 384 188 396 193 404 202 C 401 234 399 266 397 298', 3.4),
        S('collarBackL', 'M 262 196 C 270 200 279 203 288 205', 2, 0.8),
        S('collarBackR', 'M 343 203 C 354 200 365 196 374 192', 2, 0.8),
        S('collarIn', 'M 290 250 C 304 260 330 258 346 246', 1.4, 0.55),
        S('shoulderL', 'M 241 300 C 223 304 207 313 199 327', 3),
        S('shoulderR', 'M 396 298 C 414 302 428 311 436 325', 3),
        S('sideL', 'M 223 331 C 229 501 229 701 225 901 C 221 1101 215 1281 207 1431', 4),
        S('sideR', 'M 411 331 C 405 501 403 701 405 901 C 409 1101 415 1281 423 1431', 4),
        S('front', 'M 303 300 C 301 600 299 1000 297 1431', 2, 0.85),
        S('hem', 'M 207 1431 C 261 1441 361 1443 423 1431', 3, 0.95),
        S('sleeveL', 'M 199 327 C 187 421 183 541 187 641', 3, 0.9),
        S('sleeveLin', 'M 227 381 C 221 461 219 541 223 621', 1.6, 0.55),
        S('cuffL', 'M 187 641 C 197 653 213 657 225 649', 2.2, 0.85),
        S('sleeveR', 'M 436 325 C 446 421 448 541 444 641', 3, 0.9),
        S('sleeveRin', 'M 409 381 C 413 461 415 541 411 621', 1.6, 0.55),
        S('cuffR', 'M 444 641 C 434 653 418 657 406 649', 2.2, 0.85),
        S('pocketL', 'M 231 641 C 251 643 267 643 281 641', 1.4, 0.5),
        S('pocketR', 'M 323 641 C 341 643 357 643 373 641', 1.4, 0.5),
        S('foldL', 'M 261 701 C 259 901 257 1151 253 1421', 1.3, 0.45),
        S('foldR', 'M 361 701 C 363 901 367 1151 373 1421', 1.3, 0.45),
      ],
    },
    '07': {
      name: 'ROBE COLONNE',
      strokes: [
        ...HEAD, ...NECK,
        S('neck', 'M 246 268 C 280 276 320 276 354 264', 2.6),
        S('armL', 'M 208 294 C 194 340 188 420 188 500 C 188 580 192 640 198 690', 2.6, 0.9),
        S('handL', 'M 198 690 C 194 708 196 724 204 734', 2, 0.85),
        S('armR', 'M 392 294 C 406 340 412 420 412 500 C 412 580 408 640 402 690', 2.6, 0.9),
        S('handR', 'M 402 690 C 406 708 404 724 396 734', 2, 0.85),
        S('dressL', 'M 246 268 C 230 270 216 280 208 294 C 214 340 220 400 228 470 C 232 520 228 600 222 700 C 216 900 210 1150 204 1431', 3.4),
        S('dressR', 'M 354 264 C 372 270 386 280 392 294 C 386 340 380 400 372 470 C 368 520 372 600 378 700 C 386 900 392 1150 398 1431', 3.4),
        S('hem', 'M 204 1431 C 260 1443 340 1443 398 1431', 3),
        S('thread', 'M 238 282 C 234 600 224 1000 216 1428', 1.8, 1, 'accent'),
      ],
      fills: [{ d: 'M 246 268 C 280 276 320 276 354 264 C 372 270 386 280 392 294 C 386 340 380 400 372 470 C 368 520 372 600 378 700 C 386 900 392 1150 398 1431 C 340 1443 260 1443 204 1431 C 210 1150 216 900 222 700 C 228 600 232 520 228 470 C 220 400 214 340 208 294 C 216 280 230 270 246 268 Z', col: 'ink', a: 0.94 }],
      over: ['thread'],
    },
    '12': {
      name: 'CAPE DE MINUIT',
      strokes: [
        ...HEAD, ...NECK,
        S('collarL', 'M 287 246 C 280 222 282 202 290 188', 2.6),
        S('collarR', 'M 340 242 C 348 220 350 200 344 186', 2.6),
        S('capeL', 'M 287 246 C 241 271 199 331 175 421 C 141 561 113 801 99 1151', 3.8),
        S('capeR', 'M 340 242 C 380 270 420 330 446 420 C 480 560 506 800 520 1150', 3.8),
        S('capeHemL', 'M 99 1151 C 141 1171 201 1177 249 1169', 3),
        S('capeHemR', 'M 371 1169 C 419 1177 479 1171 520 1150', 3),
        S('openL', 'M 296 420 C 280 600 262 900 249 1169', 2.4),
        S('openR', 'M 318 420 C 340 600 360 900 371 1169', 2.4),
        S('skirtL', 'M 251 1169 C 241 1251 231 1341 223 1431', 2.6),
        S('skirtR', 'M 369 1169 C 379 1251 391 1341 399 1431', 2.6),
        S('hem', 'M 223 1431 C 281 1443 341 1443 399 1431', 2.6),
        S('pleat1', 'M 300 440 C 290 700 276 950 266 1166', 1, 0.55),
        S('pleat2', 'M 304 440 C 300 700 294 950 288 1168', 1, 0.55),
        S('pleat3', 'M 308 440 C 310 700 312 950 312 1169', 1, 0.55),
        S('pleat4', 'M 312 440 C 320 700 330 950 336 1168', 1, 0.55),
        S('pleat5', 'M 315 440 C 330 700 344 950 356 1166', 1, 0.55),
      ],
      fills: [
        { d: 'M 287 246 C 300 250 322 250 340 242 C 380 270 420 330 446 420 C 480 560 506 800 520 1150 C 479 1171 419 1177 371 1169 C 360 900 340 600 318 420 L 296 420 C 280 600 262 900 249 1169 C 201 1177 141 1171 99 1151 C 113 801 141 561 175 421 C 199 331 241 271 287 246 Z', col: 'ink', a: 0.94 },
      ],
    },
    '19': {
      name: 'TAILLEUR BLANC',
      strokes: [
        ...HEAD, ...NECK,
        S('shoulderL', 'M 286 250 C 250 252 214 262 196 290 C 186 306 188 326 198 336', 3.6),
        S('shoulderR', 'M 350 248 C 386 252 420 262 438 290 C 448 306 446 326 436 336', 3.6),
        S('lapelL', 'M 286 252 C 292 320 300 400 316 500', 2.4, 0.9),
        S('lapelR', 'M 350 250 C 342 320 334 400 316 500', 2.4, 0.9),
        S('jacketL', 'M 214 340 C 230 420 246 480 256 520 C 236 560 220 600 212 640', 3.4),
        S('jacketR', 'M 422 340 C 406 420 392 480 382 520 C 402 560 418 600 428 640', 3.4),
        S('peplum', 'M 212 640 C 270 662 370 662 428 640', 3),
        S('waist', 'M 256 520 C 290 530 350 530 382 520', 1.6, 0.6),
        S('sleeveL', 'M 198 336 C 190 420 186 520 190 620', 3, 0.9),
        S('cuffL', 'M 190 620 C 198 632 212 636 222 630', 2, 0.8),
        S('sleeveR', 'M 436 336 C 444 420 448 520 444 620', 3, 0.9),
        S('cuffR', 'M 444 620 C 436 632 422 636 412 630', 2, 0.8),
        S('skirtL', 'M 238 652 C 230 900 222 1150 212 1431', 3.4),
        S('skirtR', 'M 404 652 C 412 900 420 1150 430 1431', 3.4),
        S('hem', 'M 212 1431 C 280 1443 360 1443 430 1431', 2.8),
        S('fold1', 'M 290 680 C 286 900 282 1150 278 1428', 1.3, 0.5),
        S('fold2', 'M 350 680 C 356 900 362 1150 368 1430', 1.3, 0.5),
      ],
      dots: [[316, 548, 5], [316, 596, 5]],
    },
    '31': {
      name: 'LA DERNIÈRE HEURE',
      strokes: [
        ...HEAD, ...NECK, ...SHOULDERS,
        S('collarTop', 'M 190 298 C 227 302 262 310 298 314 C 336 316 373 304 414 286', 4.2),
        S('collarBot', 'M 195 324 C 232 332 266 340 300 340 C 338 340 375 326 411 308', 3, 0.9),
        S('collarFoldA', 'M 241 309 C 246 318 248 326 246 334', 1.4, 0.5),
        S('collarFoldB', 'M 352 310 C 356 317 357 324 355 331', 1.4, 0.5),
        S('bodiceL', 'M 230 332 C 236 384 246 434 258 478', 3.6),
        S('bodiceR', 'M 382 320 C 374 372 362 426 346 472', 3.6),
        S('basque', 'M 258 478 C 274 486 289 496 300 507 C 312 494 329 481 346 472', 2.8, 0.95),
        S('seam', 'M 298 344 C 297 402 298 452 300 502', 1.2, 0.35),
        S('skirtL', 'M 258 478 C 240 560 200 680 160 820 C 120 960 92 1120 86 1300 C 85 1335 88 1360 94 1376', 4.6),
        S('skirtR', 'M 346 472 C 366 560 406 680 444 820 C 486 970 520 1120 540 1262 C 556 1332 580 1366 598 1390', 4.6),
        S('hem', 'M 94 1376 C 140 1418 230 1442 320 1443 C 420 1443 500 1425 560 1405 C 578 1399 590 1394 598 1390', 3.4, 0.95),
        S('armL', 'M 192 304 C 180 330 175 370 174 420 C 173 460 172 490 174 515 C 176 560 180 620 186 676', 3, 0.9),
        S('armLin', 'M 226 352 C 214 400 206 450 202 500 C 200 540 198 600 199 672', 1.6, 0.55),
        S('handL', 'M 186 676 C 182 694 182 712 188 726 C 192 734 200 736 206 730', 2.4, 0.9),
        S('thumbL', 'M 199 674 C 206 688 208 700 204 710', 1.8, 0.8),
        S('lift', 'M 197 734 C 177 820 159 920 151 1040 C 147 1100 145 1160 147 1220', 1.8, 0.65),
        S('armR', 'M 414 288 C 426 310 432 350 436 400 C 439 430 442 455 442 470 C 430 488 404 506 376 520', 3, 0.9),
        S('armRin', 'M 388 342 C 398 380 408 420 416 456 C 404 472 388 486 370 500', 1.6, 0.55),
        S('handR', 'M 376 520 C 366 528 356 536 350 548 C 346 556 350 560 356 556', 2.4, 0.9),
        S('fingersR', 'M 370 500 C 362 504 354 512 348 522', 1.6, 0.7),
        S('foldA', 'M 276 499 C 250 621 214 801 188 981 C 168 1121 156 1261 152 1413', 2, 0.7),
        S('foldB', 'M 291 509 C 281 681 262 901 252 1101 C 246 1231 244 1341 246 1437', 1.6, 0.6),
        S('foldC', 'M 312 501 C 330 681 352 881 370 1081 C 382 1221 390 1331 396 1439', 1.6, 0.6),
        S('foldD', 'M 330 487 C 366 641 410 821 444 1001 C 470 1141 494 1271 512 1415', 2, 0.7),
        S('foldTrain', 'M 474 1150 C 504 1240 542 1320 590 1386', 1.6, 0.6),
        S('shade1', 'M 356 520 C 362 540 366 560 368 580', 1.1, 0.4),
        S('shade2', 'M 370 520 C 378 548 384 576 388 604', 1.1, 0.4),
        S('shade3', 'M 384 534 C 392 562 398 590 403 616', 1.1, 0.35),
      ],
      // the embroidery follows the lines of the first sketch: [id, sequins per 100 units, spread, thinning toward the end]
      emb: { lines: [['collarTop', 11, 4, 0], ['collarBot', 11, 4, 0], ['bodiceL', 7, 5, 0], ['bodiceR', 7, 5, 0], ['basque', 9, 4, 0],
        ['foldA', 6, 10, 0.75], ['foldB', 5, 8, 0.8], ['foldC', 5, 8, 0.8], ['foldD', 6, 10, 0.75], ['skirtL', 3, 6, 0.9], ['skirtR', 3, 6, 0.9], ['foldTrain', 4, 7, 0.7]],
        skirt: 'M 258 478 C 240 560 200 680 160 820 C 120 960 92 1120 86 1300 C 85 1335 88 1360 94 1376 C 140 1418 230 1442 320 1443 C 420 1443 500 1425 560 1405 C 578 1399 590 1394 598 1390 C 580 1366 556 1332 540 1262 C 520 1120 486 970 444 820 C 406 680 366 560 346 472 C 329 481 312 494 300 507 C 289 496 274 486 258 478 Z',
        fill: 'M 198 305 C 234 310 266 317 298 320 C 336 321 373 310 410 292 L 408 310 C 375 326 338 340 300 340 C 266 340 232 332 196 324 Z M 233 337 C 266 345 336 345 380 325 C 372 377 361 429 346 471 C 329 480 312 493 300 506 C 289 494 274 485 258 477 C 247 432 239 382 233 337 Z' },
    },
  };

  // ───────── preparation (cached per look) ─────────
  const cache = {};
  function prep(look) {
    if (cache[look]) return cache[look];
    const L = LOOKS[look];
    const strokes = L.strokes.map(({ id, d, w, a, col }) => {
      const sub = parsePath(d)[0], s = sample(sub, 2.5);
      return { ...s, id, w, a, col: col || 'ink', closed: !!sub.closed };
    });
    const gap = 26;   // pen lift between strokes, in viewBox units of "pen travel"
    let acc = 0;
    for (const s of strokes) { s.d0 = acc; acc += s.len; s.d1 = acc; acc += gap; }
    const out = { look, name: L.name, strokes, total: acc - gap, fills: L.fills || [], over: L.over || [], dots: L.dots || [] };
    if (L.emb) out.emb = buildEmbroidery(L.emb, strokes);
    return (cache[look] = out);
  }
  // Sequins: a dense field inside the collar and bodice, then lines of sequins along chosen strokes, thinning toward
  // the hem. Each has an order k0 0..1: the bodice is sewn first, then the embroidery runs down the folds.
  function buildEmbroidery(E, strokes) {
    const sq = [], byId = Object.fromEntries(strokes.map(s => [s.id, s]));
    const polys = parsePath(E.fill).map(sub => sample(sub, 4).pts);
    const inside = (x, y) => polys.some(poly => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; });
    const step = 8.6;
    for (let y = 290; y < 512; y += step) for (let x = 190; x < 415; x += step) {
      const row = Math.round((y - 290) / step), jx = x + (row % 2) * step * 0.5 + (hash(x * 0.37 + y * 1.3) - 0.5) * 3.4, jy = y + (hash(x * 1.7 + y * 0.29) - 0.5) * 3;
      if (!inside(jx, jy)) continue;
      const h2 = hash(jx * 0.11 + jy * 0.53);
      sq.push({ x: jx, y: jy, r: 2.5 + h2 * 1.5, rot: hash(jx + jy) * Math.PI, hue: hash(jx * 3.1 + jy), k0: clamp((jy - 290) / 220 * 0.34 + h2 * 0.05) });
    }
    E.lines.forEach(([id, dens, spread, thin], li) => {
      const s = byId[id];
      if (!s) return;
      const n = Math.max(2, Math.round((s.len / 100) * dens));
      for (let j = 0; j < n; j++) {
        const u = (j + 0.5) / n, p = pointOn(s, u * s.len), h1 = hash(li * 7.13 + j * 1.91), h2 = hash(li * 3.77 + j * 5.31);
        if (thin && h2 < Math.pow(u, 1.4) * thin) continue;                     // dissolving toward the hem
        const off = (h1 - 0.5) * 2 * spread;
        sq.push({ x: p[0] + p[2] * off, y: p[1] + p[3] * off, r: (2.3 + h2 * 2.0) * (1 - 0.35 * u * (thin ? 1 : 0)), rot: h1 * Math.PI,
          hue: hash(li * 11.3 + j), k0: clamp(0.3 + ((p[1] - 290) / 1150) * 0.66 + (h2 - 0.5) * 0.05) });
      }
    });
    // ombré: a scatter field in the skirt whose density falls with the distance from the waist
    if (E.skirt) {
      const sk = parsePath(E.skirt).map(sub => sample(sub, 6).pts)[0];
      const inSk = (x, y) => { let c = false; for (let i = 0, j = sk.length - 1; i < sk.length; j = i++) { const [xi, yi] = sk[i], [xj, yj] = sk[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
      for (let i = 0; i < 2600; i++) {
        const x = 80 + hash(i * 1.31 + 0.7) * 520, y = 500 + Math.pow(hash(i * 2.17 + 3.1), 1.7) * 940;
        if (!inSk(x, y)) continue;
        const fall = Math.pow(clamp((y - 500) / 900), 0.8);
        if (hash(i * 5.9 + 1.3) < fall * 0.97) continue;
        const h2 = hash(i * 7.7), bead = h2 > 0.72;
        sq.push({ x, y, r: bead ? 1.6 : 1.8 + h2 * 2.2 * (1 - 0.5 * fall), rot: bead ? -0.25 + hash(i) * 0.5 + Math.PI / 2 : hash(i * 3.3) * Math.PI, hue: hash(i * 9.1),
          bead, k0: clamp(0.34 + ((y - 500) / 940) * 0.62 + (h2 - 0.5) * 0.08) });
      }
    }
    sq.sort((a, b) => a.k0 - b.k0);
    return sq;
  }
  function pointOn(s, d) {
    const c = s.cum, P = s.pts;
    let lo = 0, hi = c.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (c[m] < d) lo = m; else hi = m; }
    const f = c[hi] > c[lo] ? (d - c[lo]) / (c[hi] - c[lo]) : 0, x = lerp(P[lo][0], P[hi][0], f), y = lerp(P[lo][1], P[hi][1], f);
    const dx = P[hi][0] - P[lo][0], dy = P[hi][1] - P[lo][1], l = Math.hypot(dx, dy) || 1;
    return [x, y, -dy / l, dx / l, lo, f];
  }

  // ───────── drawing ─────────
  // A tapered pen stroke: width rises over the first 6 % and thins over the last 18 %, with a slow pressure swell.
  function penStroke(ctx, s, upto, k, o) {
    const P = s.pts, c = s.cum, n = P.length;
    if (upto <= 0 || n < 2) return null;
    const endD = Math.min(upto, s.len), L = [], R = [];
    const taper = d => { const u = d / s.len; return clamp(u / 0.06, 0.25, 1) * (1 - 0.72 * Ease.inQ(rm(u, 0.82, 1))) * (0.86 + 0.14 * Math.sin(u * 9 + s.len * 0.01)); };
    let head = null;
    for (let i = 0; i < n; i++) {
      let x = P[i][0], y = P[i][1], d = c[i];
      if (d > endD) { const q = pointOn(s, endD); x = q[0]; y = q[1]; d = endD; }
      const a = P[Math.max(0, i - 1)], b = P[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
      const w = (s.w * taper(d) * k) / 2 + (o.minW || 0.35);
      L.push([x - (dy / l) * w, y + (dx / l) * w]); R.push([x + (dy / l) * w, y - (dx / l) * w]);
      head = [x, y, w];
      if (d >= endD) break;
    }
    ctx.beginPath();
    ctx.moveTo(L[0][0], L[0][1]);
    for (let i = 1; i < L.length; i++) ctx.lineTo(L[i][0], L[i][1]);
    for (let i = R.length - 1; i >= 0; i--) ctx.lineTo(R[i][0], R[i][1]);
    ctx.closePath();
    ctx.fill();
    return head;
  }
  // u: 0..1 of the whole drawing (pen travel incl. lifts). o: {P, alpha, color, nib (bool), weight, wash 0..1 (ink fills,
  // laid from the top; default: 1 once the drawing is complete)}. Returns the pen tip in screen px while drawing.
  function draw(ctx, look, cx, top, h, u, o = {}) {
    const Cq = prep(look), P = o.P || C_PAL(), s = h / VBH, D = clamp(u) * Cq.total, A = o.alpha ?? 1;
    const wash = o.wash ?? (u >= 1 ? 1 : 0);
    ctx.save();
    ctx.translate(cx - (VBW / 2) * s, top);
    ctx.scale(s, s);
    let head = null;
    const kw = (o.weight || 1) / Math.sqrt(s), minW = 0.45 / s;
    const pen = (st) => {
      if (D <= st.d0) return;
      ctx.fillStyle = st.col === 'ink' ? (o.color || P.ink) : P[st.col] || st.col;
      ctx.globalAlpha = A * st.a;
      const hd = penStroke(ctx, st, D - st.d0, kw, { minW });
      if (D < st.d1) head = hd;
    };
    for (const st of Cq.strokes) if (!Cq.over.includes(st.id)) pen(st);
    if (wash > 0) for (const f of Cq.fills) {                                   // ink wash, laid from the top down
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 0, VBW, 120 + wash * (VBH - 100)); ctx.clip();
      ctx.globalAlpha = A * (f.a ?? 1);
      ctx.fillStyle = f.col === 'ink' ? (o.color || P.ink) : P[f.col] || f.col;
      ctx.fill(f.path2d || (f.path2d = new Path2D(f.d)));
      ctx.restore();
    }
    for (const st of Cq.strokes) if (Cq.over.includes(st.id)) pen(st);
    if (u >= 1) for (const [x, y, r] of Cq.dots) { ctx.globalAlpha = A; ctx.fillStyle = o.color || P.ink; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
    ctx.globalAlpha = 1;
    if (head && o.nib !== false && u < 1) {                                     // the wet ink at the pen tip
      ctx.fillStyle = rgba(o.color || P.ink, 0.9 * A);
      ctx.beginPath(); ctx.arc(head[0], head[1], head[2] * 1.35 + 0.8 / s, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    return head ? [cx - (VBW / 2) * s + head[0] * s, top + head[1] * s] : null;
  }
  // Embroidery: sequins appear in order (k0 <= k), each settles from a small scale; glints travel with t.
  function sequins(ctx, look, cx, top, h, k, t, o = {}) {
    const C = prep(look), P = o.P || C_PAL(), s = h / VBH;
    if (!C.emb || k <= 0) return 0;
    const nacre = [P.accent2 || '#E6DCD3', '#EAD3CF', '#D9E3DA', '#DCDDEA', '#F1E6D2'], shade = P.ink;
    const gk = clamp((s - 0.2) / 0.43, 0.35, 1), hueGate = lerp(0.93, 0.72, clamp((s - 0.36) / 0.27));
    let shown = 0;
    ctx.save();
    ctx.translate(cx - (VBW / 2) * s, top); ctx.scale(s, s);
    for (const q of C.emb) {
      const a = (k - q.k0) / 0.06;
      if (a <= 0) break;
      shown++;
      const e = Ease.outQuint(clamp(a)), r = q.r * lerp(0.4, 1, e);
      const tint = nacre[Math.floor(q.hue * nacre.length) % nacre.length];
      ctx.save();
      ctx.translate(q.x, q.y); ctx.rotate(q.rot);
      ctx.globalAlpha = clamp(a * 2) * (o.alpha ?? 1);
      if (q.bead) {                                                             // champagne glass bead
        ctx.fillStyle = linear(ctx, 0, -r, 0, r, [[0, mix(P.accent || '#C8AD7F', '#FFFFFF', 0.6)], [0.5, P.accent || '#C8AD7F'], [1, P.accent3 || '#9C7F52']]);
        rr(ctx, -r * 2.6, -r * 0.75, r * 5.2, r * 1.5, r * 0.75); ctx.fill();
        ctx.restore();
        continue;
      }
      ctx.fillStyle = rgba(shade, 0.28);                                        // the sequin's shadow on the silk
      ctx.beginPath(); ctx.ellipse(0.6, 0.9, r, r * 0.82, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = radial(ctx, -r * 0.3, -r * 0.35, r * 0.1, r * 1.1, [[0, '#FFFFFF'], [0.45, tint], [1, mix(tint, P.accent || '#C8AD7F', 0.55)]]);
      ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.82, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = rgba(P.accent3 || '#9C7F52', 0.55); ctx.lineWidth = 0.5; ctx.stroke();
      ctx.restore();
      // the lamplight travels diagonally down the gown (a band every 2.4 s at any point); sequins inside it brighten
      // and the brightest flash a four-point glint
      // on a small plate the same band would cover many sequins per pixel and read as a white smear: the light and
      // the number of glints scale with the drawing's size on screen (gk 0.35 at plate size, 1 at the hero's size)
      const ph = ((t * 0.42 - q.x * 0.0009 - q.y * 0.00062) % 1 + 1) % 1, d = Math.min(ph, 1 - ph);
      const g = Math.exp(-(d * d) / (2 * 0.05 * 0.05)) * e;
      if (g > 0.04) {
        ctx.save();
        ctx.globalAlpha = g * 0.85 * gk * (o.alpha ?? 1);
        ctx.fillStyle = '#FFFDF6';
        ctx.beginPath(); ctx.ellipse(q.x - r * 0.25, q.y - r * 0.3, r * 0.62, r * 0.5, q.rot, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        if (q.hue > hueGate && g > 0.35) sparkle(ctx, q.x, q.y, (7 + 9 * g) / Math.sqrt(s), (g - 0.35) * 1.5 * gk * (o.alpha ?? 1), q.rot + t * 0.6, '#FFFFFF');
      }
    }
    ctx.restore();
    return shown;
  }
  const plates = {};
  function plate(look, h, P) {
    const key = look + '|' + Math.round(h);
    if (plates[key]) return plates[key];
    const s = h / VBH, b = makeBuf(Math.ceil(VBW * s), Math.ceil(h));
    draw(b.g, look, (VBW / 2) * s, 0, h, 1, { P, nib: false });
    if (prep(look).emb) sequins(b.g, look, (VBW / 2) * s, 0, h, 1, 0, { P });
    return (plates[key] = b.c);
  }
  const C_PAL = () => (typeof C !== 'undefined' ? C : { ink: '#16130F', accent: '#C8AD7F', accent2: '#E6DCD3', accent3: '#9C7F52' });
  // Where the closing gown stands in the atelier scene; the lineup scene starts from the same pixels (match cut).
  const HERO = { look: '31', cx: 1310, top: 64, h: 952 };
  // The atelier's hold is a slow push toward the gown (0.8 % per second from the end of its in-phase to its last frame);
  // the lineup scene starts from that pose (same pixels) and eases it back while the gown steps into its plate.
  const PUSH = { fx: 1310, fy: 520, rate: 0.008 };
  const pushAt = (lt, inSec) => 1 + PUSH.rate * Math.max(0, lt - inSec);
  V.croquis = { LOOKS, VBW, VBH, HERO, PUSH, pushAt, prep, draw, sequins, plate, parsePath, sample };
})();
