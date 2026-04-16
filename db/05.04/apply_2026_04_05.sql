-- Sonar 0.52 combined migration
-- Run this file as-is in Supabase SQL Editor.

alter table public.digger
  add column if not exists equipped_badge_1 text null,
  add column if not exists equipped_badge_2 text null;

comment on column public.digger.equipped_badge_1 is 'Premier badge affiche a cote du pseudo utilisateur.';
comment on column public.digger.equipped_badge_2 is 'Second badge affiche a cote du pseudo utilisateur.';

create extension if not exists pg_trgm;

create index if not exists idx_titre_nom_titre_trgm
  on public.titre using gin (nom_titre gin_trgm_ops);

create index if not exists idx_titre_nom_artiste_trgm
  on public.titre using gin (nom_artiste gin_trgm_ops);

create index if not exists idx_titre_non_prod_points_created
  on public.titre (points desc, created_at desc)
  where type_partage is distinct from 'production';

create index if not exists idx_titre_non_prod_created
  on public.titre (created_at desc)
  where type_partage is distinct from 'production';

create index if not exists idx_titre_prod_created
  on public.titre (created_at desc)
  where type_partage = 'production';

create index if not exists idx_titre_prod_points_created
  on public.titre (points desc, created_at desc)
  where type_partage = 'production';

create index if not exists idx_titre_user_created
  on public.titre (user_id, created_at desc);

create index if not exists idx_titre_autopromo_created
  on public.titre (autopromo, created_at desc);

create index if not exists idx_titre_youtube_id
  on public.titre (youtube_id)
  where youtube_id is not null;

create index if not exists idx_titre_youtube_channel_created
  on public.titre (youtube_channel_id, created_at desc)
  where youtube_channel_id is not null;

create index if not exists idx_titre_feedback_enabled_created
  on public.titre (created_at desc)
  where feedback_enabled = true;

create index if not exists idx_titre_genre
  on public.titre (genre);

create index if not exists idx_titre_sous_genre
  on public.titre (sous_genre);

create index if not exists idx_titre_pays
  on public.titre (pays);

create index if not exists idx_digger_username_trgm
  on public.digger using gin (username gin_trgm_ops);

create index if not exists idx_digger_points_desc
  on public.digger (points desc);

create index if not exists idx_vote_titre_user
  on public.vote (titre_id, user_id);

create index if not exists idx_vote_user_titre
  on public.vote (user_id, titre_id);

create index if not exists idx_vote_user_created
  on public.vote (user_id, created_at desc);

create index if not exists idx_feedback_track_created
  on public.feedback (titre_id, created_at desc);

create index if not exists idx_feedback_digger_created
  on public.feedback (digger_id, created_at desc);

create index if not exists idx_feedback_prod_created
  on public.feedback (prod_id, created_at desc);

create index if not exists idx_user_badges_user_badge
  on public.user_badges (user_id, badge_id);

create index if not exists idx_notifications_user_created
  on public.notifications (user_id, created_at desc);

create index if not exists idx_notifications_user_type_created
  on public.notifications (user_id, type, created_at desc);

create index if not exists idx_user_follows_follower
  on public.user_follows (follower_id, followed_id);

create index if not exists idx_user_follows_following
  on public.user_follows (followed_id, follower_id);

create index if not exists idx_points_history_user_created
  on public.points_history (user_id, created_at desc);

create index if not exists idx_points_history_type_user_created
  on public.points_history (type, user_id, created_at desc);

create index if not exists idx_points_history_bet_positive_user
  on public.points_history (user_id, amount desc)
  where type = 'bet' and amount > 0;

create index if not exists idx_paris_questions_status_created
  on public.paris_questions (status, created_at desc);

create index if not exists idx_paris_mises_question_user
  on public.paris_mises (pari_id, user_id);

create index if not exists idx_paris_mises_user_created
  on public.paris_mises (user_id, created_at desc);

create index if not exists idx_vue_score_best_score_desc
  on public.vue_score (best_score desc);

create index if not exists idx_vue_score_user_id
  on public.vue_score (user_id);

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

create index if not exists idx_playlist_tracks_created
  on public.playlist_tracks (status, created_at desc);

create index if not exists idx_playlist_tracks_titre_id
  on public.playlist_tracks (titre_id);

create index if not exists idx_playlist_votes_track_id
  on public.playlist_votes (track_id);

create index if not exists idx_playlist_votes_user_track
  on public.playlist_votes (user_id, track_id);

create index if not exists idx_playlist_suggestions_created
  on public.playlist_suggestions (user_id, created_at desc);

create index if not exists idx_playlist_suggestions_titre_status
  on public.playlist_suggestions (titre_id, status);

create index if not exists idx_coffrefort_tentatives_user_created
  on public.coffrefort_tentatives (user_id, created_at desc);

create index if not exists idx_bottles_receiver_created
  on public.bottles (target_user_id, created_at desc);

create index if not exists idx_bottles_sender_created
  on public.bottles (user_id, created_at desc);

create index if not exists idx_bottles_open_assignment
  on public.bottles (is_caught, target_user_id);

create index if not exists idx_tlmvpsp_rounds_mode_resolved_at
  on public.tlmvpsp_rounds (mode, resolved_at desc)
  where status = 'resolved';

create index if not exists idx_tlmvpsp_votes_user_round
  on public.tlmvpsp_votes (user_id, round_id);

create index if not exists idx_tlmvpsp_autopromo_user_status_created
  on public.tlmvpsp_autopromo_entries (user_id, status, created_at asc);

analyze public.titre;
analyze public.digger;
analyze public.vote;
analyze public.feedback;
analyze public.user_badges;
analyze public.notifications;
analyze public.user_follows;
analyze public.points_history;
analyze public.paris_questions;
analyze public.paris_mises;
analyze public.vue_score;
analyze public.playlist_tracks;
analyze public.playlist_votes;
analyze public.playlist_suggestions;
analyze public.coffrefort_tentatives;
analyze public.bottles;
analyze public.tlmvpsp_rounds;
analyze public.tlmvpsp_votes;
analyze public.tlmvpsp_autopromo_entries;