// kit (30-s cut): "3 markers. 3 jobs." The camera lands on the kit panel along the blue arrow; three markers drop in,
// pop their caps and show their jobs: black writes words, blue boxes the structure, orange stars the ONE thing.
// Out: the camera follows a loop arrow down to the title.
(() => {
  SCENES['kit'] = {
    draw(ctx, t, env) {
      const lay = LB.layout(env), P1 = lay.P.kit, lt = env.lt, ph = env.phase;
      let cam = LB.flightCam(env);
      if (!cam) {
        const hd = ph.holdDur > 0 ? Math.sin(Math.PI * clamp(ph.hold / ph.holdDur)) : 0;
        const settle = 1 - rm(lt, 1.5 * env.beatSec, 4 * env.beatSec);
        cam = SN.view(P1.cx + 30 * Math.sin(lt * 0.6) * hd, P1.cy - 10 * hd, (1 + 0.01 * settle * Math.sin(lt * 2)) * (1 + 0.02 * hd));
      }
      LB.render(ctx, env, cam);
    },
  };
})();
