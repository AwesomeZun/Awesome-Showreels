#!/usr/bin/env python3
"""Music + SFX for one cut, arranged on the fixed-BPM bar grid of P/build/cut-<cut>.json.

Reads P/reel.config.json, P/style.json ("sound") and P/build/cut-<cut>.json (from timing/plan_cut.py). Builds the
song section by section (intro | groove | breakdown | drop | outro, any number of bars each) at the cut's BPM:
voice-led chords in the style's key and mode, preset grooves, risers / fills into changes, a final hit, and every
cue's SFX placed by its anchor (onset, peak or end on the cue time). A longer cut of the same reel is more bars of
the same song at the same BPM. Deterministic: identical inputs give identical samples.

Usage:
  python3 arrange.py --project P --cut 30                 # build/music-30.wav (24-bit), .m4a (AAC 256k, for the MP4),
                                                          # -embed.m4a (96k, for the HTML) and .json (sidecar)
  python3 arrange.py --project P --cut 30 --stem          # unmastered music + SFX bed for narration/mix_vo.py:
                                                          # build/music-30-stem.wav/.json (the song files stay)
  python3 arrange.py --project P --cut 30 --stems         # also build/stems/30-music.wav and 30-sfx.wav
  python3 arrange.py --project P --cut 30 --scale 1.5     # comprehension slow-down: re-synthesized at BPM / 1.5
  python3 arrange.py --project P --cut 30 --warp "0:0,8:8,56:32"   # piecewise warp (output:scene seconds);
                                                          # music re-arranged on the output timeline at the same BPM
Options: --preset NAME, --no-transition-sfx, --no-sfx, --no-music, --seed N, --lufs -14, --tp -1, --bitrate 256k,
         --embed-bitrate 96k (0 = skip), --out BASE, --quiet

Optional reel.config.json "audio" block: {"preset", "transitionSfx": true, "musicDb": 0, "sfxDb": 0, "seed",
"finalHit": "outro" | "lastBar" | "none" | <bar>, "outroMaxBars": 3 (a longer outro keeps a 2-bar ring-out and the
previous section carries the rest), "dropGap": bool, "swing": 0..0.3, "tweaks": {preset keys}}.
Exit codes: 0 ok, 1 bad input, 2 a cue names an unknown SFX or cannot be rendered (the rest is still rendered).
"""
from __future__ import annotations

import argparse
import copy
import json
import math
import os
import re
import sys
import time

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.dont_write_bytecode = True   # keep the skill folder free of __pycache__
import synth as S  # noqa: E402

PARTS = ("intro", "groove", "breakdown", "drop", "outro")
PART_ALIASES = {"verse": "groove", "build": "groove", "lift": "groove", "main": "groove", "chorus": "drop", "hook": "drop",
                "dropa": "drop", "dropb": "drop", "climax": "drop", "slam": "drop", "payoff": "drop", "bridge": "breakdown",
                "break": "breakdown", "tension": "breakdown", "end": "outro", "ending": "outro", "finale": "outro",
                "logo": "outro", "open": "intro", "opening": "intro"}
ENERGY_DEFAULT = {"intro": 0.3, "groove": 0.65, "breakdown": 0.35, "drop": 1.0, "outro": 0.45}
REF_MUSIC_LUFS = -14.3      # music bus level before SFX are added (K-BeautyGate balance); SFX gains are calibrated to it
STEM_LUFS = -18.0           # unmastered stem level (sample peak capped at -1 dBFS)

MODES = {"major": (0, 2, 4, 5, 7, 9, 11), "minor": (0, 2, 3, 5, 7, 8, 10), "dorian": (0, 2, 3, 5, 7, 9, 10),
         "mixolydian": (0, 2, 4, 5, 7, 9, 10), "lydian": (0, 2, 4, 6, 7, 9, 11), "phrygian": (0, 1, 3, 5, 7, 8, 10),
         "aeolian": (0, 2, 3, 5, 7, 8, 10), "ionian": (0, 2, 4, 5, 7, 9, 11), "locrian": (0, 1, 3, 5, 6, 8, 10)}
BASE_MODE = {"major": "major", "ionian": "major", "lydian": "major", "mixolydian": "major", "minor": "minor",
             "aeolian": "minor", "dorian": "minor", "phrygian": "minor", "locrian": "minor"}

# ───────────────────────────── presets (parameter bundles; style.sound and "tweaks" override) ─────────────────────────────
# Chord symbols: roman numeral on the mode's scale (upper = major, lower = minor), optional b/#, ":quality".

