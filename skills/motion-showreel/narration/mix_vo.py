#!/usr/bin/env python3
"""Mix narration over the music bed of a cut: duck music + SFX under the voice, master to -14 LUFS.

  python3 mix_vo.py --project P --cut 30 [--music P/build/music-30-stem.wav] [--sfx FILE] [--no-music]
                    [--duck 0.32] [--pre 0.12] [--post 0.15] [--smooth 0.25] [--vo-rel 1.0] [--lufs -14] [--tp -1.0]

Reads  P/build/cut-<cut>.json, P/build/vo-timeline.json (vo_timeline.py), the line clips it points to,
       and the bed: --music (default P/build/music-<cut>[-x<scale>|-warp]-stem.wav from `arrange.py --stem`, the
       unmastered music + SFX bed, so the sum is mastered once; else the mastered music-<cut>[...].wav, then .m4a)
       plus optional --sfx.
Writes P/build/mix-<cut>.wav (48 kHz stereo), mix-<cut>.m4a (AAC 192k, for render.mjs --audio),
       mix-<cut>-embed.m4a (AAC 96k + faststart, for build.mjs --audio-<cut>), mix-<cut>.json (report with
       "placeholder" (dry-run clips) and "unverified" (clips not confirmed by speech-to-text): render.mjs and build.mjs
       skip or refuse placeholder mixes).

Mix: every clip is level-matched (BS.1770, clamped to +-6 dB, plus the line's "gain" dB), faded (10 ms in,
40 ms out) and placed at its timeline start; the voice sits --vo-rel LU above the bed's loudness; the bed is
ducked to --duck gain from --pre s before each line to --post s after it, smoothed by a --smooth s window;
the sum is normalized to --lufs integrated with a 4x-oversampled true-peak limiter at --tp dBTP, and each
AAC file is re-measured and trimmed until its true peak is at or below --tp (AAC overshoots).
Voice is never time-stretched; slow-down variants (--scale / --warp) move line starts only.
"""
from __future__ import annotations

import argparse
import re
import subprocess
import sys
import wave
from pathlib import Path

import numpy as np
from scipy.ndimage import minimum_filter1d, uniform_filter1d
from scipy.signal import lfilter, resample_poly

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.dont_write_bytecode = True   # keep the skill folder free of __pycache__
import vo_timeline as V  # noqa: E402

FS = 48000


# ---------------------------------------------------------------- loudness (ITU-R BS.1770-4 / EBU R128)
def kweight_coeffs(fs: int):
    """K-weighting biquads for any sample rate (pre-filter shelf + RLB high-pass)."""
    f0, g, q = 1681.974450955533, 3.999843853973347, 0.7071752369554196
    k = np.tan(np.pi * f0 / fs)
    vh = 10 ** (g / 20.0)
    vb = vh ** 0.4996667741545416
    a0 = 1.0 + k / q + k * k
    b1 = [(vh + vb * k / q + k * k) / a0, 2.0 * (k * k - vh) / a0, (vh - vb * k / q + k * k) / a0]
    a1 = [1.0, 2.0 * (k * k - 1.0) / a0, (1.0 - k / q + k * k) / a0]
    f0, q = 38.13547087602444, 0.5003270373238773
    k = np.tan(np.pi * f0 / fs)
    d = 1.0 + k / q + k * k
    return (b1, a1), ([1.0, -2.0, 1.0], [1.0, 2.0 * (k * k - 1.0) / d, (1.0 - k / q + k * k) / d])


