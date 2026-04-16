import { NextRequest, NextResponse } from 'next/server'
import { getActiveCycle, getBearerToken, getClients, getSchemaErrorMessage } from '../_lib'

const COOLDOWN_HOURS = 48

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
  const titreId = body?.titreId as string | undefined

  if (!titreId) {
    return NextResponse.json({ error: 'titreId manquant.' }, { status: 400 })
  }

  try {
    const activeCycle = await getActiveCycle(clients.admin)
    if (!activeCycle) {
      return NextResponse.json({ error: 'Aucun cycle actif. Attends qu un admin relance Playlistoartager.' }, { status: 409 })
    }

    const { data: titre, error: titreError } = await clients.admin
    .from('titre')
    .select('id')
    .eq('id', titreId)
    .maybeSingle()

    if (titreError) {
      return NextResponse.json({ error: titreError.message }, { status: 500 })
    }
    if (!titre) {
      return NextResponse.json({ error: 'Titre introuvable.' }, { status: 404 })
    }

    const { data: activeAlready } = await clients.admin
      .from('playlist_tracks')
      .select('id')
      .eq('cycle_id', activeCycle.id)
      .eq('titre_id', titreId)
      .maybeSingle()

    if (activeAlready) {
      return NextResponse.json({ error: 'Ce son fait deja partie de ce cycle Playlistoartager.' }, { status: 409 })
    }

    const { data: suggestedThisCycle } = await clients.admin
      .from('playlist_suggestions')
      .select('id')
      .eq('titre_id', titreId)
      .gte('created_at', activeCycle.started_at)
      .maybeSingle()

    if (suggestedThisCycle) {
      return NextResponse.json({ error: 'Ce son a deja ete propose dans ce jeu. Attends le prochain cycle.' }, { status: 409 })
    }

    const { data: lastSuggestion } = await clients.admin
      .from('playlist_suggestions')
      .select('created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (lastSuggestion?.created_at) {
      const lastTs = new Date(lastSuggestion.created_at).getTime()
      const nextAllowed = new Date(lastTs + COOLDOWN_HOURS * 60 * 60 * 1000)
      if (Date.now() < nextAllowed.getTime()) {
        return NextResponse.json(
          {
            error: 'Cooldown actif: une proposition tous les 2 jours.',
            nextAllowedAt: nextAllowed.toISOString(),
          },
          { status: 429 }
        )
      }
    }

    const { error: insertError } = await clients.admin
      .from('playlist_suggestions')
      .insert([
        {
          user_id: user.id,
          titre_id: titreId,
          status: 'pending',
        },
      ])

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Proposition enregistree pour une prochaine semaine.' })
  } catch (error) {
    return NextResponse.json({ error: getSchemaErrorMessage(error) }, { status: 500 })
  }
}
