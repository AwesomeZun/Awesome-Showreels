// scenes/footage.js: one shot of an edit. The plan scene being drawn (REEL.drawing) names its frames; the frames
// already carry their own reel's vignette and bloom (grain off for the WebPs), so this project's post is off (style.json).
(() => {
  SCENES['footage'] = {
    draw(ctx, t, env) {
      const s = REEL.drawing, im = window.SIZZLE && SIZZLE.frame(s, t);
      if (im) { ctx.drawImage(im, 0, 0, W, H); return; }
      ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, W, H);
      console.error(`[sizzle] frame not prepared: ${s && s.footage ? s.footage.dir : '?'} t=${t.toFixed(4)}`);
    },
  };
})();
