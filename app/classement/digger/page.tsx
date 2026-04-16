"use client"

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import EquippedBadgesInline from '@/app/components/EquippedBadgesInline'
import PointsPearl from '@/app/components/PointsPearl'
import { checkTop100ScoreAndNotify } from '@/lib/notifications'

type SortBy = 'points-desc' | 'tracks-desc' | 'likes-desc'

type DiggerRow = {
  id: string
  username: string
  avatar_url: string | null
  equipped_badge_1?: string | null
  equipped_badge_2?: string | null
  points: number
  trackCount: number
  totalVues: number
  totalLikes: number
}

const SORT_LABELS: Record<SortBy, string> = {
  'points-desc': '💎 Par Perles',
  'tracks-desc': '🎵 Par Tracks',
  'likes-desc': '📡 Par Likes',
}

export default function ClassementDiggerPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [diggers, setDiggers] = useState<DiggerRow[]>([])
  const [sortBy, setSortBy] = useState<SortBy>('points-desc')
  const [brokenAvatarIds, setBrokenAvatarIds] = useState<string[]>([])

  useEffect(() => {
    const init = async () => {
      // Fire data fetch immediately — don't block on auth
      fetchDiggers()
      try {
        const { data: { session } } = await supabase.auth.getSession()
        setUser(session?.user || null)
      } catch (e) {}
    }
    init()
  }, [])

  const fetchDiggers = async (userId?: string) => {
    setLoading(true)
    try {
      const [diggersRes, tracksRes] = await Promise.all([
        supabase.from('digger').select('id, username, avatar_url, points, equipped_badge_1, equipped_badge_2').order('points', { ascending: false }).limit(500),
        supabase.from('titre').select('user_id, vues_actuelles, likes').not('type_partage', 'eq', 'production'),
      ])

      const allDiggers = diggersRes.data || []
      const allTracks = tracksRes.data || []

      const statsMap = new Map<string, { trackCount: number; totalVues: number; totalLikes: number }>()
      for (const t of allTracks) {
        const uid = t.user_id as string
        if (!uid) continue
        const s = statsMap.get(uid) || { trackCount: 0, totalVues: 0, totalLikes: 0 }
        s.trackCount += 1
        s.totalVues += t.vues_actuelles || 0
        s.totalLikes += t.likes || 0
        statsMap.set(uid, s)
      }

      const rows: DiggerRow[] = allDiggers.map((d) => {
        const s = statsMap.get(d.id) || { trackCount: 0, totalVues: 0, totalLikes: 0 }
        return { id: d.id, username: d.username || 'Anonyme', avatar_url: d.avatar_url, points: d.points || 0, ...s }
      })

      setDiggers(rows)

      if (userId) {
        const byPoints = [...rows].sort((a, b) => b.points - a.points)
        const rank = byPoints.findIndex((d) => d.id === userId) + 1
        if (rank > 0) {
          await checkTop100ScoreAndNotify(userId, 'Diggers', byPoints[rank - 1]?.points ?? 0, rank)
        }
      }
    } catch (err) {
      console.error('Erreur fetchDiggers:', err)
      setDiggers([])
    } finally {
      setLoading(false)
    }
  }

  const sorted = useMemo(() => {
    return [...diggers].sort((a, b) => {
      if (sortBy === 'tracks-desc') return b.trackCount - a.trackCount
      if (sortBy === 'likes-desc') return b.totalLikes - a.totalLikes
      return b.points - a.points
    })
  }, [diggers, sortBy])

  const podiumRows = sorted.slice(0, 3)
  const podiumLayout = [
    { digger: podiumRows[1] ?? null, place: 2, shellClass: 'md:mt-8', cardClass: 'min-h-[176px] md:min-h-[196px]' },
    { digger: podiumRows[0] ?? null, place: 1, shellClass: 'md:-mt-1', cardClass: 'min-h-[204px] md:min-h-[228px]' },
    { digger: podiumRows[2] ?? null, place: 3, shellClass: 'md:mt-12', cardClass: 'min-h-[148px] md:min-h-[162px]' },
  ]

  const topDigger = sorted[0] || null
  const totalPoints = sorted.reduce((sum, digger) => sum + digger.points, 0)
  const totalTracks = sorted.reduce((sum, digger) => sum + digger.trackCount, 0)
  const totalLikes = sorted.reduce((sum, digger) => sum + digger.totalLikes, 0)

  const hasValidAvatar = (digger: DiggerRow) => Boolean(digger.avatar_url) && !brokenAvatarIds.includes(digger.id)

  const markAvatarAsBroken = (diggerId: string) => {
    setBrokenAvatarIds((current) => (current.includes(diggerId) ? current : [...current, diggerId]))
  }

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center text-cyan-300 font-black italic animate-pulse tracking-widest uppercase">
      Scanning Diggers...
    </div>
  )

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[#001524] via-[#000814] to-black px-6 pb-20 pt-20 text-white sm:pt-24">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-8%] top-[-2%] h-96 w-96 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute right-[-10%] top-[6%] h-[30rem] w-[30rem] rounded-full bg-emerald-300/10 blur-3xl" />
        <div className="absolute left-[15%] top-[18%] h-6 w-6 rounded-full border border-cyan-100/20 bg-cyan-100/10" />
        <div className="absolute right-[18%] top-[26%] h-4 w-4 rounded-full border border-white/10 bg-white/10" />
        <div className="absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.14),transparent_62%)]" />
        <div className="absolute inset-x-0 bottom-0 h-[34rem] bg-[linear-gradient(to_top,rgba(0,0,0,0.94),rgba(0,8,20,0.7),transparent)]" />
      </div>

      <div className="relative z-10 mx-auto max-w-[1600px]">
        <section className="flex min-h-[calc(100vh-220px)] flex-col justify-center">
          <div className="mb-4 flex flex-col gap-2 rounded-[28px] border border-lime-300/34 bg-[linear-gradient(180deg,rgba(0,0,0,0.88),rgba(3,6,4,0.96))] px-5 py-3 shadow-[0_0_28px_rgba(163,230,53,0.12)] sm:flex-row sm:items-end sm:justify-between sm:px-6">
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.34em] text-cyan-100/58">Classement digger</p>
              <h1 className="mt-1 text-3xl font-black uppercase italic text-white sm:text-4xl">Top Diggers</h1>
            </div>
            <p className="max-w-xl text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100/48 sm:text-right">
              Premiere partie: tri et podium. Deuxieme partie: le tableau complet.
            </p>
          </div>

          <div className="space-y-3">
            <div className="rounded-[24px] border border-lime-300/34 bg-[linear-gradient(180deg,rgba(0,0,0,0.88),rgba(4,6,4,0.94))] p-3 shadow-[0_0_24px_rgba(163,230,53,0.1)] backdrop-blur-md sm:p-4">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="min-w-0">
                  <p className="text-[8px] font-black uppercase tracking-[0.28em] text-cyan-100/44">Radar digger</p>
                  <p className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100/72">
                    {sorted.length.toLocaleString('fr-FR')} diggers classes, {Math.round(totalPoints).toLocaleString('fr-FR')} perles cumulees.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 xl:w-[540px]">
                  {(Object.keys(SORT_LABELS) as SortBy[]).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setSortBy(mode)}
                      className={`group relative overflow-hidden rounded-[20px] border px-4 py-3 text-left font-black uppercase tracking-[0.18em] transition-all ${
                        sortBy === mode
                          ? 'border-lime-300/42 bg-[linear-gradient(180deg,rgba(12,18,8,0.96),rgba(8,12,6,0.92))] text-white shadow-[0_0_22px_rgba(163,230,53,0.14)]'
                          : 'border-lime-300/20 bg-[linear-gradient(180deg,rgba(0,0,0,0.82),rgba(8,8,8,0.92))] text-white/56 hover:border-lime-300/38 hover:text-white/84'
                      }`}
                    >
                      <span className="relative block text-[8px] text-cyan-100/38">Mode</span>
                      <span className="relative mt-2 block text-[10px]">{SORT_LABELS[mode]}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {podiumRows.length > 0 && (
              <div className="mx-auto w-full max-w-5xl rounded-[26px] border border-lime-300/34 bg-[linear-gradient(180deg,rgba(0,0,0,0.88),rgba(4,6,4,0.94))] px-4 py-3 shadow-[0_0_22px_rgba(163,230,53,0.1)] sm:px-5">
                <div className="mb-2 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-[8px] font-black uppercase tracking-[0.3em] text-cyan-100/46">Podium digger</p>
                    <p className="mt-1 text-[9px] font-black uppercase tracking-[0.14em] text-cyan-100/68">Top 3 visible des l'arrivee sur la page.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 md:grid-cols-3 md:items-end md:gap-3">
                  {podiumLayout.map(({ digger, place, shellClass, cardClass }) => {
                    const borderClass = place === 1
                      ? 'rounded-[22px] border border-lime-300/34 bg-lime-300/[0.03]'
                      : place === 2
                        ? 'rounded-[22px] border border-cyan-200/24 bg-black/70'
                        : 'rounded-[22px] border border-white/12 bg-white/[0.015]'
                    const pedestalClass = place === 1
                      ? 'h-10 border-lime-300/28 bg-lime-300/12'
                      : place === 2
                        ? 'h-7 border-cyan-200/16 bg-cyan-200/8'
                        : 'h-5 border-white/10 bg-white/6'

                    if (!digger) {
                      return (
                        <div key={`podium-empty-${place}`} className={shellClass}>
                          <div className="overflow-hidden rounded-[22px] border border-dashed border-white/10 bg-black/10">
                            <div className="flex min-h-[140px] items-center justify-center px-4">
                              <span className="text-[10px] font-black uppercase tracking-[0.22em] text-white/28">Top {place} indisponible</span>
                            </div>
                            <div className={`border-t ${pedestalClass}`} />
                          </div>
                        </div>
                      )
                    }

                    return (
                      <div key={digger.id} className={shellClass}>
                        <div className={`relative flex flex-col justify-between bg-black/82 p-3 ${cardClass} ${borderClass}`}>
                          <div className="relative z-10 flex items-start justify-between gap-3">
                            <div className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border text-lg font-black italic ${place === 1 ? 'border-lime-300/44 bg-lime-300/14 text-lime-100' : place === 2 ? 'border-cyan-200/20 bg-cyan-200/10 text-cyan-100' : 'border-white/12 bg-white/6 text-white/82'}`}>
                              {place}
                            </div>
                            <span className={`rounded-full px-2 py-1 text-[7px] font-black uppercase tracking-[0.18em] ${place === 1 ? 'bg-lime-300/16 text-lime-100' : place === 2 ? 'bg-cyan-200/10 text-cyan-100/76' : 'bg-white/8 text-cyan-100/64'}`}>
                              #{place}
                            </span>
                          </div>

                          <div className="relative z-10 mt-3 flex flex-1 flex-col items-center text-center">
                            <Link href={`/profil/${digger.id}`} className="flex flex-col items-center">
                              <div className={`flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border ${place === 1 ? 'border-lime-300/34' : place === 2 ? 'border-cyan-200/24' : 'border-white/12'} bg-[linear-gradient(180deg,rgba(34,211,238,0.16),rgba(59,130,246,0.08))] shadow-[0_0_18px_rgba(34,211,238,0.12)]`}>
                                {hasValidAvatar(digger) ? (
                                  <img src={digger.avatar_url || ''} alt="" onError={() => markAvatarAsBroken(digger.id)} className="h-full w-full object-cover" />
                                ) : (
                                  <span className="text-lg font-black text-cyan-200">{digger.username.charAt(0).toUpperCase()}</span>
                                )}
                              </div>
                            </Link>
                            <div className="mt-3 flex items-center justify-center gap-2">
                              <Link href={`/profil/${digger.id}`} className="block text-base font-black uppercase italic leading-tight text-white transition-colors hover:text-cyan-100 sm:text-lg">
                                @{digger.username}
                              </Link>
                              <EquippedBadgesInline badgeIds={[digger.equipped_badge_1, digger.equipped_badge_2]} size="xs" />
                            </div>
                            <p className="mt-1.5 text-[9px] font-mono font-black uppercase tracking-[0.14em] text-cyan-100/84">
                              {Math.round(digger.points).toLocaleString('fr-FR')} perles
                            </p>
                            <p className="mt-1 text-[8px] font-black uppercase tracking-[0.14em] text-white/48">
                              {digger.trackCount} tracks • {digger.totalLikes.toLocaleString('fr-FR')} likes
                            </p>
                          </div>
                        </div>

                        <div className={`rounded-[22px] border ${pedestalClass}`} />
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="mt-8 min-h-screen">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-[8px] font-black uppercase tracking-[0.3em] text-cyan-100/42">Deuxieme partie</p>
              <h2 className="mt-1 text-2xl font-black uppercase italic text-white sm:text-3xl">Le Tableau</h2>
            </div>
            <p className="max-w-md text-right text-[9px] font-black uppercase tracking-[0.16em] text-white/44">
              Le classement complet prend le relais et la page continue en scroll.
            </p>
          </div>

        <div className="table-shell relative mb-20 overflow-hidden rounded-[40px] border border-lime-300/34 bg-[linear-gradient(180deg,rgba(0,0,0,0.9),rgba(3,6,4,0.96))] shadow-[0_20px_50px_rgba(0,0,0,0.42),0_0_26px_rgba(163,230,53,0.08)]">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-[-10%] top-[-10%] h-40 w-40 rounded-full bg-cyan-400/8 blur-3xl" />
            <div className="absolute right-[-8%] bottom-[-20%] h-52 w-52 rounded-full bg-emerald-300/8 blur-3xl" />
          </div>
          <div className="relative overflow-x-auto rounded-[40px]">
          <table className="w-full border-collapse text-left">
            <thead className="bg-[linear-gradient(180deg,rgba(2,10,14,0.94),rgba(0,0,0,0.8))] text-cyan-100/58 uppercase text-[9px] tracking-[0.24em]">
              <tr>
                <th className="p-6 border-b border-white/10 text-center">#</th>
                <th className="p-6 border-b border-white/10">Digger</th>
                <th className="p-6 border-b border-white/10 text-center text-cyan-200">
                  <span className="inline-flex items-center gap-2">
                    <PointsPearl size="sm" /> Perles
                  </span>
                </th>
                <th className="p-6 border-b border-white/10 text-center">Tracks</th>
                <th className="p-6 border-b border-white/10 text-center">Vues Totales</th>
                <th className="p-6 border-b border-white/10 text-center">Likes Totaux</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sorted.length === 0 ? (
                <tr><td colSpan={6} className="p-10 text-center text-gray-500 italic">Aucun digger enregistré.</td></tr>
              ) : (
                sorted.map((d, idx) => (
                  <tr
                    key={d.id}
                    className={`group transition-all duration-300 aquarium-row ${d.id === user?.id ? 'bg-cyan-400/6' : ''}`}
                  >
                    <td className="aquarium-cell p-6 text-center font-black text-2xl align-middle">
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : (
                        <span className="text-gray-500 font-mono text-sm">#{idx + 1}</span>
                      )}
                    </td>
                    <td className="aquarium-cell p-6 align-middle">
                      <Link href={`/profil/${d.id}`} className="flex items-center gap-4 transition-colors group-hover:text-cyan-300">
                        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-cyan-300/24 bg-[linear-gradient(180deg,rgba(34,211,238,0.16),rgba(59,130,246,0.08))] shadow-[0_0_18px_rgba(34,211,238,0.12)]">
                          {hasValidAvatar(d)
                            ? <img src={d.avatar_url || ''} alt="" onError={() => markAvatarAsBroken(d.id)} className="w-full h-full object-cover" />
                            : <span className="text-sm font-black text-cyan-200">{d.username.charAt(0).toUpperCase()}</span>
                          }
                        </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="truncate font-black text-sm uppercase italic">@{d.username}</span>
                              <EquippedBadgesInline badgeIds={[d.equipped_badge_1, d.equipped_badge_2]} size="xs" />
                            {d.id === user?.id && <span className="rounded-full border border-cyan-300/24 bg-cyan-300/10 px-2 py-1 text-[8px] font-black uppercase tracking-[0.22em] text-cyan-200">toi</span>}
                          </div>
                          <p className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/38">Chasseur de sons</p>
                        </div>
                      </Link>
                    </td>
                    <td className="aquarium-cell p-6 text-center font-mono font-black text-cyan-200 text-xl align-middle">
                      <span className="inline-flex items-center gap-2">
                        <PointsPearl size="sm" /> {Math.round(d.points).toLocaleString('fr-FR')}
                      </span>
                    </td>
                    <td className="aquarium-cell p-6 text-center align-middle">
                      <span className="inline-flex min-w-[74px] items-center justify-center rounded-full border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-gray-200">
                        {d.trackCount}
                      </span>
                    </td>
                    <td className="aquarium-cell p-6 text-center align-middle">
                      <span className="inline-flex min-w-[92px] items-center justify-center rounded-full border border-cyan-300/14 bg-cyan-400/8 px-3 py-1.5 font-mono text-[10px] text-cyan-100/86">
                        {d.totalVues.toLocaleString('fr-FR')}
                      </span>
                    </td>
                    <td className="aquarium-cell p-6 text-center align-middle">
                      <span className="inline-flex min-w-[82px] items-center justify-center rounded-full border border-emerald-300/16 bg-emerald-300/10 px-3 py-1.5 font-black text-emerald-200">
                        {d.totalLikes}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        </div>
        </section>
      </div>
    </div>
  )
}
