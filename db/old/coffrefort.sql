-- Coffre-fort game RPCs (Supabase / Postgres)
-- Apply this migration in Supabase SQL editor.

create extension if not exists pgcrypto;

-- Drop existing functions to allow signature/return type changes
drop function if exists public.fn_coffrefort_is_admin(uuid);
drop function if exists public.fn_coffrefort_get_actif();
drop function if exists public.fn_coffrefort_creer(uuid, text, text, text, text, integer, integer);
drop function if exists public.fn_coffrefort_ajouter_indice(uuid, uuid, text, text, text, integer);
drop function if exists public.fn_coffrefort_laisser_mot(uuid, uuid, text);
drop function if exists public.fn_coffrefort_tenter(uuid, uuid, text);
drop function if exists public.fn_coffrefort_tableau_essais(uuid);

create unique index if not exists user_badges_user_badge_unique
  on public.user_badges (user_id, badge_id);

create or replace function public.fn_coffrefort_is_admin(p_user_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.digger d
    where d.id = p_user_id
      and coalesce(lower(d.role), 'digger') in ('admin', 'moderator')
  );
$$;

create or replace function public.fn_coffrefort_get_actif()
returns table (
  id uuid,
  recompense_titre text,
  recompense_description text,
  recompense_points integer,
  status text,
  essais_max integer,
  essais_restants integer,
  pourcentage_vie integer,
  created_at timestamptz,
  expires_at timestamptz,
  first_opener_username text,
  first_opened_at timestamptz,
  first_opener_message text,
  second_opened_at timestamptz,
  total_tentatives integer,
  nb_participants integer
)
language sql
stable
as $$
  with last_coffre as (
    select c.*
    from public.coffrefort c
    order by c.created_at desc
    limit 1
  )
  select
    c.id,
    c.recompense_titre,
    c.recompense_description,
    c.recompense_points,
    c.status,
    c.essais_max,
    c.essais_restants,
    case
      when c.essais_max <= 0 then 0
      else greatest(0, round((c.essais_restants::numeric / c.essais_max::numeric) * 100)::int)
    end as pourcentage_vie,
    c.created_at,
    c.expires_at,
    d.username as first_opener_username,
    c.first_opened_at,
    c.first_opener_message,
    c.second_opened_at,
    coalesce(t.total_tentatives, 0) as total_tentatives,
    coalesce(t.nb_participants, 0) as nb_participants
  from last_coffre c
  left join public.digger d on d.id = c.first_opener_id
  left join (
    select
      ct.coffre_id,
      count(*)::int as total_tentatives,
      count(distinct ct.user_id)::int as nb_participants
    from public.coffrefort_tentatives ct
    group by ct.coffre_id
  ) t on t.coffre_id = c.id;
$$;

