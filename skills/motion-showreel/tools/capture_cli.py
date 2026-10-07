#!/usr/bin/env python3
"""Record REAL terminal output for a showreel: run commands in a pseudo-terminal of a fixed size and write an
asciicast v2 file (exact output bytes + timing), the final screen as text, and a provenance sidecar.

    capture_cli.py --cmd "<command>" [--cmd "<next>"] --out P/assets/captures/term/<name>.cast
                   [--cols 100 --rows 30] [--cwd DIR] [--prompt '\\e[1;32m$\\e[0m '] [--title T]
                   [--key REGEX] [--until REGEX] [--idle-exit S] [--timeout S] [--send 'DELAY:TEXT']
                   [--env K=V] [--keep-env NAME] [--clean-env] [--force-color]
                   [--on-secret redact|warn|fail] [--redact WORD[=REPL]] [--redact-emails] [--no-anonymize]
                   [--theme catppuccin-mocha | --theme '{"fg":..,"bg":..,"palette":"#..:#.."}']
    capture_cli.py play   FILE.cast [--speed X | --fit S] [--idle-limit S]     replay in this terminal
    capture_cli.py retime FILE.cast --out NEW.cast [--speed X | --fit S] [--idle-limit S]
    capture_cli.py screen FILE.cast [--at T] [--all]                          emulated screen at time T
    capture_cli.py scan   FILE.cast [--fix]                                   secret / PII report

Outputs next to --out: <name>.cast (asciicast v2; header block `x_showreel.segments` lets term.js type the
command), <name>.screen.txt (final buffer incl. scrollback) and <name>.json (sidecar: cmd, exit, seconds, when,
cols, rows, redactions, key lines, provenance).

Safety: secret-looking environment variables are dropped before the command runs (the sidecar records only how
many; the names go to stderr); the recorded stream, the command lines (echoed or not), --title, the keys sent with
--send and the values of secret-looking variables (inherited, --keep-env or --env NAME=VALUE) are scanned for
key-like strings, which are masked with same-length dots by default (--on-secret). Home path, user@host, the user
name inside paths and the host name are anonymized (~, user, host). Only the prompt line is synthesized (and marked
as such); output bytes are otherwise unmodified. `scan` checks every part that ships (output and input events, the
header's command/title/segments, the .json sidecar and .screen.txt) and exits 1 on a secret, the home path, the user
name or the host name; `scan --fix` masks them in place.

Side effects: the command really runs. Capture in a throwaway copy or demo directory (--cwd), with demo
credentials, and prefer the tool's own --dry-run; ask the user before anything that deploys, publishes, migrates,
deletes, writes outside that directory or spends paid API quota.
"""
import argparse
import codecs
import datetime as dt
import fcntl
import getpass
import json
import math
import os
import platform
import re
import select
import shutil
import signal
import socket
import struct
import subprocess
import sys
import termios
import time
import unicodedata
from pathlib import Path

VERSION = "1.0.0"
DEFAULT_PROMPT = "\x1b[1;32m$\x1b[0m "

# ───────── secrets ─────────
SECRET_NAME = re.compile(r"(?i)(secret|token|passw|pwd|passphrase|api[_-]?key|apikey|access[_-]?key|private|credential|"
                         r"auth|session|cookie|bearer|signature|webhook|dsn|conn(ection)?[_-]?str|_key$|^key$|license)")
NOT_SECRET = {"PWD", "OLDPWD", "XPC_SERVICE_NAME", "TERM_SESSION_ID", "SECURITYSESSIONID"}   # name matches, value is not a secret
SAFE_ENV = {"PATH", "HOME", "LANG", "LANGUAGE", "LC_ALL", "LC_CTYPE", "LC_MESSAGES", "TERM", "COLORTERM", "SHELL",
            "TMPDIR", "TZ", "USER", "LOGNAME", "PWD", "EDITOR", "PAGER", "NO_COLOR", "FORCE_COLOR", "CLICOLOR",
            "CLICOLOR_FORCE", "COLUMNS", "LINES", "VIRTUAL_ENV", "CONDA_PREFIX", "PYTHONPATH", "NODE_PATH",
            "GOPATH", "CARGO_HOME", "RUSTUP_HOME", "JAVA_HOME", "SSL_CERT_FILE"}
SECRET_PATTERNS = [
    ("private-key", re.compile(r"-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----[\s\S]*?(-----END [A-Z0-9 ]*PRIVATE KEY-----|$)"), 0),
    ("aws-access-key", re.compile(r"\b(?:AKIA|ASIA)[0-9A-Z]{16}\b"), 0),
    ("github-token", re.compile(r"\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b"), 0),
    ("anthropic-key", re.compile(r"\bsk-ant-[A-Za-z0-9_\-]{20,}"), 0),
    ("openai-key", re.compile(r"\bsk-(?:proj-|svcacct-|admin-)?[A-Za-z0-9_\-]{20,}"), 0),
    ("google-api-key", re.compile(r"\bAIza[0-9A-Za-z_\-]{35}\b"), 0),
    ("slack-token", re.compile(r"\bxox[abposr]-[A-Za-z0-9-]{10,}"), 0),
    ("stripe-key", re.compile(r"\b[rsp]k_(?:live|test)_[A-Za-z0-9]{16,}\b"), 0),
    ("huggingface-token", re.compile(r"\bhf_[A-Za-z0-9]{30,}\b"), 0),
    ("npm-token", re.compile(r"\bnpm_[A-Za-z0-9]{36}\b"), 0),
    ("jwt", re.compile(r"\beyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}"), 0),
    ("bearer", re.compile(r"(?i)\bbearer\s+([A-Za-z0-9._~+/\-]{16,}=*)"), 1),
    ("url-credentials", re.compile(r"\b[a-z][a-z0-9+.\-]*://[^\s/:@]+:([^\s/@]+)@"), 1),
    ("assignment", re.compile(r"(?i)\b(?:api[_-]?key|secret|token|passw(?:or)?d|access[_-]?key|client[_-]?secret)\b[\"']?\s*[:=]\s*[\"']?([^\s\"',;]{8,})"), 1),
]
# Commands that change the world outside a throwaway directory (deploy, publish, push, migrate, delete, sudo).
# record() refuses them unless --allow-side-effects: a showreel capture must never deploy or publish for real.
_CMD_START = r"(?:^|&&|\|\||;|\||\$\(|`)\s*(?:\w+=\S*\s+)*"
RISKY = re.compile(
    r"(?i)\bgit\s+push\b|\b(?:npm|yarn|pnpm|bun|cargo|poetry|gem)\s+(?:publish|push)\b|\btwine\s+upload\b"
    r"|\bgh\s+(?:release\s+(?:create|delete|upload)|repo\s+delete|pr\s+merge)\b|\bdocker\s+push\b"
    r"|\bkubectl\s+(?:apply|delete|rollout|scale|replace|patch)\b|\bterraform\s+(?:apply|destroy|import)\b"
    r"|\bhelm\s+(?:install|upgrade|uninstall|delete|rollback)\b"
    r"|\b(?:vercel|netlify|firebase|flyctl|fly|wrangler|serverless|sls|cdk|sam|amplify|heroku|railway|render)\s+(?:deploy|publish|destroy)\b"
    r"|\bvercel\b.*\s--prod\b|\brm\s+-[a-z]*(?:r[a-z]*f|f[a-z]*r)\b|\bsudo\b|\b(?:drop|truncate)\s+(?:table|database|schema)\b"
    r"|" + _CMD_START + r"(?!(?:echo|printf|grep|rg|cat|less|man|which|type|help)\b)[\w./-]+(?:\s+[\w./-]+)?"
    r"\s+(?:deploy|publish|migrate|destroy|upload|release)(?:\s|$)")
