export type TrackDigger = {
  id?: string | null
  username?: string | null
  equipped_badge_1?: string | null
  equipped_badge_2?: string | null
} | null

export type TrackSummary = {
  id: string
  user_id: string
  nom_titre: string
  nom_artiste: string
  youtube_url?: string | null
  genre?: string | null
  sous_genre?: string | null
  pays?: string | null
  points?: number | null
  likes?: number | null
  vues_actuelles?: number | null
  vues_au_partage?: number | string | null
  feedback_enabled?: boolean | null
  created_at?: string | null
  youtube_channel_id?: string | null
  digger?: TrackDigger
}