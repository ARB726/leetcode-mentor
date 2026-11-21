import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createHash } from "node:crypto";
import { corpus } from "../benchmarks/corpus";
import { runPipeline, specialists, type AgentRunner } from "../src/lib/server/pipeline";
import type { Review } from "../src/lib/types";

async function main() {
const flags = process.argv.slice(2);
const live = flags.includes("--live");
const value = (name: string, fallback: string) => flags.find(flag => flag.startsWith(`--${name}=`))?.split("=").slice(1).join("=") || fallback;
const limit = Number(value("limit", "50"));
const repetitions = Number(value("repetitions", "1"));
if (!Number.isInteger(limit) || limit < 1 || limit > corpus.length || !Number.isInteger(repetitions) || repetitions < 1 || repetitions > 10) throw new Error("Choose limit 1-50 and repetitions 1-10.");
for (const path of ["../.env", ".env.local"]) if (existsSync(path)) process.loadEnvFile(path);
if (live && !process.env.GROQ_API_KEY) throw new Error("Live benchmark requires GROQ_API_KEY. No provider calls were made.");
const output = resolve(value("output", live ? "../.venv/benchmarks/live.json" : "../.venv/benchmarks/simulated.json"));
mkdirSync(dirname(output), { recursive: true });
const baselineReview: Review = { summary: "Simulated response", correctness: "Not evaluated", timeComplexity: "Not evaluated", spaceComplexity: "Not evaluated", edgeCases: [], tradeoffs: "Not evaluated", optimizedCode: "", walkthrough: "Not evaluated", pattern: "Not evaluated", patternLesson: "Not evaluated", nextPractice: "Not evaluated" };
const simulated: AgentRunner = async (id) => {
  // Same deterministic per-stage delay in both modes: scheduler-only measurement.
  await new Promise(resolve => setTimeout(resolve, 20));
  const spec = specialists.find(item => item.id === id);
  const result = spec ? Object.fromEntries(Object.keys(spec.schema.shape).map(key => [key, baselineReview[key as keyof Review]])) : baselineReview;
  return { value: result, durationMs: 20, inputTokens: 0, outputTokens: 0, model: "SIMULATION-NO-PROVIDER" };
};
type Row = { id: string; repetition: number; execution: string; elapsedMs?: number; failedStages?: number; warnings?: string[]; issueMentioned?: boolean | null; inputTokens?: number; outputTokens?: number; error?: string };
const fingerprint = createHash("sha256").update(["src/lib/server/pipeline.ts", "src/lib/server/ai.ts", "benchmarks/corpus.ts"].map(path => readFileSync(path, "utf8")).join("\n") + JSON.stringify({ live, model: process.env.GROQ_MODEL || "openai/gpt-oss-120b", limit, repetitions })).digest("hex");
const previous = existsSync(output) ? JSON.parse(readFileSync(output, "utf8")) : null;
if (previous && previous.fingerprint !== fingerprint) throw new Error("Benchmark inputs changed. Use a fresh output file to avoid mixing results.");
const rows: Row[] = previous?.rows || [];
const selected = corpus.slice(0, limit);
function save() { writeFileSync(output, JSON.stringify({ fingerprint, mode: live ? "live-provider" : "simulated-scheduler", model: live ? process.env.GROQ_MODEL || "openai/gpt-oss-120b" : "SIMULATION-NO-PROVIDER", generatedAt: new Date().toISOString(), corpusSize: corpus.length, selectedProblems: limit, repetitions, rows }, null, 2)); }
for (let repetition = 0; repetition < repetitions; repetition++) {
  for (let index = 0; index < selected.length; index++) {
    const item = selected[index];
    // Alternate order to reduce systematic warm-up / time-of-day bias.
    const order = (index + repetition) % 2 ? ["parallel", "sequential"] as const : ["sequential", "parallel"] as const;
    for (const execution of order) {
      if (rows.some(row => row.id === item.id && row.repetition === repetition && row.execution === execution)) continue;
      try {
        const { review, report } = await runPipeline(item, { execution, ...(!live ? { runner: simulated } : {}) });
        const text = (review.correctness + " " + review.edgeCases.join(" ")).toLowerCase();
        rows.push({ id: item.id, repetition, execution, elapsedMs: report.elapsedMs, failedStages: report.warnings.length, warnings: report.warnings, inputTokens: report.inputTokens, outputTokens: report.outputTokens, issueMentioned: !live || !item.issueTerms.length ? null : item.issueTerms.some(term => text.includes(term)) });
        process.stdout.write(`${item.id} ${execution}: ${report.elapsedMs}ms; ${report.warnings.length} unavailable stages\n`);
      } catch (error) { rows.push({ id: item.id, repetition, execution, error: error instanceof Error ? error.message : "Unknown error" }); }
      save();
      const lastRun = repetition === repetitions - 1 && index === selected.length - 1 && execution === order[order.length - 1];
      if (live && !lastRun) await new Promise(resolve => setTimeout(resolve, Number(value("pause-ms", "65000"))));
    }
  }
}
const successfulPairs: { sequential: number; parallel: number }[] = [];
for (const item of selected) for (let repetition = 0; repetition < repetitions; repetition++) {
  const sequential = rows.find(row => row.id === item.id && row.repetition === repetition && row.execution === "sequential");
  const parallel = rows.find(row => row.id === item.id && row.repetition === repetition && row.execution === "parallel");
  if (sequential?.elapsedMs && parallel?.elapsedMs && !sequential.failedStages && !parallel.failedStages) successfulPairs.push({ sequential: sequential.elapsedMs, parallel: parallel.elapsedMs });
}
const median = (values: number[]) => { const sorted = [...values].sort((a,b) => a-b); const mid = Math.floor(sorted.length/2); return sorted.length ? sorted.length%2 ? sorted[mid] : (sorted[mid-1]+sorted[mid])/2 : null; };
const sequentialMedianMs = median(successfulPairs.map(pair => pair.sequential));
const parallelMedianMs = median(successfulPairs.map(pair => pair.parallel));
const reductionPercent = sequentialMedianMs && parallelMedianMs ? Number(((1-parallelMedianMs/sequentialMedianMs)*100).toFixed(1)) : null;
const summary = { mode: live ? "live-provider" : "simulated-scheduler", completedPairs: successfulPairs.length, sequentialMedianMs, parallelMedianMs, reductionPercent,
  totalRuns: rows.length, runsWithUnavailableStages: rows.filter(row => row.error || row.failedStages).length,
  target60PercentMet: live && successfulPairs.length >= 50 && reductionPercent !== null && reductionPercent >= 60,
  warning: live ? "Latency comparison against the same seven-stage sequential workflow, not human analysis or Quick review. Keyword matches are advisory; quality requires manual review. Inspect failures and repeat measurements." : "Synthetic scheduler measurement only. This is not provider performance and cannot substantiate a resume percentage." };
writeFileSync(output, JSON.stringify({ ...JSON.parse(readFileSync(output, "utf8")), summary }, null, 2));
process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
}
void main().catch(error => { console.error(error instanceof Error ? error.message : "Benchmark failed"); process.exitCode = 1; });
