import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const getClients = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !anon || !service) return null

  return {
    admin: createClient(url, service),
    auth: createClient(url, anon),
  }
}

const getBearerToken = (req: NextRequest) => {
  const header = req.headers.get('authorization') || ''
  if (!header.toLowerCase().startsWith('bearer ')) return null
  return header.slice(7)
}

export async function GET(req: NextRequest) {
  const clients = getClients()
  if (!clients) {
    return NextResponse.json({ error: 'Configuration Supabase manquante.' }, { status: 500 })
  }

  const token = getBearerToken(req)
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

  const { data: playerRow, error } = await clients.admin
    .from('wave_players')
    .select('next_place_at, cooldown_seconds, placements_count')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const nowTs = Date.now()
  const nextTs = playerRow?.next_place_at ? new Date(playerRow.next_place_at).getTime() : 0
  const remainingSec = Math.max(0, Math.ceil((nextTs - nowTs) / 1000))

  return NextResponse.json({
    canPlaceNow: remainingSec === 0,
    remainingSec,
    nextPlaceAt: playerRow?.next_place_at || null,
    cooldownSeconds: playerRow?.cooldown_seconds || null,
    placementsCount: playerRow?.placements_count || 0,
  })
}
