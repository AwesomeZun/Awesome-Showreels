// map (2 bars, up to 3 in the 30): "No signal? No problem." A top-down map of the loop in four greens: dithered
// meadow, contour lines, a winding creek and stands of trees. The signal icon shows crossed bars and NO SIGNAL blinks
// (beat 1); the route draws itself a few pixels per step behind a blinking you-are-here cursor; on beat 3 a stamp
// lands: OFFLINE MAP *. The map pans one pixel every other step. Footer: the region size and the trail name.
(() => {
  const ROUTE = (() => { const pts = []; for (let i = 0; i <= 120; i++) { const u = i / 120, a = u * Math.PI * 2; pts.push([118 + Math.cos(a) * 70 + Math.sin(a * 3) * 9, 66 + Math.sin(a) * 34 + Math.cos(a * 2) * 6]); } return pts; })();
  SCENES['map'] = {
    draw(ctx, t, env) {
      const P = window.POCKET;
      P.present(ctx, env, (g, T, b) => {
        const pan = Math.floor(T * P.STEP / 2);
        P.cls(g, 2);
        for (let y = 12; y < 124; y++) for (let x = 0; x < 240; x++) {           // meadow texture and contours
          const X = x + pan, h = Math.sin(X * 0.045) * 6 + Math.cos(y * 0.07 + X * 0.012) * 7 + y * 0.12;
          if (Math.abs((h % 6 + 6) % 6 - 3) < 0.35) P.px(g, x, y, 1);
          else if (P.dith(X, y, 0.12)) P.px(g, x, y, 3);
        }
        for (let x = 0; x < 240; x++) { const y = Math.round(40 + Math.sin((x + pan) * 0.05) * 14 + Math.sin((x + pan) * 0.13) * 4); P.rect(g, x, y, 1, 3, 0); }   // the creek
        for (let k = 0; k < 26; k++) { const x = ((k * 37 + 11) % 260) - pan % 260, y = 20 + (k * 53) % 96; if (x > -4 && x < 240) { P.rect(g, x, y, 3, 3, 1); P.px(g, x + 1, y - 1, 1); } }
        // the route: dashed, drawn on behind the cursor
        const n = Math.min(ROUTE.length - 1, Math.floor(Math.max(0, b - 0.5) * 22));
        for (let i = 1; i <= n; i++) if (i % 3) P.line(g, ROUTE[i - 1][0] - pan * 0.2, ROUTE[i - 1][1], ROUTE[i][0] - pan * 0.2, ROUTE[i][1], 0);
        const head = ROUTE[n];
        if (Math.floor(T * P.STEP / 2) % 2 === 0) { P.rect(g, head[0] - pan * 0.2 - 2, head[1] - 2, 5, 5, 0); P.rect(g, head[0] - pan * 0.2 - 1, head[1] - 1, 3, 3, 3); }
        // top bar: signal and title
        P.rect(g, 0, 0, 240, 11, 0); P.text(g, 'GRANITE SADDLE', 4, 2, 3);
        for (let k = 0; k < 4; k++) P.rect(g, 214 + k * 3, 8 - k * 2, 2, 2 + k * 2, 1);
        if (b >= 1) { P.line(g, 212, 1, 225, 9, 3); if (b < 3 && Math.floor(b * 4) % 2 === 0) P.text(g, 'NO SIGNAL', 150, 2, 3); }
        // stamp on beat 3
        if (b >= 3) { const w = 104; P.box(g, 68, 52, w, 21, { fill: 3 }); P.textC(g, 'OFFLINE MAP *', 120, 59, 0); }
        // footer
        P.rect(g, 0, 124, 240, 11, 0); P.text(g, '12 MB  `  READY WITHOUT SIGNAL', 4, 126, 3);
      });
    },
  };
})();
