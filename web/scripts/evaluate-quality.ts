import { readFileSync } from "node:fs";
import { summarizeQuality } from "../benchmarks/quality";

try {
  const path = process.argv[2];
  if (!path) throw new Error("Usage: npm run evaluate:quality -- path/to/grades.json");
  console.log(JSON.stringify(summarizeQuality(JSON.parse(readFileSync(path, "utf8"))), null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : "Evaluation failed");
  process.exitCode = 1;
}
