import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const getClients = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY || anon
  if (!url || !anon || !service) return null
  return {
    admin: createClient(url, service),
    auth: createClient(url, anon),
  }
}

export async function POST(req: NextRequest) {
  const clients = getClients()
  if (!clients) {
    return NextResponse.json({ error: 'Configuration Supabase manquante.' }, { status: 500 })
  }

  const header = req.headers.get('authorization') || ''
  if (!header.toLowerCase().startsWith('bearer ')) {
    return NextResponse.json({ error: 'Non authentifie.' }, { status: 401 })
  }
  const token = header.slice(7)

  const { data: { user }, error: userError } = await clients.auth.auth.getUser(token)
  if (userError || !user) {
    return NextResponse.json({ error: 'Session invalide.' }, { status: 401 })
  }

  const { data: digger } = await clients.admin
    .from('digger')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (!digger || digger.role !== 'admin') {
    return NextResponse.json({ error: 'Acces reserve admin.' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const trackId = body?.trackId as string | undefined

  if (!trackId) {
    return NextResponse.json({ error: 'trackId manquant.' }, { status: 400 })
  }

  const { data: track } = await clients.admin
    .from('playlist_tracks')
    .select('id, status')
    .eq('id', trackId)
    .maybeSingle()

  if (!track) {
    return NextResponse.json({ error: 'Piste introuvable.' }, { status: 404 })
  }

  const { error: updateError } = await clients.admin
    .from('playlist_tracks')
    .update({
      status: 'removed',
      removed_at: new Date().toISOString(),
      removed_reason: 'supprimee manuellement par admin',
    })
    .eq('id', trackId)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, removed: trackId })
}