PRESETS = {
    "bright-pop": {
        "bpm": 120, "key": "F", "mode": "major", "drums": "full", "sfx": "glassy",
        "energy": {"intro": 0.3, "groove": 0.7, "breakdown": 0.35, "drop": 1.0, "outro": 0.45},
        "instruments": ["pad", "pluck", "bell", "bass", "kick", "clap", "hats", "shaker"],
        "roles": {"bed": "pad", "motion": "pluck", "bass": "bass", "top": "bell", "motif": "bell"},
        "chordBars": 1,
        "prog": {"major": {"intro": ["I:maj9", "vi:m9"], "groove": ["IV:maj7", "V:6", "iii:m7", "vi:m7"],
                           "breakdown": ["vi:madd9", "IV:maj7", "ii:m9", "V:7sus4"],
                           "drop": ["I:maj7", "V:6", "IV:maj7", "V"], "outro": ["I:maj9"]},
                 "minor": {"intro": ["i:m9", "VI:maj7"], "groove": ["VI:maj7", "VII", "v:m7", "i:m7"],
                           "breakdown": ["iv:m9", "VI:maj7", "VII:sus4", "VII"],
                           "drop": ["i:m9", "VI:maj7", "III:maj7", "VII"], "outro": ["i:m9"]}},
        "cadence": {"major": "V:7sus4", "minor": "VII"}, "final": {"major": "I:maj9", "minor": "i:m9"},
        "pad": {"cut": (500, 4200), "gain": 0.14, "atk": 0.08, "introAtk": 0.6},
        "pluck": "mix", "bassPattern": "offbeat", "motionPattern": "arp16", "topPattern": "octave",
        "arp": [0, 2, 4, 1, 3, 5, 2, 4, 6, 3, 5, 1, 4, 2, 5, 3],
        "kit": {"kick": "pop", "clap": "pop", "snare": None, "hats": "bright", "rim": False, "shaker": True, "toms": False},
        "grooves": "four", "swing": 0.0, "dropGap": False, "fill": "clap",
        "sidechain": {"bed": 0.55, "bass": 0.7, "motion": 0.3, "top": 0.3},
        "delay": {"beats": 0.75, "fb": 0.5, "taps": 6}, "reverb": {"size": 2.6, "damp": 1.0, "ret": 0.55},
        "levels": {"bed": 1.0, "bass": 1.0, "motion": 1.0, "top": 1.0, "motif": 1.0, "drums": 1.0},
        "lowcut": 0.6, "tape": False, "riser": "glassy",
    },
    "chiptune": {
        "bpm": 144, "key": "D", "mode": "major", "drums": "full", "sfx": "digital",
        "energy": {"intro": 0.4, "groove": 0.75, "breakdown": 0.45, "drop": 1.0, "outro": 0.55},
        "instruments": ["pulse", "tri-bass", "pulse-lead", "kick", "snare", "hats"],
        "roles": {"bed": None, "motion": "pulse", "bass": "tri-bass", "top": None, "motif": "pulse-lead"},
        "chordBars": 1,
        "prog": {"major": {"intro": ["I", "VII"], "groove": ["I", "VII", "IV", "I"], "breakdown": ["vi:m", "IV", "VII", "V"],
                           "drop": ["I", "VII", "IV", "V"], "outro": ["I"]},
                 "minor": {"intro": ["i", "VII"], "groove": ["i", "VI", "VII", "i"], "breakdown": ["iv:m", "VI", "VII", "V"],
                           "drop": ["i", "VI", "VII", "V"], "outro": ["i"]}},
        "cadence": {"major": "V", "minor": "V"}, "final": {"major": "I", "minor": "i"},
        "pad": {"cut": (500, 4200), "gain": 0.0, "atk": 0.01, "introAtk": 0.01},
        "pluck": "mix", "bassPattern": "offbeat", "motionPattern": "arp16", "topPattern": "octave",
        "arp": [0, 1, 2, 3, 2, 1, 0, 1, 2, 3, 4, 3, 2, 1, 2, 3],
        "kit": {"kick": "chip", "clap": None, "snare": "chip", "hats": "chip", "rim": False, "shaker": False, "toms": False},
        "grooves": "four", "swing": 0.0, "dropGap": True, "fill": "snare",
        "sidechain": {"bed": 0.0, "bass": 0.0, "motion": 0.0, "top": 0.0},
        "delay": {"beats": 0.75, "fb": 0.0, "taps": 0}, "reverb": {"size": 0.6, "damp": 1.0, "ret": 0.0},
        "levels": {"bed": 0.0, "bass": 1.2, "motion": 0.85, "top": 0.0, "motif": 1.15, "drums": 1.0},
        "lowcut": 0.0, "tape": False, "riser": "digital",
    },
    "dark-synth": {
        "bpm": 128, "key": "D", "mode": "minor", "drums": "full", "sfx": "digital",
        "energy": {"intro": 0.35, "groove": 0.75, "breakdown": 0.4, "drop": 1.0, "outro": 0.5},
        "instruments": ["pad", "saw-pluck", "saw-bass", "stab", "lead", "kick", "clap", "snare", "hats"],
        "roles": {"bed": "pad", "motion": "saw-pluck", "bass": "saw-bass", "top": "stab", "motif": "lead"},
        "chordBars": 1,
        "prog": {"minor": {"intro": ["i:madd9", "VI:add9"], "groove": ["i:madd9", "VI:add9", "III:maj7", "VII:add9"],
                           "breakdown": ["VI:maj7", "iv:m7", "i:madd9", "VII:sus4"],
                           "drop": ["i:madd9", "VI:add9", "III:maj7", "VII:add9"], "outro": ["i:madd9"]},
                 "major": {"intro": ["I:add9", "IV:add9"], "groove": ["I:add9", "V:add9", "vi:m7", "IV:add9"],
                           "breakdown": ["vi:m7", "IV:maj7", "I:add9", "V:sus4"],
                           "drop": ["I:add9", "V:add9", "vi:m7", "IV:add9"], "outro": ["I:add9"]}},
        "cadence": {"minor": "VII:add9", "major": "V:sus4"}, "final": {"minor": "i:madd9", "major": "I:add9"},
        "pad": {"cut": (380, 2600), "gain": 0.12, "atk": 0.12, "introAtk": 0.5},
        "pluck": "saw", "bassPattern": "rolling", "motionPattern": "arp16dark", "topPattern": "stabs",
        "arp": [0, 3, 5, 3, 4, 3, 2, 1],
        "kit": {"kick": "punch", "clap": "tight", "snare": "tight", "hats": "bright", "rim": False, "shaker": False, "toms": False},
        "grooves": "dark", "swing": 0.0, "dropGap": True, "fill": "snare",
        "sidechain": {"bed": 0.72, "bass": 0.75, "motion": 0.45, "top": 0.4},
        "delay": {"beats": 0.75, "fb": 0.45, "taps": 5}, "reverb": {"size": 2.4, "damp": 1.3, "ret": 0.5},
        "levels": {"bed": 1.0, "bass": 1.0, "motion": 1.0, "top": 1.0, "motif": 0.9, "drums": 1.05},
        "lowcut": 0.3, "tape": False, "riser": "digital",
    },
    "ambient": {
        "bpm": 90, "key": "E", "mode": "major", "drums": "light", "sfx": "minimal",
        "energy": {"intro": 0.2, "groove": 0.45, "breakdown": 0.3, "drop": 0.65, "outro": 0.3},
        "instruments": ["pad", "strings", "bell", "glass", "sub", "kick", "rim", "shaker"],
        "roles": {"bed": "pad", "motion": "bell", "bass": "sub", "top": "glass", "motif": "bell"},
        "chordBars": 2,
        "prog": {"major": {"intro": ["I:maj9", "IV:maj7"], "groove": ["I:maj9", "IV:maj7", "vi:m9", "IV:add9"],
                           "breakdown": ["vi:m9", "IV:maj7"], "drop": ["I:maj9", "V:add9", "vi:m9", "IV:maj7"],
                           "outro": ["I:maj9"]},
                 "minor": {"intro": ["i:m9", "VI:maj7"], "groove": ["i:m9", "VI:maj7", "III:maj7", "VII:add9"],
                           "breakdown": ["VI:maj7", "iv:m9"], "drop": ["i:m9", "VI:maj7", "III:maj7", "VII:add9"],
                           "outro": ["i:m9"]}},
        "cadence": None, "final": {"major": "I:maj9", "minor": "i:m9"},
        "pad": {"cut": (600, 3000), "gain": 0.16, "atk": 0.9, "introAtk": 1.6, "rel": 1.6},
        "pluck": "bell", "bassPattern": "whole", "motionPattern": "bells8", "topPattern": "shimmer",
        "arp": [0, 2, 4, 5, 4, 2, 1, 3],
        "kit": {"kick": "soft", "clap": None, "snare": None, "hats": None, "rim": True, "shaker": True, "toms": False},
        "grooves": "ambient", "swing": 0.0, "dropGap": False, "fill": None,
        "sidechain": {"bed": 0.12, "bass": 0.2, "motion": 0.08, "top": 0.08},
        "delay": {"beats": 0.75, "fb": 0.6, "taps": 8}, "reverb": {"size": 4.5, "damp": 1.0, "ret": 0.85},
        "levels": {"bed": 1.0, "bass": 0.9, "motion": 0.9, "top": 0.8, "motif": 1.0, "drums": 0.7},
        "lowcut": 0.4, "tape": False, "riser": "minimal",
    },
    "corporate": {
        "bpm": 110, "key": "C", "mode": "major", "drums": "light", "sfx": "organic",
        "energy": {"intro": 0.3, "groove": 0.6, "breakdown": 0.35, "drop": 0.85, "outro": 0.4},
        "instruments": ["strings", "piano", "marimba", "bell", "bass", "kick", "clap", "hats", "shaker"],
        "roles": {"bed": "strings", "motion": "piano", "bass": "bass", "top": "bell", "motif": "piano"},
        "chordBars": 1,
        "prog": {"major": {"intro": ["I:add9", "IV:add9"], "groove": ["vi:m7", "IV:add9", "I:add9", "V"],
                           "breakdown": ["IV:add9", "vi:m7", "IV:add9", "V:sus4"],
                           "drop": ["I:add9", "V:add9", "vi:m7", "IV:add9"], "outro": ["I:add9"]},
                 "minor": {"intro": ["i:add9", "VI:add9"], "groove": ["i:add9", "VI:add9", "III:add9", "VII"],
                           "breakdown": ["VI:add9", "iv:m7", "VI:add9", "VII:sus4"],
                           "drop": ["i:add9", "VI:add9", "III:add9", "VII"], "outro": ["i:add9"]}},
        "cadence": {"major": "V:sus4", "minor": "VII"}, "final": {"major": "I:add9", "minor": "i:add9"},
        "pad": {"cut": (900, 4200), "gain": 0.15, "atk": 0.25, "introAtk": 0.6},
        "pluck": "piano", "bassPattern": "eighths", "motionPattern": "broken8", "topPattern": "glock",
        "arp": [0, 2, 4, 2, 1, 3, 5, 3],
        "kit": {"kick": "pop", "clap": "pop", "snare": None, "hats": "bright", "rim": False, "shaker": True, "toms": False},
        "grooves": "four", "swing": 0.0, "dropGap": False, "fill": "clap",
        "sidechain": {"bed": 0.25, "bass": 0.45, "motion": 0.15, "top": 0.15},
        "delay": {"beats": 0.75, "fb": 0.35, "taps": 4}, "reverb": {"size": 2.0, "damp": 1.0, "ret": 0.5},
        "levels": {"bed": 1.0, "bass": 0.95, "motion": 1.0, "top": 0.8, "motif": 0.9, "drums": 0.85},
        "lowcut": 0.5, "tape": False, "riser": "organic",
    },
    "lofi": {
        "bpm": 84, "key": "Eb", "mode": "major", "drums": "full", "sfx": "organic",
        "energy": {"intro": 0.3, "groove": 0.6, "breakdown": 0.35, "drop": 0.75, "outro": 0.35},
        "instruments": ["epiano", "pad", "bass", "kick", "snare", "hats", "rim", "crackle"],
        "roles": {"bed": "epiano", "motion": "epiano", "bass": "bass", "top": None, "motif": "epiano"},
        "chordBars": 1,
        "prog": {"major": {"intro": ["I:maj9", "vi:m9"], "groove": ["ii:m9", "V:9", "I:maj9", "vi:m9"],
                           "breakdown": ["IV:maj7", "iii:m7", "ii:m9", "V:7sus4"],
                           "drop": ["IV:maj7", "V:9", "iii:m7", "vi:m9"], "outro": ["I:maj9"]},
                 "minor": {"intro": ["i:m9", "iv:m9"], "groove": ["i:m9", "iv:m9", "VII:9", "III:maj7"],
                           "breakdown": ["VI:maj7", "v:m7", "iv:m9", "VII:7sus4"],
                           "drop": ["i:m9", "iv:m9", "VII:9", "III:maj7"], "outro": ["i:m9"]}},
        "cadence": {"major": "V:9", "minor": "VII:9"}, "final": {"major": "I:maj9", "minor": "i:m9"},
        "pad": {"cut": (500, 2200), "gain": 0.08, "atk": 0.4, "introAtk": 0.8},
        "pluck": "keys", "bassPattern": "lofi", "motionPattern": "comp", "topPattern": None,
        "arp": [0, 2, 4, 3, 1, 2, 4, 5],
        "kit": {"kick": "lofi", "clap": None, "snare": "lofi", "hats": "dark", "rim": True, "shaker": False, "toms": False},
        "grooves": "lofi", "swing": 0.22, "dropGap": False, "fill": "snare",
        "sidechain": {"bed": 0.2, "bass": 0.3, "motion": 0.15, "top": 0.1},
        "delay": {"beats": 0.5, "fb": 0.35, "taps": 4}, "reverb": {"size": 1.4, "damp": 1.6, "ret": 0.45},
        "levels": {"bed": 1.0, "bass": 1.0, "motion": 0.9, "top": 0.8, "motif": 0.8, "drums": 1.0},
        "lowcut": 0.35, "tape": True, "riser": "minimal",
    },
    "dnb": {   # drum and bass / breakbeat: two-step at ~174, half-time drops, reese + sub, offbeat stabs, no pads in drops
        "bpm": 174, "key": "G", "mode": "minor", "drums": "full", "sfx": "digital",
        "energy": {"intro": 0.5, "groove": 0.8, "breakdown": 0.45, "drop": 1.0, "outro": 0.55},
        "instruments": ["pad", "stab", "reese", "kick", "snare", "hats"],
        "roles": {"bed": "pad", "motion": None, "bass": "reese", "top": "stab", "motif": None},
        "keepNone": ["motion", "motif"],
        "chordBars": 2,
        "prog": {"minor": {"intro": ["i:m9", "VI:maj7"], "groove": ["i:m9", "VI:maj7", "iv:m9", "v:m7"],
                           "breakdown": ["VI:maj7", "iv:m9"], "drop": ["i:m9", "VI:maj7", "III:maj7", "VII:add9"],
                           "outro": ["i:m9"]},
                 "major": {"intro": ["vi:m9", "IV:maj7"], "groove": ["vi:m9", "IV:maj7", "ii:m9", "iii:m7"],
                           "breakdown": ["IV:maj7", "ii:m9"], "drop": ["vi:m9", "IV:maj7", "I:maj7", "V:add9"],
                           "outro": ["vi:m9"]}},
        "cadence": {"minor": "v:m7", "major": "iii:m7"}, "final": {"minor": "i:m9", "major": "vi:m9"},
        "pad": {"cut": (420, 2400), "gain": 0.09, "atk": 0.3, "introAtk": 0.6},
        "padIn": ["intro", "breakdown", "groove"],
        "pluck": "saw", "bassPattern": "reese", "motionPattern": "arp16dark", "topPattern": "stabs",
        "arp": [0, 3, 5, 3, 4, 3, 2, 1],
        "kit": {"kick": "punch", "clap": None, "snare": "tight", "hats": "bright", "rim": False, "shaker": False, "toms": False},
        "grooves": "dnb", "swing": 0.08, "dropGap": True, "fill": "snare",
        "sidechain": {"bed": 0.5, "bass": 0.35, "motion": 0.3, "top": 0.3},
        "delay": {"beats": 0.75, "fb": 0.35, "taps": 4}, "reverb": {"size": 1.6, "damp": 1.4, "ret": 0.35},
        "levels": {"bed": 0.8, "bass": 1.1, "motion": 1.0, "top": 0.85, "motif": 0.9, "drums": 1.15},
        "lowcut": 0.3, "tape": False, "riser": "digital",
    },
    "swing": {   # small-band swing (1920s-30s): walking upright bass, ride + brushes, Charleston piano comping, a reed
        "bpm": 120, "key": "Bb", "mode": "major", "drums": "full", "sfx": "glassy",
        "energy": {"intro": 0.35, "groove": 0.6, "breakdown": 0.35, "drop": 0.85, "outro": 0.4},
        "instruments": ["piano", "upright", "clarinet", "ride", "brush", "kick", "hats"],
        "roles": {"bed": None, "motion": "piano", "bass": "upright", "top": None, "motif": "clarinet"},
        "keepNone": ["bed", "top"],
        "chordBars": 1,
        "prog": {"major": {"intro": ["I:6", "vi:m7", "ii:m7", "V:7"], "groove": ["I:6", "vi:m7", "ii:m7", "V:7"],
                           "breakdown": ["IV:maj7", "iv:m6", "I:6", "V:7"],
                           "drop": ["I:6", "I:7", "IV:6", "iv:m6", "iii:m7", "vi:7", "ii:m7", "V:7"], "outro": ["I:6"]},
                 "minor": {"intro": ["i:m6", "iv:m7", "ii:m7b5", "V:7"], "groove": ["i:m6", "iv:m7", "ii:m7b5", "V:7"],
                           "breakdown": ["VI:maj7", "ii:m7b5", "V:7", "i:m6"],
                           "drop": ["i:m6", "iv:m7", "VII:7", "III:maj7", "VI:maj7", "ii:m7b5", "V:7", "i:m6"], "outro": ["i:m6"]}},
        "cadence": {"major": "V:7", "minor": "V:7"}, "final": {"major": "I:6", "minor": "i:m6"},
        "pad": {"cut": (500, 2200), "gain": 0.0, "atk": 0.4, "introAtk": 0.8},
        "pluck": "keys", "bassPattern": "walking", "motionPattern": "charleston", "topPattern": None,
        "arp": [0, 2, 4, 3, 1, 2, 4, 5],
        "kit": {"kick": "lofi", "clap": None, "snare": None, "hats": "dark", "rim": False, "shaker": False, "toms": False,
                "ride": True, "brush": True},
        "grooves": "swing", "swing": 0.0, "swing8": 1.0, "dropGap": False, "fill": None,
        "sidechain": {"bed": 0.0, "bass": 0.0, "motion": 0.0, "top": 0.0},
        "delay": {"beats": 0.5, "fb": 0.15, "taps": 2}, "reverb": {"size": 1.1, "damp": 1.8, "ret": 0.35},
        "levels": {"bed": 1.0, "bass": 1.1, "motion": 1.0, "top": 0.8, "motif": 0.95, "drums": 0.9},
        "lowcut": 0.3, "tape": True, "riser": "minimal",
    },
    "cinematic-lite": {
        "bpm": 100, "key": "D", "mode": "minor", "drums": "light", "sfx": "organic",
        "energy": {"intro": 0.3, "groove": 0.6, "breakdown": 0.4, "drop": 1.0, "outro": 0.45},
        "instruments": ["strings", "piano", "sub", "toms", "kick", "snare"],
        "roles": {"bed": "strings", "motion": "strings", "bass": "sub", "top": "strings", "motif": "piano"},
        "chordBars": 1,
        "prog": {"minor": {"intro": ["i", "VI"], "groove": ["i", "VI", "III", "VII"],
                           "breakdown": ["VI", "iv", "i", "V"], "drop": ["i", "VI", "III", "VII"], "outro": ["i"]},
                 "major": {"intro": ["I", "vi"], "groove": ["vi", "IV", "I", "V"],
                           "breakdown": ["IV", "vi", "IV", "V:sus4"], "drop": ["I", "V", "vi", "IV"], "outro": ["I"]}},
        "cadence": {"minor": "V", "major": "V"}, "final": {"minor": "i:add9", "major": "I:add9"},
        "pad": {"cut": (700, 3600), "gain": 0.17, "atk": 0.35, "introAtk": 0.9},
        "pluck": "piano", "bassPattern": "cinematic", "motionPattern": "ostinato", "topPattern": "high",
        "arp": [0, 0, 2, 0, 3, 0, 2, 1],
        "kit": {"kick": "boom", "clap": None, "snare": "big", "hats": "dark", "rim": False, "shaker": False, "toms": True},
        "grooves": "cine", "swing": 0.0, "dropGap": True, "fill": "toms",
        "sidechain": {"bed": 0.1, "bass": 0.2, "motion": 0.1, "top": 0.05},
        "delay": {"beats": 0.75, "fb": 0.35, "taps": 4}, "reverb": {"size": 3.5, "damp": 1.2, "ret": 0.7},
        "levels": {"bed": 1.0, "bass": 1.0, "motion": 0.9, "top": 0.8, "motif": 0.9, "drums": 1.0},
        "lowcut": 0.25, "tape": False, "riser": "organic",
    },
}

# Drum grooves: 16 steps per bar; '.' rest, '1'-'9' velocity 0.1-0.9, 'x' 1.0. Keys: groove/drop x light/full.
GROOVES = {
    "four": {
        "light": {"kick": "x.......x.......", "clap": "....6.......6...", "hats": "..5...5...5...5."},
        "full": {"kick": "x...x...x...x...", "clap": "....x.......x...", "hats": "..8...8...8...8.",
                 "ohats": "..............8.", "shaker": ".6.8.6.8.6.8.6.8"},
        "drop": {"kick": "x...x...x...x...", "clap": "....x.......x...", "hats": ".4x5.4x5.4x5.4x5",
                 "ohats": "..............x.", "shaker": ".8.9.8.9.8.9.8.9"},
    },
    "dark": {
        "light": {"kick": "x.......x.......", "clap": "....6.......6...", "hats": "..5...5...5...5."},
        "full": {"kick": "x...x...x...x...", "clap": "....8.......8...", "snare": "....5.......5...",
                 "hats": "54x454x454x454x4"},
        "drop": {"kick": "x...x...x...x...", "clap": "....9.......9...", "snare": "....6.......6...",
                 "hats": "54x454x454x454x4", "ohats": "..5...5...5...5."},
    },
    "ambient": {
        "light": {"kick": "6...............", "shaker": "..3...3...3...3."},
        "full": {"kick": "6.......5.......", "rim": "....4.......4...", "shaker": "3.3.3.3.3.3.3.3."},
        "drop": {"kick": "7.......6.......", "rim": "....5.......5...", "shaker": "4.4.4.4.4.4.4.4.", "hats": "..3...3...3...3."},
    },
    "lofi": {
        "light": {"kick": "x.........7.....", "snare": "....8.......8...", "hats": "5...5...5...5..."},
        "full": {"kick": "x......6..8.....", "snare": "....9.......9...", "hats": "6.4.6.4.6.4.6.4.", "rim": "..............3."},
        "drop": {"kick": "x......6..8...5.", "snare": "....x.......x...", "hats": "6.4.6.4.6.4.6.45", "rim": "......3.......3."},
    },
    "dnb": {   # two-step: kick on 1 and the 'and' of 3, snare on 2 and 4 with ghosts; drops go half-time (snare on 3)
        "light": {"kick": "x.........x.....", "snare": "....8.......8...", "hats": "..5...5...5...5."},
        "full": {"kick": "x.........x.....", "snare": "....x..3....x.3.", "hats": "6.46.4.66.46.4.6", "ohats": "..............6."},
        "drop": {"kick": "x.....x...x.....", "snare": "........x.....3.", "hats": "7.5.7.5.7.5.7.57", "ohats": "......6.......6."},
    },
    "swing": {   # ride "ding, ding-a ding, ding-a" (the 'a' falls on the swung eighth), hat chick on 2 and 4, brushes
        "light": {"ride": "7...7.5.7...7.5.", "hats": "....5.......5...", "kick": "3...3...3...3..."},
        "full": {"ride": "8...8.6.8...8.6.", "hats": "....6.......6...", "brush": "....7.......7...", "kick": "4...3...4...3..."},
        "drop": {"ride": "9...9.7.9...9.7.", "hats": "....7.......7...", "brush": "..3.8..3..3.8..4", "kick": "5...4...5...4.6."},
    },
    "cine": {
        "light": {"toms": "x.......6.......", "kick": "x..............."},
        "full": {"toms": "x..6..6.x..6.6..", "kick": "x.......x.......", "snare": "........8.......", "hats": "..3...3...3...3."},
        "drop": {"toms": "x..7..7.x..7.7.8", "kick": "x.......x.......", "snare": "....7.......x...", "hats": "..4...4...4...4."},
    },
}
KIT_PIECES = ("kick", "clap", "snare", "rim", "hats", "ohats", "shaker", "toms", "ride", "brush")
ROLE_CHOICES = {
    "bed": ("pad", "strings", "epiano", "piano", "guitar", "ukulele", "koto"),
    "motion": ("pulse", "pluck", "arp", "saw-pluck", "marimba", "guitar", "ukulele", "koto", "piano", "epiano", "strings", "bell", "glass"),
    "bass": ("tri-bass", "upright", "reese", "saw-bass", "bass", "sub"),
    "top": ("stab", "bell", "glass", "strings"),
    "motif": ("pulse-lead", "clarinet", "bell", "lead", "piano", "epiano", "marimba", "pluck", "glass"),
}
TRANSITION_SFX = {  # scene "in" -> (sfx spec, offset s from the boundary); anchors make each land on the bar line
    "blobWipe": ("swish", 0.0), "zoomInto": ("zoom", 0.0), "whip": ("whip", 0.0), "glitch": ("glitch pre=0.1s", 0.0),
    "flash": ("shimmer soft", 0.0), "strobe": ("strobe", 0.0), "match": ("air", 0.0), "impact": ("impact", 0.0),
    "portalFlash": ("swell+reveal", 0.0), "cut": None,
}
HEAVY_SFX = {"boom", "impact", "slam", "thud", "stamp", "door", "heartbeat"}   # bodies that collide with kick + bass
NOTE_NAMES = ("C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B")


