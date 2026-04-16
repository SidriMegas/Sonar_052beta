import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export type TlmvpspMode = 'global' | 'autopromo'
export type TlmvpspChoice = 'king' | 'challenger'

export const ROUND_DURATION_MS = 24 * 60 * 60 * 1000
export const AUTOPROMO_ENTRY_COST = 200

const TRACK_SELECT = 'id, user_id, nom_artiste, nom_titre, youtube_url, youtube_id, vues_actuelles, likes, points, autopromo'

type TrackRow = {
  id: string
  user_id: string | null
  nom_artiste: string | null
  nom_titre: string | null
  youtube_url: string | null
  youtube_id: string | null
  vues_actuelles: number | null
  likes: number | null
  points: number | null
  autopromo: boolean | null
}

type RoundRow = {
  id: string
  mode: TlmvpspMode
  status: 'active' | 'resolved'
  king_titre_id: string
  challenger_titre_id: string
  winner_titre_id: string | null
  starts_at: string
  ends_at: string
  created_at: string
  resolved_at: string | null
}

type QueueRow = {
  id: string
  titre_id: string
  user_id: string
  created_at: string
}

export type TlmvpspTrack = {
  id: string
  userId: string | null
  artist: string
  title: string
  youtubeUrl: string | null
  youtubeId: string | null
  views: number
  likes: number
  points: number
  autopromo: boolean
}

export type TlmvpspRoundState = {
  id: string
  mode: TlmvpspMode
  startsAt: string
  endsAt: string
  kingDays: number
  king: TlmvpspTrack
  challenger: TlmvpspTrack
}

export type TlmvpspDuelTimelineItem = {
  id: string
  mode: TlmvpspMode
  startsAt: string
  endsAt: string
  status: 'active' | 'resolved'
  king: TlmvpspTrack
  challenger: TlmvpspTrack
  winnerTitreId: string | null
  kingVotes: number
  challengerVotes: number
}

export type TlmvpspReignTimelineItem = {
  id: string
  mode: TlmvpspMode
  track: TlmvpspTrack
  startsAt: string
  endsAt: string
  durationDays: number
  duelCount: number
  tier: 'base' | 'week' | 'month'
  dailyVotes: Array<{
    roundId: string
    startsAt: string
    kingVotes: number
    challengerVotes: number
    challengerTitreId: string
  }>
}

const normalizeTrack = (track: TrackRow): TlmvpspTrack => ({
  id: track.id,
  userId: track.user_id,
  artist: track.nom_artiste || 'Artiste inconnu',
  title: track.nom_titre || 'Titre inconnu',
  youtubeUrl: track.youtube_url,
  youtubeId: track.youtube_id,
  views: Number(track.vues_actuelles || 0),
  likes: Number(track.likes || 0),
  points: Number(track.points || 0),
  autopromo: Boolean(track.autopromo),
})

export const getClients = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY || anon

  if (!url || !anon || !service) return null

  return {
    admin: createClient(url, service),
    auth: createClient(url, anon),
  }
}

export const getBearerToken = (authorizationHeader: string | null) => {
  const header = authorizationHeader || ''
  if (!header.toLowerCase().startsWith('bearer ')) return null
  return header.slice(7)
}

export const getSchemaErrorMessage = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error || '')
  if (message.includes('tlmvpsp_')) {
    return 'Le schema TLMVPSP est manquant. Applique le fichier db/tlmvpsp.sql dans Supabase.'
  }
  return message || 'Erreur TLMVPSP inconnue.'
}

const fetchTrackById = async (admin: SupabaseClient, trackId: string) => {
  const { data, error } = await admin
    .from('titre')
    .select(TRACK_SELECT)
    .eq('id', trackId)
    .maybeSingle<TrackRow>()

  if (error) throw error
  return data ? normalizeTrack(data) : null
}

const fetchTrackPool = async (admin: SupabaseClient, mode: TlmvpspMode) => {
  let query = admin
    .from('titre')
    .select(TRACK_SELECT)
    .order('created_at', { ascending: false })
    .limit(500)

  if (mode === 'global') {
    query = query.eq('autopromo', false)
  } else {
    query = query.eq('autopromo', true)
  }

  const { data, error } = await query.returns<TrackRow[]>()
  if (error) throw error

  if ((data || []).length > 0) return (data || []).map(normalizeTrack)

  const fallback = await admin
    .from('titre')
    .select(TRACK_SELECT)
    .order('created_at', { ascending: false })
    .limit(500)
    .returns<TrackRow[]>()

  if (fallback.error) throw fallback.error
  return (fallback.data || []).map(normalizeTrack)
}

