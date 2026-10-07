#!/usr/bin/env python3
"""Check a soundtrack against its cut: SFX sync per cue, beat grid / tempo, duration, loudness and true peak.

  python3 verify_sync.py --wav P/build/music-30.wav --cut P/build/cut-30.json
  python3 verify_sync.py --wav P/build/mix-30.m4a --cut P/build/cut-30.json --png P/build/review/sync-30.png
  python3 verify_sync.py --wav reel.mp4 --cut P/build/cut-30.json --zoom P/build/review/zoom-30/

Accepts any audio or video file (decoded by ffmpeg). Per cue it reports two measurements:
  onset  - 10 ms hop, multi-band log-energy derivative, peak near the expected onset (parabolic sub-frame);
  match  - when the arranger's sidecar (music-<cut>.json, or the bed's sidecar named by a mix's mix-<cut>.json) is
           found, the exact SFX instance is re-synthesized and cross-correlated with the file: precise to the sample
           and not fooled by a drum hit on the same beat.
The two are reconciled per cue. A tonal template correlates almost equally one period early or late, so with a
strong onset (prominence >= --strong-onset) the match is taken within half a period of it. A match below
--override-ncc that disagrees with a strong in-tolerance onset (a voice line or a busy bed over the SFX) yields to
the onset; a confident match that still disagrees is reported "ambiguous" (listen; not a failure). A cue fails when
its offset exceeds --tol (default one video frame, 1/fps of the cut). Also checked: duration, tempo and beat phase
(a longer cut must keep the BPM), integrated loudness (-14 +-1 LUFS) and true peak (<= -1 dBTP) unless the sidecar
marks the file as an unmastered stem or --no-loudness is given. For a narrated mix the cues under a voice line are
marked "vo" in the table; the stem (music-<cut>-stem.wav) carries the same cues without the voice.
Exit codes: 0 pass, 1 a check failed, 2 bad input.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys

import numpy as np
from scipy import signal

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.dont_write_bytecode = True   # keep the skill folder free of __pycache__
import synth as S  # noqa: E402

HOP = 0.010
WIN = 0.020
BANDS = ((30, 200), (200, 1500), (1500, 6000), (6000, 16000))
ONSET_BIAS = -0.001  # measured: the 2-point log-energy derivative reads -2.7 ms (silence) .. +1.0 ms (over a pad)


# ───────────────────────────── analysis ─────────────────────────────

def onset_function(x, sr=S.SR):
    """Multi-band log-energy derivative (positive part), one value per 10 ms hop. Zero-phase band filters.
    Returns (odf, frame_times) where frame_times are window centres."""
    pad = int(round(0.05 * sr))          # leading silence so a sound that starts at t = 0 still has a rise
    mono = np.concatenate([np.zeros(pad), np.atleast_2d(x).mean(axis=0)])
    hop, win = int(round(HOP * sr)), int(round(WIN * sr))
    n = max(1, 1 + (len(mono) - win) // hop)
    w = np.hanning(win)
    odf = np.zeros(n)
    for lo, hi in BANDS:
        sos = signal.butter(2, [lo, min(hi, sr * 0.45)], btype="bandpass", fs=sr, output="sos")
        y = signal.sosfiltfilt(sos, mono)
        fr = np.lib.stride_tricks.sliding_window_view(y, win)[::hop][:n]
        e = np.sum((fr * w) ** 2, axis=1) / np.sum(w ** 2)
        L = 10 * np.log10(e + 1e-10)
        L = np.maximum(L, L.max() - 80)               # floor: silence must not create huge derivatives
        d = np.diff(L, prepend=L[0])
        odf += np.maximum(0, d)
    times = np.arange(n) * HOP + WIN / 2 - pad / sr
    return odf, times


def _peak_near(odf, times, t, half):
    a = max(1, int(np.searchsorted(times, t - half)))
    b = min(len(odf) - 1, int(np.searchsorted(times, t + half)) + 1)
    if b <= a:
        return None, 0.0
    i = a + int(np.argmax(odf[a:b]))
    y0, y1, y2 = odf[i - 1], odf[i], odf[i + 1] if i + 1 < len(odf) else odf[i]
    den = y0 - 2 * y1 + y2
    frac = 0.5 * (y0 - y2) / den if den < -1e-9 else 0.0
    tp = times[i] + float(np.clip(frac, -0.5, 0.5)) * HOP - ONSET_BIAS
    lo, hi = max(0, int(np.searchsorted(times, t - 1.0))), int(np.searchsorted(times, t + 1.0))
    base = float(np.median(odf[lo:hi])) if hi > lo else 0.0
    return tp, float(odf[i] / (base + 0.5))


_ATTACK = {}


def attack_time(name, family):
    """Seconds for a default instance of this SFX to reach half its peak envelope (cached). Soft attacks
    (> 30 ms: zaps, swells, drones) cannot be timed by onset detection."""
    key = (name, family)
    if key not in _ATTACK:
        try:
            st, anc, d, _ = S.render_sfx(name, {}, family=family, seed=1)
            env = np.convolve(np.abs(st).max(axis=0), np.ones(96) / 96, mode="same")
            _ATTACK[key] = float(np.argmax(env >= 0.5 * env.max()) / S.SR)
        except Exception:
            _ATTACK[key] = 0.0
    return _ATTACK[key]


def onset_near(odf, times, t, tol):
    """Is there a clear onset within tol of t? Prefer the strongest peak inside +-tol when it reaches half of the
    strongest peak in a wider +-(tol + 30 ms) window; otherwise report the wider peak (an offset beyond tol)."""
    wide = max(0.03, tol + 0.03)
    tw, pw = _peak_near(odf, times, t, wide)
    tn, pn = _peak_near(odf, times, t, max(tol, 0.012))
    if tn is not None and (pn >= 1.5 or tw is None or abs(tw - t) <= tol):
        return tn, pn
    return tw, pw


def envelope_peak(x, t, half=0.15, sr=S.SR):
    """Time of the smoothed (10 ms) energy maximum near t: where a whoosh peaks."""
    mono = np.atleast_2d(x).mean(axis=0)
    a, b = max(0, int((t - half) * sr)), min(len(mono), int((t + half) * sr))
    if b - a < 10:
        return None
    seg = signal.sosfiltfilt(signal.butter(2, 300, "highpass", fs=sr, output="sos"), mono[a:b]) ** 2
    seg = np.convolve(seg, np.ones(int(0.01 * sr)) / int(0.01 * sr), mode="same")
    return (a + int(np.argmax(seg))) / sr


def alias_period(tpl, sr=S.SR):
    """Fundamental period of a tonal template (s): the 2-25 ms lag of its strongest autocorrelation peak, when that
    peak reaches 0.6. Correlation lags one such period apart are near-ties (aliases). None for noisy templates."""
    n = min(len(tpl), int(0.2 * sr))
    t = tpl[:n] - tpl[:n].mean()
    ac = signal.fftconvolve(t, t[::-1], mode="full")[n - 1:]
    if n < int(0.03 * sr) or ac[0] <= 0:
        return None
    ac = ac / ac[0]
    lo, hi = int(0.002 * sr), min(len(ac) - 2, int(0.025 * sr))
    pk = [k for k in signal.argrelmax(ac[:hi + 1], order=max(1, int(0.0005 * sr)))[0] if k >= lo]
    if not pk:
        return None
    k = max(pk, key=lambda i: ac[i])
    return k / sr if ac[k] >= 0.6 else None


def matched_offset(mix_hp, start, template, search=0.1, sr=S.SR, hint=None, strong=False):
    """Normalized cross-correlation of an SFX template against the high-passed mix around `start`.
    hint: onset offset (s, relative to start) from the onset detector; strong: that onset is prominent enough to
    resolve period aliases of a tonal template (the lag is then taken within half a period of it).
    Returns (offset seconds, peak NCC 0..1, z = how far the peak stands above the other lags)."""
    m = len(template)
    if m < 32:
        return None, 0.0, 0.0
    a = int(round((start - search) * sr))
    b = int(round((start + search) * sr)) + m
    pad_l = max(0, -a)
    a = max(0, a)
    b = min(len(mix_hp), b)
    seg = mix_hp[a:b]
    if len(seg) < m + 2:
        return None, 0.0, 0.0
    tpl = template - template.mean()
    tn = np.sqrt(np.sum(tpl ** 2)) + 1e-12
    num = signal.fftconvolve(seg, tpl[::-1], mode="valid")
    cs = np.concatenate([[0.0], np.cumsum(seg ** 2)])
    den = np.sqrt(np.maximum(cs[m:] - cs[:-m], 1e-12)) * tn
    ncc = num / den[: len(num)]
    k = int(np.argmax(ncc))
    lag = (a + k - pad_l) / sr - start if pad_l == 0 else (a + k) / sr - start
    if 0 < k < len(ncc) - 1:   # parabolic sub-sample refinement
        y0, y1, y2 = ncc[k - 1], ncc[k], ncc[k + 1]
        d = y0 - 2 * y1 + y2
        if d < 0:
            lag += 0.5 * (y0 - y2) / d / sr
    far = np.abs(np.arange(len(ncc)) - k) > int(0.004 * sr)       # exclude the peak's own lobe
    rest = np.abs(ncc[far]) if far.any() else np.abs(ncc)
    z = float((ncc[k] - rest.mean()) / (rest.std() + 1e-9))
    if z < 6:
        # Tonal template: the fine correlation repeats every period, so several lags (nearly) tie and the music under
        # the SFX can lift a wrong one. A tone is timed by its ATTACK: correlate attack curves (positive log-envelope
        # derivative, 1 ms resolution) inside the template's own band, then take the best fine peak within 1.5 ms.
        band = _template_band(tpl, sr)
        dec = max(1, int(0.001 * sr))
        ta, ma = _attack_curve(tpl, sr, band, dec), _attack_curve(seg, sr, band, dec)
        edge = 25                                   # filter start-up at an inner segment edge is not an attack
        if a > 0:
            ma[:edge] = 0
        if b < len(mix_hp):
            ma[-edge:] = 0
        corr = signal.fftconvolve(ma, ta[::-1], mode="valid") if len(ma) > len(ta) + 2 and ta.any() else np.zeros(0)
        if len(corr) and corr.max() > 3 * (np.median(corr) + 1e-9):
            # attack alignments propose alias-free candidates; the full-waveform NCC chooses among them
            env = np.convolve(np.abs(tpl), np.ones(dec) / dec, mode="same")
            att = float(np.argmax(env >= 0.5 * env.max())) / sr
            w = int(np.clip(att / 2, 0.0015, 0.008) * sr)
            pk = list(signal.argrelmax(corr, order=3)[0]) + [int(np.argmax(corr))]
            pk = sorted({i for i in pk if corr[i] >= 0.5 * corr.max()}, key=lambda i: -corr[i])[:6]
            best = None
            for kc in pk:
                lo, hi = max(0, kc * dec - w), min(len(ncc), kc * dec + w + 1)
                if hi <= lo:
                    continue
                k2 = lo + int(np.argmax(ncc[lo:hi]))
                if best is None or ncc[k2] > ncc[best]:
                    best = k2
            if best is not None:
                k = best
                lag = (a + k) / sr - start
        elif hint is not None:
            pk = signal.argrelmax(ncc, order=max(1, int(0.0005 * sr)))[0]
            wide = [i for i in pk if ncc[i] >= 0.85 * ncc[k]] or [k]
            k = min(wide, key=lambda i: abs((a + i) / sr - start - hint))
            lag = (a + k) / sr - start
    if hint is not None and strong:
        # Period aliases: the bed under a tonal SFX (same key, same pad) lifts the lag one or two periods away above
        # the true one. A strong onset is alias-free, so search only within half a period of it.
        per = alias_period(tpl, sr)
        if per:
            c = int(round((start + hint) * sr)) - a
            half = int(per / 2 * sr) + int(0.0005 * sr)
            lo, hi = max(0, c - half), min(len(ncc), c + half + 1)
            if hi - lo > 2:
                k2 = lo + int(np.argmax(ncc[lo:hi]))
                if ncc[k2] >= 0.6 * ncc[k] and k2 != k:
                    k = k2
                    lag = (a + k) / sr - start
                    if 0 < k < len(ncc) - 1:
                        y0, y1, y2 = ncc[k - 1], ncc[k], ncc[k + 1]
                        d = y0 - 2 * y1 + y2
                        if d < 0:
                            lag += 0.5 * (y0 - y2) / d / sr
    return lag, float(ncc[k]), z


def _template_band(tpl, sr):
    """Band holding the central 80 % of the template's energy above 150 Hz (widened a little)."""
    f, P = signal.welch(tpl, fs=sr, nperseg=min(2048, max(64, len(tpl))))
    P = np.where(f < 150, 0.0, P)
    if P.sum() <= 0:
        return (150.0, sr * 0.45)
    c = np.cumsum(P) / P.sum()
    lo = float(f[min(len(f) - 1, np.searchsorted(c, 0.1))]) * 0.8
    hi = float(f[min(len(f) - 1, np.searchsorted(c, 0.9))]) * 1.25
    lo = max(150.0, lo)
    return (lo, float(min(sr * 0.45, max(hi, lo * 2))))


