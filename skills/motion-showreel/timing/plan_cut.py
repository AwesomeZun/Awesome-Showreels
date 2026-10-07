#!/usr/bin/env python3
"""Bar-grid cut planner: P/reel.config.json -> P/build/cut-<cut>.json (one file per cut).

The tempo is fixed for the whole reel (reel.config "bpm", else style.json sound.bpm). A cut is a whole number of
bars, every scene starts and ends on a bar line, and a longer cut adds bars (living holds, optional scenes, repeated
hold cues) instead of slowing animation. Narration minimums (build/vo-minbars.json) raise scene minimums; narration
lines (build/vo-timeline.json) become captions. Identical inputs give byte-identical output.

Usage:
  python3 plan_cut.py --project P --cut 30                      # target from reel.config.json "cuts"
  python3 plan_cut.py --project P --cut 60 --seconds 60         # or --bars 32
  python3 plan_cut.py --project P --cut 15,30,60                # several cuts; --cut all = every configured cut
  python3 plan_cut.py --project P --cut 30 --times boundaries   # frame times for stills.mjs (holds | cues | all)
  python3 plan_cut.py --project P --cut qa --only demo --bars 6 # one scene at a forced length (elasticity QA)

Exit codes: 0 ok, 1 bad input, 2 target shorter than the minimums (see --grow), 3 warnings under --strict,
4 internal QA failure.
"""
from __future__ import annotations

import argparse
import json
import math
import re
import sys
import unicodedata
from collections import Counter
from fractions import Fraction
from pathlib import Path

TRANSITIONS = ("cut", "blobWipe", "zoomInto", "whip", "glitch", "flash", "strobe", "match", "impact", "portalFlash",
               "dissolve", "push")  # the last two are runtime extras
PREV_SPECIFIC = frozenset({"zoomInto", "match", "portalFlash"})  # geometry belongs to one authored predecessor
# Transition windows (beats before, after the bar line) as runtime/compositor.js TRANS_DEF draws them by default;
# used only for a note when a window reaches past the out-phase / in-phase it borrows.
TRANS_WINDOW = {"blobWipe": (1, 0), "zoomInto": (1, 0), "whip": (0.3, 0.3), "glitch": (0.2, 0.44),
                "portalFlash": (0.8, 1.2), "dissolve": (0.5, 0.5), "push": (0.5, 0)}
PARTS = ("intro", "groove", "breakdown", "drop", "outro")
# start | holdStart | end are the contract anchors; holdBar / holdBeat (first scene bar / beat line at or after the
# hold start, like runtime onBars / onBeats) and outStart (alias holdEnd) are extensions.
ANCHORS = ("start", "holdStart", "holdBar", "holdBeat", "outStart", "end")
HOLD_ANCHORS = ("holdStart", "holdBar", "holdBeat")
ANCHOR_ALIAS = {"holdEnd": "outStart"}
CUE_CONSUMED = {"beat", "from", "sfx", "every", "until", "count"}
SCENE_CONSUMED = {"id", "minBars", "maxBars", "priority", "optional", "inBeats", "outBeats", "in", "inParams",
                  "inFallback", "dark", "music", "cues"}
CUT_KEYS = {"bars", "seconds", "round", "fill", "include", "exclude", "only", "narration", "scenes"}
SCENE_OVERRIDE_KEYS = {"bars", "minBars", "maxBars", "priority", "optional", "inBeats", "outBeats"}
VO_DEFAULTS = {"lead": 0.3, "gap": 0.12, "tail": 0.5}  # seconds; narration/vo_timeline.py defaults, used when absent
CAPTION_DEFAULTS = {"lead": 0.3, "hold": 1.6, "minDur": 0.9, "mergeGap": 0.25, "snap": 0.25}  # narration/captions.py
CLIP_PRE, CLIP_POST = 0.04, 0.12  # silence kept inside trimmed TTS clips before / after the speech
DUR_KEYS = ("dur", "duration", "seconds", "sec", "length", "estDur", "estimate")
OFFSET_KEYS = ("offset", "at", "rel", "a", "start")  # scene-relative seconds
CAPTION_TEXT_KEYS = ("caption", "subtitle", "display", "text")
EPS = 1e-6
ID_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_-]*$")
CUT_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_.-]*$")
HANGUL = re.compile(r"[\uac00-\ud7a3]")
CJK = re.compile(r"[\u3040-\u30ff\u4e00-\u9fff]")


class InputError(Exception):
    """Missing or malformed input (exit 1)."""


class Infeasible(Exception):
    """The target is shorter than the sum of the scene minimums (exit 2)."""


class Log:
    def __init__(self) -> None:
        self.warnings: list[str] = []
        self.notes: list[str] = []
        self.steps: list[str] = []

    def warn(self, msg: str) -> None:
        if msg not in self.warnings:
            self.warnings.append(msg)

    def note(self, msg: str) -> None:
        if msg not in self.notes:
            self.notes.append(msg)


# ------------------------ small helpers -------------------------------------------------

def r6(x: float) -> float:
    v = round(float(x), 6)
    return 0.0 if v == 0 else v


def tidy(x: float):
    """Whole numbers as int in JSON (4, not 4.0)."""
    return int(x) if float(x) == int(x) else x


def r4(x: float) -> float:
    v = round(float(x), 4)
    return 0.0 if v == 0 else v


def is_num(v) -> bool:
    return isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v)


def number(v, what: str, lo: float | None = None, hi: float | None = None) -> float:
    if not is_num(v):
        raise InputError(f"{what} must be a number, got {v!r}")
    if (lo is not None and v < lo) or (hi is not None and v > hi):
        raise InputError(f"{what} must be in [{lo}, {hi}], got {v!r}")
    return float(v)


def whole_bars(v, what: str, log: Log, lo: int = 1) -> int:
    x = number(v, what, lo=0)
    n = math.ceil(x - EPS)
    if abs(n - x) > EPS:
        log.warn(f"{what} = {v!r} is not a whole number of bars; using {n}")
    if n < lo:
        raise InputError(f"{what} must be >= {lo}, got {v!r}")
    return n


def read_json(path: Path, what: str):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        raise InputError(f"{what} not found: {path}") from None
    except json.JSONDecodeError as e:
        raise InputError(f"{what} is not valid JSON ({path}, line {e.lineno} col {e.colno}: {e.msg})") from None


def rel(path: Path, project: Path) -> str:
    """Path for messages and JSON: relative to the project when inside it, never an absolute user path."""
    try:
        return path.resolve().relative_to(project.resolve()).as_posix()
    except ValueError:
        return path.name


def first_of(d: dict, keys):
    for k in keys:
        if k in d and d[k] is not None:
            return d[k]
    return None


# ------------------------ tempo and target ----------------------------------------------

def load_style(project: Path, cfg: dict, log: Log) -> dict:
    name = cfg.get("style", "style.json")
    if not isinstance(name, str) or not name:
        raise InputError('reel.config.json "style" must be a path relative to the project')
    path = project / name
    if not path.exists():
        log.warn(f"{name} not found (run tools/extract_style.py); only reel.config.json values are used")
        return {}
    style = read_json(path, name)
    if not isinstance(style, dict):
        raise InputError(f"{name} must be a JSON object")
    return style


def tempo(cfg: dict, style: dict, log: Log) -> tuple[float, int, str]:
    bpm, src = cfg.get("bpm"), "reel.config.json bpm"
    if bpm is None:
        sound = style.get("sound") if isinstance(style.get("sound"), dict) else {}
        bpm, src = sound.get("bpm"), "style.json sound.bpm"
    if bpm is None:
        bpm, src = 120, "default"
        log.warn("no bpm in reel.config.json or style.json sound.bpm; using 120")
    bpm = number(bpm, src, 40, 240)
    bpb = cfg.get("beatsPerBar", 4)
    if not isinstance(bpb, int) or isinstance(bpb, bool) or not 1 <= bpb <= 12:
        raise InputError(f"beatsPerBar must be an integer in [1, 12], got {bpb!r}")
    return (int(bpm) if bpm == int(bpm) else bpm), bpb, src


def round_bars(x: float, mode: str) -> int:
    if mode == "down":
        return max(1, math.floor(x + EPS))
    if mode == "up":
        return max(1, math.ceil(x - EPS))
    return max(1, math.ceil(x - 0.5 - EPS))  # nearest; an exact half rounds down (safer under length caps)


def whole_bar_tempos(seconds: float, bpb: int, bpm: float) -> list[str]:
    """The nearest integer tempo below and above `bpm` at which `seconds` is a whole number of bars
    (a hint only: the tone pass owns the BPM)."""
    exact = seconds * bpm / (60 * bpb)
    found = []
    for k in range(max(1, math.floor(exact) - 6), math.ceil(exact) + 7):
        b = k * bpb * 60 / seconds
        if abs(b - round(b)) < 1e-9 and 40 <= b <= 240:
            found.append((int(round(b)), k))
    lower = [x for x in found if x[0] < bpm - EPS]
    upper = [x for x in found if x[0] > bpm + EPS]
    picks = ([lower[-1]] if lower else []) + ([upper[0]] if upper else [])
    return [f"{b} BPM = {k} bars" for b, k in picks]


