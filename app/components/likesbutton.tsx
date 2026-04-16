"use client"

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// Points attribués selon les vues du morceau
function getPointsFromViews(vues: number): number {
  if (vues <= 999) return 100
  if (vues <= 4999) return 85
  if (vues <= 9999) return 70
  if (vues <= 49000) return 50
  if (vues <= 100000) return 25
  return 5
}

interface LikesbuttonProps {
  trackId: string
  trackOwnerId: string   // Empêche l'auteur de voter pour son propre morceau
  vuesActuelles: number  // Sert au calcul de la valeur du like
  initialLikes: number
  targetType?: 'titre' | 'prod' // Doit correspondre à l'API
  onVoteChange?: () => void
  size?: 'sm' | 'md' | 'lg'
}

function normalizeVoteError(err: unknown) {
  if (err instanceof Error) {
    return {
      message: err.message,
      name: err.name,
      stack: err.stack,
    }
  }

  if (err && typeof err === 'object') {
    const maybeError = err as {
      message?: unknown
      details?: unknown
      hint?: unknown
      code?: unknown
      status?: unknown
    }

    return {
      message: typeof maybeError.message === 'string' ? maybeError.message : 'Erreur inconnue',
      details: typeof maybeError.details === 'string' ? maybeError.details : undefined,
      hint: typeof maybeError.hint === 'string' ? maybeError.hint : undefined,
      code: typeof maybeError.code === 'string' ? maybeError.code : undefined,
      status: typeof maybeError.status === 'number' ? maybeError.status : undefined,
      raw: maybeError,
    }
  }

  return {
    message: typeof err === 'string' ? err : 'Erreur inconnue',
    raw: err,
  }
}

const SonarIcon = ({ active }: { active: boolean }) => {
  const [isScanning, setIsScanning] = useState(false)

  useEffect(() => {
    if (active) {
      setIsScanning(true)
      const timer = setTimeout(() => setIsScanning(false), 1000)
      return () => clearTimeout(timer)
    }
  }, [active])

  return (
    <div className="relative w-8 h-8 flex items-center justify-center">
      {isScanning && (
        <div className="absolute inset-0 rounded-full bg-green-500/60 animate-ping"></div>
      )}
      <svg viewBox="0 0 24 24" className={`w-full h-full transition-colors duration-700 ${active ? 'text-green-500 drop-shadow-[0_0_10px_rgba(34,197,94,0.45)]' : 'text-cyan-100/65'}`} fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="9" className={active ? 'opacity-10' : 'opacity-22'} />
        <circle cx="12" cy="12" r="5" className={active ? 'opacity-20' : 'opacity-42'} />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" />
        <path d="M12 3v2m0 14v2M3 12h2m14 0h2" strokeLinecap="round" opacity={active ? 0.3 : 0.55} />
      </svg>
    </div>
  )
}

export default function Likesbutton({
  trackId,
  trackOwnerId,
  vuesActuelles,
  initialLikes,
  targetType = 'titre', // Par défaut 'titre' pour correspondre à l'API
  onVoteChange,
}: LikesbuttonProps) {
  const [liked, setLiked] = useState(false)
  const [likesCount, setLikesCount] = useState(initialLikes)
  const [userId, setUserId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const lockRef = useRef(false)
  const router = useRouter()

  const syncLikeState = async (accessToken?: string | null, nextUserId?: string | null) => {
    if (!accessToken || !nextUserId) {
      setUserId(null)
      setLiked(false)
      return
    }

    setUserId(nextUserId)

    const response = await fetch(
      `/api/likes/toggle?trackId=${encodeURIComponent(trackId)}&targetType=${encodeURIComponent(targetType)}`,
      {
        method: 'GET',
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    const payload = await response.json().catch(() => null)

    if (!response.ok) {
      console.error('Erreur lecture like:', payload)
      setLiked(false)
      return
    }

    setLiked(Boolean(payload?.liked))
  }

  useEffect(() => {
    setLikesCount(initialLikes)
  }, [initialLikes])

  // Charge la session et vérifie si l'utilisateur a déjà voté
  useEffect(() => {
    let active = true

    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!active) return

      await syncLikeState(session?.access_token, session?.user?.id ?? null)
    }

    init()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void syncLikeState(session?.access_token, session?.user?.id ?? null)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [targetType, trackId])

  const isOwnTrack = !!userId && userId === trackOwnerId

  const handleClick = async () => {
    if (lockRef.current || busy) return
    if (!userId) { router.push('/auth'); return }
    if (isOwnTrack) return

    lockRef.current = true
    setBusy(true)
    setTimeout(() => { lockRef.current = false }, 750)

    // Optimistic update
    const prevLiked = liked
    const prevLikesCount = likesCount
    const optimisticLiked = !liked
    const optimisticLikesCount = liked ? likesCount - 1 : likesCount + 1
    setLiked(optimisticLiked)
    setLikesCount(optimisticLikesCount)

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const accessToken = sessionData.session?.access_token

      if (!accessToken) {
        setLiked(prevLiked)
        setLikesCount(prevLikesCount)
        router.push('/auth')
        return
      }

      const response = await fetch('/api/likes/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          trackId,
          trackOwnerId,
          vuesActuelles,
          targetType,
        }),
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        setLiked(prevLiked)
        setLikesCount(prevLikesCount)
        const message = typeof payload?.error === 'string' ? payload.error : 'Erreur de vote inconnue'
        const details = typeof payload?.details === 'string' ? payload.details : ''
        throw new Error(details ? `${message} | ${details}` : message)
      }

      setLiked(Boolean(payload?.liked))
      setLikesCount(Number(payload?.likesCount || 0))

      onVoteChange?.()
    } catch (err) {
      setLiked(prevLiked)
      setLikesCount(prevLikesCount)
      const formattedError = normalizeVoteError(err)
      console.error(`Erreur vote: ${formattedError.message}${formattedError.code ? ` | code=${formattedError.code}` : ''}${formattedError.details ? ` | details=${formattedError.details}` : ''}${formattedError.hint ? ` | hint=${formattedError.hint}` : ''}`)
    } finally {
      setTimeout(() => setBusy(false), 250)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={busy || isOwnTrack}
      title={isOwnTrack ? 'Vous ne pouvez pas voter pour votre propre musique' : undefined}
      className={`hover:scale-110 transition-transform flex flex-col items-center w-full focus:outline-none group ${
        isOwnTrack ? 'opacity-30 cursor-not-allowed hover:scale-100' : ''
      }`}
      aria-label="Voter pour cette piste"
    >
      <SonarIcon active={liked} />
      <span className={`text-[9px] font-black mt-1 transition-colors duration-300 ${
        liked ? 'text-green-500 drop-shadow-[0_0_6px_rgba(34,197,94,0.6)]' : 'text-cyan-100/55'
      }`}>
        {likesCount}
      </span>
    </button>
  )
}