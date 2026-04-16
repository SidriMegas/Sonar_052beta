"use client"

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAdminAccess } from '@/lib/hooks/useAdminAccess'

type ActiveTrack = {
  id: string
  source: string
  expires_at: string
  week_number: number
  yesVotes: number
  noVotes: number
  score: number
  secondsLeft: number
  titre: {
    nom_artiste: string
    nom_titre: string
  } | null
}

type LockedTrack = {
  id: string
  source: string
  week_number: number
  locked_at: string | null
  titre: {
    nom_artiste: string
    nom_titre: string
  } | null
}

type SuggestionItem = {
  id: string
  created_at: string
  titre: {
    nom_artiste: string
    nom_titre: string
  } | null
}

type CyclePayload = {
  id: string
  status: 'active' | 'completed'
  current_week: number
  weeks_total: number
  started_at: string
  completed_at: string | null
}

export default function PlaylistoartagerAdminPage() {
  const { checkingAccess, isAdmin, profile } = useAdminAccess()
  const [cycle, setCycle] = useState<CyclePayload | null>(null)
  const [tracks, setTracks] = useState<ActiveTrack[]>([])
  const [lockedTracks, setLockedTracks] = useState<LockedTrack[]>([])
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([])
  const [seedIdsInput, setSeedIdsInput] = useState('')
  const [busySeed, setBusySeed] = useState(false)
  const [busyRotate, setBusyRotate] = useState(false)
  const [busyRemove, setBusyRemove] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [rotationResult, setRotationResult] = useState<any[]>([])

  const getAccessToken = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token || null
  }

  const loadTracks = async () => {
    const token = await getAccessToken()
    const headers: HeadersInit = {}
    if (token) headers.Authorization = `Bearer ${token}`
    const res = await fetch('/api/playlistoartager/tracks', { headers })
    const json = await res.json()
    if (res.ok) {
      setCycle(json.cycle || null)
      setTracks(json.activeTracks || [])
      setLockedTracks(json.lockedTracks || [])
      setSuggestions(json.suggestions || [])
    }
  }

  useEffect(() => {
    if (checkingAccess || !isAdmin) return
    loadTracks()
  }, [checkingAccess, isAdmin])

  const runSeed = async () => {
    setError('')
    setSuccess('')
    setBusySeed(true)
    try {
      const token = await getAccessToken()
      if (!token) { setError('Connecte-toi en admin.'); return }

      const ids = seedIdsInput.split(/[\s,;\n]+/).map((v) => v.trim()).filter(Boolean)
      const body = ids.length > 0 ? { titreIds: ids } : {}

      const res = await fetch('/api/playlistoartager/admin/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error || 'Erreur seed.'); return }
      setSuccess(`Seed termine: ${json.inserted || 0} son(s) ajoute(s). ${json.message || ''}`)
      await loadTracks()
    } finally {
      setBusySeed(false)
    }
  }

  const runRotation = async () => {
    setError('')
    setSuccess('')
    setRotationResult([])
    setBusyRotate(true)
    try {
      const token = await getAccessToken()
      if (!token) { setError('Connecte-toi en admin.'); return }

      const res = await fetch('/api/playlistoartager/rotate', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error || 'Rotation impossible.'); return }
      setSuccess(json.message || `Rotation OK: ${json.processed ?? 0} piste(s) traitee(s).`)
      setRotationResult(json.results || [])
      await loadTracks()
    } finally {
      setBusyRotate(false)
    }
  }

  const removeTrack = async (trackId: string) => {
    setError('')
    setSuccess('')
    setBusyRemove(trackId)
    try {
      const token = await getAccessToken()
      if (!token) { setError('Connecte-toi en admin.'); return }

      const res = await fetch('/api/playlistoartager/admin/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ trackId }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error || 'Suppression impossible.'); return }
      setSuccess('Piste retiree de la playlist.')
      await loadTracks()
    } finally {
      setBusyRemove(null)
    }
  }

  if (checkingAccess) {
    return <div className="min-h-screen bg-[#040911] p-8 pt-28 text-sm text-white">Verification des droits admin...</div>
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#040911] p-8 pt-28 text-white">
        <div className="mx-auto max-w-2xl rounded-2xl border border-rose-500/40 bg-rose-500/10 p-6">
          <h1 className="mb-2 text-2xl font-black">Acces refuse</h1>
          <p className="mb-4 text-sm text-rose-100/90">Ton compte n'a pas le role admin dans la table digger.</p>
          <Link href="/admin" className="inline-block text-sm text-cyan-300 underline">Retour dashboard admin</Link>
        </div>
      </div>
    )
  }

  const formatRemaining = (s: number) => {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    return `${h}h ${m}m`
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_15%_5%,#143450_0%,#091b2a_35%,#040911_80%)] p-4 pt-28 text-white md:p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-200/55">Console admin</p>
            <h1 className="text-3xl font-black uppercase tracking-tight md:text-4xl">Admin — Playlistoartager</h1>
            <p className="mt-1 text-sm text-cyan-200/70">Connecte en tant que <span className="font-bold text-cyan-300">@{profile?.username || 'admin'}</span></p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin" className="rounded-lg border border-white/10 px-3 py-2 text-xs text-cyan-200 hover:bg-cyan-500/10">Dashboard</Link>
            <Link href="/jeux/playlistoartager" className="rounded-lg border border-cyan-400/30 px-3 py-2 text-xs text-cyan-200 hover:bg-cyan-500/10">Voir la page jeu</Link>
          </div>
        </div>

        {error && <div className="mb-4 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</div>}
        {success && <div className="mb-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">{success}</div>}

        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-black/35 p-4">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-cyan-300">Seed playlist</h2>
            <p className="mb-3 text-xs text-slate-300">Colle des IDs de titre. Laisse vide pour auto-seed avec les derniers titres de la base.</p>
            <textarea value={seedIdsInput} onChange={(e) => setSeedIdsInput(e.target.value)} className="h-24 w-full rounded-xl border border-slate-700 bg-slate-900/70 p-3 text-xs" placeholder="uuid-1, uuid-2, ..." />
            <button onClick={runSeed} disabled={busySeed} className="mt-3 w-full rounded-xl bg-cyan-500 px-4 py-2 text-xs font-black uppercase text-[#04111a] disabled:cursor-not-allowed disabled:opacity-60 hover:bg-cyan-400">
              {busySeed ? 'Seed en cours...' : cycle?.status === 'completed' || !cycle ? 'Relancer un nouveau cycle' : `Completer semaine ${cycle.current_week} (${tracks.length}/5)`}
            </button>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/35 p-4">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-cyan-300">Freeze hebdo</h2>
            <p className="mb-3 text-xs text-slate-300">Fige les 5 morceaux de la semaine, passe a la semaine suivante et charge les prochaines propositions.</p>
            <button onClick={runRotation} disabled={busyRotate} className="w-full rounded-xl bg-fuchsia-500 px-4 py-2 text-xs font-black uppercase text-[#200323] disabled:cursor-not-allowed disabled:opacity-60 hover:bg-fuchsia-400">
              {busyRotate ? 'Freeze...' : cycle?.status === 'completed' ? 'Cycle deja termine' : 'Figer la semaine'}
            </button>
            {rotationResult.length > 0 && (
              <div className="mt-4 max-h-44 overflow-auto rounded-xl border border-white/10 bg-black/30 p-3">
                {rotationResult.map((row, idx) => (
                  <p key={`${row.trackId}-${idx}`} className="mb-1 text-[11px] text-slate-200">
                    <span className={row.action.startsWith('locked') ? 'text-cyan-300' : row.action.startsWith('new_week') ? 'text-emerald-300' : 'text-slate-200'}>{row.action}</span>
                    {typeof row.weekNumber === 'number' ? ` · semaine ${row.weekNumber}` : ''}
                    {typeof row.inserted === 'number' ? ` · ${row.inserted} titre(s)` : ''}
                    {typeof row.score === 'number' ? ` · score ${row.score >= 0 ? '+' : ''}${row.score}` : ''}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-300">Pistes actives ({tracks.length}/5)</h2>
            <p className="text-xs text-slate-400">
              {cycle ? `Cycle ${cycle.status === 'completed' ? 'termine' : 'actif'} • semaine ${cycle.current_week}/${cycle.weeks_total} • ${lockedTracks.length}/20 figes` : 'Aucun cycle'}
            </p>
          </div>
          {tracks.length === 0 ? (
            <p className="text-sm text-slate-400">Aucune piste active. Lance un seed.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {tracks.map((track) => (
                <div key={track.id} className="flex items-start justify-between gap-3 rounded-2xl border border-white/10 bg-black/30 p-4 transition-colors hover:border-cyan-400/30">
                  <div className="min-w-0">
                    <p className="mb-1 text-[10px] uppercase tracking-widest text-slate-400">{track.source}</p>
                    <p className="truncate text-sm font-bold">{track.titre?.nom_titre ?? '—'}</p>
                    <p className="truncate text-xs text-slate-300">{track.titre?.nom_artiste ?? '—'}</p>
                    <div className="mt-2 flex gap-3 text-xs">
                      <span className="text-cyan-300">sem. {track.week_number}</span>
                      <span className="text-emerald-300">+{track.yesVotes}</span>
                      <span className="text-rose-300">−{track.noVotes}</span>
                      <span className={`font-bold ${track.score >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>score {track.score >= 0 ? '+' : ''}{track.score}</span>
                      <span className="ml-auto text-slate-400">{formatRemaining(track.secondsLeft)}</span>
                    </div>
                  </div>
                  <button onClick={() => removeTrack(track.id)} disabled={busyRemove === track.id} className="shrink-0 rounded-lg bg-rose-600/80 px-3 py-1 text-[11px] font-bold uppercase text-white disabled:cursor-not-allowed disabled:opacity-50 hover:bg-rose-500">
                    {busyRemove === track.id ? '...' : 'Retirer'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-cyan-300">Suggestions pending ({suggestions.length})</h2>
            {suggestions.length === 0 ? (
              <p className="text-sm text-slate-400">Aucune suggestion en attente.</p>
            ) : (
              <div className="space-y-2">
                {suggestions.slice(0, 10).map((item) => (
                  <div key={item.id} className="rounded-xl border border-white/8 bg-black/20 px-3 py-3 text-sm">
                    <p className="font-bold text-white">{item.titre?.nom_titre ?? '—'}</p>
                    <p className="text-xs text-slate-300">{item.titre?.nom_artiste ?? '—'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-cyan-300">Morceaux figes ({lockedTracks.length}/20)</h2>
            {lockedTracks.length === 0 ? (
              <p className="text-sm text-slate-400">Aucun morceau fige pour l instant.</p>
            ) : (
              <div className="space-y-2">
                {lockedTracks.slice(0, 12).map((track) => (
                  <div key={track.id} className="rounded-xl border border-white/8 bg-black/20 px-3 py-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-bold text-white">{track.titre?.nom_titre ?? '—'}</p>
                        <p className="truncate text-xs text-slate-300">{track.titre?.nom_artiste ?? '—'}</p>
                      </div>
                      <span className="shrink-0 text-[10px] uppercase tracking-[0.16em] text-cyan-300">sem. {track.week_number}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}