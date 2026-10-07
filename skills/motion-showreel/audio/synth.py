#!/usr/bin/env python3
"""Sample-free synthesis, mixing and mastering for motion-showreel soundtracks.

Pure numpy/scipy: no samples, no network, deterministic (every random source is seeded), 48 kHz stereo.
Library for arrange.py (music + SFX), verify_sync.py (checks) and any tool that needs the same loudness,
mastering or AAC handling (e.g. a VO mix). Also a CLI:

  python3 synth.py list [--json]                    # instruments, SFX names + aliases + anchors, families
  python3 synth.py sfx "SPEC" [--family F] [--bpm 120] [--key F --mode major] --out x.wav
  python3 synth.py inst NAME [--notes C4,E4,G4] [--dur 1.5] --out x.wav
  python3 synth.py audition DIR [--families glassy,digital] [--only pop,tick]   # WAVs + grid-<family>.png
  python3 synth.py calibrate                        # print FAMILY_TRIM_DB after changing a generator
  python3 synth.py loudness FILE...                 # integrated LUFS, LRA, true peak, sample peak, duration
  python3 synth.py master IN OUT.wav [--lufs -14] [--tp -1]
  python3 synth.py encode IN.wav OUT.m4a [--bitrate 192k] [--tp -1]
  python3 synth.py spectrogram IN --out x.png [--t0 0 --t1 8] [--marks 1.0,2.5]

SFX SPEC grammar (used verbatim in reel.config.json cues): "name[:arg...] [key=value ...] [flag ...] [xN]";
layer several with "+", e.g. "impact:big+shimmer". Bare time values are BEATS; use s / ms / bar for others.
"""
from __future__ import annotations

import argparse
import functools
import json
import math
import os
import re
import shutil
import subprocess
import sys
import wave
import zlib
from dataclasses import dataclass, field

import numpy as np
from scipy import signal
from scipy.ndimage import minimum_filter1d, uniform_filter1d

SR = 48000
FAMILIES = ("glassy", "digital", "organic", "minimal")
PENT = {"major": (0, 2, 4, 7, 9), "minor": (0, 3, 5, 7, 10)}
MAJORISH = {"major", "ionian", "lydian", "mixolydian"}


# ───────────────────────────── basics ─────────────────────────────

def ns(sec: float) -> int:
    return max(0, int(round(float(sec) * SR)))


def tt(n: int) -> np.ndarray:
    return np.arange(n) / SR


def mtof(m):
    return 440.0 * 2.0 ** ((np.asarray(m, dtype=float) - 69.0) / 12.0)


_PC = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}


def pitch_class(name) -> int:
    """'F', 'F#', 'Bb', 'Db', 'f minor' (first token) -> 0..11."""
    if isinstance(name, (int, np.integer)):
        return int(name) % 12
    s = str(name).strip().split()[0] if str(name).strip() else "C"
    s = s.replace("♯", "#").replace("♭", "b")
    if not s or s[0].upper() not in _PC:
        raise ValueError(f"not a key / pitch class: {name!r}")
    pc = _PC[s[0].upper()]
    for ch in s[1:]:
        if ch == "#":
            pc += 1
        elif ch == "b":
            pc -= 1
        else:
            break
    return pc % 12


def note_midi(name) -> int:
    """'C4' -> 60, 'Bb2' -> 46, 69 -> 69."""
    if isinstance(name, (int, float, np.integer, np.floating)):
        return int(round(float(name)))
    m = re.match(r"^\s*([A-Ga-g][#b♯♭]*)(-?\d+)\s*$", str(name))
    if not m:
        raise ValueError(f"not a note: {name!r}")
    return pitch_class(m.group(1)) + 12 * (int(m.group(2)) + 1)


def seed_of(*parts) -> int:
    return zlib.crc32("|".join(str(p) for p in parts).encode()) & 0x7FFFFFFF


def rng_of(*parts) -> np.random.Generator:
    return np.random.default_rng(seed_of(*parts))


def fades(x, a=0.002, r=0.006):
    """Short linear fade-in/out (mono or stereo) so no event clicks. Returns a copy."""
    x = np.array(x, dtype=float, copy=True)
    n = x.shape[-1]
    if n == 0:
        return x
    na, nr = min(n, max(1, int(a * SR))), min(n, max(1, int(r * SR)))
    x[..., :na] *= np.linspace(0, 1, na)
    x[..., n - nr:] *= np.linspace(1, 0, nr)
    return x


def _frozen(x):
    x.flags.writeable = False
    return x


# ───────────────────────────── filters ─────────────────────────────

@functools.lru_cache(maxsize=2048)
def _sos(kind, f, order, sr):
    nyq = sr / 2.0
    if kind == "bp":
        lo = min(max(f[0], 10.0), nyq * 0.90)
        hi = min(max(f[1], lo * 1.05), nyq * 0.95)
        return signal.butter(order, [lo, hi], btype="bandpass", fs=sr, output="sos")
    f = min(max(float(f), 5.0), nyq * 0.95)
    return signal.butter(order, f, btype={"lp": "lowpass", "hp": "highpass"}[kind], fs=sr, output="sos")


def filt(x, kind, f, order=2, sr=None):
    key = (float(f[0]), float(f[1])) if kind == "bp" else float(f)
    return signal.sosfilt(_sos(kind, key, order, sr or SR), x, axis=-1)


def lp(x, f, order=2):
    return filt(x, "lp", f, order)


def hp(x, f, order=2):
    return filt(x, "hp", f, order)


def bp(x, lo, hi, order=2):
    return filt(x, "bp", (lo, hi), order)


def _rbj(kind, fc, q):
    w0 = 2 * np.pi * fc / SR
    c, s = np.cos(w0), np.sin(w0)
    al = s / (2 * q)
    if kind == "lp":
        b = ((1 - c) / 2, 1 - c, (1 - c) / 2)
    elif kind == "hp":
        b = ((1 + c) / 2, -(1 + c), (1 + c) / 2)
    else:  # band-pass, 0 dB peak
        b = (al, 0.0, -al)
    a0 = 1 + al
    return np.array([[b[0] / a0, b[1] / a0, b[2] / a0, 1.0, -2 * c / a0, (1 - al) / a0]])


def sweep_filter(x, fc_of_p, kind="lp", q=0.707, block=64):
    """Time-varying biquad: coefficients per block, state carried. fc_of_p(p), p = 0..1 progress."""
    n = len(x)
    out = np.empty(n)
    zi = np.zeros((1, 2))
    for i in range(0, n, block):
        p = (i + block / 2) / max(n, 1)
        fc = float(np.clip(fc_of_p(min(p, 1.0)), 20.0, SR * 0.45))
        seg, zi = signal.sosfilt(_rbj(kind, fc, q), x[i:i + block], zi=zi)
        out[i:i + block] = seg
    return out


def stft_sweep(x, fc, bw_oct=1.0, kind="bp"):
    """Time-varying filter in the STFT domain (smooth, no zipper). fc: callable(progress 0..1) -> Hz."""
    n = len(x)
    if n < 4096:
        return sweep_filter(x, fc, "bp" if kind == "bp" else "lp", q=(1.4 / bw_oct) if kind == "bp" else 0.707)
    nper = 1024
    f, ts, Z = signal.stft(x, fs=SR, nperseg=nper, noverlap=nper - 256, boundary="even", padded=True)
    prog = np.clip(ts / max(n / SR, 1e-6), 0, 1)
    fcs = np.array([fc(p) for p in prog])[None, :]
    lf = np.log2(np.maximum(f, 10.0))[:, None]
    lc = np.log2(np.maximum(fcs, 10.0))
    mask = np.exp(-0.5 * ((lf - lc) / bw_oct) ** 2) if kind == "bp" else 1.0 / (1.0 + 2.0 ** (4.0 * (lf - lc)))
    _, y = signal.istft(Z * mask, fs=SR, nperseg=nper, noverlap=nper - 256, boundary=True)
    y = y[:n]
    return np.pad(y, (0, n - len(y))) if len(y) < n else y


# ───────────────────────────── oscillators ─────────────────────────────

def _phase(f, n):
    f = np.broadcast_to(np.asarray(f, dtype=float), (n,))
    return np.cumsum(f) / SR, f


def sine(f, n, ph0=0.0):
    ph, _ = _phase(f, n)
    return np.sin(2 * np.pi * (ph + ph0))


def saw(f, n, ph0=0.0):
    """Band-limited sawtooth (PolyBLEP), -1..1."""
    ph, f = _phase(f, n)
    ph = (ph + ph0) % 1.0
    dt = np.clip(f / SR, 1e-9, 0.5)
    y = 2.0 * ph - 1.0
    m = ph < dt
    u = ph[m] / dt[m]
    y[m] -= u + u - u * u - 1.0
    m = ph > 1.0 - dt
    u = (ph[m] - 1.0) / dt[m]
    y[m] -= u * u + u + u + 1.0
    return y


def square(f, n, ph0=0.0):
    """Band-limited square, -0.5..0.5 (two PolyBLEP saws)."""
    return 0.5 * (saw(f, n, ph0) - saw(f, n, ph0 + 0.5))


def tri(f, n, ph0=0.0):
    ph, _ = _phase(f, n)
    return 4.0 * np.abs(((ph + ph0) % 1.0) - 0.5) - 1.0


def noise(n, rng):
    return rng.standard_normal(n)


def expenv(n, tau):
    return np.exp(-tt(n) / max(tau, 1e-5))


def env_ad(n, a=0.002, d=0.3):
    t = tt(n)
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-np.maximum(0, t - a) / max(d, 1e-4))


def delay(x, k):
    k = int(k)
    if k <= 0:
        return np.array(x, dtype=float, copy=True)
    return np.concatenate([np.zeros(k), x[:-k]]) if k < len(x) else np.zeros(len(x))


def bitcrush(x, bits=6, hold=3):
    q = 2.0 ** (bits - 1)
    y = np.round(x * q) / q
    if hold > 1:
        y = np.repeat(y[::hold], hold)[: len(x)]
    return y


def softclip(x, knee=0.85):
    y = np.array(x, dtype=float, copy=True)
    m = np.abs(y) > knee
    y[m] = np.sign(y[m]) * (knee + (1 - knee) * np.tanh((np.abs(y[m]) - knee) / (1 - knee)))
    return y


def sat(x, drive=1.6):
    return np.tanh(drive * x) / np.tanh(drive)


def pan2(sig, pan=0.0):
    """Mono -> stereo, constant power (centre = unity on both channels). pan may be an array."""
    p = np.clip(np.asarray(pan, dtype=float), -1, 1)
    ang = (p + 1) * np.pi / 4
    return np.vstack([sig * np.cos(ang), sig * np.sin(ang)]) * np.sqrt(2)


def as_stereo(sig, pan=0.0):
    sig = np.asarray(sig, dtype=float)
    if sig.ndim == 1:
        return pan2(sig, pan)
    if np.ndim(pan) == 0 and pan:
        p = float(np.clip(pan, -1, 1))
        return sig * np.array([[min(1.0, 1 - p)], [min(1.0, 1 + p)]])
    return sig


# ───────────────────────────── instruments ─────────────────────────────
# All return mono (n,) or stereo (2, n) float arrays with peaks around 0.3-1.0; the arranger sets levels.

def pad(notes, dur, *, cutoff=2400.0, cut_end=None, atk=0.35, rel=0.9, detune=(-11, -4, 5, 12), core=0.8,
        vib=0.0012, seed=0):
    """Detuned PolyBLEP-saw pad with a sine core, stereo. cut_end sweeps the low-pass across the note."""
    n = ns(dur + rel)
    tl = tt(n)
    L, R = np.zeros(n), np.zeros(n)
    for k, m in enumerate(notes):
        f0 = float(mtof(m))
        for j, c in enumerate(detune):
            v = 1 + vib * np.sin(2 * np.pi * (0.23 + 0.07 * j) * tl + k + seed)
            y = saw(f0 * 2 ** (c / 1200) * v, n, ph0=(k * 0.37 + j * 0.21 + seed * 0.13) % 1)
            (L if j % 2 == 0 else R)[:] += y
        s = sine(f0, n) * core
        L += s
        R += s
    env = np.clip(tl / max(atk, 1e-3), 0, 1) ** 1.5
    env *= np.where(tl > dur, np.clip(1 - (tl - dur) / max(rel, 1e-3), 0, 1) ** 2, 1.0)
    out = np.vstack([L, R]) * env / (max(1, len(notes)) * 3.0)
    if cut_end is None:
        out = lp(lp(out, cutoff), cutoff * 1.4)
    else:
        out = np.vstack([stft_sweep(ch, lambda p: cutoff * (cut_end / cutoff) ** p, kind="lp") for ch in out])
    return hp(out, 90)


def strings(notes, dur, *, atk=0.3, rel=0.7, cutoff=3800.0, spic=False, vib=0.0035, seed=0):
    """'Strings-lite' ensemble: 3 detuned saws per note, delayed vibrato, formant lift, stereo.
    spic=True gives a short spiccato envelope for ostinatos."""
    rel = 0.12 if spic else rel
    n = ns(dur + rel)
    tl = tt(n)
    rng = np.random.default_rng(seed)
    L, R = np.zeros(n), np.zeros(n)
    vdel = 0.0 if spic else np.clip((tl - 0.25) / 0.4, 0, 1)
    for m in notes:
        f0 = float(mtof(m))
        for j, c in enumerate((-8, 0, 7)):
            v = 1 + vib * vdel * np.sin(2 * np.pi * (5.0 + 0.6 * rng.uniform()) * tl + rng.uniform(0, 6.283))
            y = saw(f0 * 2 ** (c / 1200) * v, n, rng.uniform())
            if j == 0:
                L += y
            elif j == 2:
                R += y
            else:
                L += 0.7 * y
                R += 0.7 * y
    if spic:
        env = np.minimum(1, tl / 0.006) * np.exp(-tl / 0.16) * np.where(tl > dur, np.clip(1 - (tl - dur) / rel, 0, 1), 1)
    else:
        env = np.clip(tl / max(atk, 1e-3), 0, 1) ** 1.2 * np.where(tl > dur, np.clip(1 - (tl - dur) / rel, 0, 1) ** 1.5, 1)
    out = np.vstack([L, R]) * env / (max(1, len(notes)) * 2.4)
    out = lp(out, cutoff) + 0.35 * bp(out, 900, 1700) + 0.2 * bp(out, 2400, 3400)
    return hp(out, 110)


def fm_bell(f, d, ratio=3.5, index=2.2, idecay=0.25, decay=0.6, extra=True):
    n = ns(d)
    t = tt(n)
    mod = index * np.exp(-t / idecay) * np.sin(2 * np.pi * f * ratio * t)
    y = np.sin(2 * np.pi * f * t + mod) * np.exp(-t / decay)
    if extra:  # glossy high partial
        y += 0.18 * np.sin(2 * np.pi * f * 4.01 * t) * np.exp(-t / (decay * 0.25))
    return fades(y, 0.0015, min(0.3, max(0.02, d * 0.25)))


def marimba(f, d=0.6):
    n = ns(d)
    t = tt(n)
    y = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.28)
    y += 0.35 * np.sin(2 * np.pi * f * 3.93 * t) * np.exp(-t / 0.06)
    y += 0.25 * np.sin(2 * np.pi * f * 2.0 * t + 1.5 * np.exp(-t / 0.04) * np.sin(2 * np.pi * f * 7 * t)) * np.exp(-t / 0.12)
    return fades(y, 0.001, min(0.2, max(0.02, d * 0.25)))


@functools.lru_cache(maxsize=4096)
def _pluck(m, kind, bright):
    f = float(mtof(m))
    if kind == "bell":
        y = fm_bell(f, 1.2, decay=0.45)
    elif kind == "marimba":
        y = marimba(f, 0.7)
    elif kind == "glass":
        y = fm_bell(f, 0.5, ratio=5.01, index=1.2, idecay=0.03, decay=0.18)
    elif kind == "saw":  # analog pluck: two saws through a decaying low-pass
        n = ns(0.42)
        t = tt(n)
        x = saw(f, n) * 0.6 + saw(f * 1.004, n, 0.3) * 0.4
        dn = n / SR
        x = sweep_filter(x, lambda p: 380 + 3400 * bright * np.exp(-p * dn * 24), "lp", 0.9)
        y = fades(x * np.exp(-t * 7.5), 0.001, 0.05)
    elif kind == "soft":
        n = ns(0.6)
        t = tt(n)
        y = (sine(f, n) + 0.22 * tri(f * 2, n)) * np.exp(-t / 0.22) * np.minimum(1, t / 0.003)
        y = fades(lp(y, 5000), 0.001, 0.03)
    elif kind == "keys":
        y = epiano(m, 0.35, 0.7)
    elif kind == "piano":
        y = piano(m, 0.5, 0.75)
    else:  # "mix": marimba body + FM-bell gloss
        y = 0.65 * marimba(f, 0.7)
        b = fm_bell(f, 0.7, ratio=3.5, index=1.4, idecay=0.08, decay=0.3)
        y[: len(b)] += 0.45 * b
    return _frozen(np.asarray(y, dtype=float))


