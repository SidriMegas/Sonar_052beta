import { NextRequest, NextResponse } from 'next/server'
import {
  AUTOPROMO_ENTRY_COST,
  getBearerToken,
  getClients,
  getSchemaErrorMessage,
} from '../../_lib'

export async function POST(req: NextRequest) {
  const clients = getClients()
  if (!clients) {
    return NextResponse.json({ error: 'Configuration Supabase manquante.' }, { status: 500 })
  }

  try {
    const token = getBearerToken(req.headers.get('authorization'))
    if (!token) {
      return NextResponse.json({ error: 'Connecte-toi pour proposer un challenger autopromo.' }, { status: 401 })
    }

    const {
      data: { user },
      error: userError,
    } = await clients.auth.auth.getUser(token)

    if (userError || !user) {
      return NextResponse.json({ error: 'Session invalide.' }, { status: 401 })
    }

    const body = await req.json().catch(() => null)
    const titreId = body?.titreId as string | undefined

    if (!titreId) {
      return NextResponse.json({ error: 'titreId manquant.' }, { status: 400 })
    }

    const { data: title, error: titleError } = await clients.admin
      .from('titre')
      .select('id, user_id, autopromo, nom_artiste, nom_titre')
      .eq('id', titreId)
      .maybeSingle<{ id: string; user_id: string | null; autopromo: boolean | null; nom_artiste: string | null; nom_titre: string | null }>()

    if (titleError) {
      return NextResponse.json({ error: titleError.message }, { status: 500 })
    }

    if (!title) {
      return NextResponse.json({ error: 'Morceau introuvable.' }, { status: 404 })
    }

    if (title.user_id !== user.id) {
      return NextResponse.json({ error: 'Tu peux seulement engager un de tes morceaux.' }, { status: 403 })
    }

    if (!title.autopromo) {
      return NextResponse.json({ error: 'Ce morceau doit etre marque en autopromo pour entrer dans cette arene.' }, { status: 409 })
    }

    const { data: alreadyQueued } = await clients.admin
      .from('tlmvpsp_autopromo_entries')
      .select('id, titre_id')
      .eq('user_id', user.id)
      .eq('status', 'queued')
      .limit(1)
      .maybeSingle<{ id: string; titre_id: string }>()

    if (alreadyQueued) {
      return NextResponse.json({ error: 'Tu as deja un challenger en attente pour l autopromo.' }, { status: 409 })
    }

    const { data: duplicateQueued } = await clients.admin
      .from('tlmvpsp_autopromo_entries')
      .select('id')
      .eq('titre_id', titreId)
      .eq('status', 'queued')
      .maybeSingle<{ id: string }>()

    if (duplicateQueued) {
      return NextResponse.json({ error: 'Ce morceau est deja en file d attente.' }, { status: 409 })
    }

    const { data: digger, error: diggerError } = await clients.admin
      .from('digger')
      .select('points')
      .eq('id', user.id)
      .maybeSingle<{ points: number | null }>()

    if (diggerError) {
      return NextResponse.json({ error: diggerError.message }, { status: 500 })
    }

    const currentPoints = Number(digger?.points || 0)
    if (currentPoints < AUTOPROMO_ENTRY_COST) {
      return NextResponse.json({ error: 'Tu n as pas assez de points pour tenter l autopromo.' }, { status: 409 })
    }

    const { error: debitError } = await clients.admin.from('points_history').insert([
      {
        user_id: user.id,
        amount: -AUTOPROMO_ENTRY_COST,
        type: 'purchase',
        reason: `TLMVPSP autopromo - ${title.nom_artiste || 'Artiste'} / ${title.nom_titre || 'Titre'}`,
      },
    ])

    if (debitError) {
      return NextResponse.json({ error: debitError.message }, { status: 500 })
    }

    const { error: queueError } = await clients.admin.from('tlmvpsp_autopromo_entries').insert([
      {
        user_id: user.id,
        titre_id: titreId,
        cost_points: AUTOPROMO_ENTRY_COST,
        status: 'queued',
      },
    ])

    if (queueError) {
      await clients.admin.from('points_history').insert([
        {
          user_id: user.id,
          amount: AUTOPROMO_ENTRY_COST,
          type: 'refund',
          reason: `Remboursement TLMVPSP autopromo - ${title.nom_artiste || 'Artiste'} / ${title.nom_titre || 'Titre'}`,
        },
      ])

      return NextResponse.json({ error: queueError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      cost: AUTOPROMO_ENTRY_COST,
      remainingPoints: currentPoints - AUTOPROMO_ENTRY_COST,
    })
  } catch (error) {
    return NextResponse.json({ error: getSchemaErrorMessage(error) }, { status: 500 })
  }
}