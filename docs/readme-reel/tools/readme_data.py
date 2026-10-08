#!/usr/bin/env python3
"""readme_data.py - turn the bundled examples' real outputs into small data files for the README reel.

Every number the README previews draw comes from a file the skill wrote for the examples. This helper reads those
files and writes compact JSON (and display-sized WebP images) into docs/readme-reel/assets/, so the reel renders
without the examples' generated build/ folders. tools/prepare.mjs calls it; each subcommand also runs alone.

  readme_data.py sound      --wav W --music-json M --cut C --sync S --window 8,14 --out F
  readme_data.py narration  --narration N --mix-json M --captions C --stem W --cut C --window 0,15 --out F
  readme_data.py plans      --cut 15=F --cut 30=F --cut 60=F --out F
  readme_data.py styles     --style mochi=F --style spark=F --out F
  readme_data.py ship       --mp4 F [--mp4 F] --players J --out F
  readme_data.py images     --jobs J                      (crop / resize / WebP, see prepare.mjs)
  readme_data.py paper      --readme R --results J --out F.pdf   (the spark-bench demo note for pdf_figures.py)

Requirements: numpy, scipy, Pillow; PyMuPDF for `paper`; ffprobe for `ship`. Paths written into the JSON are
relative to the repository root, never absolute.
"""
from __future__ import annotations

import argparse
import json
import math
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]          # the repository root (docs/readme-reel/tools/ -> repo)


def rel(p: str | Path) -> str:
    """Repository-relative POSIX path (data files must never carry an absolute or home path)."""
    p = Path(p).resolve()
    try:
        return p.relative_to(ROOT).as_posix()
    except ValueError:
        return p.name


