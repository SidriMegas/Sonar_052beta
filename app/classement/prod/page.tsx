"use client"

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import EquippedBadgesInline from '@/app/components/EquippedBadgesInline'
import Likesbutton from '@/app/components/likesbutton'
import PointsPearl from '@/app/components/PointsPearl'
import { checkTop100TracksAndNotify } from '@/lib/notifications'
import { getEmbedUrl } from '@/lib/youtube'

type SortMode = 'vues-asc' | 'partage-desc' | 'vues-desc' | 'likes-desc' | 'likes-asc' | 'points-desc'

const SORT_OPTIONS: Array<{ value: SortMode; label: string }> = [
  { value: 'points-desc', label: 'Plus de perles' },
  { value: 'partage-desc', label: 'Nouveaux partages' },
  { value: 'vues-desc', label: 'Plus de vues' },
  { value: 'vues-asc', label: 'Moins de vues' },
  { value: 'likes-desc', label: 'Plus de likes' },
  { value: 'likes-asc', label: 'Moins de likes' },
]

type ProdRow = {
  id: string
  nom_titre: string
  nom_artiste: string
  genre: string | null
  sous_genre: string | null
  pays: string | null
  vues_actuelles: number | null
  likes: number | null
  points: number | null
  date_sortie: string | null
  created_at: string
  youtube_url: string | null
  youtube_id: string | null
  user_id: string
  digger: { id: string; username: string; equipped_badge_1?: string | null; equipped_badge_2?: string | null } | null
}

const parseReleaseTs = (row: ProdRow) => {
  const raw = row.date_sortie || row.created_at
  const ts = new Date(raw).getTime()
  return Number.isFinite(ts) ? ts : 0
}

