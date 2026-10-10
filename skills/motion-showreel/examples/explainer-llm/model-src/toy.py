"""The reel's toy language model, in two dimensions (see source/notes.md). Deterministic, no training: the arrows are
placed by hand so the ideas can be seen, and everything else is computed from them.

- Vocabulary: fifteen words, each an arrow (x, y) and a kind (small word, animal, action, person, place).
- Attention for the last word of "The cat sat on the": its query q against each word's key k gives the weights
  a = softmax(q . k / sqrt(2)); each word's value v is the change it suggests, and the new arrow is
  h = x_the + sum_j a_j v_j (the residual sum the reel draws tip to tail).
- Next word: the score of every word is h . w (its arrow), and p = softmax(score / T).
- Sampling: u = 0.31 falls in the first slice of the cumulative strip (mat); u = 0.62 is the reel's "another time".
Writes assets/data/toy.json and prints the numbers the reel shows."""
import json, math, pathlib
ROOT = pathlib.Path(__file__).resolve().parents[1]

def polar(r, deg): return [round(r * math.cos(math.radians(deg)), 3), round(r * math.sin(math.radians(deg)), 3)]
VOCAB = {
    # small words
    'the': ([0.55, -0.35], 'small'), 'on': ([0.25, -1.0], 'small'),
    # animals
    'cat': ([-2.45, 1.75], 'animal'), 'dog': ([-3.0, 0.95], 'animal'),
    # actions
    'sat': ([0.45, 2.9], 'action'), 'ran': ([-0.35, 3.05], 'action'),
    # people: the step man -> woman is the step king -> queen (nearly)
    'man': ([2.0, 1.3], 'person'), 'woman': ([2.0, -1.1], 'person'), 'king': ([3.6, 1.6], 'person'), 'queen': ([3.45, -0.95], 'person'),
    # places a cat sits on, fanned around 250 degrees
    'mat': (polar(3.4, 250), 'place'), 'floor': (polar(3.3, 225), 'place'), 'sofa': (polar(2.95, 270), 'place'),
    'bed': (polar(2.75, 288), 'place'), 'roof': (polar(2.6, 205), 'place'),
}
SENT = ['The', 'cat', 'sat', 'on', 'the']
WORD = lambda tok: tok.lower()
# attention of the last word: query and keys (hand-set), values (the change each word suggests)
Q = [1.0, 0.0]
K = {'The': [-1.6, 0.4], 'cat': [0.95, -0.2], 'sat': [1.75, 0.1], 'on': [2.1, 0.3], 'the': [-0.6, 0.2]}
V = {'The': [0.12, -0.05], 'cat': [-1.3, -0.35], 'sat': [-0.55, -2.45], 'on': [-2.05, -1.85], 'the': [0.08, -0.1]}

dot = lambda a, b: a[0] * b[0] + a[1] * b[1]
def softmax(xs):
    m = max(xs); e = [math.exp(x - m) for x in xs]; s = sum(e); return [x / s for x in e]
logits = [dot(Q, K[t]) / math.sqrt(2) for t in SENT]
A = softmax(logits)
x_the = VOCAB['the'][0]
h = [x_the[0] + sum(a * V[t][0] for a, t in zip(A, SENT)), x_the[1] + sum(a * V[t][1] for a, t in zip(A, SENT))]
words = list(VOCAB)
scores = {w: dot(h, VOCAB[w][0]) for w in words}
def probs(T): p = softmax([scores[w] / T for w in words]); return dict(zip(words, p))
P = probs(1.0)
rank = sorted(words, key=lambda w: -P[w])
hd = math.degrees(math.atan2(h[1], h[0])) % 360
print('attention', {t: round(a, 3) for t, a in zip(SENT, A)})
print('h', [round(v, 3) for v in h], '|h| %.3f' % math.hypot(*h), 'angle %.1f' % hd)
print('scores', {w: round(scores[w], 2) for w in rank})
print('proj', {w: round(scores[w] / math.hypot(*h), 2) for w in rank})
for T in (0.5, 1.0, 2.0):
    p = probs(T); print('T', T, {w: round(p[w] * 100, 1) for w in sorted(words, key=lambda w: -p[w])[:7]})
k, m, wq = VOCAB['king'][0], VOCAB['man'][0], VOCAB['woman'][0]
kmw = [k[0] - m[0] + wq[0], k[1] - m[1] + wq[1]]
near = sorted(words, key=lambda w: math.dist(kmw, VOCAB[w][0]))
print('king-man+woman', kmw, 'nearest', near[:3], 'dist %.2f' % math.dist(kmw, VOCAB['queen'][0]))
cum, acc = [], 0.0
for w in rank: cum.append([w, round(acc, 4), round(acc + P[w], 4)]); acc += P[w]
pick = lambda u: next(w for w, a, b in cum if a <= u < b)
print('u=0.31 ->', pick(0.31), ' u=0.62 ->', pick(0.62))
out = {'note': 'a two-dimensional toy (model-src/toy.py): arrows placed by hand, everything else computed',
       'vocab': {w: {'xy': VOCAB[w][0], 'kind': VOCAB[w][1]} for w in words}, 'sentence': SENT,
       'query': Q, 'keys': K, 'values': V, 'attention': [round(a, 4) for a in A], 'h': [round(v, 4) for v in h],
       'scores': {w: round(scores[w], 4) for w in words}, 'rank': rank, 'p': {w: round(P[w], 4) for w in words},
       'kmw': kmw, 'samples': [[0.31, pick(0.31)], [0.62, pick(0.62)]]}
(ROOT / 'assets/data').mkdir(parents=True, exist_ok=True)
(ROOT / 'assets/data/toy.json').write_text(json.dumps(out, separators=(',', ':')))