def cut_target(cut: str, spec: dict, args, bpm, bpb: int, bar_sec: float, log: Log) -> dict:
    mode = args.round or spec.get("round") or "nearest"
    if mode not in ("nearest", "down", "up"):
        raise InputError(f'cut {cut}: "round" must be nearest, down or up')
    seconds = bars = None
    if args.bars is not None:
        bars, how = args.bars, "--bars"
    elif args.seconds is not None:
        seconds, how = args.seconds, "--seconds"
    elif "bars" in spec:
        bars, how = spec["bars"], "cuts.bars"
    elif "seconds" in spec:
        seconds, how = spec["seconds"], "cuts.seconds"
    elif re.fullmatch(r"\d+(\.\d+)?", cut):
        seconds, how = float(cut), "cut name"
    else:
        raise InputError(f'cut "{cut}" is not in reel.config.json "cuts" and is not a number of seconds; '
                         "add it to cuts or pass --seconds/--bars")
    if bars is not None:
        if not is_num(bars) or bars != int(bars) or bars < 1:
            raise InputError(f"cut {cut}: bars must be a positive integer, got {bars!r}")
        return {"bars": int(bars), "seconds": None, "round": None, "from": how}
    seconds = number(seconds, f"cut {cut} seconds", lo=EPS)
    exact = seconds / bar_sec
    n = round_bars(exact, mode)
    if abs(exact - round(exact)) > 1e-6:
        alt = whole_bar_tempos(seconds, bpb, bpm)
        log.note(f"{seconds:g} s is {exact:.2f} bars at {bpm} BPM -> {n} bars = {n * bar_sec:.3f} s (round {mode})"
                 + (f"; whole-bar tempos for {seconds:g} s: {', '.join(alt)}" if alt else ""))
    return {"bars": n, "seconds": seconds, "round": mode, "from": how}


# ------------------------ scenes --------------------------------------------------------

def normalize_scenes(cfg: dict, bpb: int, log: Log) -> list[dict]:
    raw = cfg.get("scenes")
    if not isinstance(raw, list) or not raw:
        raise InputError('reel.config.json needs a non-empty "scenes" list')
    out, seen = [], set()
    for i, r in enumerate(raw):
        if not isinstance(r, dict):
            raise InputError(f"scenes[{i}] must be an object")
        sid = r.get("id")
        if not isinstance(sid, str) or not ID_RE.match(sid):
            raise InputError(f"scenes[{i}].id must match {ID_RE.pattern} (it names scenes/<id>.js), got {sid!r}")
        if sid in seen:
            raise InputError(f"duplicate scene id {sid!r}")
        seen.add(sid)
        mn = whole_bars(r.get("minBars", 1), f"{sid}.minBars", log)
        mx = r.get("maxBars")
        mx = 2 * mn if mx is None else whole_bars(mx, f"{sid}.maxBars", log)
        if mx < mn:
            log.warn(f"{sid}: maxBars {mx} < minBars {mn}; using {mn}")
            mx = mn
        pr = r.get("priority", 2)
        if not isinstance(pr, int) or isinstance(pr, bool) or pr < 1:
            raise InputError(f"{sid}.priority must be an integer >= 1 (1 = keep first), got {pr!r}")
        ob = r.get("outBeats")
        ob = (1 if mn * bpb >= 2 else 0) if ob is None else number(ob, f"{sid}.outBeats", lo=0)
        ib = r.get("inBeats")
        ib = max(0, min(bpb, mn * bpb - ob)) if ib is None else number(ib, f"{sid}.inBeats", lo=0)
        tr = r.get("in", "cut")
        if not isinstance(tr, str):
            raise InputError(f'{sid}.in must be a transition name, got {tr!r}')
        if tr not in TRANSITIONS:
            log.warn(f'{sid}: unknown transition "{tr}" (known: {", ".join(TRANSITIONS)})')
        fb = r.get("inFallback")
        if fb is not None and (not isinstance(fb, str) or fb in PREV_SPECIFIC):
            raise InputError(f"{sid}.inFallback must be a transition that works after any scene "
                             f"(not {', '.join(sorted(PREV_SPECIFIC))}), got {fb!r}")
        if isinstance(fb, str) and fb not in TRANSITIONS:
            log.warn(f'{sid}: unknown inFallback transition "{fb}"')
        ip = r.get("inParams") or {}
        if not isinstance(ip, dict):
            raise InputError(f"{sid}.inParams must be an object")
        music = r.get("music")
        if music is not None and (not isinstance(music, str) or not music):
            raise InputError(f"{sid}.music must be a part name")
        if music is not None and music not in PARTS:
            log.warn(f'{sid}: unknown music part "{music}" (known: {", ".join(PARTS)}); passed through')
        cues = r.get("cues") or []
        if not isinstance(cues, list):
            raise InputError(f"{sid}.cues must be a list")
        out.append({
            "index": i, "id": sid, "minBars": mn, "maxBars": mx, "priority": pr,
            "optional": bool(r.get("optional", False)), "inBeats": ib, "outBeats": ob, "in": tr, "inParams": ip,
            "inFallback": fb, "dark": bool(r.get("dark", False)), "music": music, "cues": cues,
            "extra": {k: v for k, v in r.items() if k not in SCENE_CONSUMED},
            "pinned": False, "excluded": None,
        })
    return out


def id_list(v, what: str, ids: set) -> list[str]:
    if v is None:
        return []
    if isinstance(v, str):
        v = [x.strip() for x in v.split(",") if x.strip()]
    if not isinstance(v, list) or not all(isinstance(x, str) for x in v):
        raise InputError(f"{what} must be a list of scene ids")
    unknown = [x for x in v if x not in ids]
    if unknown:
        raise InputError(f"{what}: unknown scene id(s) {', '.join(unknown)}")
    return v


def apply_cut_overrides(scenes: list[dict], cut: str, spec: dict, args, log: Log) -> None:
    ids = {s["id"] for s in scenes}
    for k in spec:
        if k not in CUT_KEYS and k != "label":
            log.warn(f'cut {cut}: unknown key "{k}" ignored')
    over = spec.get("scenes") or {}
    if not isinstance(over, dict):
        raise InputError(f'cut {cut}: "scenes" overrides must be an object {{id: {{...}}}}')
    by_id = {s["id"]: s for s in scenes}
    for sid, o in over.items():
        if sid not in by_id:
            raise InputError(f"cut {cut}: override for unknown scene {sid!r}")
        if not isinstance(o, dict):
            raise InputError(f"cut {cut}: override for {sid} must be an object")
        s = by_id[sid]
        for k in o:
            if k not in SCENE_OVERRIDE_KEYS:
                allowed = ", ".join(sorted(SCENE_OVERRIDE_KEYS))
                log.warn(f'cut {cut}: override key "{k}" for {sid} ignored (allowed: {allowed})')
        if "minBars" in o:
            s["minBars"] = whole_bars(o["minBars"], f"cut {cut} {sid}.minBars", log)
        if "maxBars" in o:
            s["maxBars"] = whole_bars(o["maxBars"], f"cut {cut} {sid}.maxBars", log)
        if "priority" in o:
            if not isinstance(o["priority"], int) or isinstance(o["priority"], bool) or o["priority"] < 1:
                raise InputError(f"cut {cut} {sid}.priority must be an integer >= 1")
            s["priority"] = o["priority"]
        if "optional" in o:
            s["optional"] = bool(o["optional"])
        for k in ("inBeats", "outBeats"):
            if k in o:
                s[k] = number(o[k], f"cut {cut} {sid}.{k}", lo=0)
        if "bars" in o:
            s["minBars"] = s["maxBars"] = whole_bars(o["bars"], f"cut {cut} {sid}.bars", log)
            s["pinned"] = True
        if s["maxBars"] < s["minBars"]:
            s["maxBars"] = s["minBars"]
    for sid in id_list(spec.get("include"), f"cut {cut} include", ids):
        by_id[sid]["optional"] = False
    for sid in id_list(spec.get("exclude"), f"cut {cut} exclude", ids):
        by_id[sid]["excluded"] = "excluded by cut"
    only = id_list(args.only, "--only", ids) or id_list(spec.get("only"), f"cut {cut} only", ids)
    if only:
        for s in scenes:
            if s["id"] not in only:
                s["excluded"] = "not in --only" if args.only else "not in cut only"
            else:
                s["optional"] = False
    for p in args.pin:
        m = re.fullmatch(r"([A-Za-z0-9][A-Za-z0-9_-]*)=(\d+)", p)
        if not m or m.group(1) not in by_id or int(m.group(2)) < 1:
            raise InputError(f"--pin expects ID=BARS with a known scene id, got {p!r}")
        s = by_id[m.group(1)]
        s["minBars"] = s["maxBars"] = int(m.group(2))
        s["pinned"] = True


# ------------------------ narration -----------------------------------------------------
# narration/vo_timeline.py writes build/vo-timeline.json, build/vo-minbars.json and, when lines are filtered per cut,
# build/vo-minbars-<cut>.json. The planner raises scene minimums from them and embeds first-pass caption cues;
# narration/captions.py refines the cues after planning and narration/mix_vo.py places the voice from the timeline.

def estimate_speech(text: str) -> float:
    """Fallback only (vo_timeline.py owns real estimates): Hangul 6.3 syll/s, kana/kanji 7 chars/s, else 2.6 words/s."""
    h, c = len(HANGUL.findall(text)), len(CJK.findall(text))
    rest = HANGUL.sub(" ", CJK.sub(" ", text))
    words = len(re.findall(r"[A-Za-z0-9]+(?:['\u2019.-][A-Za-z0-9]+)*", rest))
    return h / 6.3 + c / 7.0 + words / 2.6


def vo_line(ln, sid: str, j: int, log: Log) -> dict:
    """One narration line -> {key, text (display), dur, estimated, beat, gapAfter, offset (explicit or None)}."""
    if isinstance(ln, str):
        ln = {"text": ln}
    text = first_of(ln, CAPTION_TEXT_KEYS)  # "caption": "" means spoken but not captioned
    dur = first_of(ln, DUR_KEYS)
    est = bool(ln.get("estimated")) or ln.get("source") in ("estimate", "dry-run")
    if not is_num(dur) or dur <= 0:
        spoken = ln.get("say") or ln.get("text") or text or ""
        dur, est = estimate_speech(str(spoken)), True
        log.warn(f"vo-timeline: {sid} line {j + 1} has no duration; estimated {dur:.2f} s from its text")
    off = first_of(ln, OFFSET_KEYS)
    gap_after = ln.get("gapAfter") if is_num(ln.get("gapAfter")) else ln.get("gap") if is_num(ln.get("gap")) else None
    return {"key": ln.get("key"), "text": text if isinstance(text, str) else "", "dur": float(dur), "estimated": est,
            "beat": ln.get("beat") if is_num(ln.get("beat")) else None, "gapAfter": gap_after,
            "offset": float(off) if is_num(off) else None}


