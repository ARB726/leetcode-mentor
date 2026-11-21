-- Additive schema for a project that does not already have a Mentor table.
-- Do not run against an existing table with this name: inspect its schema first.
begin;
create table public.mentor_reviews (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  problem text not null check (char_length(problem) <= 16000),
  solution text not null check (char_length(solution) <= 16000),
  language text not null,
  review jsonb not null,
  coaching jsonb,
  created_at timestamptz not null default now()
);
alter table public.mentor_reviews enable row level security;
create index mentor_reviews_owner_date on public.mentor_reviews(user_id, created_at desc);
create policy "Owners read Mentor reviews" on public.mentor_reviews for select to authenticated using ((select auth.uid()) = user_id);
create policy "Owners create Mentor reviews" on public.mentor_reviews for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Owners update Mentor reviews" on public.mentor_reviews for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Owners delete Mentor reviews" on public.mentor_reviews for delete to authenticated using ((select auth.uid()) = user_id);
grant select, insert, update, delete on public.mentor_reviews to authenticated;
commit;
