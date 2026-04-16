"use client"

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import EquippedBadgesInline from '@/app/components/EquippedBadgesInline'
import Likesbutton from '@/app/components/likesbutton'
import { getTrackEmbedId } from '@/lib/youtube'

type TitlePayload = {
  id: string
  user_id: string
  digger?: {
    username?: string | null
    equipped_badge_1?: string | null
    equipped_badge_2?: string | null
  } | null
  nom_artiste: string
  nom_titre: string
  youtube_url: string
  youtube_id?: string | null
  vues_actuelles?: number | null
  likes?: number | null
}

type ActiveTrack = {
  id: string
  titre_id: string
  source: 'admin' | 'suggestion'
  created_at: string
  expires_at: string
  week_number: number
  yesVotes: number
  noVotes: number
  score: number
  myYes: boolean
  myNo: boolean
  secondsLeft: number
  titre: TitlePayload
}

type LockedTrack = {
  id: string
  titre_id: string
  source: 'admin' | 'suggestion'
  created_at: string
  locked_at: string | null
  week_number: number
  titre: TitlePayload
}

type CyclePayload = {
  id: string
  status: 'active' | 'completed'
  current_week: number
  weeks_total: number
  started_at: string
  completed_at: string | null
}

type DailyVotesPayload = {
  yesUsed: boolean
  noUsed: boolean
}

const DAY_MS = 24 * 60 * 60 * 1000
const WEEK_MS = 7 * DAY_MS