def _attack_curve(x, sr, band, dec):
    y = signal.sosfiltfilt(signal.butter(2, band, btype="bandpass", fs=sr, output="sos"), x)
    e = signal.sosfiltfilt(signal.butter(2, 150, fs=sr, output="sos"), np.abs(y))[::dec]
    L = 20 * np.log10(np.maximum(e, 1e-7))
    L = np.maximum(L, L.max() - 60)
    return np.maximum(0, np.diff(L, prepend=L[0]))


def tempo_and_phase(odf, times, bpm, t0=0.0, t1=None, span=0.06):
    """Comb-filter tempo search around the expected BPM (+-span) and the beat phase at that tempo.
    Returns {bpm, phaseMs, contrast} where contrast = mean ODF on the grid / mean ODF overall."""
    t1 = times[-1] if t1 is None else t1
    sel = (times >= t0) & (times <= t1)
    o, tm = odf[sel], times[sel]
    if len(o) < 50 or o.sum() <= 0:
        return None
    best = (-1, None, None)
    cands = np.arange(bpm * (1 - span), bpm * (1 + span), 0.05)
    for cb in cands:
        T = 60.0 / cb
        k = np.arange(int((tm[-1] - tm[0]) / T))
        phases = np.arange(0, T, 0.005)
        pos = tm[0] + phases[:, None] + k[None, :] * T
        vals = np.interp(pos, tm, o).mean(axis=1)
        j = int(np.argmax(vals))
        if vals[j] > best[0]:
            best = (vals[j], cb, (tm[0] + phases[j]) % T)
    score, cb, ph = best
    T = 60.0 / cb
    ph = ph - T if ph > T / 2 else ph
    # phase at the EXPECTED tempo (grid anchored at 0): where do onsets sit relative to the bar grid?
    Te = 60.0 / bpm
    k = np.arange(int((tm[-1] - tm[0]) / Te) + 1)
    phases = np.arange(-Te / 2, Te / 2, 0.002)
    pos = np.clip(phases[:, None] + (np.ceil(tm[0] / Te) + k[None, :]) * Te, tm[0], tm[-1])
    vals = np.interp(pos, tm, o).mean(axis=1)
    pe = float(phases[int(np.argmax(vals))])
    return {"bpm": round(float(cb), 2), "phaseMs": round(pe * 1000, 1), "contrast": round(float(vals.max() / (o.mean() + 1e-9)), 2)}