export default function ClassementProdPage() {
  const [loading, setLoading] = useState(true)
  const [tracks, setTracks] = useState<ProdRow[]>([])
  const [selectedTrack, setSelectedTrack] = useState<ProdRow | null>(null)
  const [genreFilter, setGenreFilter] = useState('')
  const [subGenreFilter, setSubGenreFilter] = useState('')
  const [countryFilter, setCountryFilter] = useState('')
  const [sortMode, setSortMode] = useState<SortMode>('partage-desc')
  const [showFilters, setShowFilters] = useState(false)
  const [activePodiumTrackId, setActivePodiumTrackId] = useState<string | null>(null)

  useEffect(() => {
    fetchAll()
  }, [])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('prod')
        .select('id, nom_titre, nom_artiste, genre, sous_genre, pays, vues_actuelles, likes, points, date_sortie, created_at, youtube_url, youtube_id, user_id, digger:user_id(id, username, equipped_badge_1, equipped_badge_2)')
        .order('created_at', { ascending: false })
        .limit(500)
      const rows = (data || []) as unknown as ProdRow[]
      setTracks(rows)
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user?.id) {
        const byPoints = [...rows].sort((a, b) => (b.points || 0) - (a.points || 0))
        await checkTop100TracksAndNotify(session.user.id, 'Prod', byPoints.map(t => ({ id: t.id, user_id: t.user_id, nom_titre: t.nom_titre, nom_artiste: t.nom_artiste })))
      }
    } catch (err) {
      console.error('Erreur fetchAll prod:', err)
      setTracks([])
    } finally {
      setLoading(false)
    }
  }

  const genres = useMemo(() => Array.from(new Set(tracks.map((t) => t.genre).filter(Boolean))) as string[], [tracks])
  const subGenres = useMemo(() => Array.from(new Set(tracks.map((t) => t.sous_genre).filter(Boolean))) as string[], [tracks])
  const countries = useMemo(() => Array.from(new Set(tracks.map((t) => t.pays).filter(Boolean))) as string[], [tracks])

  const availableSubGenres = useMemo(() => {
    const nextSubGenres = genreFilter
      ? tracks.filter((track) => track.genre === genreFilter).map((track) => track.sous_genre)
      : subGenres

    return [...new Set(nextSubGenres.filter(Boolean))] as string[]
  }, [genreFilter, subGenres, tracks])

  const rows = useMemo(() => {
    const filtered = tracks
      .filter((t) => !genreFilter || t.genre === genreFilter)
      .filter((t) => !subGenreFilter || t.sous_genre === subGenreFilter)
      .filter((t) => !countryFilter || t.pays === countryFilter)

    const copy = [...filtered]
    copy.sort((a, b) => {
      if (sortMode === 'vues-asc') return (a.vues_actuelles || 0) - (b.vues_actuelles || 0)
      if (sortMode === 'vues-desc') return (b.vues_actuelles || 0) - (a.vues_actuelles || 0)
      if (sortMode === 'likes-desc') return (b.likes || 0) - (a.likes || 0)
      if (sortMode === 'likes-asc') return (a.likes || 0) - (b.likes || 0)
      if (sortMode === 'partage-desc') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      return (b.points || 0) - (a.points || 0)
    })
    return copy
  }, [tracks, genreFilter, subGenreFilter, countryFilter, sortMode])

  const activeFilterCount = [genreFilter, subGenreFilter, countryFilter].filter(Boolean).length
  const podiumRows = rows.slice(0, 3)
  const podiumLayout = [
    { track: podiumRows[1] ?? null, place: 2, shellClass: 'md:mt-8', cardClass: 'min-h-[176px] md:min-h-[196px]' },
    { track: podiumRows[0] ?? null, place: 1, shellClass: 'md:-mt-1', cardClass: 'min-h-[204px] md:min-h-[228px]' },
    { track: podiumRows[2] ?? null, place: 3, shellClass: 'md:mt-12', cardClass: 'min-h-[148px] md:min-h-[162px]' },
  ]

  useEffect(() => {
    if (!subGenreFilter) return
    if (availableSubGenres.includes(subGenreFilter)) return
    setSubGenreFilter('')
  }, [availableSubGenres, subGenreFilter])

  useEffect(() => {
    if (!activePodiumTrackId) return

    const stillVisible = podiumRows.some((track) => track?.id === activePodiumTrackId)
    if (!stillVisible) {
      setActivePodiumTrackId(null)
    }
  }, [activePodiumTrackId, podiumRows])

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center text-cyan-300 font-black italic animate-pulse tracking-widest uppercase">Scanning frequencies...</div>
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
              <p className="text-[9px] font-black uppercase tracking-[0.34em] text-cyan-100/58">Classement prod</p>
              <h1 className="mt-1 text-3xl font-black uppercase italic text-white sm:text-4xl">Top Prod</h1>
            </div>
            <p className="max-w-xl text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100/48 sm:text-right">
              Premiere partie: tri et podium. Deuxieme partie: le tableau complet.
            </p>
          </div>

          <div className="space-y-3">
            <div className="rounded-[24px] border border-lime-300/34 bg-[linear-gradient(180deg,rgba(0,0,0,0.88),rgba(4,6,4,0.94))] p-3 shadow-[0_0_24px_rgba(163,230,53,0.1)] backdrop-blur-md sm:p-4">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="min-w-0">
                  <p className="text-[8px] font-black uppercase tracking-[0.28em] text-cyan-100/44">Radar prod</p>
                  <p className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-lime-100/72">
                    {rows.length.toLocaleString('fr-FR')} prods affichees sur {tracks.length.toLocaleString('fr-FR')}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select value={sortMode} onChange={(e) => setSortMode(e.target.value as SortMode)} className="min-w-[170px] rounded-full border border-lime-300/24 bg-black/80 px-3 py-2 text-[10px] font-black uppercase text-white outline-none transition-colors hover:border-lime-300/46">
                    {SORT_OPTIONS.map((option) => <option key={option.value} value={option.value} className="bg-black">{option.label}</option>)}
                  </select>

                  <button
                    type="button"
                    onClick={() => setShowFilters((value) => !value)}
                    className="rounded-full border border-lime-400/32 bg-lime-300/8 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-lime-100/86 transition-colors hover:border-lime-300/58 hover:bg-lime-300/14"
                  >
                    {showFilters ? 'Masquer filtres' : `Filtres${activeFilterCount ? ` (${activeFilterCount})` : ''}`}
                  </button>

                  {activeFilterCount > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setGenreFilter('')
                        setSubGenreFilter('')
                        setCountryFilter('')
                      }}
                      className="rounded-full border border-lime-300/20 bg-black/70 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/76 transition-colors hover:border-lime-300/34 hover:bg-black"
                    >
                      Reinitialiser
                    </button>
                  )}
                </div>
              </div>

              {showFilters && (
                <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
                  <select value={genreFilter} onChange={(e) => setGenreFilter(e.target.value)} className="w-full rounded-2xl border border-lime-300/22 bg-black/80 px-3 py-2.5 text-[10px] font-black uppercase text-white outline-none transition-colors hover:border-lime-300/46">
                    <option value="" className="bg-black">Tous les genres</option>
                    {genres.map((genre) => <option key={genre} value={genre} className="bg-black">{genre}</option>)}
                  </select>

                  <select value={subGenreFilter} onChange={(e) => setSubGenreFilter(e.target.value)} className="w-full rounded-2xl border border-lime-300/22 bg-black/80 px-3 py-2.5 text-[10px] font-black uppercase text-white outline-none transition-colors hover:border-lime-300/46">
                    <option value="" className="bg-black">Toutes les sous-categories</option>
                    {availableSubGenres.map((subGenre) => <option key={subGenre} value={subGenre} className="bg-black">{subGenre}</option>)}
                  </select>

                  <select value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)} className="w-full rounded-2xl border border-lime-300/22 bg-black/80 px-3 py-2.5 text-[10px] font-black uppercase text-white outline-none transition-colors hover:border-lime-300/46">
                    <option value="" className="bg-black">Monde entier</option>
                    {countries.map((country) => <option key={country} value={country} className="bg-black">{country}</option>)}
                  </select>
                </div>
              )}
            </div>

            {podiumRows.length > 0 && (
              <div className="mx-auto w-full max-w-5xl rounded-[26px] border border-lime-300/34 bg-[linear-gradient(180deg,rgba(0,0,0,0.88),rgba(4,6,4,0.94))] px-4 py-3 shadow-[0_0_22px_rgba(163,230,53,0.1)] sm:px-5">
                <div className="mb-2 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-[8px] font-black uppercase tracking-[0.3em] text-cyan-100/46">Podium prod</p>
                    <p className="mt-1 text-[9px] font-black uppercase tracking-[0.14em] text-lime-100/68">Top 3 visible des l'arrivee sur la page.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 md:grid-cols-3 md:items-end md:gap-3">
                  {podiumLayout.map(({ track, place, shellClass, cardClass }) => {
                    const isWinner = place === 1
                    const podiumBorderClass = place === 1
                      ? 'rounded-[22px] border border-lime-300/34 bg-lime-300/[0.03]'
                      : place === 2
                        ? 'rounded-[22px] border border-cyan-200/24 bg-black/70'
                        : 'rounded-[22px] border border-white/12 bg-white/[0.015]'
                    const pedestalClass = place === 1
                      ? 'h-10 border-lime-300/28 bg-lime-300/12'
                      : place === 2
                        ? 'h-7 border-cyan-200/16 bg-cyan-200/8'
                        : 'h-5 border-white/10 bg-white/6'

                    if (!track) {
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

                    const embedId = track.youtube_id || getEmbedUrl(track.youtube_url)

                    return (
                      <div key={track.id} className={shellClass}>
                        <div className={`relative flex flex-col justify-between bg-black/82 p-3 ${cardClass} ${podiumBorderClass}`}>
                          <div className="relative z-10 flex items-start justify-between gap-3">
                            <div className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border text-lg font-black italic ${isWinner ? 'border-lime-300/44 bg-lime-300/14 text-lime-100' : place === 2 ? 'border-cyan-200/20 bg-cyan-200/10 text-cyan-100' : 'border-white/12 bg-white/6 text-white/82'}`}>
                              {place}
                            </div>
                            <span className={`rounded-full px-2 py-1 text-[7px] font-black uppercase tracking-[0.18em] ${isWinner ? 'bg-lime-300/16 text-lime-100' : place === 2 ? 'bg-cyan-200/10 text-cyan-100/76' : 'bg-white/8 text-cyan-100/64'}`}>
                              #{place}
                            </span>
                          </div>

                          <div className="relative z-10 mt-3 flex-1">
                            <button
                              type="button"
                              onClick={() => {
                                setActivePodiumTrackId(track.id)
                                setSelectedTrack(track)
                              }}
                              className="group relative mb-3 block aspect-[16/8.6] w-full overflow-hidden rounded-[16px] border border-white/10 bg-black/40 text-left"
                            >
                              {activePodiumTrackId === track.id && embedId ? (
                                <iframe
                                  width="100%"
                                  height="100%"
                                  src={`https://www.youtube.com/embed/${embedId}?autoplay=1&rel=0&modestbranding=1`}
                                  title={`${track.nom_artiste} - ${track.nom_titre}`}
                                  frameBorder="0"
                                  allow="autoplay; encrypted-media"
                                  allowFullScreen
                                  className="absolute inset-0 h-full w-full"
                                />
                              ) : embedId ? (
                                <>
                                  <img
                                    src={`https://img.youtube.com/vi/${embedId}/hqdefault.jpg`}
                                    alt={`Miniature ${track.nom_titre}`}
                                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                  />
                                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.08),rgba(0,0,0,0.62))]" />
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="flex h-10 w-10 items-center justify-center rounded-full border border-lime-300/45 bg-black/72 text-sm text-lime-200 shadow-[0_0_18px_rgba(163,230,53,0.22)] transition-transform duration-300 group-hover:scale-105">
                                      ▶
                                    </span>
                                  </div>
                                </>
                              ) : (
                                <div className="absolute inset-0 flex items-center justify-center bg-black text-center text-[10px] font-black uppercase tracking-[0.14em] text-white/38">
                                  Media indisponible
                                </div>
                              )}
                            </button>

                            <p className="text-[8px] font-black uppercase tracking-[0.16em] text-cyan-100/52">{track.nom_artiste}</p>
                            <Link href={`/track/${track.id}`} className="mt-1 block text-base font-black uppercase italic leading-tight text-white transition-colors hover:text-lime-100 sm:text-lg">
                              {track.nom_titre}
                            </Link>
                            <p className="mt-1.5 text-[9px] font-mono font-black uppercase tracking-[0.14em] text-lime-200/84">
                              {(track.points || 0).toLocaleString('fr-FR')} perles
                            </p>
                            <p className="mt-1 text-[8px] font-black uppercase tracking-[0.14em] text-white/48">
                              {new Date(track.date_sortie || track.created_at).toLocaleDateString('fr-FR')}
                            </p>
                          </div>

                          <div className="relative z-10 mt-2 flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setActivePodiumTrackId(track.id)
                                setSelectedTrack(track)
                              }}
                              className={`rounded-full border px-2.5 py-1.5 text-[8px] font-black uppercase tracking-[0.14em] transition-all ${
                                activePodiumTrackId === track.id
                                  ? 'border-green-500 bg-green-500 text-black shadow-[0_0_18px_rgba(34,197,94,0.28)]'
                                  : 'border-green-500/50 bg-black/60 text-green-400 hover:border-green-400/80 hover:shadow-[0_0_12px_rgba(34,197,94,0.18)]'
                              }`}
                            >
                              ▶ Media Play
                            </button>

                            <div className="flex min-w-0 items-center gap-2">
                              <Link href={`/profil/${track.digger?.id || track.user_id}`} className="truncate text-[8px] font-black uppercase tracking-[0.14em] text-blue-400/86 hover:text-blue-300">
                                @{track.digger?.username || 'Anonyme'}
                              </Link>
                              <EquippedBadgesInline badgeIds={[track.digger?.equipped_badge_1, track.digger?.equipped_badge_2]} size="xs" />
                            </div>
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

          <div className="table-shell mb-20 relative overflow-hidden rounded-[40px] border border-lime-300/34 bg-[linear-gradient(180deg,rgba(0,0,0,0.9),rgba(3,6,4,0.96))] shadow-[0_20px_50px_rgba(0,0,0,0.42),0_0_26px_rgba(163,230,53,0.08)]">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute left-[-10%] top-[-10%] h-40 w-40 rounded-full bg-cyan-400/8 blur-3xl" />
              <div className="absolute right-[-8%] bottom-[-18%] h-48 w-48 rounded-full bg-lime-400/10 blur-3xl" />
            </div>

            <div className="relative w-full overflow-x-auto rounded-[40px]">
              <table className="table-fixed min-w-[1180px] w-full border-collapse text-left xl:min-w-0">
                <colgroup>
                  <col style={{ width: '13%' }} />
                  <col style={{ width: '16%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '9%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '6%' }} />
                  <col style={{ width: '12%' }} />
                </colgroup>

                <thead className="bg-[linear-gradient(180deg,rgba(2,10,14,0.94),rgba(0,0,0,0.8))] text-cyan-100/64 text-[9px] uppercase tracking-[0.24em]">
                  <tr>
                    <th className="px-4 py-4 text-center align-middle border-b border-white/10">Artiste</th>
                    <th className="px-4 py-4 text-center align-middle border-b border-white/10">Titre</th>
                    <th className="px-4 py-4 text-center align-middle border-b border-white/10">Genre</th>
                    <th className="px-4 py-4 text-center align-middle border-b border-white/10">Sous-genre</th>
                    <th className="px-4 py-4 text-center align-middle border-b border-white/10">Vues</th>
                    <th className="px-4 py-4 text-center align-middle border-b border-white/10">Perles</th>
                    <th className="px-4 py-4 text-center align-middle border-b border-white/10">Sonar</th>
                    <th className="px-4 py-4 text-center align-middle border-b border-white/10">Sortie</th>
                    <th className="px-4 py-4 text-center align-middle border-b border-white/10 italic">Lien</th>
                    <th className="px-4 py-4 text-center align-middle border-b border-white/10">Digger</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/5">
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-10 text-center text-gray-500 italic">Aucun resultat.</td>
                    </tr>
                  ) : (
                    rows.map((track) => (
                      <tr key={track.id} className="group transition-all duration-500 aquarium-row">
                        <td className="aquarium-cell px-4 py-4 align-middle text-center">
                          <div className="truncate text-xs font-black uppercase italic text-white md:text-sm">{track.nom_artiste}</div>
                          <div className="mt-1 truncate text-[9px] font-black uppercase tracking-[0.16em] text-white/40">{track.pays || 'Global'}</div>
                        </td>

                        <td className="aquarium-cell px-4 py-4 align-middle text-center">
                          <Link href={`/track/${track.id}`} className="block truncate text-xs italic text-gray-300 transition-colors hover:text-white md:text-sm">
                            {track.nom_titre}
                          </Link>
                        </td>

                        <td className="aquarium-cell px-4 py-4 align-middle text-center">
                          <span className="inline-flex max-w-full items-center rounded-full border border-cyan-200/12 bg-cyan-200/8 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-cyan-100/78">
                            <span className="truncate">{track.genre || 'Inconnu'}</span>
                          </span>
                        </td>

                        <td className="aquarium-cell px-4 py-4 align-middle text-center">
                          <span className="block truncate text-[10px] font-black uppercase tracking-[0.16em] text-white/58">
                            {track.sous_genre || 'Aucun'}
                          </span>
                        </td>

                        <td className="aquarium-cell px-4 py-4 align-middle text-center">
                          <span className="inline-flex min-w-[82px] items-center justify-center rounded-full border border-cyan-300/14 bg-cyan-400/8 px-3 py-1.5 font-mono text-[11px] font-black text-cyan-100/88">
                            {(track.vues_actuelles || 0).toLocaleString('fr-FR')}
                          </span>
                        </td>

                        <td className="aquarium-cell px-4 py-4 align-middle text-center">
                          <span className="inline-flex items-center gap-2 font-mono text-sm font-black text-white md:text-base">
                            <PointsPearl size="sm" />
                            {(track.points || 0).toLocaleString('fr-FR')}
                          </span>
                        </td>

                        <td className="aquarium-cell px-4 py-4 align-middle text-center">
                          <div className="flex justify-center">
                            <Likesbutton trackId={track.id} trackOwnerId={track.user_id} vuesActuelles={track.vues_actuelles || 0} initialLikes={track.likes || 0} onVoteChange={fetchAll} size="md" targetType="prod" />
                          </div>
                        </td>

                        <td className="aquarium-cell px-4 py-4 align-middle text-center">
                          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-white/54">
                            {new Date(track.date_sortie || track.created_at).toLocaleDateString('fr-FR')}
                          </span>
                        </td>

                        <td className="aquarium-cell px-4 py-4 align-middle text-center">
                          <button
                            onClick={() => setSelectedTrack((current) => current?.id === track.id ? null : track)}
                            className={`relative mx-auto rounded-full border px-4 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all ${
                              selectedTrack?.id === track.id
                                ? 'border-green-500 bg-green-500 text-black shadow-[0_0_20px_rgba(34,197,94,0.3)]'
                                : 'border-green-500/50 bg-black text-green-400 hover:border-green-400/80 hover:shadow-[0_0_12px_rgba(34,197,94,0.18)]'
                            }`}
                          >
                            Scan
                          </button>
                        </td>

                        <td className="aquarium-cell px-4 py-4 align-middle text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Link href={`/profil/${track.digger?.id || track.user_id}`} className="block max-w-full truncate text-center text-[10px] font-black uppercase text-blue-500/80 hover:text-blue-400">
                              @{track.digger?.username || 'Anonyme'}
                            </Link>
                            <EquippedBadgesInline badgeIds={[track.digger?.equipped_badge_1, track.digger?.equipped_badge_2]} size="xs" />
                          </div>
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

      {selectedTrack && (
        <div className="fixed bottom-6 right-6 z-[101] w-[320px] bg-[#050505] border-2 border-green-500/30 rounded-2xl shadow-[0_0_30px_rgba(34,197,94,0.2)] overflow-hidden flex flex-col">
          <div className="p-3 flex justify-between items-center bg-green-500/10 border-b border-green-500/20">
            <div className="flex items-center gap-2 truncate">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <p className="text-[10px] font-black uppercase text-green-400 truncate">{selectedTrack.nom_artiste} — {selectedTrack.nom_titre}</p>
            </div>
            <button onClick={() => setSelectedTrack(null)} className="text-green-500 hover:text-white text-xs px-2">✕</button>
          </div>
          <div className="aspect-video w-full">
            {(selectedTrack.youtube_id || getEmbedUrl(selectedTrack.youtube_url)) ? (
              <iframe width="100%" height="100%" src={`https://www.youtube.com/embed/${selectedTrack.youtube_id || getEmbedUrl(selectedTrack.youtube_url)}?autoplay=1&rel=0&modestbranding=1`} frameBorder="0" allow="autoplay; encrypted-media" allowFullScreen title="Lecteur YouTube"></iframe>
            ) : (
              <div className="w-full h-full bg-black flex items-center justify-center text-xs text-slate-400 px-4 text-center">Lien YouTube invalide.</div>
            )}
          </div>
            <div className="p-4 bg-black flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[8px] text-gray-500 font-black uppercase">Statut Sonar</span>
                <span className="text-[10px] text-green-500 font-mono uppercase tracking-tighter">Scan en cours...</span>
              </div>
              <div className="transform scale-125 origin-right">
                <Likesbutton trackId={selectedTrack.id} trackOwnerId={selectedTrack.user_id} vuesActuelles={selectedTrack.vues_actuelles || 0} initialLikes={selectedTrack.likes || 0} onVoteChange={fetchAll} size="md" targetType="prod" />
              </div>
            </div>
        </div>
      )}
    </div>
  )
}
