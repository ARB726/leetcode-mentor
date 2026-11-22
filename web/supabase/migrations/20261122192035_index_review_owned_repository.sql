-- Apply after mentor_reviews.sql and mentor_repositories.sql.
-- Covers the owner-qualified repository foreign key during unlink operations.
create index mentor_reviews_owned_repository on public.mentor_reviews(user_id, repository_id);
