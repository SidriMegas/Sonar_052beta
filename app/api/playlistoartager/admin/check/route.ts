import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY || anon

  if (!url || !anon || !service) {
    return NextResponse.json({ error: 'Configuration manquante.' }, { status: 500 })
  }

  const header = req.headers.get('authorization') || ''
  if (!header.toLowerCase().startsWith('bearer ')) {
    return NextResponse.json({ isAdmin: false, error: 'Token manquant.' }, { status: 401 })
  }
  const token = header.slice(7)

  // Valide le token via le client anon (GoTrue)
  const authClient = createClient(url, anon)
  const { data: { user }, error: userError } = await authClient.auth.getUser(token)

  if (userError || !user) {
    return NextResponse.json({ isAdmin: false, error: 'Session invalide.' }, { status: 401 })
  }

  // Lit le rôle avec la service role key (bypasse toute RLS)
  const adminClient = createClient(url, service)
  const { data: digger, error: diggerError } = await adminClient
    .from('digger')
    .select('role, username')
    .eq('id', user.id)
    .maybeSingle()

  if (diggerError) {
    return NextResponse.json({ isAdmin: false, error: diggerError.message }, { status: 500 })
  }

  return NextResponse.json({
    isAdmin: digger?.role === 'admin',
    role: digger?.role ?? null,
    username: digger?.username ?? null,
  })
}
