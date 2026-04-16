'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/hooks/useAuth'
import EquippedBadgesInline from '@/app/components/EquippedBadgesInline'

type FeedItemType = 'share' | 'like' | 'bet'

interface FeedItem {
  id: string
  type: FeedItemType
  actorId: string
  actorName: string
  actorBadge1?: string | null
  actorBadge2?: string | null
  createdAt: string
  title: string
  subtitle: string
  href: string
}

export default function RadarPage() {
  const { user, loading: authLoading } = useAuth({ redirectTo: '/auth' })
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<FeedItem[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true

    async function loadFeed() {
      if (!user?.id) {
        return
      }

      const { data: follows, error: followsError } = await supabase
        .from('user_follows')
        .select('followed_id')
        .eq('follower_id', user.id)

      if (followsError) {
        if (alive) {
          setError(followsError.message)
          setLoading(false)
        }
        return
      }

      const followedIds = (follows || []).map((f) => f.followed_id)
      if (followedIds.length === 0) {
        if (alive) {
          setItems([])
          setLoading(false)
        }
        return
      }

      const [sharesRes, likesRes, betsRes, actorsRes] = await Promise.all([
        supabase
          .from('titre')
          .select('id,user_id,nom_titre,nom_artiste,created_at')
          .in('user_id', followedIds)
          .order('created_at', { ascending: false })
          .limit(40),
        supabase
          .from('vote')
          .select('id,user_id,titre_id,nom_titre,nom_artiste,created_at')
          .in('user_id', followedIds)
          .order('created_at', { ascending: false })
          .limit(40),
        supabase
          .from('paris_mises')
          .select('id,user_id,pari_id,choix,montant,created_at')
          .in('user_id', followedIds)
          .order('created_at', { ascending: false })
          .limit(40),
        supabase.from('digger').select('id,username,equipped_badge_1,equipped_badge_2').in('id', followedIds),
      ])

      const actorMap = new Map<string, { name: string; badge1?: string | null; badge2?: string | null }>()
      ;(actorsRes.data || []).forEach((a) => actorMap.set(a.id, {
        name: a.username || 'Digger',
        badge1: a.equipped_badge_1 || null,
        badge2: a.equipped_badge_2 || null,
      }))

      const pariIds = (betsRes.data || []).map((b) => b.pari_id).filter(Boolean)
      const parisMap = new Map<string, string>()
      if (pariIds.length > 0) {
        const { data: parisData } = await supabase
          .from('paris_questions')
          .select('id,question')
          .in('id', pariIds)
        ;(parisData || []).forEach((p) => parisMap.set(p.id, p.question || 'Pari'))
      }

      const shareItems: FeedItem[] = (sharesRes.data || []).map((row) => ({
        id: `share-${row.id}`,
        type: 'share',
        actorId: row.user_id,
        actorName: actorMap.get(row.user_id)?.name || 'Digger',
        actorBadge1: actorMap.get(row.user_id)?.badge1 || null,
        actorBadge2: actorMap.get(row.user_id)?.badge2 || null,
        createdAt: row.created_at,
        title: 'Nouveau partage',
        subtitle: `${row.nom_artiste || 'Artiste'} - ${row.nom_titre || 'Titre'}`,
        href: `/track/${row.id}`,
      }))

      const likeItems: FeedItem[] = (likesRes.data || []).map((row) => ({
        id: `like-${row.id}`,
        type: 'like',
        actorId: row.user_id,
        actorName: actorMap.get(row.user_id)?.name || 'Digger',
        actorBadge1: actorMap.get(row.user_id)?.badge1 || null,
        actorBadge2: actorMap.get(row.user_id)?.badge2 || null,
        createdAt: row.created_at,
        title: 'A valide une musique',
        subtitle: `${row.nom_artiste || 'Artiste'} - ${row.nom_titre || 'Titre'}`,
        href: row.titre_id ? `/track/${row.titre_id}` : '/classement/musique',
      }))

      const betItems: FeedItem[] = (betsRes.data || []).map((row) => ({
        id: `bet-${row.id}`,
        type: 'bet',
        actorId: row.user_id,
        actorName: actorMap.get(row.user_id)?.name || 'Digger',
        actorBadge1: actorMap.get(row.user_id)?.badge1 || null,
        actorBadge2: actorMap.get(row.user_id)?.badge2 || null,
        createdAt: row.created_at,
        title: 'A place un pari',
        subtitle: `${parisMap.get(row.pari_id) || 'Pari'} | Choix: ${row.choix} | ${row.montant} perles`,
        href: '/jeux/paris',
      }))

      const merged = [...shareItems, ...likeItems, ...betItems]
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
        .slice(0, 120)

      if (alive) {
        setItems(merged)
        setLoading(false)
      }
    }

    loadFeed()

    const timer = setInterval(() => {
      loadFeed()
    }, 60000)

    return () => {
      alive = false
      clearInterval(timer)
    }
  }, [user?.id])

  const grouped = useMemo(() => {
    const byDay = new Map<string, FeedItem[]>()
    for (const item of items) {
      const key = new Date(item.createdAt).toLocaleDateString('fr-FR')
      const arr = byDay.get(key) || []
      arr.push(item)
      byDay.set(key, arr)
    }
    return Array.from(byDay.entries())
  }, [items])

  const iconForType = (type: FeedItemType) => {
    if (type === 'share') return '🎵'
    if (type === 'like') return '❤️'
    return '🎰'
  }

  if (authLoading || loading) {
    return <div className="min-h-screen bg-black text-white flex items-center justify-center">Chargement du Radar...</div>
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#07131f] via-[#05070d] to-black text-white pt-24 pb-16 px-4 sm:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight">Radar Abonnements</h1>
            <p className="text-sm text-cyan-100/70 mt-2">Partages, likes et paris des personnes que tu suis</p>
          </div>
          <Link href="/profil" className="px-4 py-2 rounded-full border border-cyan-400/40 text-cyan-200 hover:bg-cyan-500/10 text-xs font-black uppercase">
            Retour profil
          </Link>
        </div>

        {error ? <div className="rounded-xl border border-red-400/40 bg-red-900/20 p-4 text-red-300 mb-6">{error}</div> : null}

        {items.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center">
            <p className="text-lg font-bold text-gray-200">Ton radar est vide pour le moment.</p>
            <p className="text-gray-400 mt-2 text-sm">Suis des profils pour voir leur activite ici.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {grouped.map(([day, dayItems]) => (
              <section key={day}>
                <h2 className="text-xs uppercase tracking-[0.18em] text-gray-400 mb-3">{day}</h2>
                <div className="space-y-3">
                  {dayItems.map((item) => (
                    <Link key={item.id} href={item.href} className="group block rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-cyan-400/40 transition-all p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-cyan-700/30 border border-cyan-300/30 flex items-center justify-center text-lg">
                            {iconForType(item.type)}
                          </div>
                          <div>
                            <p className="text-sm text-gray-200">
                              <span className="inline-flex items-center gap-2 font-black text-cyan-200">@{item.actorName}<EquippedBadgesInline badgeIds={[item.actorBadge1, item.actorBadge2]} size="xs" /></span> {item.title}
                            </p>
                            <p className="text-sm text-gray-400 mt-1">{item.subtitle}</p>
                          </div>
                        </div>
                        <span className="text-[11px] text-gray-500">{new Date(item.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
