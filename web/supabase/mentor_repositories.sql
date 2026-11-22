-- Apply after mentor_reviews.sql in the dedicated Mentor project (Postgres 15+).
-- This migration deliberately fails if conflicting objects exist; inspect first.
begin;
create table public.mentor_repositories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  github_id bigint not null,
  owner text not null check (char_length(owner) between 1 and 39),
  name text not null check (char_length(name) between 1 and 100),
  description text not null default '',
  default_branch text not null,
  language text,
  created_at timestamptz not null default now(),
  unique(user_id, github_id),
  unique(user_id, id)
);
alter table public.mentor_repositories enable row level security;
create index mentor_repositories_owner_date on public.mentor_repositories(user_id, created_at desc);
create policy "Owners read linked repositories" on public.mentor_repositories for select to authenticated using ((select auth.uid()) = user_id);
create policy "Owners link repositories" on public.mentor_repositories for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Owners update repositories" on public.mentor_repositories for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Owners unlink repositories" on public.mentor_repositories for delete to authenticated using ((select auth.uid()) = user_id);
revoke all on public.mentor_repositories from anon;
grant select, insert, update, delete on public.mentor_repositories to authenticated;

alter table public.mentor_reviews
  add column repository_id uuid,
  add column source jsonb,
  add constraint mentor_review_owned_repository foreign key (user_id, repository_id)
    references public.mentor_repositories(user_id, id) on delete set null (repository_id);
create index mentor_reviews_repository on public.mentor_reviews(repository_id) where repository_id is not null;
commit;