EMAIL = re.compile(r"\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9\-]+(?:\.[A-Za-z0-9\-]+)*\.[A-Za-z]{2,}\b")
HIGH_ENTROPY = re.compile(r"[A-Za-z0-9+/_\-]{32,}={0,2}")


def entropy(s):
    from collections import Counter
    n = len(s)
    return -sum(c / n * math.log2(c / n) for c in Counter(s).values()) if n else 0.0


def unescape(s):
    """Backslash escapes for prompts and --send: \\e \\x1b \\033 \\n \\r \\t \\uXXXX \\\\."""
    s = s.replace("\\e", "\x1b").replace("\\033", "\x1b")
    out, i = [], 0
    while i < len(s):
        c = s[i]
        if c == "\\" and i + 1 < len(s):
            n = s[i + 1]
            if n == "n": out.append("\n"); i += 2; continue
            if n == "r": out.append("\r"); i += 2; continue
            if n == "t": out.append("\t"); i += 2; continue
            if n == "\\": out.append("\\"); i += 2; continue
            if n == "x" and re.fullmatch(r"[0-9a-fA-F]{2}", s[i + 2:i + 4] or ""): out.append(chr(int(s[i + 2:i + 4], 16))); i += 4; continue
            if n == "u" and re.fullmatch(r"[0-9a-fA-F]{4}", s[i + 2:i + 6] or ""): out.append(chr(int(s[i + 2:i + 6], 16))); i += 6; continue
        out.append(c); i += 1
    return "".join(out)


def strip_ansi(s):
    return re.sub(r"\x1b\[[0-9;:?<=>]*[ -/]*[@-~]|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)|\x1b[()][0-9A-Za-z]|\x1b.", "", s)


# ───────── terminal emulator (text) — same semantics as runtime/term.js ─────────
DEC_GFX = {"`": "◆", "a": "▒", "f": "°", "g": "±", "j": "┘", "k": "┐", "l": "┌", "m": "└", "n": "┼", "o": "⎺", "p": "⎻",
           "q": "─", "r": "⎼", "s": "⎽", "t": "├", "u": "┤", "v": "┴", "w": "┬", "x": "│", "y": "≤", "z": "≥", "{": "π",
           "|": "≠", "}": "£", "~": "·"}


def cwidth(ch):
    cp = ord(ch)
    if cp < 0x300:
        return 0 if cp < 0x20 or 0x7F <= cp < 0xA0 else 1
    if cp == 0xAD:
        return 1
    if unicodedata.category(ch) in ("Mn", "Me", "Cf") or 0x1160 <= cp <= 0x11FF or 0xD7B0 <= cp <= 0xD7FF or 0x200B <= cp <= 0x200F:
        return 0
    return 2 if unicodedata.east_asian_width(ch) in ("W", "F") else 1