def layout(lines: list[dict], lead: float, gap: float, beat_sec: float, keep_explicit: bool = False) -> float:
    """narration/vo_timeline.py layout(): the first line starts at `lead`, each next one at the previous end plus the
    previous line's gapAfter (else `gap`); a line with "beat" starts no earlier than beat * beatSec. Sets "offset"
    (seconds from the scene start) and returns the end of speech."""
    end = None
    for i, ln in enumerate(lines):
        if keep_explicit and ln["offset"] is not None:
            start = ln["offset"]
        else:
            if i == 0:
                start = lead
            else:
                g = lines[i - 1]["gapAfter"]
                start = end + (gap if g is None else g)
            if ln["beat"] is not None:
                start = max(start, ln["beat"] * beat_sec)
        ln["offset"] = start
        end = start + ln["dur"]
    return end or 0.0


def scene_cues(v) -> list[dict] | None:
    if not isinstance(v, list):
        return None
    cues = [c for c in v if isinstance(c, dict) and is_num(c.get("t0")) and is_num(c.get("t1"))
            and isinstance(c.get("text"), str) and c["t1"] > c["t0"]]
    return cues or None


def cut_seconds(name: str, cuts: dict, bar_sec: float) -> float | None:
    """Target length of a configured cut in seconds (its "seconds", "bars" or a numeric name), else None."""
    spec = cuts.get(str(name)) if isinstance(cuts, dict) else None
    if is_num(spec):
        return float(spec)
    if isinstance(spec, dict):
        if is_num(spec.get("seconds")):
            return float(spec["seconds"])
        if is_num(spec.get("bars")):
            return float(spec["bars"]) * bar_sec
    try:
        return float(name)
    except (TypeError, ValueError):
        return None


def parse_vo_timeline(doc, cut: str, beat_sec: float, relayout: bool, log: Log, filtered: dict | None = None) -> dict:
    """build/vo-timeline.json -> {scene: {"lines": [{text, offset, dur, estimated}], "need": s, "cues": [...]|None}}.

    Main shape (narration/vo_timeline.py): top-level "lines" [{key, scene, text, caption, dur, source, beat, gapAfter,
    cuts}], "scenes" {id: {lines: [{key, start, end}], need, captions: [{t0, t1, text}]}}, "timing" {lead, gap, tail},
    "sceneTiming" {id: {...}}. Lines whose "cuts" list omits this cut are skipped; a scene whose line set differs from
    the precomputed one (or any scene when the tempo changed) is laid out again with the same rule as vo_timeline.py.
    Also accepted: {"scenes": [{"scene", "lead"?, "gap"?, "tail"?, "lines": [{"text", "dur", "offset"?}]}]}, the same
    keyed by scene id, or a flat list of lines that carry "scene". All times are seconds from the scene start."""
    if isinstance(doc, list):
        doc = {"lines": doc}
    if not isinstance(doc, dict):
        raise InputError("vo-timeline.json must be an object or a list of lines")
    timing = doc.get("timing") if isinstance(doc.get("timing"), dict) else {}
    base = {k: float(timing[k]) if is_num(timing.get(k)) else float(doc[k]) if is_num(doc.get(k)) else VO_DEFAULTS[k]
            for k in ("lead", "gap", "tail")}
    st = doc.get("sceneTiming") if isinstance(doc.get("sceneTiming"), dict) else {}
    scenes = doc.get("scenes")
    top = [ln for ln in doc.get("lines") or [] if isinstance(ln, dict)]
    entries: list[tuple[str, dict, list]] = []  # (scene, precomputed entry, raw lines in order)
    if top and all(isinstance(ln.get("scene"), str) for ln in top):
        groups: dict[str, list] = {}
        for ln in top:
            cuts = ln.get("cuts")
            if isinstance(cuts, list) and cuts and str(cut) not in [str(c) for c in cuts]:
                if filtered is not None:  # reported after allocation, once the scenes in this cut are known
                    filtered.setdefault(ln["scene"], []).append(
                        (str(ln.get("key") or ln.get("text") or "?")[:40], [str(c) for c in cuts]))
                continue
            groups.setdefault(ln["scene"], []).append(ln)
        pre = scenes if isinstance(scenes, dict) else {}
        entries = [(sid, pre.get(sid) if isinstance(pre.get(sid), dict) else {}, raws) for sid, raws in groups.items()]
    elif isinstance(scenes, dict):
        entries = [(k, v if isinstance(v, dict) else {}, (v.get("lines") if isinstance(v, dict) else v) or [])
                   for k, v in scenes.items()]
    elif isinstance(scenes, list):
        entries = [(first_of(v, ("scene", "id")), v, v.get("lines") or []) for v in scenes
                   if isinstance(v, dict) and isinstance(first_of(v, ("scene", "id")), str)]
    out: dict[str, dict] = {}
    for sid, entry, raws in entries:
        tm = dict(base)
        for src in (entry, st.get(sid) if isinstance(st.get(sid), dict) else {}):
            tm.update({k: float(src[k]) for k in ("lead", "gap", "tail") if is_num(src.get(k))})
        lines = [vo_line(r, sid, j, log) for j, r in enumerate(raws) if isinstance(r, (dict, str))]
        if not lines:
            continue
        pos = {p.get("key"): p for p in entry.get("lines") or [] if isinstance(p, dict) and p.get("key") is not None}
        keys = [ln["key"] for ln in lines]
        same = bool(pos) and keys == [p.get("key") for p in entry["lines"] if isinstance(p, dict)] \
            and all(is_num(pos[k].get("start")) for k in keys)
        cues = None
        if same and not relayout:  # positions computed by vo_timeline.py for this exact line set
            for ln in lines:
                ln["offset"] = float(pos[ln["key"]]["start"])
            end = max(ln["offset"] + ln["dur"] for ln in lines)
            need = float(entry["need"]) if is_num(entry.get("need")) else end + tm["tail"]
            cues = scene_cues(entry.get("captions"))
        else:
            end = layout(lines, tm["lead"], tm["gap"], beat_sec, keep_explicit=not pos)
            need = end + tm["tail"]
            if not pos and not relayout and is_num(entry.get("need")):
                need = max(need, float(entry["need"]))
            if not pos and not relayout:
                cues = scene_cues(entry.get("captions"))
        out[sid] = {"lines": lines, "need": need, "cues": cues}
    return out


def parse_minbars(doc, log: Log) -> tuple[dict, dict]:
    if not isinstance(doc, dict):
        raise InputError("vo-minbars.json must be an object {sceneId: bars}")
    body = doc.get("scenes") if isinstance(doc.get("scenes"), dict) else \
        doc.get("minBars") if isinstance(doc.get("minBars"), dict) else doc
    meta = {k: float(doc[k]) for k in ("bpm", "barSec", "beatsPerBar") if is_num(doc.get(k))}
    out = {}
    for k, v in body.items():
        if k.startswith("_") or k in ("bpm", "barSec", "beatsPerBar", "scenes", "minBars", "meta"):
            continue
        if not is_num(v) or v < 0:
            log.warn(f"vo-minbars: {k} = {v!r} ignored (expects a whole number of bars)")
            continue
        out[k] = math.ceil(v - EPS)
    return out, meta


def narration_drift(project: Path, tl_doc) -> str | None:
    """Lines of P/narration.json (scene, text, cuts) that build/vo-timeline.json does not carry, or the reverse: the
    script changed after narration/vo_timeline.py ran, so minimums, captions and per-cut filtering are stale."""
    path = project / "narration.json"
    if not path.exists() or not isinstance(tl_doc, dict) or not isinstance(tl_doc.get("lines"), list):
        return None
    try:
        narr = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None
    lines = narr.get("lines") if isinstance(narr, dict) else None
    if not isinstance(lines, list):
        return None

    def sig(ln: dict) -> tuple:
        cuts = ln.get("cuts")
        return (str(ln.get("scene")), unicodedata.normalize("NFC", str(ln.get("text") or "")).strip(),
                tuple(sorted(str(c) for c in cuts)) if isinstance(cuts, list) and cuts else None)

    want = Counter(sig(ln) for ln in lines if isinstance(ln, dict))
    have = Counter(sig(ln) for ln in list(tl_doc.get("lines") or []) + list(tl_doc.get("optionalLines") or [])
                   if isinstance(ln, dict))
    if want == have:
        return None
    new, old = want - have, have - want
    scenes = sorted({k[0] for k in list(new) + list(old)})
    return f"{sum(new.values())} line(s) new or changed, {sum(old.values())} gone or replaced; scenes {', '.join(scenes)}"