def pluck(m, kind="mix", bright=1.0):
    """Cached pluck timbres: mix | bell | marimba | glass | saw | soft | keys | piano (read-only array)."""
    return _pluck(int(round(m)), kind, round(float(bright), 2))


@functools.lru_cache(maxsize=2048)
def _piano(m, dur, vel):
    f = float(mtof(m))
    n = ns(dur + 0.35)
    t = tt(n)
    rng = rng_of("piano", m)
    B = 0.00035 * max(0.5, (f / 261.6) ** 0.5)
    T0 = float(np.clip(2.8 * (261.6 / f) ** 0.55, 0.4, 6.0))
    y = np.zeros(n)
    for k in range(1, max(2, min(14, int(12000 / f))) + 1):
        fk = k * f * math.sqrt(1 + B * k * k)
        ak = k ** -1.15 * (0.55 + 0.4 * vel) ** (k - 1)
        tau = T0 / (1 + 0.45 * (k - 1))
        y += ak * (np.sin(2 * np.pi * fk * t + rng.uniform(0, 6.28))
                   + 0.6 * np.sin(2 * np.pi * fk * (1.0004 if k % 2 else 0.9996) * t + rng.uniform(0, 6.28))) * np.exp(-t / tau)
    hammer = bp(rng.standard_normal(n), 1500, 5000) * np.exp(-t / 0.004) * 0.08 * vel
    env = np.minimum(1, t / 0.002) * np.where(t > dur, np.exp(-(t - dur) / 0.09), 1.0)
    return _frozen(fades((y / 1.6 + hammer) * env * (0.35 + 0.65 * vel), 0.0005, 0.03))


def piano(m, dur, vel=0.8):
    """Additive 'piano-ish' note: inharmonic partials, two-string beating, hammer noise, damper release."""
    return _piano(int(round(m)), round(float(dur) * 20) / 20, round(float(vel), 1))


@functools.lru_cache(maxsize=2048)
def _epiano(m, dur, vel):
    f = float(mtof(m))
    n = ns(dur + 0.4)
    t = tt(n)
    idx = (0.8 + 2.2 * vel) * np.exp(-t / 0.12) + 0.35
    y = np.sin(2 * np.pi * f * t + idx * np.sin(2 * np.pi * f * t))
    y += 0.12 * vel * np.sin(2 * np.pi * f * 14.0 * t) * np.exp(-t / 0.02)
    y *= np.exp(-t / (1.6 * (261.6 / f) ** 0.4)) * np.minimum(1, t / 0.002)
    y *= np.where(t > dur, np.exp(-(t - dur) / 0.08), 1.0)
    return _frozen(fades(y * 0.6, 0.0005, 0.03))


def epiano(m, dur, vel=0.8):
    """FM electric piano (tine 'bark' + mellow body) for lofi / jazzy beds."""
    return _epiano(int(round(m)), round(float(dur) * 20) / 20, round(float(vel), 1))


def bass_round(m, d):
    """Round bass: sine + low harmonics through tanh, low-passed (K-BeautyGate bass)."""
    f = float(mtof(m))
    n = ns(d + 0.08)
    t = tt(n)
    y = np.sin(2 * np.pi * f * t) + 0.18 * np.sin(2 * np.pi * 2 * f * t) + 0.06 * np.sin(2 * np.pi * 3 * f * t)
    y = sat(y, 1.6)
    hold = np.exp(-d / (d * 2.5))
    env = np.minimum(1, t / 0.006) * np.where(t < d, np.exp(-t / (d * 2.5)), hold * np.clip(1 - (t - d) / 0.08, 0, 1))
    return lp(y * env, 900)


def bass_saw(m, d, bright=1.0):
    """Saw bass: sine body + enveloped low-passed saw, saturated (rolling synth bass). Cached (read-only)."""
    return _bass_saw(int(round(m)), round(float(d), 3), round(float(bright), 2))


@functools.lru_cache(maxsize=1024)
def _bass_saw(m, d, bright):
    f = float(mtof(m))
    n = ns(d + 0.05)
    t = tt(n)
    dn = n / SR
    x = sine(f, n) * 0.9 + sweep_filter(saw(f, n), lambda p: 260 + 1500 * bright * np.exp(-p * dn / 0.07), "lp", 0.8) * 0.5
    env = np.minimum(1, t / 0.004) * np.where(t < d, 1.0, np.exp(-(t - d) * 60))
    return _frozen(np.tanh(x * env * 1.4) * 0.8)


def sub(m, d, atk=0.01, rel=0.12):
    f = float(mtof(m))
    n = ns(d + rel)
    t = tt(n)
    env = np.minimum(1, t / max(atk, 1e-3)) * np.where(t > d, np.clip(1 - (t - d) / rel, 0, 1), 1.0)
    return sat(np.sin(2 * np.pi * f * t) * env, 1.2)


# drums ---------------------------------------------------------------

@functools.lru_cache(maxsize=64)
def kick(kind="pop", var=0):
    """Kick variants: pop (round, glossy) | punch (club) | soft | lofi | boom (cinematic)."""
    rng = rng_of("kick", kind, var)
    if kind == "punch":
        n = ns(0.5)
        t = tt(n)
        body = sine(44 + 120 * np.exp(-t * 32) + 60 * np.exp(-t * 260), n) * np.exp(-t * 6.0) * (1 - np.exp(-t * 900))
        y = np.tanh((body + hp(rng.standard_normal(n), 3000) * np.exp(-t * 380) * 0.28) * 1.7) * 0.9
    elif kind == "soft":
        n = ns(0.45)
        t = tt(n)
        y = sine(50 + 70 * np.exp(-t / 0.03), n) * np.exp(-t / 0.16) * np.minimum(1, t / 0.002)
        y += bp(rng.standard_normal(n), 800, 3000) * np.exp(-t / 0.003) * 0.05
    elif kind == "lofi":
        n = ns(0.32)
        t = tt(n)
        y = sine(48 + 90 * np.exp(-t / 0.035), n) * np.exp(-t / 0.12) * np.minimum(1, t / 0.0015)
        y = lp(sat(y + 0.1 * bp(rng.standard_normal(n), 1000, 4000) * np.exp(-t / 0.005), 2.2), 2500)
    elif kind == "boom":
        n = ns(1.0)
        t = tt(n)
        y = sine(40 + 40 * np.exp(-t / 0.08), n) * np.exp(-t / 0.45) * np.minimum(1, t / 0.003)
        y += lp(rng.standard_normal(n), 200) * np.exp(-t / 0.05) * 0.5
        y = sat(y, 1.5)
    else:  # pop
        n = ns(0.5)
        t = tt(n)
        f = 46 + 95 * np.exp(-t / 0.032) + 20 * np.exp(-t / 0.003)
        y = sat(sine(f, n) * np.exp(-t / 0.13) * np.minimum(1, t / 0.0015), 1.8)
        y += bp(rng.standard_normal(n), 1500, 6000) * np.exp(-t / 0.004) * 0.18
    return _frozen(fades(y, 0.0005, 0.03))


@functools.lru_cache(maxsize=64)
def clap(kind="pop", var=0):
    """Clap: pop (three bursts + tail) | tight (four bursts)."""
    rng = rng_of("clap", kind, var)
    n = ns(0.4)
    t = tt(n)
    nz = rng.standard_normal(n)
    env = np.zeros(n)
    offs = (0.0, 0.010, 0.021) if kind == "pop" else (0.0, 0.0085, 0.0175, 0.026)
    for k, o in enumerate(offs):
        tk = t - o
        env += np.where(tk >= 0, np.exp(-np.maximum(tk, 0) / 0.006), 0) * (0.8 if k < len(offs) - 1 else 1.0)
    tl = t - offs[-1]
    env += np.where(tl >= 0, 0.55 * np.exp(-np.maximum(tl, 0) / 0.075), 0)
    y = bp(nz * env, 900, 4200) * 1.6 + 0.25 * hp(nz * env, 6000)
    return _frozen(fades(y * 0.6, 0.0005, 0.03))


@functools.lru_cache(maxsize=64)
def snare(kind="tight", var=0):
    """Snare: tight | lofi | big."""
    rng = rng_of("snare", kind, var)
    n = ns(0.45 if kind == "big" else 0.25)
    t = tt(n)
    tone = sine(185 * (1 + 0.3 * np.exp(-t * 40)), n) * np.exp(-t * 28) * 0.5
    nz = bp(rng.standard_normal(n), 1200, 7500) * np.exp(-t * (11 if kind == "big" else 22))
    y = tone + nz
    if kind == "lofi":
        y = lp(sat(y, 1.8), 5500)
    return _frozen(fades(y * 0.8, 0.0005, 0.02))


@functools.lru_cache(maxsize=16)
def rim(var=0):
    n = ns(0.08)
    t = tt(n)
    rng = rng_of("rim", var)
    y = sine(1700, n) * np.exp(-t / 0.01) * 0.6 + bp(rng.standard_normal(n), 2000, 7000) * np.exp(-t / 0.003)
    return _frozen(fades(y, 0.0003, 0.01))


@functools.lru_cache(maxsize=64)
def hat(open_=False, kind="bright", var=0):
    """Hi-hat from metallic square partials + noise. kind: bright | dark (lofi)."""
    rng = rng_of("hat", open_, kind, var)
    n = ns(0.22 if open_ else 0.06)
    t = tt(n)
    y = hp(rng.standard_normal(n), 7500) * 0.8
    for r in (1.0, 1.4471, 1.6170, 1.9265, 2.5028, 2.6637):
        y += 0.12 * square(410 * r, n)
    y = hp(y, 7000) * np.exp(-t / (0.06 if open_ else 0.014))
    if kind == "dark":
        y = lp(y, 9000)
    return _frozen(fades(y, 0.0003, 0.01))


@functools.lru_cache(maxsize=16)
def shaker(var=0):
    n = ns(0.08)
    t = tt(n)
    y = bp(rng_of("shaker", var).standard_normal(n), 5000, 12000) * np.sin(np.pi * np.minimum(t / 0.06, 1)) ** 2
    return _frozen(fades(y, 0.0005, 0.005))


@functools.lru_cache(maxsize=64)
def tom(m=45, var=0):
    """Low tom / taiko-ish drum at MIDI pitch m."""
    f = float(mtof(m))
    n = ns(1.2)                      # low drums ring: end at -42 dB, not mid-decay
    t = tt(n)
    rng = rng_of("tom", m, var)
    y = sine(f * (1 + 0.6 * np.exp(-t / 0.03)), n) * np.exp(-t / 0.25) * np.minimum(1, t / 0.002)
    y += lp(rng.standard_normal(n), 1200) * np.exp(-t / 0.02) * 0.35
    return _frozen(fades(sat(y, 1.3), 0.0005, 0.04))


def crackle(n, rng, density=9.0):
    """Vinyl crackle bed: sparse filtered clicks + faint hiss (mono)."""
    y = hp(rng.standard_normal(n), 3000) * 0.012
    k = rng.poisson(density * n / SR)
    for i in rng.integers(0, max(1, n - 64), size=k):
        y[i:i + 48] += rng.uniform(0.05, 0.3) * np.exp(-np.arange(48) / 6.0) * rng.choice((-1, 1))
    return bp(y, 900, 9000)


INSTRUMENTS = {
    "pad": "detuned saw pad (bed)", "strings": "strings-lite ensemble (bed / spiccato ostinato)",
    "piano": "additive piano-ish (bed chords / broken-chord motion / motif)", "epiano": "FM electric piano (lofi keys)",
    "pluck": "marimba+bell pluck (arp motion)", "arp": "arpeggiator using the preset pluck", "marimba": "marimba",
    "bell": "FM bell (motif / sparkle top)", "glass": "glass sparkle", "saw-pluck": "analog saw pluck",
    "bass": "round bass", "saw-bass": "rolling saw bass", "sub": "sine sub", "stab": "saw chord stab (top)",
    "lead": "saw pluck lead (motif)", "kick": "kick", "clap": "clap", "snare": "snare", "rim": "rimshot",
    "hats": "hi-hats", "shaker": "shaker", "toms": "toms / taiko", "crackle": "vinyl crackle texture",
}
INSTRUMENT_ALIASES = {
    "pads": "pad", "synth-pad": "pad", "saw-pad": "pad", "strings-lite": "strings", "string": "strings",
    "piano-ish": "piano", "keys": "epiano", "rhodes": "epiano", "e-piano": "epiano", "electric-piano": "epiano",
    "plucks": "pluck", "arps": "arp", "arpeggio": "arp", "fm-bell": "bell", "fm-bells": "bell", "bells": "bell",
    "glock": "bell", "glockenspiel": "bell", "celesta": "bell", "vibes": "marimba", "mallets": "marimba",
    "round-bass": "bass", "sine-bass": "bass", "sawbass": "saw-bass", "synth-bass": "saw-bass", "sub-bass": "sub",
    "808": "sub", "stabs": "stab", "chord-stab": "stab", "hat": "hats", "hihat": "hats", "hi-hat": "hats",
    "hihats": "hats", "hi-hats": "hats", "claps": "clap", "tom": "toms", "taiko": "toms", "vinyl": "crackle",
    "noise": "crackle", "synth-lead": "lead", "saw-lead": "lead", "lead-pluck": "lead", "glass-bell": "glass",
}


def canonical_instrument(name: str) -> str | None:
    k = re.sub(r"[\s_]+", "-", str(name).strip().lower())
    k = INSTRUMENT_ALIASES.get(k, k)
    return k if k in INSTRUMENTS else None


# ───────────────────────────── SFX context, grammar, registry ─────────────────────────────

_TIME = re.compile(r"^\s*([-+]?(?:\d+\.?\d*|\.\d+))\s*(ms|s|sec|b|beat|beats|bar|bars)?\s*$", re.I)


def parse_time(v, beat: float, bpb: int = 4, slope: float = 1.0) -> float:
    """Time value -> output seconds. Bare numbers are BEATS; '0.3s' / '300ms' are scene seconds (x slope);
    '2b' beats, '1bar' bars (beats follow the output tempo, so they already include any slow-down)."""
    if isinstance(v, (int, float)) and not isinstance(v, bool):
        return float(v) * beat
    m = _TIME.match(str(v))
    if not m:
        raise ValueError(f"bad time value {v!r} (use 2b, 1bar, 0.3s, 300ms)")
    x, u = float(m.group(1)), (m.group(2) or "b").lower()
    if u == "ms":
        return x / 1000.0 * slope
    if u in ("s", "sec"):
        return x * slope
    if u in ("bar", "bars"):
        return x * bpb * beat
    return x * beat


@dataclass
class SfxCtx:
    """Everything an SFX generator may use. bpm is the OUTPUT tempo (already divided by any slow-down scale)."""
    family: str = "glassy"
    bpm: float = 120.0
    beats_per_bar: int = 4
    slope: float = 1.0
    key_pc: int = 5
    mode: str = "major"
    params: dict = field(default_factory=dict)
    seed: int = 0

    def __post_init__(self):
        self.rng = np.random.default_rng(self.seed)
        self.flags = set(self.params.get("flags", ()))
        if self.params.get("dir"):
            self.flags.add(str(self.params["dir"]).lower())

    @property
    def beat(self) -> float:
        return 60.0 / self.bpm

    def time(self, key, default):
        v = self.params.get(key, default)
        return parse_time(v, self.beat, self.beats_per_bar, self.slope)

    def num(self, key, default):
        v = self.params.get(key, default)
        try:
            return float(v)
        except (TypeError, ValueError):
            return float(default)

    def flag(self, *names) -> bool:
        return any(n in self.flags for n in names)

    def semis(self) -> float:
        return self.num("pitch", 0.0)

    def pent(self, step, octave=5) -> int:
        sc = PENT["major" if self.mode in MAJORISH else "minor"]
        o, i = divmod(int(step), len(sc))
        return 12 * (octave + 1) + self.key_pc + sc[i] + 12 * o

    def tonic(self, octave=5):
        """Root, third, fifth, octave of the key's tonic chord (MIDI)."""
        r = 12 * (octave + 1) + self.key_pc
        return [r, r + (4 if self.mode in MAJORISH else 3), r + 7, r + 12]

    def fam(self, **alts):
        """Pick a value by family: c.fam(glassy=a, digital=b, organic=c, minimal=d, default=x)."""
        return alts.get(self.family, alts.get("default", alts.get("glassy")))


