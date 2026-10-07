#!/usr/bin/env python3
"""Narration timeline for motion-showreel projects.

Lays out each scene's narration lines (lead, gaps, tail, optional beat anchors), turns the seconds a scene
needs into whole bars at the project's fixed BPM, places lines on a planned cut, and writes script tables
with speaking-rate warnings. Narration never changes the tempo or slows animation: a scene that needs more
time gets more bars, and the extra time is a living hold.

  python3 vo_timeline.py --project P             -> P/build/vo-timeline.json, vo-minbars.json, vo-script.md
  python3 vo_timeline.py --project P --cut 30    -> also P/build/vo-30.json and script-30.md (needs build/cut-30.json)
  python3 vo_timeline.py --project P --estimate  -> ignore clips, plan from text estimates (before any TTS)

Line durations come from, in order: the line's own "file" (a human recording), the TTS cache
(tts_gemini.py batch), the dry-run cache (tts_gemini.py batch --dry-run), else a text-based estimate.
tts_gemini.py, captions.py and mix_vo.py import this module; keep its function names stable.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import re
import subprocess
import sys
import unicodedata
import wave
from pathlib import Path

# ---------------------------------------------------------------- defaults
SR = 24000                                   # Gemini TTS clips: 24 kHz, 16-bit, mono
DEFAULT_VOICE = "Puck"
DEFAULT_STYLE = "[fast, energetic]"
DEFAULT_MODEL = "gemini-3.8-flash-tts"
TIMING = {"lead": 0.3, "gap": 0.12, "tail": 0.5}   # seconds: scene start -> first word, between lines, last word -> scene end
MAX_RATE = {"ko": 6.3, "ja": 8.0, "zh": 5.0, "en": 3.0}   # density ceiling: narration units per second of scene
UNIT = {"ko": "syl", "ja": "mora", "zh": "syl", "en": "words"}
SEP_MIN = 0.15                               # minimum silence between the last word of a scene and the next scene's first
# Speech rate used for estimates, in duration units (ko syllables, ja morae, zh syllables, en syllables) per
# second of speech, excluding pauses. Calibrated on Gemini TTS Puck clips ("fast" = "[fast, energetic]").
SPEECH_RATE = {
    "ko": {"fast": 7.4, "medium": 6.6, "calm": 5.6},
    "ja": {"fast": 8.6, "medium": 7.6, "calm": 6.4},
    "zh": {"fast": 5.6, "medium": 4.8, "calm": 4.0},
    "en": {"fast": 5.9, "medium": 5.1, "calm": 4.3},
}
PAUSE = {"fast": (0.08, 0.26), "medium": (0.12, 0.34), "calm": (0.16, 0.42)}   # (clause, sentence) pause inside a line
MARGIN = 0.16                                # trimmed clips keep 0.04 s before and 0.12 s after the speech

# ---------------------------------------------------------------- text analysis
HANGUL = re.compile(r"[\uac00-\ud7a3]")
KANA = re.compile(r"[\u3040-\u30ff\u31f0-\u31ff]")
CJK = re.compile(r"[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]")
TAG = re.compile(r"\[[^\]]*\]")               # bracket audio tags shape delivery and are not spoken
SMALL_KANA = set("ゃゅょぁぃぅぇぉゎャュョァィゥェォヮ")
TOKEN = re.compile(
    r"\d+(?:,\d{3})*(?:\.\d+)?(?:st|nd|rd|th)?"          # numbers (4,600 · 0.71 · 1st)
    r"|[A-Za-z]+(?:['\u2019][A-Za-z]+)*"                    # Latin words
    r"|[\uac00-\ud7a3]+"                                    # Hangul
    r"|[\u3040-\u30ff\u31f0-\u31ff]+"                       # kana
    r"|[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]+"          # CJK ideographs
    r"|[%&+@\u00d7$\u20ac\u00a3\u00a5\u00b0]")              # spoken symbols
CLAUSE = re.compile(r"(?<!\d),|,(?!\d)|[;:\u3001\uff0c\uff1b\uff1a\u2014]|\s[-\u2013]\s")
SENTENCE = re.compile(r"[.!?\u2026]+(?=[\"'\u201d\u2019)]*\s+\S)|[\u3002\uff01\uff1f]+(?=\S)")
FAST = re.compile(r"fast|energetic|excit|upbeat|quick|rapid|hype|punchy|lively|urgent|brisk|빠르|빨리|활기|신나|힘차", re.I)
CALM = re.compile(r"calm|slow|soft|gentle|warm|relax|measured|sooth|whisper|thoughtful|serious|tender|차분|천천|부드럽|따뜻|잔잔", re.I)

KO_DIG = "영일이삼사오육칠팔구"
KO_LETTER = dict(zip("ABCDEFGHIJKLMNOPQRSTUVWXYZ", [2, 1, 1, 1, 1, 2, 1, 3, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 2, 3, 2, 2, 1]))
KO_SYMBOL = {"%": "퍼센트", "&": "앤드", "+": "플러스", "@": "앳", "\u00d7": "곱하기", "$": "달러", "\u20ac": "유로",
             "\u00a3": "파운드", "\u00a5": "엔", "\u00b0": "도"}
EN_SYMBOL = {"%": ["percent"], "&": ["and"], "+": ["plus"], "@": ["at"], "\u00d7": ["times"], "$": ["dollars"],
             "\u20ac": ["euros"], "\u00a3": ["pounds"], "\u00a5": ["yen"], "\u00b0": ["degrees"]}
ONES = ("zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen "
        "seventeen eighteen nineteen").split()
TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"]
SCALES = [(10 ** 12, "trillion"), (10 ** 9, "billion"), (10 ** 6, "million"), (1000, "thousand")]
WORD_ACRONYMS = {"NASA", "NATO", "JSON", "YAML", "GIF", "JPEG", "SaaS", "LASER", "RAM", "ROM", "SIM", "PIN", "WIFI"}


def lang_family(lang: str | None) -> str:
    """ko | ja | zh | en (every other language uses the Latin-script heuristics)."""
    base = re.split(r"[-_]", (lang or "en").lower())[0]
    return base if base in ("ko", "ja", "zh") else "en"


def detect_lang(texts: list[str]) -> str:
    s = " ".join(texts)
    if HANGUL.search(s):
        return "ko"
    if KANA.search(s):
        return "ja"
    if CJK.search(s):
        return "zh"
    return "en"


def pace_of(style: str | None) -> str:
    s = style or ""
    return "fast" if FAST.search(s) else "calm" if CALM.search(s) else "medium"


def ko_int_read(n: int) -> str:
    """Sino-Korean reading of an integer (4600 -> 사천육백)."""
    if n == 0:
        return "영"
    out = ""
    for val, name in ((10 ** 16, "경"), (10 ** 12, "조"), (10 ** 8, "억"), (10 ** 4, "만")):
        q, n = divmod(n, val)
        if q:
            out += ("" if (q == 1 and name == "만") else _ko_4(q)) + name
    return out + _ko_4(n)


def _ko_4(n: int) -> str:
    s = ""
    for val, name in ((1000, "천"), (100, "백"), (10, "십")):
        q, n = divmod(n, val)
        if q:
            s += ("" if q == 1 else KO_DIG[q]) + name
    return s + (KO_DIG[n] if n else "")


def ko_num_read(tok: str) -> str:
    ip, _, dp = re.sub(r"[^\d.]", "", tok).partition(".")
    s = ko_int_read(int(ip)) if ip else ""
    return s + ("점" + "".join(KO_DIG[int(c)] for c in dp) if dp else "")


def en_int_words(n: int) -> list[str]:
    if n < 20:
        return [ONES[n]]
    if n < 100:
        return [TENS[n // 10]] + ([ONES[n % 10]] if n % 10 else [])
    if n < 1000:
        return [ONES[n // 100], "hundred"] + (en_int_words(n % 100) if n % 100 else [])
    for val, name in SCALES:
        if n >= val:
            q, r = divmod(n, val)
            return en_int_words(q) + [name] + (en_int_words(r) if r else [])
    return [str(n)]


def en_num_words(tok: str) -> list[str]:
    """Spoken English words for a number token (2026 -> twenty twenty six, 0.71 -> zero point seven one)."""
    raw = re.sub(r"(st|nd|rd|th)$", "", tok)
    ip, _, dp = raw.replace(",", "").partition(".")
    n = int(ip) if ip else 0
    if not dp and "," not in raw and len(ip) == 4 and (1100 <= n <= 1999 or 2010 <= n <= 2099):
        hi, lo = divmod(n, 100)
        return en_int_words(hi) + (en_int_words(lo) if lo >= 10 else (["oh"] + en_int_words(lo) if lo else ["hundred"]))
    words = en_int_words(n)
    return words + (["point"] + [ONES[int(c)] for c in dp] if dp else [])


def en_syl(word: str) -> int:
    """Heuristic English syllable count (about 90% exact; good enough for timing)."""
    w = re.sub(r"[^a-z]", "", word.lower())
    if not w:
        return 0
    if len(w) <= 3:
        return 1
    extra = 0
    if w.endswith(("ted", "ded")):
        extra, w = 1, w[:-2]
    elif w.endswith("ed"):
        w = w[:-2]
    elif w.endswith("es") and not w.endswith(("ses", "zes", "ches", "shes", "ges", "ces", "xes")):
        w = w[:-2]
    elif w.endswith("e") and not w.endswith(("le", "ee", "ye")):
        w = w[:-1]
    w = re.sub(r"^y", "", w)
    return max(1, len(re.findall(r"[aeiouy]{1,2}", w)) + extra)


def _latin_parts(w: str) -> list[str]:
    """Split camelCase / PascalCase names into spoken parts: TrailMix -> Trail Mix, BioNeMo -> Bio Ne Mo."""
    return re.findall(r"[A-Z]+(?![a-z])|[A-Z]?[a-z]+(?:['\u2019][a-z]+)*|[A-Z]", w) or [w]


def _spelled(part: str) -> bool:
    if part in WORD_ACRONYMS or not part.isupper():
        return False
    return len(part) <= 3 or not re.search(r"[AEIOUY]", part)


def analyze(say: str, lang: str) -> dict:
    """Spoken size of a line. units = the rate unit (ko syllables, en words, ...), dsyl = duration syllables."""
    fam = lang_family(lang)
    text = TAG.sub(" ", say)
    units = dsyl = 0.0
    for m in TOKEN.finditer(text):
        tok = m.group(0)
        if tok[0].isdigit():
            if fam == "ko":
                n = len(ko_num_read(tok))
                units += n
                dsyl += n
            elif fam == "en":
                ws = en_num_words(tok)
                units += len(ws)
                dsyl += sum(en_syl(x) for x in ws)
            else:   # ja / zh: rough per-digit size
                n = len(re.sub(r"\D", "", tok)) * (1.5 if fam == "ja" else 1.2)
                units += n
                dsyl += n
        elif tok[0].isascii() and tok[0].isalpha():
            for part in _latin_parts(tok):
                if _spelled(part):
                    if fam == "ko":
                        n = sum(KO_LETTER.get(c, 1) for c in part)
                        units += n
                        dsyl += n
                    else:
                        units += len(part) if fam == "en" else sum(KO_LETTER.get(c, 1) for c in part)
                        dsyl += sum(3 if c == "W" else 1 for c in part) * (1.0 if fam == "en" else 1.6)
                else:
                    s = en_syl(part)
                    if fam == "ko":
                        n = round(s * 1.7 + 0.3)
                        units += n
                        dsyl += n
                    elif fam == "en":
                        units += 1
                        dsyl += s
                    else:
                        units += s * 1.8
                        dsyl += s * 1.8
        elif HANGUL.match(tok):
            units += len(tok)
            dsyl += len(tok)
        elif KANA.match(tok):
            n = sum(0 if c in SMALL_KANA else 1 for c in tok)
            units += n
            dsyl += n
        elif CJK.match(tok):
            n = len(tok) * (1.7 if fam == "ja" else 1.0)
            units += n
            dsyl += n
        else:   # spoken symbol
            if fam == "en":
                ws = EN_SYMBOL.get(tok, [tok])
                units += len(ws)
                dsyl += sum(en_syl(x) for x in ws)
            else:
                n = len(KO_SYMBOL.get(tok, "x")) if fam == "ko" else 2
                units += n
                dsyl += n
    body = text.strip()
    return {"units": round(units, 2), "unit": UNIT[fam], "dsyl": round(dsyl, 2),
            "clauses": len(CLAUSE.findall(body)), "sentences": len(SENTENCE.findall(body))}


def estimate(say: str, lang: str, style: str | None = None) -> float:
    """Estimated clip length in seconds (trim margins included), for planning and dry-run placeholders."""
    fam, pace = lang_family(lang), pace_of(style)
    a = analyze(say, lang)
    pc, ps = PAUSE[pace]
    return round(a["dsyl"] / SPEECH_RATE[fam][pace] + a["clauses"] * pc + a["sentences"] * ps + MARGIN, 3)


def apply_lexicon(text: str, lexicon: dict) -> str:
    """Display text -> spoken text. Latin keys match whole words; other keys match anywhere. Longest key first."""
    out = text
    for k in sorted(lexicon or {}, key=len, reverse=True):
        v = lexicon[k]
        if re.search(r"[A-Za-z0-9]", k):
            out = re.sub(r"(?<![A-Za-z0-9])" + re.escape(k) + r"(?![A-Za-z0-9])", lambda _m, v=v: v, out)
        else:
            out = out.replace(k, v)
    return out


# ---------------------------------------------------------------- project
def read_json(path: Path, default=None):
    try:
        return json.loads(Path(path).read_text(encoding="utf-8"))
    except FileNotFoundError:
        if default is not None:
            return default
        raise SystemExit(f"missing {path}") from None
    except json.JSONDecodeError as e:
        raise SystemExit(f"{path}: invalid JSON ({e})") from None


def write_json(path: Path, data) -> None:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")


def load_project(P, need_narration: bool = True) -> dict:
    P = Path(P).expanduser().resolve()
    cfg = read_json(P / "reel.config.json")
    sp = P / (cfg.get("style") or "style.json")
    style = read_json(sp, {}) if sp.exists() else {}
    bpm = cfg.get("bpm") or (style.get("sound") or {}).get("bpm")
    if not bpm:
        raise SystemExit("no BPM: set reel.config.json 'bpm' or style.json sound.bpm")
    bpb = int(cfg.get("beatsPerBar") or 4)
    beat = 60.0 / float(bpm)
    narr = read_json(P / "narration.json") if need_narration else read_json(P / "narration.json", {})
    return {"P": P, "cfg": cfg, "style": style, "narr": narr, "bpm": float(bpm), "bpb": bpb, "beatSec": beat,
            "barSec": beat * bpb, "sceneIds": [s["id"] for s in cfg.get("scenes", [])],
            "size": cfg.get("size") or [1920, 1080], "fps": cfg.get("fps") or 60,
            "title": cfg.get("title") or P.name}


def settings(proj: dict) -> dict:
    """Narration-wide settings: narration.json > style.json narration > defaults."""
    n, sn = proj["narr"], (proj["style"].get("narration") or {})
    lang = n.get("lang") or sn.get("lang") or detect_lang([str(x.get("text", "")) for x in n.get("lines", [])])
    style = n["style"] if n.get("style") is not None else sn.get("styleTag", DEFAULT_STYLE)
    timing = {**TIMING, **{k: v for k, v in (n.get("timing") or {}).items() if v is not None}}
    fam = lang_family(lang)
    timing["maxRate"] = float(timing.get("maxRate") or MAX_RATE.get(fam, 3.0))
    return {"lang": lang, "family": fam, "voice": n.get("voice") or sn.get("voice") or DEFAULT_VOICE,
            "style": style or "", "model": n.get("model") or DEFAULT_MODEL, "timing": timing,
            "sceneTiming": n.get("scenes") or {}, "lexicon": n.get("lexicon") or {}, "unit": UNIT[fam]}


def cache_key(model: str, voice: str, style: str, say: str) -> str:
    """Per-sentence cache key: sha1(model|voice|style|text) of exactly what is sent to the TTS."""
    return hashlib.sha1(f"{model}|{voice}|{style}|{say}".encode("utf-8")).hexdigest()[:20]


def load_lines(proj: dict, st: dict | None = None) -> list[dict]:
    """narration.json lines -> normalized line dicts in narration order (keys '<scene>.<k>' unless 'id' is given)."""
    st = st or settings(proj)
    ids = set(proj["sceneIds"])
    per, seen, out = {}, set(), []
    for i, ln in enumerate(proj["narr"].get("lines") or []):
        scene = ln.get("scene")
        text = unicodedata.normalize("NFC", str(ln.get("text") or "")).strip()   # decomposed Hangul breaks counting
        if scene not in ids:
            raise SystemExit(f"narration line {i}: unknown scene {scene!r} (reel.config.json scenes: {sorted(ids)})")
        if not text and not ln.get("file"):
            raise SystemExit(f"narration line {i}: empty text")
        k = per.get(scene, 0)
        per[scene] = k + 1
        key = str(ln.get("id") or f"{scene}.{k}")
        if key in seen:
            raise SystemExit(f"narration line {i}: duplicate id {key!r}")
        seen.add(key)
        say = unicodedata.normalize("NFC", str(ln.get("say") or apply_lexicon(text, st["lexicon"]))).strip()
        cap = ln.get("caption", text)
        cap = unicodedata.normalize("NFC", str(cap)) if cap else cap
        voice, model = ln.get("voice") or st["voice"], ln.get("model") or st["model"]
        style = str(ln["style"] if ln.get("style") is not None else st["style"])
        cuts = ln.get("cuts")
        out.append({"key": key, "scene": scene, "index": k, "order": i, "text": text, "say": say,
                    "caption": (str(cap).strip() if cap else ""), "voice": voice, "style": style, "model": model,
                    "sha": cache_key(model, voice, style, say), "beat": ln.get("beat"), "gapAfter": ln.get("gapAfter"),
                    "cuts": [str(c) for c in cuts] if cuts else None, "optional": bool(ln.get("optional")),
                    "gain": float(ln.get("gain") or 0.0), "verify": ln.get("verify", True) is not False,
                    "visual": ln.get("visual") or "", "custom": ln.get("file")})
    return out


def cache_dir(proj: dict, override=None) -> Path:
    """TTS cache: --cache > env MSR_TTS_CACHE > the cache recorded in build/vo/manifest.json > P/build/vo/cache."""
    if override:
        return Path(override).expanduser().resolve()
    if os.environ.get("MSR_TTS_CACHE"):
        return Path(os.environ["MSR_TTS_CACHE"]).expanduser().resolve()
    man = proj["P"] / "build/vo/manifest.json"
    if man.exists():
        c = (read_json(man, {}) or {}).get("cache")
        if c:
            p = Path(c)
            return (p if p.is_absolute() else proj["P"] / p).resolve()
    return proj["P"] / "build/vo/cache"


def cache_path(cdir: Path, line: dict, dry: bool = False) -> Path:
    voice = re.sub(r"[^A-Za-z0-9_-]", "_", line["voice"])
    return Path(cdir) / ("dry" if dry else "tts") / voice / f"{line['sha']}.wav"


def media_dur(path: Path) -> float:
    path = Path(path)
    if path.suffix.lower() == ".wav":
        try:
            with wave.open(str(path)) as w:
                return w.getnframes() / float(w.getframerate())
        except wave.Error:
            pass
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
                       capture_output=True, text=True)
    try:
        return float(r.stdout.strip())
    except ValueError:
        raise SystemExit(f"cannot read the duration of {path}") from None


def rel(path: Path, base: Path) -> str:
    try:
        return str(Path(path).resolve().relative_to(base))
    except ValueError:
        return str(Path(path).resolve())


def resolve(proj: dict, lines: list[dict], cdir: Path, estimate_only: bool = False) -> None:
    """Attach dur/source/file/est (+ verification state) to every line, in place."""
    st = settings(proj)
    for ln in lines:
        ln["est"] = estimate(ln["say"], st["lang"], ln["style"])
        a = analyze(ln["say"], st["lang"])
        ln["units"], ln["unit"] = a["units"], a["unit"]
        f, src = None, "estimate"
        if not estimate_only:
            if ln.get("custom"):
                f = (proj["P"] / ln["custom"]).resolve()
                if not f.exists():
                    raise SystemExit(f"{ln['key']}: recording {ln['custom']} not found")
                src = "custom"
            else:
                rp, dp = cache_path(cdir, ln), cache_path(cdir, ln, dry=True)
                f, src = (rp, "clip") if rp.exists() else (dp, "dry-run") if dp.exists() else (None, "estimate")
        ln["source"] = src
        ln["file"] = rel(f, proj["P"]) if f else None
        ln["dur"] = round(media_dur(f), 3) if f else ln["est"]
        ln["rate"] = round(ln["units"] / max(ln["dur"] - MARGIN, 0.05), 2)   # speaking rate of the line itself
        meta = f.with_suffix(".json") if f else None
        info = read_json(meta, {}) if meta and meta.exists() else {}
        ln["verified"], ln["problem"] = info.get("verified"), info.get("problem")


def scene_timing(st: dict, scene: str) -> dict:
    t = dict(st["timing"])
    t.update({k: v for k, v in (st["sceneTiming"].get(scene) or {}).items() if k in ("lead", "gap", "tail") and v is not None})
    return t


def layout(lines: list[dict], tm: dict, beat_sec: float) -> float:
    """Stack a scene's lines from its start: lead, gaps (or gapAfter), beat anchors. Sets start/end; returns need (s)."""
    end = None
    for i, ln in enumerate(lines):
        if i == 0:
            start = float(tm["lead"])
        else:
            g = lines[i - 1].get("gapAfter")
            start = end + float(tm["gap"] if g is None else g)
        if ln.get("beat") is not None:
            start = max(start, float(ln["beat"]) * beat_sec)
        ln["start"], ln["end"] = round(start, 3), round(start + ln["dur"], 3)
        end = start + ln["dur"]
    return (end or 0.0) + float(tm["tail"])