def load_vo(project: Path, cut: str, spec: dict, args, bpm, bpb: int, beat_sec: float, bar_sec: float,
            log: Log) -> tuple[dict, dict, dict, object]:
    """Returns (vo_min {scene: bars}, timeline {scene: {lines, need, cues}}, meta for the plan, raw timeline doc).
    Minimums: --vo FILE (its sibling vo-minbars-<cut>.json when FILE is vo-minbars.json and that exists), else
    build/vo-minbars-<cut>.json, else build/vo-minbars.json; the timeline is the vo-timeline.json next to that file,
    else build/vo-timeline.json."""
    if args.no_vo:
        return {}, {}, {"used": False, "reason": "--no-vo"}, None
    if spec.get("narration") is False:
        return {}, {}, {"used": False, "reason": "cut has narration: false"}, None
    build = project / "build"
    if args.vo:
        mb_path = Path(args.vo)
        if not mb_path.exists():
            raise InputError(f"--vo file not found: {args.vo}")
        per_cut = mb_path.parent / f"vo-minbars-{cut}.json"
        if mb_path.name == "vo-minbars.json" and per_cut.exists():  # lines filtered per cut: their own minimums
            log.note(f"narration: {per_cut.name} (this cut's lines) used instead of {mb_path.name}")
            mb_path = per_cut
    else:
        mb_path = build / f"vo-minbars-{cut}.json"
        if not mb_path.exists():
            mb_path = build / "vo-minbars.json"
    tl_path = mb_path.parent / "vo-timeline.json"
    if not tl_path.exists():
        tl_path = build / "vo-timeline.json"
    have_mb, have_tl = mb_path.exists(), tl_path.exists()
    if not have_mb and not have_tl:
        return {}, {}, {"used": False, "reason": "no build/vo-minbars.json"}, None
    minbars, mb_meta = parse_minbars(read_json(mb_path, rel(mb_path, project)), log) if have_mb else ({}, {})
    tl_doc = read_json(tl_path, rel(tl_path, project)) if have_tl else None
    tl_meta = {k: float(tl_doc[k]) for k in ("bpm", "barSec", "beatsPerBar")
               if isinstance(tl_doc, dict) and is_num(tl_doc.get(k))}

    def stale(m: dict) -> str | None:
        if "bpm" in m and abs(m["bpm"] - bpm) > 1e-4:
            return f"{m['bpm']:g} BPM"
        if "barSec" in m and abs(m["barSec"] - bar_sec) > 1e-4:
            return f"bar {m['barSec']:g} s"
        if "beatsPerBar" in m and int(m["beatsPerBar"]) != bpb:
            return f"{int(m['beatsPerBar'])} beats per bar"
        return None

    why = stale(mb_meta) or stale(tl_meta)
    script_drift = narration_drift(project, tl_doc)
    if script_drift:
        log.warn(f"narration.json differs from {rel(tl_path, project)} ({script_drift}): the script changed after "
                 "narration/vo_timeline.py ran; re-run it (and tts/mix) so minimums, captions and per-cut lines match")
    filtered: dict = {}
    timeline = parse_vo_timeline(tl_doc, cut, beat_sec, bool(why), log, filtered) if have_tl else {}
    from_tl = {sid: max(1, math.ceil(v["need"] / bar_sec - EPS)) for sid, v in timeline.items()}
    if not args.vo:
        stale_hint = "" if (project / "narration.json").exists() else "; no narration.json in the project: stale?"
        log.note(f"narration: using {rel(mb_path, project) if have_mb else rel(tl_path, project)} (--no-vo to ignore"
                 f"{stale_hint})")
    if have_mb and not why:
        vo_min = minbars
        drift = [sid for sid, n in from_tl.items() if n > minbars.get(sid, 0)]
        if drift:
            log.warn(f"vo-minbars.json is older than vo-timeline.json for {', '.join(drift)} (needs more bars); "
                     "re-run narration/vo_timeline.py")
    elif have_tl:
        if why:
            log.warn(f"narration timing was computed at {why}, the plan runs at {bpm} BPM; minimums recomputed from "
                     "vo-timeline.json (re-run narration/vo_timeline.py)")
        else:
            log.note("narration: no vo-minbars.json; minimums computed from vo-timeline.json")
        vo_min = from_tl
    else:
        log.warn(f"vo-minbars.json was computed at {why}, the plan runs at {bpm} BPM; re-run narration/vo_timeline.py")
        vo_min = minbars
    if not have_tl:
        log.note("narration: no vo-timeline.json next to the minimums, so no captions")
    meta = {"used": True, "minBars": rel(mb_path, project) if have_mb else None,
            "timeline": rel(tl_path, project) if have_tl else None}
    if filtered:
        meta["filteredLines"] = filtered
    if script_drift:
        meta["scriptDrift"] = script_drift
    return vo_min, timeline, meta, tl_doc


# ------------------------ allocation ----------------------------------------------------

def allocate(cands: list[dict], target: int, fill: str, strict: bool, log: Log) -> tuple[dict, int]:
    """Spend `target` bars. Required scenes start at effMin; every spare bar goes to the most valuable option:
    extending scene s is worth 1 / (priority * (extra + 1)), adding an optional scene is worth 1 / priority and
    wins ties. "holdsFirst" adds optional scenes only after every hold reached maxBars. Returns (bars, overflow)."""
    bars = {s["id"]: s["effMin"] for s in cands if not s["optional"]}
    rem = target - sum(bars.values())
    while rem > 0:
        best_key, best = None, None
        for s in cands:
            sid = s["id"]
            if sid in bars:
                if bars[sid] >= s["maxBars"]:
                    continue
                extra = bars[sid] - s["effMin"]
                key = (0, s["priority"] * (extra + 1), 1, s["priority"], extra, s["index"])
            elif s["optional"] and s["effMin"] <= rem:
                key = (1 if fill == "holdsFirst" else 0, s["priority"], 0, s["priority"], 0, s["index"])
            else:
                continue
            if best_key is None or key < best_key:
                best_key, best = key, s
        if best is None:
            break
        sid = best["id"]
        if sid in bars:
            bars[sid] += 1
            rem -= 1
            log.steps.append(f"+1 bar  {sid:<14} -> {bars[sid]}  (value 1/{best_key[1]}, {rem} left)")
        else:
            bars[sid] = best["effMin"]
            rem -= best["effMin"]
            log.steps.append(f"add     {sid:<14} -> {bars[sid]}  (optional p{best['priority']}, {rem} left)")
    overflow = rem
    if rem > 0:
        # Every hold is at maxBars: stretch where the designed hold capacity is largest (smallest bars/maxBars
        # after the step, ties to the larger maxBars), so a 6-bar demo absorbs more than a 2-bar sting. The opening
        # scene (attention), pinned scenes and fixed-length scenes are used only when nothing else can absorb it.
        inc = [s for s in cands if s["id"] in bars]
        opener = inc[0]["id"] if inc else None
        pools = ([s for s in inc if not s["pinned"] and s["maxBars"] > s["minBars"] and s["id"] != opener],
                 [s for s in inc if not s["pinned"] and s["id"] != opener],
                 [s for s in inc if not s["pinned"]], inc)
        soft = next(p for p in pools if p)
        msg = (f"{rem} bar(s) left after every scene reached maxBars and no optional scene fits; "
               "raise maxBars, add optional scenes, or plan a shorter cut")
        if strict:
            raise Infeasible(msg)
        while rem > 0:
            s = min(soft, key=lambda s: (Fraction(bars[s["id"]] + 1, s["maxBars"]), -s["maxBars"], s["priority"],
                                         s["index"]))
            bars[s["id"]] += 1
            rem -= 1
            log.steps.append(f"+1 bar  {s['id']:<14} -> {bars[s['id']]}  (over maxBars)")
        over = [s["id"] for s in inc if bars[s["id"]] > s["maxBars"]]
        log.warn(msg + f"; over maxBars: {', '.join(over)}")
    return bars, overflow


def infeasible_message(cut: str, need: int, target: dict, bar_sec: float, req: list[dict]) -> str:
    worst = sorted(req, key=lambda s: (-s["priority"], -s["effMin"], -s["index"]))[:4]
    cands = ", ".join(f'{s["id"]} (p{s["priority"]}, {s["effMin"]} bar{"s" if s["effMin"] > 1 else ""}'
                      + (f', narration {s["voMin"]}' if s["voMin"] else "") + ")" for s in worst)
    return (f"cut {cut} needs {need} bars ({need * bar_sec:.3f} s) of scene minimums but the target is "
            f"{target['bars']} bars ({target['bars'] * bar_sec:.3f} s). Options: make scenes optional or exclude "
            f'them for this cut (\"cuts\": {{\"{cut}\": {{\"exclude\": [...]}}}}), lowest priority first: {cands}; '
            "lower minBars; shorten narration; or pass --grow to extend the cut.")


# ------------------------ music, cues, captions, hud ------------------------------------

def transition_window(kind: str, params: dict, beat_sec: float) -> tuple[float, float]:
    """Seconds a transition reaches before / after its bar line (runtime defaults, inParams overrides)."""
    pre_b, post_b = TRANS_WINDOW.get(kind, (0, 0))
    beats = lambda k, d: params[k] if is_num(params.get(k)) else d  # noqa: E731
    pre = params["pre"] if is_num(params.get("pre")) else beats("preBeats", pre_b) * beat_sec
    post = params["post"] if is_num(params.get("post")) else beats("postBeats", post_b) * beat_sec
    if kind == "match" and is_num(params.get("fade")):
        pre, post = max(pre, params["fade"] / 2), max(post, params["fade"] / 2)
    return float(pre), float(post)


def assign_music(inc: list[dict], authored: bool, log: Log) -> None:
    if authored:
        prev = None
        for s in inc:
            s["part"] = s["music"] or prev or "intro"
            prev = s["part"]
        return
    n = len(inc)
    for k, s in enumerate(inc):
        if k == 0:
            s["part"] = "intro"
        elif k == n - 1 and n >= 3:
            s["part"] = "outro"
        elif s["dark"]:
            s["part"] = "breakdown"
        elif k == 1 or inc[k - 1]["dark"]:
            s["part"] = "drop"
        else:
            s["part"] = "groove"
    log.note("music parts auto-assigned (no scene sets \"music\"): " + " ".join(f'{s["id"]}={s["part"]}' for s in inc))


def music_sections(inc: list[dict], bar_sec: float) -> list[dict]:
    secs, seen = [], {}
    for s in inc:
        if secs and secs[-1]["part"] == s["part"]:
            secs[-1]["toBar"] = s["toBar"]
            secs[-1]["scenes"].append(s["id"])
        else:
            seen[s["part"]] = seen.get(s["part"], 0) + 1
            secs.append({"fromBar": s["fromBar"], "toBar": s["toBar"], "part": s["part"],
                         "occurrence": seen[s["part"]], "scenes": [s["id"]]})
    for m in secs:
        m["bars"] = m["toBar"] - m["fromBar"]
        m["t0"], m["t1"] = r6(m["fromBar"] * bar_sec), r6(m["toBar"] * bar_sec)
    return [{k: m[k] for k in ("fromBar", "toBar", "part", "bars", "t0", "t1", "occurrence", "scenes")} for m in secs]


