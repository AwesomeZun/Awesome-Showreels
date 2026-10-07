"""spark-bench: reproducible benchmarks for sparse attention kernels (fictional example project).

This CLI replays the recorded demo run in results/demo-run.json. Every number it prints is computed from the
repeats stored in that file (medians, ratios, spreads); the numbers themselves are DEMO DATA, not a measurement.
Standard library only, Python 3.9+.
"""
import argparse
import hashlib
import json
import os
import statistics
import sys
import time
from pathlib import Path

VERSION = "0.4.0"
RUN = Path(__file__).resolve().parent.parent / "results" / "demo-run.json"
LENGTHS = ["4k", "16k", "32k", "64k"]


class Ink:
    """ANSI styles; empty strings when colour is off (NO_COLOR, --no-color, or not a terminal)."""

    def __init__(self, on):
        codes = {"b": "1", "dim": "2", "it": "3", "u": "4", "rev": "7", "cyan": "36", "mag": "35", "yel": "33",
                 "grn": "32"}
        self.on = on
        for k, v in codes.items():
            setattr(self, k, f"\x1b[{v}m" if on else "")
        self.x = "\x1b[0m" if on else ""

    def __call__(self, text, *styles):
        if not self.on or not styles or not text:
            return text
        return "".join(getattr(self, s) for s in styles) + text + self.x


def pace(seconds, replay):
    """Replay pacing: the demo run's progress is shown at a fixed, deterministic rhythm."""
    if replay:
        sys.stdout.flush()
        time.sleep(seconds)


def summarize(run, lengths):
    lat = run["latency_ms"]
    med = {k: {L: statistics.median(lat[k][L]) for L in lengths} for k in run["kernels"]}
    out = {}
    for k in run["kernels"]:
        rel = {L: med["dense"][L] / med[k][L] for L in lengths}
        vals = lat[k][lengths[-1]]
        spread = (max(vals) - min(vals)) / statistics.median(vals) * 100
        out[k] = {"relative": rel, "p50_ms": med[k][lengths[-1]], "spread_pct": spread}
    return out


def fingerprint(run):
    blob = json.dumps(run["fingerprint"], sort_keys=True).encode()
    return hashlib.sha256(blob).hexdigest()[:6]


