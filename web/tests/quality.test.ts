import assert from "node:assert/strict";
import test from "node:test";
import { summarizeQuality } from "../benchmarks/quality";

const run = { runId: "test-fixture", source: "live-provider", model: "test-only", sourceFingerprint: "a".repeat(64), expectedCases: 2, grades: [] as unknown[] };
const grade = { caseId: "case-1", outputArtifact: "local/retained-output.json", reviewer: "fixture", correctness: 2, complexity: 1, edgeCases: 0, actionability: 2, unsupportedExecutionClaim: true, rationale: "Fixture deliberately includes an unsupported execution claim." };
test("quality report discloses missing coverage and never treats empty grades as success", () => {
  const empty = summarizeQuality(run);
  assert.equal(empty.complete, false); assert.equal(empty.coveragePercent, 0);
  assert.equal(empty.meanScoresOutOf2.correctness, null);
  const partial = summarizeQuality({ ...run, grades: [grade] });
  assert.equal(partial.coveragePercent, 50); assert.equal(partial.complete, false);
  assert.equal(partial.meanScoresOutOf2.complexity, 1); assert.equal(partial.unsupportedExecutionClaims, 1);
});
test("quality report rejects synthetic data, duplicate cases and invalid grades", () => {
  for (const invalid of [
    { ...run, source: "simulated-scheduler" },
    { ...run, grades: [grade, grade] },
    { ...run, expectedCases: 1, grades: [grade, { ...grade, caseId: "case-2" }] },
    { ...run, grades: [{ ...grade, correctness: 3 }] },
    { ...run, grades: [{ ...grade, rationale: "" }] },
  ]) assert.throws(() => summarizeQuality(invalid));
});
