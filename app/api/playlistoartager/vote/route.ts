import { NextRequest, NextResponse } from 'next/server'
import { getBearerToken, getClients, getParisDayBounds, getSchemaErrorMessage } from '../_lib'

export async function POST(req: NextRequest) {
  const clients = getClients()
  if (!clients) {
    return NextResponse.json({ error: 'Configuration Supabase manquante.' }, { status: 500 })
  }

  const token = getBearerToken(req.headers.get('authorization'))
  if (!token) {
    return NextResponse.json({ error: 'Non authentifie.' }, { status: 401 })
  }

  const {
    data: { user },
    error: userError,
  } = await clients.auth.auth.getUser(token)

  if (userError || !user) {
    return NextResponse.json({ error: 'Session invalide.' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const trackId = body?.trackId as string | undefined
  const voteType = body?.voteType as 'yes' | 'no' | undefined

  if (!trackId || !voteType || !['yes', 'no'].includes(voteType)) {
    return NextResponse.json({ error: 'Parametres invalides.' }, { status: 400 })
  }

  try {
    const { data: track, error: trackError } = await clients.admin
    .from('playlist_tracks')
    .select('id, status, expires_at')
    .eq('id', trackId)
    .maybeSingle()

    if (trackError) {
      return NextResponse.json({ error: trackError.message }, { status: 500 })
    }

    if (!track || track.status !== 'active') {
      return NextResponse.json({ error: 'Cette musique ne fait plus partie de la playlist active.' }, { status: 404 })
    }

    if (new Date(track.expires_at).getTime() <= Date.now()) {
      return NextResponse.json({ error: 'Les votes de cette semaine sont figes.' }, { status: 409 })
    }

    const { start, end } = getParisDayBounds()
    const { data: todayVotes, error: todayVotesError } = await clients.admin
      .from('playlist_votes')
      .select('id, vote_type')
      .eq('user_id', user.id)
      .eq('vote_type', voteType)
      .gte('created_at', start)
      .lt('created_at', end)
      .limit(1)

    if (todayVotesError) {
      return NextResponse.json({ error: todayVotesError.message }, { status: 500 })
    }

    if ((todayVotes || []).length > 0) {
      return NextResponse.json({ error: `Tu as deja utilise ton vote ${voteType === 'yes' ? 'OUI' : 'NON'} aujourd hui.` }, { status: 409 })
    }

    const { error: insertError } = await clients.admin
      .from('playlist_votes')
      .insert([
        {
          track_id: trackId,
          user_id: user.id,
          vote_type: voteType,
        },
      ])

    if (insertError) {
      if ((insertError as any).code === '23505') {
        return NextResponse.json({ error: `Tu as deja vote ${voteType} pour ce son.` }, { status: 409 })
      }
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    const { data: votes } = await clients.admin
      .from('playlist_votes')
      .select('vote_type')
      .eq('track_id', trackId)

    const yesVotes = (votes || []).filter((v) => v.vote_type === 'yes').length
    const noVotes = (votes || []).filter((v) => v.vote_type === 'no').length

    return NextResponse.json({
      success: true,
      yesVotes,
      noVotes,
      score: yesVotes - noVotes,
    })
  } catch (error) {
    return NextResponse.json({ error: getSchemaErrorMessage(error) }, { status: 500 })
  }
}
