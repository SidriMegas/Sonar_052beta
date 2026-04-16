import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

const LikeToggleSchema = z.object({
  trackId: z.string(),
  trackOwnerId: z.string(),
  vuesActuelles: z.number().int().nonnegative(),
  targetType: z.enum(['prod', 'titre']),
})

// Même logique que dans le composant
function getPointsFromViews(vues: number): number {
  if (vues <= 999) return 100
  if (vues <= 4999) return 85
  if (vues <= 9999) return 70
  if (vues <= 49000) return 50
  if (vues <= 100000) return 25
  return 5
}

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

const fail = (error: string, status: number, details?: string) =>
  NextResponse.json({ error, details }, { status })

const isBrokenVoteConstraintError = (message?: string) => {
  if (!message) return false
  return message.includes('vote_unique_fix') || message.includes('vote_titre_id_key')
}

export async function GET(req: NextRequest) {
  const clients = getClients()
  if (!clients) return fail('Configuration Supabase manquante.', 500)

  const token = getBearerToken(req)
  if (!token) return fail('Non authentifié.', 401)

  const { data: { user }, error: userError } = await clients.auth.auth.getUser(token)
  if (userError || !user) return fail('Session invalide.', 401)

  const { searchParams } = new URL(req.url)
  const trackId = searchParams.get('trackId') || ''
  const targetType = searchParams.get('targetType')

  const parseResult = z.object({
    trackId: z.string().uuid().or(z.string().min(1)),
    targetType: z.enum(['prod', 'titre']),
  }).safeParse({
    trackId,
    targetType,
  })

  if (!parseResult.success) {
    return fail('Paramètres invalides.', 400, JSON.stringify(parseResult.error.issues))
  }

  const voteTargetColumn = parseResult.data.targetType === 'prod' ? 'prod_id' : 'titre_id'

  const { data, error } = await clients.admin
    .from('vote')
    .select('id')
    .eq(voteTargetColumn, parseResult.data.trackId)
    .eq('user_id', user.id)
    .limit(1)

  if (error) return fail('Erreur lecture vote.', 500)

  return NextResponse.json({ liked: (data?.length || 0) > 0 })
}

export async function POST(req: NextRequest) {
  const clients = getClients()
  if (!clients) return fail('Configuration Supabase manquante.', 500)

  const token = getBearerToken(req)
  if (!token) return fail('Non authentifié.', 401)

  const { data: { user }, error: userError } = await clients.auth.auth.getUser(token)
  if (userError || !user) return fail('Session invalide.', 401)

  const body = await req.json().catch(() => ({}))
  const parseResult = LikeToggleSchema.safeParse({
    trackId: body.trackId,
    trackOwnerId: body.trackOwnerId,
    vuesActuelles: Number(body.vuesActuelles || 0),
    targetType: body.targetType,
  })

  if (!parseResult.success) {
    return fail('Paramètres invalides.', 400, JSON.stringify(parseResult.error.issues))
  }

  const { trackId, trackOwnerId, vuesActuelles, targetType } = parseResult.data
  const targetTable = targetType === 'prod' ? 'prod' : 'titre'
  const voteTargetColumn = targetType === 'prod' ? 'prod_id' : 'titre_id'

  if (user.id === trackOwnerId) {
    return fail('Interdit de voter pour soi-même.', 400)
  }

  const pts = getPointsFromViews(vuesActuelles)

  // Vérifier si le morceau existe
  const { data: track, error: trackError } = await clients.admin
    .from(targetTable)
    .select('id, likes, points')
    .eq('id', trackId)
    .maybeSingle()

  if (trackError || !track) return fail('Morceau introuvable.', 404)

  // Vérifier si un ou plusieurs votes existent déjà
  const { data: existingVotes, error: voteReadError } = await clients.admin
    .from('vote')
    .select('id, points')
    .eq(voteTargetColumn, trackId)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (voteReadError) return fail('Erreur lecture vote.', 500)

  // --- UNLIKE : retirer le like, enlever les points à la musique seulement ---
  if (existingVotes && existingVotes.length > 0) {
    const savedPts = existingVotes.reduce((sum, vote) => sum + Number(vote.points || 0), 0)
    const likesToRemove = existingVotes.length
    const nextLikes = Math.max(0, Number(track.likes || 0) - likesToRemove)
    const nextPoints = Math.max(0, Number(track.points || 0) - savedPts)

    await clients.admin
      .from('vote')
      .delete()
      .eq(voteTargetColumn, trackId)
      .eq('user_id', user.id)
    await clients.admin.from(targetTable).update({ likes: nextLikes, points: nextPoints }).eq('id', trackId)
    // L'auteur garde ses points même après un unlike
    return NextResponse.json({ liked: false, likesCount: nextLikes })
  }

  // --- LIKE : ajouter le vote, points à la musique ET à l'auteur ---
  const { error: insertVoteError } = await clients.admin
    .from('vote')
    .insert([{ [voteTargetColumn]: trackId, user_id: user.id, points: pts, like: 1 }])

  if (insertVoteError) {
    if (isBrokenVoteConstraintError(insertVoteError.message)) return fail('Déjà voté (Contrainte SQL).', 409)
    return fail('Impossible de créer le vote.', 500)
  }

  const nextLikes = Number(track.likes || 0) + 1
  const nextPoints = Number(track.points || 0) + pts

  await clients.admin.from(targetTable).update({ likes: nextLikes, points: nextPoints }).eq('id', trackId)

  // Points gagnés par l'auteur (définitifs, même si unlike plus tard)
  await clients.admin.from('points_history').insert([{
    user_id: trackOwnerId,
    amount: pts,
    type: 'like',
    reason: `Vote sur ${targetType} ${trackId}`
  }])

  return NextResponse.json({ liked: true, likesCount: nextLikes })
}

