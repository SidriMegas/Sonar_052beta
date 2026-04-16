begin;

-- Remove accidental duplicates per user/track before enforcing the correct constraint.
delete from public.vote
where ctid in (
  select ctid
  from (
    select ctid,
           row_number() over (
             partition by titre_id, user_id
             order by ctid
           ) as row_num
    from public.vote
  ) ranked_votes
  where ranked_votes.row_num > 1
);

alter table if exists public.vote
  drop constraint if exists "Votes_titre_id_key";

alter table if exists public.vote
  drop constraint if exists vote_titre_id_key;

drop index if exists public."Votes_titre_id_key";
drop index if exists public.vote_titre_id_key;

alter table if exists public.vote
  add constraint vote_titre_id_user_id_key unique (titre_id, user_id);

commit;