class VT:
    """Text-level xterm subset: enough to reproduce the final screen of real CLI output (progress bars, cursor
    addressing, erase, scroll regions, alt screen, wide chars, scrollback). Absolute line numbers match term.js."""

    def __init__(self, cols=80, rows=24):
        self.cols, self.rows = max(2, cols), max(1, rows)
        self.sb, self.scrolled = [], 0
        self.reset()

    def blank(self):
        return [" "] * self.cols

    def reset(self):
        self.lines = [self.blank() for _ in range(self.rows)]
        self.wrapped = [False] * self.rows
        self.cx = self.cy = 0
        self.wrap = False
        self.top, self.bot = 0, self.rows - 1
        self.autowrap, self.cursor_on, self.origin, self.insert = True, True, False, False
        self.alt = None
        self.saved = None
        self.tabs = list(range(8, self.cols, 8))
        self.gset, self.gl = ["B", "B"], 0
        self.title, self.last = "", " "
        self.ps, self.pbuf, self.priv, self.inter, self.sbuf, self.desig = 0, "", "", "", "", 0

    def write(self, s):
        for ch in s:
            cp = ord(ch)
            ps = self.ps
            if ps == 0:
                if cp < 0x20 or cp == 0x7F:
                    self.ctrl(cp)
                elif cp == 0x9B:
                    self.ps, self.pbuf, self.priv, self.inter = 3, "", "", ""
                elif cp == 0x9D:
                    self.ps, self.sbuf = 4, ""
                elif 0x80 <= cp < 0xA0:
                    pass
                else:
                    self.put(ch)
            elif ps == 1:
                self.esc(ch)
            elif ps == 2:
                if self.desig >= 0:
                    self.gset[self.desig] = "0" if ch == "0" else "B"
                self.ps = 0
            elif ps == 3:
                if 0x30 <= cp <= 0x3F:
                    if ch in "<=>?" and not self.pbuf:
                        self.priv += ch
                    else:
                        self.pbuf += ch
                elif 0x20 <= cp <= 0x2F:
                    self.inter += ch
                elif 0x40 <= cp <= 0x7E:
                    self.ps = 0
                    self.csi(ch)
                elif cp == 0x1B:
                    self.ps = 1
                elif cp < 0x20:
                    self.ctrl(cp)
                else:
                    self.ps = 0
            elif ps == 4:
                if cp == 7:
                    self.ps = 0
                    self.osc(self.sbuf)
                elif cp == 0x1B:
                    self.ps = 5
                elif len(self.sbuf) < 4096:
                    self.sbuf += ch
            elif ps == 5:
                self.ps = 0
                self.osc(self.sbuf)
                if ch != "\\":
                    self.esc(ch)
            elif ps == 6:
                if cp == 0x1B:
                    self.ps = 7
                elif cp == 7:
                    self.ps = 0
            elif ps == 7:
                self.ps = 0 if ch == "\\" else 6

    def ctrl(self, cp):
        if cp == 8:
            self.cx = max(0, self.cx - 1); self.wrap = False
        elif cp == 9:
            self.cx = min(next((t for t in self.tabs if t > self.cx), self.cols - 1), self.cols - 1); self.wrap = False
        elif cp in (10, 11, 12):
            self.lf()
        elif cp == 13:
            self.cx = 0; self.wrap = False
        elif cp == 14:
            self.gl = 1
        elif cp == 15:
            self.gl = 0
        elif cp == 27:
            self.ps = 1

    def esc(self, ch):
        self.ps = 0
        if ch == "[":
            self.ps, self.pbuf, self.priv, self.inter = 3, "", "", ""
        elif ch == "]":
            self.ps, self.sbuf = 4, ""
        elif ch in "P_^X":
            self.ps = 6
        elif ch in "()*+":
            self.desig = "()".find(ch) if ch in "()" else -1
            self.ps = 2
        elif ch == "#":
            self.desig = -2; self.ps = 2
        elif ch == "7":
            self.save()
        elif ch == "8":
            self.restore()
        elif ch == "D":
            self.lf()
        elif ch == "E":
            self.cx = 0; self.lf()
        elif ch == "M":
            self.ri()
        elif ch == "c":
            sb, sc = self.sb, self.scrolled
            self.reset(); self.sb, self.scrolled = sb, sc

    def osc(self, s):
        n, _, v = s.partition(";")
        if n in ("0", "2"):
            self.title = v

    def fixwide(self, l, x):
        if 0 <= x < self.cols:
            if l[x] == "" and x > 0:
                l[x - 1] = " "
            elif x + 1 < self.cols and l[x + 1] == "":
                l[x + 1] = " "

    def put(self, ch):
        if self.gset[self.gl] == "0" and ch in DEC_GFX:
            ch = DEC_GFX[ch]
        w = cwidth(ch)
        if w == 0:
            x = self.cx if self.wrap else self.cx - 1
            l = self.lines[self.cy]
            if x > 0 and l[x] == "":
                x -= 1
            if x >= 0:
                l[x] += ch
            return
        if self.wrap and self.autowrap:
            self.wrapped[self.cy] = True; self.cx = 0; self.lf()
        self.wrap = False
        if w == 2 and self.cx >= self.cols - 1:
            if self.autowrap:
                self.wrapped[self.cy] = True; self.cx = 0; self.lf()
            else:
                self.cx = self.cols - 2
        l = self.lines[self.cy]
        if self.insert:
            for _ in range(w):
                l.insert(self.cx, " "); l.pop()
        self.fixwide(l, self.cx)
        if w == 2:
            self.fixwide(l, self.cx + 1)
        l[self.cx] = ch
        if w == 2:
            l[self.cx + 1] = ""
        self.last = ch
        self.cx += w
        if self.cx >= self.cols:
            self.cx, self.wrap = self.cols - 1, self.autowrap

    def lf(self):
        self.wrap = False
        if self.cy == self.bot:
            self.scroll_up(1)
        elif self.cy < self.rows - 1:
            self.cy += 1

    def ri(self):
        self.wrap = False
        if self.cy == self.top:
            self.scroll_down(1)
        elif self.cy > 0:
            self.cy -= 1

    def scroll_up(self, n):
        for _ in range(min(n, self.bot - self.top + 1)):
            gone = self.lines.pop(self.top); w = self.wrapped.pop(self.top)
            self.lines.insert(self.bot, self.blank()); self.wrapped.insert(self.bot, False)
            if self.top == 0 and self.bot == self.rows - 1 and self.alt is None:
                self.sb.append((gone, w)); self.scrolled += 1

    def scroll_down(self, n):
        for _ in range(min(n, self.bot - self.top + 1)):
            self.lines.pop(self.bot); self.wrapped.pop(self.bot)
            self.lines.insert(self.top, self.blank()); self.wrapped.insert(self.top, False)

    def erase(self, l, x0, x1):
        x0, x1 = max(0, x0), min(self.cols, x1)
        if x0 >= x1:
            return
        if x0 > 0 and l[x0] == "":
            l[x0 - 1] = " "
        if x1 < self.cols and l[x1] == "":
            l[x1] = " "
        for x in range(x0, x1):
            l[x] = " "

    def save(self):
        self.saved = (self.cx, self.cy, self.origin, self.wrap, list(self.gset), self.gl)

    def restore(self):
        if self.saved:
            cx, cy, self.origin, self.wrap, gs, self.gl = self.saved
            self.cx, self.cy, self.gset = min(cx, self.cols - 1), min(cy, self.rows - 1), list(gs)
        else:
            self.cx = self.cy = 0

    def set_alt(self, on, clear=False):
        if on and self.alt is None:
            self.alt = (self.lines, self.wrapped)
            self.lines, self.wrapped = [self.blank() for _ in range(self.rows)], [False] * self.rows
        elif not on and self.alt is not None:
            self.lines, self.wrapped = self.alt; self.alt = None
        elif on and clear:
            self.lines, self.wrapped = [self.blank() for _ in range(self.rows)], [False] * self.rows

    def csi(self, f):
        P = [[(int(x) if x else -1) for x in g.split(":")] for g in self.pbuf.split(";")] if self.pbuf else []
        p = lambda i, d: P[i][0] if i < len(P) and P[i][0] > 0 else d
        p0 = lambda i, d: P[i][0] if i < len(P) and P[i][0] >= 0 else d
        priv, l = self.priv, self.lines[self.cy]
        top, bot = (self.top, self.bot) if self.origin else (0, self.rows - 1)
        if f in "ABCDEFGHIZadef`rsuLM" and not (f in "rsu" and priv):
            self.wrap = False
        clampi = lambda v, a, b: max(a, min(b, v))
        if f == "@":
            n = min(p(0, 1), self.cols - self.cx)
            for _ in range(n):
                l.insert(self.cx, " "); l.pop()
        elif f == "A":
            self.cy = max(self.top if self.cy >= self.top else 0, self.cy - p(0, 1))
        elif f == "B":
            self.cy = min(self.bot if self.cy <= self.bot else self.rows - 1, self.cy + p(0, 1))
        elif f in "Ca":
            self.cx = min(self.cols - 1, self.cx + p(0, 1))
        elif f == "D":
            self.cx = max(0, self.cx - p(0, 1))
        elif f == "E":
            self.cy, self.cx = min(self.bot, self.cy + p(0, 1)), 0
        elif f == "F":
            self.cy, self.cx = max(self.top, self.cy - p(0, 1)), 0
        elif f in "G`":
            self.cx = clampi(p(0, 1) - 1, 0, self.cols - 1)
        elif f in "Hf":
            self.cy, self.cx = clampi(top + p(0, 1) - 1, top, bot), clampi(p(1, 1) - 1, 0, self.cols - 1)
        elif f == "I":
            for _ in range(p(0, 1)):
                self.ctrl(9)
        elif f == "J":
            m = p0(0, 0)
            if m == 0:
                self.erase(l, self.cx, self.cols)
                for y in range(self.cy + 1, self.rows):
                    self.lines[y] = self.blank()
            elif m == 1:
                self.erase(l, 0, self.cx + 1)
                for y in range(self.cy):
                    self.lines[y] = self.blank()
            elif m == 2:
                self.lines = [self.blank() for _ in range(self.rows)]
            elif m == 3:
                self.sb = []
        elif f == "K":
            m = p0(0, 0)
            self.erase(l, *((self.cx, self.cols) if m == 0 else (0, self.cx + 1) if m == 1 else (0, self.cols)))
        elif f in "LM" and self.top <= self.cy <= self.bot:
            for _ in range(min(p(0, 1), self.bot - self.cy + 1)):
                if f == "L":
                    self.lines.pop(self.bot); self.wrapped.pop(self.bot)
                    self.lines.insert(self.cy, self.blank()); self.wrapped.insert(self.cy, False)
                else:
                    self.lines.pop(self.cy); self.wrapped.pop(self.cy)
                    self.lines.insert(self.bot, self.blank()); self.wrapped.insert(self.bot, False)
            self.cx = 0
        elif f == "P":
            n = min(p(0, 1), self.cols - self.cx)
            self.fixwide(l, self.cx)
            del l[self.cx:self.cx + n]
            l.extend([" "] * n)
        elif f == "S" and not priv:
            self.scroll_up(p(0, 1))
        elif f == "T" and not priv and len(P) <= 1:
            self.scroll_down(p(0, 1))
        elif f == "X":
            self.erase(l, self.cx, self.cx + p(0, 1))
        elif f == "b":
            for _ in range(min(p(0, 1), 4096)):
                self.put(self.last)
        elif f == "d":
            self.cy = clampi(top + p(0, 1) - 1, top, bot)
        elif f == "e":
            self.cy = min(self.rows - 1, self.cy + p(0, 1))
        elif f in "hl":
            on = f == "h"
            for g in P:
                m = g[0]
                if priv == "?":
                    if m == 6:
                        self.origin, self.cx, self.cy = on, 0, (self.top if on else 0)
                    elif m == 7:
                        self.autowrap = on
                    elif m == 25:
                        self.cursor_on = on
                    elif m in (47, 1047):
                        self.set_alt(on, m == 1047)
                    elif m == 1048:
                        self.save() if on else self.restore()
                    elif m == 1049:
                        if on:
                            self.save(); self.set_alt(True, True)
                        else:
                            self.set_alt(False); self.restore()
                elif not priv and m == 4:
                    self.insert = on
        elif f == "r" and not priv:
            t0, b0 = p(0, 1) - 1, p(1, self.rows) - 1
            self.top, self.bot = (t0, b0) if t0 < b0 < self.rows else (0, self.rows - 1)
            self.cx, self.cy = 0, (self.top if self.origin else 0)
        elif f == "s" and not priv:
            self.save()
        elif f == "u" and not priv:
            self.restore()

    @staticmethod
    def text(l):
        return "".join(c for c in l if c != "").rstrip()

    def all_lines(self):
        """[(absolute_index, text, soft_wrapped)] for scrollback + screen."""
        first = self.scrolled - len(self.sb)
        out = [(first + i, self.text(l), w) for i, (l, w) in enumerate(self.sb)]
        out += [(self.scrolled + i, self.text(l), self.wrapped[i]) for i, l in enumerate(self.lines)]
        return out

    def screen_text(self):
        return "\n".join(self.text(l) for l in self.lines).rstrip("\n")