def bars_for(need: float, bar_sec: float) -> int:
    return max(1, math.ceil(need / bar_sec - 1e-6))


def lines_for_cut(lines: list[dict], cut: str | None) -> list[dict]:
    """Lines used in a cut: those without a 'cuts' filter, plus those listing the cut (cut None = unfiltered only)."""
    return [ln for ln in lines if ln["cuts"] is None or (cut is not None and cut in ln["cuts"])]


def by_scene(lines: list[dict]) -> dict:
    out: dict = {}
    for ln in lines:
        out.setdefault(ln["scene"], []).append(ln)
    return out


def build_timeline(proj: dict, cdir: Path | None = None, estimate_only: bool = False) -> dict:
    """Cut-independent narration timeline (the content of build/vo-timeline.json)."""
    st = settings(proj)
    lines = load_lines(proj, st)
    cdir = cdir or cache_dir(proj)
    resolve(proj, lines, cdir, estimate_only)
    beat, bar = proj["beatSec"], proj["barSec"]
    cfg_scenes = {s["id"]: s for s in proj["cfg"].get("scenes", [])}
    warnings: list[str] = []
    scenes: dict = {}
    required = [ln for ln in lines if not ln["optional"]]   # optional lines never raise minimums; they play where room is left
    for sid, ls in by_scene(lines_for_cut(required, None)).items():
        ls = [dict(x) for x in ls]
        tm = scene_timing(st, sid)
        need = layout(ls, tm, beat)
        mb = bars_for(need, bar)
        units = sum(x["units"] for x in ls)
        scenes[sid] = {"lines": [{"key": x["key"], "start": x["start"], "end": x["end"]} for x in ls],
                       "lead": tm["lead"], "gap": tm["gap"], "tail": tm["tail"], "speech": round(sum(x["dur"] for x in ls), 3),
                       "need": round(need, 3), "minBars": mb, "minBeats": math.ceil(need / beat - 1e-6),
                       "units": round(units, 2), "density": round(units / (mb * bar), 2)}
        if units / (mb * bar) > st["timing"]["maxRate"] + 1e-6:
            warnings.append(f"{sid}: {units / (mb * bar):.1f} {st['unit']}/s over its {mb} minimum bars (ceiling "
                            f"{st['timing']['maxRate']:g}); trim words or plan it longer than its minimum")
        mx = cfg_scenes.get(sid, {}).get("maxBars")
        if mx and mb > int(mx):
            warnings.append(f"{sid}: narration needs {mb} bars ({need:.2f} s) but maxBars is {mx}; shorten the lines or raise maxBars")
    for ln in lines:   # default positions
        pos = next((p for p in scenes.get(ln["scene"], {}).get("lines", []) if p["key"] == ln["key"]), None)
        if pos:
            ln["start"], ln["end"] = pos["start"], pos["end"]
    warnings += rate_warnings(lines, st)
    names = sorted(n for n in ({c for ln in lines if ln["cuts"] for c in ln["cuts"]} | set((proj["cfg"].get("cuts") or {}).keys()))
                   if cut_narrated(proj, n))
    cuts: dict = {}
    if any(ln["cuts"] for ln in required):
        for name in names:
            per = {}
            for sid, ls in by_scene(lines_for_cut(required, name)).items():
                ls = [dict(x) for x in ls]
                need = layout(ls, scene_timing(st, sid), beat)
                per[sid] = {"lines": [x["key"] for x in ls], "need": round(need, 3), "minBars": bars_for(need, bar)}
            cuts[name] = per
    for sid in scenes:   # scene-relative caption cues for planners that embed captions themselves
        ls = [dict(x, t0=x["start"], t1=x["end"], sceneT1=scenes[sid]["minBars"] * bar)
              for x in lines if x["key"] in {p["key"] for p in scenes[sid]["lines"]}]
        try:
            sys.dont_write_bytecode = True
            sys.path.insert(0, str(Path(__file__).resolve().parent))
            import captions as _cap   # noqa: PLC0415 (lazy: captions imports this module)
            scenes[sid]["captions"] = [{k: c[k] for k in ("t0", "t1", "text")}
                                       for c in _cap.build_cues(ls, scenes[sid]["minBars"] * bar, proj, st)]
        except Exception as e:  # noqa: BLE001 — captions are a convenience here; never block the timeline
            scenes[sid]["captions"] = []
            warnings.append(f"captions for {sid} skipped: {e}")
    srcs = {ln["source"] for ln in lines}
    source = srcs.pop() if len(srcs) == 1 else ("mixed" if srcs else "none")
    bad = [ln["key"] for ln in lines if ln["source"] in ("clip", "dry-run") and ln.get("verified") is False]
    if bad:
        warnings.append(f"clips that failed verification: {', '.join(bad)} (listen; tts_gemini.py batch retries them)")
    unv = [ln["key"] for ln in lines if ln["source"] == "clip" and ln.get("verified") is None and ln.get("verify")]
    if unv:
        warnings.append(f"clips not verified yet: {', '.join(unv)} (tts_gemini.py audit --project P)")
    if source in ("dry-run", "mixed") and any(ln["source"] == "dry-run" for ln in lines):
        warnings.append("dry-run placeholder clips in use: synthesize real narration before delivery")
    keep = ("key", "scene", "index", "order", "text", "say", "caption", "voice", "style", "model", "sha", "beat", "gapAfter", "cuts",
            "optional", "gain", "verify", "visual", "file", "source", "dur", "est", "units", "unit", "start", "end", "rate",
            "verified", "problem")
    return {"version": 1, "title": proj["title"], "lang": st["lang"], "voice": st["voice"], "style": st["style"],
            "model": st["model"], "bpm": proj["bpm"], "beatsPerBar": proj["bpb"], "beatSec": round(beat, 6),
            "barSec": round(bar, 6), "timing": {**st["timing"], "unit": st["unit"]},
            "sceneTiming": st["sceneTiming"], "source": source, "cache": rel(cdir, proj["P"]),
            "lines": [{k: ln.get(k) for k in keep} for ln in required],
            "optionalLines": [{k: ln.get(k) for k in keep} for ln in lines if ln["optional"]], "scenes": scenes, "cuts": cuts,
            "warnings": warnings}