# ───────────────────────────── main check ─────────────────────────────

def read_mix_report(wav):
    """mix_vo.py report next to a mix (mix-<cut>[-embed].wav|m4a -> mix-<cut>.json), else None."""
    base = re.sub(r"-embed$", "", os.path.splitext(wav)[0])
    p = base + ".json"
    try:
        with open(p) as f:
            j = json.load(f)
        return j if isinstance(j, dict) and "lines" in j and "duck" in j else None
    except (OSError, ValueError):
        return None


def find_report(wav, cut_path, cut_name, explicit):
    if explicit:
        return explicit if os.path.exists(explicit) else None
    base = os.path.splitext(wav)[0]
    cands = [base + ".json"]
    m = re.match(r"^(.*?)(-embed)?$", base)
    if m:
        cands.append(m.group(1) + ".json")
    d = os.path.dirname(os.path.abspath(cut_path))
    mix = read_mix_report(wav)
    if mix and mix.get("bed"):                       # a narrated mix: the bed's own sidecar holds the cues
        bed = os.path.join(os.path.dirname(d), mix["bed"])
        cands.append(os.path.splitext(bed)[0] + ".json")
    tag = re.sub(r"^(music|mix)-", "", os.path.basename(m.group(1) if m else base))
    cands += [os.path.join(d, f"music-{tag}.json"), os.path.join(d, f"music-{tag}-stem.json"),
              os.path.join(d, f"music-{cut_name}.json"), os.path.join(d, f"music-{cut_name}-stem.json")]
    for c in cands:
        if os.path.exists(c):
            try:
                with open(c) as f:
                    j = json.load(f)
                if isinstance(j, dict) and "cues" in j and "bpm" in j:
                    return c
            except Exception:
                pass
    return None


