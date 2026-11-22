# Dedicated Mentor project

Create a **new** Supabase project named `leetcode-mentor` in the user's selected organization. Use the Free plan when an available free project slot exists; do not upgrade a plan to bypass quota without the owner's instruction. Prefer an available US East region near the existing Ohio AWS service. This feature does not reuse System Design Simulator's database, users, keys, or tables.

Project creation and hosted configuration require a connected Supabase account. No hosted project has been created by the application itself. The app never takes a Supabase management token or service-role key from visitors.

## Database

Inspect the new project's schemas, then apply these SQL files in order:

1. `mentor_reviews.sql`
2. `mentor_repositories.sql`

They create Mentor-only tables, owner policies, and an owner-qualified foreign key. Unlinking a repository clears the association while preserving saved reviews. The migration intentionally fails on conflicting existing objects rather than silently overwriting policies. An embedded real PostgreSQL test verifies syntax, owner isolation, cross-owner foreign-key rejection, anonymous access restrictions, and unlink behavior. Hosted Supabase verification is still required after applying them.

## Sign-in

Set Site URL to the deployed AWS app URL. Add the exact production `/auth/callback` URL and `http://localhost:3000/auth/callback` to allowed redirect URLs. Avoid broad redirect wildcards in production.

Create a GitHub OAuth App for Mentor and set its authorization callback URL to `https://<PROJECT_REF>.supabase.co/auth/v1/callback`. Enable the GitHub provider in the dedicated Supabase project with that app's client ID and client secret. Those provider credentials belong in Supabase Auth settings; they do not belong in the browser or the Git repository. The browser app uses PKCE and requests `read:user user:email`, not repository write access. Email/password sign-in is also supported. Set the email provider's confirmation and SMTP settings for the intended audience.

See [Supabase's GitHub sign-in guide](https://supabase.com/docs/guides/auth/social-sign-in/auth-github) and [API key guidance](https://supabase.com/docs/guides/getting-started/api-keys).

## AWS runtime configuration

Put only the new project's URL and **public publishable key** in the ignored root `.env` as `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`. Legacy anon keys are accepted; secret/service-role keys are explicitly rejected. The key and URL are public browser configuration, not database administrative credentials.

After the migrations and Auth settings are ready, create and apply a reviewed Mentor-only change set:

```powershell
./.venv/Scripts/python.exe deploy/aws_live.py configure-supabase --web --profile leetcode-mentor --expected-account 675345028735
# Wait for CREATE_COMPLETE:
./.venv/Scripts/python.exe deploy/aws_live.py apply-supabase --web --profile leetcode-mentor --expected-account 675345028735
```

The apply command refuses replacements or changes to resources other than the existing Mentor `App`. It preserves the image and other existing stack parameters. Wait for `UPDATE_COMPLETE`, then verify GitHub and email sign-in with two test users. Each should see only their own links and reviews; importing a public file should preserve its path/ref/blob SHA; unlinking should keep reviews. Do not claim hosted auth works until these checks pass.

## Repository behavior and limits

Users paste a public `https://github.com/owner/repository` URL, then browse folders and import a supported UTF-8 source file of at most 16,000 characters. Files are inserted into the editor; they are sent to the AI provider only when a review is requested. The app never executes imported code, follows arbitrary download URLs, stores GitHub provider tokens in its database, or writes commits. Linking a public repository is a bookmark, not proof of repository ownership. Private repositories need a separately designed GitHub App installation flow.

GitHub reads use its public unauthenticated API and can hit the shared public rate limit. Limit errors are surfaced to the user. Larger adoption should use a dedicated GitHub App with appropriate permissions rather than a maintainer's personal token.
