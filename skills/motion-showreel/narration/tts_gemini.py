#!/usr/bin/env python3
"""Gemini TTS narration for motion-showreel projects: batch synthesis, STT verification, cache, audit, auditions.

Subcommands
  batch   --project P [--only KEY|SCENE,...] [--force] [--batch 8] [--jobs 2] [--tries 3] [--no-verify] [--keep-failed]
          synthesize every narration.json line that has no good clip yet -> cache, build/vo/<key>.wav, build/vo/manifest.json
  synth   --text TEXT --out FILE.wav [--voice V] [--style TAG] [--lang L] [--project P] [--no-verify]
  verify  --wav FILE --text TEXT [--wav FILE --text TEXT ...] [--lang L]    transcribe given clips in one call, compare
  audit   --project P [--fix [--force]]   re-verify every cached line clip (12 lines per call); --fix deletes the bad
          ones, but refuses when most clips fail (usually an STT problem) unless --force
  sample  --out DIR [--project P] [--voices A,B] [--styles "[a]|[b]"] [--text TEXT]   voice/style auditions
  selftest                         offline checks (RIFF parsing, retry delays, key line parsing, splitting, comparison)
Common: --dry-run (placeholder clips sized by the text estimate, simulated transcripts; no network, no key),
        --env-file FILE (reads only its GEMINI_API_KEY= line), --model, --stt-model, --cache, --rpm,
        --api-base URL (or env GEMINI_API_BASE; e.g. a local mock server in tests; the key only ever goes to Google's
        https endpoint or a loopback host unless --allow-custom-api-base).

How a batch works: up to 8 lines that share voice/style/model go into ONE request, joined with " [long pause] " and
preceded by a throw-away lead sentence (the model sometimes reads the style tag aloud or ad-libs before the first
sentence; that lands in the lead and is discarded). The audio is cut at the longest pauses, every piece is trimmed,
and all pieces (plus their short head/tail fragments, where leaks hide) are transcribed in ONE gemini-3.8-flash call
(JSON schema, matched by clip number). A piece passes when it matches its own line better than its neighbours, has
no style-tag words, no lead sentence, and no extra or missing words. Failures retry, then the batch is halved,
down to single lines. The key is sent only in the x-goog-api-key header and is never printed or written.
"""
from __future__ import annotations

import argparse
import base64
import concurrent.futures as cf
import datetime as dt
import difflib
import hashlib
import http.client
import io
import json
import os
import re
import shutil
import ssl
import sys
import tempfile
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
import wave
from pathlib import Path

import numpy as np
from scipy.signal import lfilter, resample_poly

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.dont_write_bytecode = True   # keep the skill folder free of __pycache__
import vo_timeline as V  # noqa: E402

API_BASE = "https://generativelanguage.googleapis.com/v1beta"
TTS_MODEL = V.DEFAULT_MODEL
STT_MODEL = "gemini-3.8-flash"
SR = V.SR
SEP = " [long pause] "
LEAD = {"ko": "자, 시작합니다.", "en": "Here we go.", "ja": "では、始めます。", "zh": "好，我们开始。", "es": "Vamos allá.",
        "fr": "C'est parti.", "de": "Los geht's.", "pt": "Vamos lá.", "it": "Si comincia."}
LANG_NAME = {"ko": "Korean", "en": "English", "ja": "Japanese", "zh": "Chinese", "es": "Spanish", "fr": "French",
             "de": "German", "pt": "Portuguese", "it": "Italian"}
RETRY = {408, 429, 500, 502, 503, 504}
DAILY = re.compile(r"per ?day|PerDay|daily", re.I)
# Prebuilt Gemini TTS voices and their documented character (confirm availability with `sample`).
VOICES = {"Zephyr": "bright", "Puck": "upbeat", "Charon": "informative", "Kore": "firm", "Fenrir": "excitable",
          "Leda": "youthful", "Orus": "firm", "Aoede": "breezy", "Callirrhoe": "easy-going", "Autonoe": "bright",
          "Enceladus": "breathy", "Iapetus": "clear", "Umbriel": "easy-going", "Algieba": "smooth", "Despina": "smooth",
          "Erinome": "clear", "Algenib": "gravelly", "Rasalgethi": "informative", "Laomedeia": "upbeat", "Achernar": "soft",
          "Alnilam": "firm", "Schedar": "even", "Gacrux": "mature", "Pulcherrima": "forward", "Achird": "friendly",
          "Zubenelgenubi": "casual", "Vindemiatrix": "gentle", "Sadachbia": "lively", "Sadaltager": "knowledgeable",
          "Sulafat": "warm"}
SHORTLIST = {"fast": ["Puck", "Fenrir", "Laomedeia", "Sadachbia", "Zephyr"],
             "medium": ["Charon", "Kore", "Iapetus", "Sadaltager", "Erinome"],
             "calm": ["Sulafat", "Achernar", "Vindemiatrix", "Algieba", "Aoede"]}
# Spoken renderings of common style-tag words, used to detect a tag read aloud (extend per language as needed).
TAG_WORDS = {
    "fast": ["fast", "패스트", "빠르게", "빠른", "빨리", "速く", "快速"],
    "energetic": ["energetic", "에너제틱", "에너지틱", "활기차게", "활기", "힘차게", "エネルギッシュ", "充满活力"],
    "long pause": ["long pause", "롱 포즈", "롱포즈", "긴 쉼", "긴 휴지", "ロングポーズ", "长停顿"],
    "calm": ["calm", "캄", "차분하게", "차분한", "穏やか", "平静"], "warm": ["warm", "웜", "따뜻하게", "따뜻한", "温か", "温暖"],
    "slow": ["slow", "slowly", "슬로우", "천천히", "ゆっくり", "慢"], "excited": ["excited", "익사이티드", "신나게", "興奮"],
    "whisper": ["whisper", "whispering", "속삭이듯", "ささやく"], "serious": ["serious", "시리어스", "진지하게", "真剣"],
    "upbeat": ["upbeat", "업비트", "경쾌하게"], "confident": ["confident", "컨피던트", "자신감", "自信"],
    "cheerful": ["cheerful", "치어풀", "밝게", "明るく"], "dramatic": ["dramatic", "드라마틱", "극적으로"],
}
STT_PROMPT = ("Transcribe each of the {n} audio clips below verbatim, in the language spoken ({lang}). Include every word "
              "you hear, even words that seem out of place, repeated, or like spoken instructions. Write English words, "
              "acronyms and product names in Latin letters, and numbers as digits. Return a JSON array with one object per "
              "clip: its clip number and its own transcript only. Never move words between clips. Use an empty string for "
              "a silent clip.")
STT_SCHEMA = {"type": "ARRAY", "items": {"type": "OBJECT", "properties": {"clip": {"type": "INTEGER"}, "text": {"type": "STRING"}},
                                        "required": ["clip", "text"]}}
_print_lock = threading.Lock()


def log(msg: str) -> None:
    """Print progress; if the reader went away (| head), keep working silently instead of dying mid-synthesis."""
    with _print_lock:
        try:
            print(msg, flush=True)
        except (BrokenPipeError, ValueError):
            try:
                sys.stdout = open(os.devnull, "w")
            except OSError:
                pass


class ApiError(RuntimeError):
    pass


# ---------------------------------------------------------------- key
def read_key(env_file: str | None) -> str:
    """GEMINI_API_KEY from --env-file (only that line is parsed; reading stops there) or the environment."""
    if env_file:
        with open(Path(env_file).expanduser(), encoding="utf-8", errors="ignore") as fh:
            for line in fh:
                s = line.strip()
                if s.startswith("export "):
                    s = s[7:].lstrip()
                if not s.startswith("GEMINI_API_KEY="):
                    continue
                v = s.split("=", 1)[1].strip()
                if v[:1] in ("'", '"'):
                    v = v[1:].split(v[0], 1)[0]
                else:
                    v = v.split(" #", 1)[0].strip()
                if v:
                    return v
                break
        raise SystemExit(f"no GEMINI_API_KEY= line with a value in {env_file}")
    v = os.environ.get("GEMINI_API_KEY", "").strip()
    if v:
        return v
    raise SystemExit("GEMINI_API_KEY is not set: export it, or pass --env-file FILE (only its GEMINI_API_KEY= line is read)")