# ───────── cast io ─────────
def read_cast(path):
    text = Path(path).read_text(encoding="utf-8")
    lines = text.split("\n")
    header = json.loads(lines[0])
    events, acc = [], 0.0
    for ln in lines[1:]:
        ln = ln.strip()
        if not ln.startswith("["):
            continue
        e = json.loads(ln)
        t = float(e[0])
        if header.get("version", 2) >= 3:
            acc += t; t = acc
        events.append([t, str(e[1]), str(e[2]) if len(e) > 2 else ""])
    if header.get("version", 2) >= 3:
        term = header.get("term", {})
        header = {**header, "version": 2, "width": term.get("cols", 80), "height": term.get("rows", 24)}
    return header, events


def write_cast(path, header, events):
    with open(path, "w", encoding="utf-8") as f:
        f.write(json.dumps(header, ensure_ascii=False) + "\n")
        for t, c, d in events:
            f.write(json.dumps([round(t, 6), c, d], ensure_ascii=False) + "\n")


def emulate(header, events, until=None):
    vt = VT(int(header.get("width", 80)), int(header.get("height", 24)))
    for t, c, d in events:
        if until is not None and t > until:
            break
        if c == "o":
            vt.write(d)
        elif c == "r":
            m = re.match(r"(\d+)x(\d+)", d)
            if m:
                vt2 = VT(int(m.group(1)), int(m.group(2)))
                vt2.sb, vt2.scrolled = vt.sb + [(l, w) for l, w in zip(vt.lines, vt.wrapped)], vt.scrolled + vt.rows
                vt = vt2
    return vt


def retime(events, speed=1.0, idle=None, fit=None):
    """Cap gaps at `idle`, then play at `speed` (or scale so the cast lasts `fit` seconds)."""
    out, prev, cur = [], None, 0.0
    for t, c, d in events:
        gap = 0.0 if prev is None else max(0.0, t - prev)
        if idle is not None:
            gap = min(gap, idle)
        cur += gap; prev = t
        out.append([cur, c, d])
    if fit and out and out[-1][0] > 0:
        k = fit / out[-1][0]
        return [[t * k, c, d] for t, c, d in out]
    return [[t / speed, c, d] for t, c, d in out]


# ───────── rewriting the joined output stream (anonymize / redact) ─────────
def rewrite(chunks, spans):
    """Apply sorted, non-overlapping (start, end, replacement) spans to the joined chunks; chunk boundaries move
    with the text (a replacement that crosses a boundary stays in the chunk where it starts)."""
    if not spans:
        return list(chunks)
    joined = "".join(chunks)
    parts, last, marks, delta = [], 0, [], 0
    for s, e, rep in spans:
        parts.append(joined[last:s]); parts.append(rep)
        marks.append((s, e, delta, len(rep)))
        delta += len(rep) - (e - s); last = e
    parts.append(joined[last:])
    new = "".join(parts)

    def mp(b):
        d = 0
        for s, e, dd, rl in marks:
            if b <= s:
                break
            if b < e:
                return s + dd + rl
            d = dd + rl - (e - s)
        return b + d

    bounds, acc = [], 0
    for c in chunks:
        acc += len(c); bounds.append(mp(acc))
    starts = [0] + bounds[:-1]
    return [new[a:b] for a, b in zip(starts, bounds)]


def find_spans(text, o, report):
    """Secret + anonymization spans over the joined stream (secrets win on overlap)."""
    spans = []
    if o["secrets"] != "off":
        for kind, rx, grp in SECRET_PATTERNS:
            for m in rx.finditer(text):
                s, e = m.span(grp)
                if e - s >= 6 and text[s:e].strip("•*") != "":
                    spans.append((s, e, 0, kind))
        for name, val in o["secret_values"]:
            start = 0
            while True:
                i = text.find(val, start)
                if i < 0:
                    break
                spans.append((i, i + len(val), 0, "env:" + name)); start = i + len(val)
    for kind, rx, rep in o["anon"]:
        for m in rx.finditer(text):
            spans.append((m.start(), m.end(), 1, kind, rep))
    if o.get("emails"):
        for m in EMAIL.finditer(text):
            spans.append((m.start(), m.end(), 1, "email", "user@example.com"))
    spans.sort(key=lambda x: (x[0], x[2], -(x[1] - x[0])))
    out, end = [], -1
    for sp in spans:
        if sp[0] < end:
            continue
        s, e, prio, kind = sp[:4]
        if prio == 0:
            report["secrets"][kind] = report["secrets"].get(kind, 0) + 1
            if o["secrets"] == "redact":
                out.append((s, e, "•" * (e - s))); end = e
        else:
            report["anonymized"][kind] = report["anonymized"].get(kind, 0) + 1
            out.append((s, e, sp[4])); end = e
    return out


def final_warnings(text, o, report, hints):
    """Warnings computed on the FINAL (anonymized, redacted) text. Sidecar-safe: no identifying substrings;
    console-only hints may name the user's own values."""
    plain = strip_ansi(text)
    emails = [m.group(0) for m in EMAIL.finditer(plain) if not m.group(0).endswith("example.com")]
    if emails and not o.get("emails"):
        report["warnings"].add(f"{len(emails)} e-mail address(es) left in the output; pass --redact-emails to mask them")
    for m in HIGH_ENTROPY.finditer(plain):
        tok = m.group(0)
        if entropy(tok) > 4.3 and not re.fullmatch(r"[0-9a-f]+", tok) and "•" not in tok:
            report["warnings"].add(f"high-entropy string of {len(tok)} chars left in the output; check it is not a secret")
    user = o.get("user")
    if user and len(user) >= 3:
        n = len(re.findall(r"(?<![\w.-])" + re.escape(user) + r"(?![\w-])", plain))
        if n:
            report["warnings"].add(f"the user name still appears {n} time(s) as a bare word; pass --redact <name> to mask it")
            hints.append(f"to mask it: --redact {user}")


