# Initial measurements

These are smoke measurements, not a completed production-performance study.

| Run | Complete pairs | Sequential median | Parallel median | Reduction | Interpretation |
| --- | ---: | ---: | ---: | ---: | --- |
| Simulated scheduler, 50 tasks | 50 | 211 ms | 60 ms | 71.6% | Fake, equal stage delays; scheduling only |
| Live provider pilot, 2 tasks | 1 | 5,143 ms | 3,399 ms | 33.9% | One complete pair; the other pair had a failed synthesis stage |

The live pilot used `openai/gpt-oss-120b`, one repetition, and six concurrent specialists followed by synthesis. Four runs were attempted; one had an unavailable stage. The incomplete pair was excluded from the latency comparison. No manual quality grading was performed, so these numbers do not establish a quality improvement. Neither run establishes a 60% real AI latency improvement across 50 problems.

Raw pilot rows and the simulated summary are retained under `results/`, including mode labels, source fingerprints, failure counts, and measurement times. The complete benchmark protocol is in README.md. The provider's token-per-minute quota and structured-response failures materially affected the initial pilots. Repeat the full live corpus with quality grading before using a percentage on a resume.

The deployed AWS app also passed a live Quick review and a live Deep review smoke check. Deep review completed all seven stages in 2,069 ms with no warnings on a small sum-of-integers task. This is a single functional smoke measurement, not a comparative benchmark or a general latency guarantee. Its trace is retained in `results/aws-smoke.json`.
