-- Profile social links + follow system
-- Apply this script in Supabase SQL editor.

alter table public.digger
  add column if not exists instagram_url text,
  add column if not exists x_url text,
  add column if not exists soundcloud_url text,
  add column if not exists spotify_url text;

create table if not exists public.user_follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  followed_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followed_id),
  check (follower_id <> followed_id)
);

create index if not exists idx_user_follows_followed
  on public.user_follows (followed_id, created_at desc);

create index if not exists idx_user_follows_follower
  on public.user_follows (follower_id, created_at desc);

drop function if exists public.fn_toggle_follow(uuid, uuid);
create or replace function public.fn_toggle_follow(p_follower_id uuid, p_followed_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now_following boolean := false;
  v_followers_count integer := 0;
  v_following_count integer := 0;
begin
  if p_follower_id is null or p_followed_id is null then
    return jsonb_build_object('success', false, 'error', 'Utilisateur manquant.');
  end if;

  if p_follower_id = p_followed_id then
    return jsonb_build_object('success', false, 'error', 'Impossible de se suivre soi-meme.');
  end if;

  if exists (
    select 1 from public.user_follows
    where follower_id = p_follower_id and followed_id = p_followed_id
  ) then
    delete from public.user_follows
    where follower_id = p_follower_id and followed_id = p_followed_id;
    v_now_following := false;
  else
    insert into public.user_follows (follower_id, followed_id)
    values (p_follower_id, p_followed_id)
    on conflict do nothing;
    v_now_following := true;
  end if;

  select count(*)::int into v_followers_count
  from public.user_follows
  where followed_id = p_followed_id;

  select count(*)::int into v_following_count
  from public.user_follows
  where follower_id = p_followed_id;

  return jsonb_build_object(
    'success', true,
    'is_following', v_now_following,
    'followers_count', v_followers_count,
    'following_count', v_following_count
  );
end;
$$;

drop function if exists public.fn_follow_state(uuid, uuid);
create or replace function public.fn_follow_state(p_viewer_id uuid, p_profile_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'is_following', case
      when p_viewer_id is null then false
      else exists (
        select 1
        from public.user_follows f
        where f.follower_id = p_viewer_id
          and f.followed_id = p_profile_id
      )
    end,
    'followers_count', (
      select count(*)::int
      from public.user_follows f
      where f.followed_id = p_profile_id
    ),
    'following_count', (
      select count(*)::int
      from public.user_follows f
      where f.follower_id = p_profile_id
    )
  );
$$;

grant execute on function public.fn_toggle_follow(uuid, uuid) to authenticated;
grant execute on function public.fn_follow_state(uuid, uuid) to authenticated;
