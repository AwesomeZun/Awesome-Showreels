"""BYOK key handling in narration/tts_gemini.py: source order, no key leaks, offline safety.

Run from the repo root:  python3 -B -m unittest tests.test_byok -v
These tests never reach Google and never touch the real Keychain item: requests go to loopback mock servers started
here, and every command uses a throwaway Keychain service name. All keys are dummies.
"""
from __future__ import annotations

import argparse
import http.server
import json
import os
import subprocess
import sys
import tempfile
import threading
import time
import unittest
from pathlib import Path
from unittest import mock

SKILL = Path(__file__).resolve().parents[1] / "skills" / "motion-showreel"
SCRIPT = SKILL / "narration" / "tts_gemini.py"
TTS = [sys.executable, "-B", str(SCRIPT)]
THROWAWAY = "motion-showreel-test-not-a-real-item"
NOKC = ["--keychain-service", THROWAWAY, "--no-prompt"]
DUMMY = "AIza" + "TestDummyNotARealKey" * 2   # key-shaped, so the redaction of key-looking text is exercised too
# variables that would change where a request goes or which key is used: never inherited from the developer's shell
SCRUB = ("GEMINI_API_KEY", "GOOGLE_API_KEY", "GEMINI_API_BASE", "MSR_TTS_FAULTS", "MSR_TTS_CACHE", "http_proxy",
         "HTTP_PROXY", "https_proxy", "HTTPS_PROXY", "all_proxy", "ALL_PROXY", "no_proxy", "NO_PROXY")

sys.path.insert(0, str(SCRIPT.parent))
import tts_gemini as T  # noqa: E402


def clean_env(extra: dict[str, str] | None = None) -> dict[str, str]:
    env = {k: v for k, v in os.environ.items() if k not in SCRUB}
    env.update(extra or {})
    return env


def run(args: list[str], env: dict[str, str]) -> subprocess.CompletedProcess:
    return subprocess.run(TTS + args, env=clean_env(env), capture_output=True, text=True, stdin=subprocess.DEVNULL,
                          timeout=120)


def project(P: Path, n: int) -> Path:
    """A minimal narrated project: one scene, n English lines."""
    P.mkdir(parents=True)
    (P / "reel.config.json").write_text(json.dumps({"bpm": 120, "scenes": [{"id": "s1"}]}))
    lines = [{"scene": "s1", "text": f"This is test line number {i + 1} for the key check."} for i in range(n)]
    (P / "narration.json").write_text(json.dumps({"lang": "en", "lines": lines}))
    return P


class Mock:
    """Loopback HTTP server that records (method, path, x-goog-api-key) of every request and gives one canned reply."""

    def __init__(self, status: int = 200, body: dict | None = None, location: str | None = None):
        self.status, self.location, self.seen = status, location, []
        self.body = json.dumps(body if body is not None else {"name": "models/mock"}).encode()
        owner = self

        class Handler(http.server.BaseHTTPRequestHandler):
            def reply(self):
                n = int(self.headers.get("Content-Length") or 0)
                if n:
                    self.rfile.read(n)
                owner.seen.append((self.command, self.path, self.headers.get("x-goog-api-key")))
                self.send_response(owner.status)
                if owner.location:
                    self.send_header("Location", owner.location)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(owner.body)))
                self.end_headers()
                self.wfile.write(owner.body)

            do_GET = do_POST = reply

            def log_message(self, *a):
                pass

        self.srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        self.url = f"http://127.0.0.1:{self.srv.server_address[1]}"
        threading.Thread(target=self.srv.serve_forever, daemon=True).start()

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        self.srv.shutdown()
        self.srv.server_close()


