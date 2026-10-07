// Audio auto-pick rules of runtime/stills.mjs (used by render.mjs and build.mjs).
// Run from the repo root:  node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pickAudio, audioStatus, placeholderCaptions } from '../skills/motion-showreel/runtime/stills.mjs';

function project(files) {
  const P = fs.mkdtempSync(path.join(os.tmpdir(), 'audio-pick-'));
  fs.mkdirSync(path.join(P, 'build', 'vo'), { recursive: true });
  for (const [name, body] of Object.entries(files)) fs.writeFileSync(path.join(P, 'build', name), typeof body === 'string' ? body : JSON.stringify(body));
  return P;
}
const base = name => (r => (r.file ? path.basename(r.file) : null));

test('HTML prefers the 96k embed copy of the music over the 256k song', () => {
  const P = project({ 'music-30.wav': 'x', 'music-30.m4a': 'x', 'music-30-embed.m4a': 'x', 'music-30.json': { stem: false, mastered: true } });
  assert.equal(base()(pickAudio(P, '30', { target: 'html' })), 'music-30-embed.m4a');
  assert.equal(base()(pickAudio(P, '30', { target: 'mp4' })), 'music-30.m4a');
});

test('a real narrated mix wins over the music', () => {
  const P = project({ 'music-30.m4a': 'x', 'music-30-embed.m4a': 'x', 'mix-30.m4a': 'x', 'mix-30-embed.m4a': 'x', 'mix-30.wav': 'x',
    'mix-30.json': { placeholder: false, unverified: [] } });
  assert.equal(base()(pickAudio(P, '30', { target: 'html' })), 'mix-30-embed.m4a');
  assert.equal(base()(pickAudio(P, '30', { target: 'mp4' })), 'mix-30.m4a');
});

test('placeholder mixes are skipped (or allowed on request)', () => {
  const P = project({ 'music-30.m4a': 'x', 'mix-30.m4a': 'x', 'mix-30-embed.m4a': 'x', 'mix-30.json': { placeholder: true } });
  const r = pickAudio(P, '30', { target: 'html' });
  assert.equal(base()(r), 'music-30.m4a');
  assert.ok(r.skipped.length >= 2);
  assert.equal(base()(pickAudio(P, '30', { target: 'html', allowPlaceholder: true })), 'mix-30-embed.m4a');
  assert.equal(audioStatus(path.join(P, 'build', 'mix-30-embed.m4a')).placeholder, true);
});

test('a mix without the flag is a placeholder when the VO manifest says dry run', () => {
  const P = project({ 'mix-30.m4a': 'x', 'mix-30.json': { lufs: -14 }, 'vo/manifest.json': { dryRun: true, lines: [] } });
  assert.equal(audioStatus(path.join(P, 'build', 'mix-30.m4a')).placeholder, true);
});

test('unmastered stems are never auto-picked', () => {
  const P = project({ 'music-30-stem.wav': 'x', 'music-30-stem.json': { stem: true, mastered: false } });
  assert.equal(pickAudio(P, '30', { target: 'mp4' }).file, null);
  // a legacy stem written over music-30.wav is recognised by its sidecar
  const Q = project({ 'music-30.wav': 'x', 'music-30.json': { stem: true, mastered: false } });
  assert.equal(pickAudio(Q, '30', { target: 'mp4' }).file, null);
});

test('placeholder captions are detected only when they would be drawn', () => {
  const plan = { captions: [{ t0: 0, t1: 1, text: 'x' }], vo: { placeholderCaptions: true } };
  assert.equal(placeholderCaptions({ captions: { enabled: true } }, {}, plan), true);
  assert.equal(placeholderCaptions({ captions: { enabled: false } }, { layout: { captions: { enabled: true } } }, plan), false);
  assert.equal(placeholderCaptions({}, { layout: { captions: { enabled: true } } }, plan), true);
  assert.equal(placeholderCaptions({ captions: { enabled: true } }, {}, { ...plan, vo: { placeholderCaptions: false } }), false);
});
