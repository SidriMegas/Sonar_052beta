import { NextRequest, NextResponse } from 'next/server'
import { ensureEditableCycle, fillWeekTracks, getBearerToken, getClients, getSchemaErrorMessage, PLAYLIST_ACTIVE_TRACKS } from '../../_lib'

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

  const { data: digger } = await clients.admin
    .from('digger')
    .select('id, role')
    .eq('id', user.id)
    .maybeSingle()

  if (!digger || digger.role !== 'admin') {
    return NextResponse.json({ error: 'Acces reserve admin.' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const titreIds = Array.isArray(body?.titreIds) ? body.titreIds.filter((v: unknown) => typeof v === 'string') : []

  try {
    const cycle = await ensureEditableCycle(clients.admin, user.id)
    const result = await fillWeekTracks(clients.admin, cycle, user.id, titreIds)

    return NextResponse.json({
      success: true,
      inserted: result.inserted,
      cycleId: cycle.id,
      weekNumber: cycle.current_week,
      message:
        result.inserted > 0
          ? `Semaine ${cycle.current_week} chargee (${result.inserted}/${PLAYLIST_ACTIVE_TRACKS}).`
          : `Aucun nouveau titre a ajouter pour la semaine ${cycle.current_week}.`,
    })
  } catch (error) {
    return NextResponse.json({ error: getSchemaErrorMessage(error) }, { status: 500 })
  }
}