def time_map(args, rep):
    if args.scale:
        return lambda t: t * args.scale, lambda t: args.scale
    if args.warp:
        knots = sorted((float(sc), float(out)) for out, sc in (k.split(":") for k in args.warp.split(",")))
        s = np.array([k[0] for k in knots])          # scene seconds
        o = np.array([k[1] for k in knots])          # output seconds
        return (lambda t: float(np.interp(t, s, o))), (lambda t: 1.0)
    if rep and (rep.get("scale") not in (None, 1, 1.0) or rep.get("warp")):
        if rep.get("warp"):
            o = np.array([w[0] for w in rep["warp"]])
            s = np.array([w[1] for w in rep["warp"]])
            return (lambda t: float(np.interp(t, s, o))), (lambda t: 1.0)
        sc = float(rep["scale"])
        return (lambda t: t * sc), (lambda t: sc)
    return (lambda t: t), (lambda t: 1.0)


def check(args):
    cut = json.load(open(args.cut))
    cut_name = str(cut.get("cut", ""))
    fps = float(cut.get("fps") or 60)
    tol = args.tol if args.tol is not None else 1.0 / fps
    x = S.read_audio(args.wav)
    dur_audio = x.shape[1] / S.SR
    rep_path = find_report(args.wav, args.cut, cut_name, args.report)
    rep = json.load(open(rep_path)) if rep_path else None
    W, _ = time_map(args, rep)
    bpm = float(rep["bpm"]) if rep else float(cut.get("bpm", 120)) / (args.scale or 1.0)
    exp_dur = float(rep["duration"]) if rep else W(float(cut["duration"]))
    out = {"file": os.path.basename(args.wav), "cut": cut_name, "report": os.path.basename(rep_path) if rep_path else None,
           "tolMs": round(tol * 1000, 1), "checks": {}, "cues": []}
    fails, warns = [], []

    # duration
    dd = dur_audio - exp_dur
    lossy = not args.wav.lower().endswith((".wav", ".flac", ".aif", ".aiff"))
    out["checks"]["duration"] = {"audio": round(dur_audio, 4), "expected": round(exp_dur, 4), "diffMs": round(dd * 1000, 1)}
    if dd < -max(0.005, 1.0 / fps) or dd > (0.06 if lossy else max(0.005, 1.0 / fps)):
        fails.append(f"duration {dur_audio:.3f}s vs cut {exp_dur:.3f}s ({dd * 1000:+.0f} ms)")
    elif lossy and dd > 0.002:
        out["checks"]["duration"]["note"] = "codec end padding (start alignment is what matters)"

    # loudness
    stem = bool(rep and rep.get("stem") and os.path.basename(args.wav) == rep.get("file"))   # only the stem itself
    m = S.measure(x)
    out["checks"]["loudness"] = {k: m[k] for k in ("lufs", "truePeak", "samplePeak", "lra", "maxMomentary")}
    if not args.no_loudness and not stem:
        if abs(m["lufs"] - args.lufs) > args.lufs_tol:
            fails.append(f"integrated {m['lufs']:.2f} LUFS (target {args.lufs:g} +-{args.lufs_tol:g})")
        if m["truePeak"] > args.tp + 0.05:
            fails.append(f"true peak {m['truePeak']:.2f} dBTP > {args.tp:g}")
    elif stem:
        out["checks"]["loudness"]["note"] = "unmastered stem: loudness not enforced"

    # voice spans of a narrated mix (cues under a line are annotated; the stem carries them without the voice)
    mix = read_mix_report(args.wav)
    vo_spans = [(float(ln["t0"]) - 0.12, float(ln["t1"]) + 0.15) for ln in (mix or {}).get("lines", [])
                if "t0" in ln and "t1" in ln]
    if mix:
        out["mix"] = {"lines": len(vo_spans), "placeholder": bool(mix.get("placeholder")), "bed": mix.get("bed")}
        if mix.get("placeholder"):
            warns.append("placeholder narration (dry-run clips): not for delivery")

    # cues
    odf, times = onset_function(x)
    mono_hp = signal.sosfiltfilt(signal.butter(2, 150, "highpass", fs=S.SR, output="sos"), x.mean(axis=0))
    placed = rep.get("cues", []) if rep else []
    cues = []
    if rep and abs(float(rep.get("sceneDuration", cut["duration"])) - float(cut["duration"])) > 1e-3:
        fails.append(f"stale audio: built for a {rep.get('sceneDuration')} s plan, the cut is {cut['duration']} s (re-run arrange.py)")
    if placed:
        # the cut is the source of truth: every expected time is re-derived from it, never taken from the sidecar
        want = {}
        for c in cut.get("cues") or []:
            want.setdefault(str(c.get("sfx")), []).append(float(c["t"]))
        scene_t0 = {str(sc.get("id")): float(sc.get("t0", 0)) for sc in cut.get("scenes") or []}
        seen = set()
        for p in placed:
            if p.get("auto"):
                if str(p.get("scene")) not in scene_t0:
                    fails.append(f"stale audio: transition SFX for scene {p.get('scene')!r} not in the cut")
                    continue
                exp_t = W(scene_t0[str(p["scene"])])
            else:
                ts = want.get(str(p["sfx"]), [])
                j = next((k for k, v in enumerate(ts) if abs(v - float(p.get("sceneT", -1))) < 1e-4), None)
                if j is None:
                    fails.append(f"stale audio: cue {p['sfx']!r} at {p.get('sceneT')} s is not in the cut (re-run arrange.py)")
                    continue
                seen.add((str(p["sfx"]), round(ts[j], 6)))
                exp_t = W(ts[j])
            cues.append({"t": exp_t, "sfx": p["sfx"], "name": p["name"], "anchor": p["anchor"], "scene": p.get("scene"),
                         "auto": p.get("auto", False), "placed": p, "delta": float(p["t"]) - exp_t})
        for spec, ts in want.items():
            for v in ts:
                if (spec, round(v, 6)) not in seen:
                    fails.append(f"cue {spec!r} at {v:.3f} s is missing from the audio (unknown SFX or stale audio)")
    else:
        for c in cut.get("cues") or []:
            try:
                layers = S.parse_sfx(c["sfx"])
            except ValueError as e:
                fails.append(f"cue {c.get('t')}: {e}")
                continue
            for name, prm in layers:
                cues.append({"t": W(float(c["t"])), "sfx": c["sfx"], "name": name, "anchor": S.SFX[name].anchor,
                             "scene": c.get("scene"), "auto": False, "params": prm})
    beat = 60.0 / bpm
    errs = []
    for c in cues:
        t = c["t"]
        r = {"t": round(t, 4), "sfx": c["sfx"], "layer": c["name"], "anchor": c["anchor"], "scene": c["scene"]}
        if c.get("auto"):
            r["auto"] = True
        expected = t
        prm = (c.get("placed") or {}).get("params", c.get("params") or {})
        if c["anchor"] == "span" and prm.get("pre"):
            try:
                expected = t - S.parse_time(prm["pre"], beat, 4, 1.0)
            except ValueError:
                pass
        verdict, off = "n/a", None
        onset_off, onset_prom = None, 0.0
        if any(a0 <= t <= a1 for a0, a1 in vo_spans):
            r["vo"] = True
        if c["anchor"] in ("onset", "span") or c["name"] in ("door",):
            tp, prom = onset_near(odf, times, expected, tol)
            if tp is not None:
                onset_off, onset_prom = tp - expected, prom
                r["onsetMs"] = round(onset_off * 1000, 1)
                r["prominence"] = round(prom, 2)
        strong = onset_off is not None and onset_prom >= args.strong_onset and abs(onset_off) <= tol
        # matched filter (needs the sidecar)
        p = c.get("placed")
        if p is not None and not args.no_match:
            try:
                st, anc, d, _ = S.render_sfx(p["name"], p.get("params", {}), family=p.get("family", "glassy"), bpm=bpm,
                                             beats_per_bar=int(rep.get("beatsPerBar", 4)), slope=float(p.get("slope", 1.0)),
                                             key_pc=S.pitch_class(rep.get("key", "C")), mode=rep.get("mode", "major"),
                                             seed=int(p["seed"]))
                tpl = signal.sosfiltfilt(signal.butter(2, 150, "highpass", fs=S.SR, output="sos"), st.mean(axis=0))
                if d.anchor == "end":        # the build-up that lands on the cue identifies it
                    k0, k1 = max(0, anc - S.ns(0.35)), anc + S.ns(0.03)
                elif d.anchor == "peak":
                    k0, k1 = max(0, anc - S.ns(0.15)), anc + S.ns(0.15)
                elif d.anchor == "span":
                    k0, k1 = 0, S.ns(1.0)
                else:
                    k0, k1 = 0, S.ns(0.35)
                tpl = tpl[k0:k1]
                lag, ncc, z = matched_offset(mono_hp, float(p["start"]) + k0 / S.SR, tpl, search=max(0.1, 4 * tol),
                                             hint=(onset_off - c.get("delta", 0.0)) if onset_off is not None and onset_prom >= 3 else None,
                                             strong=strong and k0 == 0)
                if lag is not None:
                    lag += c.get("delta", 0.0)      # offset against the CUT time, not the sidecar's placement
                    r["matchMs"] = round(lag * 1000, 2)
                    r["ncc"] = round(ncc, 3)
                    r["z"] = round(z, 1)
                    if ncc >= args.min_ncc or z >= args.min_z:
                        off, verdict = lag, "match"
                        if abs(lag) > tol and strong:
                            # a strong, in-tolerance onset disagrees with the correlation
                            if ncc < args.override_ncc:
                                off, verdict = onset_off, "onset"
                                r["note"] = f"match ncc {ncc:.2f} < {args.override_ncc:g} yields to a strong onset"
                            else:
                                verdict = "ambiguous"
            except Exception as e:  # never let one cue kill the report
                r["matchError"] = str(e)[:120]
        if off is None and onset_off is not None:
            off, verdict = onset_off, "onset"
        if c["anchor"] == "peak" and off is None:
            tpk = envelope_peak(x, t)       # informational: a whoosh peak is too broad to fail on
            if tpk is not None:
                r["peakMs"] = round((tpk - t) * 1000, 1)
        if off is None:
            r["status"] = "unchecked" if verdict == "n/a" else "weak"
        elif verdict == "ambiguous":
            r["offsetMs"] = round(off * 1000, 2)
            r["by"] = verdict
            r["status"] = "ambiguous"
            warns.append(f"cue {c['sfx']} ({c['name']}) at {t:.3f}s: match {off * 1000:+.1f} ms (ncc {r['ncc']:.2f}) "
                         f"disagrees with a strong onset {onset_off * 1000:+.1f} ms (x{onset_prom:.0f}); listen to it"
                         + (" (under a voice line: check the stem)" if r.get("vo") else ""))
        else:
            lim = tol if verdict in ("match", "onset") else max(tol, 0.04)
            r["offsetMs"] = round(off * 1000, 2)
            r["by"] = verdict
            r["status"] = "ok" if abs(off) <= lim else "FAIL"
            if verdict == "onset" and r["status"] == "FAIL" and (
                    r.get("prominence", 9) < 1.5 or S.SFX[c["name"]].role in ("ui", "texture")
                    or attack_time(c["name"], (p or {}).get("family", "glassy")) > 0.03):
                r["status"] = "weak"   # soft attack or a small sound masked by the music: report, do not fail
            if r["status"] == "FAIL":
                fails.append(f"cue {c['sfx']} ({c['name']}) at {t:.3f}s off by {off * 1000:+.1f} ms")
            if verdict in ("match", "onset"):
                errs.append(abs(off))
        out["cues"].append(r)
    if errs:
        out["checks"]["sync"] = {"cues": len(out["cues"]), "checked": len(errs), "maxErrMs": round(max(errs) * 1000, 2),
                                 "meanErrMs": round(float(np.mean(errs)) * 1000, 2),
                                 "fails": sum(1 for r in out["cues"] if r.get("status") == "FAIL")}

    # tempo / beat grid
    if not args.no_beat:
        tb = tempo_and_phase(odf, times, bpm)
        if tb:
            tb["expectedBpm"] = round(bpm, 3)
            out["checks"]["beat"] = tb
            if tb["contrast"] >= 1.6:
                if abs(tb["bpm"] - bpm) > max(0.3, 0.004 * bpm):
                    fails.append(f"tempo {tb['bpm']} BPM != {bpm:g}")
                if abs(tb["phaseMs"]) > max(25.0, tol * 1500):
                    fails.append(f"beat grid off by {tb['phaseMs']} ms")
            else:
                tb["note"] = "weak pulse (sparse drums): tempo not enforced"

    out["warnings"] = warns
    out["fails"] = fails
    out["pass"] = not fails

    if args.png or args.zoom:
        marks = [r["t"] for r in out["cues"] if r.get("status") in ("ok", "unchecked", "weak")]
        bad = [r["t"] for r in out["cues"] if r.get("status") == "FAIL"]
        bars = [b["t0"] for b in rep["bars"]] if rep and rep.get("bars") else \
            [W(k * float(cut["barSec"])) for k in range(int(cut.get("bars", 0)) + 1)]
        labels = {}
        if rep and rep.get("sections"):
            labels = {s["t0"]: s["part"] for s in rep["sections"]}
        else:
            for sc in cut.get("scenes") or []:
                labels[W(float(sc["t0"]))] = sc["id"]
        if args.png:
            S.spectrogram_png(x, args.png, px_per_sec=min(120, int(2400 / max(1.0, dur_audio))) if dur_audio > 20 else 120,
                              height=240, marks=bad, soft_marks=marks, bars=bars, labels=labels, env=odf,
                              title=f"{out['file']}  cut {cut_name}  orange = cue, red = FAIL")
            out["png"] = args.png
        if args.zoom:
            os.makedirs(args.zoom, exist_ok=True)
            pts = sorted({round(W(float(sc["t0"])), 4) for sc in cut.get("scenes") or []} |
                         ({round(float(s["t0"]), 4) for s in rep["sections"]} if rep and rep.get("sections") else set()))
            for k, tz in enumerate(pts):
                if tz <= 0:
                    continue
                a, b = max(0.0, tz - 1.0), min(dur_audio, tz + 1.0)
                S.spectrogram_png(x, os.path.join(args.zoom, f"join-{k:02d}-{tz:07.3f}s.png"), t0=a, t1=b, px_per_sec=400,
                                  height=220, marks=[v for v in bad if a <= v <= b], soft_marks=[v for v in marks if a <= v <= b],
                                  bars=[v for v in bars if a <= v <= b], title=f"join at {tz:.3f}s")
            out["zoomDir"] = args.zoom
    return out


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--wav", required=True, help="audio or video file (wav, m4a, mp4, ...)")
    ap.add_argument("--cut", required=True, help="P/build/cut-<cut>.json")
    ap.add_argument("--report", default=None, help="arranger sidecar (default: found next to the file / in build/)")
    ap.add_argument("--tol", type=float, default=None, help="max |offset| per cue in s (default 1/fps)")
    ap.add_argument("--min-ncc", type=float, default=0.25, help="matched-filter NCC that makes a match trusted")
    ap.add_argument("--min-z", type=float, default=6.0, help="...or a correlation peak this many std above the rest")
    ap.add_argument("--strong-onset", type=float, default=8.0,
                    help="onset prominence that resolves period aliases and outvotes a weak match (default 8)")
    ap.add_argument("--override-ncc", type=float, default=0.5,
                    help="a match below this NCC yields to a strong in-tolerance onset (default 0.5)")
    ap.add_argument("--lufs", type=float, default=-14.0)
    ap.add_argument("--lufs-tol", type=float, default=1.0)
    ap.add_argument("--tp", type=float, default=-1.0)
    ap.add_argument("--no-loudness", action="store_true")
    ap.add_argument("--no-match", action="store_true", help="onset analysis only")
    ap.add_argument("--no-beat", action="store_true")
    ap.add_argument("--scale", type=float, default=None, help="cue times x scale (slow-down variant without a sidecar)")
    ap.add_argument("--warp", default=None, help='"out:scene,..." map for cue times (variant without a sidecar)')
    ap.add_argument("--png", default=None, help="overview spectrogram with cue marks")
    ap.add_argument("--zoom", default=None, help="folder for +-1 s spectrograms at every scene / section join")
    ap.add_argument("--json", default=None, help="write the full report here")
    ap.add_argument("--quiet", action="store_true", help="summary only")
    a = ap.parse_args(argv)
    for f in (a.wav, a.cut):
        if not os.path.exists(f):
            print(f"error: not found: {f}", file=sys.stderr)
            return 2
    try:
        out = check(a)
    except subprocess.CalledProcessError as e:
        print(f"error: ffmpeg could not decode {a.wav} ({(e.stderr or b'').decode(errors='ignore').strip()[:200]})",
              file=sys.stderr)
        return 2
    except (OSError, ValueError, KeyError, json.JSONDecodeError) as e:
        print(f"error: {e}", file=sys.stderr)
        return 2
    if a.json:
        with open(a.json, "w") as f:
            json.dump(out, f, indent=1)
    if not a.quiet:
        for r in out["cues"]:
            meas = r.get("offsetMs")
            extra = []
            if "matchMs" in r:
                extra.append(f"match {r['matchMs']:+.1f}ms ncc {r['ncc']:.2f}")
            if "onsetMs" in r:
                extra.append(f"onset {r['onsetMs']:+.1f}ms x{r.get('prominence', 0):.1f}")
            if "peakMs" in r:
                extra.append(f"peak {r['peakMs']:+.1f}ms")
            print(f"  {r['t']:8.3f}  {r['status']:<9} {r['layer']:<11} {(f'{meas:+.1f} ms' if meas is not None else ''):>10}"
                  f"  {' | '.join(extra)}  {str(r['sfx'])[:40]}{' (auto)' if r.get('auto') else ''}{' [vo]' if r.get('vo') else ''}")
    ck = out["checks"]
    L = ck["loudness"]
    print(f"{out['file']} vs cut {out['cut']}: duration {ck['duration']['audio']:.3f}s ({ck['duration']['diffMs']:+.1f} ms), "
          f"{L['lufs']:.2f} LUFS, {L['truePeak']:.2f} dBTP, LRA {L['lra']:.1f}")
    if "sync" in ck:
        s = ck["sync"]
        print(f"sync: {s['checked']}/{s['cues']} cues measured, max {s['maxErrMs']:.1f} ms, mean {s['meanErrMs']:.1f} ms, "
              f"tolerance {out['tolMs']:.1f} ms, {s['fails']} fail")
    if "beat" in ck:
        b = ck["beat"]
        print(f"beat: {b['bpm']} BPM (expected {b['expectedBpm']}), grid phase {b['phaseMs']:+.1f} ms, contrast {b['contrast']}"
              + (f" ({b['note']})" if b.get("note") else ""))
    for w in out["warnings"]:
        print("  ! " + w)
    for f in out["fails"]:
        print("  FAIL " + f)
    print("PASS" if out["pass"] else "FAIL")
    return 0 if out["pass"] else 1


if __name__ == "__main__":
    sys.exit(main())