@dataclass
class SfxDef:
    name: str
    fn: object
    anchor: str      # onset | peak | end | span (span = starts at the cue, onset at the cue)
    role: str        # accent | ui | transition | impact | build | texture | musical
    gain: float
    rev: float
    dly: float
    primary: str     # what a bare shorthand number means: "n" (count) or "dur"
    aliases: tuple
    doc: str


SFX: dict = {}
SFX_ALIASES: dict = {}
# Per-family level trims (dB) so every family of one SFX sits at the glassy level (minimal: 2.5 dB softer).
# Generated by `python3 synth.py calibrate`; re-run it after changing a generator and paste the output here.
FAMILY_TRIM_DB: dict = {
    "pop": {"digital": 2.0, "organic": -2.0},
    "tick": {"digital": 3.0, "organic": 6.1, "minimal": 5.1},
    "whoosh": {"minimal": 2.0},
    "swish": {"minimal": 1.7},
    "whip": {"organic": 1.9, "minimal": 1.9},
    "zoom": {"digital": 0.5, "organic": 1.6, "minimal": 1.5},
    "flip": {"digital": 0.6, "minimal": 1.8},
    "air": {"organic": 2.0, "minimal": 1.5},
    "riser": {"digital": 1.6, "organic": 1.7},
    "swell": {"digital": 1.8, "organic": 6.7, "minimal": 2.1},
    "shimmer": {"organic": 7.6, "minimal": -2.1},
    "boom": {"digital": -1.3, "minimal": -2.5},
    "impact": {"digital": -0.5, "organic": -3.8, "minimal": 1.2},
    "thud": {"digital": 1.3, "organic": 2.3, "minimal": 1.7},
    "slam": {"digital": 1.3, "organic": 0.6, "minimal": -1.5},
    "sparkle": {"digital": 10.5, "organic": 3.5, "minimal": 9.1},
    "chime": {"digital": 10.7, "organic": 1.1, "minimal": 5.2},
    "confirm": {"digital": 11.5, "organic": 2.0, "minimal": 3.4},
    "ding": {"digital": 10.9, "organic": 1.1, "minimal": 4.4},
    "plink": {"digital": 2.9},
    "bloop": {"digital": 10.3, "minimal": -2.5},
    "bwoop": {"minimal": -4.2},
    "buzz": {"digital": -2.6, "minimal": -4.9},
    "beep": {"digital": 2.9, "minimal": 0.6},
    "lock": {"minimal": -2.5},
    "keytap": {"digital": 2.4, "organic": 1.2, "minimal": 0.9},
    "enter": {"digital": -0.8, "minimal": -2.1},
    "blips": {"digital": 4.4, "organic": -0.6, "minimal": 8.8},
    "blip": {"digital": 5.5, "organic": -2.2, "minimal": 7.5},
    "count": {"digital": 0.6, "organic": 3.9, "minimal": 1.2},
    "strobe": {"organic": 7.6, "minimal": 4.7},
    "glitch": {"minimal": 11.4},
    "scan": {"minimal": 0.6},
    "drawon": {"organic": 2.4, "minimal": -1.2},
    "downlifter": {"organic": 5.6, "minimal": 1.5},
    "charge": {"minimal": -3.9},
    "zap": {"digital": 8.2, "minimal": -2.5},
    "coin": {"digital": 3.3, "minimal": -2.5},
    "heartbeat": {"minimal": -2.5},
    "pulse": {"minimal": -2.5},
    "shatter": {"digital": 1.0, "organic": 0.7, "minimal": -1.9},
    "door": {"minimal": -2.6},
    "click": {"organic": 6.7, "minimal": 2.0},
    "snap": {"digital": -0.7, "minimal": -4.4},
    "notify": {"digital": 10.0, "minimal": 1.9},
    "send": {"digital": 0.9, "organic": 1.0, "minimal": 1.5},
    "hit": {"minimal": -2.6},
    "sting": {"digital": 1.8, "organic": -2.0, "minimal": -1.2},
    "reveal": {"digital": 5.4, "organic": 1.8, "minimal": 2.4},
    "roll": {"digital": -1.2, "minimal": 5.9},
    "drone": {"minimal": -2.5},
}
FLAGS = {"big", "soft", "small", "fast", "slow", "up", "down", "lr", "rl", "rise", "fall", "dry", "wet", "loud", "quiet",
         "terminal", "bright", "dark", "short", "long", "pre"}


def _register(name, anchor="onset", role="accent", gain=0.3, rev=0.25, dly=0.0, primary="n", aliases=(), doc=""):
    def deco(fn):
        SFX[name] = SfxDef(name, fn, anchor, role, gain, rev, dly, primary, tuple(aliases), doc)
        for a in aliases:
            SFX_ALIASES[a] = name
        return fn
    return deco


def sfx_canonical(name: str) -> str | None:
    k = str(name).strip().lower().replace("_", "-")
    k = SFX_ALIASES.get(k, k)
    return k if k in SFX else None


def parse_sfx(spec) -> list:
    """'impact:big+shimmer gain=-3' -> [('impact', {...}), ('shimmer', {...})]. dict specs pass through.
    Raises ValueError for unknown names. key=value applies to every layer; ':' args to their own layer."""
    if isinstance(spec, dict):
        d = dict(spec)
        name = d.pop("name", d.pop("sfx", None))
        if not name:
            raise ValueError(f"sfx object without a name: {spec!r}")
        out = parse_sfx(name)
        for _, p in out:
            for k, v in d.items():
                if k == "flags":
                    p.setdefault("flags", []).extend(v)
                else:
                    p[k] = v
        return out
    tokens = str(spec).strip().split()
    if not tokens:
        raise ValueError("empty sfx")
    shared, layers = {}, []
    for tok in tokens[1:]:
        if "=" in tok:
            k, v = tok.split("=", 1)
            shared[k.strip().lower()] = v.strip()
        elif re.match(r"^x\d+$", tok, re.I):
            shared["n"] = int(tok[1:])
        elif tok.lower() in FAMILIES:
            shared["family"] = tok.lower()
        else:
            shared.setdefault("flags", []).append(tok.lower())
    for part in tokens[0].split("+"):
        bits = part.split(":")
        canon = sfx_canonical(bits[0])
        if canon is None:
            raise ValueError(f"unknown sfx {bits[0]!r} (python3 synth.py list)")
        p = {"flags": [] if bits[0].lower().replace("_", "-") == canon else [bits[0].lower()]}
        for a in bits[1:]:
            a = a.strip()
            if not a:
                continue
            if a.lower() in FAMILIES:
                p["family"] = a.lower()
            elif re.match(r"^x?\d+$", a, re.I) and SFX[canon].primary == "n":
                p["n"] = int(a.lstrip("xX"))
            elif _TIME.match(a):
                p["dur"] = a
            else:
                p["flags"].append(a.lower())
        layers.append((canon, p))
    for _canon, p in layers:
        for k, v in shared.items():
            if k == "flags":
                p["flags"] = p["flags"] + list(v)
            else:
                p.setdefault(k, v)
    return layers


def _seq(items):
    """[(offset_s, mono|stereo, pan)] -> (stereo, anchor index of offset 0)."""
    items = [(o, s, p) for o, s, p in items if s is not None and np.asarray(s).shape[-1] > 0]
    if not items:
        return np.zeros((2, 1)), 0
    t0 = min(0.0, min(o for o, _, _ in items))
    sts = [(ns(o - t0), as_stereo(s, p)) for o, s, p in items]
    n = max(i + s.shape[1] for i, s in sts)
    out = np.zeros((2, n))
    for i, s in sts:
        out[:, i:i + s.shape[1]] += s
    return out, ns(-t0)


def _jit(c, span=0.3):
    return float(c.rng.uniform(-span, span))


def render_sfx(name, params=None, *, family="glassy", bpm=120.0, beats_per_bar=4, slope=1.0, key_pc=5, mode="major",
               seed=0):
    """Render one SFX layer -> (stereo array at mix level, anchor sample, SfxDef, ctx). The SFX default gain,
    the family trim, soft/loud flags and gain=/pan= params are applied. Deterministic for equal arguments."""
    canon = sfx_canonical(name)
    if canon is None:
        raise ValueError(f"unknown sfx {name!r}")
    d = SFX[canon]
    params = dict(params or {})
    fam = params.get("family", family)
    fam = fam if fam in FAMILIES else "glassy"
    c = SfxCtx(fam, float(bpm), int(beats_per_bar), float(slope), int(key_pc), mode, params, int(seed))
    sig, anchor = d.fn(c)
    st = as_stereo(sig, 0.0)
    g = d.gain * 10 ** (FAMILY_TRIM_DB.get(canon, {}).get(fam, 0.0) / 20.0)
    if c.flag("soft", "quiet", "small"):
        g *= 0.5
    if c.flag("loud"):
        g *= 1.4
    if "gain" in params:
        g *= 10 ** (float(params["gain"]) / 20.0)
    pan = params.get("pan")
    if pan is not None:
        st = as_stereo(st, float(pan))
    return np.nan_to_num(st * g), int(anchor), d, c


# ───────────────────────────── SFX library ─────────────────────────────
# Glassy recipes are the K-BeautyGate ones; digital follows FDDD / FlyGate; organic = wood, water, breath;
# minimal = fewer partials, shorter, softer. Generators return (signal, anchor_sample).

def _pop_voice(c, f0, f1, d, tau):
    n = ns(d)
    t = tt(n)
    f = f0 + (f1 - f0) * (1 - np.exp(-t / 0.012))
    if c.family == "digital":
        y = lp(2 * square(f, n) * np.exp(-t / (tau * 0.8)), 6000)
        y = 0.6 * bitcrush(y, 6, 2)
    elif c.family == "organic":
        fw = f0 * 0.8 + (f1 * 1.05 - f0 * 0.8) * (1 - np.exp(-t / 0.02))
        y = sine(fw, n) * np.exp(-t / (tau * 1.6)) * np.minimum(1, t / 0.0015)
        y += 0.12 * bp(c.rng.standard_normal(n), 800, 3000) * np.exp(-t / 0.004)
    elif c.family == "minimal":
        y = sine(f1 * 0.85 + (f1 - f1 * 0.85) * (1 - np.exp(-t / 0.01)), n) * np.exp(-t / (tau * 0.8)) * 0.85
    else:
        y = sine(f, n) * np.exp(-t / tau) * np.minimum(1, t / 0.001) + 0.15 * sine(2 * f, n) * np.exp(-t / (tau * 0.4))
    return fades(y, 0.0008, 0.01)


@_register("pop", gain=0.30, rev=0.28, dly=0.05, aliases=("bubble", "chip", "pops"),
           doc="bubbly pitch-up pop; n rises on the key's pentatonic (gap 1/4 beat, rise 1 step, step=, big)")
def _sfx_pop(c):
    n, gap, rise, step = int(c.num("n", 1)), c.time("gap", 0.25), c.num("rise", 1), c.num("step", 0)
    big = c.flag("big")
    items = []
    for i in range(max(1, n)):
        m = c.pent(step + i * rise, 4 if big else 5) + c.semis()
        f1 = float(mtof(m)) * (1.0 if big else 1.25)
        y = _pop_voice(c, f1 * 0.5, f1, 0.18 if big else 0.1, 0.07 if big else 0.03)
        items.append((i * gap, y, (-0.4 + 0.8 * i / (n - 1)) if n > 1 else _jit(c)))
    return _seq(items)


def _tick_voice(c, i, rise):
    if c.family == "digital":
        n = ns(0.02)
        t = tt(n)
        y = hp(c.rng.standard_normal(n), 2500) * env_ad(n, 0.0003, 0.0022) + sine(3200 + rise * i, n) * env_ad(n, 0.0002, 0.003) * 0.6
    elif c.family == "organic":
        n = ns(0.04)
        t = tt(n)
        y = bp(c.rng.standard_normal(n), 1500, 4500) * np.exp(-t / 0.005) + 0.5 * sine(900 + rise * 0.3 * i, n) * np.exp(-t / 0.012)
    elif c.family == "minimal":
        n = ns(0.025)
        t = tt(n)
        y = sine(2800 + rise * 0.5 * i, n) * np.exp(-t / 0.004) * 0.7
    else:
        n = ns(0.03)
        t = tt(n)
        f = 3600 + rise * i
        y = (np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 2.76 * t)) * np.exp(-t / 0.008)
    return fades(y, 0.0005, 0.005)


@_register("tick", gain=0.12, rev=0.3, aliases=("ticks", "letters", "type-tick"),
           doc="tiny tick; n ticks gap apart (default 0.04s) rising in pitch: per-letter / per-item ticks")
def _sfx_tick(c):
    n, gap, rise = int(c.num("n", 1)), c.time("gap", "0.04s"), c.num("rise", 140)
    return _seq([(i * gap, _tick_voice(c, i, rise), (-0.6 + 1.2 * i / (n - 1)) if n > 1 else _jit(c)) for i in range(max(1, n))])


def _whoosh(c, dur, peak, f0, f1, bw, pan0, pan1, gain=1.0):
    d = float(np.clip(c.time("dur", dur), 0.12, 6.0))
    peak = float(np.clip(c.num("peak", peak), 0.05, 0.95))
    if c.flag("rl"):
        pan0, pan1 = abs(pan0) if pan0 else 0.5, -abs(pan1) if pan1 else -0.5
    if c.flag("up"):
        pan0 = pan1 = 0.0
    if c.flag("down"):
        f0, f1, pan0, pan1 = f1, f0, 0.0, 0.0
    if c.family == "organic":
        f0, f1, bw = f0 * 0.7, min(f1, 3200.0), bw * 1.3
    n = ns(d)
    p = np.arange(n) / max(n, 1)
    y = stft_sweep(c.rng.standard_normal(n), lambda q: f0 * (f1 / f0) ** q, bw_oct=bw)
    y *= np.where(p < peak, (p / peak) ** 2, ((1 - p) / (1 - peak)) ** 1.5)
    if c.family == "digital":
        y = 0.75 * y + 0.25 * bitcrush(y * 2, 5, 3) * 0.5
        tone = sine(f0 * 0.5 * (f1 / f0) ** p, n)
        y += 0.05 * tone * np.sin(np.pi * p) ** 2
    elif c.family == "organic":
        y = lp(y, 3500) * 1.25
    elif c.family == "minimal":
        y *= 0.6
    return pan2(y * gain, pan0 + (pan1 - pan0) * p), int(peak * n)


@_register("whoosh", anchor="peak", role="transition", gain=0.27, rev=0.2, primary="dur", aliases=("swoosh",),
           doc="noise sweep whose PEAK sits on the cue (dur 1 beat, peak=0.6, flags lr / rl / up / down)")
def _sfx_whoosh(c):
    return _whoosh(c, 1.0, 0.6, 300, 4500, 1.0, -0.5, 0.5)


@_register("swish", anchor="peak", role="transition", gain=0.22, rev=0.2, primary="dur", aliases=("swipe", "slide"),
           doc="short soft whoosh (0.5 beat) for small moves, chips, cards")
def _sfx_swish(c):
    return _whoosh(c, 0.5, 0.45, 600, 5000, 1.0, -0.4, 0.4)


@_register("whip", anchor="peak", role="transition", gain=0.30, rev=0.15, primary="dur", aliases=("whip-pan",),
           doc="fast wide whip whoosh (0.6 beat, peak 0.55, L->R) for whip transitions")
def _sfx_whip(c):
    return _whoosh(c, 0.6, 0.55, 500, 7000, 1.0, -0.8, 0.8)


@_register("zoom", anchor="peak", role="transition", gain=0.30, rev=0.2, primary="dur", aliases=("zoom-in", "push"),
           doc="centred rising whoosh that peaks late (1 beat, peak 0.85): zoom-throughs")