def rate_warnings(lines: list[dict], st: dict) -> list[str]:
    """Speaking-rate anomalies of real clips: far above the fast rate hints at dropped words, far below at extra speech."""
    fam, unit = st["family"], st["unit"]
    hi = SPEECH_RATE[fam]["fast"] * (1.3 if fam != "en" else 1.3 / 1.7)   # en: words ~ syllables / 1.7
    lo = SPEECH_RATE[fam]["calm"] * (0.45 if fam != "en" else 0.45 / 1.7)
    out = []
    for ln in lines:
        if ln["source"] in ("clip", "custom") and ln["dur"] > 0.6:
            r = ln["rate"]
            if r > hi:
                out.append(f"{ln['key']}: clip speaks {r:.1f} {unit}/s; words may be missing (listen, or audit)")
            elif r < lo:
                out.append(f"{ln['key']}: clip speaks only {r:.1f} {unit}/s; extra speech or long silences (listen, or audit)")
    return out


# ---------------------------------------------------------------- placement on a cut
def parse_warp(spec: str) -> list[tuple[float, float]]:
    """'o:s,o:s,...' knots (output time : scene time), increasing in both."""
    knots = []
    for part in spec.split(","):
        o, s = part.split(":")
        knots.append((float(o), float(s)))
    knots.sort()
    if len(knots) < 2 or any(b[0] <= a[0] or b[1] <= a[1] for a, b in zip(knots, knots[1:])):
        raise SystemExit(f"bad --warp {spec!r}: need >= 2 knots increasing in both output and scene time")
    return knots


