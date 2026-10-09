# Audio: music, SFX, mastering, sync

The soundtrack is synthesized: numpy/scipy only, no samples, no network, deterministic (same inputs, same
samples). It has three inputs: the tone (`P/style.json` `sound`), the time (`P/build/cut-<cut>.json` from
`timing/plan_cut.py`) and the events (the cue list in that cut). Music and SFX share the one bar grid and cue
list the visuals use. A longer cut of the same reel is the same song with more bars at the same BPM.

```
S=<skill>; P=<project>
python3 $S/audio/arrange.py --project $P --cut 30                 # build/music-30.wav (24-bit), .m4a (256k, MP4),
                                                                  # -embed.m4a (96k, HTML), .json (sidecar)
python3 $S/audio/verify_sync.py --wav $P/build/music-30.wav --cut $P/build/cut-30.json \
        --png $P/build/review/sync-30.png --zoom $P/build/review/joins-30/
python3 $S/audio/arrange.py --project $P --cut 30 --stem          # unmastered bed for mix_vo.py: music-30-stem.wav/.json
python3 $S/audio/synth.py list                                    # SFX names, anchors, aliases, instruments
python3 $S/audio/synth.py sfx "pop:3 gap=0.2b" --out x.wav        # audition one cue spec (prints where the cue lands)
python3 $S/audio/synth.py audition DIR [--families digital]       # every SFX as WAV + grid-<family>.png
python3 $S/audio/synth.py loudness FILE...                        # integrated LUFS, LRA, true peak
```

`arrange.py` options: `--stems` (also `build/stems/<cut>-music.wav`, `-sfx.wav`), `--scale X` / `--warp "o:s,..."`
(section 8), `--preset NAME`, `--no-transition-sfx`, `--no-sfx`, `--no-music`, `--seed N`, `--lufs -14`, `--tp -1`,
`--bitrate 256k`, `--embed-bitrate 96k` (`0` = skip), `--out BASE`. Exit 0 ok, 1 bad input, 2 a cue names an
unknown SFX or has a bad parameter (everything else is still rendered; the sidecar lists it under `unknownSfx`).

## 1. Inputs

**`style.json` `sound`** (written by the tone pass, `tone-and-manner.md`; every field optional):

| Key | Values | Effect |
|---|---|---|
| `preset` | `bright-pop` `dark-synth` `ambient` `corporate` `lofi` `cinematic-lite` `chiptune` `swing` `dnb` | parameter bundle (section 2); a starting point, not a look |
| `bpm` | number | used by the planner; the cut's `bpm` is the authority (the arranger warns on a mismatch) |
| `key` | `F`, `Bb`, `F#`, `D minor` | tonic; pitched SFX (pops, dings, chimes, beeps, blips, sparkles, stings) are in this key |
| `mode` | `major` `minor` `dorian` `mixolydian` `lydian` `phrygian` | harmony tables; church modes are stacked inside their own scale (locrian -> phrygian) |
| `instruments` | names / aliases from `synth.py list` | fills the roles bed, motion, bass, top, motif and restricts the kit when drum names appear |
| `drums` | `none` `light` `full` | groove density cap |
| `sfx` | `glassy` `digital` `organic` `minimal` | timbre family of every SFX (level-matched; minimal sits 2.5 dB lower) |
| `energy` | `[intro, groove, breakdown, drop, outro]` 0..1, or `{part: value}` | layer count, filter brightness, velocities per music part |
| `roles` | `{role: instrument}` | pins a role (bed, motion, bass, top, motif) to one instrument, e.g. `{"motion": "koto"}`; otherwise the preset's choice stands when it is in `instruments` |
| `scale` | semitones above the tonic, e.g. `[0, 2, 3, 7, 8]` | melodic lines (motion, top, motif) snap to these pitch classes while the harmony stays diatonic: pentatonic or Japanese colour (平調子 hirajōshi on the tonic = `[0, 2, 3, 7, 8]`, miyako-bushi = `[0, 1, 5, 7, 8]`) |
| `tweaks` | object of preset keys | advanced override, deep-merged into the preset (e.g. `{"swing": 0.15, "pad": {"gain": 0.12}}`) |

