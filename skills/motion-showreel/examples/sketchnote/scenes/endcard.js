// endcard: the title panel. The camera lands along the arrow, the blue banner and "Box it. Arrow it. Star it." are
// drawn, the orange star lands on "Star it.", Thursday's details are written, then the camera steps back to show the
// board (the whole board in the 30-s cut). Hold: the markers drop into the tray, the facilitator signs off.
(() => {
  SCENES['endcard'] = {
    draw(ctx, t, env) {
      const lay = LB.layout(env), P2 = lay.P.title, lt = env.lt, b = env.beatSec;
      let cam = LB.flightCam(env);
      if (!cam) {
        const fin = LB.panels.title.finalView(lay);
        const k = Ease.ioC(rm(lt, 5.5 * b, 7 * b)), hold = Math.max(0, lt - 7 * b);
        cam = SN.lerpView(LB.rest(P2), fin, k);
        cam = SN.view(cam.cx + Math.sin(hold * 0.5) * 10 * k, cam.cy + Math.sin(hold * 0.4) * 6 * k, cam.z * (1 + 0.006 * Math.sin(hold * 0.8) * k + 0.004 * hold * k));
      }
      LB.render(ctx, env, cam);
    },
  };
})();
