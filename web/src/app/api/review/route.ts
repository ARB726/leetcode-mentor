import { submissionSchema, reviewSchema, structuredAI } from "@/lib/server/ai";
import { requestIdentity } from "@/lib/server/auth";
import { ApiError, errorResponse, rateLimit, readJson } from "@/lib/server/http";
import { claimPipeline, runPipeline } from "@/lib/server/pipeline";
import type { PipelineEvent } from "@/lib/pipeline";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const identity = await requestIdentity(request);
    rateLimit("review:" + identity.key, 8);
    const body = await readJson(request);
    const input = submissionSchema.safeParse(body);
    if (!input.success) throw new ApiError(400, "Include a problem (10–16,000 characters), solution (3–16,000 characters), and supported language.");
    if (body.mode !== undefined && body.mode !== "quick" && body.mode !== "deep") throw new ApiError(400, "Choose quick or deep review.");
    if (body.mode === "deep") {
      if (!process.env.GROQ_API_KEY) throw new ApiError(503, "AI is not configured on this server yet.");
      const release = claimPipeline();
      const abort = new AbortController();
      const encoder = new TextEncoder();
      let closed = false;
      const stream = new ReadableStream({
        async start(controller) {
          const send = (event: PipelineEvent) => { if (!closed) controller.enqueue(encoder.encode(JSON.stringify(event) + "\n")); };
          try {
            const result = await runPipeline(input.data, { signal: AbortSignal.any([request.signal, abort.signal]), onEvent: send });
            send({ type: "result", ...result });
          } catch (error) {
            if (!closed) send({ type: "error", error: error instanceof ApiError ? error.message : "Deep review was cancelled or could not finish. Your code is still here." });
          } finally {
            release();
            if (!closed) { closed = true; controller.close(); }
          }
        },
        cancel() { closed = true; abort.abort(); },
      });
      return new Response(stream, { headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-store, no-transform", "X-Accel-Buffering": "no" } });
    }
    const review = await structuredAI("code_review", reviewSchema,
      "Review the submitted solution's correctness, bugs, edge cases, and time/space complexity. Explain uncertainty when constraints are missing. Then propose an optimization only if warranted; optimizedCode must contain raw code in the requested language. Identify the core algorithm pattern, explain why it fits, and give one deliberate follow-up exercise. Keep each prose field under 140 words and include 3–5 concrete edge cases. Complexity fields describe the SUBMITTED code, not the optimized code. Do not dump private chain of thought; give a concise educational walkthrough.", input.data);
    return Response.json({ review }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return errorResponse(error); }
}