COMMON_USERS = {"root", "admin", "user", "dev", "test", "ubuntu", "ec2-user", "runner", "vscode", "node", "app", "guest"}


def anon_rules(args):
    rules = []
    if not args.no_anonymize:
        homes = {os.path.expanduser("~"), os.path.realpath(os.path.expanduser("~"))}
        for h in sorted(homes, key=len, reverse=True):
            if h and h != "/":
                rules.append(("home", re.compile(re.escape(h) + r"(?=$|[/\s'\":;,)\]}>|])"), "~"))
        user = getpass.getuser()
        if user:
            rules.append(("user@", re.compile(r"(?<![\w.-])" + re.escape(user) + r"(?=@)"), "user"))
            for root in ("/Users/", "/home/"):
                rules.append(("home-root", re.compile(re.escape(root + user) + r"(?![\w-])"), root + "user"))
            # flattened paths (e.g. a temp dir named "-Users-<name>-project") and Windows profiles
            rules.append(("home-root", re.compile(r"(?:(?<=-Users-)|(?<=-home-))" + re.escape(user) + r"(?=-|$)"), "user"))
            rules.append(("home-root", re.compile(r"(?i)(?<=\\Users\\)" + re.escape(user) + r"(?![\w-])"), "user"))
        for hn in {socket.gethostname(), socket.gethostname().split(".")[0]}:
            if hn and len(hn) >= 3 and hn.lower() not in ("localhost", "local"):
                rules.append(("host", re.compile(r"(?<![\w-])" + re.escape(hn) + r"(?![\w-])"), "host"))
    for item in args.redact or []:
        word, _, rep = item.partition("=")
        if word:
            rules.append(("custom", re.compile(r"(?<![\w])" + re.escape(word) + r"(?![\w])"), rep or "•" * len(word)))
    return rules


def anonymize_text(s, rules):
    for _, rx, rep in rules:
        s = rx.sub(lambda m, r=rep: r, s)
    return s


# ───────── environment ─────────
def build_env(args, cols, rows):
    base = dict(os.environ)
    dropped, secret_values = [], []
    for k, v in base.items():
        if SECRET_NAME.search(k) and k not in NOT_SECRET:
            if v and len(v) >= 8:
                secret_values.append((k, v))      # masked in the cast even when passed on with --keep-env
            if k not in (args.keep_env or []):
                dropped.append(k)
    if args.clean_env:
        env = {k: v for k, v in base.items() if k in SAFE_ENV}
    else:
        env = {k: v for k, v in base.items() if k not in dropped}
    for k in args.keep_env or []:
        if k in base:
            env[k] = base[k]
            if SECRET_NAME.search(k):
                print(f"warning: --keep-env {k} passes a secret-looking variable to the command", file=sys.stderr)
    env.update({"TERM": "xterm-256color", "COLORTERM": "truecolor", "COLUMNS": str(cols), "LINES": str(rows)})
    if not any(env.get(k, "").lower().endswith(("utf-8", "utf8")) for k in ("LC_ALL", "LC_CTYPE", "LANG")):
        env["LANG"] = "en_US.UTF-8"
    if args.force_color:
        env.update({"FORCE_COLOR": "1", "CLICOLOR_FORCE": "1"})
        env.pop("NO_COLOR", None)
    for item in args.env or []:
        k, _, v = item.partition("=")
        if k:
            env[k] = v
            if SECRET_NAME.search(k) and k not in NOT_SECRET and len(v) >= 8:
                secret_values.append((k, v))      # --env TOKEN=... : its value never reaches the cast
    for k in ("PS1", "PROMPT_COMMAND", "HISTFILE"):
        env.pop(k, None)
    return env, sorted(dropped), secret_values


# ───────── recording ─────────
def run_segment(cmd, args, env, cols, rows, t_base, events, sends):
    """Run one command in a fresh pty; append ('o'/'i') events with times offset by t_base. Returns metadata."""
    shell = args.shell or (shutil.which("bash") or "/bin/sh")
    master, slave = os.openpty()
    fcntl.ioctl(slave, termios.TIOCSWINSZ, struct.pack("HHHH", rows, cols, 0, 0))

    def child_setup():   # runs after setsid(): make the pty the controlling terminal (programs that open /dev/tty)
        try:
            fcntl.ioctl(0, termios.TIOCSCTTY, 0)
        except OSError:
            pass

    started = dt.datetime.now(dt.timezone.utc)
    t0 = time.perf_counter()
    proc = subprocess.Popen([shell, "-c", cmd], stdin=slave, stdout=slave, stderr=slave, cwd=args.cwd or None, env=env,
                            start_new_session=True, preexec_fn=child_setup, close_fds=True)
    os.close(slave)
    dec = codecs.getincrementaldecoder("utf-8")(errors="replace")
    until = re.compile(args.until) if args.until else None
    pending = sorted(sends, key=lambda x: x[0])
    state = {"stopped": None, "kill_at": None, "last": t0, "until_at": None, "bytes": 0, "tail": ""}

    def stop(why):
        if state["stopped"] is None:
            state["stopped"], state["kill_at"] = why, time.perf_counter() + 2.0
            try:
                os.killpg(proc.pid, signal.SIGTERM)
            except (ProcessLookupError, PermissionError):
                pass

    def emit(data):
        state["bytes"] += len(data)
        text = dec.decode(data)
        if not text:
            return
        now = time.perf_counter()
        events.append([t_base + (now - t0), "o", text])
        state["last"] = now
        if until is not None and state["until_at"] is None:
            state["tail"] = (state["tail"] + strip_ansi(text))[-4000:]
            if until.search(state["tail"]):
                state["until_at"] = now + args.until_grace

    while True:
        now = time.perf_counter()
        el = now - t0
        while pending and el >= pending[0][0]:
            _, text = pending.pop(0)
            try:
                os.write(master, text.encode("utf-8"))
                events.append([t_base + el, "i", text])
            except OSError:
                pass
        if args.timeout and el > args.timeout:
            stop("timeout")
        if args.idle_exit and now - state["last"] > args.idle_exit:
            stop("idle")
        if state["until_at"] is not None and now >= state["until_at"]:
            stop("until")
        if args.max_bytes and state["bytes"] > args.max_bytes:
            stop("max-bytes")
        if state["kill_at"] is not None and now > state["kill_at"] and proc.poll() is None:
            try:
                os.killpg(proc.pid, signal.SIGKILL)
            except (ProcessLookupError, PermissionError):
                pass
            state["kill_at"] = None
        r, _, _ = select.select([master], [], [], 0.02)
        data = b""
        if master in r:
            try:
                data = os.read(master, 65536)
            except OSError:   # EIO: the slave side is gone
                data = b""
        if data:
            emit(data)
            continue
        if proc.poll() is not None:
            # drain whatever is still buffered, then stop
            end = time.perf_counter() + 0.25
            while time.perf_counter() < end:
                r, _, _ = select.select([master], [], [], 0.05)
                if master not in r:
                    continue
                try:
                    data = os.read(master, 65536)
                except OSError:
                    data = b""
                if not data:
                    break
                emit(data)
            break
        if master in r:   # EOF while the process lives on (it closed its tty): do not spin
            time.sleep(0.02)
    rest = dec.decode(b"", final=True)
    if rest:
        events.append([t_base + (time.perf_counter() - t0), "o", rest])
    try:
        rc = proc.wait(timeout=3)
    except subprocess.TimeoutExpired:
        os.killpg(proc.pid, signal.SIGKILL)
        rc = proc.wait()
    os.close(master)
    seconds = time.perf_counter() - t0
    sig = -rc if rc < 0 else None
    return {"exit": rc if rc >= 0 else None, "signal": signal.Signals(sig).name if sig else None, "seconds": round(seconds, 3),
            "stopped": state["stopped"], "started": started.strftime("%Y-%m-%dT%H:%M:%SZ"), "end": t_base + seconds}


