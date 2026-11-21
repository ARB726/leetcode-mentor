import assert from "node:assert/strict";
import test from "node:test";
import { claimPipeline, runPipeline, specialists, type AgentRunner } from "../src/lib/server/pipeline";
import { ApiError } from "../src/lib/server/http";
import { agentCatalog, type AgentId } from "../src/lib/pipeline";

const input = { problem: "Return indices of two values summing to target.", solution: "def solve(nums): return [0, 1]", language: "Python" as const };
export const review = { summary: "Constant indices", correctness: "Incorrect for arbitrary arrays", timeComplexity: "O(1)", spaceComplexity: "O(1)", edgeCases: ["A pair at indices 1 and 2"], tradeoffs: "Use a map", optimizedCode: "def solve(nums): pass", walkthrough: "Always returns [0, 1]", pattern: "Hash map", patternLesson: "Track complements", nextPractice: "Find all pairs" };
const findings: Record<string, unknown> = Object.fromEntries(specialists.map(spec => [spec.id, Object.fromEntries(Object.keys(spec.schema.shape).map(key => [key, review[key as keyof typeof review]]))]));
const metadata = { durationMs: 1, inputTokens: 10, outputTokens: 5, model: "test-model" };

test("six specialists overlap, concurrency is bounded, synthesis waits for all findings", async () => {
  let active = 0, peak = 0;
  const finished = new Set<string>();
  const runner: AgentRunner = async (id, _schema, _prompt, payload) => {
    if (id === "synthesis") {
      assert.equal(finished.size, 6);
      assert.equal(Object.keys((payload as { findings: object }).findings).length, 6);
      return { ...metadata, value: review };
    }
    peak = Math.max(peak, ++active);
    await new Promise(resolve => setTimeout(resolve, 5));
    active--; finished.add(id);
    return { ...metadata, value: findings[id] };
  };
  const result = await runPipeline(input, { concurrency: 3, runner });
  assert.equal(peak, 3);
  assert.equal(result.report.traces.filter(trace => trace.state === "completed").length, 7);
  assert.deepEqual(result.review, review);
  assert.equal(result.report.inputTokens, 70);
});

test("sequential baseline runs the same seven stages and preserves output", async () => {
  const order: string[] = [];
  const result = await runPipeline(input, { execution: "sequential", runner: async id => {
    order.push(id); return { ...metadata, value: id === "synthesis" ? review : findings[id] };
  } });
  assert.deepEqual(order, agentCatalog.map(agent => agent.id));
  assert.deepEqual(result.review, review);
});

test("specialist and synthesis failures retain useful partial work without inventing results", async () => {
  const result = await runPipeline(input, { runner: async id => {
    if (id === "complexity" || id === "synthesis") throw new ApiError(502, "Provider unavailable");
    return { ...metadata, value: findings[id] };
  } });
  assert.match(result.review.timeComplexity, /unavailable/);
  assert.equal(result.review.correctness, review.correctness);
  assert.equal(result.report.warnings.length, 2);
});

test("total failure is an error; cancelled requests do not start a provider call", async () => {
  await assert.rejects(runPipeline(input, { runner: async () => { throw new Error("offline"); } }), /All specialists/);
  const controller = new AbortController(); controller.abort();
  let calls = 0;
  await assert.rejects(runPipeline(input, { signal: controller.signal, runner: async () => { calls++; return { ...metadata, value: review }; } }));
  assert.equal(calls, 0);
});

test("admission control caps expensive deep reviews and releases slots exactly once", () => {
  const first = claimPipeline(), second = claimPipeline();
  assert.throws(claimPipeline, /busy/);
  first(); first();
  const third = claimPipeline();
  assert.throws(claimPipeline, /busy/);
  second(); third();
});