def retry_delay(body: str, header: str | None = None) -> float | None:
    """Seconds the server asks us to wait (RetryInfo.retryDelay "17s" / "1.5s", or a Retry-After header)."""
    m = re.search(r'"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"', body or "")
    if m:
        return float(m.group(1))
    if header and re.fullmatch(r"\s*\d+(?:\.\d+)?\s*", header):
        return float(header)
    return None


# ---------------------------------------------------------------- audio helpers
def wav_bytes(pcm: np.ndarray, sr: int = SR) -> bytes:
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(np.asarray(pcm, dtype="<i2").tobytes())
    return buf.getvalue()


def write_wav(path: Path, pcm: np.ndarray, sr: int = SR) -> None:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    tmp.write_bytes(wav_bytes(pcm, sr))
    tmp.replace(path)


def read_wav(path: Path) -> np.ndarray:
    """16-bit WAV -> int16 mono at SR."""
    with wave.open(str(path)) as w:
        sr, ch, sw = w.getframerate(), w.getnchannels(), w.getsampwidth()
        raw = w.readframes(w.getnframes())
    if sw != 2:
        raise SystemExit(f"{path}: expected 16-bit PCM")
    a = np.frombuffer(raw, dtype="<i2")
    if ch > 1:
        a = a.reshape(-1, ch).mean(axis=1).astype(np.int16)
    return to_sr(a, sr)