def resolve_cues(inc: list[dict], duration: float, beat_sec: float, bar_sec: float, log: Log) -> list[dict]:
    """Authored beat offsets -> absolute cue times for this cut.

    Anchors (scene-local): start = 0, holdStart = inSec, holdBar / holdBeat = the first scene bar / beat line at or
    after inSec, outStart (alias holdEnd) = dur - outSec, end = dur.
    Single cue: t = anchor + beat. A holdStart cue at beat > 0 needs a hold longer than that beat; a holdBar/holdBeat
    cue needs its grid line inside the hold; a start cue may not land after the scene end, an outStart/end cue not
    before the scene start. Repeating cue ("every" N beats, optional "count", "until" anchor; default outStart for
    the hold anchors, else end): grid lines anchor + k*N beats strictly before `until`, each cue at its grid line +
    beat. holdBar + every N*beatsPerBar is exactly runtime onBars(env, N), holdBeat + every N is onBeats(env, N)
    (beat = their offsetBeats), so a scene that draws with those helpers stays in sync with the sound."""
    out = []
    for s in inc:
        anchor_t = {"start": s["t0"], "holdStart": s["t0"] + s["inSec"],
                    "holdBar": s["t0"] + math.ceil((s["inSec"] - 1e-6) / bar_sec) * bar_sec,
                    "holdBeat": s["t0"] + math.ceil((s["inSec"] - 1e-6) / beat_sec) * beat_sec,
                    "outStart": s["t1"] - s["outSec"], "end": s["t1"]}
        for ci, c in enumerate(s["cues"]):
            where = f"{s['id']}.cues[{ci}]"
            if not isinstance(c, dict):
                log.warn(f"{where} must be an object; skipped")
                continue
            frm = ANCHOR_ALIAS.get(c.get("from", "start"), c.get("from", "start"))
            sfx = c.get("sfx")
            if frm not in anchor_t:
                log.warn(f'{where}: unknown anchor "{c.get("from")}" (use {", ".join(ANCHORS)}); skipped')
                continue
            if isinstance(sfx, dict):  # object form of an SFX spec (audio/synth.py): needs its name
                name = sfx.get("name") or sfx.get("sfx")
            else:
                name = sfx
            if not isinstance(name, str) or not name.strip():
                log.warn(f'{where}: missing "sfx"; skipped')
                continue
            b = c.get("beat", 0)
            if not is_num(b):
                log.warn(f'{where}: "beat" must be a number; skipped')
                continue
            every, count = c.get("every"), c.get("count")
            if every is not None and (not is_num(every) or every <= 0):
                log.warn(f'{where}: "every" must be > 0 beats; treated as a single cue')
                every = None
            if count is not None and (not isinstance(count, int) or isinstance(count, bool) or count < 1):
                log.warn(f'{where}: "count" must be a positive integer; ignored')
                count = None
            until = ANCHOR_ALIAS.get(c.get("until"), c.get("until")) or ("outStart" if frm in HOLD_ANCHORS else "end")
            if until not in anchor_t:
                log.warn(f'{where}: unknown "until" anchor "{c.get("until")}"; using end')
                until = "end"
            if abs(b * 12 - round(b * 12)) > 1e-6 or (every and abs(every * 12 - round(every * 12)) > 1e-6):
                log.note(f"{where}: {name} is off the 16th/triplet grid (beat {b:g}, every {every or 0:g})")
            a = anchor_t[frm]
            times = []
            if every is None:
                t = a + b * beat_sec
                if frm == "holdStart" and b > EPS and t > anchor_t["outStart"] - EPS:
                    log.note(f"{where} ({name} at holdStart+{b:g}) left out: the hold is shorter in this cut")
                elif frm in ("holdBar", "holdBeat") and a > anchor_t["outStart"] - EPS:
                    log.note(f"{where} ({name}) left out: no {frm[4:].lower()} line inside the hold in this cut")
                elif frm == "start" and t > s["t1"] + EPS:
                    log.warn(f"{where} ({name}) lands after the scene end; anchor it to holdStart or end. Dropped")
                elif frm in ("outStart", "end") and t < s["t0"] - EPS:
                    log.warn(f"{where} ({name}) lands before the scene start in this cut. Dropped")
                else:
                    times.append(t)
            else:
                k = 0
                while k < 10000 and (count is None or k < count):
                    g = a + k * every * beat_sec
                    if g > anchor_t[until] - EPS:
                        break
                    times.append(g + b * beat_sec)
                    k += 1
                if not times:
                    log.note(f"{where} ({name} every {every:g}) fires 0 times: no room before {until} in this cut")
            extras = {k: v for k, v in c.items() if k not in CUE_CONSUMED}
            for k, t in enumerate(times):
                if t < -EPS or t > duration - EPS:
                    log.warn(f"{where} ({name} at {t:.3f} s) is outside the reel [0, {duration:.3f}). Dropped")
                    continue
                t = max(t, 0.0)
                off = round((t - a) / beat_sec, 6)
                cue = {"t": r6(t), "sfx": sfx, "scene": s["id"], "from": frm,
                       "offset": int(off) if off == int(off) else off, "atBeat": r4(t / beat_sec)}
                if every:
                    cue["rep"] = k
                for key, v in extras.items():  # e.g. gain, pan, note: passed through untouched
                    cue.setdefault(key, v)
                cue["_key"] = (s["order"], ci, k)
                out.append(cue)
    out.sort(key=lambda c: (c["t"], c["_key"]))
    for c in out:
        del c["_key"]
    return out


def validate_sfx(cues: list[dict], log: Log) -> None:
    """Warn about cue specs that audio/synth.py cannot parse (unknown names, bad grammar). Skipped quietly when the
    audio library is missing or cannot be imported here."""
    if not cues:
        return
    keep, sys.dont_write_bytecode = sys.dont_write_bytecode, True  # no __pycache__ in another tool's folder
    try:
        sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "audio"))
        import synth  # noqa: PLC0415 (optional sibling module)
        parse = synth.parse_sfx
    except Exception:  # noqa: BLE001
        return
    finally:
        sys.path.pop(0)
        sys.dont_write_bytecode = keep
    seen = set()
    for c in cues:
        key = json.dumps(c["sfx"], sort_keys=True)
        if key in seen:
            continue
        seen.add(key)
        try:
            parse(c["sfx"])
        except Exception as e:  # noqa: BLE001
            log.warn(f"{c['scene']}: sfx {c['sfx']!r} is not a valid SFX spec ({e}); see audio/synth.py list")


def captions_enabled(cfg: dict, style: dict, narr: dict) -> bool:
    """Same switch as narration/captions.py: reel.config captions.enabled > style layout.captions.enabled >
    narration.json captions.enabled > on."""
    rc = cfg.get("captions")
    if isinstance(rc, dict) and "enabled" in rc:
        return bool(rc["enabled"])
    lay = (style.get("layout") or {}).get("captions") if isinstance(style.get("layout"), dict) else None
    if isinstance(lay, dict) and "enabled" in lay:
        return bool(lay["enabled"])
    nc = narr.get("captions") if isinstance(narr.get("captions"), dict) else {}
    return bool(nc.get("enabled", True))


def caption_options(narr: dict) -> dict:
    nc = narr.get("captions") if isinstance(narr.get("captions"), dict) else {}
    return {k: float(nc[k]) if is_num(nc.get(k)) else v for k, v in CAPTION_DEFAULTS.items()}


def narration_tool_cues(project: Path, tl_doc, plan_like: dict, log: Log) -> list[dict] | None:
    """Exact cues from narration/captions.py (the code that rewrites them after planning), when the timeline is
    vo_timeline.py's and that module imports here. None -> the planner's own rules (below) are used."""
    ndir = Path(__file__).resolve().parents[1] / "narration"
    ours = isinstance(tl_doc, dict) and isinstance(tl_doc.get("lines"), list) and isinstance(tl_doc.get("scenes"), dict)
    if not (ours and (ndir / "captions.py").exists() and (project / "narration.json").exists()):
        return None
    sys.path.insert(0, str(ndir))
    keep, sys.dont_write_bytecode = sys.dont_write_bytecode, True  # no __pycache__ in another tool's folder
    try:
        import vo_timeline as vt_mod  # noqa: PLC0415 (optional sibling modules)
        import captions as cap_mod  # noqa: PLC0415
        proj = vt_mod.load_project(project)
        st = vt_mod.settings(proj)
        placed = vt_mod.place(tl_doc, plan_like)
        cues = cap_mod.build_cues(placed["lines"], placed["duration"], proj, st, cap_mod.options(proj, st))
        return [{"t0": round(float(c["t0"]), 3), "t1": round(float(c["t1"]), 3), "text": c["text"], "scene": c["scene"]}
                for c in cues]
    except KeyboardInterrupt:
        raise
    except BaseException as e:  # noqa: BLE001 (their loaders exit on bad input; API drift falls back)
        log.note(f"captions: narration/captions.py not usable here ({type(e).__name__}: {e}); planner rules used")
        return None
    finally:
        sys.dont_write_bytecode = keep
        if str(ndir) in sys.path:
            sys.path.remove(str(ndir))


