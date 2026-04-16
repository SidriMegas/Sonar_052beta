create table if not exists public.user_quest_status (
  user_id uuid not null references public.digger(id) on delete cascade,
  quest_id text not null,
  notified_at timestamptz null,
  claimed_at timestamptz null,
  pearl_reward integer not null default 0,
  xp_reward integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, quest_id)
);

create index if not exists idx_user_quest_status_user_claimed
  on public.user_quest_status (user_id, claimed_at desc);

alter table public.user_quest_status enable row level security;

drop policy if exists "user_quest_status_select_own" on public.user_quest_status;
create policy "user_quest_status_select_own"
  on public.user_quest_status
  for select
  using (auth.uid() = user_id);

drop policy if exists "user_quest_status_insert_own" on public.user_quest_status;
create policy "user_quest_status_insert_own"
  on public.user_quest_status
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "user_quest_status_update_own" on public.user_quest_status;
create policy "user_quest_status_update_own"
  on public.user_quest_status
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.fn_user_quest_mark_notified(
  p_quest_id text,
  p_title text,
  p_message text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing public.user_quest_status%rowtype;
  v_notified_at timestamptz := now();
begin
  if v_user_id is null then
    return jsonb_build_object('success', false, 'error', 'Utilisateur non connecte.');
  end if;

  select * into v_existing
  from public.user_quest_status
  where user_id = v_user_id and quest_id = p_quest_id
  for update;

  if found and v_existing.notified_at is not null then
    return jsonb_build_object(
      'success', true,
      'notification_created', false,
      'notified_at', v_existing.notified_at,
      'claimed_at', v_existing.claimed_at
    );
  end if;

  insert into public.user_quest_status (user_id, quest_id, notified_at, created_at, updated_at)
  values (v_user_id, p_quest_id, v_notified_at, now(), now())
  on conflict (user_id, quest_id)
  do update set notified_at = coalesce(public.user_quest_status.notified_at, excluded.notified_at), updated_at = now();

  insert into public.notifications (user_id, type, title, message)
  values (
    v_user_id,
    'quest_ready',
    coalesce(nullif(trim(p_title), ''), 'Quete terminee'),
    coalesce(nullif(trim(p_message), ''), 'Une quete est terminee et attend ta validation dans le profil.')
  );

  return jsonb_build_object(
    'success', true,
    'notification_created', true,
    'notified_at', v_notified_at
  );
end;
$$;

create or replace function public.fn_user_quest_claim(
  p_quest_id text,
  p_pearl_reward integer,
  p_xp_reward integer,
  p_badge_id text default null,
  p_badge_name text default null,
  p_badge_description text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing public.user_quest_status%rowtype;
  v_claimed_at timestamptz := now();
begin
  if v_user_id is null then
    return jsonb_build_object('success', false, 'status', 'unauthorized', 'error', 'Utilisateur non connecte.');
  end if;

  select * into v_existing
  from public.user_quest_status
  where user_id = v_user_id and quest_id = p_quest_id
  for update;

  if found and v_existing.claimed_at is not null then
    return jsonb_build_object('success', false, 'status', 'already_claimed', 'claimed_at', v_existing.claimed_at);
  end if;

  insert into public.user_quest_status (
    user_id,
    quest_id,
    notified_at,
    claimed_at,
    pearl_reward,
    xp_reward,
    created_at,
    updated_at
  )
  values (
    v_user_id,
    p_quest_id,
    coalesce(v_existing.notified_at, now()),
    v_claimed_at,
    greatest(coalesce(p_pearl_reward, 0), 0),
    greatest(coalesce(p_xp_reward, 0), 0),
    now(),
    now()
  )
  on conflict (user_id, quest_id)
  do update set
    claimed_at = coalesce(public.user_quest_status.claimed_at, excluded.claimed_at),
    pearl_reward = excluded.pearl_reward,
    xp_reward = excluded.xp_reward,
    updated_at = now();

  update public.digger
  set points = coalesce(points, 0) + greatest(coalesce(p_pearl_reward, 0), 0)
  where id = v_user_id;

  if greatest(coalesce(p_pearl_reward, 0), 0) > 0 then
    insert into public.points_history (user_id, amount, type, reason)
    values (
      v_user_id,
      greatest(coalesce(p_pearl_reward, 0), 0),
      'quest',
      'Recompense quete: ' || p_quest_id
    );
  end if;

  if coalesce(nullif(trim(coalesce(p_badge_id, '')), ''), '') <> '' then
    insert into public.badges (id, name, description)
    values (
      trim(p_badge_id),
      coalesce(nullif(trim(coalesce(p_badge_name, '')), ''), trim(p_badge_id)),
      nullif(trim(coalesce(p_badge_description, '')), '')
    )
    on conflict (id) do update set
      name = excluded.name,
      description = excluded.description;

    insert into public.user_badges (user_id, badge_id)
    values (v_user_id, trim(p_badge_id))
    on conflict (user_id, badge_id) do nothing;
  end if;

  return jsonb_build_object(
    'success', true,
    'status', 'claimed',
    'claimed_at', v_claimed_at,
    'pearl_reward', greatest(coalesce(p_pearl_reward, 0), 0),
    'xp_reward', greatest(coalesce(p_xp_reward, 0), 0),
    'badge_id', nullif(trim(coalesce(p_badge_id, '')), '')
  );
end;
$$;