class InputError(Exception):
    pass


def log(*a):
    if not QUIET:
        print(*a, file=sys.stderr)


QUIET = False


# ───────────────────────────── harmony ─────────────────────────────

QUAL = {"5": [0, 7], "maj7": [0, 4, 7, 11], "m7": [0, 3, 7, 10], "maj9": [0, 4, 7, 11, 14], "m9": [0, 3, 7, 10, 14],
        "madd9": [0, 3, 7, 14], "sus2": [0, 2, 7], "sus4": [0, 5, 7], "7sus4": [0, 5, 7, 10], "9sus4": [0, 5, 7, 10, 14],
        "dim": [0, 3, 6], "m7b5": [0, 3, 6, 10], "maj7#11": [0, 4, 7, 11, 18], "m6": [0, 3, 7, 9], "6/9": [0, 4, 7, 9, 14],
        "m11": [0, 3, 7, 10, 14, 17], "m": [0, 3, 7], "maj": [0, 4, 7]}
ROMAN = {"i": 1, "ii": 2, "iii": 3, "iv": 4, "v": 5, "vi": 6, "vii": 7}


EXOTIC = {"dorian", "mixolydian", "lydian", "phrygian"}
EXT = {"": (0, 2, 4), "m": (0, 2, 4), "maj": (0, 2, 4), "5": (0, 4), "6": (0, 2, 4, 5), "m6": (0, 2, 4, 5),
       "7": (0, 2, 4, 6), "maj7": (0, 2, 4, 6), "m7": (0, 2, 4, 6), "9": (0, 2, 4, 6, 8), "maj9": (0, 2, 4, 6, 8),
       "m9": (0, 2, 4, 6, 8), "add9": (0, 2, 4, 8), "madd9": (0, 2, 4, 8), "sus2": (0, 1, 4), "sus4": (0, 3, 4),
       "7sus4": (0, 3, 4, 6), "9sus4": (0, 3, 4, 6, 8)}


def _diatonic(mode, root, q):
    """Church modes: stack the chord inside the mode's own scale (the table quality only sets the extensions);
    a diminished result is replaced by the chord a diatonic third below, which shares two of its notes."""
    sc = MODES[mode]
    if root % 12 not in sc or q not in EXT:
        return None
    d = sc.index(root % 12)

    def tones(d):
        out = []
        for st in EXT[q]:
            o, i = divmod(d + st, 7)
            out.append(sc[i] + 12 * o - sc[d])
        return out
    iv = tones(d)
    o3, i3 = divmod(d + 2, 7)
    o5, i5 = divmod(d + 4, 7)
    if sc[i3] + 12 * o3 - sc[d] == 3 and sc[i5] + 12 * o5 - sc[d] == 6:      # diminished
        d = (d - 2) % 7
        iv = tones(d)
    iv = [v for v in iv if v != 13]          # a minor ninth over the root is too harsh for pads: drop it
    return sc[d], iv


def parse_chord(sym: str, base: str, mode: str | None = None) -> dict:
    m = re.match(r"^\s*([b#]?)(VII|VI|IV|V|III|II|I|vii|vi|iv|v|iii|ii|i)\s*(?::\s*(.*))?$", sym)
    if not m:
        raise InputError(f"bad chord symbol {sym!r} (use e.g. IV:maj7, vi:m9, bVII)")
    acc, rn, q = m.group(1), m.group(2), (m.group(3) or "").strip()
    up = rn.isupper()
    root = MODES[base][ROMAN[rn.lower()] - 1] + (-1 if acc == "b" else 1 if acc == "#" else 0)
    if q == "":
        iv = [0, 4, 7] if up else [0, 3, 7]
    elif q == "7":
        iv = [0, 4, 7, 10] if up else [0, 3, 7, 10]
    elif q == "9":
        iv = [0, 4, 7, 10, 14] if up else [0, 3, 7, 10, 14]
    elif q == "add9":
        iv = [0, 4, 7, 14] if up else [0, 3, 7, 14]
    elif q == "6":
        iv = [0, 4, 7, 9] if up else [0, 3, 7, 9]
    elif q in QUAL:
        iv = QUAL[q]
    else:
        raise InputError(f"unknown chord quality {q!r} in {sym!r}")
    if mode in EXOTIC:
        dia = _diatonic(mode, root, q)
        if dia:
            root, iv = dia
    return {"sym": sym, "root": root % 12, "iv": iv, "minor": (3 in iv and 4 not in iv)}


SHARP_NAMES = ("C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B")
SHARP_KEYS = {("major", pc) for pc in (7, 2, 9, 4, 11, 6, 1)} | {("minor", pc) for pc in (4, 11, 6, 1, 8, 3)}


def spell(pc: int, key_pc: int, base: str = "major") -> str:
    return (SHARP_NAMES if (base, key_pc % 12) in SHARP_KEYS else NOTE_NAMES)[pc % 12]


def quality_of(iv) -> str:
    """Chord symbol suffix from the actual intervals (so a diatonically re-stacked chord is named truthfully)."""
    st, m = set(iv), {v % 12 for v in iv}
    third = 4 if 4 in m else 3 if 3 in m else None
    sev = 11 if 11 in m else 10 if 10 in m else None
    nine = 14 in st or (2 in m and third is not None)
    six = 9 in m and sev is None
    if third is None:
        if 5 in m:
            return ("9sus4" if 14 in st else "7sus4") if sev == 10 else "sus4"
        return "sus2" if 2 in m else "5"
    if third == 4:
        if 8 in m and 7 not in m:
            return "aug"
        if sev == 11:
            return "maj9" if nine else "maj7"
        if sev == 10:
            return "9" if nine else "7"
        if six:
            return "6/9" if nine else "6"
        return "add9" if nine else ""
    if 6 in m and 7 not in m:
        return "m7b5" if sev == 10 else "dim"
    if sev == 10:
        return "m9" if nine else "m7"
    if sev == 11:
        return "m(maj7)"
    if six:
        return "m6"
    return "madd9" if nine else "m"


def chord_name(ch: dict, key_pc: int, base: str = "major") -> str:
    return spell(key_pc + ch["root"], key_pc, base) + quality_of(ch["iv"])


def chord_pcs(ch: dict, key_pc: int, nmax=5) -> list:
    pcs = []
    for v in ch["iv"]:
        pc = (key_pc + ch["root"] + v) % 12
        if pc not in pcs:
            pcs.append(pc)
    if len(pcs) > nmax and len(pcs) >= 3:   # drop the fifth first
        pcs.pop(2)
    return pcs[:nmax]


def _vl_cost(a, b):
    a, b = np.asarray(a), np.asarray(b)
    return float(np.mean([np.min(np.abs(b - x)) for x in a]) + np.mean([np.min(np.abs(a - x)) for x in b]))


def voice_chord(pcs, prev, lo=50, hi=74, center=62):
    """Voice-led close / drop-2 voicing of pitch classes inside [lo, hi]; avoids low clusters."""
    best, best_cost = None, 1e9
    for r in range(len(pcs)):
        order = pcs[r:] + pcs[:r]
        for base in range(lo, lo + 12):
            if base % 12 != order[0]:
                continue
            notes = [base]
            for pc in order[1:]:
                notes.append(notes[-1] + ((pc - notes[-1]) % 12 or 12))
            cands = [notes]
            if len(notes) >= 4 and notes[-2] - 12 >= lo:
                d2 = sorted(notes[:-2] + [notes[-2] - 12] + notes[-1:])
                cands.append(d2)
            for c in cands:
                if c[-1] > hi or c[0] < lo:
                    continue
                cost = _vl_cost(c, prev) if prev else abs(float(np.mean(c)) - center) * 0.5
                cost += 0.15 * abs(float(np.mean(c)) - center)
                for x, y in zip(c, c[1:]):
                    if y - x < 3 and x < 57:
                        cost += 4
                if cost < best_cost:
                    best, best_cost = c, cost
    if best is None:  # range too tight: plain stack from lo
        best = sorted(lo + ((pc - lo) % 12) for pc in pcs)
    return list(best)


def bass_note(ch, key_pc):
    pc = (key_pc + ch["root"]) % 12
    return 33 + ((pc - 33) % 12)          # A1 .. G#2


# ───────────────────────────── project loading ─────────────────────────────

def read_json(path, what):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        raise InputError(f"{what} not found: {path}") from None
    except json.JSONDecodeError as e:
        raise InputError(f"{what} is not valid JSON ({os.path.basename(path)} line {e.lineno}: {e.msg})") from None


def deep_merge(a, b):
    out = copy.deepcopy(a)
    for k, v in (b or {}).items():
        if isinstance(v, dict) and isinstance(out.get(k), dict):
            out[k] = deep_merge(out[k], v)
        else:
            out[k] = copy.deepcopy(v)
    return out


def guess_preset(style: dict) -> str:
    lay = style.get("layout") or {}
    mot = style.get("motion") or {}
    pace = mot.get("pace")
    dark = lay.get("theme") == "dark"
    if pace == "calm":
        return "ambient"
    if dark:
        return "dark-synth"
    return "bright-pop" if pace == "energetic" else "corporate"


def energy_map(sound: dict, preset: dict, warn) -> dict:
    e = dict(ENERGY_DEFAULT)
    e.update(preset.get("energy") or {})
    v = sound.get("energy")
    if isinstance(v, dict):
        for k, x in v.items():
            k2 = PART_ALIASES.get(str(k).lower(), str(k).lower())
            if k2 in e and isinstance(x, (int, float)):
                e[k2] = float(x)
    elif isinstance(v, (list, tuple)) and v:
        if len(v) != 5:
            warn(f"style.sound.energy has {len(v)} values; expected 5 (intro, groove, breakdown, drop, outro)")
        for k, x in zip(PARTS, v):      # fewer than 5 values: the rest keep defaults
            if isinstance(x, (int, float)):
                e[k] = float(x)
    return {k: float(np.clip(x, 0.0, 1.0)) for k, x in e.items()}


