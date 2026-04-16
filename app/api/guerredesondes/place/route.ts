import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getGenreColor } from '@/lib/colors'

const BOARD_WIDTH = 20
const BOARD_HEIGHT = 20

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

const safeHours = () => {
  const parsed = Number(process.env.ONDES_COOLDOWN_HOURS || '2')
  if (!Number.isFinite(parsed)) return 2
  if (parsed < 2) return 2
  if (parsed > 3) return 3
  return parsed
}

export async function POST(req: NextRequest) {
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

  const body = await req.json().catch(() => null)
  const x = Number(body?.x)
  const y = Number(body?.y)
  const trackId = body?.trackId as string | undefined

  if (!Number.isInteger(x) || !Number.isInteger(y) || !trackId) {
    return NextResponse.json({ error: 'Parametres invalides.' }, { status: 400 })
  }

  if (x < 0 || x >= BOARD_WIDTH || y < 0 || y >= BOARD_HEIGHT) {
    return NextResponse.json({ error: 'Coordonnees hors plateau.' }, { status: 400 })
  }

  const { data: track, error: trackError } = await clients.admin
    .from('titre')
    .select('id, nom_titre, nom_artiste, genre, sous_genre')
    .eq('id', trackId)
    .maybeSingle()

  if (trackError) {
    return NextResponse.json({ error: trackError.message }, { status: 500 })
  }

  if (!track) {
    return NextResponse.json({ error: 'Musique introuvable.' }, { status: 404 })
  }

  const cooldownSeconds = Math.floor(safeHours() * 3600)
  const now = new Date()

  const { data: playerRow, error: playerError } = await clients.admin
    .from('wave_players')
    .select('next_place_at, placements_count')
    .eq('user_id', user.id)
    .maybeSingle()

  if (playerError) {
    if ((playerError as { code?: string }).code === '42P01') {
      return NextResponse.json(
        { error: 'Tables Guerre des Ondes absentes. Execute le SQL db/guerredesondes.sql dans Supabase.' },
        { status: 500 }
      )
    }
    return NextResponse.json({ error: playerError.message }, { status: 500 })
  }

  const nextAllowedTs = playerRow?.next_place_at ? new Date(playerRow.next_place_at).getTime() : 0
  const remainingSec = Math.max(0, Math.ceil((nextAllowedTs - now.getTime()) / 1000))

  if (remainingSec > 0) {
    return NextResponse.json(
      {
        error: 'Cooldown actif.',
        cooldown: {
          remainingSec,
          nextPlaceAt: playerRow?.next_place_at,
        },
      },
      { status: 429 }
    )
  }

  const color = getGenreColor(track.genre, track.sous_genre)
  const placedAt = now.toISOString()

  const { error: upsertTileError } = await clients.admin
    .from('wave_tiles_current')
    .upsert(
      [
        {
          x,
          y,
          track_id: trackId,
          color_hex: color,
          placed_by: user.id,
          placed_at: placedAt,
        },
      ],
      { onConflict: 'x,y' }
    )

  if (upsertTileError && (upsertTileError as { code?: string }).code !== '42P01') {
    return NextResponse.json({ error: upsertTileError.message }, { status: 500 })
  }

  const { error: historyError } = await clients.admin
    .from('wave_tile_history')
    .insert([
      {
        x,
        y,
        track_id: trackId,
        color_hex: color,
        placed_by: user.id,
        placed_at: placedAt,
      },
    ])

  if (historyError) {
    if ((historyError as { code?: string }).code === '42P01') {
      return NextResponse.json(
        { error: 'Table wave_tile_history absente. Execute le SQL db/guerredesondes.sql dans Supabase.' },
        { status: 500 }
      )
    }
    return NextResponse.json({ error: historyError.message }, { status: 500 })
  }

  const nextPlaceAt = new Date(now.getTime() + cooldownSeconds * 1000).toISOString()
  const placementsCount = Number(playerRow?.placements_count || 0) + 1

  const { error: playerUpsertError } = await clients.admin
    .from('wave_players')
    .upsert(
      [
        {
          user_id: user.id,
          last_place_at: placedAt,
          next_place_at: nextPlaceAt,
          cooldown_seconds: cooldownSeconds,
          placements_count: placementsCount,
          updated_at: now.toISOString(),
        },
      ],
      { onConflict: 'user_id' }
    )

  if (playerUpsertError) {
    return NextResponse.json({ error: playerUpsertError.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    tile: {
      x,
      y,
      trackId,
      color,
      placedAt,
      placedBy: user.id,
      trackTitle: track.nom_titre,
      trackArtist: track.nom_artiste,
    },
    cooldown: {
      remainingSec: cooldownSeconds,
      nextPlaceAt,
    },
  })
}
