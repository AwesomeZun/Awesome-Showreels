# How a language model picks the next word: storyboard and build contract

Generated from the project files (reel.config.json, the cut plans, the scene headers and style.json); the scene
headers are the authority for the beat-by-beat choreography.

## 1. Brief

- **Material:** `source/notes.md` (notes); `model-src/toy.py` (data); `source/fonts/` (font)
- **Mood:** curious, lucid, calm, playful, exact
- **Purpose:** explainer
- **Not fiction:** an explainer of a real idea; its numbers come from a two-dimensional toy that the reel names as one.

## 2. Style summary (read-only; from `style.json`)

- Theme dark · bg `#0C1424` · ink `#ECF1F8` · accent `#F7D94C` · accent2 `#58C4DD` · accent3 `#5CD0B3`
- Display `"KaTeX_Main"` · body `"KaTeX_Main"`
- Motion: medium pace, `ioC`, transitions cut, match
- Sound: ambient · 96 BPM · D major · pad, strings, bell, glass, sub, kick, rim, shaker

## 3. Cuts

| Cut | Bars | Length |
|---|---|---|
| `short` | 6 | 15.0 s |
| `30` | 12 | 30.0 s |
| `60` | 24 | 60.0 s |

One bar = 2.500 s at 96 BPM; every scene starts on a bar line in every cut.

## 4. Scenes

### 4.1 `sentence`: The question

- Bars: short 1 · 30 s 1 · 60 s 2 (min 1, max 2) · in 4 beats, out 0 beats · entrance `cut` · music part `intro`
- Cues: sparkle dur=1.6 n=7 @ start+0b, tick n=5 gap=0.26 @ start+0.9b, blip step=4 @ start+2.0b, pop n=5 gap=0.14 @ start+2.3b, blips dur=1.3 density=0.5 @ holdStart+0.1b, sparkle dur=1.2 n=5 @ holdStart+1.4b

sentence (1 bar, 2 in the 60): the question and the sentence. On the navy page the question writes itself in (each glyph traces its outline, then fills), then "The cat sat on the" and a yellow slot with a caret blinking on the beat where the next word will go. Thin boxes draw around the tokens the text is cut into. In the 60 each token also shows its two numbers (its arrow in the toy), and a line says that real models use thousands.

### 4.2 `arrows`: Tokens become arrows

- Bars: short 1 · 30 s 2 · 60 s 2 (min 1, max 2) · in 3 beats, out 1 beats · entrance `cut` · music part `groove`
- Cues: swish @ start+0b, drawon dur=1.5 @ start+0.25b, pop n=4 gap=0.32 @ start+1.0b, pop n=4 gap=0.22 step=3 @ start+1.95b, bloop @ start+2.9b, sparkle dur=1.4 n=6 @ holdStart+0.3b, pop step=1 @ holdStart+1.4b, pop step=3 @ holdStart+2.3b, pop step=5 @ holdStart+3.2b, sparkle dur=0.75 n=3 @ outStart+0b

arrows (1 bar in the 15, 2 in the 30 and 60): tokens become arrows. The sentence rises to the top of the page as a coordinate plane draws itself from the middle out; each word of the sentence flies down to the tip of its arrow as the arrow grows from the origin (The and the land on the same arrow), then the rest of the vocabulary appears kind by kind: animals, actions, people, places, each in its colour. Soft halos gather each kind; in the longer cuts they are named and neighbours pulse together. Words used alike point alike.

### 4.3 `arith`: Directions carry meaning

- Bars: short - · 30 s 2 · 60 s 3 (min 2, max 3) · in 8 beats, out 0 beats · entrance `match` · music part `groove`
- Cues: swish @ start+0b, drawon dur=0.9 @ start+1.4b, whoosh dur=1.4 peak=0.5 @ start+3.3b, pop step=5 @ start+4.0b, chime @ start+4.7b, drawon dur=0.9 @ start+5.3b, sparkle dur=1.6 n=9 @ holdStart+0.1b, pulse @ holdStart+0.6b

arith (2 bars, 3 in the 60): directions carry meaning. The camera moves to the people; the step from man to woman draws as a yellow arrow, then slides, unchanged, to start at king's tip and lands next to queen. The formula above morphs as it happens: woman − man, then king − man + woman, then ≈ queen. A parallelogram closes. In the 60 copies of the same step fill the plane: one direction, one meaning, wherever it starts.

### 4.4 `layers`: A stack of layers

- Bars: short - · 30 s - · 60 s 4 (min 4, max 4) · in 16 beats, out 0 beats · entrance `match` · music part `breakdown`
- Cues: whoosh dur=2 peak=0.8 @ start+2.2b, zap dur=1 @ start+2.6b, pop step=1 @ start+3.6b, zap dur=1 @ start+4.8b, pop step=2 @ start+5.8b, zap dur=1 @ start+7.0b, pop step=3 @ start+8.0b, ding n=3 @ start+9.2b, sparkle dur=1.5 n=6 @ start+11.2b

layers (4 bars, the 60 only): a stack of layers. The plane tilts back into space and becomes the floor of a stack; the sentence's arrows rise through three more planes, each bending its grid (a small network) and moving every arrow a little (attention), the arrow of the turning toward where the places are as it climbs. Dotted lines trace each word up the stack; dots above it say a large model has dozens of layers.

