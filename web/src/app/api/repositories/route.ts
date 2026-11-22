import { z } from "zod";
import { requestIdentity } from "@/lib/server/auth";
import { publicRepository } from "@/lib/server/github";
import { ApiError, errorResponse, rateLimit, readJson } from "@/lib/server/http";
import { repositoryTable, repositoryColumns, presentRepository, repositoryDatabaseError } from "@/lib/server/repositories";

export async function GET(request: Request) {
  try {
    const { user, supabase } = await requestIdentity(request, true);
    const { data, error } = await supabase!.from(repositoryTable).select(repositoryColumns).eq("user_id", user!.id).order("created_at", { ascending: false }).limit(100);
    if (error) throw repositoryDatabaseError();
    return Response.json({ repositories: data.map(presentRepository) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return errorResponse(error); }
}
export async function POST(request: Request) {
  try {
    const { user, supabase, key } = await requestIdentity(request, true);
    rateLimit("link-repository:" + key, 15);
    const input = z.object({ url: z.string().min(1).max(300) }).safeParse(await readJson(request));
    if (!input.success) throw new ApiError(400, "Paste a GitHub repository URL.");
    const repo = await publicRepository(input.data.url);
    const { data, error } = await supabase!.from(repositoryTable).upsert({ user_id: user!.id, github_id: repo.githubId, owner: repo.owner, name: repo.name, description: repo.description, default_branch: repo.defaultBranch, language: repo.language }, { onConflict: "user_id,github_id" }).select(repositoryColumns).single();
    if (error) throw repositoryDatabaseError();
    return Response.json({ repository: presentRepository(data) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return errorResponse(error); }
}