def cmd_run(a, ink):
    try:
        run = json.loads(RUN.read_text(encoding="utf-8"))
    except OSError as e:
        print(f"spark-bench: cannot read the demo run: {e}", file=sys.stderr)
        return 2
    if a.suite != run["suite"]:
        print(f"spark-bench: the demo ships only the '{run['suite']}' suite", file=sys.stderr)
        return 2
    lengths = [L for L in LENGTHS if L in a.seq.split(",")]
    if not lengths:
        print("spark-bench: --seq takes a subset of 4k,16k,32k,64k", file=sys.stderr)
        return 2
    if a.repeats != run["repeats"]:
        print(f"spark-bench: the demo run has {run['repeats']} repeats per kernel and length", file=sys.stderr)
        return 2
    replay = not a.no_replay_delay
    w = sys.stdout.write
    dot = ink(" · ", "dim")
    span = lengths[0] if len(lengths) == 1 else f"{lengths[0]}–{lengths[-1]}"
    pace(0.06, replay)
    w(ink("spark-bench", "b", "cyan") + " " + ink(VERSION, "dim") + dot + "suite " + ink(run["suite"], "b") + dot + span
      + dot + f"{run['repeats']} repeats" + dot + "seed " + ink(str(run["seed"]), "yel") + "\n")
    pace(0.12, replay)
    w(ink("fingerprint", "dim") + "  " + ink(fingerprint(run), "yel") + ink("  demo-gpu, clocks pinned (recorded demo run)", "dim") + "\n")
    pace(0.08, replay)
    width = 36
    bar = lambda fill: ink("━" * fill, "cyan") + ink("━" * (width - fill), "dim")
    tty = replay and sys.stdout.isatty()          # redraw bars only on a terminal
    for s in range(1, run["warmup"] + 1) if tty else [run["warmup"]]:
        w("\r" + ink("warm-up", "dim") + "      " + bar(round(width * s / run["warmup"])) + " " + ink(f"{s}/{run['warmup']}", "dim"))
        if s < run["warmup"]:
            pace(0.08, replay)
    w("\n")
    total = len(run["kernels"]) * len(lengths) * run["repeats"]
    steps = 12 if tty else 1
    for s in range(1, steps + 1) if tty else [1]:
        n = round(total * s / steps)
        w("\r" + ink("repeats", "dim") + "      " + bar(round(width * s / steps)) + " " + ink(f"{n}/{total}", "dim"))
        if s < steps:
            pace(0.045, replay)
    w("\n")
    pace(0.12, replay)
    res = summarize(run, lengths)
    w("\n" + ink(f"throughput vs dense · median of {run['repeats']}", "dim", "it") + "\n")
    pace(0.07, replay)
    last = lengths[-1]
    head = f"{'kernel':<13}" + "".join(f"{L:>7}" for L in lengths) + f"{'p50 @' + last:>12}{'spread':>9}"
    w(ink(head, "dim") + "\n")
    names = {"dense": ("dim",), "block-sparse": ("mag",), "spark": ("b", "cyan")}
    for k in run["kernels"]:
        pace(0.07, replay)
        r = res[k]
        cells = []
        for L in lengths:
            v = f"{r['relative'][L]:.1f}×"
            if k == "spark" and L == last:
                cells.append(" " * (7 - len(v) - 1) + ink(" " + v, "b", "rev", "cyan"))
            elif k == "dense":
                cells.append(ink(f"{v:>7}", "dim"))
            else:
                cells.append(ink(f"{v:>7}", "b") if L == last else f"{v:>7}")
        p50 = f"{r['p50_ms']:.1f} ms"
        spr = f"{r['spread_pct']:.1f}%"
        tail = f"{p50:>12}{spr:>9}"
        w(ink(f"{k:<13}", *names[k]) + "".join(cells) + (ink(tail, "dim") if k == "dense" else tail) + "\n")
    pace(0.16, replay)
    sp = res["spark"]
    w("\n" + ink("▲ ", "b", "grn") + ink(f"spark {sp['relative'][last]:.1f}× dense at {last} tokens", "b") + dot
      + f"spread {sp['spread_pct']:.1f}%" + dot + ink("DEMO DATA", "dim", "yel") + "\n")
    pace(0.06, replay)
    w(ink("results", "dim") + "  " + ink(RUN.relative_to(RUN.parent.parent).as_posix(), "u") + "\n")
    if a.json:
        payload = {"tool": "spark-bench", "version": VERSION, "demo": True, "fingerprint": fingerprint(run),
                   "lengths": lengths, "kernels": {k: {"relative": {L: round(v, 3) for L, v in r["relative"].items()},
                                                      "p50_ms": round(r["p50_ms"], 3), "spread_pct": round(r["spread_pct"], 2)}
                                                  for k, r in res.items()}}
        Path(a.json).write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
        w(ink("wrote", "dim") + "    " + a.json + "\n")
    sys.stdout.flush()
    return 0


def main(argv=None):
    p = argparse.ArgumentParser(prog="spark-bench", description="Reproducible benchmarks for sparse attention kernels "
                                "(fictional example; replays the recorded demo run).")
    p.add_argument("--version", action="version", version=f"spark-bench {VERSION}")
    p.add_argument("--no-color", action="store_true", help="plain text output")
    sub = p.add_subparsers(dest="cmd")
    r = sub.add_parser("run", help="run the benchmark suite (replays the demo run)")
    r.add_argument("--suite", default="attn")
    r.add_argument("--seq", default=",".join(LENGTHS), help="sequence lengths, e.g. 4k,16k,32k,64k")
    r.add_argument("--repeats", type=int, default=5)
    r.add_argument("--json", metavar="PATH", help="also write the results as JSON")
    r.add_argument("--no-replay-delay", action="store_true", help="print at once instead of the replay rhythm")
    r.add_argument("--no-color", action="store_true", help="plain text output")
    a = p.parse_args(argv)
    color = not a.no_color and "NO_COLOR" not in os.environ and (sys.stdout.isatty() or os.environ.get("FORCE_COLOR"))
    ink = Ink(bool(color))
    try:
        if a.cmd == "run":
            return cmd_run(a, ink)
        p.print_help()
        return 0
    except BrokenPipeError:                       # e.g. `spark-bench run | head`
        sys.stdout = open(os.devnull, "w")
        return 0


if __name__ == "__main__":
    sys.exit(main())