def _sfx_zoom(c):
    return _whoosh(c, 1.0, 0.85, 200, 5000, 1.2, 0.0, 0.0)


@_register("flip", anchor="peak", role="ui", gain=0.22, rev=0.2, primary="dur", aliases=("card-flip", "page"),
           doc="card / page flip swish (0.32 s)")
def _sfx_flip(c):
    return _whoosh(c, "0.32s", 0.45, 700, 5000, 1.0, -0.4, 0.4)


@_register("air", anchor="peak", role="transition", gain=0.12, rev=0.3, primary="dur", aliases=("breath", "match"),
           doc="barely-there air swish for match cuts")
def _sfx_air(c):
    return _whoosh(c, 0.75, 0.5, 900, 6000, 1.4, -0.2, 0.2, gain=0.8)


@_register("riser", anchor="end", role="build", gain=0.33, rev=0.2, primary="dur", aliases=("rise", "uplifter", "build"),
           doc="noise + detuned saw riser that ENDS on the cue (dur 1 bar); last 40 ms ducked so the hit wins")
def _sfx_riser(c):
    d = max(0.3, c.time("dur", "1bar"))
    n = ns(d)
    tl = tt(n)
    p = tl / d
    amp = p ** 2.2
    root = 12 * 4 + c.key_pc
    if c.family == "digital":
        nz = [sweep_filter(c.rng.standard_normal(n), lambda q: 350 * 22 ** q, "bp", 1.2, 128) for _ in range(2)]
        tone = sine(180 * 8 ** p, n) * 0.12 + saw(90 * 8 ** p, n) * 0.03
        out = np.vstack([nz[0] * 0.5 + tone, nz[1] * 0.5 + tone]) * amp * 1.1
    elif c.family == "minimal":
        nz = stft_sweep(c.rng.standard_normal(n), lambda q: 400 * (5000 / 400) ** (q ** 1.4), bw_oct=1.2)
        out = np.vstack([nz, delay(nz, 90)]) * amp * 0.45
    else:
        top = 9000 if c.family == "glassy" else 6000
        nz = stft_sweep(c.rng.standard_normal(n), lambda q: 400 * (top / 400) ** (q ** 1.4), bw_oct=1.1) * amp * 0.5
        sw = np.zeros(n)
        for k in (-14, 0, 13):
            sw += saw(float(mtof(root)) * 2 ** (k / 1200) * 2 ** (2.0 * p ** 1.6), n)
        sw = stft_sweep(sw, lambda q: 500 * (6000 / 500) ** q, kind="lp") * amp * (0.12 if c.family == "glassy" else 0.06)
        out = np.vstack([nz + sw, delay(nz, 120) + sw])
    out *= np.clip((d - tl) / 0.04, 0, 1) ** 2
    return out, n


@_register("swell", anchor="end", role="build", gain=0.20, rev=0.3, primary="dur", aliases=("reverse", "reverse-cymbal", "suck"),
           doc="reverse cymbal swell that ENDS on the cue (dur 1 beat)")
def _sfx_swell(c):
    d = max(0.2, c.time("dur", 1.0))
    n = ns(d)
    t = tt(n)
    cr = hp(c.rng.standard_normal(n), 1200) * np.exp(-t / 0.25) + 0.4 * bp(c.rng.standard_normal(n), 300, 1500) * np.exp(-t / 0.3)
    if c.family == "digital":
        cr = 0.7 * cr + 0.3 * bitcrush(cr / (np.abs(cr).max() + 1e-9), 5, 4) * np.abs(cr).max()
    elif c.family == "organic":
        cr = lp(cr, 6000)
    elif c.family == "minimal":
        cr *= 0.6
    cr = cr[::-1] * np.clip((d - t) / 0.04, 0, 1) ** 2
    return np.vstack([cr, delay(cr, 37)]), n


def _boom_core(c, dur=3.0, big=True):
    n = ns(dur)
    t = tt(n)
    f = 30 + 45 * np.exp(-t / 0.15)
    y = np.tanh(2.2 * sine(f, n) * np.exp(-t / (0.9 if big else 0.5))) * np.minimum(1, t / 0.002)
    y += 0.6 * lp(c.rng.standard_normal(n), 250) * np.exp(-t / 0.12)
    y += 0.5 * np.sin(2 * np.pi * np.cumsum(90 + 120 * np.exp(-t / 0.02)) / SR) * np.exp(-t / 0.12)
    y += 0.6 * bp(c.rng.standard_normal(n), 700, 6000) * np.exp(-t / 0.03) * np.minimum(1, t / 0.003)
    return fades(y, 0.001, 0.2)


def _release(x, frac=0.3, sec=None):
    """Cosine fade over the last frac of the sound (or sec seconds): ends ringing tails smoothly."""
    x = np.array(x, dtype=float, copy=True)
    n = x.shape[-1]
    k = min(n, ns(sec) if sec else int(n * frac))
    if k > 1:
        x[..., n - k:] *= np.cos(np.linspace(0, np.pi / 2, k)) ** 2
    return x


def _shimmer_core(c, dur=2.6):
    n = ns(dur)
    t = tt(n)
    if c.family == "minimal":
        a = hp(c.rng.standard_normal(n), 4000) * np.exp(-t / 0.45) * np.minimum(1, t / 0.01) * 0.12
        return np.vstack([a, delay(a, 41)])
    L = hp(c.rng.standard_normal(n), 3500) * np.exp(-t / 0.7) + 0.5 * bp(c.rng.standard_normal(n), 6000, 14000) * np.exp(-t / 1.4)
    R = hp(c.rng.standard_normal(n), 3500) * np.exp(-t / 0.7) + 0.5 * bp(c.rng.standard_normal(n), 6000, 14000) * np.exp(-t / 1.4)
    out = np.vstack([L + 0.32 * R, R + 0.32 * L]) * np.minimum(1, t / 0.002) * 0.07 * 1.35   # +-0.6 pan spread
    if c.family == "organic":
        return _release(lp(out, 9000) * 0.8, 0.3)
    y = np.zeros(n)
    for _ in range(14):
        f = c.rng.uniform(2800, 9000)
        if c.family == "digital":
            part = square(f * 0.5, n) * 2
        else:
            part = np.sin(2 * np.pi * f * t + c.rng.uniform(0, 6))
        y += part * np.exp(-t / c.rng.uniform(0.3, 1.3)) * (0.5 + 0.5 * np.sin(2 * np.pi * c.rng.uniform(4, 9) * t)) ** 2
    y = y / 14 * 0.25
    if c.family == "digital":
        y = lp(bitcrush(y * 3, 6, 2) / 3, 9000)
    return _release(out + pan2(y, 0.0), 0.3)


@_register("shimmer", role="impact", gain=1.0, rev=0.6, dly=0.15, aliases=("crash", "cymbal", "light", "flash"),
           doc="shimmer crash: bright noise + ringing partials (3 s; big = 3.6 s, +3 dB); flashes, drops")
def _sfx_shimmer(c):
    big = c.flag("big", "long")
    return _shimmer_core(c, 3.6 if big else 3.0) * (1.4 if big else 1.0), 0


@_register("boom", role="impact", gain=0.70, rev=0.25, aliases=("sub-boom", "bass-drop", "drop"),
           doc="sub boom + noise crash (3 s): the heaviest hit")
def _sfx_boom(c):
    y = _boom_core(c, 3.0, True)
    if c.family == "digital":
        y = y + 0.15 * bitcrush(y, 5, 6)
    return y, 0


@_register("impact", role="impact", gain=0.55, rev=0.3, aliases=("hit-big", "slam-big", "punch"),
           doc="impact: boom + crash + snap (big = longer, louder); family sets the body")
def _sfx_impact(c):
    big = c.flag("big")
    if c.family == "digital":
        n = ns(2.2 if big else 1.4)
        t = tt(n)
        boom = sine(30 + 50 * np.exp(-t * 3.0), n) * np.exp(-t * (1.6 if big else 2.4)) * (1 - np.exp(-t * 500))
        crash = lp(c.rng.standard_normal(n), 6500) * np.exp(-t * 3.2) * 0.35
        snap = hp(c.rng.standard_normal(n), 1500) * np.exp(-t * 45) * 0.5
        x = np.tanh((boom * 1.3 + crash + snap) * 1.2)
        out = np.vstack([x, x * 0.96 + np.roll(crash, 91) * 0.04]) * 0.8
        g = glitch_burst(c, 0.12, 0.6, offset=0.02)
        out[:, : g.shape[1]] += g[:, : out.shape[1]] * 0.25
        return _release(out, sec=0.3), 0
    if c.family == "organic":
        y = np.zeros(ns(2.0))
        drum = np.array(tom(33 + c.key_pc % 12, 0), dtype=float) * 1.4
        y[: len(drum)] += drum
        n = len(y)
        t = tt(n)
        y += 0.5 * lp(c.rng.standard_normal(n), 900) * np.exp(-t / 0.18) + 0.35 * bp(c.rng.standard_normal(n), 400, 2000) * np.exp(-t / 0.01)
        return fades(y, 0.0005, 0.2) * (1.2 if big else 0.9), 0
    if c.family == "minimal":
        n = ns(1.2)
        t = tt(n)
        y = sine(40 + 30 * np.exp(-t / 0.05), n) * np.exp(-t / 0.35) * np.minimum(1, t / 0.003)
        y += 0.15 * bp(c.rng.standard_normal(n), 500, 4000) * np.exp(-t / 0.02)
        return fades(y, 0.0005, 0.1) * (1.1 if big else 0.8), 0
    y = pan2(_boom_core(c, 2.6 if big else 1.6, big), 0.0) * (0.9 if big else 0.7)
    sh = _shimmer_core(c, 2.6 if big else 1.6) * (1.0 if big else 0.6)
    n = max(y.shape[1], sh.shape[1])
    out = np.zeros((2, n))
    out[:, : y.shape[1]] += y
    out[:, : sh.shape[1]] += sh
    return out, 0


def _thud(c, f0=110, f1=48, tau=0.12, d=0.4, slap=0.4):
    n = ns(d)
    t = tt(n)
    f = f1 + (f0 - f1) * np.exp(-t / 0.03)
    y = np.tanh(2 * sine(f, n) * np.exp(-t / tau))
    y += slap * bp(c.rng.standard_normal(n), 500, 3000) * np.exp(-t / 0.015)
    return fades(y, 0.0008, 0.02)


@_register("thud", role="impact", gain=0.35, rev=0.3, aliases=("land", "landing", "drop-in", "bump"),
           doc="soft low body thud: landings, heavy objects")
def _sfx_thud(c):
    if c.family == "organic":
        return _thud(c, 140, 70, 0.08, 0.35, 0.8) * 0.9, 0
    if c.family == "digital":
        y = _thud(c, 120, 45, 0.12, 0.4, 0.3)
        return 0.8 * y + 0.2 * bitcrush(y, 5, 4), 0
    if c.family == "minimal":
        return _thud(c, 100, 50, 0.09, 0.3, 0.1) * 0.8, 0
    return _thud(c, 120, 45, 0.18, 0.4, 0.2), 0


@_register("stamp", role="impact", gain=0.55, rev=0.15, aliases=("approve", "seal", "check"),
           doc="rubber stamp: thud + slap + paper (K-BeautyGate stamps); pan follows n")
def _sfx_stamp(c):
    n_ = int(c.num("n", 1))
    gap = c.time("gap", 1.0)
    items = []
    for i in range(max(1, n_)):
        y = _thud(c, 160, 60, 0.08, 0.4, 1.0)
        m = len(y)
        y += 0.5 * bp(c.rng.standard_normal(m), 180, 600) * np.exp(-tt(m) / 0.03)
        if c.family == "digital":
            tk = _tick_voice(c, 0, 0)
            y[: min(m, len(tk))] += 0.25 * tk[:m]
        elif c.family == "organic":
            y += 0.4 * hp(c.rng.standard_normal(m), 2500) * np.exp(-tt(m) / 0.012)
        elif c.family == "minimal":
            y *= 0.75
        items.append((i * gap, y, (-0.3 + 0.2 * i) if n_ > 1 else 0.0))
    return _seq(items)


@_register("slam", role="impact", gain=0.55, rev=0.3, aliases=("door-slam", "smash"),
           doc="slam: kick + clap + short impact (big adds a tonic stab)")
def _sfx_slam(c):
    big = c.flag("big")
    k = np.array(kick("punch", 1), dtype=float) * 1.1
    cl = np.array(clap("tight", 1), dtype=float) * (0.9 if big else 0.6)
    n = ns(1.6)
    out = np.zeros((2, n))
    out[:, : len(k)] += pan2(k, 0)
    out[:, : len(cl)] += pan2(cl, 0.05)
    ip, _ = _sfx_impact(SfxCtx(c.family, c.bpm, c.beats_per_bar, c.slope, c.key_pc, c.mode, {"flags": ["big"] if big else []}, c.seed + 1))
    ip = as_stereo(ip, 0) * (0.5 if big else 0.3)
    out[:, : min(n, ip.shape[1])] += ip[:, :n]
    if big:
        st = stab([m for m in c.tonic(4)[:3]], 1.0) * 0.5
        out[:, : len(st)] += pan2(st, 0)
    return _release(out, sec=0.3), 0


def stab(notes, v=1.0):
    """Saw chord stab with a closing filter (dark-synth offbeats, slams). Cached per chord."""
    return _stab(tuple(int(round(m)) for m in notes)) * v


@functools.lru_cache(maxsize=256)
def _stab(notes):
    n = ns(0.3)
    t = tt(n)
    x = sum(saw(float(mtof(m)), n, (k * 0.31) % 1) for k, m in enumerate(notes)) / max(1, len(notes))
    x = sweep_filter(x, lambda p: 600 + 5000 * np.exp(-p * 0.3 * 30), "lp", 0.9)
    return _frozen(fades(x * np.exp(-t * 11) * 0.6, 0.001, 0.02))


@_register("sparkle", role="accent", anchor="span", gain=0.10, rev=0.5, dly=0.35, primary="dur", aliases=("sparkles", "glitter", "twinkle", "trail"),
           doc="random pentatonic sparkles across dur (2 beats; n default 9/s): trails, glints, magic")
def _sfx_sparkle(c):
    d = max(0.1, c.time("dur", 2.0))
    count = int(c.num("n", max(3, round(9 * d))))
    items = []
    for k in range(count):
        tk = 0.0 if k == 0 else float(c.rng.uniform(0, d))
        m = c.pent(int(c.rng.integers(0, 10)), 6) + c.semis()
        f = float(mtof(m))
        if c.family == "digital":
            y = blip_voice(f, 0.8)
        elif c.family == "organic":
            y = marimba(f, 0.3) * 0.7
        elif c.family == "minimal":
            n = ns(0.25)
            y = sine(f, n) * expenv(n, 0.05) * 0.6
        else:
            y = fm_bell(f, 0.5, ratio=5.01, index=1.2, idecay=0.03, decay=0.18)
        items.append((tk, y * (1.0 if k == 0 else c.rng.uniform(0.5, 1.0)), float(c.rng.uniform(-0.8, 0.8))))
    return _seq(items)


def blip_voice(f, v=1.0):
    n = ns(0.16)
    t = tt(n)
    mod = sine(f * 2.01, n) * 90 * np.exp(-t * 40)
    return fades(sine(f + mod, n) * np.exp(-t * 32) * v, 0.001, 0.01)


def _chord_notes(c, notes, gap, kind, d=1.0):
    items = []
    for i, m in enumerate(notes):
        f = float(mtof(m + c.semis()))
        if c.family == "digital":
            y = blip_voice(f, 1.0)
        elif c.family == "organic":
            y = marimba(f, 0.6)
        elif c.family == "minimal":
            n = ns(0.6)
            y = sine(f, n) * expenv(n, 0.18) * np.minimum(1, tt(n) / 0.002) * 0.8
        else:
            y = fm_bell(f, d, ratio=kind[0], index=kind[1], idecay=kind[2], decay=kind[3])
        items.append((i * gap, y, -0.3 + 0.6 * i / max(1, len(notes) - 1)))
    return _seq(items)


@_register("chime", role="accent", gain=0.10, rev=0.5, dly=0.4, aliases=("sparkle-chime", "magic", "glint"),
           doc="4-note tonic arpeggio chime in key (35 ms apart): logo glints, reveals")
