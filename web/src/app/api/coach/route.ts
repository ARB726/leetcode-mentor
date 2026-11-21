import { coachInputSchema, coachingSchema, structuredAI } from "@/lib/server/ai";
import { requestIdentity } from "@/lib/server/auth";
import { ApiError, errorResponse, rateLimit, readJson } from "@/lib/server/http";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const identity = await requestIdentity(request);
    rateLimit("coach:" + identity.key, 12);
    const input = coachInputSchema.safeParse(await readJson(request));
    if (!input.success) throw new ApiError(400, "Include the reviewed submission, review, target role, and an explanation under 6,000 characters.");
    const coaching = await structuredAI("interview_coach", coachingSchema,
      "Coach the candidate's explanation, grounded in their actual submitted code and review. Return a concise first-person rehearsal explanation, one specific tradeoff to defend, one interviewer follow-up that changes a constraint, and a focused practice rep. If they supplied no explanation, label the explanation as a rehearsal draft. Do not imply the submitted code already contains the proposed optimization. Keep each field under 160 words.", input.data);
    return Response.json({ coaching }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return errorResponse(error); }
}
