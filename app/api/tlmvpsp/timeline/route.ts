import { NextRequest, NextResponse } from 'next/server'
import { getClients, getSchemaErrorMessage, loadTimeline, type TlmvpspMode } from '../_lib'

export async function GET(req: NextRequest) {
  const clients = getClients()
  if (!clients) {
    return NextResponse.json({ error: 'Configuration Supabase manquante.' }, { status: 500 })
  }

  try {
    const modeParam = req.nextUrl.searchParams.get('mode')
    const mode: TlmvpspMode = modeParam === 'autopromo' ? 'autopromo' : 'global'
    const timeline = await loadTimeline(clients.admin, mode)

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      ...timeline,
    })
  } catch (error) {
    return NextResponse.json({ error: getSchemaErrorMessage(error) }, { status: 500 })
  }
}