def to_sr(a: np.ndarray, sr: int, target: int = SR) -> np.ndarray:
    if sr == target:
        return np.asarray(a, dtype=np.int16)
    g = np.gcd(sr, target)
    y = resample_poly(np.asarray(a, dtype=np.float64), target // g, sr // g)
    return np.clip(np.round(y), -32768, 32767).astype(np.int16)


def decode_audio(raw: bytes, mime: str = "") -> np.ndarray:
    """TTS payload -> int16 mono at SR. The model returns a WAV file (RIFF header + data + trailing C2PA provenance
    metadata): only the data chunk is audio; playing the header or metadata as samples gives ticks at sentence edges.
    Raw PCM payloads (audio/L16;rate=...) are also accepted."""
    if raw[:4] == b"RIFF" and raw[8:12] == b"WAVE":
        fmt, data, i = None, None, 12
        while i + 8 <= len(raw):
            cid, n = raw[i:i + 4], int.from_bytes(raw[i + 4:i + 8], "little")
            body = raw[i + 8:i + 8 + n]
            if cid == b"fmt ":
                tag, ch, sr = int.from_bytes(body[0:2], "little"), int.from_bytes(body[2:4], "little"), int.from_bytes(body[4:8], "little")
                bits = int.from_bytes(body[14:16], "little")
                if tag == 0xFFFE and len(body) >= 26:
                    tag = int.from_bytes(body[24:26], "little")
                fmt = (tag, ch, sr, bits)
            elif cid == b"data":
                data = body
                break
            i += 8 + n + (n & 1)
        if data is None:
            raise ApiError("WAV response has no data chunk")
        tag, ch, sr, bits = fmt or (1, 1, SR, 16)
        if tag == 3 and bits == 32:
            a = np.frombuffer(data[: len(data) // 4 * 4], dtype="<f4").astype(np.float64) * 32767
        elif bits == 16:
            a = np.frombuffer(data[: len(data) // 2 * 2], dtype="<i2").astype(np.float64)
        elif bits == 24:
            b = np.frombuffer(data[: len(data) // 3 * 3], dtype=np.uint8).reshape(-1, 3).astype(np.int32)
            v = b[:, 0] | (b[:, 1] << 8) | (b[:, 2] << 16)
            a = (np.where(v >= 1 << 23, v - (1 << 24), v) / 256.0).astype(np.float64)
        elif bits == 32:
            a = np.frombuffer(data[: len(data) // 4 * 4], dtype="<i4").astype(np.float64) / 65536.0
        else:
            raise ApiError(f"unsupported WAV format (tag {tag}, {bits} bits)")
        if ch > 1:
            a = a[: len(a) // ch * ch].reshape(-1, ch).mean(axis=1)
        return to_sr(np.clip(np.round(a), -32768, 32767).astype(np.int16), sr)
    m = re.search(r"rate=(\d+)", mime or "")
    a = np.frombuffer(raw[: len(raw) // 2 * 2], dtype="<i2")
    return to_sr(a, int(m.group(1)) if m else SR)


def trim(a: np.ndarray, pre: float = 0.04, post: float = 0.12) -> np.ndarray:
    """Cut leading/trailing silence, keeping pre/post seconds (mix_vo.py fades the edges)."""
    a = np.asarray(a, dtype=np.int16)
    if not len(a):
        return a
    peak = int(np.abs(a.astype(np.int32)).max())
    th = max(60, min(300, int(0.012 * peak)))
    idx = np.nonzero(np.abs(a.astype(np.int32)) > th)[0]
    if not len(idx):
        return a
    # islands of sound separated by >= 0.2 s; tiny ones (< 60 ms: clicks, breath onsets) at either edge are dropped
    br = np.nonzero(np.diff(idx) > int(0.2 * SR))[0]
    isl = list(zip(idx[np.concatenate([[0], br + 1])], idx[np.concatenate([br, [len(idx) - 1]])]))
    while len(isl) > 1 and isl[0][1] - isl[0][0] < 0.06 * SR:
        isl.pop(0)
    while len(isl) > 1 and isl[-1][1] - isl[-1][0] < 0.06 * SR:
        isl.pop()
    return a[max(0, isl[0][0] - int(pre * SR)):min(len(a), isl[-1][1] + int(post * SR))]


def _quiet_runs(a: np.ndarray, hop: int, th: float, min_frames: int = 1, bridge: int = 3) -> list[tuple[int, int]]:
    """Internal runs of quiet frames as (start_frame, end_frame); runs touching either end are ignored. Blips of at
    most `bridge` frames between quiet frames (a click, a breath onset) do not break a pause in two."""
    n = len(a) // hop
    if n < 3:
        return []
    env = np.abs(a[: n * hop].astype(np.int32)).reshape(n, hop).max(axis=1)
    q = env < th
    i = 0
    while bridge and i < n:
        if not q[i]:
            j = i
            while j < n and not q[j]:
                j += 1
            if i > 0 and j < n and j - i <= bridge:
                q[i:j] = True
            i = j
        else:
            i += 1
    runs, i = [], 0
    while i < n:
        if q[i]:
            j = i
            while j < n and q[j]:
                j += 1
            if i > 0 and j < n and j - i >= min_frames:
                runs.append((i, j))
            i = j
        else:
            i += 1
    return runs


def batch_split(a: np.ndarray, nseg: int) -> tuple[list[np.ndarray] | None, dict]:
    """Cut audio of nseg sentences at its nseg-1 longest pauses. Pauses must be >= 0.35 s; 'clear' when the shortest
    chosen pause is >= 1.5x the longest pause left inside sentences."""
    a = np.asarray(a, dtype=np.int16)
    if nseg == 1:
        return [trim(a)], {"clear": True, "gaps": []}
    hop = int(0.01 * SR)
    n = len(a) // hop
    if n < 10:
        return None, {"why": "audio too short"}
    env = np.abs(a[: n * hop].astype(np.int32)).reshape(n, hop).max(axis=1)
    th = max(120.0, min(400.0, 0.02 * float(np.percentile(env, 99))))
    runs = _quiet_runs(a, hop, th)
    if len(runs) < nseg - 1:
        return None, {"why": f"found {len(runs)} pauses for {nseg - 1} cuts"}
    runs.sort(key=lambda r: r[1] - r[0], reverse=True)
    chosen, rest = runs[: nseg - 1], runs[nseg - 1:]
    short = (chosen[-1][1] - chosen[-1][0]) * hop / SR
    if short < 0.35:
        return None, {"why": f"shortest sentence pause {short:.2f} s < 0.35 s"}
    clear = not rest or (chosen[-1][1] - chosen[-1][0]) >= 1.5 * (rest[0][1] - rest[0][0])
    cuts = sorted((s + e) // 2 * hop for s, e in chosen)
    bounds = [0] + cuts + [len(a)]
    segs = [trim(a[bounds[k]:bounds[k + 1]]) for k in range(nseg)]
    return segs, {"clear": clear, "gaps": sorted(round((e - s) * hop / SR, 2) for s, e in chosen),
                  "inner": round((rest[0][1] - rest[0][0]) * hop / SR, 2) if rest else 0.0}


def edges(a: np.ndarray, gap: float = 0.25, most: float = 2.0) -> tuple[np.ndarray | None, np.ndarray | None]:
    """Short head/tail fragments (before the first / after the last internal pause >= gap s, if <= most s).
    Transcribing a whole sentence tends to drop a leaked 'Fast. Energetic.' at its start, so fragments are checked too."""
    x = np.asarray(a, dtype=np.float64)
    hop = int(0.01 * SR)
    if len(x) < hop * 20:
        return None, None
    n = len(x) // hop
    e = np.sqrt(np.mean(x[: n * hop].reshape(n, hop) ** 2, axis=1))
    q = e < 0.02 * (e.max() or 1.0)
    runs, i = [], 0
    while i < n:
        if q[i]:
            j = i
            while j < n and q[j]:
                j += 1
            if i > 0 and j < n and (j - i) * hop / SR >= gap:
                runs.append((i * hop, j * hop))
            i = j
        else:
            i += 1
    if not runs:
        return None, None
    head = a[: runs[0][0]] if runs[0][0] / SR <= most else None
    tail = a[runs[-1][1]:] if (len(a) - runs[-1][1]) / SR <= most else None
    return head, tail


# ---------------------------------------------------------------- placeholder audio (dry run)
def placeholder(text: str, lang: str, style: str = "", voice: str = "") -> np.ndarray:
    """Speech-like placeholder sized by vo_timeline.estimate(): buzz through two moving formants, syllable envelopes,
    pauses at punctuation. Deterministic per voice and text. It sounds like murmuring, never like words."""
    rng = np.random.default_rng(int(hashlib.sha1(f"{voice}|{text}".encode("utf-8")).hexdigest()[:8], 16))
    body = V.TAG.sub(" ", text).strip() or "."
    pace = V.pace_of(style)
    pc, ps = V.PAUSE[pace]
    chunks = [c for c in re.split(r"(?<=[,;:.!?、。，！？])\s+|(?<=[、。，！？])", body) if c.strip()] or [body]
    ws = [max(0.6, V.analyze(c, lang)["dsyl"]) for c in chunks]
    pauses = [(ps if re.search(r"[.!?。！？]$", c.strip()) else pc) for c in chunks[:-1]]
    speech = max(0.25, V.estimate(text, lang, style) - V.MARGIN - sum(pauses))
    f0 = 95.0 + (int(hashlib.sha1(voice.encode()).hexdigest()[:4], 16) % 120)
    out = [np.zeros(int(0.04 * SR))]
    for k, w in enumerate(ws):
        d = speech * w / sum(ws)
        nsyl = max(1, int(round(w)))
        n = int(d * SR)
        t = np.arange(n) / SR
        pitch = f0 * (1.12 - 0.18 * t / max(d, 1e-3)) * (1 + 0.03 * np.sin(2 * np.pi * 3.1 * t))
        phase = np.cumsum(pitch / SR)
        src = 2.0 * (phase % 1.0) - 1.0
        src = src + 0.15 * rng.standard_normal(n)
        sl = n / nsyl
        pos = (np.arange(n) % sl) / sl
        envl = np.sin(np.pi * np.clip(pos * 1.15, 0, 1)) ** 1.5 * (0.75 + 0.25 * rng.random(nsyl).repeat(int(np.ceil(sl)))[:n])
        y = np.zeros(n)
        for f_lo, f_hi, bw in ((450, 850, 110), (1100, 2300, 160)):
            fc = f_lo + (f_hi - f_lo) * rng.random()
            r = np.exp(-np.pi * bw / SR)
            th = 2 * np.pi * fc / SR
            y += lfilter([1 - r], [1, -2 * r * np.cos(th), r * r], src)
        out.append(y * envl)
        if k < len(chunks) - 1:
            out.append(np.zeros(int(pauses[k] * SR)))
    out.append(np.zeros(int(0.12 * SR)))
    y = np.concatenate(out)
    y = y / (np.abs(y).max() or 1.0) * 0.6 * 32767
    return y.astype(np.int16)


def placeholder_prompt(prompt: str, lang: str, voice: str) -> np.ndarray:
    """Dry-run stand-in for one TTS response: one placeholder per '[long pause]'-separated sentence, 0.75-0.9 s apart."""
    m = re.match(r"^\s*((?:\[[^\]]*\]\s*)+)", prompt)
    style = m.group(1).strip() if m else ""
    body = prompt[m.end():] if m else prompt
    parts = [p.strip() for p in re.split(r"\[\s*long pause\s*\]", body, flags=re.I) if p.strip()]
    rng = np.random.default_rng(len(prompt))
    out = [np.zeros(int(0.15 * SR), np.int16)]
    for k, p in enumerate(parts):
        out.append(placeholder(p, lang, style, voice))
        if k < len(parts) - 1:
            out.append(np.zeros(int((0.75 + 0.15 * rng.random()) * SR), np.int16))
    out.append(np.zeros(int(0.3 * SR), np.int16))
    return np.concatenate(out)


# ---------------------------------------------------------------- comparison
NUMBER = re.compile(r"\d+(?:,\d{3})*(?:\.\d+)?")
KEEP = re.compile(r"[^0-9a-z぀-ヿ㐀-䶿一-鿿가-힣]")


def norm(s: str, fam: str, fold=()) -> str:
    """Comparable form: lowercase, folds applied, numbers read out (4,600 = 4600 = 사천육백), punctuation and spaces dropped."""
    s = V.TAG.sub(" ", s or "").lower().replace("’", "'")
    for a, b in fold:
        s = s.replace(a.lower(), b.lower())
    if fam == "ko":
        s = NUMBER.sub(lambda m: V.ko_num_read(m.group(0)), s).replace("%", "퍼센트")
    elif fam == "en":
        s = NUMBER.sub(lambda m: "".join(V.en_num_words(m.group(0))), s).replace("%", "percent").replace("&", "and")
    return KEEP.sub("", s)


def sim(a: str, b: str) -> float:
    return difflib.SequenceMatcher(None, a, b, autojunk=False).ratio() if a and b else 0.0


def leak_words(style: str) -> list[str]:
    """Words that must not be heard: the style tag's words, '[long pause]', and their spoken renderings."""
    inner = " , ".join(re.findall(r"\[([^\]]*)\]", style or "")).lower()
    words = {w.strip() for w in re.split(r"[,/;]|\band\b", inner) if w.strip()}
    out = set(words) | {"long pause"}
    for w in list(words) + ["long pause"]:
        for k, alts in TAG_WORDS.items():
            if k in w or w in k:
                out |= {x.lower() for x in alts}
    return sorted(out, key=len, reverse=True)


def _count(word: str, s: str) -> int:
    s = s.lower()
    if re.search(r"[a-z]", word):
        return len(re.findall(r"(?<![a-z])" + re.escape(word).replace(r"\ ", r"\s*") + r"(?![a-z])", s))
    return s.replace(" ", "").count(word.replace(" ", ""))


def speech_problem(got: str, line: dict, near: list[dict], lang: str, head: str | None = None, tail: str | None = None,
                   leaks: list[str] | None = None, fold=(), lead: str | None = None) -> str | None:
    """One-line problem description for a clip transcript, or None when it reads its line exactly."""
    fam = V.lang_family(lang)
    g = norm(got, fam, fold)
    if not g:
        return "no speech transcribed"
    refs = [r for r in {norm(line["text"], fam, fold), norm(line["say"], fam, fold)} if r]
    t, own = max(((r, sim(g, r)) for r in refs), key=lambda x: x[1])
    nb = max([sim(g, norm(x["text"], fam, fold)) for x in near] or [0.0])
    if own < 0.35 or own + 0.02 < nb:
        return f"wrong sentence (match {own:.2f}, neighbour {nb:.2f})"
    expected = f"{line['text']} {line['say']}"
    for piece in (got, head, tail):
        for w in leaks or []:
            if piece and _count(w, piece) > _count(w, expected):
                return f"style tag read aloud ('{w}' in '{piece.strip()[:50]}')"
    if lead:
        ln_ = norm(lead, fam)
        if ln_ and ln_ in g and ln_ not in t:
            return "lead sentence leaked into this clip"
    for piece, pos in ((head, "start"), (tail, "end")):
        pn = norm(piece or "", fam, fold)
        if len(pn) >= 2:
            ref = t[: len(pn) + 4] if pos == "start" else t[-(len(pn) + 4):]
            if sim(pn, ref) < 0.4:
                return f"extra words at the {pos} ('{(piece or '').strip()[:50]}')"
    ex_edge, ex_mid, mi_edge, mi_mid = (8, 14, 6, 10) if fam == "en" else (5, 8, 4, 7)
    for op, i1, i2, j1, j2 in difflib.SequenceMatcher(None, t, g, autojunk=False).get_opcodes():
        extra = (j2 - j1) - (i2 - i1 if op == "replace" else 0)
        miss = (i2 - i1) - (j2 - j1 if op == "replace" else 0)
        if op in ("insert", "replace") and extra >= (ex_edge if j1 == 0 or j2 == len(g) else ex_mid):
            return f"extra words ('{g[j1:j2]}')"
        if op in ("delete", "replace") and miss >= (mi_edge if i1 == 0 or i2 == len(t) else mi_mid):
            return f"missing words ('{t[i1:i2]}')"
    return None


# ---------------------------------------------------------------- API
def calls_note(api, only: str | None = None) -> str:
    """'TTS calls 2 · STT calls 1', or for a dry run the calls a real run would make, marked as simulated."""
    kinds = [only] if only else ["tts", "stt"]
    body = " · ".join(f"{k.upper()} calls {api.calls[k]}" for k in kinds)
    return f"{body} (simulated: dry run, no network, nothing billed)" if api.dry else body


def safe_api_base(base: str, allow_custom: bool, dry: bool) -> str:
    """The key goes only to Google's endpoint over https, or to a loopback mock (tests). Any other host needs
    --allow-custom-api-base, and plain http is refused for every non-loopback host."""
    base = base.rstrip("/")
    u = urllib.parse.urlparse(base)
    host = (u.hostname or "").lower()
    loopback = host in ("localhost", "127.0.0.1", "::1")
    if dry or loopback:
        return base
    if u.scheme != "https":
        raise SystemExit(f"refusing to send the API key over {u.scheme or 'an unknown scheme'} to {host or base}: use https "
                         "(plain http is allowed only for a loopback mock)")
    if host != urllib.parse.urlparse(API_BASE).hostname and not allow_custom:
        raise SystemExit(f"refusing to send the API key to {host} (from --api-base / GEMINI_API_BASE): only "
                         f"{urllib.parse.urlparse(API_BASE).hostname} or a loopback mock receive it. Pass "
                         "--allow-custom-api-base if this endpoint is yours")
    return base


class Api:
    def __init__(self, o):
        self.o = o
        self.dry = o.dry_run
        self.base = safe_api_base(o.api_base or os.environ.get("GEMINI_API_BASE") or API_BASE,
                                  getattr(o, "allow_custom_api_base", False), self.dry)
        self._key = None
        self._lock = threading.Lock()
        self._last = 0.0
        self.calls = {"tts": 0, "stt": 0}
        self.tokens = {"tts": 0, "stt": 0}
        self.faults = parse_faults(os.environ.get("MSR_TTS_FAULTS", "")) if self.dry else {}

    def key(self) -> str:
        if self._key is None:
            self._key = read_key(self.o.env_file)
        return self._key

    def _pace(self) -> None:
        if self.o.rpm and self.o.rpm > 0:
            with self._lock:
                wait = self._last + 60.0 / self.o.rpm - time.monotonic()
                if wait > 0:
                    time.sleep(wait)
                self._last = time.monotonic()

    def post(self, model: str, body: dict, what: str, timeout: float) -> dict:
        url = f"{self.base}/models/{model}:generateContent"
        ctx = None
        if url.startswith("https"):
            try:
                import certifi  # noqa: PLC0415
                ctx = ssl.create_default_context(cafile=certifi.where())
            except ImportError:
                ctx = ssl.create_default_context()
        data = json.dumps(body).encode("utf-8")
        tries = max(1, int(self.o.retries))
        for i in range(tries):
            self._pace()
            req = urllib.request.Request(url, data=data, method="POST",
                                         headers={"Content-Type": "application/json", "x-goog-api-key": self.key()})
            try:
                with urllib.request.urlopen(req, timeout=timeout, context=ctx) as r:
                    return json.load(r)
            except urllib.error.HTTPError as e:
                raw = e.read().decode("utf-8", "ignore")
                if e.code == 429 and DAILY.search(raw):
                    raise ApiError(f"{what}: daily quota exhausted (HTTP 429); wait for the reset or use a higher tier") from None
                if e.code in RETRY and i + 1 < tries:
                    d = retry_delay(raw, e.headers.get("Retry-After") if e.headers else None)
                    wait = d + 2.0 if d is not None else min(60.0, 8.0 * (i + 1))
                    log(f"  · {what}: HTTP {e.code}, retry {i + 1}/{tries - 1} in {wait:.0f} s")
                    time.sleep(wait)
                    continue
                msg = re.sub(r"\s+", " ", raw)[:240]
                raise ApiError(f"{what}: HTTP {e.code} {msg}") from None
            except (urllib.error.URLError, TimeoutError, ConnectionError, http.client.HTTPException, json.JSONDecodeError) as e:
                if i + 1 < tries:
                    wait = min(60.0, 4.0 * (i + 1))
                    log(f"  · {what}: {type(e).__name__}, retry {i + 1}/{tries - 1} in {wait:.0f} s")
                    time.sleep(wait)
                    continue
                raise ApiError(f"{what}: {type(e).__name__}: {str(e)[:160]}") from None
        raise ApiError(f"{what}: retries exhausted")

    def tts(self, prompt: str, voice: str, model: str, lang: str) -> np.ndarray:
        if self.dry:
            with self._lock:
                self.calls["tts"] += 1
            return placeholder_prompt(prompt, lang, voice)
        body = {"contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"responseModalities": ["AUDIO"],
                                     "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": voice}}}}}
        reason = "?"
        for _ in range(3):
            d = self.post(model, body, f"TTS {voice}", 240)
            with self._lock:
                self.calls["tts"] += 1
                self.tokens["tts"] += int((d.get("usageMetadata") or {}).get("totalTokenCount") or 0)
            cand = (d.get("candidates") or [{}])[0]
            reason = cand.get("finishReason") or (d.get("promptFeedback") or {}).get("blockReason") or "no candidates"
            chunks = []
            for p in (cand.get("content") or {}).get("parts") or []:
                inl = p.get("inlineData") or p.get("inline_data")
                if inl and inl.get("data"):
                    chunks.append(decode_audio(base64.b64decode(inl["data"]), inl.get("mimeType") or inl.get("mime_type") or ""))
            if chunks and sum(len(c) for c in chunks) > 0.2 * SR:
                return np.concatenate(chunks)
            log(f"  · TTS {voice}: response without audio ({reason}); asking again")
        raise ApiError(f"TTS {voice}: no audio in the response ({reason})")

    def stt(self, pieces: list[np.ndarray], lang: str) -> list[str]:
        n = len(pieces)
        base = re.split(r"[-_]", (lang or "en").lower())[0]
        parts: list[dict] = [{"text": STT_PROMPT.format(n=n, lang=LANG_NAME.get(base, lang))}]
        for k, a in enumerate(pieces, 1):
            a16 = to_sr(a, SR, 16000)
            parts += [{"text": f"Clip {k}:"}, {"inlineData": {"mimeType": "audio/wav", "data": base64.b64encode(wav_bytes(a16, 16000)).decode()}}]
        body = {"contents": [{"parts": parts}],
                "generationConfig": {"responseMimeType": "application/json", "responseSchema": STT_SCHEMA, "temperature": 0}}
        why = ""
        for i in range(6):
            d = self.post(self.o.stt_model, body, "STT", 300)
            with self._lock:
                self.calls["stt"] += 1
                self.tokens["stt"] += int((d.get("usageMetadata") or {}).get("totalTokenCount") or 0)
            try:
                txt = "".join(p.get("text", "") for p in d["candidates"][0]["content"]["parts"])
                arr = json.loads(txt)
                out = {int(x["clip"]): str(x.get("text") or "") for x in arr}
                if set(out) != set(range(1, n + 1)):   # match by clip NUMBER, never by order
                    why = f"clip numbers {sorted(out)[:12]} for {n} clips"
                elif n >= 2 and not any(v.strip() for v in out.values()):
                    why = "empty transcript for every clip"   # a broken reply, not silent clips
                else:
                    return [out[k] for k in range(1, n + 1)]
            except (KeyError, IndexError, ValueError, TypeError) as e:
                why = f"unusable reply ({type(e).__name__})"
            if i < 5:
                log(f"  · STT: {why}; asking again ({i + 1}/5)")
                time.sleep(3.0 * (i + 1))
        raise ApiError(f"STT: {why} after 6 replies")


def parse_faults(spec: str) -> dict:
    """Dry-run fault injection for testing: 'leak:hook.0,missing:demo.1*2' (kind:key[*failing attempts])."""
    out = {}
    for item in filter(None, (x.strip() for x in spec.split(","))):
        kind, _, rest = item.partition(":")
        key, _, n = rest.partition("*")
        out[key] = [kind, int(n or 1)]
    return out


def simulate(api: Api, lines: list[dict], idx: list[tuple], npieces: int, style: str) -> list[str]:
    """Dry-run transcripts: each piece reads its own line (heads/tails: first/last sentence), unless a fault is injected."""
    got = [""] * npieces
    leak = (re.findall(r"\[([^\]]*)\]", style or "") or ["fast, energetic"])[0]
    for k, ln in enumerate(lines):
        text = ln["text"]
        sents = [s for s in re.split(r"(?<=[.!?。！？])\s+", text) if s.strip()] or [text]
        full, head, tail = text, sents[0], sents[-1]
        f = api.faults.get(ln["key"])
        if f and f[1] > 0:
            with api._lock:
                f[1] -= 1
            kind = f[0]
            if kind == "leak":
                full, head = f"{leak}. {text}", f"{leak}. {sents[0]}"
            elif kind == "missing":
                ws = text.split()
                full = " ".join(ws[: max(1, int(len(ws) * 0.55))]) if len(ws) > 2 else text[: max(1, len(text) // 2)]
            elif kind == "swap":
                other = lines[k + 1] if k + 1 < len(lines) else (lines[k - 1] if k else None)
                full = other["text"] if other else "something else entirely"
            elif kind == "extra":
                full = text + (" 그리고 이것은 덧붙인 말입니다" if V.lang_family(ln.get("lang", "")) == "ko" or V.HANGUL.search(text) else " and here is something extra")
        got[k] = full
        if idx[k][0] is not None:
            got[idx[k][0]] = head
        if idx[k][1] is not None:
            got[idx[k][1]] = tail
    return got


# ---------------------------------------------------------------- pipeline
class Run:
    """Options + shared state for one command."""

    def __init__(self, a, proj: dict | None):
        self.a = a
        self.proj = proj
        self.api = Api(a)
        self.st = V.settings(proj) if proj else None
        self.lang = (a.lang or (self.st["lang"] if self.st else None) or "en")
        self.fold = []
        if proj:
            vf = (proj["narr"].get("verify") or {}).get("fold") or {}
            self.fold = list(vf.items()) if isinstance(vf, dict) else [tuple(x) for x in vf]
        self.cdir = V.cache_dir(proj, a.cache) if proj else (Path(a.cache) if getattr(a, "cache", None) else None)
        self.verify = not getattr(a, "no_verify", False)
        self.saved, self.failed = [], []

    def lead(self) -> str:
        return LEAD.get(re.split(r"[-_]", self.lang.lower())[0], LEAD["en"])

    def listen(self, segs: list[np.ndarray], lines: list[dict], neighbours: list[list[dict]] | None = None) -> list[tuple]:
        """Transcribe segments (+ head/tail fragments) in one call; [(problem|None, transcript)] per segment."""
        pieces, idx = list(segs), []
        for s in segs:
            h, t = edges(s)
            ih = it = None
            if h is not None:
                ih = len(pieces)
                pieces.append(h)
            if t is not None:
                it = len(pieces)
                pieces.append(t)
            idx.append((ih, it))
        style = lines[0]["style"] if lines else ""
        if self.api.dry:
            with self.api._lock:
                self.api.calls["stt"] += 1   # counted as the call a real run would make
            got = simulate(self.api, lines, idx, len(pieces), style)
        else:
            got = self.api.stt(pieces, self.lang)
        leaks = leak_words(style)
        out = []
        for k, ln in enumerate(lines):
            near = neighbours[k] if neighbours else [lines[j] for j in (k - 1, k + 1) if 0 <= j < len(lines)]
            pick = (lambda i: None if i is None else got[i])
            prob = speech_problem(got[k], ln, near, self.lang, pick(idx[k][0]), pick(idx[k][1]), leaks, self.fold, self.lead())
            out.append((prob if ln.get("verify", True) else None, got[k]))
        return out

    def save(self, ln: dict, pcm: np.ndarray, verified, transcript=None, problem=None, attempts: int = 1) -> None:
        p = V.cache_path(self.cdir, ln, dry=self.api.dry)
        write_wav(p, pcm)
        meta = {"key": ln["key"], "scene": ln["scene"], "text": ln["text"], "say": ln["say"], "voice": ln["voice"],
                "style": ln["style"], "model": ln["model"], "lang": self.lang, "dur": round(len(pcm) / SR, 3),
                "verified": verified, "problem": problem, "transcript": transcript, "attempts": attempts,
                "dryRun": self.api.dry, "created": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")}
        p.with_suffix(".json").write_text(json.dumps(meta, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
        (self.saved if verified is not False else self.failed).append(ln["key"])

    def check(self, segs: list[np.ndarray], lines: list[dict]) -> list[tuple]:
        if not self.verify:
            return [(None, None)] * len(lines)
        try:
            return self.listen(segs, lines)
        except ApiError as e:
            log(f"  ! verification unavailable ({e}); clips kept as unverified")
            return [("unverified", None)] * len(lines)

    def batch(self, lines: list[dict], depth: int = 0) -> None:
        """Synthesize lines sharing voice/style/model in one request; keep verified pieces, retry the rest, then halve."""
        tries = int(self.a.tries)
        attempt = 0
        while attempt < tries and len(lines) > 1:
            attempt += 1
            ln0 = lines[0]
            tag = f"batch of {len(lines)} [{lines[0]['key']} .. {lines[-1]['key']}]"
            pcm = self.api.tts(join_prompt(ln0["style"], [self.lead()] + [x["say"] for x in lines]), ln0["voice"], ln0["model"], self.lang)
            segs, info = batch_split(pcm, len(lines) + 1)
            if segs is None:
                log(f"  {tag}: cannot split ({info['why']}), attempt {attempt}/{tries}")
                continue
            segs = segs[1:]                                   # drop the throw-away lead sentence
            dur = np.array([len(s) / SR for s in segs])
            est = np.array([V.estimate(x["say"], self.lang, x["style"]) for x in lines])
            r = (dur / dur.sum()) / (est / est.sum())
            if r.min() < 0.45 or r.max() > 2.2:
                log(f"  {tag}: piece lengths off (ratio {r.min():.2f}..{r.max():.2f}), attempt {attempt}/{tries}")
                continue
            res = self.check(segs, lines)
            passed = [k for k, (p, _) in enumerate(res) if p in (None, "unverified")]
            # keep passing pieces when every piece passed, or when the cut points are unambiguous
            accept = len(passed) == len(lines) or (info["clear"] and bool(passed))
            if accept:
                for k in passed:
                    unv = res[k][0] == "unverified"
                    self.save(lines[k], segs[k], None if (unv or not self.verify or not lines[k]["verify"]) else True,
                              res[k][1], "unverified: STT failed" if unv else None, attempt)
            probs = [f"{lines[k]['key']}: {res[k][0]}" for k in range(len(lines)) if res[k][0] not in (None, "unverified")]
            log(f"  {tag}: kept {len(passed) if accept else 0}/{len(lines)} (attempt {attempt}/{tries}, sentence pauses "
                f"{info['gaps'][0]}-{info['gaps'][-1]} s, inner max {info['inner']} s)" + ("".join(f"\n    - {p}" for p in probs)))
            if accept:
                lines = [lines[k] for k in range(len(lines)) if k not in passed]
        if not lines:
            return
        if len(lines) == 1:
            self.single(lines[0])
            return
        h = len(lines) // 2
        log(f"  halving {len(lines)} lines")
        self.batch(lines[:h], depth + 1)
        self.batch(lines[h:], depth + 1)

    def single(self, ln: dict) -> None:
        """One line: lead sentence + line (or the line alone when it has its own pause tags); keep the best attempt."""
        tries = int(self.a.tries)
        best = None
        for attempt in range(1, tries + 1):
            own_pause = re.search(r"\[[^\]]*pause[^\]]*\]", ln["say"], re.I)
            texts = [ln["say"]] if own_pause else [self.lead(), ln["say"]]
            pcm = self.api.tts(join_prompt(ln["style"], texts), ln["voice"], ln["model"], self.lang)
            if own_pause:
                seg = trim(pcm)
            else:
                segs, info = batch_split(pcm, 2)
                if segs is None:
                    log(f"  {ln['key']}: cannot find the lead pause ({info['why']}), attempt {attempt}/{tries}")
                    continue
                seg = segs[1]
            prob, tr = self.check([seg], [ln])[0]
            if prob is None or prob == "unverified":
                unv = prob == "unverified"
                self.save(ln, seg, None if (unv or not self.verify or not ln["verify"]) else True, tr,
                          "unverified: STT failed" if unv else None, attempt)
                log(f"  {ln['key']}: ok (attempt {attempt})")
                return
            log(f"  {ln['key']}: {prob} (attempt {attempt}/{tries})")
            if best is None:
                best = (seg, prob, tr)
        if best is not None:
            self.save(ln, best[0], False, best[2], best[1], tries)
            log(f"  ! {ln['key']}: kept a clip that failed verification: {best[1]}")
        else:
            self.failed.append(ln["key"])
            log(f"  ! {ln['key']}: no usable clip")


def join_prompt(style: str, texts: list[str]) -> str:
    body = SEP.join(t.strip() for t in texts)
    return f"{style.strip()} {body}" if style and style.strip() else body


def clip_state(run: Run, ln: dict) -> tuple[Path | None, dict]:
    """Best existing clip for a line in this mode (real first; dry-run mode may fall back to placeholders)."""
    for dry in ((False, True) if run.api.dry else (False,)):
        p = V.cache_path(run.cdir, ln, dry=dry)
        if p.exists():
            meta = V.read_json(p.with_suffix(".json"), {}) if p.with_suffix(".json").exists() else {}
            return p, meta
    return None, {}


def write_manifest(run: Run, lines: list[dict]) -> Path:
    P = run.proj["P"]
    vo = P / "build" / "vo"
    vo.mkdir(parents=True, exist_ok=True)
    rows, keep = [], set()
    for ln in lines:
        p, meta = clip_state(run, ln)
        if ln.get("custom"):
            p, meta = (P / ln["custom"]).resolve(), {"verified": None}
        row = {k: ln[k] for k in ("key", "scene", "index", "text", "say", "voice", "style", "model", "sha")}
        if p and p.exists():
            name = re.sub(r"[^A-Za-z0-9._-]", "_", ln["key"]) + p.suffix
            if not ln.get("custom"):
                shutil.copyfile(p, vo / name)
                keep.add(name)
                row["file"] = V.rel(vo / name, P)
            else:
                row["file"] = V.rel(p, P)
            row.update({"clip": V.rel(p, P), "dur": round(V.media_dur(p), 3), "verified": meta.get("verified"),
                        "problem": meta.get("problem"), "transcript": meta.get("transcript"),
                        "dryRun": bool(meta.get("dryRun")), "source": "custom" if ln.get("custom") else ("dry-run" if meta.get("dryRun") else "clip")})
        else:
            row.update({"file": None, "dur": None, "source": "missing"})
        rows.append(row)
    for f in vo.glob("*.wav"):
        if f.name not in keep:
            f.unlink()
    man = {"version": 1, "cache": V.rel(run.cdir, P), "lang": run.lang, "dryRun": run.api.dry,
           "updated": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"), "lines": rows}
    V.write_json(vo / "manifest.json", man)
    return vo / "manifest.json"


def select(lines: list[dict], only: str | None) -> list[dict]:
    if not only:
        return lines
    want = {x.strip() for x in only.split(",") if x.strip()}
    return [ln for ln in lines if ln["key"] in want or ln["scene"] in want]


# ---------------------------------------------------------------- commands
def cmd_batch(a) -> int:
    proj = V.load_project(a.project)
    run = Run(a, proj)
    lines = V.load_lines(proj, run.st)
    todo = []
    if a.only and not select(lines, a.only):
        log(f"  ! --only {a.only} matches no line key or scene id")
    for ln in select(lines, a.only):
        if ln.get("custom"):
            continue
        if a.force:   # only this mode's cache: a dry run never deletes real clips
            p = V.cache_path(run.cdir, ln, dry=run.api.dry)
            for f in (p, p.with_suffix(".json")):
                if f.exists():
                    f.unlink()
        p, meta = clip_state(run, ln)
        retry = meta.get("verified") is False and not a.keep_failed and bool(meta.get("dryRun")) == run.api.dry
        if p is None or retry:
            todo.append(ln)
    log(f"narration: {len(lines)} lines · {len(lines) - len(todo)} have clips · {len(todo)} to synthesize"
        + (" · DRY RUN (placeholders, no network)" if run.api.dry else f" · {run.lang} · cache {V.rel(run.cdir, proj['P'])}"))
    groups: dict = {}
    for ln in todo:
        groups.setdefault((ln["model"], ln["voice"], ln["style"]), []).append(ln)
    jobs = []
    for (model, voice, style), ls in groups.items():
        log(f"  group {voice} {style or '(no tag)'} {model}: {len(ls)} lines")
        chunk, secs = [], 0.0
        for ln in ls:   # at most --batch lines and about 60 s of speech per request
            e = V.estimate(ln["say"], run.lang, ln["style"])
            if chunk and (len(chunk) >= a.batch or secs + e > 60.0):
                jobs.append(chunk)
                chunk, secs = [], 0.0
            chunk.append(ln)
            secs += e
        if chunk:
            jobs.append(chunk)
    err = None
    with cf.ThreadPoolExecutor(max_workers=max(1, min(a.jobs, len(jobs) or 1))) as ex:
        futs = [ex.submit(run.batch, chunk) for chunk in jobs]
        for f in cf.as_completed(futs):
            try:
                f.result()
            except ApiError as e:
                err = e
                log(f"  ! {e}")
    man = write_manifest(run, lines)
    log(f"done: {len(run.saved)} clips saved, {len(run.failed)} failed verification · {calls_note(run.api)}"
        + (f" · tokens TTS {run.api.tokens['tts']} STT {run.api.tokens['stt']}" if any(run.api.tokens.values()) else "")
        + f" · {V.rel(man, proj['P'])}")
    if run.failed:
        log(f"  ! check: {', '.join(run.failed)} (listen; rewrite the line or set \"verify\": false if the STT is wrong)")
    log(f"next: python3 {Path(__file__).with_name('vo_timeline.py').name} --project {a.project}")
    if err:
        return 2
    return 1 if run.failed else 0


def cmd_synth(a) -> int:
    proj = V.load_project(a.project) if a.project else None
    run = Run(a, proj)
    if not proj:
        run.lang = a.lang or V.detect_lang([a.text])
    voice = a.voice or (run.st["voice"] if run.st else V.DEFAULT_VOICE)
    style = a.style if a.style is not None else (run.st["style"] if run.st else V.DEFAULT_STYLE)
    model = a.model or (run.st["model"] if run.st else TTS_MODEL)
    ln = {"key": "synth", "scene": "-", "text": a.text, "say": a.text, "voice": voice, "style": style, "model": model,
          "sha": V.cache_key(model, voice, style, a.text), "verify": True}
    out = Path(a.out)
    if run.cdir is None:
        run.cdir = Path(tempfile.mkdtemp(prefix="msr-tts-"))
    p = V.cache_path(run.cdir, ln, dry=run.api.dry)
    if not p.exists():
        run.single(ln)
    if not p.exists():
        log("! no clip produced")
        return 1
    out.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(p, out)
    meta = V.read_json(p.with_suffix(".json"), {})
    log(f"wrote {out} · {V.media_dur(out):.2f} s · verified {meta.get('verified')}" + (f" · {meta.get('problem')}" if meta.get("problem") else ""))
    return 0 if meta.get("verified") is not False else 1


def cmd_verify(a) -> int:
    if len(a.wav or []) != len(a.text or []) or not a.wav:
        raise SystemExit("verify needs matching --wav FILE --text TEXT pairs")
    run = Run(a, None)
    run.lang = a.lang or V.detect_lang(a.text)
    style = a.style if a.style is not None else V.DEFAULT_STYLE
    lines = [{"key": f"clip{k + 1}", "scene": "-", "text": t, "say": t, "style": style, "verify": True} for k, t in enumerate(a.text)]
    res = run.listen([read_wav(Path(w)) for w in a.wav], lines)
    bad = 0
    for w, (prob, tr) in zip(a.wav, res):
        bad += prob is not None
        log(f"{'FAIL' if prob else 'ok  '} {w}: {prob or ''}\n      heard: {tr}")
    return 1 if bad else 0


def cmd_audit(a) -> int:
    proj = V.load_project(a.project)
    run = Run(a, proj)
    lines = [ln for ln in V.load_lines(proj, run.st) if not ln.get("custom")]
    have = [(ln, clip_state(run, ln)[0]) for ln in lines]
    missing = [ln["key"] for ln, p in have if p is None]
    have = [(ln, p) for ln, p in have if p is not None]
    if missing:
        log(f"no clip yet (next batch makes them): {', '.join(missing)}")
    chunks = [have[k:k + 12] for k in range(0, len(have), 12)]
    order = {ln["key"]: i for i, ln in enumerate(lines)}

    def work(chunk):
        segs = [read_wav(p) for _, p in chunk]
        ls = [ln for ln, _ in chunk]
        nbs = [[lines[j] for j in (order[ln["key"]] - 1, order[ln["key"]] + 1) if 0 <= j < len(lines)] for ln in ls]
        return run.listen(segs, ls, nbs)
    with cf.ThreadPoolExecutor(max_workers=max(1, min(3, len(chunks)))) as ex:
        results = sum(ex.map(work, chunks), [])
    nbad = sum(1 for prob, _ in results if prob)
    fix = a.fix
    if fix and nbad > max(2, len(have) // 2) and not a.force:
        log(f"  ! {nbad} of {len(have)} clips failed: that looks like an STT problem, not bad clips; nothing deleted "
            f"(listen to a few, then re-run with --fix --force if they really are wrong)")
        fix = False
    bad = 0
    for (ln, p), (prob, tr) in zip(have, results):
        meta = V.read_json(p.with_suffix(".json"), {}) if p.with_suffix(".json").exists() else {}
        meta.update({"verified": prob is None if ln["verify"] else None, "problem": prob, "transcript": tr,
                     "audited": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")})
        p.with_suffix(".json").write_text(json.dumps(meta, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
        if prob:
            bad += 1
            log(f"  {ln['key']}: {prob}\n      heard: {tr}")
            if fix:
                for f in (p, p.with_suffix(".json")):
                    if f.exists():
                        f.unlink()
    write_manifest(run, V.load_lines(proj, run.st))
    log(f"audit: {len(have)} clips, {bad} with problems" + (" (deleted; run batch to regenerate)" if fix and bad else "")
        + f" · {calls_note(run.api, 'stt')}")
    return 1 if bad else 0


def cmd_sample(a) -> int:
    proj = V.load_project(a.project) if a.project else None
    run = Run(a, proj)
    st = run.st
    style0 = a.style if a.style is not None else (st["style"] if st else V.DEFAULT_STYLE)
    styles = [s.strip() for s in a.styles.split("|")] if a.styles else [style0]
    if a.voices:
        voices = [v.strip() for v in a.voices.split(",") if v.strip()]
    else:
        base = st["voice"] if st else V.DEFAULT_VOICE
        voices = [base] + [v for v in SHORTLIST[V.pace_of(style0)] if v != base][:3]
    if a.text:
        text = a.text
    elif proj and proj["narr"].get("lines"):
        ls = V.load_lines(proj, st)
        text = " ".join(x["say"] for x in ls[:2])
    else:
        text = {"ko": "이 쇼릴은 장면마다 박자에 맞춰 움직입니다. 숫자 4,600과 이름 TrailMix를 또렷하게 읽는지 들어 보세요.",
                "ja": "このショーリールは拍に合わせて動きます。数字の4,600をはっきり読むか聞いてください。"}.get(
            V.lang_family(a.lang or "en"), "This showreel moves on the beat. Listen for how it reads the number 4,600 and the name TrailMix.")
    run.lang = a.lang or (st["lang"] if st else V.detect_lang([text]))
    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    rows, reel = [], []
    model = a.model or (st["model"] if st else TTS_MODEL)
    for v in voices:
        for s in styles:
            pcm = run.api.tts(join_prompt(s, [run.lead(), text]), v, model, run.lang)
            segs, _ = batch_split(pcm, 2)
            seg = segs[1] if segs else trim(pcm)
            slug = re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-") or "plain"
            f = out / f"sample_{v}_{slug}.wav"
            write_wav(f, seg)
            units = V.analyze(text, run.lang)["units"]
            d = len(seg) / SR
            rows.append((v, VOICES.get(v, "?"), s, d, units / max(0.1, d - V.MARGIN), f.name))
            reel += [seg, np.zeros(int(0.8 * SR), np.int16)]
            log(f"  {v:<14} {VOICES.get(v, '?'):<14} {s:<22} {d:5.2f} s  {rows[-1][4]:.1f} {V.UNIT[V.lang_family(run.lang)]}/s  {f.name}")
    write_wav(out / "audition.wav", np.concatenate(reel) if reel else np.zeros(1, np.int16))
    md = ["# Voice auditions", "", f"Text ({run.lang}): {text}", "", "| Voice | Character | Style tag | Length | Rate | File |",
          "| --- | --- | --- | --- | --- | --- |"]
    md += [f"| {v} | {c} | `{s}` | {d:.2f} s | {r:.1f}/s | {fn} |" for v, c, s, d, r, fn in rows]
    md += ["", "audition.wav plays all samples in this order with 0.8 s gaps." + (" DRY RUN: placeholders, not real voices." if run.api.dry else "")]
    (out / "samples.md").write_text("\n".join(md) + "\n", encoding="utf-8")
    log(f"wrote {len(rows)} samples, audition.wav, samples.md in {out} · {calls_note(run.api, 'tts')}")
    return 0


# ---------------------------------------------------------------- selftest (offline)
def cmd_selftest(a) -> int:
    ok = True

    def check(name, cond, info=""):
        nonlocal ok
        ok &= bool(cond)
        print(f"{'PASS' if cond else 'FAIL'}  {name}" + (f"  ({info})" if info and not cond else ""))

    rng = np.random.default_rng(1)
    pcm = (rng.standard_normal(SR) * 3000).astype(np.int16)
    w = wav_bytes(pcm)
    fmt_data = w[12:]
    junk = b"c2pa" + (5).to_bytes(4, "little") + b"\x01\x02\x03\x04\x05" + b"\x00"
    lst = b"LIST" + (4).to_bytes(4, "little") + b"INFO"
    riff = b"RIFF" + (4 + len(lst) + len(fmt_data) + len(junk)).to_bytes(4, "little") + b"WAVE" + lst + fmt_data + junk
    check("RIFF data chunk only (LIST before, C2PA after)", np.array_equal(decode_audio(riff, "audio/wav"), pcm))
    check("raw L16 payload", np.array_equal(decode_audio(pcm.tobytes(), "audio/L16;codec=pcm;rate=24000"), pcm))
    check("raw 48 kHz payload resampled", abs(len(decode_audio(np.repeat(pcm, 2).tobytes(), "audio/L16;rate=48000")) - SR) <= 2)
    check("retryDelay 17s", retry_delay('{"error":{"details":[{"retryDelay": "17s"}]}}') == 17.0)
    check("retryDelay 1.5s", retry_delay('"retryDelay":"1.5s"') == 1.5)
    check("Retry-After header", retry_delay("", "9") == 9.0)
    with tempfile.TemporaryDirectory() as td:
        kf = Path(td) / "keyfile.txt"
        kf.write_text("OTHER=1\n# comment\nexport GEMINI_API_KEY=\"selftest-not-a-key\"  # trailing\nLATER=2\n")
        check("key line parsing (export, quotes)", read_key(str(kf)) == "selftest-not-a-key")
        kf.write_text("GEMINI_API_KEY=selftest-plain # note\n")
        check("key line parsing (plain, comment)", read_key(str(kf)) == "selftest-plain")
    check("ko number reading", V.ko_num_read("4,600") == "사천육백" and V.ko_num_read("10000") == "만" and V.ko_num_read("0.71") == "영점칠일")
    check("en number words", V.en_num_words("2026") == ["twenty", "twenty", "six"] and V.en_num_words("4,600") == ["four", "thousand", "six", "hundred"])
    texts = ["Here we go.", "TrailMix filters unsupported claims.", "It answers seven questions in 0.3 seconds.",
             "Missed critical reviews fell from 16 to 3.", "Evidence first."]
    audio = placeholder_prompt("[fast, energetic] " + SEP.join(texts), "en", "Puck")
    segs, info = batch_split(audio, len(texts))
    lens = [len(s) / SR for s in segs] if segs else []
    ests = [V.estimate(t, "en", "[fast, energetic]") for t in texts]
    check("batch split finds every sentence", segs is not None and info["clear"], str(info))
    check("split lengths match estimates", bool(lens) and all(abs(x - e) < 0.12 * e + 0.15 for x, e in zip(lens, ests)),
          f"{[round(x, 2) for x in lens]} vs {[round(e, 2) for e in ests]}")
    clicked = audio.copy()
    hop = int(0.01 * SR)
    for c in [(s0 + e0) // 2 * hop for s0, e0 in _quiet_runs(audio, hop, 400)]:
        clicked[c:c + int(0.012 * SR)] = 9000   # a 12 ms click in the middle of every long pause
    segs_c, info_c = batch_split(clicked, len(texts))
    check("a click inside a pause does not break the split", segs_c is not None and info_c["clear"], str(info_c))
    check("clicks are trimmed off the pieces", segs_c is not None and all(abs(len(x) - len(y)) < 0.02 * SR for x, y in zip(segs_c, segs)),
          str([round(len(x) / SR, 2) for x in segs_c or []]))
    ko = ["자, 시작합니다.", "트레일믹스는 근거 없는 주장을 걸러 냅니다.", "놓친 리뷰가 16건에서 3건으로 줄었습니다."]
    segs_k, info_k = batch_split(placeholder_prompt("[fast, energetic] " + SEP.join(ko), "ko", "Puck"), 3)
    check("Korean batch split", segs_k is not None and info_k["clear"], str(info_k))
    tr = trim(np.concatenate([np.zeros(SR, np.int16), pcm, np.zeros(SR, np.int16)]))
    check("trim keeps 0.04 s + 0.12 s margins", abs(len(tr) / SR - (1.0 + 0.16)) < 0.01, f"{len(tr) / SR:.3f}")
    L = lambda t, s=None: {"key": "k", "text": t, "say": s or t, "style": "[fast, energetic]"}
    lw = leak_words("[fast, energetic]")
    line = L("TrailMix cut missed critical reviews from 16 to 3.", "Trail Mix cut missed critical reviews from 16 to 3.")
    nb = [L("It answers seven questions in 0.3 seconds.")]
    sp = lambda got, **k: speech_problem(got, line, nb, "en", leaks=lw, lead="Here we go.", **k)
    check("exact transcript passes", sp("Trail Mix cut missed critical reviews from sixteen to three.") is None)
    check("digits vs words pass", sp("TrailMix cut missed critical reviews from 16 to 3") is None)
    check("style leak caught", "style tag" in (sp("Fast, energetic. TrailMix cut missed critical reviews from 16 to 3.") or ""))
    check("leak in head fragment caught", "style tag" in (sp("TrailMix cut missed critical reviews from 16 to 3.", head="Fast energetic") or ""))
    check("missing words caught", "missing" in (sp("TrailMix cut missed critical reviews") or ""))
    check("extra words caught", "extra" in (sp("TrailMix cut missed critical reviews from 16 to 3, and that is really something else.") or ""))
    check("wrong sentence caught", "wrong sentence" in (sp("It answers seven questions in 0.3 seconds.") or ""))
    check("lead sentence caught", "lead" in (sp("Here we go. TrailMix cut missed critical reviews from 16 to 3.") or "")
          or "extra" in (sp("Here we go. TrailMix cut missed critical reviews from 16 to 3.") or ""))
    kl = {"key": "k", "text": "매일 리뷰가 하루 평균 4,600건 들어옵니다.", "say": "매일 리뷰가 하루 평균 4,600건 들어옵니다.", "style": "[fast, energetic]"}
    check("Korean digits vs reading pass", speech_problem("매일 리뷰가 하루 평균 사천육백 건 들어옵니다", kl, [], "ko", leaks=lw) is None)
    check("Korean leak caught", "style tag" in (speech_problem("패스트, 에너제틱. 매일 리뷰가 하루 평균 4600건 들어옵니다", kl, [], "ko", leaks=lw) or ""))
    check("Korean missing caught", "missing" in (speech_problem("매일 리뷰가", kl, [], "ko", leaks=lw) or ""))
    check("estimate grows with text", V.estimate("one two three", "en") < V.estimate("one two three four five six seven", "en"))
    print("selftest " + ("passed" if ok else "FAILED"))
    return 0 if ok else 1


# ---------------------------------------------------------------- CLI
def main() -> int:
    common = argparse.ArgumentParser(add_help=False)
    common.add_argument("--dry-run", action="store_true", help="placeholders + simulated transcripts; no network, no key")
    common.add_argument("--env-file", help="file holding a GEMINI_API_KEY= line (only that line is read)")
    common.add_argument("--model", help=f"TTS model (default narration.json model or {TTS_MODEL})")
    common.add_argument("--stt-model", default=STT_MODEL, help=f"verification model (default {STT_MODEL})")
    common.add_argument("--api-base", help=f"API base URL (default {API_BASE}; env GEMINI_API_BASE). The key is sent only to "
                                           "Google's https endpoint or a loopback mock unless --allow-custom-api-base")
    common.add_argument("--allow-custom-api-base", action="store_true",
                        help="allow an https --api-base / GEMINI_API_BASE on another host (it receives the key)")
    common.add_argument("--cache", help="TTS cache folder (default env MSR_TTS_CACHE or P/build/vo/cache)")
    common.add_argument("--retries", type=int, default=12, help="HTTP retries per request (default 12)")
    common.add_argument("--rpm", type=float, default=0, help="client-side request pacing, requests per minute (0 = off)")
    common.add_argument("--tries", type=int, default=3, help="synthesis attempts per batch / line (default 3)")
    common.add_argument("--lang", help="language code (default narration.json lang or detected)")
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    b = sub.add_parser("batch", parents=[common], help="synthesize all narration lines of a project")
    b.add_argument("--project", required=True)
    b.add_argument("--only", help="comma-separated line keys or scene ids")
    b.add_argument("--force", action="store_true", help="re-synthesize even when cached")
    b.add_argument("--batch", type=int, default=8, help="lines per request (default 8)")
    b.add_argument("--jobs", type=int, default=2, help="requests in parallel (default 2)")
    b.add_argument("--no-verify", action="store_true", help="skip STT verification")
    b.add_argument("--keep-failed", action="store_true", help="do not retry clips that failed verification earlier")
    s = sub.add_parser("synth", parents=[common], help="one clip")
    s.add_argument("--text", required=True)
    s.add_argument("--out", required=True)
    s.add_argument("--voice")
    s.add_argument("--style")
    s.add_argument("--project")
    s.add_argument("--no-verify", action="store_true")
    v = sub.add_parser("verify", parents=[common], help="transcribe given clips and compare with their texts")
    v.add_argument("--wav", action="append")
    v.add_argument("--text", action="append")
    v.add_argument("--style", help="style tag the clips were made with (for leak checks)")
    u = sub.add_parser("audit", parents=[common], help="re-verify all cached clips of a project")
    u.add_argument("--project", required=True)
    u.add_argument("--fix", action="store_true", help="delete clips with problems so batch regenerates them")
    u.add_argument("--force", action="store_true", help="with --fix: delete even when most clips fail (suspect the STT first)")
    m = sub.add_parser("sample", parents=[common], help="voice / style auditions")
    m.add_argument("--out", required=True)
    m.add_argument("--project")
    m.add_argument("--voices", help="comma-separated voice names")
    m.add_argument("--styles", help="'|'-separated style tags, e.g. '[fast, energetic]|[calm, warm]'")
    m.add_argument("--style")
    m.add_argument("--text")
    sub.add_parser("selftest", help="offline checks")
    a = ap.parse_args()
    if a.cmd == "selftest":
        return cmd_selftest(a)
    try:
        return {"batch": cmd_batch, "synth": cmd_synth, "verify": cmd_verify, "audit": cmd_audit, "sample": cmd_sample}[a.cmd](a)
    except ApiError as e:
        log(f"error: {e}")
        return 2


if __name__ == "__main__":
    sys.exit(main())
