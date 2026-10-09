// rescue (hero): Box it. Arrow it. Star it. The eraser wipes the question, the blue marker boxes three phrases inside
// the wall, they lift off, the rest is erased (its ghost stays), they land as a diagram, two arrows, ONE orange star,
// "Notes people see." Hold (30-s cut): icons, a margin note, dot votes. Out: the camera follows a big blue arrow to
// the next panel (kit in the 30-s cut, the title in the short cut).
(() => {
  SCENES['rescue'] = {
    draw(ctx, t, env) {
      const lay = LB.layout(env), P0 = lay.P.notes, lt = env.lt, b = env.beatSec, ph = env.phase;
      let cam = LB.flightCam(env);
      if (!cam) {
        const lean = Math.sin(Math.PI * rm(lt, 0.7 * b, 4.9 * b));                 // lean into the wall while boxing
        const pull = Math.sin(Math.PI * rm(lt, 6.2 * b, 9.4 * b)) * 0.5;           // breathe out as the title lands
        const hd = ph.holdDur > 0 ? Math.sin(Math.PI * clamp(ph.hold / ph.holdDur)) : 0;
        cam = SN.view(P0.cx - 70 * lean + 40 * hd * Math.sin(lt * 0.5), P0.cy + 30 * lean - 20 * hd, (1 + 0.05 * lean - 0.012 * pull) * (1 + 0.025 * hd));
      }
      LB.render(ctx, env, cam);
      const land = lt - 4.5 * b;                                                   // the boxes land: a small thump
      if (land > 0 && land < 0.4) env.fx.shake = Math.max(env.fx.shake, 5 * Math.exp(-land * 14));
    },
  };
})();
