import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const getAdminClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !service) return null
  return createClient(url, service)
}

type RawTile = {
  x: number
  y: number
  track_id: string
  color_hex: string
  placed_at: string
  placed_by: string
}

async function enrichTiles(admin: any, rows: RawTile[]) {
  if (rows.length === 0) return []

  const trackIds = Array.from(new Set(rows.map((r) => r.track_id).filter(Boolean)))
  const userIds = Array.from(new Set(rows.map((r) => r.placed_by).filter(Boolean)))

  const [tracksRes, diggersRes] = await Promise.all([
    trackIds.length > 0
      ? admin
          .from('titre')
          .select('id, nom_titre, nom_artiste, youtube_url, youtube_id, likes, points, user_id, vues_actuelles')
          .in('id', trackIds)
      : Promise.resolve({ data: [] as any[], error: null }),
    userIds.length > 0
      ? admin.from('digger').select('id, username, equipped_badge_1, equipped_badge_2').in('id', userIds)
      : Promise.resolve({ data: [] as any[], error: null }),
  ])

  const tracksMap = new Map((tracksRes.data || []).map((t: any) => [t.id, t]))
  const diggersMap = new Map((diggersRes.data || []).map((d: any) => [d.id, d]))

  return rows.map((row) => ({
    ...row,
    digger: diggersMap.has(row.placed_by) ? [diggersMap.get(row.placed_by)] : [],
    titre: tracksMap.has(row.track_id) ? [tracksMap.get(row.track_id)] : [],
  }))
}

export async function GET() {
  const admin = getAdminClient()
  if (!admin) {
    return NextResponse.json({ error: 'Configuration Supabase manquante.' }, { status: 500 })
  }

  const { data, error } = await admin
    .from('wave_tiles_current')
    .select('x, y, track_id, color_hex, placed_at, placed_by')
    .limit(25000)

  if (error && (error as { code?: string }).code !== '42P01') {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if ((data || []).length > 0) {
    const tiles = await enrichTiles(admin, (data || []) as RawTile[])
    return NextResponse.json({
      width: 20,
      height: 20,
      tiles,
    })
  }

  const { data: historyData, error: historyError } = await admin
    .from('wave_tile_history')
    .select('x, y, track_id, color_hex, placed_at, placed_by')
    .order('placed_at', { ascending: false })
    .limit(50000)

  if (historyError) {
    if ((historyError as { code?: string }).code === '42P01') {
      return NextResponse.json(
        { error: 'Tables Guerre des Ondes absentes. Execute le SQL db/guerredesondes.sql dans Supabase.' },
        { status: 500 }
      )
    }
    return NextResponse.json({ error: historyError.message }, { status: 500 })
  }

  const latestByCell = new Map<string, (typeof historyData)[number]>()
  for (const row of historyData || []) {
    const key = `${row.x}:${row.y}`
    if (!latestByCell.has(key)) latestByCell.set(key, row)
  }

  const tiles = await enrichTiles(admin, Array.from(latestByCell.values()) as RawTile[])

  return NextResponse.json({
    width: 20,
    height: 20,
    tiles,
  })
}