def load(p: str | Path):
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def save(obj, out: str | Path) -> None:
    out = Path(out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(obj, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"wrote {rel(out)} ({out.stat().st_size / 1024:.1f} KB)")


def read_wav(path: str | Path):
    import numpy as np
    from scipy.io import wavfile
    sr, raw = wavfile.read(str(path))
    x = raw.astype(np.float64)
    if np.issubdtype(raw.dtype, np.integer):
        x /= float(2 ** (8 * raw.dtype.itemsize - 1))
    if x.ndim == 2:
        x = x.mean(axis=1)
    return sr, x


def window_arg(s: str) -> tuple[float, float]:
    a, b = (float(v) for v in s.split(","))
    return a, b


# ───────────────────────── sound: waveform, spectrum and cues of a real music file ─────────────────────────
def cmd_sound(a) -> None:
    import numpy as np
    sr, x = read_wav(a.wav)
    w0, w1 = window_arg(a.window)
    seg = x[int(w0 * sr):int(w1 * sr)]
    # waveform: peak and RMS per 10 ms bin, normalised to the window's peak
    hop = int(sr * 0.01)
    n = len(seg) // hop
    bins = seg[: n * hop].reshape(n, hop)
    peak, rms = np.abs(bins).max(axis=1), np.sqrt((bins ** 2).mean(axis=1))
    norm = float(peak.max()) or 1.0
    env = {"hop": 0.01, "peak": [int(round(v / norm * 1000)) for v in peak], "rms": [int(round(v / norm * 1000)) for v in rms]}
    # spectrum: 4096-point Hann STFT every 20 ms, 36 log-spaced bands 40 Hz-16 kHz, dB scaled to 0..100
    nfft, shop = 4096, int(sr * 0.02)
    win = np.hanning(nfft)
    pad = np.concatenate([x[max(0, int(w0 * sr) - nfft // 2):int(w0 * sr)], seg, x[int(w1 * sr):int(w1 * sr) + nfft // 2]])
    lead = int(w0 * sr) - max(0, int(w0 * sr) - nfft // 2)
    edges = np.geomspace(40, 16000, 37)
    freqs = np.fft.rfftfreq(nfft, 1 / sr)
    frames = []
    for k in range(int((w1 - w0) / 0.02)):
        c = lead + k * shop
        chunk = pad[max(0, c - nfft // 2): c + nfft // 2]
        if len(chunk) < nfft:
            chunk = np.pad(chunk, (0, nfft - len(chunk)))
        mag = np.abs(np.fft.rfft(chunk * win))
        bands = [mag[(freqs >= edges[i]) & (freqs < edges[i + 1])] for i in range(36)]
        frames.append([20 * math.log10(max(1e-9, float(b.mean()) if len(b) else 1e-9)) for b in bands])
    F = np.array(frames)
    hi, lo = float(np.percentile(F, 99.5)), float(np.percentile(F, 99.5)) - 60.0
    spec = {"hop": 0.02, "bands": [int(round(v)) for v in np.sqrt(edges[:-1] * edges[1:])],
            "frames": [[int(round(100 * min(1, max(0, (v - lo) / (hi - lo))))) for v in row] for row in F]}
    # cues: the arranger's own cue list (expanded repeats) + verify_sync's measured offsets
    music, sync = load(a.music_json), load(a.sync)
    beat = 60.0 / music["bpm"]
    measured = {(round(c["t"], 3), c.get("layer") or c["sfx"].split()[0]): c for c in sync.get("cues", [])}
    cues = []
    for c in music.get("cues", []):
        if not (w0 - 1e-6 <= c["t"] < w1 - 1e-6) or c.get("auto"):
            continue
        p = c.get("params", {})
        nrep = int(p.get("n", 1))
        gap = p.get("gap")
        gap_s = (float(str(gap).rstrip("s")) if str(gap).endswith("s") else float(gap) * beat) if gap is not None else 0.25 * beat
        m = measured.get((round(c["t"], 3), c["name"]), {})
        cues.append({"t": round(c["t"] - w0, 4), "name": c["name"], "sfx": c["sfx"], "scene": c.get("scene"),
                     "hits": [round(c["t"] - w0 + i * gap_s, 4) for i in range(nrep)],
                     "offsetMs": m.get("offsetMs"), "by": m.get("by")})
    sections = [{"part": s["part"], "t0": round(max(0.0, s["t0"] - w0), 3)} for s in music["sections"]
                if s["t0"] < w1 and (s["t0"] + (s["toBar"] - s["fromBar"]) * 4 * beat) > w0]
    checks = sync.get("checks", {})
    ok = [c for c in sync.get("cues", []) if c.get("offsetMs") is not None]
    out = {
        "source": {"wav": rel(a.wav), "plan": rel(a.cut), "sidecar": rel(a.music_json), "sync": "audio/verify_sync.py --json",
                   "note": "the playful-app example's 30-s soundtrack, synthesized by audio/arrange.py from its cut plan"},
        "window": [w0, w1], "bpm": music["bpm"], "beatSec": beat, "barSec": 4 * beat,
        "key": f"{music['key']} {music['mode']}", "preset": music["preset"], "sections": sections,
        "env": env, "spec": spec, "cues": cues,
        "sync": {"cues": len(sync.get("cues", [])), "measured": len(ok),
                 "maxMs": round(max(abs(c["offsetMs"]) for c in ok), 1) if ok else None,
                 "meanMs": round(sum(abs(c["offsetMs"]) for c in ok) / len(ok), 1) if ok else None,
                 "tolMs": sync.get("tolMs"), "pass": bool(sync.get("pass"))},
        "loudness": {"lufs": music["loudness"]["lufs"], "truePeak": music["loudness"]["truePeak"],
                     "m4aTruePeak": music["loudness"].get("m4a", {}).get("truePeak")},
        "checks": {k: checks[k] for k in checks if isinstance(checks[k], (int, float, str, bool))},
    }
    save(out, a.out)


# ───────────────────────── narration: script, dry-run timing, captions, duck curve ─────────────────────────
def cmd_narration(a) -> None:
    import numpy as np
    from scipy.ndimage import uniform_filter1d
    nar, mix, caps, cut = load(a.narration), load(a.mix_json), load(a.captions), load(a.cut)
    w0, w1 = window_arg(a.window)
    keyed, count = {}, {}                                  # vo_timeline.py keys: "<scene>.<index within the scene>"
    for ln in nar["lines"]:
        i = count.get(ln["scene"], 0)
        keyed[f"{ln['scene']}.{i}"] = ln
        count[ln["scene"]] = i + 1
    lines = []
    for ln in mix["lines"]:
        if ln["t1"] < w0 or ln["t0"] > w1:
            continue
        src = keyed.get(ln["key"], {})
        lines.append({"key": ln["key"], "scene": ln["key"].split(".")[0], "text": src.get("text", ""),
                      "t0": round(ln["t0"] - w0, 3), "t1": round(ln["t1"] - w0, 3), "source": ln.get("source")})
    captions = [{"t0": round(c["t0"] - w0, 3), "t1": round(c["t1"] - w0, 3), "text": c["text"], "scene": c["scene"]}
                for c in caps["cues"] if c["t1"] > w0 and c["t0"] < w1]
    scenes = [{"id": s["id"], "t0": round(s["t0"] - w0, 3), "t1": round(s["t1"] - w0, 3)}
              for s in cut["scenes"] if s["t1"] > w0 and s["t0"] < w1]
    # the music bed under the voice (the unmastered stem mix_vo.py ducks), as RMS dB every 20 ms
    sr, x = read_wav(a.stem)
    seg = x[int(w0 * sr):int(w1 * sr)]
    hop = int(sr * 0.02)
    nb = len(seg) // hop
    rms = np.sqrt((seg[: nb * hop].reshape(nb, hop) ** 2).mean(axis=1))
    db = 20 * np.log10(np.maximum(rms, 1e-6))
    # mix_vo.py duck_envelope(): the bed gain is `gain` from `pre` s before a line to `post` s after it, smoothed by a
    # `smooth`-second moving average; reproduced here on the same 48 kHz grid, then sampled every 20 ms
    d = mix["duck"]
    n = int((w1 - w0) * sr)
    g = np.ones(n)
    for ln in mix["lines"]:
        g[max(0, int((ln["t0"] - w0 - d["pre"]) * sr)):max(0, min(n, int((ln["t1"] - w0 + d["post"]) * sr)))] = d["gain"]
    g = uniform_filter1d(g, size=max(1, int(d["smooth"] * sr)), mode="nearest")
    gain = g[::hop][:nb]
    out = {
        "source": {"narration": rel(a.narration), "mix": rel(a.mix_json), "captions": rel(a.captions), "stem": rel(a.stem),
                   "note": "research-cli example, 30-s cut: the script is real; line timing comes from a TTS DRY RUN "
                           "(placeholder clips), so no voice is shown or claimed"},
        "voice": {"model": nar.get("model"), "voice": nar.get("voice"), "style": nar.get("style"), "lang": nar.get("lang")},
        "dryRun": bool(mix.get("placeholder")), "window": [w0, w1], "bpm": cut["bpm"], "barSec": cut["barSec"],
        "scenes": scenes, "lines": lines, "captions": captions,
        "duck": {**d, "db": round(20 * math.log10(d["gain"]), 1)},
        "bed": {"hop": 0.02, "db": [round(float(v), 1) for v in db]},
        "gain": {"hop": 0.02, "values": [round(float(v), 3) for v in gain]},
        "mix": {"lufs": mix.get("lufs"), "truePeak": mix.get("truePeak")},
    }
    save(out, a.out)


# ───────────────────────── plans: real 15/30/60-s cut plans on one bar grid ─────────────────────────
def cmd_plans(a) -> None:
    cuts = {}
    for spec in a.cut:
        name, path = spec.split("=", 1)
        c = load(path)
        cuts[name] = {
            "file": rel(path), "bars": c["bars"], "duration": c["duration"],
            "scenes": [{"id": s["id"], "fromBar": s["fromBar"], "toBar": s["toBar"], "inBeats": s["inBeats"],
                        "outBeats": s["outBeats"], "holdSec": round(s["holdSec"], 3), "optional": bool(s.get("optional"))}
                       for s in c["scenes"]],
            "cues": len(c.get("cues", [])),
        }
        bpm, bpb = c["bpm"], c["beatsPerBar"]
    save({"source": "timing/plan_cut.py output of the research-cli example", "bpm": bpm, "beatsPerBar": bpb,
          "barSec": round(60.0 / bpm * bpb, 4), "cuts": cuts}, a.out)


# ───────────────────────── styles: the two reviewed style.json files, side by side ─────────────────────────
def first_family(stack: str) -> str:
    return stack.split(",")[0].strip().strip('"')


def cmd_styles(a) -> None:
    out = {}
    for spec in a.style:
        name, path = spec.split("=", 1)
        s = load(path)
        pal = s["palette"]
        out[name] = {
            "file": rel(path), "title": s["meta"].get("title"), "theme": s["layout"]["theme"], "mood": s.get("mood", [])[:5],
            "palette": {k: pal[k] for k in ("bg", "surface", "ink", "accent", "accent2", "accent3", "ok", "deny") if k in pal},
            "display": first_family(s["fonts"]["display"]), "mono": first_family(s["fonts"]["mono"]),
            "displayWeight": s["type"]["displayWeight"],
            "motion": {k: s["motion"][k] for k in ("pace", "spring", "overshoot", "ease")},
            "transitions": s["motion"]["transitions"][:3],
            "sound": {k: s["sound"][k] for k in ("preset", "bpm", "key", "mode")},
            "narration": bool(s["narration"].get("recommended")),
        }
        # what the tone pass measured in the source text (the example's own extraction log, build/style-extract.json)
        log = Path(path).parent / "build" / "style-extract.json"
        if log.exists():
            m = load(log)["metrics"]
            out[name]["metrics"] = {"words": m["words"], "exclaimPer1k": m["exclaim_per_1k"], "emojiPer1k": m["emoji_per_1k"],
                                    "numbersPer1k": m["numbers_per_1k"], "citationsPer1k": m["citation_per_1k"],
                                    "wordsPerSentence": m["avg_sentence_words"]}
    save({"source": "the reviewed style.json of each example (tools/extract_style.py + review); metrics: the tone pass's "
                    "measurements over each example's source text (build/style-extract.json)", "styles": out}, a.out)


# ───────────────────────── ship: what the delivered files really are ─────────────────────────
def ffprobe(path: str) -> dict:
    r = subprocess.run(["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", path],
                       capture_output=True, text=True, check=True)
    d = json.loads(r.stdout)
    v = next(s for s in d["streams"] if s["codec_type"] == "video")
    au = next((s for s in d["streams"] if s["codec_type"] == "audio"), None)
    num, den = (int(x) for x in v["r_frame_rate"].split("/"))
    return {"file": rel(path), "name": Path(path).name, "bytes": int(d["format"]["size"]),
            "seconds": round(float(d["format"]["duration"]), 2), "width": v["width"], "height": v["height"],
            "fps": round(num / den, 2), "video": v["codec_name"], "profile": v.get("profile"),
            "colour": v.get("color_primaries"), "audio": au["codec_name"] if au else None,
            "audioKbps": round(int(au.get("bit_rate", 0)) / 1000) if au else None,
            "audioHz": int(au["sample_rate"]) if au else None}


def cmd_ship(a) -> None:
    players = load(a.players)
    save({"source": "ffprobe of the committed demo MP4s; the example players' own manifests", "mp4": [ffprobe(m) for m in a.mp4],
          "players": players}, a.out)


# ───────────────────────── images: crops and display-sized WebP copies ─────────────────────────
def cmd_images(a) -> None:
    from PIL import Image
    jobs = load(a.jobs)
    for j in jobs:
        im = Image.open(j["src"])
        im = im.convert("RGBA" if j.get("alpha") else "RGB")
        if j.get("crop"):
            im = im.crop(tuple(j["crop"]))
        if j.get("width") and im.width > j["width"]:
            im = im.resize((j["width"], round(im.height * j["width"] / im.width)), Image.LANCZOS)
        out = Path(j["out"])
        out.parent.mkdir(parents=True, exist_ok=True)
        if out.suffix == ".png":
            im.save(out, optimize=True)
        else:
            im.save(out, "WEBP", quality=j.get("quality", 86), method=6)
        print(f"wrote {rel(out)} {im.width}x{im.height} ({out.stat().st_size / 1024:.0f} KB)")


# ───────────────────────── paper: a one-page technical note for the fictional spark-bench ─────────────────────────
def cmd_paper(a) -> None:
    import fitz  # PyMuPDF
    readme = Path(a.readme).read_text(encoding="utf-8")
    res = load(a.results)
    abstract = readme.split("## Abstract", 1)[1].split("##", 1)[0].strip().replace("\n", " ")
    method = ("spark-bench fixes the variables that make sparse-attention speedups hard to compare. It records the GPU, "
              "driver and clocks and refuses to compare runs with different fingerprints; it fixes the seed and the clocks "
              "and warms up three times; it runs every kernel at every length five times and reports the median and the "
              "spread. Every value in this note is computed from results/demo-run.json (demo data).")
    doc = fitz.open()
    pg = doc.new_page(width=612, height=792)
    navy, cyan, amber, violet, grey, ink = (0.05, 0.075, 0.125), (0.184, 0.894, 0.941), (1.0, 0.71, 0.278), \
        (0.545, 0.486, 1.0), (0.42, 0.45, 0.5), (0.1, 0.12, 0.16)
    def box(rect, s, **o):                     # insert_textbox draws nothing when the text does not fit: fail loudly
        if pg.insert_textbox(rect, s, **o) < 0:
            raise SystemExit(f"paper: text does not fit {rect}: {s[:40]}...")
    box(fitz.Rect(54, 44, 558, 66), "spark-bench: reproducible benchmarks for sparse attention kernels",
        fontsize=13, fontname="hebo", align=1, color=ink)
    box(fitz.Rect(54, 68, 558, 84), "Technical note · fictional example project of the motion-showreel skill · demo data",
        fontsize=8.5, fontname="helv", align=1, color=grey)
    L, R = fitz.Rect(54, 100, 298, 744), fitz.Rect(314, 100, 558, 744)
    box(fitz.Rect(L.x0, L.y0, L.x1, L.y0 + 18), "Abstract", fontsize=10, fontname="hebo", color=ink)
    box(fitz.Rect(L.x0, L.y0 + 18, L.x1, L.y0 + 236), abstract, fontsize=8.6, fontname="tiro", color=ink)
    # Figure 1: the block mask from the README's pattern definition (64 x 64 blocks, band of 7, 2 global blocks)
    fx, fy, fs = L.x0 + 22, L.y0 + 244, 200
    pg.draw_rect(fitz.Rect(fx, fy, fx + fs, fy + fs), color=None, fill=navy)
    cell = fs / 64
    for i in range(64):
        for j in range(64):
            g, band = i < 2 or j < 2, abs(i - j) <= 3
            if g or band:
                pg.draw_rect(fitz.Rect(fx + j * cell + 0.25, fy + i * cell + 0.25, fx + (j + 1) * cell - 0.25, fy + (i + 1) * cell - 0.25),
                             color=None, fill=amber if g else cyan)
    box(fitz.Rect(L.x0, fy + fs + 8, L.x1, fy + fs + 52),
                      "Figure 1: The spark pattern at 64k tokens with 1,024-token blocks: a band of 7 blocks around the "
                      "diagonal plus 2 global blocks. 674 of 4,096 blocks (16.5%) are computed.", fontsize=8, fontname="helv", color=ink)
    # Figure 2: throughput relative to dense (results.json), grouped bars with value labels
    gx, gy, gw, gh = R.x0 + 30, R.y0 + 22, 206, 150
    lens, kern = res["lengths"], ["dense", "block-sparse", "spark"]
    cols = {"dense": grey, "block-sparse": violet, "spark": cyan}
    vmax = 4.5
    pg.draw_line(fitz.Point(gx, gy + gh), fitz.Point(gx + gw, gy + gh), color=ink, width=0.8)
    pg.draw_line(fitz.Point(gx, gy), fitz.Point(gx, gy + gh), color=ink, width=0.8)
    for v in (1, 2, 3, 4):
        yy = gy + gh - v / vmax * gh
        pg.draw_line(fitz.Point(gx, yy), fitz.Point(gx + gw, yy), color=(0.85, 0.87, 0.9), width=0.4)
        pg.insert_text(fitz.Point(gx - 16, yy + 3), f"{v}×", fontsize=6.5, fontname="helv", color=grey)
    gw_group = gw / len(lens)
    bw = gw_group * 0.22
    for li, ln in enumerate(lens):
        for ki, k in enumerate(kern):
            v = res["kernels"][k]["relative"][ln]
            x0 = gx + li * gw_group + gw_group * 0.14 + ki * (bw + 2)
            pg.draw_rect(fitz.Rect(x0, gy + gh - v / vmax * gh, x0 + bw, gy + gh), color=None, fill=cols[k])
            if k == "spark":
                pg.insert_text(fitz.Point(x0 - 1, gy + gh - v / vmax * gh - 3), f"{v:.1f}×", fontsize=6.5, fontname="hebo", color=ink)
        pg.insert_text(fitz.Point(gx + li * gw_group + gw_group * 0.36, gy + gh + 10), ln, fontsize=7, fontname="helv", color=ink)
    for ki, k in enumerate(kern):
        lx = gx + 6 + ki * 66
        pg.draw_rect(fitz.Rect(lx, gy - 12, lx + 7, gy - 5), color=None, fill=cols[k])
        pg.insert_text(fitz.Point(lx + 10, gy - 5.5), k, fontsize=6.5, fontname="helv", color=ink)
    box(fitz.Rect(R.x0, gy + gh + 18, R.x1, gy + gh + 62),
                      "Figure 2: Throughput relative to dense on the same machine, median of 5 seeded repeats (demo data). "
                      "At 64k tokens the spark kernel reaches 4.1× the dense throughput.", fontsize=8, fontname="helv", color=ink)
    my = gy + gh + 74
    box(fitz.Rect(R.x0, my, R.x1, my + 18), "Method", fontsize=10, fontname="hebo", color=ink)
    box(fitz.Rect(R.x0, my + 18, R.x1, my + 200), method, fontsize=8.6, fontname="tiro", color=ink)
    box(fitz.Rect(L.x0, fy + fs + 64, L.x1, 744), (
        "Most of a long attention matrix is empty, so a sparse kernel skips most of it. The gain grows with sequence "
        "length: 1.3× at 4k tokens, 2.4× at 16k, 3.3× at 32k and 4.1× at 64k, with a run-to-run spread of 1.8% "
        "(demo data)."), fontsize=8.6, fontname="tiro", color=ink)
    pg.insert_text(fitz.Point(300, 770), "1", fontsize=8, fontname="helv", color=grey)
    doc.set_metadata({"title": "spark-bench technical note (fictional example, demo data)", "author": "motion-showreel examples"})
    out = Path(a.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    doc.save(str(out))
    print(f"wrote {rel(out)}")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("sound")
    for k in ("--wav", "--music-json", "--cut", "--sync", "--out"):
        s.add_argument(k, required=True)
    s.add_argument("--window", default="8,14")
    s = sub.add_parser("narration")
    for k in ("--narration", "--mix-json", "--captions", "--stem", "--cut", "--out"):
        s.add_argument(k, required=True)
    s.add_argument("--window", default="0,15")
    s = sub.add_parser("plans")
    s.add_argument("--cut", action="append", required=True)
    s.add_argument("--out", required=True)
    s = sub.add_parser("styles")
    s.add_argument("--style", action="append", required=True)
    s.add_argument("--out", required=True)
    s = sub.add_parser("ship")
    s.add_argument("--mp4", action="append", required=True)
    s.add_argument("--players", required=True)
    s.add_argument("--out", required=True)
    s = sub.add_parser("images")
    s.add_argument("--jobs", required=True)
    s = sub.add_parser("paper")
    for k in ("--readme", "--results", "--out"):
        s.add_argument(k, required=True)
    a = ap.parse_args()
    {"sound": cmd_sound, "narration": cmd_narration, "plans": cmd_plans, "styles": cmd_styles, "ship": cmd_ship,
     "images": cmd_images, "paper": cmd_paper}[a.cmd](a)
    return 0


if __name__ == "__main__":
    sys.exit(main())