def time_map(scale: float | None = None, warp: str | None = None):
    """Scene time -> output time for comprehension slow-down variants (speech itself is never stretched)."""
    if warp:
        k = parse_warp(warp)

        def f(t: float) -> float:
            for (o0, s0), (o1, s1) in zip(k, k[1:]):
                if t <= s1:
                    return o0 + (t - s0) * (o1 - o0) / (s1 - s0)
            (o0, s0), (o1, s1) = k[-2], k[-1]
            return o0 + (t - s0) * (o1 - o0) / (s1 - s0)   # extrapolate with the last slope
        return f
    if scale and abs(scale - 1.0) > 1e-9:
        return lambda t: t * scale
    return None


def place(vt: dict, cut: dict, tmap=None, narrated: bool = True) -> dict:
    """Absolute line times on a planned cut (build/cut-<cut>.json). Drops optional lines that do not fit.
    narrated=False (reel.config cut spec "narration": false) places nothing."""
    st = {"timing": vt["timing"], "sceneTiming": vt.get("sceneTiming") or {}}
    name = str(cut.get("cut", ""))
    pool = sorted([dict(x) for x in vt["lines"] + vt.get("optionalLines", [])], key=lambda x: x.get("order", 0))
    lines = lines_for_cut(pool, name) if narrated else []
    groups = by_scene(lines)
    in_cut = {s["id"] for s in cut["scenes"]}
    beat = float(cut.get("beatSec") or vt["beatSec"])
    bar = float(cut.get("barSec") or vt["barSec"])
    placed, warnings, notes, dropped, stats = [], [], [], [], []
    mx, unit = float(vt["timing"]["maxRate"]), vt["timing"].get("unit", "")
    for sc in cut["scenes"]:
        ls = groups.get(sc["id"])
        if not ls:
            continue
        tm = scene_timing(st, sc["id"])
        avail = float(sc["t1"]) - float(sc["t0"])
        need = layout(ls, tm, beat)
        while need > avail + 1e-6 and any(x["optional"] for x in ls):
            j = max(i for i, x in enumerate(ls) if x["optional"])
            dropped.append(ls.pop(j)["key"])
            need = layout(ls, tm, beat)
        if need > avail + 1e-6:
            warnings.append(f"{sc['id']}: narration needs {need:.2f} s ({bars_for(need, bar)} bars) but cut {name} gives "
                            f"{avail:.2f} s; re-plan after vo_timeline.py (plan_cut.py reads the minimums) or shorten the lines")
        units = sum(x["units"] for x in ls)
        dens = units / max(avail, 1e-3)
        stats.append({"scene": sc["id"], "t0": float(sc["t0"]), "t1": float(sc["t1"]), "bars": round(avail / bar, 2),
                      "lines": len(ls), "speech": round(sum(x["dur"] for x in ls), 3), "units": round(units, 2),
                      "density": round(dens, 2), "tail": round(avail - ls[-1]["end"], 3) if ls else None})
        if dens > mx + 1e-6:
            warnings.append(f"{sc['id']}: {dens:.1f} {unit}/s over its {avail:.2f} s (ceiling {mx:g}); give it a bar or trim words")
        if ls and avail - ls[-1]["end"] > max(2 * bar, 3.0):
            notes.append(f"{sc['id']}: narration ends {avail - ls[-1]['end']:.1f} s before the scene does (fine for a music "
                            f"moment; otherwise anchor a line on a later beat)")
        for ln in ls:
            t0 = float(sc["t0"]) + ln["start"]
            placed.append(dict(ln, t0=round(t0, 3), t1=round(t0 + ln["dur"], 3), sceneT0=float(sc["t0"]), sceneT1=float(sc["t1"])))
    if dropped:
        notes.append(f"optional lines dropped in cut {name}: {', '.join(dropped)}")
    missing = sorted({ln["scene"] for ln in lines} - in_cut)
    if missing:
        notes.append(f"scenes not in cut {name} (their lines are skipped): {', '.join(missing)}")
    duration = float(cut["duration"])
    if tmap:
        for ln in placed:
            for k in ("t0", "sceneT0", "sceneT1"):
                ln[k] = round(tmap(ln[k]), 3)
            ln["t1"] = round(ln["t0"] + ln["dur"], 3)
        duration = round(tmap(duration), 3)
    placed.sort(key=lambda x: x["t0"])
    for a, b in zip(placed, placed[1:]):
        sep = SEP_MIN if a["scene"] != b["scene"] else 0.0
        if a["t1"] + sep > b["t0"] + 1e-6:
            warnings.append(f"{a['key']} ends at {a['t1']:.2f} s, {'overlapping' if a['t1'] > b['t0'] else 'too close to'} "
                            f"{b['key']} at {b['t0']:.2f} s")
    if placed and placed[-1]["t1"] > duration + 1e-6:
        warnings.append(f"{placed[-1]['key']} runs past the end of cut {name} ({placed[-1]['t1']:.2f} > {duration:.2f} s)")
    if tmap:
        for x in stats:
            x["t0"], x["t1"] = round(tmap(x["t0"]), 3), round(tmap(x["t1"]), 3)
    return {"cut": name, "duration": duration, "bpm": cut.get("bpm", vt["bpm"]), "narrated": narrated, "scenes": stats,
            "lines": placed, "warnings": warnings, "notes": notes}


