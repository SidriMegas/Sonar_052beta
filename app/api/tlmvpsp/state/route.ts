import { NextRequest, NextResponse } from 'next/server'
import {
  ensureActiveRound,
  getBearerToken,
  getClients,
  getSchemaErrorMessage,
  loadMyPoints,
  loadMyQueuedAutopromo,
  loadMyTitles,
  loadMyVotes,
} from '../_lib'

export async function GET(req: NextRequest) {
  const clients = getClients()
  if (!clients) {
    return NextResponse.json({ error: 'Configuration Supabase manquante.' }, { status: 500 })
  }

  try {
    const token = getBearerToken(req.headers.get('authorization'))
    let userId: string | null = null

    if (token) {
      const {
        data: { user },
      } = await clients.auth.auth.getUser(token)
      userId = user?.id || null
    }

    const globalRound = await ensureActiveRound(clients.admin, 'global')
    const autopromoRound = await ensureActiveRound(clients.admin, 'autopromo')
    const roundIds = [globalRound.id, autopromoRound.id]

    const [points, myTitles, myVotes, queuedAutopromo] = await Promise.all([
      loadMyPoints(clients.admin, userId),
      loadMyTitles(clients.admin, userId),
      loadMyVotes(clients.admin, userId, roundIds),
      loadMyQueuedAutopromo(clients.admin, userId),
    ])

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      modes: {
        global: globalRound,
        autopromo: autopromoRound,
      },
      me: {
        userId,
        points,
        titles: myTitles,
        votes: myVotes,
        queuedAutopromo,
      },
    })
  } catch (error) {
    return NextResponse.json({ error: getSchemaErrorMessage(error) }, { status: 500 })
  }
}