// wall (hook): "Notes nobody reads?" A wall of meeting notes writes itself while the camera pulls back from it; the
// question is written in black marker and "nobody" gets an orange circle. Hold (30-s cut): a sleepy reader nods off.
// Out: the camera settles at rest on the notes panel; the rescue starts on the same pixels (match).
(() => {
  SCENES['wall'] = {
    draw(ctx, t, env) {
      const lay = LB.layout(env), P0 = lay.P.notes, lt = env.lt, b = env.beatSec, ph = env.phase;
      const near = SN.view(P0.x + 640, P0.y + 600, 1.26), rest = LB.rest(P0);
      let cam = SN.lerpView(near, rest, Ease.ioC(rm(lt, -0.2, 2.8 * b)));
      if (ph.holdDur > 0) {                       // a slow lean toward the sleepy reader, back to rest for the cut
        const e = Math.sin(Math.PI * clamp(ph.hold / ph.holdDur)) * (1 - ph.out);
        cam = SN.view(cam.cx + 120 * e, cam.cy + 30 * e, cam.z * (1 + 0.03 * e));
      }
      LB.render(ctx, env, cam);
    },
  };
})();
