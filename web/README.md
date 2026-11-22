# Mentor web workspace

Run `npm ci`, copy `.env.example` to `.env.local`, and run `npm run dev` in this directory. Open http://localhost:3000. `npm run typecheck`, `npm test`, and `npm run build` validate the app without spending AI credits.

The workspace includes a code editor, structured Groq reviews, interview rehearsal, a pattern library, report downloads, and saved practice. Without Supabase, saves last for the current browser tab. With Supabase configured, feedback requires sign-in and saves use the signed-in user's token and row-level security. Never supply a Supabase service-role key as the public key.

Use a dedicated Mentor Supabase project. Apply `supabase/mentor_reviews.sql` and then `supabase/mentor_repositories.sql` before enabling accounts. The application does not run migrations or alter any existing project's tables automatically. Project creation, GitHub OAuth configuration, and isolated AWS activation are covered in [the setup runbook](supabase/SETUP.md).

Only the public Supabase URL/key reaches the browser. Keep `GROQ_API_KEY` server-side. AI feedback does not execute code. Demo throttles are per process and reset on restart; use authentication and an external rate limiter before expanding a public deployment.

This directory contains the AWS-hosted Next.js workspace. The root Streamlit source remains available as a separate legacy application and rollback option.

## Seven-specialist reviews

Deep review runs six independent model calls for correctness, complexity, edge cases, optimization, patterns, and explanation, then a seventh call reconciles the findings. Progress streams as newline-delimited JSON. Quick review retains the single-call baseline. The optional interview rehearsal is a separate, user-requested call and is not counted among the seven review stages.

Deep reviews have bounded fan-out, two per-process admission slots, provider retries, per-call and overall timeouts, cancellation, and partial-result reporting. The UI displays actual stage timings and token usage from successful calls; failed calls can consume unreported provider tokens. These are asynchronous in-request workflows, not durable background jobs. A restart or disconnect ends the run. Use a durable job queue before promising restart recovery or scaling across replicas.

Print / PDF opens the browser print dialog with the full review, code, coaching, and stage trace. Choose Save as PDF. Markdown downloads remain available. Source code is not executed and solutions are not automatically committed to GitHub.

## Personal GitHub repository library

Signed-in users can save public repository links, browse folders, and import a supported UTF-8 source file into the editor. Reviews can retain the imported file's path, branch, and blob hash. Editing the imported code clears the association. Unlinking a repository preserves saved reviews. Public repository links are bookmarks, not verified claims of ownership; private repository access and GitHub writes are outside this integration.

The Supabase schema uses owner row policies and an owner-qualified foreign key. Tests run both migrations against an embedded PostgreSQL instance and exercise cross-user isolation, anonymous restrictions, and unlink preservation. Browser Supabase configuration accepts only publishable/anon keys and rejects administrative keys. GitHub login uses PKCE; provider client secrets belong in Supabase Auth settings.

See [the benchmark protocol](benchmarks/README.md) for the 50-task corpus and honest sequential/parallel comparisons. The 60% improvement is a target until supported by complete live measurements, not a product claim.
