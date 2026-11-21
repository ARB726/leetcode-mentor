import assert from "node:assert/strict";
import test from "node:test";
import { POST as review } from "../src/app/api/review/route";
import { POST as coach } from "../src/app/api/coach/route";
import { GET as practices } from "../src/app/api/practices/route";
import { rateLimit } from "../src/lib/server/http";

const reviewData = { summary: "Nested-loop lookup", correctness: "Valid", timeComplexity: "O(n²)", spaceComplexity: "O(1)", edgeCases: ["Duplicate values"], tradeoffs: "Time for simplicity", optimizedCode: "def solve(): pass", walkthrough: "Use a map", pattern: "Hash map", patternLesson: "Track complements", nextPractice: "Handle duplicate values" };
const input = { problem: "Find two numbers summing to target", solution: "def solve(nums): pass", language: "Python" };
function request(path: string, data: unknown) {
  return new Request("http://localhost/api/" + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
}
test("API validates input, sends server-side AI request, and rejects incomplete responses", async () => {
  const originalFetch = globalThis.fetch;
  const oldKey = process.env.GROQ_API_KEY;
  process.env.GROQ_API_KEY = "test-only";
  let calls = 0;
  globalThis.fetch = async (url, options) => {
    calls++;
    assert.equal(url, "https://api.groq.com/openai/v1/chat/completions");
    const body = JSON.parse(String(options?.body));
    assert.equal(body.response_format.json_schema.strict, true);
    assert.equal(JSON.parse(body.messages[1].content).solution, input.solution);
    return Response.json({ choices: [{ finish_reason: "stop", message: { content: JSON.stringify(reviewData) } }] });
  };
  try {
    assert.equal((await review(request("review", { ...input, solution: "" }))).status, 400);
    assert.equal(calls, 0);
    const response = await review(request("review", input));
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).review, reviewData);
    globalThis.fetch = async () => Response.json({ choices: [{ finish_reason: "length", message: { content: "{}" } }] });
    assert.equal((await review(request("review", input))).status, 502);
    assert.equal((await coach(request("coach", { ...input, review: reviewData, explanation: "", targetRole: "Backend engineer" }))).status, 502);
    assert.equal((await practices(new Request("http://localhost/api/practices"))).status, 503);
  } finally {
    globalThis.fetch = originalFetch;
    if (oldKey === undefined) delete process.env.GROQ_API_KEY; else process.env.GROQ_API_KEY = oldKey;
  }
});
test("rate limits expire and do not permit excess requests", () => {
  rateLimit("test-expiration", 1, 1000);
  assert.throws(() => rateLimit("test-expiration", 1, 1001), /practice limit/);
  assert.doesNotThrow(() => rateLimit("test-expiration", 1, 601001));
});
