-- Trigger/function hotfixes for runtime latency and duplicate point writes.
-- Run after the schema migrations in db/05.04.

-- 1) Remove duplicated admin badge trigger.
drop trigger if exists trigger_admin_badge on public.digger;

-- 2) Keep digger.points in sync from points_history, but skip no-op rows
--    and quest rows that are already applied directly in fn_user_quest_claim.
create or replace function public.sync_points_history_to_digger()
returns trigger
language plpgsql
as $$
begin
  if new.user_id is null then
    return new;
  end if;

  if coalesce(new.amount, 0) = 0 then
    return new;
  end if;

  if new.type = 'quest' then
    return new;
  end if;

  update public.digger
  set points = coalesce(points, 0) + coalesce(new.amount, 0)
  where id = new.user_id;

  return new;
end;
$$;

-- 3) Avoid generating a second points_history row when title points changed only
--    because a like/unlike updated both likes and points in the same statement.
create or replace function public.sync_titre_points_to_history()
returns trigger
language plpgsql
as $$
declare
  diff_points integer;
begin
  if coalesce(new.user_id, old.user_id) is null then
    return new;
  end if;

  if coalesce(new.likes, 0) <> coalesce(old.likes, 0) then
    return new;
  end if;

  diff_points := floor(coalesce(new.points, 0)) - floor(coalesce(old.points, 0));

  if diff_points > 0 then
    insert into public.points_history (user_id, amount, type, reason)
    values (
      new.user_id,
      diff_points,
      'game',
      'Points generes par le titre : ' || coalesce(new.nom_titre, 'Sans titre')
    );
  end if;

  return new;
end;
$$;

analyze public.digger;
analyze public.titre;
analyze public.points_history;

-- 4) Seed legacy badge definitions required by the views game client.
insert into public.badges (id, name, description, image_url)
values
  (
    'devin_exact',
    'Devin exact',
    'A trouve exactement le bon nombre de vues pendant le jeu des vues.',
    null
  ),
  (
    'score_2',
    'Serie de 2',
    'A enchaine 2 bonnes reponses dans le jeu des vues.',
    null
  )
on conflict (id) do update
set
  name = excluded.name,
  description = excluded.description,
  image_url = excluded.image_url;

analyze public.badges;