const pickRandomFromPool = (tracks: TlmvpspTrack[], excludeIds: string[]) => {
  const candidates = tracks.filter((track) => !excludeIds.includes(track.id))
  if (candidates.length === 0) return null
  return candidates[Math.floor(Math.random() * candidates.length)]
}

const pickAutopromoQueuedTrack = async (
  admin: SupabaseClient,
  excludeIds: string[]
): Promise<{ track: TlmvpspTrack | null; entryId: string | null }> => {
  const { data, error } = await admin
    .from('tlmvpsp_autopromo_entries')
    .select('id, titre_id, user_id, created_at')
    .eq('status', 'queued')
    .order('created_at', { ascending: true })
    .limit(20)
    .returns<QueueRow[]>()

  if (error) throw error

  for (const entry of data || []) {
    if (excludeIds.includes(entry.titre_id)) continue
    const track = await fetchTrackById(admin, entry.titre_id)
    if (!track) continue
    return { track, entryId: entry.id }
  }

  return { track: null, entryId: null }
}

const getLatestRound = async (admin: SupabaseClient, mode: TlmvpspMode, status?: 'active' | 'resolved') => {
  let query = admin
    .from('tlmvpsp_rounds')
    .select('id, mode, status, king_titre_id, challenger_titre_id, winner_titre_id, starts_at, ends_at, created_at, resolved_at')
    .eq('mode', mode)
    .order('starts_at', { ascending: false })
    .limit(1)

  if (status) query = query.eq('status', status)

  const { data, error } = await query.maybeSingle<RoundRow>()
  if (error) throw error
  return data || null
}

