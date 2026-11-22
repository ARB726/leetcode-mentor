import { ownedRepository, presentRepository } from "@/lib/server/repositories";
import { repositoryContents } from "@/lib/server/github";
import { errorResponse, rateLimit } from "@/lib/server/http";
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { repository, key } = await ownedRepository(request, (await context.params).id);
    rateLimit("browse-repository:" + key, 60);
    const repo = presentRepository(repository);
    const result = await repositoryContents(repo.url, new URL(request.url).searchParams.get("path") || "");
    return Response.json(result.kind === "file" ? { ...result, source: { repositoryId: repo.id, path: result.path, ref: result.ref, sha: result.sha } } : result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return errorResponse(error); }
}
