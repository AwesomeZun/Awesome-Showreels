# Attention Is All You Need, an unofficial explainer: storyboard and build contract

Generated from the project files (reel.config.json, the cut plans, the scene headers and style.json); the scene
headers are the authority for the beat-by-beat choreography.

## 1. Brief

- **Material:** `source/notes.md` (notes); `source/fonts/` (font)
- **Mood:** elegant, exact, calm, curious, scholarly
- **Purpose:** explainer
- **Not fiction:** an unofficial explainer of a published paper; its numbers are quoted with the citation, the toy model is ours.

## 2. Style summary (read-only; from `style.json`)

- Theme light · bg `#F4EEE1` · ink `#1C1B19` · accent `#C0392B` · accent2 `#2C4A9A` · accent3 `#B7791F`
- Display `"STIX Two Text"` · body `"STIX Two Text"`
- Motion: medium pace, `outExpo`, transitions cut
- Sound: cinematic-lite · 110 BPM · A major · piano, strings, bell, sub, kick, rim, shaker

## 3. Cuts

| Cut | Bars | Length |
|---|---|---|
| `short` | 8 | 17.5 s |
| `30` | 14 | 30.5 s |

One bar = 2.182 s at 110 BPM; every scene starts on a bar line in every cut.

## 4. Scenes

### 4.1 `title`: The paper

- Bars: short 1 · 30 s 2 (min 1, max 2) · in 3 beats, out 0 beats · entrance `cut` · music part `intro`
- Cues: swell @ start+0b, keytap dur=1.4 @ start+0.2b, drawon dur=0.8 @ start+1.5b

title (1 bar, 2 in the 30): the paper, typeset. On cream paper under a desk lamp, AN UNOFFICIAL EXPLAINER in spaced vermilion capitals, then the title set letter by letter like type, a caret at the insertion point; the authors and the venue in italic, a rule drawing under them. In the 30 the idea follows in one line.

### 4.2 `embed`: Words become numbers

- Bars: short - · 30 s 2 (min 2, max 2) · in 6 beats, out 0 beats · entrance `cut` · music part `groove`
- Cues: blips dur=1.2 @ start+0.8b, blips dur=1.2 @ start+2b, drawon dur=1.6 @ start+3.4b, keytap dur=1.2 @ start+4.6b

embed (2 bars, the 30 only): sixteen numbers per word. The sentence sets in; under every word a column of sixteen cells fills, eight for what kind of word it is (one cell inked) and eight for where it stands: the paper's position code, computed (sines and cosines of the position at four frequencies). The code's first two waves are drawn through the positions so the pattern shows, and the formula sits beside them.

### 4.3 `formula`: Every term a matrix

- Bars: short 2 · 30 s 3 (min 2, max 3) · in 6 beats, out 0 beats · entrance `cut` · music part `groove`
- Cues: keytap dur=1.2 @ start+0b, pop step=1 @ start+1.4b, pop step=2 @ start+1.8b, pop step=3 @ start+2.4b, pop step=4 @ start+3.2b, pop step=5 @ start+3.8b, chime @ start+4.6b

formula (2 bars, 3 in the 30): every term becomes its matrix. The paper's attention formula is set large; then, for one head of the toy model (the one that looks one word back), each term grows its real matrix below it: Q, K transposed, the scaled scores, the softmax weights (each row sums to one) and V, with fine leaders from the symbols to the matrices. The weights show the head's habit as a band just under the diagonal, and a note says so.

### 4.4 `heads`: Eight heads

- Bars: short 3 · 30 s 3 (min 3, max 3) · in 10 beats, out 0 beats · entrance `cut` · music part `drop`
- Cues: drawon dur=8 @ start+0.4b, reveal @ start+9b, keytap dur=1.4 @ start+9.6b

heads (3 bars): the sentence looks at itself. The ten words sit on a baseline and the toy model's eight heads draw their attention as arcs over them, one head a beat, each in its own ink (arc weight = attention weight): one word back, one word on, the same kind of word, pronoun to noun, verb to nouns, adjective to noun, the first word, everywhere. Then all eight together, and then only what "it" looks at: the vermilion head carries it to "ball", and the German line below shows why that matters: der Ball, so "it" becomes "er".

### 4.5 `stack`: Encoder and decoder

- Bars: short - · 30 s 2 (min 2, max 2) · in 6 beats, out 0 beats · entrance `cut` · music part `breakdown`
- Cues: pop:6 gap=0.32 @ start+0.3b, zap dur=0.8 @ start+2.6b, keytap dur=3.2 @ start+3.4b

stack (2 bars, the 30 only): the model, block by block. Drawn new for this reel, not the paper's figure: two towers of six layers stack up from the bottom as paper cards, the encoder (self-attention, feed-forward) on the left and the decoder (masked self-attention, attention to the encoder, feed-forward) on the right; fine lines carry the encoder's output into every decoder layer; the English goes in under the encoder and the German comes out of the decoder a word at a time. The paper's sizes sit in the margin.

### 4.6 `result`: The result

- Bars: short 2 · 30 s 2 (min 2, max 2) · in 5 beats, out 0 beats · entrance `cut` · music part `outro`
- Cues: drawon dur=0.9 @ start+0.5b, ding @ start+1.8b, chime @ start+3.6b

result (2 bars; the end): what it did. A typeset result: WMT 2014 English to German, the best earlier system (an ensemble) at 26.36 BLEU and the big Transformer at 28.4, the bars drawing in and the difference marked; the cost (3.5 days on 8 P100 GPUs). Then the citation in full and the note: an unofficial explainer, not affiliated with the authors; the toy model and the drawings are ours.

