# Attention Is All You Need — notes for an unofficial explainer

*An unofficial explainer of a published paper, made for this example. It is not affiliated with or endorsed by the
authors. Every number below is quoted from the paper; the toy model in the reel is ours.*

**The paper.** Ashish Vaswani, Noam Shazeer, Niki Parmar, Jakob Uszkoreit, Llion Jones, Aidan N. Gomez, Łukasz Kaiser
and Illia Polosukhin. *Attention Is All You Need.* Advances in Neural Information Processing Systems 30 (NeurIPS 2017).
arXiv:1706.03762.

## The idea in one line
A sequence model with no recurrence and no convolution: every word looks at every other word through attention, in
parallel.

## The pieces (from the paper)
- **Scaled dot-product attention.** Attention(Q, K, V) = softmax(QKᵀ / √dₖ) V.
- **Multi-head attention.** h = 8 heads in parallel, each with its own projections; dₖ = dᵥ = d_model / h = 64.
- **Positional encoding.** PE(pos, 2i) = sin(pos / 10000^(2i/d_model)), PE(pos, 2i+1) = cos(pos / 10000^(2i/d_model)).
  For any fixed offset k, PE(pos + k) is a linear function of PE(pos), which is why a head can learn to look one word
  back.
- **The stack.** An encoder and a decoder, each N = 6 identical layers; d_model = 512, feed-forward inner size 2048;
  residual connections and layer normalisation around every sub-layer; the decoder's self-attention is masked so a
  position cannot see the future, and each decoder layer also attends to the encoder's output.

## Results (from the paper)
- WMT 2014 English → German: **28.4 BLEU** (Transformer, big), more than 2.0 BLEU above the best earlier results,
  ensembles included (the best of those, a convolutional ensemble, scored 26.36).
- Training the big model took **3.5 days on 8 NVIDIA P100 GPUs**.

## Our toy model (not from the paper)
One sentence, ten words: *The robot picked up the ball because it was light.* Each word is a 16-number vector: eight
for its kind of word, eight for its position (the paper's sinusoids). Eight heads with hand-set projections, each
computing softmax(QKᵀ / √dₖ) for real: one looks one word back (by shifting the position code), one forward, one at
words of the same kind, one from a pronoun to the nearest noun before it (*it* → *ball*), one from a verb to nouns,
one from an adjective to nouns (*light* → *ball*), one at the first word, one everywhere. In German *it* must become
*er*, because it refers to *der Ball*: *Der Roboter hob den Ball auf, weil er leicht war.*

## Style
Typeset like the paper: STIX Two on cream paper, black ink, one vermilion accent, and a quiet ink colour per head.
The architecture is drawn anew for this reel (not the paper's figure).
