alter table public.digger
  add column if not exists equipped_badge_1 text null,
  add column if not exists equipped_badge_2 text null;

comment on column public.digger.equipped_badge_1 is 'Premier badge affiche a cote du pseudo utilisateur.';
comment on column public.digger.equipped_badge_2 is 'Second badge affiche a cote du pseudo utilisateur.';