def cut_narrated(proj: dict, cut: str) -> bool:
    """False when reel.config.json cuts.<cut>.narration is false (a music-only cut)."""
    spec = (proj["cfg"].get("cuts") or {}).get(str(cut)) or {}
    return not (isinstance(spec, dict) and spec.get("narration") is False)


def load_cut(proj: dict, cut: str) -> dict:
    p = proj["P"] / f"build/cut-{cut}.json"
    if not p.exists():
        raise SystemExit(f"missing {p}: run timing/plan_cut.py --project {proj['P']} --cut {cut} first")
    c = read_json(p)
    c.setdefault("cut", cut)
    return c


# ---------------------------------------------------------------- script tables
def mmss(t: float) -> str:
    return f"{int(t // 60):02d}:{t % 60:04.1f}"


def _cell(s) -> str:
    return str(s or "").replace("|", "\\|").replace("\n", " ")


def script_md(vt: dict, placed: dict | None = None) -> str:
    """Script table for review: per-scene bars and density, per-line time, visual, narration and speaking rate."""
    unit, mx, tm = vt["timing"]["unit"], vt["timing"]["maxRate"], vt["timing"]
    srcs: dict = {}
    allv = vt["lines"] + vt.get("optionalLines", [])
    for ln in allv:
        srcs[ln["source"]] = srcs.get(ln["source"], 0) + 1
    head = [f"# Narration script: {vt['title']}" + (f" (cut {placed['cut']}, {placed['duration']:.1f} s)" if placed else ""), "",
            f"- Voice {vt['voice']} · style `{vt['style'] or '(none)'}` · model {vt['model']} · language {vt['lang']}",
            "- Durations: " + ", ".join(f"{n} {k}" for k, n in sorted(srcs.items())),
            f"- {vt['bpm']:g} BPM, {vt['beatsPerBar']} beats per bar (bar {vt['barSec']:.3f} s). A scene needs lead {tm['lead']} s"
            f" + speech + gaps {tm['gap']} s + tail {tm['tail']} s, rounded up to whole bars.",
            f"- Rate = {unit}/s while a line speaks. Density = narration {unit} per second of scene; ceiling {mx:g} (marked !).", ""]
    rows: list[str] = []
    if placed:
        if not placed.get("narrated", True):
            rows += ["This cut is music-only (reel.config.json cuts.<cut>.narration = false).", ""]
        rows += ["| Scene | Time | Bars | Speech | Density | After the last line |", "| --- | --- | --- | --- | --- | --- |"]
        for x in placed.get("scenes", []):
            flag = " !" if x["density"] > mx + 1e-6 else ""
            rows.append(f"| {x['scene']} | {mmss(x['t0'])}–{mmss(x['t1'])} | {x['bars']:g} | {x['speech']:.2f} s | "
                        f"{x['density']:.1f}/s{flag} | {x['tail']:.2f} s |")
        rows += ["", "| Scene | Time | Visual | Narration | Rate |", "| --- | --- | --- | --- | --- |"]
        for ln in placed["lines"]:
            rows.append(f"| {ln['scene']} | {mmss(ln['t0'])}–{mmss(ln['t1'])} | {_cell(ln['visual'])} | {_cell(ln['text'])} | "
                        f"{ln['units']:g} {unit} · {ln['rate']:.1f}/s |")
        if placed["warnings"]:
            rows += ["", "## Warnings", ""] + [f"- {w}" for w in placed["warnings"]]
        if placed.get("notes"):
            rows += ["", "## Notes", ""] + [f"- {w}" for w in placed["notes"]]
    else:
        rows += ["| Scene | Min bars | Density | In scene | Visual | Narration | Rate |", "| --- | --- | --- | --- | --- | --- | --- |"]
        idx = {ln["key"]: ln for ln in vt["lines"]}
        for sid, sc in vt["scenes"].items():
            for j, p in enumerate(sc["lines"]):
                ln = idx[p["key"]]
                first = j == 0
                mb = f"{sc['minBars']} ({sc['need']:.2f} s)" if first else ""
                dens = (f"{sc['density']:.1f}/s" + (" !" if sc["density"] > mx + 1e-6 else "")) if first else ""
                rows.append(f"| {sid if first else ''} | {mb} | {dens} | {p['start']:.2f}–{p['end']:.2f} s | {_cell(ln['visual'])} | "
                            f"{_cell(ln['text'])} | {ln['units']:g} {unit} · {ln['rate']:.1f}/s |")
        extra = [ln for ln in vt["lines"] if ln["cuts"]]
        if extra:
            rows += ["", "Lines used only in some cuts:", ""] + [f"- `{ln['key']}` ({', '.join(ln['cuts'])}): {_cell(ln['text'])}" for ln in extra]
        opt = vt.get("optionalLines") or []
        if opt:
            rows += ["", "Optional lines (spoken only where the planned scene has room; never raise minimums):", ""] + \
                [f"- `{ln['key']}`" + (f" ({', '.join(ln['cuts'])})" if ln["cuts"] else "") + f": {_cell(ln['text'])} "
                 f"({ln['dur']:.2f} s)" for ln in opt]
    if vt["warnings"]:
        rows += ["", "## Timeline warnings", ""] + [f"- {w}" for w in vt["warnings"]]
    return "\n".join(head + rows) + "\n"


