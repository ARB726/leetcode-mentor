import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";

test("real PostgreSQL migrations enforce tenant isolation and preserve reviews when unlinking", async () => {
  const db = await PGlite.create();
  const alice = "a88c9019-d86b-471a-ab8d-e7d32508752f", bob = "ecf3c876-e745-4ee0-81ba-106a3dba3bee";
  const aliceRepo = "bf1b4dc4-d549-4775-a69e-9c2c6d056fc3", bobRepo = "0826394e-77c7-4aca-9ad8-c582893a3569";
  try {
    await db.exec(`create role anon; create role authenticated;
      create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid$$;
      grant usage on schema auth, public to authenticated, anon;
      insert into auth.users values ('${alice}'), ('${bob}');`);
    await db.exec(readFileSync("supabase/mentor_reviews.sql", "utf8"));
    await db.exec(readFileSync("supabase/mentor_repositories.sql", "utf8"));
    await db.query("insert into mentor_repositories(id,user_id,github_id,owner,name,default_branch) values ($1,$2,1,'alice','project','main'),($3,$4,2,'bob','project','main')", [aliceRepo, alice, bobRepo, bob]);
    await db.exec("set role authenticated");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [alice]);
    const visible = await db.query<{ id: string }>("select id from mentor_repositories");
    assert.deepEqual(visible.rows.map(row => row.id), [aliceRepo]);
    await assert.rejects(db.query("insert into mentor_repositories(user_id,github_id,owner,name,default_branch) values ($1,3,'fake','project','main')", [bob]), /row-level security/);
    const insertReview = "insert into mentor_reviews(id,user_id,title,problem,solution,language,review,repository_id,source) values (gen_random_uuid(),$1,'Review','Problem','pass','Python','{}',$2,'{\"path\":\"solve.py\"}')";
    await assert.rejects(db.query(insertReview, [alice, bobRepo]), /foreign key/);
    await db.query(insertReview, [alice, aliceRepo]);
    await db.query("delete from mentor_repositories where id=$1", [bobRepo]);
    await db.query("delete from mentor_repositories where id=$1", [aliceRepo]);
    const preserved = await db.query<{ repository_id: string | null; title: string }>("select title, repository_id from mentor_reviews");
    assert.equal(preserved.rows.length, 1); assert.equal(preserved.rows[0].repository_id, null);
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [bob]);
    assert.equal((await db.query("select * from mentor_reviews")).rows.length, 0);
    assert.equal((await db.query("select id from mentor_repositories")).rows.length, 1);
    await db.exec("reset role; set role anon");
    await assert.rejects(db.query("select * from mentor_repositories"), /permission denied/);
  } finally { await db.close(); }
});
