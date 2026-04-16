import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { fillWeekTracks, getActiveCycle, getSchemaErrorMessage, PLAYLIST_TOTAL_WEEKS } from '../_lib'

const getAdminClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !service) return null
  return createClient(url, service)
}

const hasCronAccess = (req: NextRequest) => {
  const expected = process.env.PLAYLISTOARTAGER_CRON_SECRET
  if (!expected) return true
  const received = req.headers.get('x-cron-secret') || ''
  return received === expected
}

const isAdminFromBearer = async (req: NextRequest) => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY || anon

  if (!url || !anon || !service) return false

  const header = req.headers.get('authorization') || ''
  if (!header.toLowerCase().startsWith('bearer ')) return false
  const token = header.slice(7)

  const authClient = createClient(url, anon)
  const adminClient = createClient(url, service)

  const {
    data: { user },
    error,
  } = await authClient.auth.getUser(token)

  if (error || !user) return false

  const { data: digger } = await adminClient
    .from('digger')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  return digger?.role === 'admin'
}

const processRotation = async (admin: SupabaseClient<any>) => {
  const cycle = await getActiveCycle(admin)
  if (!cycle) {
    return { processed: 0, results: [], message: 'Aucun cycle actif.' }
  }

  const { data: activeTracks, error: activeError } = await admin
    .from('playlist_tracks')
    .select('id, titre_id, source, week_number')
    .eq('cycle_id', cycle.id)
    .eq('status', 'active')
    .eq('week_number', cycle.current_week)

  if (activeError) {
    throw new Error(activeError.message)
  }

  const results: Array<Record<string, any>> = []
  const nowIso = new Date().toISOString()

  if ((activeTracks || []).length > 0) {
    const { error: freezeError } = await admin
      .from('playlist_tracks')
      .update({
        status: 'locked',
        locked_at: nowIso,
        expires_at: nowIso,
      })
      .eq('cycle_id', cycle.id)
      .eq('status', 'active')
      .eq('week_number', cycle.current_week)

    if (freezeError) throw new Error(freezeError.message)

    for (const track of activeTracks || []) {
      results.push({
        trackId: track.id,
        action: 'locked_for_playlist',
        weekNumber: cycle.current_week,
        titreId: track.titre_id,
      })
    }
  }

  if (cycle.current_week >= PLAYLIST_TOTAL_WEEKS) {
    const { error: completeError } = await admin
      .from('playlist_cycles')
      .update({
        status: 'completed',
        completed_at: nowIso,
      })
      .eq('id', cycle.id)

    if (completeError) throw new Error(completeError.message)

    return {
      processed: results.length,
      results,
      message: 'Cycle termine. La playlist de 20 titres est figee. Un admin doit relancer le jeu.',
    }
  }

  const nextWeek = cycle.current_week + 1
  const { error: cycleUpdateError } = await admin
    .from('playlist_cycles')
    .update({ current_week: nextWeek })
    .eq('id', cycle.id)

  if (cycleUpdateError) throw new Error(cycleUpdateError.message)

  const updatedCycle = { ...cycle, current_week: nextWeek }
  const fillResult = await fillWeekTracks(admin, updatedCycle, null)

  results.push({
    action: 'new_week_seeded',
    weekNumber: nextWeek,
    inserted: fillResult.inserted,
  })

  return {
    processed: results.length,
    results,
    message: `Semaine ${nextWeek} ouverte avec ${fillResult.inserted} titre(s) actif(s).`,
  }
}

export async function GET(req: NextRequest) {
  if (!hasCronAccess(req)) {
    return NextResponse.json({ error: 'Acces refuse.' }, { status: 401 })
  }

  const admin = getAdminClient()
  if (!admin) {
    return NextResponse.json({ error: 'Configuration Supabase manquante.' }, { status: 500 })
  }

  try {
    const payload = await processRotation(admin)
    return NextResponse.json({ success: true, ...payload })
  } catch (error: any) {
    return NextResponse.json({ error: getSchemaErrorMessage(error) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const isAdmin = await isAdminFromBearer(req)
  if (!isAdmin) {
    return NextResponse.json({ error: 'Acces reserve admin.' }, { status: 403 })
  }

  const admin = getAdminClient()
  if (!admin) {
    return NextResponse.json({ error: 'Configuration Supabase manquante.' }, { status: 500 })
  }

  try {
    const payload = await processRotation(admin)
    return NextResponse.json({ success: true, ...payload })
  } catch (error: any) {
    return NextResponse.json({ error: getSchemaErrorMessage(error) }, { status: 500 })
  }
}
