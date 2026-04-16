create extension if not exists pgcrypto;

create table if not exists public.prod (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.digger(id) on delete cascade,
  nom_titre text not null,
  nom_artiste text not null,
  youtube_url text not null,
  youtube_id text,
  youtube_channel_id text,
  vues_au_partage bigint not null default 0,
  vues_actuelles bigint not null default 0,
  points integer not null default 0,
  likes integer not null default 0,
  date_sortie timestamptz,
  beatmaker text,
  genre text,
  sous_genre text,
  pays text,
  feedback_enabled boolean not null default false,
  duree_secondes integer,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.prod enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'prod' and policyname = 'prod_public_select'
  ) then
    create policy prod_public_select on public.prod for select using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'prod' and policyname = 'prod_authenticated_insert'
  ) then
    create policy prod_authenticated_insert on public.prod for insert to authenticated with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'prod' and policyname = 'prod_owner_update'
  ) then
    create policy prod_owner_update on public.prod for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'prod' and policyname = 'prod_owner_delete'
  ) then
    create policy prod_owner_delete on public.prod for delete to authenticated using (auth.uid() = user_id);
  end if;
end $$;

alter table public.feedback add column if not exists prod_id uuid null;
alter table public.vote add column if not exists prod_id uuid null;
alter table public.notifications add column if not exists related_prod_id uuid null;

insert into public.prod (
  id,
  user_id,
  nom_titre,
  nom_artiste,
  youtube_url,
  youtube_id,
  youtube_channel_id,
  vues_au_partage,
  vues_actuelles,
  points,
  likes,
  date_sortie,
  beatmaker,
  genre,
  sous_genre,
  pays,
  feedback_enabled,
  duree_secondes,
  created_at
)
select
  id,
  user_id,
  nom_titre,
  nom_artiste,
  youtube_url,
  youtube_id,
  youtube_channel_id,
  case
    when trim(coalesce(vues_au_partage::text, '')) ~ '^-?\d+$' then trim(vues_au_partage::text)::bigint
    else 0
  end,
  case
    when trim(coalesce(vues_actuelles::text, '')) ~ '^-?\d+$' then trim(vues_actuelles::text)::bigint
    else 0
  end,
  case
    when trim(coalesce(points::text, '')) ~ '^-?\d+$' then trim(points::text)::integer
    else 0
  end,
  case
    when trim(coalesce(likes::text, '')) ~ '^-?\d+$' then trim(likes::text)::integer
    else 0
  end,
  case
    when trim(coalesce(date_sortie::text, '')) = '' then null
    else trim(date_sortie::text)::timestamptz
  end,
  beatmaker,
  genre,
  sous_genre,
  pays,
  case lower(trim(coalesce(feedback_enabled::text, '')))
    when 'true' then true
    when 't' then true
    when '1' then true
    when 'yes' then true
    when 'y' then true
    when 'on' then true
    when 'false' then false
    when 'f' then false
    when '0' then false
    when 'no' then false
    when 'n' then false
    when 'off' then false
    else false
  end,
  case
    when trim(coalesce(duree_secondes::text, '')) ~ '^-?\d+$' then trim(duree_secondes::text)::integer
    else null
  end,
  case
    when trim(coalesce(created_at::text, '')) = '' then timezone('utc', now())
    else trim(created_at::text)::timestamptz
  end
from public.titre
where type_partage = 'production'
on conflict (id) do update set
  user_id = excluded.user_id,
  nom_titre = excluded.nom_titre,
  nom_artiste = excluded.nom_artiste,
  youtube_url = excluded.youtube_url,
  youtube_id = excluded.youtube_id,
  youtube_channel_id = excluded.youtube_channel_id,
  vues_au_partage = excluded.vues_au_partage,
  vues_actuelles = excluded.vues_actuelles,
  points = excluded.points,
  likes = excluded.likes,
  date_sortie = excluded.date_sortie,
  beatmaker = excluded.beatmaker,
  genre = excluded.genre,
  sous_genre = excluded.sous_genre,
  pays = excluded.pays,
  feedback_enabled = excluded.feedback_enabled,
  duree_secondes = excluded.duree_secondes,
  created_at = excluded.created_at;

update public.feedback as feedback_row
set prod_id = feedback_row.titre_id,
    titre_id = null
from public.titre as titre_row
where feedback_row.titre_id = titre_row.id
  and titre_row.type_partage = 'production'
  and feedback_row.prod_id is null;

update public.vote as vote_row
set prod_id = vote_row.titre_id,
    titre_id = null
from public.titre as titre_row
where vote_row.titre_id = titre_row.id
  and titre_row.type_partage = 'production'
  and vote_row.prod_id is null;

update public.notifications as notification_row
set related_prod_id = notification_row.related_titre_id,
    related_titre_id = null
from public.titre as titre_row
where notification_row.related_titre_id = titre_row.id
  and titre_row.type_partage = 'production'
  and notification_row.related_prod_id is null;

delete from public.titre
where type_partage = 'production';

create unique index if not exists idx_prod_youtube_id
  on public.prod (youtube_id)
  where youtube_id is not null;

create index if not exists idx_prod_points_created
  on public.prod (points desc, created_at desc);

create index if not exists idx_prod_created
  on public.prod (created_at desc);

create index if not exists idx_prod_user_created
  on public.prod (user_id, created_at desc);

create index if not exists idx_feedback_prod_created
  on public.feedback (prod_id, created_at desc)
  where prod_id is not null;

create unique index if not exists idx_vote_prod_user_unique
  on public.vote (prod_id, user_id)
  where prod_id is not null;

create index if not exists idx_vote_user_prod
  on public.vote (user_id, prod_id)
  where prod_id is not null;