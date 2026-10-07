# spark-bench

Reproducible benchmarks for sparse attention kernels.

> **Fictional example project.** spark-bench is the source material of the `research-cli` example of the
> motion-showreel skill. Its CLI replays one recorded demo run; every benchmark number below is **demo data**, not a
> measurement. It is not related to Apache Spark or to any other project with a similar name.

## Abstract

Most of a long attention matrix is empty. Sparse patterns that keep a local window plus a few global tokens [1, 2]
skip most of it, and block-sparse kernels turn that into speed. Their reported speedups are hard to compare: runs
differ in hardware, clocks, warm-up and the number of repeats. spark-bench fixes those variables. It runs three
kernels (dense, block-sparse, spark) at four sequence lengths, five seeded repeats each, and reports throughput
relative to dense, p50 latency and the spread between repeats. In the demo run, the spark kernel reaches 4.1× the
dense throughput at 64k tokens with a run-to-run spread of 1.8%. The gain grows with length: 1.3× at 4k tokens.

## Install

    pip install -e .

Python 3.9 or newer, standard library only. The demo replay needs no GPU. Without installing:
`./bin/spark-bench run`.

## Usage

    spark-bench run

One command, one table. The defaults are `--suite attn --seq 4k,16k,32k,64k --repeats 5`; `--json PATH` also
writes the results as JSON.

## Results (demo data)

Throughput relative to dense on the same machine, median of 5 seeded repeats.

| kernel       |   4k |  16k |  32k |  64k | p50 at 64k | spread at 64k |
|--------------|-----:|-----:|-----:|-----:|-----------:|--------------:|
| dense        | 1.0× | 1.0× | 1.0× | 1.0× |    47.6 ms |          1.2% |
| block-sparse | 1.2× | 1.9× | 2.6× | 3.2× |    14.9 ms |          1.6% |
| **spark**    | **1.3×** | **2.4×** | **3.3×** | **4.1×** | **11.6 ms** | **1.8%** |

Spread is (max − min) / median over the 5 repeats. Every value is computed from `results/demo-run.json`.

## How it works

1. **Fingerprint.** Record the GPU, driver and clocks; refuse to compare runs with different fingerprints.
2. **Pin.** Fix the seed (1234) and the clocks; warm up 3 times.
3. **Repeat.** Run every kernel at every length 5 times; report the median and the spread.
4. **Report.** Print one table; write `results/<run>.json` with every repeat.

The spark pattern keeps a band of 7 blocks around the diagonal plus 2 global blocks. With 1,024-token blocks at 64k
tokens that is 674 of 4,096 blocks (16.5%); the other 3,422 are never computed (Figure 1 in `docs/index.html`).

## Cite

```bibtex
@misc{sparkbench2026,
  title = {spark-bench: reproducible benchmarks for sparse attention kernels},
  note  = {Fictional example project; demo data},
  year  = {2026}
}
```

## References

[1] R. Child, S. Gray, A. Radford, I. Sutskever. Generating Long Sequences with Sparse Transformers.
arXiv:1904.10509, 2019.

[2] I. Beltagy, M. E. Peters, A. Cohan. Longformer: The Long-Document Transformer. arXiv:2004.05150, 2020.

## License

MIT (fictional example). Fonts in `docs/fonts/`: Space Grotesk and JetBrains Mono, SIL Open Font License 1.1.