class Song:
    """Everything the arranger needs, resolved from config + style + cut + options."""

    def __init__(self, project, cut_name, args):
        self.project = project
        self.warnings = []
        self.notes = []
        cfg = read_json(os.path.join(project, "reel.config.json"), "reel.config.json")
        style_name = cfg.get("style", "style.json") if isinstance(cfg.get("style", "style.json"), str) else "style.json"
        style_path = os.path.join(project, style_name)
        style = read_json(style_path, "style.json") if os.path.exists(style_path) else {}
        if not style:
            self.warn(f"{style_name} missing: using preset defaults")
        cut_path = os.path.join(project, "build", f"cut-{cut_name}.json")
        cut = read_json(cut_path, f"build/cut-{cut_name}.json (run timing/plan_cut.py --project P --cut {cut_name})")
        self.cfg, self.style, self.cut = cfg, style, cut
        audio = cfg.get("audio") if isinstance(cfg.get("audio"), dict) else {}
        self.audio = audio
        sound = style.get("sound") if isinstance(style.get("sound"), dict) else {}
        self.sound = sound

        name = args.preset or audio.get("preset") or sound.get("preset")
        if not name:
            name = guess_preset(style)
            self.warn(f"style.sound.preset missing: guessed {name!r} from layout/motion")
        if name not in PRESETS:
            raise InputError(f"unknown preset {name!r} (one of {', '.join(PRESETS)})")
        self.preset_name = name
        p = copy.deepcopy(PRESETS[name])
        p = deep_merge(p, sound.get("tweaks") if isinstance(sound.get("tweaks"), dict) else {})
        p = deep_merge(p, audio.get("tweaks") if isinstance(audio.get("tweaks"), dict) else {})
        self.p = p

        # tempo: the cut is the authority (the picture was planned with it)
        self.bpm = float(cut.get("bpm") or cfg.get("bpm") or sound.get("bpm") or p["bpm"])
        want = cfg.get("bpm") or sound.get("bpm")
        if want and abs(float(want) - self.bpm) > 1e-6:
            self.warn(f"cut bpm {self.bpm:g} differs from config/style bpm {want}; the cut wins (re-plan to change it)")
        self.bpb = int(cut.get("beatsPerBar") or cfg.get("beatsPerBar") or 4)
        self.bars_total = int(cut.get("bars") or 0)
        self.duration = float(cut.get("duration") or 0)
        bar_sec = 60.0 / self.bpm * self.bpb
        if self.bars_total and abs(self.duration - self.bars_total * bar_sec) > 1e-3:
            self.warn(f"cut duration {self.duration} != bars x barSec {self.bars_total * bar_sec:.4f}; using the duration")
        if self.duration <= 0:
            raise InputError("cut duration is 0")

        key = sound.get("key") or p["key"]
        mode = str(sound.get("mode") or p["mode"]).lower()
        if isinstance(key, str) and len(key.split()) > 1 and not sound.get("mode"):
            mode = key.split()[1].lower()
        mode = {"maj": "major", "min": "minor", "m": "minor"}.get(mode, mode)
        if mode == "locrian":
            self.warn("locrian has no stable tonic chord; using phrygian")
            mode = "phrygian"
        if mode not in MODES:
            self.warn(f"unknown mode {mode!r}; using major")
            mode = "major"
        try:
            self.key_pc = S.pitch_class(key)
        except ValueError:
            self.warn(f"bad key {key!r}; using {p['key']}")
            self.key_pc = S.pitch_class(p["key"])
        self.mode = mode
        self.base = BASE_MODE[mode]
        self.key_name = spell(self.key_pc, self.key_pc, self.base)

        drums = str(sound.get("drums") or p["drums"]).lower()
        self.drums = drums if drums in ("none", "light", "full") else p["drums"]
        fam = str(sound.get("sfx") or p["sfx"]).lower()
        self.family = fam if fam in S.FAMILIES else p["sfx"]
        self.energy = energy_map(sound, p, self.warn)
        self.roles, self.kit = self._roles(sound.get("instruments"))
        self.swing = float(audio.get("swing", sound.get("swing", p["swing"])))
        self.drop_gap = bool(audio.get("dropGap", p["dropGap"]))
        self.music_db = float(audio.get("musicDb", 0.0))
        self.sfx_db = float(audio.get("sfxDb", 0.0))
        self.transition_sfx = bool(audio.get("transitionSfx", True)) and not args.no_transition_sfx
        self.final_hit = audio.get("finalHit", "outro")
        self.outro_max = int(audio.get("outroMaxBars", 3))
        title = str(cfg.get("title") or os.path.basename(os.path.abspath(project)))
        self.seed = int(args.seed if args.seed is not None else audio.get("seed", S.seed_of("reel", title)))

        # time maps (comprehension slow-downs)
        self.scale = float(args.scale or 1.0)
        self.warp = parse_warp(args.warp) if args.warp else None
        if self.warp and self.scale != 1.0:
            raise InputError("use --scale or --warp, not both")
        self.bpm_out = self.bpm / self.scale
        self.beat = 60.0 / self.bpm_out
        self.scene_beat = 60.0 / self.bpm
        self.dur_out = self.W(self.duration)

    def warn(self, msg):
        if msg not in self.warnings:
            self.warnings.append(msg)
            log("  ! " + msg)

    def note(self, msg):
        if msg not in self.notes:
            self.notes.append(msg)
            log("  · " + msg)

    def W(self, t):
        """Scene seconds -> output seconds."""
        if self.warp:
            o, s = self.warp
            if t <= s[-1]:
                return float(np.interp(t, s, o))
            return float(o[-1] + (t - s[-1]) * (o[-1] - o[-2]) / (s[-1] - s[-2]))
        return t * self.scale

    def slope(self, t):
        if self.warp:
            o, s = self.warp
            i = int(np.clip(np.searchsorted(s, t, side="right") - 1, 0, len(s) - 2))
            return (o[i + 1] - o[i]) / (s[i + 1] - s[i])
        return self.scale

    def _roles(self, instruments):
        p = self.p
        roles = dict(p["roles"])
        # style.sound.roles pins a role to an instrument (e.g. {"motion": "koto"}); otherwise the preset's choice stands
        # when it is in the palette, and the first available instrument from ROLE_CHOICES fills the rest
        pinned = self.sound.get("roles") if isinstance(getattr(self, "sound", None), dict) else None
        pinned = {k: (S.canonical_instrument(v) or v) for k, v in pinned.items()} if isinstance(pinned, dict) else {}
        roles.update(pinned)
        kit = {k: v for k, v in p["kit"].items()}
        if isinstance(instruments, (list, tuple)) and instruments:
            canon, unknown = [], []
            for it in instruments:
                c = S.canonical_instrument(it)
                (canon if c else unknown).append(c or it)
            if unknown:
                self.warn(f"unknown instruments ignored: {', '.join(map(str, unknown))} (python3 synth.py list)")
            have = set(canon)
            self.palette = have
            for role, choices in ROLE_CHOICES.items():
                cur = roles.get(role)
                if role in pinned or cur in have or role in p.get("keepNone", ()):
                    continue
                roles[role] = next((c for c in choices if c in have), None)
            if roles.get("bed") is None and "bed" not in p.get("keepNone", ()):
                self.warn("no bed instrument (pad / strings / epiano / piano) in style.sound.instruments: no sustained harmony")
            drum_names = {"kick", "clap", "snare", "rim", "hats", "shaker", "toms", "ride", "brush"} & have
            if drum_names:
                defaults = {"kick": p["kit"].get("kick") or "pop", "clap": p["kit"].get("clap") or "pop",
                            "snare": p["kit"].get("snare") or "tight", "hats": p["kit"].get("hats") or "bright"}
                kit = {"kick": defaults["kick"] if "kick" in have else None,
                       "clap": defaults["clap"] if "clap" in have else None,
                       "snare": defaults["snare"] if "snare" in have else None,
                       "hats": defaults["hats"] if "hats" in have else None,
                       "rim": "rim" in have, "shaker": "shaker" in have, "toms": "toms" in have,
                       "ride": "ride" in have, "brush": "brush" in have}
            self.crackle = "crackle" in have
        else:
            self.palette = {S.canonical_instrument(i) for i in p["instruments"]} - {None}
            self.crackle = bool(p.get("tape"))
        return roles, kit


def parse_warp(spec: str):
    try:
        pairs = [tuple(float(v) for v in k.split(":")) for k in spec.split(",") if k.strip()]
    except ValueError:
        raise InputError(f'bad --warp {spec!r}: use "out:scene,out:scene,..." in seconds') from None
    pairs.sort(key=lambda p: p[1])
    o = np.array([p[0] for p in pairs])
    s = np.array([p[1] for p in pairs])
    if len(pairs) < 2 or np.any(np.diff(o) <= 0) or np.any(np.diff(s) <= 0) or o[0] != 0 or s[0] != 0:
        raise InputError("--warp needs >= 2 knots starting at 0:0, both columns strictly increasing")
    return o, s


# ───────────────────────────── bar timeline ─────────────────────────────

class Bar:
    __slots__ = ("i", "t0", "beats", "beat", "part", "sec", "k", "n", "energy", "chord", "voicing", "bass", "first",
                 "last", "next_part", "prev_part", "scene_t0")

    def __init__(self, **kw):
        for k in self.__slots__:
            setattr(self, k, kw.get(k))

    @property
    def dur(self):
        return self.beats * self.beat

    @property
    def t1(self):
        return self.t0 + self.dur