def lufs(x: np.ndarray, fs: int = FS, gated: bool = True) -> float:
    """Integrated loudness of x ([channels, n] or [n]); gated per BS.1770 (absolute -70, relative -10 LU)."""
    x = np.atleast_2d(np.asarray(x, dtype=np.float64))
    (b1, a1), (b2, a2) = kweight_coeffs(fs)
    y = lfilter(b2, a2, lfilter(b1, a1, x, axis=-1), axis=-1)
    blk, hop = int(round(0.4 * fs)), int(round(0.1 * fs))
    if y.shape[1] < blk or not gated:
        z = float((y ** 2).mean(axis=1).sum())
        return -0.691 + 10 * np.log10(z) if z > 0 else float("-inf")
    cs = np.concatenate([np.zeros((y.shape[0], 1)), np.cumsum(y ** 2, axis=1)], axis=1)
    starts = np.arange(0, y.shape[1] - blk + 1, hop)
    z = ((cs[:, starts + blk] - cs[:, starts]) / blk).sum(axis=0)
    with np.errstate(divide="ignore"):
        lv = -0.691 + 10 * np.log10(z)
    g = z[lv > -70]
    if not len(g):
        return float("-inf")
    rel = -0.691 + 10 * np.log10(g.mean()) - 10
    g2 = z[(lv > -70) & (lv > rel)]
    return float(-0.691 + 10 * np.log10(g2.mean()))


def true_peak(x: np.ndarray) -> float:
    up = resample_poly(np.atleast_2d(x), 4, 1, axis=-1)
    m = float(np.abs(up).max())
    return 20 * np.log10(m) if m > 0 else float("-inf")


def limit(x: np.ndarray, fs: int = FS, ceiling_db: float = -1.0, look: float = 0.005) -> np.ndarray:
    """Lookahead limiter on the 4x-oversampled peak envelope (gain held around peaks, then smoothed)."""
    ceil = 10 ** (ceiling_db / 20.0)
    n = x.shape[1]
    up = np.abs(resample_poly(x, 4, 1, axis=-1)).max(axis=0)[: n * 4]
    pk = np.pad(up, (0, n * 4 - len(up))).reshape(n, 4).max(axis=1)
    g = np.minimum(1.0, ceil / np.maximum(pk, 1e-9))
    w = max(1, int(look * fs))
    g = uniform_filter1d(minimum_filter1d(g, size=2 * w + 1), size=w)
    return x * g


# ---------------------------------------------------------------- io
def decode(path: Path, n: int) -> np.ndarray:
    """Any audio file -> float64 [2, n] at 48 kHz (padded or trimmed to n samples; warns when the length is off)."""
    out = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-f", "f32le", "-ac", "2", "-ar", str(FS), "-"],
                         capture_output=True, check=True).stdout
    a = np.frombuffer(out, dtype=np.float32).reshape(-1, 2).T.astype(np.float64)
    if abs(a.shape[1] - n) > 0.1 * FS:
        print(f"  ! {Path(path).name} lasts {a.shape[1] / FS:.2f} s but the cut lasts {n / FS:.2f} s (stale or wrong bed?)")
    return a[:, :n] if a.shape[1] >= n else np.pad(a, ((0, 0), (0, n - a.shape[1])))


def read_clip(path: Path) -> np.ndarray:
    """Mono clip -> float64 at 48 kHz with 10 ms fade-in and 40 ms squared fade-out (no clicks at cut points)."""
    path = Path(path)
    if path.suffix.lower() == ".wav":
        with wave.open(str(path)) as w:
            sr, ch, sw = w.getframerate(), w.getnchannels(), w.getsampwidth()
            raw = w.readframes(w.getnframes())
        if sw != 2:
            raise SystemExit(f"{path}: expected 16-bit PCM")
        a = np.frombuffer(raw, dtype="<i2").astype(np.float64) / 32768.0
        if ch > 1:
            a = a.reshape(-1, ch).mean(axis=1)
        if sr != FS:
            gcd = np.gcd(sr, FS)
            a = resample_poly(a, FS // gcd, sr // gcd)
    else:
        out = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-f", "f32le", "-ac", "1", "-ar", str(FS), "-"],
                             capture_output=True, check=True).stdout
        a = np.frombuffer(out, dtype=np.float32).astype(np.float64)
    fi, fo = min(len(a), int(0.010 * FS)), min(len(a), int(0.040 * FS))
    a[:fi] *= np.linspace(0.0, 1.0, fi)
    a[len(a) - fo:] *= np.linspace(1.0, 0.0, fo) ** 2
    return a


