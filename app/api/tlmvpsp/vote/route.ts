import { NextRequest, NextResponse } from 'next/server'
import {
  ensureActiveRound,
  getBearerToken,
  getClients,
  getSchemaErrorMessage,
  type TlmvpspChoice,
  type TlmvpspMode,
} from '../_lib'

export async function POST(req: NextRequest) {
  const clients = getClients()
  if (!clients) {
    return NextResponse.json({ error: 'Configuration Supabase manquante.' }, { status: 500 })
  }

  try {
    const token = getBearerToken(req.headers.get('authorization'))
    if (!token) {
      return NextResponse.json({ error: 'Connecte-toi pour voter.' }, { status: 401 })
    }

    const {
      data: { user },
      error: userError,
    } = await clients.auth.auth.getUser(token)

    if (userError || !user) {
      return NextResponse.json({ error: 'Session invalide.' }, { status: 401 })
    }

    const body = await req.json().catch(() => null)
    const roundId = body?.roundId as string | undefined
    const mode = body?.mode as TlmvpspMode | undefined
    const choice = body?.choice as TlmvpspChoice | undefined

    if (!roundId || !mode || !choice || !['global', 'autopromo'].includes(mode) || !['king', 'challenger'].includes(choice)) {
      return NextResponse.json({ error: 'Parametres invalides.' }, { status: 400 })
    }

    const activeRound = await ensureActiveRound(clients.admin, mode)
    if (activeRound.id !== roundId) {
      return NextResponse.json({ error: 'Ce duel est termine. Recharge la page pour voter sur le round courant.' }, { status: 409 })
    }

    const { error: insertError } = await clients.admin.from('tlmvpsp_votes').insert([
      {
        round_id: roundId,
        user_id: user.id,
        choice,
      },
    ])

    if (insertError) {
      if ((insertError as { code?: string }).code === '23505') {
        return NextResponse.json({ error: 'Tu as deja vote sur ce duel.' }, { status: 409 })
      }
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, choice })
  } catch (error) {
    return NextResponse.json({ error: getSchemaErrorMessage(error) }, { status: 500 })
  }
}