-- Performance: indexes a ajouter dans Supabase
-- A executer dans le SQL Editor de Supabase.
-- Ces indexes ciblent les requetes les plus frequentes du projet:
-- recherche navbar, classements, votes, notifications, profil, jeux et TLMVPSP.

create extension if not exists pg_trgm;

-- =====================================
-- TITRE
-- =====================================
-- Recherche navbar + recherche titres/artistes
create index if not exists idx_titre_nom_titre_trgm
  on public.titre using gin (nom_titre gin_trgm_ops);

create index if not exists idx_titre_nom_artiste_trgm
  on public.titre using gin (nom_artiste gin_trgm_ops);

-- Classements musique / home / feedback / track pools
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

-- Optionnel mais utile pour certains filtres lourds
create index if not exists idx_titre_genre
  on public.titre (genre);

create index if not exists idx_titre_sous_genre
  on public.titre (sous_genre);

create index if not exists idx_titre_pays
  on public.titre (pays);

-- =====================================
-- DIGGER
-- =====================================
-- Recherche navbar / auth / profils
create index if not exists idx_digger_username_trgm
  on public.digger using gin (username gin_trgm_ops);

-- Classement digger
create index if not exists idx_digger_points_desc
  on public.digger (points desc);

-- =====================================
-- VOTE
-- =====================================
-- Likesbutton + radar profil + track interactions
create index if not exists idx_vote_titre_user
  on public.vote (titre_id, user_id);

create index if not exists idx_vote_user_titre
  on public.vote (user_id, titre_id);

-- =====================================
-- NOTIFICATIONS
-- =====================================
create index if not exists idx_notifications_user_created
  on public.notifications (user_id, created_at desc);

-- Si tu as une colonne "read" ou "is_read", decommenter la ligne adaptee:
-- create index if not exists idx_notifications_user_unread_created
--   on public.notifications (user_id, created_at desc)
--   where is_read = false;

-- =====================================
-- POINTS / PROFIL / RADAR
-- =====================================
create index if not exists idx_points_history_user_created
  on public.points_history (user_id, created_at desc);

create index if not exists idx_feedback_track_created
  on public.feedback (titre_id, created_at desc);

create index if not exists idx_user_follows_follower
  on public.user_follows (follower_id, followed_id);

create index if not exists idx_user_follows_following
  on public.user_follows (followed_id, follower_id);

-- =====================================
-- JEU VUE
-- =====================================
create index if not exists idx_vue_score_best_score_desc
  on public.vue_score (best_score desc);

create index if not exists idx_vue_score_user_id
  on public.vue_score (user_id);

-- =====================================
-- PLAYLIST A PARTAGER
-- =====================================
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

-- =====================================
-- PARIS
-- =====================================
create index if not exists idx_paris_questions_status_created
  on public.paris_questions (status, created_at desc);

create index if not exists idx_paris_mises_question_user
  on public.paris_mises (pari_id, user_id);

create index if not exists idx_paris_mises_user_created
  on public.paris_mises (user_id, created_at desc);

-- =====================================
-- BOTTLES
-- =====================================
create index if not exists idx_bottles_receiver_created
  on public.bottles (target_user_id, created_at desc);

create index if not exists idx_bottles_sender_created
  on public.bottles (user_id, created_at desc);

create index if not exists idx_bottles_open_assignment
  on public.bottles (is_caught, target_user_id);

-- =====================================
-- TLMVPSP
-- =====================================
-- Une partie est deja dans db/tlmvpsp.sql, on complete pour les requetes de timeline / votes / resolved rounds.
create index if not exists idx_tlmvpsp_rounds_mode_resolved_at
  on public.tlmvpsp_rounds (mode, resolved_at desc)
  where status = 'resolved';

create index if not exists idx_tlmvpsp_votes_user_round
  on public.tlmvpsp_votes (user_id, round_id);

create index if not exists idx_tlmvpsp_autopromo_user_status_created
  on public.tlmvpsp_autopromo_entries (user_id, status, created_at asc);

-- =====================================
-- POST-CREATION
-- =====================================
-- Met a jour les stats pour que Postgres utilise vite les nouveaux indexes.
analyze public.titre;
analyze public.digger;
analyze public.vote;
analyze public.notifications;
analyze public.points_history;
analyze public.feedback;
analyze public.user_follows;
analyze public.vue_score;
analyze public.playlist_tracks;
analyze public.playlist_votes;
analyze public.playlist_suggestions;
analyze public.paris_questions;
analyze public.paris_mises;
analyze public.bottles;
analyze public.tlmvpsp_rounds;
analyze public.tlmvpsp_votes;
analyze public.tlmvpsp_autopromo_entries;
