-- Playlistoartager: schema + constraints + cooldown trigger

CREATE TABLE IF NOT EXISTS public.playlist_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titre_id uuid NOT NULL REFERENCES public.titre(id) ON DELETE CASCADE,
  added_by uuid REFERENCES public.digger(id) ON DELETE SET NULL,
  source text NOT NULL DEFAULT 'admin' CHECK (source IN ('admin', 'suggestion')),
  suggestion_id uuid,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'removed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  removed_at timestamptz,
  removed_reason text
);

CREATE INDEX IF NOT EXISTS idx_playlist_tracks_status_expires
  ON public.playlist_tracks(status, expires_at);

CREATE INDEX IF NOT EXISTS idx_playlist_tracks_titre
  ON public.playlist_tracks(titre_id);

CREATE TABLE IF NOT EXISTS public.playlist_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id uuid NOT NULL REFERENCES public.playlist_tracks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.digger(id) ON DELETE CASCADE,
  vote_type text NOT NULL CHECK (vote_type IN ('yes', 'no')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_vote_per_type UNIQUE (track_id, user_id, vote_type)
);

CREATE INDEX IF NOT EXISTS idx_playlist_votes_track
  ON public.playlist_votes(track_id);

CREATE INDEX IF NOT EXISTS idx_playlist_votes_user
  ON public.playlist_votes(user_id);

CREATE TABLE IF NOT EXISTS public.playlist_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.digger(id) ON DELETE CASCADE,
  titre_id uuid NOT NULL REFERENCES public.titre(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  review_note text,
  accepted_track_id uuid REFERENCES public.playlist_tracks(id) ON DELETE SET NULL
);

-- Empêche plusieurs propositions pending pour un même titre
CREATE UNIQUE INDEX IF NOT EXISTS idx_playlist_suggestions_unique_pending_titre
  ON public.playlist_suggestions(titre_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_playlist_suggestions_user_created
  ON public.playlist_suggestions(user_id, created_at DESC);

-- Cooldown DB: 1 proposition max / 48h / user
CREATE OR REPLACE FUNCTION public.enforce_playlist_suggestion_cooldown()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  last_created timestamptz;
BEGIN
  SELECT created_at
  INTO last_created
  FROM public.playlist_suggestions
  WHERE user_id = NEW.user_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF last_created IS NOT NULL AND last_created > (now() - interval '48 hours') THEN
    RAISE EXCEPTION 'Cooldown actif: une proposition tous les 2 jours maximum.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_playlist_suggestion_cooldown ON public.playlist_suggestions;

CREATE TRIGGER trg_playlist_suggestion_cooldown
BEFORE INSERT ON public.playlist_suggestions
FOR EACH ROW
EXECUTE FUNCTION public.enforce_playlist_suggestion_cooldown();