def _sfx_chime(c):
    r = c.tonic(6)
    notes = [r[2] - 12, r[0], r[1], r[2]]
    if c.family == "minimal":
        notes = [r[0], r[2]]
    return _chord_notes(c, notes, 0.035, (3.01, 1.0, 0.05, 0.4), d=1.8)


@_register("confirm", role="ui", gain=0.13, rev=0.5, dly=0.35, aliases=("allow", "allowed", "success", "ok", "done", "complete"),
           doc="bright rising success chime (root-3-5-8 in key, 40 ms apart)")
def _sfx_confirm(c):
    r = c.tonic(5)
    return _chord_notes(c, [r[0], r[1], r[2], r[3]], 0.04, (3.0, 1.5, 0.05, 0.55), d=2.4)


@_register("ding", role="ui", gain=0.13, rev=0.4, dly=0.3, aliases=("bell", "pin", "plink-bell", "dings"),
           doc="single bell ding in key; n dings rising on the pentatonic (gap 1/4 beat)")
def _sfx_ding(c):
    n, gap = int(c.num("n", 1)), c.time("gap", 0.3)
    items = []
    for i in range(max(1, n)):
        f = float(mtof(c.pent(c.num("step", 2) + 2 * i, 5) + c.semis()))
        if c.family == "digital":
            y = blip_voice(f, 1.0)
        elif c.family == "organic":
            y = marimba(f, 0.8)
        elif c.family == "minimal":
            m_ = ns(0.5)
            y = sine(f, m_) * expenv(m_, 0.12) * 0.8
        else:
            y = fm_bell(f, 1.5, ratio=3.5, index=1.6, idecay=0.06, decay=0.35)
        items.append((i * gap, y, (-0.3 + 0.6 * i / (n - 1)) if n > 1 else _jit(c)))
    return _seq(items)


@_register("plink", role="accent", gain=0.40, rev=0.45, dly=0.3, aliases=("drop-water", "water", "droplet", "drip"),
           doc="water-drop plink (+ soft splash)")
def _sfx_plink(c):
    n = ns(0.35)
    t = tt(n)
    f0 = 900 * 2 ** (c.semis() / 12)
    f = f0 + f0 * 1.66 * (1 - np.exp(-t / 0.02))
    y = sine(f, n) * np.exp(-t / 0.07) * np.minimum(1, t / 0.0008)
    if c.family == "digital":
        y = 0.7 * bitcrush(y, 6, 2)
    if c.family != "minimal":
        m = ns(0.4)
        sp = bp(c.rng.standard_normal(m), 1500, 7000) * np.exp(-tt(m) / 0.06) * 0.21
        return _seq([(0.0, y, 0.0), (0.005, sp, 0.0)])
    return y * 0.8, 0


@_register("bloop", role="ui", gain=0.30, rev=0.25, aliases=("blob", "boop", "wobble"),
           doc="round bloop (pitch up then down): blob reveals, bubbles")
def _sfx_bloop(c):
    n = ns(0.22)
    t = tt(n)
    k = 2 ** (c.semis() / 12)
    f = (300 + 500 * np.sin(np.pi * np.minimum(t / 0.16, 1)) ** 1.5) * k
    y = sine(f, n) * np.exp(-t / 0.08) * np.minimum(1, t / 0.002)
    if c.family == "digital":
        y = 0.6 * y + 0.4 * lp(2 * square(f, n), 3000) * np.exp(-t / 0.08)
    return y, 0


@_register("bwoop", role="ui", gain=0.20, rev=0.2, aliases=("dropout", "drop-out", "fall-tone", "disappear"),
           doc="descending bwoop: items dropping out / being filtered away")
def _sfx_bwoop(c):
    n = ns(0.3)
    t = tt(n)
    f = 650 * 2 ** (c.semis() / 12) * (0.22 ** np.minimum(t / 0.24, 1)) * (1 + 0.04 * np.sin(2 * np.pi * 18 * t))
    y = (sine(f, n) + (0.3 if c.family != "minimal" else 0.0) * saw(f, n)) * np.minimum(1, t / 0.004) * np.clip((0.3 - t) / 0.12, 0, 1)
    return lp(y, 2500), 0


def _buzz_env(t):
    """4 ms attack, flat body, 20 ms release over 75 ms: the onset reads on the cue."""
    return np.minimum(1.0, t / 0.004) * np.clip((0.075 - t) / 0.02, 0.0, 1.0)


@_register("buzz", role="ui", gain=0.12, rev=0.1, aliases=("deny", "denied", "error", "wrong", "no", "reject"),
           doc="soft deny buzz: two short low buzzes 110 ms apart (with a little rasp)")
def _sfx_buzz(c):
    items = []
    for k in range(2):
        n = ns(0.075)
        t = tt(n)
        if c.family == "minimal":
            y = sine(220, n) * _buzz_env(t) * 1.2
        else:
            if c.family == "organic":
                y = lp(tri(150, n) + 0.3 * square(150, n), 900) * 1.3
            else:
                y = lp(square(196, n) + 0.5 * square(196 * 1.006, n), 1400 if c.family == "glassy" else 2600)
                if c.family == "digital":
                    y = bitcrush(y * 1.3, 5, 3)
            y = (0.9 * y + 0.16 * bp(c.rng.standard_normal(n), 300, 2500)) * _buzz_env(t)   # rasp: a buzzer, not a tone
        items.append((k * 0.11, fades(y, 0.004, 0.01), 0.0))
    return _seq(items)


@_register("beep", role="ui", gain=0.17, rev=0.25, dly=0.25, aliases=("beeps", "lockon", "lock-on", "terminal-beep", "bleep"),
           doc="terminal / lock-on beep on the key's third (octave 6); n beeps gap apart (0.15 s), rising rise=1 step")
def _sfx_beep(c):
    n_, gap, rise = int(c.num("n", 1)), c.time("gap", "0.15s"), c.num("rise", 1)
    items = []
    for i in range(max(1, n_)):
        n = ns(0.09)
        t = tt(n)
        fb = float(mtof(c.pent(c.num("step", 2) + rise * i, 6) + c.semis()))
        if c.family == "digital":
            y = lp(2 * square(fb / 2, n), 6000) * np.minimum(1, t / 0.002) * np.exp(-t / 0.06) * 0.6
        else:
            y = (np.sin(2 * np.pi * fb * t) + 0.25 * np.sin(2 * np.pi * 2 * fb * t)) * np.minimum(1, t / 0.004) * np.exp(-t / 0.05)
            if c.family == "minimal":
                y *= 0.7
        items.append((i * gap, fades(y, 0.003, 0.02), 0.1))
    return _seq(items)


@_register("lock", role="ui", gain=0.30, rev=0.5, aliases=("target", "locked", "acquire"),
           doc="target lock: bell partials on the key's fifth (big adds a kick)")
def _sfx_lock(c):
    big = c.flag("big")
    n = ns(2.4 if big else 1.6)
    s = np.zeros(n)
    f0 = float(mtof(c.tonic(5)[2] + c.semis()))
    for r, a in ((1, 1), (2.76, 0.5), (5.4, 0.25), (8.93, 0.12)):
        s += sine(f0 * r, n) * env_ad(n, 0.001, (0.5 if big else 0.3) / r ** 0.5) * a
    if big:
        k = np.array(kick("punch", 2), dtype=float)
        s[: min(n, len(k))] += k[:n] * 0.5
    return _release(s * 0.5, 0.25), 0


def _keytap(c, bright=1.0):
    n = ns(0.05)
    t = tt(n)
    y = bp(c.rng.standard_normal(n), 1800, 5500 * bright) * np.exp(-t / 0.006)
    y += 0.6 * np.sin(2 * np.pi * c.rng.uniform(150, 230) * t) * np.exp(-t / 0.012)
    if c.family == "digital":
        y = 0.7 * y + 0.3 * hp(y, 3000) * 2
    elif c.family == "minimal":
        y *= 0.7
    return fades(y, 0.0005, 0.008)


@_register("keytap", anchor="span", role="ui", gain=0.10, rev=0.05, primary="dur", aliases=("typing", "type", "keys", "keyboard", "terminal"),
           doc="key taps across dur (1 beat), ~70 ms apart (fast/terminal: 38 ms, brighter): typing, CLI input")
def _sfx_keytap(c):
    d = max(0.03, c.time("dur", 1.0))
    fast = c.flag("fast", "terminal")
    mean = c.time("gap", "0.038s" if fast else "0.07s")
    bright = 1.4 if fast or c.flag("bright") else 1.0
    items, t = [], 0.0
    pan = c.num("pan_center", 0.35 if not fast else -0.3)
    while t < d:
        items.append((t + (0 if not items else float(c.rng.uniform(-0.006, 0.006))), _keytap(c, bright) * c.rng.uniform(0.6, 1.0), pan + _jit(c, 0.1)))
        t += mean * float(c.rng.uniform(0.7, 1.3))
    return _seq(items)


@_register("enter", role="ui", gain=0.18, rev=0.1, aliases=("return", "submit", "execute", "run"),
           doc="heavier return-key thunk (+ soft beep in digital): command submitted")
def _sfx_enter(c):
    n = ns(0.12)
    t = tt(n)
    y = bp(c.rng.standard_normal(n), 900, 4500) * np.exp(-t / 0.01) + 0.9 * np.sin(2 * np.pi * 110 * t) * np.exp(-t / 0.03)
    items = [(0.0, fades(y, 0.0005, 0.01), 0.0)]
    if c.family == "digital":
        m = ns(0.06)
        items.append((0.03, sine(1760, m) * expenv(m, 0.03) * 0.3, 0.1))
    return _seq(items)


@_register("blips", anchor="span", role="texture", gain=0.12, rev=0.35, dly=0.2, primary="dur", aliases=("data", "data-blips", "compute", "processing", "readout"),
           doc="data blips on a 16th grid across dur (2 beats; fast = 32nds); density= 0..1")
def _sfx_blips(c):
    d = max(0.05, c.time("dur", 2.0))
    step = c.beat / (8 if c.flag("fast") else 4)
    dens = c.num("density", 0.7)
    items, k = [], 0
    while k * step < d - 1e-9:
        if k == 0 or c.rng.random() < dens:
            f = float(mtof(c.pent(int(c.rng.integers(0, 8)), 6) + c.semis()))
            if c.family == "glassy":
                y = fm_bell(f, 0.3, ratio=5.01, index=1.0, idecay=0.02, decay=0.08)
            elif c.family == "organic":
                y = marimba(f * 0.5, 0.2) * 0.8
            elif c.family == "minimal":
                m = ns(0.08)
                y = sine(f, m) * expenv(m, 0.02) * 0.6
            else:
                y = blip_voice(f, 1.0)
            items.append((k * step, y * (1.0 if k % 4 == 0 else 0.7), ((k % 5) - 2) * 0.25))
        k += 1
    return _seq(items)


@_register("blip", role="ui", gain=0.16, rev=0.35, dly=0.2, aliases=("bip", "data-point", "point"),
           doc="one FM data blip in key (step= pentatonic step)")
def _sfx_blip(c):
    f = float(mtof(c.pent(c.num("step", 0), 6) + c.semis()))
    if c.family == "glassy":
        return fm_bell(f, 0.3, ratio=5.01, index=1.0, idecay=0.02, decay=0.1), 0
    if c.family == "organic":
        return marimba(f * 0.5, 0.3), 0
    return blip_voice(f, 1.0 if c.family == "digital" else 0.6), 0


@_register("count", anchor="span", role="ui", gain=0.70, rev=0.15, primary="dur", aliases=("counter", "odometer", "tally", "countup", "count-up"),
           doc="odometer tick roll, fast then slowing over dur (2 beats): number count-ups")
def _sfx_count(c):
    d = max(0.1, c.time("dur", 2.0))
    k_n = int(c.num("n", 42))
    items = []
    for k, x in enumerate((1 - (1 - np.linspace(0, 1, k_n)) ** 5) * d):
        if c.family == "glassy":
            n = ns(0.03)
            t = tt(n)
            f = 2600 + 30 * k
            y = (np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 2.76 * t)) * np.exp(-t / 0.006) * 0.5
        elif c.family == "organic":
            y = _tick_voice(c, k, 10) * 0.5
        else:
            n = ns(0.07)
            ff = 1.3 + k * 0.02
            y = sine(1600 * ff, n) * env_ad(n, 0.001, 0.012) + sine(3200 * ff, n) * env_ad(n, 0.0005, 0.005) * 0.3
            y *= 0.35 * (0.7 if c.family == "minimal" else 1.0)
        items.append((float(x), y * (1 - k / (k_n * 1.5)), 0.0))
    return _seq(items)


@_register("strobe", anchor="span", role="transition", gain=0.25, rev=0.1, aliases=("strobe-ticks", "flashes"),
           doc="one bright tick per strobe flash: n (2) flashes gap apart (0.1 s)")
def _sfx_strobe(c):
    n_, gap = int(c.num("n", 2)), c.time("gap", "0.1s")
    items = []
    for i in range(max(1, n_)):
        n = ns(0.05)
        t = tt(n)
        if c.family == "digital":
            y = hp(c.rng.standard_normal(n), 3000) * np.exp(-t / 0.006) + 0.5 * square(2400, n) * 2 * np.exp(-t / 0.01)
        elif c.family == "organic":
            y = bp(c.rng.standard_normal(n), 1500, 6000) * np.exp(-t / 0.008)
        elif c.family == "minimal":
            y = sine(3000, n) * np.exp(-t / 0.006) * 0.7
        else:
            f = 4200
            y = (np.sin(2 * np.pi * f * t) + 0.6 * np.sin(2 * np.pi * f * 2.76 * t)) * np.exp(-t / 0.01) + 0.4 * hp(c.rng.standard_normal(n), 6000) * np.exp(-t / 0.004)
        items.append((i * gap, fades(y, 0.0003, 0.008), (-0.3 if i % 2 else 0.3)))
    return _seq(items)