def write_wav(path: Path, x: np.ndarray) -> None:
    rng = np.random.default_rng(7)
    tpdf = (rng.random(x.shape) - rng.random(x.shape)) / 32768.0
    pcm = np.clip(np.round((x + tpdf) * 32767.0), -32768, 32767).astype("<i2")
    with wave.open(str(path), "wb") as w:
        w.setnchannels(x.shape[0])
        w.setsampwidth(2)
        w.setframerate(FS)
        w.writeframes(pcm.T.tobytes())


def measure(path: Path) -> tuple[float, float]:
    """(integrated LUFS, true peak dBTP) of an encoded file, measured by ffmpeg ebur128."""
    err = subprocess.run(["ffmpeg", "-nostats", "-hide_banner", "-i", str(path), "-af", "ebur128=peak=true", "-f", "null", "-"],
                         capture_output=True, text=True).stderr
    i = re.findall(r"I:\s+(-?[\d.]+|-inf) LUFS", err)
    p = re.findall(r"True peak:\s+Peak:\s+(-?[\d.]+|-inf) dBFS", err)
    return (float(i[-1]) if i else float("nan")), (float(p[-1]) if p else float("nan"))


def encode(wav: Path, out: Path, kbps: int, tp: float, faststart: bool) -> dict:
    vol = 0.0
    for _ in range(5):
        cmd = ["ffmpeg", "-y", "-v", "error", "-i", str(wav), "-af", f"volume={vol:.2f}dB", "-c:a", "aac", "-b:a", f"{kbps}k"]
        subprocess.run(cmd + (["-movflags", "+faststart"] if faststart else []) + [str(out)], check=True)
        lv, pk = measure(out)
        if not pk > tp:
            break
        vol -= (pk - tp) + 0.1
    return {"file": out.name, "kbps": kbps, "lufs": lv, "truePeak": pk, "trimDb": round(vol, 2)}


