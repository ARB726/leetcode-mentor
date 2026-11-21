# Seven-stage review benchmark

The corpus contains 50 original Python tasks spanning maps, two pointers, sliding windows, stacks, binary search, prefix sums, dynamic programming, greedy algorithms, graphs, and subsets. Six tasks include intentionally flawed code and advisory keyword labels. These are small algorithm exercises, not a representative sample of all production software.

From `web/`, run the scheduler-only check:

```text
node --import tsx scripts/benchmark.ts --limit=50
```

It uses deterministic fake stage delays, makes no provider calls, and labels every result `simulated-scheduler`. A reduction from this run is evidence of concurrent scheduling only. It must not be described as an AI latency improvement or a reduction in human analysis time.

For actual provider measurements, put the key in the ignored root `.env` or web `.env.local`, then run:

```text
node --import tsx scripts/benchmark.ts --live --limit=50 --repetitions=3 --output=../.venv/benchmarks/live-50x3.json
```

This makes up to 2,100 model calls before retries and consumes provider tokens. Start with `--limit=1` to confirm credentials and limits. The default 65-second pause between runs avoids continuously exhausting a small token-per-minute quota; the full benchmark can take hours. Override `--pause-ms=...` only to match your account's actual limits. Results checkpoint after every run. To resume, use the same output file, model, corpus, flags, and prompt version. Use a fresh output file after changing any of them. Never mix simulated and provider results.

Both execution modes use the same six specialists, synthesis prompt, and model. Sequential mode runs one specialist at a time; parallel mode runs six simultaneously, then synthesizes. The runner alternates execution order. It records elapsed wall time, model usage from successful calls, unavailable stages, and errors. Failed or partial pairs are excluded from the latency summary and their counts remain visible. Those exclusions can bias results, so inspect all raw rows.

The summary computes `100 * (1 - median(parallel) / median(sequential))` over complete pairs. It marks the 60% target met only for actual provider results with at least 50 complete pairs. This measures an orchestration improvement against the seven-stage sequential workflow. It does not compare against the single-call Quick mode or human reviewers.

Manually grade correctness, optimization validity, complexity accuracy, and useful counterexamples before making a quality claim. The defect keyword check is an advisory signal that an issue was mentioned, not proof it was identified correctly. Neither the benchmark nor the application executes submitted code. Do not publish a speedup percentage without stating the baseline, model, corpus, repetitions, failures, and quality caveats.
