import assert from "node:assert/strict";
import test from "node:test";
import { GET, POST } from "../src/app/api/repositories/route";
import { GET as contents } from "../src/app/api/repositories/[id]/contents/route";
import { DELETE } from "../src/app/api/repositories/[id]/route";

test("repository endpoints require identity, filter by owner, and never fetch a foreign user's repo", async () => {
  const original = globalThis.fetch;
  const previous = { url: process.env.SUPABASE_URL, key: process.env.SUPABASE_PUBLISHABLE_KEY, anon: process.env.SUPABASE_ANON_KEY };
  process.env.SUPABASE_URL = "https://mentor-test.supabase.co";
  process.env.SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test"; delete process.env.SUPABASE_ANON_KEY;
  const userId = "a88c9019-d86b-471a-ab8d-e7d32508752f", repoId = "bf1b4dc4-d549-4775-a69e-9c2c6d056fc3";
  const row = { id: repoId, github_id: 42, owner: "example", name: "project", description: "Example", default_branch: "main", language: "Python", created_at: "2026-11-21T00:00:00Z" };
  let foreign = false, githubCalls = 0, deletes = 0;
  globalThis.fetch = async (input, options) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    if (url.pathname === "/auth/v1/user") return Response.json({ id: userId, aud: "authenticated", email: "test@example.com", app_metadata: {}, user_metadata: {}, created_at: row.created_at });
    if (url.hostname === "api.github.com") { githubCalls++; return Response.json({ id: 42, private: false, full_name: "example/project", default_branch: "main", language: "Python" }); }
    assert.equal(url.pathname, "/rest/v1/mentor_repositories");
    if (options?.method === "POST") { const body = JSON.parse(String(options.body)); assert.equal(body.user_id, userId); return Response.json(row); }
    assert.equal(url.searchParams.get("user_id"), "eq." + userId);
    if (options?.method === "DELETE") { deletes++; assert.equal(url.searchParams.get("id"), "eq." + repoId); return new Response(null, { status: 204 }); }
    if (url.searchParams.has("id")) return Response.json(foreign ? null : row);
    return Response.json([row]);
  };
  const request = (path: string, method = "GET", body?: unknown, token = true) => new Request("https://mentor.test" + path, { method, headers: { ...(token ? { Authorization: "Bearer test-session" } : {}), ...(body ? { "Content-Type": "application/json" } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  try {
    assert.equal((await GET(request("/api/repositories", "GET", undefined, false))).status, 401);
    assert.equal((await POST(request("/api/repositories", "POST", { url: "https://github.com/example/project" }))).status, 200);
    const listed = await GET(request("/api/repositories")); assert.equal((await listed.json()).repositories[0].fullName, "example/project");
    foreign = true;
    const before = githubCalls;
    assert.equal((await contents(request(`/api/repositories/${repoId}/contents`), { params: Promise.resolve({ id: repoId }) })).status, 404);
    assert.equal(githubCalls, before);
    assert.equal((await DELETE(request(`/api/repositories/${repoId}`, "DELETE"), { params: Promise.resolve({ id: repoId }) })).status, 404);
    assert.equal(deletes, 0);
    foreign = false;
    assert.equal((await DELETE(request(`/api/repositories/${repoId}`, "DELETE"), { params: Promise.resolve({ id: repoId }) })).status, 200);
    assert.equal(deletes, 1);
  } finally {
    globalThis.fetch = original;
    for (const [name, value] of Object.entries({ SUPABASE_URL: previous.url, SUPABASE_PUBLISHABLE_KEY: previous.key, SUPABASE_ANON_KEY: previous.anon })) if (value === undefined) delete process.env[name]; else process.env[name] = value;
  }
});
