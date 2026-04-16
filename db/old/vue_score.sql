alter table if exists public.vue_score
  add column if not exists exact_guess_count integer not null default 0;

update public.vue_score
set exact_guess_count = coalesce(exact_guess_count, 0)
where exact_guess_count is null;

create index if not exists idx_vue_score_exact_guess_count
  on public.vue_score (exact_guess_count desc);

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