def build_captions(project: Path, inc: list[dict], timeline: dict, tl_doc, enabled: bool, opts: dict, all_ids: set,
                   plan_like: dict, log: Log) -> tuple[list[dict], dict]:
    """First-pass burn-in cues [{t0, t1, text, scene}]; narration/captions.py rewrites them after planning.
    Built with captions.py itself when possible; otherwise with the same rules: vo_timeline.py's scene-relative
    cues when present, else one cue per line that appears `lead` s before the speech, holds up to `hold` s after it
    (never past the next cue or the scene end), lasts at least `minDur` when room allows; captions change on scene
    cuts (`snap`) and gaps shorter than `mergeGap` close."""
    duration = plan_like["duration"]
    inc_ids = {s["id"] for s in inc}
    for sid, v in timeline.items():
        if sid not in all_ids:
            log.warn(f"vo-timeline: scene {sid!r} is not in reel.config.json; its {len(v['lines'])} line(s) ignored")
        elif sid not in inc_ids:
            log.note(f"narration for {sid} ({len(v['lines'])} line(s)) left out with the scene")
    stats = {"lines": 0, "estimatedLines": 0}
    chunks = []
    for s in inc:
        v = timeline.get(s["id"])
        if not v:
            continue
        stats["lines"] += len(v["lines"])
        stats["estimatedLines"] += sum(1 for ln in v["lines"] if ln["estimated"])
        end = max(ln["offset"] + ln["dur"] for ln in v["lines"])
        if s["t0"] + end > s["t1"] + EPS:
            log.warn(f"narration in {s['id']} ends {s['t0'] + end - s['t1']:.2f} s after the scene; plan with its "
                     "vo-minbars.json (re-run narration/vo_timeline.py if the lines changed)")
        if v["cues"]:
            for c in v["cues"]:
                chunks.append({"t0": s["t0"] + c["t0"], "t1": s["t0"] + c["t1"], "text": c["text"], "scene": s["id"],
                               "sceneT0": s["t0"], "speechEnd": s["t0"] + c["t1"]})
            said = [ln for ln in v["lines"] if ln["text"].strip()]
            if said:  # vo_timeline.py held the scene's last cue against a minBars-long scene; re-hold it here
                ln = said[-1]
                s0 = s["t0"] + ln["offset"] + CLIP_PRE
                s1 = max(s0 + 0.1, s["t0"] + ln["offset"] + ln["dur"] - CLIP_POST)
                chunks[-1].update(s1=s1, sceneT1=s["t1"], speechEnd=s1)
        else:
            for ln in v["lines"]:
                if not ln["text"].strip():
                    continue
                s0 = s["t0"] + ln["offset"] + CLIP_PRE
                s1 = max(s0 + 0.1, s["t0"] + ln["offset"] + ln["dur"] - CLIP_POST)
                chunks.append({"s0": s0, "s1": s1, "text": ln["text"].strip(), "scene": s["id"], "sceneT0": s["t0"],
                               "sceneT1": s["t1"], "speechEnd": s1})
    if not enabled or not chunks:
        return [], stats
    exact = narration_tool_cues(project, tl_doc, plan_like, log)
    if exact is not None:
        return exact, stats
    begin = lambda c: c["t0"] if "t0" in c else c["s0"] - opts["lead"]
    chunks.sort(key=begin)
    cues: list[dict] = []
    for i, c in enumerate(chunks):
        nxt = begin(chunks[i + 1]) if i + 1 < len(chunks) else duration
        start = max(0.0, begin(c), cues[-1]["t1"] if cues else 0.0)
        if "t0" in c:  # precomputed by vo_timeline.py
            end = c["t1"]
            if "s1" in c:
                end = max(end, min(nxt, c["s1"] + opts["hold"], max(c["s1"], c["sceneT1"])))
            end = min(end, duration)
        else:
            end = max(c["s1"], min(nxt, c["s1"] + opts["hold"], max(c["s1"], c["sceneT1"])))
            end = min(max(end, min(nxt, start + opts["minDur"])), duration)
        if end - start >= 0.05:
            cues.append({"t0": start, "t1": end, "text": c["text"], "scene": c["scene"], "sceneT0": c["sceneT0"],
                         "speechEnd": c["speechEnd"]})
    for i, b in enumerate(cues):  # captions change on scene cuts, not a few frames off them
        a, cut = (cues[i - 1] if i else None), b["sceneT0"]
        if a is None or a["scene"] == b["scene"] or cut <= 0:
            continue
        if a["speechEnd"] <= cut + EPS and (a["t1"] > cut or cut - a["t1"] < opts["snap"]):
            a["t1"] = cut
        if cut < b["t0"] < cut + opts["snap"] and a["t1"] <= cut + EPS:
            b["t0"] = cut
    for a, b in zip(cues, cues[1:]):
        if 0 < b["t0"] - a["t1"] < opts["mergeGap"] or a["t1"] > b["t0"]:
            a["t1"] = b["t0"]
    return [{"t0": round(c["t0"], 3), "t1": round(c["t1"], 3), "text": c["text"], "scene": c["scene"]}
            for c in cues if c["t1"] - c["t0"] >= 0.05], stats


def hud_segments(hud: dict, inc: list[dict], log: Log) -> dict | None:
    if not isinstance(hud, dict) or not hud:
        return None
    steps = hud.get("steps") or []
    mp = hud.get("map") or {}
    if not isinstance(steps, list) or not isinstance(mp, dict):
        log.warn('hud must be {"steps": [labels], "map": {sceneId: step index or label}}; ignored')
        return None
    segs = []
    for s in inc:
        v = mp.get(s["id"])
        if isinstance(v, str):
            v = steps.index(v) if v in steps else None
        if not isinstance(v, int) or isinstance(v, bool) or not 0 <= v < max(len(steps), 1):
            if s["id"] in mp:
                log.warn(f"hud.map[{s['id']}] = {mp[s['id']]!r} is not a step index or label")
            continue
        if segs and segs[-1]["step"] == v and segs[-1]["toBar"] == s["fromBar"]:
            segs[-1]["toBar"], segs[-1]["t1"] = s["toBar"], s["t1"]
        else:
            segs.append({"step": v, "label": steps[v] if v < len(steps) else None, "fromBar": s["fromBar"],
                         "toBar": s["toBar"], "t0": s["t0"], "t1": s["t1"]})
    return {"steps": steps, "segments": segs}


# ------------------------ the plan ------------------------------------------------------