# ---------------------------------------------------------------- mix
def duck_envelope(spans: list[tuple[float, float]], n: int, duck: float, pre: float, post: float, smooth: float) -> np.ndarray:
    g = np.ones(n)
    for t0, t1 in spans:
        g[max(0, int((t0 - pre) * FS)):min(n, int((t1 + post) * FS))] = duck
    k = max(1, int(smooth * FS))
    return uniform_filter1d(g, size=k, mode="nearest")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--project", required=True)
    ap.add_argument("--cut", required=True)
    ap.add_argument("--music", help="music bed (default P/build/music-<cut>-stem.wav, else music-<cut>.wav, else .m4a)")
    ap.add_argument("--sfx", help="separate SFX stem, ducked with the music")
    ap.add_argument("--no-music", action="store_true", help="voice only")
    ap.add_argument("--duck", type=float, help="bed gain while the voice plays (default 0.32)")
    ap.add_argument("--pre", type=float, help="duck pre-roll in s (default 0.12)")
    ap.add_argument("--post", type=float, help="duck hold after a line in s (default 0.15)")
    ap.add_argument("--smooth", type=float, help="duck smoothing window in s (default 0.25)")
    ap.add_argument("--vo-rel", type=float, help="voice loudness relative to the bed's, LU (default +1.0)")
    ap.add_argument("--no-level", action="store_true", help="do not level-match clips")
    ap.add_argument("--lufs", type=float, help="integrated loudness target (default -14)")
    ap.add_argument("--tp", type=float, help="true-peak ceiling in dBTP (default -1.0)")
    ap.add_argument("--scale", type=float, help="comprehension slow-down variant (uniform)")
    ap.add_argument("--warp", help="comprehension slow-down variant, knots 'o:s,o:s,...'")
    ap.add_argument("--tag", help="output name suffix (mix-<cut><tag>.*)")
    ap.add_argument("--allow-missing", action="store_true", help="skip lines that have no clip yet")
    a = ap.parse_args()

    proj = V.load_project(a.project)
    cfg = proj["narr"].get("mix") or {}

    def opt(name, key, default):
        v = getattr(a, name)
        return float(v if v is not None else cfg.get(key, default))
    duck, pre, post, smooth = opt("duck", "duck", 0.32), opt("pre", "pre", 0.12), opt("post", "post", 0.15), opt("smooth", "smooth", 0.25)
    vo_rel, target, tp = opt("vo_rel", "voRel", 1.0), opt("lufs", "lufs", -14.0), opt("tp", "truePeak", -1.0)
    b = proj["P"] / "build"
    vtp = b / "vo-timeline.json"
    if not vtp.exists():
        raise SystemExit(f"missing {vtp}: run narration/vo_timeline.py --project {a.project} first")
    vt = V.read_json(vtp)
    cut = V.load_cut(proj, a.cut)
    pl = V.place(vt, cut, V.time_map(a.scale, a.warp), V.cut_narrated(proj, a.cut))
    for w in pl["warnings"]:
        print(f"  ! {w}")
    for w in pl["notes"]:
        print(f"  · {w}")
    vtag = (f"-x{a.scale:g}" if a.scale else "") + ("-warp" if a.warp else "")   # arrange.py names variant beds the same way
    tag = a.tag or vtag
    dur = pl["duration"]
    n = int(round(dur * FS))

    # voice track
    lines = []
    for ln in pl["lines"]:
        if not ln.get("file"):
            msg = f"{ln['key']}: no clip (source {ln['source']}); run narration/tts_gemini.py batch --project {a.project}"
            if not a.allow_missing:
                raise SystemExit(msg)
            print(f"  ! skipped {msg}")
            continue
        lines.append(ln)
    placeholder = any(ln["source"] == "dry-run" for ln in lines)
    unverified = [ln["key"] for ln in lines if ln["source"] == "clip" and ln.get("verified") is not True]
    if placeholder:
        print("  ! PLACEHOLDER narration (dry-run clips): not for delivery (render.mjs / build.mjs skip this mix)")
    if unverified:
        print(f"  ! clips not verified by speech-to-text: {', '.join(unverified)} (tts_gemini.py audit --project P)")
    clips = [read_clip(proj["P"] / ln["file"]) for ln in lines]
    louds = [lufs(c[None, :], FS) for c in clips]
    finite = [x for x in louds if np.isfinite(x)]
    ref = float(np.median(finite)) if finite else -20.0
    vo = np.zeros(n)
    report_lines = []
    for ln, c, lv in zip(lines, clips, louds):
        g_db = 0.0 if (a.no_level or not np.isfinite(lv)) else float(np.clip(ref - lv, -6.0, 6.0))
        g_db += float(ln.get("gain") or 0.0)
        i0 = int(round(ln["t0"] * FS))
        seg = c * 10 ** (g_db / 20.0)
        e = min(n, i0 + len(seg))
        if e > i0:
            vo[i0:e] += seg[: e - i0]
        if i0 + len(seg) > n:
            print(f"  ! {ln['key']}: {(i0 + len(seg) - n) / FS:.2f} s of speech cut at the end of the reel")
        report_lines.append({"key": ln["key"], "t0": ln["t0"], "t1": ln["t1"], "levelDb": round(g_db, 2), "source": ln["source"]})

    # bed
    bed = np.zeros((2, n))
    bed_name = None
    if not a.no_music:
        cands = [b / f"music-{a.cut}{vtag}-stem.wav", b / f"music-{a.cut}{vtag}.wav", b / f"music-{a.cut}{vtag}.m4a"]
        if vtag:
            cands += [b / f"music-{a.cut}-stem.wav", b / f"music-{a.cut}.wav", b / f"music-{a.cut}.m4a"]
        mp = Path(a.music) if a.music else next((p for p in cands if p.exists()), None)
        if mp is None or not mp.exists():
            raise SystemExit(f"no music bed for cut {a.cut}: run audio/arrange.py --project {a.project} --cut {a.cut} --stem "
                             f"(or pass --music FILE / --no-music)")
        if vtag and not a.music and mp.name.startswith((f"music-{a.cut}.", f"music-{a.cut}-stem.")):
            print(f"  ! no music-{a.cut}{vtag} bed: the variant reuses the cut's music (arrange.py ... {'--scale ' + format(a.scale, 'g') if a.scale else '--warp ...'})")
        if not a.music and not mp.name.endswith("-stem.wav"):
            print(f"  · bed {mp.name} is the mastered song (run arrange.py --cut {a.cut} --stem for an unmastered bed)")
        bed += decode(mp, n)
        bed_name = V.rel(mp, proj["P"])
    if a.sfx:
        bed += decode(Path(a.sfx), n)
    have_bed = bool(np.abs(bed).max() > 0)
    l_bed = lufs(bed, FS) if have_bed else float("-inf")
    l_vo = lufs(np.vstack([vo, vo]), FS) if lines else float("-inf")
    if lines and np.isfinite(l_vo):
        goal = (l_bed + vo_rel) if np.isfinite(l_bed) else target
        vo *= 10 ** ((goal - l_vo) / 20.0)
    spans = [(ln["t0"], ln["t1"]) for ln in lines]
    env = duck_envelope(spans, n, duck, pre, post, smooth)
    ducked = bed * env[None, :]
    mix = ducked + vo[None, :]
    mix -= mix.mean(axis=1, keepdims=True)
    for _ in range(4):
        lv = lufs(mix, FS)
        if not np.isfinite(lv):
            break
        mix *= 10 ** ((target - lv) / 20.0)
        mix = limit(mix, FS, tp - 0.3)
    l_mix, tp_mix = lufs(mix, FS), true_peak(mix)

    # voice-over-bed margin while speaking
    snr = None
    if lines and have_bed:
        mask = np.zeros(n, bool)
        for t0, t1 in spans:
            mask[int(t0 * FS):int(t1 * FS)] = True
        v_l = lufs(np.vstack([vo[mask], vo[mask]]), FS)
        b_l = lufs(ducked[:, mask], FS)
        if np.isfinite(v_l) and np.isfinite(b_l):
            snr = round(v_l - b_l, 1)

    b.mkdir(parents=True, exist_ok=True)
    wav = b / f"mix-{a.cut}{tag}.wav"
    write_wav(wav, mix)
    hi = encode(wav, b / f"mix-{a.cut}{tag}.m4a", 192, tp, faststart=False)
    lo = encode(wav, b / f"mix-{a.cut}{tag}-embed.m4a", 96, tp, faststart=True)
    rep = {"cut": a.cut, "duration": dur, "samples": n, "rate": FS, "bed": bed_name, "sfx": a.sfx, "lufs": round(l_mix, 2),
           "truePeak": round(tp_mix, 2), "target": {"lufs": target, "truePeak": tp},
           "duck": {"gain": duck, "pre": pre, "post": post, "smooth": smooth}, "voRel": vo_rel,
           "bedLufs": round(l_bed, 2) if np.isfinite(l_bed) else None, "voOverDuckedBedLU": snr,
           "encodes": [hi, lo], "lines": report_lines, "warnings": pl["warnings"], "notes": pl["notes"],
           "placeholder": placeholder, "unverified": unverified, "bedStem": bool(bed_name and bed_name.endswith("-stem.wav"))}
    V.write_json(b / f"mix-{a.cut}{tag}.json", rep)
    print(f"mix {a.cut}{tag}: {dur:.2f} s · {len(lines)} lines · {l_mix:.2f} LUFS · {tp_mix:.2f} dBTP (wav)"
          + (f" · voice {snr:+.1f} LU over the ducked bed" if snr is not None else ""))
    for e in (hi, lo):
        print(f"  {e['file']}: {e['kbps']}k · {e['lufs']:.1f} LUFS · {e['truePeak']:.2f} dBTP" + (f" (trimmed {e['trimDb']} dB)" if e["trimDb"] else ""))
    if snr is not None and snr < 8:
        print(f"  ! voice only {snr:.1f} LU above the ducked bed; lower --duck or raise --vo-rel")
    return 0


if __name__ == "__main__":
    sys.exit(main())
