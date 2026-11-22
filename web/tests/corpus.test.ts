import assert from "node:assert/strict";
import test from "node:test";
import { corpus } from "../benchmarks/corpus";
import { submissionSchema } from "../src/lib/server/ai";
test("benchmark contains 50 distinct valid tasks and explicitly labelled defects", () => {
  assert.equal(corpus.length, 50);
  assert.equal(new Set(corpus.map(item => item.id)).size, 50);
  assert.equal(new Set(corpus.map(item => item.problem)).size, 50);
  assert.ok(corpus.filter(item => item.issueTerms.length).length >= 5);
  for (const item of corpus) assert.ok(submissionSchema.safeParse(item).success, item.id);
});
