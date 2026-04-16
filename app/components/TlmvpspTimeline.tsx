"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getTrackEmbedId } from '@/lib/youtube'

type ModeKey = 'global' | 'autopromo'

type TimelineTrack = {
  id: string
  userId: string | null
  artist: string
  title: string
  youtubeUrl: string | null
  youtubeId: string | null
  views: number
  likes: number
  points: number
  autopromo: boolean
}

type ReignVote = {
  roundId: string
  startsAt: string
  kingVotes: number
  challengerVotes: number
  challengerTitreId: string
}

type TimelineReign = {
  id: string
  mode: ModeKey
  track: TimelineTrack
  startsAt: string
  endsAt: string
  durationDays: number
  duelCount: number
  tier: 'base' | 'week' | 'month'
  dailyVotes: ReignVote[]
}

type TimelineDuel = {
  id: string
  mode: ModeKey
  startsAt: string
  endsAt: string
  status: 'active' | 'resolved'
  king: TimelineTrack
  challenger: TimelineTrack
  winnerTitreId: string | null
  kingVotes: number
  challengerVotes: number
}

type TimelinePayload = {
  generatedAt: string
  mode: ModeKey
  reigns: TimelineReign[]
  duels: TimelineDuel[]
}

type SelectedPin =
  | {
      type: 'reign'
      reign: TimelineReign
    }
  | {
      type: 'duel'
      duel: TimelineDuel
    }

const BASE_SPACING = 128
const MIN_ZOOM = 0.8
const MAX_ZOOM = 3.4
const TIMELINE_SIDE_PADDING = 96
const TIMELINE_REFRESH_MS = 30000

const zoomToSlider = (zoom: number) => {
  return Math.round(((zoom - MIN_ZOOM) / (MAX_ZOOM - MIN_ZOOM)) * 100)
}

const sliderToZoom = (sliderValue: number) => {
  return Number((MIN_ZOOM + (sliderValue / 100) * (MAX_ZOOM - MIN_ZOOM)).toFixed(2))
}

function SonarPinHead({ tier, active }: { tier: 'base' | 'week' | 'month'; active?: boolean }) {
  const colorClass = tier === 'month' ? 'text-[#f6d365]' : tier === 'week' ? 'text-[#39ff88]' : 'text-white'
  const glowClass =
    tier === 'month'
      ? 'drop-shadow-[0_0_12px_rgba(246,211,101,0.55)]'
      : tier === 'week'
        ? 'drop-shadow-[0_0_12px_rgba(57,255,136,0.6)]'
        : 'drop-shadow-[0_0_10px_rgba(255,255,255,0.28)]'

  return (
    <div className="relative flex h-12 w-12 items-center justify-center">
      {active ? <div className={`absolute inset-0 rounded-full ${tier === 'month' ? 'bg-[#f6d365]/18' : tier === 'week' ? 'bg-[#39ff88]/18' : 'bg-white/12'} animate-ping`} /> : null}
      <svg viewBox="0 0 24 24" className={`h-full w-full ${colorClass} ${glowClass}`} fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="9" className="opacity-25" />
        <circle cx="12" cy="12" r="5" className="opacity-45" />
        <circle cx="12" cy="12" r="1.6" fill="currentColor" />
        <path d="M12 3v2m0 14v2M3 12h2m14 0h2" strokeLinecap="round" opacity="0.6" />
      </svg>
    </div>
  )
}

function GlobalModeIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 28 28" className={`h-7 w-7 transition ${active ? 'text-[#d8c68f]' : 'text-[#5f5a4d]'}`} fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M4 18c3-4 5-6 10-6s7 2 10 6" strokeLinecap="round" />
      <path d="M6 21c2.4-2.2 5.1-3.2 8-3.2 3 0 5.7 1 8 3.2" strokeLinecap="round" opacity="0.85" />
      <path d="M11 9l3-4 3 4 3 1.2-2 2.6V16H10v-3.2L8 10.2 11 9Z" fill="currentColor" stroke="none" />
    </svg>
  )
}

function AutopromoModeIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 28 28" className={`h-7 w-7 transition ${active ? 'text-[#d8c68f]' : 'text-[#5f5a4d]'}`} fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M6 22V7.5" strokeLinecap="round" />
      <path d="M7 8c4.2-1.8 6.6-2.2 11 0v9c-4.4-2.2-6.8-1.8-11 0" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18 9.5c1.6-0.6 2.6-1.1 4-2v8.6c-1.2 0.7-2.3 1.2-4 1.8" strokeLinecap="round" />
    </svg>
  )
}

