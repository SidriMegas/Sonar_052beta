import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export const PLAYLIST_ACTIVE_TRACKS = 5
export const PLAYLIST_TOTAL_WEEKS = 4
export const PLAYLIST_WEEK_MS = 7 * 24 * 60 * 60 * 1000

const getTimeZoneOffset = (date: Date, timeZone: string) => {
  const timeZonePart = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'shortOffset',
  })
    .formatToParts(date)
    .find((part) => part.type === 'timeZoneName')?.value

  const normalized = (timeZonePart || 'GMT+0').replace('GMT', '')
  if (normalized === '+0' || normalized === '-0') return 'Z'

  const match = normalized.match(/^([+-])(\d{1,2})(?::?(\d{2}))?$/)
  if (!match) return 'Z'

  const [, sign, rawHours, rawMinutes] = match
  const hours = rawHours.padStart(2, '0')
  const minutes = (rawMinutes || '00').padStart(2, '0')
  return `${sign}${hours}:${minutes}`
}

export const getParisDayBounds = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  const year = parts.find((part) => part.type === 'year')?.value || '1970'
  const month = parts.find((part) => part.type === 'month')?.value || '01'
  const day = parts.find((part) => part.type === 'day')?.value || '01'
  const offset = getTimeZoneOffset(date, 'Europe/Paris')

  const start = new Date(`${year}-${month}-${day}T00:00:00${offset}`)
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  }
}

export type PlaylistCycleStatus = 'active' | 'completed'

export type PlaylistCycleRow = {
  id: string
  status: PlaylistCycleStatus
  current_week: number
  started_at: string
  completed_at: string | null
  created_by: string | null
}

export type PlaylistSuggestionCandidate = {
  titre_id: string
  source: 'suggestion' | 'admin'
  suggestion_id: string | null
  added_by: string | null
}

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
  if (message.includes('playlist_cycles') || message.includes('cycle_id') || message.includes('week_number') || message.includes('locked_at')) {
    return 'Le schema Playlistoartager n est pas a jour. Applique db/playlistoartager_cycle.sql dans Supabase.'
  }
  return message || 'Erreur Playlistoartager inconnue.'
}

export const getLatestCycle = async (admin: SupabaseClient) => {
  const { data, error } = await admin
    .from('playlist_cycles')
    .select('id, status, current_week, started_at, completed_at, created_by')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle<PlaylistCycleRow>()

  if (error) throw error
  return data || null
}

export const getActiveCycle = async (admin: SupabaseClient) => {
  const { data, error } = await admin
    .from('playlist_cycles')
    .select('id, status, current_week, started_at, completed_at, created_by')
    .eq('status', 'active')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle<PlaylistCycleRow>()

  if (error) throw error
  return data || null
}

export const createCycle = async (admin: SupabaseClient, userId: string | null) => {
  const cycleStartedAt = new Date().toISOString()

  const { error: expirePendingError } = await admin
    .from('playlist_suggestions')
    .update({
      status: 'expired',
      reviewed_at: cycleStartedAt,
      review_note: 'Cycle precedent termine. Proposition a refaire pour le nouveau jeu.',
    })
    .eq('status', 'pending')

  if (expirePendingError) throw expirePendingError

  const { data, error } = await admin
    .from('playlist_cycles')
    .insert([
      {
        status: 'active',
        current_week: 1,
        created_by: userId,
        started_at: cycleStartedAt,
      },
    ])
    .select('id, status, current_week, started_at, completed_at, created_by')
    .single<PlaylistCycleRow>()

  if (error) throw error
  return data
}

export const ensureEditableCycle = async (admin: SupabaseClient, userId: string | null) => {
  const activeCycle = await getActiveCycle(admin)
  if (activeCycle) return activeCycle
  return createCycle(admin, userId)
}

export const getCycleTitreIds = async (admin: SupabaseClient, cycleId: string) => {
  const { data, error } = await admin
    .from('playlist_tracks')
    .select('titre_id')
    .eq('cycle_id', cycleId)

  if (error) throw error
  return new Set((data || []).map((row) => row.titre_id))
}