Instrument roles: bed = `pad` `strings` `epiano` `piano` `guitar` `ukulele` `koto` (strummed); motion = `pulse`
`pluck`/`arp` `saw-pluck` `marimba` `guitar` `ukulele` `koto` `piano` `epiano` `strings` `bell`; bass = `tri-bass`
`upright` `reese` `saw-bass` `bass` `sub`; top = `stab` `bell` `glass` `strings`; motif = `pulse-lead` `clarinet` `bell`
`lead` `piano` `epiano` `marimba` (and `guitar` `ukulele` `koto` when pinned). Drums: `kick` `clap` `snare` `rim`
`hats` `shaker` `toms` `ride` `brush`; texture `crackle`. Plucked strings are Karplus-Strong; chiptune voices are
4-bit stepped (pulse, triangle, LFSR noise).
A role whose instruments are all missing is silent (no bed = no sustained harmony; the arranger warns).

**`reel.config.json` `"audio"`** (optional, project-level): `preset`, `transitionSfx` (default true), `musicDb` /
`sfxDb` (trim the music or SFX bus in dB), `seed` (default: hash of the title, so every cut shares one hook),
`finalHit` (`"outro"` default | `"lastBar"` | `"none"` | bar index), `outroMaxBars` (default 3: a longer outro keeps a
2-bar ring-out and the previous section carries the rest, so a long end-card hold never sits on a quiet tail),
`dropGap` (bool), `swing` (0..0.3), `tweaks`.

**`cut-<cut>.json`**: `bpm`, `beatsPerBar`, `bars`, `duration`, `music[]` (`fromBar toBar part occurrence`),
`scenes[]` (`id t0 in`) and `cues[]` (`t sfx scene` plus pass-through keys). Cue keys the arranger reads: `gain`
(dB), `pan` (-1..1), `family`, `n`, `gap`, `pitch` (semitones), `step`, `rise`, `peak`, `density`, `pre`, `dir`,
`durBeats` (beats), `dur` (seconds as the planner writes it, or a string with units), `flags` (list).

## 2. Matching sound to tone

The sound follows the source material exactly like the palette does; write the evidence in `rationale.sound`. The
tone pass drafts preset, BPM and SFX family from the interpretation tables of `tools/extract_style.py` (print them
with `--tables`; `tone-and-manner.md` section 4 quotes them); those tables are the authority, this one explains them.

| Evidence in the material | Preset | BPM | Key / mode | Drums | SFX | Energy (i, g, b, d, o) |
|---|---|---|---|---|---|---|
| playful consumer product, light pastel UI, mascots, emoji-rich README | bright-pop | 112-124 | F, G, D major | full | glassy | .3 .7 .35 1 .45 |
| research, data, security; dark dashboards; numbers-first claims | dark-synth | 118-130 | D, A, E minor; dorian for "cool" | full | digital | .35 .8 .4 1 .5 |
| calm, contemplative, health, art, nature; sparse layouts | ambient | 84-100 | E, D major; lydian for wonder | none / light | minimal | .2 .45 .3 .65 .3 |
| B2B, institutional, finance; corporate slide template | corporate | 100-118 | C, G major | light | minimal / glassy | .3 .6 .35 .85 .4 |
| developer tool, indie, cosy, terminal-first, hand-drawn | lofi | 80-92 | Eb, Ab major 7ths; dorian | full (swing) | organic | .3 .6 .35 .75 .35 |
| launch trailer, mission, space / climate, big claims | cinematic-lite | 88-110 | D, C minor | light (toms) | minimal | .3 .6 .4 1 .45 |
| retro game, pixel art, arcade | chiptune | 132-150 | major / mixolydian | full (chip noise) | digital | .4 .75 .4 1 .5 |
| 1920s-30s, jazz age, art deco, speakeasy, vintage invitation | swing | 108-132 | Bb, F, Eb major | full (ride, brushes) | glassy / organic | .35 .6 .35 .85 .4 |
| sport, race, speed, broadcast graphics, energetic numbers | dnb | 170-178 | G, F, A minor | full (two-step, half-time drops) | digital | .5 .8 .45 1 .55 |
| terminal tool with a playful theme (Catppuccin-like) | bright-pop or dark-synth by theme | 120-128 | major / mixolydian | full | digital | default |