const formatRemaining = (seconds: number) => {
  const safe = Math.max(0, seconds)
  const days = Math.floor(safe / 86400)
  const hours = Math.floor((safe % 86400) / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  const remainingSeconds = safe % 60
  if (days > 0) {
    return `${days}j ${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(remainingSeconds).padStart(2, '0')}s`
  }
  return `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(remainingSeconds).padStart(2, '0')}s`
}

const formatCountdownCard = (seconds: number | null) => {
  if (seconds === null) return '—'
  return formatRemaining(seconds)
}

const formatDate = (value?: string | null) => {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

const getDaysInPlaylist = (createdAt: string, now: number) => {
  const createdAtMs = new Date(createdAt).getTime()
  if (!Number.isFinite(createdAtMs)) return 0
  return Math.max(1, Math.floor((now - createdAtMs) / DAY_MS) + 1)
}

export default function PlaylistoartagerPage() {
  const [loading, setLoading] = useState(true)
  const [snapshotNow, setSnapshotNow] = useState(() => Date.now())
  const [cycle, setCycle] = useState<CyclePayload | null>(null)
  const [activeTracks, setActiveTracks] = useState<ActiveTrack[]>([])
  const [lockedTracks, setLockedTracks] = useState<LockedTrack[]>([])
  const [dailyVotes, setDailyVotes] = useState<DailyVotesPayload>({ yesUsed: false, noUsed: false })
  const [error, setError] = useState('')
  const [busyVote, setBusyVote] = useState<string | null>(null)
  const [busySuggest, setBusySuggest] = useState(false)
  const [myTitles, setMyTitles] = useState<any[]>([])
  const [selectedTitreId, setSelectedTitreId] = useState('')
  const [success, setSuccess] = useState('')
  const [selectedTrack, setSelectedTrack] = useState<TitlePayload | null>(null)
  const [isRulesOpen, setIsRulesOpen] = useState(false)

  const fetchTracks = async () => {
    setLoading(true)
    setError('')
    const fetchedAt = Date.now()

    const { data: { session } } = await supabase.auth.getSession()
    const headers: HeadersInit = {}
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`

    const res = await fetch('/api/playlistoartager/tracks', { headers })
    const json = await res.json()

    if (!res.ok) {
      setError(json.error || 'Impossible de charger la playlist.')
      setCycle(null)
      setActiveTracks([])
      setLockedTracks([])
      setDailyVotes({ yesUsed: false, noUsed: false })
      setLoading(false)
      return
    }

    setCycle(json.cycle || null)
    setActiveTracks(json.activeTracks || [])
    setLockedTracks(json.lockedTracks || [])
    setDailyVotes(json.dailyVotes || { yesUsed: false, noUsed: false })
    setSnapshotNow(fetchedAt)
    setLoading(false)
  }

  const fetchMyTitles = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setMyTitles([])
      return
    }

    const { data } = await supabase
      .from('titre')
      .select('id, nom_artiste, nom_titre')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100)

    setMyTitles(data || [])
  }

  useEffect(() => {
    fetchTracks()
    fetchMyTitles()
  }, [])

  const handleVote = async (trackId: string, voteType: 'yes' | 'no') => {
    setError('')
    setSuccess('')
    setBusyVote(`${trackId}:${voteType}`)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setError('Connecte-toi pour voter.')
        return
      }

      const res = await fetch('/api/playlistoartager/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ trackId, voteType }),
      })

      const json = await res.json()
      if (!res.ok) {
        setError(json.error || 'Vote impossible pour le moment.')
        return
      }

      setSuccess(`Vote ${voteType === 'yes' ? 'OUI' : 'NON'} enregistre.`)
      await fetchTracks()
    } finally {
      setBusyVote(null)
    }
  }

  const handleSuggest = async () => {
    setError('')
    setSuccess('')

    if (!selectedTitreId) {
      setError('Choisis un son a proposer.')
      return
    }

    setBusySuggest(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setError('Connecte-toi pour proposer un son.')
        return
      }

      const res = await fetch('/api/playlistoartager/suggest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ titreId: selectedTitreId }),
      })

      const json = await res.json()
      if (!res.ok) {
        if (json.nextAllowedAt) {
          const dt = new Date(json.nextAllowedAt)
          setError(`Cooldown actif. Nouvelle proposition a partir du ${dt.toLocaleString('fr-FR')}.`)
        } else {
          setError(json.error || 'Proposition refusee.')
        }
        return
      }

      setSuccess('Proposition envoyee. Elle pourra rejoindre une prochaine semaine de playlist.')
      setSelectedTitreId('')
      await fetchTracks()
    } finally {
      setBusySuggest(false)
    }
  }

  const stats = useMemo(() => {
    const totalYes = activeTracks.reduce((acc, t) => acc + t.yesVotes, 0)
    const totalNo = activeTracks.reduce((acc, t) => acc + t.noVotes, 0)
    return { totalYes, totalNo }
  }, [activeTracks])

  const lockedByWeek = useMemo(() => {
    return lockedTracks.reduce<Record<number, LockedTrack[]>>((acc, track) => {
      const week = track.week_number || 0
      acc[week] = acc[week] || []
      acc[week].push(track)
      return acc
    }, {})
  }, [lockedTracks])

  const weekStartAt = useMemo(() => {
    if (activeTracks.length === 0) return null
    const minCreatedAt = activeTracks.reduce((min, track) => {
      const createdAt = new Date(track.created_at).getTime()
      return Math.min(min, createdAt)
    }, Number.POSITIVE_INFINITY)
    return Number.isFinite(minCreatedAt) ? minCreatedAt : null
  }, [activeTracks])

  const nextDailyRotationRemaining = useMemo(() => {
    if (!weekStartAt) return null
    const elapsed = Math.max(0, snapshotNow - weekStartAt)
    const nextBoundary = weekStartAt + (Math.floor(elapsed / DAY_MS) + 1) * DAY_MS
    const weekEnd = weekStartAt + WEEK_MS
    const target = Math.min(nextBoundary, weekEnd)
    return Math.max(0, Math.floor((target - snapshotNow) / 1000))
  }, [snapshotNow, weekStartAt])

  const nextWeeklyFreezeRemaining = useMemo(() => {
    if (!weekStartAt) return null
    const weekEnd = weekStartAt + WEEK_MS
    return Math.max(0, Math.floor((weekEnd - snapshotNow) / 1000))
  }, [snapshotNow, weekStartAt])

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white px-4 py-8 md:px-10">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(72,255,163,0.12)_0%,rgba(0,0,0,0)_42%),radial-gradient(circle_at_bottom,rgba(0,255,157,0.08)_0%,rgba(0,0,0,0)_36%)]" />
        <div className="absolute inset-0 opacity-45">
          <div className="h-full w-full bg-[linear-gradient(rgba(120,255,170,0.14)_1px,transparent_1px),linear-gradient(90deg,rgba(120,255,170,0.14)_1px,transparent_1px)] bg-[size:92px_72px] [mask-image:linear-gradient(to_bottom,rgba(0,0,0,0.95),rgba(0,0,0,0.75))]" />
        </div>
        <div className="absolute inset-[-6%] opacity-30 [transform:perspective(1400px)_rotateX(78deg)_rotateZ(-7deg)_skewX(-10deg)]">
          <div className="h-[140%] w-[140%] -translate-x-[10%] -translate-y-[6%] bg-[linear-gradient(rgba(120,255,170,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(120,255,170,0.18)_1px,transparent_1px)] bg-[size:96px_76px]" />
        </div>
        <div className="absolute inset-y-0 left-0 w-40 bg-[linear-gradient(90deg,rgba(120,255,170,0.08),rgba(0,0,0,0))]" />
        <div className="absolute inset-y-0 right-0 w-40 bg-[linear-gradient(270deg,rgba(120,255,170,0.08),rgba(0,0,0,0))]" />
        <div className="absolute left-[-10%] top-[2%] h-[132%] w-[120%] rounded-[50%] border border-lime-300/10 bg-[linear-gradient(180deg,rgba(0,0,0,0.04),rgba(0,0,0,0.5))] opacity-90 blur-[2px] [transform:perspective(1200px)_rotateX(76deg)_rotateZ(-8deg)_skewX(-10deg)]" />
        <div className="absolute left-[-12%] top-[4%] h-[128%] w-[124%] opacity-70 [transform:perspective(1200px)_rotateX(76deg)_rotateZ(-8deg)_skewX(-10deg)]">
          <div className="h-full w-full bg-[linear-gradient(rgba(120,255,170,0.28)_1px,transparent_1px),linear-gradient(90deg,rgba(120,255,170,0.28)_1px,transparent_1px)] bg-[size:80px_62px] [mask-image:linear-gradient(to_bottom,rgba(0,0,0,0.9),rgba(0,0,0,0.18))]" />
        </div>
        <div className="absolute left-[-14%] top-[10%] h-[122%] w-[128%] opacity-45 [transform:perspective(1200px)_rotateX(76deg)_rotateZ(-6deg)_skewX(-8deg)]">
          <div className="h-full w-full bg-[linear-gradient(rgba(120,255,170,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(120,255,170,0.18)_1px,transparent_1px)] bg-[size:118px_78px] [mask-image:linear-gradient(to_bottom,rgba(0,0,0,0.72),rgba(0,0,0,0))]" />
        </div>
        <div className="absolute inset-x-0 top-[12%] h-40 bg-[radial-gradient(circle_at_20%_50%,rgba(110,255,180,0.1),rgba(0,0,0,0)_46%),radial-gradient(circle_at_80%_35%,rgba(110,255,180,0.08),rgba(0,0,0,0)_42%)] blur-3xl" />
        <div className="absolute inset-x-0 bottom-[-10%] h-56 bg-[radial-gradient(circle_at_30%_50%,rgba(110,255,180,0.08),rgba(0,0,0,0)_48%),radial-gradient(circle_at_70%_40%,rgba(110,255,180,0.06),rgba(0,0,0,0)_44%)] blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight">Playlist Démocratique ⚖️</h1>
            <p className="mt-2 text-sm text-lime-100/62">Cycle de 4 semaines. 5 morceaux actifs par semaine. Au bout de 20 titres, la playlist est figee.</p>
          </div>
          <button
            type="button"
            onClick={() => setIsRulesOpen(true)}
            className="rounded-2xl border border-lime-400/18 bg-lime-400/6 px-5 py-3 text-sm font-black uppercase tracking-[0.22em] text-lime-100 shadow-[0_0_28px_rgba(132,255,92,0.07)] transition hover:border-lime-300/40 hover:bg-lime-400/12 hover:text-white"
          >
            Regle
          </button>
        </div>

        {isRulesOpen && (
          <div
            className="fixed inset-0 z-50 flex items-start justify-center bg-black/72 px-4 pb-6 pt-40 backdrop-blur-sm md:pt-44"
            onClick={() => setIsRulesOpen(false)}
          >
            <div
              className="w-full max-w-2xl rounded-[28px] border border-lime-400/16 bg-[linear-gradient(180deg,rgba(4,8,7,0.98),rgba(1,2,2,0.98))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.52)] md:p-7"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.28em] text-lime-300/70">Regles du jeu</p>
                  <h2 className="mt-2 text-2xl font-black uppercase text-white md:text-3xl">Playlist Démocratique ⚖️</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setIsRulesOpen(false)}
                  className="rounded-full border border-white/12 bg-white/5 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/80 transition hover:border-lime-300/40 hover:text-white"
                >
                  Fermer
                </button>
              </div>

              <ol className="mt-6 space-y-4 text-base font-semibold leading-relaxed text-lime-50/90 md:text-lg">
                <li>1. 5 morceaux sont en vote dans la playlist active.</li>
                <li>2. Chaque utilisateur a 2 votes par jour maximum: 1 OUI et 1 NON.</li>
                <li>3. Toutes les 24h, les morceaux avec plus de NON que de OUI peuvent sortir et etre remplaces uniquement par des morceaux proposes par les utilisateurs.</li>
                <li>4. Un morceau deja propose dans le jeu en cours ne peut pas etre propose une deuxieme fois avant le prochain cycle.</li>
                <li>5. Les morceaux qui survivent restent dans la playlist et accumulent leurs jours de presence.</li>
                <li>6. Au bout de 7 jours, les 5 morceaux restants sont figes dans la playlist finale.</li>
                <li>7. Le cycle dure 4 semaines pour construire une playlist finale de 20 titres.</li>
                <li>8. Quand les 4 semaines sont terminees, un admin doit relancer un nouveau cycle.</li>
              </ol>
            </div>
          </div>
        )}

        {cycle && (
          <div className="mb-8 grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="rounded-2xl border border-lime-400/12 bg-white/[0.02] p-4">
              <p className="text-[10px] uppercase tracking-[0.2em] text-lime-300/72">Semaine active</p>
              <p className="mt-2 text-3xl font-black">{cycle.current_week}/{cycle.weeks_total}</p>
            </div>
            <div className="rounded-2xl border border-lime-400/12 bg-white/[0.02] p-4">
              <p className="text-[10px] uppercase tracking-[0.2em] text-lime-300/72">Morceaux de la semaine</p>
              <p className="mt-2 text-3xl font-black">{activeTracks.length}/5</p>
            </div>
            <div className="rounded-2xl border border-lime-400/12 bg-white/[0.02] p-4">
              <p className="text-[10px] uppercase tracking-[0.2em] text-lime-300/72">Playlist verrouillee</p>
              <p className="mt-2 text-3xl font-black">{lockedTracks.length}/20</p>
            </div>
            <div className="rounded-2xl border border-lime-400/12 bg-white/[0.02] p-4">
              <p className="text-[10px] uppercase tracking-[0.2em] text-lime-300/72">Debut du cycle</p>
              <p className="mt-2 text-xl font-black">{formatDate(cycle.started_at)}</p>
            </div>
          </div>
        )}

        <section className="mb-10 rounded-[30px] border border-lime-400/14 bg-[linear-gradient(180deg,rgba(4,8,7,0.98),rgba(1,2,2,0.98))] p-5 shadow-[0_0_40px_rgba(132,255,92,0.05)] md:p-6">
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-lime-300/70">Playlist de la semaine</p>
              <h2 className="mt-2 text-2xl font-black uppercase md:text-3xl">5 morceaux en vote</h2>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-[18px] border border-white/12 bg-[linear-gradient(135deg,rgba(15,118,110,0.85),rgba(11,33,49,0.9))] px-4 py-3 text-white shadow-[0_18px_36px_rgba(0,0,0,0.24)]">
                <p className="text-[10px] uppercase tracking-[0.28em] text-white/70">Rotation quotidienne</p>
                <p className="mt-1 text-xl font-black">{formatCountdownCard(nextDailyRotationRemaining)}</p>
              </div>
              <div className="rounded-[18px] border border-white/12 bg-[linear-gradient(135deg,rgba(194,65,12,0.88),rgba(66,32,6,0.92))] px-4 py-3 text-white shadow-[0_18px_36px_rgba(0,0,0,0.24)]">
                <p className="text-[10px] uppercase tracking-[0.28em] text-white/70">Actualisation de la semaine</p>
                <p className="mt-1 text-xl font-black">{formatCountdownCard(nextWeeklyFreezeRemaining)}</p>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-lime-400/10 bg-black/40 p-10 text-center text-lime-100/38">Chargement des morceaux de la semaine...</div>
          ) : activeTracks.length === 0 ? (
            <div className="rounded-2xl border border-lime-400/10 bg-black/40 p-10 text-center text-lime-100/38">Aucun morceau actif. Un admin doit lancer ou relancer le cycle.</div>
          ) : (
            <div className="space-y-3">
              {activeTracks.map((track) => (
                <article key={track.id} className="rounded-[22px] border border-lime-400/10 bg-[linear-gradient(90deg,rgba(255,255,255,0.02),rgba(0,0,0,0.16))] px-4 py-2.5 transition hover:border-lime-400/24 hover:bg-[linear-gradient(90deg,rgba(132,255,92,0.05),rgba(0,0,0,0.12))]">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-lime-100/42">
                      <span>Semaine {track.week_number}</span>
                      <Link
                        href={`/profil/${track.titre?.user_id}`}
                        className="inline-flex items-center gap-2 rounded-full border border-lime-400/16 bg-lime-400/8 px-2 py-1 text-[10px] text-lime-200 transition hover:border-lime-300/40 hover:bg-lime-400/12 hover:text-white"
                      >
                        <span>{track.titre?.digger?.username || 'Anonyme'}</span>
                        <EquippedBadgesInline badgeIds={[track.titre?.digger?.equipped_badge_1, track.titre?.digger?.equipped_badge_2]} size="xs" />
                      </Link>
                    </div>
                    <div className="mt-2.5 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                      <div className="min-w-0">
                        <h3 className="truncate text-lg font-black leading-tight text-white md:text-[1.35rem]">{track.titre?.nom_titre || 'Sans titre'}</h3>
                        <p className="mt-1 truncate text-[12px] font-bold uppercase tracking-[0.16em] text-lime-300/82">{track.titre?.nom_artiste || 'Artiste inconnu'}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                        <button
                          onClick={() => setSelectedTrack(track.titre)}
                          className="rounded-[16px] border border-lime-400/16 bg-lime-400/8 px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-lime-100 transition hover:bg-lime-400 hover:text-black"
                        >
                          Ecouter le morceau
                        </button>
                        <div className="rounded-2xl border border-lime-400/8 bg-black/40 px-3 py-1.5 text-center">
                          <p className="text-[9px] text-lime-100/34">Jours</p>
                          <p className="mt-0.5 text-sm font-black text-lime-200">{getDaysInPlaylist(track.created_at, snapshotNow)}</p>
                        </div>
                        <div className="rounded-2xl border border-lime-400/8 bg-black/40 px-3 py-1.5 text-center">
                          <p className="text-[9px] text-lime-100/34">Score</p>
                          <p className={`mt-0.5 text-sm font-black ${track.score >= 0 ? 'text-lime-300' : 'text-rose-300'}`}>{track.score >= 0 ? '+' : ''}{track.score}</p>
                        </div>
                        <div className="rounded-2xl border border-lime-400/8 bg-black/40 px-3 py-1.5 text-center">
                          <p className="text-[9px] text-lime-100/34">OUI</p>
                          <p className="mt-0.5 text-sm font-black text-lime-300">{track.yesVotes}</p>
                        </div>
                        <div className="rounded-2xl border border-lime-400/8 bg-black/40 px-3 py-1.5 text-center">
                          <p className="text-[9px] text-lime-100/34">NON</p>
                          <p className="mt-0.5 text-sm font-black text-rose-300">{track.noVotes}</p>
                        </div>
                        <div className="rounded-2xl border border-lime-400/8 bg-black/40 px-3 py-1.5">
                          <div className="w-12">
                            <Likesbutton
                              trackId={track.titre.id}
                              trackOwnerId={track.titre.user_id}
                              vuesActuelles={track.titre.vues_actuelles || 0}
                              initialLikes={track.titre.likes || 0}
                              onVoteChange={fetchTracks}
                              size="md"
                              targetType="titre"
                            />
                          </div>
                        </div>
                        <button
                          onClick={() => handleVote(track.id, 'yes')}
                          disabled={track.myYes || dailyVotes.yesUsed || busyVote === `${track.id}:yes`}
                          className="min-w-[124px] rounded-[16px] border border-lime-400/90 bg-black px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-lime-300 transition hover:bg-lime-400/10 hover:text-lime-200 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {track.myYes ? `OUI (${track.yesVotes})` : dailyVotes.yesUsed ? 'OUI utilise' : busyVote === `${track.id}:yes` ? '...' : `OUI (${track.yesVotes})`}
                        </button>
                        <button
                          onClick={() => handleVote(track.id, 'no')}
                          disabled={track.myNo || dailyVotes.noUsed || busyVote === `${track.id}:no`}
                          className="min-w-[124px] rounded-[16px] border border-rose-500/90 bg-black px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-rose-300 transition hover:bg-rose-500/10 hover:text-rose-200 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {track.myNo ? `NON (${track.noVotes})` : dailyVotes.noUsed ? 'NON utilise' : busyVote === `${track.id}:no` ? '...' : `NON (${track.noVotes})`}
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {(error || success) && (
          <div className="mb-4 space-y-3">
            {error && <div className="rounded-3xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div>}
            {success && <div className="rounded-3xl border border-lime-400/25 bg-lime-400/10 p-4 text-sm text-lime-100">{success}</div>}
          </div>
        )}

        <div className="mb-8 rounded-3xl border border-lime-400/12 bg-white/[0.02] p-4 md:p-5">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-lime-300/78">Proposer un son</h2>
          <div className="flex flex-col md:flex-row gap-3">
            <select
              value={selectedTitreId}
              onChange={(e) => setSelectedTitreId(e.target.value)}
              className="flex-1 rounded-2xl border border-lime-400/12 bg-black/60 px-3 py-3 text-sm text-white"
            >
              <option value="">Choisis un de tes morceaux</option>
              {myTitles.map((title) => (
                <option key={title.id} value={title.id}>
                  {title.nom_artiste} - {title.nom_titre}
                </option>
              ))}
            </select>
            <button
              onClick={handleSuggest}
              disabled={busySuggest}
              className="rounded-2xl bg-lime-400 px-5 py-3 text-sm font-black uppercase tracking-wide text-black hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busySuggest ? 'Envoi...' : 'Proposer'}
            </button>
          </div>
          <p className="mt-2 text-[11px] text-lime-100/38">Regle: 1 proposition par utilisateur toutes les 48h. Les propositions alimentent les prochaines semaines.</p>
        </div>

        <section className="rounded-[30px] border border-lime-400/12 bg-[linear-gradient(180deg,rgba(3,4,4,0.98),rgba(0,0,0,0.98))] p-5 md:p-6">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-lime-300/70">Proposition partage</p>
              <h2 className="mt-2 text-2xl font-black uppercase md:text-3xl">Morceaux bloques pour la playlist finale</h2>
            </div>
            <p className="text-xs text-lime-100/34">Au bout de 4 semaines, les 20 titres sont prets pour Spotify.</p>
          </div>

          {lockedTracks.length === 0 ? (
            <div className="rounded-2xl border border-lime-400/10 bg-black/40 p-8 text-center text-lime-100/38">Aucun morceau fige pour le moment.</div>
          ) : (
            <div className="space-y-5">
              {Object.entries(lockedByWeek).map(([week, tracks]) => (
                <div key={week}>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-black uppercase tracking-[0.22em] text-lime-200">Semaine {week}</h3>
                    <span className="text-[11px] text-lime-100/34">{tracks.length} morceau(x)</span>
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                    {tracks.map((track) => (
                      <div key={track.id} className="rounded-2xl border border-lime-400/8 bg-black/35 p-4">
                        <p className="font-black text-white">{track.titre?.nom_titre || 'Sans titre'}</p>
                        <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-lime-300/74">{track.titre?.nom_artiste || 'Artiste inconnu'}</p>
                        <div className="mt-3 flex items-center justify-between text-[10px] uppercase tracking-[0.14em] text-slate-400">
                          <span className="text-lime-100/34">{track.source === 'admin' ? 'Seed admin' : 'Suggestion'}</span>
                          <span className="text-lime-100/34">Fige le {formatDate(track.locked_at)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {selectedTrack && (
        <div className="fixed bottom-6 right-6 z-[101] w-[320px] max-w-[calc(100vw-1rem)] bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-5 duration-500">
          <div className="p-3 flex justify-between items-center bg-white/5 border-b border-white/5">
            <div className="truncate pr-4">
              <p className="text-[9px] font-black uppercase tracking-widest text-cyan-300 truncate">
                {selectedTrack?.nom_artiste || 'Artiste inconnu'}
              </p>
              <p className="text-[10px] text-slate-300 truncate">
                {selectedTrack?.nom_titre || 'Sans titre'}
              </p>
            </div>
            <button onClick={() => setSelectedTrack(null)} className="text-slate-500 hover:text-white text-xs px-2 font-black">
              X
            </button>
          </div>

          {getTrackEmbedId(selectedTrack) ? (
            <div className="aspect-video w-full bg-black">
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${getTrackEmbedId(selectedTrack)}?autoplay=1&rel=0`}
                frameBorder="0"
                allow="autoplay; encrypted-media"
                allowFullScreen
                title="Lecteur YouTube"
              ></iframe>
            </div>
          ) : (
            <div className="aspect-video w-full bg-black flex items-center justify-center text-xs text-slate-400 px-4 text-center">
              Lien YouTube invalide pour ce titre.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
