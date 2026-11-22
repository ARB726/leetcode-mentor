import assert from "node:assert/strict";
import test from "node:test";
import { parseRepositoryUrl, publicRepository, repositoryContents, safeSourcePath } from "../src/lib/server/github";
import { supabaseConfig } from "../src/lib/server/config";

test("repository URLs and paths reject remote hosts, credentials, and traversal", () => {
  assert.deepEqual(parseRepositoryUrl("https://github.com/example/project.git/"), { owner: "example", name: "project" });
  for (const value of ["http://github.com/a/b", "https://github.com.evil.test/a/b", "https://github.com@evil.test/a/b", "https://token@github.com/a/b", "https://github.com/a/b/tree/main", "https://github.com/a/b?token=x", "file:///tmp/code", "https://github.com/a/%2Fsecret"]) assert.throws(() => parseRepositoryUrl(value));
  for (const value of ["../private", "folder/../code.py", "/absolute.py", "folder\\code.py", "folder//code.py", "a\0b"]) assert.throws(() => safeSourcePath(value));
  assert.equal(safeSourcePath("src/hello world.py"), "src/hello world.py");
});

test("public import stays on the GitHub API, decodes UTF-8, and rejects private and binary files", async () => {
  const original = globalThis.fetch;
  const code = "def solve():\n    return 'café'";
  let privateRepo = false, binary = false;
  globalThis.fetch = async (url, options) => {
    assert.ok(String(url).startsWith("https://api.github.com/repos/example/project"));
    assert.equal(options?.redirect, "error");
    assert.equal(new Headers(options?.headers).has("Authorization"), false);
    if (!String(url).includes("/contents/")) return Response.json({ id: 42, private: privateRepo, full_name: "example/project", default_branch: "main", description: "Example", language: "Python" });
    return Response.json({ type: "file", encoding: "base64", size: code.length, sha: "a".repeat(40), content: Buffer.from(binary ? "x\0y" : code).toString("base64") });
  };
  try {
    const result = await repositoryContents("https://github.com/example/project", "src/solution.py");
    assert.equal(result.kind, "file");
    if (result.kind === "file") { assert.equal(result.code, code); assert.equal(result.language, "Python"); }
    binary = true;
    await assert.rejects(repositoryContents("https://github.com/example/project", "src/solution.py"), /Binary/);
    privateRepo = true;
    await assert.rejects(publicRepository("https://github.com/example/project"), /public/);
  } finally { globalThis.fetch = original; }
});

test("Supabase browser configuration never accepts secret or service-role keys", () => {
  const names = ["SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_PUBLISHABLE_KEY", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"];
  const previous = Object.fromEntries(names.map(name => [name, process.env[name]]));
  for (const name of names) delete process.env[name];
  process.env.SUPABASE_URL = "https://mentor-test.supabase.co";
  try {
    process.env.SUPABASE_PUBLISHABLE_KEY = "sb_secret_do_not_expose";
    assert.throws(supabaseConfig, /never a secret/);
    process.env.SUPABASE_PUBLISHABLE_KEY = "header." + Buffer.from(JSON.stringify({ role: "service_role" })).toString("base64url") + ".signature";
    assert.throws(supabaseConfig, /never a secret/);
    process.env.SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
    assert.equal(supabaseConfig().url, "https://mentor-test.supabase.co");
  } finally { for (const name of names) if (previous[name] === undefined) delete process.env[name]; else process.env[name] = previous[name]; }
});