### 4.5 `attend`: Attention pulls the arrow

- Bars: short - · 30 s 2 · 60 s 3 (min 2, max 3) · in 2.6 beats, out 5.4 beats · entrance `match` · music part `drop`
- Cues: swish @ start+0b, blip step=2 @ start+0.8b, drawon dur=1.2 @ start+1.2b, tick n=5 gap=0.16 @ start+1.5b, sparkle dur=1.0 n=5 @ holdStart+0.2b, tick n=3 gap=0.2 @ holdStart+1.1b, pop n=5 gap=0.42 step=2 @ outStart+0b, reveal @ outStart+2.4b, sparkle dur=1.2 n=5 @ outStart+3.5b

attend (2 bars, 3 in the 60): attention pulls the arrow. The sentence comes back along the top; its last word, the, looks back at every word so far: arcs drawn from it as thick as its attention weights (3%, 18%, 32%, 41%, 6%, computed from the toy's queries and keys). Each word's suggestion, its value arrow scaled by its weight, is added tip to tail from the tip of the's own arrow; the sum is the new arrow h, yellow, pointing toward the places. The formula h = x + Σ aⱼvⱼ writes alongside. In the 60 the weights' own formula comes first: aⱼ = softmax(q·kⱼ/√2).

### 4.6 `probs`: Scores and softmax

- Bars: short 2 · 30 s 2 · 60 s 3 (min 2, max 3) · in 4 beats, out 4 beats · entrance `match` · music part `drop`
- Cues: sparkle dur=0.9 n=5 @ start+0.5b, whoosh dur=1.5 peak=0.6 @ start+2.3b, drawon dur=1.05 @ start+2.95b, zoom @ start+4.0b, tick n=5 gap=0.3 @ holdStart+1.4b, blips dur=0.8 @ outStart+0.5b, swish dur=1 @ outStart+1.3b, tick n=6 gap=0.08 @ outStart+2.4b, chime @ outStart+3.0b

probs (2 bars, 3 in the 60): every word gets a score, then a probability. With the new arrow h in yellow the formula score(w) = h · w writes in. The whole plane turns until h points right, then squashes flat onto the line along h: every word's tip slides down to its projection (a dot product is a projection, times |h|). The line zooms in on the high end where the places land; each rises into a bar e^score tall, the formula morphs into softmax, and the bars settle into the chart: mat 55%, floor 23%, sofa 15%, bed 4.4%, roof 2.1%, the other ten words 0.5% together. In the 15, which has no attention scene, the arrow of the swings to h first; in the 60 the scores are read off the line.

### 4.7 `temp`: Temperature

- Bars: short - · 30 s - · 60 s 3 (min 3, max 3) · in 12 beats, out 0 beats · entrance `match` · music part `breakdown`
- Cues: sparkle dur=1.2 n=5 @ start+0.5b, drawon dur=1.0 @ start+1.4b, downlifter dur=2 @ start+2.6b, riser dur=2.6 gain=-6 @ start+8.0b, downlifter dur=1.6 @ start+9.0b, chime @ start+9.6b

temp (3 bars, the 60 only): temperature. The softmax formula gains a /T in both exponents (a morph), a thermometer for T rises beside the chart, and the chart follows it live: turned down to T = 0.4 the model nearly always says mat; turned up to T = 2.5 the rarer words rise and the other ten words together get a real share; then back to 1.

### 4.8 `sample`: Drawing the word

- Bars: short 1 · 30 s 2 · 60 s 2 (min 1, max 2) · in 4 beats, out 0 beats · entrance `match` · music part `drop`
- Cues: swish dur=1 @ start+0.2b, count dur=1.4 @ start+1.3b, ding @ start+2.7b, send @ start+3.55b, count dur=1.4 @ holdStart+0.3b, blip step=3 @ holdStart+1.7b, sparkle dur=1 n=4 @ holdStart+1.8b

sample (1 bar in the 15, 2 in the 30 and 60): drawing the word. The bars lie down end to end into one strip from 0 to 1, each word's slice as wide as its probability. A needle runs along the strip, slowing, and stops at u = 0.31, inside mat's slice; mat flies up into the sentence. In the longer cuts it runs again and stops at 0.62, in floor's slice: another time the same sentence could end on the floor.

### 4.9 `end`: The loop goes on

- Bars: short 1 · 30 s 1 · 60 s 2 (min 1, max 2) · in 1 beats, out 3 beats · entrance `match` · music part `outro`
- Cues: swish @ start+0b, pop n=2 gap=0.38 step=4 @ start+0.75b, pop n=6 gap=0.42 step=2 @ holdStart+0.2b, drawon dur=0.9 @ holdStart+2.9b, swell @ outStart+0.2b

end (1 bar, 2 in the 60): the loop goes on. The sentence comes down to the middle of the page and keeps going, a word at a time, each new word flashing yellow as it is drawn: "The cat sat on the mat and purred." Then the idea in three short lines (words are arrows, context bends them, the next word points the same way) and the note that this was a two-dimensional toy. In the 60 the whole loop is laid out first: tokens, arrows, attention, scores, softmax, a draw.

