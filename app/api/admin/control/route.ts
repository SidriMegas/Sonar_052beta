import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'

const SearchParamsSchema = z.object({
  q: z.string().trim().min(2).max(100),
})

const ActionSchema = z.object({
  action: z.enum(['suspend-user', 'delete-user', 'delete-titre', 'delete-prod']),
  id: z.string().trim().min(1),
})

type AdminControlDatabase = {
  public: {
    Tables: {
      digger: {
        Row: {
          id: string
          username: string | null
          email: string | null
          role: string | null
          created_at: string | null
        }
        Insert: {
          id: string
          username: string
          email?: string | null
          role?: string | null
          created_at?: string | null
        }
        Update: {
          username?: string | null
          email?: string | null
          role?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      prod: {
        Row: {
          id: string
          nom_titre: string
          nom_artiste: string
          youtube_id: string | null
          user_id: string
          likes: number | null
          points: number | null
          created_at: string
        }
        Insert: {
          id?: string
          nom_titre: string
          nom_artiste: string
          youtube_id?: string | null
          user_id: string
          likes?: number | null
          points?: number | null
          created_at?: string
        }
        Update: {
          nom_titre?: string
          nom_artiste?: string
          youtube_id?: string | null
          user_id?: string
          likes?: number | null
          points?: number | null
          created_at?: string
        }
        Relationships: []
      }
      titre: {
        Row: {
          id: string
          nom_titre: string
          nom_artiste: string
          youtube_id: string | null
          user_id: string | null
          likes: number | null
          points: number | null
          created_at: string | null
        }
        Insert: {
          id?: string
          nom_titre: string
          nom_artiste: string
          youtube_id?: string | null
          user_id?: string | null
          likes?: number | null
          points?: number | null
          created_at?: string | null
        }
        Update: {
          nom_titre?: string
          nom_artiste?: string
          youtube_id?: string | null
          user_id?: string | null
          likes?: number | null
          points?: number | null
          created_at?: string | null
        }
        Relationships: []
      }
      tlmvpsp_rounds: {
        Row: {
          id: string
          king_titre_id: string
          challenger_titre_id: string
          winner_titre_id: string | null
        }
        Insert: {
          id?: string
          king_titre_id: string
          challenger_titre_id: string
          winner_titre_id?: string | null
        }
        Update: {
          king_titre_id?: string
          challenger_titre_id?: string
          winner_titre_id?: string | null
        }
        Relationships: []
      }
      playlist_tracks: {
        Row: {
          id: string
          titre_id: string
        }
        Insert: {
          id?: string
          titre_id: string
        }
        Update: {
          titre_id?: string
        }
        Relationships: []
      }
      playlist_votes: {
        Row: {
          id: string
          track_id: string
        }
        Insert: {
          id?: string
          track_id: string
        }
        Update: {
          track_id?: string
        }
        Relationships: []
      }
      playlist_suggestions: {
        Row: {
          id: string
          titre_id: string
          accepted_track_id: string | null
        }
        Insert: {
          id?: string
          titre_id: string
          accepted_track_id?: string | null
        }
        Update: {
          titre_id?: string
          accepted_track_id?: string | null
        }
        Relationships: []
      }
      tlmvpsp_autopromo_entries: {
        Row: {
          id: string
          titre_id: string
        }
        Insert: {
          id?: string
          titre_id: string
        }
        Update: {
          titre_id?: string
        }
        Relationships: []
      }
      wave_tiles_current: {
        Row: {
          track_id: string
        }
        Insert: {
          track_id: string
        }
        Update: {
          track_id?: string
        }
        Relationships: []
      }
      wave_tile_history: {
        Row: {
          track_id: string
        }
        Insert: {
          track_id: string
        }
        Update: {
          track_id?: string
        }
        Relationships: []
      }
      vote: {
        Row: {
          id: string
          titre_id: string | null
          prod_id: string | null
        }
        Insert: {
          id?: string
          titre_id?: string | null
          prod_id?: string | null
        }
        Update: {
          titre_id?: string | null
          prod_id?: string | null
        }
        Relationships: []
      }
      feedback: {
        Row: {
          id: string
          titre_id: string | null
          prod_id: string | null
        }
        Insert: {
          id?: string
          titre_id?: string | null
          prod_id?: string | null
        }
        Update: {
          titre_id?: string | null
          prod_id?: string | null
        }
        Relationships: []
      }
      bottles: {
        Row: {
          id: string
          titre_id: string | null
        }
        Insert: {
          id?: string
          titre_id?: string | null
        }
        Update: {
          titre_id?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          related_titre_id: string | null
          related_prod_id: string | null
        }
        Insert: {
          id?: string
          related_titre_id?: string | null
          related_prod_id?: string | null
        }
        Update: {
          related_titre_id?: string | null
          related_prod_id?: string | null
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

type AdminControlClient = SupabaseClient<AdminControlDatabase>

const getClients = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !anon || !service) return null

  return {
    auth: createClient<AdminControlDatabase>(url, anon),
    admin: createClient<AdminControlDatabase>(url, service),
  }
}

const getBearerToken = (req: NextRequest) => {
  const header = req.headers.get('authorization') || ''
  if (!header.toLowerCase().startsWith('bearer ')) return null
  return header.slice(7)
}

const fail = (error: string, status: number, details?: string) =>
  NextResponse.json({ error, details }, { status })

async function requireAdmin(req: NextRequest) {
  const clients = getClients()
  if (!clients) {
    return { errorResponse: fail('Configuration Supabase manquante.', 500) }
  }

  const token = getBearerToken(req)
  if (!token) {
    return { errorResponse: fail('Token manquant.', 401) }
  }

  const {
    data: { user },
    error: userError,
  } = await clients.auth.auth.getUser(token)

  if (userError || !user) {
    return { errorResponse: fail('Session invalide.', 401) }
  }

  const { data: digger, error: diggerError } = await clients.admin
    .from('digger')
    .select('id, role, username')
    .eq('id', user.id)
    .maybeSingle()

  if (diggerError) {
    return { errorResponse: fail('Erreur lecture admin.', 500, diggerError.message) }
  }

  if (!digger || digger.role !== 'admin') {
    return { errorResponse: fail('Acces reserve admin.', 403) }
  }

  return {
    clients,
    currentUserId: user.id,
    currentUsername: digger.username || 'admin',
  }
}

async function deleteProd(admin: AdminControlClient, prodId: string) {
  const cleanupOps = [
    admin.from('vote').delete().eq('prod_id', prodId),
    admin.from('feedback').delete().eq('prod_id', prodId),
    admin.from('notifications').delete().eq('related_prod_id', prodId),
  ]

  const cleanupResults = await Promise.all(cleanupOps)
  const cleanupError = cleanupResults.find((result) => result.error)
  if (cleanupError?.error) {
    throw new Error(cleanupError.error.message)
  }

  const { error: deleteError } = await admin.from('prod').delete().eq('id', prodId)
  if (deleteError) throw new Error(deleteError.message)
}

async function deleteTitre(admin: AdminControlClient, titreId: string) {
  const { data: rounds, error: roundsError } = await admin
    .from('tlmvpsp_rounds')
    .select('id')
    .or(`king_titre_id.eq.${titreId},challenger_titre_id.eq.${titreId},winner_titre_id.eq.${titreId}`)
    .limit(1)

  if (roundsError) throw new Error(roundsError.message)
  if (rounds && rounds.length > 0) {
    throw new Error('Ce titre est lie a des rounds TLMVPSP. Supprime d abord ces rounds.')
  }

  const { data: playlistTracks, error: playlistTracksError } = await admin
    .from('playlist_tracks')
    .select('id')
    .eq('titre_id', titreId)
    .returns<{ id: string }[]>()

  if (playlistTracksError) throw new Error(playlistTracksError.message)

  const playlistTrackIds = (playlistTracks || []).map((row) => row.id)

  if (playlistTrackIds.length > 0) {
    const voteDelete = await admin.from('playlist_votes').delete().in('track_id', playlistTrackIds)
    if (voteDelete.error) throw new Error(voteDelete.error.message)

    const suggestionDetach = await admin
      .from('playlist_suggestions')
      .update({ accepted_track_id: null })
      .in('accepted_track_id', playlistTrackIds)

    if (suggestionDetach.error) throw new Error(suggestionDetach.error.message)

    const playlistDelete = await admin.from('playlist_tracks').delete().eq('titre_id', titreId)
    if (playlistDelete.error) throw new Error(playlistDelete.error.message)
  }

  const cleanupOps = [
    admin.from('playlist_suggestions').delete().eq('titre_id', titreId),
    admin.from('tlmvpsp_autopromo_entries').delete().eq('titre_id', titreId),
    admin.from('wave_tiles_current').delete().eq('track_id', titreId),
    admin.from('wave_tile_history').delete().eq('track_id', titreId),
    admin.from('vote').delete().eq('titre_id', titreId),
    admin.from('feedback').delete().eq('titre_id', titreId),
    admin.from('bottles').delete().eq('titre_id', titreId),
    admin.from('notifications').delete().eq('related_titre_id', titreId),
  ]

  const cleanupResults = await Promise.all(cleanupOps)
  const cleanupError = cleanupResults.find((result) => result.error)
  if (cleanupError?.error) throw new Error(cleanupError.error.message)

  const { error: deleteError } = await admin.from('titre').delete().eq('id', titreId)
  if (deleteError) throw new Error(deleteError.message)
}

export async function GET(req: NextRequest) {
  const adminCheck = await requireAdmin(req)
  if ('errorResponse' in adminCheck) return adminCheck.errorResponse

  const { searchParams } = new URL(req.url)
  const parseResult = SearchParamsSchema.safeParse({ q: searchParams.get('q') || '' })

  if (!parseResult.success) {
    return fail('Recherche invalide.', 400, JSON.stringify(parseResult.error.issues))
  }

  const q = parseResult.data.q
  const pattern = `%${q.replace(/[%]/g, '')}%`
  const { admin } = adminCheck.clients

  const [usersResult, titresResult, prodsResult] = await Promise.all([
    admin
      .from('digger')
      .select('id, username, email, role, created_at')
      .or(`username.ilike.${pattern},email.ilike.${pattern}`)
      .order('created_at', { ascending: false })
      .limit(12),
    admin
      .from('titre')
      .select('id, nom_titre, nom_artiste, youtube_id, user_id, likes, points, created_at')
      .or(`nom_titre.ilike.${pattern},nom_artiste.ilike.${pattern},youtube_id.ilike.${pattern}`)
      .order('created_at', { ascending: false })
      .limit(12),
    admin
      .from('prod')
      .select('id, nom_titre, nom_artiste, youtube_id, user_id, likes, points, created_at')
      .or(`nom_titre.ilike.${pattern},nom_artiste.ilike.${pattern},youtube_id.ilike.${pattern}`)
      .order('created_at', { ascending: false })
      .limit(12),
  ])

  if (usersResult.error) return fail('Erreur recherche utilisateurs.', 500, usersResult.error.message)
  if (titresResult.error) return fail('Erreur recherche titres.', 500, titresResult.error.message)
  if (prodsResult.error) return fail('Erreur recherche prods.', 500, prodsResult.error.message)

  return NextResponse.json({
    users: usersResult.data || [],
    titres: titresResult.data || [],
    prods: prodsResult.data || [],
  })
}

export async function POST(req: NextRequest) {
  const adminCheck = await requireAdmin(req)
  if ('errorResponse' in adminCheck) return adminCheck.errorResponse

  const body = await req.json().catch(() => null)
  const parseResult = ActionSchema.safeParse(body)

  if (!parseResult.success) {
    return fail('Action invalide.', 400, JSON.stringify(parseResult.error.issues))
  }

  const { action, id } = parseResult.data
  const { admin } = adminCheck.clients

  if (action === 'suspend-user') {
    if (id === adminCheck.currentUserId) {
      return fail('Tu ne peux pas te suspendre toi-meme.', 400)
    }

    const { error: suspendError } = await admin.auth.admin.updateUserById(id, {
      ban_duration: '876000h',
    })

    if (suspendError) return fail('Impossible de suspendre cet utilisateur.', 500, suspendError.message)

    const { error: roleError } = await admin.from('digger').update({ role: 'suspended' }).eq('id', id)
    if (roleError) return fail('Utilisateur suspendu mais role non mis a jour.', 500, roleError.message)

    return NextResponse.json({ ok: true, message: 'Utilisateur suspendu.' })
  }

  if (action === 'delete-user') {
    if (id === adminCheck.currentUserId) {
      return fail('Tu ne peux pas supprimer ton propre compte ici.', 400)
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(id, true)
    if (deleteError) return fail('Impossible de supprimer cet utilisateur.', 500, deleteError.message)

    const { error: roleError } = await admin.from('digger').update({ role: 'deleted' }).eq('id', id)
    if (roleError) return fail('Compte supprime mais role non mis a jour.', 500, roleError.message)

    return NextResponse.json({ ok: true, message: 'Utilisateur supprime en soft delete.' })
  }

  try {
    if (action === 'delete-prod') {
      await deleteProd(admin, id)
      return NextResponse.json({ ok: true, message: 'Prod supprimee.' })
    }

    await deleteTitre(admin, id)
    return NextResponse.json({ ok: true, message: 'Titre supprime.' })
  } catch (error) {
    return fail(
      'Impossible de supprimer cet element.',
      500,
      error instanceof Error ? error.message : 'Erreur inconnue.'
    )
  }
}