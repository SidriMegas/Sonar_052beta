"use client"
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { createNotification } from '@/lib/notifications'
import { getTrackEmbedId } from '@/lib/youtube'

export default function BottlesSend() {
  const [bottle, setBottle] = useState<any>(null)
  const [trackInfo, setTrackInfo] = useState<any>(null)
  const [currentUsername, setCurrentUsername] = useState('')
  const [senderUsername, setSenderUsername] = useState('')
  const [hasLikedMessage, setHasLikedMessage] = useState(false)
  const [isLikingMessage, setIsLikingMessage] = useState(false)
  const [showMessagePanel, setShowMessagePanel] = useState(false)
  const [showPlayer, setShowPlayer] = useState(false)

  useEffect(() => {
    let activeChannel: ReturnType<typeof supabase.channel> | null = null
    let alive = true

    const cleanupChannel = () => {
      if (activeChannel) {
        supabase.removeChannel(activeChannel)
        activeChannel = null
      }
    }

    // Récupérer l'utilisateur puis écouter les bouteilles qui lui sont attribuées
    const setupListener = async (authUser?: { id: string } | null) => {
      const user = authUser || (await supabase.auth.getUser()).data.user
      if (!user) {
        cleanupChannel()
        return
      }

      cleanupChannel()

      const { data: me } = await supabase
        .from('digger')
        .select('username')
        .eq('id', user.id)
        .maybeSingle()

      if (!alive) return
      setCurrentUsername(me?.username || 'Un digger')

      const afficherBouteille = async (bottlePayload: any) => {
        if (!bottlePayload || bottlePayload.target_user_id !== user.id || bottlePayload.is_caught) {
          return
        }

        const { data: track } = await supabase
          .from('titre')
          .select('id, nom_titre, nom_artiste, youtube_url, youtube_id')
          .eq('id', bottlePayload.titre_id)
          .single()

        const { data: sender } = await supabase
          .from('digger')
          .select('username')
          .eq('id', bottlePayload.user_id)
          .maybeSingle()

        if (!alive) return

        setBottle(bottlePayload)
        setTrackInfo(track)
        setSenderUsername(sender?.username || 'anonyme')
        setHasLikedMessage(false)
        setIsLikingMessage(false)
        setShowMessagePanel(false)
        setShowPlayer(false)
      }

      // Si une bouteille est déjà en attente à la connexion, on l'affiche.
      const { data: pendingBottle } = await supabase
        .from('bottles')
        .select('id, user_id, message, titre_id, target_user_id, is_caught, created_at')
        .eq('target_user_id', user.id)
        .eq('is_caught', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (pendingBottle) {
        await afficherBouteille(pendingBottle)
      }

      // Écoute INSERT + UPDATE, car le cron attribue via UPDATE target_user_id.
      activeChannel = supabase
        .channel(`bottles_listener_${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'bottles',
            filter: `target_user_id=eq.${user.id}`
          },
          async (payload) => {
            const eventPayload = payload.new
            if (!eventPayload) return
            await afficherBouteille(eventPayload)
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'bottles',
            filter: `target_user_id=eq.${user.id}`
          },
          async (payload) => {
            const eventPayload = payload.new
            if (!eventPayload) return
            await afficherBouteille(eventPayload)
          }
        )
        .subscribe()
    }

    setupListener()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event !== 'SIGNED_IN' && event !== 'SIGNED_OUT' && event !== 'USER_UPDATED') {
        return
      }

      if (!alive) return
      await setupListener(session?.user || null)
    })

    return () => {
      alive = false
      cleanupChannel()
      subscription.unsubscribe()
    }
  }, [])

  // Marquer la bouteille comme traitée pour éviter toute redistribution.
  const marquerBouteilleRecue = async () => {
    if (!bottle) return

    try {
      await supabase
        .from('bottles')
        .update({ is_caught: true })
        .eq('id', bottle.id)
    } catch (err) {
      console.error('Erreur:', err)
    }
  }

  const ouvrirMessage = () => {
    if (!bottle) return
    setShowMessagePanel(true)
  }

  const fermerMessage = async () => {
    setShowMessagePanel(false)
    setShowPlayer(false)
    setBottle(null)
    setTrackInfo(null)
    setSenderUsername('')
    setHasLikedMessage(false)
    marquerBouteilleRecue()
  }

  const ouvrirPlayer = async () => {
    setShowPlayer(true)
  }

  const fermerPlayer = () => {
    setShowPlayer(false)
  }

  const likerMessage = async () => {
    if (!bottle || hasLikedMessage || isLikingMessage) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    if (!bottle.user_id || bottle.user_id === user.id) {
      setHasLikedMessage(true)
      return
    }

    setIsLikingMessage(true)
    try {
      const ok = await createNotification(
        bottle.user_id,
        'bottle_like',
        'Ta bouteille a recu un like ❤️',
        `${currentUsername || 'Un digger'} a aime ton message en bouteille.`,
        bottle.titre_id
      )

      if (ok) {
        setHasLikedMessage(true)
      }
    } finally {
      setIsLikingMessage(false)
    }
  }

  const embedId = getTrackEmbedId(trackInfo)

  if (!bottle && !showPlayer) return null

  return (
    <>
      {bottle && !showMessagePanel && !showPlayer && (
        <button
          onClick={ouvrirMessage}
          className="fixed bottom-5 left-5 z-[100000] h-14 w-14 rounded-full bg-cyan-900/30 backdrop-blur-sm border border-cyan-300/20 shadow-[0_0_18px_rgba(56,189,248,0.25)] flex items-center justify-center hover:scale-110 transition-transform animate-bottle-rise"
          aria-label="Ouvrir la bouteille"
          title="Une bouteille vient d'arriver"
        >
          <span className="text-3xl">🍾</span>
        </button>
      )}

      {bottle && showMessagePanel && (
        <div className="fixed left-4 bottom-24 z-[100000] w-[320px] max-w-[calc(100vw-2rem)] rounded-2xl border border-cyan-300/20 bg-[#04131f]/95 backdrop-blur-md p-4 shadow-2xl">
          <div className="flex items-start justify-between gap-3 mb-3">
            <p className="text-cyan-300 text-[10px] uppercase tracking-[0.2em] font-bold">
              Message de l'ocean
            </p>
            <button
              onClick={fermerMessage}
              className="text-gray-400 hover:text-white text-sm"
              aria-label="Fermer"
            >
              ✕
            </button>
          </div>

          <p className="text-sm text-slate-100 italic leading-relaxed mb-4">
            "{bottle.message}"
          </p>

          <p className="text-[11px] text-cyan-200/80 mb-3">
            de @{senderUsername}
          </p>

          {trackInfo && (
            <div className="bg-cyan-500/10 border border-cyan-400/20 rounded-xl p-3 mb-4">
              <p className="text-[10px] text-cyan-200/70 uppercase tracking-widest mb-1">Accompagne de</p>
              <p className="text-cyan-100 font-bold text-sm truncate">{trackInfo.nom_titre}</p>
              <p className="text-cyan-100/70 text-xs italic truncate">par {trackInfo.nom_artiste}</p>
            </div>
          )}

          <div className="flex gap-2 mb-2">
            <button
              onClick={ouvrirPlayer}
              disabled={!trackInfo || (!trackInfo?.youtube_url && !trackInfo?.youtube_id)}
              className="flex-1 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-[#031018] py-2 px-3 rounded-lg font-bold text-[11px] uppercase tracking-wide transition-colors"
            >
              Ecouter
            </button>
            <Link
              href={`/track/${bottle.titre_id}`}
              onClick={fermerMessage}
              className="flex-1 border border-cyan-300/30 text-cyan-100 hover:bg-cyan-500/10 py-2 px-3 rounded-lg font-bold text-[11px] uppercase tracking-wide text-center transition-colors"
            >
              Voir la page
            </Link>
          </div>

          <button
            onClick={likerMessage}
            disabled={hasLikedMessage || isLikingMessage}
            className="w-full border border-pink-300/30 text-pink-100 hover:bg-pink-500/10 disabled:opacity-60 disabled:cursor-not-allowed py-2 px-3 rounded-lg font-bold text-[11px] uppercase tracking-wide transition-colors"
          >
            {hasLikedMessage ? 'Message like' : isLikingMessage ? 'Envoi...' : 'Like ce message ❤️'}
          </button>
        </div>
      )}

      {showPlayer && trackInfo && (
        <div className="fixed bottom-6 right-6 z-[100001] w-[320px] max-w-[calc(100vw-1rem)] bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-5 duration-500">
          <div className="p-3 flex justify-between items-center bg-white/5 border-b border-white/5">
            <div className="truncate pr-4">
              <p className="text-[9px] font-black uppercase tracking-widest text-cyan-300 truncate">
                {trackInfo.nom_artiste}
              </p>
              <p className="text-[10px] text-gray-300 italic truncate">
                {trackInfo.nom_titre}
              </p>
            </div>
            <button onClick={fermerPlayer} className="text-gray-500 hover:text-white text-xs px-2 font-black" aria-label="Fermer le player">
              ✕
            </button>
          </div>
          <div className="aspect-video w-full bg-black">
            {embedId ? (
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${embedId}?autoplay=1&rel=0`}
                frameBorder="0"
                allow="autoplay; encrypted-media"
                allowFullScreen
              ></iframe>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-center px-4 text-gray-400 text-xs">
                Impossible de charger le player pour ce lien.
              </div>
            )}
          </div>
          <div className="p-3 bg-white/5">
            <a
              href={trackInfo.youtube_url}
              target="_blank"
              rel="noreferrer"
              className="w-full inline-flex items-center justify-center bg-red-600 hover:bg-red-500 py-2 rounded-xl font-black text-[10px] uppercase transition-all shadow-lg shadow-red-900/20 active:scale-95"
            >
              Ouvrir sur YouTube
            </a>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes bottleRise {
          0% {
            transform: translateY(26px) scale(0.95);
            opacity: 0.6;
          }
          50% {
            transform: translateY(-22px) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateY(-60px) scale(0.95);
            opacity: 0.75;
          }
        }

        .animate-bottle-rise {
          animation: bottleRise 2.4s ease-in-out infinite alternate;
        }
      `}</style>
    </>
  )
}