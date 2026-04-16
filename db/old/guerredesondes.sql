-- Guerre des Ondes - Schema V1
-- Execute this script in Supabase SQL editor.

create table if not exists public.wave_players (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_place_at timestamptz,
  next_place_at timestamptz,
  cooldown_seconds integer not null default 7200,
  placements_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wave_tiles_current (
  x integer not null,
  y integer not null,
  track_id uuid not null references public.titre(id) on delete cascade,
  color_hex text not null,
  placed_by uuid not null references auth.users(id) on delete cascade,
  placed_at timestamptz not null default now(),
  primary key (x, y)
);

create table if not exists public.wave_tile_history (
  id uuid primary key default gen_random_uuid(),
  x integer not null,
  y integer not null,
  track_id uuid not null references public.titre(id) on delete cascade,
  color_hex text not null,
  placed_by uuid not null references auth.users(id) on delete cascade,
  placed_at timestamptz not null default now()
);

create index if not exists idx_wave_tiles_current_track on public.wave_tiles_current(track_id);
create index if not exists idx_wave_tiles_current_placed_by on public.wave_tiles_current(placed_by);
create index if not exists idx_wave_tile_history_placed_by on public.wave_tile_history(placed_by);
create index if not exists idx_wave_tile_history_placed_at on public.wave_tile_history(placed_at desc);

alter table public.wave_players enable row level security;
alter table public.wave_tiles_current enable row level security;
alter table public.wave_tile_history enable row level security;

-- Public read access on board state/history.
drop policy if exists "wave tiles current read" on public.wave_tiles_current;
create policy "wave tiles current read"
on public.wave_tiles_current
for select
to public
using (true);

drop policy if exists "wave tile history read" on public.wave_tile_history;
create policy "wave tile history read"
on public.wave_tile_history
for select
to public
using (true);

-- Players can read their own cooldown row.
drop policy if exists "wave players self read" on public.wave_players;
create policy "wave players self read"
on public.wave_players
for select
to authenticated
using (auth.uid() = user_id);

-- No direct insert/update/delete policies are added on purpose.
-- Writes should happen from server-side API routes with service role.
