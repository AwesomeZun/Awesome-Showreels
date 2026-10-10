# How a language model picks the next word — notes for a short explainer

*An explainer made for this example. The pictures are a two-dimensional toy: real models use thousands of dimensions
and learn their arrows from data; ours are placed by hand so the ideas can be seen.*

## The idea in one line
Words are arrows in a space. Context bends the arrows. The next word is the one whose arrow points the same way.

## The steps
1. **Text becomes tokens.** "The cat sat on the" is cut into pieces the model has a number for.
2. **Tokens become arrows (embeddings).** Each token is a vector; words used alike point alike: animals near animals,
   places near places, verbs near verbs.
3. **Directions carry meaning.** The step from *man* to *woman* is about the same as the step from *king* to *queen*,
   so king − man + woman lands near queen.
4. **Attention mixes the arrows.** The last word's arrow is replaced by a weighted sum of the arrows before it,
   h = Σⱼ aⱼ vⱼ, with the weights from how well they match. "the" after "sat on" turns toward places.
5. **Layers repeat it.** Each layer moves every arrow again (a transformation of the whole space plus a small network);
   a real model stacks dozens of them.
6. **Scores become probabilities.** Each word in the vocabulary gets a score, the dot product h · w with its arrow,
   and softmax turns the scores into probabilities: p(w) = e^{h·w} / Σ e^{h·w′}.
7. **Temperature.** Dividing the scores by T before softmax sharpens (T < 1) or flattens (T > 1) the choice.
8. **Sampling.** One word is drawn by its probability, appended, and the whole loop runs again for the next word.

## Toy numbers used on screen (ours)
Arrows (x, y): king (3.2, 1.8), man (1.0, 1.6), woman (1.0, −1.6), queen (3.2, −1.4); cat (−2.6, 1.6),
dog (−3.1, 0.7); sat (0.9, 3.0), ran (1.7, 3.2); the (−0.5, 0.5), on (0.6, −0.4); mat (−0.9, −2.6),
floor (−1.9, −2.7), sofa (0.3, −3.1), bed (−0.4, −3.4), roof (−2.8, −3.3).

## Style
A dark navy page, smooth mathematical animation: arrows, a grid that bends under a transformation, formulas that
morph, one colour per kind of meaning. No characters and no names of any channel.
