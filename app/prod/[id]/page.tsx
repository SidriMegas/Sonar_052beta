"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Likesbutton from '@/app/components/likesbutton'
import PointsPearl from '@/app/components/PointsPearl'
import EquippedBadgesInline from '@/app/components/EquippedBadgesInline'
import { getEmbedUrl } from '@/lib/youtube'
import type { TrackSummary } from '@/lib/types/track'

export default function ProdDetailPage() {
  const params = useParams()
  const prodId = params?.id as string
  const [prod, setProd] = useState<TrackSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadProd = async () => {
      if (!prodId) return

      setLoading(true)

      const { data, error } = await supabase
        .from('prod')
        .select('id, user_id, nom_titre, nom_artiste, youtube_url, genre, sous_genre, pays, points, likes, vues_actuelles, vues_au_partage, feedback_enabled, created_at, youtube_channel_id, digger:user_id(id, username, equipped_badge_1, equipped_badge_2)')
        .eq('id', prodId)
        .maybeSingle()

      if (error) {
        console.error('Erreur chargement prod:', error)
        setProd(null)
      } else {
        setProd((data || null) as TrackSummary | null)
      }

      setLoading(false)
    }

    loadProd()
  }, [prodId])

  if (loading) {
    return <div className="min-h-screen bg-[#050b14] px-6 pt-[140px] text-white">Chargement de la prod...</div>
  }

  if (!prod) {
    return (
      <div className="min-h-screen bg-[#050b14] px-6 pt-[140px] text-white">
        <div className="mx-auto max-w-4xl rounded-[28px] border border-white/10 bg-black/30 p-8">
          <p className="text-sm uppercase tracking-[0.28em] text-cyan-200/60">Prod introuvable</p>
          <Link href="/classement/prod" className="mt-6 inline-flex rounded-full border border-cyan-300/20 px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-cyan-100 transition hover:bg-cyan-400/10">
            Retour classement prod
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.12),transparent_48%),linear-gradient(180deg,#02070d_0%,#040a12_56%,#020406_100%)] px-6 pb-16 pt-[132px] text-white">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.34em] text-cyan-200/58">Fiche prod</p>
            <h1 className="mt-2 text-3xl font-black uppercase italic tracking-tight text-white sm:text-4xl">{prod.nom_titre}</h1>
            <p className="mt-3 text-sm text-gray-400">{prod.nom_artiste}</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/classement/prod" className="inline-flex rounded-full border border-white/10 px-4 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-white transition hover:bg-white/6">
              Retour classement prod
            </Link>
            <Link href="/feedback?tab=prods" className="inline-flex rounded-full border border-fuchsia-300/20 px-4 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-fuchsia-100 transition hover:bg-fuchsia-400/10">
              Donner un feedback
            </Link>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_360px]">
          <div className="overflow-hidden rounded-[30px] border border-white/10 bg-black/35 p-4 shadow-[0_0_40px_rgba(0,0,0,0.24)]">
            <div className="aspect-video overflow-hidden rounded-[24px] border border-white/8 bg-black">
              <iframe
                src={getEmbedUrl(prod.youtube_url || '')}
                title={prod.nom_titre}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="h-full w-full"
              />
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-[28px] border border-white/10 bg-black/30 p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-gray-500">Signal</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-[22px] border border-white/8 bg-white/5 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Perles</p>
                  <p className="mt-2 inline-flex items-center gap-2 text-2xl font-black text-white"><PointsPearl size="sm" /> {Math.round(Number(prod.points || 0))}</p>
                </div>
                <div className="rounded-[22px] border border-white/8 bg-white/5 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Vues</p>
                  <p className="mt-2 text-2xl font-black text-white">{Number(prod.vues_actuelles || 0).toLocaleString('fr-FR')}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between rounded-[22px] border border-white/8 bg-white/5 p-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Likes</p>
                  <p className="mt-2 text-sm text-gray-400">Les votes de prod restent limites au classement prod.</p>
                </div>
                <div className="w-14">
                  <Likesbutton
                    trackId={prod.id}
                    trackOwnerId={prod.user_id}
                    vuesActuelles={prod.vues_actuelles || 0}
                    initialLikes={prod.likes || 0}
                    targetType="prod"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-black/30 p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-gray-500">Details</p>
              <div className="mt-4 space-y-3 text-sm text-gray-300">
                <p><span className="text-gray-500">Genre:</span> {prod.genre || 'Non defini'}</p>
                <p><span className="text-gray-500">Sous-genre:</span> {prod.sous_genre || 'Non defini'}</p>
                <p><span className="text-gray-500">Pays:</span> {prod.pays || 'Global'}</p>
                <p><span className="text-gray-500">Feedback:</span> {prod.feedback_enabled ? 'Actif' : 'Desactive'}</p>
                <p><span className="text-gray-500">Beatmaker:</span> <span className="inline-flex items-center gap-2">@{prod.digger?.username || 'Anonyme'}<EquippedBadgesInline badgeIds={[prod.digger?.equipped_badge_1, prod.digger?.equipped_badge_2]} size="xs" /></span></p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}