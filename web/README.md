# Mentor web workspace

Run `npm ci`, copy `.env.example` to `.env.local`, and run `npm run dev` in this directory. Open http://localhost:3000. `npm run typecheck`, `npm test`, and `npm run build` validate the app without spending AI credits.

The workspace includes a code editor, structured Groq reviews, interview rehearsal, a pattern library, report downloads, and saved practice. Without Supabase, saves last for the current browser tab. With Supabase configured, feedback requires sign-in and saves use the signed-in user's token and row-level security. Never supply a Supabase service-role key as the public key.

The optional `supabase/mentor_reviews.sql` creates a new Mentor-only table and owner policies. Inspect the target database before running it; this application does not run migrations or alter any existing project's tables automatically. Configure email authentication and confirmation settings in the selected Supabase project.

Only the public Supabase URL/key reaches the browser. Keep `GROQ_API_KEY` server-side. AI feedback does not execute code. Demo throttles are per process and reset on restart; use authentication and an external rate limiter before expanding a public deployment.

This directory is the Next.js replacement under review. The root Streamlit application and its deployment continue to work until a web release is explicitly deployed.
