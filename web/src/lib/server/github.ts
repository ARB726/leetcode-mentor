import { z } from "zod";
import { ApiError } from "./http";

const ownerPattern = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/;
const namePattern = /^(?!\.{1,2}$)[A-Za-z0-9_.-]{1,100}$/;
export function parseRepositoryUrl(value: string) {
  let url: URL;
  try { url = new URL(value.trim()); } catch { throw new ApiError(400, "Paste a repository URL such as https://github.com/owner/repository."); }
  const parts = url.pathname.replace(/\/$/, "").split("/").slice(1);
  const owner = parts[0], name = parts[1]?.replace(/\.git$/, "");
  if (url.protocol !== "https:" || url.hostname !== "github.com" || url.port || url.username || url.password || url.search || url.hash || parts.length !== 2 || !ownerPattern.test(owner || "") || !namePattern.test(name || "")) throw new ApiError(400, "Use the root HTTPS github.com repository URL, without a branch or file path.");
  return { owner, name };
}
export function safeSourcePath(value: string) {
  if (value.length > 512 || /[\\\x00-\x1f\x7f]/.test(value) || (value && value.split("/").some(part => !part || part === "." || part === ".."))) throw new ApiError(400, "Choose a valid relative repository path.");
  return value;
}
const extensions: Record<string, string> = { py: "Python", js: "JavaScript", jsx: "JavaScript", ts: "TypeScript", tsx: "TypeScript", java: "Java", cpp: "C++", cc: "C++", cxx: "C++", go: "Go", rs: "Rust" };
export function sourceLanguage(path: string) { return extensions[path.split(".").at(-1)?.toLowerCase() || ""] || null; }
export const repositorySourceSchema = z.object({ repositoryId: z.uuid(), path: z.string().min(1).max(512).refine(value => { try { safeSourcePath(value); return true; } catch { return false; } }), ref: z.string().min(1).max(255), sha: z.string().regex(/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/) }).strict();

async function github(path: string) {
  let response: Response;
  try { response = await fetch("https://api.github.com" + path, { headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "LeetCode-Mentor" }, redirect: "error", cache: "no-store", signal: AbortSignal.timeout(12000) }); }
  catch { throw new ApiError(502, "GitHub could not be reached. Try again shortly."); }
  if (response.status === 403 || response.status === 429) throw new ApiError(429, "GitHub's public API limit was reached. Please try again later.");
  if (response.status === 404) throw new ApiError(404, "That public repository or file was not found. Private repositories are not supported here.");
  if (!response.ok) throw new ApiError(502, "GitHub could not return this repository. Please retry.");
  if (!response.body) throw new ApiError(502, "GitHub returned an empty response.");
  const reader = response.body.getReader();
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 2_000_000) throw new ApiError(413, "This directory is too large. Choose a smaller folder.");
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}

export async function publicRepository(url: string) {
  const { owner, name } = parseRepositoryUrl(url);
  const data = await github(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`);
  if (data.private !== false || !Number.isSafeInteger(data.id) || typeof data.full_name !== "string" || typeof data.default_branch !== "string") throw new ApiError(400, "Choose a public GitHub repository with a default branch.");
  const canonical = parseRepositoryUrl("https://github.com/" + data.full_name);
  return { githubId: data.id as number, owner: canonical.owner, name: canonical.name, fullName: `${canonical.owner}/${canonical.name}`, url: `https://github.com/${canonical.owner}/${canonical.name}`, defaultBranch: data.default_branch as string, description: String(data.description || "").slice(0, 1000), language: typeof data.language === "string" ? data.language : null };
}

export async function repositoryContents(url: string, path: string) {
  safeSourcePath(path);
  // Recheck visibility, including repositories made private after linking.
  const repo = await publicRepository(url);
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  const data = await github(`/repos/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.name)}/contents/${encoded}?ref=${encodeURIComponent(repo.defaultBranch)}`);
  if (Array.isArray(data)) return { kind: "directory" as const, path, truncated: data.length > 200,
    entries: data.filter(entry => (entry.type === "dir" || entry.type === "file") && !entry.submodule_git_url && typeof entry.path === "string" && typeof entry.name === "string").slice(0, 200).map(entry => ({ name: entry.name as string, path: entry.path as string, type: entry.type as "dir" | "file", language: entry.type === "file" ? sourceLanguage(entry.path) : null, size: Number(entry.size || 0) })).sort((a,b) => a.type === b.type ? a.name.localeCompare(b.name) : a.type === "dir" ? -1 : 1) };
  const language = sourceLanguage(path);
  if (!language || data.type !== "file" || data.submodule_git_url || data.encoding !== "base64" || typeof data.content !== "string") throw new ApiError(400, "Choose a supported source-code file, not a binary file or submodule.");
  if (Number(data.size) > 64_000) throw new ApiError(413, "Choose a source file under 16,000 characters.");
  const bytes = Buffer.from(data.content.replace(/\s/g, ""), "base64");
  let code: string;
  try { code = new TextDecoder("utf-8", { fatal: true }).decode(bytes); } catch { throw new ApiError(400, "Choose a UTF-8 source-code file."); }
  if (code.includes("\0")) throw new ApiError(400, "Binary files cannot be imported.");
  if (!code.trim() || code.length > 16000) throw new ApiError(413, "Choose a nonempty source file under 16,000 characters.");
  if (!/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/.test(String(data.sha))) throw new ApiError(502, "GitHub returned an invalid file revision.");
  return { kind: "file" as const, code, language, name: path.split("/").at(-1)!, path, ref: repo.defaultBranch, sha: String(data.sha), url: `${repo.url}/blob/${encodeURIComponent(repo.defaultBranch)}/${encoded}` };
}