def glitch_burst(c, d, gain=1.0, density=1.0, offset=0.0):
    """Random 12-45 ms fragments (square tones, sample-hold noise, chirps), stereo-scattered."""
    rng = c.rng
    items, t = [], 0.0
    while t < d:
        seg = float(rng.uniform(0.012, 0.045))
        if items and rng.random() < 0.15 * (2 - density):   # gaps, but never before the first fragment
            t += seg
            continue
        n = ns(seg)
        kind = int(rng.integers(3))
        if kind == 0:
            y = square(rng.uniform(300, 2400), n) * 0.6 * 2
        elif kind == 1:
            hold = int(rng.integers(8, 40))
            y = np.repeat(rng.standard_normal(n // hold + 1), hold)[:n] * 0.6
        else:
            y = np.sin(2 * np.pi * np.cumsum(np.linspace(rng.uniform(2000, 5000), rng.uniform(100, 600), n)) / SR)
        y = lp(y, 9000)
        if c.family == "digital":
            y = np.round(y * 6) / 6
        elif c.family == "organic":
            y = lp(y, 3500) * 1.2
        items.append((offset + t, fades(y, 0.001, 0.003) * float(rng.uniform(0.5, 1.0)) * gain, float(rng.uniform(-0.7, 0.7))))
        t += seg
    st, _ = _seq(items)
    return st


@_register("glitch", anchor="span", role="transition", gain=0.13, rev=0.1, primary="dur", aliases=("glitches", "corrupt", "datamosh", "static"),
           doc="glitch burst over dur (0.3 s); pre=0.1s starts it before the cue (straddles a cut)")
def _sfx_glitch(c):
    d = max(0.03, c.time("dur", "0.3s"))
    pre = c.time("pre", "0s")
    dens = c.num("density", 1.0)
    if c.family == "minimal":
        items = [(i * d / 4, _tick_voice(c, i, 300), _jit(c, 0.6)) for i in range(4)]
        st, a = _seq(items)
        return st, a
    st = glitch_burst(c, d, 1.0, dens)
    if pre > 0:
        return st, ns(pre)
    return st, 0


@_register("scan", anchor="span", role="texture", gain=0.9, rev=0.4, primary="dur", aliases=("scanner", "sweep-tone", "lens", "radar"),
           doc="falling tremolo scan tone over dur (1 bar): scanners, lenses, HUD sweeps")
def _sfx_scan(c):
    d = max(0.1, c.time("dur", "1bar"))
    n = ns(d)
    p = np.linspace(0, 1, n)
    y = sine(2400 * 2 ** (c.semis() / 12) * 2 ** (-p * 1.2), n) * (0.5 + 0.5 * np.sin(2 * np.pi * 26 * p * d)) * np.sin(np.pi * p) * 0.08
    if c.family == "digital":
        y = 0.8 * y + 0.2 * bitcrush(y * 8, 5, 2) / 8
    elif c.family == "minimal":
        y *= 0.7
    return y, 0


@_register("drawon", anchor="span", role="texture", gain=1.0, rev=0.4, primary="dur", aliases=("draw", "line", "trace", "route", "underline", "stroke"),
           doc="rising tone + scratch over dur (1 beat): lines, routes, charts drawing on")
def _sfx_drawon(c):
    d = max(0.1, c.time("dur", 1.0))
    n = ns(d)
    t = tt(n)
    p = t / d
    tone = sine(520 * 2 ** (c.semis() / 12) * 2.5 ** p, n) * 0.06 * np.sin(np.pi * p)
    scratch = bp(c.rng.standard_normal(n), 2500, 7000) * (0.4 + 0.6 * np.abs(np.sin(2 * np.pi * 9 * t))) * 0.05 * np.sin(np.pi * p)
    if c.family == "organic":
        scratch = bp(c.rng.standard_normal(n), 1500, 5000) * (0.5 + 0.5 * np.abs(np.sin(2 * np.pi * 7 * t))) * 0.07 * np.sin(np.pi * p)
        tone *= 0.4
    elif c.family == "minimal":
        scratch *= 0.3
    return tone + scratch, 0


@_register("downlifter", role="transition", gain=0.4, rev=0.3, primary="dur", aliases=("downsweep", "fall", "drop-sweep", "falloff"),
           doc="falling noise sweep from the cue (dur 1 beat): after a hit, into calm")
def _sfx_downlifter(c):
    d = max(0.15, c.time("dur", 1.0))
    n = ns(d)
    t = tt(n)
    x = sweep_filter(c.rng.standard_normal(n), lambda p: 7000 * 0.05 ** p, "bp", 1.0, 96) * np.exp(-t / d * 3)
    if c.family == "organic":
        x = lp(x, 4000)
    elif c.family == "minimal":
        x *= 0.6
    return np.vstack([x, delay(x, 53)]), 0


@_register("charge", anchor="end", role="build", gain=0.14, rev=0.3, primary="dur", aliases=("charge-up", "powerup", "power-up", "spin-up"),
           doc="charge-up tone rising into the cue (dur 0.32 s)")
def _sfx_charge(c):
    d = max(0.08, c.time("dur", "0.32s"))
    n = ns(d)
    t = tt(n)
    f = 180 * (1500 / 180) ** (t / d) * (1 + 0.02 * np.sin(2 * np.pi * 30 * t))
    y = (sine(f, n) + (0.25 if c.family != "minimal" else 0.0) * saw(f, n)) * (t / d) ** 1.2
    if c.family == "digital":
        y = 0.7 * y + 0.3 * bitcrush(y, 5, 3)
    return lp(y, 6000) * np.clip((d - t) / 0.01, 0, 1), n


@_register("zap", anchor="span", role="accent", gain=0.09, rev=0.4, dly=0.2, primary="dur", aliases=("arc", "packet", "beam", "send-data", "upload"),
           doc="soft upward zap over dur (0.8 s): packets, arcs, beams")
def _sfx_zap(c):
    d = max(0.1, c.time("dur", "0.8s"))
    n = ns(d)
    t = tt(n)
    f = 400 * (2400 / 400) ** ((t / d) ** 1.3) * (1 + 0.015 * np.sin(2 * np.pi * 12 * t)) * 2 ** (c.semis() / 12)
    y = sine(f, n) * np.sin(np.pi * t / d) ** 1.5
    if c.family == "digital":
        y = 0.6 * y + 0.4 * lp(2 * square(f, n), 4000) * np.sin(np.pi * t / d) ** 1.5 * 0.5
    return y, 0


@_register("coin", anchor="span", role="accent", gain=0.07, rev=0.3, primary="dur", aliases=("coins", "cash", "price", "budget"),
           doc="coin ticks every ~75 ms across dur (1.8 beats): prices, budgets, totals")
def _sfx_coin(c):
    d = max(0.05, c.time("dur", 1.8))
    items, t, k = [], 0.0, 0
    while t < d:
        f = float(mtof(96 + (k % 3) * 2 + c.semis()))
        y = fm_bell(f, 0.2, ratio=2.76, index=0.8, idecay=0.01, decay=0.04) if c.family != "digital" else blip_voice(f * 0.5, 1.0)
        items.append((t, y, 0.6))
        t += 0.075 * c.slope + 0.02 * math.sin(k)
        k += 1
    return _seq(items)


@_register("heartbeat", role="impact", gain=0.6, rev=0.15, aliases=("heart", "lubdub", "thump"),
           doc="double thump (lub-dub)")
def _sfx_heartbeat(c):
    n = ns(0.6)
    t = tt(n)
    x = np.zeros(n)
    for dd, a in ((0.0, 1.0), (0.16, 0.7)):
        tq = np.maximum(t - dd, 0)
        x += sine(48 + 30 * np.exp(-tq * 30), n) * np.exp(-tq * 11) * (t >= dd) * a
    return np.tanh(x * 1.5) * 0.8, 0


@_register("pulse", role="accent", gain=0.6, rev=0.5, aliases=("ping-low", "sonar", "hud-pulse"),
           doc="low sine thump with a glassy top: HUD pulses, reveals of a data point")
def _sfx_pulse(c):
    n = ns(2.4)
    t = tt(n)
    y = sine(98, n) * env_ad(n, 0.01, 0.5) * 0.6 + sine(196 * (1 + 0.003 * np.sin(t * 30)), n) * env_ad(n, 0.02, 0.35) * 0.25
    y += bp(c.rng.standard_normal(n), 3000, 8000) * env_ad(n, 0.001, 0.05) * 0.15
    return _release(y, 0.25), 0


@_register("shatter", role="impact", gain=0.8, rev=0.3, aliases=("glass", "break", "smash-glass", "crack"),
           doc="glass shatter (0.5 s spread): breaking a wall / myth")
def _sfx_shatter(c):
    d = c.time("dur", "0.5s")
    n = ns(d + 0.6)
    t = tt(n)
    out = np.zeros(n)
    for _ in range(36):
        i = ns(c.rng.random() * d)
        m = ns(0.18)
        s = sine(1800 + c.rng.random() * 5200, m) * np.exp(-tt(m) * (25 + c.rng.random() * 30)) * (0.3 + 0.7 * c.rng.random())
        out[i:i + m] += s[: n - i]
    nz = hp(c.rng.standard_normal(n), 2500) * np.exp(-t * 6) * 0.25
    down = sweep_filter(c.rng.standard_normal(n), lambda p: 6000 * 0.08 ** min(1, p * n / SR / (d + 0.3)), "bp", 1.1, 96) * np.exp(-t * 2.5) * 0.35
    x = out * 0.25 + nz + down
    return np.vstack([x, np.roll(x, 53)]), 0


@_register("door", anchor="end", role="impact", gain=0.35, rev=0.3, primary="dur", aliases=("gate", "door-swing", "creak"),
           doc="heavy door swing (creak + rumble) that lands its thud ON the cue (dur 0.5 s)")
def _sfx_door(c):
    d = max(0.15, c.time("dur", "0.5s"))
    n = ns(d)
    t = tt(n)
    p = t / d
    creak = stft_sweep(saw(70 + 30 * p ** 3 + 6 * np.sin(2 * np.pi * 23 * t), n), lambda q: 250 * (900 / 250) ** (q ** 2), bw_oct=0.6)
    y = (0.6 * creak + 0.9 * lp(c.rng.standard_normal(n), 180)) * p ** 2.5
    th = _thud(c, 90, 40, 0.15, 0.3, 0.6) * 0.5
    st, _ = _seq([(-d, y, -0.1), (0.0, th, 0.0)])
    return st, n


@_register("click", role="ui", gain=0.35, rev=0.3, aliases=("tap", "press", "button", "ui-click", "select"),
           doc="UI click / tap (tiny, crisp)")
def _sfx_click(c):
    n = ns(0.02)
    f = 1.0 * 2 ** (c.semis() / 12)
    if c.family == "organic":
        y = bp(c.rng.standard_normal(n), 1200, 4000) * env_ad(n, 0.0003, 0.003) + sine(1200 * f, n) * env_ad(n, 0.0002, 0.004) * 0.4
    else:
        y = hp(c.rng.standard_normal(n), 2500 * f) * env_ad(n, 0.0003, 0.0022) + sine(3200 * f, n) * env_ad(n, 0.0002, 0.003) * 0.6
    if c.family == "minimal":
        y *= 0.6
    return fades(y, 0.0002, 0.003), 0


@_register("snap", role="accent", gain=0.30, rev=0.3, aliases=("finger-snap", "flick"),
           doc="finger snap: short bright burst with a body")
def _sfx_snap(c):
    n = ns(0.08)
    t = tt(n)
    y = bp(c.rng.standard_normal(n), 1800, 6000) * np.exp(-t / 0.007) * 1.2 + 0.4 * sine(2100, n) * np.exp(-t / 0.01)
    return fades(y, 0.0003, 0.01), 0


@_register("notify", role="ui", gain=0.18, rev=0.4, dly=0.2, aliases=("message", "ping", "notification", "receive", "incoming"),
           doc="two-note notification (5th -> octave, 90 ms apart): chat message, alert")
def _sfx_notify(c):
    r = c.tonic(5)
    return _chord_notes(c, [r[2], r[3] + 7 if c.flag("up") else r[3]], 0.09, (2.0, 1.2, 0.05, 0.25), d=1.1)


@_register("send", anchor="peak", role="ui", gain=0.2, rev=0.25, aliases=("sent", "outgoing", "post"),
           doc="message sent: short rising swish ending in a soft pop on the cue")
def _sfx_send(c):
    sw, a = _whoosh(c, "0.25s", 0.9, 800, 6000, 0.9, 0.1, 0.4, gain=0.8)
    f1 = float(mtof(c.pent(3, 5)))
    pop = _pop_voice(c, f1 * 0.5, f1, 0.1, 0.03) * 0.8
    st, _ = _seq([(0.0, sw, 0.0), (a / SR, pop, 0.3)])
    return st, a


@_register("hit", role="musical", gain=0.6, rev=0.3, aliases=("accent", "stinger-hit", "punchy"),
           doc="drum hit: kick + noise + clap (musical accent on a beat)")
def _sfx_hit(c):
    n = ns(0.5)
    k = np.array(kick("punch", 3), dtype=float)
    s = np.zeros(n)
    s[: min(n, len(k))] += k[:n] * 0.9
    s += bp(c.rng.standard_normal(n), 900, 5000) * env_ad(n, 0.001, 0.09) * 0.7
    cl = np.zeros(n)
    for j, dt_ in enumerate((0, 0.009, 0.019)):
        i = ns(dt_)
        m = n - i
        cl[i:] += bp(c.rng.standard_normal(m), 1000, 3000) * env_ad(m, 0.0005, 0.025 + j * 0.02)
    return np.tanh((s + cl * 0.5) * 1.3), 0


@_register("sting", role="impact", gain=0.7, rev=0.5, aliases=("logo", "logo-sting", "finale", "brand"),
           doc="logo sting: impact + tonic chord stab + bell cascade in key")
def _sfx_sting(c):
    ip, _ = _sfx_impact(SfxCtx(c.family, c.bpm, c.beats_per_bar, c.slope, c.key_pc, c.mode, {"flags": ["big"]}, c.seed + 7))
    r = c.tonic(4)
    chord = pad([r[0] - 12, r[0], r[2], r[1] + 12, r[0] + 12 + (2 if c.mode in MAJORISH else 3)], 0.6, cutoff=2600, atk=0.005, rel=1.4)
    items = [(0.0, as_stereo(ip, 0) * 0.8, 0.0), (0.0, chord * 2.2, 0.0)]
    for k, m in enumerate((r[0] + 24, r[2] + 24, r[1] + 36)):
        f = float(mtof(m))
        b = fm_bell(f, 3.0, ratio=3.5, index=1.2, idecay=0.1, decay=0.8) if c.family != "digital" else blip_voice(f * 0.5, 1.0)
        items.append((k * 0.06, b * 0.18, (k - 1) * 0.5))
    return _seq(items)


@_register("reveal", role="accent", gain=0.8, rev=0.5, dly=0.2, aliases=("unveil", "appear", "logo-reveal", "ta-da"),
           doc="light reveal: soft shimmer + key chime (lighter than sting)")
def _sfx_reveal(c):
    sh = _shimmer_core(c, 2.6) * 0.6
    ch, _ = _sfx_chime(c)
    return _seq([(0.0, sh, 0.0), (0.02, ch * 0.12, 0.0)])


@_register("roll", anchor="end", role="build", gain=0.5, rev=0.25, primary="dur", aliases=("snare-roll", "drumroll", "fill", "clap-roll"),
           doc="accelerating snare / clap roll that ENDS on the cue (dur 1 beat)")
def _sfx_roll(c):
    d = max(0.1, c.time("dur", 1.0))
    s16 = c.beat / 4
    items, tc = [], 0.0
    while tc < d - 1e-6:
        frac = tc / d
        if c.family in ("glassy", "organic"):
            hit = np.array(clap("pop", len(items) % 4), dtype=float) * 0.6
        elif c.family == "minimal":
            hit = np.array(rim(len(items) % 4), dtype=float) * 0.4
        else:
            hit = np.array(snare("tight", len(items) % 4), dtype=float) * 0.6
        items.append((tc - d, hit * (0.25 + 0.6 * frac), 0.0))
        tc += s16 * (1 - 0.5 * frac)
    st, a = _seq(items)
    return st, a


@_register("drone", anchor="span", role="texture", gain=0.8, rev=0.3, primary="dur", aliases=("tension", "hum", "rumble", "bed"),
           doc="low tension drone on the key root across dur (2 bars)")
def _sfx_drone(c):
    d = max(0.3, c.time("dur", "2bar"))
    n = ns(d)
    p = np.linspace(0, 1, n)
    f = float(mtof(33 + (c.key_pc - 9) % 12))  # key root in A1..G#2
    y = sine(f, n) * 0.25 + lp(saw(f * 1.005, n), 300) * 0.08 + bp(c.rng.standard_normal(n), 200, 600) * 0.02
    env = np.minimum(1, p / 0.15) ** 0.7 * np.clip((1 - p) / 0.1, 0, 1)
    return y * env, 0


def sfx_list(json_out=False):
    rows = []
    for name, d in SFX.items():
        rows.append({"name": name, "anchor": d.anchor, "role": d.role, "primary": d.primary, "aliases": list(d.aliases), "doc": d.doc})
    return rows


# ───────────────────────────── mixer & effects ─────────────────────────────

class Mixer:
    """Stereo buses on a fixed-length timeline. Events are placed by anchor so the anchor sample lands on t."""

    def __init__(self, dur: float):
        self.dur = float(dur)
        self.n = ns(dur)
        self.buses: dict = {}

    def bus(self, name):
        if name not in self.buses:
            self.buses[name] = np.zeros((2, self.n))
        return self.buses[name]

    def add(self, name, sig, t, pan=0.0, gain=1.0, anchor=0, sends=None, fade=(0.001, 0.005)):
        if gain == 0:
            return
        st = as_stereo(sig, pan)
        if fade:
            st = fades(st, *fade)
        i0 = int(round(t * SR)) - int(anchor)
        a, b = max(0, i0), min(self.n, i0 + st.shape[1])
        if b <= a:
            return
        seg = st[:, a - i0:b - i0] * gain
        self.bus(name)[:, a:b] += seg
        for s, g in (sends or {}).items():
            if g:
                self.bus(s)[:, a:b] += seg * g

    def sum(self, names):
        out = np.zeros((2, self.n))
        for k in names:
            if k in self.buses:
                out += self.buses[k]
        return out


def duck_envelope(n, times, depth, release=0.3, attack=0.004, hold=0.03):
    """Sidechain gain (1 = no duck): attack ramp, hold, cosine release; overlapping ducks take the minimum."""
    g = np.ones(n)
    if depth <= 0 or not len(times):
        return g
    tl = np.arange(ns(attack + hold + release)) / SR
    shape = np.where(tl < attack, tl / attack, np.where(tl < attack + hold, 1.0,
                     np.cos(np.clip((tl - attack - hold) / release, 0, 1) * np.pi / 2) ** 2))
    curve = 1 - depth * shape
    for tk in times:
        i0 = int(round(tk * SR))
        if i0 >= n:
            continue
        a = max(0, i0)
        b = min(n, i0 + len(curve))
        g[a:b] = np.minimum(g[a:b], curve[a - i0:b - i0])
    return g


def pingpong(x, delay_s, fb=0.5, taps=6, hp_f=300, lp_f=5500):
    n = x.shape[1]
    out = np.zeros((2, n))
    mono = lp(hp(x.sum(axis=0) * 0.5, hp_f), lp_f)
    for k in range(1, taps + 1):
        s = int(round(k * delay_s * SR))
        if s >= n:
            break
        out[(k + 1) % 2, s:] += (fb ** k) * mono[: n - s]
    return out


@functools.lru_cache(maxsize=16)
def make_ir(size=2.6, seed=7, damp=1.0, predelay=0.018):
    """Synthetic stereo IR: band-split decaying noise (lo/mid/hi decay = size, 0.8 size, 0.37 size / damp)."""
    rng = np.random.default_rng(seed)
    n = ns(size * 1.1)
    t = tt(n)
    irs = []
    for _ in range(2):
        nz = rng.standard_normal(n)
        lo = lp(nz, 700) * np.exp(-t * 6.9 / (size * 0.92))
        mid = bp(nz, 700, 4000) * np.exp(-t * 6.9 / (size * 0.73))
        hi = hp(nz, 4000) * np.exp(-t * 6.9 / max(0.1, size * 0.35 / damp))
        ir = (lo + mid + 0.6 * hi) * np.minimum(1, t / 0.008)
        ir = np.concatenate([np.zeros(ns(predelay)), ir])
        irs.append(_frozen(ir / np.sqrt(np.sum(ir ** 2))))
    return tuple(irs)


def reverb(x, size=2.6, seed=7, damp=1.0, hp_f=220, lp_f=None):
    irL, irR = make_ir(round(float(size), 2), seed, round(float(damp), 2))
    n = x.shape[1]
    mono = hp(x.sum(axis=0) * 0.5, hp_f)
    if lp_f:
        mono = lp(mono, lp_f)
    return np.vstack([signal.fftconvolve(mono, irL)[:n], signal.fftconvolve(mono, irR)[:n]])


def wow(x, depth_ms=1.2, rate=0.55, flutter_ms=0.08, frate=7.3):
    """Tape wow/flutter via a modulated fractional delay (lofi)."""
    n = x.shape[-1]
    t = tt(n)
    d = (depth_ms * (1 + np.sin(2 * np.pi * rate * t)) / 2 + flutter_ms * np.sin(2 * np.pi * frate * t)) * SR / 1000
    idx = np.clip(np.arange(n) - d, 0, n - 1)
    base = np.arange(n)
    if x.ndim == 1:
        return np.interp(idx, base, x)
    return np.vstack([np.interp(idx, base, ch) for ch in x])


# ───────────────────────────── loudness (ITU-R BS.1770-4 / EBU R128) ─────────────────────────────

@functools.lru_cache(maxsize=8)
def _kweight(sr):
    G, Q, fc = 3.999843853973347, 0.7071752369554196, 1681.974450955533
    K = math.tan(math.pi * fc / sr)
    Vh, Vb = 10 ** (G / 20), (10 ** (G / 20)) ** 0.4996667741545416
    a0 = 1 + K / Q + K * K
    b1 = [(Vh + Vb * K / Q + K * K) / a0, 2 * (K * K - Vh) / a0, (Vh - Vb * K / Q + K * K) / a0]
    a1 = [1.0, 2 * (K * K - 1) / a0, (1 - K / Q + K * K) / a0]
    Q2, fc2 = 0.5003270373238773, 38.13547087602444
    K = math.tan(math.pi * fc2 / sr)
    a0 = 1 + K / Q2 + K * K
    b2 = [1.0, -2.0, 1.0]
    a2 = [1.0, 2 * (K * K - 1) / a0, (1 - K / Q2 + K * K) / a0]
    return np.array([b1 + a1, b2 + a2])


def _blocks(x, sr, win, hop):
    x = np.atleast_2d(np.asarray(x, dtype=float))
    k = signal.sosfilt(_kweight(sr), x, axis=-1)
    n = k.shape[1]
    blk, h = int(round(win * sr)), int(round(hop * sr))
    if n < blk:
        return np.array([np.sum(np.mean(k ** 2, axis=1))]) if n else np.array([0.0])
    cs = np.concatenate([np.zeros((k.shape[0], 1)), np.cumsum(k ** 2, axis=1)], axis=1)
    starts = np.arange(0, n - blk + 1, h)
    ms = (cs[:, starts + blk] - cs[:, starts]) / blk
    return ms.sum(axis=0)


def _lk(p):
    return -0.691 + 10 * np.log10(np.maximum(p, 1e-20))


def integrated_lufs(x, sr=SR) -> float:
    """Integrated loudness (LUFS), BS.1770-4: 400 ms blocks, 75 % overlap, -70 LUFS / -10 LU gates."""
    p = _blocks(x, sr, 0.4, 0.1)
    g = p[_lk(p) > -70]
    if not len(g):
        return float("-inf")
    g2 = g[_lk(g) > _lk(g.mean()) - 10]
    return float(_lk(g2.mean()))


def loudness_range(x, sr=SR) -> float:
    """LRA (EBU Tech 3342): 3 s short-term, -70 / -20 LU gates, P95 - P10."""
    p = _blocks(x, sr, 3.0, 0.1)
    l = _lk(p)
    g = p[l > -70]
    if len(g) < 2:
        return 0.0
    lg = _lk(g)
    lg = lg[lg > _lk(g.mean()) - 20]
    return float(np.percentile(lg, 95) - np.percentile(lg, 10)) if len(lg) > 1 else 0.0


def max_momentary(x, sr=SR) -> float:
    return float(_lk(_blocks(x, sr, 0.4, 0.1)).max())


def max_short_term(x, sr=SR) -> float:
    return float(_lk(_blocks(x, sr, 3.0, 0.1)).max())


def _oversampled_abs(ch, chunk=1 << 19, pad=256):
    n = len(ch)
    out = np.empty(n * 4)
    for a in range(0, n, chunk):
        b = min(n, a + chunk)
        lo, hi = max(0, a - pad), min(n, b + pad)
        up = signal.resample_poly(ch[lo:hi], 4, 1)
        out[4 * a:4 * b] = np.abs(up[4 * (a - lo):4 * (a - lo) + 4 * (b - a)])
    return out


def true_peak_db(x, sr=SR) -> float:
    """True peak (dBTP) from 4x oversampling (BS.1770-4 annex 2), chunked for long files."""
    x = np.atleast_2d(np.asarray(x, dtype=float))
    pk = max(float(_oversampled_abs(ch).max()) if ch.size else 0.0 for ch in x)
    return 20 * math.log10(max(pk, 1e-12))


def sample_peak_db(x) -> float:
    return 20 * math.log10(max(float(np.abs(x).max()) if np.size(x) else 0.0, 1e-12))


def measure(x, sr=SR) -> dict:
    return {"lufs": round(integrated_lufs(x, sr), 2), "truePeak": round(true_peak_db(x, sr), 2),
            "samplePeak": round(sample_peak_db(x), 2), "lra": round(loudness_range(x, sr), 2),
            "maxMomentary": round(max_momentary(x, sr), 2), "duration": round(np.atleast_2d(x).shape[1] / sr, 4)}


# ───────────────────────────── dynamics & mastering ─────────────────────────────

def bus_comp(x, thr_db=-18.0, ratio=1.8, rel=0.18):
    lvl = np.sqrt(uniform_filter1d((x ** 2).mean(axis=0), max(1, int(0.01 * SR))) + 1e-12)
    over = np.maximum(0, 20 * np.log10(lvl) - thr_db)
    a = math.exp(-1 / (rel * SR))
    sm = signal.lfilter([1 - a], [1, -a], -over * (1 - 1 / ratio))
    return x * 10 ** (sm / 20)


def tp_limiter(x, ceil_db=-1.5, look=0.003, release=0.06):
    """Look-ahead true-peak limiter: 4x-oversampled peak envelope -> min filter -> release-smoothed gain."""
    ceil = 10 ** (ceil_db / 20)
    n = x.shape[1]
    up = np.max([_oversampled_abs(ch) for ch in x], axis=0)
    pk = up.reshape(-1, 4).max(axis=1)[:n]
    g = np.minimum(1.0, ceil / np.maximum(pk, 1e-9))
    w = max(1, int(look * SR)) | 1
    gmin = uniform_filter1d(minimum_filter1d(g, size=2 * w + 1), size=w)
    gmin = np.minimum(gmin, g)
    B = 32
    nb = (n + B - 1) // B
    gb = np.pad(gmin, (0, nb * B - n), constant_values=1.0).reshape(nb, B).min(axis=1)
    coef = 1 - math.exp(-B / (release * SR))
    sm = np.empty(nb)
    cur = 1.0
    for i, v in enumerate(gb):
        cur = v if v < cur else cur + (v - cur) * coef
        sm[i] = cur
    gs = uniform_filter1d(np.repeat(sm, B)[:n], size=B)
    return x * np.minimum(gs, gmin)


def master(x, lufs=-14.0, tp=-1.0, *, margin=0.5, comp=True, lowcut=0.0, fade_in=0.0, fade_out=0.3, iterations=5):
    """Mastering chain -> (audio, stats): HP 25 Hz, optional low-shelf cut, glue compression, iterative
    loudness normalisation + soft clip + look-ahead true-peak limiting to (tp - margin) dBTP."""
    x = hp(np.atleast_2d(np.asarray(x, dtype=float)), 25)
    if lowcut:
        x = x - lowcut * lp(x, 100)
    if comp:
        pk = np.abs(x).max()
        if pk > 0:
            x = bus_comp(x / pk * 0.5, thr_db=-18, ratio=1.8)
    ceil = tp - margin
    knee = min(0.98, 10 ** ((ceil + 0.4) / 20))
    for _ in range(iterations):
        cur = integrated_lufs(x)
        if not math.isfinite(cur):
            break
        x = x * 10 ** ((lufs - cur) / 20)
        x = softclip(x, knee)
        x = tp_limiter(x, ceil)
    n = x.shape[1]
    if fade_in > 0:
        k = min(n, ns(fade_in))
        x[:, :k] *= np.sin(np.linspace(0, np.pi / 2, k)) ** 2
    if fade_out > 0:
        k = min(n, ns(fade_out))
        x[:, n - k:] *= np.cos(np.linspace(0, np.pi / 2, k)) ** 2
    x -= x.mean(axis=1, keepdims=True)
    tpv = true_peak_db(x)
    if tpv > ceil + 0.05:  # guard against a residual overshoot (fades / DC shift)
        x *= 10 ** ((ceil - tpv) / 20)
    return x, {"lufs": round(integrated_lufs(x), 2), "truePeak": round(true_peak_db(x), 2), "lra": round(loudness_range(x), 2)}


def normalize_lufs(x, target=-20.0, peak_max_db=-1.0):
    """Gain-only loudness normalisation (no limiting); the gain is capped so the sample peak stays <= peak_max_db."""
    cur = integrated_lufs(x)
    if not math.isfinite(cur):
        return x, 0.0
    g = target - cur
    pk = sample_peak_db(x)
    g = min(g, peak_max_db - pk)
    return x * 10 ** (g / 20), g


# ───────────────────────────── I/O ─────────────────────────────

def write_wav(path, x, bits=24):
    """(2, n) or (n,) float -> WAV. bits: 16 | 24 (PCM) | 32 (float)."""
    x = np.atleast_2d(np.asarray(x, dtype=float))
    os.makedirs(os.path.dirname(os.path.abspath(path)) or ".", exist_ok=True)
    if bits == 32:
        from scipy.io import wavfile
        wavfile.write(path, SR, x.T.astype(np.float32))
        return path
    full = 2 ** (bits - 1) - 1
    pcm = np.ascontiguousarray(np.clip(np.round(x.T * full), -full - 1, full).astype("<i4"))
    if bits == 16:
        data = pcm.astype("<i2").tobytes()
    else:
        data = pcm.view(np.uint8).reshape(-1, 4)[:, :3].tobytes()
    with wave.open(path, "wb") as w:
        w.setnchannels(x.shape[0])
        w.setsampwidth(bits // 8)
        w.setframerate(SR)
        w.writeframes(data)
    return path


def ffmpeg_bin():
    exe = shutil.which("ffmpeg")
    if not exe:
        raise RuntimeError("ffmpeg not found on PATH")
    return exe


def read_audio(path, sr=SR):
    """Any audio/video file -> float64 (2, n) at sr. WAV at sr is read directly; everything else via ffmpeg."""
    if str(path).lower().endswith(".wav"):
        try:
            from scipy.io import wavfile
            r, d = wavfile.read(path)
            if r == sr:
                if d.dtype == np.int16:
                    x = d.astype(float) / 32768.0
                elif d.dtype == np.int32:
                    x = d.astype(float) / 2147483648.0
                elif d.dtype == np.uint8:
                    x = (d.astype(float) - 128) / 128.0
                else:
                    x = d.astype(float)
                x = np.atleast_2d(x.T) if x.ndim > 1 else np.vstack([x, x])
                return x if x.shape[0] == 2 else np.vstack([x[0], x[0]])
        except Exception:
            pass
    r = subprocess.run([ffmpeg_bin(), "-v", "error", "-i", str(path), "-vn", "-f", "f32le", "-acodec", "pcm_f32le",
                        "-ac", "2", "-ar", str(sr), "-"], capture_output=True, check=True)
    return np.frombuffer(r.stdout, dtype="<f4").reshape(-1, 2).T.astype(float)


@functools.lru_cache(maxsize=1)
def best_aac_encoder():
    """aac_at (Apple AudioToolbox) when this ffmpeg has it, else ffmpeg's native aac."""
    try:
        out = subprocess.run([ffmpeg_bin(), "-hide_banner", "-encoders"], capture_output=True, text=True).stdout
        if re.search(r"^\s*A\S*\s+aac_at\b", out, re.M):
            return "aac_at"
    except Exception:
        pass
    return "aac"


def encode_aac(src, out, bitrate="192k", tp=-1.0, encoder=None, max_iter=4, faststart=True):
    """WAV -> AAC (.m4a), then decode and re-measure: if the codec pushed the true peak above tp, trim the
    gain and re-encode. Returns {encoder, bitrate, volumeDb, truePeak, lufs}."""
    enc = encoder or best_aac_encoder()
    vol, rep = 0.0, {}
    for _ in range(max_iter):
        cmd = [ffmpeg_bin(), "-y", "-v", "error", "-i", str(src)]
        if abs(vol) > 1e-9:
            cmd += ["-af", f"volume={vol:.3f}dB"]
        cmd += ["-c:a", enc, "-b:a", str(bitrate)]
        if faststart:
            cmd += ["-movflags", "+faststart"]
        subprocess.run(cmd + [str(out)], check=True)
        y = read_audio(out)
        tpv = true_peak_db(y)
        rep = {"encoder": enc, "bitrate": str(bitrate), "volumeDb": round(vol, 2), "truePeak": round(tpv, 2),
               "lufs": round(integrated_lufs(y), 2), "duration": round(y.shape[1] / SR, 4)}
        if tpv <= tp - 0.02:
            break
        vol -= (tpv - tp) + 0.15
    return rep


# ───────────────────────────── spectrogram images ─────────────────────────────

_CMAP = np.array([[0, 0, 4], [40, 11, 84], [101, 21, 110], [159, 42, 99], [212, 72, 66], [245, 125, 21],
                  [250, 193, 39], [252, 255, 164]], dtype=float)


def _colormap(v):
    v = np.clip(v, 0, 1) * (len(_CMAP) - 1)
    i = np.minimum(v.astype(int), len(_CMAP) - 2)
    f = (v - i)[..., None]
    return (_CMAP[i] * (1 - f) + _CMAP[i + 1] * f).astype(np.uint8)


def _spec_db(seg, px_per_sec, height, fmin, fmax):
    """Mono segment -> (dB matrix [height x cols], hop seconds) on a log-frequency axis."""
    hop = max(16, int(SR / px_per_sec))
    nper = 2048
    if len(seg) < nper:
        seg = np.pad(seg, (0, nper - len(seg)))
    f, _, Z = signal.stft(seg, fs=SR, nperseg=nper, noverlap=nper - hop, boundary="zeros")
    rows = np.geomspace(fmin, fmax, height)[::-1]
    idx = np.clip(np.searchsorted(f, rows), 0, len(f) - 1)
    return 20 * np.log10(np.abs(Z[idx, :]) + 1e-9), hop / SR, rows


def spectrogram_png(x, path, *, t0=0.0, t1=None, px_per_sec=160, height=300, fmin=30.0, fmax=16000.0, marks=(),
                    bars=(), labels=None, title=None, env=None, soft_marks=()):
    """Log-frequency spectrogram + waveform strip as PNG. marks: cue times (red), soft_marks (orange),
    bars: bar lines (grey), labels {time: text}, env: curve drawn over the waveform. Lets a model *see* sync,
    clicks, gaps and section changes."""
    from PIL import Image, ImageDraw
    x = np.atleast_2d(np.asarray(x, dtype=float))
    mono = x.mean(axis=0)
    a = max(0, int(t0 * SR))
    b = len(mono) if t1 is None else min(len(mono), int(t1 * SR))
    seg = mono[a:b]
    S, hop_s, rows = _spec_db(seg, px_per_sec, height, fmin, fmax)
    top = np.percentile(S, 99.7)
    img = _colormap((S - (top - 80)) / 80)
    W = img.shape[1]
    wave_h = 70
    canvas = Image.new("RGB", (W + 50, height + wave_h + 34), (16, 16, 20))
    canvas.paste(Image.fromarray(img), (50, 20))
    d = ImageDraw.Draw(canvas)
    dur = (b - a) / SR
    y0 = height + 24
    if len(seg):
        cols = np.array_split(np.abs(seg), max(1, W))
        for i, ccol in enumerate(cols):
            h = int(min(1.0, float(ccol.max()) if len(ccol) else 0.0) * (wave_h - 4) / 2)
            d.line([(50 + i, y0 + wave_h / 2 - h), (50 + i, y0 + wave_h / 2 + h)], fill=(120, 200, 255))
    for fr in (100, 1000, 10000):
        r = int(np.argmin(np.abs(rows - fr)))
        d.text((4, 20 + r - 6), f"{fr // 1000}k" if fr >= 1000 else f"{fr}", fill=(200, 200, 200))
    xof = lambda tm: 50 + int(round((tm - t0) / hop_s))
    for tm in bars:
        if t0 <= tm <= t0 + dur:
            d.line([(xof(tm), 20), (xof(tm), height + 20 + wave_h + 4)], fill=(110, 110, 120))
    for tm in soft_marks:
        if t0 <= tm <= t0 + dur:
            d.line([(xof(tm), 14), (xof(tm), height + 20 + wave_h + 4)], fill=(255, 170, 40))
    for tm in marks:
        if t0 <= tm <= t0 + dur:
            d.line([(xof(tm), 14), (xof(tm), height + 20 + wave_h + 4)], fill=(255, 60, 60))
    if env is not None and len(env):
        ev = np.asarray(env, dtype=float)
        ev = ev / (ev.max() + 1e-9)
        pts = [(xof(t0 + k * dur / len(ev)), y0 + wave_h - 2 - int(v * (wave_h - 6))) for k, v in enumerate(ev)]
        d.line(pts, fill=(255, 220, 90))
    for tm, txt in (labels or {}).items():
        if t0 <= tm <= t0 + dur:
            d.text((xof(tm) + 2, 2), str(txt)[:24], fill=(255, 210, 210))
    step = next(s_ for s_ in (0.1, 0.25, 0.5, 1.0, 2.0, 5.0, 10.0) if dur / s_ <= 16)
    k = math.ceil(t0 / step) * step
    while k <= t0 + dur + 1e-9:
        d.text((xof(k) - 6, height + wave_h + 22), f"{k:g}", fill=(170, 170, 170))
        k += step
    if title:
        d.text((52, 2) if not labels else (52, height + wave_h + 22 - 12), title[:140], fill=(240, 240, 240))
    canvas.save(path)
    return path


def spectrogram_grid(items, path, *, cols=6, cell_sec=2.5, px_per_sec=90, height=140, fmin=40.0, fmax=16000.0,
                     title=None):
    """items: [(label, stereo|mono, mark_s)] -> one PNG grid, one cell per sound, shared dB scale (relative
    loudness is visible), red line at each mark (the cue / anchor time)."""
    from PIL import Image, ImageDraw
    cells = []
    for label, sig, mark in items:
        mono = np.atleast_2d(np.asarray(sig, dtype=float)).mean(axis=0)[: ns(cell_sec)]
        mono = np.pad(mono, (0, max(0, ns(cell_sec) - len(mono))))
        S, hop_s, _ = _spec_db(mono, px_per_sec, height, fmin, fmax)
        cells.append((label, S, hop_s, mark, mono))
    top = max(np.percentile(S, 99.9) for _, S, _, _, _ in cells) if cells else 0
    cw = cells[0][1].shape[1] if cells else 10
    wave_h, lab_h, pad_ = 36, 14, 6
    rows_n = (len(cells) + cols - 1) // cols
    H = rows_n * (height + wave_h + lab_h + pad_) + (18 if title else 0)
    canvas = Image.new("RGB", (cols * (cw + pad_), H), (16, 16, 20))
    d = ImageDraw.Draw(canvas)
    oy = 18 if title else 0
    if title:
        d.text((4, 3), title[:160], fill=(240, 240, 240))
    for i, (label, S, hop_s, mark, mono) in enumerate(cells):
        cx, cy = (i % cols) * (cw + pad_), oy + (i // cols) * (height + wave_h + lab_h + pad_)
        canvas.paste(Image.fromarray(_colormap((S - (top - 75)) / 75)), (cx, cy + lab_h))
        d.text((cx + 2, cy), str(label)[:28], fill=(230, 230, 230))
        segs = np.array_split(np.abs(mono), cw)
        y0 = cy + lab_h + height + wave_h / 2
        for k, sg in enumerate(segs):
            h = int(min(1.0, float(sg.max()) * 1.5 if len(sg) else 0.0) * (wave_h - 4) / 2)
            d.line([(cx + k, y0 - h), (cx + k, y0 + h)], fill=(120, 200, 255))
        if mark is not None and 0 <= mark <= cell_sec:
            mx = cx + int(mark / hop_s)
            d.line([(mx, cy + lab_h), (mx, cy + lab_h + height + wave_h)], fill=(255, 60, 60))
    canvas.save(path)
    return path


# ───────────────────────────── CLI ─────────────────────────────

def _cli_list(a):
    if a.json:
        print(json.dumps({"families": FAMILIES, "sfx": sfx_list(), "instruments": INSTRUMENTS}, indent=1))
        return 0
    print("SFX families:", ", ".join(FAMILIES))
    print("\nSFX (anchor = where the cue time lands: onset | peak | end | span-start):")
    for r in sfx_list():
        al = f"  [{', '.join(r['aliases'])}]" if r["aliases"] else ""
        print(f"  {r['name']:<11} {r['anchor']:<5} {r['role']:<10} {r['doc']}{al}")
    print("\nInstruments (style.sound.instruments):")
    for k, v in INSTRUMENTS.items():
        print(f"  {k:<10} {v}")
    return 0


def _cli_sfx(a):
    layers = parse_sfx(a.spec)
    kp = pitch_class(a.key)
    parts = []
    for i, (nm, p) in enumerate(layers):
        st, anc, d, _ = render_sfx(nm, p, family=a.family, bpm=a.bpm, key_pc=kp, mode=a.mode, seed=seed_of(a.spec, i))
        parts.append((st, anc))
    pre = max(anc for _, anc in parts)
    n = max(pre - anc + st.shape[1] for st, anc in parts) + ns(0.3)
    out = np.zeros((2, n + ns(0.2)))
    for st, anc in parts:
        out[:, ns(0.2) + pre - anc: ns(0.2) + pre - anc + st.shape[1]] += st
    out = fades(out, 0.001, 0.02)
    write_wav(a.out, out * 0.9 / max(1e-9, np.abs(out).max()) if a.normalize else out, 24)
    print(json.dumps({"out": a.out, "cueAt": round((ns(0.2) + pre) / SR, 4), **measure(out)}))
    return 0


def _cli_inst(a):
    notes = [note_midi(s) for s in a.notes.split(",")] if a.notes else [60, 64, 67]
    k = canonical_instrument(a.name) or a.name
    if k in ("pad",):
        out = pad(notes, a.dur)
    elif k == "strings":
        out = strings(notes, a.dur)
    elif k in ("bass", "saw-bass", "sub"):
        fn = {"bass": bass_round, "saw-bass": bass_saw, "sub": sub}[k]
        out = np.concatenate([fn(m - 24, a.dur / len(notes)) for m in notes])
    elif k in ("piano", "epiano"):
        fn = piano if k == "piano" else epiano
        segs = [np.asarray(fn(m, a.dur / len(notes)), dtype=float) for m in notes]
        out = np.concatenate(segs)
    elif k in ("kick", "clap", "snare", "hats", "shaker", "toms", "rim"):
        fn = {"kick": lambda: kick(), "clap": lambda: clap(), "snare": lambda: snare(), "hats": lambda: hat(),
              "shaker": lambda: shaker(), "toms": lambda: tom(), "rim": lambda: rim()}[k]
        out = np.asarray(fn(), dtype=float)
    else:
        kind = {"pluck": "mix", "arp": "mix", "marimba": "marimba", "bell": "bell", "glass": "glass", "saw-pluck": "saw",
                "lead": "saw"}.get(k, "mix")
        out = np.concatenate([np.asarray(pluck(m, kind), dtype=float) for m in notes])
    write_wav(a.out, as_stereo(out) * 0.9 / max(1e-9, np.abs(out).max()), 24)
    print(a.out)
    return 0


def _audition_render(name, fam, bpm, key, mode, params=None, pre=0.15):
    st, anc, d, _ = render_sfx(name, params or {}, family=fam, bpm=bpm, key_pc=pitch_class(key), mode=mode,
                               seed=seed_of(name, fam))
    p0 = max(ns(pre), anc + ns(0.05)) if d.anchor in ("end", "peak") else ns(pre)
    out = np.zeros((2, st.shape[1] + p0 - anc + ns(0.15)))
    out[:, p0 - anc:p0 - anc + st.shape[1]] += st
    return out, p0 / SR, d


def _cli_audition(a):
    os.makedirs(a.dir, exist_ok=True)
    fams = [f for f in a.families.split(",") if f in FAMILIES]
    names = [sfx_canonical(n) for n in a.only.split(",")] if a.only else list(SFX)
    index = []
    for fam in fams:
        cells = []
        for name in names:
            out, at, d = _audition_render(name, fam, a.bpm, a.key, a.mode)
            p = os.path.join(a.dir, f"{fam}-{name}.wav")
            if not a.no_wav:
                write_wav(p, out, 24)
            index.append({"family": fam, "sfx": name, "file": os.path.basename(p), "anchor": d.anchor,
                          "anchorAt": round(at, 4), **measure(out)})
            cells.append((f"{name} ({d.anchor})", out, at))
        spectrogram_grid(cells, os.path.join(a.dir, f"grid-{fam}.png"), cols=a.cols, cell_sec=a.cell,
                         title=f"SFX family {fam} @ {a.bpm:g} BPM, key {a.key} {a.mode} (red = cue time)")
    with open(os.path.join(a.dir, "index.json"), "w") as f:
        json.dump(index, f, indent=1)
    print(f"{len(index)} sounds -> {a.dir} (grid-<family>.png, index.json)")
    return 0


def _cli_calibrate(a):
    """Measure every SFX x family at default parameters and print FAMILY_TRIM_DB (glassy = reference)."""
    table = {}
    for name in SFX:
        lv = {}
        for fam in FAMILIES:
            st, anc, d, c = render_sfx(name, {}, family=fam, bpm=120, key_pc=5, mode="major", seed=seed_of(name, fam))
            raw = st / (d.gain * 10 ** (FAMILY_TRIM_DB.get(name, {}).get(fam, 0.0) / 20.0))
            lv[fam] = max_momentary(np.pad(raw, ((0, 0), (0, ns(0.5)))))
        row = {}
        for fam in FAMILIES[1:]:
            want = lv["glassy"] - (2.5 if fam == "minimal" else 0.0)
            tr = float(np.clip(want - lv[fam], -12, 12))
            if abs(tr) >= 0.5:
                row[fam] = round(tr, 1)
        if row:
            table[name] = row
    print("FAMILY_TRIM_DB: dict = {")
    for k, v in table.items():
        print(f'    "{k}": {json.dumps(v)},')
    print("}")
    return 0


def _cli_loudness(a):
    for p in a.files:
        x = read_audio(p)
        print(json.dumps({"file": os.path.basename(p), **measure(x)}))
    return 0


def _cli_master(a):
    x = read_audio(a.inp)
    y, st = master(x, a.lufs, a.tp, margin=a.margin, lowcut=a.lowcut, fade_out=a.fade_out)
    write_wav(a.out, y, 24)
    print(json.dumps({"out": a.out, **st}))
    return 0


def _cli_encode(a):
    rep = encode_aac(a.inp, a.out, a.bitrate, a.tp)
    print(json.dumps({"out": a.out, **rep}))
    return 0


def _cli_spec(a):
    x = read_audio(a.inp)
    marks = [float(v) for v in a.marks.split(",")] if a.marks else []
    spectrogram_png(x, a.out, t0=a.t0, t1=a.t1, marks=marks, px_per_sec=a.pps, title=os.path.basename(a.inp))
    print(a.out)
    return 0


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sp = ap.add_subparsers(dest="cmd", required=True)
    p = sp.add_parser("list")
    p.add_argument("--json", action="store_true")
    p.set_defaults(fn=_cli_list)
    p = sp.add_parser("sfx")
    p.add_argument("spec")
    p.add_argument("--family", default="glassy", choices=FAMILIES)
    p.add_argument("--bpm", type=float, default=120)
    p.add_argument("--key", default="F")
    p.add_argument("--mode", default="major")
    p.add_argument("--normalize", action="store_true")
    p.add_argument("--out", required=True)
    p.set_defaults(fn=_cli_sfx)
    p = sp.add_parser("inst")
    p.add_argument("name")
    p.add_argument("--notes", default="")
    p.add_argument("--dur", type=float, default=1.5)
    p.add_argument("--out", required=True)
    p.set_defaults(fn=_cli_inst)
    p = sp.add_parser("audition")
    p.add_argument("dir")
    p.add_argument("--families", default=",".join(FAMILIES))
    p.add_argument("--only", default="", help="comma-separated SFX names")
    p.add_argument("--bpm", type=float, default=120)
    p.add_argument("--key", default="F")
    p.add_argument("--mode", default="major")
    p.add_argument("--cols", type=int, default=8)
    p.add_argument("--cell", type=float, default=2.5, help="seconds per grid cell")
    p.add_argument("--no-wav", action="store_true")
    p.set_defaults(fn=_cli_audition)
    p = sp.add_parser("calibrate")
    p.set_defaults(fn=_cli_calibrate)
    p = sp.add_parser("loudness")
    p.add_argument("files", nargs="+")
    p.set_defaults(fn=_cli_loudness)
    p = sp.add_parser("master")
    p.add_argument("inp")
    p.add_argument("out")
    p.add_argument("--lufs", type=float, default=-14.0)
    p.add_argument("--tp", type=float, default=-1.0)
    p.add_argument("--margin", type=float, default=0.5)
    p.add_argument("--lowcut", type=float, default=0.0)
    p.add_argument("--fade-out", type=float, default=0.3)
    p.set_defaults(fn=_cli_master)
    p = sp.add_parser("encode")
    p.add_argument("inp")
    p.add_argument("out")
    p.add_argument("--bitrate", default="192k")
    p.add_argument("--tp", type=float, default=-1.0)
    p.set_defaults(fn=_cli_encode)
    p = sp.add_parser("spectrogram")
    p.add_argument("inp")
    p.add_argument("--out", required=True)
    p.add_argument("--t0", type=float, default=0.0)
    p.add_argument("--t1", type=float, default=None)
    p.add_argument("--marks", default="")
    p.add_argument("--pps", type=int, default=160)
    p.set_defaults(fn=_cli_spec)
    a = ap.parse_args(argv)
    return a.fn(a)


if __name__ == "__main__":
    sys.exit(main())