export const getWeekActiveTracks = async (admin: SupabaseClient, cycleId: string, weekNumber: number) => {
  const { data, error } = await admin
    .from('playlist_tracks')
    .select('id, titre_id, suggestion_id, source, added_by, created_at, expires_at')
    .eq('cycle_id', cycleId)
    .eq('week_number', weekNumber)
    .eq('status', 'active')
    .order('created_at', { ascending: true })

  if (error) throw error
  return data || []
}

export const buildSuggestionCandidates = async (
  admin: SupabaseClient,
  cycle: PlaylistCycleRow,
  explicitTitreIds: string[] = []
) => {
  const existingTitreIds = await getCycleTitreIds(admin, cycle.id)
  const candidates: PlaylistSuggestionCandidate[] = []
  const seen = new Set<string>(existingTitreIds)

  const { data: pendingSuggestions, error: pendingError } = await admin
    .from('playlist_suggestions')
    .select('id, titre_id, user_id')
    .eq('status', 'pending')
    .gte('created_at', cycle.started_at)
    .order('created_at', { ascending: true })
    .limit(100)

  if (pendingError) throw pendingError

  for (const suggestion of pendingSuggestions || []) {
    if (seen.has(suggestion.titre_id)) continue
    seen.add(suggestion.titre_id)
    candidates.push({
      titre_id: suggestion.titre_id,
      source: 'suggestion',
      suggestion_id: suggestion.id,
      added_by: suggestion.user_id,
    })
  }

  for (const titreId of explicitTitreIds) {
    if (!titreId || seen.has(titreId)) continue
    seen.add(titreId)
    candidates.push({
      titre_id: titreId,
      source: 'admin',
      suggestion_id: null,
      added_by: null,
    })
  }

  return candidates
}

export const fillWeekTracks = async (
  admin: SupabaseClient,
  cycle: PlaylistCycleRow,
  userId: string | null,
  explicitTitreIds: string[] = []
) => {
  const currentWeekTracks = await getWeekActiveTracks(admin, cycle.id, cycle.current_week)
  const slots = Math.max(0, PLAYLIST_ACTIVE_TRACKS - currentWeekTracks.length)
  if (slots === 0) {
    return { inserted: 0, tracks: currentWeekTracks }
  }

  const candidates = await buildSuggestionCandidates(admin, cycle, explicitTitreIds)
  const chosen = candidates.slice(0, slots)

  if (chosen.length === 0) {
    return { inserted: 0, tracks: currentWeekTracks }
  }

  const expiresAt = new Date(Date.now() + PLAYLIST_WEEK_MS).toISOString()

  const { data: insertedTracks, error: insertError } = await admin
    .from('playlist_tracks')
    .insert(
      chosen.map((candidate) => ({
        titre_id: candidate.titre_id,
        added_by: candidate.added_by || userId,
        source: candidate.source,
        suggestion_id: candidate.suggestion_id,
        status: 'active',
        expires_at: expiresAt,
        cycle_id: cycle.id,
        week_number: cycle.current_week,
      }))
    )
    .select('id, titre_id, suggestion_id')

  if (insertError) throw insertError

  for (const track of insertedTracks || []) {
    const candidate = chosen.find((item) => item.titre_id === track.titre_id && item.suggestion_id === track.suggestion_id)
    if (!candidate?.suggestion_id) continue

    const { error: suggestionUpdateError } = await admin
      .from('playlist_suggestions')
      .update({
        status: 'accepted',
        reviewed_at: new Date().toISOString(),
        accepted_track_id: track.id,
      })
      .eq('id', candidate.suggestion_id)

    if (suggestionUpdateError) throw suggestionUpdateError
  }

  return {
    inserted: chosen.length,
    tracks: [...currentWeekTracks, ...(insertedTracks || [])],
  }
}