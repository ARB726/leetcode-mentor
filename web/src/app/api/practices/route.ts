import { z } from "zod";
import { requestIdentity } from "@/lib/server/auth";
import { supabaseConfig } from "@/lib/server/config";
import { reviewSchema, coachingSchema } from "@/lib/server/ai";
import { ApiError, errorResponse, rateLimit, readJson } from "@/lib/server/http";
import { repositorySourceSchema } from "@/lib/server/github";

const practiceSchema = z.object({
  id: z.uuid(), title: z.string().min(1).max(200), problem: z.string().max(16000), solution: z.string().max(16000),
  language: z.string().max(30), createdAt: z.iso.datetime(), review: reviewSchema, coaching: coachingSchema.optional(), source: repositorySourceSchema.optional(),
});
function present(row: Record<string, unknown>) {
  return { id: row.id, title: row.title, problem: row.problem, solution: row.solution, language: row.language,
    createdAt: row.created_at, review: row.review, ...(row.coaching ? { coaching: row.coaching } : {}), ...(row.repository_id && row.source ? { source: { ...(row.source as object), repositoryId: row.repository_id } } : {}) };
}
function databaseError() { return new ApiError(502, "Saved practice is unavailable. Check that the configured Supabase table and owner-only policies are installed."); }
export async function GET(request: Request) {
  try {
    const { user, supabase } = await requestIdentity(request, true);
    const { data, error } = await supabase!.from(supabaseConfig().table).select("id,title,problem,solution,language,created_at,review,coaching,repository_id,source").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(100);
    if (error) throw databaseError();
    return Response.json({ practices: data.map(present) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return errorResponse(error); }
}
export async function POST(request: Request) {
  try {
    const { user, supabase, key } = await requestIdentity(request, true);
    rateLimit("save:" + key, 30);
    const input = practiceSchema.safeParse(await readJson(request));
    if (!input.success) throw new ApiError(400, "This practice record is invalid.");
    const item = input.data;
    const { data, error } = await supabase!.from(supabaseConfig().table).upsert({ id: item.id, user_id: user!.id, title: item.title,
      problem: item.problem, solution: item.solution, language: item.language, created_at: item.createdAt,
      review: item.review, coaching: item.coaching || null, repository_id: item.source?.repositoryId || null,
      source: item.source ? { path: item.source.path, ref: item.source.ref, sha: item.source.sha } : null }, { onConflict: "id" }).select().single();
    if (error) throw databaseError();
    return Response.json({ practice: present(data) });
  } catch (error) { return errorResponse(error); }
}
export async function DELETE(request: Request) {
  try {
    const { user, supabase, key } = await requestIdentity(request, true);
    rateLimit("delete:" + key, 30);
    const id = z.uuid().safeParse(new URL(request.url).searchParams.get("id"));
    if (!id.success) throw new ApiError(400, "Choose a valid practice record.");
    const { error } = await supabase!.from(supabaseConfig().table).delete().eq("id", id.data).eq("user_id", user!.id);
    if (error) throw databaseError();
    return Response.json({ success: true });
  } catch (error) { return errorResponse(error); }
}
