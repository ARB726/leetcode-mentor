import { submissionSchema, reviewSchema, structuredAI } from "@/lib/server/ai";
import { requestIdentity } from "@/lib/server/auth";
import { ApiError, errorResponse, rateLimit, readJson } from "@/lib/server/http";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const identity = await requestIdentity(request);
    rateLimit("review:" + identity.key, 8);
    const input = submissionSchema.safeParse(await readJson(request));
    if (!input.success) throw new ApiError(400, "Include a problem (10–16,000 characters), solution (3–16,000 characters), and supported language.");
    const review = await structuredAI("code_review", reviewSchema,
      "Review the submitted solution's correctness, bugs, edge cases, and time/space complexity. Explain uncertainty when constraints are missing. Then propose an optimization only if warranted; optimizedCode must contain raw code in the requested language. Identify the core algorithm pattern, explain why it fits, and give one deliberate follow-up exercise. Keep each prose field under 140 words and include 3–5 concrete edge cases. Complexity fields describe the SUBMITTED code, not the optimized code. Do not dump private chain of thought; give a concise educational walkthrough.", input.data);
    return Response.json({ review }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return errorResponse(error); }
}