def plan_cut(project: Path, cfg: dict, cut: str, args, log: Log) -> dict:
    style = load_style(project, cfg, log)
    bpm, bpb, bpm_src = tempo(cfg, style, log)
    beat_sec = 60.0 / bpm
    bar_sec = bpb * beat_sec
    fps = cfg.get("fps", 60)
    if not is_num(fps) or fps <= 0:
        raise InputError(f"fps must be a positive number, got {fps!r}")
    cuts = cfg.get("cuts") or {}
    if not isinstance(cuts, dict):
        raise InputError('reel.config.json "cuts" must be an object {name: {"bars": n} | {"seconds": s}}')
    spec = cuts.get(cut, {})
    if is_num(spec):
        spec = {"seconds": spec}
    if not isinstance(spec, dict):
        raise InputError(f"cuts.{cut} must be an object")
    target = cut_target(cut, spec, args, bpm, bpb, bar_sec, log)
    fill = args.fill or spec.get("fill") or cfg.get("fill") or "balanced"
    if fill not in ("balanced", "holdsFirst"):
        raise InputError(f'fill must be "balanced" or "holdsFirst", got {fill!r}')

    scenes = normalize_scenes(cfg, bpb, log)
    apply_cut_overrides(scenes, cut, spec, args, log)
    vo_min, timeline, vo_meta, tl_doc = load_vo(project, cut, spec, args, bpm, bpb, beat_sec, bar_sec, log)
    all_ids = {s["id"] for s in scenes}
    for sid in vo_min:
        if sid not in all_ids:
            log.warn(f"vo-minbars: scene {sid!r} is not in reel.config.json; ignored")

    for s in scenes:
        phase_min = max(1, math.ceil((s["inBeats"] + s["outBeats"]) / bpb - EPS))
        s["voMin"] = vo_min.get(s["id"], 0)
        s["effMin"] = max(s["minBars"], phase_min, s["voMin"])
        s["authoredMax"] = s["maxBars"]
        if phase_min > s["minBars"] and not s["excluded"]:
            log.warn(f"{s['id']}: inBeats {s['inBeats']:g} + outBeats {s['outBeats']:g} need {phase_min} bar(s) > "
                     f"minBars {s['minBars']}; minimum raised to {phase_min}")
        s["maxBars"] = max(s["maxBars"], s["effMin"])

    cands = [s for s in scenes if not s["excluded"]]
    if not cands:
        raise InputError(f"cut {cut}: every scene is excluded")
    req = [s for s in cands if not s["optional"]]
    need = sum(s["effMin"] for s in req)
    if need > target["bars"]:
        if not args.grow:
            raise Infeasible(infeasible_message(cut, need, target, bar_sec, req))
        log.note(f"--grow: target {target['bars']} bars is shorter than the minimums; cut extended to {need} bars "
                 f"({need * bar_sec:.3f} s)")
        target["grownFrom"], target["bars"] = target["bars"], need
    bars, overflow = allocate(cands, target["bars"], fill, args.strict, log)

    inc = [s for s in cands if s["id"] in bars]
    # narration lines whose "cuts" list leaves this cut out: a scene that plays here without any of its lines is the
    # classic trap when a longer cut is added later (lines tagged ["30"] fall silent in a new "60")
    filt = vo_meta.pop("filteredLines", {}) if isinstance(vo_meta, dict) else {}
    playing = {s["id"] for s in inc}
    silent = sorted(sid for sid in filt if sid in playing and sid not in timeline)
    partial = sorted(sid for sid in filt if sid in playing and sid in timeline)
    # A shorter cut that drops lines written for a longer one is a normal edit (note). A LONGER cut that drops lines
    # written only for shorter cuts is the trap (warn): the scene now holds longer, in silence.
    here = target["bars"] * bar_sec
    longer = [sid for sid in silent
              if all((cut_seconds(c, cuts, bar_sec) or 0) < here - EPS for _, cs in filt[sid] for c in cs)]
    if longer and isinstance(vo_meta, dict) and vo_meta.get("scriptDrift"):   # the timeline is stale: re-check later
        log.note(f"narration: {', '.join(longer)} have no lines for cut {cut} in the stale timeline; re-plan after "
                 "narration/vo_timeline.py")
    elif longer:
        log.warn(f"narration: {', '.join(longer)} play in cut {cut} without their lines (tagged only for shorter cuts: "
                 f"{'; '.join(k + ' ' + '/'.join(cs) for sid in longer for k, cs in filt[sid])}); add \"{cut}\" to "
                 f"those lines' \"cuts\" or write lines for this cut, then re-run narration/vo_timeline.py")
    rest = [sid for sid in silent if sid not in longer]
    if rest:
        log.note(f"narration: {', '.join(rest)} play in cut {cut} without narration (their lines are tagged for other cuts)")
    if partial:
        log.note(f"narration: some lines of {', '.join(partial)} are tagged for other cuts and skipped in cut {cut}")
    if filt:
        vo_meta["filteredOut"] = {sid: len(v) for sid, v in sorted(filt.items())}
    for s in inc:
        if s["voMin"] > s["authoredMax"]:
            log.warn(f"{s['id']}: narration needs {s['voMin']} bars > maxBars {s['authoredMax']}; the hold grows past "
                     "maxBars (shorten the line or design a longer hold)")
        elif s["voMin"] > s["minBars"]:
            log.note(f"{s['id']}: narration needs {s['voMin']} bars (minBars {s['minBars']}); the extra time is hold")
    excluded = [{"id": s["id"], "reason": s["excluded"]} for s in scenes if s["excluded"]]
    excluded += [{"id": s["id"], "reason": f"optional p{s['priority']}: no room ({s['effMin']} bars needed)"}
                 for s in cands if s["id"] not in bars]
    excluded.sort(key=lambda e: [s["id"] for s in scenes].index(e["id"]))

    prev_cfg = {s["id"]: (scenes[k - 1]["id"] if k else None) for k, s in enumerate(scenes)}
    bar = 0
    for k, s in enumerate(inc):
        s["order"] = k
        s["bars"] = bars[s["id"]]
        s["fromBar"], s["toBar"] = bar, bar + s["bars"]
        bar = s["toBar"]
        s["t0"], s["t1"] = s["fromBar"] * bar_sec, s["toBar"] * bar_sec
        s["inSec"], s["outSec"] = s["inBeats"] * beat_sec, s["outBeats"] * beat_sec
        s["holdSec"] = s["bars"] * bar_sec - s["inSec"] - s["outSec"]
        prev = inc[k - 1]["id"] if k else None
        s["prev"], s["inUsed"] = prev, s["in"]
        if prev is None:
            s["inUsed"] = "cut"  # nothing precedes the opener (the compositor also cuts in scene 0)
            if s["in"] != "cut":
                log.note(f'{s["id"]} opens this cut, so its "{s["in"]}" transition becomes a cut')
        elif prev != prev_cfg[s["id"]] and s["in"] in PREV_SPECIFIC:
            if s["inFallback"]:
                s["inUsed"] = s["inFallback"]
                log.note(f'{s["id"]}: "{s["in"]}" was designed after {prev_cfg[s["id"]]}, which is not in this cut; '
                         f'using inFallback "{s["inFallback"]}"')
            else:
                log.warn(f'{s["id"]}: "{s["in"]}" was designed after {prev_cfg[s["id"]]}, but {prev} precedes it in '
                         'this cut; set "inFallback" or check the transition stills')
    for k, s in enumerate(inc[1:], 1):
        pre, post = transition_window(s["inUsed"], s["inParams"], beat_sec)
        a = inc[k - 1]
        if pre > a["outSec"] + EPS:
            log.note(f'"{s["inUsed"]}" into {s["id"]} starts {pre:.2f} s before the bar line, inside the hold of '
                     f'{a["id"]} (out-phase {a["outSec"]:.2f} s); give {a["id"]} more outBeats if its exit should '
                     'carry it')
        if post > s["inSec"] + EPS:
            log.note(f'"{s["inUsed"]}" into {s["id"]} runs {post:.2f} s past the bar line, longer than its in-phase '
                     f'({s["inSec"]:.2f} s)')
    total = bar
    duration = total * bar_sec
    assign_music(inc, any(s["music"] for s in scenes), log)

    out_scenes = []
    for s in inc:
        rec = {"id": s["id"], "fromBar": s["fromBar"], "toBar": s["toBar"], "t0": r6(s["t0"]), "t1": r6(s["t1"]),
               "in": s["inUsed"], "inParams": s["inParams"], "inBeats": tidy(s["inBeats"]),
               "outBeats": tidy(s["outBeats"]),
               "dark": s["dark"], "music": s["part"],
               "index": s["order"], "bars": s["bars"], "dur": r6(s["bars"] * bar_sec), "inSec": r6(s["inSec"]),
               "outSec": r6(s["outSec"]), "holdSec": r6(s["holdSec"]), "holdStart": r6(s["t0"] + s["inSec"]),
               "outStart": r6(s["t1"] - s["outSec"]), "prev": s["prev"], "priority": s["priority"],
               "optional": s["optional"], "minBars": s["effMin"], "maxBars": s["maxBars"]}
        if s["voMin"]:
            rec["voBars"] = s["voMin"]
        if s["inUsed"] != s["in"]:
            rec["inAuthored"] = s["in"]
        for k, v in s["extra"].items():
            rec.setdefault(k, v)
        out_scenes.append(rec)

    cues = resolve_cues(inc, duration, beat_sec, bar_sec, log)
    validate_sfx(cues, log)
    narr = {}
    if (project / "narration.json").exists():
        try:
            narr = read_json(project / "narration.json", "narration.json")
        except InputError as e:
            log.warn(f"{e}; caption options use defaults")
        narr = narr if isinstance(narr, dict) else {}
    enabled = captions_enabled(cfg, style, narr)
    plan_like = {"cut": cut, "bpm": bpm, "beatSec": beat_sec, "barSec": bar_sec, "duration": duration,
                 "scenes": [{"id": s["id"], "t0": s["t0"], "t1": s["t1"]} for s in inc]}
    captions, vo_stats = build_captions(project, inc, timeline, tl_doc, enabled, caption_options(narr), all_ids,
                                        plan_like, log)
    if timeline and not enabled:
        log.note("captions disabled (reel.config / style.json layout.captions); no burn-in cues in the plan")
    placeholder_caps = bool(enabled and captions and vo_stats.get("estimatedLines"))
    if placeholder_caps:
        log.warn(f"captions come from placeholder narration ({vo_stats['estimatedLines']} of {vo_stats.get('lines', 0)} line(s) "
                 "timed from text estimates or dry-run clips): fine for a preview; synthesize the real voice and re-plan "
                 "before delivery (render.mjs / build.mjs refuse them without --allow-placeholder)")
    plan = {
        "cut": cut, "bpm": bpm, "beatsPerBar": bpb, "beatSec": r6(beat_sec), "barSec": r6(bar_sec), "bars": total,
        "duration": r6(duration), "scenes": out_scenes, "music": music_sections(inc, bar_sec), "cues": cues,
        "captions": captions,
        "fps": fps, "frames": math.ceil(duration * fps - 1e-6),
        "target": {k: target[k] for k in ("bars", "seconds", "round", "from", "grownFrom") if k in target},
        "bpmSource": bpm_src, "fill": fill, "overflowBars": overflow,
        "vo": {**vo_meta, **(vo_stats if vo_meta.get("used") else {}), "captions": len(captions),
               "captionsEnabled": enabled, "placeholderCaptions": placeholder_caps},
    }
    hud = hud_segments(cfg.get("hud"), out_scenes, log)
    if hud is not None:
        plan["hud"] = hud
    missing = [s["id"] for s in out_scenes if not (project / "scenes" / f"{s['id']}.js").exists()]
    if missing:
        log.note(f"no scene file yet for {', '.join(missing)} (scenes/<id>.js; the runtime draws a placeholder)")
    plan["excluded"] = excluded
    plan["warnings"] = list(log.warnings)
    plan["notes"] = list(log.notes)
    plan["planner"] = "motion-showreel timing/plan_cut.py 1"
    return plan


def qa(plan: dict) -> list[str]:
    """Invariants every plan must satisfy (a failure is a planner bug)."""
    # Exact bar length: plan["barSec"] is rounded to 6 decimals, and k * rounded drifts past the tolerance on long
    # cuts (e.g. 116 BPM, 60 s). Times in the plan are rounded once, so they sit within 5e-7 s of k * bar_sec.
    errs, bar_sec, prev = [], plan["beatsPerBar"] * 60.0 / plan["bpm"], 0
    on_line = lambda t, k: abs(t - k * bar_sec) <= 1e-5
    for s in plan["scenes"]:
        if s["fromBar"] != prev or s["toBar"] <= s["fromBar"]:
            errs.append(f"{s['id']}: bars {s['fromBar']}-{s['toBar']} not contiguous after bar {prev}")
        if not (on_line(s["t0"], s["fromBar"]) and on_line(s["t1"], s["toBar"])):
            errs.append(f"{s['id']}: t0/t1 off the bar lines")
        if s["holdSec"] < -1e-6 or s["bars"] < s["minBars"]:
            errs.append(f"{s['id']}: below its minimum ({s['bars']} < {s['minBars']} bars or negative hold)")
        prev = s["toBar"]
    if prev != plan["bars"] or not on_line(plan["duration"], plan["bars"]):
        errs.append(f"scenes end at bar {prev}, plan has {plan['bars']} bars")
    mprev = 0
    for m in plan["music"]:
        if m["fromBar"] != mprev:
            errs.append(f"music section {m['part']} starts at bar {m['fromBar']}, expected {mprev}")
        mprev = m["toBar"]
    if mprev != plan["bars"]:
        errs.append("music sections do not cover the cut")
    ts = [c["t"] for c in plan["cues"]]
    if ts != sorted(ts) or any(t < 0 or t >= plan["duration"] for t in ts):
        errs.append("cues unsorted or outside the reel")
    for c in plan["captions"]:
        if not (0 <= c["t0"] < c["t1"] <= plan["duration"] + 1e-6):
            errs.append(f"caption in {c['scene']} has a bad window {c['t0']}-{c['t1']}")
    return errs


# ------------------------ output --------------------------------------------------------

def frame_times(plan: dict, which: str) -> list[float]:
    fps, dur = plan["fps"], plan["duration"]
    first = lambda t: math.ceil(t * fps - 1e-6) / fps  # first frame at/after t
    last_before = lambda t: (math.ceil(t * fps - 1e-6) - 1) / fps
    ts = set()
    if which in ("boundaries", "all"):
        ts |= {0.0, last_before(dur)}
        for s in plan["scenes"][1:]:
            b = s["t0"]
            ts |= {first(b - 0.25), last_before(b), first(b), first(b + 0.25)}
    if which in ("holds", "all"):
        for s in plan["scenes"]:
            if s["holdSec"] * fps >= 1:
                ts |= {first(s["holdStart"]), first(s["holdStart"] + s["holdSec"] / 2), last_before(s["outStart"])}
    if which in ("cues", "all"):
        ts |= {first(c["t"]) for c in plan["cues"]}
    return sorted(t for t in ts if 0 <= t < dur)