def parse_sends(items):
    out = []
    for s in items or []:
        d, _, text = s.partition(":")
        try:
            out.append((float(d), unescape(text)))
        except ValueError:
            sys.exit(f"--send expects DELAY:TEXT, got {s!r}")
    return out


def record(args):
    out = Path(args.out)
    if out.suffix != ".cast":
        out = out.with_suffix(".cast")
    out.parent.mkdir(parents=True, exist_ok=True)
    cols, rows = args.cols, args.rows
    env, dropped, secret_values = build_env(args, cols, rows)
    if not args.allow_side_effects:
        risky = [c for c in args.cmd if RISKY.search(c)]
        if risky:
            sys.exit("error: refusing to run a command that looks like it deploys, publishes, pushes, migrates, deletes "
                     f"or needs sudo: {risky[0][:120]!r}. Capture it in a throwaway copy with demo credentials (or the "
                     "tool's --dry-run) and pass --allow-side-effects once the user has agreed.")
    rules = anon_rules(args)
    report = {"secrets": {}, "anonymized": {}, "warnings": set()}
    mode = "warn" if args.on_secret in ("warn", "fail") else "redact"

    def clean(text, count=True):
        """Anonymize + mask a command line or title exactly like the output stream (counted unless already echoed)."""
        rep = report if count else {"secrets": {}, "anonymized": {}, "warnings": set()}
        sp = find_spans(text, {"secrets": mode, "secret_values": secret_values, "anon": rules, "emails": args.redact_emails},
                        rep)
        return rewrite([text], sp)[0]

    for cmd in list(args.cmd) + ([args.title] if args.title else []):
        tmp = {"secrets": {}, "anonymized": {}, "warnings": set()}
        find_spans(cmd, {"secrets": "warn", "secret_values": secret_values, "anon": []}, tmp)
        if tmp["secrets"]:
            if args.on_secret == "fail":
                sys.exit(f"error: a command line or --title contains a secret-like string ({', '.join(tmp['secrets'])}); "
                         "nothing was run. Read secrets from the environment instead.")
            print(f"warning: the command line itself looks like it contains a secret ({', '.join(tmp['secrets'])}); "
                  f"it will be {'masked' if mode == 'redact' else 'LEFT'} in the cast and sidecar, but prefer reading "
                  "secrets from the environment", file=sys.stderr)
    prompt = unescape(args.prompt)
    events, segs = [], []
    t = 0.0
    when = dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    sends = parse_sends(args.send)
    for k, cmd in enumerate(args.cmd):
        echo = None
        if not args.no_echo:
            echo = prompt + cmd + "\r\n"
            events.append([t, "o", echo])
            events.append([t, "m", f"cmd {k + 1}"])
        meta = run_segment(cmd, args, env, cols, rows, t + (0.0 if args.no_echo else args.enter_delay), events, sends if k == 0 else [])
        segs.append({"cmd": cmd, "prompt": prompt if echo else "", "echo": echo, "t": round(t, 6), **{x: meta[x] for x in ("exit", "signal", "seconds", "stopped", "started")}})
        t = meta["end"] + args.between
    if not args.no_echo and not args.no_final_prompt:
        events.append([t - args.between + args.final_prompt_delay, "o", prompt])
    events.sort(key=lambda e: e[0])
    # anonymize + redact on the joined output stream
    oidx = [i for i, e in enumerate(events) if e[1] == "o"]
    chunks = [events[i][2] for i in oidx]
    spans = find_spans("".join(chunks), {"secrets": mode, "secret_values": secret_values, "anon": rules,
                                         "emails": args.redact_emails, "user": getpass.getuser()}, report)
    # keys sent with --send are stored as "i" events: same masking as the output
    iidx = [i for i, e in enumerate(events) if e[1] == "i"]
    ichunks = [events[i][2] for i in iidx]
    ispans = find_spans("".join(ichunks), {"secrets": mode, "secret_values": secret_values, "anon": rules,
                                            "emails": args.redact_emails}, report) if iidx else []
    if report["secrets"] and args.on_secret == "fail":
        kinds = ", ".join(f"{k} x{n}" for k, n in report["secrets"].items())
        sys.exit(f"error: secret-like strings in the output ({kinds}); nothing was written. Re-run with --on-secret redact.")
    new_chunks = rewrite(chunks, spans)
    for i, c in zip(oidx, new_chunks):
        events[i][2] = c
    for i, c in zip(iidx, rewrite(ichunks, ispans)):
        events[i][2] = c
    hints = []
    final_warnings("".join(new_chunks), {"emails": args.redact_emails, "user": getpass.getuser()}, report, hints)
    # segments: every command line is cleaned the same way, echoed (-> header, sidecar, title) or not (--no-echo)
    echo_events = [e for e in events if e[1] == "o" and any(abs(e[0] - s["t"]) < 1e-9 for s in segs)]
    for s in segs:
        cmd_shown = clean(s["cmd"], count=s["echo"] is None)
        ev = next((e for e in echo_events if abs(e[0] - s["t"]) < 1e-9), None) if s["echo"] is not None else None
        if ev is not None:
            s["echo"] = ev[2]
            if not ev[2].startswith(s["prompt"] + cmd_shown):
                cmd_shown = ev[2][len(s["prompt"]):].rstrip("\r\n")
        s["cmd"] = cmd_shown
    events = [e for e in events if not (e[1] == "o" and e[2] == "")]
    title = clean(args.title) if args.title is not None else (segs[0]["cmd"] if segs else "")
    header = {"version": 2, "width": cols, "height": rows, "timestamp": int(time.time()),
              "duration": round(events[-1][0], 6) if events else 0, "command": " && ".join(s["cmd"] for s in segs),
              "title": title, "env": {"TERM": env["TERM"], "SHELL": os.path.basename(args.shell or shutil.which("bash") or "sh")},
              "x_showreel": {"version": 1, "tool": "capture_cli.py", "segments": [{k: s[k] for k in ("cmd", "prompt", "echo", "t", "exit")} for s in segs]}}
    if args.theme:
        if args.theme.startswith("{"):
            header["theme"] = json.loads(args.theme)          # asciicast theme {fg, bg, palette: "#..:#.."}
        else:
            header["x_showreel"]["theme"] = args.theme         # a term.js THEMES name, e.g. catppuccin-mocha
    if args.idle_limit:
        header["idle_time_limit"] = args.idle_limit
    write_cast(out, header, events)
    vt = emulate(header, events)
    lines = vt.all_lines()
    while lines and not lines[-1][1]:
        lines.pop()
    (out.with_suffix(".screen.txt")).write_text("\n".join(l[1] for l in lines) + "\n", encoding="utf-8")
    keys = []
    for pat in args.key or []:
        rx = re.compile(pat)
        hits = [(i, s) for i, s, _ in lines if rx.search(s)]
        if hits:
            i, s = hits[-1]
            keys.append({"pattern": pat, "line": i, "text": s, "matches": len(hits)})
        else:
            report["warnings"].add(f"--key {pat!r} matched no line")
    exit_codes = [s["exit"] for s in segs]
    side = {
        "kind": "terminal", "tool": "capture_cli.py", "toolVersion": VERSION,
        "cast": out.name, "screen": out.with_suffix(".screen.txt").name,
        "cmd": header["command"], "segments": [{k: s[k] for k in ("cmd", "exit", "signal", "seconds", "stopped", "started")} for s in segs],
        "exit": next((c for c in exit_codes if c not in (0, None)), exit_codes[-1] if exit_codes else None),
        "seconds": round(sum(s["seconds"] for s in segs), 3), "when": when,
        "cols": cols, "rows": rows, "term": env["TERM"], "shell": header["env"]["SHELL"],
        "cwd": anonymize_text(os.path.abspath(args.cwd or os.getcwd()), rules),
        "env": {"mode": "clean" if args.clean_env else "inherited minus secret-looking names", "dropped": len(dropped),
                "set": {k: env[k] for k in ("TERM", "COLORTERM", "LANG", "COLUMNS", "LINES") if k in env}},
        "redactions": {"onSecret": args.on_secret, "secrets": report["secrets"], "anonymized": report["anonymized"],
                       "warnings": sorted(report["warnings"])},
        "keyLines": keys, "events": sum(1 for e in events if e[1] == "o"),
        "lines": len(lines), "duration": header["duration"], "os": platform.system(),
        "provenance": (f"Real output of the command(s) above, recorded in a {cols}x{rows} pseudo-terminal on {when}. "
                       f"The prompt lines (before each command and the final ready prompt) are synthesized{'' if not args.no_echo else ' (disabled)'}; output bytes are unmodified "
                       f"except the anonymization/redactions listed."),
    }
    out.with_suffix(".json").write_text(json.dumps(side, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    # console summary
    print(f"wrote {out} ({side['events']} output events, {header['duration']:.2f} s, exit {side['exit']}, {cols}x{rows})")
    print(f"      {out.with_suffix('.screen.txt').name}, {out.with_suffix('.json').name}")
    if dropped:   # names on the console only: the shipped sidecar records the count
        print(f"env: dropped {len(dropped)} secret-looking variable(s): {', '.join(dropped[:8])}{' …' if len(dropped) > 8 else ''}",
              file=sys.stderr)
    if report["secrets"]:
        verb = "masked" if args.on_secret == "redact" else "LEFT IN THE CAST"
        print(f"secrets {verb}: " + ", ".join(f"{k} x{n}" for k, n in report["secrets"].items()), file=sys.stderr)
    if report["anonymized"]:
        print("anonymized: " + ", ".join(f"{k} x{n}" for k, n in report["anonymized"].items()))
    for w in sorted(report["warnings"]):
        print("warning: " + w, file=sys.stderr)
    for h in hints:
        print("hint: " + h, file=sys.stderr)
    for kl in keys:
        print(f"key line {kl['line']}: {kl['text'][:90]}")
    for s in segs:
        if s["stopped"]:
            print(f"note: '{s['cmd'][:60]}' was stopped ({s['stopped']})")
    return 0


# ───────── other subcommands ─────────
def cmd_play(a):
    header, events = read_cast(a.file)
    ev = retime([e for e in events if e[1] == "o"], speed=a.speed, idle=a.idle_limit, fit=a.fit)
    size = shutil.get_terminal_size()
    if size.columns < header.get("width", 80) or size.lines < header.get("height", 24):
        print(f"(terminal is {size.columns}x{size.lines}; the cast is {header.get('width')}x{header.get('height')})", file=sys.stderr)
        time.sleep(1.2)
    t0 = time.perf_counter()
    try:
        for t, _, d in ev:
            wait = t - (time.perf_counter() - t0)
            if wait > 0:
                time.sleep(wait)
            sys.stdout.write(d); sys.stdout.flush()
    except KeyboardInterrupt:
        pass
    sys.stdout.write("\x1b[0m\n")
    return 0


def cmd_retime(a):
    header, events = read_cast(a.file)
    ev = retime(events, speed=a.speed, idle=a.idle_limit, fit=a.fit)
    tmap = {round(o[0], 6): round(n[0], 6) for o, n in zip(events, ev)}
    xs = header.get("x_showreel")
    if xs:
        for s in xs.get("segments", []):
            s["t"] = tmap.get(round(s.get("t", 0), 6), s.get("t", 0))
    header["duration"] = round(ev[-1][0], 6) if ev else 0
    write_cast(a.out, header, ev)
    print(f"wrote {a.out} ({header['duration']:.2f} s)")
    return 0


def cmd_screen(a):
    header, events = read_cast(a.file)
    vt = emulate(header, events, until=a.at)
    if a.all:
        for i, s, w in vt.all_lines():
            print(f"{i:5d}{'+' if w else ' '} {s}")
    else:
        print(vt.screen_text())
    return 0


def _identity_rules():
    """Strings that identify this machine or person: (kind, regex). The user name counts as a token between
    non-alphanumerics (paths, flattened paths), unless it is a generic account name."""
    out = []
    home = os.path.expanduser("~")
    for h in {home, os.path.realpath(home)}:
        if h and h != "/":
            out.append(("home-path", re.compile(re.escape(h))))
    user = getpass.getuser()
    if user and len(user) >= 3 and user.lower() not in COMMON_USERS:
        out.append(("user-name", re.compile(r"(?<![A-Za-z0-9])" + re.escape(user) + r"(?![A-Za-z0-9])")))
    for hn in {socket.gethostname(), socket.gethostname().split(".")[0]}:
        if hn and len(hn) >= 3 and hn.lower() not in ("localhost", "local"):
            out.append(("host-name", re.compile(r"(?<![\w-])" + re.escape(hn) + r"(?![\w-])")))
    return out


def _walk_strings(v, fn):
    """Apply fn to every string inside a JSON value (keys included); returns the new value."""
    if isinstance(v, str):
        return fn(v)
    if isinstance(v, list):
        return [_walk_strings(x, fn) for x in v]
    if isinstance(v, dict):
        return {fn(k): _walk_strings(x, fn) for k, x in v.items()}
    return v


def cmd_scan(a):
    """Everything that ships: output and input events, the header (command, title, segments), the .json sidecar and
    the .screen.txt. Exit 1 on a secret, the home path, the user name or the host name (0 after --fix)."""
    cast = Path(a.file)
    header, events = read_cast(cast)
    side_p, screen_p = cast.with_suffix(".json"), cast.with_suffix(".screen.txt")
    side = json.loads(side_p.read_text(encoding="utf-8")) if side_p.exists() else None
    screen = screen_p.read_text(encoding="utf-8") if screen_p.exists() else None
    ns = argparse.Namespace(no_anonymize=False, redact=a.redact)
    rules = anon_rules(ns)
    user_rx = [(k, rx) for k, rx in _identity_rules() if k == "user-name"]
    fix_rules = rules + [("user-name", rx, "user") for _, rx in user_rx]
    report = {"secrets": {}, "anonymized": {}, "warnings": set()}
    found = {}                                   # where -> {kind: n}

    def note(where, rep):
        for k, n in list(rep["secrets"].items()) + [(f"identity:{k}", n) for k, n in rep["anonymized"].items()]:
            found.setdefault(where, {})[k] = found.get(where, {}).get(k, 0) + n
            if k.startswith("identity:"):
                report["anonymized"][k[9:]] = report["anonymized"].get(k[9:], 0) + n
            else:
                report["secrets"][k] = report["secrets"].get(k, 0) + n

    def spans_of(text):
        rep = {"secrets": {}, "anonymized": {}, "warnings": set()}
        sp = find_spans(text, {"secrets": "redact", "secret_values": [], "anon": fix_rules, "user": getpass.getuser()}, rep)
        return sp, rep

    def clean_str(text, where):
        sp, rep = spans_of(text)
        note(where, rep)
        return rewrite([text], sp)[0] if sp else text

    out_events = {}
    for kind in ("o", "i"):
        idx = [i for i, e in enumerate(events) if e[1] == kind]
        if not idx:
            continue
        chunks = [events[i][2] for i in idx]
        sp, rep = spans_of("".join(chunks))
        note("output" if kind == "o" else "input (--send keys)", rep)
        out_events[kind] = (idx, rewrite(chunks, sp))
        if kind == "o":
            final_warnings("".join(out_events[kind][1]), {"user": getpass.getuser()}, report, [])
    new_header = _walk_strings(header, lambda v: clean_str(v, "header (command, title, segments)"))
    new_side = _walk_strings(side, lambda v: clean_str(v, side_p.name)) if side is not None else None
    new_screen = clean_str(screen, screen_p.name) if screen is not None else None
    # identity strings that no rule masks (e.g. the user name as a plain word) are still reported
    plain_parts = [("output", "".join(e[2] for e in events if e[1] == "o")), (side_p.name, json.dumps(side) if side else ""),
                   (screen_p.name, screen or ""), ("header", json.dumps(header))]
    left = {}
    for where, text in plain_parts:
        for k, rx in _identity_rules():
            n = len(rx.findall(strip_ansi(text)))
            if n:
                left.setdefault(where, {})[k] = n
    print(json.dumps({"secrets": report["secrets"], "anonymize": report["anonymized"], "where": found,
                      "identity": left, "warnings": sorted(report["warnings"])}, indent=1, ensure_ascii=False))
    if a.fix and (found or left):
        for kind, (idx, chunks) in out_events.items():
            for i, c in zip(idx, chunks):
                events[i][2] = c
        write_cast(cast, new_header, events)
        if new_side is not None:
            side_p.write_text(json.dumps(new_side, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
        if new_screen is not None:
            screen_p.write_text(new_screen, encoding="utf-8")
        print(f"rewrote {cast}" + (f", {side_p.name}" if new_side is not None else "") + (f", {screen_p.name}" if new_screen is not None else ""))
        # what is left after the fix (plain-word user names need --redact WORD)
        rest = {}
        for where, text in [("cast", cast.read_text(encoding="utf-8")), (side_p.name, side_p.read_text(encoding="utf-8") if side_p.exists() else ""),
                            (screen_p.name, screen_p.read_text(encoding="utf-8") if screen_p.exists() else "")]:
            for k, rx in _identity_rules():
                n = len(rx.findall(strip_ansi(text)))
                if n:
                    rest.setdefault(where, {})[k] = n
        if rest:
            print("still present after --fix (mask with --redact WORD): " + json.dumps(rest), file=sys.stderr)
            return 1
        return 0
    return 1 if (found or left) else 0


def main(argv=None):
    argv = sys.argv[1:] if argv is None else argv
    if argv and argv[0] in ("play", "retime", "screen", "scan"):
        p = argparse.ArgumentParser(prog="capture_cli.py " + argv[0])
        p.add_argument("file")
        if argv[0] in ("play", "retime"):
            p.add_argument("--speed", type=float, default=1.0)
            p.add_argument("--idle-limit", type=float, default=None)
            p.add_argument("--fit", type=float, default=None, help="scale to this many seconds")
        if argv[0] == "retime":
            p.add_argument("--out", required=True)
        if argv[0] == "screen":
            p.add_argument("--at", type=float, default=None)
            p.add_argument("--all", action="store_true", help="scrollback too, with absolute line numbers")
        if argv[0] == "scan":
            p.add_argument("--fix", action="store_true")
            p.add_argument("--redact", action="append")
        a = p.parse_args(argv[1:])
        return {"play": cmd_play, "retime": cmd_retime, "screen": cmd_screen, "scan": cmd_scan}[argv[0]](a)
    p = argparse.ArgumentParser(description=__doc__.split("\n\n")[0], formatter_class=argparse.RawDescriptionHelpFormatter,
                                epilog=__doc__.split("\n\n", 1)[1],
                                usage="%(prog)s --cmd CMD [--cmd CMD ...] --out FILE.cast [options]\n"
                                      "       %(prog)s play|retime|screen|scan FILE.cast [options]   (subcommands, see below)")
    p.add_argument("--cmd", action="append", required=True, help="command line run with `bash -c` (repeat for a sequence)")
    p.add_argument("--out", required=True, help="P/assets/captures/term/<name>.cast")
    p.add_argument("--cols", type=int, default=100)
    p.add_argument("--rows", type=int, default=30)
    p.add_argument("--cwd")
    p.add_argument("--shell", help="shell used for -c (default bash, else sh)")
    p.add_argument("--prompt", default=DEFAULT_PROMPT, help="synthetic prompt before each command (escapes: \\e[...m)")
    p.add_argument("--no-echo", action="store_true", help="do not write the prompt + command line")
    p.add_argument("--no-final-prompt", action="store_true", help="do not end with a fresh prompt")
    p.add_argument("--final-prompt-delay", type=float, default=0.35, help="seconds after the last output")
    p.add_argument("--title", help="window title for the reel (default: the first command)")
    p.add_argument("--enter-delay", type=float, default=0.05, help="gap between the echoed command and its output (s)")
    p.add_argument("--between", type=float, default=0.6, help="gap between commands (s)")
    p.add_argument("--timeout", type=float, default=120)
    p.add_argument("--idle-exit", type=float, help="stop after S seconds without output (servers, watchers)")
    p.add_argument("--until", help="stop once the output matches this regex (after --until-grace)")
    p.add_argument("--until-grace", type=float, default=0.4)
    p.add_argument("--max-bytes", type=int, default=8_000_000)
    p.add_argument("--send", action="append", help="DELAY:TEXT keys sent to the first command (escapes allowed)")
    p.add_argument("--env", action="append", help="K=V added to the command's environment")
    p.add_argument("--keep-env", action="append", help="keep a variable whose name looks secret (warned)")
    p.add_argument("--clean-env", action="store_true", help="start from a minimal allow-listed environment")
    p.add_argument("--force-color", action="store_true", help="set FORCE_COLOR=1 / CLICOLOR_FORCE=1")
    p.add_argument("--key", action="append", help="regex of a key line to note in the sidecar (zoom target)")
    p.add_argument("--on-secret", choices=["redact", "warn", "fail"], default="redact")
    p.add_argument("--redact", action="append", help="WORD[=REPLACEMENT] masked everywhere in the output")
    p.add_argument("--redact-emails", action="store_true")
    p.add_argument("--no-anonymize", action="store_true", help="keep home path, user@ and host name")
    p.add_argument("--idle-limit", type=float, help="idle_time_limit hint written to the cast header")
    p.add_argument("--theme", help="the tool's own colours for term.js theme: 'cast': a THEMES name (catppuccin-mocha) or asciicast JSON {fg,bg,palette}")
    p.add_argument("--allow-side-effects", action="store_true",
                   help="run commands that look like deploy/publish/push/migrate/delete/sudo (only with the user's consent)")
    args = p.parse_args(argv)
    return record(args)


if __name__ == "__main__":
    sys.exit(main())
