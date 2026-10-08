// modules/footage.js: frames of other motion-showreel reels as a carrier ("footage"), for sizzle edits.
// Every plan scene with a `footage` field ({dir, fps, pad, n}) shows the PNG frames that build.py rendered from the
// source reel with the runtime (build/footage/<dir>/NNNN.png): frame i shows source time src0 + (i - pad) / fps, and
// the scene's local time lt maps to frame round(lt * fps) + pad, so the margins on both sides feed the compositor's
// transitions (the outgoing scene runs on after its end, the incoming one starts before its first bar line).
// frames.mjs awaits SIZZLE.prepare(t) before each frame; it decodes exactly the frames that time needs.
(() => {
  const ROOT = '/project/build/footage/';
  const cache = new Map();
  const url = (f, i) => `${ROOT}${f.dir}/${String(i).padStart(4, '0')}.png`;
  const index = (s, t) => Math.max(0, Math.min(s.footage.n - 1, Math.round((t - s.t0) * s.footage.fps) + s.footage.pad));
  window.SIZZLE = {
    async prepare(t) {
      const need = new Set();
      for (const s of REEL.plan.scenes) if (s.footage && t >= s.t0 - 1.5 && t < s.t1 + 1.5) need.add(url(s.footage, index(s, t)));
      for (const u of [...cache.keys()]) if (!need.has(u)) cache.delete(u);
      await Promise.all([...need].filter(u => !cache.has(u)).map(async u => {
        const im = new Image();
        im.src = u;
        await im.decode();
        cache.set(u, im);
      }));
    },
    frame(s, t) { return s && s.footage ? cache.get(url(s.footage, index(s, t))) || null : null; },
  };
})();
