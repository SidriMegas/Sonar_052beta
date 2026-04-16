"use client"

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Likesbutton from '@/app/components/likesbutton'
import EquippedBadgesInline from '@/app/components/EquippedBadgesInline'
import { getEmbedUrl } from '@/lib/youtube'

const GRID_WIDTH = 20
const GRID_HEIGHT = 20
const CELL_SIZE = 30

type TrackSearchItem = {
  id: string
  nom_titre: string | null
  nom_artiste: string | null
  youtube_url?: string | null
  youtube_id?: string | null
  likes?: number | null
  points?: number | null
  user_id?: string
  vues_actuelles?: number | null
}

type BoardTile = {
  x: number
  y: number
  track_id: string
  color_hex: string
  placed_at: string
  placed_by: string
  digger?: {
    id: string
    username: string | null
    equipped_badge_1?: string | null
    equipped_badge_2?: string | null
  }[]
  titre?: {
    id: string
    nom_titre: string | null
    nom_artiste: string | null
    youtube_url?: string | null
    youtube_id?: string | null
    likes?: number | null
    points?: number | null
    user_id?: string
    vues_actuelles?: number | null
  }[]
}

const toKey = (x: number, y: number) => `${x}:${y}`

const formatRemaining = (sec: number) => {
  const s = Math.max(0, sec)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const r = s % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
}

