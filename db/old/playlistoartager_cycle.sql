-- Playlistoartager: cycle hebdo 4 semaines / 20 titres / 5 titres actifs.
-- A executer dans Supabase SQL Editor.

begin;

create table if not exists public.playlist_cycles (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'active' check (status in ('active', 'completed')),
  current_week integer not null default 1,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_by uuid references public.digger(id) on delete set null
);

create unique index if not exists idx_playlist_cycles_single_active
  on public.playlist_cycles (status)
  where status = 'active';

alter table public.playlist_tracks
  add column if not exists cycle_id uuid references public.playlist_cycles(id) on delete set null;

alter table public.playlist_tracks
  add column if not exists week_number integer;

alter table public.playlist_tracks
  add column if not exists locked_at timestamptz;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'playlist_tracks_status_check'
      and conrelid = 'public.playlist_tracks'::regclass
  ) then
    alter table public.playlist_tracks drop constraint playlist_tracks_status_check;
  end if;
end $$;

alter table public.playlist_tracks
  add constraint playlist_tracks_status_check
  check (status in ('active', 'locked', 'removed'));

create index if not exists idx_playlist_tracks_cycle_status_week
  on public.playlist_tracks (cycle_id, status, week_number, created_at);

create index if not exists idx_playlist_tracks_locked_at
  on public.playlist_tracks (locked_at);

commit;