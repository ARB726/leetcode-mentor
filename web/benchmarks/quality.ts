import { z } from "zod";

// Human grades must cite a retained live output; synthetic runs cannot enter this report.
const score = z.number().int().min(0).max(2);
export const qualitySchema = z.object({
  runId: z.string().trim().min(1),
  source: z.literal("live-provider"),
  model: z.string().trim().min(1),
  sourceFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  expectedCases: z.number().int().positive(),
  grades: z.array(z.object({
    caseId: z.string().trim().min(1),
    outputArtifact: z.string().trim().min(1),
    reviewer: z.string().trim().min(1),
    correctness: score,
    complexity: score,
    edgeCases: score,
    actionability: score,
    unsupportedExecutionClaim: z.boolean(),
    rationale: z.string().trim().min(20),
  }).strict()),
}).strict().superRefine((run, ctx) => {
  const ids = run.grades.map(grade => grade.caseId);
  if (new Set(ids).size !== ids.length) ctx.addIssue({ code: "custom", message: "Duplicate case IDs would inflate coverage." });
  if (ids.length > run.expectedCases) ctx.addIssue({ code: "custom", message: "Graded cases exceed the declared evaluation set." });
});

export function summarizeQuality(input: unknown) {
  const run = qualitySchema.parse(input);
  const count = run.grades.length;
  const dimensions = ["correctness", "complexity", "edgeCases", "actionability"] as const;
  return {
    runId: run.runId, source: run.source, model: run.model, sourceFingerprint: run.sourceFingerprint,
    expectedCases: run.expectedCases, gradedCases: count,
    coveragePercent: Math.round(count / run.expectedCases * 1000) / 10,
    complete: count === run.expectedCases,
    meanScoresOutOf2: Object.fromEntries(dimensions.map(key => [key, count ? run.grades.reduce((sum, grade) => sum + grade[key], 0) / count : null])),
    unsupportedExecutionClaims: run.grades.filter(grade => grade.unsupportedExecutionClaim).length,
    warning: "Human rubric scores, not executable correctness proof. Incomplete coverage must be disclosed. No latency or production-quality claim follows from this report.",
  };
}