export default function GuerreDesOndesPage() {
  const router = useRouter()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const [loadingBoard, setLoadingBoard] = useState(true)
  const [tiles, setTiles] = useState<Record<string, BoardTile>>({})
  const [selectedCell, setSelectedCell] = useState<{ x: number; y: number } | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<TrackSearchItem[]>([])
  const [selectedTrack, setSelectedTrack] = useState<TrackSearchItem | null>(null)
  const [selectedInfoTile, setSelectedInfoTile] = useState<BoardTile | null>(null)
  const [signalTrack, setSignalTrack] = useState<TrackSearchItem | null>(null)
  const votingSetRef = useRef<Set<string>>(new Set())
  const [placing, setPlacing] = useState(false)
  const [error, setError] = useState('')
  const [cooldownRemaining, setCooldownRemaining] = useState(0)
  const [placementsCount, setPlacementsCount] = useState(0)
  const [userId, setUserId] = useState<string | null>(null)

  const paintedCount = useMemo(() => Object.keys(tiles).length, [tiles])
  const remainingCount = GRID_WIDTH * GRID_HEIGHT - paintedCount

  const selectedCellTile = useMemo(() => {
    if (!selectedCell) return null
    return tiles[toKey(selectedCell.x, selectedCell.y)] || null
  }, [selectedCell, tiles])

  const loadBoard = async () => {
    const res = await fetch('/api/guerredesondes/board', { cache: 'no-store' })
    const payload = await res.json().catch(() => null)
    if (!res.ok) {
      setError(payload?.error || 'Impossible de charger le plateau.')
      return
    }

    const next: Record<string, BoardTile> = {}
    const rows = (payload?.tiles || []) as BoardTile[]
    for (const row of rows) {
      next[toKey(row.x, row.y)] = row
    }
    setTiles(next)
  }

  const loadMe = async () => {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    const uid = data.session?.user?.id || null
    setUserId(uid)

    if (!token) {
      setCooldownRemaining(0)
      setPlacementsCount(0)
      return
    }

    const res = await fetch('/api/guerredesondes/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    const payload = await res.json().catch(() => null)
    if (!res.ok) return

    setCooldownRemaining(Number(payload?.remainingSec || 0))
    setPlacementsCount(Number(payload?.placementsCount || 0))
  }

  useEffect(() => {
    const init = async () => {
      setLoadingBoard(true)
      setError('')
      await Promise.all([loadBoard(), loadMe()])
      setLoadingBoard(false)
    }
    init()

    const boardInterval = setInterval(() => {
      loadBoard()
    }, 30000)

    const meInterval = setInterval(() => {
      loadMe()
    }, 45000)

    return () => {
      clearInterval(boardInterval)
      clearInterval(meInterval)
    }
  }, [])

  useEffect(() => {
    if (cooldownRemaining <= 0) return
    const timer = setInterval(() => {
      setCooldownRemaining((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldownRemaining])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = GRID_WIDTH * CELL_SIZE
    canvas.height = GRID_HEIGHT * CELL_SIZE

    ctx.fillStyle = '#03070f'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    for (let y = 0; y < GRID_HEIGHT; y += 1) {
      for (let x = 0; x < GRID_WIDTH; x += 1) {
        const tile = tiles[toKey(x, y)]
        ctx.fillStyle = tile?.color_hex || '#0b1524'
        ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE)
      }
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.22)'
    ctx.lineWidth = 1

    for (let x = 0; x <= GRID_WIDTH; x += 1) {
      ctx.beginPath()
      ctx.moveTo(x * CELL_SIZE + 0.5, 0)
      ctx.lineTo(x * CELL_SIZE + 0.5, GRID_HEIGHT * CELL_SIZE)
      ctx.stroke()
    }

    for (let y = 0; y <= GRID_HEIGHT; y += 1) {
      ctx.beginPath()
      ctx.moveTo(0, y * CELL_SIZE + 0.5)
      ctx.lineTo(GRID_WIDTH * CELL_SIZE, y * CELL_SIZE + 0.5)
      ctx.stroke()
    }

    if (selectedCell) {
      ctx.strokeStyle = '#22d3ee'
      ctx.lineWidth = 2
      ctx.strokeRect(
        selectedCell.x * CELL_SIZE + 1,
        selectedCell.y * CELL_SIZE + 1,
        CELL_SIZE - 2,
        CELL_SIZE - 2
      )
    }
  }, [tiles, selectedCell])

  const onCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const pixelX = (e.clientX - rect.left) * scaleX
    const pixelY = (e.clientY - rect.top) * scaleY
    const x = Math.floor(pixelX / CELL_SIZE)
    const y = Math.floor(pixelY / CELL_SIZE)

    if (x < 0 || x >= GRID_WIDTH || y < 0 || y >= GRID_HEIGHT) return
    setSelectedCell({ x, y })
    const tile = tiles[toKey(x, y)]
    setSelectedInfoTile(tile || null)
    setError('')
  }

  const runTrackSearch = async (term: string) => {
    if (term.trim().length < 2) {
      setSearchResults([])
      return
    }

    const { data, error: searchError } = await supabase
      .from('titre')
      .select('id, nom_titre, nom_artiste, youtube_url, youtube_id')
      .or(`nom_titre.ilike.%${term}%,nom_artiste.ilike.%${term}%`)
      .limit(10)

    if (searchError) {
      setError('Erreur de recherche musique.')
      return
    }

    setSearchResults((data || []) as TrackSearchItem[])
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      runTrackSearch(searchTerm)
    }, 250)

    return () => clearTimeout(timer)
  }, [searchTerm])

  const placeTrack = async () => {
    setError('')
    if (!selectedCell) {
      setError('Choisis une case sur le plateau.')
      return
    }

    if (!selectedTrack) {
      setError('Choisis une musique.')
      return
    }

    if (cooldownRemaining > 0) {
      setError(`Cooldown actif: ${formatRemaining(cooldownRemaining)} avant ton prochain placement.`)
      return
    }

    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (!token) {
      router.push('/auth')
      return
    }

    setPlacing(true)

    const res = await fetch('/api/guerredesondes/place', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        x: selectedCell.x,
        y: selectedCell.y,
        trackId: selectedTrack.id,
      }),
    })

    const payload = await res.json().catch(() => null)

    if (!res.ok) {
      const remainingSec = Number(payload?.cooldown?.remainingSec || 0)
      if (remainingSec > 0) setCooldownRemaining(remainingSec)
      setError(payload?.error || 'Placement impossible.')
      setPlacing(false)
      return
    }

    const tile = payload?.tile
    if (tile) {
      setTiles((prev) => ({
        ...prev,
        [toKey(tile.x, tile.y)]: {
          x: tile.x,
          y: tile.y,
          track_id: tile.trackId,
          color_hex: tile.color,
          placed_at: tile.placedAt,
          placed_by: tile.placedBy,
          titre: [
            {
              id: selectedTrack.id,
              nom_titre: selectedTrack.nom_titre,
              nom_artiste: selectedTrack.nom_artiste,
              youtube_id: selectedTrack.youtube_id,
              youtube_url: selectedTrack.youtube_url,
            },
          ],
        },
      }))
    }

    setCooldownRemaining(Number(payload?.cooldown?.remainingSec || 0))
    setPlacementsCount((prev) => prev + 1)
    setSelectedTrack(null)
    setSearchTerm('')
    setSearchResults([])
    setPlacing(false)
  }

  const selectedTrackData = selectedCellTile?.titre?.[0]

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#030711] via-[#02050b] to-black text-white px-4 pt-28 pb-16 md:px-8">
      <div className="max-w-[1500px] mx-auto grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">
        <section className="rounded-3xl border border-cyan-500/20 bg-[#071223]/60 backdrop-blur-sm p-4 md:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
            <div>
              <h1 className="text-3xl md:text-5xl font-black uppercase italic tracking-tight">Guerre Des Ondes</h1>
              <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-300/80 mt-1">Plateau 20 x 20 • 400 cases • une musique = une couleur</p>
            </div>
            <div className="text-right space-y-1">
              <p className="text-xs text-slate-300">Cases colorees: <span className="font-black text-white">{paintedCount.toLocaleString('fr-FR')}</span></p>
              <p className="text-xs text-slate-300">Cases libres: <span className="font-black text-white">{remainingCount.toLocaleString('fr-FR')}</span></p>
              <a href="/jeux/guerredesondes/legende" className="inline-block text-[10px] uppercase tracking-[0.1em] text-cyan-400 hover:text-cyan-300 font-semibold border-b border-cyan-400/40">
                📊 Légende des couleurs
              </a>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#02070f] overflow-auto shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)] relative">
            <canvas
              ref={canvasRef}
              onClick={onCanvasClick}
              className="block w-full max-w-[600px] h-[600px] cursor-crosshair mx-auto"
            />
            {loadingBoard && (
              <div className="absolute inset-0 bg-black/35 flex items-center justify-center text-cyan-200 text-xs font-black uppercase tracking-[0.2em] animate-pulse">
                Chargement du plateau...
              </div>
            )}
          </div>

          <div className="mt-4 text-[11px] text-slate-400">
            Astuce: clique une case pour la selectionner, puis choisis un son a droite pour peindre la grille.
          </div>
        </section>

        <aside className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-sm p-5 h-fit xl:sticky xl:top-28 space-y-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Profil Onde</p>
            <p className="text-sm mt-1">Placements: <span className="font-black">{placementsCount}</span></p>
            <p className="text-sm">Cooldown: {cooldownRemaining > 0 ? <span className="text-amber-300 font-black">{formatRemaining(cooldownRemaining)}</span> : <span className="text-emerald-300 font-black">Disponible</span>}</p>
            {!userId && <p className="text-xs text-rose-300 mt-1">Connecte-toi pour placer une musique.</p>}
          </div>

          <div className="rounded-xl border border-white/10 bg-black/30 p-3">
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-2">Case selectionnee</p>
            {selectedCell ? (
              <>
                <p className="text-sm">X: <span className="font-black text-cyan-200">{selectedCell.x}</span> • Y: <span className="font-black text-cyan-200">{selectedCell.y}</span></p>
                {selectedTrackData ? (
                  <p className="text-xs text-slate-300 mt-2">Actuel: <span className="text-white">{selectedTrackData.nom_artiste || 'Artiste inconnu'} - {selectedTrackData.nom_titre || 'Sans titre'}</span></p>
                ) : (
                  <p className="text-xs text-slate-400 mt-2">Case vierge.</p>
                )}
              </>
            ) : (
              <p className="text-xs text-slate-400">Aucune case selectionnee.</p>
            )}
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Recherche Musique</label>
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="titre ou artiste..."
              className="mt-2 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:border-cyan-400/60"
            />
            <div className="mt-2 max-h-52 overflow-auto rounded-xl border border-white/10 bg-black/30">
              {searchResults.length === 0 ? (
                <p className="p-3 text-xs text-slate-500">Tape au moins 2 caracteres.</p>
              ) : (
                searchResults.map((track) => (
                  <button
                    key={track.id}
                    onClick={() => setSelectedTrack(track)}
                    className={`w-full text-left px-3 py-2 border-b border-white/5 last:border-b-0 transition-colors ${selectedTrack?.id === track.id ? 'bg-cyan-500/20' : 'hover:bg-white/5'}`}
                  >
                    <p className="text-sm text-white">{track.nom_artiste || 'Artiste inconnu'}</p>
                    <p className="text-xs text-slate-400">{track.nom_titre || 'Sans titre'}</p>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 p-3">
            <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-200/80">Musique choisie</p>
            {selectedTrack ? (
              <p className="text-sm mt-1"><span className="font-black">{selectedTrack.nom_artiste || 'Artiste inconnu'}</span> - {selectedTrack.nom_titre || 'Sans titre'}</p>
            ) : (
              <p className="text-xs text-cyan-100/70 mt-1">Aucune musique selectionnee.</p>
            )}
          </div>

          <button
            onClick={placeTrack}
            disabled={placing || cooldownRemaining > 0 || !selectedCell || !selectedTrack}
            className="w-full rounded-xl border border-emerald-400/40 bg-emerald-500/20 hover:bg-emerald-500/30 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-3 text-sm font-black uppercase tracking-wider transition-colors"
          >
            {placing ? 'Placement...' : 'Poser cette musique'}
          </button>

          {error && <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-xs text-rose-200">{error}</div>}
        </aside>
      </div>

      {selectedInfoTile && (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedInfoTile(null)}>
          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-[#050d19] p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-300">Case Occupee</p>
              <button className="text-slate-400 hover:text-white" onClick={() => setSelectedInfoTile(null)}>✕</button>
            </div>
            <p className="text-sm text-slate-300 mt-2">Position: <span className="font-black text-white">X{selectedInfoTile.x} • Y{selectedInfoTile.y}</span></p>
            <p className="text-sm mt-3">Createur: <span className="inline-flex items-center gap-2 font-black text-cyan-200">@{selectedInfoTile.digger?.[0]?.username || 'Inconnu'}<EquippedBadgesInline badgeIds={[selectedInfoTile.digger?.[0]?.equipped_badge_1, selectedInfoTile.digger?.[0]?.equipped_badge_2]} size="xs" /></span></p>
            <p className="text-sm">Artiste: <span className="font-black text-white">{selectedInfoTile.titre?.[0]?.nom_artiste || 'Artiste inconnu'}</span></p>
            <p className="text-sm">Titre: <span className="font-black text-white">{selectedInfoTile.titre?.[0]?.nom_titre || 'Sans titre'}</span></p>

            <div className="mt-4 grid grid-cols-[1fr_auto] gap-3 items-center">
              <button
                onClick={() => {
                  const t = selectedInfoTile.titre?.[0]
                  if (!t) return
                  setSignalTrack({
                    id: t.id,
                    nom_artiste: t.nom_artiste,
                    nom_titre: t.nom_titre,
                    youtube_id: t.youtube_id,
                    youtube_url: t.youtube_url,
                    likes: t.likes,
                    user_id: t.user_id,
                    vues_actuelles: t.vues_actuelles,
                  })
                }}
                className="rounded-xl border border-green-500/40 bg-green-500/10 hover:bg-green-500/20 px-4 py-2 text-[11px] font-black uppercase tracking-wider text-green-300"
              >
                📡 Signal (YouTube)
              </button>
              <div className="w-16">
                <Likesbutton
                  trackId={selectedInfoTile.titre?.[0]?.id || ''}
                  trackOwnerId={selectedInfoTile.titre?.[0]?.user_id || ''}
                  vuesActuelles={selectedInfoTile.titre?.[0]?.vues_actuelles || 0}
                  initialLikes={Number(selectedInfoTile.titre?.[0]?.likes || 0)}
                  onVoteChange={() => loadBoard()}
                  size="md"
                  targetType="titre"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {signalTrack && (
        <div className="fixed bottom-6 right-6 z-[111] w-[320px] bg-[#050505] border-2 border-green-500/30 rounded-2xl shadow-[0_0_30px_rgba(34,197,94,0.2)] overflow-hidden flex flex-col">
          <div className="p-3 flex justify-between items-center bg-green-500/10 border-b border-green-500/20">
            <div className="flex items-center gap-2 truncate">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <p className="text-[10px] font-black uppercase text-green-400 truncate">{signalTrack.nom_artiste} - {signalTrack.nom_titre}</p>
            </div>
            <button onClick={() => setSignalTrack(null)} className="text-green-500 hover:text-white text-xs px-2">✕</button>
          </div>
          <div className="aspect-video w-full">
            {(signalTrack.youtube_id || getEmbedUrl(signalTrack.youtube_url)) ? (
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${signalTrack.youtube_id || getEmbedUrl(signalTrack.youtube_url)}?autoplay=1&rel=0&modestbranding=1`}
                frameBorder="0"
                allow="autoplay; encrypted-media"
                allowFullScreen
                title="Lecteur YouTube"
              ></iframe>
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
                <Likesbutton
                  trackId={signalTrack.id}
                  trackOwnerId={signalTrack.user_id || ''}
                  vuesActuelles={signalTrack.vues_actuelles || 0}
                  initialLikes={Number(signalTrack.likes || 0)}
                  onVoteChange={() => loadBoard()}
                  size="md"
                />
              </div>
            </div>
        </div>
      )}
    </div>
  )
}
