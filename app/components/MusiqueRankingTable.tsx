"use client"

import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import EquippedBadgesInline from '@/app/components/EquippedBadgesInline'
import Likesbutton from '@/app/components/likesbutton'
import { checkTop100TracksAndNotify } from '@/lib/notifications'
import type { TrackSummary } from '@/lib/types/track'
import { getEmbedUrl } from '@/lib/youtube'

type RawTrackSummary = Omit<TrackSummary, 'digger'> & {
  digger?: TrackSummary['digger'] | Array<NonNullable<TrackSummary['digger']>>
}

type MusiqueRankingTableProps = {
  variant?: 'default' | 'home'
}

type SortMode = 'points-desc' | 'points-asc' | 'vues-desc' | 'vues-asc'
type PeriodMode = 'day' | 'week' | 'month' | 'year' | 'all-time'

const HOME_BATCH_SIZE = 18
const HOME_FETCH_LIMIT = 240

const SORT_OPTIONS: Array<{ value: SortMode; label: string }> = [
  { value: 'points-desc', label: 'Plus de perles' },
  { value: 'points-asc', label: 'Moins de perles' },
  { value: 'vues-desc', label: 'Plus de vues' },
  { value: 'vues-asc', label: 'Moins de vues' },
]

const PERIOD_OPTIONS: Array<{ value: PeriodMode; label: string }> = [
  { value: 'day', label: 'Du jour' },
  { value: 'week', label: 'De la semaine' },
  { value: 'month', label: 'Du mois' },
  { value: 'year', label: "De l'annee" },
  { value: 'all-time', label: 'All time' },
]

const TRACK_SELECT_FIELDS = [
  'id',
  'user_id',
  'nom_titre',
  'nom_artiste',
  'youtube_url',
  'genre',
  'sous_genre',
  'pays',
  'points',
  'likes',
  'vues_actuelles',
  'vues_au_partage',
  'feedback_enabled',
  'created_at',
  'youtube_channel_id',
  'digger:user_id(id, username, equipped_badge_1, equipped_badge_2)',
].join(', ')

const TRACK_SELECT_FIELDS_LEGACY = [
  'id',
  'user_id',
  'nom_titre',
  'nom_artiste',
  'youtube_url',
  'genre',
  'sous_genre',
  'pays',
  'points',
  'likes',
  'vues_actuelles',
  'vues_au_partage',
  'feedback_enabled',
  'created_at',
  'youtube_channel_id',
  'digger:user_id(id, username)',
].join(', ')

const getCreatedAtTs = (track: TrackSummary) => {
  const ts = new Date(track.created_at || 0).getTime()
  return Number.isFinite(ts) ? ts : 0
}

const matchesPeriod = (track: TrackSummary, periodMode: PeriodMode) => {
  if (periodMode === 'all-time') return true

  const createdAtTs = getCreatedAtTs(track)
  if (!createdAtTs) return false

  const now = new Date()
  const start = new Date(now)

  if (periodMode === 'day') {
    start.setHours(0, 0, 0, 0)
    return createdAtTs >= start.getTime()
  }

  if (periodMode === 'week') {
    const day = start.getDay()
    const diff = day === 0 ? 6 : day - 1
    start.setDate(start.getDate() - diff)
    start.setHours(0, 0, 0, 0)
    return createdAtTs >= start.getTime()
  }

  if (periodMode === 'month') {
    start.setDate(1)
    start.setHours(0, 0, 0, 0)
    return createdAtTs >= start.getTime()
  }

  start.setMonth(0, 1)
  start.setHours(0, 0, 0, 0)
  return createdAtTs >= start.getTime()
}

const normalizeTrackSummary = (track: RawTrackSummary): TrackSummary => ({
  ...track,
  digger: Array.isArray(track.digger) ? track.digger[0] || null : track.digger || null,
})

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message
    return typeof message === 'string' ? message : ''
  }
  return ''
}

const shouldRetryWithoutBadgeColumns = (error: unknown) => {
  const message = getErrorMessage(error).toLowerCase()
  return message.includes('equipped_badge_1') || message.includes('equipped_badge_2')
}

const formatSupabaseError = (error: unknown) => {
  if (error instanceof Error) {
    return { message: error.message, stack: error.stack }
  }
  if (typeof error === 'object' && error !== null) {
    const candidate = error as {
      code?: unknown
      details?: unknown
      hint?: unknown
      message?: unknown
    }
    return {
      message: typeof candidate.message === 'string' ? candidate.message : '',
      code: typeof candidate.code === 'string' ? candidate.code : '',
      details: typeof candidate.details === 'string' ? candidate.details : '',
      hint: typeof candidate.hint === 'string' ? candidate.hint : '',
    }
  }
  return { message: String(error) }
}