const resolveExpiredRound = async (admin: SupabaseClient, round: RoundRow) => {
  const { data: votes, error } = await admin
    .from('tlmvpsp_votes')
    .select('choice')
    .eq('round_id', round.id)
    .returns<{ choice: TlmvpspChoice }[]>()

  if (error) throw error

  const kingVotes = (votes || []).filter((vote) => vote.choice === 'king').length
  const challengerVotes = (votes || []).filter((vote) => vote.choice === 'challenger').length
  const winnerTitreId = challengerVotes > kingVotes ? round.challenger_titre_id : round.king_titre_id

  const { error: updateError } = await admin
    .from('tlmvpsp_rounds')
    .update({
      status: 'resolved',
      winner_titre_id: winnerTitreId,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', round.id)

  if (updateError) throw updateError
  return winnerTitreId
}

const buildRoundState = async (admin: SupabaseClient, round: RoundRow): Promise<TlmvpspRoundState | null> => {
  const king = await fetchTrackById(admin, round.king_titre_id)
  const challenger = await fetchTrackById(admin, round.challenger_titre_id)

  if (!king || !challenger) return null

  const kingDays = await getKingDays(admin, round.mode, king.id)

  return {
    id: round.id,
    mode: round.mode,
    startsAt: round.starts_at,
    endsAt: round.ends_at,
    kingDays,
    king,
    challenger,
  }
}

export const getKingDays = async (admin: SupabaseClient, mode: TlmvpspMode, kingTrackId: string) => {
  const { data, error } = await admin
    .from('tlmvpsp_rounds')
    .select('winner_titre_id')
    .eq('mode', mode)
    .eq('status', 'resolved')
    .order('resolved_at', { ascending: false })
    .limit(365)
    .returns<{ winner_titre_id: string | null }[]>()

  if (error) throw error

  let days = 1
  for (const round of data || []) {
    if (round.winner_titre_id !== kingTrackId) break
    days += 1
  }

  return days
}

export const ensureActiveRound = async (admin: SupabaseClient, mode: TlmvpspMode) => {
  const active = await getLatestRound(admin, mode, 'active')
  const now = Date.now()

  if (active && new Date(active.ends_at).getTime() > now) {
    const hydrated = await buildRoundState(admin, active)
    if (hydrated) return hydrated
  }

  let nextKingTrackId: string | null = null

  if (active) {
    nextKingTrackId = await resolveExpiredRound(admin, active)
  } else {
    const latestResolved = await getLatestRound(admin, mode, 'resolved')
    nextKingTrackId = latestResolved?.winner_titre_id || null
  }

  const pool = await fetchTrackPool(admin, mode)

  if (!nextKingTrackId) {
    nextKingTrackId = pickRandomFromPool(pool, [])?.id || null
  }

  if (!nextKingTrackId) {
    throw new Error('Aucun morceau disponible pour lancer TLMVPSP.')
  }

  let challenger = null as TlmvpspTrack | null
  let queuedEntryId: string | null = null

  if (mode === 'autopromo') {
    const queuedPick = await pickAutopromoQueuedTrack(admin, [nextKingTrackId])
    challenger = queuedPick.track
    queuedEntryId = queuedPick.entryId
  }

  if (!challenger) {
    challenger = pickRandomFromPool(pool, [nextKingTrackId])
  }

  if (!challenger) {
    throw new Error('Impossible de trouver un challenger TLMVPSP.')
  }

  const startsAt = new Date()
  const endsAt = new Date(startsAt.getTime() + ROUND_DURATION_MS)

  const { data: inserted, error: insertError } = await admin
    .from('tlmvpsp_rounds')
    .insert([
      {
        mode,
        status: 'active',
        king_titre_id: nextKingTrackId,
        challenger_titre_id: challenger.id,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
      },
    ])
    .select('id, mode, status, king_titre_id, challenger_titre_id, winner_titre_id, starts_at, ends_at, created_at, resolved_at')
    .single<RoundRow>()

  if (insertError) throw insertError

  if (queuedEntryId) {
    const { error: queueUpdateError } = await admin
      .from('tlmvpsp_autopromo_entries')
      .update({
        status: 'selected',
        selected_at: new Date().toISOString(),
        round_id: inserted.id,
      })
      .eq('id', queuedEntryId)

    if (queueUpdateError) throw queueUpdateError
  }

  const hydrated = await buildRoundState(admin, inserted)
  if (!hydrated) {
    throw new Error('Le round TLMVPSP a ete cree mais les morceaux sont introuvables.')
  }

  return hydrated
}

export const loadMyTitles = async (admin: SupabaseClient, userId: string | null) => {
  if (!userId) return []

  const { data, error } = await admin
    .from('titre')
    .select('id, nom_artiste, nom_titre, autopromo')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100)
    .returns<{ id: string; nom_artiste: string | null; nom_titre: string | null; autopromo: boolean | null }[]>()

  if (error) throw error

  return (data || []).map((row) => ({
    id: row.id,
    artist: row.nom_artiste || 'Artiste inconnu',
    title: row.nom_titre || 'Titre inconnu',
    autopromo: Boolean(row.autopromo),
  }))
}

export const loadMyPoints = async (admin: SupabaseClient, userId: string | null) => {
  if (!userId) return 0

  const { data, error } = await admin
    .from('digger')
    .select('points')
    .eq('id', userId)
    .maybeSingle<{ points: number | null }>()

  if (error) throw error
  return Number(data?.points || 0)
}

export const loadMyVotes = async (admin: SupabaseClient, userId: string | null, roundIds: string[]) => {
  if (!userId || roundIds.length === 0) return {} as Record<string, TlmvpspChoice>

  const { data, error } = await admin
    .from('tlmvpsp_votes')
    .select('round_id, choice')
    .eq('user_id', userId)
    .in('round_id', roundIds)
    .returns<{ round_id: string; choice: TlmvpspChoice }[]>()

  if (error) throw error

  return Object.fromEntries((data || []).map((vote) => [vote.round_id, vote.choice])) as Record<string, TlmvpspChoice>
}

export const loadMyQueuedAutopromo = async (admin: SupabaseClient, userId: string | null) => {
  if (!userId) return null

  const { data, error } = await admin
    .from('tlmvpsp_autopromo_entries')
    .select('id, titre_id, created_at')
    .eq('user_id', userId)
    .eq('status', 'queued')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle<{ id: string; titre_id: string; created_at: string }>()

  if (error) throw error
  return data || null
}

export const loadTimeline = async (admin: SupabaseClient, mode: TlmvpspMode) => {
  await ensureActiveRound(admin, mode)

  const { data: rounds, error: roundsError } = await admin
    .from('tlmvpsp_rounds')
    .select('id, mode, status, king_titre_id, challenger_titre_id, winner_titre_id, starts_at, ends_at, created_at, resolved_at')
    .eq('mode', mode)
    .order('starts_at', { ascending: true })
    .returns<RoundRow[]>()

  if (roundsError) throw roundsError

  const allRounds = rounds || []
  if (allRounds.length === 0) {
    return {
      mode,
      reigns: [] as TlmvpspReignTimelineItem[],
      duels: [] as TlmvpspDuelTimelineItem[],
    }
  }

  const uniqueTrackIds = Array.from(
    new Set(
      allRounds.flatMap((round) => [round.king_titre_id, round.challenger_titre_id, round.winner_titre_id].filter(Boolean) as string[])
    )
  )

  const { data: tracks, error: trackError } = await admin
    .from('titre')
    .select(TRACK_SELECT)
    .in('id', uniqueTrackIds)
    .returns<TrackRow[]>()

  if (trackError) throw trackError

  const trackMap = new Map((tracks || []).map((track) => [track.id, normalizeTrack(track)]))

  const roundIds = allRounds.map((round) => round.id)
  const { data: votes, error: votesError } = await admin
    .from('tlmvpsp_votes')
    .select('round_id, choice')
    .in('round_id', roundIds)
    .returns<{ round_id: string; choice: TlmvpspChoice }[]>()

  if (votesError) throw votesError

  const voteMap = new Map<string, { kingVotes: number; challengerVotes: number }>()
  for (const vote of votes || []) {
    const current = voteMap.get(vote.round_id) || { kingVotes: 0, challengerVotes: 0 }
    if (vote.choice === 'king') current.kingVotes += 1
    if (vote.choice === 'challenger') current.challengerVotes += 1
    voteMap.set(vote.round_id, current)
  }

  const duels: TlmvpspDuelTimelineItem[] = allRounds
    .map((round) => {
      const king = trackMap.get(round.king_titre_id)
      const challenger = trackMap.get(round.challenger_titre_id)
      if (!king || !challenger) return null
      const counts = voteMap.get(round.id) || { kingVotes: 0, challengerVotes: 0 }
      return {
        id: round.id,
        mode: round.mode,
        startsAt: round.starts_at,
        endsAt: round.ends_at,
        status: round.status,
        king,
        challenger,
        winnerTitreId: round.winner_titre_id,
        kingVotes: counts.kingVotes,
        challengerVotes: counts.challengerVotes,
      }
    })
    .filter((item): item is TlmvpspDuelTimelineItem => Boolean(item))

  const reigns: TlmvpspReignTimelineItem[] = []

  for (const duel of duels) {
    const current = reigns[reigns.length - 1]
    if (!current || current.track.id !== duel.king.id) {
      reigns.push({
        id: `${duel.mode}:${duel.king.id}:${duel.startsAt}`,
        mode: duel.mode,
        track: duel.king,
        startsAt: duel.startsAt,
        endsAt: duel.status === 'active' ? new Date().toISOString() : duel.endsAt,
        durationDays: 1,
        duelCount: 1,
        tier: 'base',
        dailyVotes: [
          {
            roundId: duel.id,
            startsAt: duel.startsAt,
            kingVotes: duel.kingVotes,
            challengerVotes: duel.challengerVotes,
            challengerTitreId: duel.challenger.id,
          },
        ],
      })
      continue
    }

    current.endsAt = duel.status === 'active' ? new Date().toISOString() : duel.endsAt
    current.duelCount += 1
    current.dailyVotes.push({
      roundId: duel.id,
      startsAt: duel.startsAt,
      kingVotes: duel.kingVotes,
      challengerVotes: duel.challengerVotes,
      challengerTitreId: duel.challenger.id,
    })
  }

  for (const reign of reigns) {
    const durationMs = Math.max(new Date(reign.endsAt).getTime() - new Date(reign.startsAt).getTime(), ROUND_DURATION_MS)
    const durationDays = Math.max(1, Math.round(durationMs / ROUND_DURATION_MS))
    reign.durationDays = durationDays
    reign.tier = durationDays >= 30 ? 'month' : durationDays >= 7 ? 'week' : 'base'
  }

  return {
    mode,
    reigns,
    duels,
  }
}