# ---------------------------------------------------------------- CLI
def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--project", required=True, help="reel project folder P")
    ap.add_argument("--cut", help="also place the narration on P/build/cut-<cut>.json")
    ap.add_argument("--estimate", action="store_true", help="ignore clips; durations from text estimates")
    ap.add_argument("--cache", help="TTS cache folder (default: env MSR_TTS_CACHE, manifest, P/build/vo/cache)")
    ap.add_argument("--scale", type=float, help="with --cut: uniform comprehension slow-down variant")
    ap.add_argument("--warp", help="with --cut: piecewise slow-down knots 'o:s,o:s,...'")
    a = ap.parse_args()
    proj = load_project(a.project)
    cdir = cache_dir(proj, a.cache)
    vt = build_timeline(proj, cdir, a.estimate)
    b = proj["P"] / "build"
    write_json(b / "vo-timeline.json", vt)
    write_json(b / "vo-minbars.json", {sid: sc["minBars"] for sid, sc in vt["scenes"].items()})
    for name, per in vt["cuts"].items():
        write_json(b / f"vo-minbars-{name}.json", {sid: x["minBars"] for sid, x in per.items()})
    for f in b.glob("vo-minbars-*.json"):   # plan_cut.py prefers per-cut minimums: never leave stale ones behind
        if f.name[len("vo-minbars-"):-len(".json")] not in vt["cuts"]:
            f.unlink()
    (b / "vo-script.md").write_text(script_md(vt), encoding="utf-8")
    unit = vt["timing"]["unit"]
    nopt = len(vt.get("optionalLines") or [])
    print(f"narration {len(vt['lines']) + nopt} lines" + (f" ({nopt} optional)" if nopt else "")
          + f" · {vt['lang']} · {vt['voice']} {vt['style']} · durations: {vt['source']}")
    for sid, sc in vt["scenes"].items():
        print(f"  {sid:<16} {len(sc['lines'])} line(s)  speech {sc['speech']:5.2f} s  need {sc['need']:5.2f} s  "
              f"-> {sc['minBars']} bar(s)  density {sc['density']:.1f} {unit}/s")
    for w in vt["warnings"]:
        print(f"  ! {w}")
    print(f"wrote {rel(b / 'vo-timeline.json', proj['P'])}, vo-minbars.json" + (", " + ", ".join(f"vo-minbars-{n}.json" for n in vt["cuts"]) if vt["cuts"] else "")
          + ", vo-script.md")
    if a.cut:
        cut = load_cut(proj, a.cut)
        pl = place(vt, cut, time_map(a.scale, a.warp), cut_narrated(proj, a.cut))
        tag = a.cut + (f"-x{a.scale:g}" if a.scale else "") + ("-warp" if a.warp else "")
        write_json(b / f"vo-{tag}.json", pl)
        (b / f"script-{tag}.md").write_text(script_md(vt, pl), encoding="utf-8")
        print(f"cut {a.cut}: {len(pl['lines'])} lines placed in {pl['duration']:.2f} s -> build/vo-{tag}.json, build/script-{tag}.md")
        for w in pl["warnings"]:
            print(f"  ! {w}")
        for w in pl["notes"]:
            print(f"  · {w}")
    else:
        print(f"next: python3 <skill>/timing/plan_cut.py --project {a.project} --cut <cut>   (reads build/vo-minbars"
              + ("-<cut>" if vt["cuts"] else "") + ".json and build/vo-timeline.json)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
