import { NextRequest, NextResponse } from 'next/server'
import { getBearerToken, getClients, getLatestCycle, getParisDayBounds, getSchemaErrorMessage, PLAYLIST_ACTIVE_TRACKS, PLAYLIST_TOTAL_WEEKS } from '../_lib'

export async function GET(req: NextRequest) {
  const clients = getClients()
  if (!clients) {
    return NextResponse.json({ error: 'Configuration Supabase manquante.' }, { status: 500 })
  }

  let currentUserId: string | null = null
  const token = getBearerToken(req.headers.get('authorization'))
  if (token) {
    const { data } = await clients.auth.auth.getUser(token)
    currentUserId = data.user?.id || null
  }

  try {
    const cycle = await getLatestCycle(clients.admin)

    if (!cycle) {
      return NextResponse.json({
        cycle: null,
        activeTracks: [],
        lockedTracks: [],
        suggestions: [],
      })
    }

    const [{ data: activeTracks, error: activeError }, { data: lockedTracks, error: lockedError }, { data: suggestions, error: suggestionsError }] = await Promise.all([
      clients.admin
        .from('playlist_tracks')
        .select(`
          id,
          titre_id,
          source,
          created_at,
          expires_at,
          week_number,
          locked_at,
          titre:titre_id(id, user_id, nom_artiste, nom_titre, youtube_url, youtube_id, vues_actuelles, likes, digger:user_id(username, equipped_badge_1, equipped_badge_2))
        `)
        .eq('cycle_id', cycle.id)
        .eq('status', 'active')
        .order('created_at', { ascending: true })
        .limit(PLAYLIST_ACTIVE_TRACKS),
      clients.admin
        .from('playlist_tracks')
        .select(`
          id,
          titre_id,
          source,
          created_at,
          locked_at,
          week_number,
          titre:titre_id(id, user_id, nom_artiste, nom_titre, youtube_url, youtube_id, vues_actuelles, likes, digger:user_id(username, equipped_badge_1, equipped_badge_2))
        `)
        .eq('cycle_id', cycle.id)
        .eq('status', 'locked')
        .order('week_number', { ascending: true })
        .order('created_at', { ascending: true }),
      clients.admin
        .from('playlist_suggestions')
        .select(`
          id,
          created_at,
          status,
          titre:titre_id(id, user_id, nom_artiste, nom_titre, youtube_url, youtube_id, vues_actuelles, likes)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(30),
    ])

    if (activeError) {
      return NextResponse.json({ error: activeError.message }, { status: 500 })
    }
    if (lockedError) {
      return NextResponse.json({ error: lockedError.message }, { status: 500 })
    }
    if (suggestionsError) {
      return NextResponse.json({ error: suggestionsError.message }, { status: 500 })
    }

    const trackIds = (activeTracks || []).map((track) => track.id)

    const { data: votes, error: voteError } = trackIds.length
      ? await clients.admin.from('playlist_votes').select('track_id, vote_type').in('track_id', trackIds)
      : { data: [], error: null as any }

    if (voteError) {
      return NextResponse.json({ error: voteError.message }, { status: 500 })
    }

    const voteMap = new Map<string, { yes: number; no: number }>()
    for (const vote of votes || []) {
      const existing = voteMap.get(vote.track_id) || { yes: 0, no: 0 }
      if (vote.vote_type === 'yes') existing.yes += 1
      if (vote.vote_type === 'no') existing.no += 1
      voteMap.set(vote.track_id, existing)
    }

    let myVoteMap = new Map<string, { yes: boolean; no: boolean }>()
    let dailyVotes = { yesUsed: false, noUsed: false }
    if (currentUserId && trackIds.length > 0) {
      const { data: myVotes } = await clients.admin
        .from('playlist_votes')
        .select('track_id, vote_type')
        .eq('user_id', currentUserId)
        .in('track_id', trackIds)

      for (const vote of myVotes || []) {
        const current = myVoteMap.get(vote.track_id) || { yes: false, no: false }
        if (vote.vote_type === 'yes') current.yes = true
        if (vote.vote_type === 'no') current.no = true
        myVoteMap.set(vote.track_id, current)
      }

      const { start, end } = getParisDayBounds()
      const { data: todayVotes } = await clients.admin
        .from('playlist_votes')
        .select('vote_type')
        .eq('user_id', currentUserId)
        .gte('created_at', start)
        .lt('created_at', end)

      dailyVotes = {
        yesUsed: (todayVotes || []).some((vote) => vote.vote_type === 'yes'),
        noUsed: (todayVotes || []).some((vote) => vote.vote_type === 'no'),
      }
    }

    const now = Date.now()

    const hydratedActiveTracks = (activeTracks || []).map((track) => {
      const counts = voteMap.get(track.id) || { yes: 0, no: 0 }
      const my = myVoteMap.get(track.id) || { yes: false, no: false }
      const secondsLeft = Math.max(0, Math.floor((new Date(track.expires_at).getTime() - now) / 1000))

      return {
        ...track,
        yesVotes: counts.yes,
        noVotes: counts.no,
        score: counts.yes - counts.no,
        myYes: my.yes,
        myNo: my.no,
        secondsLeft,
      }
    })

    return NextResponse.json({
      cycle: {
        ...cycle,
        weeks_total: PLAYLIST_TOTAL_WEEKS,
      },
      dailyVotes,
      activeTracks: hydratedActiveTracks,
      lockedTracks: lockedTracks || [],
      suggestions: suggestions || [],
    })
  } catch (error) {
    return NextResponse.json({ error: getSchemaErrorMessage(error) }, { status: 500 })
  }
}