- **Tempo** sets length arithmetic (`timing-and-length.md`); pick one the material can carry, then let bars decide
  length. Pace words map to BPM: calm 80-100, medium 100-118, energetic 118-130 (inside the preset's range).
- **Mode carries the mood more than the key**: major = warm / confident, minor = serious / tense, dorian = cool,
  mixolydian = bright but casual, lydian = wonder, phrygian = dark / exotic (rarely right).
- **SFX family follows the visual language**: glossy 3D, glass, cosmetics and skincare (the extractor reads
  화장품/뷰티/스킨케어 too) -> glassy; HUDs, terminals, data -> digital; paper, wood, hand-made, nature -> organic;
  minimal flat UI, serious finance or health -> minimal.
- **Energy is the curve**: the hook is low, the brand reveal or payoff is 1.0, tension dips. A repeated part gets
  +0.05 per occurrence (the second drop is the brightest).

| Preset | Harmony (groove / drop) | Bed / motion / bass / top / motif | Groove | Extras |
|---|---|---|---|---|
| bright-pop | IV V iii vi / I V IV V (maj7, 6, m7 colours) | saw pad / marimba+bell 16th arp / round offbeat bass / octave bells / bell hook | four-on-floor, claps 2+4, offbeat hats, shaker | K-pop-lite; sidechain 0.55 |
| dark-synth | i VI III VII (add9) | dark saw pad / saw-pluck 16th arp + ghost echo / rolling saw bass / offbeat stabs / saw lead | four-on-floor, clap+snare, 16th hats, open hats | hard sidechain, pre-drop gap |
| ambient | Imaj9 IVmaj7 vi9, 2 bars per chord | slow pad / sparse bells with long delay / sine sub / glass glints / bell hook | soft kick, rim, shaker (light) | 4.5 s reverb, almost no pumping |
| corporate | vi IV I V / I V vi IV (add9) | strings / piano broken 8ths (+ marimba in drops) / round 8ths / glock / piano hook | four-on-floor light | warm, modest pumping |
| lofi | ii9 V9 Imaj9 vi9 | e-piano chords / e-piano comping / syncopated round bass / - / e-piano hook | boom-bap, swing 0.22 | tape wow, 5.2 kHz low-pass, vinyl crackle |
| cinematic-lite | i VI III VII, cadence V | strings / spiccato ostinato / sub + low strings / high strings / piano | toms, half-time snare | pre-drop gap, 3.5 s hall |
| chiptune | I V vi IV | - / pulse arps / triangle bass / - / pulse lead | chip noise kick, snare, hats | no reverb, no sidechain |
| swing | I6 vi7 ii7 V7 (rhythm changes in drops) | - / piano comping on the Charleston rhythm (rootless) / walking upright bass with chromatic approach notes / - / clarinet | ride "ding ding-a", hat chick on 2+4, brushes, feathered kick | swung eighths (triplet), tape |
| dnb | i9 VI7 iv9 v7, 2 bars per chord | pad only outside drops / - / reese + sub (long notes, half-time in drops) / offbeat stabs / - | two-step (kick 1 and the 'and' of 3, snare 2+4, ghosts), half-time drops | light swing, pre-drop gap |

Case studies (where the material led, not presets to copy): K-BeautyGate (Korean consumer pitch, pastel app and
plush mascots) -> bright-pop, F major, 120 BPM, glassy, music-led. FDDD / FlyGate (research repos, dark neon
dashboards, computed data) -> dark-synth, D minor, 128 BPM, digital, narrated. CC-statusline (terminal tool,
Catppuccin) -> digital SFX on giant command words, keytaps and glitch cuts.

## 3. Arrangement on the bar grid

Every section starts on a bar line. Each `music` part behaves the same at any length:

| Part | Music | Drums |
|---|---|---|
| `intro` | low-passed pad opening up, the reel's 2-bar hook on bells, sub bed | none (light kit when energy >= 0.5) |
| `groove` | bed, bass pattern, motion pattern; shaker joins on bar 3 of a long groove | full or light by `drums` and energy |
| `breakdown` | dark filtered pad, drone, ticking pulse; the last bar before a drop or groove is a build bar (arp returns 0.35 -> 0.95, bass held) | stop on the first bar line (dark-synth / cinematic keep a heartbeat kick) |
| `drop` | brightest pad, busy bass, arp x1.15, top layer (energy >= 0.8), hook in alternate phrases | drop pattern (extra hats, open hats) |
| `outro` | **final hit** on its first downbeat: kick, crash, wide tonic chord, bell cascade, bass + sub ringing; a long outro continues with a quiet tonic bed and hook echoes | none |

**Changes between sections** (automatic, they move with the plan):
- Into a `drop` (or energy rising > 0.1, or out of `intro` / `breakdown`): a riser over the last bar (2 bars when
  the outgoing section has >= 4 and the target is a drop), a reverse swell and a clap / snare / tom roll into
  drops; dark-synth and cinematic-lite silence the music for the last 1/8 beat (`dropGap`). The drop downbeat
  gets a crash and a sub hit.
- Into a `breakdown`: drums stop, a thud and a soft crash mark the cut, a downlifter falls through the first bar.
- Energy falling by > 0.2: soft crash. Intro -> groove: soft crash. Groove -> groove: a 16th-hat fill.
- An authored build cue (`riser`, `swell`, `roll`, `charge`) that ends on a section boundary replaces the
  arranger's own riser and swell there (an authored `roll` also replaces its fill), so nothing doubles. An
  authored crash-like cue (`shimmer`, `impact`, `boom`, `sting`, `reveal`) within 60 ms replaces the music crash.
- Heavy SFX (`boom impact slam thud stamp door heartbeat`) duck the music 3 dB for ~0.4 s and play the kick on
  that beat at 55 % velocity, so stamps and booms read clearly; crashes and stings do not duck the drop.

**Harmony.** Each preset has chord tables per part (roman numerals); the progression loops per section (1 or 2
bars per chord), its last bar becomes the preset's cadence chord (V7sus4, VII, V) when a `drop` or `outro`
follows, and every chord is voice-led (smallest motion, no low clusters). The `outro` is always the tonic. Church
modes add their signature chord (mixolydian bVII, lydian II, dorian IV, phrygian bII) and every chord is stacked
inside the mode's scale; minor tables keep their deliberate V for cadences.

**Longer cuts.** More bars per section, the same BPM, groove and harmony; plus phrase evolution inside sections of
>= 6 bars: energy +0.04 per 4-bar phrase, the arp pattern alternates direction per phrase, and the hook answers
quietly in alternate groove phrases. Hold cues authored with `every` add hits in longer holds. Check the result
with `verify_sync.py` on every cut: the BPM must read the same.

## 4. SFX

**Grammar** (the `sfx` string of a cue, verbatim): `name[:arg...] [key=value ...] [flag ...] [xN]`; layer
several with `+` (`"impact:big+shimmer"`). `:args` belong to their layer: a family name, a count (`pop:3`) for
countable SFX, a time (`riser:2`, `keytap:1.5`, `whoosh:0.3s`), or a flag. `key=value` and flags apply to every
layer. **Bare time values are beats**; `2b` beats, `1bar` bars, `0.3s` / `300ms` seconds. Keys: `dur`, `n`,
`gap`, `gain` (dB), `pan`, `pitch` (semitones), `step` / `rise` (pentatonic steps), `peak` (0..1), `density`,
`pre` (start before the cue), `dir` / flags `lr rl up down`, `family`. Flags: `big`, `soft` (-6 dB), `loud`,
`fast`, `terminal`, `bright`. The planner validates specs with `synth.parse_sfx`; an object `{"name": ...,
<keys>}` is accepted too.

**Anchors: the cue time is the perceptual sync point.** `onset`: the sound starts on the cue. `peak`: a whoosh
peaks on it (it starts earlier). `end`: risers, swells, rolls, a charge-up or a door swing finish on it (cue the
hit they lead into, not their start). `span`: a sequence (keytaps, blips, sparkles, counts) starts on the cue and
runs for `dur`; `glitch pre=0.1s` straddles a cut.

| SFX | Anchor | Use | Aliases |
|---|---|---|---|
| `pop` | onset | bubbly pitch-up pop; `n` rises on the key's pentatonic (gap 1/4 beat, `step=`, `big`) | bubble, chip |
| `tick` | onset | tiny tick; `n` ticks `gap` apart (0.04 s) rising: per-letter / per-item | ticks, letters |
| `whoosh` | peak | noise sweep peaking on the cue (dur 1 beat, `peak=0.6`, `lr rl up down`) | swoosh |
| `swish` | peak | short soft whoosh (0.5 beat): chips, cards, small moves | swipe, slide |
| `whip` | peak | fast wide whoosh (0.6 beat): whip transitions | whip-pan |
| `zoom` | peak | centred rising whoosh peaking late (1 beat): zoom-throughs | zoom-in, push |
| `flip` | peak | card / page flip (0.32 s) | card-flip, page |
| `air` | peak | barely-there swish: match cuts | breath, match |
| `riser` | end | noise + detuned-saw riser ending on the cue (dur 1 bar) | rise, uplifter, build |
| `swell` | end | reverse cymbal ending on the cue (1 beat) | reverse, suck |
| `charge` | end | charge-up tone into the cue (0.32 s) | charge-up, powerup |
| `roll` | end | accelerating snare / clap roll ending on the cue (1 beat) | drumroll, fill |
| `door` | end | heavy door swing whose thud lands on the cue (0.5 s) | gate, creak |
| `shimmer` | onset | crash: bright noise + ringing partials (3 s; `big` longer, +3 dB) | crash, cymbal, flash |
| `boom` | onset | sub boom + noise crash (3 s): the heaviest hit | sub-boom, drop |
| `impact` | onset | boom + crash + snap; `big`; family sets the body | hit-big |
| `slam` | onset | kick + clap + short impact; `big` adds a tonic stab | smash |
| `hit` | onset | drum hit on a beat (kick + noise + clap) | accent |
| `sting` | onset | logo sting: impact + tonic chord + bell cascade | logo, finale |
| `reveal` | onset | light reveal: soft shimmer + chime | unveil, appear |
| `thud` | onset | low body thud: landings | land, bump |
| `stamp` | onset | rubber stamp: thud + slap + paper | approve, seal |
| `shatter` | onset | glass shatter | break, crack |
| `heartbeat` | onset | lub-dub | heart, thump |
| `pulse` | onset | low thump with a glassy top: HUD pulses | sonar |
| `chime` | onset | 4-note tonic arpeggio | glint, magic |
| `confirm` | onset | rising success chime | allow, success, done |
| `ding` | onset | bell ding; `n` rising | bell, pin |
| `plink` | onset | water-drop plink + splash | droplet, drip |
| `bloop` | onset | round bloop: blob reveals | blob, boop |
| `bwoop` | onset | descending drop-out: items filtered away | dropout, disappear |
| `buzz` | onset | soft deny buzz (two short buzzes) | deny, error, wrong |
| `beep` | onset | terminal / lock-on beep on the key's third; `n` rising a pentatonic step each | beeps, lock-on |
| `lock` | onset | target lock: bell partials on the key's fifth; `big` | target, acquire |
| `click` | onset | UI click / tap | tap, press, button |
| `snap` | onset | finger snap | flick |
| `notify` | onset | two-note notification: message received | message, ping |
| `send` | peak | rising swish into a soft pop: message sent | sent, outgoing |
| `enter` | onset | return-key thunk: command submitted | return, submit, run |
| `blip` | onset | one FM data blip in key (`step=`) | data-point |
| `keytap` | span | key taps for `dur` (1 beat, ~70 ms apart; `fast` / `terminal` 38 ms, brighter) | typing, type, keys |
| `blips` | span | data blips on a 16th grid (`fast` 32nds, `density`) | data, compute |
| `count` | span | odometer tick roll, fast then slowing: count-ups | counter, tally |
| `strobe` | span | one tick per strobe flash: `n` (2) `gap` (0.1 s) | flashes |
| `glitch` | span | glitch burst (0.3 s); `pre=0.1s` straddles a cut | corrupt, static |
| `sparkle` | span | pentatonic sparkles across `dur` (2 beats, ~9 / s) | glitter, trail |
| `coin` | span | coin ticks ~75 ms apart: prices, budgets | coins, cash |
| `zap` | span | soft upward zap (0.8 s): packets, beams | arc, packet |
| `scan` | span | falling tremolo tone (1 bar): scanners, lenses | radar, lens |
| `drawon` | span | rising tone + scratch: lines, routes, charts drawing on | draw, line, route |
| `drone` | span | low tension drone on the key root (2 bars) | tension, hum |
| `downlifter` | onset | falling noise sweep after a hit, into calm | downsweep, fall |

**Automatic transition SFX.** Each scene's `in` gets a sound on its boundary unless an authored transition,
impact or build cue lies within 0.75 beat of it: `blobWipe` swish, `zoomInto` zoom, `whip` whip, `glitch`
glitch (`pre=0.1s`), `flash` soft shimmer, `strobe` strobe, `match` air, `impact` impact, `portalFlash` swell +
reveal, `cut` nothing (the music downbeat carries it). Turn off with `"audio": {"transitionSfx": false}` or
`--no-transition-sfx` when the compositor's transition windows are not centred on the bar line.

**Recipes per moment** (cue in beats from the scene anchor; stagger `gap` = the animation's stagger):

| Moment | Cues |
|---|---|
| hook question / first object | `plink` or `pop`, then `pop:3 gap=0.25b`; `beep:2` on a lock-on |
| type-on title, per letter | `tick:N gap=<stagger>s` starting with the first glyph |
| chips / cards / products flying in | `pop:N gap=<stagger> step=0` (rising scale), `swish` per big card |
| logo / brand reveal on a drop | `reveal` or `sting`; the drop crash is automatic |
| app UI: typing, send, reply | `keytap:<typing beats>`, `send` on submit, `notify` on the reply, `click` on taps |
| terminal / CLI capture | `keytap:<beats> terminal`, `enter` on return, `blips:<beats>` while output streams, `confirm` / `buzz` on the result |
| counters, KPIs | `count:<beats of the count-up>`; `blip step=k` per data point |
| charts, routes, underlines drawing on | `drawon:<draw beats>` |
| approvals, checklists, stamps | `stamp` on each beat (kicks thin automatically) |
| pins, list items, steps | `ding:N gap=<stagger>` |
| deny / allow | `buzz` / `confirm` |
| tension, hidden instruction, attack | `glitch:<beats> density=0.6`, `charge` into an `impact` or `boom+shimmer:big` |
| gates, doors, vaults | `door` (thud on the cue) |
| strobe slogan, word slams | `strobe` + `slam big` per word on the beat |
| magnifier, scanner, HUD sweep | `scan:<beats>`, `pulse` on the found item |
| prices, budgets | `coin:<beats>` |
| myth busted, wall breaks | `shatter` |

**Density.** One cue per visual event the eye catches; none for idle or decorative motion. Consumer reels ran
~1.5-2 cues/s (K-BeautyGate 30 s: about 50 cue entries), data reels 0.5-1 cue/s. Never stack two impacts within a beat.
Pitched SFX are already in the reel's key; keep `pitch=` for deliberate intervals.

## 5. Mixing and mastering

| Stage | Setting |
|---|---|
| Music bus | sidechain from the kick (pads 0.55, bass 0.7, plucks 0.3 for bright-pop; per preset), ping-pong delay (dotted 8th), synthetic stereo IR reverb (2.6 s pop, 4.5 s ambient, 1.4 s lofi) |
| Music level | normalized to -14.3 LUFS before SFX are added; SFX gains are calibrated to it (bright-pop + glassy reproduce the approved K-BeautyGate mix: per-cue level median +0.2 dB with 0.7 dB mean deviation, every section within 1 dB) |
| Master | HP 25 Hz, preset low-shelf cut, glue compression, -14 LUFS integrated, soft clip, 4x-oversampled look-ahead limiter at -1.5 dBTP, 0.3 s fade at the very end |
| AAC | `aac_at` when ffmpeg has it (better at 96k), else `aac`; decoded and re-measured, gain trimmed and re-encoded until true peak <= -1.0 dBTP |

Targets: integrated -14 LUFS (+-0.5; `verify_sync.py` fails beyond +-1), true peak <= -1.0 dBTP in every file
(WAV -1.5, AAC -1.0 to -1.9 after the trim loop), LRA 4-7 LU for pop / synth, up to ~10 LU for ambient and long
cinematic cuts.
Tonal balance reference (bright-pop, octave bands re total): 63 Hz -3, 250 Hz -14, 1 kHz -12, 4 kHz -17,
8 kHz -19 dB.

**Outputs** (base `P/build/music-<cut>`, `-x<scale>` or `-warp` for variants): `.wav` (24-bit 48 kHz, exactly
`duration` long), `.m4a` (256k: `render.mjs` copies it into the MP4 as encoded), `-embed.m4a` (96k: `build.mjs` picks
it for the HTML), `.json` sidecar:
`bpm`, `key`, `mode`, `preset`, `roles`, `kit`, `sections` (with chord names), `bars`, `kicks`, `events` (builds,
drops, final hit), `cues` (every placed SFX: cut time, output time, anchor, family, params, seed), `loudness`
(WAV and each AAC), `warnings`, `unknownSfx`. Read `sections[].chords` and `events` to brief a reviewer.

## 6. With narration

Order: narration timing -> plan -> `arrange.py --stem` -> `mix_vo.py` -> captions -> render (`narration.md`).
The stem is music + SFX with no compression or limiting, at -18 LUFS with sample peaks <= -1 dBFS, written to
`music-<cut>-stem.wav` + `-stem.json` (no AAC) beside the mastered song, which it never touches; `mix_vo.py` picks
the stem by default, ducks it to 0.32 under each line (0.12 s pre-roll, 0.15 s hold, 0.25 s smoothing), keeps the
voice about +1 LU over the bed's loudness and masters the sum once. Neither `render.mjs` nor `build.mjs` ever picks a
stem. `--stems` also writes
music and SFX separately (`build/stems/<cut>-music.wav`, `-sfx.wav`) for custom mixes; `mix_vo.py --music <music>
--sfx <sfx>` ducks both alike.
- Words win: move a busy SFX run (keytaps, blips, sparkles) out of a spoken phrase or soften it (`gain=-6`);
  keep impacts on beats between phrases.
- Verify the final mix, not only the bed: `verify_sync.py --wav P/build/mix-<cut>.wav --cut ...` follows the mix
  report to the bed's sidecar, checks every SFX (cues under a voice line are marked `[vo]`) and enforces loudness
  on the mix. A cue the voice masks resolves through the rules in section 7; the stem carries the same cues
  without the voice when you need a second look.

## 7. Verification

`verify_sync.py` decodes any WAV / M4A / MP4 and checks, against the cut (the cut is the truth; the sidecar only
supplies the exact SFX instances):
- **Sync per cue.** With the sidecar, each placed SFX is re-synthesized and cross-correlated with the audio
  (sample precise; not fooled by a drum on the same beat). Without a sidecar (audio not made by `arrange.py`) it
  falls back to onsets (10 ms hop, multi-band log-energy derivative, within ~5 ms on clean attacks); small UI
  sounds masked by drums then report `weak` rather than fail. The two measures are reconciled per cue: a tonal
  SFX correlates almost equally one period early or late (a pad in the same key under it can win), so a strong
  onset (prominence >= 8, `--strong-onset`) pins the match to within half a period of it; a match below NCC 0.5
  (`--override-ncc`) that disagrees with a strong in-tolerance onset (a voice line over the SFX) yields to the
  onset; a confident match that still disagrees is reported `ambiguous` with both numbers (listen to it; not a
  failure). Tolerance: one video frame (`1/fps` of the cut). Stale audio (cue moved or missing after a re-plan)
  fails by name. A real offset still fails: shifting a correct file by 20 ms fails its cues.
- **Beat.** Comb-filter tempo near the expected BPM and the grid phase: `120.0 BPM, grid phase +0.0 ms` on a
  correct file. A 30 s and a 60 s cut of one reel must read the same BPM. Weak pulses (no drums) are reported,
  not enforced.
- **Duration** (lossy files may be up to two AAC frames longer: codec padding at the end; never shorter),
  **loudness** and **true peak** (skipped only for the stem itself).
- `--png` draws the spectrogram with bar lines, cue marks (red = fail) and the onset curve; `--zoom DIR` draws
  +-1 s spectrograms at every scene and section join. Look for: vertical white lines (clicks), a hard vertical
  end to a ringing sound (truncated tail), silence or mush at a section join, an SFX visibly off its mark, a crash
  that drowns a stamp. `--json` writes every number.

Typical healthy result: `sync: 48/48 cues measured, max 2.9 ms, mean 0.1 ms ... 0 fail`, `beat: 120.0 BPM
(expected 120.0), grid phase +0.0 ms`. A whole-file offset shows on every cue (e.g. +12 ms everywhere) and in the
grid phase.

## 8. Slow-down variants (comprehension only)

Never ship a time-stretched mix (stretching smears transients, shifts the groove off the slowed picture, and
overshoots peaks; `rubberband --fine` plus a limiter is acceptable only as a five-minute preview). Re-synthesize:
- `arrange.py --scale X`: tempo becomes `bpm / X` (120 -> 80 at 1.5); event times, sustained notes, risers,
  whooshes, gaps and delay times scale with it, percussive envelopes do not; under 100 BPM 16th hats are added
  so the groove does not feel empty. Output `music-<cut>-x<X>.*`.
- `arrange.py --warp "0:0,8:8,52:30"` (output:scene seconds): the music keeps the reel's BPM and is re-arranged on
  the output timeline (more bars per section); bar lines are rebuilt between mapped scene and section
  boundaries, with a shorter bar where a sync point needs one (warns when a knee is off the beat grid); SFX land at
  the mapped cue time and second-valued durations scale with the local slope. Put knees on bar lines; slope 2 keeps
  whole bars. Output `music-<cut>-warp.*`.
- Verify the variant like any cut: the sidecar carries the map, so `verify_sync.py --wav music-30-warp.wav --cut
  cut-30.json` checks every cue at its mapped time and the BPM (80 for `--scale 1.5`, unchanged for a warp).

## 9. Library API (`audio/synth.py`, for other tools)

```python
sys.path.insert(0, "<skill>/audio"); import synth as S                 # SR = 48000, arrays are (2, n) float
y, stats = S.master(x, lufs=-14.0, tp=-1.0, margin=0.5, lowcut=0.0, fade_out=0.3)
S.write_wav(path, y, bits=24); x = S.read_audio(path)                  # any format in, via ffmpeg when needed
rep = S.encode_aac(wav, m4a, bitrate="192k", tp=-1.0)                  # post-encode true-peak loop
S.integrated_lufs(x), S.true_peak_db(x), S.loudness_range(x), S.measure(x)   # BS.1770-4 / EBU R128
layers = S.parse_sfx("impact:big+shimmer gain=-3")                      # [(name, params), ...]; raises ValueError
st, anchor, sfx_def, ctx = S.render_sfx(name, params, family="glassy", bpm=120, key_pc=5, mode="major", seed=1)
S.spectrogram_png(x, "out.png", marks=[...], bars=[...]); S.spectrogram_grid(items, "grid.png")
```

## 10. Pitfalls

- **AAC overshoots.** A WAV mastered to exactly -1 dBTP decodes above it; the master leaves 0.5 dB and
  `encode_aac` re-measures the decoded file and trims. AAC also pads the end by 16-36 ms: start alignment is
  exact, so mux with the video length (`-shortest` / `-t`).
- **Stale audio.** Re-planning a cut moves cues; re-run `arrange.py` for every cut after `plan_cut.py` (verify
  fails with "stale audio" otherwise).
- **Cue the arrival, not the start**, for risers, swells, rolls, doors and whooshes; a riser cued at its own start
  ends a bar late.
- **Do not double the arranger.** Risers, crashes, fills and the final hit are automatic at section changes; an
  authored riser or crash on the same boundary replaces them, but an authored riser one beat early does not.
- **Truncated tails** sound like clicks: a SFX or note must decay or fade before its buffer ends (check the
  audition grid: a hard vertical edge on a ringing partial).
- **Onset-only checks are weak in dense mixes**: drums sit on the same beat as most cues. Keep the sidecar next
  to the audio; it is what makes `verify_sync.py` precise.
- **Every motion does not need a sound.** Too many cues turn into noise and mask the music; leave idle holds to
  the groove.
- **No samples, no downloads.** Every sound is synthesized here; never paste audio from another project or the web
  into a reel.
