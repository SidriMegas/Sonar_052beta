-- TLMVPSP: Tout le monde veut prendre sa place

CREATE TABLE IF NOT EXISTS public.tlmvpsp_rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mode text NOT NULL CHECK (mode IN ('global', 'autopromo')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved')),
  king_titre_id uuid NOT NULL REFERENCES public.titre(id) ON DELETE CASCADE,
  challenger_titre_id uuid NOT NULL REFERENCES public.titre(id) ON DELETE CASCADE,
  winner_titre_id uuid REFERENCES public.titre(id) ON DELETE SET NULL,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tlmvpsp_one_active_round_per_mode
  ON public.tlmvpsp_rounds(mode)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_tlmvpsp_rounds_mode_status_dates
  ON public.tlmvpsp_rounds(mode, status, starts_at DESC, ends_at DESC);

CREATE TABLE IF NOT EXISTS public.tlmvpsp_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id uuid NOT NULL REFERENCES public.tlmvpsp_rounds(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.digger(id) ON DELETE CASCADE,
  choice text NOT NULL CHECK (choice IN ('king', 'challenger')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tlmvpsp_unique_vote_per_round UNIQUE (round_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_tlmvpsp_votes_round
  ON public.tlmvpsp_votes(round_id);

CREATE INDEX IF NOT EXISTS idx_tlmvpsp_votes_user
  ON public.tlmvpsp_votes(user_id);

CREATE TABLE IF NOT EXISTS public.tlmvpsp_autopromo_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.digger(id) ON DELETE CASCADE,
  titre_id uuid NOT NULL REFERENCES public.titre(id) ON DELETE CASCADE,
  round_id uuid REFERENCES public.tlmvpsp_rounds(id) ON DELETE SET NULL,
  cost_points integer NOT NULL DEFAULT 200,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'selected', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  selected_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tlmvpsp_autopromo_one_queued_per_user
  ON public.tlmvpsp_autopromo_entries(user_id)
  WHERE status = 'queued';

CREATE UNIQUE INDEX IF NOT EXISTS idx_tlmvpsp_autopromo_unique_queued_track
  ON public.tlmvpsp_autopromo_entries(titre_id)
  WHERE status = 'queued';

CREATE INDEX IF NOT EXISTS idx_tlmvpsp_autopromo_status_created
  ON public.tlmvpsp_autopromo_entries(status, created_at ASC);