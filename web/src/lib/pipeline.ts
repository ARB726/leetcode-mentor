import type { Review } from "./types";

export const agentCatalog = [
  { id: "correctness", name: "Code reviewer", task: "Correctness and assumptions" },
  { id: "complexity", name: "Complexity analyst", task: "Time and space costs" },
  { id: "edges", name: "Edge-case scout", task: "Boundary cases and counterexamples" },
  { id: "optimizer", name: "Optimization engineer", task: "Alternatives and tradeoffs" },
  { id: "patterns", name: "Pattern recognizer", task: "Algorithm patterns and next practice" },
  { id: "teacher", name: "Solution teacher", task: "A clear explanation of the approach" },
  { id: "synthesis", name: "Review lead", task: "Reconcile findings into one review" },
] as const;
export type AgentId = typeof agentCatalog[number]["id"];
export type AgentTrace = { id: AgentId; state: "queued" | "running" | "completed" | "failed"; durationMs?: number; inputTokens?: number; outputTokens?: number; model?: string; error?: string };
export type PipelineReport = { execution: "parallel" | "sequential"; elapsedMs: number; traces: AgentTrace[]; warnings: string[]; inputTokens: number; outputTokens: number };
export type PipelineEvent = { type: "agent"; agent: AgentTrace } | { type: "result"; review: Review; report: PipelineReport } | { type: "error"; error: string };