def music_sections(song: Song):
    cut = song.cut
    secs = []
    for m in cut.get("music") or []:
        part = PART_ALIASES.get(str(m.get("part", "")).lower(), str(m.get("part", "")).lower())
        if part not in PARTS:
            song.warn(f"music part {m.get('part')!r} unknown; treated as groove")
            part = "groove"
        secs.append({"fromBar": int(m["fromBar"]), "toBar": int(m["toBar"]), "part": part,
                     "occurrence": int(m.get("occurrence", 0) or 0)})
    if not secs and cut.get("scenes"):
        for s in cut["scenes"]:
            part = PART_ALIASES.get(str(s.get("music", "groove")).lower(), str(s.get("music", "groove")).lower())
            part = part if part in PARTS else "groove"
            if secs and secs[-1]["part"] == part:
                secs[-1]["toBar"] = int(s["toBar"])
            else:
                secs.append({"fromBar": int(s["fromBar"]), "toBar": int(s["toBar"]), "part": part, "occurrence": 0})
    total = song.bars_total or int(round(song.duration / (song.bpb * song.scene_beat)))
    if not secs:
        song.warn("no music sections in the cut: auto intro / groove / drop / outro")
        n = max(1, total)
        a, o = max(1, n // 8), max(1, n // 8) if n >= 4 else 0
        d = max(1, n // 4) if n >= 6 else 0
        g1 = min(n, max(a + 1, n - o - d))
        secs = [{"fromBar": 0, "toBar": min(a, n), "part": "intro"}]
        if g1 > a:
            secs.append({"fromBar": a, "toBar": g1, "part": "groove"})
        if d and n - o > g1:
            secs.append({"fromBar": g1, "toBar": n - o, "part": "drop"})
        if o and n > max(g1, n - o):
            secs.append({"fromBar": n - o, "toBar": n, "part": "outro"})
    secs.sort(key=lambda m: m["fromBar"])
    fixed, cur = [], 0
    for m in secs:  # close gaps / overlaps
        if m["fromBar"] > cur:
            song.warn(f"music sections leave bars {cur}-{m['fromBar']} uncovered; extending the previous part")
            if fixed:
                fixed[-1]["toBar"] = m["fromBar"]
            else:
                m["fromBar"] = 0
        m["fromBar"] = max(m["fromBar"], cur)
        if m["toBar"] > m["fromBar"]:
            fixed.append(m)
            cur = m["toBar"]
    if fixed and fixed[-1]["toBar"] < total:
        fixed[-1]["toBar"] = total
    # A long end-card hold must not become a long quiet tail (the outro is the final chord ringing out): an outro
    # longer than audio.outroMaxBars (default 3) keeps a 2-bar ring-out and the previous section carries the rest.
    if len(fixed) >= 2 and fixed[-1]["part"] == "outro" and fixed[-1]["toBar"] - fixed[-1]["fromBar"] > song.outro_max:
        o, prev = fixed[-1], fixed[-2]
        ring = min(2, max(1, song.outro_max))
        extra = (o["toBar"] - o["fromBar"]) - ring
        prev["toBar"] += extra
        o["fromBar"] += extra
        song.note(f"outro of {extra + ring} bars: the {prev['part']} carries {extra} more bar(s), the outro rings out over "
                  f"the last {ring} (audio.outroMaxBars {song.outro_max})")
    seen = {}
    for m in fixed:
        seen[m["part"]] = seen.get(m["part"], 0) + 1
        m["occurrence"] = m.get("occurrence") or seen[m["part"]]
        e = song.energy[m["part"]]
        if m["part"] in ("groove", "drop"):
            e = min(1.0, e + 0.05 * (m["occurrence"] - 1))
        m["energy"] = e
    return fixed


def build_bars(song: Song, secs):
    """Output-timeline bars. Plain cuts and --scale: uniform bars. --warp: whole bars at the same BPM between
    mapped sync points (section + scene boundaries), with a shorter bar where a sync point needs one."""
    bpb, beat = song.bpb, song.beat
    scene_bar = bpb * song.scene_beat
    bars = []
    scene_t0s = sorted({float(s["t0"]) for s in song.cut.get("scenes", [])})
    for si, m in enumerate(secs):
        s0, s1 = m["fromBar"] * scene_bar, m["toBar"] * scene_bar
        if not song.warp:
            spans = [(song.W(s0 + k * scene_bar), bpb) for k in range(m["toBar"] - m["fromBar"])]
        else:
            o0, o1 = song.W(s0), song.W(s1)
            pts = sorted({song.W(t) for t in scene_t0s if s0 + 1e-6 < t < s1 - 1e-6} | {o1})
            spans, cur = [], o0
            for ptt in pts:
                nb_f = (ptt - cur) / beat
                nb = int(round(nb_f))
                if abs(nb_f - nb) * beat > 0.004:
                    song.warn(f"warp: sync point {ptt:.3f} s is {abs(nb_f - nb) * beat * 1000:.0f} ms off the beat grid; "
                              "choose knots on beat lines")
                while nb >= bpb:
                    spans.append((cur, bpb))
                    cur += bpb * beat
                    nb -= bpb
                if nb > 0:
                    spans.append((cur, nb))
                cur = ptt
        for k, (t0, nbeats) in enumerate(spans):
            lift = 0.04 * (k // 4) if (m["part"] in ("groove", "drop") and len(spans) >= 6) else 0.0
            bars.append(Bar(i=len(bars), t0=t0, beats=nbeats, beat=beat, part=m["part"], sec=si, k=k, n=len(spans),
                            energy=min(1.0, m["energy"] + lift), first=(k == 0), last=(k == len(spans) - 1),
                            prev_part=secs[si - 1]["part"] if si else None,
                            next_part=secs[si + 1]["part"] if si + 1 < len(secs) else None))
    return bars


def assign_harmony(song: Song, bars, secs):
    p = song.p
    tables = p["prog"].get(song.base) or p["prog"].get("major")
    cb = max(1, int(p.get("chordBars", 1)))
    cad = (p.get("cadence") or {}).get(song.base) if p.get("cadence") else None
    fin = (p.get("final") or {}).get(song.base) or tables["outro"][0]
    mode = song.mode

    def colour(sym):  # modal colour on top of the base (major / minor) tables
        head, _, q = sym.partition(":")
        q = (":" + q) if q else ""
        if mode == "mixolydian" and head == "V":
            return "bVII" + q                     # bVII instead of V
        if mode == "lydian" and head == "IV":
            return "II" + q                       # major II carries the #4
        if mode == "dorian" and head in ("iv", "VI"):
            return "IV" + q                       # major IV carries the natural 6
        if mode == "phrygian" and head in ("V", "v", "VII"):
            return "bII" + (":maj7" if q else "")  # major bII carries the b2
        return sym

    prev = None
    for si, m in enumerate(secs):
        sb = [b for b in bars if b.sec == si]
        prog = [colour(c) for c in (tables.get(m["part"]) or tables["groove"])]
        n = len(sb)
        for k, b in enumerate(sb):
            idx = (k // cb) % len(prog)
            sym = prog[idx]
            if m["part"] == "outro":
                sym = fin
            elif cad and b.last and b.next_part in ("drop", "outro") and n > 1:
                sym = cad
            b.chord = parse_chord(sym, song.base, song.mode)
    for b in bars:
        pcs = chord_pcs(b.chord, song.key_pc)
        b.voicing = voice_chord(pcs, prev)
        prev = b.voicing
        b.bass = bass_note(b.chord, song.key_pc)


def make_motif(song: Song):
    """A 2-bar hook from the reel seed: pentatonic contour on a 16th grid (same in every cut of the reel)."""
    rng = np.random.default_rng(song.seed)
    rhythms = ([0, 4, 10, 12, 16, 20, 24, 28], [0, 3, 6, 8, 12, 16, 19, 22, 24], [0, 6, 8, 14, 16, 22, 24, 28],
               [0, 2, 4, 8, 12, 14, 16, 24], [0, 4, 6, 10, 16, 20, 22, 26])
    r = list(rhythms[int(rng.integers(len(rhythms)))])
    deg, out = int(rng.integers(2, 5)), []
    peak = len(r) // 2 + int(rng.integers(-1, 2))
    for i, st in enumerate(r):
        out.append((st, deg))
        step = int(rng.choice([1, 1, 2])) * (1 if i < peak else -1)
        if rng.random() < 0.2:
            step = -step
        deg = int(np.clip(deg + step, 0, 9))
    return out


# ───────────────────────────── the arranger ─────────────────────────────

def pat_vel(pat, step):
    if step >= len(pat):
        return 0.0
    ch = pat[step]
    return 1.0 if ch == "x" else (int(ch) / 10.0 if ch.isdigit() else 0.0)


class Arranger:
    def __init__(self, song: Song, bars, secs, motif):
        self.s, self.bars, self.secs, self.motif = song, bars, secs, motif
        self.p = song.p
        self.mix = S.Mixer(song.dur_out)
        self.kicks = []
        self.heavy = []          # times of heavy SFX (kick thinning + music duck)
        self.sfx_crash = []      # times of crash-like SFX (skip the music crash there)
        self.sfx_build = []      # end times of authored risers / swells / rolls (skip the music riser there)
        self.gaps = []
        self.report_events = []
        self.lv = self.p["levels"]

    # helpers -------------------------------------------------------------
    def swung(self, b: Bar, step):
        t = b.t0 + step * b.beat / 4
        if self.s.swing and step % 2 == 1:
            t += self.s.swing * b.beat / 4
        if self.p.get("swing8") and step % 4 == 2:          # swung eighths: the 'and' moves to the last triplet
            t += self.p["swing8"] * b.beat / 6
        return t

    def hum(self, b: Bar, step, amt=0.06):
        return 1.0 + amt * (S.seed_of(b.i, step, "h") % 1000 / 500.0 - 1.0)

    def add(self, bus, sig, t, pan=0.0, gain=1.0, rev=0.0, dly=0.0):
        self.mix.add(bus, sig, t, pan=pan, gain=gain, sends={"mrev": rev, "mdly": dly})

    def snap(self, m):
        """style.sound.scale (semitones above the tonic, e.g. [0, 2, 3, 7, 8] for hirajoshi): melodic notes snap to
        the nearest allowed pitch class, so a pentatonic or Japanese scale colours the motion, top and motif lines
        while the harmony underneath stays diatonic."""
        sc = self.s.sound.get("scale") if isinstance(self.s.sound, dict) else None
        if not sc:
            return m
        ok = {(self.s.key_pc + int(x)) % 12 for x in sc}
        return min((x for x in range(m - 6, m + 7) if x % 12 in ok), key=lambda x: (abs(x - m), x), default=m)

    def motion_voice(self, inst, m, vel, step_dur, bright=1.0):
        m = self.snap(m)
        if inst in ("guitar", "ukulele", "koto"):
            return getattr(S, inst)(m, max(0.5, step_dur * 3), 0.45 + 0.45 * vel, seed=int(m))
        if inst == "pulse":
            return S.chip_pulse(m, max(0.05, step_dur * 0.85), duty=0.125 if vel < 0.7 else 0.25, vel=0.55 + 0.4 * vel, decay=2)
        if inst in ("pluck", "arp"):
            return S.pluck(m, self.p["pluck"], bright)
        if inst == "saw-pluck" or inst == "lead":
            return S.pluck(m, "saw", bright)
        if inst in ("marimba", "bell", "glass"):
            return S.pluck(m, inst)
        if inst == "piano":
            return S.piano(m, max(0.15, step_dur * 1.6), min(1.0, 0.45 + 0.5 * vel))
        if inst == "epiano":
            return S.epiano(m, max(0.15, step_dur * 1.6), min(1.0, 0.45 + 0.5 * vel))
        if inst == "strings":
            return S.strings([m], max(0.08, step_dur * 0.9), spic=True, seed=m)
        return S.pluck(m, "mix")

    # beds ----------------------------------------------------------------
    def render_bed(self):
        inst = self.s.roles.get("bed")
        if inst is None:
            return
        spans, cur = [], None
        for b in self.bars:   # group bars with the same chord & part into one sustained span
            key = (b.sec, b.chord["sym"], tuple(b.voicing))
            if cur and cur["key"] == key and b.part != "outro":
                cur["dur"] += b.dur
                cur["bars"].append(b)
            else:
                cur = {"key": key, "t0": b.t0, "dur": b.dur, "bars": [b]}
                spans.append(cur)
        pp = self.p["pad"]
        for sp in spans:
            b = sp["bars"][0]
            if b.part == "outro":
                continue        # the final hit owns the outro
            if self.p.get("padIn") and b.part not in self.p["padIn"]:
                continue        # e.g. no pads in drum-and-bass drops
            e, part = b.energy, b.part
            lo, hi = pp["cut"]
            cut = lo + (hi - lo) * e
            last = sp["bars"][-1].last
            notes = b.voicing
            dur = sp["dur"]
            if inst in (None,):
                continue
            soft_keys = inst in ("epiano", "piano") and part in ("intro", "breakdown") and "pad" in self.s.palette
            if inst == "pad" or soft_keys:          # keys beds open and break down on a soft pad when there is one
                g = pp["gain"]
                if part == "intro":
                    sig = S.pad(notes, dur, cutoff=cut * 0.45, cut_end=cut * 0.8, atk=pp.get("introAtk", 0.6) if b.first else 0.25,
                                rel=0.3 if not last else 0.25, seed=b.i)
                    g *= 0.86
                elif part == "breakdown":
                    sig = S.pad(notes, dur, cutoff=cut * 0.33, cut_end=cut * 0.78, atk=0.04, rel=0.3, seed=b.i)
                    g *= 1.15
                elif part == "drop":
                    sig = S.pad(notes, dur, cutoff=cut, atk=0.05, rel=0.12 if last else 0.2, seed=b.i)
                    g *= 0.8
                else:
                    sig = S.pad(notes, dur, cutoff=cut * (0.85 + 0.08 * (b.k % 2)), atk=pp.get("atk", 0.08),
                                rel=pp.get("rel", 0.5) if not last else 0.12, seed=b.i)
                if inst in ("epiano", "piano"):
                    g *= 0.7
                self.add("bed", sig, sp["t0"], gain=g * self.lv["bed"], rev=0.35)
            elif inst == "strings":
                atk = pp.get("introAtk", 0.8) if part == "intro" else (0.06 if part == "drop" else pp.get("atk", 0.3))
                sig = S.strings(notes, dur, atk=atk, rel=0.4 if not last else 0.2, cutoff=cut, seed=b.i)
                g = pp["gain"] * (0.85 if part == "intro" else 1.1 if part == "breakdown" else 1.0)
                self.add("bed", sig, sp["t0"], gain=g * self.lv["bed"], rev=0.4)
                if part in ("drop",) and e >= 0.8:   # octave doubling for lift
                    hi_sig = S.strings([n + 12 for n in notes[-3:]], dur, atk=0.15, rel=0.3, cutoff=cut * 1.2, seed=b.i + 7)
                    self.add("bed", hi_sig, sp["t0"], gain=g * 0.45 * self.lv["bed"], rev=0.5)
            elif inst in ("guitar", "ukulele", "koto"):
                # strummed: down on beat 1, up on the "and" of 2, down on 3 (lighter in intro / breakdown)
                soft = part in ("intro", "breakdown")
                for bb in sp["bars"]:
                    hits = [(0, True, 0.8)] if soft else [(0, True, 0.85), (6, False, 0.5), (8, True, 0.7)]
                    for st, down, v in hits:
                        if st >= bb.beats * 4:
                            continue
                        sig = S.strum(bb.voicing, bb.beat * 2.5, inst, v * (0.7 + 0.3 * e), down, seed=bb.i * 7 + st)
                        self.add("bed", sig, self.swung(bb, st), pan=-0.15, gain=0.16 * self.lv["bed"], rev=0.25)
            elif inst in ("epiano", "piano"):
                # sustained chord strike at each bar + soft re-strike on beat 3
                for bb in sp["bars"]:
                    for j, m in enumerate(bb.voicing):
                        fn = S.epiano if inst == "epiano" else S.piano
                        vel = 0.5 + 0.25 * e
                        self.add("bed", fn(m, bb.dur * 0.95, vel), self.swung(bb, 0) + 0.008 * j, pan=-0.2 + 0.1 * j,
                                 gain=0.11 * self.lv["bed"], rev=0.3)
                        if bb.beats >= 4 and part != "intro":
                            self.add("bed", fn(m, bb.dur * 0.45, vel * 0.6), self.swung(bb, 8) + 0.006 * j,
                                     pan=-0.2 + 0.1 * j, gain=0.07 * self.lv["bed"], rev=0.3)
                if inst == "epiano" and "pad" in self.s.palette:      # a soft pad under the keys
                    sig = S.pad(notes, dur, cutoff=cut * 0.5, atk=0.6, rel=0.6, seed=b.i)
                    self.add("bed", sig, sp["t0"], gain=pp["gain"] * self.lv["bed"], rev=0.3)

    # bass ----------------------------------------------------------------
    def render_bass(self):
        inst = self.s.roles.get("bass")
        if inst is None:
            return
        pat = self.p["bassPattern"]
        gl = self.lv["bass"]

        def voice(m, d, e):
            if inst == "tri-bass":
                return S.chip_tri(m, d)
            if inst == "sub":
                return S.sub(m, d, atk=0.005, rel=0.06)
            if inst == "upright":
                return S.upright(m, d, 0.75 + 0.25 * e, seed=int(m))
            if inst == "reese":
                return S.reese(m, d, 0.6 + 0.5 * e)
            if inst == "saw-bass":
                return S.bass_saw(m, d, 0.8 + 0.4 * e)
            return S.bass_round(m, d)

        # intro sub bed / breakdown drone: one sustained note per run of bars on the same root (no re-attack)
        runs, cur = [], None
        for b in self.bars:
            calm = b.part in ("intro", "breakdown") and not (b.part == "breakdown" and b.last and b.n > 1
                                                             and b.next_part in ("drop", "groove"))
            if (not calm and b.energy >= 0.3) or b.part == "outro":
                cur = None
                continue
            if cur and cur["sec"] == b.sec and cur["root"] == b.bass:
                cur["dur"] += b.dur
            else:
                cur = {"sec": b.sec, "root": b.bass, "t0": b.t0, "dur": b.dur, "part": b.part}
                runs.append(cur)
        for r in runs:
            n = S.ns(r["dur"])
            tl = S.tt(n)
            if r["part"] == "breakdown":
                f = float(S.mtof(r["root"]))
                y = np.tanh(1.4 * (0.3 * np.sin(2 * np.pi * f / 2 * tl) + np.sin(2 * np.pi * f * tl *
                            (1 + 0.003 * np.sin(2 * np.pi * 5 * tl))))) * np.minimum(1, tl / 0.03) * 0.275
            else:
                y = np.sin(2 * np.pi * float(S.mtof(r["root"] - 12)) * tl) * 0.5 * np.minimum(1, tl / 0.5)
            self.add("bass", S.fades(y, 0.01, 0.06), r["t0"], gain=0.18 * gl)

        for b in self.bars:
            e, part, root = b.energy, b.part, b.bass
            bt = b.beat
            if part == "outro":
                continue
            if part == "breakdown" and b.last and b.next_part in ("drop", "groove") and b.n > 1:
                self.add("bass", voice(root + 12 if root < 38 else root, b.dur * 0.9, e), b.t0, gain=0.30 * 0.7 * gl)
                continue
            if part in ("intro", "breakdown") or e < 0.3:
                continue                                   # covered by the runs above
            busy = part == "drop" or e >= 0.85
            if pat == "offbeat":
                for q in range(b.beats):
                    tb = b.t0 + q * bt
                    self.add("bass", voice(root, 0.4 * bt, e), tb + 0.5 * bt, gain=0.30 * gl * (1.05 if busy else 1.0))
                    if q == 0:
                        self.add("bass", voice(root, 0.32 * bt, e), tb + 0.04 * bt, gain=0.30 * 0.55 * gl)
                    if busy and q % 2 == 1:
                        self.add("bass", voice(root + 12, 0.2 * bt, e), tb + 0.75 * bt, gain=0.30 * 0.6 * gl)
            elif pat == "rolling":
                hits = [1, 0, 1, 1, 0, 1, 1, 1] if busy else [1, 0, 1, 0, 1, 0, 1, 1]
                octs = [0, 0, 12, 0, 0, 12, 0, 12]
                for k in range(b.beats * 2):
                    if hits[k % 8]:
                        self.add("bass", voice(root + octs[k % 8], bt / 2 * 0.85, e), b.t0 + k * bt / 2, gain=0.42 * gl)
            elif pat == "eighths":
                if busy:
                    for k in range(b.beats * 2):
                        v = 1.0 if k % 2 == 0 else 0.7
                        self.add("bass", voice(root + (12 if k % 4 == 3 else 0), 0.45 * bt, e), b.t0 + k * bt / 2,
                                 gain=0.28 * v * gl)
                else:
                    for q in range(b.beats):
                        self.add("bass", voice(root, 0.9 * bt, e), b.t0 + q * bt, gain=0.28 * (1.0 if q == 0 else 0.8) * gl)
            elif pat == "whole":
                self.add("bass", S.sub(root, b.dur * 0.98, atk=0.08, rel=0.3) if inst == "sub" else voice(root, b.dur * 0.95, e),
                         b.t0, gain=0.24 * gl)
            elif pat == "reese":
                # long reese notes that move with the break: root, a pickup an octave up, then the minor seventh below
                # into the next bar; a clean sub doubles beat 1. Half-time drops hold the root for most of the bar.
                st = b.beats * 4
                seq = [(0, 9, 0, 1.0), (10, 2, 12, 0.6), (12, 4, -2, 0.85)] if part != "drop" else [(0, 12, 0, 1.0), (12, 4, 3, 0.8)]
                for s0, ln, iv, v in seq:
                    if s0 >= st:
                        continue
                    ln = min(ln, st - s0)
                    self.add("bass", voice(root + iv, ln * bt / 4 * 0.96, e) * v, b.t0 + s0 * bt / 4, gain=0.30 * gl)
                self.add("bass", S.sub(root - 12 if root >= 40 else root, min(b.dur, 2 * bt), atk=0.004, rel=0.08), b.t0, gain=0.22 * gl)
            elif pat == "walking":
                # quarter notes: root, a chord tone, the fifth, then a chromatic approach into the next bar's root
                idx = self.bars.index(b)
                nxt = self.bars[idx + 1].bass if idx + 1 < len(self.bars) else root
                pcs = {(m - root) % 12 for m in b.voicing}
                third = 3 if 3 in pcs else 4
                up = S.seed_of(self.s.seed, b.i, "walk") % 2 == 0
                approach = nxt + (-1 if up else 1)
                line = [root, root + third, root + 7, approach]
                if b.beats >= 4 and S.seed_of(self.s.seed, b.i, "walk2") % 3 == 0:
                    line = [root, root + 7, root + 9 if third == 4 else root + 10, approach]   # a scalar variant
                for q in range(b.beats):
                    note = line[q % 4]
                    while note > root + 9:
                        note -= 12
                    while note < root - 5:
                        note += 12
                    v = 1.0 if q == 0 else 0.85
                    self.add("bass", voice(note, 0.92 * bt, e) * v, b.t0 + q * bt + 0.004, gain=0.34 * gl)
                    if busy and q == 3 and S.seed_of(self.s.seed, b.i, "skip") % 2 == 0:   # a ghosted skip note
                        self.add("bass", voice(note, 0.25 * bt, e) * 0.45, b.t0 + q * bt + 2 * bt / 3, gain=0.34 * gl)
            elif pat == "lofi":
                seq = [(0, 6, 0, 1.0), (7, 2, 0, 0.6), (10, 5, 7, 0.85)] if b.beats >= 4 else [(0, 4 * b.beats - 1, 0, 1.0)]
                for st, ln, iv, v in seq:
                    if st < b.beats * 4:
                        self.add("bass", voice(root + iv, ln * bt / 4 * 0.95, e), self.swung(b, st), gain=0.32 * v * gl)
            elif pat == "cinematic":
                self.add("bass", S.sub(root, b.dur * 0.98, atk=0.05, rel=0.25) if inst == "sub" else voice(root, b.dur * 0.95, e),
                         b.t0, gain=0.22 * gl)
                if busy:
                    for k in range(b.beats * 2):
                        self.add("bass", S.strings([root + 12], bt / 2 * 0.8, spic=True, seed=k), b.t0 + k * bt / 2,
                                 gain=0.16 * (1.0 if k % 2 == 0 else 0.75) * gl, rev=0.1)
            else:
                self.add("bass", voice(root, b.dur * 0.9, e), b.t0, gain=0.26 * gl)

    # motion (arps / comping / ostinato) ------------------------------------
    def arp_tones(self, b):
        v = sorted(b.voicing)
        tones = [m + 12 for m in v] + [m + 24 for m in v[:2]]
        return [m for m in tones if m <= 96] or [m + 12 for m in v]

    def render_motion(self):
        inst = self.s.roles.get("motion")
        if inst is None:
            return
        kind = self.p["motionPattern"]
        pat = self.p["arp"]
        gl = self.lv["motion"]
        for b in self.bars:
            part, e = b.part, b.energy
            if part in ("intro", "outro"):
                if kind == "arp16dark" and part == "intro" and b.k % 2 == 1:
                    tones = self.arp_tones(b)
                    for s in range(b.beats * 4):
                        m = tones[pat[s % len(pat)] % len(tones)]
                        self.add("motion", self.motion_voice(inst, m, 0.5, b.beat / 4, 0.25), b.t0 + s * b.beat / 4,
                                 pan=-0.35 if s % 2 else 0.35, gain=0.055 * (0.9 if s % 4 == 0 else 0.6) * gl, rev=0.25, dly=0.3)
                continue
            if part == "breakdown":
                if kind in ("bells8", "comp"):
                    continue
                if b.last and b.next_part in ("drop", "groove") and b.n > 1:
                    # build bar: the arp returns with rising velocity (0.35 -> 0.95) into the drop
                    tones = self.arp_tones(b)
                    steps = b.beats * 4
                    for i in range(steps):
                        m = tones[(i * 2 if kind != "ostinato" else pat[i % len(pat)]) % len(tones)]
                        v = 0.35 + 0.6 * i / max(1, steps - 1)
                        sig = self.motion_voice(inst, m, v, b.beat / 4, 0.5 + 0.4 * v)
                        self.add("motion", sig, b.t0 + i * b.beat / 4, pan=0.4 * math.sin(i * 1.9), gain=0.10 * v * gl,
                                 rev=0.25, dly=0.45)
                    continue
                root = b.voicing[0] + 12
                steps = b.beats * 4
                ramp = 1.0 if b.next_part in ("drop", "groove") and b.last else 0.0
                for i in range(steps):
                    m = root + (12 if i % 4 == 2 else 0)
                    v = 0.22 + (0.008 + 0.012 * ramp) * i
                    sig = self.motion_voice(inst, m, v, b.beat / 4, 0.4)
                    self.add("motion", sig, b.t0 + i * b.beat / 4, pan=0.5 * math.sin(i * 2.1), gain=0.10 * v * gl, rev=0.25, dly=0.4)
                continue
            tones = self.arp_tones(b)
            ramp_in = b.first and part == "groove" and b.prev_part in (None, "intro")
            if kind in ("arp16", "arp16dark"):
                steps = b.beats * 4
                pv = pat[::-1] if (b.n >= 6 and (b.k // 4) % 2 == 1) else pat     # phrase variation in long sections
                for i in range(steps):
                    m = tones[pv[i % len(pv)] % len(tones)]
                    acc = 1.0 if i % 4 == 0 else (0.75 if i % 2 == 0 else 0.6)
                    v = (0.85 if e < 0.75 else 1.0) * acc * (1.15 if part == "drop" else 1.0)
                    if ramp_in:
                        v *= 0.45 + 0.55 * i / steps
                    bright = 0.55 + 0.45 * e
                    sig = self.motion_voice(inst, m, v, b.beat / 4, bright)
                    pan = 0.35 * math.sin(i * 1.7) if kind == "arp16" else (-0.35 if i % 2 else 0.35)
                    g = (0.10 if kind == "arp16" else 0.085) * v * gl
                    self.add("motion", sig, b.t0 + i * b.beat / 4, pan=pan, gain=g, rev=0.25, dly=0.55)
                    if kind == "arp16dark" and part == "drop":   # ghost echo three 16ths later, opposite side
                        self.add("motion", sig, b.t0 + (i + 3) * b.beat / 4, pan=-pan, gain=g * 0.3, rev=0.2)
            elif kind == "broken8":
                for i in range(b.beats * 2):
                    m = tones[pat[i % len(pat)] % len(tones)] - 12
                    v = (1.0 if i % 2 == 0 else 0.7) * (0.8 + 0.3 * e)
                    self.add("motion", self.motion_voice(inst, m, v, b.beat / 2), b.t0 + i * b.beat / 2,
                             pan=-0.25 + 0.5 * (i % 4) / 3, gain=0.12 * v * gl, rev=0.25, dly=0.25)
                if part == "drop" and e >= 0.75:   # marimba offbeats on top
                    for i in range(b.beats):
                        m = tones[(i * 2 + 1) % len(tones)]
                        self.add("motion", S.pluck(m, "marimba"), b.t0 + (i + 0.5) * b.beat, pan=0.4 * (-1) ** i,
                                 gain=0.07 * gl, rev=0.25, dly=0.3)
            elif kind == "bells8":
                rng = np.random.default_rng(S.seed_of(self.s.seed, b.i, "bells"))
                for i in range(b.beats * 2):
                    if rng.random() > (0.45 + 0.4 * e):
                        continue
                    m = tones[pat[i % len(pat)] % len(tones)]
                    self.add("motion", S.pluck(m, "bell" if inst in ("bell", "pluck", "arp") else "glass"),
                             b.t0 + i * b.beat / 2, pan=float(rng.uniform(-0.6, 0.6)), gain=0.07 * (0.6 + 0.4 * e) * gl,
                             rev=0.5, dly=0.6)
            elif kind == "comp":
                hits = [(0, 6, 1.0), (7, 2, 0.55), (10, 3, 0.7)] if b.beats >= 4 else [(0, 4 * b.beats, 1.0)]
                if part == "drop":
                    hits += [(14, 2, 0.5)]
                for st, ln, v in hits:
                    if st >= b.beats * 4:
                        continue
                    for j, m in enumerate(b.voicing[1:] if len(b.voicing) > 3 else b.voicing):
                        sig = self.motion_voice(inst, m, v * (0.7 + 0.3 * e), ln * b.beat / 4 / 1.6)
                        self.add("motion", sig, self.swung(b, st) + 0.01 * j, pan=-0.3 + 0.15 * j,
                                 gain=0.075 * v * gl, rev=0.25, dly=0.15)
            elif kind == "charleston":
                # piano comping on the Charleston rhythm: beat 1 and the swung 'and' of 2, a push on the 'and' of 4
                # into the next bar when the band is hot; rootless voicings (the bass has the root)
                hits = [(0, 0.55, 1.0), (6, 0.35, 0.8)]
                if part == "drop" or e >= 0.75:
                    hits += [(14, 0.3, 0.7)]
                elif b.k % 2 == 1:
                    hits += [(10, 0.25, 0.55)]
                vo = sorted(b.voicing[1:] if len(b.voicing) > 3 else b.voicing)
                for st, ln, v in hits:
                    if st >= b.beats * 4:
                        continue
                    for j, m in enumerate(vo):
                        sig = self.motion_voice(inst, m, v * (0.65 + 0.3 * e), ln * b.beat)
                        self.add("motion", sig, self.swung(b, st) + 0.006 * j, pan=-0.2 + 0.12 * j,
                                 gain=0.07 * v * gl, rev=0.2, dly=0.0)
            elif kind == "ostinato":
                low = [m - 12 for m in sorted(b.voicing)[:3]]
                seq = [low[0], low[0], low[min(2, len(low) - 1)], low[0], low[0] + 12, low[0], low[min(2, len(low) - 1)], low[min(1, len(low) - 1)]]
                for i in range(b.beats * 2):
                    v = (1.0 if i % 2 == 0 else 0.75) * (0.75 + 0.35 * e)
                    self.add("motion", self.motion_voice(inst, seq[i % 8], v, b.beat / 2), b.t0 + i * b.beat / 2,
                             pan=0.2 * (-1) ** i, gain=0.15 * v * gl, rev=0.3)

    # top layer ---------------------------------------------------------------
    def render_top(self):
        inst = self.s.roles.get("top")
        kind = self.p.get("topPattern")
        if inst is None or kind is None:
            return
        gl = self.lv["top"]
        for b in self.bars:
            if b.part != "drop" or b.energy < 0.8:
                continue
            tones = self.arp_tones(b)
            if kind == "octave":
                for i in range(b.beats * 2):
                    m = tones[(i * 3) % len(tones)] + 12
                    m = self.snap(m if m <= 100 else m - 12)
                    self.add("top", S.pluck(m, "bell" if inst != "glass" else "glass"), b.t0 + i * b.beat / 2 + b.beat / 4,
                             pan=-0.6 if i % 2 else 0.6, gain=0.035 * gl, rev=0.25, dly=0.55)
            elif kind == "stabs":
                ch = [m + 12 for m in sorted(b.voicing)[:3]]
                for q in range(b.beats):
                    self.add("top", S.stab(ch, 0.8), b.t0 + q * b.beat + b.beat / 2, pan=0.1, gain=0.16 * gl, rev=0.3)
            elif kind == "glock":
                for q in (1, 3):
                    if q < b.beats:
                        m = self.snap(tones[-1] + 12 if tones[-1] + 12 <= 100 else tones[-1])
                        self.add("top", S.pluck(m, "bell"), b.t0 + q * b.beat, pan=0.3, gain=0.05 * gl, rev=0.3, dly=0.4)
            elif kind == "shimmer":
                rng = np.random.default_rng(S.seed_of(self.s.seed, b.i, "top"))
                for q in range(b.beats):
                    if rng.random() < 0.4:
                        m = self.snap(S.SfxCtx(key_pc=self.s.key_pc, mode=self.s.mode).pent(int(rng.integers(0, 8)), 6))
                        self.add("top", S.pluck(m, "glass"), b.t0 + q * b.beat + float(rng.choice([0, 0.5])) * b.beat,
                                 pan=float(rng.uniform(-0.7, 0.7)), gain=0.05 * gl, rev=0.6, dly=0.6)
            elif kind == "high":
                sig = S.strings([m + 12 for m in sorted(b.voicing)[-2:]], b.dur, atk=0.2, rel=0.3, cutoff=5000, seed=b.i + 3)
                self.add("top", sig, b.t0, gain=0.08 * gl, rev=0.5)

    # motif (hook) ------------------------------------------------------------
    def render_motif(self):
        inst = self.s.roles.get("motif")
        if inst is None:
            return
        gl = self.lv["motif"]
        sc = S.SfxCtx(key_pc=self.s.key_pc, mode=self.s.mode)
        for b in self.bars:
            part = b.part
            phrase = b.k // 2
            half = b.k % 2
            if part == "intro":
                vel0 = 0.35
            elif part == "drop" and b.energy >= 0.9 and phrase % 2 == 1:
                vel0 = 0.28
            elif part == "groove" and b.n >= 6 and (b.k // 4) % 2 == 1:
                vel0 = 0.2          # long grooves: the hook answers quietly in alternate 4-bar phrases
            else:
                continue
            octave = 5 if part == "intro" else 6
            pcs = {m % 12 for m in b.voicing}
            for st, deg in self.motif:
                if st // 16 != half:
                    continue
                s16 = st % 16
                if s16 >= b.beats * 4:
                    continue
                m = sc.pent(deg, octave)
                if s16 % 4 == 0 and m % 12 not in pcs:     # strong positions snap to a chord tone
                    m = min((x for x in range(m - 3, m + 4) if x % 12 in pcs), key=lambda x: abs(x - m), default=m)
                m = self.snap(m)
                v = vel0 + 0.05 * self.motif.index((st, deg)) if part == "intro" else vel0
                kind = {"bell": "bell", "lead": "saw", "marimba": "marimba", "glass": "glass", "pluck": "bell"}.get(inst)
                if inst == "pulse-lead":
                    sig = S.chip_pulse(m, b.beat * 0.45, duty=0.5, vel=0.9, decay=1)
                    g = 0.16
                elif inst in ("piano", "epiano"):
                    sig = (S.piano if inst == "piano" else S.epiano)(m, b.beat * 0.9, 0.55)
                    g = 0.12
                elif inst in ("guitar", "ukulele", "koto"):
                    sig = getattr(S, inst)(m, b.beat * 2.0, min(1.0, 0.5 + 0.4 * v), seed=int(m) + 7)
                    g = 0.13
                elif inst == "clarinet":
                    sig = S.clarinet(m - 12, b.beat * 0.8, min(1.0, 0.55 + 0.4 * v))
                    g = 0.16
                else:
                    sig = S.pluck(m, kind or "bell", 0.7)
                    g = 0.10
                self.add("motif", sig, self.swung(b, s16), pan=(-0.4 if (st // 2) % 2 else 0.4), gain=g * v * gl,
                         rev=0.3, dly=0.45)

    # drums ---------------------------------------------------------------------
    def kit_hit(self, piece, var, vel):
        k = self.s.kit
        if k.get(piece if piece != "ohats" else "hats") == "chip":
            return S.chip_noise({"kick": "kick", "snare": "snare"}.get(piece, "hat"), var), {"kick": 0.42, "snare": 0.22}.get(piece, 0.09)
        if piece == "kick":
            return S.kick(k.get("kick") or "pop", var % 4), 0.38
        if piece == "clap":
            return S.clap(k.get("clap") or "pop", var % 4), 0.22 / 0.6
        if piece == "snare":
            return S.snare(k.get("snare") or "tight", var % 4), 0.2
        if piece == "rim":
            return S.rim(var % 4), 0.12
        if piece in ("hats", "ohats"):
            return S.hat(piece == "ohats", k.get("hats") or "bright", var % 4), 0.07
        if piece == "shaker":
            return S.shaker(var % 4), 0.035
        if piece == "ride":
            return S.ride(var % 4), 0.075
        if piece == "brush":
            return S.brush(var % 4), 0.26
        if piece == "toms":
            return S.tom(40 + (self.s.key_pc % 12) // 2 + (var % 3) * 3, var % 2), 0.3
        return None, 0

    def piece_on(self, piece):
        k = self.s.kit
        if piece in ("kick",):
            return bool(k.get("kick"))
        if piece == "clap":
            return bool(k.get("clap"))
        if piece == "snare":
            return bool(k.get("snare"))
        if piece in ("hats", "ohats"):
            return bool(k.get("hats"))
        return bool(k.get(piece))

    def render_drums(self):
        dens = self.s.drums
        if dens == "none":
            return
        g = GROOVES[self.p["grooves"]]
        gl = self.lv["drums"]
        heavy = self.heavy
        for b in self.bars:
            part, e = b.part, b.energy
            if part in ("breakdown", "outro"):
                if part == "breakdown" and self.p["grooves"] in ("cine", "dark") and e >= 0.45 and self.piece_on("kick"):
                    self.hit("kick", b, 0, 0.6 * gl, heavy)     # heartbeat pulse on 1
                continue
            if part == "intro":
                if e < 0.5:
                    continue
                pats = g["light"]
            elif part == "drop":
                pats = g["drop"] if dens == "full" else g["full"] if e >= 0.9 else g["light"]
            else:
                pats = g["full"] if (dens == "full" and e >= 0.5) else g["light"]
            steps = b.beats * 4
            for piece, pat in pats.items():
                if not self.piece_on(piece):
                    continue
                if piece == "shaker" and part == "groove" and b.k < 2 and b.n > 3:
                    continue      # shaker joins on the 3rd bar of a long groove
                if piece == "ohats" and part != "drop" and b.k % 2 == 0:
                    continue      # open hat every other bar in grooves
                for st in range(steps):
                    v = pat_vel(pat, st)
                    if v <= 0:
                        continue
                    self.hit(piece, b, st, v * self.hum(b, st) * gl, heavy)
            if self.s.scale > 1.0 and self.s.bpm_out < 100 and part in ("groove", "drop") and self.piece_on("hats") \
                    and "hats" in pats:
                for st in range(1, steps, 2):        # a slowed variant: 16th hats keep the groove from feeling empty
                    if pat_vel(pats["hats"], st) == 0:
                        self.hit("hats", b, st, 0.35 * gl, heavy)
            # phrase fill: 16th hats in the last beat of every 4th bar of a long section (not before a change)
            if part in ("groove", "drop") and (b.k % 4 == 3) and not b.last and "hats" in pats and self.piece_on("hats") \
                    and b.beats == 4:
                for k in range(4):
                    if pat_vel(pats["hats"], 12 + k) == 0:
                        self.hit("hats", b, 12 + k, (0.5 + 0.12 * k) * gl, heavy)

    def hit(self, piece, b, st, vel, heavy):
        t = self.swung(b, st)
        sig, base = self.kit_hit(piece, S.seed_of(b.i, st, piece) % 8, vel)
        if sig is None:
            return
        if piece == "kick":
            if any(abs(t - h) < 0.03 for h in heavy):
                vel *= 0.55       # let a heavy SFX on this beat speak
            self.kicks.append(t)
        pan = {"hats": 0.25, "ohats": 0.25, "shaker": -0.3, "clap": 0.05, "snare": 0.0, "rim": 0.2, "toms": -0.15, "ride": 0.35, "brush": -0.05}.get(piece, 0.0)
        rev = {"clap": 0.35, "snare": 0.3, "rim": 0.2, "hats": 0.12, "ohats": 0.12, "toms": 0.35, "ride": 0.18, "brush": 0.25}.get(piece, 0.0)
        self.add("drums", sig, t, pan=pan, gain=base * vel, rev=rev)

    # sections: risers, fills, crashes, gaps, final hit ----------------------------------
    def render_sections(self):
        secs = self.secs
        bars = self.bars
        fam = self.p.get("riser", "glassy")
        bpm, bpb = self.s.bpm_out, self.s.bpb
        sctx = dict(bpm=bpm, beats_per_bar=bpb, key_pc=self.s.key_pc, mode=self.s.mode)
        for si in range(1, len(secs)):
            A, B = secs[si - 1], secs[si]
            a_bars = [b for b in bars if b.sec == si - 1]
            b_bars = [b for b in bars if b.sec == si]
            if not a_bars or not b_bars:
                continue
            tb = b_bars[0].t0
            eA, eB = A["energy"], B["energy"]
            last = a_bars[-1]
            build = B["part"] in ("drop", "groove") and (eB > eA + 0.1 or A["part"] in ("intro", "breakdown"))
            if B["part"] == "outro":
                build = eB >= eA and A["part"] not in ("drop",)
            authored = any(abs(t - tb) < 0.06 for t, _ in self.sfx_build)   # the cue sheet already builds here
            authored_roll = any(abs(t - tb) < 0.06 and nm == "roll" for t, nm in self.sfx_build)
            if build:
                nb = 2 if (len(a_bars) >= 4 and B["part"] == "drop") else 1
                rb = a_bars[-nb:]
                rdur = sum(x.dur for x in rb)
                if not authored:
                    st, anc, d, _ = S.render_sfx("riser", {"dur": f"{rdur}s"}, family=fam, seed=S.seed_of(self.s.seed, "riser", si), **sctx)
                    self.mix.add("fxm", st, tb, anchor=anc, gain=(0.75 + 0.35 * eB), sends={"mrev": 0.2})
                if B["part"] in ("drop", "outro") and not authored:      # reverse swell + roll only into big arrivals
                    sw, anc2, _, _ = S.render_sfx("swell", {"dur": f"{min(1.0, last.beats) * last.beat}s"}, family=fam,
                                                  seed=S.seed_of(self.s.seed, "swell", si), **sctx)
                    self.mix.add("fxm", sw, tb, anchor=anc2, gain=0.8, sends={"mrev": 0.3})
                if B["part"] == "drop" and not authored_roll:
                    self.fill(last, tb, strong=True)
                elif A["part"] != "intro" and self.s.drums != "none" and last.beats == 4:
                    self.fill(last, tb, strong=False, light=True)
                if self.s.drop_gap and B["part"] == "drop" and eB >= 0.85:
                    self.gaps.append((tb - last.beat / 8, tb))
                self.report_events.append({"t": round(tb, 4), "event": f"build into {B['part']}",
                                           "riser": "authored cue" if authored else f"{nb} bar(s)"})
            elif B["part"] in ("groove", "drop") and self.s.drums != "none" and last.beats == 4:
                self.fill(last, tb, strong=False, light=True)
            # downbeat of the new section
            near_crash = any(abs(t - tb) < 0.06 for t in self.sfx_crash)
            if B["part"] == "drop":
                if not near_crash:
                    st, _, _, _ = S.render_sfx("shimmer", {}, family=self.s.family if self.s.family != "minimal" else "glassy",
                                               seed=S.seed_of(self.s.seed, "crash", si), **sctx)
                    self.mix.add("fxm", st, tb, gain=0.9 if eB >= 0.9 else 0.6, sends={"mrev": 0.4})
                y = S.sub(b_bars[0].bass - 12, 1.2 * b_bars[0].beat, atk=0.003, rel=0.4)
                self.add("fxm", y * np.exp(-S.tt(len(y)) / 0.5), tb, gain=0.22)
                self.report_events.append({"t": round(tb, 4), "event": "drop downbeat (crash + sub)"})
            elif B["part"] == "breakdown":
                th = S._thud(S.SfxCtx(seed=S.seed_of(self.s.seed, "bd", si)), 120, 45, 0.18, 0.4, 0.2)
                self.add("fxm", th, tb, gain=0.25, rev=0.5)
                if not near_crash and eA >= 0.6:
                    st, _, _, _ = S.render_sfx("shimmer", {"flags": ["soft"]}, family=self.s.family,
                                               seed=S.seed_of(self.s.seed, "crash", si), **sctx)
                    self.mix.add("fxm", st, tb, gain=0.6, sends={"mrev": 0.4})
                dl, _, _, _ = S.render_sfx("downlifter", {"dur": f"{min(b_bars[0].dur, 2.5)}s"}, family=self.s.family,
                                           seed=S.seed_of(self.s.seed, "dl", si), **sctx)
                self.mix.add("fxm", dl, tb, gain=0.5, sends={"mrev": 0.3})
                self.report_events.append({"t": round(tb, 4), "event": "breakdown (drums stop)"})
            elif eB < eA - 0.2 and B["part"] != "outro":
                if not near_crash:
                    st, _, _, _ = S.render_sfx("shimmer", {"flags": ["soft"]}, family=self.s.family,
                                               seed=S.seed_of(self.s.seed, "crash", si), **sctx)
                    self.mix.add("fxm", st, tb, gain=0.5, sends={"mrev": 0.4})
            elif B["part"] == "groove" and A["part"] == "intro" and not near_crash:
                st, _, _, _ = S.render_sfx("shimmer", {"flags": ["soft"]}, family=self.s.family,
                                           seed=S.seed_of(self.s.seed, "crash", si), **sctx)
                self.mix.add("fxm", st, tb, gain=0.55, sends={"mrev": 0.4})
        self.final_hit()

    def fill(self, last: Bar, tb, strong=True, light=False):
        kind = self.p.get("fill")
        if kind is None or last.beats < 2:
            return
        if light:
            if not self.piece_on("hats"):
                return
            for k in range(4):
                self.add("drums", S.hat(False, self.s.kit.get("hats") or "bright", k), tb - last.beat + k * last.beat / 4,
                         pan=-0.2, gain=0.07 * (0.5 + 0.12 * k))
            return
        bt = last.beat
        times = [tb - 2 * bt + i * bt / 2 for i in range(2)] + [tb - bt + i * bt / 4 for i in range(2)] + \
                [tb - bt / 2 + i * bt / 8 for i in range(4 if strong else 3)]
        for i, t in enumerate(times):
            v = 0.3 + 0.6 * i / max(1, len(times) - 1)
            if kind == "toms":
                sig = S.tom(43 - (i % 3) * 2, i % 2)
                self.add("drums", sig, t, pan=-0.3 + 0.6 * i / len(times), gain=0.25 * v, rev=0.35)
            elif kind == "snare":
                self.add("drums", S.snare(self.s.kit.get("snare") or "tight", i % 4), t, gain=0.22 * v, rev=0.25)
            else:
                self.add("drums", S.clap(self.s.kit.get("clap") or "pop", i % 4), t, pan=0.05, gain=0.36 * v, rev=0.2)
        if self.piece_on("hats") and strong:
            for i in range(8):
                self.add("drums", S.hat(False, self.s.kit.get("hats") or "bright", i % 4), tb - 2 * bt + i * bt / 4,
                         pan=0.25, gain=0.07 * (0.35 + 0.06 * i))

    def final_hit(self):
        s = self.s
        bars = self.bars
        mode = s.final_hit
        if mode == "none" or not bars:
            return
        outro = [b for b in bars if b.part == "outro"]
        if isinstance(mode, int) and 0 <= mode < len(bars):
            hb = bars[mode]
        elif outro and mode != "lastBar":
            hb = outro[0]
        else:
            hb = bars[-1]
        t = hb.t0
        rest = s.dur_out - t
        fam = s.family
        sctx = dict(bpm=s.bpm_out, beats_per_bar=s.bpb, key_pc=s.key_pc, mode=s.mode)
        fin = parse_chord((self.p.get("final") or {}).get(s.base) or "I:maj9", s.base, s.mode)
        pcs = chord_pcs(fin, s.key_pc, nmax=5)
        root = 41 + ((s.key_pc - 5) % 12)        # F2-ish register for the tonic
        root = root - 12 if root > 46 else root
        notes = sorted({root + 12, root + 19} | {root + 12 + ((pc - (root % 12)) % 12) + 12 * k for pc in pcs for k in (0, 1)})
        notes = [n for n in notes if n <= root + 36][:8]
        if self.piece_on("kick"):
            k = S.kick(s.kit.get("kick") or "pop", 1)
            self.add("drums", k, t, gain=0.38)
            self.kicks.append(t)
        near_crash = any(abs(x - t) < 0.06 for x in self.sfx_crash)
        if not near_crash:
            st, _, _, _ = S.render_sfx("shimmer", {}, family=fam if fam != "minimal" else "glassy",
                                       seed=S.seed_of(s.seed, "final-crash"), **sctx)
            self.mix.add("fxm", st, t, gain=0.8 if fam != "minimal" else 0.45, sends={"mrev": 0.4})
        bed = s.roles.get("bed") or "pad"
        rel = max(0.4, min(rest - min(rest, hb.dur) * 0.5, 1.8))
        if bed == "strings":
            sig = S.strings(notes, min(hb.dur, rest) * 0.6, atk=0.02, rel=rel, cutoff=4200, seed=7)
        else:
            sig = S.pad(notes, min(hb.dur, rest) * 0.6, cutoff=5000, cut_end=1400, atk=0.01, rel=rel, seed=7)
        self.add("bed", sig, t, gain=0.13, rev=0.9)
        cascade = [n + 12 for n in notes[1:]][:8]
        for i, m in enumerate(cascade):
            inst = s.roles.get("motif") or "bell"
            if inst in ("piano", "epiano"):
                sig = (S.piano if inst == "piano" else S.epiano)(m, 1.2, 0.7)
            else:
                sig = S.pluck(m, "bell")
            self.add("motif", sig, t + i * 0.03, pan=(i / max(1, len(cascade) - 1)) * 1.2 - 0.6, gain=0.075, rev=0.5, dly=0.3)
        n = S.ns(min(rest, 3.0))
        tl = S.tt(n)
        fb = float(S.mtof(hb.bass))
        y = np.tanh(1.6 * (np.sin(2 * np.pi * fb * tl) + 0.18 * np.sin(4 * np.pi * fb * tl))) * np.exp(-tl / 0.8) * np.minimum(1, tl / 0.006)
        self.add("bass", S.fades(S.lp(y, 900), 0.002, 0.3), t, gain=0.27)
        y = np.sin(2 * np.pi * float(S.mtof(hb.bass - 12)) * tl) * np.exp(-tl / 1.0) * np.minimum(1, tl / 0.01)
        self.add("bass", S.fades(y, 0.002, 0.3), t, gain=0.3)
        # long outro: a quiet resolved bed + motif echoes after the hit rings out
        tail_t = t + max(hb.dur, 2.2)
        if s.dur_out - tail_t > 1.5:
            tdur = s.dur_out - tail_t
            v = voice_chord(chord_pcs(fin, s.key_pc), None, 52, 72)
            sig = S.pad(v, tdur, cutoff=1100, atk=1.2, rel=0.2, seed=11) if bed != "strings" else S.strings(v, tdur, atk=1.2, rel=0.2, cutoff=2000, seed=11)
            self.add("bed", sig, tail_t, gain=0.1, rev=0.5)
            sc = S.SfxCtx(key_pc=s.key_pc, mode=s.mode)
            k = 0
            while tail_t + k * 2 * hb.beat < s.dur_out - 1.0:
                m = sc.pent([4, 2, 0, 2, 4, 7][k % 6], 5)
                self.add("motif", S.pluck(m, "bell"), tail_t + k * 2 * hb.beat, pan=0.3 * (-1) ** k, gain=0.035, rev=0.5, dly=0.5)
                k += 1
        self.report_events.append({"t": round(t, 4), "event": "final hit", "chord": chord_name(fin, s.key_pc, s.base)})


# ───────────────────────────── SFX cues ─────────────────────────────

CUE_PARAM_KEYS = ("gain", "pan", "family", "n", "gap", "pitch", "step", "rise", "peak", "density", "pre", "dir")


def cue_params(c: dict):
    extra = {}
    for k in CUE_PARAM_KEYS:
        if k in c and c[k] is not None:
            extra[k] = c[k]
    if isinstance(c.get("durBeats"), (int, float)):
        extra["dur"] = float(c["durBeats"])            # beats
    elif isinstance(c.get("dur"), (int, float)):
        extra["dur"] = f"{float(c['dur'])}s"            # the planner writes seconds
    elif isinstance(c.get("dur"), str):
        extra["dur"] = c["dur"]
    if isinstance(c.get("flags"), (list, tuple)):
        extra["flags"] = list(c["flags"])
    return extra


def collect_cues(song: Song):
    """Explicit cues (cut "cues") + automatic transition SFX at scene boundaries -> list of dicts (scene time)."""
    cues, bad = [], []
    for c in song.cut.get("cues") or []:
        spec = c.get("sfx")
        if not spec:
            continue
        try:
            layers = S.parse_sfx(spec)
        except ValueError as e:
            bad.append(f"{c.get('scene')}@{c.get('t')}: {e}")
            continue
        extra = cue_params(c)
        for li, (name, prm) in enumerate(layers):
            prm = dict(prm)
            for k, v in extra.items():
                if k == "flags":
                    prm["flags"] = prm.get("flags", []) + list(v)
                else:
                    prm.setdefault(k, v)
            cues.append({"t": float(c["t"]), "spec": spec, "name": name, "params": prm, "scene": c.get("scene"),
                         "auto": False, "seed": S.seed_of(c.get("scene"), spec, c.get("anchor"), c.get("offset"), c.get("rep"), li)})
    if song.transition_sfx:
        explicit = cues[:]
        for sc in song.cut.get("scenes") or []:
            tr = sc.get("in")
            if not sc.get("index") and float(sc.get("t0", 0)) <= 0:
                continue
            ent = TRANSITION_SFX.get(tr)
            if not ent:
                continue
            spec, off = ent
            t0 = float(sc["t0"]) + off
            near = [c for c in explicit if abs(c["t"] - t0) <= 0.75 * song.scene_beat and
                    S.SFX[c["name"]].role in ("transition", "impact", "build")]
            if near:
                continue
            for li, (name, prm) in enumerate(S.parse_sfx(spec)):
                cues.append({"t": t0, "spec": spec, "name": name, "params": prm, "scene": sc.get("id"), "auto": True,
                             "transition": tr, "seed": S.seed_of(sc.get("id"), "in", tr, li)})
    cues.sort(key=lambda c: (c["t"], c["name"]))
    return cues, bad


def render_cues(song: Song, arr: Arranger, cues, bad):
    placed = []
    for c in cues:
        t_out = song.W(c["t"])
        try:
            st, anc, d, ctx = S.render_sfx(c["name"], c["params"], family=song.family, bpm=song.bpm_out,
                                           beats_per_bar=song.bpb, slope=song.slope(c["t"]), key_pc=song.key_pc,
                                           mode=song.mode, seed=c["seed"])
        except Exception as e:      # a broken param must not kill the whole render
            msg = f"{c.get('scene')}@{c['t']:g}: sfx {c['spec']!r} could not be rendered ({e})"
            song.warn(msg)
            bad.append(msg)
            continue
        if not np.all(np.isfinite(st)):
            st = np.nan_to_num(st)
        arr.mix.add("sfx", st, t_out, anchor=anc, sends={"srev": d.rev, "sdly": d.dly})
        if c["name"] in HEAVY_SFX:
            arr.heavy.append(t_out)
        if c["name"] in ("shimmer", "impact", "sting", "reveal", "boom"):
            arr.sfx_crash.append(t_out)
        if d.role == "build" and d.anchor == "end":
            arr.sfx_build.append((t_out, c["name"]))
        placed.append({"t": round(t_out, 6), "sceneT": round(c["t"], 6), "sfx": c["spec"], "name": c["name"],
                       "family": ctx.family, "anchor": d.anchor, "role": d.role, "scene": c["scene"], "auto": c["auto"],
                       "params": {k: v for k, v in c["params"].items() if v not in (None, [])}, "seed": c["seed"],
                       "start": round(t_out - anc / S.SR, 6), "len": round(st.shape[1] / S.SR, 4),
                       "slope": round(song.slope(c["t"]), 4), **({"transition": c["transition"]} if c.get("transition") else {})})
    return placed


# ───────────────────────────── mixdown ─────────────────────────────

def mixdown(song: Song, arr: Arranger, want_music=True, want_sfx=True):
    p = song.p
    mx = arr.mix
    n = mx.n
    bt = song.beat
    rel = min(0.3, 0.6 * bt)
    kicks = arr.kicks if song.drums != "none" else []
    sc = {k: S.duck_envelope(n, kicks, v, release=rel) for k, v in p["sidechain"].items()}
    music = np.zeros((2, n))
    if want_music:
        dly = S.pingpong(mx.bus("mdly"), p["delay"]["beats"] * bt, p["delay"]["fb"], p["delay"]["taps"])
        rv = S.reverb(mx.bus("mrev") + 0.35 * dly, size=p["reverb"]["size"], damp=p["reverb"]["damp"])
        music = (mx.bus("bed") * sc["bed"] + mx.bus("bass") * sc["bass"]
                 + (mx.bus("motion") + mx.bus("motif") + dly) * sc["motion"] + mx.bus("top") * sc["top"]
                 + mx.bus("drums") + mx.bus("fxm") + p["reverb"]["ret"] * rv * sc["motion"])
        if p.get("tape"):
            music = S.wow(music)
            music = S.lp(music, 5200)
        if song.crackle:
            cr = S.crackle(n, np.random.default_rng(S.seed_of(song.seed, "crackle")))
            music += S.pan2(cr, 0.0) * 0.5
        for a, b in arr.gaps:     # pre-drop suck: music silent for the last 1/8 beat
            ia, ib = int(a * S.SR), int(b * S.SR)
            r = int(0.004 * S.SR)
            g = np.ones(n)
            g[ia:ib] = 0.0
            g[max(0, ia - r):ia] = np.linspace(1, 0, min(r, ia))
            g[ib:min(n, ib + r)] = np.linspace(0, 1, min(r, n - ib))
            music *= g
        if arr.heavy:
            music *= S.duck_envelope(n, arr.heavy, 0.3, release=0.35, attack=0.005, hold=0.05)
        lv = S.integrated_lufs(music)
        arr.music_lufs_raw = lv
        if math.isfinite(lv):
            music *= 10 ** ((REF_MUSIC_LUFS - lv + song.music_db) / 20)
    sfx = np.zeros((2, n))
    if want_sfx and "sfx" in mx.buses:
        sdl = S.pingpong(mx.bus("sdly"), 0.75 * bt, 0.4, 4)
        srv = S.reverb(mx.bus("srev") + 0.35 * sdl, size=min(3.0, p["reverb"]["size"]), damp=p["reverb"]["damp"])
        sfx = (mx.bus("sfx") + sdl + 0.55 * srv) * 10 ** (song.sfx_db / 20)
    return music, sfx


# ───────────────────────────── main ─────────────────────────────

def out_base(project, cut, args):
    """Output base path. --stem writes music-<cut>[tag]-stem.wav/.json beside (never over) the mastered song."""
    if args.out:
        b = args.out[:-4] if args.out.lower().endswith((".wav", ".m4a")) else args.out
        return b
    tag = ""
    if args.scale and float(args.scale) != 1.0:
        tag = f"-x{float(args.scale):g}"
    elif args.warp:
        tag = "-warp"
    return os.path.join(project, "build", f"music-{cut}{tag}" + ("-stem" if args.stem else ""))


def run(args):
    global QUIET
    QUIET = args.quiet
    t_start = time.time()
    project = args.project
    song = Song(project, args.cut, args)
    secs = music_sections(song)
    bars = build_bars(song, secs)
    assign_harmony(song, bars, secs)
    motif = make_motif(song)
    arr = Arranger(song, bars, secs, motif)
    cues, bad = ([], []) if args.no_sfx else collect_cues(song)
    for b in bad:
        song.warn("unknown SFX: " + b)
    placed = render_cues(song, arr, cues, bad) if cues else []
    if not args.no_music:
        arr.render_drums()
        arr.render_bed()
        arr.render_bass()
        arr.render_motion()
        arr.render_top()
        arr.render_motif()
        arr.render_sections()
    music, sfx = mixdown(song, arr, not args.no_music, not args.no_sfx)
    total = music + sfx
    base = out_base(project, args.cut, args)
    os.makedirs(os.path.dirname(os.path.abspath(base)), exist_ok=True)
    rep = {"cut": str(args.cut), "file": os.path.basename(base) + ".wav", "mastered": not args.stem, "stem": bool(args.stem),
           "sr": S.SR, "samples": int(total.shape[1]), "duration": round(song.dur_out, 6), "sceneDuration": song.duration,
           "bpm": round(song.bpm_out, 6), "sceneBpm": song.bpm, "beatsPerBar": song.bpb, "beatSec": round(song.beat, 6),
           "barSec": round(song.beat * song.bpb, 6), "scale": song.scale,
           "warp": [[float(o), float(s)] for o, s in zip(*song.warp)] if song.warp else None,
           "preset": song.preset_name, "key": song.key_name, "mode": song.mode, "drums": song.drums, "sfxFamily": song.family,
           "roles": song.roles, "kit": {k: v for k, v in song.kit.items() if v}, "seed": song.seed,
           "sections": [{"fromBar": m["fromBar"], "toBar": m["toBar"], "part": m["part"], "energy": round(m["energy"], 3),
                         "t0": round(next((b.t0 for b in bars if b.sec == i), 0.0), 6),
                         "chords": [chord_name(b.chord, song.key_pc, song.base) for b in bars if b.sec == i]} for i, m in enumerate(secs)],
           "bars": [{"i": b.i, "t0": round(b.t0, 6), "beats": b.beats, "part": b.part} for b in bars],
           "kicks": [round(k, 6) for k in sorted(set(arr.kicks))], "events": arr.report_events, "cues": placed,
           "musicLufsRaw": round(getattr(arr, "music_lufs_raw", float("nan")), 2)}
    paths = []
    if args.stem:
        y, g = S.normalize_lufs(total, STEM_LUFS, peak_max_db=-1.0)
        S.write_wav(base + ".wav", y, 24)
        paths.append(base + ".wav")
        rep["loudness"] = {**S.measure(y), "gainDb": round(g, 2)}
    else:
        y, st = S.master(total, args.lufs, args.tp, margin=0.5, lowcut=song.p.get("lowcut", 0.0), fade_out=0.3)
        S.write_wav(base + ".wav", y, 24)
        paths.append(base + ".wav")
        enc = S.encode_aac(base + ".wav", base + ".m4a", args.bitrate, args.tp)
        paths.append(base + ".m4a")
        rep["loudness"] = {**S.measure(y), "m4a": enc}
        if args.embed_bitrate and str(args.embed_bitrate) not in ("0", "none", "off"):
            enc2 = S.encode_aac(base + ".wav", base + "-embed.m4a", args.embed_bitrate, args.tp)
            paths.append(base + "-embed.m4a")
            rep["loudness"]["embed"] = enc2
    if args.stems:
        sd = os.path.join(os.path.dirname(os.path.abspath(base)), "stems")
        tag = os.path.basename(base).replace("music-", "").replace("-stem", "")
        g = 10 ** (rep["loudness"].get("gainDb", 0.0) / 20) if args.stem else 10 ** ((STEM_LUFS - S.integrated_lufs(total)) / 20)
        pk = max(float(np.abs(v).max()) for v in (music, sfx, total))
        g = min(g, 10 ** (-1 / 20) / max(pk, 1e-9))          # no stem may clip
        for nm, x in (("music", music), ("sfx", sfx)):
            S.write_wav(os.path.join(sd, f"{tag}-{nm}.wav"), x * g, 24)
            paths.append(os.path.join(sd, f"{tag}-{nm}.wav"))
    rep["warnings"] = song.warnings
    rep["notes"] = song.notes
    rep["unknownSfx"] = bad
    rep["seconds"] = round(time.time() - t_start, 2)
    with open(base + ".json", "w", encoding="utf-8") as f:
        json.dump(rep, f, indent=1, ensure_ascii=False)
    L = rep["loudness"]
    msg = (f"music {args.cut}: {song.dur_out:.3f} s, {len(bars)} bars @ {song.bpm_out:g} BPM, {song.preset_name} in "
           f"{song.key_name} {song.mode}, {len(placed)} SFX ({sum(1 for c in placed if c['auto'])} auto), "
           f"{L['lufs']:.2f} LUFS, {L['truePeak']:.2f} dBTP" + (" [stem, unmastered]" if args.stem else "")
           + (f", m4a {L['m4a']['truePeak']:.2f} dBTP" if "m4a" in L else "") + f" ({rep['seconds']:.1f} s)")
    print(msg)
    for pth in paths + [base + ".json"]:
        print("  " + os.path.relpath(pth, project) if os.path.abspath(pth).startswith(os.path.abspath(project)) else "  " + pth)
    return 2 if bad else 0


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--project", required=True)
    ap.add_argument("--cut", required=True)
    ap.add_argument("--stem", action="store_true",
                    help="write the unmastered bed (music + SFX) for mix_vo.py to music-<cut>-stem.wav/.json; the mastered "
                         "music-<cut>.* files are left untouched")
    ap.add_argument("--stems", action="store_true", help="also write build/stems/<cut>-music.wav and <cut>-sfx.wav")
    ap.add_argument("--scale", type=float, default=None, help="uniform slow-down factor (tempo becomes BPM / scale)")
    ap.add_argument("--warp", default=None, help='piecewise warp "out:scene,..." in seconds (same BPM)')
    ap.add_argument("--preset", default=None, choices=list(PRESETS))
    ap.add_argument("--no-transition-sfx", action="store_true")
    ap.add_argument("--no-sfx", action="store_true")
    ap.add_argument("--no-music", action="store_true")
    ap.add_argument("--seed", type=int, default=None)
    ap.add_argument("--lufs", type=float, default=-14.0)
    ap.add_argument("--tp", type=float, default=-1.0)
    ap.add_argument("--bitrate", default="256k")
    ap.add_argument("--embed-bitrate", default="96k", help="<base>-embed.m4a for the single-file HTML (0 = skip)")
    ap.add_argument("--out", default=None, help="output base path (default P/build/music-<cut>[-x<scale>|-warp])")
    ap.add_argument("--quiet", action="store_true")
    a = ap.parse_args(argv)
    try:
        return run(a)
    except InputError as e:
        print(f"error: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
