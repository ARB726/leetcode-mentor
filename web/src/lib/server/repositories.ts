import { z } from "zod";
import { requestIdentity } from "./auth";
import { ApiError } from "./http";
export const repositoryTable = "mentor_repositories";
export const repositoryColumns = "id,github_id,owner,name,description,default_branch,language,created_at";
export function presentRepository(row: Record<string, unknown>) {
  return { id: row.id, fullName: `${row.owner}/${row.name}`, url: `https://github.com/${row.owner}/${row.name}`, description: row.description || "", defaultBranch: row.default_branch, language: row.language || null, createdAt: row.created_at };
}
export function repositoryDatabaseError() { return new ApiError(502, "Your repository library isn't ready yet. Please try again shortly."); }
export async function ownedRepository(request: Request, id: string) {
  const identity = await requestIdentity(request, true);
  if (!z.uuid().safeParse(id).success) throw new ApiError(400, "Choose a valid repository.");
  const { data, error } = await identity.supabase!.from(repositoryTable).select(repositoryColumns).eq("id", id).eq("user_id", identity.user!.id).maybeSingle();
  if (error) throw repositoryDatabaseError();
  if (!data) throw new ApiError(404, "Repository not found in your workspace.");
  return { ...identity, repository: data };
}
