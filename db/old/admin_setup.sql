-- Admin setup: roles + badge d'authentification
-- A executer dans Supabase SQL Editor.

begin;

create unique index if not exists user_badges_user_badge_unique
  on public.user_badges (user_id, badge_id);

insert into public.badges (id, name, description, image_url)
values (
  'admin_badge',
  'Admin verifie',
  'Compte administrateur verifie de Sonar 0.52.',
  null
)
on conflict (id) do update
set
  name = excluded.name,
  description = excluded.description,
  image_url = excluded.image_url;

insert into public.badges (id, name, description, image_url)
values (
  'admin_verifie',
  'Admin verifie',
  'Compatibilite ancien badge admin.',
  null
)
on conflict (id) do update
set
  name = excluded.name,
  description = excluded.description,
  image_url = excluded.image_url;

create or replace function public.auto_give_admin_badge()
returns trigger
language plpgsql
as $$
begin
  if coalesce(lower(new.role), 'digger') = 'admin' then
    insert into public.user_badges (user_id, badge_id)
    values (new.id, 'admin_badge')
    on conflict (user_id, badge_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_auto_give_admin_badge on public.digger;

create trigger trg_auto_give_admin_badge
after insert or update of role on public.digger
for each row
execute function public.auto_give_admin_badge();

insert into public.user_badges (user_id, badge_id)
select user_id, 'admin_badge'
from public.user_badges
where badge_id = 'admin_verifie'
on conflict (user_id, badge_id) do nothing;

delete from public.user_badges
where badge_id = 'admin_verifie';

with admin_targets as (
  select id, email
  from public.digger
  where lower(email) in (
    'idris.dlm@hotmail.com',
    'ilovevideogame2609@gmail.com'
  )
)
update public.digger d
set role = 'admin'
from admin_targets t
where d.id = t.id;

insert into public.user_badges (user_id, badge_id)
select d.id, 'admin_badge'
from public.digger d
where lower(d.email) in (
  'idris.dlm@hotmail.com',
  'ilovevideogame2609@gmail.com'
)
on conflict (user_id, badge_id) do nothing;

commit;