create or replace function public.fn_coffrefort_creer(
  p_created_by uuid,
  p_code_secret text,
  p_recompense_titre text,
  p_recompense_description text default null,
  p_recompense_url text default null,
  p_recompense_points integer default 100,
  p_essais_max integer default 100
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_id uuid;
begin
  if not public.fn_coffrefort_is_admin(p_created_by) then
    return jsonb_build_object('success', false, 'error', 'Action reservee aux admins.');
  end if;

  if p_code_secret !~ '^\d{6}$' then
    return jsonb_build_object('success', false, 'error', 'Le code doit contenir exactement 6 chiffres.');
  end if;

  if coalesce(trim(p_recompense_titre), '') = '' then
    return jsonb_build_object('success', false, 'error', 'Titre de recompense obligatoire.');
  end if;

  update public.coffrefort
  set status = case
    when status in ('locked', 'opened_first', 'dead') then 'dead'
    else status
  end
  where status in ('locked', 'opened_first', 'dead');

  insert into public.coffrefort (
    code_hash,
    recompense_titre,
    recompense_description,
    recompense_url,
    recompense_points,
    essais_max,
    essais_restants,
    status,
    created_by
  )
  values (
    crypt(p_code_secret, gen_salt('bf')),
    trim(p_recompense_titre),
    nullif(trim(p_recompense_description), ''),
    nullif(trim(p_recompense_url), ''),
    greatest(1, p_recompense_points),
    greatest(1, p_essais_max),
    greatest(1, p_essais_max),
    'locked',
    p_created_by
  )
  returning id into v_new_id;

  return jsonb_build_object(
    'success', true,
    'message', 'Coffre cree avec succes.',
    'coffre_id', v_new_id
  );
end;
$$;

create or replace function public.fn_coffrefort_ajouter_indice(
  p_user_id uuid,
  p_coffre_id uuid,
  p_indice_text text,
  p_page_location text default null,
  p_hint_type text default 'text',
  p_ordre integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_creator uuid;
begin
  select c.created_by into v_creator
  from public.coffrefort c
  where c.id = p_coffre_id;

  if v_creator is null then
    return jsonb_build_object('success', false, 'error', 'Coffre introuvable.');
  end if;

  if not public.fn_coffrefort_is_admin(p_user_id) and p_user_id <> v_creator then
    return jsonb_build_object('success', false, 'error', 'Action non autorisee.');
  end if;

  if coalesce(trim(p_indice_text), '') = '' then
    return jsonb_build_object('success', false, 'error', 'Indice vide.');
  end if;

  insert into public.coffrefort_indices (
    coffre_id,
    indice_text,
    page_location,
    hint_type,
    ordre,
    is_visible
  )
  values (
    p_coffre_id,
    trim(p_indice_text),
    nullif(trim(p_page_location), ''),
    case
      when p_hint_type in ('text', 'image', 'audio', 'easter_egg') then p_hint_type
      else 'text'
    end,
    coalesce(p_ordre, 0),
    true
  );

  return jsonb_build_object('success', true, 'message', 'Indice ajoute.');
end;
$$;

create or replace function public.fn_coffrefort_laisser_mot(
  p_coffre_id uuid,
  p_user_id uuid,
  p_message text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_coffre public.coffrefort%rowtype;
  v_message text;
begin
  select * into v_coffre
  from public.coffrefort
  where id = p_coffre_id
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'Coffre introuvable.');
  end if;

  if v_coffre.first_opener_id is distinct from p_user_id then
    return jsonb_build_object('success', false, 'error', 'Seul le premier ouvreur peut laisser un mot.');
  end if;

  if v_coffre.status <> 'opened_first' then
    return jsonb_build_object('success', false, 'error', 'Le coffre n''est pas dans un etat permettant ce message.');
  end if;

  v_message := left(trim(coalesce(p_message, '')), 500);
  if v_message = '' then
    return jsonb_build_object('success', false, 'error', 'Message vide.');
  end if;

  update public.coffrefort
  set
    first_opener_message = v_message
  where id = p_coffre_id;

  return jsonb_build_object('success', true, 'message', 'Mot enregistre dans le coffre.');
end;
$$;

create or replace function public.fn_coffrefort_tenter(
  p_coffre_id uuid,
  p_user_id uuid,
  p_code_essaye text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_coffre public.coffrefort%rowtype;
  v_is_correct boolean := false;
  v_essais_restants integer := 0;
  v_badge_id text := 'coffrefort_cracker';
  v_destroyer_badge_id text := 'coffrefort_destroyer';
  v_current_points integer := 0;
begin
  if p_code_essaye !~ '^\d{6}$' then
    return jsonb_build_object(
      'success', false,
      'status', 'invalid_code',
      'message', 'Le code doit contenir exactement 6 chiffres.'
    );
  end if;

  select * into v_coffre
  from public.coffrefort
  where id = p_coffre_id
  for update;

  if not found then
    return jsonb_build_object('success', false, 'status', 'not_found', 'message', 'Coffre introuvable.');
  end if;

  if v_coffre.status in ('destroyed', 'opened_second') then
    return jsonb_build_object(
      'success', false,
      'status', v_coffre.status,
      'message', 'Ce coffre n''accepte plus de tentative.',
      'essais_restants', v_coffre.essais_restants,
      'essais_max', v_coffre.essais_max,
      'pourcentage_vie', case when v_coffre.essais_max <= 0 then 0 else round((v_coffre.essais_restants::numeric / v_coffre.essais_max::numeric) * 100)::int end
    );
  end if;

  if v_coffre.essais_restants <= 0 then
    update public.coffrefort
    set status = 'destroyed', essais_restants = 0
    where id = v_coffre.id;

    return jsonb_build_object(
      'success', false,
      'status', 'destroyed',
      'message', 'Le coffre a ete detruit (plus d''essais)',
      'essais_restants', 0,
      'essais_max', v_coffre.essais_max,
      'pourcentage_vie', 0
    );
  end if;

  v_is_correct := (crypt(p_code_essaye, v_coffre.code_hash) = v_coffre.code_hash);

  insert into public.coffrefort_tentatives (
    coffre_id,
    user_id,
    code_essaye,
    is_correct
  ) values (
    p_coffre_id,
    p_user_id,
    p_code_essaye,
    v_is_correct
  );

  if not v_is_correct then
    v_essais_restants := greatest(v_coffre.essais_restants - 1, 0);

    update public.coffrefort
    set
      essais_restants = v_essais_restants,
      status = case when v_essais_restants = 0 then 'destroyed' else status end
    where id = v_coffre.id;

    if v_essais_restants = 0 then
      select coalesce(d.points, 0)
      into v_current_points
      from public.digger d
      where d.id = p_user_id;

      if coalesce(v_current_points, 0) >= 250 then
        insert into public.points_history (user_id, amount, type, reason)
        values (
          p_user_id,
          -250,
          'game',
          'Coffre-fort detruit a la derniere tentative'
        );
      end if;

      insert into public.badges (id, name, description)
      values (
        v_destroyer_badge_id,
        'Bonnet d ane',
        'A detruit le coffre-fort en faisant sauter la derniere tentative.'
      )
      on conflict (id) do nothing;

      insert into public.user_badges (user_id, badge_id)
      values (p_user_id, v_destroyer_badge_id)
      on conflict (user_id, badge_id) do nothing;
    end if;

    return jsonb_build_object(
      'success', false,
      'status', case when v_essais_restants = 0 then 'destroyed' else 'wrong_code' end,
      'message', case
        when v_essais_restants = 0 then 'Mauvais code. Plus d''essais, coffre detruit.'
        else 'Mauvais code. Continue de chercher les indices.'
      end,
      'essais_restants', v_essais_restants,
      'essais_max', v_coffre.essais_max,
      'pourcentage_vie', case
        when v_coffre.essais_max <= 0 then 0
        else round((v_essais_restants::numeric / v_coffre.essais_max::numeric) * 100)::int
      end
    );
  end if;

  -- Code correct
  if v_coffre.status = 'locked' then
    update public.coffrefort
    set
      status = 'opened_first',
      first_opener_id = p_user_id,
      first_opened_at = now()
    where id = v_coffre.id;

    insert into public.points_history (user_id, amount, type, reason)
    values (
      p_user_id,
      coalesce(v_coffre.recompense_points, 0),
      'game',
      'Coffre-fort ouvert en premier'
    );

    insert into public.badges (id, name, description)
    values (
      v_badge_id,
      'Cracker de Coffre',
      'A ouvert un coffre-fort en premier.'
    )
    on conflict (id) do nothing;

    insert into public.user_badges (user_id, badge_id)
    values (p_user_id, v_badge_id)
    on conflict (user_id, badge_id) do nothing;

    return jsonb_build_object(
      'success', true,
      'status', 'first_opener',
      'message', 'Bravo, tu as ouvert le coffre en premier !',
      'recompense_titre', v_coffre.recompense_titre,
      'recompense_description', v_coffre.recompense_description,
      'recompense_url', v_coffre.recompense_url,
      'points_gagnes', coalesce(v_coffre.recompense_points, 0),
      'essais_restants', v_coffre.essais_restants,
      'essais_max', v_coffre.essais_max,
      'pourcentage_vie', case
        when v_coffre.essais_max <= 0 then 0
        else round((v_coffre.essais_restants::numeric / v_coffre.essais_max::numeric) * 100)::int
      end
    );
  end if;

  if v_coffre.status in ('opened_first', 'dead') and v_coffre.first_opener_id is distinct from p_user_id then
    update public.coffrefort
    set
      status = 'opened_second',
      second_opener_id = p_user_id,
      second_opened_at = now()
    where id = v_coffre.id;

    return jsonb_build_object(
      'success', true,
      'status', 'second_opener',
      'message', 'Tu as ouvert le coffre apres le premier digger.',
      'mot_du_premier', coalesce(v_coffre.first_opener_message, 'Une autre digger a trouve avant toi.'),
      'essais_restants', v_coffre.essais_restants,
      'essais_max', v_coffre.essais_max,
      'pourcentage_vie', case
        when v_coffre.essais_max <= 0 then 0
        else round((v_coffre.essais_restants::numeric / v_coffre.essais_max::numeric) * 100)::int
      end
    );
  end if;

  return jsonb_build_object(
    'success', false,
    'status', 'already_opened',
    'message', 'Tu as deja ouvert ce coffre en premier. Tu peux laisser un mot et le refermer.'
  );
end;
$$;

create or replace function public.fn_coffrefort_tableau_essais(p_coffre_id uuid)
returns table (
  coffre_id uuid,
  user_id uuid,
  username text,
  avatar_url text,
  nb_tentatives integer,
  nb_reussites integer,
  nb_echecs integer,
  premiere_tentative timestamptz,
  derniere_tentative timestamptz,
  duree_totale text,
  a_trouve boolean,
  rang integer
)
language sql
stable
as $$
  with agg as (
    select
      ct.coffre_id,
      ct.user_id,
      d.username,
      d.avatar_url,
      count(*)::int as nb_tentatives,
      count(*) filter (where ct.is_correct)::int as nb_reussites,
      count(*) filter (where not ct.is_correct)::int as nb_echecs,
      min(ct.created_at) as premiere_tentative,
      max(ct.created_at) as derniere_tentative,
      bool_or(ct.is_correct) as a_trouve
    from public.coffrefort_tentatives ct
    join public.digger d on d.id = ct.user_id
    where ct.coffre_id = p_coffre_id
    group by ct.coffre_id, ct.user_id, d.username, d.avatar_url
  )
  select
    a.coffre_id,
    a.user_id,
    a.username,
    a.avatar_url,
    a.nb_tentatives,
    a.nb_reussites,
    a.nb_echecs,
    a.premiere_tentative,
    a.derniere_tentative,
    concat(extract(epoch from (a.derniere_tentative - a.premiere_tentative))::int, 's') as duree_totale,
    a.a_trouve,
    row_number() over (
      order by
        a.a_trouve desc,
        a.nb_tentatives asc,
        a.premiere_tentative asc
    )::int as rang
  from agg a;
$$;

grant execute on function public.fn_coffrefort_get_actif() to anon, authenticated;
grant execute on function public.fn_coffrefort_tenter(uuid, uuid, text) to authenticated;
grant execute on function public.fn_coffrefort_laisser_mot(uuid, uuid, text) to authenticated;
grant execute on function public.fn_coffrefort_tableau_essais(uuid) to authenticated;
grant execute on function public.fn_coffrefort_creer(uuid, text, text, text, text, integer, integer) to authenticated;
grant execute on function public.fn_coffrefort_ajouter_indice(uuid, uuid, text, text, text, integer) to authenticated;