const formatCompact = (value: number) => new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 }).format(value || 0)
const formatDate = (value: string) => new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })

export default function TlmvpspTimeline({ initialMode = 'global' }: { initialMode?: ModeKey }) {
  const timelineViewportRef = useRef<HTMLDivElement | null>(null)
  const dragStartXRef = useRef(0)
  const dragStartScrollLeftRef = useRef(0)
  const dragMovedRef = useRef(false)
  const zoomAnchorRatioRef = useRef<number | null>(null)
  const previousTrackWidthRef = useRef(0)
  const [mode, setMode] = useState<ModeKey>(initialMode)
  const [zoom, setZoom] = useState(MIN_ZOOM)
  const [zoomSlider, setZoomSlider] = useState(() => zoomToSlider(MIN_ZOOM))
  const [payload, setPayload] = useState<TimelinePayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedPin, setSelectedPin] = useState<SelectedPin | null>(null)
  const [viewportWidth, setViewportWidth] = useState(0)
  const [isDraggingTimeline, setIsDraggingTimeline] = useState(false)

  const loadTimeline = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true)
    setError('')

    const res = await fetch(`/api/tlmvpsp/timeline?mode=${mode}`, { cache: 'no-store' })
    const json = await res.json().catch(() => null)

    if (!res.ok) {
      setPayload(null)
      setError(json?.error || 'Impossible de charger la frise TLMVPSP.')
      setLoading(false)
      return
    }

    setPayload(json)
    setLoading(false)
  }, [mode])

  useEffect(() => {
    loadTimeline(true)

    const refreshTimer = setInterval(() => {
      loadTimeline(false)
    }, TIMELINE_REFRESH_MS)

    return () => {
      clearInterval(refreshTimer)
    }
  }, [loadTimeline])

  useEffect(() => {
    const element = timelineViewportRef.current
    if (!element) return

    const updateWidth = () => {
      setViewportWidth(element.clientWidth)
    }

    updateWidth()

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateWidth)
      return () => window.removeEventListener('resize', updateWidth)
    }

    const observer = new ResizeObserver(() => updateWidth())
    observer.observe(element)

    return () => observer.disconnect()
  }, [])

  const maxChallengerVotes = useMemo(() => {
    return Math.max(1, ...(payload?.duels.map((duel) => duel.challengerVotes) || [1]))
  }, [payload])

  useEffect(() => {
    setZoomSlider(zoomToSlider(zoom))
  }, [zoom])

  const duelCount = payload?.duels.length || 1
  const minTimelineWidth = Math.max(320, viewportWidth || 0)
  const zoomProgress = (zoom - MIN_ZOOM) / (MAX_ZOOM - MIN_ZOOM)

  const trackWidth = useMemo(() => {
    const contentWidth = duelCount * BASE_SPACING + 320
    const maxExpandedWidth = Math.max(minTimelineWidth * 3, contentWidth)
    return Math.round(minTimelineWidth + (maxExpandedWidth - minTimelineWidth) * Math.max(0, zoomProgress))
  }, [duelCount, minTimelineWidth, zoomProgress])

  useEffect(() => {
    const element = timelineViewportRef.current
    const previousWidth = previousTrackWidthRef.current

    if (!element || previousWidth <= 0 || previousWidth === trackWidth) {
      previousTrackWidthRef.current = trackWidth
      return
    }

    if (zoomAnchorRatioRef.current !== null) {
      const anchorRatio = zoomAnchorRatioRef.current
      const nextAnchor = anchorRatio * trackWidth
      const nextScrollLeft = nextAnchor - element.clientWidth / 2
      const maxScrollLeft = Math.max(0, trackWidth - element.clientWidth)
      element.scrollLeft = Math.min(Math.max(0, nextScrollLeft), maxScrollLeft)
      zoomAnchorRatioRef.current = null
    }

    previousTrackWidthRef.current = trackWidth
  }, [trackWidth])

  const getTimelineX = useCallback((index: number) => {
    const usableWidth = Math.max(120, trackWidth - TIMELINE_SIDE_PADDING * 2)
    if (duelCount <= 1) {
      return TIMELINE_SIDE_PADDING + usableWidth / 2
    }
    return TIMELINE_SIDE_PADDING + (index / (duelCount - 1)) * usableWidth
  }, [duelCount, trackWidth])

  const showDailyDetails = zoom >= 1.5
  const showChallengers = zoom >= 1.7
  const detailEmbedId = selectedPin
    ? getTrackEmbedId(
        selectedPin.type === 'reign'
          ? { youtube_id: selectedPin.reign.track.youtubeId, youtube_url: selectedPin.reign.track.youtubeUrl }
          : { youtube_id: selectedPin.duel.challenger.youtubeId, youtube_url: selectedPin.duel.challenger.youtubeUrl }
      )
    : ''

  const handlePinSelection = (pin: SelectedPin) => {
    if (dragMovedRef.current) return
    setSelectedPin(pin)
  }

  const handleTimelineMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) return

    const element = timelineViewportRef.current
    if (!element) return

    dragMovedRef.current = false
    dragStartXRef.current = event.clientX
    dragStartScrollLeftRef.current = element.scrollLeft
    setIsDraggingTimeline(true)
  }

  useEffect(() => {
    if (!isDraggingTimeline) return

    const handleMouseMove = (event: MouseEvent) => {
      const element = timelineViewportRef.current
      if (!element) return

      const delta = event.clientX - dragStartXRef.current
      if (Math.abs(delta) > 4) {
        dragMovedRef.current = true
      }

      element.scrollLeft = dragStartScrollLeftRef.current - delta
    }

    const handleMouseUp = () => {
      setIsDraggingTimeline(false)
      window.setTimeout(() => {
        dragMovedRef.current = false
      }, 0)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDraggingTimeline])

  return (
    <div className="bg-black px-1 py-3 text-white md:px-2 md:py-5">
      <div className="pb-5">
        <p className="tlmvpsp-fresco-ui text-[11px] uppercase tracking-[0.42em] text-[#9a8f6a]">La frise des rois</p>
        <div className="mt-3 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h2 className="tlmvpsp-fresco-title text-4xl uppercase text-[#efe2b8] md:text-5xl">La frise des rois</h2>
            <p className="tlmvpsp-fresco-ui mt-3 max-w-3xl text-sm leading-6 text-[#b5b1a3]">
              Une lecture simple du temps: la ligne garde la memoire des regnes, les epingles marquent les rois, et le zoom fait apparaitre les challengers ainsi que la tension quotidienne des votes.
            </p>
          </div>

          <div className="flex w-full flex-col gap-4 xl:max-w-2xl">
            <div className="inline-flex w-fit items-center gap-6">
            <button
              onClick={() => setMode('global')}
                aria-label="Mode global"
                title="Mode global"
                className={`flex items-center gap-2 transition ${mode === 'global' ? 'text-[#d8c68f]' : 'text-[#64604f] hover:text-[#d8c68f]'}`}
            >
                <GlobalModeIcon active={mode === 'global'} />
                <span className="tlmvpsp-fresco-ui text-[11px] uppercase tracking-[0.28em]">Global</span>
            </button>
            <button
              onClick={() => setMode('autopromo')}
                aria-label="Mode autopromo"
                title="Mode autopromo"
                className={`flex items-center gap-2 transition ${mode === 'autopromo' ? 'text-[#d8c68f]' : 'text-[#64604f] hover:text-[#d8c68f]'}`}
            >
                <AutopromoModeIcon active={mode === 'autopromo'} />
                <span className="tlmvpsp-fresco-ui text-[11px] uppercase tracking-[0.28em]">Autopromo</span>
            </button>
          </div>

            <div className="max-w-xl">
              <div className="tlmvpsp-fresco-ui mb-3 flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.28em] text-[#b8aa7b]">
                <span>Zoom</span>
                <span>{zoomSlider} / 100</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={zoomSlider}
                onChange={(event) => {
                  const viewport = timelineViewportRef.current
                  if (viewport && trackWidth > 0) {
                    zoomAnchorRatioRef.current = (viewport.scrollLeft + viewport.clientWidth / 2) / trackWidth
                  }

                  const sliderValue = Number(event.target.value)
                  setZoomSlider(sliderValue)
                  setZoom(sliderToZoom(sliderValue))
                }}
                className="tlmvpsp-zoom-slider h-[3px] w-full cursor-ew-resize appearance-none bg-[linear-gradient(90deg,#173843_0%,#355e67_40%,#8a7647_72%,#d8c68f_100%)] accent-[#d7bf84]"
              />
              <div className="tlmvpsp-fresco-ui mt-3 flex items-center justify-between text-[11px] text-[#807a68]">
                <span>Vue resserree</span>
                <span>Vue detaillee</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="tlmvpsp-fresco-ui mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs uppercase tracking-[0.22em] text-[#8b8575]">
        <span>Blanc: nouveau roi</span>
        <span className="text-[#8dffba]">Vert neon: 7 jours ou plus</span>
        <span className="text-[#f7df8d]">Or: 30 jours ou plus</span>
        <span className="text-[#ff9a9a]">Rouge: challengers visibles en zoom</span>
      </div>

      {error ? <div className="mt-6 rounded-[24px] border border-rose-500/35 bg-rose-500/10 px-5 py-4 text-sm text-rose-200">{error}</div> : null}

      <div
        ref={timelineViewportRef}
        onMouseDown={handleTimelineMouseDown}
        className={`mt-6 overflow-x-auto pb-2 ${isDraggingTimeline ? 'cursor-grabbing select-none' : 'cursor-grab'}`}
      >
        <div className="relative min-h-[500px] bg-black transition-[width] duration-300 ease-out" style={{ width: `${trackWidth}px` }}>
          <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-[linear-gradient(90deg,rgba(43,100,112,0),rgba(202,180,119,0.95),rgba(43,100,112,0))]" />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[#c9b278]">
            <svg viewBox="0 0 50 18" className="h-5 w-14" fill="none" stroke="currentColor" strokeWidth="1.4">
              <path d="M1 9H43" strokeLinecap="round" />
              <path d="M34 2l9 7-9 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          {!loading && payload ? (
            <>
              {payload.duels.map((duel, index) => {
                const x = getTimelineX(index)
                const challengerHeight = 60 + (duel.challengerVotes / maxChallengerVotes) * 140
                const winningSide = duel.winnerTitreId === duel.challenger.id ? 'challenger' : 'king'
                const reign = payload.reigns.find((entry) => entry.startsAt === duel.startsAt && entry.track.id === duel.king.id)

                return (
                  <div key={duel.id}>
                    <div className="tlmvpsp-fresco-ui absolute top-[calc(50%+14px)] text-[10px] uppercase tracking-[0.28em] text-[#6f6958]" style={{ left: `${x - 30}px` }}>
                      {new Date(duel.startsAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                    </div>

                    {showDailyDetails ? (
                      <div className="absolute" style={{ left: `${x - 14}px`, top: `calc(50% - ${44 + Math.min(duel.kingVotes * 8, 120)}px)` }}>
                        <div className="w-6 rounded-t-[10px] border border-[#7cc7d0]/18 bg-[linear-gradient(180deg,rgba(56,140,151,0.92),rgba(20,57,63,0.18))] transition-all duration-300" style={{ height: `${22 + Math.min(duel.kingVotes * 8, 110)}px` }} />
                      </div>
                    ) : null}

                    {showChallengers ? (
                      <button
                        onClick={() => handlePinSelection({ type: 'duel', duel })}
                        className="absolute z-10 flex flex-col items-center text-left transition-transform duration-300 hover:scale-125 focus:scale-125"
                        style={{ left: `${x - 18}px`, top: '50%' }}
                      >
                        <div className="w-px bg-[linear-gradient(180deg,rgba(173,40,40,0.95),rgba(173,40,40,0.18))] transition-all duration-300" style={{ height: `${challengerHeight}px` }} />
                        <div className={`tlmvpsp-fresco-ui mt-1 h-8 w-8 rounded-full border border-[#b94949]/55 ${winningSide === 'challenger' ? 'bg-[#9d3030]/28 shadow-[0_0_16px_rgba(187,73,73,0.35)]' : 'bg-[#301010]/60'} flex items-center justify-center text-[9px] font-black uppercase tracking-[0.16em] text-[#ffd2d2]`}>
                          C
                        </div>
                      </button>
                    ) : null}

                    {reign ? (
                      <button
                        onClick={() => handlePinSelection({ type: 'reign', reign })}
                        className="absolute z-20 flex -translate-x-1/2 flex-col items-center transition-transform duration-300 hover:scale-125 focus:scale-125"
                        style={{ left: `${x}px`, top: `calc(50% - ${150 + Math.min(reign.durationDays * 3, 54)}px)` }}
                      >
                        <SonarPinHead tier={reign.tier} active={selectedPin?.type === 'reign' && selectedPin.reign.id === reign.id} />
                        <div className="w-px bg-[linear-gradient(180deg,rgba(209,190,132,0.95),rgba(52,91,97,0.18))] transition-all duration-300" style={{ height: `${92 + Math.min(reign.durationDays * 3, 70)}px` }} />
                        <div className="absolute -top-12 w-28 text-center">
                          <p className="tlmvpsp-fresco-ui truncate text-[10px] uppercase tracking-[0.22em] text-[#867f6d]">{reign.track.artist}</p>
                          <p className="tlmvpsp-fresco-title mt-1 line-clamp-2 text-[14px] uppercase text-[#efe2b8]">{reign.track.title}</p>
                        </div>
                      </button>
                    ) : null}
                  </div>
                )
              })}
            </>
          ) : null}

          {loading ? <div className="absolute inset-0 flex items-center justify-center text-sm text-[#99927d]">Chargement de la frise TLMVPSP...</div> : null}
        </div>
      </div>

      <div className="tlmvpsp-fresco-ui mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs uppercase tracking-[0.2em] text-[#7e786b]">
        <span>Clique une epingle pour ouvrir sa fiche</span>
        <span>A partir de 50, les votes du roi apparaissent</span>
        <span>A partir de 70, les challengers apparaissent</span>
        <span>La frise se met a jour automatiquement toutes les 30 secondes</span>
      </div>

      {selectedPin ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 py-8 backdrop-blur-sm" onClick={() => setSelectedPin(null)}>
          <div className="grid max-h-full w-full max-w-6xl gap-8 overflow-auto bg-black/90 p-2 lg:grid-cols-[1fr_1px_0.85fr]" onClick={(event) => event.stopPropagation()}>
            <div>
              <p className="tlmvpsp-fresco-ui text-[10px] uppercase tracking-[0.32em] text-[#9a8f6a]">
                {selectedPin.type === 'reign' ? 'Regne detaille' : 'Challenger detaille'}
              </p>
              <h3 className="tlmvpsp-fresco-title mt-3 text-4xl uppercase text-[#efe2b8]">
                {selectedPin.type === 'reign' ? selectedPin.reign.track.title : selectedPin.duel.challenger.title}
              </h3>
              <p className="tlmvpsp-fresco-ui mt-2 text-sm uppercase tracking-[0.22em] text-[#b0c8ca]">
                {selectedPin.type === 'reign' ? selectedPin.reign.track.artist : selectedPin.duel.challenger.artist}
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {selectedPin.type === 'reign' ? (
                  <>
                    <div className="p-1">
                      <p className="tlmvpsp-fresco-ui text-[10px] uppercase tracking-[0.25em] text-[#8f8875]">Debut du regne</p>
                      <p className="mt-2 text-lg font-black">{formatDate(selectedPin.reign.startsAt)}</p>
                    </div>
                    <div className="p-1">
                      <p className="tlmvpsp-fresco-ui text-[10px] uppercase tracking-[0.25em] text-[#8f8875]">Duree</p>
                      <p className="mt-2 text-lg font-black">{selectedPin.reign.durationDays} jours</p>
                    </div>
                    <div className="p-1">
                      <p className="tlmvpsp-fresco-ui text-[10px] uppercase tracking-[0.25em] text-[#8f8875]">Likes</p>
                      <p className="mt-2 text-lg font-black">{formatCompact(selectedPin.reign.track.likes)}</p>
                    </div>
                    <div className="p-1">
                      <p className="tlmvpsp-fresco-ui text-[10px] uppercase tracking-[0.25em] text-[#8f8875]">Perles</p>
                      <p className="mt-2 text-lg font-black">{formatCompact(selectedPin.reign.track.points)}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-1">
                      <p className="tlmvpsp-fresco-ui text-[10px] uppercase tracking-[0.25em] text-[#8f8875]">Date du duel</p>
                      <p className="mt-2 text-lg font-black">{formatDate(selectedPin.duel.startsAt)}</p>
                    </div>
                    <div className="p-1">
                      <p className="tlmvpsp-fresco-ui text-[10px] uppercase tracking-[0.25em] text-[#8f8875]">Votes challenger</p>
                      <p className="mt-2 text-lg font-black">{selectedPin.duel.challengerVotes}</p>
                    </div>
                    <div className="p-1">
                      <p className="tlmvpsp-fresco-ui text-[10px] uppercase tracking-[0.25em] text-[#8f8875]">Face au roi</p>
                      <p className="mt-2 text-lg font-black">{selectedPin.duel.king.artist}</p>
                      <p className="mt-1 text-sm text-white/62">{selectedPin.duel.king.title}</p>
                    </div>
                    <div className="p-1">
                      <p className="tlmvpsp-fresco-ui text-[10px] uppercase tracking-[0.25em] text-[#8f8875]">Issue</p>
                      <p className="mt-2 text-lg font-black">{selectedPin.duel.winnerTitreId === selectedPin.duel.challenger.id ? 'A pris la place' : 'A echoue'}</p>
                    </div>
                  </>
                )}
              </div>

              {selectedPin.type === 'reign' ? (
                <div className="mt-7">
                  <p className="tlmvpsp-fresco-ui text-[10px] uppercase tracking-[0.28em] text-[#8f8875]">Evolution quotidienne</p>
                  <div className="mt-4 grid gap-2">
                    {selectedPin.reign.dailyVotes.map((day, index) => {
                      const total = Math.max(day.kingVotes, day.challengerVotes, 1)
                      const kingWidth = `${Math.max(8, (day.kingVotes / total) * 100)}%`
                      const challengerWidth = `${Math.max(8, (day.challengerVotes / total) * 100)}%`

                      return (
                        <div key={day.roundId} className="py-2">
                          <div className="tlmvpsp-fresco-ui flex items-center justify-between gap-3 text-xs text-[#8c8778]">
                            <span>Jour {index + 1}</span>
                            <span>{formatDate(day.startsAt)}</span>
                          </div>
                          <div className="mt-3 space-y-2">
                            <div>
                              <div className="tlmvpsp-fresco-ui mb-1 flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-[#8dc8d1]">
                                <span>Roi</span>
                                <span>{day.kingVotes} votes</span>
                              </div>
                              <div className="h-2 rounded-full bg-[#102229]">
                                <div className="h-full rounded-full bg-[#4e98a5]" style={{ width: kingWidth }} />
                              </div>
                            </div>
                            <div>
                              <div className="tlmvpsp-fresco-ui mb-1 flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-[#e6a1a1]">
                                <span>Challenger</span>
                                <span>{day.challengerVotes} votes</span>
                              </div>
                              <div className="h-2 rounded-full bg-[#241010]">
                                <div className="h-full rounded-full bg-[#b84b4b]" style={{ width: challengerWidth }} />
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="hidden bg-[linear-gradient(180deg,rgba(142,124,73,0),rgba(142,124,73,0.45),rgba(142,124,73,0))] lg:block" />

            <div>
              <div className="aspect-video overflow-hidden bg-black/30">
                {detailEmbedId ? (
                  <iframe
                    className="h-full w-full"
                    src={`https://www.youtube.com/embed/${detailEmbedId}?autoplay=1&rel=0&modestbranding=1`}
                    title="Lecteur TLMVPSP"
                    allow="autoplay; encrypted-media"
                    allowFullScreen
                  />
                ) : (
                  <div className="flex h-full items-center justify-center px-6 text-center text-sm text-[#8c8676]">
                    Aucun embed YouTube disponible pour cette fiche.
                  </div>
                )}
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="p-1">
                  <p className="tlmvpsp-fresco-ui text-[10px] uppercase tracking-[0.25em] text-[#8f8875]">Vues</p>
                  <p className="mt-2 text-lg font-black">{formatCompact(selectedPin.type === 'reign' ? selectedPin.reign.track.views : selectedPin.duel.challenger.views)}</p>
                </div>
                <div className="p-1">
                  <p className="tlmvpsp-fresco-ui text-[10px] uppercase tracking-[0.25em] text-[#8f8875]">Likes</p>
                  <p className="mt-2 text-lg font-black">{formatCompact(selectedPin.type === 'reign' ? selectedPin.reign.track.likes : selectedPin.duel.challenger.likes)}</p>
                </div>
              </div>

              <button
                onClick={() => setSelectedPin(null)}
                className="tlmvpsp-fresco-ui mt-8 text-sm font-bold uppercase tracking-[0.2em] text-[#d4c6a1] transition hover:text-white"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}