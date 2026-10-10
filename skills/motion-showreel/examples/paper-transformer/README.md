# Example: paper-transformer (Attention Is All You Need, an unofficial explainer)

A landmark paper goes in (Vaswani et al., 2017, *Attention Is All You Need*); an unofficial explainer comes out, typeset
the way the paper is. The title sets itself in STIX Two; one sentence becomes numbers, with the paper's position code
computed; the attention formula turns, term by term, into the real matrices of a small model; eight heads draw their
attention as arcs over the sentence, until only what *it* looks at is left (*ball*, which is why German needs *er*);
the encoder and decoder are drawn anew, and the paper's result closes it with the full citation. Not affiliated with
the authors. Nothing here picks a preset: palette, type, motion and music come from `source/` and are written to
`style.json` with the reasoning for every decision.

- Web version with every cut: [`dist/attention-explainer-v1.0.0.html`](dist/attention-explainer-v1.0.0.html) ([play in the browser](https://raw.githack.com/AwesomeZun/Awesome-Showreels/main/skills/motion-showreel/examples/paper-transformer/dist/attention-explainer-v1.0.0.html))
- Cuts: `short` (8 bars = 17.5 s), `30` (14 bars = 30.5 s), all at 110 BPM.

> An unofficial explainer of a published paper (Vaswani et al., 2017), not affiliated with or endorsed by its authors. The numbers on screen are quoted from the paper; the toy model, the example sentence and the drawings are ours.

## Folder

```
paper-transformer/
  source/                 5 file(s)
    fonts/OFL.txt
    fonts/STIXTwoMath-Regular.ttf
    fonts/STIXTwoText-Italic-Variable.ttf
    fonts/STIXTwoText-Variable.ttf
    notes.md
  assets/                 0 file(s)
  modules/                1 file(s)
    tx.js
  scenes/                 6 file(s)
    embed.js
    formula.js
    heads.js
    result.js
    stack.js
    title.js
  style.json
  reel.config.json
  STORYBOARD.md
  dist/
```

## Run it

```bash
S=skills/motion-showreel; P=$S/examples/paper-transformer
python3 $S/tools/extract_style.py --source $P/source --project $P --board      # draft style (review by hand)
python3 $S/timing/plan_cut.py --project $P --cut short,30
for c in short 30; do python3 $S/audio/arrange.py --project $P --cut $c; done
python3 $S/audio/verify_sync.py --wav $P/build/music-short.wav --cut $P/build/cut-short.json
node $S/runtime/render.mjs --project $P --cut short --out out/paper-transformer-short.mp4
node $S/runtime/build.mjs --project $P --cuts short,30 --out out/attention-explainer.html
```

## How it was made

1. **Quoted, then computed.** `source/notes.md` holds what is taken from the paper (the formula, the position code, the
   sizes, the WMT 2014 English-German result and the training cost, with the citation) apart from what is ours.
2. **A toy model the reel computes.** `modules/tx.js` gives each of ten words sixteen numbers (eight for its kind, eight
   for the paper's sinusoidal position code) and eight heads whose queries and keys are hand-set linear maps of them;
   attention is softmax(QKᵀ/√dₖ), evaluated when the reel loads. The one-word-back head works by shifting the position
   code, the property the paper points out; the nearness of nouns uses the slower wave, because the fastest wraps
   around every six words.
3. **Typeset in code.** A small formula typesetter (italics, superscripts, subscripts, the fraction, the radical) sets
   the equations in STIX Two and tells each scene where every symbol landed, so the matrices can grow out of them. No
   generated images; the architecture is a new drawing, not the paper's figure.

## What the tone pass decided

- **palette.** The paper as printed: cream paper (#F4EEE1) with fibres under a desk lamp, black ink, one vermilion accent (#C0392B), and a quiet ink per attention head (ultramarine, teal, ochre, vermilion, plum, olive, slate, sepia), so eight heads can share one page.

- **type.** STIX Two Text and STIX Two Math, the faces of scientific typesetting; formulas are set in code (italic variables, superscripts, the fraction and the radical), titles set letter by letter like type.

- **motion.** Typesetting and drafting: letters drop into place behind a caret, rules draw, each formula term grows its matrix along a fine leader, arcs draw from query to key with their weight as their stroke, the model's cards stack up; a slow camera push over the page. Ease outExpo and ioSine, no bounce.

- **sound.** Piano and strings at 110 BPM in A major (cinematic-lite, light drums): key taps while type is set, plucks as matrices appear, a chime when a result lands.

- **visuals.** Six pages: the title; words becoming sixteen numbers with the paper's position code (30 only); the attention formula turning into its matrices; eight heads drawing their attention over one sentence, then only what 'it' looks at, with the German that needs it; the encoder and decoder drawn anew (30 only); the result and the full citation. No generated images: everything is set and drawn in code.

## Same BPM, more bars

The 30-second cut is the same reel with longer holds (and optional scenes where they exist); the tempo never changes.

| Scene | short | 30 s |
|---|---|---|
| `title` | 1 | 2 |
| `embed` | - | 2 |
| `formula` | 2 | 3 |
| `heads` | 3 | 3 |
| `stack` | - | 2 |
| `result` | 2 | 2 |

## Scenes

**`title`**: title (1 bar, 2 in the 30): the paper, typeset. On cream paper under a desk lamp, AN UNOFFICIAL EXPLAINER in spaced vermilion capitals, then the title set letter by letter like type, a caret at the insertion point; the authors and the venue in italic, a rule drawing under them. In the 30 the idea follows in one line.

**`embed`**: embed (2 bars, the 30 only): sixteen numbers per word. The sentence sets in; under every word a column of sixteen cells fills, eight for what kind of word it is (one cell inked) and eight for where it stands: the paper's position code, computed (sines and cosines of the position at four frequencies). The code's first two waves are drawn through the positions so the pattern shows, and the formula sits beside them.

**`formula`**: formula (2 bars, 3 in the 30): every term becomes its matrix. The paper's attention formula is set large; then, for one head of the toy model (the one that looks one word back), each term grows its real matrix below it: Q, K transposed, the scaled scores, the softmax weights (each row sums to one) and V, with fine leaders from the symbols to the matrices. The weights show the head's habit as a band just under the diagonal, and a note says so.

**`heads`**: heads (3 bars): the sentence looks at itself. The ten words sit on a baseline and the toy model's eight heads draw their attention as arcs over them, one head a beat, each in its own ink (arc weight = attention weight): one word back, one word on, the same kind of word, pronoun to noun, verb to nouns, adjective to noun, the first word, everywhere. Then all eight together, and then only what "it" looks at: the vermilion head carries it to "ball", and the German line below shows why that matters: der Ball, so "it" becomes "er".

**`stack`**: stack (2 bars, the 30 only): the model, block by block. Drawn new for this reel, not the paper's figure: two towers of six layers stack up from the bottom as paper cards, the encoder (self-attention, feed-forward) on the left and the decoder (masked self-attention, attention to the encoder, feed-forward) on the right; fine lines carry the encoder's output into every decoder layer; the English goes in under the encoder and the German comes out of the decoder a word at a time. The paper's sizes sit in the margin.

**`result`**: result (2 bars; the end): what it did. A typeset result: WMT 2014 English to German, the best earlier system (an ensemble) at 26.36 BLEU and the big Transformer at 28.4, the bars drawing in and the difference marked; the cost (3.5 days on 8 P100 GPUs). Then the citation in full and the note: an unofficial explainer, not affiliated with the authors; the toy model and the drawings are ours.

## Provenance and credits

- The paper: Vaswani, A., Shazeer, N., Parmar, N., Uszkoreit, J., Jones, L., Gomez, A. N., Kaiser, Ł. & Polosukhin, I. *Attention Is All You Need.* NeurIPS 2017. arXiv:1706.03762. None of its figures is reproduced; the architecture is drawn anew.
- `source/notes.md` separates what is quoted from the paper from what is ours.
- Music and sound effects are synthesized by `audio/` (no samples).
- Fonts ship with their licences: `source/fonts/OFL.txt`.
