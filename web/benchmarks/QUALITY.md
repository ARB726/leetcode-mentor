# Human review quality evaluation

Run `npm run evaluate:quality -- path/to/grades.json` from `web/`. This command makes no model calls. It validates reviewer-supplied grades and reports coverage and each dimension separately; it does not manufacture grades or mark an incomplete set as complete.

Use retained **live-provider** outputs with the same model, prompt/source fingerprint and declared case set. Keep full output artifacts privately if they contain user code. The existing latency benchmark does not retain review text; capture the actual review before grading (for example, download its Markdown report from the app). Do not reconstruct outputs from timing rows or grade synthetic responses. The fingerprint must be the 64-character SHA-256 of the evaluated source/prompt configuration; archive that configuration with the outputs.

Before viewing outputs, freeze the case list and grade both valid and deliberately flawed solutions. Randomize sequential/parallel labels for reviewers. Include failures in the declared set and disclose missing outputs as incomplete coverage. For a model/prompt comparison, use the same cases and independent reports for each configuration. A second reviewer should resolve disagreements; this tool records a single adjudicated grade per case, not inter-rater agreement.

| Dimension | 0 | 1 | 2 |
| --- | --- | --- | --- |
| Correctness | Misses the central defect or invents one | Mixed or incomplete diagnosis | Accurate diagnosis supported by a counterexample or invariant |
| Complexity | Incorrect bounds | Correct bound with weak reasoning or missing qualification | Correct submitted-code bounds and assumptions |
| Edge cases | Missing or irrelevant | Some useful cases, misses a central boundary | Relevant boundary cases with expected outcomes |
| Actionability | Misleading or unusable fix | Useful but incomplete guidance | Concrete, justified repair or explanation that no repair is needed |

Flag `unsupportedExecutionClaim` whenever the review claims to have run code or tests. Nothing in the current pipeline executes submissions. Write a rationale that cites specific review content; the tool checks presence, not the truth of the reviewer's judgment.

Start with this empty template, then add one grade per retained output:

```json
{
  "runId": "replace-with-evaluation-id",
  "source": "live-provider",
  "model": "replace-with-actual-model",
  "sourceFingerprint": "replace-with-64-character-sha256",
  "expectedCases": 50,
  "grades": []
}
```

Each grade needs `caseId`, `outputArtifact`, `reviewer`, integer scores (0–2) for `correctness`, `complexity`, `edgeCases`, and `actionability`, a boolean `unsupportedExecutionClaim`, and a `rationale` of at least 20 characters. Artifact paths are citations supplied by the reviewer; the CLI does not dereference or verify them. No completed quality study is claimed by shipping this evaluator.