def fmt_s(x: float) -> str:
    return f"{x:.3f}"


def print_table(plan: dict, log: Log, path_txt: str | None, verbose: bool, out) -> None:
    p = plan
    fpb = p["barSec"] * p["fps"]
    fr = f"{fpb:g} frames" + ("" if abs(fpb - round(fpb)) < 1e-6 else ", boundaries between frames on some bars")
    tgt = p["target"]
    asked = f"target {tgt['seconds']:g} s" if tgt["seconds"] is not None else f"target {tgt['bars']} bars"
    print(f"cut {p['cut']} | {p['bpm']} BPM {p['beatsPerBar']}/4 ({p['bpmSource']}) | beat {fmt_s(p['beatSec'])} s | "
          f"bar {fmt_s(p['barSec'])} s ({fr} @ {p['fps']:g} fps) | {p['bars']} bars = {fmt_s(p['duration'])} s "
          f"({asked}, fill {p['fill']})", file=out)
    hdr = ("  #", "scene", "bars", "t0", "t1", "dur", "in", "in/out b", "hold s", "min..max", "grow", "p", "music",
           "vo")
    rows = []
    for s in p["scenes"]:
        grow = s["bars"] - s["minBars"]
        flag = "max" if s["bars"] == s["maxBars"] and grow else ("OVER" if s["bars"] > s["maxBars"] else "")
        rows.append((str(s["index"] + 1), s["id"] + (" *" if s["optional"] else ""), f"{s['fromBar']}-{s['toBar']}",
                     fmt_s(s["t0"]), fmt_s(s["t1"]), fmt_s(s["dur"]), s["in"], f"{s['inBeats']:g}/{s['outBeats']:g}",
                     fmt_s(s["holdSec"]), f"{s['minBars']}..{s['maxBars']}",
                     (f"+{grow} {flag}".strip() if grow else flag or "-"),
                     str(s["priority"]), s["music"], str(s.get("voBars", "")) or ""))
    widths = [max(len(h), *(len(r[i]) for r in rows)) for i, h in enumerate(hdr)]
    right = {0, 2, 3, 4, 5, 8}
    def line(cells):
        return "  ".join(c.rjust(widths[i]) if i in right else c.ljust(widths[i]) for i, c in enumerate(cells)).rstrip()
    print(line(hdr), file=out)
    for r in rows:
        print(line(r), file=out)
    marks = "123456789abcdefghijklmnopqrstuvwxyz"
    ruler = "".join((marks[s["index"]] if s["index"] < len(marks) else "?") * s["bars"] for s in p["scenes"])
    groups = "|".join(ruler[i:i + 4] for i in range(0, len(ruler), 4))
    print(f"bars   |{groups}|   (* optional; digit = scene #, | every 4 bars)", file=out)
    print("music  " + " | ".join(f"{m['part']} {m['fromBar']}-{m['toBar']}" for m in p["music"]), file=out)
    by_sfx: dict[str, int] = {}
    for c in p["cues"]:
        name = c["sfx"].get("name") or c["sfx"].get("sfx") if isinstance(c["sfx"], dict) else c["sfx"]
        name = str(name).split()[0]
        by_sfx[name] = by_sfx.get(name, 0) + 1
    counts = ", ".join(f"{k} x{v}" for k, v in by_sfx.items())
    print(f"cues   {len(p['cues'])}" + (f": {counts}" if counts else ""), file=out)
    if p["vo"].get("used"):
        v = p["vo"]
        print(f"vo     {v.get('lines', 0)} line(s) in this cut, {v.get('estimatedLines', 0)} with estimated length | "
              f"{v['captions']} caption cue(s){'' if v['captionsEnabled'] else ' (captions disabled)'} | "
              f"minimums from {v['minBars'] or v['timeline']}", file=out)
    if p["excluded"]:
        print("out    " + " | ".join(f"{e['id']} ({e['reason']})" for e in p["excluded"]), file=out)
    if p.get("hud"):
        segs = " | ".join(f"{h['label'] or h['step']} {h['fromBar']}-{h['toBar']}" for h in p["hud"]["segments"])
        print(f"hud    {segs}", file=out)
    if verbose and log.steps:
        print("allocation (spare bars, in order):", file=out)
        for st in log.steps:
            print("  " + st, file=out)
    for n in log.notes:
        print(f"note   {n}", file=out)
    for w in log.warnings:
        print(f"WARN   {w}", file=out)
    print(f"QA     ok: {p['bars']} bars contiguous on bar lines, {len(p['cues'])} cues and "
          f"{len(p['captions'])} captions inside the reel" + (f" -> {path_txt}" if path_txt else ""), file=out)


def expand_cuts(arg: str, cfg: dict) -> list[str]:
    cuts = cfg.get("cuts") if isinstance(cfg.get("cuts"), dict) else {}
    if arg == "all":
        if not cuts:
            raise InputError('--cut all needs a "cuts" object in reel.config.json')
        names = list(cuts)
    else:
        names = [c.strip() for c in arg.split(",") if c.strip()]
    for n in names:
        if not CUT_RE.match(n):
            raise InputError(f"cut name {n!r} must match {CUT_RE.pattern} (it names build/cut-<cut>.json)")
    if not names:
        raise InputError("--cut is empty")
    return names


def parse_args(argv):
    p = argparse.ArgumentParser(
        prog="plan_cut.py", formatter_class=argparse.RawDescriptionHelpFormatter,
        description=__doc__,
        epilog="See references/timing-and-length.md for the model, the allocation rule and QA.")
    p.add_argument("--project", "-p", required=True, help="reel project folder P")
    p.add_argument("--cut", "-c", required=True, help="cut name, comma list (15,30,60) or 'all'")
    g = p.add_mutually_exclusive_group()
    g.add_argument("--seconds", type=float, help="target length in seconds (rounded to whole bars)")
    g.add_argument("--bars", type=int, help="target length in bars")
    p.add_argument("--round", choices=("nearest", "down", "up"),
                   help="seconds -> bars rounding (default nearest; a half rounds down)")
    p.add_argument("--fill", choices=("balanced", "holdsFirst"), help="spare-bar policy (default balanced)")
    v = p.add_mutually_exclusive_group()
    v.add_argument("--vo", metavar="VO_MINBARS_JSON",
                   help="narration minimums (default: build/vo-minbars-<cut>.json, else vo-minbars.json, when present)")
    v.add_argument("--no-vo", action="store_true", help="ignore narration minimums and captions")
    p.add_argument("--only", help="comma list of scene ids; everything else is left out (QA)")
    p.add_argument("--pin", action="append", default=[], metavar="ID=BARS", help="force a scene length (repeatable)")
    p.add_argument("--grow", action="store_true", help="extend the cut when the minimums exceed the target")
    p.add_argument("--strict", action="store_true", help="warnings are errors (exit 3, nothing written)")
    p.add_argument("--out", help="output path (single cut; default P/build/cut-<cut>.json)")
    p.add_argument("--no-write", action="store_true", help="plan and print only")
    p.add_argument("--json", action="store_true", help="print the plan JSON on stdout (single cut)")
    p.add_argument("--times", choices=("boundaries", "holds", "cues", "all"),
                   help="print frame times for stills.mjs on stdout (single cut)")
    p.add_argument("--quiet", "-q", action="store_true", help="no table")
    p.add_argument("--verbose", "-v", action="store_true", help="also print the allocation steps")
    return p.parse_args(argv)


def main(argv=None) -> int:
    args = parse_args(argv)
    try:
        project = Path(args.project)
        if not project.is_dir():
            raise InputError(f"project folder not found: {args.project}")
        cfg = read_json(project / "reel.config.json", "reel.config.json")
        if not isinstance(cfg, dict):
            raise InputError("reel.config.json must be a JSON object")
        cuts = expand_cuts(args.cut, cfg)
        single = (args.seconds is not None or args.bars is not None or args.out or args.json or args.times)
        if len(cuts) > 1 and single:
            raise InputError("--seconds, --bars, --out, --json and --times take a single --cut")
        rc = 0
        for cut in cuts:
            log = Log()
            try:
                plan = plan_cut(project, cfg, cut, args, log)
            except Infeasible as e:
                print(f"plan_cut: {e}", file=sys.stderr)
                rc = max(rc, 2)
                continue
            problems = qa(plan)
            if problems:
                print("plan_cut: internal QA failed:\n  " + "\n  ".join(problems), file=sys.stderr)
                return 4
            human = sys.stderr if (args.json or args.times) else sys.stdout
            if args.strict and log.warnings:
                if not args.quiet:
                    print_table(plan, log, None, args.verbose, human)
                print(f"plan_cut: --strict: {len(log.warnings)} warning(s); cut {cut} not written", file=sys.stderr)
                rc = max(rc, 3)
                continue
            path_txt = None
            if not args.no_write:
                path = Path(args.out) if args.out else project / "build" / f"cut-{cut}.json"
                path.parent.mkdir(parents=True, exist_ok=True)
                with open(path, "w", encoding="utf-8") as f:
                    json.dump(plan, f, ensure_ascii=False, indent=2)
                    f.write("\n")
                path_txt = rel(path, project) if not args.out else args.out
            if not args.quiet:
                print_table(plan, log, path_txt, args.verbose, human)
            elif log.warnings:
                for w in log.warnings:
                    print(f"WARN   {w}", file=sys.stderr)
            if args.json:
                print(json.dumps(plan, ensure_ascii=False, indent=2))
            if args.times:
                print(" ".join(f"{t:.5f}".rstrip("0").rstrip(".") if t else "0" for t in frame_times(plan, args.times)))
        return rc
    except InputError as e:
        print(f"plan_cut: error: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