export default function MusiqueRankingTable({ variant = 'default' }: MusiqueRankingTableProps) {
  const [tracks, setTracks] = useState<TrackSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [genreFilter, setGenreFilter] = useState('')
  const [subGenreFilter, setSubGenreFilter] = useState('')
  const [paysFilter, setPaysFilter] = useState('')
  const [sortMode, setSortMode] = useState<SortMode>('points-desc')
  const [periodMode, setPeriodMode] = useState<PeriodMode>('all-time')
  const [genres, setGenres] = useState<string[]>([])
  const [subGenres, setSubGenres] = useState<string[]>([])
  const [countries, setCountries] = useState<string[]>([])
  const [selectedTrack, setSelectedTrack] = useState<TrackSummary | null>(null)
  const [reportModal, setReportModal] = useState<{ trackId: string; title: string } | null>(null)
  const [reportReason, setReportReason] = useState('')
  const [showFilterMenu, setShowFilterMenu] = useState(false)
  const [showDesktopFilters, setShowDesktopFilters] = useState(false)
  const [activePodiumTrackId, setActivePodiumTrackId] = useState<string | null>(null)
  const [filterMenuPosition, setFilterMenuPosition] = useState({ top: 0, left: 0 })
  const [visibleCount, setVisibleCount] = useState(HOME_BATCH_SIZE)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const filterTriggerRef = useRef<HTMLDivElement | null>(null)

  const fetchTracks = useEffectEvent(async () => {
    setLoading(true)
    try {
      const runTrackQuery = async (selectFields: string) => {
        let query = supabase
          .from('titre')
          .select(selectFields)
          .not('type_partage', 'eq', 'production')
          .order('points', { ascending: false })
          .order('created_at', { ascending: false })

        if (isHomeVariant) {
          query = query.limit(HOME_FETCH_LIMIT)
        }

        return query.returns<RawTrackSummary[]>()
      }

      let { data: allTracks, error } = await runTrackQuery(TRACK_SELECT_FIELDS)

      if (error && shouldRetryWithoutBadgeColumns(error)) {
        console.warn('Colonnes badges non disponibles sur public.digger, fallback sans badges equipes pour le tableau musique.')
        const fallbackResult = await runTrackQuery(TRACK_SELECT_FIELDS_LEGACY)
        allTracks = fallbackResult.data
        error = fallbackResult.error
      }

      if (error) {
        throw error
      }

      if (allTracks) {
        const nextTracks = allTracks.map(normalizeTrackSummary)
        setTracks(nextTracks)
        setGenres([...new Set(nextTracks.map((track) => track.genre).filter(Boolean))] as string[])
        setSubGenres([...new Set(nextTracks.map((track) => track.sous_genre).filter(Boolean))] as string[])
        setCountries([...new Set(nextTracks.map((track) => track.pays).filter(Boolean))] as string[])

        if (!isHomeVariant) {
          const { data: { session } } = await supabase.auth.getSession()
          if (session?.user?.id) {
          const sorted = [...nextTracks].sort((a, b) => (b.points || 0) - (a.points || 0))
          await checkTop100TracksAndNotify(
            session.user.id,
            'musique',
            sorted.map((track) => ({
              id: track.id,
              user_id: track.user_id,
              nom_titre: track.nom_titre,
              nom_artiste: track.nom_artiste,
            }))
          )
        }
        }
      } else {
        setTracks([])
      }
    } catch (err) {
      console.error('Erreur fetchTracks musique:', formatSupabaseError(err))
      setTracks([])
    } finally {
      setLoading(false)
    }
  })

  useEffect(() => {
    fetchTracks()
  }, [])

  const availableSubGenres = useMemo(() => {
    const nextSubGenres = genreFilter
      ? tracks.filter((track) => track.genre === genreFilter).map((track) => track.sous_genre)
      : subGenres

    return [...new Set(nextSubGenres.filter(Boolean))] as string[]
  }, [genreFilter, subGenres, tracks])

  const filteredTracks = useMemo(() => {
    const nextTracks = tracks
      .filter((track) => !genreFilter || track.genre === genreFilter)
      .filter((track) => !subGenreFilter || track.sous_genre === subGenreFilter)
      .filter((track) => !paysFilter || track.pays === paysFilter)
      .filter((track) => matchesPeriod(track, periodMode))

    const sortedTracks = [...nextTracks]
    sortedTracks.sort((a, b) => {
      if (sortMode === 'points-asc') {
        return (a.points || 0) - (b.points || 0) || getCreatedAtTs(b) - getCreatedAtTs(a)
      }

      if (sortMode === 'vues-desc') {
        return (b.vues_actuelles || 0) - (a.vues_actuelles || 0) || (b.points || 0) - (a.points || 0)
      }

      if (sortMode === 'vues-asc') {
        return (a.vues_actuelles || 0) - (b.vues_actuelles || 0) || (b.points || 0) - (a.points || 0)
      }

      return (b.points || 0) - (a.points || 0) || getCreatedAtTs(b) - getCreatedAtTs(a)
    })

    return sortedTracks
  }, [tracks, genreFilter, subGenreFilter, paysFilter, periodMode, sortMode])

  const isHomeVariant = variant === 'home'
  const visibleTracks = isHomeVariant ? filteredTracks.slice(0, visibleCount) : filteredTracks
  const hasMoreTracks = isHomeVariant && visibleCount < filteredTracks.length
  const compactHeaderCell = 'px-2 py-2 md:px-3 md:py-2.5'
  const compactBodyCell = 'px-2 py-1.5 md:px-3 md:py-2'
  const defaultHeaderCell = 'px-4 py-4 text-center align-middle'
  const defaultBodyCell = 'px-4 py-4 align-middle'
  const homeColumnWidths = ['16%', '16%', '11%', '11%', '11%', '15%', '20%']
  const defaultColumnWidths = ['15%', '17%', '11%', '11%', '10%', '10%', '10%', '8%', '8%']
  const columnWidths = isHomeVariant ? homeColumnWidths : defaultColumnWidths
  const homeCellAlignClass = isHomeVariant ? 'text-center' : ''
  const glassCellClass = 'aquarium-cell'
  const activeFilterCount = [genreFilter, subGenreFilter, paysFilter].filter(Boolean).length
  const podiumTracks = filteredTracks.slice(0, 3)
  const podiumLayout = [
    { track: podiumTracks[1] ?? null, place: 2, shellClass: 'md:mt-8', cardClass: 'min-h-[176px] md:min-h-[196px]' },
    { track: podiumTracks[0] ?? null, place: 1, shellClass: 'md:-mt-1', cardClass: 'min-h-[204px] md:min-h-[228px]' },
    { track: podiumTracks[2] ?? null, place: 3, shellClass: 'md:mt-12', cardClass: 'min-h-[148px] md:min-h-[162px]' },
  ]

  useEffect(() => {
    if (!subGenreFilter) return
    if (availableSubGenres.includes(subGenreFilter)) return
    setSubGenreFilter('')
  }, [availableSubGenres, subGenreFilter])

  useEffect(() => {
    if (!isHomeVariant) return
    setVisibleCount(HOME_BATCH_SIZE)
  }, [genreFilter, subGenreFilter, paysFilter, sortMode, isHomeVariant])

  useEffect(() => {
    if (!isHomeVariant || !hasMoreTracks || !sentinelRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry?.isIntersecting) {
          setVisibleCount((count) => Math.min(count + HOME_BATCH_SIZE, filteredTracks.length))
        }
      },
      { rootMargin: '240px 0px' }
    )

    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [filteredTracks.length, hasMoreTracks, isHomeVariant])

  useEffect(() => {
    if (!isHomeVariant || !showFilterMenu) return

    const updateFilterMenuPosition = () => {
      const trigger = filterTriggerRef.current
      if (!trigger) return

      const rect = trigger.getBoundingClientRect()
      const menuWidth = 224
      const viewportPadding = 12
      const nextLeft = Math.min(
        Math.max(rect.left, viewportPadding),
        window.innerWidth - menuWidth - viewportPadding
      )

      setFilterMenuPosition({
        top: rect.bottom + 12,
        left: nextLeft,
      })
    }

    updateFilterMenuPosition()
    window.addEventListener('resize', updateFilterMenuPosition)
    window.addEventListener('scroll', updateFilterMenuPosition, true)

    return () => {
      window.removeEventListener('resize', updateFilterMenuPosition)
      window.removeEventListener('scroll', updateFilterMenuPosition, true)
    }
  }, [isHomeVariant, showFilterMenu])

  useEffect(() => {
    if (isHomeVariant) return
    if (!activePodiumTrackId) return

    const trackStillVisible = podiumTracks.some((track) => track?.id === activePodiumTrackId)
    if (!trackStillVisible) {
      setActivePodiumTrackId(null)
    }
  }, [activePodiumTrackId, isHomeVariant, podiumTracks])

  if (loading) {
    return <div className="p-10 text-center font-black italic uppercase tracking-widest text-green-500 animate-pulse">Scanning frequencies...</div>
  }

  return (
    <>
      {!isHomeVariant && (
        <section className="space-y-3">
          <div className="rounded-[24px] border border-lime-300/34 bg-[linear-gradient(180deg,rgba(0,0,0,0.88),rgba(4,6,4,0.94))] p-3 shadow-[0_0_24px_rgba(163,230,53,0.1)] backdrop-blur-md sm:p-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0">
                <p className="text-[8px] font-black uppercase tracking-[0.28em] text-cyan-100/44">Radar actif</p>
                <p className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-lime-100/72">
                  {filteredTracks.length.toLocaleString('fr-FR')} titres affiches sur {tracks.length.toLocaleString('fr-FR')}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select value={sortMode} onChange={(e) => setSortMode(e.target.value as SortMode)} className="min-w-[170px] rounded-full border border-lime-300/24 bg-black/80 px-3 py-2 text-[10px] font-black uppercase text-white outline-none transition-colors hover:border-lime-300/46">
                  {SORT_OPTIONS.map((option) => <option key={option.value} value={option.value} className="bg-black">{option.label}</option>)}
                </select>

                <select value={periodMode} onChange={(e) => setPeriodMode(e.target.value as PeriodMode)} className="min-w-[150px] rounded-full border border-lime-300/24 bg-black/80 px-3 py-2 text-[10px] font-black uppercase text-white outline-none transition-colors hover:border-lime-300/46">
                  {PERIOD_OPTIONS.map((option) => <option key={option.value} value={option.value} className="bg-black">{option.label}</option>)}
                </select>

                <button
                  type="button"
                  onClick={() => setShowDesktopFilters((value) => !value)}
                  className="rounded-full border border-lime-400/32 bg-lime-300/8 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-lime-100/86 transition-colors hover:border-lime-300/58 hover:bg-lime-300/14"
                >
                  {showDesktopFilters ? 'Masquer filtres' : `Filtres${activeFilterCount ? ` (${activeFilterCount})` : ''}`}
                </button>

                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setGenreFilter('')
                      setSubGenreFilter('')
                      setPaysFilter('')
                    }}
                    className="rounded-full border border-lime-300/20 bg-black/70 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/76 transition-colors hover:border-lime-300/34 hover:bg-black"
                  >
                    Reinitialiser
                  </button>
                )}
              </div>
            </div>

            {showDesktopFilters && (
              <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
                <select value={genreFilter} onChange={(e) => setGenreFilter(e.target.value)} className="w-full rounded-2xl border border-lime-300/22 bg-black/80 px-3 py-2.5 text-[10px] font-black uppercase text-white outline-none transition-colors hover:border-lime-300/46">
                  <option value="" className="bg-black">Tous les genres</option>
                  {genres.map((genre) => <option key={genre} value={genre} className="bg-black">{genre}</option>)}
                </select>

                <select value={subGenreFilter} onChange={(e) => setSubGenreFilter(e.target.value)} className="w-full rounded-2xl border border-lime-300/22 bg-black/80 px-3 py-2.5 text-[10px] font-black uppercase text-white outline-none transition-colors hover:border-lime-300/46">
                  <option value="" className="bg-black">Toutes les sous-categories</option>
                  {availableSubGenres.map((subGenre) => <option key={subGenre} value={subGenre} className="bg-black">{subGenre}</option>)}
                </select>

                <select value={paysFilter} onChange={(e) => setPaysFilter(e.target.value)} className="w-full rounded-2xl border border-lime-300/22 bg-black/80 px-3 py-2.5 text-[10px] font-black uppercase text-white outline-none transition-colors hover:border-lime-300/46">
                  <option value="" className="bg-black">Monde entier</option>
                  {countries.map((country) => <option key={country} value={country} className="bg-black">{country}</option>)}
                </select>
              </div>
            )}
          </div>

          {podiumTracks.length > 0 && (
            <div className="mx-auto w-full max-w-5xl rounded-[26px] border border-lime-300/34 bg-[linear-gradient(180deg,rgba(0,0,0,0.88),rgba(4,6,4,0.94))] px-4 py-3 shadow-[0_0_22px_rgba(163,230,53,0.1)] sm:px-5">
              <div className="mb-2 flex items-end justify-between gap-3">
                <div>
                  <p className="text-[8px] font-black uppercase tracking-[0.3em] text-cyan-100/46">Podium radar</p>
                  <p className="mt-1 text-[9px] font-black uppercase tracking-[0.14em] text-lime-100/68">Top 3 visible des l&apos;arrivee sur la page.</p>
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
                            onClick={() => setActivePodiumTrackId(track.id)}
                            className="group relative mb-3 block aspect-[16/8.6] w-full overflow-hidden rounded-[16px] border border-white/10 bg-black/40 text-left"
                          >
                            {activePodiumTrackId === track.id ? (
                              <iframe
                                width="100%"
                                height="100%"
                                src={`https://www.youtube.com/embed/${getEmbedUrl(track.youtube_url)}?autoplay=1&rel=0&modestbranding=1`}
                                title={`${track.nom_artiste} - ${track.nom_titre}`}
                                frameBorder="0"
                                allow="autoplay; encrypted-media"
                                allowFullScreen
                                className="absolute inset-0 h-full w-full"
                              />
                            ) : (
                              <>
                                <img
                                  src={`https://img.youtube.com/vi/${getEmbedUrl(track.youtube_url)}/hqdefault.jpg`}
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
                            )}
                          </button>

                          <p className="text-[8px] font-black uppercase tracking-[0.16em] text-cyan-100/52">{track.nom_artiste}</p>
                          <Link href={`/track/${track.id}`} className="mt-1 block text-base font-black uppercase italic leading-tight text-white transition-colors hover:text-lime-100 sm:text-lg">
                            {track.nom_titre}
                          </Link>
                          <p className="mt-1.5 text-[9px] font-mono font-black uppercase tracking-[0.14em] text-lime-200/84">
                            {(track.points || 0).toLocaleString('fr-FR')} perles
                          </p>
                        </div>

                        <div className="relative z-10 mt-2 flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => setActivePodiumTrackId(track.id)}
                            className={`rounded-full border px-2.5 py-1.5 text-[8px] font-black uppercase tracking-[0.14em] transition-all ${
                              activePodiumTrackId === track.id
                                ? 'border-green-500 bg-green-500 text-black shadow-[0_0_18px_rgba(34,197,94,0.28)]'
                                : 'border-green-500/50 bg-black/60 text-green-400 hover:border-green-400/80 hover:shadow-[0_0_12px_rgba(34,197,94,0.18)]'
                            }`}
                          >
                            ▶ Media Play
                          </button>

                          <div className="flex items-center gap-2 min-w-0">
                            <Link href={`/profil/${track.user_id}`} className="truncate text-[8px] font-black uppercase tracking-[0.14em] text-blue-400/86 hover:text-blue-300">
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
        </section>
      )}

      {!isHomeVariant && (
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
              <table className="table-fixed min-w-[980px] w-full border-collapse text-left xl:min-w-0">
                <colgroup>
                  {columnWidths.map((width, index) => (
                    <col key={index} style={{ width }} />
                  ))}
                </colgroup>

                <thead className="bg-[linear-gradient(180deg,rgba(2,10,14,0.94),rgba(0,0,0,0.8))] text-cyan-100/64 text-[9px] uppercase tracking-[0.24em]">
                  <tr>
                    <th className={`${defaultHeaderCell} border-b border-white/10`}>Artiste</th>
                    <th className={`${defaultHeaderCell} border-b border-white/10`}>Titre</th>
                    <th className={`${defaultHeaderCell} border-b border-white/10`}>Genre</th>
                    <th className={`${defaultHeaderCell} border-b border-white/10`}>Sous-genre</th>
                    <th className={`${defaultHeaderCell} border-b border-white/10`}>Vues</th>
                    <th className={`${defaultHeaderCell} border-b border-white/10`}>Perles</th>
                    <th className={`${defaultHeaderCell} border-b border-white/10 text-center`}>Sonar</th>
                    <th className={`${defaultHeaderCell} border-b border-white/10 text-center italic`}>LIEN</th>
                    <th className={`${defaultHeaderCell} border-b border-white/10 relative`}>Digger</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/5">
                  {visibleTracks.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-10 text-center text-gray-500 italic">Aucun titre disponible.</td>
                    </tr>
                  ) : (
                    visibleTracks.map((track) => (
                      <tr key={track.id} className="group transition-all duration-500 aquarium-row">
                        <td className={`${defaultBodyCell} text-center ${glassCellClass}`}>
                          <div className="truncate text-xs font-black uppercase italic text-white md:text-sm">{track.nom_artiste}</div>
                        </td>

                        <td className={`${defaultBodyCell} text-center ${glassCellClass}`}>
                          <Link href={`/track/${track.id}`} className="block truncate text-xs italic text-gray-300 transition-colors hover:text-white md:text-sm">
                            {track.nom_titre}
                          </Link>
                        </td>

                        <td className={`${defaultBodyCell} text-center ${glassCellClass}`}>
                          <span className="inline-flex max-w-full items-center rounded-full border border-cyan-200/12 bg-cyan-200/8 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-cyan-100/78">
                            <span className="truncate">{track.genre || 'Inconnu'}</span>
                          </span>
                        </td>

                        <td className={`${defaultBodyCell} text-center ${glassCellClass}`}>
                          <span className="block truncate text-[10px] font-black uppercase tracking-[0.16em] text-white/58">
                            {track.sous_genre || 'Aucun'}
                          </span>
                        </td>

                        <td className={`${defaultBodyCell} text-center ${glassCellClass}`}>
                          <span className="inline-flex min-w-[82px] items-center justify-center rounded-full border border-cyan-300/14 bg-cyan-400/8 px-3 py-1.5 font-mono text-[11px] font-black text-cyan-100/88">
                            {(track.vues_actuelles || 0).toLocaleString('fr-FR')}
                          </span>
                        </td>

                        <td className={`${defaultBodyCell} text-center ${glassCellClass}`}>
                          <span className="font-mono text-sm font-black text-white md:text-base">
                            {(track.points || 0).toLocaleString('fr-FR')}
                          </span>
                        </td>

                        <td className={`${defaultBodyCell} text-center ${glassCellClass}`}>
                          <div className="flex justify-center">
                            <Likesbutton trackId={track.id} trackOwnerId={track.user_id} vuesActuelles={track.vues_actuelles || 0} initialLikes={track.likes || 0} size="md" />
                          </div>
                        </td>

                        <td className={`${defaultBodyCell} text-center ${glassCellClass}`}>
                          <button onClick={() => setSelectedTrack((current) => current?.id === track.id ? null : track)} className="relative mx-auto flex scale-90 items-center justify-center">
                            <div className={`relative rounded-full border px-4 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all ${selectedTrack?.id === track.id ? 'border-green-500 bg-green-500 text-black shadow-[0_0_20px_rgba(34,197,94,0.3)]' : 'border-green-500/50 bg-black text-green-400 hover:border-green-400/80 hover:shadow-[0_0_12px_rgba(34,197,94,0.18)]'}`}>
                              📡 SCAN
                            </div>
                          </button>
                        </td>

                        <td className={`${defaultBodyCell} text-center ${glassCellClass}`}>
                          <div className="flex items-center justify-center gap-3">
                            <div className="flex items-center justify-center gap-2">
                              <Link href={`/profil/${track.user_id}`} className="block max-w-full truncate text-center text-[10px] font-black uppercase text-blue-500/80 hover:text-blue-400">
                                @{track.digger?.username || 'Anonyme'}
                              </Link>
                              <EquippedBadgesInline badgeIds={[track.digger?.equipped_badge_1, track.digger?.equipped_badge_2]} size="xs" />
                            </div>
                            <button onClick={() => setReportModal({ trackId: track.id, title: track.nom_titre })} className="flex flex-col gap-0.5 text-gray-700 hover:text-white">
                              <span className="h-1 w-1 rounded-full bg-current"></span>
                              <span className="h-1 w-1 rounded-full bg-current"></span>
                              <span className="h-1 w-1 rounded-full bg-current"></span>
                            </button>
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
      )}

      {isHomeVariant && (
        <>
          <div className={`table-shell mb-20 relative z-20 overflow-hidden rounded-b-[28px] border border-t-0 border-lime-400/20 bg-[linear-gradient(180deg,rgba(5,12,18,0.58),rgba(2,8,14,0.42))] shadow-[0_18px_40px_rgba(0,0,0,0.26)]`}>
            <div className="relative w-full overflow-x-auto rounded-b-[28px]">
              <table className="table-fixed w-full border-collapse text-left">
                <colgroup>
                  {columnWidths.map((width, index) => (
                    <col key={index} style={{ width }} />
                  ))}
                </colgroup>

                <thead className="bg-black text-[8px] uppercase tracking-[0.06em] text-white md:text-[9px]">
                  <tr>
                    <th className={`${homeCellAlignClass} ${compactHeaderCell} border-b border-white/10`}>Artiste</th>
                    <th className={`${homeCellAlignClass} ${compactHeaderCell} border-b border-white/10`}>Titre</th>
                    <th className={`${homeCellAlignClass} ${compactHeaderCell} border-b border-white/10`}>Genre</th>
                    <th className={`${compactHeaderCell} border-b border-white/10 text-center`}>Perles</th>
                    <th className={`${compactHeaderCell} border-b border-white/10 text-center`}>Sonar</th>
                    <th className={`px-1.5 py-2 md:px-2 md:py-2.5 border-b border-white/10 text-center italic`}>LIEN</th>
                    <th className={`px-2 py-2 md:px-3 md:py-2.5 text-center align-middle border-b border-white/10 relative`}>
                      <div className="relative flex min-h-[28px] items-center justify-center">
                        <span className="block w-full pr-9 text-center leading-none md:pr-10">Digger</span>
                        <div ref={filterTriggerRef} className="absolute right-3 top-1/2 -translate-y-1/2 md:right-4">
                          <button
                            onClick={() => setShowFilterMenu((value) => !value)}
                            className="flex h-4 w-4 items-center justify-center rounded-sm border border-lime-400/55 bg-white text-black transition-colors hover:bg-lime-400"
                            aria-label="Parametres"
                            aria-expanded={showFilterMenu}
                            type="button"
                          >
                            <span className="text-[9px] leading-none">{showFilterMenu ? '↑' : '↓'}</span>
                          </button>
                        </div>
                      </div>
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/5">
                  {visibleTracks.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-10 text-center text-gray-500 italic">Aucun titre disponible.</td>
                    </tr>
                  ) : (
                    visibleTracks.map((track) => (
                      <tr key={track.id} className="group transition-all duration-500 aquarium-row">
                        <td className={`${compactBodyCell} ${homeCellAlignClass} ${glassCellClass}`}>
                          <div className="truncate text-xs font-black uppercase italic text-white md:text-sm">{track.nom_artiste}</div>
                        </td>

                        <td className={`${compactBodyCell} ${homeCellAlignClass} ${glassCellClass}`}>
                          <Link href={`/track/${track.id}`} className="block truncate text-xs italic text-gray-300 transition-colors hover:text-white md:text-sm">
                            {track.nom_titre}
                          </Link>
                        </td>

                        <td className={`${compactBodyCell} ${homeCellAlignClass} ${glassCellClass}`}>
                          <span className="inline-block max-w-full truncate rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-gray-400 md:text-[10px]">
                            {track.genre || 'Inconnu'}
                          </span>
                        </td>

                        <td className={`${compactBodyCell} text-center ${glassCellClass}`}>
                          <span className="font-mono text-sm font-black text-white md:text-base">
                            {(track.points || 0).toLocaleString('fr-FR')}
                          </span>
                        </td>

                        <td className={`${compactBodyCell} text-center ${glassCellClass}`}>
                          <div className="flex justify-center">
                            <Likesbutton trackId={track.id} trackOwnerId={track.user_id} vuesActuelles={track.vues_actuelles || 0} initialLikes={track.likes || 0} size="md" />
                          </div>
                        </td>

                        <td className={`${compactBodyCell} text-center ${glassCellClass}`}>
                          <button onClick={() => setSelectedTrack((current) => current?.id === track.id ? null : track)} className="relative mx-auto flex scale-90 items-center justify-center">
                            <div className={`relative rounded-full border px-4 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all ${selectedTrack?.id === track.id ? 'border-green-500 bg-green-500 text-black shadow-[0_0_20px_rgba(34,197,94,0.3)]' : 'border-green-500/50 bg-black text-green-400 hover:border-green-400/80 hover:shadow-[0_0_12px_rgba(34,197,94,0.18)]'}`}>
                              📡 SCAN
                            </div>
                          </button>
                        </td>

                        <td className={`${compactBodyCell} ${homeCellAlignClass} ${glassCellClass}`}>
                          <div className="relative flex min-h-[28px] items-center justify-center">
                            <div className="flex w-full items-center justify-center gap-2 pr-9 md:pr-10">
                              <Link href={`/profil/${track.user_id}`} className="block max-w-full truncate text-center text-[10px] font-black uppercase text-blue-500/80 hover:text-blue-400">
                                @{track.digger?.username || 'Anonyme'}
                              </Link>
                              <EquippedBadgesInline badgeIds={[track.digger?.equipped_badge_1, track.digger?.equipped_badge_2]} size="xs" />
                            </div>
                            <button onClick={() => setReportModal({ trackId: track.id, title: track.nom_titre })} className="absolute right-3 top-1/2 flex -translate-y-1/2 flex-col gap-0.5 text-gray-700 hover:text-white md:right-4">
                              <span className="h-1 w-1 rounded-full bg-current"></span>
                              <span className="h-1 w-1 rounded-full bg-current"></span>
                              <span className="h-1 w-1 rounded-full bg-current"></span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {showFilterMenu && (
            <div className="fixed z-[220] w-56 rounded-2xl border border-lime-400/45 bg-[#03150b] p-4 shadow-[0_0_24px_rgba(163,230,53,0.22)]" style={{ top: filterMenuPosition.top, left: filterMenuPosition.left }}>
              <label className="mb-1 block text-[8px] font-black uppercase tracking-[0.24em] text-lime-200/70">Genre</label>
              <select value={genreFilter} onChange={(e) => setGenreFilter(e.target.value)} className="mb-3 w-full rounded-xl border border-lime-400/30 bg-black/30 px-3 py-2 text-[10px] font-bold uppercase text-gray-200 outline-none">
                <option value="" className="bg-black">Tous les genres</option>
                {genres.map((genre) => <option key={genre} value={genre} className="bg-black">{genre}</option>)}
              </select>

              <label className="mb-1 block text-[8px] font-black uppercase tracking-[0.24em] text-lime-200/70">Sous-categorie</label>
              <select value={subGenreFilter} onChange={(e) => setSubGenreFilter(e.target.value)} className="mb-3 w-full rounded-xl border border-lime-400/30 bg-black/30 px-3 py-2 text-[10px] font-bold uppercase text-gray-200 outline-none">
                <option value="" className="bg-black">Toutes</option>
                {availableSubGenres.map((subGenre) => <option key={subGenre} value={subGenre} className="bg-black">{subGenre}</option>)}
              </select>

              <label className="mb-1 block text-[8px] font-black uppercase tracking-[0.24em] text-lime-200/70">Origine</label>
              <select value={paysFilter} onChange={(e) => setPaysFilter(e.target.value)} className="mb-3 w-full rounded-xl border border-lime-400/30 bg-black/30 px-3 py-2 text-[10px] font-bold uppercase text-gray-200 outline-none">
                <option value="" className="bg-black">Monde entier</option>
                {countries.map((country) => <option key={country} value={country} className="bg-black">{country}</option>)}
              </select>

              <label className="mb-1 block text-[8px] font-black uppercase tracking-[0.24em] text-lime-200/70">Tri</label>
              <select value={sortMode} onChange={(e) => setSortMode(e.target.value as SortMode)} className="w-full rounded-xl border border-lime-400/30 bg-black/30 px-3 py-2 text-[10px] font-bold uppercase text-gray-200 outline-none">
                {SORT_OPTIONS.map((option) => <option key={option.value} value={option.value} className="bg-black">{option.label}</option>)}
              </select>
            </div>
          )}

          {hasMoreTracks && <div ref={sentinelRef} className="h-10 w-full" aria-hidden="true" />}
          {hasMoreTracks && (
            <p className="-mt-10 mb-16 text-center text-[9px] font-black uppercase tracking-[0.24em] text-lime-300/60">
              Descends pour charger la suite.
            </p>
          )}
        </>
      )}

      {selectedTrack && (
        <div className="fixed bottom-6 right-6 z-[101] flex w-[320px] max-w-[calc(100vw-1rem)] flex-col overflow-hidden rounded-2xl border-2 border-green-500/30 bg-[#050505] shadow-[0_0_30px_rgba(34,197,94,0.2)]">
          <div className="flex items-center justify-between border-b border-green-500/20 bg-green-500/10 p-3">
            <div className="flex items-center gap-2 truncate">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
              <p className="truncate text-[10px] font-black uppercase text-green-400">{selectedTrack.nom_artiste} - {selectedTrack.nom_titre}</p>
            </div>
            <button onClick={() => setSelectedTrack(null)} className="px-2 text-xs text-green-500 hover:text-white">✕</button>
          </div>

          <div className="aspect-video w-full">
            <iframe width="100%" height="100%" src={`https://www.youtube.com/embed/${getEmbedUrl(selectedTrack.youtube_url)}?autoplay=1&rel=0&modestbranding=1`} frameBorder="0" allow="autoplay; encrypted-media" allowFullScreen></iframe>
          </div>

          <div className="flex items-center justify-between bg-black p-4">
            <div className="flex flex-col">
              <span className="text-[8px] font-black uppercase text-gray-500">Statut Sonar</span>
              <span className="text-[10px] font-mono uppercase tracking-tighter text-green-500">Scan en cours...</span>
            </div>
            <div className="origin-right scale-125 transform">
              <Likesbutton trackId={selectedTrack.id} trackOwnerId={selectedTrack.user_id} vuesActuelles={selectedTrack.vues_actuelles || 0} initialLikes={selectedTrack.likes || 0} size="md" />
            </div>
          </div>
        </div>
      )}

      {reportModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 p-4 backdrop-blur-xl">
          <div className="w-full max-w-md rounded-[30px] border-2 border-red-500/20 bg-[#0a0a0a] p-8">
            <h3 className="mb-2 text-2xl font-black uppercase italic">Signaler</h3>
            <textarea value={reportReason} onChange={(e) => setReportReason(e.target.value)} placeholder="Raison..." className="mb-6 h-32 w-full resize-none rounded-2xl border border-white/10 bg-white/5 p-4 text-sm outline-none focus:border-red-500" />
            <div className="flex gap-4">
              <button onClick={() => setReportModal(null)} className="flex-1 rounded-2xl bg-white/5 py-4 text-[10px] font-black uppercase">Annuler</button>
              <button
                onClick={async () => {
                  await supabase.from('reports').insert({
                    titre_id: reportModal.trackId,
                    user_id: (await supabase.auth.getSession()).data.session?.user?.id,
                    reason: reportReason,
                  })
                  setReportModal(null)
                  setReportReason('')
                }}
                className="flex-1 rounded-2xl bg-red-600 py-4 text-[10px] font-black uppercase"
              >
                Envoyer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
