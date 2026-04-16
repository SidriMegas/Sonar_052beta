-- Daily login rewards (14-day cycle)
-- Apply this script in Supabase SQL editor.

create table if not exists public.daily_login_rewards (
  day_number integer primary key check (day_number between 1 and 14),
  reward_label text not null,
  reward_points integer not null default 0 check (reward_points >= 0),
  badge_id text null references public.badges(id),
  reward_payload jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.daily_login_streak (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_claim_date date,
  streak_day integer not null default 0 check (streak_day between 0 and 14),
  total_claims integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.daily_login_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  claim_date date not null,
  day_number integer not null check (day_number between 1 and 14),
  reward_label text not null,
  reward_points integer not null default 0,
  badge_id text null references public.badges(id),
  reward_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(user_id, claim_date)
);

create index if not exists idx_daily_login_claims_user_created
  on public.daily_login_claims (user_id, created_at desc);

insert into public.daily_login_rewards (day_number, reward_label, reward_points, reward_payload)
values
  (1, 'Jour 1 - Bienvenue', 10, '{"type":"points"}'::jsonb),
  (2, 'Jour 2 - Motivation', 12, '{"type":"points"}'::jsonb),
  (3, 'Jour 3 - Boost', 14, '{"type":"points"}'::jsonb),
  (4, 'Jour 4 - Bonus', 16, '{"type":"points"}'::jsonb),
  (5, 'Jour 5 - Bonus+', 18, '{"type":"points"}'::jsonb),
  (6, 'Jour 6 - Escalade', 20, '{"type":"points"}'::jsonb),
  (7, 'Jour 7 - Semaine complete', 25, '{"type":"points"}'::jsonb),
  (8, 'Jour 8 - Retour', 12, '{"type":"points"}'::jsonb),
  (9, 'Jour 9 - Focus', 14, '{"type":"points"}'::jsonb),
  (10, 'Jour 10 - Energie', 16, '{"type":"points"}'::jsonb),
  (11, 'Jour 11 - Rythme', 18, '{"type":"points"}'::jsonb),
  (12, 'Jour 12 - Pression', 20, '{"type":"points"}'::jsonb),
  (13, 'Jour 13 - Presque', 24, '{"type":"points"}'::jsonb),
  (14, 'Jour 14 - Cycle termine', 35, '{"type":"points","tier":"cycle"}'::jsonb)
on conflict (day_number) do nothing;

drop function if exists public.fn_daily_login_rewards();
create or replace function public.fn_daily_login_rewards()
returns table (
  day_number integer,
  reward_label text,
  reward_points integer,
  badge_id text,
  reward_payload jsonb,
  is_active boolean
)
language sql
stable
as $$
  select
    r.day_number,
    r.reward_label,
    r.reward_points,
    r.badge_id,
    r.reward_payload,
    r.is_active
  from public.daily_login_rewards r
  where r.is_active = true
  order by r.day_number asc;
$$;

drop function if exists public.fn_daily_login_claim(uuid);
create or replace function public.fn_daily_login_claim(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := timezone('utc', now())::date;
  v_existing public.daily_login_claims%rowtype;
  v_last_claim date;
  v_streak_day integer;
  v_day_to_award integer;
  v_reward public.daily_login_rewards%rowtype;
begin
  if p_user_id is null then
    return jsonb_build_object('success', false, 'error', 'Utilisateur manquant.');
  end if;

  select * into v_existing
  from public.daily_login_claims
  where user_id = p_user_id and claim_date = v_today
  limit 1;

  if found then
    return jsonb_build_object(
      'success', true,
      'already_claimed', true,
      'day_number', v_existing.day_number,
      'reward_label', v_existing.reward_label,
      'reward_points', v_existing.reward_points,
      'badge_id', v_existing.badge_id,
      'reward_payload', v_existing.reward_payload
    );
  end if;

  select s.last_claim_date, s.streak_day
    into v_last_claim, v_streak_day
  from public.daily_login_streak s
  where s.user_id = p_user_id
  for update;

  if not found then
    v_day_to_award := 1;
    insert into public.daily_login_streak (user_id, last_claim_date, streak_day, total_claims, updated_at)
    values (p_user_id, v_today, 1, 1, now());
  else
    if v_last_claim = (v_today - 1) then
      v_day_to_award := case when v_streak_day >= 14 then 1 else v_streak_day + 1 end;
    else
      v_day_to_award := 1;
    end if;

    update public.daily_login_streak
    set
      last_claim_date = v_today,
      streak_day = v_day_to_award,
      total_claims = total_claims + 1,
      updated_at = now()
    where user_id = p_user_id;
  end if;

  select * into v_reward
  from public.daily_login_rewards
  where day_number = v_day_to_award and is_active = true
  limit 1;

  if not found then
    v_reward.day_number := v_day_to_award;
    v_reward.reward_label := 'Connexion jour ' || v_day_to_award;
    v_reward.reward_points := 0;
    v_reward.badge_id := null;
    v_reward.reward_payload := '{}'::jsonb;
    v_reward.is_active := true;
  end if;

  insert into public.daily_login_claims (
    user_id,
    claim_date,
    day_number,
    reward_label,
    reward_points,
    badge_id,
    reward_payload
  )
  values (
    p_user_id,
    v_today,
    v_day_to_award,
    v_reward.reward_label,
    coalesce(v_reward.reward_points, 0),
    v_reward.badge_id,
    coalesce(v_reward.reward_payload, '{}'::jsonb)
  );

  if coalesce(v_reward.reward_points, 0) > 0 then
    insert into public.points_history (user_id, amount, type, reason)
    values (
      p_user_id,
      v_reward.reward_points,
      'daily_bonus',
      'Recompense de connexion jour ' || v_day_to_award
    );
  end if;

  if v_reward.badge_id is not null and exists (
    select 1 from public.badges b where b.id = v_reward.badge_id
  ) then
    insert into public.user_badges (user_id, badge_id)
    values (p_user_id, v_reward.badge_id)
    on conflict (user_id, badge_id) do nothing;
  end if;

  insert into public.notifications (user_id, type, title, message, read)
  values (
    p_user_id,
    'daily_login',
    'Recompense de connexion - Jour ' || v_day_to_award,
    v_reward.reward_label || ' : +' || coalesce(v_reward.reward_points, 0) || ' points',
    false
  );

  return jsonb_build_object(
    'success', true,
    'already_claimed', false,
    'day_number', v_day_to_award,
    'reward_label', v_reward.reward_label,
    'reward_points', coalesce(v_reward.reward_points, 0),
    'badge_id', v_reward.badge_id,
    'reward_payload', coalesce(v_reward.reward_payload, '{}'::jsonb)
  );
end;
$$;

drop function if exists public.fn_daily_login_state(uuid);
create or replace function public.fn_daily_login_state(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := timezone('utc', now())::date;
  v_last_claim date;
  v_streak_day integer := 0;
  v_current_day integer := 1;
  v_claimed_today boolean := false;
  v_claims jsonb := '[]'::jsonb;
begin
  if p_user_id is null then
    return jsonb_build_object('success', false, 'error', 'Utilisateur manquant.');
  end if;

  select s.last_claim_date, s.streak_day
    into v_last_claim, v_streak_day
  from public.daily_login_streak s
  where s.user_id = p_user_id;

  if found then
    if v_last_claim = v_today then
      v_claimed_today := true;
      v_current_day := greatest(1, least(v_streak_day, 14));
    elsif v_last_claim = (v_today - 1) then
      v_current_day := case when v_streak_day >= 14 then 1 else v_streak_day + 1 end;
    else
      v_current_day := 1;
      v_streak_day := 0;
    end if;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'day_number', c.day_number,
        'claim_date', c.claim_date,
        'reward_label', c.reward_label,
        'reward_points', c.reward_points,
        'badge_id', c.badge_id,
        'reward_payload', c.reward_payload
      )
      order by c.claim_date desc
    ),
    '[]'::jsonb
  )
  into v_claims
  from public.daily_login_claims c
  where c.user_id = p_user_id
  limit 30;

  return jsonb_build_object(
    'success', true,
    'today', v_today,
    'streak_day', greatest(0, least(v_streak_day, 14)),
    'current_day', greatest(1, least(v_current_day, 14)),
    'claimed_today', v_claimed_today,
    'claims', v_claims
  );
end;
$$;

grant execute on function public.fn_daily_login_rewards() to authenticated;
grant execute on function public.fn_daily_login_claim(uuid) to authenticated;
grant execute on function public.fn_daily_login_state(uuid) to authenticated;
