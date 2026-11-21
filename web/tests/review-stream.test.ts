import assert from "node:assert/strict";
import test from "node:test";
import { readReviewStream } from "../src/lib/review-stream";

test("stream reader handles split UTF-8 characters, multiple events, and a final unterminated line", async () => {
  const bytes = new TextEncoder().encode(JSON.stringify({ type: "agent", agent: { id: "teacher", state: "running", model: "modèle" } }) + "\n" + JSON.stringify({ type: "result", review: {}, report: {} }));
  let offset = 0;
  const stream = new ReadableStream({ pull(controller) { if (offset >= bytes.length) { controller.close(); return; } controller.enqueue(bytes.slice(offset, offset += 3)); } });
  const events: unknown[] = [];
  await readReviewStream(new Response(stream), event => events.push(event));
  assert.equal(events.length, 2);
  assert.equal((events[0] as { agent: { model: string } }).agent.model, "modèle");
});
test("stream reader rejects partial completion and provider errors", async () => {
  await assert.rejects(readReviewStream(new Response('{"type":"agent","agent":{"id":"teacher","state":"running"}}\n'), () => {}), /before completion/);
  await assert.rejects(readReviewStream(new Response('{"type":"error","error":"Provider unavailable"}\n'), () => {}), /Provider unavailable/);
});
