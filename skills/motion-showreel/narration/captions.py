#!/usr/bin/env python3
"""Captions for narrated showreels: SRT, WebVTT and burn-in cues from the narration timeline.

  python3 captions.py --project P --cut 30 [--no-write-cut] [--max-chars N] [--lines 2] [--lead 0.3] [--hold 1.6]
  python3 captions.py --project P --cut 30 --from-cut     # export the cut JSON's existing captions only

Reads  P/build/cut-<cut>.json, P/build/vo-timeline.json (vo_timeline.py), P/style.json layout.captions
       (size, font, fg, bg, y), P/reel.config.json captions.enabled, P/narration.json captions (overrides).
Writes P/build/captions-<cut>.srt, .vtt, .json and, when captions are enabled, the "captions" array of the
       cut JSON ([{t0, t1, text, scene}], "\\n" between lines) that the runtime burns in, so the video and the
       sidecar files always match. Re-run after every plan_cut.py run.

Rules: a cue never splits a word; a long sentence becomes several cues (sentence end > clause > space nearest
the middle), each at most --lines lines that fit the frame at the caption size; cue times follow the speech
by spoken weight, the first cue of a line appears --lead s early, the last one holds up to --hold s but not
past the next cue or the scene cut.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.dont_write_bytecode = True   # keep the skill folder free of __pycache__
import vo_timeline as V  # noqa: E402

PRE, POST = 0.04, 0.12          # silence kept inside clips before / after the speech (tts_gemini.py trim)
LATIN_EM = 0.55                 # average Latin glyph width in em
OPEN_PUNCT = set("([{“‘「『（")
CLOSE_PUNCT = set(")]}.,!?;:”’、。！？）」』%")
NO_BREAK_AFTER = {"en": {"a", "an", "the", "of", "to", "in", "on", "at", "by", "for", "and", "or", "with", "from", "as", "per",
                         "mr.", "dr.", "no.", "vs.", "&"},
                  "ko": {"한", "두", "세", "네", "그", "이", "저", "첫", "각", "총", "약", "단", "매", "몇", "모든", "어느"}}
KO_MODIFIER_END = set("는은던한될할운인친린된울쁜큰긴")   # common adnominal (관형형) endings
NO_LINE_START = set("ぁぃぅぇぉっゃゅょゎァィゥェォッャュョヮヵヶー")   # kinsoku: never start a line with these
JA_PARTICLE_END = set("はがをにでとへもや")                          # a break right after a particle reads naturally
UNIT_NEXT = re.compile(r"^(%|Å|°|ms|s|x|×|km|kg|mb|gb|tb|fps|bpm|개|건|명|가지|번|배|초|분|시간|년|월|일|원|달러|위|등|종|문항)", re.I)


def em(s: str) -> float:
    """Approximate rendered width of s in em."""
    w = 0.0
    for ch in s:
        o = ord(ch)
        if 0x1100 <= o <= 0x11FF or 0x2E80 <= o <= 0xA4CF or 0xAC00 <= o <= 0xD7A3 or 0xF900 <= o <= 0xFAFF or 0xFF00 <= o <= 0xFF60:
            w += 1.0
        elif ch == " ":
            w += 0.28
        elif ch in ".,:;'!|il1’":
            w += 0.3
        elif ch.isupper() or ch in "mwMW@%&":
            w += 0.72
        else:
            w += LATIN_EM
    return w


def options(proj: dict, st: dict, args=None) -> dict:
    layout = proj["style"].get("layout") or {}
    lay = layout.get("captions") or {}
    nc = proj["narr"].get("captions") or {}
    W, H = proj["size"]
    size = float(lay.get("size") or 40)                         # runtime default (engine.js drawCaptions)
    # the runtime wraps at W - 2 * max(layout.margin or 120, 0.08 W) unless layout.captions.maxWidth is set
    max_w = float(lay.get("maxWidth") or W - 2 * max(float(layout.get("margin") or 120), 0.08 * W))
    cjk = st["family"] in ("ko", "ja", "zh")
    max_chars = (getattr(args, "max_chars", None) if args else None) or nc.get("maxChars")
    if max_chars:
        max_em = min(float(max_chars) * (1.0 if cjk else LATIN_EM), 0.97 * max_w / size)
    else:   # readability ceiling (about 22 CJK or 42 Latin characters), narrowed by the runtime's line width
        max_em = min(22.0 if cjk else 42 * LATIN_EM, 0.97 * max_w / size)

    def pick(name, key, default):
        v = getattr(args, name, None) if args else None
        return float(v if v is not None else nc.get(key, default))
    return {"lead": pick("lead", "lead", 0.3), "hold": pick("hold", "hold", 1.6), "minDur": pick("min_dur", "minDur", 0.9),
            "mergeGap": float(nc.get("mergeGap", 0.25)), "maxLines": int(pick("lines", "maxLines", 2)),
            "maxEm": round(max_em, 2), "family": st["family"], "lang": st["lang"], "size": size, "cjk": cjk}


def _kind(ch: str) -> str:
    o = ord(ch)
    if 0x30A0 <= o <= 0x30FF:
        return "kata"
    if 0x3040 <= o <= 0x309F:
        return "hira"
    if 0x3400 <= o <= 0x9FFF or 0xF900 <= o <= 0xFAFF:
        return "han"
    return "alnum" if ch.isalnum() or ch in ",." else "other"


def _breaks(s: str) -> list[int]:
    if " " in s.strip():
        return [i for i, c in enumerate(s) if c == " "]
    # no spaces (ja/zh): any character boundary except inside katakana words and Latin/number runs (kinsoku applied)
    return [i for i in range(1, len(s)) if s[i] not in CLOSE_PUNCT and s[i] not in NO_LINE_START and s[i - 1] not in OPEN_PUNCT
            and not (_kind(s[i - 1]) == _kind(s[i]) and _kind(s[i]) in ("kata", "alnum"))]


def _penalty(a: str, b: str, fam: str) -> float:
    last = a.split()[-1] if a.split() else a[-1:]
    first = b.split()[0] if b.split() else b[:1]
    p = 0.0
    if last.lower() in NO_BREAK_AFTER.get(fam, set()):
        p += 6
    if fam == "ko" and len(last) >= 2 and last[-1] in KO_MODIFIER_END:
        p += 3   # an adnominal ending binds to the next noun (놓친 / 중대 사례)
    if fam == "ja" and a and b:
        k0, k1 = _kind(a[-1]), _kind(b[0])
        if a[-1] in JA_PARTICLE_END and k1 != "hira":
            p -= 3                      # after a particle, before the next word
        elif k0 == "han" and k1 in ("han", "hira"):
            p += 4                      # inside a kanji compound or before its okurigana
        if b[0] in JA_PARTICLE_END | {"の"} and k0 != "hira":
            p += 4                      # a line never starts with a particle
    if re.fullmatch(r"[\d.,]+", last) and UNIT_NEXT.match(first):
        p += 12
    if re.search(r"[,.;:!?、。，！？]$", a):
        p -= 8   # a clause break beats a perfectly balanced but syntactically odd one
    return p


def wrap(s: str, o: dict, n: int | None = None) -> list[str] | None:
    """Best split of s into at most n lines that each fit maxEm (balanced, no bad breaks); None if impossible."""
    s = s.strip()
    n = o["maxLines"] if n is None else n
    if em(s) <= o["maxEm"]:
        return [s]
    if n <= 1:
        return None
    best = None
    for c in _breaks(s):
        a, rest = s[:c].rstrip(), s[c:].lstrip()
        if not a or not rest or em(a) > o["maxEm"]:
            continue
        tail = wrap(rest, o, n - 1)
        if tail is None:
            continue
        widths = [em(a)] + [em(x) for x in tail]
        cost = (max(widths) - min(widths)) + _penalty(a, rest, o["family"])
        if best is None or cost < best[0]:
            best = (cost, [a] + tail)
    return best[1] if best else None


def split_chunks(s: str, o: dict) -> list[str]:
    """Split a caption into cue-sized chunks: sentence ends first, then clauses, then the space nearest the middle."""
    s = s.strip()
    if not s or wrap(s, o) is not None:
        return [s] if s else []
    total = em(s)
    tiers = [[m.end() for m in re.finditer(r"[.!?…]+[\"'”’)]*\s+|[。！？]+[\"'”’)」』]*\s*", s)],   # never 2.5 or v1.2
             [m.end() for m in re.finditer(r"(?<!\d),\s*|,(?!\d)\s*|[;:、，；：]\s*|\s[—–-]\s", s)],
             [c + 1 for c in _breaks(s)] if " " in s else _breaks(s)]
    for i, tier in enumerate(tiers):
        lo = 0.2 if i < 2 else 0.0
        cands = [c for c in tier if 0 < c < len(s) and s[:c].strip() and s[c:].strip() and lo * total <= em(s[:c]) <= (1 - lo) * total]
        if cands:
            c = min(cands, key=lambda k: abs(em(s[:k]) - total / 2) + (0 if i < 2 else _penalty(s[:k].rstrip(), s[k:].lstrip(), o["family"])))
            return split_chunks(s[:c], o) + split_chunks(s[c:], o)
    return [s]   # unbreakable (one huge word): show as is


def _weight(s: str, lang: str) -> float:
    a = V.analyze(s, lang)
    return max(0.5, a["dsyl"]) + 2.0 * a["clauses"] + 3.0 * a["sentences"]


def build_cues(lines: list[dict], duration: float, proj: dict, st: dict, o: dict | None = None) -> list[dict]:
    """Caption cues for placed lines (dicts with t0, t1, caption, scene, key, sceneT1), sorted by time."""
    o = o or options(proj, st)
    chunks = []
    for ln in sorted(lines, key=lambda x: x["t0"]):
        text = (ln.get("caption") or "").strip()
        if not text:
            continue
        s0, s1 = ln["t0"] + PRE, max(ln["t0"] + PRE + 0.1, ln["t1"] - POST)
        parts = split_chunks(text, o)
        ws = [_weight(p, o["lang"]) for p in parts]
        acc, tot = 0.0, sum(ws)
        for j, (p, w) in enumerate(zip(parts, ws)):
            a, acc = s0 + (s1 - s0) * acc / tot, acc + w
            lines_ = wrap(p, o) or [p]
            chunks.append({"s0": a, "s1": s0 + (s1 - s0) * acc / tot, "text": "\n".join(lines_), "scene": ln["scene"],
                           "key": ln["key"], "first": j == 0, "last": j == len(parts) - 1,
                           "sceneT0": float(ln.get("sceneT0", 0.0)), "sceneT1": float(ln.get("sceneT1", duration))})
    cues: list[dict] = []
    starts = [c["s0"] - (o["lead"] if c["first"] else 0.0) for c in chunks]
    for i, c in enumerate(chunks):
        start = max(0.0, starts[i], cues[-1]["t1"] if cues else 0.0)
        nxt = starts[i + 1] if i + 1 < len(chunks) else duration
        if c["last"]:
            end = max(c["s1"], min(nxt, c["s1"] + o["hold"], max(c["s1"], c["sceneT1"])))
        else:
            end = max(c["s1"], nxt)
        end = max(end, min(nxt, start + o["minDur"]))
        end = min(end, duration)
        if end - start < 0.05:
            continue
        cues.append({"t0": start, "t1": end, "text": c["text"], "scene": c["scene"], "key": c["key"],
                     "sceneT0": c["sceneT0"], "speechEnd": c["s1"]})
    snap = float(o.get("snap", 0.25))
    for i, b in enumerate(cues):   # captions change on scene cuts, not a few frames off them
        a = cues[i - 1] if i else None
        cut = b["sceneT0"]
        if a is None or a["scene"] == b["scene"] or cut <= 0:
            continue
        if a["speechEnd"] <= cut + 1e-6 and (a["t1"] > cut or cut - a["t1"] < snap):
            a["t1"] = cut                       # leave with the cut; never bridge it once the speech is over
        if cut < b["t0"] < cut + snap and a["t1"] <= cut + 1e-6:
            b["t0"] = cut                       # appear on the cut
    for a, b in zip(cues, cues[1:]):
        if 0 < b["t0"] - a["t1"] < o["mergeGap"]:
            a["t1"] = b["t0"]
        if a["t1"] > b["t0"]:
            a["t1"] = b["t0"]
    for c in cues:
        c["t0"], c["t1"] = round(c["t0"], 3), round(c["t1"], 3)
        del c["sceneT0"], c["speechEnd"]
    return [c for c in cues if c["t1"] - c["t0"] >= 0.05]


def stats(cues: list[dict], o: dict) -> dict:
    if not cues:
        return {"n": 0}

    def chars(t):
        t = t.replace("\n", " ")
        return len(t.replace(" ", "")) if o["cjk"] else len(t)
    cps = [chars(c["text"]) / max(1e-3, c["t1"] - c["t0"]) for c in cues]
    return {"n": len(cues), "twoLine": sum("\n" in c["text"] for c in cues),
            "maxLineEm": round(max(em(x) for c in cues for x in c["text"].split("\n")), 2),
            "minDur": round(min(c["t1"] - c["t0"] for c in cues), 2), "avgCps": round(sum(cps) / len(cps), 1),
            "maxCps": round(max(cps), 1), "cpsUnit": "chars/s without spaces" if o["cjk"] else "chars/s"}


def ts(t: float, sep: str) -> str:
    ms = int(round(max(0.0, t) * 1000))
    h, ms = divmod(ms, 3600000)
    m, ms = divmod(ms, 60000)
    s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d}{sep}{ms:03d}"


def to_srt(cues: list[dict]) -> str:
    return "".join(f"{i}\n{ts(c['t0'], ',')} --> {ts(c['t1'], ',')}\n{c['text']}\n\n" for i, c in enumerate(cues, 1))


def to_vtt(cues: list[dict], proj: dict) -> str:
    lay = (proj["style"].get("layout") or {}).get("captions") or {}
    fonts = proj["style"].get("fonts") or {}
    font = lay.get("font")
    font = fonts.get(font, font) if isinstance(font, str) else None
    css = []
    if lay.get("fg"):
        css.append(f"color: {lay['fg']};")
    if lay.get("bg"):
        css.append(f"background-color: {lay['bg']};")
    if font:
        css.append(f"font-family: {font};")
    head = "WEBVTT\n\n" + (("STYLE\n::cue {\n  " + "\n  ".join(css) + "\n}\n\n") if css else "")
    y = lay.get("y")
    pos = ""
    if isinstance(y, (int, float)) and y > 0:
        pct = y * 100 if y <= 1 else 100.0 * y / float(proj["size"][1])
        pos = f" line:{min(100, max(0, round(pct)))}% align:center"
    body = "".join(f"{ts(c['t0'], '.')} --> {ts(c['t1'], '.')}{pos}\n{c['text']}\n\n" for c in cues)
    return head + body


def enabled(proj: dict) -> bool:
    rc = proj["cfg"].get("captions")
    if isinstance(rc, dict) and "enabled" in rc:
        return bool(rc["enabled"])
    lay = (proj["style"].get("layout") or {}).get("captions") or {}
    if "enabled" in lay:
        return bool(lay["enabled"])
    return bool((proj["narr"].get("captions") or {}).get("enabled", True))


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--project", required=True)
    ap.add_argument("--cut", required=True)
    ap.add_argument("--no-write-cut", action="store_true", help="do not write cues into build/cut-<cut>.json")
    ap.add_argument("--from-cut", action="store_true", help="export the captions already in the cut JSON")
    ap.add_argument("--max-chars", type=int, help="characters per line (CJK characters for ko/ja/zh)")
    ap.add_argument("--lines", type=int, help="lines per cue (default 2)")
    ap.add_argument("--lead", type=float, help="seconds a line's first cue appears before its speech (default 0.3)")
    ap.add_argument("--hold", type=float, help="seconds a line's last cue may stay after its speech (default 1.6)")
    ap.add_argument("--min-dur", type=float, help="minimum cue duration when room allows (default 0.9)")
    ap.add_argument("--scale", type=float, help="comprehension slow-down variant (uniform)")
    ap.add_argument("--warp", help="comprehension slow-down variant, knots 'o:s,o:s,...'")
    a = ap.parse_args()
    proj = V.load_project(a.project, need_narration=not a.from_cut)
    b = proj["P"] / "build"
    cut = V.load_cut(proj, a.cut)
    tag = a.cut + (f"-x{a.scale:g}" if a.scale else "") + ("-warp" if a.warp else "")
    if a.from_cut:
        o = {"cjk": bool(V.HANGUL.search(json.dumps(cut.get("captions", []), ensure_ascii=False)))}
        cues = [{"t0": float(c["t0"]), "t1": float(c["t1"]), "text": c["text"], "scene": c.get("scene")} for c in cut.get("captions") or []]
        st_ = stats(cues, o)
    else:
        vtp = b / "vo-timeline.json"
        if not vtp.exists():
            raise SystemExit(f"missing {vtp}: run narration/vo_timeline.py --project {a.project} first")
        vt = V.read_json(vtp)
        st = V.settings(proj)
        o = options(proj, st, a)
        pl = V.place(vt, cut, V.time_map(a.scale, a.warp), V.cut_narrated(proj, a.cut))
        cues = build_cues(pl["lines"], pl["duration"], proj, st, o)
        st_ = stats(cues, o)
        V.write_json(b / f"captions-{tag}.json", {"cut": a.cut, "duration": pl["duration"], "lang": st["lang"], "maxEm": o["maxEm"],
                                                 "maxLines": o["maxLines"], "cues": cues, "stats": st_})
        for w in pl["warnings"]:
            print(f"  ! {w}")
        for w in pl["notes"]:
            print(f"  · {w}")
    (b / f"captions-{tag}.srt").write_text(to_srt(cues), encoding="utf-8")
    (b / f"captions-{tag}.vtt").write_text(to_vtt(cues, proj), encoding="utf-8")
    print(f"captions {a.cut}: {st_.get('n', 0)} cues" + (f" · two-line {st_['twoLine']} · shortest {st_['minDur']} s · "
          f"reading speed avg {st_['avgCps']} / max {st_['maxCps']} {st_['cpsUnit']}" if st_.get("n") else ""))
    if st_.get("n"):
        limit = 14 if o.get("cjk") else 20
        if st_["maxCps"] > limit:
            print(f"  ! fastest cue reads at {st_['maxCps']} {st_['cpsUnit']} (> {limit}); trim that narration line")
    print(f"wrote build/captions-{tag}.srt, .vtt" + ("" if a.from_cut else ", .json"))
    if not a.from_cut and not a.no_write_cut and not a.scale and not a.warp:
        if enabled(proj):
            cut["captions"] = [{"t0": c["t0"], "t1": c["t1"], "text": c["text"], "scene": c["scene"]} for c in cues]
            (b / f"cut-{a.cut}.json").write_text(json.dumps(cut, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            print(f"wrote {len(cues)} burn-in cues into build/cut-{a.cut}.json")
        else:
            print("captions disabled (reel.config / style.json): burn-in cues not written; SRT/VTT are sidecars only")
    return 0


if __name__ == "__main__":
    sys.exit(main())
