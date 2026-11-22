import { ownedRepository, repositoryTable, repositoryDatabaseError } from "@/lib/server/repositories";
import { errorResponse, rateLimit } from "@/lib/server/http";
export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { user, supabase, key } = await ownedRepository(request, (await context.params).id);
    rateLimit("unlink-repository:" + key, 20);
    const { error } = await supabase!.from(repositoryTable).delete().eq("id", (await context.params).id).eq("user_id", user!.id);
    if (error) throw repositoryDatabaseError();
    return Response.json({ success: true });
  } catch (error) { return errorResponse(error); }
}