class Byok(unittest.TestCase):
    def assertNoLeak(self, r: subprocess.CompletedProcess, *values: str):
        for v in values:
            self.assertNotIn(v, r.stdout + r.stderr)

    def test_no_key_explains_byok(self):
        r = run(["key", "status", *NOKC], {})
        self.assertEqual(r.returncode, 1)
        self.assertIn("BYOK", r.stdout)
        self.assertIn(str(SCRIPT.resolve()), r.stdout)   # a path that works from any folder or install
        self.assertNotIn("! python3", r.stdout)            # `!` commands have no terminal: never suggested

    def test_sources_and_order(self):
        cases = [
            ({"GEMINI_API_KEY": "k-gemini-111"}, [], "GEMINI_API_KEY"),
            ({"GOOGLE_API_KEY": "k-google-222"}, [], "GOOGLE_API_KEY"),
            ({"MY_KEY": "k-mine-333", "GEMINI_API_KEY": "k-gemini-111"}, ["--api-key-env", "MY_KEY"], "MY_KEY"),
        ]
        for env, extra, expect in cases:
            r = run(["key", "status", *NOKC, *extra], env)
            self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
            self.assertIn(expect, r.stdout)
            self.assertNoLeak(r, *env.values())

    def test_status_names_every_other_source(self):
        r = run(["key", "status", *NOKC], {"GEMINI_API_KEY": "k-gemini-111", "GOOGLE_API_KEY": "k-google-222"})
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        self.assertIn("found (environment variable GEMINI_API_KEY)", r.stdout)
        self.assertIn("also set, not used: environment variable GOOGLE_API_KEY", r.stdout)
        self.assertNoLeak(r, "k-gemini-111", "k-google-222")

    def test_keychain_item_ranks_above_google_api_key(self):
        ns = argparse.Namespace(env_file=None, api_key_env=None, keychain_service=THROWAWAY, no_prompt=True)
        with mock.patch.object(T, "keychain_get", return_value="k-keychain-555"), \
                mock.patch.object(T, "keychain_has", return_value=True), \
                mock.patch.dict(os.environ, {"GOOGLE_API_KEY": "k-google-222"}):
            os.environ.pop("GEMINI_API_KEY", None)
            k, src = T.resolve_key(ns, prompt=False)
            self.assertEqual((k, src), ("k-keychain-555", f"macOS Keychain item {THROWAWAY}"))
            self.assertEqual(T.other_sources(ns, src), ["environment variable GOOGLE_API_KEY"])
            os.environ["GEMINI_API_KEY"] = "k-gemini-111"
            k, src = T.resolve_key(ns, prompt=False)
            self.assertEqual(src, "environment variable GEMINI_API_KEY")

    def test_env_file_wins_and_reads_only_key_line(self):
        with tempfile.TemporaryDirectory() as d:
            f = Path(d) / "keys.env"
            f.write_text('OTHER_SECRET=dont-read-me\nexport GOOGLE_API_KEY="k-file-444"  # note\n')
            r = run(["key", "status", *NOKC, "--env-file", str(f)], {"GEMINI_API_KEY": "k-gemini-111"})
            self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
            self.assertIn("--env-file keys.env (GOOGLE_API_KEY line)", r.stdout)
            self.assertNoLeak(r, "k-file-444", "dont-read-me")

    def test_env_file_prefers_the_gemini_line(self):
        """A shared .env with another project's GOOGLE_API_KEY above GEMINI_API_KEY must send the Gemini key."""
        with tempfile.TemporaryDirectory() as d, Mock() as m:
            f = Path(d) / "mixed.env"
            f.write_text("GOOGLE_API_KEY=dummy-maps-key-of-another-project\nDB_URL=x\nGEMINI_API_KEY=dummy-gemini-key-meant\n")
            r = run(["key", "status", *NOKC, "--env-file", str(f)], {})
            self.assertIn("(GEMINI_API_KEY line)", r.stdout)
            r = run(["key", "check", *NOKC, "--env-file", str(f), "--api-base", m.url], {})
            self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
            self.assertEqual([k for _, _, k in m.seen], ["dummy-gemini-key-meant"])
            self.assertNoLeak(r, "dummy-gemini-key-meant", "dummy-maps-key-of-another-project")

    def test_explicit_sources_never_fall_back(self):
        with tempfile.TemporaryDirectory() as d:
            f = Path(d) / "other.env"
            f.write_text("OTHER=1\n")
            for extra in (["--env-file", str(f)], ["--api-key-env", "BYOK_TEST_UNSET_NAME"]):
                r = run(["key", "status", *NOKC, *extra], {"GEMINI_API_KEY": "k-gemini-111"})
                self.assertEqual(r.returncode, 1, r.stdout + r.stderr)
                self.assertNoLeak(r, "k-gemini-111")

    def test_key_arguments_are_refused_unseen(self):
        """A key typed as an argument (or into a key-source flag) is never repeated: no abbreviations, no echo."""
        cases = [["key", "status", "--api-key", DUMMY], ["key", "status", f"--api-key={DUMMY}"], ["key", "check", "--key", DUMMY],
                 ["key", "status", "--api-k", DUMMY], ["key", "status", "--env", DUMMY], ["key", "status", "--api-key-env", DUMMY],
                 ["key", "status", "--env-file", DUMMY], ["key", "forget", "--keychain", DUMMY], ["key", DUMMY],
                 ["synth", "--text", "hi", "--out", "never-written.wav", "--api-key", DUMMY],
                 ["batch", "--project", ".", "--batch", DUMMY]]
        for args in cases:
            r = run([*args, *NOKC], {})
            self.assertNotEqual(r.returncode, 0, args)
            self.assertNoLeak(r, DUMMY)
            self.assertNotIn("Traceback", r.stderr, args)
        r = run(["key", "status", "--api-key", DUMMY], {})
        self.assertIn("never passed as a command-line argument", r.stderr)

    def test_malformed_key_is_refused_unseen(self):
        """A key with a line break once crashed inside urllib with the whole value in the error message."""
        multi = "dummy-part-ONE-0000\ndummy-part-TWO-0000"
        with tempfile.TemporaryDirectory() as d:
            for args, env in ((["key", "status"], {"GEMINI_API_KEY": multi}),
                              (["key", "check", "--api-base", "http://127.0.0.1:9"], {"GEMINI_API_KEY": multi}),
                              (["key", "status", "--api-key-env", "BYOK_TEST_MULTI"], {"BYOK_TEST_MULTI": multi}),
                              (["synth", "--text", "hi", "--out", str(Path(d) / "x.wav"), "--cache", d, "--api-base",
                                "http://127.0.0.1:9", "--retries", "1"], {"GEMINI_API_KEY": multi})):
                r = run([*args, *NOKC], env)
                self.assertEqual(r.returncode, 1, r.stdout + r.stderr)
                self.assertIn("value not shown", r.stdout + r.stderr)
                self.assertNoLeak(r, "part-ONE", "part-TWO")

    def test_redirects_are_never_followed(self):
        """A redirect would carry the key header to whatever URL the server names."""
        with Mock() as collector, Mock(status=302, location=None) as hop:
            hop.location = collector.url + "/collected"
            r = run(["key", "check", *NOKC, "--api-base", hop.url], {"GEMINI_API_KEY": "dummy-redirect-key-1234"})
            self.assertEqual(r.returncode, 1, r.stdout + r.stderr)
            self.assertIn("redirect refused", r.stdout)
            with tempfile.TemporaryDirectory() as d:
                r = run(["synth", *NOKC, "--text", "Hello there.", "--out", str(Path(d) / "x.wav"), "--api-base", hop.url,
                         "--retries", "1", "--tries", "1", "--no-verify", "--cache", d], {"GEMINI_API_KEY": "dummy-redirect-key-1234"})
            self.assertEqual(r.returncode, 2, r.stdout + r.stderr)
            self.assertEqual(len(hop.seen), 2)
            self.assertEqual(collector.seen, [])
            self.assertNoLeak(r, "dummy-redirect-key-1234")

    def test_loopback_never_goes_through_a_proxy(self):
        with Mock() as proxy, Mock() as m:
            env = {"GEMINI_API_KEY": "dummy-proxy-key-5678", "http_proxy": proxy.url, "HTTP_PROXY": proxy.url}
            r = run(["key", "check", *NOKC, "--api-base", m.url], env)
            self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
            self.assertEqual(proxy.seen, [])
            self.assertEqual([k for _, _, k in m.seen], ["dummy-proxy-key-5678"])
            self.assertNoLeak(r, "dummy-proxy-key-5678")

    def test_dry_run_needs_no_key(self):
        r = run(["key", "check", "--dry-run", *NOKC], {})
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)

    def test_key_help_lists_only_key_options(self):
        r = run(["key", "--help"], {})
        self.assertEqual(r.returncode, 0)
        for word in ("status:", "check:", "save:", "forget:", "--keychain-service", "--dry-run"):
            self.assertIn(word, r.stdout)
        for flag in ("--stt-model", "--retries", "--rpm", "--tries", "--cache", "--lang"):
            self.assertNotIn(flag, r.stdout)

    def test_save_and_forget_dry_run_change_nothing(self):
        if sys.platform != "darwin":
            self.skipTest("macOS Keychain only")
        for action in ("save", "forget"):
            r = run(["key", action, "--dry-run", *NOKC], {})
            self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
            self.assertIn("dry run, nothing changed", r.stdout)

    def test_save_refuses_without_terminal(self):
        """Claude Code's `!` runs commands like this (stdin /dev/null, no terminal): point to a real terminal instead."""
        if sys.platform != "darwin":
            self.skipTest("macOS Keychain only")
        r = run(["key", "save", *NOKC], {})
        self.assertEqual(r.returncode, 1)
        self.assertIn("own terminal window", r.stdout)
        self.assertIn(f"{SCRIPT.resolve()} key save --keychain-service {THROWAWAY}", r.stdout)
        self.assertNotIn("! python3", r.stdout)

    @unittest.skipUnless(sys.platform != "win32" and hasattr(os, "openpty"), "needs a pseudo-terminal")
    def test_terminal_prompt_runs_once_and_hidden(self):
        """No key anywhere, a real terminal, two parallel requests: exactly one hidden prompt, the typed key never shown,
        terminal echo restored, and every request carries that one key (parallel prompts once raced on the terminal)."""
        import select
        import termios
        prompt = b"Gemini API key (hidden"
        # session leader that owns the terminal, runs the batch, then reports the echo flag it left behind (the terminal
        # is revoked once its session leader exits, so the test cannot read it afterwards)
        ctty = ("import fcntl, subprocess, sys, termios\n"
                "fcntl.ioctl(0, termios.TIOCSCTTY, 0)\n"
                "rc = subprocess.call(sys.argv[1:])\n"
                "print('[echo-after=%d]' % bool(termios.tcgetattr(0)[3] & termios.ECHO), flush=True)\n"
                "sys.exit(rc)\n")
        with tempfile.TemporaryDirectory() as d, Mock(status=400, body={"error": {"code": 400, "message": "mock"}}) as m:
            P = project(Path(d) / "p", 3)
            master, slave = os.openpty()
            try:
                proc = subprocess.Popen([sys.executable, "-c", ctty, *TTS, "batch", "--project", str(P), "--batch", "1",
                                         "--jobs", "2", "--retries", "1", "--tries", "1", "--cache", str(Path(d) / "cache"),
                                         "--api-base", m.url, "--keychain-service", THROWAWAY],
                                        stdin=slave, stdout=slave, stderr=slave, env=clean_env(), start_new_session=True)
                out, typed, echo_at_prompt = b"", [], []
                deadline = time.monotonic() + 90
                while time.monotonic() < deadline:
                    ready, _, _ = select.select([master], [], [], 0.2)
                    chunk = b""
                    if ready:
                        try:
                            chunk = os.read(master, 65536)
                        except OSError:   # EIO once the session leader is gone
                            pass
                        out += chunk
                    if out.count(prompt) > len(typed):
                        echo_at_prompt.append(bool(termios.tcgetattr(slave)[3] & termios.ECHO))
                        typed.append(f"dummy-typed-key-{len(typed)}-000000000000")
                        os.write(master, typed[-1].encode() + b"\n")
                    if proc.poll() is not None and not chunk:
                        break
                else:
                    proc.kill()
                    self.fail("batch did not finish:\n" + out.decode(errors="replace")[-2000:])
            finally:
                os.close(master)
                os.close(slave)
            text = out.decode(errors="replace")
            self.assertEqual(out.count(prompt), 1, text)
            self.assertEqual(echo_at_prompt, [False], text)
            self.assertIn("[echo-after=1]", text, "terminal echo left off")
            self.assertNotIn(typed[0], text)
            self.assertTrue(m.seen, text)
            self.assertEqual({k for _, _, k in m.seen}, {typed[0]})
            self.assertEqual(proc.returncode, 2, text)


if __name__ == "__main__":
    unittest.main()
